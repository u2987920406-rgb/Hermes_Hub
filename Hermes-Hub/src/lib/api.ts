/**
 * Typed client for the local Hub API. Every button in the UI goes through one
 * of these calls - there is no local-only state pretending to be data.
 */
import type {
  Agent,
  AppConfig,
  Decomposition,
  Orchestration,
  Diagnostics,
  EvenementChat,
  MemoryFile,
  Project,
  ProjectStatus,
  SessionChat,
  Simulation,
  Skin,
  Stats,
  Validation,
  TrashItem,
  VaultFolder,
  VaultNote,
} from '../types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch('/api' + path, {
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new ApiError('Le serveur du Hub ne repond pas. Relance le raccourci Hermes Hub.', 0)
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(data?.error || `Erreur ${res.status}`, res.status)
  return data as T
}

const body = (value: unknown) => JSON.stringify(value)
const enc = (value: string) => encodeURIComponent(value)

export const api = {
  health: () =>
    request<{ ok: boolean; workspace: string; workspaceExists: boolean; version: string }>('/health'),

  stats: () => request<Stats>('/stats'),

  getConfig: () => request<AppConfig>('/config'),
  saveConfig: (patch: Partial<AppConfig>) =>
    request<AppConfig>('/config', { method: 'PUT', body: body(patch) }),

  skins: () => request<Skin[]>('/skins'),

  diagnostics: () => request<Diagnostics>('/diagnostics'),

  readMemory: (file: string) => request<MemoryFile>(`/memory/${enc(file)}`),
  writeMemory: (file: string, content: string, stamp: string) =>
    request<MemoryFile>(`/memory/${enc(file)}`, { method: 'PUT', body: body({ content, stamp }) }),
  restoreMemory: (file: string) =>
    request<MemoryFile>(`/memory/${enc(file)}/restore`, { method: 'POST', body: body({}) }),
  resetMemory: (file: string) =>
    request<MemoryFile>(`/memory/${enc(file)}/reset`, { method: 'POST', body: body({}) }),
  reformulateMemory: (file: string, content: string) =>
    request<{ file: string; proposition: string }>(`/memory/${enc(file)}/reformuler`, {
      method: 'POST',
      body: body({ content }),
    }),

  checkUpdate: () =>
    request<{
      locale: string
      distante: string
      tag: string
      notes: string
      telechargement: string
      aJour: boolean
      applicable: boolean
      canal: string
    }>('/update'),
  applyUpdate: (tag: string) =>
    request<{ applique: string; redemarrage: boolean }>('/update/apply', {
      method: 'POST',
      body: body({ tag }),
    }),

  autoStart: () => request<{ enabled: boolean; path: string }>('/autostart'),
  setAutoStart: (enabled: boolean) =>
    request<{ enabled: boolean; path: string }>('/autostart', {
      method: 'POST',
      body: body({ enabled }),
    }),
  openLog: () =>
    request<{ opened: string; vide: boolean }>('/open/log', { method: 'POST', body: body({}) }),

  trash: () => request<TrashItem[]>('/trash'),
  restoreTrash: (id: string) =>
    request<{ restored: string }>('/trash/restore', { method: 'POST', body: body({ id }) }),
  purgeTrash: (id: string) =>
    request<{ purged: string }>('/trash/purge', { method: 'POST', body: body({ id }) }),

  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${enc(id)}`),
  createProject: (input: { name: string; description?: string; status?: ProjectStatus }) =>
    request<Project>('/projects', { method: 'POST', body: body(input) }),
  updateProject: (
    id: string,
    patch: {
      name?: string
      description?: string
      status?: ProjectStatus
      touch?: boolean
      pinned?: boolean
    },
  ) => request<Project>(`/projects/${enc(id)}`, { method: 'PATCH', body: body(patch) }),
  deleteProject: (id: string) =>
    request<{ deleted: string }>(`/projects/${enc(id)}`, { method: 'DELETE' }),

  readProjectFile: (id: string, file: string) =>
    request<{ file: string; content: string; exists: boolean }>(
      `/projects/${enc(id)}/files/${enc(file)}`,
    ),
  writeProjectFile: (id: string, file: string, content: string) =>
    request<{ file: string; saved: boolean }>(`/projects/${enc(id)}/files/${enc(file)}`, {
      method: 'PUT',
      body: body({ content }),
    }),

  vaultTree: () => request<VaultFolder[]>('/vault/tree'),
  readNote: (notePath: string) =>
    request<{ path: string; content: string }>(
      '/vault/notes/' + notePath.split('/').map(enc).join('/'),
    ),
  createNote: (input: { folder: string; title: string; content?: string }) =>
    request<VaultNote>('/vault/notes', { method: 'POST', body: body(input) }),
  writeNote: (notePath: string, content: string) =>
    request<{ path: string; saved: boolean }>(
      '/vault/notes/' + notePath.split('/').map(enc).join('/'),
      { method: 'PUT', body: body({ content }) },
    ),
  deleteNote: (notePath: string) =>
    request<{ deleted: string }>('/vault/notes/' + notePath.split('/').map(enc).join('/'), {
      method: 'DELETE',
    }),

  launchHermes: (input: { projectId?: string; profile?: string } = {}) =>
    request<{ launched: string; cwd: string }>('/launch/hermes', {
      method: 'POST',
      body: body(input),
    }),
  launchObsidian: () =>
    request<{ opened: string }>('/launch/obsidian', { method: 'POST', body: body({}) }),
  openFolder: (input: { projectId?: string; target?: 'workspace' | 'vault' } = {}) =>
    request<{ opened: string }>('/open/folder', { method: 'POST', body: body(input) }),

  // --- Orchestration : l'equipe et ses poles -----------------------------------
  orchestration: () => request<Orchestration>('/orchestration'),

  // --- La demande, la simulation, la porte -------------------------------------
  // `demande` est le seul appel modele de la phase : environ trente secondes,
  // le temps qu'Hermes decoupe la phrase en taches liees. Tout ce qui suit est
  // local - la simulation ne rejoue que ce qui est deja sur le disque, et
  // valider n'execute rien.
  demande: (texte: string) =>
    request<Decomposition>('/orchestration/demande', { method: 'POST', body: body({ texte }) }),
  simulation: (pole: string) =>
    request<Simulation>(`/orchestration/simulation?pole=${enc(pole)}`),
  validerPole: (pole: string, empreinte?: string) =>
    request<Validation>('/orchestration/validation', {
      method: 'POST',
      body: body({ pole, empreinte }),
    }),

  // --- La conversation a mentions ---------------------------------------------
  // Le serveur resout les mentions et rend les destinataires : la regle de
  // routage vit a un seul endroit, et l'interface n'a pas a la deviner. Le
  // premier message adresse a un agent endormi paie son demarrage, quelques
  // secondes - la reponse arrive par le flux, pas par cet appel.
  chatAgents: () => request<{ agents: Agent[] }>('/chat/agents'),
  chatEnvoyer: (texte: string) =>
    request<{ recu: boolean; destinataires: string[] }>('/chat/message', {
      method: 'POST',
      body: body({ texte }),
    }),
  chatInterrompre: () =>
    request<{ interrompu: boolean }>('/chat/cancel', { method: 'POST', body: body({}) }),
  chatEndormir: (agent?: string) =>
    request<{ endormi: boolean }>('/chat/sommeil', { method: 'POST', body: body({ agent }) }),
  chatAutoriser: (agent: string, demande: string, option: string | null) =>
    request<{ traite: boolean }>('/chat/permission', {
      method: 'POST',
      body: body({ agent, demande, option }),
    }),
  chatBascule: () => request<{ actif: boolean }>('/chat/bascule'),
  chatReglerBascule: (actif: boolean) =>
    request<{ actif: boolean }>('/chat/bascule', { method: 'POST', body: body({ actif }) }),
}

/**
 * Flux des evenements de la discussion. La reponse d'Hermes n'arrive pas en
 * bloc : elle se construit morceau par morceau, et les appels d'outils tombent
 * entre les morceaux de texte. Rend la fonction d'arret.
 */
export function ecouterChat(onEvenement: (e: EvenementChat) => void): () => void {
  const source = new EventSource('/api/chat/stream')

  source.onmessage = (msg) => {
    try {
      onEvenement(JSON.parse(msg.data) as EvenementChat)
    } catch {
      /* trame illisible : la suivante repartira proprement */
    }
  }

  // EventSource se reconnecte tout seul ; on n'affiche donc pas d'erreur ici,
  // sans quoi le moindre rechargement du serveur ferait clignoter une alerte.
  source.onerror = () => {}

  return () => source.close()
}
