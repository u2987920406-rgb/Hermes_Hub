/**
 * La carte de plan - QUI, QUOI, COMMENT, RESULTAT ATTENDU.
 *
 * La regle qui la fait exister est de kuchu, le 04/08/2026 :
 *
 *   « Tant qu'Hermes n'a pas propose de plan, il repond, et c'est tout : aucun
 *     bouton de validation, aucun Studio. Les boutons n'apparaissent que
 *     lorsqu'un plan existe - parce qu'alors il y a quelque chose a valider. »
 *
 * D'ou la forme : les trois boutons vivent DANS la carte, jamais ailleurs. Un
 * « Valider » pose sous un fil ordinaire n'aurait rien a valider, et c'est la
 * definition meme d'un bouton qui inquiete.
 *
 * LES QUATRE PARTS SONT OBLIGATOIRES, et la quatrieme est celle qui manquait
 * partout (`FRICTIONS-PARCOURS.md`) :
 *
 *   QUI              les agents mobilises, nommes - on ne valide pas une equipe
 *                    qu'on ne voit pas
 *   QUOI             les taches, une phrase chacune, dans l'ordre
 *   COMMENT          l'ordre, les paralleles, les outils, ce qui sera ecrit
 *   RESULTAT ATTENDU les livrables annonces - **la seule part qui permette de
 *                    juger apres coup**. Sans elle, un pole en echec partiel
 *                    ressemble exactement a un pole reussi.
 *
 * ⚠ TROIS ETATS, ET LA CARTE NE DISPARAIT DANS AUCUN. C'est F8 : « le fil doit
 * porter l'etat de ce qu'il a propose, sinon il raconte une histoire fausse des
 * le lendemain ». Une carte validee garde sa place et montre son scenario ; une
 * carte refusee garde la sienne et dit qu'elle l'a ete. Retirer la carte
 * laisserait croire qu'on n'a jamais rien propose - c'est la meme lecon que la
 * carte d'autorisation perimee, qui reste elle aussi.
 */
import { ArrowRight, FileOutput, Shield, Sparkles, Users } from 'lucide-react'
import type { Agent, TourPlan } from '../types'

/** Le nom d'affichage d'un agent, ou son identifiant si l'annuaire l'ignore. */
function nommer(id: string, agents: Map<string, Agent>) {
  return agents.get(id)?.nom || id
}

function Part({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="border-t px-3.5 py-2.5" style={{ borderColor: 'var(--bord, rgba(128,128,128,.2))' }}>
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.09em] muted">
        {titre}
      </span>
      {children}
    </section>
  )
}

