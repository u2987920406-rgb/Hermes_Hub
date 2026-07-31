/**
 * La conversation avec Hermes.
 *
 * Le travail est montre pendant qu'il se fait : un tour s'affiche comme il
 * arrive - du texte, un outil, encore du texte - au lieu d'un pave final qui ne
 * dit pas ce qui s'est passe.
 *
 * Et quand Hermes decoupe une demande en taches, l'equipe qu'il propose
 * apparait dans le fil, a l'endroit ou il l'a decidee. Un plan qu'il faut aller
 * chercher dans un autre ecran n'est pas un plan qu'on valide.
 */
import {
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  Globe,
  ListChecks,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldQuestion,
  Square,
  Terminal,
  Trash2,
  Users,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { api, ApiError, ecouterChat } from '../lib/api'
import { ETATS_TACHE, GENRES_OUTIL } from '../types'
import type {
  Agent,
  BlocTour,
  DemandeAutorisation,
  EtapePlan,
  EtatOutil,
  EvenementChat,
  Plan,
  SessionChat,
  Tache,
  Tour,
  TourHermes,
} from '../types'
import { Pastille, teinte, TEINTE_ETAT } from './Equipe'

interface Props {
  agents: Map<string, Agent>
  plan: Plan | null
}

const ICONES: Record<string, typeof Wrench> = {
  read: FileText,
  edit: Pencil,
  delete: Trash2,
  move: FileText,
  search: Search,
  execute: Terminal,
  think: Brain,
  fetch: Globe,
  other: Wrench,
}

// -----------------------------------------------------------------------------
// Assemblage des tours
// -----------------------------------------------------------------------------

/** Le dernier tour d'Hermes, cree au besoin : un flux peut commencer alors que
    la page vient d'etre ouverte, sans qu'on ait vu le debut du tour. */
function majDernier(tours: Tour[], fn: (t: TourHermes) => TourHermes): Tour[] {
  const dernier = tours[tours.length - 1]
  if (!dernier || dernier.role !== 'hermes' || dernier.fini) {
    return [...tours, fn({ role: 'hermes', blocs: [], fini: false })]
  }
  return [...tours.slice(0, -1), fn(dernier)]
}

/** Retire le dernier bloc s'il s'agit de texte : c'est le message d'echec du
    fournisseur, qui n'a plus lieu d'etre une fois la bascule faite. Un tour qui
    finissait sur un outil est laisse intact. */
function sansDernierTexte(blocs: BlocTour[]): BlocTour[] {
  const dernier = blocs[blocs.length - 1]
  return dernier && dernier.type === 'texte' ? blocs.slice(0, -1) : blocs
}

/** Les morceaux de texte consecutifs fusionnent : sinon un tour de cent
    fragments produirait cent paragraphes. */
function ajouterTexte(tour: TourHermes, type: 'texte' | 'reflexion', texte: string): TourHermes {
  if (!texte) return tour
  const dernier = tour.blocs[tour.blocs.length - 1]
  if (dernier && dernier.type === type) {
    const fusion: BlocTour = { type, texte: dernier.texte + texte }
    return { ...tour, blocs: [...tour.blocs.slice(0, -1), fusion] }
  }
  return { ...tour, blocs: [...tour.blocs, { type, texte }] }
}

export function Conversation({ agents, plan }: Props) {
  const [session, setSession] = useState<SessionChat | null>(null)
  const [demarrage, setDemarrage] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [tours, setTours] = useState<Tour[]>([])
  const [enCours, setEnCours] = useState(false)
  const [etapes, setEtapes] = useState<EtapePlan[]>([])
  const [autorisation, setAutorisation] = useState<DemandeAutorisation | null>(null)
  const [usage, setUsage] = useState<{ utilise: number; total: number } | null>(null)
  const [saisie, setSaisie] = useState('')
  const [bascule, setBascule] = useState(true)

  const zone = useRef<HTMLDivElement>(null)
  const colle = useRef(true)
  const tachesConnues = useRef<Set<string> | null>(null)

  // ---------------------------------------------------------------------------
  // Flux
  // ---------------------------------------------------------------------------
  const appliquer = useCallback((e: EvenementChat) => {
    switch (e.type) {
      case 'reprise':
        // Onglet rouvert, page rechargee, serveur redemarre : on reprend le tour
        // la ou il en est plutot que d'ignorer une autorisation qu'Hermes attend
        // pour continuer.
        setEnCours(e.enCours)
        if (e.autorisations.length > 0) setAutorisation(e.autorisations[0])
        return

      case 'tour-debut':
        setEnCours(true)
        setEtapes([])
        setTours((t) => [...t, { role: 'hermes', blocs: [], fini: false }])
        return

      case 'texte':
      case 'reflexion':
        setTours((t) => majDernier(t, (tour) => ajouterTexte(tour, e.type, e.texte)))
        return

      case 'outil':
        setTours((t) =>
          majDernier(t, (tour) => ({
            ...tour,
            blocs: [
              ...tour.blocs,
              { type: 'outil', id: e.id, titre: e.titre, genre: e.genre, etat: e.etat, detail: e.detail },
            ],
          })),
        )
        return

      case 'outil-maj':
        setTours((t) =>
          majDernier(t, (tour) => ({
            ...tour,
            blocs: tour.blocs.map((b) =>
              b.type === 'outil' && b.id === e.id
                ? {
                    ...b,
                    etat: e.etat ?? b.etat,
                    titre: e.titre || b.titre,
                    // Un detail vide est une mise a jour de statut, pas un
                    // effacement : on garde ce qu'on avait deja.
                    detail: e.detail || b.detail,
                  }
                : b,
            ),
          })),
        )
        return

      case 'plan':
        setEtapes(e.etapes)
        return
      case 'usage':
        setUsage({ utilise: e.utilise, total: e.total })
        return
      case 'autorisation':
        setAutorisation({ demande: e.demande, titre: e.titre, detail: e.detail, options: e.options })
        return
      case 'modele':
        setSession((s) => (s ? { ...s, modeleActuel: e.modele } : s))
        return
      case 'mode':
        setSession((s) => (s ? { ...s, modeActuel: e.mode } : s))
        return

      case 'bascule':
        // Le message d'echec a deja ete streame : on le retire du fil et on le
        // remplace par la trace de la bascule. Garder les deux ferait lire deux
        // fois la meme panne.
        setSession((s) => (s ? { ...s, modeleActuel: e.vers } : s))
        setTours((t) =>
          majDernier(t, (tour) => ({
            ...tour,
            blocs: [
              ...sansDernierTexte(tour.blocs),
              { type: 'bascule', de: e.de, vers: e.vers, raison: e.raison },
            ],
          })),
        )
        return

      case 'bascule-inactive':
        setErreur(
          `Le modele a coupe (${e.raison}). La bascule automatique est fermee : ouvre-la pour qu-Hermes change de cerveau tout seul.`,
        )
        return

      case 'bascule-epuisee':
        setErreur(
          `Le modele a coupe (${e.raison}) et les ${e.essayes.length} modeles essayes ont coupe aussi. Il faut des credits, ou un autre fournisseur.`,
        )
        return

      case 'bascule-echec':
        setErreur(`Bascule vers ${nomCourt(e.vers)} impossible : ${e.message}`)
        return

      case 'bascule-reglage':
        setBascule(e.actif)
        return

      case 'tour-fin':
        setEnCours(false)
        setAutorisation(null)
        setTours((t) => majDernier(t, (tour) => ({ ...tour, fini: true, raison: e.raison })))
        if (e.raison === 'erreur' && e.message) setErreur(e.message)
        return

      case 'panne':
        setEnCours(false)
        setAutorisation(null)
        setErreur(e.message)
        setTours((t) => majDernier(t, (tour) => ({ ...tour, fini: true })))
        return
    }
  }, [])

  useEffect(() => {
    // Le flux d'abord, la session ensuite : Hermes met une dizaine de secondes a
    // demarrer et emet deja pendant ce temps.
    const fermer = ecouterChat(appliquer)
    // Reglage lu a part : il vit sur le disque du Hub, pas dans la session ACP,
    // et doit s'afficher juste meme si Hermes met dix secondes a demarrer.
    api
      .chatBascule()
      .then((b) => setBascule(b.actif))
      .catch(() => {})
    api
      .chatSession()
      .then((s) => {
        setSession(s)
        setErreur(null)
      })
      .catch((err) => setErreur(err instanceof ApiError ? err.message : String(err)))
      .finally(() => setDemarrage(false))
    return fermer
  }, [appliquer])

  // ---------------------------------------------------------------------------
  // Propositions d'equipe
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!plan?.disponible) return

    const ids = new Set(plan.taches.map((t) => t.id))

    // Premier passage : on prend le plan existant pour reference sans rien
    // annoncer. Sinon l'ouverture de l'ecran presenterait comme une nouveaute
    // un plan vieux de trois jours.
    if (tachesConnues.current === null) {
      tachesConnues.current = ids
      return
    }

    const nouvelles = plan.taches.filter((t) => !tachesConnues.current!.has(t.id))
    tachesConnues.current = ids
    if (!nouvelles.length) return

    colle.current = true
    setTours((t) => [...t, { role: 'proposition', taches: nouvelles }])
  }, [plan])

  // ---------------------------------------------------------------------------
  // Defilement
  // ---------------------------------------------------------------------------
  // On ne suit le bas que si l'utilisateur y est deja : remonter pour relire une
  // reponse ne doit pas etre annule par le morceau suivant.
  useLayoutEffect(() => {
    if (colle.current && zone.current) zone.current.scrollTop = zone.current.scrollHeight
  }, [tours, etapes, autorisation])

  const auDefilement = () => {
    const el = zone.current
    if (!el) return
    colle.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const envoyer = async () => {
    const texte = saisie.trim()
    if (!texte || enCours) return
    setSaisie('')
    setErreur(null)
    colle.current = true
    setTours((t) => [...t, { role: 'moi', texte }])
    try {
      await api.chatEnvoyer(texte)
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : String(err))
    }
  }

  const repondreAutorisation = async (optionId: string | null) => {
    if (!autorisation) return
    const demande = autorisation.demande
    setAutorisation(null)
    try {
      await api.chatAutoriser(demande, optionId)
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : String(err))
    }
  }

  const pourcent = usage && usage.total ? Math.round((usage.utilise / usage.total) * 100) : null

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Barre du cerveau : le modele est une propriete de la conversation, pas
          de l'application - il a sa place ici, au-dessus du fil. */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 px-4 py-1.5 dark:border-navy-800">
        <Pastille agent={agents.get('default')} />
        <span className="text-xs font-semibold">{agents.get('default')?.nom || 'Hermes'}</span>
        {/* Le cerveau et sa bascule vont ensemble : l'interrupteur ne veut rien
            dire loin du nom du modele qu'il protege. */}
        <div className="ml-auto flex items-center gap-1.5">
          {session && session.modeles.length > 0 && (
            <select
              value={session.modeleActuel || ''}
              onChange={(e) => void api.chatModele(e.target.value).catch(() => {})}
              disabled={enCours}
              className="input max-w-[12rem] py-0.5 text-[11px] disabled:opacity-50"
              title="Le cerveau d'Hermes pour cette session"
            >
              {session.modeles.map((m) => (
                <option key={m.id} value={m.id}>
                  {nomCourt(m.id)}
                </option>
              ))}
            </select>
          )}
          <InterrupteurBascule
            actif={bascule}
            onChange={(v) => {
              // Repond au doigt sans attendre le serveur, et revient en arriere
              // si l'ecriture echoue : un interrupteur qui ment est pire que
              // pas d'interrupteur.
              setBascule(v)
              void api.chatReglerBascule(v).catch(() => setBascule(!v))
            }}
          />
        </div>
        {pourcent !== null && (
          <span
            className="text-[10px] muted"
            title={`${usage!.utilise.toLocaleString('fr-FR')} sur ${usage!.total.toLocaleString('fr-FR')} jetons`}
          >
            {pourcent}%
          </span>
        )}
      </div>

      <div ref={zone} onScroll={auDefilement} className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {(demarrage || tours.length === 0) && <Accueil demarrage={demarrage} />}

          {tours.map((tour, i) =>
            tour.role === 'moi' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-sky-600 px-4 py-2.5 text-sm text-white">
                  {tour.texte}
                </div>
              </div>
            ) : tour.role === 'proposition' ? (
              <Proposition key={i} taches={tour.taches} agents={agents} />
            ) : (
              <TourAgent key={i} tour={tour} agent={agents.get('default')} />
            ),
          )}

          {etapes.length > 0 && <Etapes etapes={etapes} />}

          {enCours && !autorisation && (
            <div className="flex items-center gap-2 pl-11 text-xs muted">
              <span className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
              Hermes travaille
            </div>
          )}

          {autorisation && <Autorisation demande={autorisation} onRepondre={repondreAutorisation} />}
        </div>
      </div>

      {erreur && (
        <div className="flex-shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {erreur}
        </div>
      )}

      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void envoyer()
              }
            }}
            rows={1}
            placeholder={demarrage ? 'Hermes demarre...' : 'Demande quelque chose a Hermes'}
            disabled={demarrage}
            className="input max-h-40 min-h-[2.75rem] flex-1 resize-none py-3 disabled:opacity-60"
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 160) + 'px'
            }}
          />
          {enCours ? (
            <button onClick={() => void api.chatInterrompre()} className="btn-ghost h-11 px-4" title="Arreter">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => void envoyer()}
              disabled={!saisie.trim() || demarrage}
              className="btn-primary h-11 px-4"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Morceaux
// -----------------------------------------------------------------------------

function Accueil({ demarrage }: { demarrage: boolean }) {
  return (
    <div className="card p-5 text-center">
      <img src="./hermes-master.png" alt="" className="mx-auto h-14 w-14 object-contain" />
      <h3 className="mt-3 text-sm font-semibold">
        {demarrage ? 'Hermes se reveille' : "Dis-lui ce que tu veux"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed muted">
        {demarrage
          ? 'Chargement de sa memoire, de ses outils et de ses skills.'
          : "Il decoupe la demande, choisit les agents et son equipe apparait ici. Le plan complet se dessine a droite."}
      </p>
    </div>
  )
}

/** La proposition d'equipe : ce qu'Hermes vient de decider, au moment ou il le
    decide. Groupee par agent - c'est « qui fait quoi » qu'on veut lire, pas une
    liste de taches a plat. */
function Proposition({ taches, agents }: { taches: Tache[]; agents: Map<string, Agent> }) {
  const parAgent = new Map<string, Tache[]>()
  for (const t of taches) {
    const cle = t.agent || '?'
    parAgent.set(cle, [...(parAgent.get(cle) || []), t])
  }

  return (
    <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-3 dark:border-indigo-500/40 dark:bg-indigo-500/10">
      <h3 className="flex items-center gap-2 text-xs font-semibold">
        <Users className="h-4 w-4 flex-shrink-0 text-indigo-500" />
        Equipe proposee
        <span className="ml-auto text-[10px] font-normal muted">
          {taches.length} tache{taches.length > 1 ? 's' : ''} - {parAgent.size} agent
          {parAgent.size > 1 ? 's' : ''}
        </span>
      </h3>

      <div className="mt-2.5 space-y-2">
        {[...parAgent.entries()].map(([id, liste]) => {
          const agent = agents.get(id)
          const t = teinte(agent?.couleur)
          return (
            <div key={id} className="flex gap-2">
              <Pastille agent={agent} />
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold ${t.texte}`}>{agent?.nom || id}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {liste.map((tache) => (
                    <li key={tache.id} className="flex items-start gap-1.5 text-[11px]">
                      <span
                        className={`mt-1.5 h-1 w-1 flex-shrink-0 rounded-full ${TEINTE_ETAT[tache.etat]}`}
                      />
                      <span className="min-w-0 flex-1">{tache.titre}</span>
                      <span className="flex-shrink-0 text-[9px] muted">
                        {ETATS_TACHE[tache.etat] || tache.etat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TourAgent({ tour, agent }: { tour: TourHermes; agent?: Agent }) {
  return (
    <div className="flex gap-2.5">
      <Pastille agent={agent} taille="md" />
      <div className="min-w-0 flex-1 space-y-2">
        {tour.blocs.length === 0 && !tour.fini && <p className="pt-1.5 text-xs muted">...</p>}
        {tour.blocs.map((bloc, i) =>
          bloc.type === 'outil' ? (
            <Outil key={bloc.id + i} bloc={bloc} />
          ) : bloc.type === 'reflexion' ? (
            <Reflexion key={i} texte={bloc.texte} />
          ) : bloc.type === 'bascule' ? (
            <TraceBascule key={i} bloc={bloc} />
          ) : (
            <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {bloc.texte}
            </p>
          ),
        )}
        {tour.fini && tour.raison === 'cancelled' && <p className="text-xs italic muted">Interrompu.</p>}
      </div>
    </div>
  )
}

/** La reflexion est repliee par defaut : elle explique, elle ne conclut pas. */
function Reflexion({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-950/50">
      <button
        onClick={() => setOuvert((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium muted"
      >
        {ouvert ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Brain className="h-3 w-3 text-violet-400" />
        Reflexion
      </button>
      {ouvert && (
        <p className="whitespace-pre-wrap break-words px-3 pb-2 pl-8 text-xs italic leading-relaxed muted">
          {texte}
        </p>
      )}
    </div>
  )
}

const POINT: Record<EtatOutil, string> = {
  pending: 'bg-slate-400',
  in_progress: 'bg-sky-500 animate-pulse',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
}

function Outil({ bloc }: { bloc: Extract<BlocTour, { type: 'outil' }> }) {
  const [ouvert, setOuvert] = useState(false)
  const Icone = ICONES[bloc.genre] || Wrench
  const depliable = Boolean(bloc.detail)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-navy-700 dark:bg-navy-950/50">
      <button
        onClick={() => depliable && setOuvert((o) => !o)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
          depliable ? 'hover:bg-slate-100 dark:hover:bg-navy-800' : 'cursor-default'
        }`}
      >
        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${POINT[bloc.etat]}`} />
        <Icone className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wide muted">
          {GENRES_OUTIL[bloc.genre] || GENRES_OUTIL.other}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{bloc.titre}</span>
        {depliable &&
          (ouvert ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          ))}
      </button>
      {ouvert && (
        <pre className="max-h-64 overflow-auto border-t border-slate-200 px-3 py-2 text-[11px] leading-relaxed dark:border-navy-700">
          {bloc.detail}
        </pre>
      )}
    </div>
  )
}

function Etapes({ etapes }: { etapes: EtapePlan[] }) {
  return (
    <div className="card p-3">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold">
        <ListChecks className="h-4 w-4 text-gold-500" />
        Etapes
      </h3>
      <ol className="space-y-1">
        {etapes.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                e.etat === 'completed'
                  ? 'bg-emerald-500'
                  : e.etat === 'in_progress'
                    ? 'animate-pulse bg-sky-500'
                    : 'bg-slate-300 dark:bg-navy-700'
              }`}
            />
            <span className={e.etat === 'completed' ? 'muted line-through' : ''}>{e.libelle}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Le refus est a gauche et neutre, l'accord a droite et colore : on ne clique
    pas « autoriser » par reflexe en visant le bouton le plus visible. */
function Autorisation({
  demande,
  onRepondre,
}: {
  demande: DemandeAutorisation
  onRepondre: (optionId: string | null) => void
}) {
  const refus = demande.options.filter((o) => o.genre.startsWith('reject'))
  const accords = demande.options.filter((o) => !o.genre.startsWith('reject'))

  return (
    <div className="rounded-xl border border-gold-500/50 bg-gold-300/15 p-3 dark:bg-gold-500/10">
      <h3 className="flex items-center gap-2 text-xs font-semibold">
        <ShieldQuestion className="h-4 w-4 flex-shrink-0 text-gold-500" />
        {demande.titre}
      </h3>
      {demande.detail && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-white/60 p-2 font-mono text-[10px] dark:bg-navy-950/50">
          {demande.detail}
        </pre>
      )}
      <div className="mt-2.5 flex flex-wrap justify-end gap-2">
        {refus.map((o) => (
          <button key={o.id} onClick={() => onRepondre(o.id)} className="btn-ghost px-3 py-1 text-xs">
            {o.libelle}
          </button>
        ))}
        {accords.map((o) => (
          <button key={o.id} onClick={() => onRepondre(o.id)} className="btn-gold px-3 py-1 text-xs">
            {o.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * L'interrupteur de bascule, colle au nom du modele.
 *
 * Une pastille plutot qu'une case a cocher : elle dit son etat de loin, a la
 * couleur, sans qu'on ait a la lire. Verte, Hermes changera de cerveau tout
 * seul quand le fournisseur coupera ; grise, il s'arretera sur l'erreur.
 */
function InterrupteurBascule({
  actif,
  onChange,
}: {
  actif: boolean
  onChange: (actif: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label="Bascule automatique de modele"
      onClick={() => onChange(!actif)}
      title={
        actif
          ? 'Bascule automatique active : si le fournisseur coupe, Hermes passe au modele gratuit suivant et rejoue le message.'
          : "Bascule automatique fermee : si le fournisseur coupe, la reponse s'arrete sur l'erreur."
      }
      className={`flex h-4 w-7 flex-shrink-0 items-center rounded-full p-0.5 transition-colors ${
        actif ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-navy-700'
      }`}
    >
      <span
        className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
          actif ? 'translate-x-3' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

/** Ce que la bascule laisse dans le fil : discret, mais assez pour qu'on
    comprenne pourquoi la suite ne vient pas du meme cerveau. */
function TraceBascule({
  bloc,
}: {
  bloc: { type: 'bascule'; de: string | null; vers: string; raison: string }
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
      <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="min-w-0">
        {bloc.de ? nomCourt(bloc.de) : 'Le modele'} a coupe ({bloc.raison}) - reprise sur{' '}
        <strong className="font-semibold">{nomCourt(bloc.vers)}</strong>
      </span>
    </div>
  )
}

/** `nous:anthropic/claude-opus-5` se lit mal dans une barre : on ne garde que ce
    qui distingue un modele d'un autre. */
function nomCourt(modele: string | null): string {
  if (!modele) return 'Modele par defaut'
  const sansProvider = modele.includes(':') ? modele.slice(modele.indexOf(':') + 1) : modele
  return sansProvider.includes('/') ? sansProvider.slice(sansProvider.indexOf('/') + 1) : sansProvider
}
