/**
 * Ce qu'on a appris d'un pole qui a marche.
 *
 * Un pole reussi disparait. Son graphe reste sur le tableau, ses livrables dans
 * son dossier, et la prochaine demande du meme genre repart de zero : on
 * redecoupe, on re-route, on repaie l'appel modele, et rien ne garantit qu'on
 * retombera sur la meme forme. C'est du travail qu'on refait sans le savoir.
 *
 * Une competence, ici, n'est donc pas un savoir abstrait : c'est **la forme
 * d'un travail qui a abouti**. Quels metiers, dans quel ordre, pour quels
 * livrables, et ce que ca a coute. Assez pour reconnaitre la prochaine demande
 * du meme genre et proposer ce qui avait fonctionne.
 *
 * ELLE VA DANS LE COFFRE, pas dans une base a nous. Le Coffre est deja le
 * cerveau long terme du poste, il s'ouvre dans Obsidian, il est sauvegarde avec
 * le reste, et il survit a une reinstallation du Hub. Une competence rangee
 * ailleurs serait une memoire de plus a tenir - et on sait depuis le kit
 * memoire ce que vaut une archive que personne ne relit.
 *
 * ON N'APPREND QUE CE QUI A ABOUTI. Une competence tiree d'un pole a moitie
 * echoue serait pire qu'aucune competence : on la proposerait plus tard, en
 * confiance, pour rejouer une forme qui n'a jamais fonctionne.
 */
import fs from 'node:fs'
import path from 'node:path'
import { VAULT_DIR } from './workspace.js'
import { vaultNote } from './templates.js'
import { lireCompteurs } from './compteurs.js'

const DOSSIER = path.join(VAULT_DIR, 'Skills')

/** Les mots trop courants pour distinguer une demande d'une autre. */
const VIDES = new Set(
  ('le la les un une des du de a au aux et ou ni mais donc or car que qui quoi ' +
    'dont ou pour par sur sous dans avec sans vers chez entre puis ensuite ' +
    'ce cet cette ces son sa ses leur leurs mon ma mes ton ta tes notre nos ' +
    'je tu il elle on nous vous ils elles se me te lui y en est sont etre ' +
    'avoir fait faire plus moins tres tout tous toute toutes autre autres')
    .split(/\s+/),
)

function sansAccents(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Les mots qui portent le sens d'une demande.
 *
 * Volontairement grossier : on ne cherche pas a comprendre, on cherche a
 * reconnaitre. Deux demandes qui parlent de ventes, de synthese et de PDF se
 * ressemblent assez pour qu'on propose la forme de la premiere - c'est a
 * l'utilisateur de juger, et il a la fiche sous les yeux pour le faire.
 */
function motsCles(texte) {
  return new Set(
    sansAccents(texte)
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length > 3 && !VIDES.has(m)),
  )
}

/**
 * Le titre d'une demande, ramene a ce qui se lit.
 *
 * Une demande porte souvent son contexte entier - « les donnees sont dans le
 * fichier C:/... ». Coupe brutalement, ca donne un titre de fiche qui s'arrete
 * au milieu d'un chemin. On coupe donc a la premiere phrase, et a defaut au
 * dernier mot entier.
 */
function titreLisible(brut) {
  const texte = String(brut || '').replace(/\s+/g, ' ').trim()
  const phrase = texte.split(/(?<=[.!?])\s/)[0] || texte
  if (phrase.length <= 90) return phrase
  const coupe = phrase.slice(0, 90)
  const espace = coupe.lastIndexOf(' ')
  return coupe.slice(0, espace > 40 ? espace : 90) + '...'
}

/** Un nom de fichier sur : le titre d'une demande contient de tout. */
function nomDeFichier(titre) {
  const base = sansAccents(titre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return (base || 'competence') + '.md'
}

function lireFrontmatter(texte) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(texte)
  if (!m) return {}
  const champs = {}
  for (const ligne of m[1].split(/\r?\n/)) {
    const c = /^(\w+):\s*(.*)$/.exec(ligne)
    if (!c) continue
    let v = c[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    }
    champs[c[1]] = v
  }
  return champs
}

