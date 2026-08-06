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
import { useEchap } from '../hooks/useEchap'
import { BancEssai } from './BancEssai'
import { DecompteDecoupage } from './DecompteDecoupage'
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
  /**
   * F20 - LE MESSAGE PORTE LE GESTE, IL NE LE DECRIT PLUS.
   *
   * Quand Hermes ne decoupe pas, la demande existe quand meme et se reprend a
   * la main dans le Studio. Le message le disait tres bien, et il n'y avait
   * aucun bouton : `ADM.md` a deja la lecon - **une consigne ne remplace pas un
   * chemin qui manque.** Absent quand il n'y a nulle part ou aller ; un bouton
   * qui ne mene a rien est pire que pas de bouton.
   */
  onOuvrirEchouee?: () => void
  onModifier: () => void
  onFermer: () => void
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
  onOuvrirEchouee,
  onModifier,
  onFermer,
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

  // Convoquee, donc elle se ferme - et ce qui se ferme se ferme par Echap.
  useEchap(true, onFermer)

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
          {chargement && <DecompteDecoupage />}
          {erreur && (
            <div className="bandeau sens-danger">
              <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
              <span className="min-w-0 flex-1">{erreur}</span>
              {onOuvrirEchouee && (
                <button onClick={onOuvrirEchouee} className="btn-ghost flex-none px-2.5 py-1 text-[11px]">
                  Ouvrir dans le Studio
                  <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                </button>
              )}
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
            chantier={chantier}
            lancement={lancement}
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
/**
 * F11 - UN SEUL BOUTON, ET C'EST « LANCER ».
 *
 * Ce pied portait « Valider » puis « Lancer », donc deux validations pour un
 * seul acte - et trois avec celle du plan dans le chat. Le raisonnement qui
 * l'enleve est dans `FRICTIONS-PARCOURS.md` : *« depuis que le script est un
 * panneau permanent plutot qu'une fenetre qu'on ouvre, valider la simulation
 * n'a plus de porte a garder : le script est sous mes yeux, le regarder EST
 * l'ouvrir. Le bouton qui certifie que je l'ai vu ne certifie plus rien. »*
 *
 * **La regle qui compte est conservee entiere** : rien ne part sans un clic
 * explicite, apres avoir eu la forme du travail sous les yeux. Deux gestes -
 * valider le plan dans le chat, lancer dans le Studio - deux moments, deux
 * objets, un bouton chacun. C'est le serveur qui date l'accord au moment du
 * clic ; voir `lancer()` dans `server/execution.js`.
 */
function PiedDePage({
  simulation,
  chantier,
  lancement,
  onModifier,
  onLancer,
  onArreter,
}: {
  simulation: Simulation
  chantier?: Chantier | null
  lancement?: boolean
  onModifier: () => void
  onLancer: () => void
  onArreter: () => void
}) {
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
        ) : (
          'Lancer reveille les agents un par un, dans l ordre du graphe. Ce clic vaut accord : rien n a demarre jusqu ici.'
        )}
      </p>
      <div className="flex gap-2">
        {!tourne && (
          <button className="btn-ghost text-xs" onClick={onModifier}>
            <Pencil className="mr-1.5 inline h-3.5 w-3.5" />
            Modifier
          </button>
        )}
        {tourne ? (
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
        )}
      </div>
    </div>
  )
}
