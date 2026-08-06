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
import { Attente } from '../components/Attente'
import { Conversation } from '../components/Conversation'
import { EditeurEquipe } from '../components/EditeurEquipe'
import { FenetreSimulation } from '../components/FenetreSimulation'
import { Modal } from '../components/Modal'
import { Organigramme } from '../components/Organigramme'
import type { EtatNoeud, LienOrg, NoeudOrg } from '../components/Organigramme'
import { NouvelAgent } from '../components/NouvelAgent'
import { CerveauEquipe } from '../components/CerveauEquipe'
import { OutilsEquipe } from '../components/OutilsEquipe'
import { PageHeader } from '../components/PageHeader'
import { sansAccord } from '../lib/accords'
import { ApiError, api, ecouterChat } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import { ETATS_TACHE } from '../types'
import type {
  Agent,
  Competence,
  Chantier,
  DemandeAutorisation,
  Equipe as EquipeType,
  EtatTache,
  Orchestration,
  Pole,
  Simulation,
} from '../types'

interface Props {
  onMenu: () => void
  /** Ouvrir un pole dans le Studio : c'est la que le travail se fait, pas dans
      une fenetre modale d'ou l'on ne peut rien saisir. */
  onStudio: (poleId: string) => void
}

const FINI: EtatTache[] = ['done']
const DORMANT: EtatTache[] = ['triage', 'todo', 'scheduled']

/**
 * L'etat du tableau traduit en etat visuel.
 *
 * C'est la vue de repos : ce que le tableau des taches sait dire quand on
 * ouvre le pole. Les etats fugaces - reveil, reflexion - n'existent pas ici,
 * ils n'arrivent que par le flux (voir `vivant`).
 */
function etatVisuel(etat: EtatTache): EtatNoeud | undefined {
  if (FINI.includes(etat)) return 'succes'
  if (etat === 'blocked') return 'erreur'
  if (etat === 'review') return 'attente'
  if (etat === 'running') return 'encours'
  if (DORMANT.includes(etat)) return 'endormi'
  // `ready` : elle attend son tour, et ca se dit en ne disant rien.
  return undefined
}

/**
 * Ce que le flux SSE dit d'une tache, et que le tableau ne sait pas.
 *
 * Le tableau connait quatre etats durables ; le pont en emet de bien plus
 * fins, et ce sont eux qui rendent le graphe vivant : l'agent se reveille, il
 * reflechit, il ecrit. Ces etats-la ne survivent pas a un rechargement, et
 * c'est normal - ils decrivent un instant, pas une situation.
 */
const ETAT_DU_FLUX: Record<string, EtatNoeud> = {
  'tour-debut': 'encours',
  reflexion: 'reflexion',
  texte: 'encours',
  text: 'encours',
}

type Volet = 'conversation' | 'agents' | 'poles'

/**
 * ⚠ L'HISTORIQUE N'EST PLUS ICI - il a demenage a l'accueil le 06/08/2026.
 *
 * Il occupait le premier volet, « parce qu'on ouvre une application sur ce
 * qu'on a laisse en cours ». C'etait vrai du rang, faux de l'ecran :
 * `PLAN-ORCHESTRATION-STUDIO.md` le dit sans detour - *« l'historique est reste
 * du cote ou l'on n'ecrit plus. On ecrit a l'accueil, on relit dans
 * Orchestration. Une memoire rangee loin de l'endroit ou elle se fabrique ne se
 * consulte pas. »* Il est desormais un bouton dans la ligne « En direct », et
 * au salut il se range avec Projets et Coffre. Voir `VoletHistorique.tsx`.
 *
 * ON NE LE LAISSE PAS ICI EN DOUBLE, et c'est delibere : deux surfaces qui
 * disent la meme chose finissent par se contredire - c'est la regle qui a fait
 * partir la bande « automatisation tombee » de l'accueil au chantier 2.
 */
/**
 * Deux questions, deux volets - et c'est tout le sujet.
 *
 * L'onglet s'appelait « Poles / Equipes ». Une barre oblique annonce deux
 * variantes d'une meme chose, et ce sont deux natures differentes : le pole dit
 * CE QUI EST FAIT - un graphe de taches lu dans `kanban.db` - l'equipe dit QUI
 * pourrait le faire, un simple groupe nomme dans `.hub/equipes.json`. kuchu, le
 * 03/08/2026 : « on ne comprend pas vraiment quelles sont les differences entre
 * pole et equipe ». Le modele, lui, etait deja juste ; c'est l'ecran qui les
 * confondait.
 *
 * Les equipes remontent donc chez les agents. Meme raison que les outils MCP,
 * poses la avant elles : c'est la meme question - « qui ai-je ? ». Une equipe
 * n'est qu'une facon de grouper des agents, et elle ne FAIT rien.
 */
