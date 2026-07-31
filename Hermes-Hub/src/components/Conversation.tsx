/**
 * La conversation a mentions.
 *
 * `@redacteur resume ce fichier` ne reveille que lui. Sans mention, c'est
 * Hermes qui repond : il est l'interlocuteur par defaut, et c'est lui qui sait
 * deleguer.
 *
 * Le fil se lit comme le travail s'est deroule - texte, outils, reflexion,
 * dans l'ordre d'arrivee - plutot que de reconstituer apres coup une reponse
 * finale sans ses etapes. Chaque tour porte la couleur de son agent, faute de
 * quoi une piece a plusieurs devient un monologue confus.
 *
 * Le choix de l'ecran a coute a la conversation la vue sur l'equipe : la
 * rangee de pastilles au-dessus du champ la rend, avec l'etat de chacun et sa
 * mention a portee de clic.
 */
import { AlertTriangle, CornerDownRight, Loader2, Moon, Send, Square, Wrench } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../lib/api'
import { GENRES_OUTIL } from '../types'
import type {
  Agent,
  BlocTour,
  DemandeAutorisation,
  EvenementChat,
  Tour,
  TourAgent,
  TourDelegation,
} from '../types'

interface Props {
  agents: Agent[]
  /** Remonte l'etat d'eveil pour que les autres volets le voient. */
  onEveilChange?: (eveilles: string[]) => void
}

