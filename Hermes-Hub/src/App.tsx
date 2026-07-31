import { useEffect, useState } from 'react'
import { CommandPalette } from './components/CommandPalette'
import { NewProjectModal } from './components/NewProjectModal'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import { useRoute } from './hooks/useRoute'
import { CleanView } from './pages/CleanView'
import { ConfigView } from './pages/ConfigView'
import { HomeView } from './pages/HomeView'
import { ProjectDetail } from './pages/ProjectDetail'
import { ProjectsView } from './pages/ProjectsView'
import { TrashView } from './pages/TrashView'
import { VaultView } from './pages/VaultView'
import { useHubStore } from './store/useHubStore'
import type { View } from './types'

export default function App() {
  const { route, navigate } = useRoute()
  const bootstrap = useHubStore((s) => s.bootstrap)
  const ready = useHubStore((s) => s.ready)
  const connected = useHubStore((s) => s.connected)

  const [menuOpen, setMenuOpen] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [recherche, setRecherche] = useState(false)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

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
      case 'clean':
        return <CleanView onMenu={() => setMenuOpen(true)} />
      case 'vault':
        return <VaultView onMenu={() => setMenuOpen(true)} noteAOuvrir={route.param} />
      case 'trash':
        return <TrashView onMenu={() => setMenuOpen(true)} />
      case 'config':
        return <ConfigView onMenu={() => setMenuOpen(true)} />
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
        {renderView()}
      </main>

      <CommandPalette open={recherche} onClose={() => setRecherche(false)} onNavigate={go} />

      {newProject && (
        <NewProjectModal
          onClose={() => setNewProject(false)}
          onCreated={(id) => go('project', id)}
        />
      )}

      <Toasts />
    </div>
  )
}
