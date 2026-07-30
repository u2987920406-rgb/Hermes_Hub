export type ProjectStatus = 'active' | 'done'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  path: string
  createdAt: string
  lastUsed: string
  files: string[]
  complete: boolean
}

export interface AppConfig {
  workspace: string
  vaultPath: string
  projectsPath: string
  profile: string
  cleanProfile: string
  defaultModel: string
  theme: 'light' | 'dark'
  userName: string
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

export type View = 'home' | 'projects' | 'project' | 'clean' | 'vault' | 'config'

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

export const statusClasses: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  done: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
}
