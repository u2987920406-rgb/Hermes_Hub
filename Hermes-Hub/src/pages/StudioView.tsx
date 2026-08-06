/**
 * Le Studio - la ou l'on fabrique, pas la vitrine.
 *
 * ON NE L'APPELLE PLUS « l'atelier », ni ici ni ailleurs : « Atelier » est
 * devenu le nom d'un MODE de la conversation, en face de « Discussion ». Deux
 * choses qui portent le meme mot finissent par se confondre dans une phrase,
 * et c'est toujours celle qu'on ecrit a la hate qui tranche mal.
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
  Split,
  LayoutGrid,
  Maximize2,
  Menu,
  Minimize2,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Attente } from '../components/Attente'
import { LigneAlerte } from '../components/LigneAlerte'
import { LivrableScenario } from '../components/LivrableScenario'
import { NoeudStudio } from '../components/NoeudStudio'
import { PanneauNoeud } from '../components/PanneauNoeud'
import { PanneauPlan } from '../components/PanneauPlan'
import { useRepli } from '../components/BoutonRepli'
import type { DonneesNoeud } from '../components/NoeudStudio'
import { FenetreSimulation } from '../components/FenetreSimulation'
import type { EtatNoeud } from '../components/Organigramme'
import { sansAccord } from '../lib/accords'
import { ApiError, api, ecouterChat } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import { ETATS_TACHE } from '../types'
import type {
  AccordEnAttente,
  Agent,
  Chantier,
  Compteurs,
  EtatTache,
  Livrable,
  Pole,
  Simulation,
  Tache,
} from '../types'

/** Meme geometrie que l'organigramme : un noeud fait la meme taille partout. */
const L = 224
const H = 98
const ECART_X = 96
const ECART_Y = 40

const FINI: EtatTache[] = ['done']
const DORMANT: EtatTache[] = ['triage', 'todo', 'scheduled']

/**
 * Les demandes d'autorisation que CE noeud doit porter.
 *
 * La tache decide, pas l'agent. Filtrer par nom d'agent posait la meme demande
 * sur toutes les boites qu'il tient dans le graphe : trois noeuds annonçaient
 * « 2 demandes » pour une seule, et repondre sur l'un les eteignait tous - on
 * croyait avoir accorde trois choses en un clic.
 *
 * Une demande sans tache ne vient pas du pole. Plutot que de la laisser sans
 * noeud - donc sans reponse possible, donc un pole bloque en silence - on la
 * pose sur la tache que cet agent execute a cet instant.
 */
function accordsDuNoeud(
  accords: AccordEnAttente[],
  tache: { id: string; etat: EtatTache; agent?: string | null },
  agentId?: string,
) {
  const siennes = accords.filter((x) => x.tache === tache.id)
  if (siennes.length) return siennes
  if (tache.etat !== 'running') return []
  return accords.filter((x) => !x.tache && x.agent === (agentId || tache.agent))
}

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

/**
 * UNE DEMANDE QU'HERMES N'A PAS DECOUPEE EST UN SCENARIO D'UNE SEULE TACHE.
 *
 * Elle n'est pas dans `poles` - un pole est une composante connexe, et une
 * tache seule n'en fait pas une : elle vit dans `isolees`. Le Studio rendait
 * donc « Aucun scenario ouvert » et un canevas vide, alors que c'est ici qu'on
 * vient la decouper a la main.
 *
 * ⚠ TROUVE EN CLIQUANT LE BOUTON DE F20, LE 06/08/2026 - et c'etait le bouton
 * qui mentait, pas le message. La phrase disait « tu peux la decouper a la
 * main », le bouton menait a un ecran vide : offrir un chemin qui ne mene nulle
 * part est pire que decrire un chemin qu'on laisse chercher. La lecon vaut au
 * moins autant que la friction : **un geste ajoute doit etre suivi jusqu'a son
 * arrivee.**
 */
function seule(isolees: Tache[], id?: string): Pole | null {
  const t = isolees.find((x) => x.id === id)
  if (!t) return null
  return {
    id: t.id,
    titre: t.titre,
    corps: t.corps,
    taches: [t],
    liens: [],
    enCours: t.etat === 'running',
    finies: t.etat === 'done' ? 1 : 0,
    creeLe: t.creeLe,
  }
}

interface Props {
  poleId?: string
  onQuitter: () => void
  /** Hors du cadre commun : plus de barre laterale, donc le Studio reprend a
      son compte ce qu'elle portait - le hamburger et la ligne d'alerte (F13). */
  plein: boolean
  onPlein: (plein: boolean) => void
  onMenu: () => void
}

