/**
 * Ce qui passe sans toi, ce qui te demande, et ce qui t'exige.
 *
 * Jusqu'ici toute demande d'autorisation remontait a l'ecran, quelle qu'elle
 * soit. Sur un pole a six agents, lire un fichier deja lu dix fois arrete tout
 * autant que l'effacer - et une porte qu'on repousse cent fois par jour finit
 * par etre retiree en entier. C'est ce risque-la qu'on evite : mieux vaut une
 * porte qui ne s'ouvre que sur ce qui compte qu'une porte que personne ne
 * regarde plus.
 *
 * **On classe l'action reellement demandee, pas la tache qui l'a amenee.**
 * `lireCapacites` lit l'intention dans la formulation, et c'est bon pour
 * annoncer une forme avant de lancer ; ce serait mauvais ici. Le 03/08/2026,
 * un export PDF est passe pour vert parce que « Générer » portait un accent que
 * le motif ne reconnaissait pas. Un faux vert qui s'affiche est une erreur
 * d'affichage ; un faux vert qui AUTORISE est une action non voulue. On prend
 * donc la seule chose qui decrive l'acte lui-meme : le `kind` que le protocole
 * ACP attache a chaque appel d'outil.
 *
 * Trois niveaux, et la difference entre les deux derniers n'est pas cosmetique :
 *
 *   - vert : repond tout seul, et le DIT. Un accord silencieux serait un
 *     mensonge par omission - le flux montre la demande et la reponse, comme
 *     si tu avais clique ;
 *   - orange : te demande. Tu peux repondre « toujours », et Hermes s'en
 *     souviendra ;
 *   - rouge : te demande, et l'option « toujours » est retiree. Ecrire,
 *     effacer, lancer une commande se redemandent a chaque fois. Un agent
 *     detourne une seule fois ne doit pas emporter une permission permanente.
 *
 * Le tout se coupe d'un reglage : rien ici n'est indispensable au
 * fonctionnement, et le jour ou ce classement se trompe, on doit pouvoir
 * revenir a « tout demander » sans redemarrer le Hub.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

/**
 * Les genres du protocole ACP, ranges par ce qu'ils font vraiment.
 *
 * `read` et `search` regardent sans rien changer : c'est le gros du trafic, et
 * c'est ce qui rendait la porte insupportable. `fetch` sort sur le reseau -
 * rien n'est detruit, mais quelque chose quitte la machine ou y entre, donc on
 * demande. `edit`, `delete` et `execute` touchent au disque ou lancent du code.
 *
 * Ce qu'on ne connait pas est orange, jamais vert. Un genre inconnu est un
 * genre qu'on n'a pas su lire, et l'inconnu ne se laisse pas passer.
 */
const PAR_GENRE = {
  read: 'vert',
  search: 'vert',
  think: 'vert',
  fetch: 'orange',
  move: 'orange',
  switch_mode: 'orange',
  edit: 'rouge',
  delete: 'rouge',
  execute: 'rouge',
}

const FICHIER = path.join(HUB_DIR, 'laissez-passer.json')

/**
 * Actif par defaut.
 *
 * Un garde-fou qu'il faut allumer soi-meme n'est allume par personne. Et le
 * defaut ne peut pas etre dangereux ici : ce qui passe seul est ce qui lit.
 */
export function lireReglage() {
  const brut = readJson(FICHIER, null)
  return { actif: brut?.actif !== false }
}

export function ecrireReglage(actif) {
  writeJson(FICHIER, { actif: !!actif })
  return lireReglage()
}

/**
 * Le verdict sur une demande.
 *
 * @param {{ kind?: string, title?: string }} toolCall l'appel tel qu'ACP le decrit
 * @returns {{ risque: 'vert'|'orange'|'rouge', genre: string }}
 */
export function classer(toolCall) {
  const genre = String(toolCall?.kind || 'other')
  return { risque: PAR_GENRE[genre] || 'orange', genre }
}

/**
 * Ce qu'on fait d'une demande : y repondre seul, ou la poser.
 *
 * Rend l'option a jouer quand elle passe seule, et sinon la liste des options a
 * montrer - amputee de « toujours » sur le rouge.
 *
 * Un vert sans option « autoriser » ne passe pas tout seul : on ne devine pas
 * quelle reponse Hermes attend, et repondre au hasard vaut moins que demander.
 */
export function arbitrer(toolCall, options) {
  if (!lireReglage().actif) return { risque: null, auto: null, options }

  const { risque, genre } = classer(toolCall)

  if (risque === 'vert') {
    const oui = options.find((o) => String(o.genre || '').startsWith('allow'))
    if (oui) return { risque, genre, auto: oui, options }
    return { risque, genre, auto: null, options }
  }

  if (risque === 'rouge') {
    // « Toujours » retire, pas grise : une option affichee et refusee au clic
    // se lit comme une panne.
    //
    // Sauf s'il ne reste alors plus AUCUN moyen de dire oui. La condition porte
    // sur cela, et non sur « la liste n'est pas vide » : un refus survivant
    // suffisait a la satisfaire, et la carte ne proposait plus que de refuser -
    // une tache qu'on ne pouvait plus debloquer, sans que rien ne l'explique.
    const sansToujours = options.filter((o) => !String(o.genre || '').includes('always'))
    const resteUnOui = sansToujours.some((o) => String(o.genre || '').startsWith('allow'))
    return { risque, genre, auto: null, options: resteUnOui ? sansToujours : options }
  }

  return { risque, genre, auto: null, options }
}
