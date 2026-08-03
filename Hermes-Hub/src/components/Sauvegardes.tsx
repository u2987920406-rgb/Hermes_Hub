/**
 * Sauvegarder et restaurer, depuis le Hub.
 *
 * Un poste client qui meurt emporte aujourd'hui les profils, la memoire, le
 * tableau et le Coffre. Il n'y avait aucun bouton, et la personne qu'on appelle
 * dans ce cas-la est celui qui a pose l'installation.
 *
 * L'ECRAN INSISTE SUR DEUX CHOSES, et ce ne sont pas les plus evidentes.
 *
 * La premiere : une sauvegarde AMPUTEE se voit. `hermes backup` ne couvre que le
 * home d'Hermes ; le Coffre et les Projets font la seconde archive. Une ligne
 * qui n'aurait que la premiere serait une fausse securite - exactement la panne
 * qu'on traque partout ailleurs, celle qui rend un resultat plausible.
 *
 * La seconde : RESTAURER PREND UN FILET. On sauvegarde ce qui est en place avant
 * d'ecraser, et l'ecran le dit avant qu'on clique. Quelqu'un qui se trompe
 * d'archive doit pouvoir revenir - et il doit le savoir AVANT, sinon il n'ose
 * pas cliquer du tout.
 */
import { AlertTriangle, Archive, FolderOpen, HardDriveDownload, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { EtatSauvegardes, Sauvegarde } from '../types'

/** Des octets qu'on lit d'un coup d'oeil : personne ne compte les zeros. */
function poids(octets: number) {
  if (octets > 1024 * 1024 * 1024) return `${(octets / 1024 ** 3).toFixed(1)} Go`
  if (octets > 1024 * 1024) return `${Math.round(octets / 1024 ** 2)} Mo`
  return `${Math.max(1, Math.round(octets / 1024))} Ko`
}

/** « 2026-08-03-14h30 » se lit mal. « 3 aout 2026, 14h30 » se lit. */
function quand(nom: string) {
  const m = nom.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})h(\d{2})$/)
  if (!m) return nom
  const mois = [
    'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  ]
  return `${Number(m[3])} ${mois[Number(m[2]) - 1]} ${m[1]}, ${m[4]}h${m[5]}`
}

