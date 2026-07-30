import { FolderOpen, RefreshCw, Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useHubStore } from '../store/useHubStore'
import type { AppConfig } from '../types'

interface Props {
  onMenu: () => void
}

const EDITABLE: { key: keyof AppConfig; label: string; hint: string; placeholder?: string }[] = [
  { key: 'userName', label: 'Ton prenom', hint: "Affiche sur l'accueil" },
  { key: 'profile', label: 'Profil Hermes principal', hint: 'Utilise par "Lancer Hermes"', placeholder: 'default' },
  { key: 'cleanProfile', label: 'Profil Clean Agent', hint: 'Utilise par la session vierge', placeholder: 'clean' },
  { key: 'defaultModel', label: 'Modele par defaut', hint: 'Informatif - le vrai reglage se fait avec "hermes setup"', placeholder: 'laisse vide pour celui de Hermes' },
]

const READONLY: { key: keyof AppConfig; label: string }[] = [
  { key: 'workspace', label: 'Dossier de travail' },
  { key: 'projectsPath', label: 'Dossier des projets' },
  { key: 'vaultPath', label: 'Coffre Obsidian' },
]

export function ConfigView({ onMenu }: Props) {
  const config = useHubStore((s) => s.config)
  const saveConfig = useHubStore((s) => s.saveConfig)
  const openFolder = useHubStore((s) => s.openFolder)
  const bootstrap = useHubStore((s) => s.bootstrap)

  const [draft, setDraft] = useState<Partial<AppConfig>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) setDraft({ ...config })
  }, [config])

  const dirty = config
    ? EDITABLE.some(({ key }) => (draft[key] ?? '') !== (config[key] ?? ''))
    : false

  const submit = async () => {
    setSaving(true)
    await saveConfig({
      userName: draft.userName,
      profile: draft.profile,
      cleanProfile: draft.cleanProfile,
      defaultModel: draft.defaultModel,
    })
    setSaving(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Configuration"
        icon={<Settings className="h-4 w-4 text-slate-400" />}
        onMenu={onMenu}
        actions={
          <button onClick={() => bootstrap()} className="btn-ghost px-2.5 py-2" title="Recharger">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <section className="card p-5">
            <h3 className="mb-4 text-sm font-semibold">Parametres</h3>
            <div className="space-y-4">
              {EDITABLE.map(({ key, label, hint, placeholder }) => (
                <div key={key}>
                  <label htmlFor={`cfg-${key}`} className="mb-1.5 block text-xs font-medium">
                    {label}
                  </label>
                  <input
                    id={`cfg-${key}`}
                    className="input"
                    value={String(draft[key] ?? '')}
                    placeholder={placeholder}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                  <p className="mt-1 text-[11px] muted">{hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={submit} className="btn-primary" disabled={!dirty || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="mb-4 text-sm font-semibold">Emplacements sur le disque</h3>
            <div className="space-y-3">
              {READONLY.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs font-medium">{label}</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] muted">
                    {String(config?.[key] ?? '-')}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] muted">
              Ces chemins sont detectes automatiquement a partir du dossier Hermes-* de tes
              Documents. Ils ne se modifient pas ici : deplace le dossier et relance le Hub.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => openFolder({ target: 'workspace' })}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <FolderOpen className="h-4 w-4" /> Ouvrir le workspace
              </button>
              <button
                onClick={() => openFolder({ target: 'vault' })}
                className="btn-ghost px-3 py-2 text-xs"
              >
                <FolderOpen className="h-4 w-4" /> Ouvrir le coffre
              </button>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">A propos</h3>
            <dl className="space-y-1 text-xs muted">
              <div className="flex gap-2">
                <dt className="opacity-70">Version :</dt>
                <dd>1.0.0</dd>
              </div>
              <div className="flex gap-2">
                <dt className="opacity-70">Stack :</dt>
                <dd>React + TypeScript + Vite + Tailwind</dd>
              </div>
              <div className="flex gap-2">
                <dt className="opacity-70">Persistance :</dt>
                <dd>fichiers du workspace (aucune base de donnees)</dd>
              </div>
              <div className="flex gap-2">
                <dt className="opacity-70">Serveur :</dt>
                <dd>Node local, 127.0.0.1 uniquement</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