export function Conversation({ agents, onEveilChange }: Props) {
  const [tours, setTours] = useState<Tour[]>([])
  const [saisie, setSaisie] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [eveilles, setEveilles] = useState<Set<string>>(() => new Set())
  const [autorisations, setAutorisations] = useState<(DemandeAutorisation & { agent: string })[]>([])

  const bas = useRef<HTMLDivElement>(null)
  const champ = useRef<HTMLTextAreaElement>(null)
  const parId = new Map(agents.map((a) => [a.id, a]))
  const enCours = tours.some((t) => t.role === 'agent' && !t.fini)

  useEffect(() => {
    onEveilChange?.([...eveilles])
  }, [eveilles, onEveilChange])

  // Le fil suit le travail : on reste colle en bas tant qu'on ne remonte pas.
  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [tours, autorisations])

  // --- le flux ---------------------------------------------------------------
  useEffect(() => {
    const source = new EventSource('/api/chat/stream')

    source.onmessage = (msg) => {
      let e: EvenementChat
      try {
        e = JSON.parse(msg.data)
      } catch {
        return
      }
      appliquer(e)
    }
    source.onerror = () => setErreur('Le flux du serveur est interrompu. Recharge la page.')

    return () => source.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const appliquer = useCallback((e: EvenementChat) => {
    const agent = e.agent || 'default'

    switch (e.type) {
      case 'reprise':
        setEveilles(new Set(e.agents.map((a) => a.agent)))
        setAutorisations(
          e.agents.flatMap((a) => a.autorisations.map((d) => ({ ...d, agent: a.agent }))),
        )
        return

      case 'moi':
        setTours((t) => [...t, { role: 'moi', texte: e.texte, destinataires: e.destinataires }])
        return

      case 'reveil':
        setEveilles((s) => new Set(s).add(agent))
        return

      case 'sommeil':
        setEveilles((s) => {
          const n = new Set(s)
          n.delete(agent)
          return n
        })
        return

      case 'delegation':
        setTours((t) => [
          ...t,
          { role: 'delegation', de: agent, nom: e.nom, vers: e.vers, texte: e.texte },
        ])
        return

      case 'tour-debut':
        setTours((t) => [...t, { role: 'agent', agent, blocs: [], fini: false }])
        return

      case 'texte':
        return setTours((t) => ajouterBloc(t, agent, { type: 'texte', texte: e.texte }))

      case 'reflexion':
        return setTours((t) => ajouterBloc(t, agent, { type: 'reflexion', texte: e.texte }))

      case 'outil':
        return setTours((t) =>
          ajouterBloc(t, agent, {
            type: 'outil',
            id: e.id,
            titre: e.titre,
            genre: e.genre,
            etat: e.etat,
            detail: e.detail,
          }),
        )

      case 'outil-maj':
        return setTours((t) =>
          t.map((tour) =>
            tour.role === 'agent'
              ? {
                  ...tour,
                  blocs: tour.blocs.map((b) =>
                    b.type === 'outil' && b.id === e.id
                      ? { ...b, etat: e.etat ?? b.etat, titre: e.titre ?? b.titre, detail: e.detail ?? b.detail }
                      : b,
                  ),
                }
              : tour,
          ),
        )

      case 'bascule':
        return setTours((t) =>
          ajouterBloc(t, agent, { type: 'bascule', de: e.de, vers: e.vers, raison: e.raison }),
        )

      case 'autorisation':
        setAutorisations((a) => [
          ...a,
          { demande: e.demande, titre: e.titre, detail: e.detail, options: e.options, agent },
        ])
        return

      case 'tour-fin':
        setAutorisations((a) => a.filter((d) => d.agent !== agent))
        return setTours((t) =>
          t.map((tour) =>
            tour.role === 'agent' && tour.agent === agent && !tour.fini
              ? { ...tour, fini: true, raison: e.raison }
              : tour,
          ),
        )

      case 'panne':
        setErreur(e.message)
        return setTours((t) =>
          t.map((tour) => (tour.role === 'agent' && !tour.fini ? { ...tour, fini: true } : tour)),
        )

      default:
        return
    }
  }, [])

  // --- actions ---------------------------------------------------------------
  const envoyer = async () => {
    const texte = saisie.trim()
    if (!texte || envoi) return
    setEnvoi(true)
    setErreur(null)
    try {
      await api.chatEnvoyer(texte)
      setSaisie('')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnvoi(false)
      champ.current?.focus()
    }
  }

  const mentionner = (a: Agent) => {
    const nom = a.id === 'default' ? 'hermes' : a.id
    setSaisie((s) => (s.includes('@' + nom) ? s : `@${nom} ${s}`.trimStart()))
    champ.current?.focus()
  }

  const repondre = async (d: DemandeAutorisation & { agent: string }, option: string) => {
    setAutorisations((a) => a.filter((x) => x.demande !== d.demande))
    await api.chatAutoriser(d.agent, d.demande, option).catch(() => null)
  }

  // --- rendu -----------------------------------------------------------------
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {tours.length === 0 && <Accueil agents={agents} onMentionner={mentionner} />}

          {tours.map((tour, i) =>
            tour.role === 'moi' ? (
              <BulleMoi key={i} tour={tour} agents={parId} />
            ) : tour.role === 'delegation' ? (
              <TraceDelegation key={i} tour={tour} agents={parId} />
            ) : (
              <BulleAgent key={i} tour={tour} agent={parId.get(tour.agent)} />
            ),
          )}

          {autorisations.map((d) => (
            <Autorisation
              key={d.demande}
              demande={d}
              agent={parId.get(d.agent)}
              onRepondre={repondre}
            />
          ))}

          {erreur && (
            <div className="bandeau sens-danger">
              <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
              <span>{erreur}</span>
            </div>
          )}

          <div ref={bas} />
        </div>
      </div>

      {/* La barre de saisie : l'equipe, puis le champ. */}
      <div className="flex-none border-t border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {agents.map((a) => (
              <PastilleAgent
                key={a.id}
                agent={a}
                eveille={eveilles.has(a.id)}
                onClick={() => mentionner(a)}
              />
            ))}
            {eveilles.size > 0 && (
              <button
                onClick={() => void api.chatEndormir().catch(() => null)}
                className="ml-auto flex items-center gap-1 text-[10.5px] muted hover:underline"
                title="Referme les processus des agents eveilles"
              >
                <Moon className="h-3 w-3" />
                tout endormir
              </button>
            )}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={champ}
              rows={1}
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void envoyer()
                }
              }}
              placeholder="Ecris a ton equipe. @nom pour appeler quelqu un."
              className="input max-h-40 min-h-[42px] flex-1 resize-y py-2.5"
            />
            {enCours ? (
              <button
                onClick={() => void api.chatInterrompre().catch(() => null)}
                className="btn-ghost h-[42px] w-[42px] flex-none px-0"
                title="Interrompre"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => void envoyer()}
                disabled={!saisie.trim() || envoi}
                className="btn-primary h-[42px] w-[42px] flex-none px-0"
                title="Envoyer"
              >
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Le fil
// -----------------------------------------------------------------------------
/** Ajoute un bloc au tour ouvert de cet agent, ou en cree un s'il n'y en a pas. */
function ajouterBloc(tours: Tour[], agent: string, bloc: BlocTour): Tour[] {
  for (let i = tours.length - 1; i >= 0; i--) {
    const t = tours[i]
    if (t.role !== 'agent' || t.agent !== agent || t.fini) continue

    // Le texte arrive par morceaux : on les recolle plutot que d'empiler des
    // blocs d'un mot, sinon la mise en forme se brise a chaque fragment.
    const dernier = t.blocs[t.blocs.length - 1]
    const blocs =
      bloc.type === 'texte' && dernier?.type === 'texte'
        ? [...t.blocs.slice(0, -1), { ...dernier, texte: dernier.texte + bloc.texte }]
        : bloc.type === 'reflexion' && dernier?.type === 'reflexion'
          ? [...t.blocs.slice(0, -1), { ...dernier, texte: dernier.texte + bloc.texte }]
          : [...t.blocs, bloc]

    const copie = [...tours]
    copie[i] = { ...t, blocs }
    return copie
  }
  return [...tours, { role: 'agent', agent, blocs: [bloc], fini: false }]
}

function jetonDe(agent?: Agent): CSSProperties {
  return { '--agent': `var(--jeton-${agent?.couleur || 'ardoise'})` } as CSSProperties
}

function BulleMoi({ tour, agents }: { tour: { texte: string; destinataires: string[] }; agents: Map<string, Agent> }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-sky-600 px-3.5 py-2 text-sm text-white">
        {tour.texte}
      </div>
      <div className="flex items-center gap-1 pr-1 text-[10px] muted">
        <span>a</span>
        {tour.destinataires.map((id) => (
          <span key={id} className="font-medium">
            {agents.get(id)?.nom || id}
          </span>
        ))}
      </div>
    </div>
  )
}

