/**
 * Le banc d'essai : ce qu'un plan etait, a chaque simulation.
 *
 * Une orchestration faite main ne se trouve pas du premier coup. On essaie, on
 * mesure, on recommence - et au troisieme essai on ne sait plus lequel etait
 * bon. Le banc garde donc une photo du plan a chaque simulation, avec sa
 * mesure, et laisse marquer d'une etoile ceux qui valent.
 *
 * **C'est simuler qui photographie**, rien d'autre. Pas de bouton « garder » :
 * il faudrait y penser au bon moment, et on n'y pense jamais avant la commande
 * qui casse tout. Entre deux simulations, l'etat courant n'est la photo de
 * personne.
 *
 * Ce qui n'est PAS dans la photo : l'etat des taches. Une tache qui passe de
 * `todo` a `done` ne change pas le plan - elle l'execute. Les garder ferait
 * deux versions differentes d'un meme decoupage, et le banc se remplirait de
 * doublons que personne ne sait distinguer.
 *
 * Ce fichier ne parle jamais au tableau : il lit des plans, les compare, les
 * nomme. Rejouer un ecart est un autre metier, et il passe par les verbes de
 * `graphe.js` - un seul ecrivain, toujours.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

const FICHIER = path.join(HUB_DIR, 'versions.json')

/**
 * Plafond defensif, pas une regle d'usage.
 *
 * Le tri se fait a l'etoile, quand on voit un bon resultat - pas au sixieme
 * essai par une corvee de rangement qui tombe en plein travail. Ce nombre
 * n'existe que pour qu'un fichier ne grossisse pas sans fin ; a vingt essais
 * non marques, le plus ancien s'efface en silence. Un favori ne s'efface
 * jamais tout seul.
 */
const GARDE = 20

function toutes() {
  const brut = readJson(FICHIER, null)
  return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}
}

function ecrire(tout) {
  writeJson(FICHIER, tout)
}

/** Le plan, et rien que le plan : ce qui existe, et ce qui depend de quoi. */
export function photographier(pole) {
  return {
    taches: (pole.taches || []).map((t) => ({
      id: t.id,
      titre: t.titre,
      corps: t.corps || '',
      agent: t.agent || null,
      modele: t.modele || null,
    })),
    liens: (pole.liens || []).map((l) => ({ de: l.de, vers: l.vers })),
  }
}

// -----------------------------------------------------------------------------
// L'ecart entre deux plans
// -----------------------------------------------------------------------------
/**
 * Six familles, parce que ce sont les six verbes qu'on sait rejouer.
 *
 * L'ecart sert deux fois : a nommer une version sans rien demander a
 * personne, et a la rejouer quand on y revient. Les deux lisent la meme
 * structure, donc un nom qui ment serait un retour qui se trompe.
 */
export function ecart(avant, apres) {
  const parId = (plan) => new Map((plan.taches || []).map((t) => [t.id, t]))
  const a = parId(avant)
  const b = parId(apres)

  const ajoutees = (apres.taches || []).filter((t) => !a.has(t.id))
  const retirees = (avant.taches || []).filter((t) => !b.has(t.id))

  const agents = []
  const modeles = []
  for (const t of apres.taches || []) {
    const vieux = a.get(t.id)
    if (!vieux) continue
    if ((vieux.agent || null) !== (t.agent || null)) {
      agents.push({ id: t.id, titre: t.titre, de: vieux.agent, vers: t.agent })
    }
    if ((vieux.modele || null) !== (t.modele || null)) {
      modeles.push({ id: t.id, titre: t.titre, de: vieux.modele, vers: t.modele })
    }
  }

  const cle = (l) => `${l.de}>${l.vers}`
  const avantL = new Set((avant.liens || []).map(cle))
  const apresL = new Set((apres.liens || []).map(cle))
  const poses = (apres.liens || []).filter((l) => !avantL.has(cle(l)))
  const retires = (avant.liens || []).filter((l) => !apresL.has(cle(l)))

  return { ajoutees, retirees, agents, modeles, poses, retires }
}