export function StudioView(props: Props) {
  // Le fournisseur doit envelopper le canevas : `useReactFlow` n'existe qu'a
  // l'interieur.
  return (
    <ReactFlowProvider>
      <Studio {...props} />
    </ReactFlowProvider>
  )
}

function Studio({ poleId, onQuitter, plein, onPlein, onMenu }: Props) {
  const [pole, setPole] = useState<Pole | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [noeuds, setNoeuds] = useState<Node[]>([])
  const [vivant, setVivant] = useState<Map<string, EtatNoeud>>(new Map())
  const [accords, setAccords] = useState<AccordEnAttente[]>([])
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null)
  const [voirPrevus, setVoirPrevus] = useState(false)
  const [choisi, setChoisi] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [occupe, setOccupe] = useState(false)

  /**
   * La simulation, ouverte depuis le Studio.
   *
   * Elle vivait dans l'ecran Orchestration, atteinte par la vignette d'un
   * scenario - et depuis que la vignette mene ici, plus personne ne pouvait
   * l'ouvrir. Sa place est de toute facon ici : c'est ici qu'on remanie, donc
   * ici qu'on veut eprouver avant de lancer.
   */
  const [simu, setSimu] = useState<Simulation | null>(null)
  const [simuOuverte, setSimuOuverte] = useState(false)
  const [simuOccupee, setSimuOccupee] = useState(false)
  const [simuErreur, setSimuErreur] = useState<string | null>(null)
  /* ⚠ F11 : plus d'etat de validation. Le bouton « Valider » de la simulation
     a disparu le 06/08/2026 - le plan est un panneau permanent, donc il n'y a
     plus de porte a garder. Le serveur date l'accord au clic sur Lancer. */

  const { fitView, screenToFlowPosition, getZoom } = useReactFlow()
  const notifier = useHubStore((s) => s.notify)

  /** Les positions posees a la main. Vide = on laisse le rangement auto. */
  const dispo = useRef<Record<string, { x: number; y: number }>>({})
  /** Le cadre du canevas : sert a poser la fiche de creation sans la faire
      deborder de l'ecran. */
  const canevas = useRef<HTMLDivElement>(null)
  /** Le pole dont on a deja decide l'affichage des liens prevus. */
  const liensDecides = useRef<string | null>(null)

  /**
   * LE PLAN, A GAUCHE - permanent, donc replie et non ferme, et son etat tient
   * d'une session a l'autre. Voir `PanneauPlan.tsx` : c'est lui qui rend F11
   * defendable, parce qu'un plan sous les yeux n'a plus besoin d'un bouton qui
   * certifie qu'on l'a regarde.
   */
  const [planReplie, basculerPlan] = useRepli('hub.studio.plan')
  /** La ligne survolee dans le plan. C3 : son noeud s'allume dans le graphe. */
  const [survole, setSurvole] = useState<string | null>(null)
  /** Les livrables annonces, lus dans le plan garde a cote du scenario. Vide
      quand il n'y en a pas - un scenario ne du decomposeur n'a jamais eu de
      plan ecrit, et on n'en invente pas. */
  const [resultat, setResultat] = useState<{ fichier: string; quoi: string }[]>([])
  /**
   * CE QUI A ETE RENDU - lu ICI, et une seule fois pour deux surfaces.
   *
   * Le bilan C8 du panneau plan et l'encart « fichiers produits » du canevas
   * racontent la meme chose. Les laisser lire chacun de son cote, c'est
   * exactement la panne du 5 aout : deux sources pour une verite, elles
   * divergent, et celle qu'on regarde n'est pas celle qui a raison. Une seule
   * lecture, dans `charger()`, donc rafraichie par le meme evenement que le
   * reste du scenario.
   */
  const [livrable, setLivrable] = useState<Livrable | null>(null)

  const charger = useCallback(async () => {
    if (!poleId) return
    const [orch, d, ch, cp, lv] = await Promise.all([
      api.orchestration(),
      fetch(`/api/orchestration/disposition?pole=${encodeURIComponent(poleId)}`)
        .then((r) => r.json())
        .catch(() => ({ noeuds: {} })),
      api.chantiers().catch(() => null),
      // Les chiffres du dernier passage. Un pole qui n'a jamais tourne en rend
      // de vides, et les noeuds n'affichent alors rien - c'est voulu : il n'y a
      // rien a dire tant que rien n'a eu lieu.
      api.compteurs(poleId).catch(() => null),
      // Le dossier du pole. `dossier` a null veut dire « il n'a jamais tourne »
      // - et une demande isolee, qui n'est pas un pole du tableau, rend 404 :
      // dans les deux cas il n'y a rien a confronter, et c'est la meme reponse.
      api.livrablePole(poleId).catch(() => null),
    ])
    dispo.current = d.noeuds || {}
    setCompteurs(cp)
    setLivrable(lv)
    setAgents(orch.agents)
    const p = orch.poles.find((x) => x.id === poleId) || seule(orch.isolees, poleId)
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
   * Le RESULTAT ATTENDU, lu une fois a l'ouverture.
   *
   * Il ne bouge pas pendant qu'un scenario tourne : c'est ce qui a ete ANNONCE,
   * et l'annonce est figee au moment de la validation - c'est meme toute sa
   * valeur. Le relire a chaque evenement du flux ne changerait rien et couterait
   * un appel par trame.
   */
  useEffect(() => {
    if (!poleId) return setResultat([])
    let vivant = true
    void api
      .planDuPole(poleId)
      .then((r) => vivant && setResultat(r.plan?.resultat || []))
      .catch(() => vivant && setResultat([]))
    return () => {
      vivant = false
    }
  }, [poleId])

  /**
   * Un geste, puis on relit.
   *
   * Le canevas a deja bouge quand la reponse arrive - React Flow retire le lien
   * a l'ecran avant qu'on sache si le tableau l'accepte. La relecture n'est donc
   * pas un rafraichissement de confort : c'est elle qui remet en place ce qu'un
   * refus vient d'effacer, et elle a lieu que l'appel reussisse ou non.
   *
   * DECLARE ICI, avant l'effet qui batit les noeuds. Ces boutons finissaient
   * tous par `.catch(() => null)` : le serveur refusait, et il ne se passait
   * RIEN - ni action, ni message. Ca se lit « le bouton Lancer ne marche pas »,
   * et c'est la seule lecture possible. Le brancher demandait de le remonter :
   * une constante citee dans un tableau de dependances plus haut que sa propre
   * declaration jette a l'execution, et l'ecran serait reste blanc.
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
          accords: accordsDuNoeud(accords, t, a?.id),
          onRepondre: (demande, agent, option) => {
            setAccords((liste) => sansAccord(liste, agent, demande))
            void agir(() => api.chatAutoriser(agent, demande, option))
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
  }, [pole, agents, rangs, vivant, accords, compteurs, agir])

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

  /**
   * C3, SENS PLAN -> GRAPHE. Survoler une ligne allume son noeud.
   *
   * On ne touche QUE la classe, et seulement du noeud qui change. Refaire
   * passer le survol par les `data` du noeud aurait reconstruit le tableau
   * entier a chaque mouvement de souris - et repose les positions, donc un
   * noeud qu'on venait de deplacer sauterait sous le curseur.
   */
  useEffect(() => {
    setNoeuds((actuels) => {
      let change = false
      const suite = actuels.map((n) => {
        const veut = n.id === survole ? 'noeud-vif' : ''
        if ((n.className || '') === veut) return n
        change = true
        return { ...n, className: veut }
      })
      return change ? suite : actuels
    })
  }, [survole])

  /**
   * C3, SENS PLAN -> GRAPHE, deuxieme moitie : cliquer une ligne amene au noeud.
   *
   * Surligner ne suffit pas quand le noeud est hors du cadre - et un graphe de
   * dix taches deborde toujours. On centre donc, sans changer le zoom : reposer
   * l'echelle a chaque clic donnerait le mal de mer.
   */
  const allerAuNoeud = useCallback(
    (id: string) => {
      setChoisi(id)
      const n = noeuds.find((x) => x.id === id)
      if (n) void fitView({ nodes: [{ id }], duration: 300, maxZoom: getZoom(), minZoom: getZoom() })
    },
    [noeuds, fitView, getZoom],
  )

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

  /**
   * Une demande seule, que personne n'a decoupee.
   *
   * C'est le cas construit par `seule()` : une tache isolee dont l'identifiant
   * EST celui du pole, donc qui n'a rien sous elle. Ni une chaine posee par le
   * chat, ni un graphe d'Hermes - juste une phrase qui attend.
   */
  const seulement =
    !!pole && pole.taches.length === 1 && pole.taches[0].id === pole.id && !chantier?.actif

  /**
   * Le decoupeur d'Hermes, appele sur cette demande.
   *
   * `agir` releit le pole apres coup, que l'appel reussisse ou non : c'est lui
   * qui fait apparaitre les etapes sans recharger la page. Et le refus dit sa
   * raison - « Hermes n'a pas decoupe cette demande, pour lui elle tient en une
   * seule tache » n'est pas une panne, c'est une reponse.
   */
  const decouper = () =>
    agir(async () => {
      const r = await api.decouper(poleId!)
      if (!r.decoupe) throw new ApiError(r.raison, 200)
    }, 'Hermes a decoupe la demande.')

  const tacheChoisie = pole?.taches.find((t) => t.id === choisi)
  const agentChoisi = agents.find((a) => a.id === (tacheChoisie?.agent || 'default'))
  /** Un pole au travail se regarde, il ne se remanie pas - le serveur refuse
      de toute facon, autant ne pas proposer le geste. */
  const modifiable = !!pole && !chantier?.actif

  return (
    <div
      data-zone="studio"
      className={`flex flex-col bg-slate-100 dark:bg-navy-950 ${plein ? 'h-screen' : 'min-h-0 flex-1'}`}
    >
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 dark:border-navy-800 dark:bg-navy-900">
        {/* Le hamburger cesse d'etre un geste de petit ecran pour devenir le
            geste de « pas de barre laterale ». C'est le deuxieme trou du §5 de
            la grammaire, et le plein ecran est justement le cas qu'il visait. */}
        {plein && (
          <button onClick={onMenu} className="btn-ghost px-2 py-1.5" title="Ouvrir le menu">
            <Menu className="h-4 w-4" />
          </button>
        )}
        <button onClick={onQuitter} className="btn-ghost px-2 py-1.5" title="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{pole?.titre || 'Studio'}</p>
          <p className="truncate text-[10px] muted">
            {pole ? `${pole.taches.length} taches` : 'Aucun scenario ouvert'}
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
            title="Ajouter une tache au scenario"
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
        {/* F13 - LE TROU QUE LE PLEIN ECRAN OUVRE, ET SON BOUCHON.
            Le Studio sort du cadre commun : la barre laterale disparait, et
            avec elle le compteur d'autorisations. Une demande qui attend
            doit se voir dans les deux modes, sans quoi ouvrir le Studio
            revient a s'aveugler au moment ou l'on regarde le plus
            attentivement. Meme composant, meme volet, meme ordre d'urgence
            que sur les trois autres ecrans - juste reduit a l'icone et au
            compte, parce que la barre du scenario n'a pas la place du reste.

            ⚠ SEULEMENT EN PLEIN ECRAN, depuis que le Studio vit dans le cadre
            commun : dans le cadre, `App` pose deja sa ligne au-dessus, et la
            grammaire est formelle - **une seule ligne, jamais deux.** */}
        {plein && <LigneAlerte compact />}
        <button onClick={() => void ranger()} className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px]">
          <LayoutGrid className="h-3.5 w-3.5" />
          Ranger
        </button>
        {/*
          UNE DEMANDE QU'HERMES N'A PAS DECOUPEE - et le seul endroit d'ou son
          decoupeur reste atteignable.

          Le chat pose des scenarios EN CHAINE : le plan d'Hermes donne des
          etapes et une prose, sans notion de dependance, et on ne devine pas des
          paralleles depuis un paragraphe. `kanban decompose`, lui, produit un
          vrai graphe - plusieurs branches qui partent ensemble et se rejoignent.
          C'est la seule facon d'obtenir ca, et c'est pour ca qu'on ne l'a pas
          jete avec la boite le 6 aout.

          Il n'apparait que sur une demande SEULE : une tache dont l'identifiant
          est celui du pole, donc qui n'a rien sous elle. Ailleurs il n'aurait
          rien a decouper, et un bouton sans effet est pire qu'un bouton absent.
        */}
        {seulement && (
          <button
            onClick={() => void decouper()}
            disabled={occupe}
            className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px] disabled:opacity-40"
            title="Hermes lit la demande et la casse en etapes, en choisissant les agents. Peut prendre une a trois minutes."
          >
            {occupe ? <Attente actif /> : <Split className="h-3.5 w-3.5" />}
            Laisse Hermes la decouper
          </button>
        )}
        {/* Eprouver avant de lancer, et voir le banc des essais precedents.
            Gratuit : la simulation ne rejoue que ce qui est deja sur le disque. */}
        <button
          onClick={() => void simuler()}
          disabled={simuOccupee}
          className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px] disabled:opacity-40"
          title="Rejouer ce graphe sans appeler aucun modele"
        >
          {simuOccupee ? <Attente actif /> : <FlaskConical className="h-3.5 w-3.5" />}
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
            {occupe ? <Attente actif /> : <BookMarked className="h-3.5 w-3.5" />}
            Mettre en memoire
          </button>
        )}
        {chantier?.actif ? (
          <button
            onClick={() => void agir(() => api.arreterPole(poleId!))}
            disabled={occupe}
            className="btn-ghost gap-1.5 px-2 py-1.5 text-[11px] disabled:opacity-40"
          >
            {occupe ? <Attente actif /> : <Square className="h-3.5 w-3.5" />}
            Arreter
          </button>
        ) : (
          <button
            onClick={() => void agir(() => api.lancerPole(poleId!), 'Le pole est lance.')}
            disabled={occupe}
            className="btn-primary gap-1.5 px-2.5 py-1.5 text-[11px] disabled:opacity-40"
          >
            {occupe ? <Attente actif /> : <Play className="h-3.5 w-3.5" />}
            Lancer
          </button>
        )}

        {/* AGRANDIR / REDUIRE - la troisieme famille de la grammaire, et la
            seule qui manquait au Studio. Meme paire d'icones et meme sens que
            dans la fenetre de simulation : la chose prend toute la place, le
            reste attend, et `Minimize2` la ramene EXACTEMENT ou etait le
            premier. L'icone montre la destination, pas l'etat courant. */}
        <button
          onClick={() => onPlein(!plein)}
          className="btn-ghost px-2 py-1.5"
          title={plein ? 'Reduire - revenir au cadre commun' : 'Agrandir - plein ecran pour editer'}
          aria-label={plein ? 'Reduire' : 'Agrandir'}
        >
          {plein ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </header>

      {/* Le plan a gauche, le graphe au centre. Les deux disent la meme chose
          dans deux sens : le plan se lit de haut en bas, le graphe montre ce qui
          part ensemble. C'est leur COUPLAGE qui en fait un instrument plutot que
          deux affichages cote a cote (C3, contre F10). */}
      <div className="flex min-h-0 flex-1">
        {pole && (
          <PanneauPlan
            taches={pole.taches}
            agents={agents}
            rangs={rangs}
            resultat={resultat}
            rendus={livrable?.fichiers || []}
            aTourne={!!livrable?.dossier}
            demande={pole.id}
            onAgentCree={() => void charger()}
            choisi={choisi}
            onChoisir={allerAuNoeud}
            onSurvoler={setSurvole}
            replie={planReplie}
            onBasculer={basculerPlan}
          />
        )}

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

        {/* Le livrable prend la meme place que les reglages, et jamais en meme
            temps : choisir une tache est une question sur le detail, chercher
            le resultat est une question sur l'ensemble. Il ne parait pas du
            tout tant que le pole n'a jamais tourne - `LivrableScenario` rend null,
            plutot qu'une boite vide qui ferait croire a une perte. */}
        {!tacheChoisie && poleId && (
          <div className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto">
            <LivrableScenario poleId={poleId} livrable={livrable} />
          </div>
        )}

        {/* Les reglages du noeud - convoques, donc ils se ferment. */}
        {tacheChoisie && (
          <PanneauNoeud
            tache={tacheChoisie}
            agent={agentChoisi}
            modifiable={modifiable}
            occupe={occupe}
            laDemande={tacheChoisie.id === pole?.id}
            onFermer={() => setChoisi(null)}
            onDebloquer={debloquerLaTache}
            onRetirer={retirer}
          />
        )}

        {simuOuverte && (
          <FenetreSimulation
            simulation={simu}
            chargement={simuOccupee}
            erreur={simuErreur}
            chantier={chantier}
            accords={accords}
            onAccord={(demande, agent, option) => {
              setAccords((a) => sansAccord(a, agent, demande))
              void agir(() => api.chatAutoriser(agent, demande, option))
            }}
            onLancer={() => void agir(() => api.lancerPole(poleId!), 'Le pole est lance.')}
            onArreter={() => void agir(() => api.arreterPole(poleId!))}
            // Dans le Studio, « Modifier » n'envoie nulle part : on y est deja.
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
          : 'Une tache de plus dans ce scenario'}
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
