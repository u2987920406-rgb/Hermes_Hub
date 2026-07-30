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
  }
}

function getConfig() {
  const stored = readJson(CONFIG_FILE, {})
  // paths are always re-derived: the workspace may have been moved or renamed
  return { ...defaultConfig(), ...stored, workspace: WORKSPACE, vaultPath: VAULT_DIR, projectsPath: PROJECTS_DIR }
}

function putConfig(patch) {
  const allowed = ['profile', 'cleanProfile', 'defaultModel', 'theme', 'userName']
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
function recycle(target, kind) {
  const method = kind === 'dir' ? 'DeleteDirectory' : 'DeleteFile'
  // Le chemin passe par l'environnement: aucun probleme de guillemets ou
  // d'apostrophe dans un nom de projet.
  const script =
    'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
    `[Microsoft.VisualBasic.FileIO.FileSystem]::${method}(` +
    "$env:HUB_RECYCLE_TARGET, 'OnlyErrorDialogs', 'SendToRecycleBin')"

  const res = spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { env: { ...process.env, HUB_RECYCLE_TARGET: target }, windowsHide: true }
  )

  if (res.status !== 0) {
    const err = new Error("Impossible d'envoyer a la corbeille Windows. Rien n'a ete supprime.")
    err.status = 500
    throw err
  }
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
    const err = new Error('Dossier de vault inconnu')
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

function terminalPath() {
  const wt = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WindowsApps', 'wt.exe')
  return fs.existsSync(wt) ? wt : null
}

/** Open a terminal running `hermes` in `cwd`, with an optional profile. */
function launchHermes({ cwd, profile }) {
  const cmd = profile ? `hermes -p ${profile}` : 'hermes'
  const wt = terminalPath()
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

function openObsidian() {
  const uri = `obsidian://open?path=${encodeURIComponent(VAULT_DIR)}`
  detach('cmd.exe', ['/c', 'start', '', uri], WORKSPACE)
  return { opened: uri }
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
      version: '1.0.0',
    })
  }

  if (rest[0] === 'config') {
    if (method === 'GET') return sendJson(res, 200, getConfig())
    if (method === 'PUT') return sendJson(res, 200, putConfig(await readBody(req)))
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
      return sendJson(res, 200, launchHermes({ cwd, profile: body.profile || null }))
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
