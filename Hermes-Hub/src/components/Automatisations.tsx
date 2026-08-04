/**
 * Ce qui tournera sans toi.
 *
 * Le Hub ne tient aucune horloge : il montre celle d'Hermes. Un compteur du
 * navigateur ne battrait que la fenetre ouverte, donc jamais la nuit - qui est
 * precisement le moment ou l'on veut qu'une automatisation parte.
 *
 * LE BANDEAU D'ALERTE N'EST PAS UN ORNEMENT. Une tache programmee ne se
 * declenche que si la passerelle d'Hermes tourne en service. Sans elle, tout
 * paraît normal - la tache est la, sa prochaine echeance est calculee - et rien
 * ne part jamais. Une automatisation qu'on croit posee est pire que pas
 * d'automatisation du tout : on compte dessus. On le dit donc, fort, et
 * seulement quand ca compte : des taches actives et rien pour les declencher.
 */
import { AlarmClock, CircleSlash, Pause, Play, Trash2, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { NouvelleAutomatisation } from './NouvelleAutomatisation'
import { useHubStore } from '../store/useHubStore'
import type { EtatAutomatisations } from '../types'

/** « dans 3 h », « demain a 9h » - une date brute ne se lit pas d'un coup. */
function quandArrive(iso: string | null) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const min = Math.round((t - Date.now()) / 60000)
  if (min < 0) return 'en retard'
  if (min < 1) return "a l'instant"
  if (min < 60) return `dans ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `dans ${h} h`
  return `dans ${Math.round(h / 24)} j`
}

interface Props {
  /**
   * Ne garder que ce qui alerte.
   *
   * L'accueil est devenu une conversation : au premier message, tout s'efface
   * pour laisser le fil seul. Tout, sauf ceci. Une tache qui part chaque matin
   * et rate en silence ne se decouvre autrement qu'en allant la chercher - et
   * on ne cherche pas ce qu'on croit acquis. La section entiere revient au
   * salut, ou « Nouvelle » ramene.
   */
  alertesSeules?: boolean
}

export function Automatisations({ alertesSeules = false }: Props) {
  const [etat, setEtat] = useState<EtatAutomatisations | null>(null)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const charger = useCallback(async () => {
    setEtat(await api.automatisations().catch(() => null))
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const agir = useCallback(
    async (faire: () => Promise<unknown>, dit: string) => {
      setOccupe(true)
      try {
        await faire()
        notifier('success', dit)
      } catch (e) {
        notifier('error', e instanceof Error ? e.message : 'Geste impossible.')
      } finally {
        setOccupe(false)
        await charger()
      }
    },
    [charger, notifier],
  )

  // Le serveur n'a pas repondu : on ne montre rien plutot qu'une section morte.
  if (!etat) return null

  const vide = etat.automatisations.length === 0

  if (alertesSeules) {
    // Une suspendue ne partira pas : son echec d'hier n'a plus rien d'urgent,
    // et le rappeler par-dessus une conversation serait du bruit.
    const ratees = etat.automatisations.filter((a) => a.resultat === 'error' && !a.suspendue)
    if (!etat.muettes && ratees.length === 0) return null

    return (
      <div data-zone="alerte-automatisation" className="space-y-1.5">
        {etat.muettes && (
          <div className="bandeau sens-alerte text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 flex-none teinte-sens" />
            <span>
              Tes automatisations ne partiront pas : la passerelle d-Hermes ne tourne pas.
              Dans un terminal, <code className="font-mono">hermes gateway install</code>.
            </span>
          </div>
        )}
        {ratees.map((a) => (
          <div key={a.id} className="bandeau sens-danger text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 flex-none teinte-sens" />
            <span className="min-w-0 truncate">
              « {a.nom} » : derniere execution en echec{a.erreur ? ` - ${a.erreur}` : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section data-zone="automatisations">
      <div className="mb-3 flex items-center gap-2">
        <AlarmClock className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold">Automatisations en cours</h3>
        <span className="flex-1" />
        <NouvelleAutomatisation onFait={() => void charger()} />
      </div>

      {etat.muettes && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 text-[11px] leading-relaxed">
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              Ces automatisations ne partiront pas.
            </p>
            <p className="mt-0.5">
              La passerelle d-Hermes ne tourne pas : les taches programmees ne se
              declenchent que si elle est installee en service. Dans un terminal :
            </p>
            <code className="mt-1 block rounded bg-white px-2 py-1 font-mono text-[10px] dark:bg-navy-900">
              hermes gateway install
            </code>
          </div>
        </div>
      )}

      {vide && (
        <p className="text-[11px] muted">
          Rien de programme. « Programmer » pose une demande qui partira toute
          seule, meme le Hub ferme.
        </p>
      )}

      <div className="space-y-2">
        {etat.automatisations.map((a) => (
          <div
            key={a.id}
            className="card flex items-center gap-3 p-3"
            data-suspendue={a.suspendue || undefined}
          >
            {a.suspendue ? (
              <CircleSlash className="h-4 w-4 flex-none text-slate-400" />
            ) : (
              <AlarmClock className="h-4 w-4 flex-none text-sky-500" />
            )}

            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${a.suspendue ? 'muted' : ''}`}>
                {a.nom}
              </p>
              <p className="truncate text-[11px] muted">
                {a.quand}
                {a.suspendue
                  ? ' - suspendue'
                  : quandArrive(a.prochaine)
                    ? ` - ${quandArrive(a.prochaine)}`
                    : ''}
              </p>
              {/* L'echec de la derniere execution vaut d'etre lu : une tache
                  qui part et rate en silence tous les matins ne se decouvre
                  autrement qu'en cherchant. */}
              {a.resultat === 'error' && (
                <p className="truncate text-[11px] text-red-600 dark:text-red-400">
                  Derniere execution en echec{a.erreur ? ` : ${a.erreur}` : ''}
                </p>
              )}
            </div>

            <button
              onClick={() =>
                void agir(
                  () => api.suspendreAutomatisation(a.id, !a.suspendue),
                  a.suspendue ? 'Automatisation reprise.' : 'Automatisation suspendue.',
                )
              }
              disabled={occupe}
              title={a.suspendue ? 'Reprendre' : 'Suspendre'}
              className="btn-ghost px-2 py-1.5 disabled:opacity-40"
            >
              {a.suspendue ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() =>
                void agir(() => api.retirerAutomatisation(a.id), 'Automatisation retiree.')
              }
              disabled={occupe}
              title="Retirer"
              className="btn-ghost px-2 py-1.5 text-red-600 disabled:opacity-40 dark:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
