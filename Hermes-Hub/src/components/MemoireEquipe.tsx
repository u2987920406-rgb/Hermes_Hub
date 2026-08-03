/**
 * Qui, dans l'equipe, a cette memoire.
 *
 * CE BLOC EXISTE PARCE QUE LA PANNE ETAIT MUETTE. Mesure du 03/08/2026 : les
 * huit questions remplies le matin - qui je suis, ce que j'attends, mes lignes
 * rouges - etaient arrivees a UN agent sur seize. Les quatorze autres avaient le
 * gabarit vide. Rien ne le montrait, et rien n'aurait pu : un agent mal
 * renseigne ne tombe pas en panne, il repond a cote, poliment.
 *
 * C'est la meme forme que `OutilsEquipe` et pour la meme raison : « un outil que
 * seul Hermes possede s'affiche 1 agent sur 4, et le bouton d'a cote le
 * repare ». Un ecart qu'on voit est un ecart qu'on corrige.
 *
 * SOUL.md N'EST PAS UN OUBLI. Les seize SOUL.md du poste ont seize empreintes
 * differentes : le caractere de Sofia n'est pas celui de Karim. Les uniformiser
 * aplatirait l'equipe en un seul agent repete. Le bloc le dit plutot que de
 * disparaitre - sinon la question « pourquoi celui-la ne se partage pas ? »
 * reste sans reponse, et quelqu'un finira par la reposer.
 */
import { AlertTriangle, Check, Users } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { MemoryFile } from '../types'

/** « sofia, karim et 12 autres » se lit ; quinze noms a la suite, non. */
function citer(noms: string[], max = 3) {
  if (noms.length <= max) return noms.join(', ')
  return `${noms.slice(0, max).join(', ')} et ${noms.length - max} autre${
    noms.length - max > 1 ? 's' : ''
  }`
}

export function MemoireEquipe({ memoire, onFait }: { memoire: MemoryFile; onFait: () => void }) {
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  if (!memoire.equipe) {
    return (
      <p data-zone="memoire-equipe" className="mt-2 text-[11px] muted">
        <Users className="mr-1 inline h-3 w-3" />
        Propre a chaque agent : celui-ci ne se partage pas. Sofia et Karim n ont pas le meme
        caractere, et les aligner reviendrait a n avoir qu un seul agent en plusieurs
        exemplaires.
      </p>
    )
  }

  const { aJour, enRetard } = memoire.equipe
  const total = aJour.length + enRetard.length

  const envoyer = async () => {
    setOccupe(true)
    try {
      const r = await api.propagerMemoire(memoire.file)
      const n = r.propagation?.portee.length ?? 0
      const rates = r.propagation?.echecs ?? []
      if (rates.length) {
        notifier('error', `${n} agent(s) servi(s), ${rates.length} en echec : ${rates[0].message}`)
      } else {
        notifier('success', `${memoire.file} est arrive a ${n} agent${n > 1 ? 's' : ''}.`)
      }
      onFait()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L envoi n a pas abouti.")
    } finally {
      setOccupe(false)
    }
  }

  if (total === 0) {
    return (
      <p data-zone="memoire-equipe" className="mt-2 text-[11px] muted">
        <Users className="mr-1 inline h-3 w-3" />
        Aucun autre agent sur ce poste : ce fichier ne sert qu a Hermes.
      </p>
    )
  }

  if (enRetard.length === 0) {
    return (
      <p data-zone="memoire-equipe" className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
        <Check className="mr-1 inline h-3 w-3" />
        Les {total} agents de l equipe ont cette version.
      </p>
    )
  }

  return (
    <div
      data-zone="memoire-equipe"
      className="mt-2 rounded-lg border border-amber-300 bg-amber-50/60 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold">
            {enRetard.length} agent{enRetard.length > 1 ? 's' : ''} sur {total} {' '}
            {enRetard.length > 1 ? 'travaillent' : 'travaille'} avec une autre version
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed">
            {citer(enRetard)} {enRetard.length > 1 ? 'ne lisent' : 'ne lit'} pas ce que tu viens
            d ecrire. Ils ne tomberont pas en panne pour autant : ils repondront a cote, sans que
            rien ne le signale.
          </p>
        </div>
        <button
          onClick={() => void envoyer()}
          disabled={occupe}
          className="btn-primary flex-none px-2.5 py-1.5 text-[11px] disabled:opacity-40"
        >
          {occupe ? 'Envoi...' : 'Envoyer a toute l equipe'}
        </button>
      </div>
    </div>
  )
}
