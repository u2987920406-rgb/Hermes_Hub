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
 *   - un double-clic ouvre les reglages du noeud.
 */
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import type { Edge, Node, NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Eye, EyeOff, LayoutGrid, Play, Square } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NoeudStudio } from '../components/NoeudStudio'
import type { DonneesNoeud } from '../components/NoeudStudio'
import type { EtatNoeud } from '../components/Organigramme'
import { api, ecouterChat } from '../lib/api'
import { ETATS_TACHE } from '../types'
import type { Agent, Chantier, DemandeAutorisation, EtatTache, Pole } from '../types'

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
  const [voirPrevus, setVoirPrevus] = useState(false)
  const [choisi, setChoisi] = useState<string | null>(null)
  const { fitView } = useReactFlow()

  /** Les positions posees a la main. Vide = on laisse le rangement auto. */
  const dispo = useRef<Record<string, { x: number; y: number }>>({})

  const charger = useCallback(async () => {
    if (!poleId) return
    const [orch, d, ch] = await Promise.all([
      api.orchestration(),
      fetch(`/api/orchestration/disposition?pole=${encodeURIComponent(poleId)}`)
        .then((r) => r.json())
        .catch(() => ({ noeuds: {} })),
      api.chantiers().catch(() => null),
    ])
    dispo.current = d.noeuds || {}
    setAgents(orch.agents)
    setPole(orch.poles.find((p) => p.id === poleId) || null)
    const c = ch?.chantiers?.find((x) => x.pole === poleId) || null
    setChantier(c)
    setAccords(c?.accords || [])
  }, [poleId])

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
        if (e.type === 'autorisation' || e.type === 'tache-etat' || e.type === 'chantier-fin') {
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
          accords: accords.filter((x) => x.agent === (a?.id || t.agent)),
          onRepondre: (demande, agent, option) => {
            setAccords((liste) => liste.filter((x) => x.demande !== demande))
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
  }, [pole, agents, rangs, vivant, accords])

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
  const liaisons: Edge[] = useMemo(() => {
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

  const surChangement = useCallback((changements: NodeChange[]) => {
    setNoeuds((n) => applyNodeChanges(changements, n))
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

  const tacheChoisie = pole?.taches.find((t) => t.id === choisi)
  const agentChoisi = agents.find((a) => a.id === (tacheChoisie?.agent || 'default'))

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-navy-950">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 dark:border-navy-800 dark:bg-navy-900">
        <button onClick={onQuitter} className="btn-ghost px-2 py-1.5" title="Retour">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{pole?.titre || 'Studio'}</p>
          <p className="text-[10px] muted">
            {pole ? `${pole.taches.length} taches` : 'Aucun pole ouvert'}
            {chantier?.actif ? ' - en cours' : ''}
          </p>
        </div>

        <button
          onClick={() => setVoirPrevus((v) => !v)}
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

      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={noeuds}
          edges={liaisons}
          nodeTypes={types}
          onNodesChange={surChangement}
          onNodeDragStop={surFinDeplacement}
          onNodeDoubleClick={(_, n) => setChoisi(n.id)}
          onPaneClick={() => setChoisi(null)}
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

          </aside>
        )}
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
