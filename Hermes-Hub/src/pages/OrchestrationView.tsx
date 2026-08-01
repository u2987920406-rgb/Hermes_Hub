/**
 * Orchestration - le seul lieu de l'equipe et de ses poles.
 *
 * Deux volets, comme la Configuration : les agents d'un cote, les poles de
 * l'autre. Ce sont deux questions differentes - « qui ai-je ? » et « que
 * font-ils ? » - et les melanger sur un seul ecran obligeait a defiler pour
 * passer de l'une a l'autre.
 *
 * Les poles sont des vignettes plutot qu'une pile de panneaux : a dix poles,
 * une pile devient un couloir qu'on parcourt au lieu d'un tableau qu'on
 * embrasse. L'organigramme s'ouvre par-dessus, dans la meme fenetre que celle
 * qui portera la simulation.
 *
 * Rien n'est invente ici : les agents sont les profils d'Hermes, les poles sont
 * lus dans son tableau kanban.
 */
import {
  AlertTriangle,
  History,
  MessageSquare,
  Network,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Conversation } from '../components/Conversation'
import { FenetreSimulation } from '../components/FenetreSimulation'
import { Modal } from '../components/Modal'
import { Organigramme } from '../components/Organigramme'
import type { LienOrg, NoeudOrg } from '../components/Organigramme'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { ETATS_TACHE } from '../types'
import type {
  Agent,
  Equipe as EquipeType,
  EtatTache,
  FilResume,
  Orchestration,
  Pole,
  Simulation,
} from '../types'

interface Props {
  onMenu: () => void
}

const FINI: EtatTache[] = ['done']
const BLOQUE: EtatTache[] = ['blocked', 'review']
const DORMANT: EtatTache[] = ['triage', 'todo', 'scheduled']

type Volet = 'historique' | 'conversation' | 'agents' | 'poles'

/**
 * L'historique ouvre la liste, la conversation la continue. Il est place
 * au-dessus parce qu'on ouvre une application sur ce qu'on a laisse en cours,
 * pas sur une page blanche.
 */
const VOLETS: { id: Volet; label: string; icon: typeof Users }[] = [
  { id: 'historique', label: 'Historique', icon: History },
  { id: 'conversation', label: 'Conversation', icon: MessageSquare },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'poles', label: 'Poles / Equipes', icon: Network },
]

/** Ce qui est ouvert par-dessus : l'organigramme de l'equipe, ou celui d'un pole. */
type Ouvert =
  | { genre: 'equipe' }
  | { genre: 'equipe-nommee'; id: string }
  | { genre: 'pole'; id: string }

