import { useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { LigneAlerte } from './components/LigneAlerte'
import { NewProjectModal } from './components/NewProjectModal'
import { BandeauProfil, PremiereFois } from './components/PremiereFois'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { api, ecouterChat } from './lib/api'
import { useRoute } from './hooks/useRoute'
import { CleanView } from './pages/CleanView'
import { ConfigView } from './pages/ConfigView'
import { HomeView } from './pages/HomeView'
import { OrchestrationView } from './pages/OrchestrationView'
import { StudioView } from './pages/StudioView'
import { ProjectDetail } from './pages/ProjectDetail'
import { ProjectsView } from './pages/ProjectsView'
import { TrashView } from './pages/TrashView'
import { VaultView } from './pages/VaultView'
import { useHubStore } from './store/useHubStore'
import type { Accueil, View } from './types'

export default function App() {
  const { route, navigate } = useRoute()
  const bootstrap = useHubStore((s) => s.bootstrap)
  const ready = useHubStore((s) => s.ready)
  const connected = useHubStore((s) => s.connected)
  const rafraichirAccords = useHubStore((s) => s.rafraichirAccords)
  const noterScenarioFini = useHubStore((s) => s.noterScenarioFini)

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
  }, [rafraichirAccords, noterScenarioFini])

  const [menuOpen, setMenuOpen] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [recherche, setRecherche] = useState(false)

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

  // Le Studio prend tout l'ecran : il sort du cadre a barre laterale au lieu
  // de s'y loger. C'est ce que dit le plan - le Hub est le centre de controle
  // leger, le Studio est la ou l'on fabrique, et cela ne se regarde pas par une
  // fenetre.
  //
  // Les notifications le suivent : elles vivaient dans le cadre commun, et le
  // Studio en sort. Depuis qu'on y remanie le graphe, un refus du tableau - un
  // lien qui ferme une boucle, un pole qui tourne - n'avait nulle part ou
  // s'afficher, et le geste semblait n'avoir simplement rien fait.
  if (route.view === 'studio') {
    return (
      <>
        <StudioView poleId={route.param ?? undefined} onQuitter={() => go('orchestration')} />
        <Toasts />
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
        {/* Sans croix, et il ne part qu'en allant choisir. La case « ne plus
            afficher » de la fenetre n'eteint QUE la fenetre : ceux qui la
            cochent sont exactement ceux qu'on veut atteindre. */}
        {accueil && !accueil.profilValide && route.view !== 'config' && (
          <BandeauProfil onAller={allerAuxQuestions} />
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