function TraceDelegation({
  tour,
  agents,
}: {
  tour: TourDelegation
  agents: Map<string, Agent>
}) {
  return (
    <div className="flex items-start gap-2 pl-8 text-[11px] muted">
      <CornerDownRight className="mt-0.5 h-3.5 w-3.5 flex-none" />
      <p>
        <b>{tour.nom}</b> confie le travail a{' '}
        {tour.vers.map((id, i) => (
          <span key={id}>
            {i > 0 && ', '}
            <b>{agents.get(id)?.nom || id}</b>
          </span>
        ))}
        {tour.texte && <span className="italic"> — « {tour.texte.slice(0, 140)} »</span>}
      </p>
    </div>
  )
}

function BulleAgent({ tour, agent }: { tour: TourAgent; agent?: Agent }) {
  return (
    <div style={jetonDe(agent)} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className="grid h-6 w-6 flex-none place-items-center rounded-lg text-[11px] font-bold"
          style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
        >
          {(agent?.nom || '?').charAt(0)}
        </span>
        <span className="text-xs font-semibold">{agent?.nom || tour.agent}</span>
        {!tour.fini && <Loader2 className="h-3 w-3 animate-spin muted" />}
      </div>

      <div className="space-y-1.5 pl-8">
        {tour.blocs.map((b, i) => (
          <Bloc key={i} bloc={b} />
        ))}
        {tour.fini && tour.blocs.length === 0 && (
          <p className="text-xs italic muted">Aucune reponse.</p>
        )}
      </div>
    </div>
  )
}

