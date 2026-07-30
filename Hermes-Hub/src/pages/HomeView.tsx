import { BookOpen, CheckCircle2, FolderOpen, Moon, Play, Sparkles, Sun } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { useHubStore } from '../store/useHubStore'
import type { View } from '../types'

interface Props {
  onNavigate: (view: View, param?: string) => void
  onMenu: () => void
}

export function HomeView({ onNavigate, onMenu }: Props) {
  const stats = useHubStore((s) => s.stats)
  const config = useHubStore((s) => s.config)
  const projects = useHubStore((s) => s.projects)
  const launchHermes = useHubStore((s) => s.launchHermes)
  const setTheme = useHubStore((s) => s.setTheme)

  const dark = config?.theme === 'dark'
  const recent = projects.slice(0, 4)

  const tiles = [
    { label: 'Projets', value: stats?.projects ?? 0, icon: FolderOpen, tone: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300' },
    { label: 'En cours', value: stats?.active ?? 0, icon: Play, tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300' },
    { label: 'Termines', value: stats?.done ?? 0, icon: CheckCircle2, tone: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300' },
    { label: 'Notes vault', value: stats?.notes ?? 0, icon: BookOpen, tone: 'text-gold-600 bg-gold-300/40 dark:bg-gold-500/15 dark:text-gold-300' },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title={config?.userName ? `Bonjour ${config.userName}` : 'Bonjour'}
        subtitle="Que veux-tu faire aujourd'hui ?"
        onMenu={onMenu}
        actions={
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="btn-ghost px-2.5 py-2"
            title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            aria-label="Changer de theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => launchHermes({})}
              className="card group flex items-center gap-4 p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-col sm:text-center"
            >
              <img
                src="./hermes-master.png"
                alt=""
                className="h-16 w-16 flex-shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
              />
              <div className="min-w-0">
                <h3 className="text-base font-bold sm:text-lg">Lancer Hermes</h3>
                <p className="mt-1 text-xs muted sm:text-sm">
                  Ouvre un terminal avec ta memoire et tes projets
                </p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('clean')}
              className="card group flex items-center gap-4 p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-col sm:text-center"
            >
              <img
                src="./hermes-clean.png"
                alt=""
                className="h-16 w-16 flex-shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
              />
              <div className="min-w-0">
                <h3 className="text-base font-bold sm:text-lg">Clean Agent</h3>
                <p className="mt-1 text-xs muted sm:text-sm">
                  Session vierge, sans memoire, pour tester
                </p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="card flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs muted">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Projets recents</h3>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                Tout voir
              </button>
            </div>

            {recent.length === 0 ? (
              <div className="card p-8 text-center">
                <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-navy-700" />
                <p className="text-sm muted">Aucun projet pour le moment.</p>
                <button onClick={() => onNavigate('projects')} className="btn-primary mt-4">
                  Creer mon premier projet
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recent.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onNavigate('project', project.id)}
                    className="card flex items-center gap-3 p-4 text-left transition-shadow hover:shadow-md"
                  >
                    <Sparkles className="h-4 w-4 flex-shrink-0 text-gold-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <p className="truncate text-xs muted">
                        {project.description || 'Aucune description.'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
