/**
 * La fenetre volante de simulation - la porte avant toute execution.
 *
 * Elle occupe 75 % de l'ecran au premier lancement, floute ce qu'il y a
 * derriere sans le cacher, se redimensionne ensuite a la souris, et
 * **disparait completement** apres usage : aucun panneau residuel, aucune
 * trace. C'est ce qui lui permet d'etre obligatoire sans devenir pesante.
 *
 * Ce qu'elle montre est la forme du travail : qui se reveille et dans quel
 * ordre, ce que chacun recoit, quels fichiers seraient touches, quelles
 * autorisations seraient demandees. Ce qu'elle ne montre pas, c'est le
 * contenu des reponses - il faudrait faire tourner les modeles, et ce ne
 * serait plus une simulation.
 *
 * Le redimensionnement se fait par `resize: both` du navigateur plutot que par
 * une poignee maison : c'est la meme geste pour l'utilisateur, et cinquante
 * lignes de gestion de souris en moins a maintenir.
 */
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileWarning,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Risque, Simulation, TacheSimulee } from '../types'

interface Props {
  simulation: Simulation | null
  /** Vrai pendant la decomposition : vingt secondes de silence passent pour
      une panne si rien ne le dit. */
  chargement?: boolean
  erreur?: string | null
  onValider: () => void
  onModifier: () => void
  onFermer: () => void
  validation?: boolean
}

const MOTS_RISQUE: Record<Risque, string> = {
  vert: 'passe seul',
  orange: 'demande a passer',
  rouge: 'exige ton accord',
}

const SENS_RISQUE: Record<Risque, string> = {
  vert: 'sens-succes',
  orange: 'sens-alerte',
  rouge: 'sens-danger',
}

/** Le reveil se compte en secondes : une precision a la milliseconde donnerait
    l'illusion d'une mesure alors que c'est une estimation. */
