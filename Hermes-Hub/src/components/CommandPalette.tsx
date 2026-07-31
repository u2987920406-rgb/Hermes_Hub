import {
  BookOpen,
  CornerDownLeft,
  FolderOpen,
  Home,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHubStore } from '../store/useHubStore'
import type { View } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (view: View, param?: string) => void
}

interface Resultat {
  id: string
  groupe: 'Projets' | 'Coffre memoire' | 'Aller a'
  label: string
  detail?: string
  icon: typeof Home
  action: () => void
}

/** Accents et casse ignores : on cherche "reprise" et on trouve "REPRISE". */
function normaliser(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function CommandPalette({ open, onClose, onNavigate }: Props) {
  const projects = useHubStore((s) => s.projects)
  const vault = useHubStore((s) => s.vault)

  const [terme, setTerme] = useState('')
  const [actif, setActif] = useState(0)
  const champ = useRef<HTMLInputElement>(null)
  const listeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTerme('')
      setActif(0)
      // Le champ n'existe qu'une fois la modale montee.
      requestAnimationFrame(() => champ.current?.focus())
    }
  }, [open])

  const resultats = useMemo<Resultat[]>(() => {
    const q = normaliser(terme.trim())

    const aller: Resultat[] = [
      { id: 'go-home', groupe: 'Aller a', label: 'Accueil', icon: Home, action: () => onNavigate('home') },
      { id: 'go-agora', groupe: 'Aller a', label: 'Agora', icon: Users, action: () => onNavigate('agora') },
      { id: 'go-projects', groupe: 'Aller a', label: 'Projets', icon: FolderOpen, action: () => onNavigate('projects') },
      { id: 'go-vault', groupe: 'Aller a', label: 'Coffre memoire', icon: BookOpen, action: () => onNavigate('vault') },
      { id: 'go-trash', groupe: 'Aller a', label: 'Corbeille', icon: Trash2, action: () => onNavigate('trash') },
      { id: 'go-config', groupe: 'Aller a', label: 'Configuration', icon: Settings, action: () => onNavigate('config') },
    ]

    const projets: Resultat[] = projects.map((p) => ({
      id: `projet-${p.id}`,
      groupe: 'Projets',
      label: p.name,
      detail: p.description || undefined,
      icon: FolderOpen,
      action: () => onNavigate('project', p.id),
    }))

    const notes: Resultat[] = vault.flatMap((dossier) =>
      dossier.notes.map((note) => ({
        id: `note-${note.path}`,
        groupe: 'Coffre memoire' as const,
        label: note.title || note.name,
        detail: dossier.folder,
        icon: BookOpen,
        action: () => onNavigate('vault', note.path),
      }))
    )

    // Sans recherche, on montre la navigation : la palette sert aussi de
    // raccourci clavier vers les ecrans, pas seulement de moteur de recherche.
    if (!q) return [...aller, ...projets.slice(0, 5)]

    const correspond = (r: Resultat) =>
      normaliser(r.label).includes(q) || (r.detail ? normaliser(r.detail).includes(q) : false)

    return [...projets, ...notes, ...aller].filter(correspond).slice(0, 40)
  }, [terme, projects, vault, onNavigate])

  useEffect(() => {
    setActif(0)
  }, [terme])

  // Garde l'element selectionne visible quand on descend au clavier.
  useEffect(() => {
    listeRef.current?.querySelector('[data-actif="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [actif])

  if (!open) return null

  const valider = (r?: Resultat) => {
    const cible = r ?? resultats[actif]
    if (!cible) return
    cible.action()
    onClose()
  }

  const auClavier = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActif((i) => (resultats.length ? (i + 1) % resultats.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActif((i) => (resultats.length ? (i - 1 + resultats.length) % resultats.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      valider()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let groupePrecedent = ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-navy-950/50 p-4 backdrop-blur-sm sm:pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Recherche"
    >
      <div
        className="card w-full max-w-xl overflow-hidden p-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-navy-800">
          <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <input
            ref={champ}
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            onKeyDown={auClavier}
            placeholder="Chercher un projet, une note, un ecran..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="Recherche"
          />
          <kbd className="hidden flex-shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] muted dark:border-navy-700 sm:block">
            Echap
          </kbd>
        </div>

        <div ref={listeRef} className="max-h-80 overflow-y-auto p-2">
          {resultats.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs muted">Rien ne correspond a "{terme}".</p>
          ) : (
            resultats.map((r, i) => {
              const nouveauGroupe = r.groupe !== groupePrecedent
              groupePrecedent = r.groupe
              const Icone = r.icon
              return (
                <div key={r.id}>
                  {nouveauGroupe && (
                    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide muted">
                      {r.groupe}
                    </p>
                  )}
                  <button
                    data-actif={i === actif}
                    onMouseEnter={() => setActif(i)}
                    onClick={() => valider(r)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      i === actif ? 'bg-sky-50 dark:bg-navy-800' : ''
                    }`}
                  >
                    <Icone className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    {r.detail && (
                      <span className="hidden max-w-[45%] truncate text-[11px] muted sm:block">
                        {r.detail}
                      </span>
                    )}
                    {i === actif && <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 muted" />}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
