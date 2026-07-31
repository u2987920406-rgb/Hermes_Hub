/**
 * Hermes Hub - local server.
 *
 * Serves the built SPA and exposes a REST API whose source of truth is the real
 * workspace on disk. No npm dependencies: only Node built-ins, so nothing can
 * fail to install on a client machine.
 *
 *   node server/index.js [--port 4317] [--open]
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { PontAcp } from './acp.js'
import { lireAgora } from './agora.js'
import { ecrireBascule, lireBascule } from './modeles.js'
import { projectFiles, vaultNote } from './templates.js'
import {
  HUB_DIR,
  PROJECTS_DIR,
  STANDARD_FILES,
  VAULT_DIR,
  VAULT_FOLDERS,
  WORKSPACE,
  ensureLayout,
  readJson,
  safeJoin,
  sanitizeName,
  writeJson,
} from './workspace.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, '..', 'dist')
const CONFIG_FILE = path.join(HUB_DIR, 'config.json')

// Version livree. Ecrite ici et non lue dans package.json : le client ne
// recoit que dist/ et server/. A tenir a jour avec version.json a la racine du
// depot - voir RELEASE.md.
const VERSION = '1.0.2'

const argv = process.argv.slice(2)
const PORT = Number(argv[argv.indexOf('--port') + 1]) || Number(process.env.HUB_PORT) || 4317
const OPEN_BROWSER = argv.includes('--open')

// -----------------------------------------------------------------------------
// HTTP helpers
// -----------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function fail(res, err) {
  const status = err && err.status ? err.status : 500
  if (status >= 500) console.error('[hub]', err)
  sendJson(res, status, { error: (err && err.message) || 'Erreur interne' })
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 2 * 1024 * 1024) {
      const err = new Error('Corps de requete trop volumineux')
      err.status = 413
      throw err
    }
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const err = new Error('JSON invalide')
    err.status = 400
    throw err
  }
}

/**
 * The API can delete folders and start processes, so only requests that really
 * come from this local page are accepted: loopback Host (blocks DNS rebinding)
 * and, when present, a same-origin Origin header (blocks other sites).
 */
function isTrustedRequest(req) {
  const host = (req.headers.host || '').split(':')[0]
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) return false

  const origin = req.headers.origin
  if (!origin) return true
  try {
    const hostname = new URL(origin).hostname
    return ['127.0.0.1', 'localhost', '::1'].includes(hostname)
  } catch {
    return false
  }
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
function defaultConfig() {
  return {
    workspace: WORKSPACE,
    vaultPath: VAULT_DIR,
    projectsPath: PROJECTS_DIR,
    profile: 'default',
    cleanProfile: 'clean',
    defaultModel: '',
    theme: 'light',
    userName: path.basename(WORKSPACE).replace(/^Hermes-/, ''),
    // Une couleur par porte d'entree: on reconnait la nature de la session
    // au coup d'oeil, sans lire le chemin en haut du terminal.
    skinChat: 'poseidon',
    skinClean: 'mono',
    skinProject: 'default',
  }
}

function getConfig() {
  const stored = readJson(CONFIG_FILE, {})
  // paths are always re-derived: the workspace may have been moved or renamed
  return { ...defaultConfig(), ...stored, workspace: WORKSPACE, vaultPath: VAULT_DIR, projectsPath: PROJECTS_DIR }
}

function putConfig(patch) {
  const allowed = [
    'profile',
    'cleanProfile',
    'defaultModel',
    'theme',
    'userName',
    'skinChat',
    'skinClean',
    'skinProject',
  ]
  const stored = readJson(CONFIG_FILE, {})
  for (const key of allowed) {
    if (patch[key] !== undefined) stored[key] = String(patch[key])
  }
  writeJson(CONFIG_FILE, stored)
  return getConfig()
}

// -----------------------------------------------------------------------------
// Projects - one project is one folder under Projets/
// -----------------------------------------------------------------------------
function projectMetaFile(dir) {
  return path.join(dir, '.hub.json')
}

function firstParagraph(markdown) {
  const lines = String(markdown).split(/\r?\n/)
  const idx = lines.findIndex((l) => /^##\s+Description/i.test(l))
  if (idx === -1) return ''
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (line.startsWith('#')) break
    if (line) return line
  }
  return ''
}

function readProject(name) {
  const dir = safeJoin(PROJECTS_DIR, name)
  const stat = fs.statSync(dir)
  const meta = readJson(projectMetaFile(dir), {})
  let description = meta.description || ''
  try {
    description = firstParagraph(fs.readFileSync(path.join(dir, 'BRIEF.md'), 'utf8')) || description
  } catch {
    /* no BRIEF yet */
  }

  const files = STANDARD_FILES.filter((f) => fs.existsSync(path.join(dir, f)))
  return {
    id: name,
    name,
    description,
    status: meta.status || 'active',
    path: dir,
    createdAt: meta.createdAt || stat.birthtime.toISOString(),
    lastUsed: meta.lastUsed || stat.mtime.toISOString(),
    // Epingle avec le projet, pas dans le navigateur : le choix suit le
    // workspace et survit a une reinstallation du Hub.
    pinned: meta.pinned === true,
    files,
    complete: files.length === STANDARD_FILES.length,
  }
}

function listProjects() {
  ensureLayout()
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => {
      try {
        return readProject(e.name)
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed))
}

function createProject(body) {
  ensureLayout()
  const name = sanitizeName(body.name)
  const dir = safeJoin(PROJECTS_DIR, name)
  if (fs.existsSync(dir)) {
    const err = new Error(`Un projet nomme "${name}" existe deja`)
    err.status = 409
    throw err
  }

  fs.mkdirSync(dir, { recursive: true })
  const files = projectFiles(name, body.description)
  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, file), content, 'utf8')
  }
  writeJson(projectMetaFile(dir), {
    status: body.status === 'done' ? 'done' : 'active',
    description: body.description || '',
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  })
  return readProject(name)
}

/** Keep the "# <name>" headings of the 6 standard files in step with a rename. */
function renameInsideFiles(dir, oldName, newName) {
  for (const file of STANDARD_FILES) {
    const target = path.join(dir, file)
    if (!fs.existsSync(target)) continue
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/)
    let changed = false
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].startsWith('# ')) continue
      const heading = lines[i].slice(2)
      if (heading === oldName || heading.startsWith(oldName + ' - ')) {
        lines[i] = '# ' + newName + heading.slice(oldName.length)
        changed = true
      }
      break                                   // only the first H1 is the title
    }
    if (changed) fs.writeFileSync(target, lines.join('\n'), 'utf8')
  }
}

