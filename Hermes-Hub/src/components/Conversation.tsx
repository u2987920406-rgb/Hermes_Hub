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
  Check,
  ChevronDown,
  CornerDownRight,
  Filter,
  Loader2,
  Moon,
  Plus,
  Radio,
  Send,
  Square,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cleAccord, sansAccord } from '../lib/accords'
import { api } from '../lib/api'
import { ChampRecherche, aplatir } from './ChampRecherche'
import { InterrupteurMode } from './InterrupteurMode'
import { useHubStore } from '../store/useHubStore'
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
  TourRefus,
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
  /**
   * Ce qui tient la place du fil tant qu'on n'a rien dit - le champ venant
   * alors se poser dessous, au milieu de l'ecran plutot qu'en bas.
   *
   * C'est l'accueil du Hub : « Bonjour <prenom> » et le champ, rien d'autre.
   * La prop existe pour que cet ecran-la n'ait PAS sa propre conversation :
   * deux fils pour un meme interlocuteur finiraient par diverger, et on ne
   * retrouverait pas depuis Orchestration ce qu'on a demande depuis l'accueil.
   * Absente ailleurs - la conversation garde alors sa carte « Parle a ton
   * equipe », qui n'a pas de sens quand un salut occupe deja l'ecran.
   */
  accueil?: ReactNode
  /** Ce qui se pose SOUS le champ dans ce meme moment : les raccourcis. */
  accueilDessous?: ReactNode
  /** Previent l'ecran hote qu'on est encore au salut, ou qu'on l'a quitte. */
  onFilVide?: (vide: boolean) => void
}

