import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  History,
  RotateCcw,
  Info,
  Palette,
  RefreshCw,
  Save,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Terminal as TerminalIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { AppConfig, Diagnostics, MemoryFile, Theme } from '../types'
import { FICHIERS_MEMOIRE, THEMES } from '../types'

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

// Une section = un volet. La liste est plate : avec six entrees sans
// sous-niveaux, un accordeon ajouterait un clic sans rien apporter.
type Onglet =
  | 'general'
  | 'memoire'
  | 'terminal'
  | 'apparence'
  | 'diagnostic'
  | 'emplacements'
  | 'apropos'

const SECTIONS: { id: Onglet; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'memoire', label: 'Memoire et personnalite', icon: BrainCircuit },
  { id: 'terminal', label: 'Terminal Hermes', icon: TerminalIcon },
  { id: 'apparence', label: 'Apparence', icon: Palette },
  { id: 'diagnostic', label: 'Diagnostic', icon: Activity },
  { id: 'emplacements', label: 'Emplacements', icon: FolderOpen },
  { id: 'apropos', label: 'A propos', icon: Info },
]

// Les seules sections dont les valeurs passent par "Enregistrer" : le theme
// s'applique a la volee, le reste est en lecture seule.
const SECTIONS_AVEC_CHAMPS: Onglet[] = ['general', 'terminal']

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
  const notify = useHubStore((s) => s.notify)
  const setTheme = useHubStore((s) => s.setTheme)
  const saveConfig = useHubStore((s) => s.saveConfig)
  const openFolder = useHubStore((s) => s.openFolder)
  const bootstrap = useHubStore((s) => s.bootstrap)

  const [draft, setDraft] = useState<Partial<AppConfig>>({})
  const [saving, setSaving] = useState(false)
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [onglet, setOnglet] = useState<Onglet>('general')
  const [autoStart, setAutoStart] = useState(false)
  const [fichier, setFichier] = useState<string>('MEMORY.md')
  const [memoire, setMemoire] = useState<MemoryFile | null>(null)
  const [texteMemoire, setTexteMemoire] = useState('')
  const [proposition, setProposition] = useState<string | null>(null)
  const [reformulation, setReformulation] = useState(false)
  const [reinit, setReinit] = useState(false)
  const [maj, setMaj] = useState<Awaited<ReturnType<typeof api.checkUpdate>> | null>(null)
  const [majEnCours, setMajEnCours] = useState(false)

  useEffect(() => {
    api
      .autoStart()
      .then((r) => setAutoStart(r.enabled))
      .catch(() => setAutoStart(false))
  }, [])

  // Relu a chaque ouverture de l'onglet : Hermes ecrit dans ces fichiers entre
  // deux visites, on ne travaille jamais sur une version perimee.
  useEffect(() => {
    if (onglet !== 'memoire') return
    api
      .readMemory(fichier)
      .then((m) => {
        setMemoire(m)
        setTexteMemoire(m.content)
      })
      .catch(() => setMemoire(null))
  }, [onglet, fichier])

  const enregistrerMemoire = async () => {
    if (!memoire) return
    try {
      const m = await api.writeMemory(fichier, texteMemoire, memoire.stamp)
      setMemoire(m)
      setTexteMemoire(m.content)
      notify('success', `${fichier} enregistre.`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Enregistrement impossible')
    }
  }

  // La proposition ne touche jamais le fichier : elle s'affiche a cote, et
  // c'est l'utilisateur qui la reprend ou la jette.
  const reformuler = async () => {
    setReformulation(true)
    try {
      const r = await api.reformulateMemory(fichier, texteMemoire)
      setProposition(r.proposition)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Reformulation impossible')
    } finally {
      setReformulation(false)
    }
  }

  const reinitialiserMemoire = async () => {
    try {
      const m = await api.resetMemory(fichier)
      setMemoire(m)
      setTexteMemoire(m.content)
      setProposition(null)
      notify('success', `${fichier} est revenu a sa version d'origine.`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Reinitialisation impossible')
    } finally {
      setReinit(false)
    }
  }

  const restaurerMemoire = async () => {
    try {
      const m = await api.restoreMemory(fichier)
      setMemoire(m)
      setTexteMemoire(m.content)
      notify('success', 'Version precedente restauree.')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Restauration impossible')
    }
  }

  const verifierMaj = async () => {
    setMajEnCours(true)
    try {
      setMaj(await api.checkUpdate())
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Verification impossible')
    } finally {
      setMajEnCours(false)
    }
  }

  const appliquerMaj = async () => {
    if (!maj) return
    setMajEnCours(true)
    try {
      await api.applyUpdate(maj.tag)
      notify(
        'success',
        'Mise a jour installee. Ferme le Hub par son icone pres de l-horloge, puis relance-le.'
      )
      setMaj(null)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Mise a jour impossible')
    } finally {
      setMajEnCours(false)
    }
  }

  const basculerDemarrage = async (actif: boolean) => {
    try {
      const r = await api.setAutoStart(actif)
      setAutoStart(r.enabled)
      notify('success', r.enabled ? 'Le Hub demarrera avec Windows.' : 'Demarrage automatique retire.')
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Reglage impossible')
    }
  }

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

      {/* Deux colonnes, comme le coffre et le detail de projet : la page etait
          la derniere a empiler tous ses reglages dans un seul defilement. */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden px-2 py-2 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-wide muted">Reglages</p>
          </div>
          {SECTIONS.map(({ id, label, icon: Icone }) => (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              aria-current={onglet === id ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full ${
                onglet === id
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
            >
              <Icone className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-2xl space-y-5">
          {onglet === 'general' && (
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

            {/* Etat lu sur le disque : la case reflete la presence reelle du
                raccourci, elle ne peut pas mentir. Action immediate, donc
                hors du bouton "Enregistrer". */}
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-navy-800">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-sky-600"
                  checked={autoStart}
                  onChange={(e) => void basculerDemarrage(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium">Demarrer le Hub avec Windows</span>
                  <span className="mt-1 block text-[11px] muted">
                    Le Hub se lance en meme temps que la session, sans fenetre : tu retrouves son
                    icone pres de l'horloge. S'applique immediatement.
                  </span>
                </span>
              </label>
            </div>
          </section>
          )}

          {onglet === 'terminal' && (
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
                const couleurs = skins.find((s) => s.name === valeur)?.colors ?? []
                return (
                  <div key={key}>
                    <label htmlFor={`cfg-${key}`} className="mb-1.5 block text-xs font-medium">
                      {label}
                    </label>
                    <div className="flex items-center gap-3">
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
                      {/* Une liste deroulante native ne peut pas afficher de
                          couleur : l'apercu suit la selection, on fait defiler
                          les skins pour les voir. */}
                      <div
                        className="flex flex-shrink-0 gap-1"
                        title={couleurs.length ? `Couleurs de ${valeur}` : 'Skin perso : apercu inconnu'}
                      >
                        {(couleurs.length ? couleurs : ['transparent']).map((c, i) => (
                          <span
                            key={i}
                            className="h-5 w-5 rounded-full border border-slate-200 dark:border-navy-700"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] muted">{hint}</p>
                  </div>
                )
              })}
            </div>

          </section>
          )}

          {onglet === 'memoire' && (
          <section className="card p-5">
            <h3 className="mb-1 text-sm font-semibold">Memoire et personnalite</h3>
            <p className="mb-4 text-[11px] muted">
              Le contenu qu'Hermes relit a chaque session. Ce sont ses regles, pas ses reglages
              techniques : le modele et les cles restent du ressort de "hermes setup".
            </p>

            <div className="mb-4 flex flex-wrap gap-1">
              {FICHIERS_MEMOIRE.map((f) => (
                <button
                  key={f}
                  onClick={() => setFichier(f)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    fichier === f
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                      : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {memoire ? (
              <>
                <p className="text-xs font-medium">{memoire.titre}</p>
                <p className="mt-0.5 text-[11px] muted">{memoire.aide}</p>
                <textarea
                  className="input mt-3 h-72 resize-y font-mono text-[11px] leading-relaxed"
                  value={texteMemoire}
                  onChange={(e) => setTexteMemoire(e.target.value)}
                  spellCheck={false}
                />
                <p className="mt-1 break-all font-mono text-[10px] muted">{memoire.path}</p>
                {proposition !== null && (
                  <div className="mt-3 rounded-lg border border-sky-300 bg-sky-50/60 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
                    <p className="text-xs font-medium">Proposition d'Hermes</p>
                    <p className="mt-0.5 text-[11px] muted">
                      Rien n'est enregistre tant que tu n'as pas applique. Compare, puis decide.
                    </p>
                    <textarea
                      readOnly
                      className="input mt-2 h-56 resize-y font-mono text-[11px] leading-relaxed"
                      value={proposition}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setProposition(null)}
                        className="btn-ghost px-3 py-2 text-xs"
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => {
                          setTexteMemoire(proposition)
                          setProposition(null)
                        }}
                        className="btn-primary px-3 py-2 text-xs"
                      >
                        Reprendre cette version
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => void reformuler()}
                    className="btn-ghost mr-auto px-3 py-2 text-xs"
                    disabled={reformulation}
                    title="Hermes propose une version condensee. Tu la valides avant qu'elle ne soit ecrite."
                  >
                    <Sparkles className="h-4 w-4" />
                    {reformulation ? 'Hermes reflechit...' : 'Mettre au propre'}
                  </button>
                  {memoire.backup && (
                    <button
                      onClick={() => void restaurerMemoire()}
                      className="btn-ghost px-3 py-2 text-xs"
                      title="Revenir a la version d'avant le dernier enregistrement"
                    >
                      <RotateCcw className="h-4 w-4" /> Version precedente
                    </button>
                  )}
                  {memoire.origine && (
                    <button
                      onClick={() => setReinit(true)}
                      className="btn-ghost px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
                      title="Repartir du fichier tel que l'installateur l'a ecrit"
                    >
                      <History className="h-4 w-4" /> Version d'origine
                    </button>
                  )}
                  <button
                    onClick={() => void enregistrerMemoire()}
                    className="btn-primary px-3 py-2 text-xs"
                    disabled={texteMemoire === memoire.content}
                  >
                    <Save className="h-4 w-4" /> Enregistrer ce fichier
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[11px] muted">Lecture...</p>
            )}
          </section>
          )}

          {onglet === 'apparence' && (
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
              value={config?.theme ?? 'light'}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] muted">
              Le bouton en haut de l'accueil fait defiler les trois. Le menu lateral garde son bleu
              nuit dans tous les cas : c'est le repere de l'application.
            </p>
          </section>
          )}

          {onglet === 'diagnostic' && (
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
                  label="Git"
                  ok={!!diag.git}
                  valeur={diag.git ?? 'introuvable dans le PATH'}
                  aide={
                    diag.git
                      ? undefined
                      : "Hermes fonctionne, mais ses commandes shell et ses fonctions de depot sont hors service. Installe Git, ou rouvre ta session s'il vient d'etre installe."
                  }
                />
                <Ligne
                  label="Bash"
                  ok={!!diag.bash}
                  valeur={diag.bash ?? 'introuvable'}
                  aide={diag.bash ? undefined : "Fourni avec Git : c'est lui qu'Hermes utilise pour executer des commandes."}
                />
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
                  <button
                    onClick={() =>
                      api
                        .openLog()
                        .catch(() => notify('info', "Aucun journal pour l'instant : rien n'a echoue."))
                    }
                    className="btn-ghost mt-2 px-3 py-2 text-xs"
                  >
                    <FileText className="h-4 w-4" /> Ouvrir le journal
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] muted">Lecture de l'etat du systeme...</p>
            )}
          </section>
          )}

          {onglet === 'emplacements' && (
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
          )}

          {onglet === 'apropos' && (
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

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-navy-800">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void verifierMaj()}
                  className="btn-ghost px-3 py-2 text-xs"
                  disabled={majEnCours}
                >
                  <RefreshCw className={`h-4 w-4 ${majEnCours ? 'animate-spin' : ''}`} />
                  {majEnCours ? 'Verification...' : 'Verifier les mises a jour'}
                </button>
                {maj?.aJour && <span className="text-[11px] muted">Tu es a jour.</span>}
              </div>

              {maj && !maj.aJour && (
                <div className="mt-3 rounded-lg border border-sky-300 bg-sky-50/60 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
                  <p className="text-xs font-medium">
                    Version {maj.distante} disponible (tu as la {maj.locale})
                  </p>
                  {maj.notes && <p className="mt-1 text-[11px] muted">{maj.notes}</p>}
                  {maj.applicable ? (
                    <button
                      onClick={() => void appliquerMaj()}
                      className="btn-primary mt-3 px-3 py-2 text-xs"
                      disabled={majEnCours}
                    >
                      <Download className="h-4 w-4" /> Mettre a jour le Hub
                    </button>
                  ) : (
                    <>
                      {/* Une version qui depasse le perimetre du Hub ne peut pas
                          s'appliquer d'ici : elle toucherait des fichiers que le
                          bouton ne gere pas. On le dit au lieu de bricoler. */}
                      <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                        Cette version demande de relancer l'installateur : elle ne se limite pas au
                        Hub.
                      </p>
                      {maj.telechargement && (
                        <a
                          href={maj.telechargement}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost mt-3 inline-flex px-3 py-2 text-xs"
                        >
                          <Download className="h-4 w-4" /> Telecharger l'installateur
                        </a>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
          )}
            </div>
          </div>

          {/* Barre collante, toujours visible sur les sections qui contiennent
              des champs : on doit savoir ou l'on enregistre avant d'avoir
              modifie quoi que ce soit. Sur les sections en lecture seule elle
              n'apparait que s'il reste des modifications en attente - sinon,
              changer de volet les ferait passer a la trappe en silence. */}
          {(SECTIONS_AVEC_CHAMPS.includes(onglet) || dirty) && (
            <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-navy-800 dark:bg-navy-900 sm:px-6">
              <span className="text-[11px] muted">
                {dirty ? 'Modifications non enregistrees' : 'Tout est enregistre'}
              </span>
              <button onClick={submit} className="btn-primary" disabled={!dirty || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {reinit && (
        <ConfirmDialog
          title={`Revenir a la version d'origine de ${fichier} ?`}
          danger
          confirmLabel="Revenir a l'origine"
          onConfirm={reinitialiserMemoire}
          onClose={() => setReinit(false)}
          message={
            <>
              <p>
                Le fichier repart de ce que l'installateur avait ecrit. Tes modifications, et ce
                qu'Hermes a memorise depuis, disparaissent du fichier.
              </p>
              <p className="mt-2 muted">
                La version actuelle est sauvegardee : le bouton "Version precedente" la ramene.
              </p>
            </>
          }
        />
      )}
    </div>
  )
}
