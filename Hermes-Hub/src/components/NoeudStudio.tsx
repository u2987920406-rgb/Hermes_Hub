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
import type { DemandeAutorisation } from '../types'
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
}

export function NoeudStudio({ data, selected }: NodeProps) {
  const d = data as DonneesNoeud
  const style = { '--agent': `var(--jeton-${d.couleur})` } as CSSProperties
  const accords = d.accords || []

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

        {d.etiquette && (
          <span
            className="relative mt-auto w-fit rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--agent) 16%, transparent)',
              color: 'var(--agent)',
            }}
          >
            {d.etiquette}
          </span>
        )}
      </div>

      {/* L'autorisation, posee sur le noeud qui l'attend.
          Elle vivait dans un bandeau en haut de page, loin du noeud concerne :
          on voyait qu-un agent attendait sans voir lequel. Ici, la question est
          a l'endroit ou elle se pose, et deux boutons suffisent a y repondre. */}
      {accords.length > 0 && (
        <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-amber-300 bg-white px-1.5 py-0.5 shadow-md dark:border-amber-500/50 dark:bg-navy-900">
          <span className="px-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
            {accords.length > 1 ? `${accords.length} demandes` : 'autorise ?'}
          </span>
          <button
            title={accords[0].titre}
            onClick={() =>
              d.onRepondre?.(
                accords[0].demande,
                accords[0].agent,
                accords[0].options.find((o) => o.genre?.startsWith('allow'))?.id || 'allow_once',
              )
            }
            className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            title={accords[0].titre}
            onClick={() =>
              d.onRepondre?.(
                accords[0].demande,
                accords[0].agent,
                accords[0].options.find((o) => o.genre?.startsWith('reject'))?.id || 'deny',
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
