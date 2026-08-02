/**
 * Le Studio : ce que l'utilisateur a dispose lui-meme.
 *
 * Le graphe sait se ranger tout seul - par profondeur, en rangees - et c'est
 * ce qu'il fait la premiere fois. Mais un agencement automatique est une
 * proposition, pas une decision : des qu'on deplace un noeud a la main, c'est
 * cette main-la qui fait foi, et elle doit survivre a la fermeture de la page.
 *
 * Un fichier plutot qu'une table : les positions sont un reglage d'interface,
 * pas une donnee metier. Le tableau kanban reste la seule source de verite sur
 * ce qui existe et ce qui depend de quoi ; ici on ne stocke que le « ou ».
 *
 * Consequence voulue : perdre ce fichier ne perd aucun travail. Le graphe se
 * range a nouveau tout seul, et on recommence a le disposer.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

const FICHIER = path.join(HUB_DIR, 'dispositions.json')

/** @returns {{ noeuds: Record<string, {x:number,y:number}> }} */
export function lireDisposition(poleId) {
  const tout = readJson(FICHIER) || {}
  const d = tout[poleId]
  return { noeuds: d && typeof d.noeuds === 'object' ? d.noeuds : {} }
}

/**
 * Enregistre les positions d'un pole.
 *
 * On ecrit ce qu'on recoit sans le confronter au tableau : une tache qui
 * disparait laisse une position orpheline, et c'est sans consequence - la
 * lecture ne s'en sert que pour les noeuds qui existent encore. Nettoyer
 * demanderait de lire le kanban a chaque glissement de souris, pour ranger
 * quelques octets.
 */
export function ecrireDisposition(poleId, noeuds) {
  const tout = readJson(FICHIER) || {}
  const propres = {}
  for (const [id, p] of Object.entries(noeuds || {})) {
    const x = Number(p?.x)
    const y = Number(p?.y)
    // Un NaN glisse dans le fichier se propagerait en position invalide et le
    // noeud disparaitrait de l'ecran sans message.
    if (Number.isFinite(x) && Number.isFinite(y)) propres[id] = { x, y }
  }
  tout[poleId] = { noeuds: propres, majLe: Date.now() }
  writeJson(FICHIER, tout)
  return { enregistre: Object.keys(propres).length }
}

/** Rendre la main au rangement automatique. */
export function oublierDisposition(poleId) {
  const tout = readJson(FICHIER) || {}
  delete tout[poleId]
  writeJson(FICHIER, tout)
  return { oublie: true }
}
