/**
 * Faire arriver la memoire aux agents.
 *
 * POURQUOI CETTE PIECE EXISTE. Mesure du 03/08/2026 sur le poste de kuchu, seize
 * profils : `MEMORY.md` etait partout a l'identique, et `USER.md` - les huit
 * questions qu'il avait remplies le matin meme - n'existait qu'a deux endroits.
 * `default`, et `pascalus` cree APRES. Les quatorze autres avaient le gabarit
 * vide :
 *
 *     - Prenom : raf
 *     - Metier ou role :
 *     - Langue de travail : fr
 *
 * Sofia, Elena, le Redacteur, le Maquettiste : tous travaillaient sans savoir
 * qui les emploie. Hermes copie le fichier au moment ou le profil naquit, une
 * fois, et ne le regarde plus jamais. Ce n'est pas une copie, c'est un
 * instantane - et il perime le jour meme.
 *
 * C'est la meme panne que les serveurs MCP, deux semaines plus tot : quelque
 * chose de pose au terminal qui n'atteint pas ceux qui travaillent. Elle ne se
 * voit pas, parce qu'un agent mal renseigne ne tombe pas en panne. Il repond a
 * cote, poliment, et personne ne sait pourquoi.
 *
 * DEUX FICHIERS, PAS TROIS. `MEMORY.md` dit les regles et `USER.md` dit qui tu
 * es : ni l'un ni l'autre ne change selon l'agent a qui l'on parle. `SOUL.md`,
 * si - mesure le meme jour, les seize SOUL.md ont seize empreintes differentes.
 * Le caractere de Sofia n'est pas celui de Karim, et l'uniformiser aplatirait
 * l'equipe en un seul agent repete. Il reste donc dehors, et c'est une decision,
 * pas un oubli.
 *
 * LE BAC A SABLE RESTE VIDE. `clean` existe pour eprouver Hermes sans memoire ni
 * contexte - « Hermes brut, pour tester », dit sa propre vignette. Lui poser la
 * memoire de l'equipe lui retirerait sa seule raison d'etre.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const HERMES_HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')

/**
 * Ce qui se partage, et rien d'autre.
 *
 * Un fichier absent de cette liste n'est jamais recopie : c'est le garde-fou qui
 * empeche `SOUL.md` d'y entrer par distraction.
 */
export const PARTAGES = new Set(['MEMORY.md', 'USER.md'])

export function estPartage(nom) {
  return PARTAGES.has(nom)
}

// -----------------------------------------------------------------------------
// Ce qui reste chez Hermes
// -----------------------------------------------------------------------------
/**
 * LA MARQUE QUI RETIENT UNE SECTION.
 *
 * POURQUOI ELLE EXISTE, mesure le 06/08/2026. `MEMORY.md` porte des regles de
 * commit - « sous git, finir chaque commit par "Ensuite :" », « ADM.md en
 * cumulatif ». Elles sont justes, et elles ne concernent QUE l'orchestrateur :
 * un redacteur qui execute une tache du tableau ne commite pas, n'ecrit pas de
 * REPRISE.md, ne tient aucun ADM.md. Propagees telles quelles, elles coutaient
 * environ 103 jetons a chaque demarrage de chacun des onze agents, pour une
 * consigne qu'aucun d'eux n'appliquera jamais.
 *
 * ⚠ ET ON NE POUVAIT PAS SIMPLEMENT LES RETIRER DU FICHIER : `default` **est**
 * Hermes. Son `MEMORY.md` est a la fois sa memoire et la source de celle des
 * autres. Enlever les lignes les lui aurait enlevees a lui aussi. Ce n'est donc
 * pas le fichier qu'il fallait changer, c'est la COPIE.
 *
 * LA MARQUE EST UN COMMENTAIRE HTML SUR LE TITRE. Trois raisons :
 *
 *   - elle se voit dans l'editeur - c'est la que kuchu ecrit - et disparait a
 *     l'affichage markdown, donc elle n'encombre pas la lecture ;
 *   - elle porte sur une SECTION, pas sur une ligne. Retenir des puces une par
 *     une serait fragile : deplacer une ligne suffirait a la faire partir ;
 *   - un fichier sans marque se propage entier, exactement comme avant. Rien de
 *     ce qui existe ne change de comportement.
 *
 * On coupe du titre marque jusqu'au prochain titre de niveau egal ou superieur.
 */
export const MARQUE = 'hermes-seul'

