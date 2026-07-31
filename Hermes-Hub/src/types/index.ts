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
  git: string | null
  bash: string | null
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

export type View =
  | 'home'
  | 'agora'
  | 'projects'
  | 'project'
  | 'clean'
  | 'vault'
  | 'trash'
  | 'config'

// -----------------------------------------------------------------------------
// Agora : l'equipe et le plan
// -----------------------------------------------------------------------------

export type RoleAgent = 'orchestrateur' | 'manager' | 'worker' | 'bac-a-sable'

export interface Agent {
  id: string
  nom: string
  /** null pour Hermes : le profil par defaut n'a pas de nom en ligne de commande. */
  profil: string | null
  role: RoleAgent
  /** Jeton de couleur, traduit en classes Tailwind par l'interface. */
  couleur: string
  icone: string
  description: string
  /** Faux quand le profil n'a aucune credential : il ne repondra jamais. */
  pretAServir: boolean
  taches: number
  enCours: number
  finies: number
  /** Un agent n'est eveille que le temps d'une tache. */
  eveille: boolean
}

export type EtatTache =
  | 'triage'
  | 'todo'
  | 'ready'
  | 'running'
  | 'review'
  | 'blocked'
  | 'scheduled'
  | 'done'

export interface Tache {
  id: string
  titre: string
  corps: string
  agent: string | null
  etat: EtatTache
  modele: string | null
  creeLe: number
  demarreLe: number | null
  finiLe: number | null
  resultat: string | null
  erreur: string | null
}

export interface Plan {
  disponible: boolean
  /** `init` : kanban jamais initialise. `node` : Node trop ancien. */
  raison?: 'init' | 'node' | 'lecture'
  message?: string
  taches: Tache[]
  liens: { de: string; vers: string }[]
}

export interface AgoraData {
  agents: Agent[]
  plan: Plan
}

export const ETATS_TACHE: Record<EtatTache, string> = {
  triage: 'A cadrer',
  todo: 'En attente',
  ready: 'Prete',
  running: 'En cours',
  review: 'A relire',
  blocked: 'Bloquee',
  scheduled: 'Programmee',
  done: 'Terminee',
}

// -----------------------------------------------------------------------------
// Discussion avec Hermes
// -----------------------------------------------------------------------------

/** Session ACP ouverte : ce qu'Hermes annonce de lui-meme au demarrage. */
export interface SessionChat {
  sessionId: string
  modeles: { id: string; nom: string }[]
  modeleActuel: string | null
  modes: { id: string; nom: string; aide: string }[]
  modeActuel: string | null
  cwd: string
}

export type EtatOutil = 'pending' | 'in_progress' | 'completed' | 'failed'

/** Un tour d'Hermes est une suite de blocs dans l'ordre ou ils sont arrives :
    c'est ce qui permet de lire le travail comme il s'est deroule, au lieu de
    reconstituer apres coup un texte final sans les etapes. */
export type BlocTour =
  | { type: 'texte'; texte: string }
  | { type: 'reflexion'; texte: string }
  | { type: 'outil'; id: string; titre: string; genre: string; etat: EtatOutil; detail: string }
  /** Le fournisseur a coupe en plein tour : trace du changement de modele,
      laissee dans le fil pour qu'une reponse d'un autre cerveau ne surgisse
      pas sans explication. */
  | { type: 'bascule'; de: string | null; vers: string; raison: string }

export interface TourHermes {
  role: 'hermes'
  blocs: BlocTour[]
  /** Faux tant que le tour n'est pas termine : pilote l'indicateur d'activite. */
  fini: boolean
  raison?: string
}

export interface TourMoi {
  role: 'moi'
  texte: string
}

/** Une equipe proposee : les taches qu'Hermes vient de creer, montrees dans le
    fil au moment ou il les cree, pas dans un ecran qu'il faut aller chercher. */
export interface TourProposition {
  role: 'proposition'
  taches: Tache[]
}

export type Tour = TourMoi | TourHermes | TourProposition

export interface EtapePlan {
  libelle: string
  etat: string
  priorite: string
}

export interface DemandeAutorisation {
  demande: string
  titre: string
  detail: string
  options: { id: string; libelle: string; genre: string }[]
}

/** Evenements pousses par le serveur pendant un tour (flux SSE). */
export type EvenementChat =
  /** Premier evenement de tout flux : l'etat d'un tour deja commence. */
  | { type: 'reprise'; enCours: boolean; autorisations: DemandeAutorisation[] }
  | { type: 'tour-debut' }
  | { type: 'texte'; texte: string }
  | { type: 'reflexion'; texte: string }
  | { type: 'outil'; id: string; titre: string; genre: string; etat: EtatOutil; detail: string }
  | { type: 'outil-maj'; id: string; etat?: EtatOutil; titre?: string; detail?: string }
  | { type: 'plan'; etapes: EtapePlan[] }
  | { type: 'usage'; utilise: number; total: number }
  | { type: 'mode'; mode: string }
  | { type: 'modele'; modele: string }
  | ({ type: 'autorisation' } & DemandeAutorisation)
  | { type: 'tour-fin'; raison: string; message?: string }
  | { type: 'panne'; message: string }
  /** Le fournisseur a coupe : on repart sur `vers` et on rejoue le message. */
  | { type: 'bascule'; de: string | null; vers: string; raison: string }
  /** Coupure detectee, mais l'interrupteur est ferme : on n'a rien change. */
  | { type: 'bascule-inactive'; raison: string }
  /** Tous les modeles gratuits ont coupe a leur tour. */
  | { type: 'bascule-epuisee'; raison: string; essayes: string[] }
  /** La coupure est confirmee mais le changement de modele a echoue. */
  | { type: 'bascule-echec'; raison: string; vers: string; message: string }
  /** L'interrupteur a bouge dans une autre fenetre. */
  | { type: 'bascule-reglage'; actif: boolean }

/** Traduction des noms d'outils ACP en mots du Hub. */
export const GENRES_OUTIL: Record<string, string> = {
  read: 'Lecture',
  edit: 'Modification',
  delete: 'Suppression',
  move: 'Deplacement',
  search: 'Recherche',
  execute: 'Commande',
  think: 'Reflexion',
  fetch: 'Web',
  other: 'Outil',
}

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
