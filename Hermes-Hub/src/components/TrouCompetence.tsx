/**
 * C4 / F17 - CE QUE PERSONNE DANS L'EQUIPE NE SAIT FAIRE.
 *
 * Une etape sans specialiste revient a l'agent par defaut. Ca marche, et c'est
 * voulu : un scenario ne doit jamais rester en plan faute de titulaire. Mais
 * personne ne le DIT, et c'est toute la friction - le resultat sera plus large
 * et moins sur, sans que rien ne l'ait annonce. F17 le formule ainsi :
 * *« personne ne dit que l'equipe ne sait pas faire »*.
 *
 * ⚠ LA DEMANDE EN TETE DE POLE EST EXCLUE. Elle revient a Hermes par nature -
 * c'est lui qui a decoupe -, ce n'est pas un trou de competence. La compter
 * ferait crier au manque sur TOUS les scenarios, tout le temps, et une alerte
 * permanente ne s'alerte plus.
 *
 * AVANT LE LANCEMENT SEULEMENT, et c'est la symetrie de C8 : avant, le trou -
 * il reste quelque chose a faire ; apres, le bilan - il reste a juger. Creer un
 * specialiste devant un travail deja rendu ne rattrape rien, et le proposer la
 * ferait passer un constat pour un remede.
 */
import { NouvelAgent } from './NouvelAgent'
import type { Tache } from '../types'

interface Props {
  taches: Tache[]
  /** L'identifiant du pole : sa tache de tete EST la demande. */
  demande: string | null
  /** Le scenario a-t-il deja tourne ? Alors il est trop tard pour reparer. */
  aTourne: boolean
  /** Un specialiste vient d'etre cree : le Studio relit son annuaire. */
  onAgentCree: () => void
}

export function TrouCompetence({ taches, demande, aTourne, onAgentCree }: Props) {
  const orphelines = taches.filter(
    (t) => t.id !== demande && (t.agent || 'default') === 'default',
  )
  if (aTourne || orphelines.length === 0) return null

  return (
    <div
      data-zone="trou-competence"
      className="bandeau sens-alerte mt-3 flex-col items-stretch gap-1.5 p-2.5"
    >
      <b className="text-[11px] leading-snug">
        Personne n est designe pour{' '}
        {orphelines.length === 1 ? 'une etape' : `${orphelines.length} etapes`}
      </b>
      <ul className="flex flex-col gap-0.5">
        {orphelines.map((t) => (
          <li key={t.id} className="truncate text-[10.5px] muted" title={t.titre}>
            · {t.titre}
          </li>
        ))}
      </ul>
      <p className="text-[10.5px] leading-snug">
        {orphelines.length === 1 ? 'Elle revient' : 'Elles reviennent'} a l agent par defaut faute
        de specialiste : le resultat sera plus large et moins sur.
      </p>
      {/* Le geste qui repare est DANS le constat, pas ailleurs - c'est F20 mot
          pour mot, « le message porte le geste ». Et c'est la fiche de creation
          de l'equipe, pas une seconde : un agent se decrit de la meme facon d'ou
          qu'on parte. */}
      <NouvelAgent libelle="Creer un specialiste" onFait={onAgentCree} />
    </div>
  )
}
