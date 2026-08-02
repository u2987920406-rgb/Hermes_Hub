/**
 * La simulation locale - la porte qui precede toute execution.
 *
 * Elle rejoue un pole *sans appeler aucun modele*. Tout ce dont elle a besoin
 * est deja sur le disque : les taches et leurs liens dans `kanban.db`, les
 * agents dans les profils d'Hermes. C'est ce qui lui permet d'etre obligatoire
 * sans jamais devenir un peage qu'on desactive - elle ne coute rien.
 *
 * Ce qu'elle montre : **la forme du travail**. Qui se reveille, dans quel
 * ordre, qui recoit quoi, quels fichiers seraient touches, quelles
 * autorisations seraient demandees.
 *
 * Ce qu'elle ne montre pas : le contenu des reponses - il faudrait faire
 * tourner les modeles, et on ne serait plus dans une simulation. C'est
 * suffisant, parce que les deux erreurs qui coutent cher se voient dans la
 * forme : un mauvais routage, et un fichier qu'il ne fallait pas toucher.
 */
import path from 'node:path'
import { lireOrchestration } from './equipe.js'
import { enregistrer, listerVersions } from './versions.js'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

/**
 * Cout d'un reveil, mesure le 01/08/2026 par le pont ACP sur ce poste.
 *
 * Un agent n'est pas un appel de fonction : c'est un processus qui demarre,
 * charge ses outils et ouvre une session. C'est le seul temps que la
 * simulation ose annoncer, parce qu'il ne depend pas de ce que le modele aura
 * a dire. La duree du travail lui-meme n'est pas simulable, et pretendre le
 * contraire donnerait un chiffre faux a une decision serieuse.
 */
const REVEIL_MS = { local: 3500, portail: 6500 }

/** Un cerveau qui repond sur la machine : ni quota, ni reseau, ni coupure. */
function estLocal(modele) {
  return /^(ollama|local)[:/]/i.test(modele || '') || /:\d+b\b|^qwen|^gemma|^hermes3|^ornith/i.test(modele || '')
}

// -----------------------------------------------------------------------------
// Ce que la tache va toucher
// -----------------------------------------------------------------------------
/**
 * Les fichiers nommes dans le corps d'une tache.
 *
 * Le decomposeur ecrit des chemins concrets - c'est meme ce qui rend ses
 * taches executables. On les relit ici parce que « quel fichier va etre
 * ecrit » est la question a laquelle il faut repondre AVANT de lancer, pas
 * apres.
 */
