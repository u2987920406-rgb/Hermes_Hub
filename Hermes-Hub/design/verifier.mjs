/**
 * LE GARDE-FOU DU DESIGN - `npm run design`
 *
 * Il fait deux choses, et le partage entre les deux est le coeur de l'affaire :
 *
 *   - il ECRIT ce qui est un fait : la liste des zones et ou elles vivent, la
 *     liste des molettes et leur valeur. Ces tableaux sont regeneres, donc ils
 *     ne peuvent pas mentir.
 *   - il VERIFIE ce qui est de la prose : les libelles, les renvois, les
 *     colonnes « sinon ». Un humain les ecrit une fois ; le script s'assure
 *     seulement qu'aucune zone n'a ete oubliee ni laissee derriere.
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
  (c) => /^(bulle|fiche|ligne|vignette|noeud|ecran|carte|barre|rangee|trace|fil|nav|menu|entete|palette|fenetre|boite|organigramme|pastille|notifications)-?/.test(c) &&
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
console.log(`${zones.size} zones, ${molettes.length} molettes - tableaux regeneres.`)

const griefs = []
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
