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
import {
  AlertTriangle,
  ChevronDown,
  CornerDownRight,
  Loader2,
  Moon,
  Plus,
  Radio,
  Search,
  Send,
  Square,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { api } from '../lib/api'
import { GENRES_OUTIL } from '../types'
import type {
  Agent,
  BlocTour,
  DemandeAutorisation,
  Equipe,
  EvenementChat,
  FilResume,
  Tour,
  TourAgent,
  TourDelegation,
} from '../types'

interface Props {
  agents: Agent[]
  /** Les equipes constituees : elles servent a reduire la barre a ceux qui
      travaillent ensemble, et a les appeler d'un bloc. */
  equipes?: Equipe[]
  /** Une conversation a rouvrir, choisie dans le volet Historique. */
  filAOuvrir?: string | null
  /** Previent que la demande a ete honoree, pour qu'elle ne se rejoue pas. */
  onFilOuvert?: () => void
  /** Remonte l'etat d'eveil pour que les autres volets le voient. */
  onEveilChange?: (eveilles: string[]) => void
}

export function Conversation({
  agents,
  equipes = [],
  filAOuvrir,
  onFilOuvert,
  onEveilChange,
}: Props) {
  const [tours, setTours] = useState<Tour[]>([])
  const [saisie, setSaisie] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [eveilles, setEveilles] = useState<Set<string>>(() => new Set())
  const [autorisations, setAutorisations] = useState<(DemandeAutorisation & { agent: string })[]>([])
  /** L'equipe affichee dans la barre. Vide = tout l'annuaire. */
  const [equipeVue, setEquipeVue] = useState('')
  const [recherche, setRecherche] = useState('')

  /**
   * L'historique. `filVu` a null veut dire « le direct » : c'est le seul etat
   * ou les evenements qui arrivent s'ajoutent au fil affiche. En relisant une
   * conversation passee, on ne veut pas voir une reponse d'aujourd'hui s'y
   * glisser.
   */
  const [fils, setFils] = useState<FilResume[]>([])
  const [filVu, setFilVu] = useState<string | null>(null)
  /** L'annuaire complet, replie par defaut : la place appartient au fil. */
  const [deplie, setDeplie] = useState(false)

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

  /** Le flux est branche une fois pour toutes : il lui faut une reference, pas
      une valeur capturee au montage. */
  const filVuRef = useRef<string | null>(null)
  useEffect(() => {
    filVuRef.current = filVu
  }, [filVu])

  const rafraichirFils = useCallback(async () => {
    setFils(await api.conversations().catch(() => []))
  }, [])

  useEffect(() => {
    void rafraichirFils()
  }, [rafraichirFils])

  // L'historique demande d'ouvrir un fil : on le rejoue, une fois.
  useEffect(() => {
    if (!filAOuvrir) return
    void (async () => {
      try {
        const fil = await api.conversation(filAOuvrir)
        setTours(construire(fil.evenements))
        setFilVu(filAOuvrir)
        filVuRef.current = filAOuvrir
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e))
      } finally {
        onFilOuvert?.()
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filAOuvrir])

  const appliquer = useCallback((e: EvenementChat) => {
    const agent = e.agent || 'default'

    /**
     * Ce qui appartient a un pole n'appartient pas a la conversation.
     *
     * Un agent qui execute une tache emet exactement les memes evenements qu'un
     * agent qui repond ici - meme type, meme emetteur, meme flux. Sans cette
     * porte, lancer un pole de sept taches ferait defiler sept monologues dans
     * le fil, adresses a personne, entre deux vraies reponses. Le serveur pose
     * la meme regle sur l'historique ecrit ; celle-ci vaut pour le direct.
     *
     * L'eveil fait exception, et c'est voulu : un agent occupe par une tache
     * est reellement occupe, et la liste laterale doit le montrer plutot que de
     * le proposer comme disponible.
     */
    if (e.pole && e.type !== 'reveil' && e.type !== 'sommeil') return

    // Un message envoye ramene toujours au direct : on vient de parler, c'est
    // la reponse qu'on attend, pas la conversation qu'on relisait.
    if (e.type === 'moi') filVuRef.current = null
    // La liste laterale se met a jour quand un tour se termine : c'est la que
    // le titre et l'heure d'un fil viennent de changer.
    if (e.type === 'tour-fin') void rafraichirFils()

    // En relisant une conversation passee, rien de neuf ne s'y ajoute. L'etat
    // d'eveil et les demandes d'autorisation, eux, restent d'actualite : un
    // agent qui attend une reponse l'attend meme si on regarde ailleurs.
    if (filVuRef.current !== null && MODIFIE_LE_FIL.has(e.type)) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rafraichirFils])

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
    // La recherche se vide des qu'elle a servi : la garder ouverte laisserait
    // la barre filtree sur un mot dont on ne se souvient plus.
    setRecherche('')
    champ.current?.focus()
  }

  /** Appeler une equipe entiere : une seule mention, tout le monde se reveille. */
  const mentionnerEquipe = (e: Equipe) => {
    setSaisie((s) => (s.includes(`@equipe ${e.nom}`) ? s : `@equipe ${e.nom} ${s}`.trimStart()))
    champ.current?.focus()
  }

  /** Relire une conversation : on rejoue ses evenements, on ne recharge pas la
      page. Le direct reste branche derriere, et un nouveau message y ramene. */
  const ouvrirFil = async (id: string) => {
    try {
      const fil = await api.conversation(id)
      setTours(construire(fil.evenements))
      setFilVu(id)
      filVuRef.current = id
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }

  const revenirAuDirect = () => {
    setFilVu(null)
    filVuRef.current = null
    setTours([])
  }

  /** Ouvrir un fil neuf sans rien effacer : le prochain message repart de zero,
      meme si on s'adresse au meme interlocuteur. */
  const nouvelleConversation = async () => {
    await api.nouvelleConversation().catch(() => null)
    revenirAuDirect()
    void rafraichirFils()
  }

  const repondre = async (d: DemandeAutorisation & { agent: string }, option: string) => {
    setAutorisations((a) => a.filter((x) => x.demande !== d.demande))
    await api.chatAutoriser(d.agent, d.demande, option).catch(() => null)
  }

  // --- qui s'affiche dans la barre -------------------------------------------
  /**
   * La recherche l'emporte sur l'equipe choisie, et c'est le point : on
   * cherche precisement quand on veut quelqu'un qui n'est pas dans l'equipe
   * ouverte - un avis exterieur, une competence qu'on n'a pas sous la main.
   * Un filtre qui resterait applique par-dessus la recherche rendrait cette
   * personne introuvable.
   */
  const equipeChoisie = equipes.find((e) => e.id === equipeVue) || null
  const terme = aplatir(recherche)
  const visibles = terme
    ? agents.filter((a) => aplatir(`${a.nom} ${a.metier} ${a.description}`).includes(terme))
    : equipeChoisie
      ? agents.filter((a) => equipeChoisie.membres.includes(a.id))
      : agents

  // --- rendu -----------------------------------------------------------------
  const filOuvert = fils.find((f) => f.id === filVu) || null

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Une seule ligne de contexte : ce qu'on regarde, et de quoi repartir
            a zero. L'historique lui-meme vit dans le menu, a cote de la
            Conversation - pas dans un tiroir qui mange la largeur du fil. */}
        <div className="flex flex-none items-center gap-2 border-b border-slate-200 px-4 py-1.5 dark:border-navy-800">
          {filOuvert ? (
            <>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {filOuvert.interlocuteur} — {filOuvert.titre}
              </span>
              <button onClick={revenirAuDirect} className="btn-ghost px-2.5 py-1 text-[11px]">
                <Radio className="mr-1 inline h-3.5 w-3.5" />
                Revenir au direct
              </button>
            </>
          ) : (
            <>
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs muted">
                <Radio className="h-3.5 w-3.5 flex-none" />
                En direct
              </span>
              {tours.length > 0 && (
                <button
                  onClick={() => void nouvelleConversation()}
                  className="btn-ghost px-2.5 py-1 text-[11px]"
                  title="Repartir sur une conversation neuve"
                >
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Nouvelle
                </button>
              )}
            </>
          )}
        </div>

      <div data-zone="fil-conversation" className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
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
      <div
        data-zone="barre-saisie"
        className="flex-none border-t border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={equipeVue}
              onChange={(e) => {
                setEquipeVue(e.target.value)
                setRecherche('')
              }}
              className="input h-8 w-auto py-0 pr-7 text-[11px]"
              title="N afficher que les membres d une equipe"
            >
              <option value="">Tout le monde ({agents.length})</option>
              {equipes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} ({e.membres.length})
                </option>
              ))}
            </select>

            {equipeChoisie && !terme && (
              <button
                onClick={() => mentionnerEquipe(equipeChoisie)}
                className="btn-ghost h-8 px-2.5 text-[11px]"
                title={`Appeler les ${equipeChoisie.membres.length} membres d un coup`}
              >
                @equipe {equipeChoisie.nom}
              </button>
            )}

            <div className="relative min-w-[9rem] flex-1 sm:max-w-[16rem]">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 muted" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Chercher un nom ou un metier"
                className="input h-8 w-full py-0 pl-7 text-[11px]"
              />
            </div>

            {!terme && !equipeChoisie && (
              <button
                onClick={() => setDeplie((v) => !v)}
                className="btn-ghost h-8 px-2.5 text-[11px]"
                title={deplie ? 'Replier l annuaire' : 'Voir tous les agents'}
              >
                <ChevronDown
                  className={`mr-1 inline h-3.5 w-3.5 transition-transform ${deplie ? 'rotate-180' : ''}`}
                />
                {agents.length} agents
              </button>
            )}

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

          {/**
           * L'annuaire ne s'etale que si on le demande.
           *
           * Treize pastilles posees en permanence au-dessus du champ mangeaient
           * trois lignes de la zone de discussion - la partie que l'on regarde
           * vraiment. Elles ne s'ouvrent donc que sur demande, ou d'elles-memes
           * quand une recherche ou une equipe reduit la liste a quelque chose
           * qui tient sur une ligne.
           */}
          {(deplie || terme || equipeChoisie) && (
            <div data-zone="rangee-agents" className="flex flex-wrap items-center gap-1.5">
              {visibles.map((a) => (
                <PastilleAgent
                  key={a.id}
                  agent={a}
                  eveille={eveilles.has(a.id)}
                  onClick={() => mentionner(a)}
                />
              ))}
              {visibles.length === 0 && (
                <p className="py-1 text-[11px] muted">
                  Personne ne repond a « {recherche} ». Cherche un metier : mixage, paroles,
                  tactique...
                </p>
              )}
            </div>
          )}

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
    </div>
  )
}

