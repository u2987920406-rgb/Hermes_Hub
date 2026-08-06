/**
 * LE PLAN, A GAUCHE DU STUDIO - permanent, donc il se REPLIE.
 *
 * Le graphe montre la FORME du travail : qui depend de qui, ce qui part en
 * parallele. Il ne se lit pas dans l'ordre. Le plan, lui, se lit de haut en bas
 * - c'est la meme chose dite dans l'autre sens, et les deux sens servent. La
 * maquette les met cote a cote depuis le debut (`maquette-parcours.html`,
 * etape 3).
 *
 * ⚠ CE PANNEAU EST LA CONDITION DE F11. La friction dit exactement ceci :
 * *« depuis que le script est un panneau permanent plutot qu'une fenetre qu'on
 * ouvre, valider la simulation n'a plus de porte a garder : le script est sous
 * mes yeux, le regarder EST l'ouvrir. »* Tant que le plan se convoquait, il
 * fallait un bouton pour certifier qu'on l'avait vu. Ici il est vu.
 *
 * TROIS MOMENTS, ET UN SEUL SE MERITE L'APLAT. « En cours » est plein, « fait »
 * est teinte, « prevu » ne porte rien - c'est la regle de composition de
 * `DESIGN.md` : si tout est plein, plus rien ne ressort.
 *
 * C3 - LE COUPLAGE, DANS LES DEUX SENS. Survoler une ligne surligne son noeud ;
 * choisir un noeud fait defiler le plan jusqu'a sa ligne. Sans lui, ce sont
 * deux affichages cote a cote au lieu d'un instrument (F10) : on regarde l'un,
 * puis l'autre, et on refait le rapprochement de tete a chaque fois.
 *
 * LE RESULTAT ATTENDU N'EST PAS DECORATIF. C'est la seule part du plan qui
 * permette de juger apres coup - sans elle, un scenario en echec partiel
 * ressemble exactement a un scenario reussi. Il vient du plan garde sur le
 * disque (`server/plan.js`), la seule source qui le porte : ni le tableau
 * d'Hermes ni le graphe ne connaissent les livrables annonces.
 */
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { BoutonRepli } from './BoutonRepli'
import { ChampRecherche, aplatir } from './ChampRecherche'
import type { Agent, EtatTache, Tache } from '../types'

/** Ce qu'une ligne raconte : prevu, en cours, passe. */
type Moment = 'prevu' | 'encours' | 'fait'

function moment(etat: EtatTache): Moment {
  if (etat === 'done') return 'fait'
  if (etat === 'running') return 'encours'
  return 'prevu'
}

interface Props {
  taches: Tache[]
  agents: Agent[]
  /** La profondeur de chaque tache dans le graphe : c'est l'ordre d'execution,
      et donc l'ordre de lecture. Calcule par le Studio, qui s'en sert deja pour
      poser les colonnes - le recalculer ici ferait deux ordres pour un graphe. */
  rangs: Map<string, number>
  /** Les livrables annonces par le plan. Vide quand le scenario n'en a pas -
      un scenario ne du decomposeur n'a jamais eu de plan ecrit. */
  resultat: { fichier: string; quoi: string }[]
  /** Le noeud choisi dans le graphe. Fait defiler la ligne correspondante (C3). */
  choisi: string | null
  onChoisir: (id: string) => void
  /** Ce qui est survole ici, pour que le graphe l'agrandisse (C3, l'autre sens). */
  onSurvoler: (id: string | null) => void
  replie: boolean
  onBasculer: () => void
}

