/**
 * Le langage visuel de l'equipe : une couleur et une icone par agent, tenues
 * ici pour que la conversation, l'organigramme et le panneau lateral disent
 * exactement la meme chose. Deux tables separees finiraient par diverger.
 */
import { Bot, Crown, FolderTree, Moon, PenLine, Sparkles, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { ETATS_TACHE } from '../types'
import type { Agent, EtatTache, Plan, Tache } from '../types'

// -----------------------------------------------------------------------------
// Codes couleur
// -----------------------------------------------------------------------------
/** Classes ecrites en entier : Tailwind ne garde pas un nom construit a la
    volee, `bg-${couleur}-500` ne produirait aucun CSS. */
export interface Teinte {
  puce: string
  bord: string
  fond: string
  texte: string
  trait: string
}

export const TEINTES: Record<string, Teinte> = {
  gold: { puce: 'bg-gold-500', bord: 'border-gold-500', fond: 'bg-gold-300/20 dark:bg-gold-500/10', texte: 'text-gold-600 dark:text-gold-400', trait: '#c99c34' },
  sky: { puce: 'bg-sky-500', bord: 'border-sky-500', fond: 'bg-sky-50 dark:bg-sky-500/10', texte: 'text-sky-600 dark:text-sky-400', trait: '#0ea5e9' },
  violet: { puce: 'bg-violet-500', bord: 'border-violet-500', fond: 'bg-violet-50 dark:bg-violet-500/10', texte: 'text-violet-600 dark:text-violet-400', trait: '#8b5cf6' },
  emerald: { puce: 'bg-emerald-500', bord: 'border-emerald-500', fond: 'bg-emerald-50 dark:bg-emerald-500/10', texte: 'text-emerald-600 dark:text-emerald-400', trait: '#10b981' },
  rose: { puce: 'bg-rose-500', bord: 'border-rose-500', fond: 'bg-rose-50 dark:bg-rose-500/10', texte: 'text-rose-600 dark:text-rose-400', trait: '#f43f5e' },
  amber: { puce: 'bg-amber-500', bord: 'border-amber-500', fond: 'bg-amber-50 dark:bg-amber-500/10', texte: 'text-amber-600 dark:text-amber-400', trait: '#f59e0b' },
  teal: { puce: 'bg-teal-500', bord: 'border-teal-500', fond: 'bg-teal-50 dark:bg-teal-500/10', texte: 'text-teal-600 dark:text-teal-400', trait: '#14b8a6' },
  indigo: { puce: 'bg-indigo-500', bord: 'border-indigo-500', fond: 'bg-indigo-50 dark:bg-indigo-500/10', texte: 'text-indigo-600 dark:text-indigo-400', trait: '#6366f1' },
  slate: { puce: 'bg-slate-400', bord: 'border-slate-400', fond: 'bg-slate-100 dark:bg-navy-800', texte: 'text-slate-500 dark:text-slate-400', trait: '#94a3b8' },
}

export const teinte = (c?: string): Teinte => (c && TEINTES[c]) || TEINTES.slate

export const ICONES_AGENT: Record<string, typeof Bot> = {
  crown: Crown,
  'folder-tree': FolderTree,
  'pen-line': PenLine,
  sparkles: Sparkles,
  bot: Bot,
}

export const iconeAgent = (nom?: string) => ICONES_AGENT[nom || 'bot'] || Bot

export const ROLES: Record<string, string> = {
  orchestrateur: 'Orchestrateur',
  manager: 'Manager',
  worker: 'Specialiste',
  'bac-a-sable': 'Bac a sable',
}

/** L'etat d'une tache se lit a la couleur avant de se lire au mot. */
export const TEINTE_ETAT: Record<EtatTache, string> = {
  triage: 'bg-slate-400',
  todo: 'bg-slate-400',
  ready: 'bg-sky-500',
  running: 'bg-emerald-500 animate-pulse',
  review: 'bg-amber-500',
  blocked: 'bg-red-500',
  scheduled: 'bg-violet-400',
  done: 'bg-emerald-600',
}

// -----------------------------------------------------------------------------
// Pastille
// -----------------------------------------------------------------------------
/** Le meme jeton partout : dans le fil, dans l'organigramme, dans le panneau. */
export function Pastille({ agent, taille = 'sm' }: { agent?: Agent; taille?: 'sm' | 'md' }) {
  const t = teinte(agent?.couleur)
  const Icone = iconeAgent(agent?.icone)
  const dim = taille === 'md' ? 'h-8 w-8' : 'h-6 w-6'
  const ico = taille === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  return (
    <span
      className={`flex ${dim} flex-shrink-0 items-center justify-center rounded-lg ${t.puce}`}
      title={agent?.nom}
    >
      <Icone className={`${ico} text-white`} />
    </span>
  )
}

// -----------------------------------------------------------------------------
// Fiche d'agent
// -----------------------------------------------------------------------------
export function CarteAgent({ agent, compacte = false }: { agent: Agent; compacte?: boolean }) {
  const t = teinte(agent.couleur)

  return (
    <div className={`rounded-xl border p-2.5 ${t.bord} ${t.fond}`}>
      <div className="flex items-center gap-2">
        <Pastille agent={agent} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{agent.nom}</p>
          <p className="truncate text-[10px] muted">{ROLES[agent.role] || agent.role}</p>
        </div>
        {agent.eveille ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <Zap className="h-3 w-3 animate-pulse" />
            eveille
          </span>
        ) : (
          <span title="Endormi - il ne se reveille que pour une tache">
            <Moon className="h-3.5 w-3.5 text-slate-400" />
          </span>
        )}
      </div>

      {!compacte && agent.description && (
        <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed muted">{agent.description}</p>
      )}

      {!compacte && (
        <div className="mt-2 flex items-center gap-3 text-[10px] muted">
          <span>
            {agent.taches} tache{agent.taches > 1 ? 's' : ''}
          </span>
          {agent.finies > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">{agent.finies} finie{agent.finies > 1 ? 's' : ''}</span>
          )}
          {!agent.pretAServir && (
            <span
              className="ml-auto text-amber-600 dark:text-amber-400"
              title="Ce profil n'a aucune credential : il ne repondra pas."
            >
              sans cle
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Organigramme
// -----------------------------------------------------------------------------
const L = 190
const H = 76
const ECART_X = 22
const ECART_Y = 52

interface Noeud {
  tache: Tache
  x: number
  y: number
}

/**
 * Le niveau d'une tache est la longueur du plus long chemin qui y mene : une
 * tache ne peut pas etre dessinee avant celle dont elle depend, meme si un
 * chemin plus court existe par ailleurs.
 */
function disposer(plan: Plan): { noeuds: Noeud[]; largeur: number; hauteur: number } {
  const taches = plan.taches
  if (!taches.length) return { noeuds: [], largeur: 0, hauteur: 0 }

  const parents = new Map<string, string[]>()
  for (const t of taches) parents.set(t.id, [])
  for (const l of plan.liens) parents.get(l.vers)?.push(l.de)

  const niveaux = new Map<string, number>()
  const enCours = new Set<string>()

  const niveau = (id: string): number => {
    const connu = niveaux.get(id)
    if (connu !== undefined) return connu
    // Un cycle ne devrait pas exister, mais une recursion infinie figerait
    // l'onglet : on coupe et on place le noeud a la racine.
    if (enCours.has(id)) return 0
    enCours.add(id)
    const p = parents.get(id) || []
    const n = p.length ? Math.max(...p.map(niveau)) + 1 : 0
    enCours.delete(id)
    niveaux.set(id, n)
    return n
  }

  for (const t of taches) niveau(t.id)

  const parNiveau = new Map<number, Tache[]>()
  for (const t of taches) {
    const n = niveaux.get(t.id) ?? 0
    const liste = parNiveau.get(n) || []
    liste.push(t)
    parNiveau.set(n, liste)
  }

  const profondeur = Math.max(...parNiveau.keys()) + 1
  const parRangee = Math.max(...[...parNiveau.values()].map((v) => v.length))
  const largeur = parRangee * L + (parRangee - 1) * ECART_X
  const hauteur = profondeur * H + (profondeur - 1) * ECART_Y

  const noeuds: Noeud[] = []
  for (const [n, liste] of parNiveau) {
    const largeurRangee = liste.length * L + (liste.length - 1) * ECART_X
    const depart = (largeur - largeurRangee) / 2
    liste.forEach((tache, i) => {
      noeuds.push({ tache, x: depart + i * (L + ECART_X), y: n * (H + ECART_Y) })
    })
  }

  return { noeuds, largeur, hauteur }
}

/**
 * Les positions sont calculees plutot que mesurees dans le DOM : les cartes en
 * HTML et les fleches en SVG partagent donc exactement les memes coordonnees,
 * sans passe de mesure ni decalage au redimensionnement.
 */
export function Organigramme({
  plan,
  agents,
  choisie,
  onChoisir,
}: {
  plan: Plan
  agents: Map<string, Agent>
  choisie: string | null
  onChoisir: (id: string) => void
}) {
  const { noeuds, largeur, hauteur } = useMemo(() => disposer(plan), [plan])
  const position = useMemo(() => new Map(noeuds.map((n) => [n.tache.id, n])), [noeuds])

  if (!noeuds.length) return null

  return (
    <div className="relative mx-auto" style={{ width: largeur, height: hauteur }}>
      <svg width={largeur} height={hauteur} className="pointer-events-none absolute inset-0" aria-hidden="true">
        {plan.liens.map((lien, i) => {
          const a = position.get(lien.de)
          const b = position.get(lien.vers)
          if (!a || !b) return null
          const x1 = a.x + L / 2
          const y1 = a.y + H
          const x2 = b.x + L / 2
          const y2 = b.y
          const m = (y1 + y2) / 2
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${x1} ${m}, ${x2} ${m}, ${x2} ${y2}`}
              fill="none"
              stroke={teinte(agents.get(a.tache.agent || '')?.couleur).trait}
              strokeWidth={1.5}
              strokeOpacity={0.45}
            />
          )
        })}
      </svg>

      {noeuds.map(({ tache, x, y }) => {
        const agent = agents.get(tache.agent || '')
        const t = teinte(agent?.couleur)
        const Icone = iconeAgent(agent?.icone)
        return (
          <button
            key={tache.id}
            onClick={() => onChoisir(tache.id)}
            style={{ left: x, top: y, width: L, height: H }}
            className={`absolute flex flex-col justify-between rounded-xl border-2 p-2 text-left transition-all
                        ${t.bord} ${t.fond}
                        ${choisie === tache.id ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-navy-950' : 'hover:-translate-y-0.5'}`}
            title={tache.titre}
          >
            <div className="flex items-start gap-1.5">
              <Icone className={`mt-0.5 h-3 w-3 flex-shrink-0 ${t.texte}`} />
              <span className="line-clamp-2 text-[10px] font-medium leading-snug">{tache.titre}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TEINTE_ETAT[tache.etat]}`} />
              <span className="text-[9px] muted">{ETATS_TACHE[tache.etat] || tache.etat}</span>
              <span className={`ml-auto truncate text-[9px] font-semibold ${t.texte}`}>
                {agent?.nom || tache.agent || '?'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Detail
// -----------------------------------------------------------------------------
export function DetailTache({ tache, agent }: { tache: Tache; agent?: Agent }) {
  const t = teinte(agent?.couleur)
  return (
    <div className="card mt-4 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${TEINTE_ETAT[tache.etat]}`} />
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold">{tache.titre}</h3>
        <span className={`flex-shrink-0 text-[10px] font-semibold ${t.texte}`}>
          {agent?.nom || tache.agent}
        </span>
      </div>
      <p className="mt-1 font-mono text-[9px] muted">
        {tache.id}
        {tache.modele && ` - ${tache.modele}`}
      </p>
      {tache.corps && (
        <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed muted">
          {tache.corps}
        </p>
      )}
      {tache.resultat && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] dark:bg-navy-950">
          {tache.resultat}
        </pre>
      )}
      {tache.erreur && <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{tache.erreur}</p>}
    </div>
  )
}

export function PlanIndisponible({ plan }: { plan: Plan }) {
  const messages: Record<string, { titre: string; aide: string }> = {
    init: {
      titre: 'Le tableau n-est pas encore cree',
      aide: 'Lance `hermes kanban init` une fois : c-est lui qui cree la base ou vivent les taches.',
    },
    node: {
      titre: 'Node est trop ancien pour lire le plan',
      aide: 'La lecture utilise `node:sqlite`, disponible a partir de Node 22.5.',
    },
    lecture: { titre: 'Le plan n-a pas pu etre lu', aide: plan.message || '' },
  }
  const m = messages[plan.raison || 'lecture'] || messages.lecture

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200">{m.titre}</h3>
      <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300/90">{m.aide}</p>
    </div>
  )
}