// -----------------------------------------------------------------------------
// Le fil
// -----------------------------------------------------------------------------
/** Les evenements qui ecrivent dans le fil - par opposition a ceux qui ne font
    que decrire l'etat courant, toujours valables meme en relisant le passe. */
const MODIFIE_LE_FIL = new Set([
  'tour-debut',
  'texte',
  'reflexion',
  'outil',
  'outil-maj',
  'bascule',
  'delegation',
  'tour-fin',
  'panne',
])

/**
 * Rejoue une conversation enregistree.
 *
 * Le serveur garde les evenements bruts plutot qu'un texte final : on les
 * repasse donc dans la meme moulinette que le direct, et une conversation
 * relue est exactement celle qu'on a vue passer - reflexion et outils compris.
 */
function construire(evenements: (EvenementChat & { a?: number })[]): Tour[] {
  let tours: Tour[] = []

  for (const e of evenements) {
    const agent = e.agent || 'default'
    switch (e.type) {
      case 'moi':
        tours = [...tours, { role: 'moi', texte: e.texte, destinataires: e.destinataires }]
        break
      case 'delegation':
        tours = [
          ...tours,
          { role: 'delegation', de: agent, nom: e.nom, vers: e.vers, texte: e.texte },
        ]
        break
      case 'tour-debut':
        tours = [...tours, { role: 'agent', agent, blocs: [], fini: false }]
        break
      case 'texte':
        tours = ajouterBloc(tours, agent, { type: 'texte', texte: e.texte })
        break
      case 'reflexion':
        tours = ajouterBloc(tours, agent, { type: 'reflexion', texte: e.texte })
        break
      case 'outil':
        tours = ajouterBloc(tours, agent, {
          type: 'outil',
          id: e.id,
          titre: e.titre,
          genre: e.genre,
          etat: e.etat,
          detail: e.detail,
        })
        break
      case 'outil-maj':
        tours = tours.map((t) =>
          t.role === 'agent'
            ? {
                ...t,
                blocs: t.blocs.map((b) =>
                  b.type === 'outil' && b.id === e.id
                    ? { ...b, etat: e.etat ?? b.etat, titre: e.titre ?? b.titre, detail: e.detail ?? b.detail }
                    : b,
                ),
              }
            : t,
        )
        break
      case 'bascule':
        tours = ajouterBloc(tours, agent, { type: 'bascule', de: e.de, vers: e.vers, raison: e.raison })
        break
      case 'tour-fin':
        tours = tours.map((t) =>
          t.role === 'agent' && t.agent === agent && !t.fini
            ? { ...t, fini: true, raison: e.raison }
            : t,
        )
        break
      default:
        break
    }
  }

  // Un fil relu n'a rien en cours : le Hub a pu etre ferme au milieu d'un tour.
  return tours.map((t) => (t.role === 'agent' ? { ...t, fini: true } : t))
}

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

