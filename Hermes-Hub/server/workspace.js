/**
 * Workspace resolution + safe path helpers.
 *
 * The workspace is the real folder the installer created (Documents/Hermes-X).
 * Everything the Hub reads or writes must resolve inside it.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const STANDARD_FILES = [
  '.hermes.md',
  'BRIEF.md',
  'plan.md',
  'REPRISE.md',
  'done.md',
  'ADM.md',
]

export const VAULT_FOLDERS = [
  'Projets',
  'Lessons',
  'Skills',
  'Decisions',
  'Bugs',
  'Changelog',
  'Templates',
]

function documentsDir() {
  const home = os.homedir()
  for (const candidate of [
    path.join(home, 'Documents'),
    path.join(home, 'OneDrive', 'Documents'),
    path.join(home, 'OneDrive - Personnel', 'Documents'),
  ]) {
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(home, 'Documents')
}

/**
 * HERMES_WORKSPACE wins; otherwise pick the most recently modified
 * Documents/Hermes-* folder so a machine with several profiles still works.
 */
export function resolveWorkspace() {
  const fromEnv = process.env.HERMES_WORKSPACE
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv)

  const docs = documentsDir()
  let best = null
  try {
    for (const entry of fs.readdirSync(docs, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('Hermes-')) continue
      const full = path.join(docs, entry.name)
      const mtime = fs.statSync(full).mtimeMs
      if (!best || mtime > best.mtime) best = { full, mtime }
    }
  } catch {
    /* Documents unreadable - fall through */
  }
  return best ? best.full : path.join(docs, 'Hermes')
}

export const WORKSPACE = resolveWorkspace()
export const PROJECTS_DIR = path.join(WORKSPACE, 'Projets')
export const VAULT_DIR = path.join(WORKSPACE, 'Vault')
export const HUB_DIR = path.join(WORKSPACE, '.hub')

export function ensureLayout() {
  for (const dir of [WORKSPACE, PROJECTS_DIR, VAULT_DIR, HUB_DIR]) {
    fs.mkdirSync(dir, { recursive: true })
  }
  for (const folder of VAULT_FOLDERS) {
    fs.mkdirSync(path.join(VAULT_DIR, folder), { recursive: true })
  }
}

/** Reject anything that escapes `root` (traversal, absolute paths). */
export function safeJoin(root, ...parts) {
  const target = path.resolve(root, ...parts)
  const rel = path.relative(root, target)
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    const err = new Error('Chemin hors du workspace')
    err.status = 400
    throw err
  }
  return target
}

const BACKSLASH = String.fromCharCode(92)
const FORBIDDEN_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*', '/', BACKSLASH])
const RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

function stripForbidden(value) {
  let out = ''
  for (const ch of value) {
    if (FORBIDDEN_CHARS.has(ch)) continue
    if (ch.charCodeAt(0) < 32) continue
    out += ch
  }
  return out
}

/**
 * Folder/file name that cannot traverse or collide with Windows reserved names.
 * Spaces and hyphens are kept - only characters Windows itself forbids are
 * stripped, so "Devis Express" and "site-vitrine" survive intact.
 */
export function sanitizeName(raw) {
  const name = stripForbidden(String(raw || '').trim())
    .replace(/\.+$/, '')
    .trim()

  if (!name) {
    const err = new Error('Nom invalide')
    err.status = 400
    throw err
  }
  if (RESERVED.test(name)) {
    const err = new Error('Nom reserve par Windows')
    err.status = 400
    throw err
  }
  if (name.length > 120) {
    const err = new Error('Nom trop long (120 caracteres maximum)')
    err.status = 400
    throw err
  }
  return name
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}
