import { FolderOpen, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useHubStore } from '../store/useHubStore'
import type { TrashItem } from '../types'

interface Props {
  onMenu: () => void
}

export function TrashView({ onMenu }: Props) {
  const trash = useHubStore((s) => s.trash)
  const refreshTrash = useHubStore((s) => s.refreshTrash)
  const restoreTrash = useHubStore((s) => s.restoreTrash)
  const purgeTrash = useHubStore((s) => s.purgeTrash)

  const [purging, setPurging] = useState<TrashItem | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refreshTrash()
  }, [refreshTrash])

  const confirmPurge = async () => {
    if (!purging) return
    setBusy(true)
    await purgeTrash(purging.id)
    setBusy(false)
    setPurging(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Corbeille"
        subtitle={
          trash.length
            ? `${trash.length} element${trash.length > 1 ? 's' : ''} recuperable${trash.length > 1 ? 's' : ''}`
            : 'Rien a recuperer'
        }
        icon={<Trash2 className="h-4 w-4 text-rose-500" />}
        onMenu={onMenu}
        actions={
          <button
            onClick={() => void refreshTrash()}
            className="btn-ghost px-2.5 py-2"
            title="Recharger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {trash.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <Trash2 className="h-10 w-10 text-slate-300 dark:text-navy-700" />
              <p className="text-sm muted">
                Rien n'a ete jete depuis le Hub, ou la corbeille Windows a ete videe.
              </p>
            </div>
          ) : (
            <>
              {trash.map((item) => (
                <div key={item.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <FolderOpen
                    className={`h-5 w-5 flex-shrink-0 ${item.isFolder ? 'text-violet-500' : 'text-slate-400'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="mt-0.5 break-all font-mono text-[11px] muted">{item.origin}</p>
                    <p className="mt-0.5 text-[11px] muted">
                      {item.isFolder ? 'Dossier' : 'Fichier'} - jete le {item.deletedAt}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-2">
                    <button
                      onClick={() => void restoreTrash(item.id)}
                      className="btn-ghost px-3 py-2 text-xs"
                      title="Remettre a son emplacement d'origine"
                    >
                      <RotateCcw className="h-4 w-4" /> Restaurer
                    </button>
                    <button
                      onClick={() => setPurging(item)}
                      className="btn-ghost px-3 py-2 text-xs text-rose-600 dark:text-rose-400"
                      title="Supprimer definitivement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <p className="text-[11px] muted">
                Seul ce qui vient de ton dossier de travail est affiche ici. Le reste de la
                corbeille Windows ne regarde pas le Hub et n'est jamais touche.
              </p>
            </>
          )}
        </div>
      </div>

      {purging && (
        <ConfirmDialog
          title="Supprimer definitivement ?"
          danger
          confirmLabel={busy ? 'Suppression...' : 'Supprimer definitivement'}
          onConfirm={confirmPurge}
          onClose={() => setPurging(null)}
          message={
            <>
              <p>
                <strong>{purging.name}</strong> quitte la corbeille Windows.
              </p>
              <p className="mt-2 muted">
                Cette fois c'est sans retour : plus aucun moyen de le recuperer.
              </p>
            </>
          }
        />
      )}
    </div>
  )
}
