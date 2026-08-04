/**
 * LE GARDE-FOU DU DESIGN - `npm run design`
 *
 * Il fait quatre choses depuis le chantier 2. Les deux premieres tiennent
 * l'index du design, les deux dernieres empechent le code d'empirer - elles
 * vivent dans le meme script parce qu'elles se lancent dans le meme geste, et
 * qu'une verification qu'il faut penser a appeler n'est pas une verification.
 *
 *   - il ECRIT ce qui est un fait : la liste des zones et ou elles vivent, la
 *     liste des molettes et leur valeur. Ces tableaux sont regeneres, donc ils
 *     ne peuvent pas mentir.
 *   - il VERIFIE ce qui est de la prose : les libelles, les renvois, les
 *     colonnes « sinon ». Un humain les ecrit une fois ; le script s'assure
 *     seulement qu'aucune zone n'a ete oubliee ni laissee derriere.
 *   - il TIENT LE CLIQUET DES TAILLES : chaque fichier porte sa marque dans
 *     `design/tailles.json`, et ne peut plus la depasser. Voir plus bas.
 *   - il SIGNALE LES EXPORTS MORTS : ce que plus personne n'importe. Voir plus
 *     bas aussi.
 *
 * Pourquoi ce partage plutot que tout generer : la valeur de l'index est dans
 * la phrase « une bulle d'agent qui parle », qu'aucun script ne saura ecrire.
 * Et pourquoi ne pas tout ecrire a la main : un index redige se contredit au
 * troisieme commit, et un index faux envoie chercher au mauvais endroit avec
 * assurance.
 *
 * Il sort en erreur des qu'une zone manque, des qu'une zone a disparu du code
 * sans quitter le document, ou des qu'un composant visible n'a pas de nom.
 * C'est ce qui empeche l'exhaustivite de se degrader au commit suivant.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(RACINE, 'src')
const DOC = path.join(RACINE, 'DESIGN.md')
const CSS = path.join(SRC, 'index.css')

const PREFIXES = ['--texte-', '--agent-', '--bulle-', '--densite']

/** Les fichiers dispenses de nom de zone : ils ne dessinent rien par eux-memes. */
const SANS_ZONE = new Set(['main.tsx', 'App.tsx'])

// -----------------------------------------------------------------------------
// Lecture
// -----------------------------------------------------------------------------
function fichiersTsx(dossier) {
  const sortie = []
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    if (e.isDirectory()) sortie.push(...fichiersTsx(p))
    else if (e.name.endsWith('.tsx')) sortie.push(p)
  }
  return sortie
}

/** Les zones posees dans le code, avec leur fichier. */
function zonesDuCode() {
  const zones = new Map()
  const muets = []

  for (const f of fichiersTsx(SRC)) {
    const nom = path.basename(f)
    const texte = fs.readFileSync(f, 'utf8')
    const trouvees = [...texte.matchAll(/data-zone="([a-z0-9-]+)"/g)].map((m) => m[1])
    const relatif = path.relative(RACINE, f).replace(/\\/g, '/')

    for (const z of trouvees) {
      if (!zones.has(z)) zones.set(z, relatif)
    }
    // Un fichier qui rend du JSX sans nommer une seule zone est introuvable
    // autrement qu'en le lisant - exactement ce qu'on cherche a supprimer.
    if (!trouvees.length && !SANS_ZONE.has(nom) && /return \(/.test(texte)) muets.push(relatif)
  }
  return { zones, muets }
}

/** Les molettes declarees, avec leur valeur et leur commentaire de fin de ligne. */
function molettesDuCss() {
  const lignes = fs.readFileSync(CSS, 'utf8').split('\n')
  const sortie = []
  for (const l of lignes) {
    const m = l.match(/^\s*(--[a-z-]+):\s*([^;]+);\s*(?:\/\*\s*(.*?)\s*\*\/)?/)
    if (!m) continue
    if (!PREFIXES.some((p) => m[1].startsWith(p))) continue
    if (sortie.some((s) => s.nom === m[1])) continue
    sortie.push({ nom: m[1], valeur: m[2].trim(), note: m[3] || '' })
  }
  return sortie
}

// -----------------------------------------------------------------------------
// LE CLIQUET DES TAILLES
//
// `ARCHITECTURE.md` pose la regle - un fichier repond a une seule question, et
// au-dela d'environ 400 lignes il en contient une deuxieme. Une regle sans
// verification est un voeu : c'est precisement son absence qui a laisse trois
// fichiers atteindre 1 500 lignes sans que personne ne le decide.
//
// Le cliquet n'exige AUCUN grand rangement. Il enregistre la taille de chaque
// fichier et refuse seulement qu'elle augmente ; quand un fichier maigrit, sa
// marque descend avec lui et ne remonte plus. On n'a donc jamais a ouvrir un
// chantier de nettoyage : le code ne peut plus qu'aller dans le bon sens, au
// rythme ou on le touche.
//
// Deux choix qui comptent :
//
//   - la marque d'un fichier qui a grossi n'est PAS mise a jour. Sans ca, un
//     second `npm run design` avalerait en silence ce que le premier a refuse,
//     et le garde-fou deviendrait un compteur ;
//   - un fichier neuf entre avec sa taille du jour, sans rien casser. Ajouter
//     ne demande la permission de personne - c'est la propriete qu'on ne veut
//     surtout pas perdre.
// -----------------------------------------------------------------------------
const TAILLES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tailles.json')

/** Une marge de deux lignes : un commentaire de plus n'est pas une regression,
    et un garde-fou qui crie pour rien s'apprend a ignorer. */
const JEU = 2

function fichiersDeCode(dossier) {
  const sortie = []
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    if (e.isDirectory()) sortie.push(...fichiersDeCode(p))
    else if (/\.tsx?$/.test(e.name)) sortie.push(p)
  }
  return sortie
}

