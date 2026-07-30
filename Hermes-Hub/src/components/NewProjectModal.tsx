import { FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'
import { useHubStore } from '../store/useHubStore'
import { STANDARD_FILES } from '../types'

interface Props {
  onClose: () => void
  onCreated?: (id: string) => void
}

export function NewProjectModal({ onClose, onCreated }: Props) {
  const createProject = useHubStore((s) => s.createProject)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    const project = await createProject({ name: name.trim(), description: description.trim() })
    setBusy(false)
    if (project) {
      onCreated?.(project.id)
      onClose()
    }
  }

  return (
    <Modal
      title="Nouveau projet"
      icon={<FolderPlus className="h-4 w-4 text-sky-500" />}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="np-name" className="mb-1.5 block text-xs font-medium">
            Nom du projet <span className="text-red-500">*</span>
          </label>
          <input
            id="np-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Devis Express"
            autoFocus
            required
          />
          <p className="mt-1.5 text-[11px] muted">
            Un dossier de ce nom sera cree dans Projets/.
          </p>
        </div>

        <div>
          <label htmlFor="np-desc" className="mb-1.5 block text-xs font-medium">
            Le projet en une phrase
          </label>
          <textarea
            id="np-desc"
            className="input resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outil de devis rapide pour un artisan."
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-950">
          <p className="mb-2 text-[11px] font-medium">Fichiers crees automatiquement :</p>
          <div className="flex flex-wrap gap-1.5">
            {STANDARD_FILES.map((file) => (
              <span
                key={file}
                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] muted dark:border-navy-700 dark:bg-navy-900"
              >
                {file}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
          <button type="button" className="btn-ghost sm:flex-none" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn-primary sm:flex-1" disabled={busy || !name.trim()}>
            {busy ? 'Creation...' : 'Creer le projet'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
