/**
 * L'historique des conversations.
 *
 * Jusqu'ici le fil ne vivait que dans le navigateur : un rechargement, et tout
 * le raisonnement de la matinee disparaissait. Il est desormais ecrit au fil de
 * l'eau, un fichier par conversation.
 *
 * **Ce qui fait une conversation, c'est a qui on parle.** Une journee passee
 * avec l'equipe Musique est une conversation « Musique », pas quinze fils
 * epars ; et le jour ou on prend un agent a part, ca en fait une autre. C'est
 * la seule facon de retrouver quelque chose sans se souvenir de quand on l'a
 * dit - or on se souvient toujours de a qui.
 *
 * On garde les evenements bruts, reflexion et appels d'outils compris, plutot
 * que la seule reponse finale : c'est souvent le raisonnement qu'on revient
 * chercher.
 */
import fs from 'node:fs'
import path from 'node:path'
import { HUB_DIR } from './workspace.js'

const DOSSIER = path.join(HUB_DIR, 'conversations')

/**
 * Au-dela de ce silence, on repart sur une conversation neuve meme si
 * l'interlocuteur n'a pas change. Six heures separent une reprise apres le
 * dejeuner d'une reprise le lendemain matin : la premiere continue le fil, la
 * seconde en ouvre un autre.
 */
const REPRISE_MS = 6 * 60 * 60 * 1000

/** Ce qui merite d'etre relu. Le reste - eveil, sommeil, reprise, usage - est
    de l'etat instantane, sans interet une fois le moment passe. */
const GARDES = new Set([
  'moi',
  'tour-debut',
  'texte',
  'reflexion',
  'outil',
  'outil-maj',
  'bascule',
  'delegation',
  'tour-fin',
  /**
   * La carte de plan et ses changements d'etat.
   *
   * Sans ces deux-la, la carte vivait dans le direct et **disparaissait de la
   * relecture** : on rouvrait la conversation du lendemain et rien ne disait
   * qu'un plan avait ete propose, ni ce qu'on en avait fait. C'est exactement
   * F8 - « le fil doit porter l'etat de ce qu'il a propose, sinon il raconte
   * une histoire fausse des le lendemain ».
   */
  'carte-plan',
  'carte-plan-etat',
])

let courante = null
let aEcrire = false
let minuteur = null

function dossier() {
  try {
    fs.mkdirSync(DOSSIER, { recursive: true })
  } catch {
    /* deja la, ou disque en lecture seule : l'ecriture echouera plus bas */
  }
  return DOSSIER
}

function fichier(id) {
  return path.join(dossier(), `${id}.json`)
}

/** Ecriture differee : le texte arrive morceau par morceau, et ecrire un
    fichier par fragment ferait tourner le disque pour rien. */
function planifierEcriture() {
  aEcrire = true
  if (minuteur) return
  minuteur = setTimeout(() => {
    minuteur = null
    ecrire()
  }, 1500)
}

function ecrire() {
  if (!courante || !aEcrire) return
  aEcrire = false
  try {
    fs.writeFileSync(fichier(courante.id), JSON.stringify(courante, null, 2), 'utf8')
  } catch {
    /* Un historique qui ne s'ecrit pas ne doit jamais empecher de parler. */
  }
}

// -----------------------------------------------------------------------------
// A qui parle-t-on ?
// -----------------------------------------------------------------------------
const MOT_CLE_GROUPE = '@(?:pole|pôle|equipe|équipe)'

/**
 * La cible d'un message, qui sert de cle a la conversation.
 *
 * Le nom du groupe n'est pas devine ici : il arrive resolu avec l'evenement,
 * parce que lui seul depend de la liste des equipes existantes. Deux equipes
 * peuvent partager des membres - c'est le nom appele qui dit laquelle, pas les
 * destinataires.
 */
function cibler(texte, destinataires, groupes) {
  const nom = Array.isArray(groupes) && groupes.length ? String(groupes[0]).trim() : ''
  if (nom) return { portee: 'equipe', cible: nom, titre: nom }

  const liste = Array.isArray(destinataires) ? destinataires : []
  if (liste.length === 1) {
    return { portee: 'agent', cible: liste[0], titre: liste[0] }
  }
  if (liste.length > 1) {
    return { portee: 'groupe', cible: liste.join('+'), titre: `${liste.length} agents` }
  }
  return { portee: 'agent', cible: 'default', titre: 'default' }
}

/** Un nom d'equipe pose dans une expression reguliere : il peut contenir des
    espaces et des caracteres qui y ont un sens. */