function Bloc({ bloc }: { bloc: BlocTour }) {
  if (bloc.type === 'texte') {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed">{bloc.texte}</p>
  }

  if (bloc.type === 'reflexion') {
    return (
      <details className="text-xs">
        <summary className="cursor-pointer muted">Reflexion</summary>
        <p className="mt-1 whitespace-pre-wrap border-l-2 border-slate-200 pl-2 italic muted dark:border-navy-700">
          {bloc.texte}
        </p>
      </details>
    )
  }

  if (bloc.type === 'outil') {
    const fini = bloc.etat === 'completed'
    const rate = bloc.etat === 'failed'
    return (
      <div
        className={`flex items-start gap-1.5 text-[11px] ${rate ? 'sens-danger teinte-sens' : 'muted'}`}
      >
        <Wrench className="mt-0.5 h-3 w-3 flex-none" />
        <span>
          <span className="font-medium">{GENRES_OUTIL[bloc.genre] || bloc.genre}</span>
          {' · '}
          {bloc.titre}
          {!fini && !rate && ' …'}
        </span>
      </div>
    )
  }

  // Bascule de modele : trace laissee dans le fil pour qu'une reponse d'un
  // autre cerveau ne surgisse pas sans explication.
  return (
    <div className="bandeau sens-alerte text-[11px]">
      <span>
        Le fournisseur a coupe ({bloc.raison}). Reprise sur <b>{bloc.vers}</b>.
      </span>
    </div>
  )
}

function Autorisation({
  demande,
  agent,
  onRepondre,
}: {
  demande: DemandeAutorisation & { agent: string }
  agent?: Agent
  onRepondre: (d: DemandeAutorisation & { agent: string }, option: string) => void
}) {
  return (
    <div style={jetonDe(agent)} className="card space-y-2 border-l-4 p-3" >
      <p className="text-xs font-semibold">
        {agent?.nom || demande.agent} demande une autorisation
      </p>
      <p className="text-sm">{demande.titre}</p>
      {demande.detail && <p className="text-[11px] muted">{demande.detail}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {demande.options.map((o) => (
          <button
            key={o.id}
            onClick={() => onRepondre(demande, o.id)}
            className={o.genre === 'reject_once' || o.genre === 'reject_always' ? 'btn-ghost px-3 py-1.5 text-xs' : 'btn-primary px-3 py-1.5 text-xs'}
          >
            {o.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}

function PastilleAgent({
  agent,
  eveille,
  onClick,
}: {
  agent: Agent
  eveille: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={jetonDe(agent)}
      title={
        agent.pretAServir
          ? `Ecrire a ${agent.nom}${eveille ? ' (eveille)' : ''}`
          : `${agent.nom} n a aucune credential : il ne repondra pas`
      }
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors ${
        agent.pretAServir
          ? 'border-slate-200 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800'
          : 'border-slate-200 opacity-50 dark:border-navy-700'
      }`}
    >
      <span
        className="h-4 w-4 flex-none rounded text-[9px] font-bold leading-4"
        style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
      >
        {agent.nom.charAt(0)}
      </span>
      {agent.nom}
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full ${eveille ? '' : 'opacity-30'}`}
        style={{ backgroundColor: eveille ? 'var(--succes)' : 'var(--neutre)' }}
      />
    </button>
  )
}

function Accueil({ agents, onMentionner }: { agents: Agent[]; onMentionner: (a: Agent) => void }) {
  const exemple = agents.find((a) => a.role !== 'orchestrateur' && a.pretAServir)

  return (
    <div className="card mx-auto max-w-lg p-5 text-center">
      <p className="text-sm font-semibold">Parle a ton equipe</p>
      <p className="mx-auto mt-1 max-w-sm text-xs muted">
        Sans mention, c est Hermes qui repond : il decoupe la demande et delegue.
        Avec <b>@nom</b>, seul celui-la se reveille - son processus demarre, puis
        se referme apres la conversation.
      </p>
      {exemple && (
        <button
          onClick={() => onMentionner(exemple)}
          className="btn-ghost mt-3 px-3 py-1.5 text-xs"
        >
          Essayer @{exemple.id}
        </button>
      )}
    </div>
  )
}
