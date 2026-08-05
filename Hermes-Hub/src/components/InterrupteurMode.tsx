/**
 * L'INTERRUPTEUR DISCUSSION / ATELIER - et la seule promesse que le Hub fait a
 * la place d'un modele.
 *
 * Il vit au-dessus du champ, pas dans un reglage : la limite se choisit au
 * moment ou l'on ecrit, et une garantie rangee dans Configuration serait une
 * garantie que personne ne verrait. La maquette le pose la (`maquette-parcours
 * .html`, `.modes`), et elle fait foi.
 *
 * CE QU'IL ANNONCE EST CE QU'IL A CONSTATE, JAMAIS CE QU'ON ESPERE. La garantie
 * du mode Discussion tient par deux pieces : le Hub refuse tout ce qui demande
 * - c'est ecrit, eprouve, ca ne bouge pas - et un greffon `pre_tool_call` cote
 * Hermes oblige le terminal a frapper. La seconde vit hors de ce depot. Sans
 * elle, Discussion refuse `edit` et `fetch` et **laisse passer le shell** :
 * mesure le 05/08/2026, Hermes s'est vu refuser un `edit` puis a ecrit le meme
 * fichier par le terminal, sans qu'aucune demande ne soit posee.
 *
 * D'ou le bandeau. Il ne cite aucune promesse - il decrit un etat, au present :
 * « Hermes peut encore modifier des fichiers par le terminal. » C'est la meme
 * phrase que ce qui arrivera si ca arrive, donc le client n'a rien a deduire,
 * il reconnait. Une version anterieure citait « rien ne s'ecrit » entre
 * guillemets pour dire que c'etait faux : elle demandait au lecteur de tenir
 * une promesse et sa negation en tete.
 *
 * LE BOUTON QUI POSE LA PIECE N'EST PAS ENCORE LA, et son absence est voulue.
 * Le greffon d'essai n'est pas du code de production, et poser la piece chez un
 * client fait ecrire le Hub dans le `config.yaml` d'Hermes - c'est-a-dire dans
 * le fichier que le laissez-passer protege. La question se tranche au §7 du
 * plan, avec la distribution du greffon. Le bandeau occupe deja sa place : le
 * jour ou la piece est livrable, un bouton s'y allume et rien ne se redessine.
 *
 * Aucune couleur de sens en dur : `bandeau sens-alerte`, jamais `bg-amber-100`
 * - voir la regle 1 de `DESIGN.md`.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import type { ModeConversation } from '../types'

/**
 * Ce que chaque mode promet, ecrit sous l'interrupteur.
 *
 * En Discussion la phrase depend du greffon, et c'est tout l'objet du module :
 * la moitie « personne ne se reveille » est tenue par le Hub seul - il lit les
 * mentions, donc il decide - et elle est donc vraie partout. La moitie « rien
 * ne s'ecrit » ne l'est qu'avec la piece posee.
 */
/**
 * Ce que le serveur a rendu, ramene a une forme sure.
 *
 * ⚠ ECRIT APRES UN ECRAN BLANC, ET LA LECON VAUT PLUS QUE LE CORRECTIF. Le
 * chemin de la route etait faux - `/config/` au lieu de `/chat/` - et la
 * requete n'a PAS echoue : elle est tombee dans un autre bloc du serveur, qui a
 * repondu un objet parfaitement valide, sans `greffon`. Le `catch` ne s'est
 * jamais declenche, `etat` etait vrai, et `etat.greffon.present` a fait tomber
 * l'application entiere.
 *
 * `request<ModeConversation>` n'est pas une verification : c'est une
 * AFFIRMATION sur ce que le serveur rendra. TypeScript la croit sur parole et
 * ne franchit pas le reseau. Une reponse d'une version future, d'une route
 * voisine ou d'un mandataire passe donc au travers.
 *
 * D'ou ce filtre. Une forme inattendue rend « greffon absent » plutot que de
 * casser : le doute retombe du cote qui ne promet rien, exactement comme
 * `lireMode()` retombe sur Atelier cote serveur.
 */
