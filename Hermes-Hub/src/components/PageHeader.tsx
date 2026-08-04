import { Menu } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  onMenu: () => void
  /**
   * Le hamburger apparait TOUJOURS, quelle que soit la largeur.
   *
   * Il ne vivait qu'en petit ecran (`lg:hidden`), parce que c'est la seule
   * situation ou la barre laterale disparaissait. Le plein ecran en cree une
   * deuxieme : `GRAMMAIRE-PANNEAUX.md` le dit en une ligne - **le hamburger
   * n'est pas un geste de petit ecran, c'est le geste de « pas de barre
   * laterale »**. Sans lui, agrandir revient a se couper de la navigation au
   * moment ou l'on regarde le plus attentivement.
   */
  menuToujours?: boolean
}

export function PageHeader({ title, subtitle, icon, actions, onMenu, menuToujours }: Props) {
  return (
    <header data-zone="entete-page" className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:px-6">
      <button
        onClick={onMenu}
        className={`-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-navy-800 ${
          menuToujours ? '' : 'lg:hidden'
        }`}
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 truncate text-base font-semibold">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="truncate text-xs muted">{subtitle}</p>}
      </div>

      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