function updateProject(id, patch) {
  const dir = safeJoin(PROJECTS_DIR, id)
  if (!fs.existsSync(dir)) {
    const err = new Error('Projet introuvable')
    err.status = 404
    throw err
  }

  let current = id
  if (patch.name && patch.name !== id) {
    const next = sanitizeName(patch.name)
    const target = safeJoin(PROJECTS_DIR, next)
    if (fs.existsSync(target)) {
      const err = new Error(`Un projet nomme "${next}" existe deja`)
      err.status = 409
      throw err
    }
    fs.renameSync(dir, target)
    renameInsideFiles(target, id, next)
    current = next
  }

  const currentDir = safeJoin(PROJECTS_DIR, current)
  const meta = readJson(projectMetaFile(currentDir), {})
  if (patch.status) meta.status = patch.status === 'done' ? 'done' : 'active'
  if (patch.description !== undefined) meta.description = String(patch.description)
  if (patch.pinned !== undefined) meta.pinned = patch.pinned === true
  if (patch.touch) meta.lastUsed = new Date().toISOString()
  writeJson(projectMetaFile(currentDir), meta)

  if (patch.description !== undefined) {
    const brief = path.join(currentDir, 'BRIEF.md')
    if (fs.existsSync(brief)) {
      const text = fs.readFileSync(brief, 'utf8')
      const updated = text.replace(
        /(##\s+Description\s*\r?\n)([^\r\n]*)/i,
        `$1${String(patch.description)}`
      )
      fs.writeFileSync(brief, updated, 'utf8')
    }
  }

  return readProject(current)
}

/**
 * Envoie un fichier ou un dossier a la corbeille Windows.
 *
 * Le bouton de suppression est a cote de "Lancer Hermes" sur une carte : une
 * erreur de clic doit rester rattrapable. fs.rmSync effacait definitivement.
 * Si la corbeille est indisponible, on echoue plutot que de supprimer sans
 * retour possible - l'utilisateur garde l'explorateur pour forcer.
 */
/**
 * Execute un script PowerShell. Les parametres passent par l'environnement,
 * jamais par la ligne de commande: aucun probleme de guillemets, d'apostrophe
 * ou d'accent dans un nom de projet, et rien a echapper.
 */
function runPowerShell(script, env = {}) {
  return spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { env: { ...process.env, ...env }, windowsHide: true, encoding: 'utf8' }
  )
}

function recycle(target, kind) {
  const method = kind === 'dir' ? 'DeleteDirectory' : 'DeleteFile'
  const res = runPowerShell(
    'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
      `[Microsoft.VisualBasic.FileIO.FileSystem]::${method}(` +
      "$env:HUB_RECYCLE_TARGET, 'OnlyErrorDialogs', 'SendToRecycleBin')",
    { HUB_RECYCLE_TARGET: target }
  )

  if (res.status !== 0) {
    // "IOException" vient du FullyQualifiedErrorId de PowerShell, pas du texte
    // traduit : le test tient sur une machine en anglais comme en francais.
    // Windows refuse de supprimer un dossier tant qu'un programme l'occupe -
    // un terminal ouvert dedans, ou une application lancee depuis le projet.
    const occupe = /IOException/.test(String(res.stderr || ''))
    const err = new Error(
      occupe
        ? "Un programme utilise encore ce dossier : un terminal ouvert dedans, ou une application lancee depuis le projet. Ferme-le puis reessaie. Rien n'a ete supprime."
        : "Impossible d'envoyer a la corbeille Windows. Rien n'a ete supprime."
    )
    err.status = 500
    throw err
  }
}

// -----------------------------------------------------------------------------
// Corbeille - ce que le Hub a jete, tel que Windows le conserve
// -----------------------------------------------------------------------------

// La corbeille range chaque element sous deux fichiers: $R<id> (le contenu) et
// $I<id> (son emplacement d'origine). On ne manipule que des chemins situes
// la-dedans, d'ou cette verification avant toute operation destructrice.
const CHEMIN_CORBEILLE = /^[A-Za-z]:\\\$Recycle\.Bin\\/i

function assertTrashId(id) {
  if (typeof id !== 'string' || !CHEMIN_CORBEILLE.test(id)) {
    const err = new Error('Element de corbeille invalide')
    err.status = 400
    throw err
  }
  return id
}

// Fragment commun: retrouve l'element vise par HUB_TRASH_ID.
const PS_ELEMENT_VISE = `
$bin = (New-Object -ComObject Shell.Application).NameSpace(10)
$cible = @($bin.Items()) | Where-Object { $_.Path -eq $env:HUB_TRASH_ID } | Select-Object -First 1
if (-not $cible) { Write-Error 'Element introuvable dans la corbeille'; exit 1 }
`

/**
 * Liste ce que le Hub a mis a la corbeille, et rien d'autre: on filtre sur
 * l'emplacement d'origine. La corbeille de Windows contient les suppressions
 * de toute la machine, que le Hub n'a aucune raison de montrer ni de vider.
 */
function trashList() {
  const res = runPowerShell(
    `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$bin = (New-Object -ComObject Shell.Application).NameSpace(10)
$sortie = foreach ($it in @($bin.Items())) {
  $origine = $bin.GetDetailsOf($it, 1)
  if (-not $origine.StartsWith($env:HUB_WORKSPACE, [StringComparison]::OrdinalIgnoreCase)) { continue }
  [pscustomobject]@{
    id = $it.Path
    name = $it.Name
    origin = $origine
    deletedAt = $bin.GetDetailsOf($it, 2)
    isFolder = [bool]$it.IsFolder
  }
}
ConvertTo-Json -InputObject @($sortie) -Depth 3 -Compress
`,
    { HUB_WORKSPACE: WORKSPACE }
  )

  const brut = String(res.stdout || '').trim()
  if (res.status !== 0 || !brut) return []
  let data
  try {
    data = JSON.parse(brut)
  } catch {
    return []
  }
  // PowerShell 5.1 deballe un tableau d'un seul element en objet.
  const items = Array.isArray(data) ? data : [data]
  return items.map((it) => ({
    ...it,
    // Windows entoure ses dates de marques de sens de lecture invisibles.
    deletedAt: String(it.deletedAt || '').replace(/[‎‏]/g, ''),
  }))
}

/** Remet un element a sa place d'origine. */
function trashRestore(id) {
  assertTrashId(id)
  const res = runPowerShell(`${PS_ELEMENT_VISE}$cible.InvokeVerb('undelete'); Start-Sleep -Milliseconds 400`, {
    HUB_TRASH_ID: id,
  })
  if (res.status !== 0) {
    const err = new Error("Restauration impossible. L'element a peut-etre deja ete restaure.")
    err.status = 500
    throw err
  }
  return { restored: id }
}

