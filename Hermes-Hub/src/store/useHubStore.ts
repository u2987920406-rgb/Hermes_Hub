import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import type {
  AppConfig,
  Project,
  ProjectStatus,
  Skin,
  Stats,
  Theme,
  TrashItem,
  VaultFolder,
} from '../types'
import { THEMES } from '../types'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface HubState {
  ready: boolean
  connected: boolean
  workspace: string
  version: string

  projects: Project[]
  config: AppConfig | null
  stats: Stats | null
  vault: VaultFolder[]
  skins: Skin[]
  trash: TrashItem[]

  loading: boolean
  toasts: Toast[]

  bootstrap: () => Promise<void>
  refresh: () => Promise<void>

  notify: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void

  createProject: (input: { name: string; description?: string }) => Promise<Project | null>
  updateProject: (
    id: string,
    patch: { name?: string; description?: string; status?: ProjectStatus; pinned?: boolean },
  ) => Promise<Project | null>
  deleteProject: (id: string) => Promise<boolean>

  launchHermes: (input?: { projectId?: string; profile?: string }) => Promise<void>
  openFolder: (input?: { projectId?: string; target?: 'workspace' | 'vault' }) => Promise<void>
  openObsidian: () => Promise<void>

  saveConfig: (patch: Partial<AppConfig>) => Promise<void>
  setTheme: (theme: Theme) => void

  refreshVault: () => Promise<void>
  createNote: (input: { folder: string; title: string }) => Promise<boolean>
  deleteNote: (path: string) => Promise<boolean>

  refreshTrash: () => Promise<void>
  restoreTrash: (id: string) => Promise<boolean>
  purgeTrash: (id: string) => Promise<boolean>
}

let toastSeq = 0

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.classList.toggle('antique', theme === 'antique')
  try {
    localStorage.setItem('hermes-hub-theme', theme)
  } catch {
    /* private mode - the server copy is the real one anyway */
  }
}

export const useHubStore = create<HubState>((set, get) => {
  const notify = (kind: ToastKind, message: string) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    window.setTimeout(() => get().dismiss(id), kind === 'error' ? 6000 : 3200)
  }

  const withError = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur inattendue'
      notify('error', message)
      if (err instanceof ApiError && err.status === 0) set({ connected: false })
      return fallback
    }
  }

  return {
    ready: false,
    connected: true,
    workspace: '',
    version: '',

    projects: [],
    config: null,
    stats: null,
    vault: [],
    skins: [],
    trash: [],

    loading: false,
    toasts: [],

    notify,
    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    bootstrap: async () => {
      set({ loading: true })
      try {
        const health = await api.health()
        const [config, projects, stats, vault, skins, trash] = await Promise.all([
          api.getConfig(),
          api.listProjects(),
          api.stats(),
          api.vaultTree(),
          // Interroge Hermes: si l'agent manque, le serveur renvoie sa liste de secours.
          api.skins().catch(() => [] as Skin[]),
          api.trash().catch(() => [] as TrashItem[]),
        ])
        set({
          ready: true,
          connected: true,
          workspace: health.workspace,
          version: health.version,
          config,
          projects,
          stats,
          vault,
          skins,
          trash,
        })
        applyTheme(THEMES.some((t) => t.value === config.theme) ? config.theme : 'light')
      } catch (err) {
        set({ ready: true, connected: false })
        notify(
          'error',
          err instanceof ApiError && err.status === 0
            ? 'Serveur du Hub injoignable. Relance le raccourci Hermes Hub.'
            : 'Impossible de charger le workspace.',
        )
      } finally {
        set({ loading: false })
      }
    },

    refresh: async () => {
      const [projects, stats] = await Promise.all([
        withError(() => api.listProjects(), get().projects),
        withError(() => api.stats(), get().stats as Stats),
      ])
      set({ projects, stats, connected: true })
    },

    createProject: async (input) => {
      const project = await withError(() => api.createProject(input), null as Project | null)
      if (project) {
        notify('success', `Projet "${project.name}" cree avec ses 6 fichiers.`)
        await get().refresh()
      }
      return project
    },

    updateProject: async (id, patch) => {
      const project = await withError(() => api.updateProject(id, patch), null as Project | null)
      if (project) {
        notify('success', 'Projet mis a jour.')
        await get().refresh()
      }
      return project
    },

    deleteProject: async (id) => {
      const res = await withError(() => api.deleteProject(id), null)
      if (res) {
        notify('success', `Projet "${id}" envoye a la corbeille Windows.`)
        await get().refresh()
        await get().refreshTrash()
        return true
      }
      return false
    },

    launchHermes: async (input = {}) => {
      const res = await withError(() => api.launchHermes(input), null)
      if (res) {
        notify('success', `Hermes demarre dans un terminal (${res.launched}).`)
        await get().refresh()
      }
    },

    openFolder: async (input = {}) => {
      const res = await withError(() => api.openFolder(input), null)
      if (res) notify('info', "Dossier ouvert dans l'explorateur.")
    },

    openObsidian: async () => {
      const res = await withError(() => api.launchObsidian(), null)
      if (res) notify('info', 'Obsidian demande a ouvrir le coffre.')
    },

    saveConfig: async (patch) => {
      const config = await withError(() => api.saveConfig(patch), null as AppConfig | null)
      if (config) {
        set({ config })
        notify('success', 'Configuration enregistree.')
      }
    },

    setTheme: (theme) => {
      applyTheme(theme)
      const config = get().config
      if (config) set({ config: { ...config, theme } })
      void api.saveConfig({ theme }).catch(() => undefined)
    },

    refreshVault: async () => {
      const vault = await withError(() => api.vaultTree(), get().vault)
      const stats = await withError(() => api.stats(), get().stats as Stats)
      set({ vault, stats })
    },

    createNote: async (input) => {
      const note = await withError(() => api.createNote(input), null)
      if (note) {
        notify('success', `Note "${input.title}" creee dans ${input.folder}.`)
        await get().refreshVault()
        return true
      }
      return false
    },

    deleteNote: async (path) => {
      const res = await withError(() => api.deleteNote(path), null)
      if (res) {
        notify('success', 'Note envoyee a la corbeille Windows.')
        await get().refreshVault()
        await get().refreshTrash()
        return true
      }
      return false
    },

    refreshTrash: async () => {
      set({ trash: await withError(() => api.trash(), get().trash) })
    },

    restoreTrash: async (id) => {
      const res = await withError(() => api.restoreTrash(id), null)
      if (!res) return false
      notify('success', 'Element remis a sa place.')
      // Un projet restaure doit reapparaitre dans la liste, pas seulement
      // disparaitre de la corbeille.
      await get().refresh()
      await get().refreshTrash()
      return true
    },

    purgeTrash: async (id) => {
      const res = await withError(() => api.purgeTrash(id), null)
      if (!res) return false
      notify('success', 'Element supprime definitivement.')
      await get().refreshTrash()
      return true
    },
  }
})
