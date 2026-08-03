/**
 * Le Studio - l'atelier, pas la vitrine.
 *
 * Le Hub reste le centre de controle leger ; ici on fabrique. D'ou une route
 * plein ecran, sans barre laterale : le graphe prend toute la place parce que
 * c'est lui le sujet, et non un panneau parmi d'autres.
 *
 * Ce que le canevas apporte et qu'une image ne pouvait pas donner :
 *
 *   - on deplace les noeuds a la souris, et l'agencement reste. Un rangement
 *     automatique est une proposition ; des qu'une main le corrige, c'est elle
 *     qui a raison ;
 *   - on zoome et on se deplace, donc la taille du pole cesse d'etre un
 *     probleme de mise en page. Plus besoin de retrecir ni de replier ;
 *   - les liaisons ne se dessinent que lorsqu'elles ont VRAIMENT servi. Voir
 *     d'avance tout ce qui pourrait circuler donnait un plat de spaghettis ou
 *     rien ne se lisait ;
 *   - un double-clic ouvre les reglages du noeud ;
 *   - on batit le graphe a la souris : tirer une prise vers le vide ajoute une
 *     tache la ou on lache, tirer une prise vers une autre pose une
 *     dependance, et la touche Suppr retire un lien selectionne.
 *
 * Le tableau d'Hermes reste le seul a savoir ce qui existe : chaque geste part
 * en ligne de commande et l'ecran se relit ensuite. Rien n'est tenu en double
 * ici - un graphe local qui divergerait du tableau serait pire qu'une seconde
 * d'attente.
 */
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import type {
  Connection,
  Edge,
  EdgeChange,
  FinalConnectionState,
  Node,
  NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  BookMarked,
  Eye,
  EyeOff,
  FlaskConical,
  LayoutGrid,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NoeudStudio } from '../components/NoeudStudio'
import type { DonneesNoeud } from '../components/NoeudStudio'
import { FenetreSimulation } from '../components/FenetreSimulation'
import type { EtatNoeud } from '../components/Organigramme'
import { sansAccord } from '../lib/accords'
import { ApiError, api, ecouterChat } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import { ETATS_TACHE } from '../types'
import type {
  Agent,
  Chantier,
  Compteurs,
  DemandeAutorisation,
  EtatTache,
  Pole,
  Simulation,
} from '../types'

/** Meme geometrie que l'organigramme : un noeud fait la meme taille partout. */
const L = 224
const H = 98
const ECART_X = 96
const ECART_Y = 40

const FINI: EtatTache[] = ['done']
const DORMANT: EtatTache[] = ['triage', 'todo', 'scheduled']

function etatVisuel(etat: EtatTache): EtatNoeud | undefined {
  if (FINI.includes(etat)) return 'succes'
  if (etat === 'blocked') return 'erreur'
  if (etat === 'review') return 'attente'
  if (etat === 'running') return 'encours'
  if (DORMANT.includes(etat)) return 'endormi'
  return undefined
}

const ETAT_DU_FLUX: Record<string, EtatNoeud> = {
  'tour-debut': 'encours',
  reflexion: 'reflexion',
  texte: 'encours',
  text: 'encours',
}

const types = { agent: NoeudStudio }

/** La tache qu'on est en train de poser, avant qu'elle n'existe. */
interface Brouillon {
  /** Ou le noeud atterrira sur le canevas. */
  position: { x: number; y: number }
  /** Ou la petite fiche s'affiche, en pixels du canevas. */
  ancre: { x: number; y: number }
  /** La tache tiree, et de quel cote : sortie = la nouvelle vient apres. */
  depuis?: string
  sens?: 'apres' | 'avant'
}

const FICHE_L = 288
const FICHE_H = 232

interface Props {
  poleId?: string
  onQuitter: () => void
}

export function StudioView(props: Props) {
  // Le fournisseur doit envelopper le canevas : `useReactFlow` n'existe qu'a
  // l'interieur.
  return (
    <ReactFlowProvider>
      <Atelier {...props} />
    </ReactFlowProvider>
  )
}