export function total(e) {
  return (
    e.ajoutees.length +
    e.retirees.length +
    e.agents.length +
    e.modeles.length +
    e.poses.length +
    e.retires.length
  )
}

// -----------------------------------------------------------------------------
// Le nom, ecrit tout seul
// -----------------------------------------------------------------------------
/**
 * Un titre entier deborde la ligne du banc.
 *
 * Trente signes suffisent a reconnaitre une tache - sauf quand le nom en cite
 * deux, comme « A delie de B » : la moitie, alors, sinon la ligne se casse en
 * deux et le banc cesse de se balayer de l'oeil.
 */
function court(titre, max = 30) {
  const t = String(titre || '').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

function titreDe(plan, id) {
  const t = (plan.taches || []).find((x) => x.id === id)
  return court(t?.titre || id, 16)
}

/**
 * Un gabarit sur l'ecart, jamais une phrase de modele.
 *
 * Gratuit, instantane et toujours juste - au prix d'une limite connue
 * d'avance : le nom ne reste lisible que tant qu'une seule famille a bouge.
 * Des qu'on a beaucoup remanie d'un coup, il retombe sur un decompte, et c'est
 * le bon comportement : mieux vaut « 6 changements » qu'une phrase qui en
 * nomme un et cache les cinq autres.
 */
export function nommer(avant, apres) {
  if (!avant) return `decoupage d-origine - ${(apres.taches || []).length} taches`

  const e = ecart(avant, apres)
  const combien = total(e)
  if (combien === 0) return null

  const familles = [e.ajoutees, e.retirees, e.agents, e.modeles, e.poses, e.retires]
  if (familles.filter((f) => f.length).length > 1) return `${combien} changements`

  if (e.agents.length) {
    const vers = e.agents[0].vers
    const memeCible = e.agents.every((c) => c.vers === vers)
    const nom = vers || 'personne'
    if (e.agents.length === 1) return `${court(e.agents[0].titre)} passe a ${nom}`
    return memeCible
      ? `${e.agents.length} taches reassignees a ${nom}`
      : `${e.agents.length} taches reassignees`
  }

  if (e.modeles.length) {
    if (e.modeles.length === 1) {
      const c = e.modeles[0]
      return c.vers
        ? `${court(c.titre)} epinglee sur ${c.vers}`
        : `${court(c.titre)} rendue au modele de son agent`
    }
    return `${e.modeles.length} modeles changes`
  }

  if (e.retires.length) {
    if (e.retires.length === 1) {
      const l = e.retires[0]
      return `${titreDe(avant, l.de)} delie de ${titreDe(avant, l.vers)}`
    }
    return `${e.retires.length} liens retires`
  }

  if (e.poses.length) {
    if (e.poses.length === 1) {
      const l = e.poses[0]
      return `${titreDe(apres, l.de)} relie a ${titreDe(apres, l.vers)}`
    }
    return `${e.poses.length} liens poses`
  }

  if (e.ajoutees.length) {
    return e.ajoutees.length === 1
      ? `${court(e.ajoutees[0].titre)} ajoutee`
      : `${e.ajoutees.length} taches ajoutees`
  }

  return e.retirees.length === 1
    ? `${court(e.retirees[0].titre)} retiree`
    : `${e.retirees.length} taches retirees`
}

// -----------------------------------------------------------------------------
// Le magasin
// -----------------------------------------------------------------------------
/** Les favoris ne tombent jamais : c'est tout ce qui distingue une etoile. */
function elaguer(liste) {
  const libres = liste.filter((v) => !v.favori)
  if (libres.length <= GARDE) return liste
  const condamnes = new Set(libres.slice(0, libres.length - GARDE).map((v) => v.id))
  return liste.filter((v) => !condamnes.has(v.id))
}

function resume(v) {
  return {
    id: v.id,
    prisLe: v.prisLe,
    revuLe: v.revuLe || v.prisLe,
    favori: !!v.favori,
    nom: v.nom,
    mesure: v.mesure,
    taches: (v.plan.taches || []).length,
  }
}

/**
 * La photo prise a chaque simulation.
 *
 * Un plan deja au banc n'y entre pas deux fois - et on cherche dans **tout** le
 * banc, pas seulement le dernier essai. Revenir a une version puis resimuler
 * ramene exactement le plan de cette version : la comparer au seul essai
 * precedent en ferait un jumeau sous un autre nom, et le banc se remplirait de
 * doublons que personne ne sait distinguer. C'est precisement ce qu'il existe
 * pour eviter.
 *
 * La date de prise ne bouge pas pour autant : elle dit quand ce plan est
 * apparu. `revuLe` dit quand on l'a revu.
 */
export function enregistrer(poleId, pole, mesure) {
  const tout = toutes()
  const liste = tout[poleId] || []
  const plan = photographier(pole)
  const precedent = liste.length ? liste[liste.length - 1] : null

  const connu = liste.find((v) => total(ecart(v.plan, plan)) === 0)
  if (connu) {
    connu.mesure = mesure
    connu.revuLe = Date.now()
    tout[poleId] = liste
    ecrire(tout)
    return resume(connu)
  }

  const version = {
    id: `v${Date.now().toString(36)}`,
    prisLe: Date.now(),
    revuLe: Date.now(),
    favori: false,
    nom: nommer(precedent ? precedent.plan : null, plan),
    mesure,
    plan,
  }
  tout[poleId] = elaguer([...liste, version])
  ecrire(tout)
  return resume(version)
}

/** Le banc, du plus ancien au plus recent - sans les plans, qui pesent. */
export function listerVersions(poleId) {
  return (toutes()[poleId] || []).map(resume)
}

export function lireVersion(poleId, versionId) {
  return (toutes()[poleId] || []).find((v) => v.id === versionId) || null
}

/** L'etoile : le seul geste de tri, et il se pose quand on voit un bon resultat. */
export function marquerFavori(poleId, versionId, favori) {
  const tout = toutes()
  const liste = tout[poleId] || []
  const v = liste.find((x) => x.id === versionId)
  if (!v) {
    const err = new Error('Cette version n-est plus au banc.')
    err.status = 404
    throw err
  }
  v.favori = !!favori
  tout[poleId] = liste
  ecrire(tout)
  return resume(v)
}

export function oublierVersion(poleId, versionId) {
  const tout = toutes()
  const liste = tout[poleId] || []
  if (!liste.some((v) => v.id === versionId)) {
    const err = new Error('Cette version n-est plus au banc.')
    err.status = 404
    throw err
  }
  tout[poleId] = liste.filter((v) => v.id !== versionId)
  ecrire(tout)
  return { oubliee: versionId }
}

/**
 * Deux essais cote a cote.
 *
 * L'ecart est deja calcule pour nommer les versions, la mesure est deja rendue
 * par la simulation : comparer ne coute que de les mettre l'un en face de
 * l'autre. Le signe du reveil est la seule chose qu'on ajoute, parce que
 * « + 6 min » se lit et « 380000 » non.
 */
export function comparer(poleId, idA, idB) {
  const a = lireVersion(poleId, idA)
  const b = lireVersion(poleId, idB)
  if (!a || !b) {
    const err = new Error('Une des deux versions n-est plus au banc.')
    err.status = 404
    throw err
  }
  const e = ecart(a.plan, b.plan)
  return {
    a: resume(a),
    b: resume(b),
    ecart: e,
    changements: total(e),
    reveilDelta: (b.mesure?.reveilMs || 0) - (a.mesure?.reveilMs || 0),
  }
}

/** Un pole qui n'existe plus n'a pas de banc a garder. */
export function oublierBanc(poleId) {
  const tout = toutes()
  if (!(poleId in tout)) return { oublie: false }
  delete tout[poleId]
  ecrire(tout)
  return { oublie: true }
}