export function Conversation({
  agents,
  equipes = [],
  filAOuvrir,
  onFilOuvert,
  onEveilChange,
  accueil,
  accueilDessous,
  onFilVide,
}: Props) {
  const [tours, setTours] = useState<Tour[]>([])
  const [saisie, setSaisie] = useState('')
  /** Les destinataires choisis a la pastille. Le texte tape reste souverain :
      ceux-ci ne le rejoignent qu'a l'envoi, et jamais en double. */
  const [vises, setVises] = useState<string[]>([])
  const [groupesVises, setGroupesVises] = useState<string[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [eveilles, setEveilles] = useState<Set<string>>(() => new Set())
  /**
   * ⚠ LES DEMANDES EN ATTENTE NE SONT PAS UN ETAT DE CE COMPOSANT - on lit, on
   * ne retient pas. Elles ont vecu ici en `useState`, remplies par l'evenement
   * `reprise` : au remontage, changer d'ecran suffisait a vider la liste, et la
   * carte disparaissait du fil pendant que l'agent attendait toujours. Un
   * Maquettiste y est reste le 05/08/2026. Le magasin, lui, reinterroge le
   * serveur a chaque evenement. Recit complet au §7 de `PLAN-DE-TRAVAIL.md`.
   */
  const autorisations = useHubStore((s) => s.demandes)
  const rafraichirAccords = useHubStore((s) => s.rafraichirAccords)
  const notify = useHubStore((s) => s.notify)
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

  /**
   * Le salut a-t-il cede la place ?
   *
   * On ne peut pas s'en remettre au seul fil : le message n'y entre qu'au
   * RETOUR du serveur, qui l'inscrit et le renvoie. L'accueil resterait donc
   * affiche pendant l'aller-retour, et on verrait le salut vaciller au lieu de
   * s'effacer net. On bascule a l'envoi, et on ne revient au salut qu'en
   * repartant d'une conversation neuve.
   */
  const [demarre, setDemarre] = useState(false)

  const bas = useRef<HTMLDivElement>(null)
  const champ = useRef<HTMLTextAreaElement>(null)
  const parId = new Map(agents.map((a) => [a.id, a]))

  /**
   * Qui travaille en ce moment - et pas seulement « quelqu'un travaille ».
   *
   * L'information existait deja dans le fil : un tour d'agent porte son nom et
   * reste `fini: false` jusqu'a son `tour-fin`. Elle ne servait qu'a basculer le
   * bouton d'envoi en bouton d'interruption, donc l'attente etait muette : on
   * savait qu'il fallait patienter, jamais apres qui. Sur une delegation a deux
   * agents, kuchu a attendu Louise et Gabriel sans que rien a l'ecran ne dise
   * qu'ils etaient au travail.
   */
  const travaillent = tours
    .filter((t) => t.role === 'agent' && !t.fini)
    .map((t) => (t as Extract<Tour, { role: 'agent' }>).agent)
    .filter((id, i, tous) => tous.indexOf(id) === i)
  const enCours = travaillent.length > 0

  /**
   * La fin du tour, dite au lieu d'etre devinee.
   *
   * L'indicateur « qui travaille » disparait quand tout est fini - mais une
   * disparition n'est pas un signal : on ne remarque pas ce qui s'arrete. Sur la
   * reunion a dix, Bruno a repondu en dernier et kuchu est reste devant l'ecran
   * a attendre un onzieme qui ne venait pas. Rien ne distinguait « c'est
   * termine » de « le suivant reflechit encore ».
   *
   * On mesure donc du premier reveil au dernier `tour-fin`, et on pose une
   * marque. Elle vaut pour ce qu'on a vu passer en direct : un fil relu n'a rien
   * en cours (le Hub a pu etre ferme au milieu d'un tour), et inventer une duree
   * a posteriori serait pire que se taire.
   */
  const [finDuTour, setFinDuTour] = useState<{ secondes: number; agents: number } | null>(null)
  const debut = useRef<number | null>(null)
  const vus = useRef(new Set<string>())
  const cleTravail = travaillent.join(',')

  useEffect(() => {
    if (enCours) {
      if (debut.current === null) {
        debut.current = Date.now()
        vus.current = new Set()
      }
      for (const id of cleTravail.split(',')) if (id) vus.current.add(id)
      setFinDuTour(null)
    } else if (debut.current !== null) {
      setFinDuTour({ secondes: (Date.now() - debut.current) / 1000, agents: vus.current.size })
      debut.current = null
    }
  }, [enCours, cleTravail])

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
      // `reprise` ne rend plus que l'eveil. Les demandes qu'il portait aussi
      // etaient la source qui mentait : elles ne survivaient pas au remontage.
      case 'reprise':
        setEveilles(new Set(e.agents.map((a) => a.agent)))
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

      case 'delegation-ignoree':
        setTours((t) => [
          ...t,
          { role: 'refus', de: agent, nom: e.nom, motif: 'annuaire', citees: e.citees },
        ])
        return

      case 'plafond-atteint':
        setTours((t) => [
          ...t,
          { role: 'refus', de: agent, nom: e.nom, motif: 'plafond', refuses: e.refuses, plafond: e.plafond },
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

      // `autorisation` et `tour-fin` ne touchent plus a la liste : le magasin
      // la reinterroge au serveur sur CHAQUE evenement, celui-ci compris.
      case 'autorisation':
        return

      case 'tour-fin':
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
    const texte = composer()
    if (!saisie.trim() || envoi) return
    // Le salut s'efface ici, pas au retour du serveur : voir `demarre`.
    setDemarre(true)
    setEnvoi(true)
    setErreur(null)
    try {
      await api.chatEnvoyer(texte)
      setSaisie('')
      setVises([])
      setGroupesVises([])
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnvoi(false)
      champ.current?.focus()
    }
  }

  /**
   * Choisir un destinataire ne touche plus au texte.
   *
   * Chaque agent choisi se posait DEVANT le message - `@${nom} ${s}` - et
   * chacun passait devant le precedent, donc l'ordre s'inversait en plus. Trois
   * agents et la phrase etait repoussee au bout d'une ligne de noms. kuchu, le
   * 03/08/2026 : « on voit les prenoms et les noms, plus notre message, c'est
   * brouillon. Une pastille de couleur, ca aurait ete bien. On est en France, on
   * ecrit de gauche a droite. »
   *
   * Le champ ne porte donc que ce qu'on ecrit ; les destinataires vivent a cote,
   * en pastilles, et ne rejoignent le texte qu'a l'envoi. Ce qui compte se lit
   * en premier.
   *
   * TAPER `@sofia` A LA MAIN CONTINUE DE MARCHER, et c'est ce qui evite deux
   * sources pour une meme chose : les pastilles ne font qu'AJOUTER au texte, et
   * une mention deja ecrite n'est pas doublee. Le texte reste la verite.
   */
  const mentionner = (a: Agent) => {
    const nom = a.id === 'default' ? 'hermes' : a.id
    setVises((v) => (v.includes(nom) ? v.filter((x) => x !== nom) : [...v, nom]))
    // La recherche se vide des qu'elle a servi : la garder ouverte laisserait
    // la barre filtree sur un mot dont on ne se souvient plus.
    setRecherche('')
    champ.current?.focus()
  }

  /** Appeler une equipe entiere : une seule mention, tout le monde se reveille. */
  const mentionnerEquipe = (e: Equipe) => {
    setGroupesVises((g) => (g.includes(e.nom) ? g.filter((x) => x !== e.nom) : [...g, e.nom]))
    champ.current?.focus()
  }

  /**
   * Le texte reellement envoye.
   *
   * Les mentions vont APRES le message : `lireMentions` les retire avant de
   * servir l'agent, donc leur place ne change rien a ce qu'il recoit - mais elle
   * change tout a ce qu'on relit dans le fil. Et un `@equipe Nom` pose en
   * dernier ne peut plus avaler les mots qui le suivent, puisqu'il n'y en a
   * plus.
   */
  const composer = () => {
    const dejaEcrites = (m: string) => saisie.toLowerCase().includes(`@${m.toLowerCase()}`)
    const bouts = [
      saisie.trim(),
      ...vises.filter((v) => !dejaEcrites(v)).map((v) => `@${v}`),
      ...groupesVises.filter((g) => !dejaEcrites(`equipe ${g}`)).map((g) => `@equipe ${g}`),
    ]
    return bouts.filter(Boolean).join(' ')
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
    // Un fil neuf rend le salut - et avec lui l'accueil du Hub entier, qui n'a
    // pas d'autre porte : « Nouvelle » est ce qui y ramene.
    setDemarre(false)
  }

  /** Ouvrir un fil neuf sans rien effacer : le prochain message repart de zero,
      meme si on s'adresse au meme interlocuteur. */
  const nouvelleConversation = async () => {
    await api.nouvelleConversation().catch(() => null)
    revenirAuDirect()
    void rafraichirFils()
  }

  const repondre = async (d: DemandeAutorisation & { agent: string }, option: string) => {
    const issue = await api.chatAutoriser(d.agent, d.demande, option).catch(() => null)
    // La course des toutes dernieres secondes : on a clique alors que la porte
    // venait de se refermer. Le silence serait ici la pire reponse - c'est
    // exactement le clic sans effet du 05/08, celui qui retirait la carte comme
    // si l'accord avait porte. On le dit, et la carte passera perimee au
    // rafraichissement juste apres.
    if (issue?.perimee) {
      notify('error', "Trop tard : Hermes avait deja referme cette demande. L'agent est reparti sans reponse.")
    }
    // On relit plutot que de retirer la carte a la main : si le serveur n'a pas
    // pris la reponse, elle doit RESTER a l'ecran. La faire disparaitre d'abord
    // ferait croire l'agent debloque alors qu'il attend toujours - c'est la
    // meme faute que celle qui a coute un agent le 05/08.
    await rafraichirAccords()
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

  /**
   * En Discussion, l'annuaire disparait - meme defaut que le menu d'equipes,
   * trouve en regardant : proposer « Chercher un nom ou un metier » sous une
   * phrase qui promet « personne ne se reveille » invite a un geste qui ne peut
   * pas aboutir. La maquette ne le montre qu'en Atelier (`sous-champ`).
   *
   * Mode inconnu (`null`) : on garde l'annuaire. Faire disparaitre l'equipe sur
   * un doute serait pire que de la laisser.
   */
  const enDiscussion = useHubStore((s) => s.modeConversation)?.mode === 'discussion'

  /** La rangee de pastilles est-elle a l'ecran ? Le menu d'equipes suit, parce
      qu'un filtre sans la liste qu'il trie n'a pas d'objet. */
  const rangeeVisible = Boolean((deplie || terme || equipeChoisie) && !enDiscussion)

  /**
   * Combien d'agents ce message va-t-il reveiller ?
   *
   * Ce que tu mentionnes n'est jamais tronque - dix agents mentionnes, dix
   * reveilles, mesure a moins de 6 s. Il n'y a donc pas de limite a poser, mais
   * il y a quelque chose a dire : chaque mention demarre un processus et paie un
   * appel modele. Au-dela d'une dizaine, ca merite d'etre vu avant d'appuyer,
   * pas devine apres.
   *
   * L'avertissement ne bloque rien : c'est une prevention, pas un garde-fou. Un
   * garde-fou sur ce que l'utilisateur demande explicitement serait de la
   * defiance.
   */
  const mentionnes = agents.filter((a) => {
    const n = aplatir(a.nom)
    return n && aplatir(saisie).includes('@' + n)
  }).length
  const beaucoupDeMonde = mentionnes > 10

  // --- rendu -----------------------------------------------------------------
  const filOuvert = fils.find((f) => f.id === filVu) || null

  /**
   * Le salut, au milieu, a la place du fil.
   *
   * Trois conditions, chacune sa raison : `accueil` parce que seul l'ecran
   * d'accueil en fournit un ; `demarre` parce qu'on bascule des l'envoi et non
   * au retour du serveur ; `filVu` parce qu'une conversation qu'on relit n'est
   * jamais un accueil, meme quand elle est vide.
   *
   * Le centrage ne deplace pas la barre de saisie : elle reste ou elle est
   * ecrite, et ce sont les deux espaces qui l'encadrent qui la poussent au
   * milieu. Un composant qui se recopie pour changer de place finit par diverger
   * de lui-meme - une correction sur un exemplaire, oubliee sur l'autre.
   */
  /**
   * ⚠ UN AGENT QUI ATTEND N'EST PAS UN ECRAN VIDE.
   *
   * Le salut remplace le fil - et les cartes d'autorisation vivent DANS le fil.
   * Trouve le 05/08/2026, juste apres avoir repare la source des demandes :
   * elles survivaient bien au changement d'ecran, mais restaient invisibles sur
   * l'Accueil, qui est justement l'ecran par defaut. La ligne d'alerte disait
   * « il est arrete tant que la reponse ne vient pas » au-dessus d'un
   * « Bonjour » - et le chrono de 60 s courait derriere.
   *
   * `autorisations.length` fait donc partie de la condition : tant qu'une
   * demande attend, on montre le fil, pas le salut.
   */
  const centre =
    Boolean(accueil) && !demarre && !filVu && tours.length === 0 && autorisations.length === 0

  // L'ecran hote a besoin de le savoir pour ce qu'il garde a l'oeil de son
  // cote : une automatisation tombee doit rester lisible une fois le salut parti.
  useEffect(() => {
    onFilVide?.(centre)
  }, [centre, onFilVide])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Une seule ligne de contexte : ce qu'on regarde, et de quoi repartir
            a zero. L'historique lui-meme vit dans le menu, a cote de la
            Conversation - pas dans un tiroir qui mange la largeur du fil.

            Elle s'absente du salut : « En direct » n'annonce rien tant que
            rien n'a ete dit, et une barre de plus au-dessus d'un ecran qu'on
            veut nu se remarque d'autant. */}
        {!centre && (
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
        )}

      {/* Le salut prend la place du fil, colle en bas de son espace - donc
          juste au-dessus du champ. */}
      {centre ? (
        <div
          data-zone="accueil-conversation"
          className="flex flex-1 flex-col justify-end overflow-y-auto px-4 pt-6 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">{accueil}</div>
        </div>
      ) : (
      <div data-zone="fil-conversation" className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* La carte « Parle a ton equipe » n'a pas lieu d'etre quand un salut
              occupe deja l'ecran - et elle apparaitrait le temps de l'aller-retour
              du premier message, juste apres que tout se soit efface. */}
          {tours.length === 0 && !accueil && <Accueil agents={agents} onMentionner={mentionner} />}

          {tours.map((tour, i) =>
            tour.role === 'moi' ? (
              <BulleMoi key={i} tour={tour} agents={parId} />
            ) : tour.role === 'delegation' ? (
              <TraceDelegation key={i} tour={tour} agents={parId} />
            ) : tour.role === 'refus' ? (
              <TraceRefus key={i} tour={tour} agent={parId.get(tour.de)} />
            ) : (
              <BulleAgent key={i} tour={tour} agent={parId.get(tour.agent)} />
            ),
          )}

          {autorisations.map((d) => (
            <Autorisation
              key={cleAccord(d)}
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

          {finDuTour && !enCours && <FinDuTour {...finDuTour} />}

          <div ref={bas} />
        </div>
      </div>
      )}

      {/* La barre de saisie : l'equipe, puis le champ.

          Sur le salut, elle perd son filet et son fond : posee au milieu de
          l'ecran, un trait au-dessus d'elle la ferait lire comme le bas d'une
          page vide plutot que comme le centre de l'attention. */}
      <div
        data-zone="barre-saisie"
        className={
          centre
            ? 'flex-none px-4 pt-4 sm:px-6'
            : 'flex-none border-t border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:px-6'
        }
      >
        {/* Sur le salut, l'ordre s'inverse : le champ d'abord, l'annuaire
            ensuite. Pose au-dessus, il tombait entre « Que veux-tu faire ? » et
            la ou l'on ecrit - donc exactement sur le chemin du regard, et une
            loupe placee la se lit comme la chose a faire en premier. */}
        <div
          className={
            centre ? 'mx-auto flex max-w-3xl flex-col gap-2' : 'mx-auto max-w-3xl space-y-2'
          }
        >
          <InterrupteurMode centre={centre} />

          <div
            className={`flex flex-wrap items-center gap-2 ${centre ? 'order-last' : ''} ${
              enDiscussion ? 'hidden' : ''
            }`}
          >
            {/**
             * Le menu d'equipes ne parait qu'avec la rangee qu'il filtre.
             *
             * Pose en permanence juste au-dessus du champ de saisie, il se
             * lisait comme le destinataire du message : « Tout le monde (16) » a
             * fait croire qu'un « salut tout le monde » partait aux seize
             * agents, alors qu'il allait a Hermes seul, qui repond au nom de
             * l'equipe. Renommer et poser un entonnoir attenuait le malentendu
             * sans le supprimer - **c'est la position qui trompe**, et un filtre
             * affiche sans la liste qu'il trie n'a de toute facon pas d'objet.
             *
             * La loupe, elle, reste toujours la : elle ne s'est jamais fait
             * passer pour un interlocuteur, et taper un nom ouvre la rangee tout
             * seul. C'est le geste courant - on ecrit a Hermes, on mentionne un
             * ou deux directeurs - alors qu'on trie par equipe rarement.
             */}
            {rangeeVisible && (
              <>
                <Filter className="h-3.5 w-3.5 flex-none muted" aria-hidden />
                <select
                  value={equipeVue}
                  onChange={(e) => {
                    setEquipeVue(e.target.value)
                    setRecherche('')
                  }}
                  className="input h-8 w-auto py-0 pr-7 text-[11px]"
                  title="Filtre la liste des agents affichee. Ne change pas a qui part ton message : sans mention, c est Hermes qui repond."
                >
                  <option value="">Afficher tous ({agents.length})</option>
                  {equipes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom} ({e.membres.length})
                    </option>
                  ))}
                </select>
              </>
            )}

            {equipeChoisie && !terme && (
              <button
                onClick={() => mentionnerEquipe(equipeChoisie)}
                className="btn-ghost h-8 px-2.5 text-[11px]"
                title={`Appeler les ${equipeChoisie.membres.length} membres d un coup`}
              >
                @equipe {equipeChoisie.nom}
              </button>
            )}

            <ChampRecherche
              valeur={recherche}
              onChange={setRecherche}
              placeholder="Chercher un nom ou un metier"
              quoi="Chercher un agent dans l annuaire"
              compte={terme ? { trouves: visibles.length, total: agents.length } : undefined}
              classe="flex-1 sm:max-w-[16rem]"
            />

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
          {rangeeVisible && (
            <div
              data-zone="rangee-agents"
              className={`flex flex-wrap items-center gap-1.5 ${centre ? 'order-last' : ''}`}
            >
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

          {enCours && <AuTravail agents={travaillent} parId={parId} />}

          {!enCours && beaucoupDeMonde && (
            <div data-zone="avertissement-convocation" className="bandeau sens-alerte text-[11px]">
              <AlertTriangle className="h-3.5 w-3.5 flex-none teinte-sens" />
              <span>
                Tu appelles <b>{mentionnes} agents</b>. Chacun demarre un processus et
                paie un appel modele - c est plus long et ca consomme d autant. Rien ne
                t en empeche : sans mention, Hermes repond seul au nom de l equipe.
              </span>
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
              /* F2 - « ton equipe » designait des inconnus, et en Discussion
                 elle ne se reveille meme pas. L'invite suit donc le mode :
                 promettre « personne ne se reveille » au-dessus d'un champ qui
                 dit « ecris a ton equipe » demandait de choisir laquelle des
                 deux phrases croire. Voir `maquette-parcours.html`, PLACEHOLDER. */
              placeholder={
                enDiscussion
                  ? 'Pose une question a Hermes.'
                  : 'Ecris a ton equipe. @nom pour appeler quelqu un.'
              }
              className="input max-h-40 min-h-[42px] flex-1 resize-y py-2.5"
            />

            {/* Les destinataires, A DROITE du champ - donc apres le message
                dans le sens de lecture. Une couleur et un nom court : on
                reconnait qui on appelle sans le relire. La croix retire, parce
                qu'un choix qu'on ne peut pas defaire n'est pas un choix. */}
            {(vises.length > 0 || groupesVises.length > 0) && (
              <div
                data-zone="destinataires"
                className="flex max-w-[45%] flex-wrap items-center justify-end gap-1 pb-1"
              >
                {vises.map((v) => {
                  const a = agents.find((x) => x.id === v || (v === 'hermes' && x.id === 'default'))
                  return (
                    <button
                      key={v}
                      onClick={() => setVises((l) => l.filter((x) => x !== v))}
                      style={{ ['--agent' as string]: `var(--jeton-${a?.couleur || 'ardoise'})` }}
                      className="flex items-center gap-1 rounded-full border border-slate-200 py-0.5 pl-1.5 pr-1 text-[10px] hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800"
                      title={`Retirer ${a?.nom || v}`}
                    >
                      <span className="point-agent flex-none" />
                      <span className="max-w-[7rem] truncate">{a?.nom || v}</span>
                      <X className="h-2.5 w-2.5 flex-none opacity-50" />
                    </button>
                  )
                })}
                {groupesVises.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupesVises((l) => l.filter((x) => x !== g))}
                    className="flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50/60 py-0.5 pl-1.5 pr-1 text-[10px] dark:border-sky-500/40 dark:bg-sky-500/10"
                    title={`Retirer l equipe ${g}`}
                  >
                    <Users className="h-2.5 w-2.5 flex-none" />
                    <span className="max-w-[7rem] truncate">{g}</span>
                    <X className="h-2.5 w-2.5 flex-none opacity-50" />
                  </button>
                ))}
              </div>
            )}
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

      {/* L'autre moitie de l'espace. Elle porte les raccourcis, et elle est ce
          qui met le champ au milieu : deux espaces egaux de part et d'autre,
          plutot qu'une marge calculee qui se decale a chaque hauteur d'ecran. */}
      {centre && (
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-6">
          <div className="mx-auto w-full max-w-3xl">{accueilDessous}</div>
        </div>
      )}
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
      case 'delegation-ignoree':
        tours = [
          ...tours,
          { role: 'refus', de: agent, nom: e.nom, motif: 'annuaire', citees: e.citees },
        ]
        break
      case 'plafond-atteint':
        tours = [
          ...tours,
          { role: 'refus', de: agent, nom: e.nom, motif: 'plafond', refuses: e.refuses, plafond: e.plafond },
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

/**
 * Les secondes qui restent avant qu'Hermes ne referme la demande.
 *
 * Rend `null` quand aucune echeance n'est connue - une demande d'une version
 * anterieure du serveur, ou un pont qui n'en pose pas. **Pas zero** : « on ne
 * sait pas » et « il ne reste rien » ne se ressemblent que dans un nombre, et
 * les confondre afficherait un compte a rebours fini sur une carte vivante.
 */
function useSecondesRestantes(echeance?: number) {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    if (!echeance) return
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [echeance])

  if (!echeance) return null
  return Math.max(0, Math.round((echeance - maintenant) / 1000))
}

/**
 * LA CARTE, ET SON ECHEANCE - la panne mesuree le 05/08/2026 a 16:02.
 *
 * Hermes referme une demande d'autorisation au bout de 60 s, et il ne le dit
 * pas : rien ne revient vers le Hub, le `future` est annule cote Python. La
 * carte restait donc a l'ecran avec ses deux boutons intacts, et le clic la
 * faisait disparaitre exactement comme un vrai accord - sauf que l'agent etait
 * reparti depuis longtemps, et avait ecrit le fichier par le terminal.
 *
 * Chronometre ce jour-la : carte posee a 16:02:48, porte refermee a 16:03:48,
 * carte enfin retiree a 16:05:02 **parce qu'on a clique dessus**. Soit 74
 * secondes pendant lesquelles l'ecran proposait un geste sans effet.
 *
 * D'ou les deux ajouts, et ils vont ensemble :
 *
 *   - **le compte a rebours**, visible AVANT l'echeance. C'est ce qui permet de
 *     savoir qu'il faut revenir maintenant. Une echeance qu'on ne decouvre
 *     qu'une fois passee n'a jamais aide personne ;
 *   - **l'etat perime**, qui remplace les boutons par ce qui s'est passe. On ne
 *     retire pas la carte : un ecran redevenu propre laisse croire qu'on n'a
 *     rien manque. C'est la meme lecon que le salut de l'accueil, retournee -
 *     un agent qui attend n'est pas un ecran vide, et un agent qui n'attend
 *     plus n'est pas une carte vivante.
 */
function Autorisation({
  demande,
  agent,
  onRepondre,
}: {
  demande: DemandeAutorisation & { agent: string }
  agent?: Agent
  onRepondre: (d: DemandeAutorisation & { agent: string }, option: string) => void
}) {
  const restantes = useSecondesRestantes(demande.echeance)

  // Le drapeau du serveur fait foi ; l'horloge locale ne sert qu'a ne pas
  // laisser les boutons vivants pendant le dixieme de seconde qui separe
  // l'echeance de l'evenement. Un clic dans cet intervalle partirait pour rien.
  const perimee = demande.perimee || restantes === 0

  return (
    <div
      data-zone="carte-autorisation"
      style={jetonDe(agent)}
      className={`card space-y-2 border-l-4 p-3 ${perimee ? 'opacity-70' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold">
          {agent?.nom || demande.agent} demande une autorisation
        </p>
        {!perimee && restantes !== null && (
          <span
            className="shrink-0 text-[11px] tabular-nums muted"
            title="Passe ce delai, Hermes referme la demande et repart sans reponse."
          >
            {restantes} s
          </span>
        )}
      </div>
      <p className="text-sm">{demande.titre}</p>
      {demande.detail && <p className="text-[11px] muted">{demande.detail}</p>}

      {perimee ? (
        // Le texte dit les deux choses qu'on ne peut pas deviner de l'ecran :
        // que le geste n'a plus d'effet, et que l'agent, lui, a continue.
        //
        // « au-dessus » et non « plus bas » : la carte se rend APRES les tours,
        // donc la trace de ce que l'agent a fait ensuite - le `printf` par le
        // terminal, mesure le 05/08 - paraissait au-dessus d'elle. Envoyer
        // chercher du mauvais cote est la faute exacte du commit « le panneau
        // qui dit ou chercher cherchait au mauvais endroit ».
        <p className="bandeau sens-alerte text-[11px]">
          Trop tard : Hermes a referme cette demande et l'agent est reparti sans
          reponse. Ce qu'il a fait ensuite est dans la trace de son tour,
          au-dessus.
        </p>
      ) : (
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
      )}
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
/**
 * Un appel qu'un garde-fou a refuse.
 *
 * Ces deux refus existaient depuis toujours cote serveur et ne se voyaient nulle
 * part : `delegation-ignoree` etait diffuse et meme type cote client, mais aucun
 * composant ne l'affichait ; le plafond total, lui, faisait un `return` sec.
 * Resultat, un agent demandait de l'aide, personne ne venait, et l'utilisateur
 * attendait une reponse qui ne viendrait jamais.
 *
 * La trace se pose dans le fil au meme endroit qu'une delegation reussie -
 * c'est le meme moment, celui ou quelqu'un devait etre reveille - mais en
 * `sens-alerte` : rien n'est casse, quelque chose n'a simplement pas eu lieu.
 */
function TraceRefus({ tour, agent }: { tour: TourRefus; agent?: Agent }) {
  return (
    <div
      data-zone="trace-refus"
      className="bandeau sens-alerte ml-6 text-[11px]"
      style={agent ? jetonDe(agent) : undefined}
    >
      <AlertTriangle className="h-3.5 w-3.5 flex-none teinte-sens" />
      <span>
        {tour.motif === 'annuaire' ? (
          /**
           * Ce que le detecteur SAIT, et rien de plus.
           *
           * Il comptait les mentions et concluait « l annuaire recopie, pas une
           * delegation », puis prescrivait « redemande-lui de choisir ». Le
           * 03/08/2026, Hermes venait de creer cinq agents et les ENUMERAIT :
           * il ne convoquait personne, et il n y avait rien a lui faire
           * choisir. Le detecteur avait raison de ne reveiller personne, et
           * tort sur la raison - il ne peut pas distinguer « voici mon equipe »
           * de « venez tous », il ne voit que des arobases.
           *
           * On dit donc le FAIT - au-dela de trois, on ne reveille personne -
           * et on laisse le lecteur juger, puisque lui a le texte sous les
           * yeux. Un avertissement qui se trompe de diagnostic apprend a se
           * faire ignorer, et le jour ou il vise juste il ne sera plus lu.
           */
          <>
            <b>{tour.nom}</b> a cite {tour.citees} agents dans une seule reponse.
            Au-dela de trois, le Hub n en reveille aucun : un modele qui en cite
            autant recopie souvent l annuaire au lieu de deleguer. S il voulait
            vraiment les faire travailler, appelle-les toi-meme avec @nom.
          </>
        ) : (
          <>
            <b>{tour.nom}</b> voulait appeler {(tour.refuses || []).join(', ')},
            mais la limite de {tour.plafond} agents pour un message est atteinte.
            Ils n ont pas ete reveilles - relance-les dans un nouveau message si
            tu en as besoin.
          </>
        )}
      </span>
    </div>
  )
}

/**
 * La barre de fin : plus personne ne parlera.
 *
 * Discrete par construction - un trait, une coche, un decompte. Elle ne felicite
 * pas et ne demande rien : elle ferme. Ce qu'elle remplace, c'est l'attente d'un
 * onzieme agent qui n'existait pas.
 *
 * Elle donne le nombre d'agents parce que c'est la question suivante : « tout le
 * monde a repondu ? ». Sur une reunion a dix, le compte dans la marque evite de
 * les recompter a la main dans le fil.
 */
function FinDuTour({ secondes, agents }: { secondes: number; agents: number }) {
  return (
    <div data-zone="fin-du-tour" className="flex items-center gap-3 pt-1" role="status">
      <div className="h-px flex-1 bg-slate-200 dark:bg-navy-800" />
      <span className="flex items-center gap-1.5 text-[10.5px] muted">
        <Check className="h-3 w-3 teinte-sens sens-succes" />
        {agents > 1 ? `${agents} agents ont repondu` : 'Reponse terminee'}
        <span className="tabular-nums">- {secondes.toFixed(1).replace('.', ',')} s</span>
      </span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-navy-800" />
    </div>
  )
}

/**
 * Qui travaille, et depuis combien de temps.
 *
 * Une delegation reveille un processus, charge un modele et attend une reponse :
 * c'est long, et rien ne bougeait a l'ecran pendant ce temps. Le bouton d'envoi
 * devenait bien un bouton d'interruption, mais il ne disait ni qui, ni depuis
 * quand - or « j'attends Louise depuis 12 s » et « il ne se passe rien » se
 * ressemblent enormement quand on regarde un ecran fixe.
 *
 * Les secondes comptent au lieu d'annoncer une duree, pour la meme raison que
 * le decompte du decoupage : la duree d'un tour depend du modele, du reveil a
 * froid et de la longueur de la reponse. On ne peut pas la promettre, on peut
 * montrer qu'elle avance.
 *
 * Le compteur repart quand la liste des agents change - sinon, Gabriel qui
 * prend la suite de Louise heriterait du temps d'attente de Louise.
 */
function AuTravail({ agents, parId }: { agents: string[]; parId: Map<string, Agent> }) {
  const cle = agents.join(',')
  const [depuis, setDepuis] = useState(() => Date.now())
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const t = Date.now()
    setDepuis(t)
    setMaintenant(t)
  }, [cle])

  useEffect(() => {
    const battement = setInterval(() => setMaintenant(Date.now()), 500)
    return () => clearInterval(battement)
  }, [])

  const secondes = Math.floor((maintenant - depuis) / 1000)
  const connus = agents.map((id) => parId.get(id))

  return (
    <div
      data-zone="agents-au-travail"
      className="flex items-center gap-2 px-1 text-[11px] muted"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 flex-none animate-spin text-sky-500" />

      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {connus.map((a, i) => (
          <span key={agents[i]} className="flex items-center gap-1">
            {a && <span className="point-agent point-agent-compact" style={jetonDe(a)} />}
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {a?.nom || agents[i]}
            </span>
            {i < connus.length - 2 ? <span>,</span> : i === connus.length - 2 ? <span>et</span> : null}
          </span>
        ))}
        <span>{connus.length > 1 ? 'travaillent' : 'travaille'}</span>
      </span>

      {/* `tabular-nums` fige la largeur : sans lui, la ligne entiere tremble a
          chaque seconde qui passe. */}
      <span className="ml-auto flex-none tabular-nums">{secondes} s</span>
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