function cliquetDesTailles() {
  const anciennes = fs.existsSync(TAILLES)
    ? JSON.parse(fs.readFileSync(TAILLES, 'utf8'))
    : {}
  const nouvelles = {}
  const debordements = []

  for (const f of fichiersDeCode(SRC)) {
    const cle = path.relative(RACINE, f).replace(/\\/g, '/')
    const lignes = fs.readFileSync(f, 'utf8').split('\n').length
    const marque = anciennes[cle]

    if (marque === undefined) {
      nouvelles[cle] = lignes
    } else if (lignes > marque + JEU) {
      // On garde l'ancienne marque : le prochain passage reposera la meme
      // question tant que le fichier n'aura pas maigri ou qu'on n'aura pas
      // decide de relever la marque a la main, en le disant.
      nouvelles[cle] = marque
      debordements.push({ cle, marque, lignes })
    } else {
      nouvelles[cle] = Math.min(marque, lignes)
    }
  }

  // Un fichier disparu quitte le fichier de marques : sinon il empecherait de
  // recreer un jour un fichier du meme nom, avec une marque venue d'ailleurs.
  const partis = Object.keys(anciennes).filter((c) => !(c in nouvelles))

  fs.writeFileSync(
    TAILLES,
    JSON.stringify(Object.fromEntries(Object.entries(nouvelles).sort()), null, 2) + '\n',
    'utf8',
  )

  return { debordements, partis, total: Object.keys(nouvelles).length }
}

// -----------------------------------------------------------------------------
// LES EXPORTS MORTS
//
// Un export que personne n'importe. `ecrireEquipes` est reste inutilise depuis
// le premier jour et `modifierAgent` n'a jamais eu de bouton : ce n'etait pas
// de la negligence, rien ne signalait leur mort.
//
// La detection est volontairement grossiere - elle compare des NOMS, pas des
// references. Elle rate donc un export reimporte sous un autre nom, et c'est
// tres bien : un garde-fou qui se trompe dans le sens du silence se garde ;
// celui qui se trompe dans le sens du cri se contourne, puis meurt.
//
// LUI AUSSI EST UN CLIQUET, et pour la meme raison que celui des tailles : le
// depot en portait treize le jour ou la detection a ete ecrite. Exiger leur
// disparition d'un coup aurait ouvert un chantier que personne n'avait decide -
// et `types/index.ts`, qui en porte neuf, est justement le fichier qu'on a
// promis de decouper domaine par domaine, le jour ou l'on y touche.
//
// `design/exports-morts.json` porte donc la dette du jour, chaque entree avec
// SA RAISON. Un export mort de plus fait echouer la verification ; pour en
// accepter un, il faut l'inscrire a la main dans ce fichier et ecrire pourquoi.
// C'est le seul endroit du dispositif ou une machine ne peut pas trancher : un
// export sans appelant est parfois une porte ouverte avant le geste qui
// l'emprunte. Une tolerance sans raison ecrite est une tolerance qu'on ne saura
// plus lever.
// -----------------------------------------------------------------------------
const DETTE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'exports-morts.json')

