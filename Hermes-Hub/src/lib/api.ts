/**
 * Typed client for the local Hub API. Every button in the UI goes through one
 * of these calls - there is no local-only state pretending to be data.
 */
import type { AppConfig, Project, ProjectStatus, Stats, VaultFolder, VaultNote } from '../types'

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

  listProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${enc(id)}`),
  createProject: (input: { name: string; description?: string; status?: ProjectStatus }) =>
    request<Project>('/projects', { method: 'POST', body: body(input) }),
  updateProject: (
    id: string,
    patch: { name?: string; description?: string; status?: ProjectStatus; touch?: boolean },
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
}
