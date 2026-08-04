import {
  BookOpen,
  FolderOpen,
  Home,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
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
  onRechercher: () => void
}

interface NavItem {
  id: View
  label: string
  icon: typeof Home
  /** Couleur propre de l'entree : elle ne change ni au survol ni a la
      selection, c'est ce qui rend le menu reconnaissable d'un coup d'oeil. */
  accent: string
  /** Le liseré de selection reprend la couleur de l'icone. Classes ecrites en
      entier : Tailwind ne garde pas les noms de classe construits a la volee. */
  bordure: string
}

// Clean Agent n'est pas ici : c'est un outil d'essai, il vit dans
// Configuration > Developpement. Le terminal Hermes non plus, mais pour la
// raison inverse - ce n'est pas une destination, c'est un geste : voir le
// bouton dedie plus bas, pose avec la Corbeille et les reglages.
const NAV: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home, accent: 'text-sky-300', bordure: 'border-sky-400' },
  {
    id: 'projects',
    label: 'Projets',
    icon: FolderOpen,
    accent: 'text-violet-300',
    bordure: 'border-violet-400',
  },
  {
    id: 'orchestration',
    label: 'Orchestration',
    icon: Network,
    accent: 'text-indigo-300',
    bordure: 'border-indigo-400',
  },
  {
    id: 'vault',
    label: 'Coffre memoire',
    icon: BookOpen,
    accent: 'text-gold-400',
    bordure: 'border-gold-400',
  },
]

// Corbeille et reglages : en bas, separes de la navigation courante.
const CORBEILLE: NavItem = {
  id: 'trash',
  label: 'Corbeille',
  icon: Trash2,
  accent: 'text-red-400',
  bordure: 'border-red-500',
}

const CONFIG: NavItem = {
  id: 'config',
  label: 'Configuration',
  icon: Settings,
  accent: 'text-slate-300',
  bordure: 'border-slate-400',
}

function NavButton({
  item,
  active,
  onNavigate,
  badge,
  badgeTitre,
  collapsed,
}: {
  item: NavItem
  active: boolean
  onNavigate: (view: View) => void
  badge?: number
  /** Ce que la pastille veut dire. Elle etait ecrite en dur pour la corbeille -
      la meme phrase serait fausse partout ailleurs. */
  badgeTitre?: string
  collapsed: boolean
}) {
  const { id, label, icon: Icon, accent, bordure } = item
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
          ? `${bordure} bg-white/10 text-white`
          : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      {/* L'icone garde sa couleur en toutes circonstances : seul le fond et le
          libelle reagissent au survol et a la selection. */}
      <Icon className={`h-5 w-5 flex-shrink-0 ${accent}`} />
      <span className={`flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {!!badge && (
        <span
          className={`rounded-full bg-rose-500/90 text-[10px] font-bold text-white ${
            collapsed
              ? 'px-2 py-0.5 lg:absolute lg:right-1 lg:top-1 lg:px-1.5 lg:py-0 lg:text-[9px]'
              : 'px-2 py-0.5'
          }`}
          title={badgeTitre || `${badge} element${badge > 1 ? 's' : ''} dans la corbeille`}
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

export function Sidebar({ current, onNavigate, open, onClose, onRechercher }: SidebarProps) {
  const connected = useHubStore((s) => s.connected)
  const workspace = useHubStore((s) => s.workspace)
  const trash = useHubStore((s) => s.trash)
  const accords = useHubStore((s) => s.accords)
  const version = useHubStore((s) => s.version)
  const launchHermes = useHubStore((s) => s.launchHermes)

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
        data-zone="menu-lateral"
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
            {version && <p className="truncate text-[10px] text-slate-400">v{version}</p>}
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

        {/* Le raccourci clavier ne se devine pas : on l'affiche. Le trait le
            detache de la navigation : chercher n'est pas aller quelque part.
            Meme filet que les autres separations du menu. */}
        <div className="border-b border-white/10 p-2">
          <button
            onClick={onRechercher}
            title="Rechercher (Ctrl+K)"
            className={`flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? 'px-4 lg:justify-center lg:px-0' : 'px-4'
            }`}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className={`flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>Rechercher</span>
            <kbd
              className={`rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-slate-400 ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              Ctrl K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {/* La pastille d'Orchestration ne compte pas des elements ranges,
              comme celle de la Corbeille : elle compte des agents ARRETES, qui
              attendront indefiniment. Elle vit donc dans le menu, pour se voir
              depuis l'ecran ou l'on est justement parti. */}
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={current === item.id || (item.id === 'projects' && current === 'project')}
              onNavigate={onNavigate}
              badge={item.id === 'orchestration' ? accords : undefined}
              badgeTitre={
                accords === 1
                  ? 'Un agent attend ta reponse - il est arrete tant qu-elle ne vient pas'
                  : `${accords} agents attendent ta reponse - ils sont arretes tant qu-elle ne vient pas`
              }
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-2">
          {/**
           * Le terminal Hermes : un geste, pas une destination.
           *
           * Il occupait une grande carte sur l'accueil, ce qui le rendait
           * inaccessible des qu'on avait commence a parler - or c'est
           * precisement en travaillant qu'on veut une ligne de commande. Ici il
           * suit partout, et il ne prend qu'une ligne.
           *
           * Deliberement PLUS DISCRET que les entrees au-dessus : pas de liseré
           * de selection, pas d'etat actif - il n'y a pas d'ecran ou l'on
           * « est ». Meme logique que le bouton Rechercher, qui n'est pas une
           * navigation non plus et porte donc son propre traitement.
           */}
          <button
            onClick={() => void launchHermes({})}
            title="Ouvrir Hermes dans un terminal"
            className={`flex w-full items-center gap-3 rounded-lg py-2 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white ${
              collapsed ? 'px-4 lg:justify-center lg:px-0' : 'px-4'
            }`}
          >
            <img
              src="./hermes-master.png"
              alt=""
              className="h-5 w-5 flex-shrink-0 object-contain opacity-80"
            />
            <span className={`flex-1 text-left ${collapsed ? 'lg:hidden' : ''}`}>
              Terminal Hermes
            </span>
          </button>

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
