/**
 * Faire une equipe : cocher des agents, la nommer, l'enregistrer.
 *
 * POURQUOI CE COMPOSANT N'EXISTAIT PAS, ET CE QUE CA DISAIT DU HUB. `lireEquipes`
 * et `ecrireEquipes` etaient la depuis le debut ; la seconde n'etait appelee de
 * NULLE PART, et aucune route ne l'exposait. L'ecran affichait donc des equipes
 * que personne ne pouvait fabriquer, renommer ni jeter - le seul moyen d'en
 * creer une etait d'editer `.hub/equipes.json` a la main.
 *
 * kuchu, le 03/08/2026 : « j'ai envie de creer une equipe. Je ne peux pas
 * selectionner mes agents et creer une equipe. C'est tout con. On voit juste les
 * equipes, on ne peut meme pas parametrer. Donc on peut l'enlever. »
 *
 * On ne l'enleve pas : `@NomDEquipe` reveille le groupe en conversation, et
 * c'est le seul moyen d'appeler cinq agents sans taper cinq noms. La
 * fonctionnalite marchait ; c'est la porte qui manquait. Troisieme fois de la
 * soiree - voir `ADM.md`, « une consigne ne remplace pas un chemin qui manque ».
 *
 * LA SELECTION EST LE GESTE, pas un reglage dans un formulaire. On coche dans la
 * liste des agents qu'on a sous les yeux, avec leur couleur et leur metier :
 * composer une equipe, c'est regarder qui on a. Un champ « membres » separe par
 * des virgules aurait demande de connaitre les identifiants par coeur.
 */
import { Check, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Attente } from './Attente'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { Agent, Equipe } from '../types'

export function EditeurEquipe({
  agents,
  equipe,
  onFini,
  onAnnuler,
}: {
  agents: Agent[]
  /** Absente = on en cree une. Presente = on la modifie. */
  equipe?: Equipe
  onFini: () => void
  onAnnuler: () => void
}) {
  const [nom, setNom] = useState(equipe?.nom || '')
  const [membres, setMembres] = useState<string[]>(equipe?.membres || [])
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const basculer = (id: string) =>
    setMembres((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  const enregistrer = async () => {
    setOccupe(true)
    try {
      if (equipe) {
        await api.modifierEquipe(equipe.id, { nom, membres })
        notifier('success', `L equipe « ${nom} » est a jour.`)
      } else {
        await api.creerEquipe({ nom, membres })
        notifier('success', `L equipe « ${nom} » existe. Appelle-la avec @${nom} en conversation.`)
      }
      onFini()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L equipe n a pas pu etre enregistree.")
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div data-zone="editeur-equipe" className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 flex-none text-sky-500" />
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Le nom de l equipe - c est lui qu on tape apres @"
          className="input flex-1 text-xs"
          autoFocus
        />
      </div>

      <div>
        <p className="mb-1.5 text-[11px] muted">
          {membres.length === 0
            ? 'Coche les agents qui en font partie.'
            : `${membres.length} agent${membres.length > 1 ? 's' : ''} choisi${
                membres.length > 1 ? 's' : ''
              }`}
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {agents.map((a) => {
            const dedans = membres.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => basculer(a.id)}
                style={{ ['--agent' as string]: `var(--jeton-${a.couleur})` }}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                  dedans
                    ? 'border-sky-400 bg-sky-50/70 dark:border-sky-500/50 dark:bg-sky-500/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800'
                }`}
              >
                <span
                  className={`grid h-4 w-4 flex-none place-items-center rounded ${
                    dedans ? 'bg-sky-500 text-white' : 'border border-slate-300 dark:border-navy-600'
                  }`}
                >
                  {dedans && <Check className="h-3 w-3" />}
                </span>
                <span className="point-agent flex-none" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">{a.nom}</span>
                  <span className="block truncate text-[10px] muted">{a.metier || 'sans metier'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Dissoudre ne touche AUCUN agent, et l'ecran le dit : sans ca on
            n'ose pas cliquer, en croyant effacer des profils. */}
        {equipe && (
          <button
            onClick={async () => {
              setOccupe(true)
              try {
                await api.dissoudreEquipe(equipe.id)
                notifier('success', `L equipe « ${equipe.nom} » est dissoute. Les agents restent.`)
                onFini()
              } catch (e) {
                notifier('error', e instanceof Error ? e.message : 'Echec.')
              } finally {
                setOccupe(false)
              }
            }}
            disabled={occupe}
            className="btn-ghost mr-auto gap-1.5 px-2.5 py-1.5 text-[11px] text-rose-600 disabled:opacity-40 dark:text-rose-400"
            title="Le groupe disparait ; les agents ne sont pas touches"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Dissoudre
          </button>
        )}
        <button onClick={onAnnuler} disabled={occupe} className="btn-ghost gap-1 px-2.5 py-1.5 text-[11px]">
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
        <button
          onClick={() => void enregistrer()}
          disabled={occupe || nom.trim().length < 2 || membres.length === 0}
          className="btn-primary gap-1.5 px-2.5 py-1.5 text-[11px] disabled:opacity-40"
        >
          <Attente actif={occupe} />
          {equipe ? 'Enregistrer' : 'Creer l equipe'}
        </button>
      </div>
    </div>
  )
}
