/**
 * L'organigramme : un graphe en couches, immobile.
 *
 * C'est la vue de repos - la meme grammaire visuelle que le graphe vivant a
 * venir (jeton de couleur porte par une variable CSS, pastille, prises
 * d'entree/sortie, liaisons a degrade), mais sans mouvement. On consulte, on ne
 * surveille pas.
 *
 * Le meme composant sert l'equipe et un pole : dans les deux cas il s'agit d'un
 * graphe oriente sans cycle qu'on range par profondeur.
 */
import { Bot, Check, Compass, Filter, PenLine, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'

export interface NoeudOrg {
  id: string
  titre: string
  sousTitre?: string
  /** Jeton de couleur : `ciel`, `violet`, `ambre`... */
  couleur: string
  icone: string
  /** Assombri et desature : present, mais au repos. */
  endormi?: boolean
  /** Liseré vert et coche. */
  fini?: boolean
  /** Anneau dans la couleur de l'agent : il travaille en ce moment. */
  actif?: boolean
  /** Bordure ambre : il attend quelque chose. */
  bloque?: boolean
  /** Barre le noeud d'un avertissement : il ne repondra jamais. */
  muet?: boolean
  etiquette?: string
  /** Surtitre discret : sert a distinguer un noeud de nature differente,
      comme la demande d'origine au bout d'un pole. */
  chapeau?: string
}

export interface LienOrg {
  de: string
  vers: string
}

const ICONES: Record<string, typeof Bot> = {
  boussole: Compass,
  entonnoir: Filter,
  plume: PenLine,
  etincelle: Sparkles,
  agent: Bot,
}

const L = 184
const H = 78
const ECART_X = 68
const ECART_Y = 18

/**
 * Profondeur d'un noeud = longueur du plus long chemin qui y mene. Un lien
 * `de -> vers` signifie « de doit finir avant vers », donc `vers` est plus
 * profond. On itere jusqu'a stabilite plutot que de trier topologiquement :
 * le graphe est minuscule, et un cycle accidentel s'arrete au lieu de boucler.
 */
function profondeurs(noeuds: NoeudOrg[], liens: LienOrg[]): Map<string, number> {
  const d = new Map(noeuds.map((n) => [n.id, 0]))
  for (let tour = 0; tour < noeuds.length; tour++) {
    let bouge = false
    for (const l of liens) {
      const a = d.get(l.de)
      const b = d.get(l.vers)
      if (a === undefined || b === undefined) continue
      if (b < a + 1) {
        d.set(l.vers, a + 1)
        bouge = true
      }
    }
    if (!bouge) break
  }
  return d
}

function courbe(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(34, (x2 - x1) * 0.55)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

interface Props {
  noeuds: NoeudOrg[]
  liens: LienOrg[]
  vide?: string
  /**
   * Numerote les etapes selon la profondeur. Utile quand l'ordre porte du sens
   * - une suite de taches - et trompeur quand il n'en porte pas : dans un
   * organigramme d'equipe, personne n'est « l'etape 2 ».
   */
  numeroter?: boolean
}

export function Organigramme({ noeuds, liens, vide, numeroter }: Props) {
  if (noeuds.length === 0) {
    return <p className="px-1 py-6 text-center text-xs muted">{vide || 'Rien a montrer.'}</p>
  }

  const d = profondeurs(noeuds, liens)
  const colonnes = new Map<number, NoeudOrg[]>()
  for (const n of noeuds) {
    const p = d.get(n.id) ?? 0
    if (!colonnes.has(p)) colonnes.set(p, [])
    colonnes.get(p)!.push(n)
  }

  const rangs = [...colonnes.keys()].sort((a, b) => a - b)
  const hauteurMax = Math.max(...rangs.map((r) => colonnes.get(r)!.length))
  const largeur = rangs.length * L + (rangs.length - 1) * ECART_X
  const hauteur = hauteurMax * H + (hauteurMax - 1) * ECART_Y

  // Position de chaque noeud, colonne par colonne, centree verticalement.
  const pos = new Map<string, { x: number; y: number }>()
  rangs.forEach((r, i) => {
    const membres = colonnes.get(r)!
    const total = membres.length * H + (membres.length - 1) * ECART_Y
    membres.forEach((n, j) => {
      pos.set(n.id, {
        x: i * (L + ECART_X),
        y: (hauteur - total) / 2 + j * (H + ECART_Y),
      })
    })
  })

  const parId = new Map(noeuds.map((n) => [n.id, n]))
  const traces = liens
    .filter((l) => pos.has(l.de) && pos.has(l.vers))
    .map((l, i) => {
      const a = pos.get(l.de)!
      const b = pos.get(l.vers)!
      return {
        cle: `${l.de}-${l.vers}-${i}`,
        d: courbe(a.x + L, a.y + H / 2, b.x, b.y + H / 2),
        de: parId.get(l.de)!.couleur,
        vers: parId.get(l.vers)!.couleur,
        x1: a.x + L,
        y1: a.y + H / 2,
        x2: b.x,
        y2: b.y + H / 2,
      }
    })

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative" style={{ width: largeur, height: hauteur, minWidth: largeur }}>
        <svg
          className="absolute inset-0 overflow-visible"
          width={largeur}
          height={hauteur}
          aria-hidden="true"
        >
          <defs>
            {traces.map((t) => (
              <linearGradient
                key={t.cle}
                id={`org-${t.cle}`}
                gradientUnits="userSpaceOnUse"
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
              >
                {/* var() passe par `style` : les attributs de presentation SVG
                    n'evaluent pas les variables de facon fiable. */}
                <stop offset="0%" style={{ stopColor: `var(--jeton-${t.de})` }} />
                <stop offset="100%" style={{ stopColor: `var(--jeton-${t.vers})` }} />
              </linearGradient>
            ))}
          </defs>
          {traces.map((t) => (
            <path
              key={t.cle}
              d={t.d}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              stroke={`url(#org-${t.cle})`}
              opacity={0.85}
            />
          ))}
        </svg>

        {noeuds.map((n) => {
          const p = pos.get(n.id)!
          return (
            <div key={n.id} className="absolute" style={{ left: p.x, top: p.y, width: L, height: H }}>
              <CarteNoeud noeud={n} etape={numeroter ? (d.get(n.id) ?? 0) + 1 : undefined} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CarteNoeud({ noeud, etape }: { noeud: NoeudOrg; etape?: number }) {
  const Icone = ICONES[noeud.icone] || Bot
  const style = { '--agent': `var(--jeton-${noeud.couleur})` } as CSSProperties

  // L'etat prime sur l'identite pour la bordure - un travail termine ou bloque
  // doit se lire avant de savoir a qui il appartient. Partout ailleurs, c'est
  // la couleur de l'agent qui tient le cadre.
  const bordure = noeud.fini
    ? { borderColor: 'var(--succes)' }
    : noeud.bloque
      ? { borderColor: 'var(--alerte)' }
      : { borderColor: 'color-mix(in srgb, var(--agent) 42%, transparent)' }

  return (
    <div
      style={{ ...style, ...bordure }}
      className={[
        'relative flex h-full flex-col gap-1 overflow-hidden rounded-xl border-[1.5px]',
        'bg-white px-2.5 py-2 dark:bg-navy-900',
        noeud.endormi ? 'opacity-70 saturate-[.45]' : '',
      ].join(' ')}
    >
      {/* Un voile du jeton sous tout le contenu : la carte porte la couleur de
          l'agent au lieu de s'en tenir a une pastille. Un aplat plein serait
          illisible, un pourcentage se pose sur les deux fonds sans calcul. */}
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.14]"
        style={{ backgroundColor: 'var(--agent)' }}
      />
      {/* Il travaille : anneau et ombre portee dans sa propre couleur. */}
      {noeud.actif && (
        <span
          className="pointer-events-none absolute -inset-px rounded-xl"
          style={{ border: '2px solid var(--agent)', boxShadow: '0 5px 20px -8px var(--agent)' }}
        />
      )}

      <div className="relative flex items-start gap-2">
        <span
          className="grid h-6 w-6 flex-none place-items-center rounded-lg"
          style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
        >
          <Icone className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          {noeud.chapeau && (
            <span className="block text-[8.5px] font-bold uppercase tracking-[.12em] muted">
              {noeud.chapeau}
            </span>
          )}
          <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight">
            {noeud.titre}
          </span>
        </span>
        {noeud.fini ? (
          <Check className="sens-succes teinte-sens h-3.5 w-3.5 flex-none" />
        ) : (
          etape !== undefined && (
            <span
              className="grid h-4 w-4 flex-none place-items-center rounded-full text-[9px] font-bold tabular-nums"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--agent) 20%, transparent)',
                color: 'var(--agent)',
              }}
            >
              {etape}
            </span>
          )
        )}
      </div>

      {noeud.sousTitre && (
        <p className="relative truncate text-[10.5px] leading-snug muted">{noeud.sousTitre}</p>
      )}

      <div className="relative mt-auto flex items-center gap-1.5">
        {noeud.etiquette && (
          <span
            className="rounded px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--agent) 16%, transparent)',
              color: 'var(--agent)',
            }}
          >
            {noeud.etiquette}
          </span>
        )}
        {noeud.muet && <span className="puce sens-alerte ml-auto">sans cle</span>}
      </div>
    </div>
  )
}