export function OrchestrationView({ onMenu }: Props) {
  const [data, setData] = useState<Orchestration | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [volet, setVolet] = useState<Volet>('conversation')
  /** Remonte de la conversation : les agents dont le processus tourne. */
  const [eveilles, setEveilles] = useState<string[]>([])
  const [ouvert, setOuvert] = useState<Ouvert | null>(null)

  /**
   * La simulation vit a cote du reste, jamais dedans : elle s'ouvre par-dessus
   * et disparait entierement. `ouverte` est distinct de `simu` parce que la
   * fenetre s'affiche AVANT d'avoir son contenu - c'est elle qui porte
   * l'attente de la decomposition, qui dure une trentaine de secondes.
   */
  const [simuOuverte, setSimuOuverte] = useState(false)
  const [simu, setSimu] = useState<Simulation | null>(null)
  const [simuOccupee, setSimuOccupee] = useState(false)
  const [simuErreur, setSimuErreur] = useState<string | null>(null)
  const [validation, setValidation] = useState(false)
  const [demande, setDemande] = useState('')

  /** La conversation a rouvrir : posee par l'historique, consommee par le
      volet Conversation. Null = le direct. */
  const [filAOuvrir, setFilAOuvrir] = useState<string | null>(null)
  const [fils, setFils] = useState<FilResume[]>([])

  const chargerFils = useCallback(async () => {
    setFils(await api.conversations().catch(() => []))
  }, [])

  useEffect(() => {
    if (volet === 'historique') void chargerFils()
  }, [volet, chargerFils])

  const charger = useCallback(async () => {
    try {
      setData(await api.orchestration())
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  /** Simuler un pole qui existe deja : lecture pure, quelques dizaines de ms. */
  const simuler = useCallback(async (pole: string) => {
    setSimuOuverte(true)
    setSimuErreur(null)
    setSimuOccupee(true)
    try {
      setSimu(await api.simulation(pole))
    } catch (e) {
      setSimu(null)
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setSimuOccupee(false)
    }
  }, [])

  /**
   * Le parcours complet : la phrase devient un graphe, le graphe est rejoue.
   * L'appel modele est ici et nulle part ailleurs - ce qui suit est local.
   */
  const preparer = useCallback(async () => {
    const texte = demande.trim()
    if (!texte) return
    setSimuOuverte(true)
    setSimu(null)
    setSimuErreur(null)
    setSimuOccupee(true)
    try {
      const plan = await api.demande(texte)
      setSimu(await api.simulation(plan.pole))
      setDemande('')
      void charger()
    } catch (e) {
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setSimuOccupee(false)
    }
  }, [demande, charger])

  const valider = useCallback(async () => {
    if (!simu) return
    setValidation(true)
    try {
      await api.validerPole(simu.pole.id)
      // On relit plutot que de bricoler l'etat en memoire : la validation est
      // ecrite sur le disque, et c'est cette version-la qui fait foi.
      setSimu(await api.simulation(simu.pole.id))
    } catch (e) {
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setValidation(false)
    }
  }, [simu])

  // Un agent est eveille de deux facons : son processus tourne (la conversation
  // le sait en direct), ou une tache du tableau lui est confiee. Les deux
  // comptent, et la lecture du tableau ne rafraichit qu'a la demande.
  const bruts = data?.agents || []
  const agents = bruts.map((a) => ({ ...a, eveille: a.eveille || eveilles.includes(a.id) }))
  const poles = data?.poles || []
  const equipes = data?.equipes || []
  const prets = agents.filter((a) => a.pretAServir).length
  const actifs = poles.filter((p) => p.enCours).length
  const poleOuvert = ouvert?.genre === 'pole' ? poles.find((p) => p.id === ouvert.id) : null
  const equipeOuverte =
    ouvert?.genre === 'equipe-nommee' ? equipes.find((e) => e.id === ouvert.id) : null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Orchestration"
        icon={<Network className="h-4 w-4 text-indigo-500" />}
        onMenu={onMenu}
        actions={
          <button onClick={() => void charger()} className="btn-ghost px-2.5 py-2" title="Recharger">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden px-2 py-2 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-wide muted">Orchestration</p>
          </div>
          {VOLETS.map(({ id, label, icon: Icone }) => (
            <button
              key={id}
              onClick={() => setVolet(id)}
              aria-current={volet === id ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full ${
                volet === id
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
            >
              <Icone className="h-4 w-4 flex-shrink-0" />
              {label}
              {/* Un fil de conversation n'a pas de quantite : seul ce qui se
                  compte porte un compteur. */}
              <span className="ml-auto hidden text-[10px] tabular-nums opacity-60 lg:inline">
                {id === 'agents'
                  ? agents.length
                  : id === 'poles'
                    ? poles.length
                    : id === 'historique'
                      ? fils.length || ''
                      : ''}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* La conversation gere son propre defilement : elle garde le champ
              de saisie colle en bas pendant que le fil monte. */}
          {volet === 'conversation' && (
            <Conversation
              agents={agents}
              equipes={equipes}
              filAOuvrir={filAOuvrir}
              onFilOuvert={() => setFilAOuvrir(null)}
              onEveilChange={setEveilles}
            />
          )}

          {volet === 'historique' && (
            <Historique
              fils={fils}
              agents={agents}
              equipes={equipes}
              onOuvrir={(id) => {
                setFilAOuvrir(id)
                setVolet('conversation')
              }}
              onJeter={async (id) => {
                await api.supprimerConversation(id).catch(() => null)
                void chargerFils()
              }}
            />
          )}

          {volet !== 'conversation' && volet !== 'historique' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              {erreur && (
                <div className="bandeau sens-danger">
                  <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
                  <span>{erreur}</span>
                </div>
              )}

              {volet === 'agents' && (
                <>
                  <Entete
                    titre={`${agents.length} agent${agents.length > 1 ? 's' : ''}`}
                    detail={`${prets} pret${prets > 1 ? 's' : ''} a servir`}
                    action={
                      agents.length > 0 ? (
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => setOuvert({ genre: 'equipe' })}
                        >
                          Voir l organigramme
                        </button>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <LigneAgent key={a.id} agent={a} />
                    ))}
                  </div>
                </>
              )}

              {volet === 'poles' && (
                <>
                  <BoiteDemande
                    valeur={demande}
                    onChange={setDemande}
                    onPreparer={() => void preparer()}
                    occupee={simuOccupee}
                  />

                  <Entete
                    titre={`${equipes.length} equipe${equipes.length > 1 ? 's' : ''}`}
                    detail="Un groupe d agents qu on appelle d un bloc"
                  />
                  {equipes.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {equipes.map((e) => (
                        <VignetteEquipe
                          key={e.id}
                          equipe={e}
                          agents={e.membres
                            .map((m) => agents.find((a) => a.id === m))
                            .filter((a): a is Agent => !!a)}
                          onOuvrir={() => setOuvert({ genre: 'equipe-nommee', id: e.id })}
                        />
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Entete
                      titre={`${poles.length} pole${poles.length > 1 ? 's' : ''}`}
                      detail={actifs > 0 ? `${actifs} en cours` : 'aucun en cours'}
                    />
                  </div>

                  {data && !data.tableau.disponible && (
                    <TableauIndisponible raison={data.tableau.raison} />
                  )}

                  {poles.length === 0 ? (
                    <AucunPole tableauPret={!!data?.tableau.disponible} />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {poles.map((p) => (
                        <Vignette
                          key={p.id}
                          titre={p.titre}
                          detail={`${p.taches.length} tache${p.taches.length > 1 ? 's' : ''}`}
                          agents={agentsDuPole(p, agents)}
                          avancement={{ faites: p.finies, total: p.taches.length }}
                          etat={
                            p.enCours ? 'encours' : p.finies === p.taches.length ? 'fini' : 'attente'
                          }
                          onOuvrir={() => setOuvert({ genre: 'pole', id: p.id })}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {ouvert?.genre === 'equipe' && (
        <Modal
          title="Ton equipe"
          icon={<Users className="h-4 w-4 text-violet-500" />}
          maxWidth="max-w-4xl"
          onClose={() => setOuvert(null)}
        >
          <Organigramme {...equipeEnGraphe(agents)} />
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] muted dark:border-navy-800">
            La description d un agent n est pas decorative : c est elle que le decomposeur lit
            pour lui confier une tache. Un agent mal decrit ne recoit rien, et le travail
            retombe sur Hermes.
          </p>
        </Modal>
      )}

      {equipeOuverte && (
        <Modal
          title={`Equipe ${equipeOuverte.nom}`}
          icon={<Users className="h-4 w-4 text-violet-500" />}
          maxWidth="max-w-5xl"
          onClose={() => setOuvert(null)}
        >
          <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs muted dark:bg-navy-800">
            Ecris <b>@equipe {equipeOuverte.nom}</b> dans la conversation pour les appeler
            tous en meme temps.
          </p>
          <Organigramme
            {...equipeEnGraphe(
              equipeOuverte.membres
                .map((m) => agents.find((a) => a.id === m))
                .filter((a): a is Agent => !!a),
              true,
            )}
          />
        </Modal>
      )}

      {poleOuvert && (
        <Modal
          title={poleOuvert.titre}
          icon={<Network className="h-4 w-4 text-sky-500" />}
          maxWidth="max-w-5xl"
          onClose={() => setOuvert(null)}
        >
          {poleOuvert.corps && (
            <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed muted dark:bg-navy-800">
              {poleOuvert.corps}
            </p>
          )}
          <Organigramme {...poleEnGraphe(poleOuvert, agents)} />

          {/* La simulation est la seule action offerte ici, et c'est voulu :
              de ce panneau on ne lance rien, on va d'abord voir ce que ca
              ferait. */}
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-navy-800">
            <p className="min-w-0 flex-1 text-[11px] muted">
              La simulation rejoue ce graphe sans appeler aucun modele : qui se reveille, dans
              quel ordre, quels fichiers seraient touches.
            </p>
            <button
              className="btn-primary flex-none text-xs"
              onClick={() => {
                setOuvert(null)
                void simuler(poleOuvert.id)
              }}
            >
              <Play className="mr-1.5 inline h-3.5 w-3.5" />
              Simuler
            </button>
          </div>
        </Modal>
      )}

      {simuOuverte && (
        <FenetreSimulation
          simulation={simu}
          chargement={simuOccupee}
          erreur={simuErreur}
          validation={validation}
          onValider={() => void valider()}
          onModifier={() => {
            // « Modifier » renvoie a la conversation : c'est la qu'on reformule
            // une demande, pas dans un formulaire de plus.
            setSimuOuverte(false)
            setVolet('conversation')
          }}
          onFermer={() => setSimuOuverte(false)}
        />
      )}
    </div>
  )
}

/**
 * L'historique, en pleine page.
 *
 * Il etait d'abord dans un tiroir du chat ; il a sa place ici, au meme rang
 * que la conversation qu'il prolonge. Une conversation ne se retrouve pas en
 * tapant, elle se retrouve en reconnaissant : l'interlocuteur, sa couleur, le
 * jour. Les trois filtres sont donc des boutons, et rien ne demande le clavier.
 */
function Historique({
  fils,
  agents,
  equipes,
  onOuvrir,
  onJeter,
}: {
  fils: FilResume[]
  agents: Agent[]
  equipes: EquipeType[]
  onOuvrir: (id: string) => void
  onJeter: (id: string) => void
}) {
  const [tri, setTri] = useState<'tous' | 'equipe' | 'agent'>('tous')
  const visibles = fils.filter((f) => tri === 'tous' || f.portee === tri)

  const couleurDe = (f: FilResume) => {
    if (f.portee === 'equipe') {
      const e = equipes.find((x) => x.nom.toLowerCase() === f.cible.toLowerCase())
      return e?.couleur || 'ciel'
    }
    return agents.find((a) => a.id === f.cible)?.couleur || 'ardoise'
  }

  const ONGLETS: { id: 'tous' | 'equipe' | 'agent'; libelle: string }[] = [
    { id: 'tous', libelle: 'Tout' },
    { id: 'equipe', libelle: 'Equipes' },
    { id: 'agent', libelle: 'Agents' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {fils.length} conversation{fils.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs muted">
              Rangees par interlocuteur : une equipe, ou un agent pris a part.
            </p>
          </div>
          <div className="flex gap-1">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => setTri(o.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tri === o.id
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                    : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
              >
                {o.libelle}
              </button>
            ))}
          </div>
        </div>

        {visibles.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-sm font-medium">Aucune conversation gardee</p>
            <p className="mx-auto mt-1 max-w-md text-xs muted">
              Des que tu parles a quelqu un, le fil s ecrit tout seul et se retrouve ici -
              reflexion et appels d outils compris.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {visibles.map((f) => (
              <div
                key={f.id}
                style={{ '--agent': `var(--jeton-${couleurDe(f)})` } as CSSProperties}
                className="card group relative overflow-hidden p-0"
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: 'var(--agent)' }}
                />
                <button
                  onClick={() => onOuvrir(f.id)}
                  className="block w-full py-2.5 pl-4 pr-9 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">{f.interlocuteur}</span>
                    <span className="puce sens-neutre">
                      {f.portee === 'equipe' ? 'equipe' : 'agent'}
                    </span>
                    {f.encours && <span className="puce puce-pleine sens-succes">en cours</span>}
                    <span className="ml-auto text-[10px] muted">{quand(f.majLe)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] muted">{f.titre}</span>
                  <span className="mt-1 block text-[10px] muted">
                    {f.messages} message{f.messages > 1 ? 's' : ''}
                    {f.participants.length > 1 ? ` - ${f.participants.length} agents` : ''}
                  </span>
                </button>
                <button
                  onClick={() => onJeter(f.id)}
                  className="absolute right-1.5 top-2.5 rounded p-1.5 opacity-0 transition-opacity hover:bg-rose-100 group-hover:opacity-100 dark:hover:bg-rose-500/20"
                  title="Jeter cette conversation"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Une date lisible sans calcul mental. */
function quand(ms: number) {
  const jour = 86400000
  const d = new Date(ms)
  const aujourdhui = new Date()
  const minuit = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())
  const ecart = minuit.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  if (ecart <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (ecart <= jour) return 'hier'
  if (ecart < 7 * jour) return d.toLocaleDateString('fr-FR', { weekday: 'long' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/**
 * La porte d'entree du mode assiste : une phrase en francais, rien de plus.
 *
 * Elle vit au-dessus des poles parce que c'est de la qu'ils naissent - et
 * qu'une liste vide sans moyen de la remplir est un cul-de-sac.
 */
function BoiteDemande({
  valeur,
  onChange,
  onPreparer,
  occupee,
}: {
  valeur: string
  onChange: (v: string) => void
  onPreparer: () => void
  occupee: boolean
}) {
  return (
    <div className="card space-y-2 p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold">Decris ce que tu veux</p>
      </div>
      <textarea
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder="cherche sur les 5 sites les plus tendance les nouveautes IA du moment, fais-moi un resume sous forme de tableau, plus un PDF"
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[11px] muted">
          Hermes decoupe la demande en taches liees, puis la simulation te la montre. Rien ne
          s execute avant ton accord.
        </p>
        <button
          className="btn-primary flex-none text-xs"
          onClick={onPreparer}
          disabled={occupee || !valeur.trim()}
        >
          Preparer le plan
        </button>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Traductions vers le graphe
// -----------------------------------------------------------------------------
/** Les agents reellement mobilises par un pole, sans doublon et dans l'ordre. */
function agentsDuPole(pole: Pole, agents: Agent[]): Agent[] {
  const parId = new Map(agents.map((a) => [a.id, a]))
  const vus = new Set<string>()
  const sortie: Agent[] = []
  for (const t of pole.taches) {
    const id = t.agent || 'default'
    if (vus.has(id)) continue
    vus.add(id)
    const a = parId.get(id)
    if (a) sortie.push(a)
  }
  return sortie
}

/**
 * L'organigramme d'une equipe : une pyramide, pas une liste.
 *
 * Trois etages au plus - l'orchestrateur, ceux qui decident, ceux qui font.
 * L'etage du milieu n'est pas declare a la main : un agent qui arbitre ou qui
 * tient la coherence de l'ensemble se decrit comme tel, et le serveur le lit
 * dans sa description. Une equipe sans chef reste donc a deux etages, ce qui
 * est la verite de cette equipe-la plutot qu'une hierarchie inventee.
 *
 * Le sous-titre est le metier, jamais la description entiere : on veut
 * reconnaitre qui est qui d'un coup d'oeil, pas lire cinq fiches.
 */
function equipeEnGraphe(
  agents: Agent[],
  /**
   * L'etage du milieu n'a de sens que dans une equipe constituee. Sur
   * l'annuaire entier, le seul agent qui arbitre se retrouverait a diriger
   * douze personnes qui ne travaillent pas avec lui - une hierarchie fausse,
   * et plus lisible du tout.
   */
  hierarchie = false,
): {
  noeuds: NoeudOrg[]
  liens: LienOrg[]
  vide: string
  sens: 'bas'
} {
  const chef = agents.find((a) => a.role === 'orchestrateur')
  const meneurs = hierarchie ? agents.filter((a) => a.role === 'manager') : []
  const executants = agents.filter((a) => a.role !== 'orchestrateur' && !meneurs.includes(a))

  const noeuds: NoeudOrg[] = agents.map((a) => ({
    id: a.id,
    chapeau:
      a.role === 'orchestrateur' ? 'orchestrateur' : a.role === 'manager' ? 'decide' : undefined,
    titre: a.nom,
    sousTitre: a.metier || 'Sans description : le decomposeur ne saura pas quoi lui confier.',
    couleur: a.couleur,
    icone: a.icone,
    endormi: !a.eveille,
    actif: a.eveille,
    muet: !a.pretAServir,
    etiquette: a.taches > 0 ? `${a.taches} tache${a.taches > 1 ? 's' : ''}` : undefined,
  }))

  const liens: LienOrg[] = []
  if (chef) {
    // Quand quelqu'un decide, l'orchestrateur lui parle a lui : c'est le sens
    // de la delegation, et le dessin doit le dire.
    const dessous = meneurs.length ? meneurs : executants
    for (const a of dessous) liens.push({ de: chef.id, vers: a.id })
  }
  for (const m of meneurs) {
    for (const a of executants) liens.push({ de: m.id, vers: a.id })
  }

  return { noeuds, liens, vide: 'Aucun profil Hermes trouve.', sens: 'bas' }
}

function poleEnGraphe(
  pole: Pole,
  agents: Agent[],
): { noeuds: NoeudOrg[]; liens: LienOrg[]; vide: string; numeroter: true } {
  const parId = new Map(agents.map((a) => [a.id, a]))

  const noeuds: NoeudOrg[] = pole.taches.map((t) => {
    const a = parId.get(t.agent || 'default')
    return {
      id: t.id,
      // La tache qui ferme le pole est la demande d'origine, pas une etape :
      // sans ce surtitre elle se lit comme un travail de plus.
      chapeau: t.id === pole.id ? 'la demande' : undefined,
      titre: t.titre,
      sousTitre: a ? `${a.nom}${t.modele ? ` - ${t.modele}` : ''}` : t.agent || 'non assignee',
      couleur: a?.couleur || 'ardoise',
      icone: a?.icone || 'agent',
      fini: FINI.includes(t.etat),
      bloque: BLOQUE.includes(t.etat),
      actif: t.etat === 'running',
      endormi: DORMANT.includes(t.etat),
      etiquette: ETATS_TACHE[t.etat] || t.etat,
    }
  })

  return { noeuds, liens: pole.liens, vide: 'Ce pole n a aucune tache.', numeroter: true }
}

// -----------------------------------------------------------------------------
// Morceaux d interface
// -----------------------------------------------------------------------------
function Entete({
  titre,
  detail,
  action,
}: {
  titre: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{titre}</p>
        <p className="text-xs muted">{detail}</p>
      </div>
      {action}
    </div>
  )
}

/** Une ligne par agent : son nom, ce qu'il sait faire, son cerveau. */
function LigneAgent({ agent }: { agent: Agent }) {
  const style = { '--agent': `var(--jeton-${agent.couleur})` } as CSSProperties

  return (
    // Le fond reste celui de la carte : un aplat teinte par agent transformait
    // la liste en nuancier, et le texte y perdait son contraste. La couleur
    // vit dans le liseré et dans le point - assez pour identifier, jamais
    // assez pour gener la lecture.
    <div
      style={{ ...style, borderColor: 'color-mix(in srgb, var(--agent) 55%, transparent)' }}
      className="card relative flex items-start gap-3 overflow-hidden p-3"
    >
      <span
        className="relative mt-1 h-3 w-3 flex-none rounded-full"
        style={{
          backgroundColor: 'var(--agent)',
          boxShadow: '0 0 0 4px color-mix(in srgb, var(--agent) 20%, transparent)',
        }}
      />

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{agent.nom}</span>
          <span className="text-[10px] uppercase tracking-wide muted">{agent.role}</span>
          {agent.eveille && <span className="puce puce-pleine sens-succes">eveille</span>}
          {!agent.pretAServir && <span className="puce sens-alerte">sans cle</span>}
        </div>

        <p className="mt-0.5 text-xs leading-snug muted">
          {agent.description || (
            <span className="sens-alerte teinte-sens">
              Sans description : le decomposeur ne saura pas quoi lui confier.
            </span>
          )}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] muted">
          {agent.modele && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-navy-800">
              {agent.modele}
            </span>
          )}
          {agent.taches > 0 && (
            <span>
              {agent.taches} tache{agent.taches > 1 ? 's' : ''}
              {agent.finies > 0 ? ` - ${agent.finies} terminee${agent.finies > 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * La vignette doit se suffire : on ne doit l'ouvrir que pour voir *comment* le
 * travail s'enchaine, jamais pour savoir qui s'en occupe ni ou ca en est.
 */
function Vignette({
  titre,
  detail,
  agents,
  avancement,
  etat,
  onOuvrir,
}: {
  titre: string
  detail: string
  agents: Agent[]
  avancement?: { faites: number; total: number }
  etat?: 'encours' | 'fini' | 'attente'
  onOuvrir: () => void
}) {
  const style = { '--agent': `var(--jeton-ciel)` } as CSSProperties
  const part = avancement && avancement.total > 0 ? avancement.faites / avancement.total : 0

  return (
    <button
      type="button"
      onClick={onOuvrir}
      style={{ ...style, borderColor: 'color-mix(in srgb, var(--agent) 45%, transparent)' }}
      className="card group relative overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
    >
      <span className="relative flex flex-col gap-2.5 p-3.5">
        <span className="flex items-start gap-2.5">
          <span
            className="grid h-8 w-8 flex-none place-items-center rounded-lg"
            style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
          >
            <Network className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{titre}</span>
            <span className="mt-0.5 block truncate text-[11px] muted">{detail}</span>
          </span>
          {etat && <Pastille etat={etat} />}
        </span>

        <Trombinoscope agents={agents} />

        {avancement && avancement.total > 0 && (
          <span className="block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
            <span
              className="block h-full rounded-full transition-[width]"
              style={{ width: `${Math.round(part * 100)}%`, backgroundColor: 'var(--succes)' }}
            />
          </span>
        )}
      </span>
    </button>
  )
}

/** Une equipe nommee : son nom, ses membres, et la mention pour l'appeler. */
function VignetteEquipe({
  equipe,
  agents,
  onOuvrir,
}: {
  equipe: EquipeType
  agents: Agent[]
  onOuvrir: () => void
}) {
  const style = { '--agent': `var(--jeton-${equipe.couleur})` } as CSSProperties

  return (
    <button
      type="button"
      onClick={onOuvrir}
      style={{ ...style, borderColor: 'color-mix(in srgb, var(--agent) 45%, transparent)' }}
      className="card group relative overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
    >
      <span className="relative flex flex-col gap-2.5 p-3.5">
        <span className="flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 flex-none place-items-center rounded-lg"
            style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
          >
            <Users className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{equipe.nom}</span>
            <span className="block truncate text-[11px] muted">
              {agents.length} membre{agents.length > 1 ? 's' : ''}
            </span>
          </span>
          <span className="puce sens-info">@equipe {equipe.nom}</span>
        </span>
        <Trombinoscope agents={agents} />
      </span>
    </button>
  )
}

/** Les visages de l'equipe : on voit qui travaille sans ouvrir quoi que ce soit. */
function Trombinoscope({ agents }: { agents: Agent[] }) {
  const montres = agents.slice(0, 6)
  const reste = agents.length - montres.length

  return (
    <span className="flex flex-wrap items-center gap-1">
      {montres.map((a) => (
        <span
          key={a.id}
          title={`${a.nom}${a.pretAServir ? '' : ' - sans cle'}`}
          className={`h-5 w-5 rounded-md ${a.pretAServir ? '' : 'opacity-40 saturate-0'}`}
          style={{ backgroundColor: `var(--jeton-${a.couleur})` }}
        />
      ))}
      {reste > 0 && <span className="text-[10px] font-medium muted">+{reste}</span>}
    </span>
  )
}

function Pastille({ etat }: { etat: 'encours' | 'fini' | 'attente' }) {
  // Un travail en cours est le seul a meriter un aplat : c'est ce qui se passe
  // maintenant. Le reste se contente d'une teinte.
  if (etat === 'encours') return <span className="puce puce-pleine sens-succes">en cours</span>
  if (etat === 'fini') return <span className="puce sens-succes">termine</span>
  return <span className="puce sens-neutre">en attente</span>
}

function AucunPole({ tableauPret }: { tableauPret: boolean }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-sm font-medium">Aucun pole pour l instant</p>
      <p className="mx-auto mt-1 max-w-md text-xs muted">
        {tableauPret
          ? "Un pole nait d une demande : Hermes la decompose en taches liees, et le groupe qui en resulte apparait ici. Ton equipe, elle, est deja la."
          : 'Le tableau des taches ne peut pas etre lu, donc aucun pole ne peut apparaitre. Ton equipe reste consultable.'}
      </p>
    </div>
  )
}

function TableauIndisponible({ raison }: { raison?: string }) {
  const texte =
    raison === 'init'
      ? "Le tableau kanban n a jamais ete initialise. Lance `hermes kanban init` pour qu Hermes puisse y ranger ses taches."
      : raison === 'node'
        ? 'Ce poste utilise une version de Node anterieure a la 22.5 : le Hub ne sait pas lire le tableau.'
        : 'Le tableau kanban existe mais n a pas pu etre lu.'

  return (
    <div className="bandeau sens-alerte">
      <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
      <span>{texte} L equipe reste consultable.</span>
    </div>
  )
}
