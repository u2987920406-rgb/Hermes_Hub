/**
 * L'alerte d'essai - Configuration > Developpement.
 *
 * ELLE SERT A JUGER LA LIGNE D'ALERTE SANS ATTENDRE QU'UN AGENT DEMANDE
 * QUELQUE CHOSE. Verifier qu'une autorisation apparait au meme endroit sur les
 * trois ecrans supposait sinon de lancer un vrai scenario et d'esperer qu'il
 * demande a ecrire : **une verification qui depend de la chance n'en est pas
 * une**, et celle-ci est justement la porte du chantier 2.
 *
 * Elle vit dans Developpement, avec Clean Agent : ce sont les deux outils
 * d'essai du Hub, et aucun des deux n'a de rang dans l'usage courant.
 *
 * Elle ne survit pas au rechargement - c'est dans le magasin, pas dans
 * `localStorage`, et c'est deliberé : une fausse demande qu'on retrouverait le
 * lendemain finirait par etre prise pour une vraie.
 */
import { ShieldAlert } from 'lucide-react'
import { useHubStore } from '../store/useHubStore'

export function AlerteEssai() {
  const alerteEssai = useHubStore((s) => s.alerteEssai)
  const basculer = useHubStore((s) => s.basculerAlerteEssai)

  return (
    <div
      data-zone="alerte-essai"
      className="mt-5 border-t border-slate-200 pt-4 dark:border-navy-700"
    >
      <h3 className="mb-1 text-sm font-semibold">Alerte d essai</h3>
      <p className="mb-3 text-[11px] muted">
        Pose une fausse autorisation dans la ligne d alerte, pour verifier qu elle apparait au
        meme endroit sur tous les ecrans - Studio compris, ou il n y a pas de barre laterale.
        Elle ne bloque personne, et elle disparait au rechargement.
      </p>
      <button onClick={basculer} className={alerteEssai ? 'btn-danger' : 'btn-ghost'}>
        <ShieldAlert className="mr-1.5 inline h-4 w-4" />
        {alerteEssai ? 'Retirer l alerte d essai' : 'Poser une alerte d essai'}
      </button>
    </div>
  )
}