export function PanneauPlan({
  taches,
  agents,
  rangs,
  resultat,
  choisi,
  onChoisir,
  onSurvoler,
  replie,
  onBasculer,
}: Props) {
  const [terme, setTerme] = useState('')
  const corps = useRef<HTMLDivElement>(null)

  const parAgent = new Map(agents.map((a) => [a.id, a]))
  const ordonnees = [...taches].sort(
    (a, b) => (rangs.get(a.id) ?? 0) - (rangs.get(b.id) ?? 0),
  )

  const cherche = aplatir(terme)
  const visibles = cherche
    ? ordonnees.filter((t) => {
        const a = parAgent.get(t.agent || 'default')
        return aplatir(`${t.titre} ${t.corps} ${a?.nom || ''} ${a?.metier || ''}`).includes(cherche)
      })
    : ordonnees

  /**
   * C3, SENS GRAPHE -> PLAN. Choisir un noeud fait defiler jusqu'a sa ligne.
   *
   * `block: 'nearest'` et non `'center'` : une ligne deja visible ne doit pas
   * faire sauter la liste sous les yeux. On ne bouge que si on ne la voyait
   * pas - c'est ce qui permet de cliquer trois noeuds d'affilee sans que le
   * panneau parte dans tous les sens.
   */
  useEffect(() => {
    if (!choisi || replie) return
    const ligne = corps.current?.querySelector(`[data-tache="${CSS.escape(choisi)}"]`)
    ligne?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [choisi, replie])

  /* Replie, il ne reste que de quoi le rouvrir - et ce bouton reste au meme
     endroit, parce que c'est le meme bouton. Un panneau qui revient ailleurs
     que la ou il est parti n'est plus un repli, c'est une reapparition. */
  if (replie) {
    return (
      <div
        data-zone="panneau-plan"
        className="flex flex-none flex-col items-center border-r border-slate-200 bg-white py-2 dark:border-navy-800 dark:bg-navy-900"
      >
        <BoutonRepli
          replie
          onBasculer={onBasculer}
          quoi="le plan"
          classe="muted hover:bg-slate-100 dark:hover:bg-navy-800"
        />
      </div>
    )
  }

  return (
    <aside
      data-zone="panneau-plan"
      className="flex w-64 flex-none flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900"
    >
      <div className="flex flex-none items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-navy-800">
        <b className="flex-1 text-xs">Plan</b>
        <span className="text-[10px] tabular-nums muted">
          {taches.length} etape{taches.length > 1 ? 's' : ''}
        </span>
        <BoutonRepli
          replie={false}
          onBasculer={onBasculer}
          quoi="le plan"
          classe="muted hover:bg-slate-100 dark:hover:bg-navy-800"
        />
      </div>

      {/* La recherche sert des qu'un scenario depasse la dizaine d'etapes -
          c'est le troisieme trou de la grammaire, celui ou rien ne cherchait
          dans un contenu long. En dessous, elle encombrerait pour rien. */}
      {taches.length > 8 && (
        <div className="flex-none px-3 pt-2">
          <ChampRecherche
            valeur={terme}
            onChange={setTerme}
            placeholder="Chercher dans le plan"
            quoi="Chercher une etape dans le plan"
            compte={cherche ? { trouves: visibles.length, total: taches.length } : undefined}
          />
        </div>
      )}

      <div ref={corps} className="min-h-0 flex-1 overflow-y-auto p-2">
        {visibles.length === 0 ? (
          <p className="px-1 py-4 text-center text-[11px] muted">
            Aucune etape ne repond a « {terme} ».
          </p>
        ) : (
          visibles.map((t) => {
            const a = parAgent.get(t.agent || 'default')
            const m = moment(t.etat)
            const rang = (rangs.get(t.id) ?? 0) + 1
            return (
              <button
                key={t.id}
                data-tache={t.id}
                onMouseEnter={() => onSurvoler(t.id)}
                onMouseLeave={() => onSurvoler(null)}
                onFocus={() => onSurvoler(t.id)}
                onBlur={() => onSurvoler(null)}
                onClick={() => onChoisir(t.id)}
                style={{ ['--agent' as string]: `var(--jeton-${a?.couleur || 'ardoise'})` }}
                className={`flex w-full items-start gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-left transition-colors ${
                  choisi === t.id
                    ? 'bg-slate-100 dark:bg-navy-800'
                    : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-navy-800/60'
                }`}
              >
                <span
                  className="mt-0.5 min-w-[0.7rem] text-[10px] tabular-nums muted"
                  style={
                    choisi === t.id
                      ? ({ borderColor: 'var(--agent)' } as CSSProperties)
                      : undefined
                  }
                >
                  {rang}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold muted">
                    {a?.nom || t.agent || 'non assignee'}
                    {a?.metier ? ` · ${a.metier}` : ''}
                  </span>
                  <span className={`block text-[11.5px] leading-snug ${m === 'fait' ? 'muted' : ''}`}>
                    {t.titre}
                  </span>
                </span>
                {/* Seul « en cours » bouge. Un plan ou tout clignote ne dit plus
                    ou regarder - c'est la meme regle que l'aplat. */}
                {m === 'encours' && (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-none animate-spin text-sky-500" />
                )}
                {m === 'fait' && (
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none teinte-sens sens-succes" />
                )}
              </button>
            )
          })
        )}

        {/*
          LE RESULTAT ATTENDU, en bas et separe : ce n'est pas une etape de
          plus, c'est ce a quoi on comparera. Absent quand le plan n'annonce
          rien - on n'invente pas de livrable a sa place, sinon la
          confrontation de fin de run serait FAUSSE plutot qu'absente, et
          c'est le pire des deux : on croirait pouvoir juger.
        */}
        {resultat.length > 0 && (
          <div className="mt-3 border-t border-slate-200 px-1 pt-3 dark:border-navy-800">
            <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.09em] muted">
              Resultat attendu
            </span>
            <div className="flex flex-col gap-1">
              {resultat.map((r, i) => (
                <span key={i} className="text-[11px] leading-snug">
                  <code
                    className="rounded px-1.5 py-px text-[10.5px]"
                    style={{ background: 'var(--surlignage, rgba(128,128,128,.14))' }}
                  >
                    {r.fichier}
                  </code>
                  {r.quoi && <span className="muted"> — {r.quoi}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