/**
 * Supprime definitivement un element. `undelete` ayant un verbe canonique mais
 * pas la suppression, on efface le couple $R/$I a la main: laisser le $I
 * derriere laisserait une entree fantome dans la corbeille de Windows.
 */
function trashPurge(id) {
  assertTrashId(id)
  const res = runPowerShell(
    `${PS_ELEMENT_VISE}
$feuille = Split-Path $cible.Path -Leaf
$meta = Join-Path (Split-Path $cible.Path) ('$I' + $feuille.Substring(2))
Remove-Item -LiteralPath $cible.Path -Force -Recurse
if (Test-Path -LiteralPath $meta) { Remove-Item -LiteralPath $meta -Force }
`,
    { HUB_TRASH_ID: id }
  )
  if (res.status !== 0) {
    const err = new Error('Suppression definitive impossible.')
    err.status = 500
    throw err
  }
  return { purged: id }
}

function deleteProject(id) {
  const dir = safeJoin(PROJECTS_DIR, id)
  if (!fs.existsSync(dir)) {
    const err = new Error('Projet introuvable')
    err.status = 404
    throw err
  }
  recycle(dir, 'dir')
  return { deleted: id, recycled: true }
}

function readProjectFile(id, file) {
  if (!STANDARD_FILES.includes(file)) {
    const err = new Error('Fichier non autorise')
    err.status = 400
    throw err
  }
  const target = safeJoin(PROJECTS_DIR, id, file)
  if (!fs.existsSync(target)) return { file, content: '', exists: false }
  return { file, content: fs.readFileSync(target, 'utf8'), exists: true }
}

function writeProjectFile(id, file, content) {
  if (!STANDARD_FILES.includes(file)) {
    const err = new Error('Fichier non autorise')
    err.status = 400
    throw err
  }
  const dir = safeJoin(PROJECTS_DIR, id)
  if (!fs.existsSync(dir)) {
    const err = new Error('Projet introuvable')
    err.status = 404
    throw err
  }
  fs.writeFileSync(path.join(dir, file), String(content ?? ''), 'utf8')
  updateProject(id, { touch: true })
  return { file, saved: true }
}

// -----------------------------------------------------------------------------
// Vault - real Obsidian markdown on disk
// -----------------------------------------------------------------------------
function vaultTree() {
  ensureLayout()
  return VAULT_FOLDERS.map((folder) => {
    const dir = path.join(VAULT_DIR, folder)
    let notes = []
    try {
      notes = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
        .map((e) => {
          const stat = fs.statSync(path.join(dir, e.name))
          return {
            name: e.name,
            title: e.name.replace(/\.md$/i, ''),
            path: `${folder}/${e.name}`,
            size: stat.size,
            modified: stat.mtime.toISOString(),
          }
        })
        .sort((a, b) => b.modified.localeCompare(a.modified))
    } catch {
      /* folder missing */
    }
    return { folder, count: notes.length, notes }
  })
}

function readVaultNote(rel) {
  const target = safeJoin(VAULT_DIR, rel)
  if (!fs.existsSync(target)) {
    const err = new Error('Note introuvable')
    err.status = 404
    throw err
  }
  return { path: rel, content: fs.readFileSync(target, 'utf8') }
}

function createVaultNote(body) {
  ensureLayout()
  const folder = String(body.folder || '')
  if (!VAULT_FOLDERS.includes(folder)) {
    const err = new Error('Dossier du coffre inconnu')
    err.status = 400
    throw err
  }
  const title = sanitizeName(body.title)
  const file = `${title}.md`
  const target = safeJoin(VAULT_DIR, folder, file)
  if (fs.existsSync(target)) {
    const err = new Error('Une note portant ce nom existe deja')
    err.status = 409
    throw err
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, vaultNote(folder, title, body.content), 'utf8')
  return { path: `${folder}/${file}`, title, folder }
}

function writeVaultNote(rel, content) {
  const target = safeJoin(VAULT_DIR, rel)
  if (!target.toLowerCase().endsWith('.md')) {
    const err = new Error('Seuls les fichiers .md sont modifiables')
    err.status = 400
    throw err
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, String(content ?? ''), 'utf8')
  return { path: rel, saved: true }
}

function deleteVaultNote(rel) {
  const target = safeJoin(VAULT_DIR, rel)
  if (!fs.existsSync(target)) {
    const err = new Error('Note introuvable')
    err.status = 404
    throw err
  }
  recycle(target, 'file')
  return { deleted: rel, recycled: true }
}

