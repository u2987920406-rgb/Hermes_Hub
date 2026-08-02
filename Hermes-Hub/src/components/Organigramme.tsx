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

/**
 * Les etats d'un noeud, tels qu'ils partent dans `data-etat`.
 *
 * Six viennent du plan (section 4.2), deux s'y ajoutent parce qu'ils existent
 * deja dans le Hub et qu'il aurait fallu detruire du sens pour rentrer dans le
 * tableau :
 *
 *   - `eveille` : un agent dont le pont est ouvert. Present, pas au travail -
 *     l'organigramme d'equipe ne parle pas de taches ;
 *   - `attente` : une tache en revue. Ambre, immobile. A ne pas confondre avec
 *     `erreur`, qui est rouge et vient d'un echec reel.
 */
export type EtatNoeud =
  | 'endormi'
  | 'eveille'
  | 'reveil'
  | 'reflexion'
  | 'encours'
  | 'attente'
  | 'succes'
  | 'erreur'

export interface NoeudOrg {
  id: string
  titre: string
  sousTitre?: string
  /** Jeton de couleur : `ciel`, `violet`, `ambre`... */
  couleur: string
  icone: string
  /**
   * L'etat, en UN seul attribut - il part tel quel dans `data-etat` et toute
   * l'apparence en decoule dans `index.css`. C'etait quatre booleens
   * reconstruits en cascade de classes ici meme ; la logique visuelle vit
   * desormais dans la feuille de style, ou elle se relit d'un bloc.
   *
   * L'absence d'etat est legitime : une tache qui attend simplement son tour.
   */
  etat?: EtatNoeud
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

/**
 * LA CONSOLE DE GEOMETRIE - le pendant JS de celle d'`index.css`.
 *
 * Ces cinq nombres ne peuvent pas etre des variables CSS : ils servent a
 * calculer les coordonnees des courbes SVG, et une chaine `"184px"` ne
 * s'additionne pas. C'est la seule raison de leur presence ici, et l'index de
 * `DESIGN.md` le dit pour qu'on ne les cherche pas dans la feuille de style.
 *
 * Ce sont les molettes a tourner si un pole deborde de son bloc : reduire `L`
 * agit plus vite que reduire les ecarts.
 */
/** Les etats qui veulent dire « quelqu'un travaille la, en ce moment ». */
const AU_TRAVAIL = new Set<string | undefined>(['reveil', 'encours', 'reflexion'])

const REGLAGES = {
  /** Largeur d'une case. En dessous de 150, un nom sur deux lignes deborde. */
  L: 224,
  /** Hauteur d'une case. Elle doit loger nom + metier + etiquette. */
  H: 98,
  /** Entre deux cases d'un meme etage, horizontalement. */
  ECART_X: 92,
  /** Entre deux cases d'un meme etage, verticalement. */
  ECART_Y: 28,
  /** Entre deux etages : assez pour que la fleche se voie. */
  ECART_NIVEAU: 76,
} as const

const { L, H, ECART_X, ECART_Y, ECART_NIVEAU } = REGLAGES

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
    /**
     * La chaine de travail se replie, elle aussi - et pour la meme raison.
     *
     * Elle filait sur une seule ligne : huit taches en pleine taille font plus
     * de deux mille pixels. Restaient deux mauvaises sorties - retrecir, et
     * plus rien ne se lit ; ou defiler, et on perd la vue d'ensemble. Les deux
     * reviennent a renoncer a ce pour quoi on dessine un graphe.
     *
     * On la replie donc comme un texte : de gauche a droite, puis a la ligne.
     * L'ordre de lecture reste celui du temps, et c'est exactement ce que
     * disent deja les numeros d'etape dans le coin des cases.
     */
    const utile = Math.max(L, largeurDispo || 900)
    const parRangee = Math.max(1, Math.floor((utile + ECART_X) / (L + ECART_X)))

    // Les taches dans l'ordre d'execution : par profondeur, puis dans l'ordre
    // ou elles se presentent au sein d'un meme etage.
    const suite = rangs.flatMap((r) => colonnes.get(r)!)
    const parLigneReel = Math.min(parRangee, suite.length)
    const rangees = Math.ceil(suite.length / parRangee)

