/**
 * Les automatisations - ce qui tourne quand le Hub est ferme.
 *
 * C'est la seule facon de tenir la promesse du plan : « un pole tourne a
 * l'heure dite, Hub ferme, et tu le retrouves fait le lendemain matin ». Une
 * horloge dans le Hub ne le pourrait pas - elle ne tourne que quand on l'ouvre,
 * donc elle ne se declencherait jamais la nuit, qui est precisement le moment
 * ou l'on veut qu'elle serve.
 *
 * On ne tient donc aucune horloge ici. Hermes a `cron`, il a son planificateur,
 * et le Hub s'y branche comme il se branche au tableau : **il lit le fichier,
 * il ecrit par la ligne de commande.** Meme partage, meme raison - un seul
 * ecrivain connait les invariants (le calcul de la prochaine echeance, les
 * verrous, l'historique des executions), et deux ecrivains qui divergent valent
 * moins qu'un seul.
 *
 * CE QU'IL FAUT SAVOIR AVANT DE S'EN SERVIR, et qui n'etait ecrit nulle part :
 * **une tache cron ne se declenche que si la passerelle d'Hermes tourne en
 * service.** Sans elle, `hermes cron create` reussit, la tache s'affiche, sa
 * prochaine echeance est calculee - et rien ne part jamais. Verifie le
 * 03/08/2026 : « Gateway is not running - cron jobs will NOT fire ».
 *
 * Une automatisation qu'on croit posee et qui ne part pas est pire que pas
 * d'automatisation du tout : on compte dessus. C'est pourquoi `etat()` rend
 * `passerelle` a cote de la liste, et que l'interface doit le dire.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const HERMES_HOME =
  process.env.HERMES_HOME || path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
const FICHIER_JOBS = path.join(HERMES_HOME, 'cron', 'jobs.json')

/** La CLI, pour tout ce qui ecrit. Jamais le fichier. */
function cron(args, { timeout = 30000 } = {}) {
  return spawnSync('hermes', ['cron', ...args], {
    windowsHide: true,
    timeout,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  })
}

function refus(r, defaut) {
  const lignes = String(`${r.stderr || ''}\n${r.stdout || ''}`)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const err = new Error(lignes[lignes.length - 1] || defaut)
  err.status = 400
  return err
}

/**
 * La passerelle tourne-t-elle ?
 *
 * `hermes cron status` le dit en toutes lettres, et son texte est le seul
 * endroit ou l'information existe - il n'y a pas de drapeau dans `jobs.json`.
 * On lit donc sa phrase, en cherchant la negation plutot que l'affirmation :
 * un message qu'on ne reconnait pas doit compter comme « on ne sait pas », et
 * « on ne sait pas » ne doit pas se lire « tout va bien ».
 */
