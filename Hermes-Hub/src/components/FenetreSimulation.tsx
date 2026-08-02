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
  Play,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { cleAccord } from '../lib/accords'
import { BancEssai } from './BancEssai'
import type {
  Chantier,
  DemandeAutorisation,
  Risque,
  Simulation,
  TacheSimulee,
} from '../types'

interface Props {
  simulation: Simulation | null
  /** Vrai pendant la decomposition. Une attente muette passe pour une panne, et
      celle-ci va de vingt secondes a trois minutes - d'ou le decompte. */
  chargement?: boolean
  erreur?: string | null
  onValider: () => void
  onModifier: () => void
  onFermer: () => void
  validation?: boolean
  /** Le chantier de ce pole, s'il tourne en ce moment. */
  chantier?: Chantier | null
  /** Ce qu'un agent au travail attend de toi pour continuer. */
  accords?: (DemandeAutorisation & { agent: string })[]
  onAccord: (demande: string, agent: string, option: string) => void
  onLancer: () => void
  onArreter: () => void
  lancement?: boolean
  /** Rejouee apres un retour au banc : le tableau a change sous la fenetre. */
  onRafraichir: () => void
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
  chantier,
  accords,
  onAccord,
  onLancer,
  onArreter,
  lancement,
  onRafraichir,
}: Props) {
  const [compact, setCompact] = useState(false)

  // Un echec de decoupage n'a que deux lignes a montrer. La fenetre gardait
  // quand meme ses 75 % de hauteur, soit 450 px de blanc sous le bandeau : elle
  // se met alors a la taille de ce qu'elle a a dire. Elle reste redimensionnable
  // a la souris - c'est une taille de depart, pas une contrainte.
  const seulementErreur = !!erreur && !simulation && !chargement

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  return (
    <div
      data-zone="fenetre-simulation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Simulation"
      onClick={onFermer}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={
          seulementErreur
            ? { width: 'min(42rem, 90vw)', minWidth: '20rem' }
            : { width: '75vw', height: '75vh', minWidth: '20rem', minHeight: '16rem' }
        }
        className="card flex max-h-full max-w-full resize flex-col overflow-hidden p-0 shadow-2xl"
      >
        <Entete
          simulation={simulation}
          chargement={chargement}
          erreur={erreur}
          compact={compact}
          onCompact={() => setCompact((v) => !v)}
          onFermer={onFermer}
        />

        <div
          className={`overflow-y-auto px-4 py-3 ${seulementErreur ? '' : 'min-h-0 flex-1'}`}
        >
          {/* En tete du defilement, et pas au fil des vagues : un agent arrete
              net attend, et ce qui attend doit se voir sans chercher. */}
          {(accords || []).map((d) => (
            <Accord key={cleAccord(d)} demande={d} onRepondre={onAccord} />
          ))}
          {chargement && <EnAttente />}
          {erreur && (
            <div className="bandeau sens-danger">
              <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
              <span>{erreur}</span>
            </div>
          )}
          {simulation && !chargement && <Corps simulation={simulation} compact={compact} />}
          {/* Le banc vient avec la simulation : c'est elle qui photographie. */}
          {simulation && !chargement && (
            <BancEssai
              pole={simulation.pole.id}
              banc={simulation.banc || []}
              courante={simulation.version}
              onRafraichir={onRafraichir}
            />
          )}
        </div>

        {simulation && !chargement && (
          <PiedDePage
            simulation={simulation}
            validation={validation}
            chantier={chantier}
            lancement={lancement}
            onValider={onValider}
            onModifier={onModifier}
            onLancer={onLancer}
            onArreter={onArreter}
          />
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
function Entete({
  simulation,
  chargement,
  erreur,
  compact,
  onCompact,
  onFermer,
}: {
  simulation: Simulation | null
  chargement?: boolean
  erreur?: string | null
  compact: boolean
  onCompact: () => void
  onFermer: () => void
}) {
  // L'en-tete disait « Preparation du plan... » sous le bandeau qui annonce que
  // la preparation a echoue - vu a l'ecran, jamais a la compilation. Trois
  // etats, trois phrases : ce qu'on prepare, ce qu'on a prepare, ce qui a rate.
  const echec = !!erreur && !simulation && !chargement
  const sousTitre = simulation?.pole.titre
    || (chargement ? 'Preparation du plan...' : echec ? 'Le plan n a pas pu etre prepare' : 'Preparation du plan...')

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
          {/* « Aucun modele appele » vaut pour la simulation, qui relit le
              disque. Pendant le decoupage un modele travaille justement - c'est
              tout le propos du decompte en dessous - et sur un echec de
              decoupage, un modele a bien ete appele : il a refuse de decouper.
              La puce se tait dans les deux cas, au lieu de promettre le
              contraire de ce qui vient de se passer. */}
          {!chargement && !echec && <span className="puce sens-info">aucun modele appele</span>}
        </div>
        <p className="mt-0.5 truncate text-xs muted">{sousTitre}</p>
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
 * Le plafond du serveur, en secondes.
 *
 * Duplique depuis `DELAI_DECOUPAGE` dans `server/index.js` - le decompte doit
 * annoncer la coupure AVANT qu'elle arrive, donc avant tout aller-retour. Les
 * deux commentaires se tiennent la main : changer l'un sans l'autre ferait
 * mentir le decompte de la pire facon, en promettant du temps qui n'existe
 * plus.
 */
const PLAFOND_DECOUPAGE_S = 180

/**
 * La zone ordinaire de la jauge : ou tombent la plupart des essais.
 *
 * Recalibree le 02/08/2026 au soir, et l'ancien calibrage merite d'etre raconte
 * parce qu'il explique pourquoi cette constante existe. Elle valait `[20, 96]`,
 * tiree de quatre essais a 19,7 s, 26,4 s, 95,8 s et 270 s - un ecart de 1 a 14
 * sur la meme phrase. Le coupable n'etait pas le modele mais la reflexion
 * cachee : l'orchestrateur tournait a `reasoning_effort: medium`. Pose a `none`,
 * quatre essais rendent 21, 19, 20 et 27 s. L'ecart tombe a 1,4.
 *
 * D'ou ces bornes-ci, larges d'une dizaine de secondes au lieu de quatre-vingts.
 * Depasser la borne haute n'est toujours pas une panne - c'est le quatrieme
 * essai - mais ca veut maintenant dire quelque chose, ce qu'une zone couvrant
 * la moitie de la jauge ne pouvait plus faire.
 */
const ORDINAIRE_S = [19, 30]

/**
 * Le decompte d'une commande longue.
 *
 * L'ancien panneau annoncait « une trentaine de secondes ». La mesure l'a
 * dementi : la meme demande, sur le meme cerveau, a pris 19,7 s puis 270 s.
 * Une duree annoncee qu'on depasse est pire que pas de duree du tout - a la
 * quarantieme seconde, l'utilisateur sait qu'on lui a menti, et il relance,
 * ce qui double l'attente.
 *
 * On n'annonce donc plus rien : **on compte**. Le chiffre monte, la jauge
 * avance vers un plafond nomme, et la zone ordinaire dit ou tombent la plupart
 * des essais sans promettre que celui-ci en fera partie.
 *
 * Le decompte est tenu par le navigateur, pas par le serveur. Ce n'est pas une
 * economie de trafic : c'est que l'onglet est la seule piece dont on soit sur
 * qu'elle ne soit pas occupee. Un decompte servi par la machine qui travaille
 * s'arreterait exactement quand on a besoin de lui.
 */
function EnAttente() {
  const [depuis] = useState(() => Date.now())
  const [maintenant, setMaintenant] = useState(depuis)

  useEffect(() => {
    const battement = setInterval(() => setMaintenant(Date.now()), 200)
    return () => clearInterval(battement)
  }, [])

  const ecoule = (maintenant - depuis) / 1000
  const part = Math.min(ecoule / PLAFOND_DECOUPAGE_S, 1)

  // La zone ordinaire est bornee par le plafond, et ce n'est pas une precaution
  // theorique : en abaissant le plafond a 12 s pour eprouver la coupure, la
  // borne « 20 s » s'est affichee a droite du repere de coupe, hors de la
  // jauge. Deux constantes qui se contredisent doivent se contredire en silence
  // plutot qu'a l'ecran.
  const bas = Math.min(ORDINAIRE_S[0], PLAFOND_DECOUPAGE_S)
  const haut = Math.min(ORDINAIRE_S[1], PLAFOND_DECOUPAGE_S)
  const auDela = ecoule > haut

  return (
    <div
      data-zone="decompte-decoupage"
      className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center"
    >
      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      <p className="text-sm font-medium">Hermes decoupe ta demande</p>

      {/* `tabular-nums` seul suffit a figer la largeur des chiffres : la chasse
          fixe, elle, ecarte aussi l'espace avant l'unite et fait tache. */}
      <p className="text-3xl font-semibold tabular-nums">{horloge(ecoule)}</p>

      {/* La jauge dit trois choses d'un coup : ou on en est, ou tombent les
          essais ordinaires, et ou le serveur coupera. */}
      <div className="w-full max-w-sm">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
          <div
            className="absolute inset-y-0 bg-slate-300/70 dark:bg-navy-700"
            style={{
              left: `${(bas / PLAFOND_DECOUPAGE_S) * 100}%`,
              width: `${((haut - bas) / PLAFOND_DECOUPAGE_S) * 100}%`,
            }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-[width] duration-200 ease-linear"
            style={{ width: `${part * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums muted">
          <span>{bas} s</span>
          <span>la plupart des essais</span>
          <span>coupe a {PLAFOND_DECOUPAGE_S} s</span>
        </div>
      </div>

      <p className="max-w-sm text-xs muted">
        {auDela
          ? `Plus long que d habitude, et ce n est pas une panne : le meme cerveau ne met jamais exactement le meme temps. Au-dela de ${PLAFOND_DECOUPAGE_S} s le Hub arrete, et la demande reste sur le tableau a decouper a la main.`
          : 'C est le seul moment ou un modele travaille : ensuite tout est lu sur le disque, et rien ne s execute avant ton accord.'}
      </p>
    </div>
  )
}

/** `12,4 s` en dessous de la minute, `2 min 05` au-dessus - on ne lit pas
    « 125,3 s » d'un coup d'oeil. */
function horloge(s: number) {
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`
  const m = Math.floor(s / 60)
  return `${m} min ${String(Math.floor(s % 60)).padStart(2, '0')}`
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

/**
 * Un agent au travail demande la permission d'agir.
 *
 * Ce n'est pas un ornement : le pole s'arrete la, entierement, jusqu'a la
 * reponse. La simulation avait annonce ces demandes ; celle-ci est la vraie, et
 * elle arrive au meme endroit - dans la fenetre du pole, pas dans la
 * conversation, ou elle serait adressee a un fil qui ne parle pas de ce
 * travail.
 */
function Accord({
  demande,
  onRepondre,
}: {
  demande: DemandeAutorisation & { agent: string }
  onRepondre: (demande: string, agent: string, option: string) => void
}) {
  return (
    <div className="card mb-3 space-y-2 border-l-4 border-l-rose-500 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold">
        <ShieldAlert className="h-4 w-4 flex-none" />
        {demande.agent} attend ton accord pour continuer
      </p>
      <p className="text-sm">{demande.titre}</p>
      {demande.detail && <p className="text-[11px] muted">{demande.detail}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {demande.options.map((o) => (
          <button
            key={o.id}
            onClick={() => onRepondre(demande.demande, demande.agent, o.id)}
            className={
              o.genre === 'reject_once' || o.genre === 'reject_always'
                ? 'btn-ghost px-3 py-1.5 text-xs'
                : 'btn-primary px-3 py-1.5 text-xs'
            }
          >
            {o.libelle}
          </button>
        ))}
      </div>
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
 *
 * D'ou deux gestes et jamais un seul. « Lancer » n'apparait qu'une fois le pole
 * valide - avant, il n'y a rien a pousser a travers une porte fermee - et le
 * refus est aussi prononce par le serveur : un bouton absent ne protege que
 * ceux qui passent par le bouton.
 */
function PiedDePage({
  simulation,
  validation,
  chantier,
  lancement,
  onValider,
  onModifier,
  onLancer,
  onArreter,
}: {
  simulation: Simulation
  validation?: boolean
  chantier?: Chantier | null
  lancement?: boolean
  onValider: () => void
  onModifier: () => void
  onLancer: () => void
  onArreter: () => void
}) {
  const deja = !!simulation.validation
  const tourne = !!chantier?.actif
  const total = simulation.vagues.reduce((n, v) => n + v.taches.length, 0)
  const faites = chantier?.faites.length || 0

  return (
    <div className="flex flex-none flex-col gap-2 border-t border-slate-200 px-4 py-3 dark:border-navy-800 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-[11px] leading-snug muted">
        {tourne ? (
          <>
            <b className="tabular-nums">
              {faites}/{total}
            </b>{' '}
            {chantier?.enCours.length
              ? `- ${chantier.enCours.map((t) => t.titre).join(', ')}`
              : '- en attente de la prochaine tache'}
          </>
        ) : deja ? (
          'Ce pole est valide. Lancer reveille les agents un par un, dans l ordre du graphe.'
        ) : (
          'Valider ouvre la porte - aucun agent ne demarre a cet instant.'
        )}
      </p>
      <div className="flex gap-2">
        {!tourne && (
          <button className="btn-ghost text-xs" onClick={onModifier}>
            <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
            Modifier
          </button>
        )}
        {!deja && (
          <button className="btn-primary text-xs" onClick={onValider} disabled={validation}>
            {validation ? (
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 inline h-3.5 w-3.5" />
            )}
            Valider
          </button>
        )}
        {deja &&
          (tourne ? (
            <button className="btn-ghost text-xs" onClick={onArreter}>
              <Square className="mr-1.5 inline h-3.5 w-3.5" />
              Arreter
            </button>
          ) : (
            <button className="btn-primary text-xs" onClick={onLancer} disabled={lancement}>
              {lancement ? (
                <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 inline h-3.5 w-3.5" />
              )}
              Lancer
            </button>
          ))}
      </div>
    </div>
  )
}