    largeur = parLigneReel * L + (parLigneReel - 1) * ECART_X
    hauteur = rangees * H + (rangees - 1) * ECART_NIVEAU

    suite.forEach((n, i) => {
      const ligne = Math.floor(i / parRangee)
      const colonne = i % parRangee
      // La derniere rangee est rarement pleine : on la centre, sinon elle
      // pend a gauche et le bloc parait casse.
      const surCetteLigne = Math.min(parRangee, suite.length - ligne * parRangee)
      const total = surCetteLigne * L + (surCetteLigne - 1) * ECART_X
      pos.set(n.id, {
        x: (largeur - total) / 2 + colonne * (L + ECART_X),
        y: ligne * (H + ECART_NIVEAU),
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
      // Une liaison ne transporte que quand il y a vraiment quelque chose
      // dessus : le parent a fini, l'enfant travaille sur ce qu'il vient de
      // rendre. Faire scintiller toute liaison touchant un noeud actif
      // allumerait la moitie du graphe et ne dirait plus rien.
      const source = parId.get(l.de)!
      const cible = parId.get(l.vers)!

      // Section 4.5 : le chemin actif, c'est ce qui touche un noeud au travail
      // - d'ou lui vient sa matiere, et ou partira son resultat. Plus large que
      // le transit, a dessein : on veut voir la trajectoire, pas seulement le
      // segment qui transporte a cet instant.
      const chemin = AU_TRAVAIL.has(source.etat) || AU_TRAVAIL.has(cible.etat) ? 'oui' : undefined

      const transit =
        cible.etat === 'erreur'
          ? 'erreur'
          : source.etat === 'succes' && (cible.etat === 'encours' || cible.etat === 'reflexion')
            ? 'oui'
            : undefined

      return {
        cle: `${l.de}-${l.vers}-${i}`,
        d: courbe(x1, y1, x2, y2, vertical),
        de: source.couleur,
        vers: cible.couleur,
        transit,
        chemin,
        x1,
        y1,
        x2,
        y2,
      }
    })

  // Le budget d'animation (section 4.7) : au-dela de huit liaisons qui
  // scintillent en meme temps, la couleur suffit. Un graphe qui rame donne
  // l'impression que le systeme rame, meme quand les agents travaillent bien.
  const sobre = traces.filter((t) => t.transit === 'oui').length > 8 ? 'oui' : undefined

  // Le focus ne s'allume que si quelqu'un travaille : sur un pole au repos,
  // estomper les liaisons n'attirerait l'attention nulle part - ca ne ferait
  // que rendre le graphe plus pale.
  const actif = noeuds.find((n) => AU_TRAVAIL.has(n.etat))
  const focus = actif ? 'oui' : undefined
  const posActif = actif ? pos.get(actif.id) : undefined

  /**
   * Une chaine de travail ne se replie pas - son ordre est celui du temps -
   * mais elle doit se voir en entier quand meme. On la reduit donc pour
   * qu'elle entre dans le cadre, jusqu'a 60 % : en dessous, les titres
   * deviendraient illisibles et il vaut mieux rendre le defilement, qui est
   * alors le moindre mal.
   */
  /**
   * Plus aucune reduction : un noeud fait la meme taille partout.
   *
   * Avant, une chaine trop large etait mise a l'echelle jusqu'a 60 % pour
   * tenir dans le cadre. Consequence : un pole de quatre taches s'affichait en
   * grand et lisible, le meme pole a huit taches devenait illisible - deux
   * graphes qui ne se ressemblaient plus, alors que c'est le meme objet.
   *
   * Elle se replie desormais sur plusieurs rangees. Un noeud fait la meme
   * taille partout, quel que soit le nombre de taches.
   */
  const deborde = !vertical && largeurDispo > 0 && largeur > largeurDispo

  /**
   * Section 4.5, le recentrage : il ne reste qu'un filet de securite.
   *
   * Depuis que la chaine se replie, plus rien ne deborde horizontalement, donc
   * ce code ne s'execute jamais dans un cas normal. Il est garde pour la
   * fenetre vraiment trop etroite - un telephone en portrait - ou une seule
   * case tient par rangee. Il sort immediatement s'il n'y a pas de quoi
   * defiler, ce qui est le cas general.
   */
  const xActif = posActif ? posActif.x + L / 2 : null
  useEffect(() => {
    const el = cadre.current
    if (!el || xActif === null) return
    if (el.scrollWidth <= el.clientWidth + 1) return

    const cible = Math.max(0, Math.min(xActif - el.clientWidth / 2, el.scrollWidth - el.clientWidth))
    // Un recentrage de trois pixels est un tremblement, pas une aide.
    if (Math.abs(el.scrollLeft - cible) < 24) return

    const sobrement =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: cible, behavior: sobrement ? 'auto' : 'smooth' })
  }, [xActif])