const TITRE = /^(#{1,6})\s+(.*)$/

/**
 * Le texte tel que l'equipe doit le recevoir : sans les sections marquees.
 *
 * Rend le texte inchange quand il n'y a aucune marque - et c'est le cas de
 * `USER.md` comme de tout fichier ecrit avant cette regle.
 */
export function pourEquipe(texte) {
  const source = String(texte ?? '')
  if (!source.includes(MARQUE)) return source

  /**
   * ⚠ ON DECOUPE SUR `\r?\n`, ET CE N'EST PAS UN DETAIL DE CONFORT.
   *
   * Premiere version : `split('\n')`, donc chaque ligne d'un fichier Windows
   * gardait son `\r` final. Or en JavaScript **`.` ne franchit pas un `\r`** -
   * c'est un terminateur de ligne - et `$` sans le drapeau `m` exige la fin de
   * la chaine. Le motif de titre ne reconnaissait donc AUCUN titre dans un
   * fichier CRLF, et `pourEquipe()` rendait le texte entier.
   *
   * Les tests etaient verts : ils sont ecrits en `\n` pur. C'est le vrai
   * `MEMORY.md` de kuchu - CRLF, comme tout ce que Windows ecrit - qui l'a
   * montre, en retenant **un seul caractere** au lieu d'une section. Le test
   * CRLF plus bas existe pour que ca ne repasse pas.
   */
  const lignes = source.split(/\r?\n/)
  const gardees = []
  /** Le niveau du titre qu'on saute, ou 0 quand on ne saute rien. */
  let saut = 0

  for (const ligne of lignes) {
    const titre = ligne.match(TITRE)
    if (titre) {
      const niveau = titre[1].length
      // Un titre de niveau egal ou superieur referme la section sautee.
      if (saut && niveau <= saut) saut = 0
      if (!saut && ligne.includes(MARQUE)) {
        saut = niveau
        continue
      }
    }
    if (!saut) gardees.push(ligne)
  }

  // Une section retiree laisse deux lignes vides collees : on les resserre, et
  // on garde exactement un saut de ligne final. Un fichier qui differe de sa
  // source par un blanc ferait afficher « en retard » a tout le monde, pour
  // rien.
  return gardees.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n')
}

/** Ou vit le fichier d'un agent. `default` est le home lui-meme. */
export function cheminAgent(nom, agent, home = HERMES_HOME) {
  return agent === 'default'
    ? path.join(home, 'memories', nom)
    : path.join(home, 'profiles', agent, 'memories', nom)
}

function lire(chemin) {
  try {
    return fs.readFileSync(chemin, 'utf8')
  } catch {
    return null
  }
}

/**
 * Qui a la bonne version, et qui ne l'a pas.
 *
 * Rendu tel quel a l'interface. Un agent en retard doit se VOIR - c'est la
 * lecon d'`outils.js` : « un outil que seul Hermes possede s'affiche 1 agent
 * sur 4, et le bouton d'a cote le repare ». Une propagation qui n'agirait qu'a
 * la prochaine sauvegarde laisserait quatorze agents muets pour un utilisateur
 * qui n'a plus rien a enregistrer.
 */
export function etatPropagation(nom, agents, { home = HERMES_HOME } = {}) {
  if (!estPartage(nom)) return { partage: false, aJour: [], enRetard: [] }

  const brut = lire(cheminAgent(nom, 'default', home))
  if (brut === null) return { partage: true, aJour: [], enRetard: [] }

  // ⚠ On compare a ce qui SERA copie, pas au fichier d'Hermes. Comparer au brut
  // afficherait « en retard » pour les onze agents a jamais, puisqu'aucun ne
  // recevra jamais la section retenue - et un compteur qui ne retombe jamais a
  // zero est un compteur qu'on cesse de lire.
  const source = pourEquipe(brut)

  const aJour = []
  const enRetard = []
  for (const agent of agents) {
    if (agent === 'default') continue
    if (lire(cheminAgent(nom, agent, home)) === source) aJour.push(agent)
    else enRetard.push(agent)
  }
  return { partage: true, aJour, enRetard, retenu: source !== brut }
}

/**
 * Poser la version de `default` chez tous les autres.
 *
 * L'ancienne version part en `.bak` a cote, comme le fait `ecrireMemoire` pour
 * le fichier principal : ecraser la memoire de quelqu'un sans filet n'est pas
 * un geste qu'on fait en silence. Un agent deja a jour n'est pas reecrit - ca
 * eviterait surtout de remplacer son `.bak` par une copie de lui-meme, qui lui
 * ferait perdre son seul retour en arriere.
 *
 * Ne jette jamais : un profil illisible ne doit pas empecher les quinze autres
 * de recevoir. Les echecs sont rendus, pas avales.
 */
export function propager(nom, agents, { home = HERMES_HOME } = {}) {
  if (!estPartage(nom)) return { fichier: nom, partage: false, portee: [], echecs: [] }

  const cheminSource = cheminAgent(nom, 'default', home)
  const brut = lire(cheminSource)
  if (brut === null) {
    const err = new Error(`${nom} n'existe pas encore : rien a propager.`)
    err.status = 404
    throw err
  }
  // Ce qui part n'est pas ce qu'Hermes garde : les sections marquees restent
  // chez lui. Voir `MARQUE`, plus haut.
  const source = pourEquipe(brut)

  const portee = []
  const echecs = []
  for (const agent of agents) {
    if (agent === 'default') continue
    const dest = cheminAgent(nom, agent, home)
    try {
      if (lire(dest) === source) continue
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      if (fs.existsSync(dest)) fs.copyFileSync(dest, `${dest}.bak`)
      fs.writeFileSync(dest, source, 'utf8')
      portee.push(agent)
    } catch (e) {
      echecs.push({ agent, message: e.message })
    }
  }
  return { fichier: nom, partage: true, portee, echecs, retenu: source !== brut }
}
