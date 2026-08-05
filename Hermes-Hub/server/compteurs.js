/**
 * Ce que le travail a coute, une fois qu'il a eu lieu.
 *
 * La simulation annonce une forme et un seul temps - celui du reveil, mesure.
 * Elle s'arrete la volontairement : la duree du travail lui-meme n'est pas
 * simulable, et pretendre le contraire donnerait un chiffre faux a une
 * decision serieuse. Ce module tient l'autre moitie, celle qu'on ne peut
 * connaitre qu'apres : combien de temps ca a pris, combien d'appels il a fallu,
 * et combien de fois le modele a du basculer.
 *
 * **Trois chiffres, et pas un de plus.** Chacun repond a une question qu'on se
 * pose vraiment devant un plan :
 *
 *   - la duree dit ou passe le temps. Une tache qui prend huit minutes quand
 *     ses voisines en prennent une n'est pas forcement mauvaise, mais c'est
 *     elle qu'on ira relire ;
 *   - les appels disent la peine. Un appel, c'est un tour reussi du premier
 *     coup ; trois appels sur la meme tache, c'est deux pannes rattrapees par
 *     la reprise, et personne ne l'aurait su ;
 *   - les bascules disent quel modele a reellement travaille. Un pole qui
 *     bascule a chaque tache tourne sur le repli, pas sur le cerveau qu'on
 *     croyait avoir choisi.
 *
 * On compte ce qui est arrive, pas ce qui aurait pu : une tache bloquee garde
 * ses chiffres. C'est meme la qu'ils servent le plus - une tache qui a brule
 * trois appels avant d'echouer ne se repare pas comme une qui a echoue net.
 *
 * Ecrit sur le disque, comme les validations et le banc : le Hub ne tourne que
 * quand on l'ouvre, et des compteurs qui repartent de zero a chaque demarrage
 * ne mesureraient plus rien des le lendemain.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

const FICHIER = path.join(HUB_DIR, 'compteurs.json')

/**
 * Au-dela, on oublie les plus anciens poles.
 *
 * Un fichier qui grossit sans borne finit par etre relu a chaque tache, et
 * c'est exactement pendant l'execution qu'on ne veut pas payer ca. Vingt poles
 * couvrent largement ce qu'on compare - le banc d'essai garde deja les plans,
 * lui, et c'est lui qu'on interroge pour l'histoire longue.
 */
const POLES_GARDES = 20

function tout() {
  const brut = readJson(FICHIER, null)
  return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}
}

/**
 * Une tache terminee - reussie ou bloquee.
 *
 * On ecrit par identifiant de tache plutot qu'en ajoutant a une liste : une
 * tache relancee apres un blocage remplace ses chiffres au lieu de les
 * doubler. Le tableau ne garde qu'un etat par tache, les compteurs font pareil.
 */
export function noterTache({ pole, tache, titre, agent, ms, appels, bascules, etat }) {
  if (!pole || !tache) return null

  const donnees = tout()
  const dossier = donnees[pole] || (donnees[pole] = { vuLe: 0, taches: {} })

  dossier.vuLe = Date.now()
  dossier.taches[tache] = {
    titre: titre || tache,
    agent: agent || 'default',
    ms: Math.max(0, Math.round(ms || 0)),
    appels: Math.max(1, appels || 1),
    bascules: Math.max(0, bascules || 0),
    etat: etat || 'done',
    finiLe: Date.now(),
  }

  /**
   * Les plus anciens partent, le pole qu'on vient d'ecrire JAMAIS.
   *
   * ⚠ CETTE PROMESSE ETAIT FAUSSE, et c'est un test intermittent qui l'a dite.
   * Le tri se fait sur `vuLe`, en millisecondes. Quand plusieurs poles sont
   * ecrits dans la MEME milliseconde - une machine rapide y arrive sans mal -
   * les dates sont egales, le tri stable retombe sur l'ordre d'insertion, et
   * ce sont alors les PLUS RECENTS qui se retrouvent au-dela du vingtieme
   * rang. Le pole qu'on venait d'ecrire pouvait donc etre efface dans la
   * foulee, et ses compteurs perdus sans que rien ne le signale.
   *
   * Vu une fois sur cinq passages le 05/08/2026. Un test qui echoue une fois
   * sur cinq n'est pas un test fragile : c'est un code qui a tort une fois sur
   * cinq, et qui aurait fini par le faire en production, un jour de charge.
   *
   * Deux corrections, et la premiere suffirait presque : le pole courant est
   * mis a l'abri AVANT le tri, plutot que d'esperer qu'il arrive en tete. La
   * seconde rend l'ordre deterministe a date egale - a defaut, deux executions
   * identiques n'effacent pas les memes.
   */
  const candidats = Object.entries(donnees)
    .filter(([id]) => id !== pole)
    .sort((a, b) => (b[1].vuLe || 0) - (a[1].vuLe || 0) || a[0].localeCompare(b[0]))

  for (const [id] of candidats.slice(POLES_GARDES - 1)) delete donnees[id]

  writeJson(FICHIER, donnees)
  return dossier.taches[tache]
}

/**
 * Les chiffres d'un pole, par tache et par agent.
 *
 * La somme des durees n'est pas la duree du pole : les taches d'une meme vague
 * tournent ensemble. On rend donc `cumul` - le temps d'agent depense - et on
 * laisse l'appelant dire lequel il affiche, plutot que d'inventer un total
 * qu'aucune horloge n'a mesure.
 */
export function lireCompteurs(poleId) {
  const dossier = tout()[poleId]
  if (!dossier) return { taches: [], agents: [], cumul: 0, appels: 0, bascules: 0 }

  const taches = Object.entries(dossier.taches).map(([id, t]) => ({ tache: id, ...t }))

  const parAgent = new Map()
  for (const t of taches) {
    const a = parAgent.get(t.agent) || { agent: t.agent, taches: 0, ms: 0, appels: 0, bascules: 0 }
    a.taches++
    a.ms += t.ms
    a.appels += t.appels
    a.bascules += t.bascules
    parAgent.set(t.agent, a)
  }

  return {
    taches,
    agents: [...parAgent.values()].sort((a, b) => b.ms - a.ms),
    cumul: taches.reduce((s, t) => s + t.ms, 0),
    appels: taches.reduce((s, t) => s + t.appels, 0),
    bascules: taches.reduce((s, t) => s + t.bascules, 0),
  }
}

/** Un pole qu'on rejoue depuis zero ne garde pas les chiffres de la veille. */
export function oublierCompteurs(poleId) {
  const donnees = tout()
  if (!(poleId in donnees)) return { oublie: false }
  delete donnees[poleId]
  writeJson(FICHIER, donnees)
  return { oublie: true }
}
