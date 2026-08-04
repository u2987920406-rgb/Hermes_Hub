/**
 * Ce qui tournera sans toi.
 *
 * Le Hub ne tient aucune horloge : il montre celle d'Hermes. Un compteur du
 * navigateur ne battrait que la fenetre ouverte, donc jamais la nuit - qui est
 * precisement le moment ou l'on veut qu'une automatisation parte.
 *
 * CE QUI EN EST PARTI AU CHANTIER 2 : la variante `alertesSeules`, qui posait
 * une bande au-dessus du fil de l'accueil. La ligne d'alerte partagee le fait
 * maintenant sur les trois ecrans, avec les autorisations et les scenarios
 * finis - et deux surfaces pour la meme nouvelle finissent par se contredire.
 * Ce qui reste ici est la section entiere : programmer, suspendre, retirer.
 *
 * LE BANDEAU D'ALERTE N'EST PAS UN ORNEMENT. Une tache programmee ne se
 * declenche que si la passerelle d'Hermes tourne en service. Sans elle, tout
 * paraît normal - la tache est la, sa prochaine echeance est calculee - et rien
 * ne part jamais. Une automatisation qu'on croit posee est pire que pas
 * d'automatisation du tout : on compte dessus. On le dit donc, fort, et
 * seulement quand ca compte : des taches actives et rien pour les declencher.
 */
import { AlarmClock, CircleSlash, Pause, Play, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { NouvelleAutomatisation } from './NouvelleAutomatisation'
import { useHubStore } from '../store/useHubStore'

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

export function Automatisations() {
  // L'etat vient du magasin : la ligne d'alerte a besoin de la meme chose, et
  // deux lectures separees du meme endpoint finiraient par ne plus dire la meme
  // chose - celle-ci relit apres chaque geste, l'autre a l'ouverture d'un ecran.
  const etat = useHubStore((s) => s.automatisations)
  const charger = useHubStore((s) => s.rafraichirAutomatisations)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

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

  return (
    <section data-zone="automatisations">
      <div className="mb-3 flex items-center gap-2">
        <AlarmClock className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold">Automatisations en cours</h3>
        <span className="flex-1" />
        <NouvelleAutomatisation onFait={() => void charger()} />
      </div>

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