/** `export function X`, `export const X`, `export type X`, `export { A, B }`. */
function exportsDuFichier(texte) {
  const noms = new Set()
  for (const m of texte.matchAll(
    /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
  )) {
    noms.add(m[1])
  }
  for (const m of texte.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const brut of m[1].split(',')) {
      const nom = brut.trim().split(/\s+as\s+/).pop()?.trim()
      if (nom) noms.add(nom)
    }
  }
  return noms
}

/** Tout ce qu'un fichier importe, nomme ou par defaut. */
function importsDuFichier(texte) {
  const noms = new Set()
  for (const m of texte.matchAll(/import\s+(?:type\s+)?([^;]*?)\s+from\s+['"][^'"]+['"]/g)) {
    const clause = m[1]
    const defaut = clause.match(/^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/)
    if (defaut) noms.add(defaut[1])
    const accolades = clause.match(/\{([^}]*)\}/)
    if (accolades) {
      for (const brut of accolades[1].split(',')) {
        const nom = brut.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim()
        if (nom) noms.add(nom)
      }
    }
  }
  return noms
}

function exportsMorts() {
  const fichiers = fichiersDeCode(SRC).map((f) => ({
    cle: path.relative(RACINE, f).replace(/\\/g, '/'),
    texte: fs.readFileSync(f, 'utf8'),
  }))

  const importes = new Set()
  for (const f of fichiers) for (const n of importsDuFichier(f.texte)) importes.add(n)

  const trouves = []
  for (const f of fichiers) {
    // `main.tsx` est le point d'entree : personne ne l'importe, par definition.
    if (f.cle.endsWith('src/main.tsx')) continue
    for (const nom of exportsDuFichier(f.texte)) {
      if (importes.has(nom)) continue
      trouves.push({ nom, cle: f.cle })
    }
  }

  // Premier passage : on inscrit la dette telle qu'on la trouve, avec une
  // raison qui dit franchement qu'elle est heritee. Aucun jugement invente.
  if (!fs.existsSync(DETTE)) {
    const dette = Object.fromEntries(
      trouves
        .map((t) => [
          t.nom,
          `herite du chantier 2 (${t.cle}) - jamais importe : a trancher le jour ou l'on touche ce domaine`,
        ])
        .sort(),
    )
    fs.writeFileSync(DETTE, JSON.stringify(dette, null, 2) + '\n', 'utf8')
  }

  const dette = JSON.parse(fs.readFileSync(DETTE, 'utf8'))
  return {
    neufs: trouves.filter((t) => !(t.nom in dette)).map((t) => `${t.nom} (${t.cle})`),
    // Ce qui a ete rendu vivant - ou supprime - depuis. La ligne peut partir.
    guerris: Object.keys(dette).filter((n) => !trouves.some((t) => t.nom === n)),
    dette,
  }
}

// -----------------------------------------------------------------------------
// Ecriture
// -----------------------------------------------------------------------------
function remplacer(doc, balise, contenu) {
  const debut = `<!-- ${balise}:DEBUT -->`
  const fin = `<!-- ${balise}:FIN -->`
  const i = doc.indexOf(debut)
  const j = doc.indexOf(fin)
  if (i < 0 || j < 0) {
    throw new Error(
      `Reperes ${debut} / ${fin} absents de DESIGN.md : le tableau ne peut pas etre regenere.`,
    )
  }
  return doc.slice(0, i + debut.length) + '\n' + contenu + '\n' + doc.slice(j)
}

// -----------------------------------------------------------------------------
const { zones, muets } = zonesDuCode()
const molettes = molettesDuCss()
let doc = fs.readFileSync(DOC, 'utf8')

