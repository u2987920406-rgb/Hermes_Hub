/**
 * La description d'un agent, modifiable la ou elle se lit.
 *
 * ⚠ CE N'EST PAS UNE PRESENTATION, C'EST LE TEXTE QUI TRAVAILLE. Le decomposeur
 * d'Hermes ne lit QUE ca pour decider a qui confier une tache - ni le nom, ni le
 * role, ni les outils. Un agent mal decrit n'est pas casse, il est OISIF : il
 * figure dans l'organigramme et ne recoit jamais rien, sans que rien ne
 * l'explique. C'est la panne la plus silencieuse de tout le produit.
 *
 * TOUT EXISTAIT SAUF LE GESTE. `decrireAgent` cote serveur, la route `PATCH`,
 * et `api.modifierAgent` cote client : trois pieces ecrites, aucun bouton pour
 * les atteindre. Le plan le notait depuis le 4 aout - « decrire un agent, la
 * route existe, le geste manque » - et c'est la quatrieme fois en deux jours
 * qu'on trouve une porte ouverte devant laquelle personne ne passe.
 *
 * IL S'OUVRE SUR PLACE, PAS DANS UNE FENETRE. Une modale pour trois lignes
 * ferait perdre de vue la liste, c'est-a-dire les autres descriptions - or c'est
 * en les comparant qu'on voit ce qui manque a celle-ci. La forme rappelee sous
 * le champ est celle de la creation, mot pour mot : le metier, ce qu'il fait,
 * puis CE QU'IL NE FAIT PAS. Sans cette derniere phrase, le redacteur ira mettre
 * en page.
 */
import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { ApiError, api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'

export function DescriptionAgent({
  id,
  nom,
  description,
  onFait,
}: {
  id: string
  nom: string
  description: string
  /** Relire l'annuaire : la description affichee vient du disque, pas d'ici. */
  onFait: () => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState(description)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const enregistrer = async () => {
    setOccupe(true)
    try {
      await api.modifierAgent(id, { description: texte.trim() })
      notifier('success', `La description de ${nom} est enregistree.`)
      setOuvert(false)
      onFait()
    } catch (e) {
      notifier('error', e instanceof ApiError ? e.message : "La description n a pas pu etre ecrite.")
    } finally {
      setOccupe(false)
    }
  }

  if (!ouvert) {
    return (
      <p className="texte-corps mt-0.5 flex items-start gap-1.5 muted">
        <span className="min-w-0 flex-1">
          {description || (
            <span className="sens-alerte teinte-sens">
              Sans description : le decomposeur ne saura pas quoi lui confier.
            </span>
          )}
        </span>
        <button
          onClick={() => {
            setTexte(description)
            setOuvert(true)
          }}
          title="Ecrire ce que cet agent sait faire - c est le seul texte que le decomposeur lit"
          className="btn-ghost flex-none px-1.5 py-0.5"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </p>
    )
  }

  return (
    <div data-zone="description-agent" className="mt-1 space-y-2">
      <textarea
        autoFocus
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={3}
        placeholder="Comptabilite. Lit les journaux et les releves, en tire les ecarts chiffres et les justifie. Ne redige pas le rapport final et ne met pas en page."
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOuvert(false)
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && texte.trim()) void enregistrer()
        }}
      />
      <p className="text-[11px] leading-relaxed muted">
        Commence par son <strong>metier</strong> suivi d un point — c est ce que le Hub affiche —,
        puis ce qu il fait, puis <strong>ce qu il ne fait pas</strong>.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void enregistrer()}
          disabled={occupe || !texte.trim()}
          className="btn-primary gap-1.5 px-2.5 py-1 text-[11px] disabled:opacity-40"
        >
          <Check className="h-3 w-3" />
          Enregistrer
        </button>
        <button onClick={() => setOuvert(false)} className="btn-ghost px-2 py-1 text-[11px]">
          <X className="mr-1 inline h-3 w-3" />
          Annuler
        </button>
      </div>
    </div>
  )
}
