/**
 * Quel cerveau pense pour qui - et pourquoi ce fichier est ici et pas ailleurs.
 *
 * LE 05/08/2026, TREIZE AGENTS SE SONT TUS et il n'existait aucun moyen de les
 * reparer sans terminal. Le §7 du plan en a tire une architecture a deux
 * etages, decidee par kuchu : **un cerveau universel pour tout le Hub**, dont
 * tous les agents heritent, et **des exceptions declarees** - un specialiste sur
 * une tache etroite tourne en local, gratuit et insensible aux credits.
 *
 * ⚠ CE FICHIER N'ECRIT JAMAIS DANS LES PROFILS D'HERMES, ET C'EST LE POINT.
 * Le plan redoutait la « vraie difficulte » : reecrire treize `config.yaml` en
 * boucle oblige a savoir QUI NE PAS ECRASER, sinon le specialiste regle expres
 * se fait rattraper en silence par le reglage general - la panne la plus
 * vicieuse, celle qui defait un reglage que quelqu'un avait pose exprès.
 *
 * La mesure du 06/08 a supprime le probleme plutot que de le resoudre : **ACP
 * porte le modele par session**. `session/new` annonce la liste (36 modeles,
 * mesure), `session/set_model` la change (accepte en 2,4 s), et le fichier du
 * profil n'est jamais ouvert. Le choix vit donc ICI, dans `.hub`, chez nous.
 * Ce qu'on n'ecrit pas, on ne peut pas l'ecraser.
 *
 * DEUX ETAGES, ET LE VIDE EST UN ETAGE AUSSI. `universel` a `null` ne veut pas
 * dire « aucun modele » : il veut dire **on ne touche a rien**, chaque profil
 * garde le sien. C'est le defaut a l'installation, et il doit l'etre - un Hub
 * qui imposerait un cerveau des le premier lancement changerait un reglage que
 * personne ne lui a demande de changer.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

const FICHIER = path.join(HUB_DIR, 'cerveau.json')

/** Un identifiant de modele, tel qu'ACP les annonce : `fournisseur:modele`. */
function propre(v) {
  const s = String(v ?? '').trim()
  return s || null
}

export function lireCerveau() {
  const brut = readJson(FICHIER, null)
  const exceptions = {}
  const lues = brut && typeof brut === 'object' ? brut.exceptions : null
  if (lues && typeof lues === 'object' && !Array.isArray(lues)) {
    for (const [agent, modele] of Object.entries(lues)) {
      const m = propre(modele)
      if (m) exceptions[String(agent)] = m
    }
  }
  return { universel: propre(brut?.universel), exceptions }
}

/**
 * Poser le cerveau universel, ou l'exception d'un agent.
 *
 * Une exception a `null` n'est pas « pas de modele » : c'est **retirer
 * l'exception**, donc revenir a l'universel. Sans cette lecture, on ne pourrait
 * jamais defaire une exception sans en poser une autre - et une case qu'on
 * coche sans pouvoir la decocher n'est pas un reglage.
 */
export function ecrireCerveau(patch) {
  const etat = lireCerveau()
  if (patch && 'universel' in patch) etat.universel = propre(patch.universel)
  if (patch && patch.agent) {
    const agent = String(patch.agent)
    const modele = propre(patch.modele)
    if (modele) etat.exceptions[agent] = modele
    else delete etat.exceptions[agent]
  }
  writeJson(FICHIER, etat)
  return etat
}

/**
 * Le modele voulu pour un agent, ou `null` s'il n'y a rien a imposer.
 *
 * L'exception l'emporte sur l'universel : c'est tout son sens, et c'est la meme
 * grammaire que le panneau des outils MCP - toute l'equipe cochee d'avance, on
 * decoche les cas particuliers. Le defaut y est celui qui marche.
 */
export function modelePour(agentId) {
  const { universel, exceptions } = lireCerveau()
  return exceptions[String(agentId)] || universel || null
}