  return (
    // Rien ne depasse : le bloc est calcule pour la place disponible, donc
    // aucune barre de defilement a manipuler pour voir qui est qui.
    <div
      data-zone="organigramme"
      data-sobre={sobre}
      data-focus={focus}
      ref={cadre}
      className={vertical ? 'flex justify-center pb-1' : 'pb-1'}
      // Les deux axes sont declares : masquer le seul axe horizontal ferait
      // passer le vertical en `auto` - c'est la regle CSS - et une barre de
      // defilement inutile apparaitrait a droite du graphe reduit.
      style={
        vertical
          ? undefined
          : { height: hauteur, overflowX: deborde ? 'auto' : 'hidden', overflowY: 'hidden' }
      }
    >
      <div
        className="relative"
        style={{
          width: largeur,
          height: hauteur,
          minWidth: vertical ? undefined : largeur,
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
              // `data-transit` absent = au repos. `oui` = elle transporte, les
              // tirets defilent. `erreur` = tirets figes : l'arret du mouvement
              // dit l'echec avant que la couleur ne soit lue.
              className="liaison"
              data-transit={t.transit}
              data-chemin={t.chemin}
              d={t.d}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              stroke={`url(#org-${t.cle})`}
              markerEnd={`url(#pointe-${t.cle})`}
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

  // Plus une seule condition sur l'apparence ici : `data-etat` part tel quel et
  // `index.css` decide. L'etat prime sur l'identite pour la bordure - un
  // travail termine ou echoue doit se lire avant de savoir a qui il appartient
  // - mais c'est la feuille de style qui l'exprime, par ordre de declaration.
  return (
    <div
      data-zone="noeud-organigramme"
      data-etat={noeud.etat}
      style={style}
      className={[
        'noeud-agent relative flex h-full flex-col gap-1 rounded-xl border-[1.5px]',
        'bg-white px-2.5 py-2 dark:bg-navy-900',
      ].join(' ')}
    >
      {/* Aucun voile de couleur sous le contenu : quinze cartes teintees font
          un nuancier ou le texte se lit mal. Le fond reste celui du theme,
          l'identite tient au liseré et au point.

          L'anneau du travail en cours n'est plus dessine ici : c'est le
          `::after` de `.noeud-agent[data-etat='encours']`, et il tourne. */}
      <div className="relative flex items-start gap-2">
        {/* Un point plutot qu'un carre a icone : la couleur porte l'identite,
            l'icone n'ajoutait qu'un pictogramme de plus a interpreter. */}
        <span className="point-agent mt-1" />
        <span className="min-w-0 flex-1">
          {noeud.chapeau && (
            <span className="block text-[8.5px] font-bold uppercase tracking-[.12em] muted">
              {noeud.chapeau}
            </span>
          )}
          {/* Sa propre taille, pas `texte-nom` : le titre d'un noeud se lit a
              distance, dans un graphe qu'on embrasse du regard, alors qu'un nom
              d'agent se lit de pres dans une liste. Les partager obligeait a
              grossir toute l'application pour rendre le graphe lisible. */}
          <span className="titre-noeud line-clamp-2">{noeud.titre}</span>
        </span>
        {noeud.etat === 'succes' ? (
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
        <p className="texte-metier relative truncate muted">{noeud.sousTitre}</p>
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
