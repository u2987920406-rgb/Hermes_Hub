/**
 * Un noeud du Studio.
 *
 * L'apparence est celle de `Organigramme.tsx`, volontairement a l'identique :
 * memes classes, meme `data-etat`, meme `--agent`. Elle a ete jugee bonne, elle
 * ne bouge pas. Ce qui s'ajoute ici, c'est ce qu'un atelier demande et qu'une
 * vue de consultation n'avait pas :
 *
 *   - des prises d'entree/sortie, pour relier a la souris ;
 *   - les autorisations posees SUR le noeud qui les demande, plutot que dans un
 *     bandeau lointain - c'est ce noeud-la qui est arrete, c'est donc la qu'on
 *     doit pouvoir le relancer ;
 *   - le double-clic, qui ouvre ses reglages.
 */
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Check, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { CompteTache, DemandeAutorisation } from '../types'
import type { EtatNoeud } from './Organigramme'

export interface DonneesNoeud extends Record<string, unknown> {
  titre: string
  sousTitre?: string
  couleur: string
  etat?: EtatNoeud
  etape?: number
  chapeau?: string
  etiquette?: string
  /** Ce que cet agent-la attend, s'il attend quelque chose. */
  accords?: (DemandeAutorisation & { agent: string })[]
  onRepondre?: (demande: string, agent: string, option: string) => void
  agent?: string
  /** Ce que la tache a coute la derniere fois - absent tant qu'elle n'a pas
      tourne. Une prevision n'a rien a faire ici : ce coin du noeud ne dit que
      du mesure. */
  compte?: CompteTache
}

/**
 * La duree, dite comme on la dit a voix haute.
 *
 * Sous la minute on garde la seconde - c'est la que se lisent les ecarts entre
 * deux essais. Au-dela elle ne veut plus rien dire : personne ne compare deux
 * poles a trois secondes pres, et « 4 min » se lit d'un coup d'oeil la ou
 * « 247 s » demande un calcul.
 */
function duree(ms: number) {
  if (ms < 1000) return '<1 s'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const min = Math.floor(s / 60)
  return s % 60 >= 30 ? `${min + 1} min` : `${min} min`
}

