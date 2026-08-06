import { create } from 'zustand'
import { api, ApiError } from '../lib/api'
import type {
  AccordEnAttente,
  AppConfig,
  EtatAutomatisations,
  FilResume,
  ModeConversation,
  Project,
  ProjectStatus,
  Skin,
  Stats,
  Theme,
  TrashItem,
  VaultFolder,
} from '../types'
import { THEMES } from '../types'
import { ecrireTraces, lireTraces, TRACES_GARDEES, type ScenarioFini } from './alertes'

/**
 * Le mode, ramene a une forme sure.
 *
 * ⚠ ECRIT APRES UN ECRAN BLANC : une route mal adressee n'echoue pas, elle est
 * repondue par le bloc voisin - objet valide, `greffon` absent, `catch` muet,
 * application par terre. `request<T>` affirme, il ne verifie pas. Le recit
 * complet est en tete de `server/mode-conversation.js` ; ne pas le recopier
 * ici, une lecon en trois exemplaires se contredit au premier changement.
 *
 * Une forme inattendue rend `null` ou « greffon absent », jamais une promesse.
 */
function sur(brut: unknown): ModeConversation | null {
  const o = brut as Partial<ModeConversation> | null
  if (!o || (o.mode !== 'atelier' && o.mode !== 'discussion')) return null
  const g = o.greffon
  return {
    mode: o.mode,
    greffon: {
      present: g?.present === true,
      nom: typeof g?.nom === 'string' ? g.nom : 'heurtoir',
      raison: g?.present === true ? null : (g?.raison ?? 'config-introuvable'),
    },
  }
}

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
  /**
   * Combien d'agents attendent une reponse, partout.
   *
   * Vit ici et pas dans un ecran : un pole arrete par une question qu'on n'a
   * pas vue doit se signaler depuis N'IMPORTE OU dans le Hub. C'etait le
   * constat de kuchu - « si je quitte la conversation, en aucun cas j'ai une
   * indication comme quoi c'est bloque ».
   */
  accords: number
  /**
   * Les memes demandes, en clair.
   *
   * Le compte suffisait a la pastille du menu ; il ne suffit plus a la ligne
   * d'alerte, qui doit dire **la chose la plus urgente en clair** - « Pablo
   * demande a ecrire un fichier », pas « 1 ». Meme appel, meme relecture : on
   * garde une seule source, sinon le compte et la liste finiraient par ne plus
   * raconter la meme chose.
   */
  demandes: AccordEnAttente[]

  /**
   * Les conversations gardees, et si leur volet est ouvert.
   *
   * MEME RAISON QUE `demandes` : trois surfaces les lisent. Elles ont vecu en
   * double - dans `Conversation` et dans `OrchestrationView`, chacune avec son
   * appel - donc deux listes du meme serveur relues a des moments differents.
   * Et `historiqueOuvert` est ici parce que le bouton et le volet ne sont pas
   * rendus par le meme ecran : l'accueil pose le premier, la conversation pose
   * le second - seule elle sait rejouer un fil.
   */
  fils: FilResume[]
  rafraichirFils: () => Promise<void>
  historiqueOuvert: boolean
  ouvrirHistorique: () => void
  fermerHistorique: () => void

  /** Les scenarios finis qu'on n'a pas encore ecartes. Voir `ScenarioFini`. */
  scenariosFinis: ScenarioFini[]
  noterScenarioFini: (t: Omit<ScenarioFini, 'cle' | 'quand'>) => void
  oublierScenario: (cle: string) => void

  /** L'etat des taches programmees. Relu par la ligne d'alerte, qui doit savoir
      si l'une est tombee - et par l'accueil, qui les affiche en entier. */
  automatisations: EtatAutomatisations | null
  rafraichirAutomatisations: () => Promise<void>

  /**
   * Une fausse autorisation, posee a la main - Configuration > Developpement.
   *
   * ELLE EXISTE POUR QU'ON PUISSE JUGER LA LIGNE D'ALERTE SANS ATTENDRE QU'UN
   * AGENT DEMANDE QUELQUE CHOSE. C'est la porte du chantier 2 : « declencher
   * une fausse autorisation et la voir apparaitre au meme endroit sur les trois
   * ecrans, plein ecran compris ». Sans interrupteur, il faudrait lancer un
   * vrai scenario et esperer qu'il demande a ecrire - une verification qui
   * depend de la chance n'est pas une verification.
   *
   * Elle n'est retenue nulle part : un essai qui survivrait au rechargement
   * finirait par etre pris pour une vraie demande.
   */
  alerteEssai: boolean
  basculerAlerteEssai: () => void

  /**
   * Discussion ou Atelier - et ce que ce mode a le droit de promettre.
   *
   * IL VIT ICI ET PAS DANS L'INTERRUPTEUR, parce que trois surfaces le lisent
   * pour des raisons differentes : le bouton l'affiche, le champ de saisie
   * change son invite (F2 - « ecris a ton equipe » n'a aucun sens quand
   * personne ne se reveille), et l'annuaire des agents disparait sous un mode
   * ou mentionner quelqu'un ne convoque personne. Le laisser dans le composant
   * obligeait a le redescendre en props a travers un fichier deja signale pour
   * decoupe.
   *
   * `null` tant qu'on ne sait pas : on n'affiche alors ni interrupteur ni
   * promesse, plutot que de supposer Atelier. Le serveur, lui, tranche
   * toujours - c'est `lireMode()` qui fait autorite, pas cette copie.
   */
  modeConversation: ModeConversation | null
  chargerMode: () => Promise<void>
  poserMode: (mode: ModeConversation['mode']) => Promise<void>

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

  /** Relit le serveur. Silencieux : un echec ne doit pas jeter une notification
      toutes les quelques secondes, et un compte perime vaut mieux qu'une alerte
      qui crie a la place du blocage qu'elle est censee annoncer. */
  rafraichirAccords: () => Promise<void>
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
    accords: 0,
    demandes: [],
    fils: [],
    historiqueOuvert: false,
    scenariosFinis: lireTraces(),
    automatisations: null,
    alerteEssai: false,
    modeConversation: null,

    loading: false,
    toasts: [],

    noterScenarioFini: (t) => {
      set((s) => {
        // La cle porte le titre ET l'instant : un meme scenario relance deux
        // fois laisse deux traces, et c'est voulu - ce sont deux passages.
        const trace: ScenarioFini = { ...t, cle: `${t.titre}#${Date.now()}`, quand: Date.now() }
        const traces = [...s.scenariosFinis, trace].slice(-TRACES_GARDEES)
        ecrireTraces(traces)
        return { scenariosFinis: traces }
      })
    },

    oublierScenario: (cle) => {
      set((s) => {
        const traces = s.scenariosFinis.filter((t) => t.cle !== cle)
        ecrireTraces(traces)
        return { scenariosFinis: traces }
      })
    },

    rafraichirAutomatisations: async () => {
      // Silencieux, comme les accords : une section qui ne repond pas ne doit
      // pas jeter une notification a chaque battement.
      set({ automatisations: await api.automatisations().catch(() => get().automatisations) })
    },

    basculerAlerteEssai: () => set((s) => ({ alerteEssai: !s.alerteEssai })),

    // Silencieux, comme les accords : un historique qui ne repond pas ne doit
    // pas jeter une notification a chaque tour fini.
    rafraichirFils: async () => {
      set({ fils: await api.conversations().catch(() => get().fils) })
    },

    // On relit en ouvrant : le compte du bouton peut dater du dernier tour, la
    // liste qu'on deroule ne le doit pas.
    ouvrirHistorique: () => {
      void get().rafraichirFils()
      set({ historiqueOuvert: true })
    },
    fermerHistorique: () => set({ historiqueOuvert: false }),

    chargerMode: async () => {
      set({ modeConversation: sur(await api.modeConversation().catch(() => null)) })
    },

    poserMode: async (mode) => {
      const rendu = sur(await api.setModeConversation(mode).catch(() => null))
      // Une reponse illisible ne doit pas laisser l'ecran affirmer l'ancien
      // mode : on se tait plutot que d'afficher une garantie perimee.
      set({ modeConversation: rendu })
    },

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
        notify('success', `Projet "${project.name}" cree avec ses ${project.total} fichiers.`)
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

    rafraichirAccords: async () => {
      try {
        const { total, accords } = await api.accords()
        set({ accords: total, demandes: accords })
      } catch {
        /* Le serveur repondra au prochain evenement. Voir le contrat plus haut. */
      }
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