const MOTIF_FICHIER = /(?:^|[\s`'"(\[])([\w./\\-]*[\w-]+\.(?:md|pdf|txt|csv|json|ya?ml|html?|docx?|xlsx?|png|jpe?g|svg))/gi

export function lireFichiers(corps) {
  const vus = new Map()
  for (const m of String(corps || '').matchAll(MOTIF_FICHIER)) {
    const brut = m[1].replace(/\\/g, '/')
    // Un nom de fichier sans dossier reste ambigu ; on le garde quand meme,
    // c'est a l'utilisateur de juger, mais on ne l'invente pas de chemin.
    if (!vus.has(brut)) vus.set(brut, { chemin: brut, dossier: path.posix.dirname(brut) })
  }
  return [...vus.values()]
}

/**
 * Les capacites que la tache va reclamer, lues dans sa formulation.
 *
 * On ne devine pas les outils reels - Hermes les choisira au moment venu.
 * On lit l'intention, qui suffit a poser la bonne question : est-ce que ce
 * travail sort de la machine, et est-ce qu'il ecrit quelque part ?
 */
const SIGNES = [
  {
    id: 'web',
    libelle: 'Sortir sur le web',
    risque: 'orange',
    motif: /\b(web|internet|en ligne|site[s]?|url|https?|naviguer|rechercher sur|sources? en ligne|scrap)/i,
  },
  {
    id: 'ecriture',
    libelle: 'Ecrire un fichier',
    risque: 'rouge',
    motif: /\b(ecri[rst]|redige[rz]?|genere[rz]?|generation|cree[rz]?|creation|exporte[rz]?|export|enregistre[rz]?|sauvegarde[rz]?|produi[rst]|sortie\s+pdf)/i,
  },
  {
    id: 'terminal',
    libelle: 'Lancer une commande',
    risque: 'rouge',
    motif: /\b(terminal|ligne de commande|shell|script|npm |pip |python |installe[rz]?)/i,
  },
  {
    id: 'lecture',
    libelle: 'Lire des fichiers',
    risque: 'vert',
    motif: /\b(li[rst]e?|lecture|analyse[rz]?|parcour[st]|inspecte[rz]?|extrai[rst]|extraction)/i,
  },
]

/**
 * Le decomposeur ecrit un francais accentue - « Generer le PDF » lui sort
 * « Générer ». Sans ce passage a plat, le motif d'ecriture ne reconnaissait
 * pas la seule tache du plan qui produit un fichier, et la simulation
 * annoncait un risque vert sur un export PDF. Un faux vert est pire qu'une
 * absence d'avis : il autorise.
 */
function sansAccents(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const ORDRE_RISQUE = { vert: 0, orange: 1, rouge: 2 }

function pire(a, b) {
  return ORDRE_RISQUE[a] >= ORDRE_RISQUE[b] ? a : b
}

export function lireCapacites(tache) {
  const texte = sansAccents(`${tache.titre || ''}\n${tache.corps || ''}`)
  return SIGNES.filter((s) => s.motif.test(texte)).map(({ id, libelle, risque }) => ({
    id,
    libelle,
    risque,
  }))
}

// -----------------------------------------------------------------------------
// L'ordre du travail
// -----------------------------------------------------------------------------
/**
 * Les vagues d'execution, par tri topologique.
 *
 * Un lien parent->enfant dit « le parent doit finir avant l'enfant » (voir
 * `grouperEnPoles` dans equipe.js). Une vague rassemble donc tout ce qui peut
 * partir en meme temps : c'est ce qui fait apparaitre le parallelisme a l'oeil
 * nu, alors qu'une simple liste ordonnee le cacherait.
 *
 * Un cycle ne fait pas echouer la simulation : les taches restantes sont
 * versees dans une derniere vague et signalees. Un graphe cyclique est une
 * anomalie a montrer, pas une raison de ne rien montrer.
 */
function decouperEnVagues(taches, liens) {
  const ids = new Set(taches.map((t) => t.id))
  const restants = new Map(taches.map((t) => [t.id, t]))
  const parents = new Map(taches.map((t) => [t.id, new Set()]))

  for (const l of liens) {
    if (ids.has(l.de) && ids.has(l.vers)) parents.get(l.vers).add(l.de)
  }

  const vagues = []
  const faits = new Set()

  while (restants.size) {
    const prets = [...restants.values()].filter((t) =>
      [...parents.get(t.id)].every((p) => faits.has(p)),
    )

    if (!prets.length) {
      vagues.push({ taches: [...restants.values()], cycle: true })
      break
    }

    for (const t of prets) {
      faits.add(t.id)
      restants.delete(t.id)
    }
    vagues.push({ taches: prets, cycle: false })
  }

  return { vagues, parents }
}

// -----------------------------------------------------------------------------
// La simulation
// -----------------------------------------------------------------------------
/**
 * Rejoue un pole. Aucun processus lance, aucun appel modele, aucune ecriture.
 *
 * @param {string} poleId identifiant du pole (celui de sa tache de jonction)
 */
export async function simuler(poleId) {
  const etat = await lireOrchestration()

  if (!etat.tableau.disponible) {
    const err = new Error('Le tableau des taches ne peut pas etre lu : rien a simuler.')
    err.status = 409
    throw err
  }

  const pole = etat.poles.find((p) => p.id === poleId)
  if (!pole) {
    const err = new Error('Pole introuvable.')
    err.status = 404
    throw err
  }

  const parAgent = new Map(etat.agents.map((a) => [a.id, a]))
  const { vagues, parents } = decouperEnVagues(pole.taches, pole.liens)

  const alertes = []
  const fichiers = new Map()
  const autorisations = []
  const reveilles = new Set()
  let risqueGlobal = 'vert'
  let horloge = 0

  const vaguesRendues = vagues.map((vague, rang) => {
    // Les agents d'une vague travaillent ensemble : le temps de la vague est
    // celui du plus lent a se reveiller, pas la somme des reveils.
    let reveilVague = 0

    const taches = vague.taches.map((t) => {
      const agentId = t.agent || 'default'
      const agent = parAgent.get(agentId)
      const local = estLocal(agent?.modele)
      // Un agent deja reveille dans une vague precedente ne repaie pas son
      // demarrage : c'est toute la raison d'etre du delai de sommeil.
      const dejaLa = reveilles.has(agentId)
      const reveil = dejaLa ? 0 : local ? REVEIL_MS.local : REVEIL_MS.portail
      reveilles.add(agentId)
      reveilVague = Math.max(reveilVague, reveil)

      const capacites = lireCapacites(t)
      const risque = capacites.reduce((acc, c) => pire(acc, c.risque), 'vert')
      risqueGlobal = pire(risqueGlobal, risque)

      const siens = lireFichiers(t.corps)
      const ecrit = capacites.some((c) => c.id === 'ecriture')
      for (const f of siens) {
        const cle = f.chemin
        const deja = fichiers.get(cle)
        // Un fichier lu par une tache et ecrit par une autre est un fichier
        // ecrit : c'est le cas le plus engageant qui doit s'afficher.
        if (!deja || (ecrit && deja.action === 'lecture')) {
          fichiers.set(cle, { ...f, action: ecrit ? 'ecriture' : 'lecture', tache: t.id })
        }
      }

      for (const c of capacites) {
        if (c.risque === 'vert') continue
        autorisations.push({
          tache: t.id,
          agent: agentId,
          agentNom: agent?.nom || agentId,
          libelle: c.libelle,
          risque: c.risque,
        })
      }

      // Ce que la tache recoit : les resultats de ses parents. C'est
      // exactement ce que `hermes kanban context` donnera a l'agent au moment
      // du dispatch - on ne modelise rien de neuf.
      const entrees = [...parents.get(t.id)].map((id) => {
        const p = pole.taches.find((x) => x.id === id)
        return { id, titre: p?.titre || id }
      })

      if (!agent) {
        alertes.push({
          genre: 'agent-inconnu',
          tache: t.id,
          texte: `La tache « ${t.titre} » est confiee a « ${agentId} », qui n est pas un profil Hermes.`,
        })
      } else if (!agent.pretAServir) {
        alertes.push({
          genre: 'sans-cle',
          tache: t.id,
          texte: `${agent.nom} n a aucune credential : il ne repondra jamais. Cree-le avec --clone-from default.`,
        })
      } else if (agentId === 'default' && etat.agents.length > 2) {
        // Le risque reel du plan : une tache tombe sur Hermes faute de profil
        // dont la description corresponde. Ce n'est pas une panne, c'est un
        // routage rate - et ca ne se voit qu'ici, avant de lancer.
        alertes.push({
          genre: 'retombee',
          tache: t.id,
          texte: `« ${t.titre} » retombe sur Hermes : aucun specialiste ne s en est trouve digne. Affine la description d un agent pour la capter.`,
        })
      }

      return {
        id: t.id,
        titre: t.titre,
        corps: t.corps,
        etat: t.etat,
        agent: agentId,
        agentNom: agent?.nom || agentId,
        couleur: agent?.couleur || 'ardoise',
        icone: agent?.icone || 'agent',
        modele: t.modele || agent?.modele || null,
        local,
        reveil,
        dejaEveille: dejaLa,
        entrees,
        fichiers: siens,
        capacites,
        risque,
        demande: t.id === pole.id,
      }
    })

    horloge += reveilVague
    if (vague.cycle) {
      alertes.push({
        genre: 'cycle',
        texte:
          'Ces taches dependent les unes des autres en boucle : personne ne peut commencer. Le lien fautif est a retirer avant de lancer.',
      })
    }

    return { rang: rang + 1, taches, cycle: vague.cycle, reveilCumule: horloge }
  })

  // C'est simuler qui photographie - ici, et nulle part ailleurs. Un bouton
  // « garder » demanderait d'y penser au bon moment, et on n'y pense jamais
  // avant le remaniement qui ne vaut rien.
  const version = enregistrer(pole.id, pole, {
    vagues: vaguesRendues.length,
    reveilMs: horloge,
    risque: risqueGlobal,
    alertes: alertes.length,
  })

  return {
    pole: { id: pole.id, titre: pole.titre, corps: pole.corps },
    vagues: vaguesRendues,
    // Le banc suit la simulation : l'ecran qui l'affiche a deja tout.
    banc: listerVersions(pole.id),
    version: version.id,
    // Le seul temps annonce, et il est nomme pour ce qu'il est : la mise en
    // route de l'equipe, pas la duree du travail.
    reveilTotal: horloge,
    agents: [...reveilles].map((id) => {
      const a = parAgent.get(id)
      return {
        id,
        nom: a?.nom || id,
        couleur: a?.couleur || 'ardoise',
        icone: a?.icone || 'agent',
        modele: a?.modele || null,
        local: estLocal(a?.modele),
        pretAServir: a?.pretAServir !== false,
      }
    }),
    fichiers: [...fichiers.values()],
    autorisations,
    risque: risqueGlobal,
    alertes,
    validation: lireValidation(pole.id),
  }
}

// -----------------------------------------------------------------------------
// La porte
// -----------------------------------------------------------------------------
/**
 * L'accord est ecrit sur le disque, pas garde en memoire.
 *
 * Le Hub ne tourne que quand on l'ouvre : une validation qui ne survivrait pas
 * a la fermeture obligerait a tout revalider a chaque demarrage, et une porte
 * qu'on repousse dix fois par jour finit par etre retiree.
 */
const FICHIER_VALIDATIONS = path.join(HUB_DIR, 'validations.json')

function toutesValidations() {
  const brut = readJson(FICHIER_VALIDATIONS, null)
  return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}
}

export function lireValidation(poleId) {
  return toutesValidations()[poleId] || null
}

/**
 * Valide un pole - et rien de plus. Aucune execution ne part d'ici : la
 * validation ouvre la porte, elle ne pousse personne a travers.
 */
export function valider(poleId, empreinte) {
  const tout = toutesValidations()
  tout[poleId] = { valideLe: Date.now(), empreinte: empreinte || null }
  writeJson(FICHIER_VALIDATIONS, tout)
  return tout[poleId]
}

export function annulerValidation(poleId) {
  const tout = toutesValidations()
  delete tout[poleId]
  writeJson(FICHIER_VALIDATIONS, tout)
  return { valide: false }
}
