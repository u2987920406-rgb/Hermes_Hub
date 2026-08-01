import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useHubStore } from '../store/useHubStore'

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  info: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }

export function Toasts() {
  const toasts = useHubStore((s) => s.toasts)
  const dismiss = useHubStore((s) => s.dismiss)

  if (!toasts.length) return null

  return (
    <div
      data-zone="notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${STYLES[toast.kind]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="opacity-60 transition-opacity hover:opacity-100"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
