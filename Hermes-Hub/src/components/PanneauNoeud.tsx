/**
 * LE PANNEAU D'UN NOEUD - convoque, donc il se FERME.
 *
 * C'est le pendant droit de `PanneauPlan.tsx`, et leur difference de grammaire
 * est le meilleur exemple de la regle : **une chose permanente se replie, une
 * chose convoquee se ferme.** Le plan est toujours la, il se replie ; ces
 * reglages-ci n'existent que parce qu'on a choisi un noeud, ils se ferment. Un
 * bouton de repli ici serait un mensonge - il reviendrait tout seul au clic
 * suivant.
 *
 * Sorti de `StudioView.tsx` le 06/08/2026, en posant le panneau plan. Le
 * cliquet des tailles l'a demande, et `ARCHITECTURE.md` disait deja que la
 * decoupe du Studio se ferait « ici, en ecrivant - pas apres ».
 */
import { RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ETATS_TACHE } from '../types'
import type { Agent, Tache } from '../types'

interface Props {
  tache: Tache
  agent?: Agent
  /** Un scenario au travail se regarde, il ne se remanie pas. */
  modifiable: boolean
  occupe: boolean
  /** Vrai pour la tache de tete : elle tient le scenario et ne s'enleve pas. */
  laDemande: boolean
  onFermer: () => void
  onDebloquer: (id: string) => void
  onRetirer: (id: string) => void
}

export function PanneauNoeud({
  tache,
  agent,
  modifiable,
  occupe,
  laDemande,
  onFermer,
  onDebloquer,
  onRetirer,
}: Props) {
  return (
    <aside
      data-zone="panneau-noeud"
      className="absolute right-3 top-3 max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-navy-700 dark:bg-navy-900"
    >
      <div
        className="mb-2 flex items-start gap-2"
        style={{ ['--agent' as string]: `var(--jeton-${agent?.couleur || 'ardoise'})` } as CSSProperties}
      >
        <span className="point-agent mt-1" />
        <div className="min-w-0 flex-1">
          <p className="titre-noeud">{tache.titre}</p>
          <p className="texte-detail muted">{ETATS_TACHE[tache.etat] || tache.etat}</p>
        </div>
        <button onClick={onFermer} className="btn-ghost px-1.5 py-1 text-[11px]">
          Fermer
        </button>
      </div>

      <dl className="space-y-1.5 text-[11px]">
        <Ligne terme="Agent" valeur={agent?.nom || tache.agent || '-'} />
        <Ligne terme="Metier" valeur={agent?.metier || '-'} />
        <Ligne terme="Modele" valeur={tache.modele || agent?.modele || '-'} />
        <Ligne terme="Identifiant" valeur={tache.id} />
      </dl>

      {tache.corps && (
        <>
          <p className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wide muted">
            Ce qu-il doit accomplir
          </p>
          <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed dark:bg-navy-800">
            {tache.corps}
          </p>
        </>
      )}

      {/* La sortie de l'impasse.
          Le Hub bloque une tache quand elle n'a pas produit son livrable, quand
          le fichier ecrit avoue un echec, quand un PDF n'est qu'une page
          d'erreur. Ces refus sont justes - mais jusqu'ici rien dans l'interface
          ne permettait de repartir : le 03/08/2026 il a fallu `hermes kanban
          unblock` en ligne de commande pour relancer un pole. Le bouton est ici,
          sur le noeud qui porte le blocage, parce que c'est la qu'on le voit. */}
      {modifiable && tache.etat === 'blocked' && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Tache bloquee
          </p>
          <p className="mt-1 text-[11px] leading-relaxed">
            Elle ne repartira pas d-elle-meme. Corrige ce qui l-a fait echouer -
            l-enonce, l-agent, le modele - puis remets-la en circulation.
          </p>
          <button
            onClick={() => onDebloquer(tache.id)}
            disabled={occupe}
            className="btn-primary mt-2 w-full justify-center gap-1.5 py-1.5 text-[11px] disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Remettre en circulation
          </button>
        </div>
      )}

      {/* Retirer une tache est le seul geste du Studio qui defait du travail :
          il porte donc un nom, une confirmation, et il n'a pas de raccourci
          clavier. La demande d'origine, elle, ne s'enleve pas - c'est elle qui
          tient le scenario. */}
      {modifiable && !laDemande && (
        <Retirer titre={tache.titre} occupe={occupe} onRetirer={() => onRetirer(tache.id)} />
      )}
    </aside>
  )
}

/** Deux clics, parce que le premier peut etre un accident. */
function Retirer({
  titre,
  occupe,
  onRetirer,
}: {
  titre: string
  occupe: boolean
  onRetirer: () => void
}) {
  const [sur, setSur] = useState(false)

  // Repose la question a chaque changement de tache : une confirmation armee
  // sur une tache et tiree sur une autre serait exactement le geste a eviter.
  useEffect(() => setSur(false), [titre])

  if (!sur) {
    return (
      <button
        onClick={() => setSur(true)}
        className="btn-ghost mt-3 w-full gap-1.5 px-2 py-1.5 text-[11px]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Retirer du scenario
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-red-200 p-2 dark:border-red-500/40">
      <p className="text-[11px] leading-relaxed">
        Retirer cette tache du scenario ? Elle est archivee sur le tableau, pas effacee - ce qu-elle a
        deja produit reste consultable dans Hermes.
      </p>
      <div className="mt-2 flex justify-end gap-1.5">
        <button onClick={() => setSur(false)} className="btn-ghost px-2 py-1 text-[11px]">
          Non
        </button>
        <button onClick={onRetirer} disabled={occupe} className="btn-danger px-2.5 py-1 text-[11px]">
          Retirer
        </button>
      </div>
    </div>
  )
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 flex-none muted">{terme}</dt>
      <dd className="min-w-0 flex-1 truncate font-medium" title={valeur}>
        {valeur}
      </dd>
    </div>
  )
}
