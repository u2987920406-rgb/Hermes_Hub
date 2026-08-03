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

  const source = lire(cheminAgent(nom, 'default', home))
  if (source === null) return { partage: true, aJour: [], enRetard: [] }

  const aJour = []
  const enRetard = []
  for (const agent of agents) {
    if (agent === 'default') continue
    if (lire(cheminAgent(nom, agent, home)) === source) aJour.push(agent)
    else enRetard.push(agent)
  }
  return { partage: true, aJour, enRetard }
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
  const source = lire(cheminSource)
  if (source === null) {
    const err = new Error(`${nom} n'existe pas encore : rien a propager.`)
    err.status = 404
    throw err
  }

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
  return { fichier: nom, partage: true, portee, echecs }
}
