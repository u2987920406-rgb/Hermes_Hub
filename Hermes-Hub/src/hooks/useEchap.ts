/**
 * Echap ferme ce qui est convoque.
 *
 * LA REGLE, ET ELLE EST SIMPLE : une chose permanente se replie, une chose
 * convoquee se ferme - et ce qui se ferme se ferme aussi par Echap. C'etait
 * l'un des quatre trous de `GRAMMAIRE-PANNEAUX.md` : Echap ne fermait qu'aux
 * deux ou trois endroits ou quelqu'un y avait pense, chacun avec sa propre
 * copie du meme `addEventListener`. Un geste qui marche une fois sur trois est
 * pire qu'un geste absent : on cesse de l'essayer.
 *
 * `actif` plutot qu'un montage conditionnel : un panneau qui se cache sans se
 * demonter garderait sinon son ecouteur, et Echap fermerait le voisin.
 *
 * L'ECOUTE EST POSEE EN CAPTURE. Sans ca, un champ de saisie qui traite Echap
 * pour son compte - vider une recherche, annuler un renommage - laissait
 * l'evenement remonter et fermait le panneau par-dessus le marche. En capture,
 * le panneau voit la touche en premier ; a lui d'etre ferme dans le bon ordre
 * en empilant les appels, du plus interieur au plus exterieur.
 */
import { useEffect } from 'react'

export function useEchap(actif: boolean, fermer: () => void) {
  useEffect(() => {
    if (!actif) return
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Ne pas voler la touche a un champ qui s'en sert : un renommage en
      // cours s'annule d'abord, le panneau se ferme au coup suivant.
      const cible = e.target as HTMLElement | null
      if (cible?.dataset?.echapPrisEnCharge === '1') return
      e.stopPropagation()
      fermer()
    }
    document.addEventListener('keydown', auClavier, true)
    return () => document.removeEventListener('keydown', auClavier, true)
  }, [actif, fermer])
}