// -----------------------------------------------------------------------------
// Launchers
// -----------------------------------------------------------------------------
function detach(command, args, cwd) {
  const child = spawn(command, args, {
    cwd: cwd && fs.existsSync(cwd) ? cwd : WORKSPACE,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
  child.unref()
}

/**
 * `wt.exe` n'est pas un fichier ordinaire mais un alias d'execution
 * d'application : un point d'analyse de 0 octet. `fs.existsSync` s'appuie sur
 * `stat`, qui echoue en EACCES sur ces alias et repond donc "absent" alors que
 * Windows Terminal est installe. `accessSync` en F_OK, lui, repond juste.
 */
function windowsTerminalPath() {
  const wt = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps', 'wt.exe')
  try {
    fs.accessSync(wt, fs.constants.F_OK)
    return wt
  } catch {
    return null
  }
}


// Un skin est un identifiant de preset Hermes, jamais un chemin ni une commande.
const SKIN_NAME = /^[a-z0-9][a-z0-9_-]{0,31}$/

// Filet de secours quand `hermes skin list` ne repond pas (Hermes absent du
// PATH, version plus ancienne): les presets livres avec Hermes 0.19.
const SKINS_CONNUS = [
  { name: 'default', description: 'Or et bronze - le classique Hermes' },
  { name: 'ares', description: 'Cramoisi et bronze' },
  { name: 'mono', description: 'Nuances de gris' },
  { name: 'slate', description: 'Bleu froid, oriente dev' },
  { name: 'daylight', description: 'Pour terminal a fond clair' },
  { name: 'warm-lightmode', description: 'Fond clair, texte brun/or' },
  { name: 'poseidon', description: 'Bleu profond et ecume' },
  { name: 'sisyphus', description: 'Gris austere' },
  { name: 'charizard', description: 'Orange volcanique' },
]

// Trois teintes par skin (bordure, titre, accent) relevees dans le moteur
// d'Hermes, pour montrer la couleur au lieu de la decrire. Un skin absent de
// cette table - un skin perso depose par l'utilisateur - n'a pas d'apercu:
// c'est prefere a un apercu invente.
const COULEURS_SKINS = {
  default: ['#CD7F32', '#FFD700', '#FFBF00'],
  ares: ['#A93333', '#C7A96B', '#DD4A3A'],
  mono: ['#5E5E5E', '#E6EDF3', '#AAAAAA'],
  slate: ['#4169E1', '#7EB8F6', '#8EA8FF'],
  daylight: ['#2563EB', '#0F172A', '#2563EB'],
  'warm-lightmode': ['#8B6914', '#5C3D11', '#8B4513'],
  poseidon: ['#2A6FB9', '#A9DFFF', '#5DB8F5'],
  sisyphus: ['#B7B7B7', '#F5F5F5', '#E7E7E7'],
  charizard: ['#C75B1D', '#FFD39A', '#F29C38'],
}

/**
 * Etat de la machine, pour repondre a "pourquoi ca ne marche pas ?" sans
 * ouvrir un terminal : c'est toujours l'un de ces quatre points qui manque.
 */
function diagnostics() {
  const hermes = spawnSync('hermes', ['--version'], {
    windowsHide: true,
    timeout: 8000,
    encoding: 'utf8',
  })
  const versionHermes = String(hermes.stdout || '')
    .split(/\r?\n/)
    .find((l) => l.trim())

  const profils = spawnSync('hermes', ['profile', 'list'], {
    windowsHide: true,
    timeout: 8000,
    encoding: 'utf8',
  })
  // Un losange marque le profil actif. On retire tout prefixe non
  // alphanumerique plutot que ce caractere precis : selon la page de code de
  // la console il arrive deforme, et le profil disparaissait alors de la liste
  // - le Diagnostic signalait un profil manquant a tort.
  const noms = String(profils.stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[^A-Za-z0-9]+/, '').split(/\s{2,}/)[0])
    .filter((n) => n && /^[A-Za-z0-9._-]+$/.test(n) && n !== 'Profile')

  // git et bash : Hermes s'en sert pour ses commandes shell et ses fonctions
  // de depot. Absents, ils ne bloquent rien mais desactivent ces fonctions en
  // silence - d'ou leur presence ici.
  const outil = (nom, args) => {
    const r = spawnSync(nom, args, { windowsHide: true, timeout: 8000, encoding: 'utf8' })
    if (r.status !== 0) return null
    return String(r.stdout || '').split(/\r?\n/)[0].trim() || null
  }

  return {
    hermes: hermes.status === 0 && versionHermes ? versionHermes.trim() : null,
    node: process.version,
    git: outil('git', ['--version']),
    bash: outil('bash', ['--version']),
    terminal: windowsTerminalPath() !== null,
    profiles: noms,
    port: PORT,
    hermesHome: path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes'),
    log: path.join(WORKSPACE, 'Hermes-Hub', 'hub-erreurs.log'),
  }
}

/**
 * Liste les skins d'Hermes, y compris ceux que l'utilisateur a deposes dans
 * son dossier `skins/`: on interroge Hermes plutot que de figer la liste, pour
 * que le Hub ne se desynchronise pas d'une version a l'autre.
 */
function listSkins() {
  try {
    const res = spawnSync('hermes', ['skin', 'list'], {
      windowsHide: true,
      timeout: 5000,
      encoding: 'utf8',
    })
    // Decoupage sur \r?\n: en JS `.` ne traverse pas un \r, donc un simple
    // split('\n') laisse un \r final qui fait echouer le `$` du motif.
    const lignes = String(res.stdout || '').split(/\r?\n/)
    const skins = []
    for (const ligne of lignes) {
      // "  default          builtin  Classic Hermes - gold and kawaii"
      const m = ligne.match(/^\s*\*?\s*(\S+)\s+(builtin|user)\s+(.*)$/)
      if (m && SKIN_NAME.test(m[1])) {
        skins.push({ name: m[1], description: m[3].trim(), colors: COULEURS_SKINS[m[1]] || [] })
      }
    }
    if (skins.length) return skins
  } catch {
    /* on retombe sur la liste figee */
  }
  return SKINS_CONNUS.map((s) => ({ ...s, colors: COULEURS_SKINS[s.name] || [] }))
}

/**
 * Impose la couleur de la session sur le point d'etre ouverte.
 *
 * Hermes lit `display.skin` de son config.yaml au demarrage et n'accepte ni
 * option ni variable d'environnement pour le forcer. On ecrit donc le reglage
 * juste avant d'ouvrir le terminal, via la commande officielle: c'est ce qui
 * permet une couleur par porte d'entree alors que le reglage est global.
 * `hermes skin use` coute ~0.4 s, d'ou l'appel synchrone - la couleur doit
 * etre en place avant que le terminal ne demarre.
 *
 * `-p <profil>` vise le config.yaml de ce profil: Clean Agent garde sa couleur
 * sans jamais toucher a celle des autres sessions.
 */
function applySkin(skin, profile) {
  if (!skin || !SKIN_NAME.test(skin)) return
  const args = profile && SKIN_NAME.test(profile) ? ['-p', profile] : []
  try {
    spawnSync('hermes', [...args, 'skin', 'use', skin], { windowsHide: true, timeout: 5000 })
  } catch {
    /* Hermes absent du PATH: la session s'ouvre, simplement sans couleur imposee */
  }
}

/** Open a terminal running `hermes` in `cwd`, with an optional profile. */
function launchHermes({ cwd, profile }) {
  const cmd = profile ? `hermes -p ${profile}` : 'hermes'
  const wt = windowsTerminalPath()
  if (wt) {
    detach(wt, ['-d', cwd, 'powershell', '-NoExit', '-Command', cmd], cwd)
  } else {
    detach('cmd.exe', ['/c', 'start', '', 'powershell', '-NoExit', '-Command', cmd], cwd)
  }
  return { launched: cmd, cwd }
}

function openFolder(target) {
  if (!fs.existsSync(target)) {
    const err = new Error('Dossier introuvable')
    err.status = 404
    throw err
  }
  detach('explorer.exe', [target], path.dirname(target))
  return { opened: target }
}

/**
 * Ouvre le journal d'erreurs.
 *
 * Par le Bloc-notes et non par l'association Windows : `.log` n'a par defaut
 * aucune application associee, et `start` echouait alors sans un mot. Un
 * journal vide n'est pas ouvert non plus - une fenetre blanche ne dit rien,
 * le message le dit.
 */
function openLog() {
  const target = path.join(WORKSPACE, 'Hermes-Hub', 'hub-erreurs.log')
  if (!fs.existsSync(target)) {
    const err = new Error("Aucun journal : le Hub n'a jamais rien eu a signaler.")
    err.status = 404
    throw err
  }
  const vide = fs.statSync(target).size === 0
  if (!vide) detach('notepad.exe', [target], path.dirname(target))
  return { opened: target, vide }
}

// -----------------------------------------------------------------------------
// Memoire et personnalite d'Hermes
// -----------------------------------------------------------------------------

const HERMES_HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')

// Trois fichiers, et trois seulement : ce sont du contenu, pas de la
// configuration. Le modele, les cles et les providers restent la propriete de
// `hermes setup` - deux sources pour un meme reglage finissent par diverger.
const FICHIERS_MEMOIRE = {
  'MEMORY.md': {
    chemin: path.join(HERMES_HOME, 'memories', 'MEMORY.md'),
    titre: 'Regles de travail',
    aide: "Ce qu'Hermes doit, ne doit jamais, et deteste. Lu a chaque session.",
  },
  'USER.md': {
    chemin: path.join(HERMES_HOME, 'memories', 'USER.md'),
    titre: 'Ce qu-Hermes sait de toi',
    aide: 'Ecrit par Hermes quand tu lui dis de memoriser quelque chose.',
  },
  'SOUL.md': {
    chemin: path.join(HERMES_HOME, 'SOUL.md'),
    titre: 'Personnalite',
    aide: 'Le ton et la maniere d-etre d-Hermes.',
  },
}

function fichierMemoire(nom) {
  const entree = FICHIERS_MEMOIRE[nom]
  if (!entree) {
    const err = new Error('Fichier de memoire inconnu')
    err.status = 400
    throw err
  }
  return entree
}

/**
 * Rangement deterministe applique a chaque enregistrement : il normalise la
 * mise en forme sans jamais toucher aux mots. Reformuler en silence serait un
 * autre metier - on ecrirait autre chose que ce que l'utilisateur a tape, et
 * sur des regles qui pilotent l'agent une nuance perdue change son
 * comportement. Ca, c'est le bouton "Mettre au propre", et il demande l'accord.
 */
function rangerMarkdown(texte) {
  const lignes = String(texte)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/, '')) // espaces en fin de ligne
    .map((l) => l.replace(/^(\s*)[*•]\s+/, '$1- ')) // puces homogenes

  const sortie = []
  for (const ligne of lignes) {
    // Un titre respire : une ligne vide avant, jamais deux.
    if (/^#{1,6}\s/.test(ligne) && sortie.length && sortie[sortie.length - 1] !== '') {
      sortie.push('')
    }
    // Pas plus d'une ligne vide d'affilee.
    if (ligne === '' && sortie.length && sortie[sortie.length - 1] === '') continue
    sortie.push(ligne)
  }

  return sortie.join('\n').replace(/\n+$/, '') + '\n'
}

