import { AlertTriangle, CheckCircle2, FolderOpen, RefreshCw, Save, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { AppConfig, Diagnostics } from '../types'

interface Props {
  onMenu: () => void
}

const EDITABLE: { key: keyof AppConfig; label: string; hint: string; placeholder?: string }[] = [
  { key: 'userName', label: 'Ton prenom', hint: "Affiche sur l'accueil" },
  { key: 'profile', label: 'Profil Hermes principal', hint: 'Utilise par "Discuter avec Hermes" et par les projets', placeholder: 'default' },
  { key: 'cleanProfile', label: 'Profil Clean Agent', hint: 'Utilise par la session vierge', placeholder: 'clean' },
  { key: 'defaultModel', label: 'Modele par defaut', hint: 'Informatif - le vrai reglage se fait avec "hermes setup"', placeholder: 'laisse vide pour celui de Hermes' },
]

const READONLY: { key: keyof AppConfig; label: string }[] = [
  { key: 'workspace', label: 'Dossier de travail' },
  { key: 'projectsPath', label: 'Dossier des projets' },
  { key: 'vaultPath', label: 'Coffre memoire' },
]

const SKINS: { key: keyof AppConfig; label: string; hint: string }[] = [
  { key: 'skinChat', label: 'Discuter avec Hermes', hint: 'Session libre, avec ta memoire' },
  { key: 'skinClean', label: 'Clean Agent', hint: 'Session vierge' },
  { key: 'skinProject', label: 'Projets', hint: 'Hermes lance sur un projet' },
]

/** Une ligne de diagnostic : etat, valeur, et quoi faire si ca cloche. */
function Ligne({
  label,
  ok,
  valeur,
  aide,
}: {
  label: string
  ok: boolean
  valeur: string
  aide?: string
}) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 break-all font-mono text-[11px] muted">{valeur}</p>
        {aide && <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">{aide}</p>}
      </div>
    </div>
  )
}

export function ConfigView({ onMenu }: Props) {
  const config = useHubStore((s) => s.config)
  const skins = useHubStore((s) => s.skins)
  const version = useHubStore((s) => s.version)
  const setTheme = useHubStore((s) => s.setTheme)
  const saveConfig = useHubStore((s) => s.saveConfig)
  const openFolder = useHubStore((s) => s.openFolder)
  const bootstrap = useHubStore((s) => s.bootstrap)

  const [draft, setDraft] = useState<Partial<AppConfig>>({})
  const [saving, setSaving] = useState(false)
  const [diag, setDiag] = useState<Diagnostics | null>(null)

  useEffect(() => {
    if (config) setDraft({ ...config })
  }, [config])

  // Interroger Hermes coute ~1 s : on ne le fait qu'en ouvrant cette page.
  useEffect(() => {
    api.diagnostics().then(setDiag).catch(() => setDiag(null))
  }, [])

  // Un profil configure ici mais inconnu d'Hermes est une panne silencieuse :
  // la session part sur le profil par defaut sans rien dire.
  const profilsOk =
    !diag ||
    diag.profiles.length === 0 ||
    ([config?.profile, config?.cleanProfile].filter(Boolean) as string[]).every((p) =>
      diag.profiles.includes(p)
    )

  const dirty = config
    ? [...EDITABLE, ...SKINS].some(({ key }) => (draft[key] ?? '') !== (config[key] ?? ''))
    : false

  const submit = async () => {
    setSaving(true)
    await saveConfig({
      userName: draft.userName,
      profile: draft.profile,
      cleanProfile: draft.cleanProfile,
      defaultModel: draft.defaultModel,
      skinChat: draft.skinChat,
      skinClean: draft.skinClean,
      skinProject: draft.skinProject,
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
          </section>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold">Couleur du terminal Hermes</h3>
            <p className="mb-4 text-[11px] muted">
              Une couleur par porte d'entree, pour reconnaitre la nature d'une session sans lire le
              chemin. Appliquee au lancement suivant.
            </p>
            <div className="space-y-4">
              {SKINS.map(({ key, label, hint }) => {
                const valeur = String(draft[key] ?? '')
                const connu = skins.some((s) => s.name === valeur)
                return (
                  <div key={key}>
                    <label htmlFor={`cfg-${key}`} className="mb-1.5 block text-xs font-medium">
                      {label}
                    </label>
                    <select
                      id={`cfg-${key}`}
                      className="input"
                      value={valeur}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    >
                      {/* Un skin retire d'Hermes ne doit pas disparaitre du menu en silence */}
                      {!connu && valeur && <option value={valeur}>{valeur} (introuvable)</option>}
                      {skins.map((skin) => (
                        <option key={skin.name} value={skin.name}>
                          {skin.name} - {skin.description}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] muted">{hint}</p>
                  </div>
                )
              })}
            </div>

          </section>

          {/* Un seul bouton pour les deux cartes editables : deux boutons
              "Enregistrer" sur la meme page laisseraient croire qu'un reglage
              a ete sauve alors qu'il ne l'a pas ete. */}
          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-[11px] muted">Modifications non enregistrees</span>}
            <button onClick={submit} className="btn-primary" disabled={!dirty || saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold">Apparence du Hub</h3>
            <p className="mb-4 text-[11px] muted">
              S'applique immediatement, sans passer par "Enregistrer".
            </p>
            <label htmlFor="cfg-theme" className="mb-1.5 block text-xs font-medium">
              Theme de l'interface
            </label>
            <select
              id="cfg-theme"
              className="input"
              value={config?.theme === 'dark' ? 'dark' : 'light'}
              onChange={(e) => setTheme(e.target.value === 'dark' ? 'dark' : 'light')}
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
            <p className="mt-1 text-[11px] muted">
              Aussi accessible par l'icone lune en haut de l'accueil.
            </p>
          </section>

          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold">Diagnostic</h3>
            <p className="mb-4 text-[11px] muted">
              Ce qu'il faut verifier en premier quand quelque chose ne demarre pas.
            </p>
            {diag ? (
              <div className="space-y-3">
                <Ligne
                  label="Hermes Agent"
                  ok={!!diag.hermes}
                  valeur={diag.hermes ?? 'introuvable dans le PATH'}
                  aide={diag.hermes ? undefined : 'Relance installer.bat, puis rouvre ta session.'}
                />
                <Ligne label="Node.js" ok valeur={diag.node} />
                <Ligne
                  label="Windows Terminal"
                  ok={diag.terminal}
                  valeur={diag.terminal ? 'present' : 'absent'}
                  aide={diag.terminal ? undefined : "Les sessions s'ouvriront dans une fenetre PowerShell classique."}
                />
                <Ligne
                  label="Profils Hermes"
                  ok={profilsOk}
                  valeur={diag.profiles.length ? diag.profiles.join(', ') : 'aucun'}
                  aide={
                    profilsOk
                      ? undefined
                      : `Un profil configure plus haut n'existe pas chez Hermes : la session se lancera sur le profil par defaut.`
                  }
                />
                <Ligne label="Serveur du Hub" ok valeur={`http://127.0.0.1:${diag.port}`} />
                <div>
                  <p className="text-xs font-medium">En cas d'echec au demarrage</p>
                  <p className="mt-0.5 break-all font-mono text-[11px] muted">{diag.log}</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] muted">Lecture de l'etat du systeme...</p>
            )}
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
                {/* Vient du serveur : une version ecrite en dur ici finirait
                    par mentir des la premiere mise a jour du Hub. */}
                <dd>{version || '-'}</dd>
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