function secondes(ms: number) {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

export function FenetreSimulation({
  simulation,
  chargement,
  erreur,
  onValider,
  onModifier,
  onFermer,
  validation,
}: Props) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Simulation"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '75vw', height: '75vh', minWidth: '20rem', minHeight: '16rem' }}
        className="card flex max-h-full max-w-full resize flex-col overflow-hidden p-0 shadow-2xl"
      >
        <Entete
          simulation={simulation}
          compact={compact}
          onCompact={() => setCompact((v) => !v)}
          onFermer={onFermer}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {chargement && <EnAttente />}
          {erreur && (
            <div className="bandeau sens-danger">
              <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
              <span>{erreur}</span>
            </div>
          )}
          {simulation && !chargement && <Corps simulation={simulation} compact={compact} />}
        </div>

        {simulation && !chargement && (
          <PiedDePage
            simulation={simulation}
            validation={validation}
            onValider={onValider}
            onModifier={onModifier}
          />
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
function Entete({
  simulation,
  compact,
  onCompact,
  onFermer,
}: {
  simulation: Simulation | null
  compact: boolean
  onCompact: () => void
  onFermer: () => void
}) {
  return (
    <div className="flex flex-none items-start gap-3 border-b border-slate-200 px-4 py-3 dark:border-navy-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Simulation</h3>
          {simulation && (
            <span className={`puce ${SENS_RISQUE[simulation.risque]}`}>
              {simulation.risque} - {MOTS_RISQUE[simulation.risque]}
            </span>
          )}
          <span className="puce sens-info">aucun modele appele</span>
        </div>
        <p className="mt-0.5 truncate text-xs muted">
          {simulation?.pole.titre || 'Preparation du plan...'}
        </p>
      </div>

      <button
        onClick={onCompact}
        className="btn-ghost px-2 py-1.5"
        title={compact ? 'Mode grand' : 'Mode compact'}
      >
        {compact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
      </button>
      <button onClick={onFermer} className="btn-ghost px-2 py-1.5" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * La decomposition prend une trentaine de secondes et c'est le seul appel
 * modele de la phase. Sans ce panneau, l'attente ressemble a une panne - et un
 * utilisateur qui croit a une panne relance, ce qui la double.
 */
function EnAttente() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      <p className="text-sm font-medium">Hermes decoupe ta demande</p>
      <p className="max-w-sm text-xs muted">
        Une trentaine de secondes. C est le seul moment ou un modele travaille : ensuite tout
        est lu sur le disque, et rien ne s execute avant ton accord.
      </p>
    </div>
  )
}

function Corps({ simulation, compact }: { simulation: Simulation; compact: boolean }) {
  const rouges = simulation.autorisations.filter((a) => a.risque === 'rouge')

  return (
    <div className="space-y-4">
      {simulation.alertes.length > 0 && (
        <div className="space-y-1.5">
          {simulation.alertes.map((a, i) => (
            <div key={i} className="bandeau sens-alerte">
              <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
              <span className="text-xs leading-snug">{a.texte}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] muted">
        <Chiffre valeur={String(simulation.agents.length)} libelle="agents mobilises" />
        <Chiffre valeur={String(simulation.vagues.length)} libelle="etapes" />
        <Chiffre valeur={secondes(simulation.reveilTotal)} libelle="de reveil cumule" />
        {simulation.fichiers.length > 0 && (
          <Chiffre valeur={String(simulation.fichiers.length)} libelle="fichiers touches" />
        )}
      </div>

      {simulation.vagues.map((v) => (
        <div key={v.rang} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-slate-200 text-[10px] font-bold tabular-nums dark:bg-navy-800">
              {v.rang}
            </span>
            <span className="text-[11px] font-medium muted">
              {v.taches.length > 1
                ? `${v.taches.length} agents en parallele`
                : 'une seule tache'}
            </span>
            {v.cycle && <span className="puce sens-danger">boucle</span>}
            <span className="ml-auto text-[10px] tabular-nums muted">
              +{secondes(v.reveilCumule)}
            </span>
          </div>

          <div className="space-y-2 pl-7">
            {v.taches.map((t) => (
              <Etape key={t.id} tache={t} compact={compact} />
            ))}
          </div>
        </div>
      ))}

      {simulation.fichiers.length > 0 && (
        <Bloc titre="Les fichiers qui seraient touches" icone={<FileWarning className="h-4 w-4" />}>
          {simulation.fichiers.map((f) => (
            <div key={f.chemin} className="flex items-center gap-2 text-xs">
              <span className={`puce ${f.action === 'ecriture' ? 'sens-danger' : 'sens-neutre'}`}>
                {f.action}
              </span>
              <span className="truncate font-mono text-[11px]">{f.chemin}</span>
            </div>
          ))}
        </Bloc>
      )}

      {rouges.length > 0 && (
        <Bloc
          titre="Les autorisations qui seraient demandees"
          icone={<ShieldAlert className="h-4 w-4" />}
        >
          {rouges.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="puce sens-danger">{a.risque}</span>
              <span>
                <b>{a.agentNom}</b> - {a.libelle}
              </span>
            </div>
          ))}
        </Bloc>
      )}
    </div>
  )
}

function Chiffre({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-navy-800">
      <b className="tabular-nums">{valeur}</b> {libelle}
    </span>
  )
}

function Bloc({
  titre,
  icone,
  children,
}: {
  titre: string
  icone: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card space-y-1.5 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold">
        {icone}
        {titre}
      </p>
      {children}
    </div>
  )
}

/** Une etape : qui, sur quel cerveau, ce qu'il recoit, ce qu'il reclame. */
function Etape({ tache, compact }: { tache: TacheSimulee; compact: boolean }) {
  const style = { '--agent': `var(--jeton-${tache.couleur})` } as CSSProperties

  return (
    <div style={style} className="card relative overflow-hidden p-2.5">
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: 'var(--agent)' }}
      />
      <div className="pl-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {tache.demande && <span className="puce sens-neutre">la demande</span>}
          <span className="text-xs font-semibold">{tache.agentNom}</span>
          {tache.modele && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-navy-800">
              {tache.modele}
            </span>
          )}
          {tache.local && <span className="puce sens-succes">local</span>}
          <span className={`puce ${SENS_RISQUE[tache.risque]}`}>{tache.risque}</span>
          <span className="ml-auto text-[10px] tabular-nums muted">
            {tache.dejaEveille ? 'deja eveille' : `reveil ${secondes(tache.reveil)}`}
          </span>
        </div>

        <p className="mt-1 text-[13px] font-medium leading-snug">{tache.titre}</p>

        {!compact && (
          <>
            {tache.entrees.length > 0 && (
              <p className="mt-1 flex items-start gap-1 text-[11px] muted">
                <ArrowRight className="mt-0.5 h-3 w-3 flex-none" />
                <span>recoit : {tache.entrees.map((e) => e.titre).join(' - ')}</span>
              </p>
            )}
            {tache.capacites.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tache.capacites.map((c) => (
                  <span key={c.id} className={`puce ${SENS_RISQUE[c.risque]}`}>
                    {c.libelle}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Valider ouvre la porte, ca ne lance rien. La nuance est ecrite sous les
 * boutons parce que c'est exactement la ou elle se joue : un bouton nomme
 * « Valider » se lit spontanement comme « Lancer ».
 */
function PiedDePage({
  simulation,
  validation,
  onValider,
  onModifier,
}: {
  simulation: Simulation
  validation?: boolean
  onValider: () => void
  onModifier: () => void
}) {
  const deja = !!simulation.validation

  return (
    <div className="flex flex-none flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-navy-800 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-[11px] leading-snug muted">
        {deja
          ? 'Ce pole est deja valide. Rien ne s est execute pour autant : le lancement est un autre geste.'
          : 'Valider ouvre la porte - aucun agent ne demarre a cet instant.'}
      </p>
      <div className="flex gap-2">
        <button className="btn-ghost text-xs" onClick={onModifier}>
          <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
          Modifier
        </button>
        <button className="btn-primary text-xs" onClick={onValider} disabled={validation || deja}>
          {validation ? (
            <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 inline h-3.5 w-3.5" />
          )}
          {deja ? 'Valide' : 'Valider'}
        </button>
      </div>
    </div>
  )
}
