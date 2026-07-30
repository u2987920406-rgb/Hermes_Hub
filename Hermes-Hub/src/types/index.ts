export type ProjectStatus = 'active' | 'done'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  path: string
  createdAt: string
  lastUsed: string
  /** Remonte en tete de la liste des projets. */
  pinned: boolean
  files: string[]
  complete: boolean
}

/** `antique` : lin et pierre greco-romains, le menu lateral reste bleu nuit. */
export type Theme = 'light' | 'dark' | 'antique'

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'antique', label: 'Antique (greco-romain)' },
]

export interface AppConfig {
  workspace: string
  vaultPath: string
  projectsPath: string
  profile: string
  cleanProfile: string
  defaultModel: string
  theme: Theme
  userName: string
  /** Couleur du terminal selon la porte d'entree (presets d'Hermes). */
  skinChat: string
  skinClean: string
  skinProject: string
}

export interface Skin {
  name: string
  description: string
  /** Bordure, titre, accent. Vide pour un skin perso inconnu du Hub. */
  colors: string[]
}

/** Etat de la machine, affiche dans Configuration. */
export interface Diagnostics {
  hermes: string | null
  node: string
  terminal: boolean
  profiles: string[]
  port: number
  hermesHome: string
  log: string
}

/** Fichier de memoire ou de personnalite d'Hermes, editable depuis le Hub. */
export interface MemoryFile {
  file: string
  titre: string
  aide: string
  path: string
  exists: boolean
  content: string
  /** Taille + date : sert a refuser un enregistrement si Hermes a ecrit entre-temps. */
  stamp: string
  /** Une version d'avant le dernier enregistrement existe. */
  backup: boolean
  /** La version deposee par l'installateur existe. */
  origine: boolean
}

export const FICHIERS_MEMOIRE = ['MEMORY.md', 'USER.md', 'SOUL.md'] as const

/** Element de la corbeille Windows provenant du workspace. */
export interface TrashItem {
  id: string
  name: string
  origin: string
  deletedAt: string
  isFolder: boolean
}

export interface VaultNote {
  name: string
  title: string
  path: string
  size: number
  modified: string
}

export interface VaultFolder {
  folder: string
  count: number
  notes: VaultNote[]
}

export interface Stats {
  projects: number
  active: number
  done: number
  notes: number
  folders: number
}

export type View = 'home' | 'projects' | 'project' | 'clean' | 'vault' | 'trash' | 'config'

export const STANDARD_FILES = [
  '.hermes.md',
  'BRIEF.md',
  'plan.md',
  'REPRISE.md',
  'done.md',
  'ADM.md',
] as const

export const FILE_HINTS: Record<string, string> = {
  '.hermes.md': 'Regles du projet, chargees automatiquement par Hermes',
  'BRIEF.md': "Carte d'identite stable du projet",
  'plan.md': 'Plan detaille et phases',
  'REPRISE.md': 'Avancement, reecrit a chaque jalon',
  'done.md': 'Historique de ce qui est termine',
  'ADM.md': 'Decisions et raisons (cumulatif, jamais efface)',
}

export const statusLabels: Record<ProjectStatus, string> = {
  active: 'En cours',
  done: 'Termine',
}

// Vert = termine, bleu = en cours : le vert marque ce qui est acheve.
export const statusClasses: Record<ProjectStatus, string> = {
  active: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}