const VOLETS: { id: Volet; label: string; icon: typeof Users }[] = [
  { id: 'conversation', label: 'Conversation', icon: MessageSquare },
  { id: 'agents', label: 'Agents et equipes', icon: Users },
  { id: 'poles', label: 'Scenarios', icon: Network },
]

/** Ce qui est ouvert par-dessus : l'organigramme de l'equipe, ou celui d'un pole. */
type Ouvert =
  | { genre: 'equipe' }
  | { genre: 'equipe-nommee'; id: string }
  | { genre: 'pole'; id: string }

export function OrchestrationView({ onMenu, onStudio }: Props) {
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
  /* ⚠ F11 : il n'y a plus d'etat de validation ici. Le bouton « Valider » de la
     simulation a disparu le 06/08/2026 - le plan est desormais un panneau
     permanent, donc « valider la simulation » ne gardait plus aucune porte. Le
     serveur date l'accord au moment du clic sur Lancer. */
  /** La demande qui n'a pas ete decoupee, et qui attend donc dans le Studio.
      Elle existe pour porter le bouton de F20 : sans son identifiant, le
      message ne pourrait que decrire le chemin. */
  const [simuEchouee, setSimuEchouee] = useState<string | null>(null)
  const [demande, setDemande] = useState('')

  /** Les poles en train de tourner. L'etat vit cote serveur - ici on le relit
      quand quelque chose bouge, plutot que d'en tenir une seconde copie qui
      finirait par diverger. */
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [lancement, setLancement] = useState(false)

  /** Ce que des agents au travail attendent de toi. Tant qu'une demande est la,
      la tache qui l'a posee ne bouge plus d'un pouce. */
  const [accords, setAccords] = useState<(DemandeAutorisation & { agent: string; pole: string })[]>(
    [],
  )

  /**
   * Ce que le flux dit des taches en ce moment meme, par identifiant.
   *
   * Volontairement hors du chargement : ces etats ne se rechargent pas, ils
   * arrivent. Un rechargement de page les perd, et c'est juste - ils decrivent
   * un instant qui est deja passe.
   */
  const [vivant, setVivant] = useState<Map<string, EtatNoeud>>(new Map())

  /** L'editeur d'equipe : neuve, ou posee sur une existante. Null = ferme. */
  const [edition, setEdition] = useState<
    { genre: 'neuve' } | { genre: 'existante'; id: string } | null
  >(null)

  const notifier = useHubStore((s) => s.notify)

  /** Meme raison qu'au Studio : un refus du serveur ne doit pas ressortir en
      « le bouton ne fait rien ». Voir le commentaire de `agir` la-bas. */
  const agir = useCallback(
    async (quoi: string, faire: () => Promise<unknown>) => {
      try {
        return await faire()
      } catch (err) {
        notifier(
          'error',
          err instanceof ApiError ? `${quoi} : ${err.message}` : `${quoi} n a pas abouti.`,
        )
        return null
      }
    },
    [notifier],
  )

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

  const chargerChantiers = useCallback(async () => {
    setChantiers((await api.chantiers().catch(() => null))?.chantiers || [])
  }, [])

  /**
   * Le flux, pour les poles.
   *
   * La conversation ouvre le sien de son cote, mais elle n'est montee que dans
   * son volet : sans cette ecoute-ci, un pole lance puis regarde depuis l'onglet
   * Poles n'aurait plus personne pour raconter ce qui lui arrive.
   *
   * On relit plutot que de rejouer : chaque changement d'etat declenche une
   * relecture des chantiers, et une tache terminee relit aussi le tableau,
   * puisque c'est lui qui porte les compteurs des vignettes.
   */
  useEffect(() => {
    void chargerChantiers()
    return ecouterChat((e) => {
      if (e.type === 'reprise') {
        const repris = e.chantiers || []
        setChantiers(repris)
        // Un accord emis avant l'ouverture de ce flux attend toujours : on le
        // recupere ici, sinon la fenetre ne saurait plus a quoi repondre.
        setAccords(
          repris.flatMap((c) => (c.accords || []).map((a) => ({ ...a, pole: c.pole }))),
        )
        return
      }

      // Les demandes d'accord de la conversation ne nous regardent pas : elles
      // ont leur place dans le fil, ou elles sont deja affichees.
      if (e.type === 'autorisation' && e.pole) {
        const neuf = {
          demande: e.demande,
          titre: e.titre,
          detail: e.detail,
          options: e.options,
          agent: e.agent || 'default',
          pole: e.pole as string,
        }
        // Sans ce dedoublonnage, une reprise de flux - reconnexion SSE, retour
        // d'onglet - reposait une demande deja affichee, et on se retrouvait
        // avec deux cartes identiques dont une seule repondait.
        return setAccords((a) => [...sansAccord(a, neuf.agent, neuf.demande), neuf])
      }

      // C'est ici que le graphe devient vivant. Le pont marque chaque trame de
      // la tache en cours (`pont.contexte`), donc ces evenements savent de quel
      // noeud ils parlent - sans quoi on saurait qu'un agent reflechit, mais
      // pas sur quoi.
      const tache = (e as { tache?: string }).tache
      const fugace = ETAT_DU_FLUX[e.type]
      if (fugace && tache) {
        // Une reflexion emet des dizaines de trames par seconde. Sans cette
        // garde, chacune reconstruirait la table et rerendrait le graphe pour
        // y reecrire la meme valeur.
        setVivant((v) => (v.get(tache) === fugace ? v : new Map(v).set(tache, fugace)))
        return
      }

      if (e.type === 'tache-etat') {
        setVivant((v) => {
          // `running` = la tache vient d'etre saisie et l'agent s'ouvre. C'est
          // le reveil - la seule source fiable pour cet etat, parce que les
          // trames `reveil` de l'equipage ne portent pas de tache : elles
          // parlent d'un agent, et un agent n'est pas un noeud du graphe.
          if (e.etat === 'running') return new Map(v).set(e.tache, 'reveil')
          // Sinon l'etat durable reprend la main : il vient du tableau, il fait foi.
          if (!v.has(e.tache)) return v
          const n = new Map(v)
          n.delete(e.tache)
          return n
        })
        // Une tache qui quitte `running` emporte ses demandes en suspens :
        // elles ne s'adressent plus a personne.
        if (e.etat !== 'running') setAccords((a) => a.filter((d) => d.agent !== e.agent))
        void chargerChantiers()
        if (e.etat !== 'running') void charger()
        return
      }
      if (e.type === 'chantier-debut' || e.type === 'chantier-fin' || e.type === 'chantier-panne') {
        // Plus personne ne travaille : les etats d'instant n'ont plus d'objet.
        if (e.type !== 'chantier-debut') setVivant(new Map())
        if (e.type !== 'chantier-debut') setAccords((a) => a.filter((d) => d.pole !== e.pole))
        void chargerChantiers()
        void charger()
      }
    })
  }, [chargerChantiers, charger])

  const repondreAccord = useCallback(
    async (demande: string, agent: string, option: string) => {
      setAccords((a) => sansAccord(a, agent, demande))
      await agir('Ta reponse', () => api.chatAutoriser(agent, demande, option))
    },
    [agir],
  )

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
    setSimuEchouee(null)
    setSimuOccupee(true)
    try {
      const plan = await api.demande(texte)

      // Un decoupage qui echoue laisse une tache seule sur le tableau - et une
      // tache sans enfant n'est pas un pole. Simuler la rendait donc « Pole
      // introuvable », ce qui remplacait la vraie raison par une phrase qui
      // n'apprend rien. On s'arrete ici : la demande existe, elle attend dans le
      // Studio, et c'est ce qu'on dit.
      //
      // F20 : ON GARDE AUSSI OU ELLE ATTEND. La raison seule decrivait le chemin
      // - « ouvre-la dans le Studio » - sans l'offrir, et `plan.pole` etait
      // jete a la ligne suivante. Le retenir suffit a poser un bouton.
      if (!plan.decoupe) {
        setSimuErreur(plan.raison)
        setSimuEchouee(plan.pole)
        setDemande('')
        void charger()
        return
      }

      setSimu(await api.simulation(plan.pole))
      setDemande('')
      void charger()
    } catch (e) {
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setSimuOccupee(false)
    }
  }, [demande, charger])


  /**
   * Lancer. Le serveur rend la main tout de suite - ce qui suit arrive par le
   * flux, tache par tache, et c'est lui qui remplira le pied de la fenetre.
   */
  const lancer = useCallback(async () => {
    if (!simu) return
    setLancement(true)
    setSimuErreur(null)
    try {
      await api.lancerPole(simu.pole.id)
      await chargerChantiers()
    } catch (e) {
      setSimuErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setLancement(false)
    }
  }, [simu, chargerChantiers])

  const arreterPole = useCallback(async () => {
    if (!simu) return
    await agir("L'arret", () => api.arreterPole(simu.pole.id))
    await chargerChantiers()
    void charger()
  }, [simu, agir, chargerChantiers, charger])

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

      {/* Une porte fermee doit se voir de partout.
          Ces demandes n'etaient affichees que dans la fenetre de simulation.
          Consequence vue en conditions reelles : un pole lance depuis
          l'organigramme s'arretait sur la premiere autorisation, sans un mot,
          et restait fige indefiniment - vingt-sept minutes avant qu'on ne
          comprenne pourquoi « rien ne bougeait ». Un agent qui attend une
          reponse bloque toute la chaine derriere lui : c'est exactement ce
          qu'on ne peut pas se permettre de rater. */}
      {accords.length > 0 && (
        <div
          data-zone="accords-orchestration"
          className="flex-shrink-0 border-b border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-500/10"
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 flex-none" />
            {accords.length === 1
              ? 'Un agent attend ta reponse - le scenario est arrete tant qu-elle ne vient pas.'
              : `${accords.length} agents attendent ta reponse - les scenarios sont arretes.`}
          </p>
          <div className="space-y-1.5">
            {accords.map((d) => (
              <div
                key={`${d.agent}-${d.demande}`}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 dark:bg-navy-900/60"
              >
                <span className="text-[11px] font-semibold">{d.agent}</span>
                {/* Le titre peut porter un script entier : on le borne, sinon
                    une demande chasse toutes les autres hors de l'ecran. */}
                <span className="min-w-0 flex-1 truncate text-[11px] muted" title={d.titre}>
                  {d.titre}
                </span>
                {d.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => void repondreAccord(d.demande, d.agent, o.id)}
                    className={
                      o.genre?.startsWith('reject')
                        ? 'btn-ghost flex-none px-2 py-1 text-[11px]'
                        : 'btn-primary flex-none px-2 py-1 text-[11px]'
                    }
                  >
                    {o.libelle}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <nav
          data-zone="nav-orchestration"
          className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r"
        >
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
                {id === 'agents' ? agents.length : id === 'poles' ? poles.length : ''}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* La conversation gere son propre defilement : elle garde le champ
              de saisie colle en bas pendant que le fil monte. */}
          {volet === 'conversation' && (
            <Conversation agents={agents} equipes={equipes} onEveilChange={setEveilles} />
          )}

          {volet !== 'conversation' && (
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
                      <div className="flex items-center gap-1">
                        <NouvelAgent onFait={() => void charger()} />
                        {agents.length > 0 && (
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => setOuvert({ genre: 'equipe' })}
                          >
                            Voir l organigramme
                          </button>
                        )}
                      </div>
                    }
                  />
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <LigneAgent key={a.id} agent={a} onFait={() => void charger()} />
                    ))}
                  </div>

                  {/* Les equipes sont ici, avec les agents qu'elles groupent,
                      et plus a cote des poles ou on les prenait pour la meme
                      chose. La definition insiste sur ce qu'une equipe ne fait
                      PAS : c'est le seul moyen de ne pas la confondre avec un
                      pole, qui lui produit quelque chose. */}
                  <div className="border-t border-slate-200 pt-4 dark:border-navy-800">
                    <Entete
                      titre={`${equipes.length} equipe${equipes.length > 1 ? 's' : ''}`}
                      detail="Des agents qu on appelle ensemble - une equipe ne fait rien toute seule"
                      action={
                        !edition && (
                          <button
                            className="btn-ghost px-3 py-1.5 text-xs"
                            onClick={() => setEdition({ genre: 'neuve' })}
                          >
                            Composer une equipe
                          </button>
                        )
                      }
                    />

                    {edition && (
                      <div className="mb-3">
                        <EditeurEquipe
                          agents={agents}
                          equipe={
                            edition.genre === 'existante'
                              ? equipes.find((e) => e.id === edition.id)
                              : undefined
                          }
                          onFini={() => {
                            setEdition(null)
                            void charger()
                          }}
                          onAnnuler={() => setEdition(null)}
                        />
                      </div>
                    )}

                    {equipes.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {equipes.map((e) => (
                          <VignetteEquipe
                            key={e.id}
                            equipe={e}
                            agents={e.membres
                              .map((m) => agents.find((a) => a.id === m))
                              .filter((a): a is Agent => !!a)}
                            // Ouvrir une equipe, c'est vouloir la CHANGER. Voir
                            // sa composition ne menait a rien qu'on puisse
                            // faire - c'est ce qui la faisait passer pour un
                            // ornement. L'organigramme reste accessible depuis
                            // les agents, ou il decrit tout le monde.
                            onOuvrir={() => setEdition({ genre: 'existante', id: e.id })}
                          />
                        ))}
                      </div>
                    ) : (
                      !edition && (
                        <p className="text-[11px] muted">
                          Aucune equipe. Elles servent a appeler plusieurs agents d un seul nom
                          dans la conversation - un confort, pas un passage oblige.
                        </p>
                      )
                    )}
                  </div>

                  {/* Les outils tiennent sous les agents, et pas dans un volet
                      a eux : c'est la meme question - « qui ai-je, et que
                      savent-ils faire ? ». Un outil qui manque a un agent est
                      un trou de competence, pas un reglage. */}
                  <div className="border-t border-slate-200 pt-4 dark:border-navy-800">
                    <OutilsEquipe nomsAgents={new Map(agents.map((a) => [a.id, a.nom]))} />
                  </div>

                  {/* Le cerveau tient au meme endroit, et pour la meme raison :
                      « qui ai-je, et que savent-ils faire ? ». Un agent sans
                      cerveau qui repond n'est pas mal regle, il est muet - et
                      c'est la panne du 5 aout, treize d'un coup. */}
                  <div className="border-t border-slate-200 pt-4 dark:border-navy-800">
                    <CerveauEquipe nomsAgents={new Map(agents.map((a) => [a.id, a.nom]))} />
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

                  {/* Le pole avait un compteur la ou l'equipe avait une
                      definition - « 2 poles - aucun en cours ». Un compteur
                      n'apprend rien, et le lecteur en concluait que les deux
                      etaient des variantes. Il dit maintenant ce qu'il EST, et
                      la phrase est volontairement dissymetrique de celle de
                      l'equipe : l'une nomme des gens, l'autre produit quelque
                      chose. */}
                  {/* « scenario » a l'ecran, `pole` dans le code - F6. Ce titre
                      etait passe au travers du chantier 2 : il disait « 12
                      poles » juste au-dessus d'une phrase qui commence par « Un
                      scenario ». Trouve en franchissant la porte du chantier 2,
                      pas en relisant le code - le mot du dedans ne se voit que
                      rendu. */}
                  <Entete
                    titre={`${poles.length} scenario${poles.length > 1 ? 's' : ''}`}
                    detail={
                      actifs > 0
                        ? `${actifs} en cours - des taches enchainees qui produisent un livrable`
                        : 'Un scenario : des taches enchainees qui produisent un livrable'
                    }
                  />

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
                            // Un chantier ouvert compte comme en cours meme
                            // entre deux taches : sans ca, la vignette
                            // clignoterait a chaque changement de vague.
                            p.enCours || chantiers.some((c) => c.pole === p.id && c.actif)
                              ? 'encours'
                              : p.finies === p.taches.length
                                ? 'fini'
                                : 'attente'
                          }
                          onOuvrir={() => onStudio(p.id)}
                          onSimuler={() => void simuler(p.id)}
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
          <Organigramme {...poleEnGraphe(poleOuvert, agents, vivant)} />

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
          // F20 : le message porte le geste. Sans ce rappel, il decrivait le
          // chemin - « ouvre-la dans le Studio » - et laissait chercher.
          onOuvrirEchouee={
            simuEchouee
              ? () => {
                  setSimuOuverte(false)
                  onStudio(simuEchouee)
                }
              : undefined
          }
          chantier={chantiers.find((c) => c.pole === simu?.pole.id) || null}
          accords={accords.filter((d) => d.pole === simu?.pole.id)}
          onAccord={(demande, agent, option) => void repondreAccord(demande, agent, option)}
          lancement={lancement}
          onLancer={() => void lancer()}
          onArreter={() => void arreterPole()}
          // Un retour au banc ecrit sur le tableau : la simulation affichee ne
          // decrit plus rien tant qu'elle n'a pas ete rejouee.
          onRafraichir={() => simu && void simuler(simu.pole.id)}
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
  /**
   * Ce qu'on avait deja fait de ce genre.
   *
   * La proactivite promise par le plan, et elle est deliberement timide : on
   * MONTRE ce qui avait marche, on ne substitue rien. Rejouer automatiquement
   * une forme sur une demande qui n'est pas tout a fait la meme donnerait un
   * plan que personne n'a demande, et personne ne saurait pourquoi.
   *
   * On interroge apres une pause : chaque frappe declencherait une lecture du
   * Coffre, et la fiche clignoterait pendant qu'on ecrit.
   */
  const [proches, setProches] = useState<Competence[]>([])
  useEffect(() => {
    const t = valeur.trim()
    if (t.length < 12) {
      setProches([])
      return
    }
    const minuteur = setTimeout(() => {
      void api
        .competences(t)
        .then(setProches)
        .catch(() => setProches([]))
    }, 600)
    return () => clearTimeout(minuteur)
  }, [valeur])

  return (
    <div data-zone="boite-demande" className="card space-y-2 p-3.5">
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

      {/* Ce qu'on avait deja fait de ce genre. La fiche est dans le Coffre :
          on donne son nom et sa forme, l'utilisateur juge. */}
      {proches.length > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-2.5 dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            Deja fait de ce genre
          </p>
          {proches.map((c) => (
            <p key={c.fichier} className="mt-1 text-[11px] leading-relaxed">
              <span className="font-medium">{c.titre}</span>
              <span className="muted">
                {' '}
                - {c.etapes} etape{c.etapes > 1 ? 's' : ''}, fiche dans le Coffre
              </span>
            </p>
          ))}
        </div>
      )}
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
    // Un agent eveille n'est pas un agent au travail : son pont est ouvert,
    // c'est tout. L'organigramme d'equipe ne parle pas de taches.
    etat: a.eveille ? 'eveille' : 'endormi',
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
  vivant: Map<string, EtatNoeud>,
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
      // `blocked` vient de `#bloquer` cote serveur : c'est un echec, donc du
      // rouge. `review` est une attente, donc de l'ambre. L'ancien code leur
      // donnait la meme bordure et effacait la difference.
      etat: vivant.get(t.id) ?? etatVisuel(t.etat),
      etiquette: ETATS_TACHE[t.etat] || t.etat,
    }
  })

  return { noeuds, liens: pole.liens, vide: 'Ce scenario n a aucune tache.', numeroter: true }
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
/**
 * Les agents qu'on ne retire pas, et pourquoi le bouton n'apparait meme pas.
 *
 * `default` est Hermes lui-meme - l'effacer emporterait le home et les
 * credentials du poste. `clean` est le bac a sable pose par l'installateur.
 * `agents.js` les refuse deja cote serveur ; montrer une poubelle qui echoue a
 * tous les coups serait pire qu'une poubelle absente.
 */
