import { CheckCircle2, FolderOpen, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from './Modal'
import { relativeDate } from '../lib/dates'
import { useHubStore } from '../store/useHubStore'
import { statusClasses, statusLabels, type Project } from '../types'

interface Props {
  project: Project
  onOpen: (id: string) => void
}

export function ProjectCard({ project, onOpen }: Props) {
  const launchHermes = useHubStore((s) => s.launchHermes)
  const openFolder = useHubStore((s) => s.openFolder)
  const updateProject = useHubStore((s) => s.updateProject)
  const deleteProject = useHubStore((s) => s.deleteProject)

  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggleStatus = () =>
    updateProject(project.id, { status: project.status === 'active' ? 'done' : 'active' })

  const remove = async () => {
    setBusy(true)
    await deleteProject(project.id)
    setBusy(false)
    setConfirming(false)
  }

  return (
    <>
      <div className="card flex flex-col p-5 transition-shadow hover:shadow-md">
        <div className="mb-2 flex items-start justify-between gap-3">
          <button
            onClick={() => onOpen(project.id)}
            className="min-w-0 flex-1 text-left text-sm font-semibold transition-colors hover:text-sky-600 dark:hover:text-sky-400"
          >
            <span className="line-clamp-2 break-words">{project.name}</span>
          </button>
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[project.status]}`}
          >
            {statusLabels[project.status]}
          </span>
        </div>

        <p className="mb-3 line-clamp-2 min-h-[2rem] text-xs muted">
          {project.description || 'Aucune description.'}
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] muted">
          <span>{project.files.length}/6 fichiers</span>
          <span>Utilise {relativeDate(project.lastUsed)}</span>
          {!project.complete && (
            <span className="text-amber-600 dark:text-amber-400">Fichiers manquants</span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <button
            onClick={() => launchHermes({ projectId: project.id })}
            className="btn-primary flex-1 px-3 py-1.5 text-xs"
            title="Ouvre un terminal Hermes dans ce dossier"
          >
            <Play className="h-3.5 w-3.5" /> Lancer Hermes
          </button>
          <button
            onClick={() => onOpen(project.id)}
            className="btn-ghost px-2.5 py-1.5 text-xs"
            title="Ouvrir la fiche du projet"
            aria-label="Ouvrir la fiche du projet"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => openFolder({ projectId: project.id })}
            className="btn-ghost px-2.5 py-1.5 text-xs"
            title="Ouvrir le dossier"
            aria-label="Ouvrir le dossier"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={toggleStatus}
            className="btn-ghost px-2.5 py-1.5 text-xs"
            title={project.status === 'active' ? 'Marquer comme termine' : 'Repasser en cours'}
            aria-label="Changer le statut"
          >
            {project.status === 'active' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="btn-ghost px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            title="Mettre le projet a la corbeille"
            aria-label="Mettre le projet a la corbeille"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Mettre ce projet a la corbeille ?"
          danger
          busy={busy}
          confirmLabel="Mettre a la corbeille"
          onConfirm={remove}
          onClose={() => setConfirming(false)}
          message={
            <>
              <p>
                Le dossier <strong>{project.name}</strong> et ses {project.files.length} fichiers
                partent dans la corbeille Windows.
              </p>
              <p className="mt-2 break-all font-mono text-[11px]">{project.path}</p>
              <p className="mt-2 muted">
                Tu peux les restaurer depuis la corbeille tant qu'elle n'a pas ete videe.
              </p>
            </>
          }
        />
      )}
    </>
  )
}
