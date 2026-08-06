/**
 * Composer son equipe depuis le Hub.
 *
 * C'etait le dernier trou du parcours d'un client : il recevait trois roles et
 * ne pouvait jamais en ajouter un quatrieme sans terminal. Un produit qui
 * montre une equipe qu'on ne peut pas changer se lit comme une demonstration,
 * pas comme un outil.
 *
 * LA DESCRIPTION EST LE CHAMP QUI TRAVAILLE, et c'est le contraire de ce qu'on
 * croit en la remplissant : ce n'est pas une presentation, c'est ce que le
 * decomposeur lit - et rien d'autre - pour decider a qui confier une tache. Un
 * agent mal decrit n'est pas casse, il est oisif : il figure dans
 * l'organigramme et ne recoit jamais rien, sans que rien ne l'explique.
 *
 * D'ou la forme imposee, rappelee sous le champ : le metier d'abord, suivi d'un
 * point - c'est aussi cette premiere phrase que le Hub affiche comme metier -,
 * puis ce qu'il fait, puis ce qu'il ne fait PAS. Ce dernier point compte autant
 * que les autres : sans lui, le redacteur ira mettre en page.
 */
import { UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'

const EXEMPLE =
  'Comptabilite. Lit les journaux et les releves, en tire les ecarts chiffres et les ' +
  'justifie. Ne redige pas le rapport final et ne met pas en page.'

/**
 * `libelle` existe pour C4 / F17 : dans le panneau plan, ce meme formulaire
 * repond a « personne ne sait faire cette etape », et le bouton doit dire ca -
 * « Creer un specialiste » - plutot que « Nouvel agent ». Le formulaire, lui,
 * ne bouge pas : deux fiches de creation pour un seul geste, c'est deux endroits
 * a corriger le jour ou la description change de regle.
 */
export function NouvelAgent({ onFait, libelle }: { onFait: () => void; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [description, setDescription] = useState('')
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const poser = async () => {
    setOccupe(true)
    try {
      const r = await api.creerAgent({ nom, description })
      notifier('success', `Agent « ${r.id} » cree. Il herite de la cle et du modele du poste.`)
      setOuvert(false)
      setNom('')
      setDescription('')
      onFait()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L'agent n'a pas pu etre cree.")
    } finally {
      setOccupe(false)
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="btn-ghost gap-1.5 px-3 py-1.5 text-xs"
        title="Ajouter un agent a l equipe"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {libelle || 'Nouvel agent'}
      </button>
    )
  }

  return (
    <div data-zone="nouvel-agent" className="card mb-2 space-y-2.5 border-sky-200 p-3 dark:border-sky-500/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Un agent de plus</p>
        <button onClick={() => setOuvert(false)} className="btn-ghost px-1.5 py-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="son identifiant : d-comptable"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder={EXEMPLE}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />

      <p className="text-[11px] leading-relaxed muted">
        La description est le <strong>seul</strong> texte que le decomposeur lit pour lui confier
        une tache. Commence par son metier suivi d un point - c est ce que le Hub affichera -, puis
        ce qu il fait, puis <strong>ce qu il ne fait pas</strong>. Sans cette derniere phrase, le
        redacteur ira mettre en page.
      </p>

      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[11px] muted">
          Il herite de la cle et du modele du poste : il pourra repondre tout de suite.
        </p>
        <button
          onClick={() => void poser()}
          disabled={occupe || !nom.trim() || description.trim().length < 20}
          className="btn-primary flex-none text-xs disabled:opacity-40"
        >
          Creer
        </button>
      </div>
    </div>
  )
}