function echapper(texte) {
  return String(texte).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Le titre d'une conversation est sa premiere phrase, debarrassee des
    mentions : « @equipe Musique on lance une chanson » se retrouve sous
    « on lance une chanson », ce qu'on cherchera reellement. */
function resumer(texte, groupes) {
  let propre = String(texte || '')
  for (const g of Array.isArray(groupes) ? groupes : []) {
    propre = propre.replace(new RegExp(`${MOT_CLE_GROUPE}\\s+${echapper(g)}`, 'giu'), ' ')
  }
  propre = propre
    .replace(/(?<!\S)@[\p{L}][\p{L}0-9_-]*/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return propre.slice(0, 90) || 'Sans titre'
}

// -----------------------------------------------------------------------------
// Enregistrement
// -----------------------------------------------------------------------------
/**
 * Appele pour chaque evenement diffuse. C'est le seul point de passage du Hub,
 * donc le seul endroit ou brancher l'historique sans le repeter partout.
 */
export function noter(evenement) {
  if (!evenement || !GARDES.has(evenement.type)) return

  // Ce qui appartient a un pole n'appartient pas a la conversation.
  //
  // Un agent qui execute une tache emet exactement les memes evenements qu'un
  // agent qui repond dans le fil - meme type, meme emetteur, meme flux. Sans
  // cette porte, un pole de sept taches viendrait s'ecrire dans la derniere
  // conversation ouverte, sous un titre qui ne parle pas de lui, et le fil
  // deviendrait illisible. Le resultat d'une tache, lui, est garde par Hermes
  // sur la tache elle-meme.
  if (evenement.pole) return

  if (evenement.type === 'moi') {
    const { portee, cible, titre } = cibler(
      evenement.texte,
      evenement.destinataires,
      evenement.groupes,
    )
    const cle = `${portee}:${cible}`
    const trop_vieux = !courante || Date.now() - courante.majLe > REPRISE_MS

    if (!courante || courante.cle !== cle || trop_vieux) {
      ecrire()
      courante = {
        id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        cle,
        portee,
        cible,
        // Le nom lisible du groupe ou de l'agent, pour la liste laterale.
        interlocuteur: titre,
        titre: resumer(evenement.texte, evenement.groupes),
        debutLe: Date.now(),
        majLe: Date.now(),
        participants: [],
        evenements: [],
      }
    }
  }

  // Un evenement d'agent sans conversation ouverte : le Hub a redemarre en
  // cours de route. On n'invente pas de fil pour l'accueillir.
  if (!courante) return

  if (evenement.agent && !courante.participants.includes(evenement.agent)) {
    courante.participants.push(evenement.agent)
  }
  courante.evenements.push({ ...evenement, a: Date.now() })
  courante.majLe = Date.now()

  // Un tour qui se termine est un point de repos : on ecrit sans attendre.
  if (evenement.type === 'tour-fin') ecrire()
  else planifierEcriture()
}

// -----------------------------------------------------------------------------
// Lecture
// -----------------------------------------------------------------------------
/** La liste, sans les evenements : une conversation de trois heures pese, et
    la barre laterale n'a besoin que de son intitule. */
export function lister() {
  let noms
  try {
    noms = fs.readdirSync(dossier()).filter((n) => n.endsWith('.json'))
  } catch {
    return []
  }

  const fils = []
  for (const nom of noms) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(DOSSIER, nom), 'utf8'))
      fils.push({
        id: c.id,
        titre: c.titre,
        portee: c.portee,
        cible: c.cible,
        interlocuteur: c.interlocuteur,
        participants: c.participants || [],
        debutLe: c.debutLe,
        majLe: c.majLe,
        messages: (c.evenements || []).filter((e) => e.type === 'moi').length,
        encours: courante?.id === c.id,
      })
    } catch {
      /* fichier illisible : il ne doit pas emporter toute la liste */
    }
  }

  // Ce qui vient d'etre dit remonte : on cherche presque toujours du recent.
  return fils.sort((a, b) => b.majLe - a.majLe)
}

export function lire(id) {
  // La conversation en cours vit en memoire : la relire sur disque rendrait une
  // version en retard d'un tour.
  if (courante && courante.id === id) return courante
  try {
    return JSON.parse(fs.readFileSync(fichier(id), 'utf8'))
  } catch {
    const err = new Error('Conversation introuvable.')
    err.status = 404
    throw err
  }
}

export function supprimer(id) {
  if (courante && courante.id === id) {
    // Jeter le fil ouvert n'interrompt personne : les agents continuent de
    // parler, simplement plus rien n'est garde de ce qui suit.
    courante = null
    aEcrire = false
  }
  try {
    fs.unlinkSync(fichier(id))
  } catch {
    /* deja disparu : le resultat voulu est atteint */
  }
  return { supprime: true }
}

/** Referme le fil courant sans rien effacer : le prochain message ouvrira une
    conversation neuve, meme adresse au meme interlocuteur. */
export function clore() {
  ecrire()
  courante = null
  return { clos: true }
}