/**
 * Apprendre d'un pole.
 *
 * @param {object} pole tel que `lireOrchestration` le rend
 * @param {Map<string,object>} parAgent les agents, pour nommer les metiers
 */
export function apprendre(pole, parAgent = new Map()) {
  if (!pole) {
    const err = new Error('Pole introuvable.')
    err.status = 404
    throw err
  }

  const taches = pole.taches || []
  const finies = taches.filter((t) => t.etat === 'done')
  const ratees = taches.filter((t) => t.etat === 'blocked')

  if (ratees.length || finies.length < taches.length) {
    const err = new Error(
      "Ce pole n'est pas alle au bout : on ne met en memoire qu'un travail qui a abouti.",
    )
    err.status = 409
    throw err
  }
  if (!finies.length) {
    const err = new Error("Ce pole n'a rien fait : il n'y a rien a apprendre.")
    err.status = 409
    throw err
  }

  // L'ordre du travail, lu dans les liens plutot que dans la liste : c'est la
  // forme qu'on veut garder, pas l'ordre d'insertion en base.
  const rang = new Map(taches.map((t) => [t.id, 0]))
  for (let i = 0; i < taches.length; i++) {
    for (const l of pole.liens || []) {
      if (!rang.has(l.de) || !rang.has(l.vers)) continue
      rang.set(l.vers, Math.max(rang.get(l.vers), rang.get(l.de) + 1))
    }
  }

  const compte = lireCompteurs(pole.id)
  const parTache = new Map((compte.taches || []).map((t) => [t.tache, t]))

  const etapes = [...taches]
    // La jonction porte la demande elle-meme : elle attend les autres et ne
    // fait rien de propre. L'inscrire en etape ferait croire a un travail de
    // plus, et son titre est la demande entiere - illisible dans un tableau.
    .filter((t) => t.id !== pole.id)
    .sort((a, b) => rang.get(a.id) - rang.get(b.id))
    .map((t) => {
      const a = parAgent.get(t.agent || 'default')
      return {
        titre: t.titre,
        agent: t.agent || 'default',
        metier: a?.metier || '',
        ms: parTache.get(t.id)?.ms || 0,
      }
    })

  const tags = [...motsCles(titreLisible(pole.titre))].slice(0, 8)
  const metiers = [...new Set(etapes.map((e) => e.metier).filter(Boolean))]

  const corps = [
    '## Competence acquise',
    '',
    `Une demande de ce genre se traite en ${etapes.length} etape${etapes.length > 1 ? 's' : ''}` +
      `, par ${metiers.length ? metiers.join(', ') : 'un seul agent'}.`,
    '',
    '| # | Metier | Ce qui est fait | Duree |',
    '|---|---|---|---|',
    ...etapes.map(
      (e, i) =>
        `| ${i + 1} | ${e.metier || e.agent} | ${e.titre.replace(/\|/g, '/')} | ` +
        `${e.ms ? Math.round(e.ms / 1000) + ' s' : '-'} |`,
    ),
    '',
    "## Comment on l'a apprise",
    '',
    `En la faisant. Demande d'origine :`,
    '',
    `> ${String(pole.titre).replace(/\n/g, ' ')}`,
    '',
    compte.cumul
      ? `Le pole est alle au bout en ${Math.round(compte.cumul / 1000)} s de travail cumule, ` +
        `${compte.appels} appel${compte.appels > 1 ? 's' : ''}` +
        (compte.bascules ? `, ${compte.bascules} bascule(s) de modele.` : '.')
      : 'Le pole est alle au bout.',
    '',
    "## Exemple d'utilisation",
    '',
    'Reformule une demande du meme genre : le Hub reconnaitra la forme et',
    'proposera cette fiche avant de decouper.',
    '',
    '## Liens',
    `- Pole d'origine : \`${pole.id}\``,
    '',
  ].join('\n')

  let note = vaultNote('Skills', titreLisible(pole.titre), corps)
  // Les tags portent la reconnaissance : sans eux, une competence ne serait
  // jamais reproposee. Le gabarit les laisse vides, on les remplit.
  note = note.replace('tags: []', `tags: [${tags.join(', ')}]`)
  note = note.replace('project: ', `pole: ${pole.id}`)

  fs.mkdirSync(DOSSIER, { recursive: true })
  const fichier = path.join(DOSSIER, nomDeFichier(titreLisible(pole.titre)))
  fs.writeFileSync(fichier, note, 'utf8')

  return { fichier, titre: pole.titre, etapes: etapes.length, tags }
}