export function Sauvegardes() {
  const [etat, setEtat] = useState<EtatSauvegardes | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  const [aRestaurer, setARestaurer] = useState<Sauvegarde | null>(null)
  const notifier = useHubStore((s) => s.notify)

  const charger = useCallback(async () => {
    try {
      setEtat(await api.sauvegardes())
    } catch {
      setEtat(null)
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const sauvegarder = async () => {
    setOccupe('sauvegarde')
    try {
      const r = await api.sauvegarder()
      if (r.complete) {
        notifier('success', `Sauvegarde du ${quand(r.nom)} faite.`)
      } else {
        // On ne fete pas une sauvegarde a moitie : elle vaut mieux que rien, et
        // il faut dire ce qui manque tant qu'on peut encore le reparer.
        const manque = [!r.home.ok && 'le home d Hermes', !r.travail.ok && 'l espace de travail']
          .filter(Boolean)
          .join(' et ')
        notifier('error', `Sauvegarde incomplete : ${manque} manque. ${r.home.message || r.travail.message || ''}`)
      }
      await charger()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "La sauvegarde n a pas abouti.")
    } finally {
      setOccupe(null)
    }
  }

  const restaurer = async (s: Sauvegarde) => {
    setOccupe(s.nom)
    setARestaurer(null)
    try {
      const r = await api.restaurer(s.nom)
      if (r.ok) {
        notifier(
          'success',
          `Poste restaure. L etat precedent est garde sous « ${quand(r.filet)} ». Relance Hermes et le Hub.`,
        )
      } else {
        notifier('error', r.resultats.find((x) => !x.ok)?.message || 'La restauration a echoue.')
      }
      await charger()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "La restauration n a pas abouti.")
    } finally {
      setOccupe(null)
    }
  }

  return (
    <section data-zone="sauvegardes" className="card p-5">
      <h3 className="mb-1 text-sm font-semibold">Sauvegarde</h3>
      <p className="mb-4 text-[11px] leading-relaxed muted">
        Deux archives, parce que tes donnees vivent a deux endroits :{' '}
        <strong>le home d Hermes</strong> - profils, memoire, tableau, sessions - et{' '}
        <strong>l espace de travail</strong> - le Coffre et les Projets. Le Hub lui-meme n y est
        pas : il revient par l installateur.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void sauvegarder()}
          disabled={!!occupe}
          className="btn-primary gap-1.5 text-xs disabled:opacity-40"
        >
          <Archive className="h-3.5 w-3.5" />
          {occupe === 'sauvegarde' ? 'Compression en cours...' : 'Sauvegarder maintenant'}
        </button>
        {/* Le chemin s'affiche, il ne s'ouvre pas d'un clic : cela demanderait
            une route capable d'ouvrir n'importe quel dossier depuis une page
            web, et ce serait un mauvais echange pour un confort. */}
        {etat && (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] muted">
            <FolderOpen className="h-3.5 w-3.5 flex-none" />
            <span className="truncate font-mono">{etat.dossier}</span>
          </span>
        )}
      </div>

      {occupe === 'sauvegarde' && (
        <p className="mb-3 text-[11px] muted">
          Compte une a plusieurs minutes selon la taille du Coffre. Ne ferme pas le Hub.
        </p>
      )}

      {etat && etat.sauvegardes.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-navy-700">
          <p className="text-xs muted">
            Aucune sauvegarde. Si ce poste tombe en panne aujourd hui, ta memoire, tes agents et
            ton Coffre partent avec lui.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {etat?.sauvegardes.map((s) => (
          <div
            key={s.nom}
            data-zone="ligne-sauvegarde"
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              s.complete
                ? 'border-slate-200 dark:border-navy-700'
                : 'border-amber-300 dark:border-amber-500/40'
            }`}
          >
            <Archive
              className={`h-4 w-4 flex-none ${s.complete ? 'muted' : 'text-amber-500'}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{quand(s.nom)}</p>
              {s.complete ? (
                <p className="text-[11px] muted">
                  {poids(s.octets)} — le home d Hermes et l espace de travail
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Incomplete : il manque {s.home ? 'l espace de travail' : 'le home d Hermes'}.
                  Restaurer ne rendrait qu une partie.
                </p>
              )}
            </div>

            <button
              onClick={() => setARestaurer(s)}
              disabled={!!occupe}
              className="btn-ghost flex-none gap-1.5 px-2.5 py-1.5 text-[11px] disabled:opacity-40"
            >
              <HardDriveDownload className="h-3.5 w-3.5" />
              {occupe === s.nom ? 'Restauration...' : 'Restaurer'}
            </button>
            <button
              onClick={async () => {
                await api.supprimerSauvegarde(s.nom).catch(() => null)
                await charger()
              }}
              disabled={!!occupe}
              className="btn-ghost flex-none px-1.5 py-1.5"
              title="Supprimer cette sauvegarde"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* La confirmation dit ce qui va etre ecrase ET ce qui protege. Sans le
          filet annonce, personne n'ose cliquer ; sans l'avertissement, on clique
          trop vite. */}
      {aRestaurer && (
        <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50/60 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
          <div className="mb-2 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-rose-500" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">
                Revenir a l etat du {quand(aRestaurer.nom)} ?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Tes profils, ta memoire, ton tableau et ton Coffre seront{' '}
                <strong>remplaces</strong> par ceux de cette sauvegarde. Ce qui a ete fait depuis
                sera perdu.
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed muted">
                Une sauvegarde de l etat actuel est prise <strong>avant</strong> d ecraser quoi que
                ce soit : si tu te trompes d archive, tu pourras revenir. Ferme Hermes et les
                agents en cours avant de continuer.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setARestaurer(null)} className="btn-ghost gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
            <button onClick={() => void restaurer(aRestaurer)} className="btn-danger text-xs">
              Restaurer
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