export function passerelleActive() {
  const r = cron(['status'], { timeout: 20000 })
  const texte = `${r.stdout || ''}${r.stderr || ''}`
  if (/not running|n'est pas|pas en cours/i.test(texte)) return false
  if (/running|actif|en cours/i.test(texte)) return true
  return null
}

/**
 * Ce qui est programme, lu directement dans le fichier d'Hermes.
 *
 * Comme pour le tableau : un appel de CLI coute environ deux secondes, et cette
 * liste s'affiche a chaque ouverture de l'accueil. Le fichier est un JSON
 * simple, ecrit par un processus qui pose un verrou a cote - on ne fait que le
 * lire, donc on ne prend pas ce verrou.
 */
export function lireAutomatisations() {
  let brut
  try {
    brut = JSON.parse(fs.readFileSync(FICHIER_JOBS, 'utf8'))
  } catch {
    // Pas de fichier : personne n'a jamais rien programme. Ce n'est pas une
    // panne, c'est l'etat normal d'un poste neuf.
    return []
  }
  const jobs = Array.isArray(brut?.jobs) ? brut.jobs : []

  return jobs.map((j) => ({
    id: j.id,
    nom: j.nom || j.name || j.id,
    demande: j.prompt || j.script || '',
    /** « tous les jours a 9h » plutot que `0 9 * * *` quand Hermes l'a ecrit. */
    quand: j.schedule_display || j.schedule?.display || j.schedule?.expr || '',
    actif: j.enabled !== false && j.state !== 'paused',
    suspendue: j.state === 'paused' || !!j.paused_at,
    prochaine: j.next_run_at || null,
    derniere: j.last_run_at || null,
    /** `success`, `error`, ou null tant qu'elle n'a jamais tourne. */
    resultat: j.last_status || null,
    erreur: j.last_error || j.last_delivery_error || null,
    dossier: j.workdir || null,
    modele: j.model || j.model_snapshot || null,
  }))
}

/**
 * L'etat complet, tel que l'accueil doit le montrer.
 *
 * La liste seule mentirait par omission : trois automatisations affichees et
 * une passerelle a l'arret, c'est trois promesses qui ne seront pas tenues.
 */
export function etat() {
  const automatisations = lireAutomatisations()
  const passerelle = passerelleActive()
  return {
    automatisations,
    passerelle,
    // Le seul cas ou il faut alerter : des taches posees, et rien pour les
    // declencher. Une liste vide sans passerelle ne gene personne.
    muettes: passerelle === false && automatisations.some((a) => a.actif),
  }
}

/**
 * Programmer une demande.
 *
 * `quand` accepte ce qu'Hermes accepte : « 30m », « every 2h », « 0 9 * * * ».
 * On ne traduit pas - inventer une grammaire par-dessus la sienne obligerait a
 * la tenir d'accord avec elle a chaque version.
 *
 * `dossier` compte plus qu'il n'en a l'air : sans lui, la tache tourne depuis
 * un repertoire indefini, et c'est exactement la faute qui a coute deux nuits
 * sur les poles - un agent qui ecrit ailleurs que la ou on l'attend.
 */
export function creerAutomatisation({ quand, demande, nom, dossier, modele }) {
  const q = String(quand || '').trim()
  const d = String(demande || '').trim()
  if (!q) {
    const err = new Error('Precise quand : « 30m », « every 2h », ou « 0 9 * * * ».')
    err.status = 400
    throw err
  }
  if (!d) {
    const err = new Error('Precise ce qui doit etre fait.')
    err.status = 400
    throw err
  }

  const args = ['create', q, d]
  if (nom) args.push('--name', String(nom))
  if (dossier) args.push('--workdir', String(dossier))
  if (modele) args.push('--model', String(modele))

  const r = cron(args, { timeout: 60000 })
  // La CLI sort en erreur quand la passerelle est absente, alors que la tache
  // EST creee : on ne se fie donc pas au code de sortie seul, on cherche
  // l'identifiant qu'elle annonce.
  const m = /Created job:\s*([0-9a-f]+)/i.exec(`${r.stdout || ''}${r.stderr || ''}`)
  if (!m) throw refus(r, "L'automatisation n'a pas pu etre creee.")
  return { id: m[1], creee: true, passerelle: passerelleActive() }
}

export function retirerAutomatisation(id) {
  const r = cron(['remove', String(id)])
  if (!/Removed job/i.test(`${r.stdout || ''}${r.stderr || ''}`)) {
    throw refus(r, "L'automatisation n'a pas pu etre retiree.")
  }
  return { id, retiree: true }
}

/** Suspendre plutot que retirer : on garde la formulation pour plus tard. */
export function suspendreAutomatisation(id, suspendre) {
  const r = cron([suspendre ? 'pause' : 'resume', String(id)])
  const texte = `${r.stdout || ''}${r.stderr || ''}`
  if (!/paused|resumed|repris|suspendu/i.test(texte)) {
    throw refus(r, "L'automatisation n'a pas pu etre changee.")
  }
  return { id, suspendue: !!suspendre }
}