/**
 * Demande a Hermes une version condensee, et ne fait que la renvoyer : c'est
 * l'utilisateur qui decide de l'appliquer, apres l'avoir lue.
 */
function reformulerMemoire(nom, contenu) {
  fichierMemoire(nom)
  const consigne = [
    'Tu remets au propre un fichier de memoire pour un agent IA.',
    'Rends-le concis et bien range, en gardant EXACTEMENT le meme sens.',
    "N'ajoute aucune regle, n'en retire aucune, ne change pas la force des",
    'formulations ("jamais" reste "jamais").',
    'Garde le markdown et les memes sections.',
    'Reponds uniquement avec le contenu du fichier, sans commentaire ni balise.',
    '',
    '--- FICHIER ---',
    String(contenu || ''),
  ].join('\n')

  const res = spawnSync('hermes', ['-z', consigne], {
    windowsHide: true,
    timeout: 180000,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })

  const proposition = String(res.stdout || '').trim()
  if (res.status !== 0 || !proposition) {
    const err = new Error(
      "Hermes n'a pas repondu. Le fichier n'a pas ete touche - reessaie, ou verifie le modele dans Diagnostic."
    )
    err.status = 502
    throw err
  }
  return { file: nom, proposition: rangerMarkdown(proposition) }
}

/** Empreinte taille+date : sert a detecter une ecriture concurrente d'Hermes. */
function empreinte(chemin) {
  try {
    const s = fs.statSync(chemin)
    return `${s.size}-${Math.round(s.mtimeMs)}`
  } catch {
    return 'absent'
  }
}

/**
 * Version d'origine, deposee par l'installateur a cote du fichier. Le Hub ne
 * connait donc aucun texte par defaut : c'est l'installateur qui reste seul
 * proprietaire du contenu livre, sinon les deux finiraient par diverger.
 */
function cheminOrigine(chemin) {
  return chemin.replace(/\.md$/, '.default.md')
}

function lireMemoire(nom) {
  const { chemin, titre, aide } = fichierMemoire(nom)
  const existe = fs.existsSync(chemin)
  return {
    file: nom,
    titre,
    aide,
    path: chemin,
    exists: existe,
    content: existe ? fs.readFileSync(chemin, 'utf8') : '',
    stamp: empreinte(chemin),
    backup: fs.existsSync(chemin + '.bak'),
    origine: fs.existsSync(cheminOrigine(chemin)),
  }
}

/** Repart de la version installee. L'etat courant part quand meme en .bak. */
function reinitialiserMemoire(nom) {
  const { chemin } = fichierMemoire(nom)
  const origine = cheminOrigine(chemin)
  if (!fs.existsSync(origine)) {
    const err = new Error(
      "Aucune version d'origine sur ce poste. Elle est deposee par l'installateur; une installation anterieure a la v1.0.0 n'en a pas."
    )
    err.status = 404
    throw err
  }
  if (fs.existsSync(chemin)) fs.copyFileSync(chemin, chemin + '.bak')
  fs.copyFileSync(origine, chemin)
  return lireMemoire(nom)
}

/**
 * Ecrit apres deux precautions :
 * - refus si le fichier a bouge depuis la lecture. Hermes ecrit lui-meme dans
 *   ces fichiers quand on lui dit "memorise ca" : sans ce controle, enregistrer
 *   depuis le Hub effacerait ce qu'il vient d'apprendre.
 * - copie de l'ancienne version en .bak, pour pouvoir revenir en arriere.
 */
function ecrireMemoire(nom, contenu, stamp) {
  const { chemin } = fichierMemoire(nom)
  if (typeof contenu !== 'string') {
    const err = new Error('Contenu invalide')
    err.status = 400
    throw err
  }
  const actuel = empreinte(chemin)
  if (stamp && stamp !== actuel) {
    const err = new Error(
      "Hermes a modifie ce fichier pendant ton edition. Recharge la page pour repartir de sa version, sinon tu effacerais ce qu'il vient d'apprendre."
    )
    err.status = 409
    throw err
  }

  fs.mkdirSync(path.dirname(chemin), { recursive: true })
  if (fs.existsSync(chemin)) fs.copyFileSync(chemin, chemin + '.bak')
  fs.writeFileSync(chemin, rangerMarkdown(contenu), 'utf8')
  return lireMemoire(nom)
}

