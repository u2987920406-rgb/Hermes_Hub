/**
 * L'historique des conversations - DEMENAGE A L'ACCUEIL.
 *
 * Il vivait dans un volet d'Orchestration, au meme rang que la conversation
 * qu'il prolonge. Le constat qui le deplace est dans
 * `PLAN-ORCHESTRATION-STUDIO.md` : **« l'historique est reste du cote ou l'on
 * n'ecrit plus. On ecrit a l'accueil, on relit dans Orchestration. Une memoire
 * rangee loin de l'endroit ou elle se fabrique ne se consulte pas. »** La forme
 * y est dictee, et elle est reprise mot pour mot : *un bouton a cote de
 * « Nouvelle », dans la ligne « En direct » qui existe deja.*
 *
 * IL EST CONVOQUE, DONC IL SE FERME - `X` ou Echap, jamais un chevron ni un
 * repli. Meme famille que `VoletAlertes`, meme glissement depuis la droite, et
 * pour la meme raison de place : ce qui ne s'ouvre qu'a la demande ne se dispute
 * la place avec rien, ni avec le fil, ni avec le salut.
 *
 * ⚠ LE BOUTON EXISTE A DEUX MOMENTS, ET C'EST UN SEUL BOUTON. Au salut il se
 * range avec Projets et Coffre - c'est la que se posent les destinations de
 * l'accueil - et des que le fil a commence il rejoint la ligne « En direct ».
 * Le moment change, pas le geste. Un composant recopie a deux endroits aurait
 * diverge au premier reglage ; ici les deux appels rendent le meme code, et
 * `compact` ne regle que la taille.
 *
 * ET LA LISTE NE VIT PAS ICI. Elle est dans le magasin, comme `demandes` : la
 * conversation la relit a chaque tour fini, le bouton en affiche le compte, le
 * volet la deroule. Trois lectures, une source - c'est exactement la lecon du
 * 05/08, ou une liste tenue en double a laisse un agent arrete sans carte.
 */
import { History, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useEchap } from '../hooks/useEchap'
import { useHubStore } from '../store/useHubStore'
import type { Agent, Equipe, FilResume } from '../types'

/**
 * La porte du volet, et le compte de ce qu'il y a dedans.
 *
 * Le compte est la moitie du geste : « Conversations » seul n'apprend pas qu'il
 * y en a douze qui attendent, et une porte dont on ne sait pas si elle mene
 * quelque part ne s'ouvre pas. Zero conversation, pas de bouton - un accueil ne
 * porte pas de rubrique vide, la meme regle que les automatisations.
 */
export function BoutonHistorique({ compact }: { compact?: boolean }) {
  const fils = useHubStore((s) => s.fils)
  const ouvrir = useHubStore((s) => s.ouvrirHistorique)

  if (!fils.length) return null

  return (
    <button
      onClick={ouvrir}
      className={compact ? 'btn-ghost px-2.5 py-1 text-[11px]' : 'btn-ghost px-3 py-1.5 text-xs'}
      title="Retrouver une conversation passee et la reprendre"
    >
      <History className={compact ? 'mr-1 inline h-3.5 w-3.5' : 'mr-1.5 inline h-3.5 w-3.5'} />
      Conversations
      <span className="ml-1.5 tabular-nums opacity-60">{fils.length}</span>
    </button>
  )
}

const ONGLETS: { id: 'tous' | 'equipe' | 'agent'; libelle: string }[] = [
  { id: 'tous', libelle: 'Tout' },
  { id: 'equipe', libelle: 'Equipes' },
  { id: 'agent', libelle: 'Agents' },
]

/**
 * Le volet lui-meme.
 *
 * Une conversation ne se retrouve pas en tapant, elle se retrouve en
 * reconnaissant : l'interlocuteur, sa couleur, le jour. Les trois filtres sont
 * donc des boutons, et rien ne demande le clavier.
 */
export function VoletHistorique({
  agents,
  equipes,
  onOuvrir,
  onJeter,
}: {
  agents: Agent[]
  equipes: Equipe[]
  /** Rejouer un fil : seule la conversation sait le faire, donc elle le passe. */
  onOuvrir: (id: string) => void
  onJeter: (id: string) => void
}) {
  const ouvert = useHubStore((s) => s.historiqueOuvert)
  const fermer = useHubStore((s) => s.fermerHistorique)
  const fils = useHubStore((s) => s.fils)
  const [tri, setTri] = useState<'tous' | 'equipe' | 'agent'>('tous')

  useEchap(ouvert, fermer)
  if (!ouvert) return null

  const visibles = fils.filter((f) => tri === 'tous' || f.portee === tri)

  const couleurDe = (f: FilResume) => {
    if (f.portee === 'equipe') {
      const e = equipes.find((x) => x.nom.toLowerCase() === f.cible.toLowerCase())
      return e?.couleur || 'ciel'
    }
    return agents.find((a) => a.id === f.cible)?.couleur || 'ardoise'
  }

  return (
    <div
      data-zone="volet-historique"
      className="fixed inset-0 z-[55] flex justify-end bg-navy-950/30 backdrop-blur-sm"
      onClick={fermer}
      role="dialog"
      aria-modal="true"
      aria-label="Tes conversations"
    >
      <aside
        className="flex h-full w-full max-w-sm animate-glisse-droite flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-navy-800 dark:bg-navy-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-navy-800">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              {fils.length} conversation{fils.length > 1 ? 's' : ''}
            </h3>
            <p className="text-[11px] muted">
              Rangees par interlocuteur : une equipe, ou un agent pris a part.
            </p>
          </div>
          <button
            onClick={fermer}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800"
            aria-label="Fermer"
            title="Fermer (Echap)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-shrink-0 gap-1 border-b border-slate-200 px-3 py-2 dark:border-navy-800">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => setTri(o.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tri === o.id
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visibles.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs muted">
              Rien sous ce filtre. Des que tu parles a quelqu un, le fil s ecrit tout seul
              et se retrouve ici - reflexion et appels d outils compris.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visibles.map((f) => (
                <li
                  key={f.id}
                  data-zone="ligne-historique"
                  style={{ '--agent': `var(--jeton-${couleurDe(f)})` } as CSSProperties}
                  className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-navy-700"
                >
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-1"
                    style={{ backgroundColor: 'var(--agent)' }}
                  />
                  <button
                    onClick={() => {
                      onOuvrir(f.id)
                      fermer()
                    }}
                    className="rang-y block w-full pl-4 pr-9 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold">{f.interlocuteur}</span>
                      {f.encours && <span className="puce puce-pleine sens-succes">en cours</span>}
                      <span className="ml-auto text-[10px] muted">{quand(f.majLe)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] muted">{f.titre}</span>
                    <span className="mt-1 block text-[10px] muted">
                      {f.messages} message{f.messages > 1 ? 's' : ''}
                      {f.participants.length > 1 ? ` - ${f.participants.length} agents` : ''}
                    </span>
                  </button>
                  <button
                    onClick={() => onJeter(f.id)}
                    className="sens-danger absolute right-1.5 top-2 rounded p-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:[background:color-mix(in_srgb,var(--sens)_16%,transparent)]"
                    title="Jeter cette conversation"
                  >
                    <Trash2 className="teinte-sens h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

/** Une date lisible sans calcul mental. */
function quand(ms: number) {
  const jour = 86400000
  const d = new Date(ms)
  const aujourdhui = new Date()
  const minuit = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())
  const ecart = minuit.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  if (ecart <= 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (ecart <= jour) return 'hier'
  if (ecart < 7 * jour) return d.toLocaleDateString('fr-FR', { weekday: 'long' })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
