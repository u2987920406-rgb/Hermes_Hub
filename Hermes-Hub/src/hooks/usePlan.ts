/**
 * Le va-et-vient de la carte de plan, sorti de `Conversation.tsx`.
 *
 * Il vit ici parce que le cliquet des tailles l'a demande - le fil passait sa
 * marque - et parce que c'est un cycle complet a lui seul : une demande mise de
 * cote, un verdict, trois gestes. Rien de ce qui suit ne dessine quoi que ce
 * soit ; le dessin est dans `CartePlan.tsx`.
 *
 * ⚠ AUCUN ETAT DE CARTE ICI, ET C'EST DELIBERE. Les cartes vivent dans `tours`,
 * remplies par le flux d'evenements, parce que c'est `diffuser()` qui les ecrit
 * dans l'historique - donc la seule source qui survive a un changement d'ecran
 * et se rejoue le lendemain. Une seconde copie tenue ici serait exactement le
 * bug du 05/08/2026, ou les demandes d'autorisation gardees en `useState`
 * disparaissaient au remontage pendant qu'un Maquettiste attendait toujours.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { TourPlan } from '../types'

export function usePlan({
  eveilles,
  toursFinis,
  onErreur,
  onReformuler,
}: {
  /** Combien d'agents parlent encore. Ne commande PAS le depart - voir plus bas. */
  eveilles: number
  /** Combien de tours se sont termines. C'est LE signal de depart. */
  toursFinis: number
  onErreur: (message: string) => void
  /** Remet la demande dans le champ, pour F7. */
  onReformuler: (texte: string) => void
}) {
  /**
   * LA DEMANDE QUI ATTEND SON VERDICT.
   *
   * On ne demande pas de plan pendant qu'Hermes repond : le fil s'ecrit dans
   * l'ordre d'arrivee, et une carte qui se glisserait au milieu d'une reponse
   * la couperait en deux. La demande est donc mise de cote a l'envoi, et
   * reprise quand plus personne ne parle - c'est l'ordre de la maquette :
   * Hermes repond d'abord, la carte se pose ensuite.
   *
   * Une reference plutot qu'un etat : la poser ne doit rien redessiner, et elle
   * doit survivre aux rendus intermediaires du tour.
   */
  const enAttente = useRef<string | null>(null)
  /** Depuis quand on cherche - alimente le decompte de F5. */
  const [depuis, setDepuis] = useState<number | null>(null)
  /** La carte dont on pose le scenario : ses boutons ne se cliquent qu'une fois. */
  const [enVol, setEnVol] = useState<string | null>(null)

  const proposer = useCallback(
    async (texte: string) => {
      setDepuis(Date.now())
      try {
        // La carte arrive par le FLUX, pas par cette reponse. Deux sources pour
        // une meme carte, et c'est le bug de la carte d'autorisation qui
        // recommence.
        await api.plan(texte)
      } catch (e) {
        // Un plan qui n'aboutit pas ne casse pas la conversation : Hermes a
        // deja repondu. On le dit sans transformer ca en panne du fil.
        onErreur(e instanceof Error ? e.message : String(e))
      } finally {
        setDepuis(null)
      }
    },
    [onErreur],
  )

  /** A l'envoi : ce qu'on vient de demander attend de savoir si c'est un chantier. */
  const mettreDeCote = useCallback((texte: string) => {
    enAttente.current = texte
  }, [])

  /**
   * LE VERDICT PART QUAND LE TOUR QUI M'A REPONDU SE TERMINE.
   *
   * ⚠ CE DECLENCHEUR A ETE ECRIT AUTREMENT, ET IL NE PARTAIT JAMAIS. La
   * premiere version attendait que PERSONNE ne soit eveille - `eveilles === 0`,
   * lu des evenements `reveil` / `sommeil` du serveur. Ca semblait plus juste :
   * ne pas poser une carte pendant que quelqu'un travaille encore.
   *
   * Eprouve a l'ecran le 06/08/2026, sur « fais le portrait de Lucas Ferrand » :
   * Hermes a repondu 139,7 s, puis **delegue au redacteur**. Le journal ACP est
   * sans appel - `Dispatched async delegation batch deleg_107b576a`. Le tour
   * d'Hermes s'est fini, l'agent delegue est reste eveille, `eveilles` n'est
   * jamais redescendu a zero, et **la carte n'a jamais ete demandee**. Aucune
   * erreur nulle part : juste un fil qui s'arrete.
   *
   * Une delegation peut durer des minutes, ou ne jamais rendre la main. Attendre
   * le silence complet, c'est attendre une condition qui n'est garantie par
   * rien. Le tour qui repond, lui, se termine toujours - meme interrompu, meme
   * en panne, `tour-fin` arrive.
   *
   * `eveilles` reste passe en parametre : il ne commande plus le depart, mais
   * il dit encore qui parle, et la suite du chantier en aura besoin.
   */
  useEffect(() => {
    if (toursFinis === 0 || depuis !== null) return
    const texte = enAttente.current
    if (!texte) return
    enAttente.current = null
    void proposer(texte)
  }, [toursFinis, depuis, proposer])

  const valider = async (tour: TourPlan) => {
    setEnVol(tour.id)
    try {
      await api.poserPlan(tour.id, tour.plan)
    } catch (e) {
      onErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnVol(null)
    }
  }

  /**
   * F7 : « Modifier ne promet rien de precis. Il me renvoie au chat ? Dans le
   * Studio ? » Il ramene la demande dans le champ - rien n'a ete ecrit sur le
   * disque a ce stade, il n'y a donc rien a defaire. La carte passe a l'etat
   * refuse : ce qu'on s'apprete a reformuler n'est plus a valider.
   */
  const reformuler = async (tour: TourPlan) => {
    onReformuler(tour.plan.demande)
    try {
      await api.refuserPlan(tour.id)
    } catch {
      /* la carte reste validable : moins grave qu'un champ qu'on aurait vide */
    }
  }

  return {
    depuis,
    enVol,
    mettreDeCote,
    valider,
    reformuler,
    refuser: (tour: TourPlan) => void api.refuserPlan(tour.id),
    basculer: (tour: TourPlan) => void api.basculerPlan(tour.id),
  }
}
