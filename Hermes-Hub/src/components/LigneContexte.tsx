/**
 * La ligne de contexte du fil - ce qu'on regarde, et par ou l'on repart.
 *
 * Trois choses, et pas une de plus : ce qu'on lit en ce moment, de quoi
 * retrouver ce qu'on a dit, de quoi repartir a zero. Elle est sortie de
 * `Conversation.tsx` le 06/08/2026 en y ajoutant l'historique - le cliquet des
 * tailles a demande sa part, et il avait raison : c'est une question a soi, et
 * elle porte maintenant deux decisions qui meritent d'etre lues ensemble.
 *
 * ELLE S'ABSENTE DU SALUT. « En direct » n'annonce rien tant que rien n'a ete
 * dit, et une barre de plus au-dessus d'un ecran qu'on veut nu se remarque
 * d'autant. Le bouton d'historique ne disparait pas pour autant : il se range
 * alors avec Projets et Coffre, sous le champ - voir `HomeView`.
 */
import { Home, Plus, Radio } from 'lucide-react'
import { BoutonHistorique } from './VoletHistorique'
import type { FilResume } from '../types'

export function LigneContexte({
  filOuvert,
  vide,
  surLAccueil,
  onDirect,
  onNeuve,
}: {
  /** La conversation qu'on relit, ou null pour le direct. */
  filOuvert: FilResume | null
  /** Rien n'a encore ete dit dans ce fil : pas de quoi en repartir. */
  vide: boolean
  /**
   * Y a-t-il un salut derriere ce fil ?
   *
   * C'est ce qui decide du libelle du retour, et rien d'autre. Voir plus bas :
   * la meme action ne se nomme pas pareil selon qu'elle ramene quelque part.
   */
  surLAccueil: boolean
  onDirect: () => void
  onNeuve: () => void
}) {
  return (
    <div
      data-zone="ligne-contexte"
      className="flex flex-none items-center gap-2 border-b border-slate-200 px-4 py-1.5 dark:border-navy-800"
    >
      {filOuvert ? (
        <>
          <span className="min-w-0 flex-1 truncate text-xs font-medium">
            {filOuvert.interlocuteur} — {filOuvert.titre}
          </span>
          <BoutonHistorique compact />
          <button onClick={onDirect} className="btn-ghost px-2.5 py-1 text-[11px]">
            <Radio className="mr-1 inline h-3.5 w-3.5" />
            Revenir au direct
          </button>
        </>
      ) : (
        <>
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs muted">
            <Radio className="h-3.5 w-3.5 flex-none" />
            En direct
          </span>
          {/* L'historique est ici depuis le 06/08 - c'est la place que lui donne
              `PLAN-ORCHESTRATION-STUDIO.md` : « un bouton a cote de Nouvelle,
              dans la ligne En direct qui existe deja ». Il vivait dans un volet
              d'Orchestration, c'est-a-dire du cote ou l'on n'ecrit plus. */}
          <BoutonHistorique compact />
          {!vide && (
            /**
             * F4 ET C7 - LE RETOUR AU SALUT SE NOMME.
             *
             * Ce bouton s'appelait « Nouvelle », et c'etait le SEUL chemin vers
             * l'accueil. « Nouvelle » promet une conversation neuve, pas un
             * retour : rien ne laissait deviner que c'est la qu'on retrouve ses
             * raccourcis et ce qui tourne. Friction de gravite haute, et du
             * genre dont on ne se plaint jamais - on ne dit pas « je n'ai pas
             * trouve », on croit que ca n'existe pas.
             *
             * IL DIT DONC OU IL MENE, ET SEULEMENT LA OU IL Y MENE. Sur
             * l'accueil il ramene au salut ; dans le volet Conversation
             * d'Orchestration, qui n'a pas de salut, « Nouvelle » reste exact.
             * Un libelle unique aurait menti d'un cote ou de l'autre.
             *
             * Le fil, lui, ne se perd pas - il rejoint l'historique, dont le
             * bouton est juste a gauche. C'est ce voisinage qui rend le geste
             * sans risque, et c'est pour ca que les deux arrivent ensemble.
             */
            <button
              onClick={onNeuve}
              className="btn-ghost px-2.5 py-1 text-[11px]"
              title={
                surLAccueil
                  ? 'Ferme cette conversation et ramene le salut, les raccourcis et ce qui tourne. Le fil reste dans tes conversations.'
                  : 'Repartir sur une conversation neuve'
              }
            >
              {surLAccueil ? (
                <>
                  <Home className="mr-1 inline h-3.5 w-3.5" />
                  Revenir a l accueil
                </>
              ) : (
                <>
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Nouvelle
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
