import { BookOpen, FolderOpen, Home, Settings, Sparkles, X } from 'lucide-react'
import { useHubStore } from '../store/useHubStore'
import type { View } from '../types'

interface SidebarProps {
  current: View
  onNavigate: (view: View) => void
  open: boolean
  onClose: () => void
}

const NAV: { id: View; label: string; icon: typeof Home; accent: string }[] = [
  { id: 'home', label: 'Accueil', icon: Home, accent: 'text-sky-300' },
  { id: 'projects', label: 'Projets', icon: FolderOpen, accent: 'text-violet-300' },
  { id: 'clean', label: 'Clean Agent', icon: Sparkles, accent: 'text-teal-300' },
  { id: 'vault', label: 'Vault Obsidian', icon: BookOpen, accent: 'text-gold-400' },
  { id: 'config', label: 'Configuration', icon: Settings, accent: 'text-slate-300' },
]

export function Sidebar({ current, onNavigate, open, onClose }: SidebarProps) {
  const connected = useHubStore((s) => s.connected)
  const workspace = useHubStore((s) => s.workspace)

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-white/10
                    bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 transition-transform duration-200
                    lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <img src="./hermes-hub.png" alt="" className="h-10 w-10 flex-shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-white">Hermes Hub</h1>
            <p className="truncate text-[10px] text-sky-400/90">Agent IA + Obsidian</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map(({ id, label, icon: Icon, accent }) => {
            const active = current === id || (id === 'projects' && current === 'project')
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? 'border-sky-400 bg-white/10 text-white'
                    : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-sky-300' : accent}`} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${
                connected ? 'animate-pulse bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span className="text-[10px] font-medium text-slate-300">
              {connected ? 'Serveur connecte' : 'Serveur injoignable'}
            </span>
          </div>
          {workspace && (
            <p className="break-all text-[10px] leading-tight text-slate-500" title={workspace}>
              {workspace}
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
