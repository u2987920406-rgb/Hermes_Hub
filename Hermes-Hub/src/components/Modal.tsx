import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Attente } from './Attente'

interface ModalProps {
  title: string
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}

/** Shared shell: Escape closes, backdrop click closes, body scroll is locked. */
export function Modal({ title, icon, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      data-zone="fenetre-modale"
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`card max-h-[92vh] w-full ${maxWidth} animate-slide-up overflow-y-auto rounded-b-none p-5 shadow-2xl sm:rounded-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            {icon}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface ConfirmProps {
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  danger,
  busy,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <div className="text-sm leading-relaxed muted">{message}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            className={`${danger ? 'btn-danger' : 'btn-primary'} gap-1.5`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            <Attente actif={!!busy} />
            {busy ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
