import { Suspense, lazy, useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { LigneAlerte } from './components/LigneAlerte'
import { NewProjectModal } from './components/NewProjectModal'
import { BandeauSession } from './components/BandeauSession'
import { BandeauProfil, PremiereFois } from './components/PremiereFois'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { api, ecouterChat } from './lib/api'
import { useRoute } from './hooks/useRoute'
import { CleanView } from './pages/CleanView'
import { ConfigView } from './pages/ConfigView'
import { HomeView } from './pages/HomeView'
import { OrchestrationView } from './pages/OrchestrationView'
import { ProjectDetail } from './pages/ProjectDetail'
import { ProjectsView } from './pages/ProjectsView'
import { TrashView } from './pages/TrashView'
import { VaultView } from './pages/VaultView'
import { useHubStore } from './store/useHubStore'
import type { Accueil, View } from './types'

/**
 * LE STUDIO NE SE CHARGE QU'EN Y ENTRANT - V4, mesuree le 4 aout 2026.
 *
 * Il porte `@xyflow/react`, la plus grosse dependance du Hub, et **on ne va
 * dans le Studio qu'apres avoir valide un plan.** Le faire venir au demarrage
 * fait payer a l'accueil - le premier ecran, celui qu'on regarde en attendant -
 * une bibliotheque de graphe que la plupart des sessions n'ouvriront jamais.
 *
 * | | Avant | Apres |
 * |---|---|---|
 * | JavaScript initial | 573,6 ko | **368,2 ko**, soit **-36 %** |
 * | idem, compresse | 171,4 ko | 105,0 ko |
 * | avertissement Vite « > 500 ko » | present | disparu |
 *
 * `Suspense` ne montre rien : le Studio prend tout l'ecran et arrive en une
 * fraction de seconde depuis le disque local. Un voile qui clignote au passage
 * se remarquerait plus que l'attente qu'il pretend couvrir.
 */
const StudioView = lazy(() =>
  import('./pages/StudioView').then((m) => ({ default: m.StudioView })),
)

export default function App() {
  const { route, navigate } = useRoute()
  const bootstrap = useHubStore((s) => s.bootstrap)
  const ready = useHubStore((s) => s.ready)
  const connected = useHubStore((s) => s.connected)
  const rafraichirAccords = useHubStore((s) => s.rafraichirAccords)
  const noterScenarioFini = useHubStore((s) => s.noterScenarioFini)
  const chargerMode = useHubStore((s) => s.chargerMode)

  /**
   * Les demandes en attente, tenues au niveau de l'application.
   *
   * Ici et pas dans un ecran : une question qui bloque un scenario doit se voir
   * depuis les Projets, le Coffre ou la Configuration - c'est-a-dire depuis
   * l'endroit ou l'on est justement parti. Un ecran qui la porte ne la montre
   * qu'a ceux qui l'ont deja trouvee.
   *
   * On ne compte pas les evenements, on RELIT le serveur a chacun : ils disent
   * bien quand une demande arrive, jamais de facon fiable quand elle s'en va.
   *
   * LA FIN D'UN SCENARIO, ELLE, NE SE RELIT PAS. `chantier-fin` ne passe qu'une
   * fois et rien sur le disque ne dit ensuite « c'etait fini » : on l'attrape
   * donc au vol pour en garder une trace (C5). C'est le seul endroit du Hub qui
   * retient un evenement plutot que de reinterroger - et c'est assume, parce
   * qu'il n'y a rien a interroger.
   */
  useEffect(() => {
    void rafraichirAccords()
    return ecouterChat((e) => {
      void rafraichirAccords()
      /**
       * LE MODE CHANGE AILLEURS : L'INTERRUPTEUR DOIT SUIVRE.
       *
       * ⚠ Le serveur diffusait `mode-conversation-reglage` depuis le debut, avec
       * ce commentaire a cote : « deux onglets ouverts sur le meme Hub ne
       * peuvent pas afficher des garanties contraires ». **Personne ne
       * l'ecoutait.** La promesse etait ecrite, pas tenue - et invisible tant
       * que le seul moyen de changer de mode etait de cliquer l'interrupteur
       * lui-meme, qui met son propre etat a jour.
       *
       * Vu a l'ecran le 06/08/2026 : la bascule proposee par une carte de plan
       * a fait passer le Hub en Atelier, la carte s'est ouverte avec ses trois
       * boutons - et l'interrupteur affichait toujours « Discussion · Hermes
       * seul. Personne ne se reveille ». Deux affirmations contraires sur le
       * meme ecran, dont une fausse. C'est exactement l'interrupteur qui ment,
       * celui qu'on a refuse d'ecrire le 05/08.
       */
      if (e.type === 'mode-conversation-reglage') void chargerMode()
      if (e.type === 'chantier-fin') {
        noterScenarioFini({
          titre: e.titre,
          faites: e.faites,
          echouees: e.echouees,
          restantes: e.restantes,
          arrete: e.arrete,
        })
      }
    })
  }, [rafraichirAccords, noterScenarioFini, chargerMode])

  const [menuOpen, setMenuOpen] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [recherche, setRecherche] = useState(false)
  /** Le Studio, agrandi hors du cadre commun. Transitoire : voir plus bas. */
  const [studioPlein, setStudioPlein] = useState(false)

  /**
   * L'etat d'accueil vient du SERVEUR, pas du navigateur.
   *
   * Un `localStorage` se vide en changeant de navigateur ou en nettoyant ses
   * donnees, et la fenetre reviendrait chez quelqu'un qui a deja tout rempli.
   * `null` tant qu'on ne sait pas : sans ca, le bandeau clignoterait a chaque
   * chargement avant la reponse.
   */
  const [accueil, setAccueil] = useState<Accueil | null>(null)
  const [fenetre, setFenetre] = useState(false)
  /** Vrai quand on arrive sur Configuration par la fenetre ou le bandeau :
      l'ecran s'ouvre alors sur les questions, pas sur l'onglet general. */
  const [versQuiJeSuis, setVersQuiJeSuis] = useState(false)

  const allerAuxQuestions = () => {
    setVersQuiJeSuis(true)
    setFenetre(false)
    go('config')
  }

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    api
      .accueil()
      .then((a) => {
        setAccueil(a)
        // La fenetre ne s'ouvre que si les DEUX manquent : quelqu'un qui a
        // choisi son profil sans jamais voir la fenetre n'a plus rien a y
        // apprendre.
        if (!a.fenetreVue && !a.profilValide) setFenetre(true)
      })
      .catch(() => setAccueil(null))
  }, [])

  /**
   * Relu en quittant Configuration.
   *
   * C'est la qu'on repond aux questions, et l'etat change cote serveur sans que
   * cet ecran-ci le sache. Sans cette relecture, le bandeau rouge continuerait
   * d'annoncer qu'Hermes ne sait pas qui vous etes a quelqu'un qui vient de le
   * lui dire - un avertissement qui ment est pire que pas d'avertissement.
   */
  useEffect(() => {
    if (route.view === 'config') return
    api.accueil().then(setAccueil).catch(() => null)
  }, [route.view])

  /**
   * UNE PANNE D'AGENT EST LE MOMENT OU UNE SESSION EXPIREE SE REVELE.
   *
   * Le bandeau lu au chargement ne suffit pas : une session ne meurt pas quand
   * on ouvre le Hub, elle meurt en cours de journee - le 05/08 a 16:09, entre
   * deux demandes. Sans cette relecture, il faudrait recharger la page pour
   * apprendre pourquoi les agents se taisent, c'est-a-dire deviner qu'il y a
   * quelque chose a apprendre.
   *
   * ⚠ ON RELIT, ON NE DEDUIT PAS. L'evenement `panne` dit qu'un agent est
   * tombe, pas pourquoi : c'est `auth.json` qui le sait, et lui seul. Deduire
   * la cause du message afficherait « reconnecte-toi » sur n'importe quelle
   * panne - et une consigne qui se trompe une fois n'est plus suivie ensuite.
   *
   * Effet separe, et apres la declaration de `setAccueil` : un tableau de
   * dependances qui cite une constante declaree plus bas jette a l'execution,
   * et l'ecran resterait blanc.
   */
  useEffect(() => ecouterChat((e) => {
    if (e.type === 'panne') api.accueil().then(setAccueil).catch(() => null)
  }), [])

  // Ctrl+K (Cmd+K sur Mac) ouvre la recherche depuis n'importe quel ecran.
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setRecherche((ouvert) => !ouvert)
      }
    }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [])

  // close the mobile drawer on navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [route.view, route.param])

  // Quitter le Studio ramene au cadre : un ecran suivant qui s'ouvrirait
  // agrandi heriterait d'un geste qui ne le concernait pas.
  useEffect(() => {
    if (route.view !== 'studio') setStudioPlein(false)
  }, [route.view])

  const go = (view: View, param?: string) => navigate(view, param)

  const renderView = () => {
    switch (route.view) {
      case 'projects':
        return (
          <ProjectsView
            onNewProject={() => setNewProject(true)}
            onOpenProject={(id) => go('project', id)}
            onMenu={() => setMenuOpen(true)}
          />
        )
      case 'project':
        return route.param ? (
          <ProjectDetail
            projectId={route.param}
            onBack={() => go('projects')}
            onMenu={() => setMenuOpen(true)}
          />
        ) : (
          <ProjectsView
            onNewProject={() => setNewProject(true)}
            onOpenProject={(id) => go('project', id)}
            onMenu={() => setMenuOpen(true)}
          />
        )
      case 'orchestration':
        return (
          <OrchestrationView
            onMenu={() => setMenuOpen(true)}
            onStudio={(poleId) => go('studio', poleId)}
          />
        )
      case 'studio':
        return (
          <Suspense fallback={null}>
            <StudioView
              poleId={route.param ?? undefined}
              onQuitter={() => go('orchestration')}
              plein={false}
              onPlein={setStudioPlein}
              onMenu={() => setMenuOpen(true)}
            />
          </Suspense>
        )
      case 'clean':
        return <CleanView onMenu={() => setMenuOpen(true)} />
      case 'vault':
        return <VaultView onMenu={() => setMenuOpen(true)} noteAOuvrir={route.param} />
      case 'trash':
        return <TrashView onMenu={() => setMenuOpen(true)} />
      case 'config':
        return (
          <ConfigView
            onMenu={() => setMenuOpen(true)}
            versQuiJeSuis={versQuiJeSuis}
            onNavigate={(view) => go(view)}
          />
        )
      default:
        return <HomeView onNavigate={go} onMenu={() => setMenuOpen(true)} />
    }
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="text-center">
          <img src="./hermes-hub.png" alt="" className="mx-auto h-16 w-16 animate-pulse object-contain" />
          <p className="mt-4 text-sm muted">Chargement du workspace...</p>
        </div>
      </div>
    )
  }

  /**
   * LE STUDIO VIT DANS LE CADRE COMMUN, ET S'EN ECHAPPE A LA DEMANDE.
   *
   * Il en sortait toujours - « le Hub est le centre de controle leger, le
   * Studio est la ou l'on fabrique, et cela ne se regarde pas par une
   * fenetre ». C'etait vrai de l'edition, faux du reste : on y passe aussi pour
   * REGARDER tourner un scenario, et on en repart. Sortir du cadre a chaque
   * fois faisait disparaitre la barre laterale, la ligne d'alerte et le chemin
   * de retour pour un geste qui n'en demandait pas tant.
   *
   * Le plein ecran devient donc un GESTE, `Maximize2` / `Minimize2`, la meme
   * paire et le meme sens que dans la fenetre de simulation. Il n'est pas
   * retenu d'une session a l'autre, et c'est voulu : agrandir repond a ce qu'on
   * fait maintenant, pas a une preference. Un repli se retient, un
   * agrandissement non - `GRAMMAIRE-PANNEAUX.md`, les trois familles.
   *
   * Ce que le plein ecran casse, il le repare lui-meme : le hamburger reparait
   * des qu'il n'y a plus de barre laterale, et la ligne d'alerte se pose dans
   * la barre du scenario (F13). Les deux sont dans `StudioView`, commandes par
   * `plein`.
   */
  if (route.view === 'studio' && studioPlein) {
    return (
      <>
        <Suspense fallback={null}>
          <StudioView
            poleId={route.param ?? undefined}
            onQuitter={() => go('orchestration')}
            plein
            onPlein={setStudioPlein}
            onMenu={() => setMenuOpen(true)}
          />
        </Suspense>
        {/* Les notifications suivent le Studio hors du cadre : depuis qu'on y
            remanie le graphe, un refus du tableau - un lien qui ferme une
            boucle, un scenario qui tourne - n'aurait nulle part ou s'afficher,
            et le geste semblerait n'avoir simplement rien fait. */}
        <Toasts />
        {/* En tiroir : plein ecran, il n'y a plus de colonne a lui donner. Elle
            glisse par-dessus au hamburger, et elle repart. */}
        <Sidebar
          current={route.view}
          onNavigate={(view) => go(view)}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onRechercher={() => setRecherche(true)}
          tiroir
        />
        <CommandPalette open={recherche} onClose={() => setRecherche(false)} onNavigate={go} />
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-navy-950">
      <Sidebar
        current={route.view}
        onNavigate={(view) => go(view)}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onRechercher={() => setRecherche(true)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!connected && (
          <div className="flex-shrink-0 bg-red-600 px-4 py-2 text-center text-xs font-medium text-white">
            Le serveur du Hub ne repond pas. Ferme cette page et relance le raccourci Hermes Hub.
          </div>
        )}
        {/* Une seule ligne, toujours au meme endroit : sous le bandeau de
            serveur injoignable, au-dessus de l'ecran. Elle est ici et pas dans
            chaque ecran precisement pour qu'elle ne puisse pas se deplacer d'un
            ecran a l'autre - c'est ce qui permet de la reconnaitre sans la
            lire. Le Studio, qui sort de ce cadre, la repose lui-meme dans sa
            barre de scenario. */}
        <LigneAlerte />
        {/*
          UN SEUL BANDEAU DE CONFIGURATION, ET LA SESSION PASSE DEVANT.
          Un profil non choisi fait repondre Hermes A COTE ; une session expiree
          fait qu'il NE REPOND PAS. Le silence passe devant l'imprecision, et
          empiler les deux ferait deux affirmations sur le meme sujet - ce que
          la grammaire refuse depuis la ligne d'alerte.

          Sans croix, et il ne part qu'en reglant. La case « ne plus afficher »
          de la fenetre n'eteint QUE la fenetre : ceux qui la cochent sont
          exactement ceux qu'on veut atteindre.
        */}
        {accueil?.session ? (
          <BandeauSession session={accueil.session} />
        ) : (
          accueil &&
          !accueil.profilValide &&
          route.view !== 'config' && <BandeauProfil onAller={allerAuxQuestions} />
        )}
        {renderView()}
      </main>

      <CommandPalette open={recherche} onClose={() => setRecherche(false)} onNavigate={go} />

      {newProject && (
        <NewProjectModal
          onClose={() => setNewProject(false)}
          onCreated={(id) => go('project', id)}
        />
      )}

      {fenetre && <PremiereFois onFermer={() => setFenetre(false)} onAller={allerAuxQuestions} />}

      <Toasts />
    </div>
  )
}
