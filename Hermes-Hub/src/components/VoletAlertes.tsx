/**
 * Le volet des alertes - le detail de ce que la ligne annonce.
 *
 * IL EST CONVOQUE, DONC IL SE FERME. `X` et Echap, jamais un chevron ni un
 * bouton de repli : la famille est ce qui rend la grammaire apprenable, et un
 * repli sur une chose qui n'existe que parce qu'on l'a demandee serait un
 * mensonge - elle reviendrait toute seule au clic suivant.
 *
 * IL GLISSE DEPUIS LA DROITE, et c'est un choix de place autant que de sens :
 * comme il ne s'ouvre qu'a la demande, il ne se dispute la place avec rien -
 * ni avec les reglages du noeud dans le Studio, ni avec le fil sur l'accueil.
 * Un panneau permanent aurait fallu arbitrer contre les deux.
 *
 * CHAQUE ENTREE MENE A SON ENDROIT. C'est la seule raison d'ouvrir le volet :
 * une liste qui enonce sans conduire oblige a chercher soi-meme ce qu'on vient
 * de lire, et `ADM.md` le dit deja - **une consigne ne remplace pas un chemin
 * qui manque.**
 *
 * La navigation se fait par le hash, pas par une prop. Le volet suit la ligne,
 * et la ligne vit sur des ecrans qui n'ont pas tous un `onNavigate` sous la
 * main - le Studio, en particulier, qui sort du cadre commun. Le routage du Hub
 * est deja le hash : s'en servir ici evite de faire descendre une prop a
 * travers trois ecrans pour un seul clic.
 */
import { X } from 'lucide-react'
import { useEchap } from '../hooks/useEchap'
import { ICONES, TEINTES, type Alerte } from './LigneAlerte'

interface Props {
  alertes: Alerte[]
  onFermer: () => void
}

export function VoletAlertes({ alertes, onFermer }: Props) {
  useEchap(true, onFermer)

  const aller = (a: Alerte) => {
    if (!a.vers) return
    const { view, param } = a.vers
    window.location.hash = param ? `/${view}/${encodeURIComponent(param)}` : `/${view}`
    onFermer()
  }

  return (
    <div
      data-zone="volet-alertes"
      className="fixed inset-0 z-[55] flex justify-end bg-navy-950/30 backdrop-blur-sm"
      onClick={onFermer}
      role="dialog"
      aria-modal="true"
      aria-label="Ce qui demande ton attention"
    >
      <aside
        className="flex h-full w-full max-w-sm animate-glisse-droite flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-navy-800 dark:bg-navy-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-navy-800">
          <h3 className="min-w-0 flex-1 text-sm font-semibold">Ce qui t attend</h3>
          <button
            onClick={onFermer}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800"
            aria-label="Fermer"
            title="Fermer (Echap)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {alertes.map((a) => {
              const Icone = ICONES[a.nature]
              return (
                <li
                  key={a.cle}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 dark:border-navy-700"
                >
                  <Icone className={`mt-0.5 h-4 w-4 flex-none ${TEINTES[a.nature]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug">{a.texte}</p>
                    {a.detail && <p className="mt-0.5 text-[11px] leading-snug muted">{a.detail}</p>}
                    {a.vers && (
                      <button
                        onClick={() => aller(a)}
                        className="mt-1.5 text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Y aller
                      </button>
                    )}
                  </div>
                  {/* Seules les traces s'ecartent. Une autorisation qui attend
                      ne se congedie pas : elle se repond, la ou elle est posee.
                      Lui donner une croix laisserait croire qu'on peut s'en
                      debarrasser, et l'agent resterait arrete sans plus rien
                      pour le dire. */}
                  {a.onEcarter && (
                    <button
                      onClick={a.onEcarter}
                      className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-navy-800"
                      aria-label="Ecarter"
                      title="J ai vu"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </div>
  )
}