/** Ce que le Coffre garde. Une lecture, aucune ecriture. */
export function lireCompetences() {
  let noms
  try {
    noms = fs.readdirSync(DOSSIER).filter((n) => n.toLowerCase().endsWith('.md'))
  } catch (e) {
    // PAS DE DOSSIER = PAS DE FICHE, et c'est l'etat normal d'une installation
    // neuve : `[]` dit vrai. Tout le reste - un fichier a la place du dossier,
    // un droit refuse, un disque reseau absent - est une PANNE, et la rendre
    // comme une liste vide ferait dire a l'ecran « aucune fiche » alors que le
    // Coffre est peut-etre plein. Le 06/08/2026, c'est exactement ce qu'on a
    // mesure en remplacant `Skills` par un fichier : 200 et zero fiche.
    if (e.code === 'ENOENT') return []
    const err = new Error(`Le Coffre n'a pas pu etre lu : ${e.message}`)
    err.status = 500
    throw err
  }

  const fiches = []
  for (const nom of noms) {
    const chemin = path.join(DOSSIER, nom)
    let texte
    try {
      texte = fs.readFileSync(chemin, 'utf8')
    } catch {
      continue
    }
    const f = lireFrontmatter(texte)
    // Le Coffre contient aussi des fiches ecrites a la main, et le gabarit
    // vierge livre par l'installateur. Une competence sans tag ne serait de
    // toute facon jamais reconnue - on ne l'inscrit pas dans la liste.
    const tags = Array.isArray(f.tags) ? f.tags : []
    if (!tags.length) continue

    const titre = (/^#\s+(.+)$/m.exec(texte) || [])[1] || nom.replace(/\.md$/i, '')
    fiches.push({
      fichier: nom,
      chemin,
      titre: titre.trim(),
      tags,
      pole: f.pole || null,
      date: f.date || null,
      /** Nombre d'etapes, lu dans le tableau de la fiche. */
      etapes: (texte.match(/^\| \d+ \| /gm) || []).length,
    })
  }
  return fiches
}

/**
 * Les competences qui ressemblent a une demande, la plus proche d'abord.
 *
 * C'est la proactivite promise par le plan, et elle est deliberement timide :
 * on propose, on ne substitue pas. Le decoupage reste celui d'Hermes ; la fiche
 * dit seulement « la derniere fois, voila ce qui avait marche ». Substituer
 * automatiquement rejouerait une forme sur une demande qui n'est pas la meme,
 * et personne ne saurait pourquoi le plan differe de ce qui etait demande.
 *
 * Le seuil tient a deux mots communs : un seul mot se partage par hasard - deux
 * demandes qui parlent de « rapport » n'ont rien a voir - alors que deux mots
 * porteurs ensemble designent presque toujours le meme genre de travail.
 */
export function proposerPour(texte, minimum = 2) {
  const mots = motsCles(texte)
  if (mots.size < minimum) return []

  return lireCompetences()
    .map((c) => {
      const communs = c.tags.filter((t) => mots.has(sansAccents(t)))
      return { ...c, communs, score: communs.length }
    })
    .filter((c) => c.score >= minimum)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export function oublierCompetence(fichier) {
  const chemin = path.join(DOSSIER, path.basename(String(fichier)))
  if (!chemin.startsWith(DOSSIER)) {
    const err = new Error('Chemin hors du Coffre.')
    err.status = 400
    throw err
  }
  try {
    fs.rmSync(chemin)
  } catch {
    const err = new Error('Cette competence est deja partie.')
    err.status = 404
    throw err
  }
  return { oubliee: path.basename(chemin) }
}
