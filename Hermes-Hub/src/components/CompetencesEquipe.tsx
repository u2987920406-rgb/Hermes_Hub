/**
 * Ce que l'equipe a deja reussi - le PROUVE, pas le declare.
 *
 * DEUX CHOSES PORTENT LE MOT « COMPETENCE » DANS CE PRODUIT, et les confondre
 * serait l'erreur du chantier 5 :
 *
 *   - le **declare** vit dans la description d'un agent, celle que le
 *     decomposeur lit pour lui confier une tache. Elle se modifie juste
 *     au-dessus, sur sa fiche ;
 *   - le **prouve** vit ici : une fiche ecrite dans le Coffre quand un scenario
 *     a abouti, avec sa forme, ses etapes et ses mots-cles. Personne ne l'a
 *     redigee - elle est le residu d'un travail qui a marche.
 *
 * ⚠ TOUT EXISTAIT SAUF LE GESTE, comme pour la description. `lireCompetences`,
 * la route, `api.competences` : ecrits le 3 aout, jamais atteints. Le detecteur
 * d'exports morts ne pouvait pas le voir - `api.competences` est une propriete
 * d'objet, pas un export nomme, et sa garde ne regarde que les clauses
 * d'import. Quatrieme cas en deux jours.
 *
 * ON N'AJOUTE RIEN ICI, ON OUBLIE. Une fiche ne se cree pas a la main : elle
 * naitrait sans le scenario qui la justifie, et « la derniere fois, voila ce qui
 * avait marche » deviendrait une phrase sans derniere fois. Le seul geste est
 * donc de retirer celle qui ne vaut plus - une forme qu'on ne veut plus voir
 * reproposee.
 */
import { BookMarked, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { Competence } from '../types'

/** `2026-08-03` est une date de fichier, pas une date qu'on lit. Le reste du Hub
 *  dit « 3 aout 2026 » ; une fiche n'a pas de raison de parler autrement. */
function quand(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CompetencesEquipe() {
  const [fiches, setFiches] = useState<Competence[] | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  /** Oublier EFFACE le fichier du Coffre, sans corbeille. La corbeille des
   *  outils juste au-dessus demande deux clics ; celle-ci le doit d'autant
   *  plus, et c'est le meme geste a l'ecran. */
  const [confirme, setConfirme] = useState<string | null>(null)
  const [panne, setPanne] = useState<string | null>(null)
  const notifier = useHubStore((s) => s.notify)

  /** ⚠ PAS DE `.catch(() => [])` ICI. Une liste vide en cas de panne dirait
   *  « aucune fiche » — un mensonge tranquille, et exactement l'avaleur
   *  d'erreur qu'`ADM.md` reproche a trente endroits du Studio : le serveur
   *  refuse, l'ecran affirme le contraire, et personne n'a de raison de
   *  soupconner le serveur. La panne se lit sur place. */
  const charger = useCallback(async () => {
    try {
      setPanne(null)
      setFiches(await api.competences())
    } catch (e) {
      setFiches([])
      setPanne(e instanceof ApiError ? e.message : 'Le Coffre n a pas pu etre lu.')
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const oublier = async (f: Competence) => {
    setOccupe(f.fichier)
    try {
      await api.oublierCompetence(f.fichier)
      notifier('info', `« ${f.titre} » ne sera plus reproposee.`)
      setConfirme(null)
      await charger()
    } catch (e) {
      notifier('error', e instanceof ApiError ? e.message : "La fiche n a pas pu etre oubliee.")
    } finally {
      setOccupe(null)
    }
  }

  if (!fiches) return null

  return (
    <div data-zone="competences-equipe" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BookMarked className="h-4 w-4 flex-none muted" />
        <p className="min-w-0 flex-1 text-xs muted">
          Ce que l equipe a deja reussi. Une fiche est ecrite quand un scenario aboutit, et sert a
          reproposer sa forme quand une demande y ressemble.
        </p>
      </div>

      {/* Le vide se dit, et il dit OU EST LE GESTE : sinon on cherche ici le
          bouton qui manque. Il n'y en a pas ici, et pas par oubli - la fiche se
          prend a la fin d'un scenario, dans le Studio, sur « Mettre en
          memoire ». Nommer l'endroit coute une ligne ; ne pas le nommer laisse
          un panneau vide qui a l'air casse. */}
      {panne ? (
        <p className="bandeau sens-alerte text-[11px] leading-relaxed">
          <span className="teinte-sens">{panne}</span>
        </p>
      ) : fiches.length === 0 ? (
        <p className="text-[11px] leading-relaxed muted">
          Aucune fiche pour l instant. Elles ne s ecrivent pas ici : a la fin d un scenario reussi,
          « Mettre en memoire » dans le Studio garde sa forme dans le Coffre.
        </p>
      ) : (
        <div className="space-y-1.5">
          {fiches.map((f) => (
            <div
              key={f.fichier}
              data-zone="ligne-competence"
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-navy-800"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{f.titre}</span>
                <span className="block text-[10.5px] leading-snug muted">
                  {f.etapes > 0 && `${f.etapes} etape${f.etapes > 1 ? 's' : ''}`}
                  {f.etapes > 0 && f.date ? ' · ' : ''}
                  {quand(f.date)}
                </span>
              </span>
              {/* Les mots-cles ne sont pas decoratifs : c'est sur eux que le
                  rapprochement se fait, et deux mots communs suffisent. Les
                  montrer, c'est montrer pourquoi une fiche reviendra. */}
              <span className="flex flex-wrap items-center gap-1">
                {f.tags.slice(0, 5).map((t) => (
                  <span key={t} className="puce sens-neutre">
                    {t}
                  </span>
                ))}
              </span>
              {confirme === f.fichier ? (
                <span className="flex flex-none items-center gap-1">
                  <button
                    onClick={() => void oublier(f)}
                    disabled={occupe === f.fichier}
                    className="btn-danger px-2 py-1 text-[11px] disabled:opacity-40"
                  >
                    Oublier
                  </button>
                  <button onClick={() => setConfirme(null)} className="btn-ghost px-1.5 py-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirme(f.fichier)}
                  title="Oublier cette fiche : elle sera effacee du Coffre, sans corbeille"
                  className="btn-ghost flex-none px-1.5 py-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
