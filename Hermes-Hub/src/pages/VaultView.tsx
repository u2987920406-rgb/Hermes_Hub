import { BookOpen, ChevronRight, FilePlus, FolderOpen, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Modal, ConfirmDialog } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'

interface Props {
  onMenu: () => void
  /** Note a ouvrir d'emblee, passee par l'URL (venant de la recherche). */
  noteAOuvrir?: string | null
}

export function VaultView({ onMenu, noteAOuvrir }: Props) {
  const vault = useHubStore((s) => s.vault)
  const refreshVault = useHubStore((s) => s.refreshVault)
  const createNote = useHubStore((s) => s.createNote)
  const deleteNote = useHubStore((s) => s.deleteNote)
  const openObsidian = useHubStore((s) => s.openObsidian)
  const openFolder = useHubStore((s) => s.openFolder)
  const notify = useHubStore((s) => s.notify)

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ Lessons: true })
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [newFolder, setNewFolder] = useState('Lessons')
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    void refreshVault()
  }, [refreshVault])

  // Arrivee depuis la recherche : on ouvre la note et on deplie son dossier.
  useEffect(() => {
    if (!noteAOuvrir) return
    const dossier = noteAOuvrir.split('/')[0]
    if (dossier) setOpenFolders((prev) => ({ ...prev, [dossier]: true }))
    void open(noteAOuvrir)
    // Volontairement lie au seul chemin : rouvrir a chaque frappe dans
    // l'editeur ecraserait ce que l'utilisateur est en train de taper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteAOuvrir])

  const dirty = content !== original

  const open = async (path: string) => {
    if (dirty && !window.confirm('Modifications non enregistrees. Continuer ?')) return
    try {
      const note = await api.readNote(path)
      setSelected(path)
      setContent(note.content)
      setOriginal(note.content)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Lecture impossible')
    }
  }

  const save = async () => {
    if (!selected || !dirty) return
    setSaving(true)
    try {
      await api.writeNote(selected, content)
      setOriginal(content)
      notify('success', 'Note enregistree.')
      await refreshVault()
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const ok = await createNote({ folder: newFolder, title: newTitle.trim() })
    if (ok) {
      setCreating(false)
      setNewTitle('')
      await open(`${newFolder}/${newTitle.trim()}.md`)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const ok = await deleteNote(deleting)
    if (ok && selected === deleting) {
      setSelected(null)
      setContent('')
      setOriginal('')
    }
    setDeleting(null)
  }

  const totalNotes = vault.reduce((sum, f) => sum + f.count, 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Coffre memoire"
        subtitle={`${totalNotes} note${totalNotes > 1 ? 's' : ''} dans ${vault.length} dossiers`}
        icon={<BookOpen className="h-4 w-4 text-gold-500" />}
        onMenu={onMenu}
        actions={
          <>
            <button
              onClick={() => openFolder({ target: 'vault' })}
              className="btn-ghost hidden px-2.5 py-2 sm:inline-flex"
              title="Ouvrir le dossier du coffre"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <button onClick={() => setCreating(true)} className="btn-ghost px-3 py-2 text-xs">
              <FilePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle note</span>
            </button>
            <button onClick={openObsidian} className="btn-gold px-3 py-2 text-xs">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Ouvrir Obsidian</span>
            </button>
          </>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="max-h-56 flex-shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
          {vault.map((folder) => {
            const expanded = openFolders[folder.folder]
            return (
              <div key={folder.folder}>
                <button
                  onClick={() =>
                    setOpenFolders((prev) => ({ ...prev, [folder.folder]: !prev[folder.folder] }))
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-100 dark:hover:bg-navy-800"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                  <span className="flex-1 truncate">{folder.folder}</span>
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] muted dark:bg-navy-950">
                    {folder.count}
                  </span>
                </button>

                {expanded &&
                  folder.notes.map((note) => (
                    <div key={note.path} className="group flex items-center gap-1 pl-6 pr-1">
                      <button
                        onClick={() => open(note.path)}
                        className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                          selected === note.path
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                            : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                        }`}
                      >
                        {note.title}
                      </button>
                      <button
                        onClick={() => setDeleting(note.path)}
                        className="flex-shrink-0 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Supprimer ${note.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                {expanded && folder.count === 0 && (
                  <p className="px-8 py-1.5 text-[11px] italic muted">Vide</p>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
          {selected ? (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="truncate font-mono text-xs muted">{selected}</p>
                <button
                  onClick={save}
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={!dirty || saving}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
              <textarea
                className="input flex-1 resize-none font-mono text-xs leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                aria-label="Contenu de la note"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="max-w-sm text-center">
                <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-navy-700" />
                <p className="text-sm muted">
                  Selectionne une note a gauche pour la lire et la modifier, ou cree-en une nouvelle.
                </p>
                <button onClick={() => setCreating(true)} className="btn-primary mt-4">
                  <FilePlus className="h-4 w-4" /> Nouvelle note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {creating && (
        <Modal
          title="Nouvelle note"
          icon={<FilePlus className="h-4 w-4 text-sky-500" />}
          onClose={() => setCreating(false)}
        >
          <form onSubmit={submitNew} className="space-y-4">
            <div>
              <label htmlFor="nn-folder" className="mb-1.5 block text-xs font-medium">
                Dossier
              </label>
              <select
                id="nn-folder"
                className="input"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
              >
                {vault.map((folder) => (
                  <option key={folder.folder} value={folder.folder}>
                    {folder.folder}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nn-title" className="mb-1.5 block text-xs font-medium">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                id="nn-title"
                className="input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Erreur de quoting batch"
                autoFocus
                required
              />
              <p className="mt-1.5 text-[11px] muted">
                Le fichier sera cree avec le front matter YAML du modele {newFolder}.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" className="btn-ghost" onClick={() => setCreating(false)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary sm:flex-1" disabled={!newTitle.trim()}>
                Creer la note
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Mettre cette note a la corbeille ?"
          danger
          confirmLabel="Mettre a la corbeille"
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
          message={
            <>
              <p>
                Le fichier <strong>{deleting}</strong> quitte le coffre memoire pour la corbeille
                Windows.
              </p>
              <p className="mt-2 muted">
                Tu peux le restaurer depuis la corbeille tant qu'elle n'a pas ete videe.
              </p>
            </>
          }
        />
      )}
    </div>
  )
}
