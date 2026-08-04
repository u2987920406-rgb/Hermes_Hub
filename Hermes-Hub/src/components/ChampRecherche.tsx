/**
 * Chercher DANS un contenu - pas dans l'application.
 *
 * Trois recherches coexistent dans le Hub et il ne faut jamais les confondre :
 * **Ctrl K** cherche partout et navigue, un champ de liste trie ce qu'on voit,
 * et celle-ci cherche dans un contenu long qu'on est en train de lire. C'etait
 * le troisieme trou de `GRAMMAIRE-PANNEAUX.md` : la palette cherchait dans
 * l'application, les champs cherchaient dans une liste, et rien ne cherchait
 * dans un plan de trente etapes ni dans une conversation.
 *
 * DEUX CHOSES QUE CE CHAMP FAIT ET QU'UN `<input>` NU NE FAIT PAS :
 *
 *   - **il dit combien il a trouve.** Un champ qui filtre sans compter laisse
 *     croire a une liste vide alors qu'on a simplement mal tape ;
 *   - **Echap le vide** au lieu de fermer le panneau autour. Il porte pour ca
 *     `data-echap-pris-en-charge` : `useEchap` regarde ce drapeau et laisse la
 *     touche au champ. Sans lui, chercher dans un volet puis appuyer sur Echap
 *     fermait le volet en gardant le terme - exactement l'inverse du geste.
 *
 * L'ACCENT ET LA CASSE NE SONT PAS DES CRITERES : `aplatir` est la meme regle
 * que l'annuaire de la conversation appliquait deja pour son compte - chercher
 * « metier » doit trouver « métier ».
 */
import { Search, X } from 'lucide-react'
import { useId } from 'react'

/** Chercher « mixage » doit trouver « Mixage », et « metier » doit trouver
    « métier » : la casse et les accents ne sont pas des criteres. Cette
    fonction vivait dans `Conversation.tsx`, pour son seul annuaire ; elle est
    remontee ici le jour ou une deuxieme recherche en a eu besoin. */
export function aplatir(texte: string) {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

interface Props {
  valeur: string
  onChange: (v: string) => void
  placeholder: string
  /** Ce que la recherche a retenu, sur ce qu'il y avait. Absent : on ne compte pas. */
  compte?: { trouves: number; total: number }
  /** Le libelle lu par un lecteur d'ecran. L'icone seule ne dit rien. */
  quoi: string
  classe?: string
}

export function ChampRecherche({ valeur, onChange, placeholder, compte, quoi, classe = '' }: Props) {
  const id = useId()
  const plein = valeur.length > 0

  return (
    <div data-zone="champ-recherche" className={`relative min-w-[9rem] ${classe}`}>
      <label htmlFor={id} className="sr-only">
        {quoi}
      </label>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 muted" />
      <input
        id={id}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // Lu par `useEchap` : ce champ traite Echap lui-meme quand il a du
        // contenu, et ne le laisse remonter que lorsqu'il est vide.
        data-echap-pris-en-charge={plein ? '1' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && plein) onChange('')
        }}
        className={`input h-8 w-full py-0 pl-7 text-[11px] ${plein ? 'pr-14' : ''}`}
      />
      {plein && (
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {compte && (
            <span className="tabular-nums text-[10px] muted" aria-live="polite">
              {compte.trouves}/{compte.total}
            </span>
          )}
          {/* Une croix : le terme s'en va. C'est bien la famille « fermer »,
              appliquee au contenu du champ et non au champ lui-meme. */}
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded p-0.5 muted transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Effacer la recherche"
            title="Effacer (Echap)"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
