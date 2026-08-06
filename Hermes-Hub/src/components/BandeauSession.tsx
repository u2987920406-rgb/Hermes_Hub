/**
 * « Internal error » avait une cause, et il fallait echouer pour l'apprendre.
 *
 * LE 05/08/2026, DOUZE AGENTS SE SONT TUS. La session Nous avait ete revoquee ;
 * Hermes l'ecrivait dans son `auth.json`, en clair, avec le mot exact -
 * `relogin_required: True`. Le Hub, lui, affichait « Internal error » le matin
 * et plus rien l'apres-midi. On a diagnostique un probleme de credits, et on a
 * failli rebasculer douze profils sur un autre modele pour reparer une session
 * expiree - un geste sans aucun effet, et gratuit a eviter.
 *
 * LA MOITIE QUI MANQUAIT. La lecture existe depuis le 5 aout
 * (`lireSessionFournisseur`), et `equipage.js` la colle au message d'un agent
 * qui tombe. Mais il fallait ENVOYER QUELQUE CHOSE, ATTENDRE, ET ECHOUER pour
 * l'apprendre. Le §7 du plan le disait autrement : « un client dont la session
 * expire voit treize agents muets et aucune raison ». Ce bandeau le dit AVANT
 * qu'on s'y casse les dents.
 *
 * IL PARTAGE SON EMPLACEMENT AVEC LE BANDEAU DE PROFIL, et la session gagne
 * quand les deux sont vrais. Un profil non choisi fait repondre Hermes A COTE ;
 * une session expiree fait qu'il NE REPOND PAS. Le silence passe devant
 * l'imprecision - et deux bandeaux empiles sur le meme sujet, la configuration,
 * feraient exactement les « deux affirmations sur le meme ecran » que la
 * grammaire refuse.
 *
 * ⚠ LA COMMANDE EST RECOPIEE D'HERMES, PAS INVENTEE. `hermes model` est son
 * propre mot dans son refus - « Run `hermes model` to re-authenticate ». Le 5
 * aout a 20:50, le produit annoncait `hermes auth login <fournisseur>`, une
 * sous-commande QUI N'EXISTE PAS, repetee quatre fois puis ecrite sans avoir ete
 * lancee une seule fois. Un message qui envoie taper une commande inexistante
 * est pire que « Internal error » : le second n'aide pas, le premier fait perdre
 * du temps en promettant de l'aide.
 */
import { AlertTriangle, TerminalSquare } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { SessionFournisseur } from '../types'

/** Le jour de l'expiration, en chiffres. Rien de relatif : « il y a 2 jours »
    se recalcule a chaque rendu et ne se retient pas, alors qu'une date se
    compare a ce dont on se souvient. */
function jour(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR')
}

export function BandeauSession({ session }: { session: SessionFournisseur }) {
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)
  const quand = jour(session.quand)

  const ouvrir = async () => {
    setOccupe(true)
    try {
      await api.launchHermes({ commande: 'model' })
      notifier('info', 'Un terminal s ouvre sur hermes model. Choisis ton fournisseur et reconnecte-toi.')
    } catch (e) {
      notifier(
        'error',
        e instanceof Error ? e.message : "Le terminal n a pas pu s ouvrir. Lance hermes model a la main.",
      )
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div
      data-zone="bandeau-session"
      className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs dark:border-rose-500/30 dark:bg-rose-500/10"
    >
      <AlertTriangle className="h-4 w-4 flex-none text-rose-500" />
      {/*
        DEUX FAUTES VUES A L'ECRAN, PAS A LA RELECTURE - et elles tenaient
        toutes les deux a la phrase, pas au code.

        « La session nous a expire » : le NOM DU FOURNISSEUR se lit comme le
        pronom. D'ou le nom sorti de la phrase et pose dans un `code`, ou il ne
        peut plus etre pris pour un mot francais.

        « tant qu'elle ne l'est pas » : le seul antecedent disponible etait
        « expiree », donc la phrase disait exactement l'inverse de ce qu'elle
        voulait dire. Un pronom de rappel n'a pas sa place dans un message
        d'erreur - on renomme la chose.
      */}
      <p className="min-w-0 flex-1 leading-relaxed">
        <strong>Ta session a expire{quand ? ` le ${quand}` : ''}.</strong> Le fournisseur{' '}
        <code className="rounded px-1 py-px text-[11px]">{session.fournisseur}</code> ne reconnait
        plus ce poste : tes agents resteront muets tant que la connexion n'est pas renouvelee. Ce
        n'est pas une question de credits — c'est gratuit.
      </p>
      <button
        onClick={() => void ouvrir()}
        disabled={occupe}
        title="Ouvre un terminal sur hermes model, le selecteur de fournisseur"
        className="btn-primary flex-none gap-1 px-2.5 py-1 text-[11px] disabled:opacity-40"
      >
        <TerminalSquare className="h-3 w-3" />
        Me reconnecter
      </button>
    </div>
  )
}
