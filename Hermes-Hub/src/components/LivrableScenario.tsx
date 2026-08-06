/**
 * Ce qu'un pole a produit, et ou le trouver.
 *
 * POURQUOI CE BLOC EXISTE. « Le pole a fini sa tache. Par contre, je ne sais pas
 * ou je dois retrouver les resultats ni dans quel fichier. Ils ne sont ni
 * apparents, accessibles nulle part. Donc, ca pose un probleme. » - kuchu,
 * 03/08/2026, apres avoir mene un pole jusqu'au bout.
 *
 * Le dossier existait depuis toujours : `Chantier` en porte un des sa
 * construction, un dossier par pole a cote de Projets et du Coffre. Il etait
 * dans l'API et ne s'affichait nulle part. Un pole qui produit un livrable
 * introuvable n'a pas fini son travail - il l'a perdu.
 *
 * TROIS ETATS, ET ILS NE DISENT PAS LA MEME CHOSE :
 *
 *   - pas de dossier : le pole n'a jamais tourne. Ce n'est pas un probleme, et
 *     on ne montre rien ;
 *   - un dossier vide : il a tourne et n'a RIEN ecrit. C'en est peut-etre un,
 *     et ca se dit ;
 *   - des fichiers : on les nomme, avec leur poids.
 *
 * Confondre les deux premiers ferait passer un pole sterile pour un pole neuf.
 *
 * ⚠ CE BLOC NE LIT PLUS LE DOSSIER LUI-MEME - c'est le Studio qui le lit, et il
 * le passe. Depuis C8 (6 aout), le bilan « Annonce / rendu » du panneau plan
 * raconte la meme chose que cet encart. Deux lectures independantes pour une
 * seule verite, c'est la panne du 5 aout mot pour mot : elles divergent, et
 * celle qu'on regarde n'est pas celle qui a raison.
 */
import { FolderOpen, FileText } from 'lucide-react'
import { useState } from 'react'
import { Attente } from './Attente'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { Livrable } from '../types'

function poids(octets: number) {
  if (octets > 1024 * 1024) return `${Math.round(octets / 1024 ** 2)} Mo`
  if (octets > 1024) return `${Math.round(octets / 1024)} Ko`
  return `${octets} o`
}

export function LivrableScenario({
  poleId,
  livrable,
}: {
  poleId: string
  livrable: Livrable | null
}) {
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  if (!livrable?.dossier) return null

  const ouvrir = async () => {
    setOccupe(true)
    try {
      await api.openFolder({ pole: poleId })
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "Le dossier n a pas pu etre ouvert.")
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section data-zone="livrable-scenario" className="card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">
          {livrable.fichiers.length === 0
            ? 'Aucun fichier produit'
            : `${livrable.fichiers.length} fichier${livrable.fichiers.length > 1 ? 's' : ''} produit${
                livrable.fichiers.length > 1 ? 's' : ''
              }`}
        </h3>
        <button
          onClick={() => void ouvrir()}
          disabled={occupe}
          className="btn-ghost gap-1.5 px-2.5 py-1.5 text-[11px] disabled:opacity-40"
        >
          {occupe ? <Attente actif /> : <FolderOpen className="h-3.5 w-3.5" />}
          Ouvrir le dossier
        </button>
      </div>

      <p className="mb-3 break-all font-mono text-[10px] muted">{livrable.dossier}</p>

      {livrable.fichiers.length === 0 ? (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Le scenario a tourne mais n a rien ecrit ici. Ses taches ont peut-etre rendu du texte plutot
          que des fichiers - ou elles ont ecrit ailleurs.
        </p>
      ) : (
        <ul className="space-y-1">
          {livrable.fichiers.map((f) => (
            <li key={f.nom} className="flex items-center gap-2 text-[11px]">
              <FileText className="h-3 w-3 flex-none muted" />
              <span className="min-w-0 flex-1 truncate font-mono">{f.nom}</span>
              <span className="flex-none tabular-nums muted">{poids(f.octets)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