export function NoeudStudio({ data, selected }: NodeProps) {
  const d = data as DonneesNoeud
  const style = { '--agent': `var(--jeton-${d.couleur})` } as CSSProperties
  const accords = d.accords || []

  /**
   * Les trois reponses possibles a la demande de tete.
   *
   * Separees explicitement plutot que devinees au vol : `allow_once` et
   * `allow_always` commencent tous deux par « allow », et les confondre revient
   * a donner une permission permanente pour un clic qui voulait dire « cette
   * fois ». `toujours` reste absent quand le serveur l'a retire - sur le rouge,
   * toujours.
   */
  const options = accords[0]?.options || []
  const oui_tous = options.filter((o) => String(o.genre || '').startsWith('allow'))
  // « Pas toujours » plutot que « egal a allow_once » : un genre inconnu qui
  // autorise doit rester cliquable. Le contraire ferait disparaitre le bouton
  // vert et rendrait la tache indeblocable depuis le graphe - on aurait
  // remplace un accord silencieux par un pole mort.
  const toujours = oui_tous.find((o) => String(o.genre).includes('always'))
  const oui = oui_tous.find((o) => !String(o.genre).includes('always'))
  const non = options.find((o) => String(o.genre || '').startsWith('reject'))

  return (
    <div className="relative" style={style}>
      {/* Les prises : discretes au repos, elles grossissent au survol du noeud.
          `!` parce que React Flow pose ses propres styles en ligne. */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-[var(--agent)] !opacity-60 transition-all"
      />

      <div
        data-zone="noeud-studio"
        data-etat={d.etat}
        className={[
          'noeud-agent relative flex flex-col gap-1 rounded-xl border-[1.5px]',
          'bg-white px-2.5 py-2 dark:bg-navy-900',
          selected ? 'ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-navy-950' : '',
        ].join(' ')}
        style={{ width: 224, height: 98 }}
      >
        <div className="relative flex items-start gap-2">
          <span className="point-agent mt-1" />
          <span className="min-w-0 flex-1">
            {d.chapeau && (
              <span className="block text-[8.5px] font-bold uppercase tracking-[.12em] muted">
                {d.chapeau}
              </span>
            )}
            <span className="titre-noeud line-clamp-2">{d.titre}</span>
          </span>
          {d.etat === 'succes' ? (
            <Check className="sens-succes teinte-sens h-3.5 w-3.5 flex-none" />
          ) : (
            d.etape !== undefined && (
              <span
                className="grid h-4 w-4 flex-none place-items-center rounded-full text-[9px] font-bold tabular-nums"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--agent) 20%, transparent)',
                  color: 'var(--agent)',
                }}
              >
                {d.etape}
              </span>
            )
          )}
        </div>

        {d.sousTitre && <p className="texte-metier relative truncate muted">{d.sousTitre}</p>}

        {(d.etiquette || d.compte) && (
          <div className="relative mt-auto flex items-center gap-1.5">
            {d.etiquette && (
              <span
                className="w-fit rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--agent) 16%, transparent)',
                  color: 'var(--agent)',
                }}
              >
                {d.etiquette}
              </span>
            )}

            {/* Les chiffres du dernier passage.
                La duree toujours ; les appels seulement au-dela de un, les
                bascules seulement au-dela de zero. Un noeud qui afficherait
                « 1 appel, 0 bascule » sur chaque tache normale ferait un bruit
                de fond ou l'anomalie ne se verrait plus - or c'est elle qu'on
                cherche. Ce qui reste ecrit est donc toujours une exception. */}
            {d.compte && (
              <span
                className="ml-auto flex-none tabular-nums text-[9px] font-medium muted"
                title={[
                  `${d.compte.appels} appel${d.compte.appels > 1 ? 's' : ''}`,
                  `${d.compte.bascules} bascule${d.compte.bascules > 1 ? 's' : ''}`,
                  d.compte.etat === 'blocked' ? 'bloquee' : 'faite',
                ].join(' - ')}
              >
                {duree(d.compte.ms)}
                {d.compte.appels > 1 && ` - ${d.compte.appels} appels`}
                {d.compte.bascules > 0 && ` - ${d.compte.bascules}⇄`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* L'autorisation, posee sur le noeud qui l'attend.
          Elle vivait dans un bandeau en haut de page, loin du noeud concerne :
          on voyait qu-un agent attendait sans voir lequel. Ici, la question est
          a l'endroit ou elle se pose, et deux boutons suffisent a y repondre.

          `z-30` N'EST PAS COSMETIQUE. La carte prend `z-index: 2` quand elle
          travaille - pose pour que son aura ne soit pas rognee par ses voisines
          - et cette pastille, qui n'est que sa soeur, passait DESSOUS. Or le
          noeud qui travaille est exactement celui qui demande une autorisation :
          elle etait donc cachee precisement quand elle compte, et le pole
          restait arrete devant une question qu'on ne pouvait pas voir. Vu par
          kuchu le 03/08/2026, sur un pole en cours d'execution. */}
      {accords.length > 0 && (
        <div className="absolute -bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-amber-300 bg-white px-1.5 py-0.5 shadow-md dark:border-amber-500/50 dark:bg-navy-900">
          {/* Le rouge se distingue de l'orange avant meme d'etre lu : ecrire,
              effacer et lancer une commande ne se repondent pas du meme geste
              que sortir sur le web. Ce qui aurait pu passer seul n'arrive
              jamais ici - le vert a deja ete accorde. */}
          <span
            className={[
              'px-0.5 text-[9px] font-bold',
              accords[0].risque === 'rouge'
                ? 'text-red-700 dark:text-red-300'
                : 'text-amber-700 dark:text-amber-300',
            ].join(' ')}
          >
            {/* On repond a UNE demande - celle de tete. L'etiquette disait « 2
                demandes » au-dessus de deux boutons qui n'en traitaient qu'une :
                on croyait accorder les deux d'un clic. Elle dit maintenant
                laquelle, et combien suivent. */}
            {accords[0].risque === 'rouge' ? 'ton accord ?' : 'autorise ?'}
            {accords.length > 1 && (
              <span className="ml-1 font-normal opacity-70">1 sur {accords.length}</span>
            )}
          </span>
          {/* UNE FOIS et TOUJOURS sont deux gestes differents, et ils avaient
              le meme bouton. Le vert prenait `find(genre commence par allow)` -
              donc le PREMIER, qui peut etre `allow_always` selon l'ordre
              qu'envoie le protocole. On pouvait accorder une permission
              permanente en croyant repondre une fois, sans que rien ne le dise.
              Un accord qu'on ne se souvient pas d'avoir donne est le pire des
              accords.

              Le vert vise donc `allow_once` explicitement, et « toujours » a
              son propre bouton. QUAND IL EXISTE : c'est le serveur qui decide -
              `arbitrer()` retire l'option sur le rouge, ecrire, effacer et
              lancer une commande se redemandant a chaque fois. L'interface ne
              rejuge pas le risque, elle montre ce qu'on lui donne. */}
          {oui && (
            <button
              title={`Une fois : ${accords[0].titre}`}
              onClick={() => d.onRepondre?.(accords[0].demande, accords[0].agent, oui.id)}
              className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          {toujours && (
            <button
              title={`${toujours.libelle} — il ne redemandera plus de la session`}
              onClick={() => d.onRepondre?.(accords[0].demande, accords[0].agent, toujours.id)}
              className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
            >
              toujours
            </button>
          )}
          <button
            title={accords[0].titre}
            onClick={() =>
              d.onRepondre?.(
                accords[0].demande,
                accords[0].agent,
                non?.id || 'deny',
              )
            }
            className="grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-[var(--agent)] !opacity-60 transition-all"
      />
    </div>
  )
}
