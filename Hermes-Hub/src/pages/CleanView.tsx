import { AlertTriangle, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useHubStore } from '../store/useHubStore'

interface Props {
  onMenu: () => void
}

export function CleanView({ onMenu }: Props) {
  const config = useHubStore((s) => s.config)
  const launchHermes = useHubStore((s) => s.launchHermes)
  const [busy, setBusy] = useState(false)

  const profile = config?.cleanProfile || 'clean'

  const launch = async () => {
    setBusy(true)
    await launchHermes({ profile })
    setBusy(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Hermes Clean Agent"
        subtitle="Session vierge, sans memoire"
        icon={<Sparkles className="h-4 w-4 text-teal-500" />}
        onMenu={onMenu}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Aucune donnee conservee
                </h3>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90">
                  Clean Agent demarre Hermes sans memoire ni historique. Rien de cette session ne
                  sera ecrit dans ta memoire globale.
                </p>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold">A quoi ca sert ?</h3>
              <p className="text-xs leading-relaxed muted">
                A tester une idee, verifier un comportement de Hermes ou faire un essai sans polluer
                la memoire de tes projets. Le profil est totalement independant du profil principal.
              </p>

              <h3 className="mb-2 mt-5 text-sm font-semibold">Configuration</h3>
              <ul className="space-y-2 text-xs muted">
                {[
                  `Profil : ${profile}`,
                  'Aucun historique de conversation',
                  'Aucun fichier memoire charge',
                  'Modele defini dans ton profil Hermes',
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start justify-center">
            <div className="card w-full max-w-sm p-8 text-center">
              <img
                src="./hermes-clean.png"
                alt=""
                className="mx-auto mb-6 h-24 w-24 object-contain"
              />
              <button onClick={launch} className="btn-primary w-full py-3" disabled={busy}>
                <Play className="h-5 w-5" />
                {busy ? 'Lancement...' : 'Lancer Clean Agent'}
              </button>
              <p className="mt-4 font-mono text-[10px] muted">hermes -p {profile}</p>
              <p className="mt-2 text-[11px] muted">
                Un terminal Windows s'ouvre dans ton dossier de travail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