function Atelier({ poleId, onQuitter }: Props) {
  const [pole, setPole] = useState<Pole | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [noeuds, setNoeuds] = useState<Node[]>([])
  const [vivant, setVivant] = useState<Map<string, EtatNoeud>>(new Map())
  const [accords, setAccords] = useState<(DemandeAutorisation & { agent: string })[]>([])
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null)
  const [voirPrevus, setVoirPrevus] = useState(false)
  const [choisi, setChoisi] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [occupe, setOccupe] = useState(false)

  /**
   * La simulation, ouverte depuis l'atelier.
   *
   * Elle vivait dans l'ecran Orchestration, atteinte par la vignette d'un pole
   * - et depuis que la vignette mene ici, plus personne ne pouvait l'ouvrir.
   * Sa place est de toute facon dans l'atelier : c'est ici qu'on remanie, donc
   * ici qu'on veut eprouver avant de lancer.
   */
  const [simu, setSimu] = useState<Simulation | null>(null)
  const [simuOuverte, setSimuOuverte] = useState(false)
  const [simuOccupee, setSimuOccupee] = useState(false)
  const [simuErreur, setSimuErreur] = useState<string | null>(null)
  const [validation, setValidation] = useState(false)

  const { fitView, screenToFlowPosition } = useReactFlow()
  const notifier = useHubStore((s) => s.notify)

  /** Les positions posees a la main. Vide = on laisse le rangement auto. */
  const dispo = useRef<Record<string, { x: number; y: number }>>({})
  /** Le cadre du canevas : sert a poser la fiche de creation sans la faire
      deborder de l'ecran. */
  const canevas = useRef<HTMLDivElement>(null)
  /** Le pole dont on a deja decide l'affichage des liens prevus. */
  const liensDecides = useRef<string | null>(null)

  const charger = useCallback(async () => {
    if (!poleId) return
    const [orch, d, ch, cp] = await Promise.all([
      api.orchestration(),
      fetch(`/api/orchestration/disposition?pole=${encodeURIComponent(poleId)}`)
        .then((r) => r.json())
        .catch(() => ({ noeuds: {} })),
      api.chantiers().catch(() => null),
      // Les chiffres du dernier passage. Un pole qui n'a jamais tourne en rend
      // de vides, et les noeuds n'affichent alors rien - c'est voulu : il n'y a
      // rien a dire tant que rien n'a eu lieu.
      api.compteurs(poleId).catch(() => null),
    ])
    dispo.current = d.noeuds || {}
    setCompteurs(cp)
    setAgents(orch.agents)
    const p = orch.poles.find((x) => x.id === poleId) || null
    setPole(p)
    const c = ch?.chantiers?.find((x) => x.pole === poleId) || null
    setChantier(c)
    setAccords(c?.accords || [])

    // Un pole qui n'a rien fait n'a aucun lien « franchi » : la vue par defaut
    // ne montrerait alors que des boites posees cote a cote, et on batirait a
    // l'aveugle. Impose une seule fois par pole - ensuite c'est le bouton qui
    // commande, sans quoi le moindre evenement du flux annulerait le choix.
    if (p && liensDecides.current !== poleId) {
      liensDecides.current = poleId
      setVoirPrevus(p.finies === 0)
    }
  }, [poleId])

  /**
   * Le reglage des liens prevus a deux maitres, et la main l'emporte.
   *
   * Le chargement le decide une fois - un pole qui n'a rien fait n'a aucun lien
   * franchi, donc rien a montrer - mais ce chargement peut finir APRES un clic,
   * et le bouton semblait alors revenir tout seul. Marquer le pole comme decide
   * au moment du geste ferme la course.
   */
  const reglerLiensPrevus = useCallback(
    (valeur: boolean | ((v: boolean) => boolean)) => {
      liensDecides.current = poleId ?? null
      setVoirPrevus(valeur)
    },
    [poleId],
  )

  useEffect(() => {
    void charger()
  }, [charger])

  useEffect(
    () =>
      ecouterChat((e) => {
        const tache = (e as { tache?: string }).tache
        const fugace = ETAT_DU_FLUX[e.type]
        if (fugace && tache) {
          setVivant((v) => (v.get(tache) === fugace ? v : new Map(v).set(tache, fugace)))
          return
        }
        if (
          e.type === 'autorisation' ||
          e.type === 'tache-etat' ||
          e.type === 'tache-compte' ||
          e.type === 'chantier-fin'
        ) {
          if (e.type === 'tache-etat') {
            setVivant((v) => {
              if (e.etat === 'running') return new Map(v).set(e.tache, 'reveil')
              if (!v.has(e.tache)) return v
              const n = new Map(v)
              n.delete(e.tache)
              return n
            })
          }
          void charger()
        }
      }),
    [charger],
  )

  /** L'ordre d'execution : profondeur dans le graphe, puis ordre d'apparition. */
  const rangs = useMemo(() => {
    if (!pole) return new Map<string, number>()
    const d = new Map(pole.taches.map((t) => [t.id, 0]))
    for (let i = 0; i < pole.taches.length; i++) {
      let bouge = false
      for (const l of pole.liens) {
        const a = d.get(l.de)
        const b = d.get(l.vers)
        if (a === undefined || b === undefined) continue
        if (b < a + 1) {
          d.set(l.vers, a + 1)
          bouge = true
        }
      }
      if (!bouge) break
    }
    return d
  }, [pole])

  // Le modele -> les noeuds du canevas. La position posee a la main gagne
  // toujours sur le rangement automatique.
  useEffect(() => {
    if (!pole) return
    const parAgent = new Map(agents.map((a) => [a.id, a]))
    const parCompte = new Map((compteurs?.taches || []).map((c) => [c.tache, c]))
    const parRang = new Map<number, string[]>()
    for (const t of pole.taches) {
      const r = rangs.get(t.id) ?? 0
      if (!parRang.has(r)) parRang.set(r, [])
      parRang.get(r)!.push(t.id)
    }

    setNoeuds(
      pole.taches.map((t) => {
        const a = parAgent.get(t.agent || 'default')
        const r = rangs.get(t.id) ?? 0
        const dansLeRang = parRang.get(r)!
        const auto = {
          x: r * (L + ECART_X),
          y: dansLeRang.indexOf(t.id) * (H + ECART_Y),
        }
        const donnees: DonneesNoeud = {
          titre: t.titre,
          sousTitre: a ? `${a.nom}${t.modele ? ` - ${t.modele}` : ''}` : t.agent || 'non assignee',
          couleur: a?.couleur || 'ardoise',
          etat: vivant.get(t.id) ?? etatVisuel(t.etat),
          etape: r + 1,
          chapeau: t.id === pole.id ? 'la demande' : undefined,
          etiquette: ETATS_TACHE[t.etat] || t.etat,
          agent: a?.id,
          compte: parCompte.get(t.id),
          accords: accords.filter((x) => x.agent === (a?.id || t.agent)),
          onRepondre: (demande, agent, option) => {
            setAccords((liste) => sansAccord(liste, agent, demande))
            void api.chatAutoriser(agent, demande, option).catch(() => null)
          },
        }
        return {
          id: t.id,
          type: 'agent',
          position: dispo.current[t.id] || auto,
          data: donnees as unknown as Record<string, unknown>,
        }
      }),
    )
  }, [pole, agents, rangs, vivant, accords, compteurs])

  /**
   * Les liaisons.
   *
   * Par defaut on ne montre QUE celles qui ont servi : la tache amont est
   * terminee, donc quelque chose a reellement circule. Afficher d'avance tout
   * ce qui pourrait circuler remplissait l'ecran de traits qui ne disaient
   * rien - et les rendait illisibles au moment ou ils comptaient.
   *
   * Le reste reste consultable a la demande : c'est utile quand on construit
   * la chaine, moins quand on la regarde tourner.
   */
  const liensCalcules: Edge[] = useMemo(() => {
    if (!pole) return []
    const etats = new Map(pole.taches.map((t) => [t.id, vivant.get(t.id) ?? etatVisuel(t.etat)]))
    const parAgent = new Map(agents.map((a) => [a.id, a]))
    const couleur = (id: string) => {
      const t = pole.taches.find((x) => x.id === id)
      return `var(--jeton-${parAgent.get(t?.agent || 'default')?.couleur || 'ardoise'})`
    }

    return pole.liens
      .map((l) => {
        const franchi = etats.get(l.de) === 'succes'
        if (!franchi && !voirPrevus) return null
        const actif =
          franchi && (etats.get(l.vers) === 'encours' || etats.get(l.vers) === 'reflexion')
        return {
          id: `${l.de}-${l.vers}`,
          source: l.de,
          target: l.vers,
          animated: actif,
          style: {
            stroke: couleur(l.de),
            strokeWidth: franchi ? 2 : 1.5,
            strokeDasharray: franchi ? undefined : '4 5',
            opacity: franchi ? 0.9 : 0.25,
          },
        } as Edge
      })
      .filter((e): e is Edge => e !== null)
  }, [pole, agents, vivant, voirPrevus])

  /**
   * Les liaisons passent par un etat, alors qu'elles se calculent entierement.
   *
   * Parce qu'une liaison porte aussi ce que le calcul ne sait pas : le fait
   * qu'on l'ait choisie. React Flow marque une liaison selectionnee en
   * demandant le changement a `onEdgesChange` ; sans etat pour le recevoir, le
   * clic n'accrochait rien et la touche Suppr n'avait jamais rien a retirer -
   * ce qui se voyait comme une touche morte, pas comme un reglage manquant.
   *
   * Le calcul reprend la main des que le graphe change, et la selection tombe
   * avec lui : c'est voulu, un trait qui n'existe plus ne reste pas choisi.
   */
  const [liaisons, setLiaisons] = useState<Edge[]>([])
  useEffect(() => setLiaisons(liensCalcules), [liensCalcules])

  const surChangement = useCallback((changements: NodeChange[]) => {
    setNoeuds((n) => applyNodeChanges(changements, n))
  }, [])

  const surChangementLiens = useCallback((changements: EdgeChange[]) => {
    setLiaisons((l) => applyEdgeChanges(changements, l))
  }, [])

  /** On enregistre au relachement, pas a chaque pixel parcouru. */
  const surFinDeplacement = useCallback(() => {
    if (!poleId) return
    setNoeuds((actuels) => {
      const carte: Record<string, { x: number; y: number }> = {}
      for (const n of actuels) carte[n.id] = { x: n.position.x, y: n.position.y }
      dispo.current = carte
      void fetch('/api/orchestration/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pole: poleId, noeuds: carte }),
      }).catch(() => null)
      return actuels
    })
  }, [poleId])

  const ranger = useCallback(async () => {
    if (!poleId) return
    await fetch(`/api/orchestration/disposition?pole=${encodeURIComponent(poleId)}`, {
      method: 'DELETE',
    }).catch(() => null)
    dispo.current = {}
    await charger()
    setTimeout(() => void fitView({ duration: 400, padding: 0.15 }), 60)
  }, [poleId, charger, fitView])

  // ---------------------------------------------------------------------------
  // Batir le graphe
  // ---------------------------------------------------------------------------
  /**
   * Un geste, puis on relit.
   *
   * Le canevas a deja bouge quand la reponse arrive - React Flow retire le lien
   * a l'ecran avant qu'on sache si le tableau l'accepte. La relecture n'est donc
   * pas un rafraichissement de confort : c'est elle qui remet en place ce qu'un
   * refus vient d'effacer, et elle a lieu que l'appel reussisse ou non.
   */
  const agir = useCallback(
    async (faire: () => Promise<unknown>, dit?: string) => {
      setOccupe(true)
      try {
        await faire()
        if (dit) notifier('info', dit)
      } catch (err) {
        notifier('error', err instanceof ApiError ? err.message : 'Le tableau a refuse ce geste.')
      } finally {
        setOccupe(false)
        await charger()
      }
    },
    [charger, notifier],
  )

  const surConnexion = useCallback(
    (c: Connection) => {
      if (!poleId || !c.source || !c.target) return
      // Un lien pose sur un pole deja avance ne serait pas « franchi », donc
      // invisible : on ne cache pas a quelqu'un ce qu'il vient de dessiner.
      reglerLiensPrevus(true)
      void agir(() => api.relier(poleId, c.source, c.target))
    },
    [poleId, agir, reglerLiensPrevus],
  )

  const surLiensRetires = useCallback(
    (liens: Edge[]) => {
      if (!poleId) return
      void agir(async () => {
        for (const l of liens) await api.delier(poleId, l.source, l.target)
      })
    },
    [poleId, agir],
  )

  /**
   * La touche Suppr retire des liens, jamais des taches.
   *
   * Une tache porte le travail d'un agent ; un lien ne porte qu'une intention,
   * et se redessine en un geste. Les deux n'ont donc pas droit au meme raccourci
   * clavier : la suppression d'une tache passe par son panneau, ou elle est
   * nommee et confirmee.
   */
  const avantSuppression = useCallback(
    async ({ edges }: { nodes: Node[]; edges: Edge[] }) => ({ nodes: [], edges }),
    [],
  )

  /**
   * Une prise tiree dans le vide : c'est une tache qui manque.
   *
   * Le sens vient du cote de la prise. Une sortie (a droite) dit « et ensuite,
   * quelqu'un fera ceci » ; une entree (a gauche) dit « avant ca, il faudrait
   * ceci ». Le meme geste ecrit donc la dependance dans le bon sens sans qu'on
   * ait a la choisir dans un menu.
   */
  const surFinDeConnexion = useCallback(
    (evenement: MouseEvent | TouchEvent, etat: FinalConnectionState) => {
      if (!poleId || etat.toNode || !etat.fromNode) return
      const cadre = canevas.current?.getBoundingClientRect()
      if (!cadre) return

      const point = 'changedTouches' in evenement ? evenement.changedTouches[0] : evenement
      const flux = screenToFlowPosition({ x: point.clientX, y: point.clientY })
      const sens = etat.fromHandle?.type === 'target' ? 'avant' : 'apres'

      setChoisi(null)
      setBrouillon({
        // Le noeud se pose sous le curseur plutot qu'a partir de lui : c'est
        // sa prise qu'on tient, pas son coin.
        position: { x: sens === 'avant' ? flux.x - L : flux.x, y: flux.y - H / 2 },
        ancre: {
          x: Math.max(8, Math.min(point.clientX - cadre.left, cadre.width - FICHE_L - 8)),
          y: Math.max(8, Math.min(point.clientY - cadre.top, cadre.height - FICHE_H - 8)),
        },
        depuis: etat.fromNode.id,
        sens,
      })
    },
    [poleId, screenToFlowPosition],
  )

  /** Le bouton : une tache sans attache, que le serveur branchera sur la
      demande d'origine - sans quoi elle n'appartiendrait a aucun pole. */
  const ouvrirBrouillonLibre = useCallback(() => {
    const cadre = canevas.current?.getBoundingClientRect()
    if (!cadre) return
    const centre = { x: cadre.left + cadre.width / 2, y: cadre.top + cadre.height / 2 }
    const flux = screenToFlowPosition(centre)
    setChoisi(null)
    setBrouillon({
      position: { x: flux.x - L / 2, y: flux.y - H / 2 },
      ancre: { x: (cadre.width - FICHE_L) / 2, y: Math.max(8, (cadre.height - FICHE_H) / 2) },
    })
  }, [screenToFlowPosition])

  const creer = useCallback(
    async (titre: string, corps: string, agent: string) => {
      if (!poleId || !brouillon) return
      const b = brouillon
      setBrouillon(null)
      setOccupe(true)
      // Meme raison que pour un lien pose a la main : le trait qui vient
      // d'etre cree n'a servi a personne, donc il ne se dessinerait pas.
      if (b.depuis) reglerLiensPrevus(true)
      try {
        const { id } = await api.ajouterTache({
          pole: poleId,
          titre,
          corps,
          agent,
          apres: b.sens === 'apres' && b.depuis ? [b.depuis] : [],
          avant: b.sens === 'avant' && b.depuis ? [b.depuis] : [],
          position: b.position,
        })
        // On ouvre son panneau dans la foulee : une tache qu'on vient de poser
        // est celle qu'on va vouloir regler.
        setChoisi(id)
      } catch (err) {
        notifier('error', err instanceof ApiError ? err.message : "La tache n'a pas pu etre creee.")
      } finally {
        setOccupe(false)
        await charger()
      }
    },
    [poleId, brouillon, charger, notifier, reglerLiensPrevus],
  )

  /**
   * Remettre une tache bloquee en circulation.
   *
   * On ne la relance pas : on la rend au tableau, qui decidera de son tour
   * comme pour n'importe quelle autre. Relancer d'ici court-circuiterait les
   * dependances - une tache debloquee dont le parent a echoue repartirait
   * avant lui.
   */
  const debloquerLaTache = useCallback(
    (id: string) => {
      if (!poleId) return
      void agir(() => api.debloquerTache(poleId, id), 'Tache remise en circulation.')
    },
    [poleId, agir],
  )

  /**
   * Mettre en memoire ce qui a marche.
   *
   * Un pole reussi disparait : son graphe reste sur le tableau, ses livrables
   * dans son dossier, et la prochaine demande du meme genre repart de zero.
   * La fiche va dans le Coffre, donc dans Obsidian - pas dans une base a nous.
   */
  const mettreEnMemoire = useCallback(() => {
    if (!poleId) return
    void agir(async () => {
      const r = await api.apprendreDuPole(poleId)
      return r
    }, 'Mis en memoire : la fiche est dans le Coffre, dossier Skills.')
  }, [poleId, agir])

  const retirer = useCallback(
    (id: string) => {
      if (!poleId) return
      setChoisi(null)
      void agir(() => api.supprimerTache(poleId, id), 'Tache retiree du tableau.')
    },
    [poleId, agir],
  )

  /** Lecture pure : quelques dizaines de millisecondes, aucun modele appele. */
  const simuler = useCallback(async () => {
    if (!poleId) return
    setSimuOuverte(true)
    setSimuErreur(null)
    setSimuOccupee(true)
    try {
      setSimu(await api.simulation(poleId))
    } catch (e) {
      setSimu(null)
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setSimuOccupee(false)
    }
  }, [poleId])

  /** Tout est fait : le pole a une forme dont on peut apprendre. */
  const abouti = !!pole?.taches.length && pole.taches.every((t) => t.etat === 'done')

  const tacheChoisie = pole?.taches.find((t) => t.id === choisi)
  const agentChoisi = agents.find((a) => a.id === (tacheChoisie?.agent || 'default'))
  /** Un pole au travail se regarde, il ne se remanie pas - le serveur refuse
      de toute facon, autant ne pas proposer le geste. */
  const modifiable = !!pole && !chantier?.actif

  return (
    <div data-zone="studio" className="flex h-screen flex-col bg-slate-100 dark:bg-navy-950">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 dark:border-navy-800 dark:bg-navy-900">
        <button onClick={onQuitter} className="btn-ghost px-2 py-1.5" title="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{pole?.titre || 'Studio'}</p>
          <p className="truncate text-[10px] muted">
            {pole ? `${pole.taches.length} taches` : 'Aucun pole ouvert'}
            {chantier?.actif
              ? ' - en cours, le graphe est fige'
              : pole
                ? ' - tire une prise pour relier ou pour ajouter, Suppr retire un lien'
                : ''}
            {/* Le cumul, pas la duree du pole : une vague travaille de front, et
                la somme des taches depasse l'horloge. On dit donc « de travail »
                plutot qu'un total qu'aucune montre n'a mesure. */}
            {compteurs && compteurs.taches.length > 0 && (
              <span className="tabular-nums">
                {' - '}
                {Math.round(compteurs.cumul / 1000)} s de travail sur{' '}
                {compteurs.taches.length} tache
                {compteurs.taches.length > 1 ? 's' : ''}
                {compteurs.bascules > 0 && `, ${compteurs.bascules} bascule${compteurs.bascules > 1 ? 's' : ''}`}
              </span>
            )}
          </p>
        </div>

        {modifiable && (
          <button
            onClick={ouvrirBrouillonLibre}
            className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]"
            title="Ajouter une tache au pole"
          >
            <Plus className="h-3.5 w-3.5" />
            Tache
          </button>
        )}
        <button
          onClick={() => reglerLiensPrevus((v) => !v)}
          className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]"
          title="Afficher aussi les liens qui n-ont pas encore servi"
        >
          {voirPrevus ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Liens prevus
        </button>
        <button onClick={() => void ranger()} className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]">
          <LayoutGrid className="h-3.5 w-3.5" />
          Ranger
        </button>
        {/* Eprouver avant de lancer, et voir le banc des essais precedents.
            Gratuit : la simulation ne rejoue que ce qui est deja sur le disque. */}
        <button
          onClick={() => void simuler()}
          className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]"
          title="Rejouer ce graphe sans appeler aucun modele"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Simuler
        </button>
        {/* On n'apprend que d'un travail qui a abouti : une fiche tiree d'un
            pole a moitie echoue serait proposee plus tard, en confiance, pour
            rejouer une forme qui n'a jamais fonctionne. Le bouton n'existe
            donc que lorsque toutes les taches sont faites. */}
        {abouti && (
          <button
            onClick={mettreEnMemoire}
            disabled={occupe}
            className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px] disabled:opacity-40"
            title="Ecrire ce qui a marche dans le Coffre, pour le reproposer plus tard"
          >
            <BookMarked className="h-3.5 w-3.5" />
            Mettre en memoire
          </button>
        )}
        {chantier?.actif ? (
          <button
            onClick={() => void api.arreterPole(poleId!).catch(() => null)}
            className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]"
          >
            <Square className="h-3.5 w-3.5" />
            Arreter
          </button>
        ) : (
          <button
            onClick={() => void api.lancerPole(poleId!).catch(() => null)}
            className="btn-primary gap-1.5 px-2.5 py-1.5 text-[11px]"
          >
            <Play className="h-3.5 w-3.5" />
            Lancer
          </button>
        )}
      </header>

      <div ref={canevas} className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={noeuds}
          edges={liaisons}
          nodeTypes={types}
          onNodesChange={surChangement}
          onEdgesChange={surChangementLiens}
          onNodeDragStop={surFinDeplacement}
          onNodeDoubleClick={(_, n) => setChoisi(n.id)}
          onPaneClick={() => {
            setChoisi(null)
            setBrouillon(null)
          }}
          nodesConnectable={modifiable}
          onConnect={surConnexion}
          onConnectEnd={surFinDeConnexion}
          onBeforeDelete={avantSuppression}
          onEdgesDelete={surLiensRetires}
          deleteKeyCode={modifiable ? ['Delete', 'Backspace'] : null}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} size={1.5} className="opacity-60" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-white/80 dark:!bg-navy-900/80" />
        </ReactFlow>

        {/* Les reglages du noeud : ce qu'il est, et ce qu'il doit accomplir. */}
        {tacheChoisie && (
          <aside className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-navy-700 dark:bg-navy-900">
            <div
              className="mb-2 flex items-start gap-2"
              style={{ ['--agent' as string]: `var(--jeton-${agentChoisi?.couleur || 'ardoise'})` }}
            >
              <span className="point-agent mt-1" />
              <div className="min-w-0 flex-1">
                <p className="titre-noeud">{tacheChoisie.titre}</p>
                <p className="texte-detail muted">{ETATS_TACHE[tacheChoisie.etat] || tacheChoisie.etat}</p>
              </div>
              <button onClick={() => setChoisi(null)} className="btn-ghost px-1.5 py-1 text-[11px]">
                Fermer
              </button>
            </div>

            <dl className="space-y-1.5 text-[11px]">
              <Ligne terme="Agent" valeur={agentChoisi?.nom || tacheChoisie.agent || '-'} />
              <Ligne terme="Metier" valeur={agentChoisi?.metier || '-'} />
              <Ligne terme="Modele" valeur={tacheChoisie.modele || agentChoisi?.modele || '-'} />
              <Ligne terme="Identifiant" valeur={tacheChoisie.id} />
            </dl>

            {tacheChoisie.corps && (
              <>
                <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wide muted">
                  Ce qu-il doit accomplir
                </p>
                <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed dark:bg-navy-800">
                  {tacheChoisie.corps}
                </p>
              </>
            )}

            {/* La sortie de l'impasse.
                Le Hub bloque une tache quand elle n'a pas produit son livrable,
                quand le fichier ecrit avoue un echec, quand un PDF n'est qu'une
                page d'erreur. Ces refus sont justes - mais jusqu'ici rien dans
                l'interface ne permettait de repartir : le 03/08/2026 il a fallu
                `hermes kanban unblock` en ligne de commande pour relancer un
                pole. Le bouton est ici, sur le noeud qui porte le blocage,
                parce que c'est la qu'on le voit. */}
            {modifiable && tacheChoisie.etat === 'blocked' && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 dark:border-amber-500/40 dark:bg-amber-500/10">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Tache bloquee
                </p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Elle ne repartira pas d-elle-meme. Corrige ce qui l-a fait
                  echouer - l-enonce, l-agent, le modele - puis remets-la en
                  circulation.
                </p>
                <button
                  onClick={() => debloquerLaTache(tacheChoisie.id)}
                  disabled={occupe}
                  className="btn-primary mt-2 w-full justify-center gap-1.5 py-1.5 text-[11px] disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Remettre en circulation
                </button>
              </div>
            )}

            {/* Retirer une tache est le seul geste du Studio qui defait du
                travail : il porte donc un nom, une confirmation, et il n'a pas
                de raccourci clavier. La demande d'origine, elle, ne s'enleve
                pas - c'est elle qui tient le pole. */}
            {modifiable && tacheChoisie.id !== pole?.id && (
              <Retirer titre={tacheChoisie.titre} occupe={occupe} onRetirer={() => retirer(tacheChoisie.id)} />
            )}
          </aside>
        )}

        {simuOuverte && (
          <FenetreSimulation
            simulation={simu}
            chargement={simuOccupee}
            erreur={simuErreur}
            validation={validation}
            chantier={chantier}
            accords={accords}
            onAccord={(demande, agent, option) => {
              setAccords((a) => sansAccord(a, agent, demande))
              void api.chatAutoriser(agent, demande, option).catch(() => null)
            }}
            onLancer={() => void api.lancerPole(poleId!).catch(() => null)}
            onArreter={() => void api.arreterPole(poleId!).catch(() => null)}
            onValider={() => {
              if (!poleId) return
              void api.validerPole(poleId).then(() => setValidation(true)).catch(() => null)
            }}
            // Dans l'atelier, « Modifier » n'envoie nulle part : on y est deja.
            // La fenetre se ferme, et la souris reprend la main sur le graphe.
            onModifier={() => setSimuOuverte(false)}
            onRafraichir={() => {
              // Un retour au banc a ecrit sur le tableau : le graphe affiche
              // derriere la fenetre ne decrit plus rien.
              void simuler()
              void charger()
            }}
            onFermer={() => setSimuOuverte(false)}
          />
        )}

        {brouillon && (
          <FicheNouvelle
            brouillon={brouillon}
            agents={agents}
            occupe={occupe}
            surTache={(t) => (pole?.taches.find((x) => x.id === t)?.titre || '').slice(0, 60)}
            onAnnuler={() => setBrouillon(null)}
            onCreer={creer}
          />
        )}
      </div>
    </div>
  )
}

