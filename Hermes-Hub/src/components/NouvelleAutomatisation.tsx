/**
 * Programmer une demande, sans passer par un terminal.
 *
 * LE CHAMP DIFFICILE EST « QUAND ». Hermes accepte `30m`, `every 2h`,
 * `0 9 * * *` - et la derniere forme est hostile a qui ne la connait pas :
 * cinq champs, un ordre a retenir, et une faute silencieuse qui fait partir la
 * tache au mauvais moment sans que rien ne le signale.
 *
 * On offre donc des rythmes courants, et **on montre l'expression qu'ils
 * produisent**. Deux raisons : l'utilisateur voit ce qu'il pose plutot que de
 * faire confiance a une liste, et celui qui connait la syntaxe apprend ou la
 * taper. Le champ libre reste, et il passe tel quel - on ne traduit pas, on ne
 * valide pas a la place d'Hermes. Inventer une grammaire par-dessus la sienne
 * obligerait a la tenir d'accord avec elle a chaque version.
 *
 * Le dossier de travail est pose par defaut sur l'espace de travail. Sans lui,
 * la tache tourne depuis un repertoire indefini - et c'est exactement la faute
 * qui a coute deux nuits sur les poles : un agent qui ecrit ailleurs que la ou
 * on l'attend.
 */
import { CalendarPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'

type Rythme = 'jour' | 'semaine' | 'heures' | 'libre'

const JOURS = [
  { valeur: '1', nom: 'lundi' },
  { valeur: '2', nom: 'mardi' },
  { valeur: '3', nom: 'mercredi' },
  { valeur: '4', nom: 'jeudi' },
  { valeur: '5', nom: 'vendredi' },
  { valeur: '6', nom: 'samedi' },
  { valeur: '0', nom: 'dimanche' },
]

export function NouvelleAutomatisation({ onFait }: { onFait: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [rythme, setRythme] = useState<Rythme>('jour')
  const [heure, setHeure] = useState('09:00')
  const [jour, setJour] = useState('1')
  const [toutesLes, setToutesLes] = useState('2')
  const [libre, setLibre] = useState('')
  const [demande, setDemande] = useState('')
  const [nom, setNom] = useState('')
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)
  const config = useHubStore((s) => s.config)

  /** L'expression telle qu'Hermes la recevra. Montree, pas cachee. */
  const quand = useMemo(() => {
    const [h, m] = (heure || '09:00').split(':')
    const hh = String(Number(h) || 0)
    const mm = String(Number(m) || 0)
    if (rythme === 'jour') return `${mm} ${hh} * * *`
    if (rythme === 'semaine') return `${mm} ${hh} * * ${jour}`
    if (rythme === 'heures') return `every ${Math.max(1, Number(toutesLes) || 1)}h`
    return libre.trim()
  }, [rythme, heure, jour, toutesLes, libre])

  const poser = async () => {
    setOccupe(true)
    try {
      await api.creerAutomatisation({
        quand,
        demande: demande.trim(),
        nom: nom.trim() || undefined,
        dossier: config?.workspace || undefined,
      })
      notifier('success', 'Automatisation posee.')
      setOuvert(false)
      setDemande('')
      setNom('')
      onFait()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L'automatisation n'a pas pu etre posee.")
    } finally {
      setOccupe(false)
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="btn-ghost gap-1.5 px-2 py-1 text-[11px]"
        title="Programmer une demande"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Programmer
      </button>
    )
  }

  return (
    <div
      data-zone="nouvelle-automatisation"
      className="card mb-2 space-y-2.5 border-sky-200 p-3 dark:border-sky-500/30"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Programmer une demande</p>
        <button onClick={() => setOuvert(false)} className="btn-ghost px-1.5 py-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={demande}
        onChange={(e) => setDemande(e.target.value)}
        rows={2}
        placeholder="Resume les nouveautes de la veille et ecris-les dans le Coffre"
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <select
          value={rythme}
          onChange={(e) => setRythme(e.target.value as Rythme)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-navy-700 dark:bg-navy-900"
        >
          <option value="jour">Chaque jour</option>
          <option value="semaine">Chaque semaine</option>
          <option value="heures">Toutes les N heures</option>
          <option value="libre">Expression libre</option>
        </select>

        {rythme === 'semaine' && (
          <select
            value={jour}
            onChange={(e) => setJour(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-navy-700 dark:bg-navy-900"
          >
            {JOURS.map((j) => (
              <option key={j.valeur} value={j.valeur}>
                {j.nom}
              </option>
            ))}
          </select>
        )}

        {(rythme === 'jour' || rythme === 'semaine') && (
          <input
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-navy-700 dark:bg-navy-900"
          />
        )}

        {rythme === 'heures' && (
          <input
            type="number"
            min={1}
            max={24}
            value={toutesLes}
            onChange={(e) => setToutesLes(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-navy-700 dark:bg-navy-900"
          />
        )}

        {rythme === 'libre' && (
          <input
            value={libre}
            onChange={(e) => setLibre(e.target.value)}
            placeholder="0 9 * * 1-5"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono dark:border-navy-700 dark:bg-navy-900"
          />
        )}

        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom (facultatif)"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-navy-700 dark:bg-navy-900"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Ce qu'Hermes recevra, en clair. Un rythme choisi dans une liste
            reste opaque tant qu'on ne voit pas ce qu'il produit - et celui qui
            connait la syntaxe apprend ici ou la taper. */}
        <p className="min-w-0 flex-1 truncate text-[11px] muted">
          Hermes recevra : <code className="font-mono">{quand || '—'}</code>
        </p>
        <button
          onClick={() => void poser()}
          disabled={occupe || !demande.trim() || !quand}
          className="btn-primary flex-none text-xs disabled:opacity-40"
        >
          Programmer
        </button>
      </div>
    </div>
  )
}
