import { ArrowLeft, FolderOpen, Play, Save, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { relativeDate } from '../lib/dates'
import { useHubStore } from '../store/useHubStore'
import { FILE_HINTS, STANDARD_FILES, statusClasses, statusLabels } from '../types'

interface Props {
  projectId: string
  onBack: () => void
  onMenu: () => void
}

export function ProjectDetail({ projectId, onBack, onMenu }: Props) {
  const project = useHubStore((s) => s.projects.find((p) => p.id === projectId))
  const launchHermes = useHubStore((s) => s.launchHermes)
  const openFolder = useHubStore((s) => s.openFolder)
  const updateProject = useHubStore((s) => s.updateProject)
  const notify = useHubStore((s) => s.notify)

  // Les 6 fichiers .md sont le reglage du projet, pas son contenu principal :
  // affiches d'emblee, ils font passer la fiche pour un editeur de texte. On
  // les garde derriere "Fichiers de contexte".
  const [editing, setEditing] = useState(false)
  const [file, setFile] = useState<string>('BRIEF.md')
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')

  const dirty = content !== original

  const load = useCallback(async () => {
    if (!editing) return                      // rien a charger tant que le panneau est ferme
    setLoading(true)
    try {
      const res = await api.readProjectFile(projectId, file)
      setContent(res.content)
      setOriginal(res.content)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Lecture impossible')
      setContent('')
      setOriginal('')
    } finally {
      setLoading(false)
    }
  }, [editing, projectId, file, notify])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await api.writeProjectFile(projectId, file, content)
      setOriginal(content)
      notify('success', `${file} enregistre.`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }, [dirty, saving, projectId, file, content, notify])

  // Ctrl+S saves, like any editor
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, save])

  // warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])

  const confirmDiscard = () =>
    !dirty || window.confirm('Des modifications non enregistrees seront perdues. Continuer ?')

  const switchFile = (next: string) => {
    if (!confirmDiscard()) return
    setFile(next)
  }

  const closeEditor = () => {
    if (!confirmDiscard()) return
    setContent('')
    setOriginal('')
    setEditing(false)
  }

  const commitRename = async () => {
    const name = draftName.trim()
    setRenaming(false)
    if (!name || name === projectId) return
    const updated = await updateProject(projectId, { name })
    if (updated) window.location.hash = `/project/${encodeURIComponent(updated.id)}`
  }

  const lineCount = useMemo(() => content.split('\n').length, [content])

  if (!project) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <PageHeader title="Projet introuvable" onMenu={onMenu} />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="card max-w-sm p-8 text-center">
            <p className="text-sm muted">
              Ce projet n'existe plus sur le disque. Il a peut-etre ete supprime ou renomme.
            </p>
            <button onClick={onBack} className="btn-primary mt-4">
              Retour aux projets
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title={project.name}
        subtitle={`${statusLabels[project.status]} - ${project.path}`}
        onMenu={onMenu}
        actions={
          <>
            <button onClick={onBack} className="btn-ghost px-2.5 py-2" aria-label="Retour">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => openFolder({ projectId: project.id })}
              className="btn-ghost hidden px-2.5 py-2 sm:inline-flex"
              title="Ouvrir le dossier"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
            <button
              onClick={() => (editing ? closeEditor() : setEditing(true))}
              className="btn-ghost px-2.5 py-2"
              title="Fichiers de contexte"
              aria-pressed={editing}
            >
              {editing ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </button>
            <button
              onClick={() => launchHermes({ projectId: project.id })}
              className="btn-primary px-3 py-2 text-xs"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Lancer Hermes</span>
            </button>
          </>
        }
      />

      {!editing ? (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="card max-w-2xl p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              {renaming ? (
                <input
                  className="input text-sm"
                  value={draftName}
                  autoFocus
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                />
              ) : (
                <button
                  onClick={() => {
                    setDraftName(project.name)
                    setRenaming(true)
                  }}
                  className="text-left text-sm font-semibold hover:text-sky-600 dark:hover:text-sky-400"
                  title="Renommer le projet"
                >
                  {project.name}
                </button>
              )}
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[project.status]}`}
              >
                {statusLabels[project.status]}
              </span>
            </div>

            <p className="text-xs muted">{project.description || 'Aucune description.'}</p>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[11px] sm:grid-cols-2">
              <div>
                <dt className="muted">Dossier</dt>
                <dd className="break-all font-mono">{project.path}</dd>
              </div>
              <div>
                <dt className="muted">Derniere utilisation</dt>
                <dd>{relativeDate(project.lastUsed)}</dd>
              </div>
              <div>
                <dt className="muted">Fichiers de contexte</dt>
                <dd>
                  {project.files.length}/6
                  {!project.complete && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      certains manquent
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="card mt-4 flex w-full max-w-2xl items-center gap-3 p-4 text-left transition-shadow hover:shadow-md"
          >
            <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-sky-500" />
            <span className="min-w-0">
              <span className="block text-xs font-medium">Fichiers de contexte</span>
              <span className="block text-[11px] muted">
                Les 6 fichiers .md que Hermes lit et met a jour. A ouvrir seulement pour les
                relire ou les corriger a la main.
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="hidden px-2 py-2 lg:block">
              <p className="text-[10px] font-medium uppercase tracking-wide muted">
                Fichiers de contexte
              </p>
            </div>

            {STANDARD_FILES.map((name) => {
              const exists = project.files.includes(name)
              return (
                <button
                  key={name}
                  onClick={() => switchFile(name)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full ${
                    file === name
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                      : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                  }`}
                >
                  <span className="font-mono">{name}</span>
                  {!exists && <span className="ml-1 text-amber-500">*</span>}
                  <span className="hidden lg:mt-0.5 lg:block lg:text-[10px] lg:font-normal lg:opacity-70">
                    {FILE_HINTS[name]}
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs muted">
                {lineCount} ligne{lineCount > 1 ? 's' : ''}
                {dirty && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400">- non enregistre</span>
                )}
              </p>
              <div className="flex gap-2">
                <button onClick={closeEditor} className="btn-ghost px-3 py-1.5 text-xs">
                  Fermer
                </button>
                <button
                  onClick={save}
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={!dirty || saving}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                  <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[10px] sm:inline">
                    Ctrl+S
                  </kbd>
                </button>
              </div>
            </div>

            <textarea
              className="input flex-1 resize-none font-mono text-xs leading-relaxed"
              value={loading ? 'Chargement...' : content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              spellCheck={false}
              aria-label={`Contenu de ${file}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