/**
 * La fiche d'une tache qui n'existe pas encore.
 *
 * Elle demande trois choses et pas une de plus : ce qu'il y a a faire, qui le
 * fait, et la consigne si le titre ne suffit pas. Le reste - modele, etat,
 * position dans l'ordre - se regle apres coup dans le panneau, et un formulaire
 * de creation qui demande tout est un formulaire qu'on abandonne.
 */
function FicheNouvelle({
  brouillon,
  agents,
  occupe,
  surTache,
  onAnnuler,
  onCreer,
}: {
  brouillon: Brouillon
  agents: Agent[]
  occupe: boolean
  surTache: (id: string) => string
  onAnnuler: () => void
  onCreer: (titre: string, corps: string, agent: string) => void
}) {
  const [titre, setTitre] = useState('')
  const [corps, setCorps] = useState('')
  const [agent, setAgent] = useState('default')

  const voisine = brouillon.depuis ? surTache(brouillon.depuis) : ''
  const pret = titre.trim().length > 0 && !occupe

  return (
    <div
      data-zone="brouillon-tache"
      className="card absolute z-20 p-3 shadow-xl"
      style={{ left: brouillon.ancre.x, top: brouillon.ancre.y, width: FICHE_L }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onAnnuler()
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && pret) {
          onCreer(titre.trim(), corps.trim(), agent)
        }
      }}
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide muted">
        {voisine
          ? brouillon.sens === 'avant'
            ? `A faire avant « ${voisine} »`
            : `A faire apres « ${voisine} »`
          : 'Une tache de plus dans ce pole'}
      </p>

      <input
        autoFocus
        className="input px-2 py-1.5 text-xs"
        placeholder="Ce qu-il y a a faire"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
      />
      <textarea
        className="input mt-1.5 resize-none px-2 py-1.5 text-xs"
        rows={3}
        placeholder="La consigne, si le titre ne suffit pas"
        value={corps}
        onChange={(e) => setCorps(e.target.value)}
      />
      <select
        className="input mt-1.5 px-2 py-1.5 text-xs"
        value={agent}
        onChange={(e) => setAgent(e.target.value)}
      >
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nom}
            {a.metier ? ` - ${a.metier}` : ''}
          </option>
        ))}
      </select>

      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button onClick={onAnnuler} className="btn-ghost px-2 py-1 text-[11px]">
          Annuler
        </button>
        <button
          onClick={() => onCreer(titre.trim(), corps.trim(), agent)}
          disabled={!pret}
          className="btn-primary px-2.5 py-1 text-[11px]"
        >
          Creer
        </button>
      </div>
    </div>
  )
}

