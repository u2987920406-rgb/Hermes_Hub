import {
  BookOpen,
  CheckCircle2,
  FolderOpen,
  Landmark,
  Moon,
  Play,
  Sparkles,
  Sun,
} from 'lucide-react'
import { Automatisations } from '../components/Automatisations'
import { PageHeader } from '../components/PageHeader'
import { useHubStore } from '../store/useHubStore'
import type { Theme, View } from '../types'
import { THEMES } from '../types'

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

  // Le bouton fait defiler les themes : clair -> sombre -> antique -> clair.
  // L'icone montre le theme vers lequel on va, comme l'infobulle : montrer le
  // theme courant pendant que le clic mene ailleurs induisait en erreur.
  const theme: Theme = config?.theme ?? 'light'
  const suivant = THEMES[(THEMES.findIndex((t) => t.value === theme) + 1) % THEMES.length]
  const ICONES: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, antique: Landmark }
  const IconeTheme = ICONES[suivant.value]

  const recent = projects.slice(0, 4)

  const tiles = [
    { label: 'Projets', value: stats?.projects ?? 0, icon: FolderOpen, tone: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300' },
    // Meme code couleur que les pastilles des cartes projet (voir statusClasses).
    { label: 'En cours', value: stats?.active ?? 0, icon: Play, tone: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300' },
    { label: 'Termines', value: stats?.done ?? 0, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300' },
    { label: 'Notes du coffre', value: stats?.notes ?? 0, icon: BookOpen, tone: 'text-gold-600 bg-gold-300/40 dark:bg-gold-500/15 dark:text-gold-300' },
  ]

  return (
    <div data-zone="ecran-accueil" className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title={config?.userName ? `Bonjour ${config.userName}` : 'Bonjour'}
        subtitle="Que veux-tu faire aujourd'hui ?"
        onMenu={onMenu}
        actions={
          <button
            onClick={() => setTheme(suivant.value)}
            /* Discret : pas de pastille pleine, l'icone se fond dans le
               bandeau et ne se revele qu'au survol. */
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-navy-600 dark:hover:bg-navy-800 dark:hover:text-slate-300"
            title={`Passer au theme ${suivant.label}`}
            aria-label={`Passer au theme ${suivant.label}`}
          >
            <IconeTheme className="h-4 w-4" />
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
                <h3 className="text-base font-bold sm:text-lg">Discuter avec Hermes</h3>
                <p className="mt-1 text-xs muted sm:text-sm">
                  Ouvre un terminal pour discuter avec Hermes
                </p>
                <p className="exemple mt-2 text-[11px] italic leading-relaxed">
                  ex : «&nbsp;revue du coffre memoire, gestion des agents, question hors projet,
                  simplement discuter d'une idee...&nbsp;»
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
                  Session vierge, sans memoire ni contexte : Hermes brut, pour tester
                </p>
                <p className="exemple mt-2 text-[11px] italic leading-relaxed">
                  ex : «&nbsp;verifier le comportement d'Hermes par defaut, essayer une idee sans
                  laisser de trace, reproduire un bug hors contexte...&nbsp;»
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

          {/* Ce qui tournera sans toi, avant ce que tu as fait toi-meme : une
              automatisation en echec doit se voir en ouvrant le Hub, pas se
              chercher. La section s'efface d'elle-meme s'il n'y a rien a dire. */}
          <Automatisations />

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
