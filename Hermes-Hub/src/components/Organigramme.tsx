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
import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

const L = 184
const H = 78
const ECART_X = 68
const ECART_Y = 18
/** Entre deux etages d'une hierarchie : assez pour que la fleche se voie. */
const ECART_NIVEAU = 44

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

/**
 * La courbe suit le sens de lecture : les points de controle s'ecartent sur
 * l'axe du flux. Une courbe horizontale dans un organigramme vertical
 * partirait de cote avant de redescendre, et la hierarchie ne se lirait plus.
 */
function courbe(x1: number, y1: number, x2: number, y2: number, vertical: boolean) {
  if (vertical) {
    const dy = Math.max(24, (y2 - y1) * 0.5)
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`
  }
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
  /**
   * `droite` : une chaine de travail, qui se lit dans le sens du temps.
   * `bas` : une hierarchie, qui se lit comme un organigramme - le chef en
   * haut, ses gens dessous. Le meme graphe raconte deux choses differentes
   * selon l'axe, et c'est l'axe qui doit dire laquelle.
   */
  sens?: 'droite' | 'bas'
}

export function Organigramme({ noeuds, liens, vide, numeroter, sens = 'droite' }: Props) {
  const cadre = useRef<HTMLDivElement>(null)
  /** Ce dont on dispose vraiment, mesure - pas devine : le meme organigramme
      s'ouvre dans une fenetre volante, dans une fiche et sur un telephone. */
  const [largeurDispo, setLargeurDispo] = useState(0)

  useEffect(() => {
    const el = cadre.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver((entrees) => {
      setLargeurDispo(entrees[0]?.contentRect.width ?? 0)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const vertical = sens === 'bas'
  const d = profondeurs(noeuds, liens)
  const colonnes = new Map<number, NoeudOrg[]>()
  for (const n of noeuds) {
    const p = d.get(n.id) ?? 0
    if (!colonnes.has(p)) colonnes.set(p, [])
    colonnes.get(p)!.push(n)
  }

  const rangs = [...colonnes.keys()].sort((a, b) => a - b)
  const pos = new Map<string, { x: number; y: number }>()
  let largeur: number
  let hauteur: number

  if (vertical) {
    /**
     * L'organigramme doit tenir d'un bloc.
     *
     * Un etage large deborde de la fenetre, et il faut alors faire glisser
     * l'image pour savoir qui est qui - c'est-a-dire perdre la vue d'ensemble,
     * qui est la seule raison de dessiner un organigramme. On replie donc
     * l'etage sur plusieurs lignes plutot que de le laisser filer : les cartes
     * gardent leur taille, rien ne retrecit, et le tout se lit sans bouger.
     */
    const utile = Math.max(L, largeurDispo || 900)
    const parLigne = Math.max(1, Math.floor((utile + ECART_X) / (L + ECART_X)))

    // Largeur reelle : celle du plus grand etage, jamais plus que la place
    // disponible. Un bloc plus etroit que son cadre reste centre.
    const maxColonnes = Math.min(
      parLigne,
      Math.max(...rangs.map((r) => colonnes.get(r)!.length)),
    )
    largeur = maxColonnes * L + (maxColonnes - 1) * ECART_X

    let y = 0
    rangs.forEach((r) => {
      const membres = colonnes.get(r)!
      const lignes = Math.ceil(membres.length / parLigne)
      for (let li = 0; li < lignes; li++) {
        const sur = membres.slice(li * parLigne, (li + 1) * parLigne)
        const total = sur.length * L + (sur.length - 1) * ECART_X
        const depart = (largeur - total) / 2
        sur.forEach((n, j) => pos.set(n.id, { x: depart + j * (L + ECART_X), y }))
        // Les lignes d'un meme etage se serrent : elles sont au meme niveau
        // hierarchique, l'ecart de niveau ne les concerne pas.
        y += H + (li < lignes - 1 ? ECART_Y : ECART_NIVEAU)
      }
    })
    hauteur = y - ECART_NIVEAU
  } else {
    const hauteurMax = Math.max(...rangs.map((r) => colonnes.get(r)!.length))
    largeur = rangs.length * L + (rangs.length - 1) * ECART_X
    hauteur = hauteurMax * H + (hauteurMax - 1) * ECART_Y

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
  }

  const parId = new Map(noeuds.map((n) => [n.id, n]))
  const traces = liens
    .filter((l) => pos.has(l.de) && pos.has(l.vers))
    .map((l, i) => {
      const a = pos.get(l.de)!
      const b = pos.get(l.vers)!
      // Le trait part du bord aval du parent et s'arrete au bord amont de
      // l'enfant, jamais au centre : une fleche qui finit sous la carte est
      // une fleche qu'on ne voit pas.
      const x1 = vertical ? a.x + L / 2 : a.x + L
      const y1 = vertical ? a.y + H : a.y + H / 2
      const x2 = vertical ? b.x + L / 2 : b.x
      const y2 = vertical ? b.y : b.y + H / 2
      return {
        cle: `${l.de}-${l.vers}-${i}`,
        d: courbe(x1, y1, x2, y2, vertical),
        de: parId.get(l.de)!.couleur,
        vers: parId.get(l.vers)!.couleur,
        x1,
        y1,
        x2,
        y2,
      }
    })

  /**
   * Une chaine de travail ne se replie pas - son ordre est celui du temps -
   * mais elle doit se voir en entier quand meme. On la reduit donc pour
   * qu'elle entre dans le cadre, jusqu'a 60 % : en dessous, les titres
   * deviendraient illisibles et il vaut mieux rendre le defilement, qui est
   * alors le moindre mal.
   */
  const echelle =
    !vertical && largeurDispo > 0 && largeur > largeurDispo
      ? Math.max(0.6, largeurDispo / largeur)
      : 1

  return (
    // Rien ne depasse : le bloc est calcule pour la place disponible, donc
    // aucune barre de defilement a manipuler pour voir qui est qui.
    <div
      ref={cadre}
      className={vertical ? 'flex justify-center pb-1' : 'pb-1'}
      // Les deux axes sont declares : masquer le seul axe horizontal ferait
      // passer le vertical en `auto` - c'est la regle CSS - et une barre de
      // defilement inutile apparaitrait a droite du graphe reduit.
      style={
        vertical
          ? undefined
          : {
              height: hauteur * echelle,
              overflowX: echelle > 0.6 ? 'hidden' : 'auto',
              overflowY: 'hidden',
            }
      }
    >
      <div
        className="relative"
        style={{
          width: largeur,
          height: hauteur,
          minWidth: vertical ? undefined : largeur,
          transform: echelle === 1 ? undefined : `scale(${echelle})`,
          transformOrigin: 'top left',
        }}
      >
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
            {/* Une pointe par liaison : elle prend la couleur de celui vers qui
                elle va, comme la fin du degrade. Un marqueur partage forcerait
                une couleur unique et casserait la lecture d'origine. */}
            {traces.map((t) => (
              <marker
                key={`p-${t.cle}`}
                id={`pointe-${t.cle}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" style={{ fill: `var(--jeton-${t.vers})` }} />
              </marker>
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
              markerEnd={`url(#pointe-${t.cle})`}
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
  const style = { '--agent': `var(--jeton-${noeud.couleur})` } as CSSProperties

  // L'etat prime sur l'identite pour la bordure - un travail termine ou bloque
  // doit se lire avant de savoir a qui il appartient. Partout ailleurs, c'est
  // la couleur de l'agent qui tient le cadre.
  const bordure = noeud.fini
    ? { borderColor: 'var(--succes)' }
    : noeud.bloque
      ? { borderColor: 'var(--alerte)' }
      : // Le liseré porte seul l'identite maintenant que le fond est neutre :
        // il doit donc etre franc, sans devenir un cadre qui crie.
        { borderColor: 'color-mix(in srgb, var(--agent) 60%, transparent)' }

  return (
    <div
      style={{ ...style, ...bordure }}
      className={[
        'relative flex h-full flex-col gap-1 overflow-hidden rounded-xl border-[1.5px]',
        'bg-white px-2.5 py-2 dark:bg-navy-900',
        noeud.endormi ? 'opacity-70 saturate-[.45]' : '',
      ].join(' ')}
    >
      {/* Aucun voile de couleur sous le contenu : quinze cartes teintees font
          un nuancier ou le texte se lit mal. Le fond reste celui du theme,
          l'identite tient au liseré et au point. */}
      {/* Il travaille : anneau et ombre portee dans sa propre couleur. */}
      {noeud.actif && (
        <span
          className="pointer-events-none absolute -inset-px rounded-xl"
          style={{ border: '2px solid var(--agent)', boxShadow: '0 5px 20px -8px var(--agent)' }}
        />
      )}

      <div className="relative flex items-start gap-2">
        {/* Un point plutot qu'un carre a icone : la couleur porte l'identite,
            l'icone n'ajoutait qu'un pictogramme de plus a interpreter. */}
        <span
          className="mt-1 h-2.5 w-2.5 flex-none rounded-full"
          style={{
            backgroundColor: 'var(--agent)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--agent) 20%, transparent)',
          }}
        />
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
