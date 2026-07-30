import { FolderOpen, FolderPlus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { ProjectCard } from '../components/ProjectCard'
import { useHubStore } from '../store/useHubStore'
import type { ProjectStatus } from '../types'

interface Props {
  onNewProject: () => void
  onOpenProject: (id: string) => void
  onMenu: () => void
}

const FILTERS: { id: 'all' | ProjectStatus; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'En cours' },
  { id: 'done', label: 'Termines' },
]

export function ProjectsView({ onNewProject, onOpenProject, onMenu }: Props) {
  const projects = useHubStore((s) => s.projects)
  const openFolder = useHubStore((s) => s.openFolder)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    })
  }, [projects, query, filter])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Mes projets"
        subtitle={`${projects.length} projet${projects.length > 1 ? 's' : ''} sur le disque`}
        onMenu={onMenu}
        actions={
          <>
            <button
              onClick={() => openFolder({ target: 'workspace' })}
              className="btn-ghost hidden px-3 py-2 text-xs sm:inline-flex"
              title="Ouvrir le dossier Projets"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <button onClick={onNewProject} className="btn-primary px-3 py-2 text-xs">
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau projet</span>
            </button>
          </>
        }
      />

      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:flex-row sm:items-center sm:px-6">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher un projet..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher un projet"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-navy-950">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:flex-none ${
                filter === id
                  ? 'bg-white text-navy-900 shadow-sm dark:bg-navy-800 dark:text-white'
                  : 'muted hover:text-navy-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {visible.length === 0 ? (
          <div className="card mx-auto max-w-md p-10 text-center">
            <FolderOpen className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-navy-700" />
            <p className="text-sm muted">
              {projects.length === 0
                ? 'Aucun projet pour le moment.'
                : 'Aucun projet ne correspond a cette recherche.'}
            </p>
            {projects.length === 0 && (
              <button onClick={onNewProject} className="btn-primary mt-4">
                <FolderPlus className="h-4 w-4" /> Creer le premier projet
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