/** Revient a la version d'avant le dernier enregistrement. */
function restaurerMemoire(nom) {
  const { chemin } = fichierMemoire(nom)
  if (!fs.existsSync(chemin + '.bak')) {
    const err = new Error('Aucune version precedente a restaurer.')
    err.status = 404
    throw err
  }
  fs.copyFileSync(chemin + '.bak', chemin)
  return lireMemoire(nom)
}

// -----------------------------------------------------------------------------
// Mise a jour depuis GitHub
// -----------------------------------------------------------------------------

// Depot fige dans le code : le Hub ne telecharge jamais depuis une adresse
// saisie ailleurs. C'est la seule origine de code autorisee.
const DEPOT = 'u2987920406-rgb/Hermes_Hub'
const URL_VERSION = `https://raw.githubusercontent.com/${DEPOT}/main/version.json`

/** Compare deux numeros x.y.z. Renvoie 1 si a est plus recent que b. */
function comparerVersions(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

function verifierMiseAJour() {
  const locale = VERSION
  const res = runPowerShell(
    `[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
$r = Invoke-WebRequest -Uri $env:HUB_URL -UseBasicParsing -TimeoutSec 25
Write-Output $r.Content`,
    { HUB_URL: URL_VERSION }
  )
  if (res.status !== 0) {
    const err = new Error("Impossible de joindre GitHub. Verifie ta connexion Internet.")
    err.status = 502
    throw err
  }
  let distante
  try {
    distante = JSON.parse(String(res.stdout || '').trim())
  } catch {
    const err = new Error('Reponse illisible depuis GitHub.')
    err.status = 502
    throw err
  }

  const plusRecente = comparerVersions(distante.version, locale) === 1
  // Une version qui exige un installateur plus recent que celui d'origine ne
  // peut pas s'appliquer depuis le Hub : elle ajoute des fichiers hors de son
  // perimetre. On l'annonce, on ne la bricole pas.
  const applicable =
    plusRecente &&
    distante.hub_seul === true &&
    comparerVersions(distante.min_installer || '0.0.0', locale) <= 0

  return {
    locale,
    distante: distante.version,
    tag: distante.tag,
    notes: distante.notes || '',
    telechargement: distante.telechargement || '',
    aJour: !plusRecente,
    applicable,
  }
}

/**
 * Remplace dist/, server/ et le lanceur par ceux du tag demande. Les projets,
 * le coffre, la memoire et la configuration ne sont jamais touches : c'est la
 * meme frontiere que maj-hub.bat.
 */
function appliquerMiseAJour(tag) {
  if (!/^v?\d+\.\d+\.\d+$/.test(String(tag || ''))) {
    const err = new Error('Version demandee invalide')
    err.status = 400
    throw err
  }

  const hub = path.join(WORKSPACE, 'Hermes-Hub')
  const res = runPowerShell(
    `$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
$tmp = Join-Path $env:TEMP ('hermes-maj-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zip = Join-Path $tmp 'source.zip'
Invoke-WebRequest -Uri $env:HUB_ZIP -OutFile $zip -UseBasicParsing -TimeoutSec 180
Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
$racine = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
$src = Join-Path $racine.FullName 'Hermes-Hub'
# Refus net si l'archive est incomplete : mieux vaut ne rien faire que
# remplacer une installation qui marche par une moitie d'archive.
if (-not (Test-Path (Join-Path $src 'dist\\index.html'))) { throw 'archive incomplete: dist' }
if (-not (Test-Path (Join-Path $src 'server\\index.js'))) { throw 'archive incomplete: server' }
$cible = $env:HUB_CIBLE
$sauvegarde = Join-Path $cible '.maj-precedente'
if (Test-Path $sauvegarde) { Remove-Item -LiteralPath $sauvegarde -Recurse -Force }
New-Item -ItemType Directory -Force -Path $sauvegarde | Out-Null
Copy-Item (Join-Path $cible 'dist') $sauvegarde -Recurse -Force
Copy-Item (Join-Path $cible 'server') $sauvegarde -Recurse -Force
Remove-Item -LiteralPath (Join-Path $cible 'dist\\assets') -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $src 'dist\\*') (Join-Path $cible 'dist') -Recurse -Force
Copy-Item (Join-Path $src 'server\\*') (Join-Path $cible 'server') -Recurse -Force
if (Test-Path (Join-Path $src 'launcher')) { Copy-Item (Join-Path $src 'launcher\\*') $cible -Force }
Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Output 'ok'`,
    {
      HUB_ZIP: `https://codeload.github.com/${DEPOT}/zip/refs/tags/${tag}`,
      HUB_CIBLE: hub,
    }
  )

  if (res.status !== 0 || !/ok/.test(String(res.stdout || ''))) {
    const err = new Error(
      'Mise a jour interrompue. Rien n-a ete remplace, ou la version precedente est dans Hermes-Hub\\.maj-precedente. Detail : ' +
        String(res.stderr || '').split('\n')[0]
    )
    err.status = 500
    throw err
  }
  return { applique: tag, redemarrage: true }
}

// -----------------------------------------------------------------------------
// Demarrage avec Windows
// -----------------------------------------------------------------------------

// Un raccourci depose dans le dossier Demarrage : c'est le mecanisme que
// Windows expose a l'utilisateur (il le voit dans le Gestionnaire des taches
// et peut le desactiver lui-meme), contrairement a une cle de registre.
const DOSSIER_DEMARRAGE = path.join(
  process.env.APPDATA || os.homedir(),
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
)
const RACCOURCI_DEMARRAGE = path.join(DOSSIER_DEMARRAGE, 'Hermes Hub.lnk')

/** Etat lu sur le disque plutot que stocke : impossible de desynchroniser. */
function autoStartStatus() {
  return { enabled: fs.existsSync(RACCOURCI_DEMARRAGE), path: RACCOURCI_DEMARRAGE }
}

function setAutoStart(enabled) {
  if (!enabled) {
    if (fs.existsSync(RACCOURCI_DEMARRAGE)) fs.unlinkSync(RACCOURCI_DEMARRAGE)
    return autoStartStatus()
  }

  const vbs = path.join(WORKSPACE, 'Hermes-Hub', 'Hermes-Hub.vbs')
  if (!fs.existsSync(vbs)) {
    const err = new Error("Lanceur introuvable. Relance installer.bat pour le remettre en place.")
    err.status = 500
    throw err
  }

  fs.mkdirSync(DOSSIER_DEMARRAGE, { recursive: true })
  const res = runPowerShell(
    `$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($env:HUB_LNK)
$sc.TargetPath = "$env:SystemRoot\\System32\\wscript.exe"
$sc.Arguments = '"' + $env:HUB_VBS + '"'
$sc.IconLocation = $env:HUB_ICON + ', 0'
$sc.WorkingDirectory = Split-Path $env:HUB_VBS
$sc.Description = 'Demarre Hermes Hub avec Windows'
$sc.Save()`,
    {
      HUB_LNK: RACCOURCI_DEMARRAGE,
      HUB_VBS: vbs,
      HUB_ICON: path.join(WORKSPACE, 'icons', 'hermes-hub.ico'),
    }
  )
  if (res.status !== 0) {
    const err = new Error("Impossible de creer le raccourci de demarrage.")
    err.status = 500
    throw err
  }
  return autoStartStatus()
}

function openObsidian() {
  const uri = `obsidian://open?path=${encodeURIComponent(VAULT_DIR)}`
  detach('cmd.exe', ['/c', 'start', '', uri], WORKSPACE)
  return { opened: uri }
}

// -----------------------------------------------------------------------------
// Discussion avec Hermes (pont ACP)
// -----------------------------------------------------------------------------
/**
 * Un seul pont pour tout le Hub : la discussion est un lieu, pas un onglet.
 * Deux fenetres ouvertes voient donc la meme conversation, comme deux ecrans
 * poses sur le meme bureau.
 */
let pont = null
/** Flux SSE ouverts. Ce sont des spectateurs : aucun n'est proprietaire. */
const spectateurs = new Set()

function obtenirPont() {
  if (pont) return pont
  pont = new PontAcp({ cwd: WORKSPACE })
  pont.on('evenement', (e) => diffuser(e))
  return pont
}

function diffuser(evenement) {
  const trame = `data: ${JSON.stringify(evenement)}\n\n`
  for (const flux of spectateurs) {
    try {
      flux.write(trame)
    } catch {
      spectateurs.delete(flux)
    }
  }
}

function ouvrirFlux(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    // Le Hub n'a pas de proxy, mais un antivirus qui s'intercale peut vouloir
    // tamponner la reponse : l'en-tete le lui interdit explicitement.
    'X-Accel-Buffering': 'no',
  })
  res.write(': connecte\n\n')

  // Un flux qui arrive en cours de tour doit se mettre au niveau : sans ca, une
  // autorisation emise avant l'ouverture resterait sans reponse et Hermes
  // attendrait indefiniment.
  if (pont) res.write(`data: ${JSON.stringify(pont.etat())}\n\n`)

  spectateurs.add(res)

  // Sans trafic, une connexion inactive finit par etre coupee. Le commentaire
  // SSE ne produit aucun evenement cote navigateur.
  const battement = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      /* ferme entre-temps : le close ci-dessous nettoie */
    }
  }, 20000)

  req.on('close', () => {
    clearInterval(battement)
    spectateurs.delete(res)
  })
}

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------
async function handleApi(req, res, url) {
  const seg = url.pathname.split('/').filter(Boolean)   // ['api', ...]
  const rest = seg.slice(1)
  const method = req.method

  if (rest[0] === 'health' && method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      workspace: WORKSPACE,
      workspaceExists: fs.existsSync(WORKSPACE),
      version: VERSION,
    })
  }

  if (rest[0] === 'config') {
    if (method === 'GET') return sendJson(res, 200, getConfig())
    if (method === 'PUT') return sendJson(res, 200, putConfig(await readBody(req)))
  }

  if (rest[0] === 'skins' && method === 'GET') return sendJson(res, 200, listSkins())

  if (rest[0] === 'diagnostics' && method === 'GET') return sendJson(res, 200, diagnostics())

  if (rest[0] === 'trash') {
    if (!rest[1] && method === 'GET') return sendJson(res, 200, trashList())
    if (rest[1] === 'restore' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, trashRestore(body.id))
    }
    if (rest[1] === 'purge' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, trashPurge(body.id))
    }
  }

  if (rest[0] === 'stats' && method === 'GET') {
    const projects = listProjects()
    const tree = vaultTree()
    return sendJson(res, 200, {
      projects: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      done: projects.filter((p) => p.status === 'done').length,
      notes: tree.reduce((sum, f) => sum + f.count, 0),
      folders: tree.length,
    })
  }

  if (rest[0] === 'projects') {
    const id = rest[1] ? decodeURIComponent(rest[1]) : null

    if (!id && method === 'GET') return sendJson(res, 200, listProjects())
    if (!id && method === 'POST') return sendJson(res, 201, createProject(await readBody(req)))

    if (id && rest[2] === 'files') {
      const file = rest[3] ? decodeURIComponent(rest[3]) : null
      if (!file && method === 'GET') return sendJson(res, 200, readProject(id).files)
      if (file && method === 'GET') return sendJson(res, 200, readProjectFile(id, file))
      if (file && method === 'PUT') {
        const body = await readBody(req)
        return sendJson(res, 200, writeProjectFile(id, file, body.content))
      }
    }

    if (id && method === 'GET') return sendJson(res, 200, readProject(id))
    if (id && method === 'PATCH') return sendJson(res, 200, updateProject(id, await readBody(req)))
    if (id && method === 'DELETE') return sendJson(res, 200, deleteProject(id))
  }

  if (rest[0] === 'vault') {
    if (rest[1] === 'tree' && method === 'GET') return sendJson(res, 200, vaultTree())

    if (rest[1] === 'notes') {
      const rel = rest.length > 2 ? decodeURIComponent(rest.slice(2).join('/')) : null
      if (!rel && method === 'GET') {
        return sendJson(res, 200, vaultTree().flatMap((f) => f.notes))
      }
      if (!rel && method === 'POST') return sendJson(res, 201, createVaultNote(await readBody(req)))
      if (rel && method === 'GET') return sendJson(res, 200, readVaultNote(rel))
      if (rel && method === 'PUT') {
        const body = await readBody(req)
        return sendJson(res, 200, writeVaultNote(rel, body.content))
      }
      if (rel && method === 'DELETE') return sendJson(res, 200, deleteVaultNote(rel))
    }
  }

  if (rest[0] === 'launch' && method === 'POST') {
    const body = await readBody(req)
    if (rest[1] === 'hermes') {
      let cwd = WORKSPACE
      if (body.projectId) {
        cwd = safeJoin(PROJECTS_DIR, body.projectId)
        updateProject(body.projectId, { touch: true })
      }
      const profile = body.profile || null
      const config = getConfig()
      const skin =
        profile && profile === config.cleanProfile
          ? config.skinClean
          : body.projectId
            ? config.skinProject
            : config.skinChat
      applySkin(skin, profile)
      return sendJson(res, 200, launchHermes({ cwd, profile }))
    }
    if (rest[1] === 'obsidian') return sendJson(res, 200, openObsidian())
  }

  if (rest[0] === 'open' && method === 'POST') {
    const body = await readBody(req)
    if (rest[1] === 'folder') {
      const target = body.projectId
        ? safeJoin(PROJECTS_DIR, body.projectId)
        : body.target === 'vault'
          ? VAULT_DIR
          : WORKSPACE
      return sendJson(res, 200, openFolder(target))
    }
    if (rest[1] === 'log') return sendJson(res, 200, openLog())
  }

  if (rest[0] === 'memory' && rest[1]) {
    const nom = decodeURIComponent(rest[1])
    if (method === 'GET') return sendJson(res, 200, lireMemoire(nom))
    if (rest[2] === 'restore' && method === 'POST') {
      return sendJson(res, 200, restaurerMemoire(nom))
    }
    if (rest[2] === 'reset' && method === 'POST') {
      return sendJson(res, 200, reinitialiserMemoire(nom))
    }
    if (rest[2] === 'reformuler' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, reformulerMemoire(nom, body.content))
    }
    if (method === 'PUT') {
      const body = await readBody(req)
      return sendJson(res, 200, ecrireMemoire(nom, body.content, body.stamp))
    }
  }

  if (rest[0] === 'update') {
    if (!rest[1] && method === 'GET') return sendJson(res, 200, verifierMiseAJour())
    if (rest[1] === 'apply' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, appliquerMiseAJour(body.tag))
    }
  }

  if (rest[0] === 'agora' && method === 'GET') {
    return sendJson(res, 200, await lireAgora())
  }

  if (rest[0] === 'chat') {
    // Le flux precede la session : le navigateur doit deja ecouter quand les
    // premiers evenements du demarrage partent.
    if (rest[1] === 'stream' && method === 'GET') return ouvrirFlux(req, res)

    if (rest[1] === 'session' && method === 'GET') {
      return sendJson(res, 200, await obtenirPont().ouvrirSession())
    }

    if (rest[1] === 'message' && method === 'POST') {
      const body = await readBody(req)
      const texte = String(body.texte || '').trim()
      if (!texte) {
        const err = new Error('Message vide')
        err.status = 400
        throw err
      }
      const p = obtenirPont()
      if (p.enCours) {
        // Refus rendu a celui qui a envoye, et a lui seul : diffuser cette
        // erreur alarmerait les autres fenetres, qui n'ont rien demande.
        const err = new Error('Hermes travaille encore sur le message precedent')
        err.status = 409
        throw err
      }

      // On ne retient pas la reponse : elle arrive par le flux, morceau par
      // morceau. L'appel confirme seulement qu'Hermes a pris le message.
      p.envoyer(texte).catch((e) => {
        if (e.status !== 409) diffuser({ type: 'panne', message: e.message })
      })
      return sendJson(res, 202, { recu: true })
    }

    if (rest[1] === 'cancel' && method === 'POST') {
      return sendJson(res, 200, await obtenirPont().interrompre())
    }

    if (rest[1] === 'permission' && method === 'POST') {
      const body = await readBody(req)
      const traite = obtenirPont().autoriser(String(body.demande), body.option || null)
      return sendJson(res, 200, { traite })
    }

    if (rest[1] === 'model' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, await obtenirPont().choisirModele(String(body.modele)))
    }

    if (rest[1] === 'mode' && method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, await obtenirPont().choisirMode(String(body.mode)))
    }

    // Bascule automatique de modele quand le fournisseur coupe.
    if (rest[1] === 'bascule') {
      if (method === 'GET') return sendJson(res, 200, { actif: lireBascule() })
      if (method === 'POST') {
        const body = await readBody(req)
        const actif = ecrireBascule(body.actif === true)
        // Diffuse : l'interrupteur doit suivre dans les autres fenetres
        // ouvertes, sinon deux onglets afficheraient des etats contraires.
        diffuser({ type: 'bascule-reglage', actif })
        return sendJson(res, 200, { actif })
      }
    }
  }

  if (rest[0] === 'autostart') {
    if (method === 'GET') return sendJson(res, 200, autoStartStatus())
    if (method === 'POST') {
      const body = await readBody(req)
      return sendJson(res, 200, setAutoStart(body.enabled === true))
    }
  }

  const err = new Error('Endpoint inconnu: ' + method + ' ' + url.pathname)
  err.status = 404
  throw err
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname)
  if (rel === '/' || rel === '') rel = '/index.html'

  let file
  try {
    file = safeJoin(DIST_DIR, '.' + rel)
  } catch {
    return sendJson(res, 400, { error: 'Chemin invalide' })
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST_DIR, 'index.html')          // SPA fallback
  }
  if (!fs.existsSync(file)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end(
      'Le Hub n\'est pas construit.\nLance "npm run build" dans ' + path.join(__dirname, '..')
    )
  }

  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
  const cache = file.includes(`${path.sep}assets${path.sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': cache })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  try {
    if (!isTrustedRequest(req)) return sendJson(res, 403, { error: 'Origine non autorisee' })
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    return serveStatic(req, res, url)
  } catch (err) {
    fail(res, err)
  }
})

ensureLayout()
server.listen(PORT, '127.0.0.1', () => {
  const target = `http://127.0.0.1:${PORT}`
  console.log('Hermes Hub')
  console.log('  workspace : ' + WORKSPACE)
  console.log('  interface : ' + target)
  console.log('  Ferme cette fenetre pour arreter le Hub.')
  if (OPEN_BROWSER) detach('cmd.exe', ['/c', 'start', '', target], WORKSPACE)
})

// Le pont ACP est un process enfant : sans ca, fermer le Hub laisserait un
// `hermes acp` orphelin qui tourne jusqu'au redemarrage de la machine.
for (const signal of ['SIGINT', 'SIGTERM', 'exit']) {
  process.on(signal, () => {
    if (pont) pont.fermer()
    if (signal !== 'exit') process.exit(0)
  })
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Double-clic sur le raccourci alors que le Hub tourne deja : on montre
    // l'instance existante au lieu d'afficher une erreur.
    const target = `http://127.0.0.1:${PORT}`
    console.log(`Le Hub tourne deja sur ${target}`)
    if (OPEN_BROWSER) {
      detach('cmd.exe', ['/c', 'start', '', target], WORKSPACE)
      process.exit(0)
    }
    process.exit(1)
  }
  throw err
})