const INTOUCHABLES = new Set(['default', 'clean'])

function LigneAgent({ agent, onFait }: { agent: Agent; onFait: () => void }) {
  const style = { '--agent': `var(--jeton-${agent.couleur})` } as CSSProperties
  const [aRetirer, setARetirer] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const retirer = async () => {
    setOccupe(true)
    try {
      await api.retirerAgent(agent.id)
      notifier('success', `${agent.nom} a ete retire de l equipe.`)
      onFait()
    } catch (err) {
      notifier(
        'error',
        err instanceof ApiError ? err.message : "L agent n a pas pu etre retire.",
      )
    } finally {
      setOccupe(false)
      setARetirer(false)
    }
  }

  return (
    // Le fond reste celui de la carte : un aplat teinte par agent transformait
    // la liste en nuancier, et le texte y perdait son contraste. La couleur
    // vit dans le liseré et dans le point - assez pour identifier, jamais
    // assez pour gener la lecture.
    <div
      data-zone="fiche-agent"
      style={style}
      className="card lisere-agent rang relative flex items-start gap-3 overflow-hidden"
    >
      <span className="point-agent relative mt-1" />

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="texte-nom font-semibold">{agent.nom}</span>
          <span className="texte-detail uppercase tracking-wide muted">{agent.role}</span>
          {agent.eveille && <span className="puce puce-pleine sens-succes">eveille</span>}
          {!agent.pretAServir && <span className="puce sens-alerte">sans cle</span>}
        </div>

        <p className="texte-corps mt-0.5 muted">
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

        {/* La confirmation dit ce qui part, et elle le dit AVANT le clic qui
            compte : Hermes efface le profil, ses sessions et sa memoire propre,
            et il n'y a pas de corbeille derriere. Le nombre de taches en cours
            est rappele ici parce qu'il ne se devine pas - retirer un agent qui
            en tient laisserait un pole sans executant. */}
        {aRetirer && (
          <div className="mt-2 rounded-lg border border-rose-300 bg-rose-50/60 p-2.5 dark:border-rose-500/30 dark:bg-rose-500/10">
            <p className="text-[11px] font-semibold">Retirer {agent.nom} ?</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Hermes efface son profil, ses sessions et sa memoire. C est definitif : il n y a pas
              de corbeille pour un agent.
              {agent.taches > 0 && (
                <>
                  {' '}
                  Il tient encore <strong>{agent.taches} tache</strong>
                  {agent.taches > 1 ? 's' : ''} : le scenario qui les attend restera sans executant.
                </>
              )}
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setARetirer(false)}
                disabled={occupe}
                className="btn-ghost px-2 py-1 text-[11px]"
              >
                Annuler
              </button>
              <button
                onClick={() => void retirer()}
                disabled={occupe}
                className="btn-danger gap-1.5 px-2 py-1 text-[11px] disabled:opacity-40"
              >
                <Attente actif={occupe} />
                {occupe ? 'Retrait...' : 'Retirer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {!INTOUCHABLES.has(agent.id) && !aRetirer && (
        <button
          onClick={() => setARetirer(true)}
          title={`Retirer ${agent.nom} de l equipe`}
          className="btn-ghost relative flex-none px-1.5 py-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
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
  onSimuler,
}: {
  titre: string
  detail: string
  agents: Agent[]
  avancement?: { faites: number; total: number }
  etat?: 'encours' | 'fini' | 'attente'
  onOuvrir: () => void
  /** Le second geste de la vignette : voir avant, plutot qu'ouvrir. */
  onSimuler?: () => void
}) {
  const style = { '--agent': `var(--jeton-ciel)` } as CSSProperties
  const part = avancement && avancement.total > 0 ? avancement.faites / avancement.total : 0

  return (
    // `group` vit sur l'enveloppe, pas sur la carte : le bouton « Simuler » est
    // son frere, et un group-hover pose sur la carte ne l'atteindrait jamais.
    <div className="group relative">
    <button
      type="button"
      data-zone="vignette-scenario"
      onClick={onOuvrir}
      style={style}
      className="card lisere-agent-vignette relative w-full overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
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
    {/* La simulation se demande depuis la vignette, sans passer par le Studio :
        elle ne lance rien, elle montre ce que le graphe ferait. Un bouton dans
        un bouton serait du HTML invalide, d'ou les deux freres. */}
    {onSimuler && (
      <button
        type="button"
        onClick={onSimuler}
        title="Simuler ce scenario sans rien lancer"
        className="btn-ghost absolute bottom-2 right-2 gap-1 px-1.5 py-1 text-[10px] opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Play className="h-3 w-3" />
        Simuler
      </button>
    )}
    </div>
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
      data-zone="vignette-equipe"
      onClick={onOuvrir}
      style={style}
      className="card lisere-agent-vignette group relative overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
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
      <p className="text-sm font-medium">Aucun scenario pour l instant</p>
      <p className="mx-auto mt-1 max-w-md text-xs muted">
        {tableauPret
          ? "Un scenario nait d une demande : Hermes la decompose en taches liees, et le groupe qui en resulte apparait ici. Ton equipe, elle, est deja la."
          : 'Le tableau des taches ne peut pas etre lu, donc aucun scenario ne peut apparaitre. Ton equipe reste consultable.'}
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