/** Chercher « mixage » doit trouver « Mixage », et « metier » doit trouver
    « métier » : la casse et les accents ne sont pas des criteres. */
function aplatir(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function jetonDe(agent?: Agent): CSSProperties {
  return { '--agent': `var(--jeton-${agent?.couleur || 'ardoise'})` } as CSSProperties
}

function BulleMoi({ tour, agents }: { tour: { texte: string; destinataires: string[] }; agents: Map<string, Agent> }) {
  return (
    <div data-zone="bulle-moi" className="flex flex-col items-end gap-1">
      <div
        className="whitespace-pre-wrap bg-sky-600 px-3.5 py-2 text-sm text-white"
        style={{
          maxWidth: 'var(--bulle-largeur)',
          borderRadius: 'var(--bulle-rayon)',
          borderBottomRightRadius: 'calc(var(--bulle-rayon) / 2)',
        }}
      >
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
    <div data-zone="trace-delegation" className="flex items-start gap-2 pl-8 text-[11px] muted">
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

/**
 * L'en-tete porte le metier, pas seulement le nom.
 *
 * Dans une piece a cinq specialistes, « Elena » ne dit rien : il faut savoir
 * qu'elle est directrice artistique pour comprendre pourquoi elle tranche. Un
 * lecteur oblige d'aller chercher qui est qui ailleurs a deja perdu le fil.
 */
function BulleAgent({ tour, agent }: { tour: TourAgent; agent?: Agent }) {
  return (
    <div data-zone="bulle-agent" style={jetonDe(agent)} className="space-y-1.5">
      <div className="flex items-center gap-2">
        {/* Un point, pas une initiale dans un carre : a treize agents, treize
            pastilles a lettres font un mur d'abreviations qu'on dechiffre. La
            couleur suffit a reconnaitre, et le nom est juste a cote. */}
        <span className="point-agent" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="texte-nom font-semibold">{agent?.nom || tour.agent}</span>
            {agent?.role === 'manager' && <span className="puce sens-info">decide</span>}
            {!tour.fini && <Loader2 className="h-3 w-3 animate-spin muted" />}
          </span>
          {agent?.metier && (
            <span className="texte-metier block truncate muted">{agent.metier}</span>
          )}
        </span>
      </div>

      {/* Le corps s'aligne sous le nom, pas sous le point : le retrait suit
          donc la taille du point via la console. */}
      <div className="space-y-1.5" style={{ paddingLeft: 'var(--bulle-retrait)' }}>
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

/**
 * Une pastille porte deux lignes : le nom, et le metier dessous.
 *
 * La forme ronde et compacte d'avant tenait tant qu'il y avait trois agents
 * qu'on connaissait par coeur. A treize specialistes, elle obligeait a se
 * souvenir de qui fait quoi - c'est-a-dire a aller chercher ailleurs ce que la
 * barre etait censee rendre.
 */
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
      data-zone="pastille-agent"
      onClick={onClick}
      title={
        agent.pretAServir
          ? `${agent.nom} - ${agent.metier || 'sans metier declare'}${eveille ? ' (eveille)' : ''}`
          : `${agent.nom} n a aucune credential : il ne repondra pas`
      }
      className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-left transition-colors ${
        agent.pretAServir
          ? 'border-slate-200 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800'
          : 'border-slate-200 opacity-50 dark:border-navy-700'
      } ${eveille ? 'ring-1' : ''}`}
      // L'eveil se dit par un anneau dans la couleur de l'agent plutot que par
      // une pastille de plus : une rangee de points verts identiques ne
      // designe personne.
      style={{ ...jetonDe(agent), ...(eveille ? { boxShadow: '0 0 0 1px var(--agent)' } : {}) }}
    >
      <span className="point-agent point-agent-compact" />
      <span className="texte-nom truncate font-medium">{agent.nom}</span>
      <span className="texte-metier max-w-[7rem] truncate muted">
        {agent.metier || 'sans metier'}
      </span>
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
