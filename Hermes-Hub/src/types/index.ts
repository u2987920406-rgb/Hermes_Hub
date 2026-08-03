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
  /** Combien il en faut. Vient du serveur : l'ecrire en dur ici, c'est se
      contredire le jour ou la liste change. */
  total: number
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
  /** Canal de mise a jour : `stable` suit la ligne livree, `beta` la V2 en
      construction. Le Hub n'y touche jamais tout seul. */
  canal: string
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
  /** Qui, dans l'equipe, a cette version. `null` pour SOUL.md, qui ne se
      partage pas : chaque agent a son propre caractere. */
  equipe: EtatMemoireEquipe | null
  /** Rendu par les ecritures seulement : ce que la derniere diffusion a fait. */
  propagation?: Propagation | null
}

/**
 * L'ecart entre ce qu'Hermes sait et ce que son equipe sait.
 *
 * Mesure sur un poste reel : `USER.md` rempli chez `default`, gabarit vide chez
 * quatorze agents sur seize. Personne ne pouvait le voir - un agent mal
 * renseigne ne tombe pas en panne, il repond a cote.
 */
export interface EtatMemoireEquipe {
  partage: boolean
  aJour: string[]
  enRetard: string[]
}

export interface Propagation {
  fichier: string
  partage: boolean
  /** Ceux qui viennent de la recevoir. Vide = tout le monde l'avait deja. */
  portee: string[]
  echecs: { agent: string; message: string }[]
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
  | 'orchestration'
  /** Plein ecran, hors barre laterale : l'atelier, pas une vue de plus. */
  | 'studio'
  | 'projects'
  | 'project'
  | 'clean'
  | 'vault'
  | 'trash'
  | 'config'

// -----------------------------------------------------------------------------
// Orchestration : l'equipe et ses poles
// -----------------------------------------------------------------------------

export type RoleAgent = 'orchestrateur' | 'manager' | 'worker' | 'bac-a-sable'

export interface Agent {
  id: string
  nom: string
  /** null pour Hermes : le profil par defaut n'a pas de nom en ligne de commande. */
  profil: string | null
  role: RoleAgent
  /** Jeton de couleur, traduit en `var(--jeton-X)` par l'interface. */
  couleur: string
  icone: string
  /** Ce que le decomposeur de kanban lit pour router une tache. */
  description: string
  /** Son metier en trois mots, lu dans la premiere phrase de sa description :
      de quoi reconnaitre qui est qui sans ouvrir sa fiche. */
  metier: string
  modele: string | null
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
}

/** Une composante connexe du graphe de taches : la demande d'origine et tout
    ce dont elle depend. Son titre est celui de la tache finale. */
export interface Pole {
  id: string
  titre: string
  corps: string
  taches: Tache[]
  liens: { de: string; vers: string }[]
  enCours: boolean
  finies: number
  creeLe: number
}

/** Un groupe d'agents qu'on nomme et qu'on appelle d'un bloc - a distinguer du
    pole, qui est un graphe de taches. Le pole dit ce qui est fait, l'equipe dit
    qui pourrait le faire. */
export interface Equipe {
  id: string
  nom: string
  couleur: string
  membres: string[]
}

export interface Orchestration {
  agents: Agent[]
  equipes: Equipe[]
  poles: Pole[]
  isolees: Tache[]
  tableau: {
    disponible: boolean
    /** `init` : kanban jamais initialise. `node` : Node trop ancien. */
    raison?: 'init' | 'node' | 'lecture'
    message?: string
  }
}

// -----------------------------------------------------------------------------
// L'historique des conversations
// -----------------------------------------------------------------------------
/** Ce qui fait une conversation, c'est a qui on parle : une journee avec
    l'equipe Musique est un fil, un tete-a-tete avec un agent en est un autre. */
export interface FilResume {
  id: string
  titre: string
  portee: 'agent' | 'equipe' | 'groupe'
  cible: string
  /** Le nom lisible de l'interlocuteur - l'equipe, ou l'agent. */
  interlocuteur: string
  participants: string[]
  debutLe: number
  majLe: number
  messages: number
  /** Le fil auquel les nouveaux messages s'ajoutent en ce moment. */
  encours: boolean
}

export interface Fil extends FilResume {
  evenements: (EvenementChat & { a: number })[]
}

// -----------------------------------------------------------------------------
// La simulation locale
// -----------------------------------------------------------------------------
/** Ce que rend la decomposition : un pole neuf, et de quoi le simuler. */
export interface Decomposition {
  pole: string
  titre: string
  /** Faux quand la demande etait deja assez simple pour tenir en une tache. */
  decoupe: boolean
  enfants: string[]
  raison: string
  /** Vrai quand le Hub a arrete le decoupage au plafond. A distinguer d'un
      refus : la demande existe, elle n'a simplement pas ete decoupee. */
  depasse?: boolean
}

export type Risque = 'vert' | 'orange' | 'rouge'

/** Ce qu'une tache va reclamer, lu dans sa formulation - pas devine. */
export interface Capacite {
  id: 'web' | 'ecriture' | 'terminal' | 'lecture'
  libelle: string
  risque: Risque
}

export interface TacheSimulee {
  id: string
  titre: string
  corps: string
  etat: EtatTache
  agent: string
  agentNom: string
  couleur: string
  icone: string
  modele: string | null
  /** Un cerveau qui repond sur la machine : ni quota, ni reseau. */
  local: boolean
  /** Cout du demarrage, en ms. Zero quand l'agent est deja eveille. */
  reveil: number
  dejaEveille: boolean
  entrees: { id: string; titre: string }[]
  fichiers: { chemin: string; dossier: string }[]
  capacites: Capacite[]
  risque: Risque
  /** La tache de jonction : la demande d'origine, pas une etape de plus. */
  demande: boolean
}

/** Tout ce qui peut partir en meme temps. C'est ce qui rend le parallelisme
    visible - une liste ordonnee le cacherait. */
export interface VagueSimulee {
  rang: number
  taches: TacheSimulee[]
  cycle: boolean
  reveilCumule: number
}

export interface Validation {
  valideLe: number
  empreinte: string | null
}

/**
 * Un essai garde au banc : ce qu'etait le plan, et ce que la simulation en a
 * mesure. Le plan lui-meme reste au serveur - une liste n'a pas besoin de le
 * porter pour se lire.
 */
export interface VersionBanc {
  id: string
  /** Quand ce plan est apparu pour la premiere fois. Ne bouge jamais. */
  prisLe: number
  /** Quand on l'a revu - revenir a un essai puis resimuler le remet ici. */
  revuLe: number
  favori: boolean
  nom: string | null
  mesure: { vagues: number; reveilMs: number; risque: Risque; alertes: number }
  taches: number
}

/** Ce qu'un retour ferait, annonce avant le geste. */
export interface NoteRetour {
  /** Celles qui ne reviendront que rebaties : nouveau numero, passe archive. */
  aRebatir: { id: string; titre: string }[]
  aRetirer: { id: string; titre: string }[]
  reassignations: { id: string; titre: string; de: string | null; vers: string | null }[]
  modeles: { id: string; titre: string; de: string | null; vers: string | null }[]
  liensAPoser: { de: string; vers: string }[]
  liensARetirer: { de: string; vers: string }[]
  gestes: number
}

export interface Comparaison {
  a: VersionBanc
  b: VersionBanc
  changements: number
  /** Le signe compte : negatif, l-equipe se met en route plus vite. */
  reveilDelta: number
  ecart: {
    ajoutees: { id: string; titre: string }[]
    retirees: { id: string; titre: string }[]
    agents: { id: string; titre: string; de: string | null; vers: string | null }[]
    modeles: { id: string; titre: string; de: string | null; vers: string | null }[]
    poses: { de: string; vers: string }[]
    retires: { de: string; vers: string }[]
  }
}

export interface Simulation {
  pole: { id: string; titre: string; corps: string }
  vagues: VagueSimulee[]
  /** La mise en route de l'equipe, en ms - jamais la duree du travail, qui
      n'est pas simulable. */
  reveilTotal: number
  agents: {
    id: string
    nom: string
    couleur: string
    icone: string
    modele: string | null
    local: boolean
    pretAServir: boolean
  }[]
  fichiers: { chemin: string; dossier: string; action: 'lecture' | 'ecriture'; tache: string }[]
  autorisations: {
    tache: string
    agent: string
    agentNom: string
    libelle: string
    risque: Risque
  }[]
  risque: Risque
  alertes: { genre: string; tache?: string; texte: string }[]
  /** Le banc d'essai du pole. Simuler photographie, donc il arrive avec. */
  banc: VersionBanc[]
  /** L'essai que cette simulation vient de prendre - ou de reconnaitre. */
  version: string
  validation: Validation | null
}

/**
 * Ce que le pole a coute la derniere fois qu'il a tourne.
 *
 * A ne pas confondre avec `reveilTotal` de la simulation : celui-la est une
 * prevision de mise en route, ceux-ci sont des mesures de travail fait.
 */
export interface CompteTache {
  tache: string
  titre: string
  agent: string
  /** Du claim a la cloture, en ms. */
  ms: number
  /** Tours envoyes. Plus de un signifie qu'une panne a ete rattrapee. */
  appels: number
  bascules: number
  etat: 'done' | 'blocked'
  finiLe: number
}

export interface Compteurs {
  taches: CompteTache[]
  agents: { agent: string; taches: number; ms: number; appels: number; bascules: number }[]
  /** Temps d'agent depense - PAS la duree du pole : une vague travaille de
      front, et la somme depasserait l'horloge. */
  cumul: number
  appels: number
  bascules: number
}

/**
 * Ce qu'on a appris d'un pole qui a abouti : la forme d'un travail qui a marche.
 *
 * Rangee dans le Coffre (`Vault/Skills`), donc lisible dans Obsidian et
 * sauvegardee avec le reste - pas dans une base propre au Hub.
 */
/**
 * Une sauvegarde, et ce qu'elle contient vraiment.
 *
 * `complete` est le champ qui travaille. `hermes backup` ne couvre que le home
 * d'Hermes ; le Coffre et les Projets vivent ailleurs et font la seconde
 * archive. Une sauvegarde amputee doit se voir AVANT qu'on en ait besoin - le
 * jour ou l'on restaure, il est trop tard pour s'en apercevoir.
 */
export interface Sauvegarde {
  nom: string
  octets: number
  home: boolean
  travail: boolean
  complete: boolean
}

export interface EtatSauvegardes {
  dossier: string
  sauvegardes: Sauvegarde[]
}

export interface PoseSauvegarde {
  nom: string
  dossier: string
  home: { ok: boolean; octets?: number; message?: string }
  travail: { ok: boolean; octets?: number; message?: string }
  complete: boolean
}

export interface Restauration {
  nom: string
  /** La sauvegarde prise AVANT d'ecraser : de quoi revenir si on s'est trompe. */
  filet: string
  resultats: { quoi: string; ok: boolean; message: string | null }[]
  ok: boolean
}

/**
 * Un profil de memoire, livre ou enregistre.
 *
 * `jetons` est une estimation, et elle est affichee : ces fichiers sont relus a
 * CHAQUE demarrage de session. Sans un poids visible, on empile les regles et
 * on retrouve la dilution - en pire, parce que cette fois l'utilisateur l'aura
 * choisie sans le savoir.
 */
export interface Profil {
  id: string
  nom: string
  resume: string
  lignes: number
  jetons: number
}

export interface EtatProfils {
  fichier: string
  /** Les niveaux livres. Vide pour USER.md et SOUL.md : on ne peut pas deviner
      qui est quelqu'un, ni son gout pour le caractere de son agent. */
  livres: Profil[]
  miens: Profil[]
  /** Le poids du fichier tel qu'il est maintenant. */
  actuel: { lignes: number; jetons: number }
}

export interface ProfilTexte {
  id: string
  contenu: string
  lignes: number
  jetons: number
}

/**
 * Ce que le poste retient de la premiere visite.
 *
 * Deux drapeaux, et leur separation est tout le dispositif : la case « ne plus
 * afficher » eteint `fenetreVue`, donc le rappel. Seul un choix de profil pose
 * `profilValide`, donc eteint le bandeau. Une case qui eteindrait les deux
 * annulerait l'objectif - ceux qui la cochent sont ceux qu'on veut atteindre.
 */
export interface Accueil {
  fenetreVue: boolean
  profilValide: boolean
}

/**
 * Un outil MCP et qui le possede.
 *
 * `manque` est le champ qui travaille. Les serveurs MCP sont par profil - mesure
 * le 03/08/2026 - donc un outil branche au terminal n'arrive que sur Hermes, et
 * les agents qui executent les taches travaillent sans. Rien ne le signalait :
 * un agent prive d'outil ne se plaint pas, il fait autrement.
 */
export interface Outil {
  nom: string
  transport: 'stdio' | 'http'
  /** L'adresse, ou la commande et son dernier argument. */
  resume: string
  actif: boolean
  present: string[]
  manque: string[]
  partout: boolean
  /** Non nul quand l'outil ne peut pas etre recopie : en-tete d'authentification,
      ou forme que le Hub ne sait pas relire. */
  pourquoiPas: string | null
}

export interface EtatOutils {
  /** L'equipe visee, bac a sable exclu. */
  equipe: string[]
  outils: Outil[]
}

/** Le compte rendu d'un branchement : un agent peut echouer sans les autres. */
export interface PoseOutil {
  nom: string
  deja?: boolean
  resultats: { profil: string; ok: boolean; message: string | null }[]
}

export interface Competence {
  fichier: string
  chemin: string
  titre: string
  tags: string[]
  pole: string | null
  date: string | null
  etapes: number
  /** Presents seulement quand la fiche est proposee pour une demande. */
  score?: number
  communs?: string[]
}

/**
 * Une tache programmee, telle qu'Hermes la garde.
 *
 * Le Hub n'en tient aucune : il lit celles du planificateur d'Hermes, seul
 * capable de les declencher quand le Hub est ferme.
 */
export interface Automatisation {
  id: string
  nom: string
  demande: string
  /** « tous les jours a 9h », ou l'expression brute si Hermes n'a pas mieux. */
  quand: string
  actif: boolean
  suspendue: boolean
  prochaine: string | null
  derniere: string | null
  resultat: string | null
  erreur: string | null
  dossier: string | null
  modele: string | null
}

export interface EtatAutomatisations {
  automatisations: Automatisation[]
  /** `null` quand on n'a pas su lire la reponse : ne jamais lire ca « tout va
      bien », d'ou le tri-etat plutot qu'un booleen. */
  passerelle: boolean | null
  /** Des taches actives, et rien pour les declencher. Le seul cas a crier. */
  muettes: boolean
}

// -----------------------------------------------------------------------------
// L'execution
// -----------------------------------------------------------------------------
/**
 * Un pole en train d'etre execute.
 *
 * A ne pas confondre avec le pole lui-meme, qui existe sur le tableau qu'il
 * tourne ou non : le chantier est l'episode pendant lequel le Hub le fait
 * avancer. Un pole a autant de chantiers qu'on l'a lance de fois.
 */
export interface Chantier {
  pole: string
  titre: string
  /** Ou les agents de ce pole ecrivent : un dossier a eux, dans le workspace. */
  dossier: string
  actif: boolean
  enCours: { tache: string; agent: string; titre: string }[]
  faites: string[]
  echouees: { tache: string; raison: string }[]
  /** Ce qu'un agent attend pour continuer. Rejoue a l'ouverture du flux : sans
      lui, un rechargement de page perdrait l'identifiant de la demande, et le
      pole resterait bloque sans moyen de repondre. */
  accords?: AccordEnAttente[]
}

/**
 * Une demande en attente, et la tache qui l'a provoquee.
 *
 * `tache` est ce qui permet de la poser sur LE bon noeud. Un agent peut en
 * tenir plusieurs dans un meme graphe : sans elle, la demande s'affichait sur
 * chacune de ses boites. `null` quand la demande ne vient pas d'un pole.
 */
export type AccordEnAttente = DemandeAutorisation & {
  agent: string
  tache?: string | null
}

/**
 * Ce qu'un pole a laisse sur le disque.
 *
 * `dossier` a `null` veut dire « il n'a jamais tourne » - a ne pas confondre
 * avec un dossier vide, qui veut dire « il a tourne et n'a rien ecrit ». Les
 * deux se disent differemment a l'ecran : le premier n'est pas un probleme, le
 * second en est peut-etre un.
 */
export interface Livrable {
  dossier: string | null
  fichiers: { nom: string; octets: number }[]
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
// Pont vers Hermes (ACP)
//
// Le contrat du protocole, sans interface au-dessus : c'est Orchestration qui
// posera ses propres ecrans dessus. Le modele des poles, des agents et de leurs
// competences n'est pas ici - il sera defini avec eux.
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

/** Un tour appartient a un agent : dans une piece a plusieurs, une reponse
    sans emetteur n'est pas attribuable. */
export interface TourAgent {
  role: 'agent'
  agent: string
  blocs: BlocTour[]
  /** Faux tant que le tour n'est pas termine : pilote l'indicateur d'activite. */
  fini: boolean
  raison?: string
}

export interface TourMoi {
  role: 'moi'
  texte: string
  /** A qui le message a ete adresse, tel que le serveur l'a resolu. */
  destinataires: string[]
}

/** Un agent en confie un autre : trace laissee dans le fil pour qu'une reponse
    n'arrive jamais sans qu'on sache qui l'a demandee. */
export interface TourDelegation {
  role: 'delegation'
  de: string
  nom: string
  vers: string[]
  texte: string
}

/** Un appel refuse par un garde-fou : trop de mentions d'un coup, ou plafond de
    convocation atteint. Se pose dans le fil au meme titre qu'une delegation -
    c'est le meme evenement, celui ou quelqu'un devait etre reveille. */
export interface TourRefus {
  role: 'refus'
  de: string
  nom: string
  /** `annuaire` : l'agent a recopie l'annuaire. `plafond` : trop de monde deja. */
  motif: 'annuaire' | 'plafond'
  citees?: number
  refuses?: string[]
  plafond?: number
}

export type Tour = TourMoi | TourAgent | TourDelegation | TourRefus

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
  /** Le genre ACP de l'appel - `read`, `edit`, `execute`... C'est l'action
      reellement demandee, pas ce que la formulation de la tache laissait
      prevoir. */
  genre?: string
  /** Ce que ce genre vaut. Absent quand le laissez-passer est coupe : rien
      n'ayant ete classe, on n'affiche pas un jugement qu'on n'a pas porte. */
  risque?: Risque | null
}

/**
 * Evenements pousses par le serveur (flux SSE).
 *
 * Tous portent le nom de leur agent, sauf ceux qui concernent le Hub lui-meme -
 * l'echo du message envoye, ou le reglage de la bascule.
 */
type EvenementBrut =
  /** Premier evenement de tout flux : l'etat des agents deja au travail, et
      des poles en train de tourner. */
  | {
      type: 'reprise'
      agents: { agent: string; enCours: boolean; autorisations: DemandeAutorisation[] }[]
      chantiers?: Chantier[]
    }
  /** Echo de ce que je viens d'envoyer, avec les destinataires resolus. Les
      groupes appeles voyagent avec, parce que seul le serveur connait la liste
      des equipes et sait donc ou s'arrete leur nom dans la phrase. */
  | { type: 'moi'; texte: string; destinataires: string[]; groupes?: string[] }
  /** Un agent vient d'etre lance : son processus existe. */
  | { type: 'reveil'; nom: string }
  /** Son processus vient de disparaitre. */
  | { type: 'sommeil' }
  /** Un agent en a appele un autre : la delegation se voit dans le fil, sinon
      une reponse surgit sans qu'on sache qui l'a demandee. */
  | { type: 'delegation'; nom: string; vers: string[]; texte: string }
  /** Trop de mentions d'un coup : l'agent recopiait l'annuaire au lieu de
      deleguer. On ne reveille personne et on le dit. */
  | { type: 'delegation-ignoree'; nom: string; citees: number }
  /** Le total d'agents convoques par une chaine de delegations est atteint :
      ceux-ci ne seront pas reveilles. Se dit, sinon la demande s'evapore. */
  | { type: 'plafond-atteint'; nom: string; refuses: string[]; plafond: number }
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
  /** Une demande a laquelle le Hub a repondu seul parce qu'elle ne faisait que
      lire. Emise pour que ca se voie : un accord silencieux ferait croire que
      l'agent n'a rien demande, et le jour ou le classement se trompe personne
      ne saurait ou regarder. */
  | {
      type: 'autorisation-auto'
      demande: string
      titre: string
      genre: string
      risque: Risque
      option: string
    }
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
  | { type: 'laissez-passer-reglage'; actif: boolean }
  /** Un pole vient d'etre lance : ses agents vont travailler dans `dossier`. */
  | { type: 'chantier-debut'; titre: string; dossier: string }
  /** Plus rien de pret sur ce pole. `restantes` a zero veut dire qu'il est
      fait ; au-dessus, il reste des taches que le tableau ne debloquera pas
      tout seul - une bloquee, ou un parent en echec. */
  | {
      type: 'chantier-fin'
      titre: string
      arrete: boolean
      faites: number
      echouees: number
      restantes: number
    }
  | { type: 'chantier-panne'; message: string }
  /** Le battement du tableau : une tache change d'etat. C'est lui qui allume
      les noeuds du graphe, et il porte le resultat quand elle se termine. */
  | {
      type: 'tache-etat'
      tache: string
      titre?: string
      etat: EtatTache
      raison?: string
      resultat?: string
      /** Vrai quand le retour en `ready` vient d'un arret demande, pas d'un
          echec : la tache n'a rien de casse, elle a ete relachee. */
      arret?: boolean
      /** Present sur un `running` qui en repete un autre : le tour a echoue et
          va etre rejoue. Dit pourquoi, parce que sans ca l'attente ressemble a
          une tache qui n'avance pas. */
      reprise?: string
    }
  /** Ce que la tache a coute, emis juste apres son dernier `tache-etat`.
      Evenement distinct plutot qu'un champ de plus : il n'existe qu'une fois la
      tache finie, et le greffer sur `tache-etat` obligerait chaque `running` a
      porter des chiffres vides. */
  | ({ type: 'tache-compte' } & CompteTache)

/**
 * Le nom de l'emetteur voyage sur chaque trame : `agent` est l'identifiant du
 * profil, absent seulement pour ce qui vient du Hub et non d'un agent.
 *
 * `pole` et `tache` marquent ce qui appartient a un chantier. Sans eux, le
 * texte d'un agent qui execute une tache serait indiscernable d'une reponse
 * dans la conversation - meme type, meme emetteur, meme flux - et viendrait
 * s'ecrire dans le fil ouvert.
 */
export type EvenementChat = EvenementBrut & { agent?: string; pole?: string; tache?: string }

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
