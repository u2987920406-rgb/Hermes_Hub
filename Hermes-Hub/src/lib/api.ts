/**
 * Typed client for the local Hub API. Every button in the UI goes through one
 * of these calls - there is no local-only state pretending to be data.
 */
import type {
  Agent,
  AppConfig,
  Automatisation,
  Chantier,
  Comparaison,
  Compteurs,
  EtatAutomatisations,
  Decomposition,
  NoteRetour,
  VersionBanc,
  Orchestration,
  Diagnostics,
  EvenementChat,
  Fil,
  FilResume,
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
  // `demande` est le seul appel modele de la phase, et le seul appel long de
  // tout le Hub. Sa duree n'est pas annoncable : quatre essais du 02/08/2026 sur
  // la meme phrase ont donne 19,7 s, 26,4 s, 95,8 s et 270 s. Le serveur coupe a
  // 180 s. D'ou le decompte plutot qu'une estimation, dans `FenetreSimulation`.
  // Tout ce qui suit est local - la simulation ne rejoue que ce qui est deja sur
  // le disque, et valider n'execute rien.
  demande: (texte: string) =>
    request<Decomposition>('/orchestration/demande', { method: 'POST', body: body({ texte }) }),
  simulation: (pole: string) =>
    request<Simulation>(`/orchestration/simulation?pole=${enc(pole)}`),
  validerPole: (pole: string, empreinte?: string) =>
    request<Validation>('/orchestration/validation', {
      method: 'POST',
      body: body({ pole, empreinte }),
    }),

  // Ce que le pole a coute la derniere fois. Appel separe de `simulation` :
  // l'une annonce, l'autre constate, et on ne les affiche pas au meme endroit.
  compteurs: (pole: string) =>
    request<Compteurs>(`/orchestration/compteurs?pole=${enc(pole)}`),

  // --- Les automatisations -----------------------------------------------------
  // Le Hub ne planifie rien lui-meme : il lit et ecrit celles d'Hermes, seul
  // capable de les declencher quand le Hub est ferme.
  automatisations: () => request<EtatAutomatisations>('/automatisations'),
  creerAutomatisation: (a: { quand: string; demande: string; nom?: string; dossier?: string }) =>
    request<{ id: string; creee: boolean }>('/automatisations', { method: 'POST', body: body(a) }),
  retirerAutomatisation: (id: string) =>
    request<{ id: string; retiree: boolean }>(`/automatisations/${enc(id)}`, { method: 'DELETE' }),
  suspendreAutomatisation: (id: string, suspendue: boolean) =>
    request<{ id: string; suspendue: boolean }>(`/automatisations/${enc(id)}`, {
      method: 'PATCH',
      body: body({ suspendue }),
    }),

  // --- Le banc d'essai ---------------------------------------------------------
  // Aucun de ces appels ne photographie : c'est `simulation` qui le fait, et
  // elle rend le banc avec. Ceux-ci ne servent qu'a le relire, a marquer une
  // etoile, ou a revenir.
  banc: (pole: string) => request<VersionBanc[]>(`/orchestration/banc?pole=${enc(pole)}`),
  favoriBanc: (pole: string, version: string, favori: boolean) =>
    request<VersionBanc>('/orchestration/banc/favori', {
      method: 'POST',
      body: body({ pole, version, favori }),
    }),
  oublierVersion: (pole: string, version: string) =>
    request<{ oubliee: string }>(
      `/orchestration/banc?pole=${enc(pole)}&version=${enc(version)}`,
      { method: 'DELETE' },
    ),
  comparaison: (pole: string, a: string, b: string) =>
    request<Comparaison>(
      `/orchestration/banc/comparaison?pole=${enc(pole)}&a=${enc(a)}&b=${enc(b)}`,
    ),
  // La note avant le geste : seul moyen de savoir ce qui ne reviendra que rebati.
  prevoirRetour: (pole: string, version: string) =>
    request<NoteRetour>(
      `/orchestration/banc/retour?pole=${enc(pole)}&version=${enc(version)}`,
    ),
  revenirVersion: (pole: string, version: string) =>
    request<{ gestes: number; rebaties: { titre: string }[] }>('/orchestration/banc/retour', {
      method: 'POST',
      body: body({ pole, version }),
    }),

  // --- Le graphe, remanie a la souris ------------------------------------------
  // `apres` et `avant` disent le sens du temps, pas celui des fleches : une
  // tache posee `apres` une autre attend qu'elle finisse. Toute modification
  // referme la porte - le serveur retire la validation, et la simulation devra
  // etre relue avant de lancer.
  ajouterTache: (input: {
    pole: string
    titre: string
    corps?: string
    agent?: string
    apres?: string[]
    avant?: string[]
    position?: { x: number; y: number }
  }) =>
    request<{ id: string; etat: string | null }>('/orchestration/tache', {
      method: 'POST',
      body: body(input),
    }),
  supprimerTache: (pole: string, id: string) =>
    request<{ retiree: string }>(
      `/orchestration/tache?pole=${enc(pole)}&id=${enc(id)}`,
      { method: 'DELETE' },
    ),

  // Remettre en circulation une tache que le Hub a bloquee. Sans ca, une garde
  // qui refuse un livrable laissait le pole sans issue dans l'interface.
  debloquerTache: (pole: string, id: string, raison?: string) =>
    request<{ id: string; debloquee: boolean }>('/orchestration/tache', {
      method: 'PATCH',
      body: body({ pole, id, debloquer: true, raison }),
    }),
  relier: (pole: string, de: string, vers: string) =>
    request<{ de: string; vers: string; lie: boolean }>('/orchestration/lien', {
      method: 'POST',
      body: body({ pole, de, vers }),
    }),
  delier: (pole: string, de: string, vers: string) =>
    request<{ de: string; vers: string; lie: boolean }>(
      `/orchestration/lien?pole=${enc(pole)}&de=${enc(de)}&vers=${enc(vers)}`,
      { method: 'DELETE' },
    ),

  // --- L'execution -------------------------------------------------------------
  // Le geste qui pousse a travers la porte, distinct de celui qui l'ouvre. Le
  // serveur repond tout de suite : le travail dure des minutes et se raconte
  // par le flux, tache par tache. Un pole non valide est refuse ici aussi, pas
  // seulement par un bouton grise.
  lancerPole: (pole: string) =>
    request<{ lance: boolean; pole: string; dossier: string }>('/orchestration/execution', {
      method: 'POST',
      body: body({ pole }),
    }),
  arreterPole: (pole: string) =>
    request<{ arrete: boolean; pole: string }>('/orchestration/execution/stop', {
      method: 'POST',
      body: body({ pole }),
    }),
  chantiers: () => request<{ chantiers: Chantier[] }>('/orchestration/execution'),

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
  // L'historique. Le fil s'ecrit tout seul cote serveur : l'interface ne fait
  // que le relire, et le jeter quand on n'en veut plus.
  conversations: () => request<FilResume[]>('/chat/conversations'),
  conversation: (id: string) => request<Fil>(`/chat/conversations/${enc(id)}`),
  supprimerConversation: (id: string) =>
    request<{ supprime: boolean }>(`/chat/conversations/${enc(id)}`, { method: 'DELETE' }),
  nouvelleConversation: () =>
    request<{ clos: boolean }>('/chat/conversations/nouvelle', {
      method: 'POST',
      body: body({}),
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