export function CartePlan({
  carte,
  agents,
  onValider,
  onModifier,
  onRefuser,
  onBasculer,
  enCours,
}: {
  carte: TourPlan
  agents: Map<string, Agent>
  onValider: () => void
  onModifier: () => void
  onRefuser: () => void
  onBasculer: () => void
  /** Vrai pendant que le scenario se pose : les boutons ne se cliquent pas deux fois. */
  enCours?: boolean
}) {
  const { plan, etat } = carte

  /*
    EN DISCUSSION, LA CARTE NE S'OUVRE PAS - la bascule se propose.
    Valider creerait un scenario, donc finirait par reveiller l'equipe : c'est
    exactement ce que ce mode promet de ne pas faire. Poser les trois boutons
    quand meme reviendrait a demander a l'interrupteur de mentir. Le plan, lui,
    est deja calcule - basculer ne rappellera aucun modele.
  */
  if (etat === 'bascule') {
    return (
      <div data-zone="bascule-proposee" className="card flex flex-wrap items-center gap-2.5 p-3">
        <Shield size={15} className="shrink-0 text-amber-500" />
        <span className="flex-1 text-[12px]">
          <b>{plan.titre}</b> — ca demande un vrai plan, et de reveiller l'equipe.
          Tu es en Discussion, ou rien ne s'ecrit. Je bascule en Atelier ?
        </span>
        <button onClick={onBasculer} className="btn-primary px-3 py-1.5 text-xs">
          Basculer en Atelier
        </button>
        <button onClick={onRefuser} className="btn-ghost px-3 py-1.5 text-xs">
          Rester ici
        </button>
      </div>
    )
  }

  return (
    <div data-zone="carte-plan" className="card overflow-hidden p-0">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <Sparkles size={15} className="shrink-0 text-amber-500" />
        <b className="text-[13px]">Plan — {plan.titre}</b>
        <span className="ml-auto shrink-0 text-[10.5px] muted">
          {plan.quoi.length} etape{plan.quoi.length > 1 ? 's' : ''}
        </span>
      </div>

      <Part titre="Qui">
        <div className="flex flex-wrap gap-1.5">
          {plan.qui.map((q, i) => (
            <span
              key={`${q.agent}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{ borderColor: 'var(--bord, rgba(128,128,128,.3))' }}
            >
              <Users size={10} className="muted" />
              {nommer(q.agent, agents)}
              {q.role && <span className="muted">· {q.role}</span>}
            </span>
          ))}
        </div>
        {/*
          C4, et il n'attend pas le chantier 4 pour etre dit : le plan doit
          dire quand une tache tombe sur l'agent par defaut. Ici la cause est
          plus precise encore - le plan a nomme quelqu'un qui n'existe pas, et
          on ne l'a PAS rapproche du plus ressemblant. `trioueur` mesure le
          06/08/2026 la ou `trieur` existe : rapprocher deux chaines est une
          devinette, et une devinette qui se trompe donne le travail a
          quelqu'un d'autre sans que ca se voie nulle part.
        */}
        {plan.inconnus.length > 0 && (
          <p className="mt-2 bandeau sens-alerte text-[11px]">
            {plan.inconnus.join(', ')} {plan.inconnus.length > 1 ? "n'existent pas" : "n'existe pas"} dans
            ton equipe. {plan.inconnus.length > 1 ? 'Ces taches sont revenues' : 'Cette tache est revenue'}{' '}
            a l'orchestrateur, qui saura deleguer.
          </p>
        )}
      </Part>

      <Part titre="Quoi, et dans quel ordre">
        <div className="flex flex-col gap-1.5">
          {plan.quoi.map((e, i) => (
            <div key={i} className="flex items-baseline gap-2 text-[12px]">
              <span className="min-w-3 shrink-0 text-[10px] tabular-nums muted">{i + 1}</span>
              <span>
                <b>{nommer(e.agent, agents)}</b> — {e.tache}
              </span>
            </div>
          ))}
        </div>
      </Part>

      {plan.comment && (
        <Part titre="Comment">
          <p className="text-[11.5px] leading-relaxed muted">{plan.comment}</p>
        </Part>
      )}

      <Part titre="Resultat attendu">
        {plan.resultat.length ? (
          <div className="flex flex-col gap-1 text-[12px]">
            {plan.resultat.map((r, i) => (
              <span key={i} className="flex items-baseline gap-1.5">
                <FileOutput size={11} className="shrink-0 translate-y-0.5 muted" />
                <code className="rounded px-1.5 py-px text-[11px]" style={{ background: 'var(--surlignage, rgba(128,128,128,.14))' }}>
                  {r.fichier}
                </code>
                {r.quoi && <span className="muted">— {r.quoi}</span>}
              </span>
            ))}
          </div>
        ) : (
          /*
            On n'invente pas de livrable a la place du plan. En fabriquer un
            rendrait la confrontation annonce / rendu FAUSSE plutot qu'absente,
            et c'est le pire des deux : on croirait pouvoir juger.
          */
          <p className="text-[11.5px] muted">
            Ce plan n'annonce aucun fichier. A la fin, il n'y aura donc rien a
            confronter — Modifier permet de le demander.
          </p>
        )}
      </Part>

      <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        {etat === 'propose' && (
          <>
            <button onClick={onValider} disabled={enCours} className="btn-primary px-3 py-1.5 text-xs">
              {enCours ? 'Je pose le scenario…' : 'Valider le plan'}
            </button>
            {/*
              F7 : « Modifier ne promet rien de precis. Il me renvoie au chat ?
              Dans le Studio ? » Le libelle dit donc ou il mene, et il mene a
              l'endroit le moins couteux - le champ, avec la demande dedans.
              Rien n'a ete ecrit sur le disque a ce stade : il n'y a rien a
              defaire, seulement une phrase a reformuler.
            */}
            <button onClick={onModifier} disabled={enCours} className="btn-ghost px-3 py-1.5 text-xs">
              Reformuler la demande
            </button>
            <button onClick={onRefuser} disabled={enCours} className="btn-ghost px-3 py-1.5 text-xs">
              Refuser
            </button>
          </>
        )}

        {etat === 'pose' && (
          <span className="flex items-center gap-1.5 text-[11.5px]">
            <ArrowRight size={12} className="text-emerald-500" />
            Scenario cree, en attente. Aucun agent n'a ete reveille — il partira
            quand tu lanceras le scenario.
          </span>
        )}

        {etat === 'refuse' && (
          <span className="text-[11.5px] muted">
            Plan refuse. Rien n'a ete cree : proposer un plan n'ecrit rien.
          </span>
        )}
      </div>
    </div>
  )
}
