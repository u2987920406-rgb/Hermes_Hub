/**
 * L'INDICATEUR D'ATTENTE - F5, friction de gravite haute.
 *
 * « Vingt-trois secondes de silence dans un chat, c'est une panne. » Dans une
 * conversation on attend une reponse : le silence ne se lit pas « je reflechis
 * a un plan », il se lit « c'est casse ».
 *
 * Dix appels mesures le 06/08/2026 sur le cerveau local : 8,5 · 8,6 · 10,3 ·
 * 13,3 · 13,3 · 14,7 · 14,8 · 16,9 · **54,2 s**. Un facteur six entre le plus
 * court et le plus long, sur la meme machine et le meme modele. **Aucune
 * estimation n'est donc annoncable** - on compte, et on montre ou est le
 * plafond. C'est ce que la grammaire exigeait deja pour le decoupage, et que le
 * Hub applique ailleurs sous le nom `PLAFOND_DECOUPAGE_S`.
 *
 * Et il DIT ce qu'il fait, pas seulement qu'il tourne : « je regarde si ca
 * merite un plan » se lit comme du travail ; une roue qui tourne, non.
 *
 * ⚠ F19 - IL DIT AUSSI QU'ON PEUT ECRIRE PENDANT, et c'est la moitie qui
 * manquait. Le champ reste vivant tout au long de cette attente - rien ne le
 * desactive, on peut taper et envoyer - mais **personne n'essaie de taper dans
 * un champ pendant qu'une reponse se prepare.** C'est la capacite la plus utile
 * du dispositif, et elle etait invisible : une possibilite qui ne se voit pas
 * n'existe pas. Un mot suffit, et la grammaire le demandait deja au §6 bis.
 *
 * Le mot ne se pose pas sous le champ mais ici, contre le decompte : c'est le
 * decompte qui fait croire qu'il faut attendre, donc c'est a cote de lui que le
 * dementi se lit.
 *
 * Il vit dans son propre fichier depuis le 06/08 - le cliquet des tailles l'a
 * demande en meme temps que F19, et il avait raison : conduire une attente et
 * dessiner une carte sont deux questions.
 */
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

/**
 * LE PLAFOND DE LA PREPARATION D'UN PLAN, EN SECONDES.
 *
 * ⚠ Repris de `PLAFOND_PLAN` dans `server/plan.js`, qui coupe le processus. Les
 * deux se tiennent par ce commentaire et par le sien : changer l'un sans
 * l'autre ferait mentir le decompte de la pire facon, en promettant du temps
 * qui n'existe plus.
 */
const PLAFOND_PLAN_S = 90

export function AttentePlan({ depuis }: { depuis: number }) {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const secondes = Math.max(0, Math.round((maintenant - depuis) / 1000))

  return (
    <div
      data-zone="attente-plan"
      className="flex flex-wrap items-center gap-x-2 text-xs italic muted"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>Je regarde si ca merite un plan…</span>
      <span
        className="tabular-nums"
        title={`Au-dela de ${PLAFOND_PLAN_S} s, la preparation est arretee.`}
      >
        {secondes} s / {PLAFOND_PLAN_S} s
      </span>
      <span className="not-italic">— tu peux continuer a ecrire pendant ce temps.</span>
    </div>
  )
}