function sur(brut: unknown): ModeConversation | null {
  const o = brut as Partial<ModeConversation> | null
  if (!o || (o.mode !== 'atelier' && o.mode !== 'discussion')) return null
  const g = o.greffon
  return {
    mode: o.mode,
    greffon: {
      present: g?.present === true,
      nom: typeof g?.nom === 'string' ? g.nom : 'heurtoir',
      raison: g?.present === true ? null : (g?.raison ?? 'config-introuvable'),
    },
  }
}

function garantie(etat: ModeConversation): string {
  if (etat.mode === 'atelier') {
    return "L equipe : les mentions reveillent, les plans se proposent."
  }
  return etat.greffon.present
    ? 'Hermes seul. Personne ne se reveille, rien ne s ecrit.'
    : 'Hermes seul. Personne ne se reveille.'
}

/**
 * `centre` est le salut - l'accueil avant le premier message. La barre y
 * inverse son ordre, donc l'interrupteur doit reclamer sa place lui-meme :
 * une garantie qui passerait au-dessus ou au-dessous du champ selon l'ecran
 * cesserait de se lire comme une condition de ce qu'on ecrit.
 */
export function InterrupteurMode({ centre = false }: { centre?: boolean }) {
  const [etat, setEtat] = useState<ModeConversation | null>(null)
  const [enVol, setEnVol] = useState(false)

  useEffect(() => {
    // Un echec de lecture ne doit pas faire disparaitre le champ de saisie :
    // on reste muet plutot que de poser un interrupteur dont on ignore l'etat.
    api
      .modeConversation()
      .then((r) => setEtat(sur(r)))
      .catch(() => setEtat(null))
  }, [])

  if (!etat) return null

  async function choisir(mode: ModeConversation['mode']) {
    if (mode === etat?.mode || enVol) return
    setEnVol(true)
    try {
      const rendu = sur(await api.setModeConversation(mode))
      // Une reponse illisible ne doit pas laisser l'interrupteur affirmer
      // l'ancien mode : on se tait plutot que d'afficher une garantie perimee.
      setEtat(rendu)
    } catch {
      setEtat(null)
    } finally {
      setEnVol(false)
    }
  }

  const enDiscussion = etat.mode === 'discussion'
  const manque = enDiscussion && !etat.greffon.present

  return (
    <div data-zone="interrupteur-mode" className={centre ? 'order-first space-y-2' : 'space-y-2'}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div
          role="radiogroup"
          aria-label="Mode de la conversation"
          className="flex flex-none overflow-hidden rounded-lg border border-slate-200 dark:border-navy-700"
        >
          {(['discussion', 'atelier'] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={etat.mode === m}
              disabled={enVol}
              onClick={() => choisir(m)}
              className={
                etat.mode === m
                  ? 'bg-navy-900 px-3.5 py-1 text-[11.5px] font-semibold text-white dark:bg-gold-500 dark:text-navy-950'
                  : 'px-3.5 py-1 text-[11.5px] muted hover:bg-slate-50 dark:hover:bg-navy-800'
              }
            >
              {m === 'discussion' ? 'Discussion' : 'Atelier'}
            </button>
          ))}
        </div>

        <span className="min-w-0 flex-1 text-[10.5px] leading-snug muted">{garantie(etat)}</span>
      </div>

      {/* Il ne parait qu'en Discussion : en Atelier, rien n'est promis sur
          l'ecriture, donc il n'y a aucun ecart a signaler. Le montrer partout
          en ferait un decor qu'on cesse de lire. */}
      {manque && (
        <div className="bandeau sens-alerte text-[11.5px]">
          <AlertTriangle className="h-4 w-4 flex-none teinte-sens" aria-hidden />
          <span>Hermes peut encore modifier des fichiers par le terminal.</span>
        </div>
      )}
    </div>
  )
}
