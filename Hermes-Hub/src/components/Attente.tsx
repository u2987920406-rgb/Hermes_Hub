/**
 * Ce qu'un bouton montre pendant qu'il travaille.
 *
 * POURQUOI. Quinze boutons du Hub changeaient leur texte - « Branchement... »,
 * « Compression en cours... », « Hermes reflechit... » - et RIEN NE BOUGEAIT.
 * Un texte fige se lit comme un plantage, pas comme une attente. Constat le plus
 * repete du parcours de kuchu le 03/08/2026 : « il faut un petit timer, un petit
 * bouton qui tourne, quelque chose qui indique que c'est en cours. Sinon on est
 * perdu. »
 *
 * PAS DE POURCENTAGE, ET C'EST DELIBERE. Il en demandait un. Mais aucune de ces
 * attentes ne connait son total : un appel de modele, un `spawnSync` vers la
 * ligne de commande, une decouverte d'outils MCP ne rendent aucune etape
 * intermediaire. Une barre qui avance sans savoir vers quoi est une barre qui
 * ment - et c'est precisement la panne qu'on traque partout ici, celle qui rend
 * un resultat plausible. Une barre qui atteint 90 % puis reste bloquee deux
 * minutes est PIRE qu'un rouage honnete.
 *
 * A LA PLACE, LE TEMPS REEL. Il ne s'invente pas, et il repond a la seule
 * question qu'on se pose vraiment devant une attente : est-ce que c'est parti,
 * et depuis combien de temps ? Trois secondes avant de l'afficher, sinon un
 * geste bref clignoterait un chiffre pour rien.
 *
 * Quand une duree EST connue d'avance - « compte deux a dix secondes par
 * agent » - c'est au bouton de le dire dans son propre texte. Ca vaut mieux
 * qu'une barre : ca se lit avant de cliquer.
 */
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Avant ce delai, le rouage tourne sans chiffre. */
const SEUIL = 3

export function Attente({ actif, seuil = SEUIL }: { actif: boolean; seuil?: number }) {
  const [secondes, setSecondes] = useState(0)

  useEffect(() => {
    if (!actif) {
      setSecondes(0)
      return
    }
    // Le depart est pris ici, pas chez l'appelant : un bouton n'a pas a tenir
    // un chronometre pour afficher qu'il travaille. `actif` suffit.
    const debut = Date.now()
    const battement = window.setInterval(
      () => setSecondes(Math.floor((Date.now() - debut) / 1000)),
      250,
    )
    return () => window.clearInterval(battement)
  }, [actif])

  if (!actif) return null

  return (
    <span data-zone="attente-bouton" className="inline-flex items-center gap-1">
      <Loader2 className="h-3.5 w-3.5 flex-none animate-spin" />
      {secondes >= seuil && (
        <span className="tabular-nums text-[10px] opacity-70">{secondes} s</span>
      )}
    </span>
  )
}