/** Deux clics, parce que le premier peut etre un accident. */
function Retirer({
  titre,
  occupe,
  onRetirer,
}: {
  titre: string
  occupe: boolean
  onRetirer: () => void
}) {
  const [sur, setSur] = useState(false)

  // Repose la question a chaque changement de tache : une confirmation armee
  // sur une tache et tiree sur une autre serait exactement le geste a eviter.
  useEffect(() => setSur(false), [titre])

  if (!sur) {
    return (
      <button
        onClick={() => setSur(true)}
        className="btn-ghost mt-3 w-full gap-1.5 px-2 py-1.5 text-[11px]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Retirer du pole
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-red-200 p-2 dark:border-red-500/40">
      <p className="text-[11px] leading-relaxed">
        Retirer cette tache du pole ? Elle est archivee sur le tableau, pas effacee - ce qu-elle a
        deja produit reste consultable dans Hermes.
      </p>
      <div className="mt-2 flex justify-end gap-1.5">
        <button onClick={() => setSur(false)} className="btn-ghost px-2 py-1 text-[11px]">
          Non
        </button>
        <button onClick={onRetirer} disabled={occupe} className="btn-danger px-2.5 py-1 text-[11px]">
          Retirer
        </button>
      </div>
    </div>
  )
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 flex-none muted">{terme}</dt>
      <dd className="min-w-0 flex-1 truncate font-medium" title={valeur}>
        {valeur}
      </dd>
    </div>
  )
}
