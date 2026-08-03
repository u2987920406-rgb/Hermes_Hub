/**
 * Composer son equipe depuis le Hub.
 *
 * `equipe.js` lit les profils ; ici on les ecrit. Meme partage que pour le
 * tableau et le planificateur : la lecture passe par le disque, l'ecriture par
 * la ligne de commande d'Hermes. Un seul ecrivain connait ses invariants -
 * l'arborescence d'un profil, ses credentials, son alias, ses skills.
 *
 * POURQUOI CETTE PIECE EXISTE. Un poste neuf recoit trois roles, et jusqu'ici
 * il ne pouvait jamais en ajouter un quatrieme sans terminal. C'etait le
 * dernier trou du parcours d'un client : il compose son graphe a la souris, et
 * pas l'equipe qui l'execute. Un produit qui montre une equipe qu'on ne peut
 * pas changer se lit comme une demonstration, pas comme un outil.
 *
 * LA DESCRIPTION EST LE SEUL TEXTE QUI TRAVAILLE. C'est elle - et rien d'autre -
 * que le decomposeur de kanban lit pour router une tache. Un agent sans
 * description ne recevra jamais rien : il figurera dans l'organigramme et
 * restera oisif, sans que rien ne l'explique. On la rend donc obligatoire a la
 * creation, alors que la ligne de commande, elle, l'accepte vide.
 */
import { spawnSync } from 'node:child_process'

/** Ce qu'Hermes accepte comme nom de profil : minuscules et chiffres. */
const NOM_VALIDE = /^[a-z0-9][a-z0-9-]{1,30}$/

/**
 * Les noms qu'on refuse de toucher.
 *
 * `default` est Hermes lui-meme : le renommer ou l'effacer deplacerait le home
 * et emporterait les credentials de tout le poste. `clean` est le bac a sable
 * pose par l'installateur, et l'interface s'appuie sur son nom pour le
 * reconnaitre.
 */
const INTOUCHABLES = new Set(['default', 'clean'])

function hermes(args, { timeout = 90000 } = {}) {
  return spawnSync('hermes', ['profile', ...args], {
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
 * Le nom d'un profil, normalise et verifie.
 *
 * Exportee pour ses tests, et pas seulement par commodite : c'est la seule
 * barriere avant un appel qui CREE quelque chose sur le poste. Un test qui
 * devrait passer par `creerAgent` pour l'eprouver poserait de vrais profils -
 * c'est arrive le 03/08/2026, il a fallu en effacer un a la main.
 *
 * La casse est corrigee plutot que refusee : quelqu'un qui tape « Analyste »
 * veut un agent, pas une lecon. Hermes, lui, exige des minuscules.
 */
export function normaliserNom(nom, quoi = 'Le nom') {
  const n = String(nom || '').trim().toLowerCase()
  if (!NOM_VALIDE.test(n)) {
    const err = new Error(
      `${quoi} doit tenir en minuscules, chiffres et tirets, entre 2 et 31 caracteres.`,
    )
    err.status = 400
    throw err
  }
  return n
}

function exigerModifiable(nom) {
  if (INTOUCHABLES.has(nom)) {
    const err = new Error(
      nom === 'default'
        ? "Hermes lui-meme ne se touche pas ici : son profil porte le home du poste, " +
          "ses credentials et sa memoire."
        : "Le profil d'essai est pose par l'installateur et n'est pas modifiable ici.",
    )
    err.status = 409
    throw err
  }
  return nom
}

/**
 * Un agent de plus.
 *
 * `--clone-from default` n'est pas un detail : c'est ce qui lui donne les
 * credentials et le modele du poste. Sans cela il naitrait muet - present dans
 * l'organigramme, incapable de repondre - et l'interface le signalerait par
 * « aucune credential » sans que personne comprenne pourquoi.
 */
export function creerAgent({ nom, description }) {
  const n = normaliserNom(nom)
  const d = String(description || '').trim()
  if (d.length < 20) {
    const err = new Error(
      'Decris ce que fait cet agent en une phrase au moins : ce texte est le seul ' +
        'que le decomposeur lit pour lui confier une tache. Commence par son metier, ' +
        'suivi d un point.',
    )
    err.status = 400
    throw err
  }

  const r = hermes(['create', n, '--clone-from', 'default', '--description', d])
  const texte = `${r.stdout || ''}${r.stderr || ''}`
  // La CLI sort parfois en erreur tout en ayant cree le profil : on cherche ce
  // qu'elle annonce plutot que son code de sortie.
  if (!/created|cree/i.test(texte) && r.status !== 0) {
    throw refus(r, "L'agent n'a pas pu etre cree.")
  }
  return { id: n, cree: true }
}

/**
 * Changer ce qu'un agent sait faire.
 *
 * C'est le geste le plus utile des quatre, et le moins evident : un agent qui
 * ne recoit jamais de tache n'est pas casse, il est mal decrit. Le corriger
 * ici evite de rouvrir un terminal pour une phrase.
 */
export function decrireAgent(nom, description) {
  const n = exigerModifiable(normaliserNom(nom))
  const d = String(description || '').trim()
  if (d.length < 20) {
    const err = new Error('Une description trop courte ne routera rien.')
    err.status = 400
    throw err
  }
  const r = hermes(['describe', n, '--text', d, '--overwrite'])
  if (r.status !== 0) throw refus(r, "La description n'a pas pu etre changee.")
  return { id: n, decrit: true }
}

/** Le nom affiche vient du nom du profil : le renommer renomme l'agent. */
export function renommerAgent(nom, nouveau) {
  const a = exigerModifiable(normaliserNom(nom))
  const b = normaliserNom(nouveau, 'Le nouveau nom')
  if (a === b) return { id: a, renomme: false }
  const r = hermes(['rename', a, b])
  if (r.status !== 0) throw refus(r, "L'agent n'a pas pu etre renomme.")
  return { id: b, avant: a, renomme: true }
}

/**
 * Retirer un agent.
 *
 * Sans filet cote Hub : c'est Hermes qui efface, et il efface pour de bon - le
 * profil, ses sessions, sa memoire propre. L'interface doit donc demander
 * confirmation avant d'appeler ceci, comme elle le fait pour retirer une tache.
 */
export function retirerAgent(nom) {
  const n = exigerModifiable(normaliserNom(nom))
  const r = hermes(['delete', n, '--yes'])
  const texte = `${r.stdout || ''}${r.stderr || ''}`
  if (r.status !== 0 && !/deleted|supprime/i.test(texte)) {
    throw refus(r, "L'agent n'a pas pu etre retire.")
  }
  return { id: n, retire: true }
}