const citees = new Set([...doc.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]))
const oubliees = [...zones.keys()].filter((z) => !citees.has(z))
const fantomes = [...citees].filter(
  (c) => /^(bulle|fiche|ligne|vignette|noeud|ecran|carte|barre|rangee|trace|fil|nav|menu|entete|palette|fenetre|boite|organigramme|pastille|notifications|volet|bouton|champ|alerte|livrable|raccourcis|destinataires|questions|profils|memoire|outils|sauvegardes|banc|brouillon)-?/.test(c) &&
    c.includes('-') &&
    !zones.has(c) &&
    !c.startsWith('--'),
)

// Tableau des zones : un fait, donc regenere.
const lignesZones = [...zones.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([z, f]) => `| \`${z}\` | \`${f}\` |`)
doc = remplacer(
  doc,
  'ZONES',
  ['| Zone | Fichier |', '|---|---|', ...lignesZones].join('\n'),
)

// Tableau des molettes : un fait aussi.
const lignesMolettes = molettes.map(
  (m) => `| \`${m.nom}\` | \`${m.valeur}\` | ${m.note || '—'} |`,
)
doc = remplacer(
  doc,
  'MOLETTES',
  ['| Molette | Aujourd\'hui | Ce qu\'elle fait |', '|---|---|---|', ...lignesMolettes].join('\n'),
)

fs.writeFileSync(DOC, doc, 'utf8')

// -----------------------------------------------------------------------------
// Verdict
// -----------------------------------------------------------------------------
const cliquet = cliquetDesTailles()
const morts = exportsMorts()

console.log(`${zones.size} zones, ${molettes.length} molettes - tableaux regeneres.`)
console.log(`${cliquet.total} fichiers sous cliquet.`)
if (cliquet.partis.length) {
  console.log(`  ${cliquet.partis.length} fichier(s) disparu(s), marque retiree : ${cliquet.partis.join(', ')}`)
}
// La dette se rappelle a chaque passage, en une ligne : une exception qu'on ne
// voit plus est une exception qui devient la regle. Le detail est dans
// `design/exports-morts.json`, une raison par entree.
const restants = Object.keys(morts.dette).length
if (restants) console.log(`${restants} export(s) mort(s) portes en dette (design/exports-morts.json).`)
if (morts.guerris.length) {
  console.log(
    `  ${morts.guerris.length} ligne(s) de dette a retirer, l'export n'est plus mort : ${morts.guerris.join(', ')}`,
  )
}

const griefs = []
if (cliquet.debordements.length) {
  griefs.push(
    `Ces fichiers depassent leur propre marque :\n    ` +
      cliquet.debordements
        .map((d) => `${d.cle} : ${d.lignes} lignes, marque a ${d.marque}`)
        .join('\n    ') +
      `\n  Le cliquet n'interdit pas d'ecrire, il interdit d'empirer. Sors ce qui\n` +
      `  a grossi dans son propre fichier - la regle est au §3 d'ARCHITECTURE.md.\n` +
      `  Si la croissance est justifiee, releve la marque dans design/tailles.json\n` +
      `  a la main, et dis-le dans le commit.`,
  )
}
if (morts.neufs.length) {
  griefs.push(
    `Ces exports ne sont importes nulle part, et ils sont neufs :\n    ` +
      morts.neufs.join('\n    ') +
      `\n  Soit ils sont morts et partent avec leur zone, leur route et leurs types,\n` +
      `  soit c'est une porte ouverte avant son geste : inscris-les alors dans\n` +
      `  design/exports-morts.json, avec la raison.`,
  )
}
if (muets.length) {
  griefs.push(
    `Ces fichiers dessinent quelque chose sans nom de zone :\n    ` +
      muets.join('\n    ') +
      `\n  Ajoute data-zone="..." sur leur element racine, ou inscris-les dans SANS_ZONE.`,
  )
}
if (oubliees.length) {
  griefs.push(
    `Ces zones existent dans le code mais ne sont nulle part dans DESIGN.md :\n    ` +
      oubliees.join(', ') +
      `\n  L'index doit dire a quoi elles correspondent a l'ecran.`,
  )
}
if (fantomes.length) {
  griefs.push(
    `DESIGN.md cite des zones qui n'existent plus dans le code :\n    ` +
      fantomes.join(', ') +
      `\n  Un index qui envoie vers du vide est pire qu'un index incomplet.`,
  )
}

if (griefs.length) {
  console.error('\n' + griefs.map((g) => '  ' + g).join('\n\n') + '\n')
  process.exit(1)
}
console.log('Index et code sont d accord.')
