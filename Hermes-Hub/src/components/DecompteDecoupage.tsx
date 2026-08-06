/**
 * LE DECOMPTE DU DECOUPAGE - la conduite de l'attente, cote simulation.
 *
 * Sorti de `FenetreSimulation.tsx` le 06/08/2026, a la demande du cliquet des
 * tailles : montrer une simulation et conduire une attente sont deux questions,
 * et celle-ci porte deux constantes qui n'appartiennent qu'a elle.
 *
 * Son cousin du fil est `AttentePlan.tsx`. Les deux comptent au lieu
 * d'annoncer, et les deux montrent leur plafond - meme regle, tenue a deux
 * endroits parce que les deux attentes n'ont ni la meme duree ni la meme place.
 */
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

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
export function DecompteDecoupage() {
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

      {/* F18 : « le tableau » ne veut rien dire pour qui n'a jamais ouvert le
          kanban d'Hermes. Ce qui rassure n'est pas OU la demande est rangee,
          c'est qu'elle ne se perdra pas - et la suite, elle, est un bouton
          (F20), pose par la fenetre a cote du message d'echec. */}
      <p className="max-w-sm text-xs muted">
        {auDela
          ? `Plus long que d habitude, et ce n est pas une panne : le meme cerveau ne met jamais exactement le meme temps. Au-dela de ${PLAFOND_DECOUPAGE_S} s le Hub arrete - ta demande sera enregistree quand meme, et tu pourras la decouper a la main.`
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
