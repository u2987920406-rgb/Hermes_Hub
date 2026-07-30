import {
  BookOpen,
  FolderOpen,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useHubStore } from '../store/useHubStore'
import type { View } from '../types'

interface SidebarProps {
  current: View
  onNavigate: (view: View) => void
  open: boolean
  onClose: () => void
}

interface NavItem {
  id: View
  label: string
  icon: typeof Home
  accent: string
}

// Clean Agent n'est pas ici : on y entre par sa carte sur l'accueil, deux
// portes d'entree pour le meme ecran alourdissaient le menu pour rien.
const NAV: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home, accent: 'text-sky-300' },
  { id: 'projects', label: 'Projets', icon: FolderOpen, accent: 'text-violet-300' },
  { id: 'vault', label: 'Coffre memoire', icon: BookOpen, accent: 'text-gold-400' },
]

// Corbeille et reglages : en bas, separes de la navigation courante.
const CORBEILLE: NavItem = {
  id: 'trash',
  label: 'Corbeille',
  icon: Trash2,
  accent: 'text-rose-300',
}

const CONFIG: NavItem = {
  id: 'config',
  label: 'Configuration',
  icon: Settings,
  accent: 'text-slate-300',
}

function NavButton({
  item,
  active,
  onNavigate,
  badge,
  collapsed,
}: {
  item: NavItem
  active: boolean
  onNavigate: (view: View) => void
  badge?: number
  collapsed: boolean
}) {
  const { id, label, icon: Icon, accent } = item
  return (
    <button
      onClick={() => onNavigate(id)}
      aria-current={active ? 'page' : undefined}
      // Replie, le libelle disparait : le title prend le relais au survol.
      title={collapsed ? label : undefined}
      className={`relative flex w-full items-center gap-3 rounded-lg border-l-4 py-3 text-sm font-medium transition-all ${
        collapsed ? 'px-4 lg:justify-center lg:px-0' : 'px-4'
      } ${
        active
          ? 'border-sky-400 bg-white/10 text-white'
          : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-sky-300' : accent}`} />
      <span className={`flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {!!badge && (
        <span
          className={`rounded-full bg-rose-500/90 text-[10px] font-bold text-white ${
            collapsed
              ? 'px-2 py-0.5 lg:absolute lg:right-1 lg:top-1 lg:px-1.5 lg:py-0 lg:text-[9px]'
              : 'px-2 py-0.5'
          }`}
          title={`${badge} element${badge > 1 ? 's' : ''} dans la corbeille`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// Preference d'affichage pure : elle reste sur le poste, pas dans le workspace
// partage avec Hermes.
const CLE_REPLI = 'hub.sidebar.collapsed'

export function Sidebar({ current, onNavigate, open, onClose }: SidebarProps) {
  const connected = useHubStore((s) => s.connected)
  const workspace = useHubStore((s) => s.workspace)
  const trash = useHubStore((s) => s.trash)

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CLE_REPLI) === '1'
    } catch {
      return false
    }
  })

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(CLE_REPLI, next ? '1' : '0')
      } catch {
        /* navigation privee : le repli marche, il ne survit pas au rechargement */
      }
      return next
    })
  }

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

      {/* Le repli ne vaut que sur grand ecran : en dessous, le menu est un tiroir
          qu'on ouvre et ferme entierement. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-white/10
                    bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800
                    transition-[transform,width] duration-200
                    lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}
                    ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
      >
        <div
          className={`flex items-center gap-3 border-b border-white/10 p-5 ${
            collapsed ? 'lg:flex-col lg:gap-2 lg:px-2' : ''
          }`}
        >
          <img src="./hermes-hub.png" alt="" className="h-10 w-10 flex-shrink-0 object-contain" />
          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="truncate text-base font-bold text-white">Hermes Hub</h1>
          </div>
          <button
            onClick={toggle}
            className="hidden rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:block"
            title={collapsed ? 'Afficher les libelles' : 'Reduire le menu aux icones'}
            aria-label={collapsed ? 'Afficher les libelles' : 'Reduire le menu aux icones'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={current === item.id || (item.id === 'projects' && current === 'project')}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2">
          <NavButton
            item={CORBEILLE}
            active={current === CORBEILLE.id}
            onNavigate={onNavigate}
            badge={trash.length}
            collapsed={collapsed}
          />
          <NavButton
            item={CONFIG}
            active={current === CONFIG.id}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        </div>

        <div className={`space-y-2 border-t border-white/10 p-4 ${collapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center gap-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${
                connected ? 'animate-pulse bg-emerald-400' : 'bg-red-500'
              }`}
              // Replie, la pastille est seule : elle doit se lire au survol.
              title={connected ? 'Serveur connecte' : 'Serveur injoignable'}
            />
            <span className={`text-[10px] font-medium text-slate-300 ${collapsed ? 'lg:hidden' : ''}`}>
              {connected ? 'Serveur connecte' : 'Serveur injoignable'}
            </span>
          </div>
          {workspace && (
            <p
              className={`break-all text-[10px] leading-tight text-slate-500 ${
                collapsed ? 'lg:hidden' : ''
              }`}
              title={workspace}
            >
              {workspace}
            </p>
          )}
        </div>
      </aside>
    </>
  )
}
