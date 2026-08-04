/**
 * Replier / developper un panneau permanent.
 *
 * TROIS REGLES DE `GRAMMAIRE-PANNEAUX.md` TIENNENT DANS CE FICHIER, et c'est
 * la raison de son existence : elles se perdaient a etre reecrites a chaque
 * panneau.
 *
 *   - **une chose permanente se replie, une chose convoquee se ferme.** Ce
 *     bouton ne doit donc jamais servir a fermer : un `X` sur un panneau
 *     permanent serait un mensonge, il reviendrait tout seul au clic suivant ;
 *   - **un panneau replie garde son etat** d'une session a l'autre. La barre
 *     laterale le faisait deja, seule ; `useRepli` le rend gratuit pour les
 *     suivants ;
 *   - **l'icone montre la destination, pas l'etat courant.** Replie, on affiche
 *     `...Open` parce que le clic developpe. Montrer l'etat pendant que le clic
 *     mene ailleurs induit en erreur - c'est deja ce que fait le bouton de
 *     theme, et pour la meme raison.
 *
 * `PanelRightClose` / `PanelRightOpen` n'etaient employes nulle part alors que
 * la refonte pose des panneaux des deux cotes. Le cote est ici un parametre :
 * le jour ou le panneau du plan trouve son jumeau a droite, il n'y a rien a
 * ecrire, juste `cote="droite"` a passer.
 *
 * Et **un raccourci qui ne s'affiche pas n'existe pas** : `raccourci` se pose
 * dans l'infobulle, jamais ailleurs qu'a cote du geste qu'il double.
 */
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useCallback, useState } from 'react'

/**
 * L'etat de repli d'un panneau, retenu d'une fois sur l'autre.
 *
 * Preference d'affichage pure : elle reste sur le poste, dans `localStorage`,
 * et pas dans le workspace partage avec Hermes. Un collegue qui ouvre le meme
 * workspace n'herite pas de la disposition d'un autre.
 */
export function useRepli(cle: string, defaut = false): [boolean, () => void] {
  const [replie, setReplie] = useState(() => {
    try {
      const brut = localStorage.getItem(cle)
      return brut === null ? defaut : brut === '1'
    } catch {
      return defaut
    }
  })

  const basculer = useCallback(() => {
    setReplie((avant) => {
      const apres = !avant
      try {
        localStorage.setItem(cle, apres ? '1' : '0')
      } catch {
        /* navigation privee : le repli marche, il ne survit pas au rechargement */
      }
      return apres
    })
  }, [cle])

  return [replie, basculer]
}

interface Props {
  replie: boolean
  onBasculer: () => void
  /** De quel bord le panneau se retire. Commande la paire d'icones, rien d'autre. */
  cote?: 'gauche' | 'droite'
  /** Ce qui se replie, au masculin ou au feminin, avec son article : « le plan »,
      « la barre laterale ». Sert a ecrire l'infobulle et le libelle d'accessibilite. */
  quoi: string
  /** « Ctrl B ». Affiche dans l'infobulle, parce qu'un raccourci muet n'existe pas. */
  raccourci?: string
  classe?: string
}

export function BoutonRepli({
  replie,
  onBasculer,
  cote = 'gauche',
  quoi,
  raccourci,
  classe = '',
}: Props) {
  const Icone = replie
    ? cote === 'gauche'
      ? PanelLeftOpen
      : PanelRightOpen
    : cote === 'gauche'
      ? PanelLeftClose
      : PanelRightClose

  const dit = `${replie ? 'Developper' : 'Replier'} ${quoi}`
  const infobulle = raccourci ? `${dit} (${raccourci})` : dit

  return (
    <button
      data-zone="bouton-repli"
      onClick={onBasculer}
      title={infobulle}
      aria-label={infobulle}
      aria-expanded={!replie}
      className={`rounded-lg p-1 transition-colors ${classe}`}
    >
      <Icone className="h-5 w-5" />
    </button>
  )
}
