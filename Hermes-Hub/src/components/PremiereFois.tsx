/**
 * Ce qu'on montre au tout premier lancement, et le bandeau qui ne part pas.
 *
 * LE CONSTAT QUI A DECIDE DE TOUT. C'est la configuration que tout le monde
 * saute, et celle qui change le plus l'usage quotidien - kuchu le dit de
 * lui-meme : il ne l'avait jamais faite, par flemme, et le jour ou il l'a faite
 * son experience a change. Les neuf questions posees pendant l'installation ont
 * echoue pour cette raison exacte : dans un terminal, au bout de quarante
 * minutes, on tape Entree pour en finir. L'AUTEUR DE L'INSTALLATEUR A SAUTE SES
 * PROPRES QUESTIONS - il n'y a pas de meilleure preuve.
 *
 * POURQUOI MONTRER PLUTOT QU'OBLIGER. Un mur ne produit pas des reponses, il
 * produit « azerty » et « . ». Et une reponse bidon est PIRE que le vide : le
 * vide se voit et se corrige, le faux ne se relit jamais. On montre donc
 * l'ecart - la meme demande, avec et sans - parce qu'un exemple convainc la ou
 * une obligation braque.
 *
 * LA CASE ET LE BANDEAU SONT DEUX CHOSES. « Ne plus afficher » eteint cette
 * fenetre, et elle seule. Le bandeau, lui, reste tant qu'aucun profil n'a ete
 * choisi. Si la case eteignait les deux, elle annulerait l'objectif : ceux qui
 * la cochent sont exactement ceux qu'on veut atteindre. Le rappel ponctuel se
 * refuse ; la mention permanente se merite en allant regarder.
 */
import { AlertTriangle, ArrowRight, Settings2, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'

/**
 * Trois demandes ordinaires, et ce qu'Hermes en fait selon qu'il sait ou non
 * qui tu es. Choisies pour qu'on se reconnaisse dans au moins une : un devis,
 * un compte rendu, un classement.
 */
const ECARTS = [
  {
    demande: 'Prepare-moi un devis pour le chantier Dupont.',
    sans: 'Une trame generique, dans un format qu il choisit tout seul.',
    avec: 'Ta trame, tes postes habituels, au format que tu utilises deja.',
  },
  {
    demande: 'Fais le compte rendu de la reunion de ce matin.',
    sans: 'Trois pages detaillees, la ou tu en voulais dix lignes.',
    avec: 'Dix lignes, parce que tu as dit que tu preferais court.',
  },
  {
    demande: 'Range ces documents.',
    sans: 'Il propose une arborescence, et te demande dix fois confirmation.',
    avec: 'Il sait ce a quoi il ne doit pas toucher, et fait le reste.',
  },
]

export function PremiereFois({ onFermer, onAller }: { onFermer: () => void; onAller: () => void }) {
  const [neePlus, setNePlus] = useState(false)

  const fermer = async () => {
    if (neePlus) await api.noterAccueil({ fenetreVue: true }).catch(() => null)
    onFermer()
  }

  return (
    <div
      data-zone="premiere-fois"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">Cinq minutes, une fois pour toutes</p>
            <p className="mt-0.5 text-xs muted">
              Hermes ne sait pas encore qui tu es. C est le reglage que tout le monde saute, et
              c est celui qui change le plus ce qu il te repond.
            </p>
          </div>
          <button onClick={() => void fermer()} className="btn-ghost flex-none px-1.5 py-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {ECARTS.map((e) => (
            <div key={e.demande} className="rounded-xl border border-slate-200 p-3 dark:border-navy-700">
              <p className="mb-2 text-xs font-medium">« {e.demande} »</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-navy-900">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide muted">
                    Aujourd hui
                  </p>
                  <p className="text-[11px] leading-relaxed muted">{e.sans}</p>
                </div>
                <div className="rounded-lg bg-emerald-50/50 p-2 dark:bg-emerald-500/5">
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Une fois rempli
                  </p>
                  <p className="text-[11px] leading-relaxed">{e.avec}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed muted">
          Trois fichiers, et un seul demande ton avis. <strong>Qui tu es</strong> ne peut pas etre
          devine - c est celui-la qui compte. <strong>Les regles</strong> et{' '}
          <strong>le caractere</strong> sont deja ecrits : tu peux les lire, et en changer si tu
          veux.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-navy-800">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] muted">
            <input
              type="checkbox"
              checked={neePlus}
              onChange={(e) => setNePlus(e.target.checked)}
              className="h-3.5 w-3.5 accent-sky-500"
            />
            Ne plus afficher cette fenetre
          </label>

          <div className="flex items-center gap-2">
            <button onClick={() => void fermer()} className="btn-ghost text-xs">
              Plus tard
            </button>
            <button
              onClick={async () => {
                if (neePlus) await api.noterAccueil({ fenetreVue: true }).catch(() => null)
                onAller()
              }}
              className="btn-primary gap-1.5 text-xs"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Y aller
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Le bandeau qui ne s'eteint pas.
 *
 * Pas de croix, et c'est voulu : il ne bloque rien, il ne s'oublie pas. Il dit
 * ce que ca COUTE plutot que ce qu'il faut faire - une personne voit le prix
 * sur son propre travail, la ou un avertissement de plus s'ignore.
 */
export function BandeauProfil({ onAller }: { onAller: () => void }) {
  return (
    <div
      data-zone="bandeau-profil"
      className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs dark:border-rose-500/30 dark:bg-rose-500/10"
    >
      <AlertTriangle className="h-4 w-4 flex-none text-rose-500" />
      <p className="min-w-0 flex-1 leading-relaxed">
        <strong>Hermes ne sait pas qui tu es.</strong> Il repond a cote de ce que tu fais, et rien
        ne te le signalera ailleurs.
      </p>
      <button onClick={onAller} className="btn-primary flex-none gap-1 px-2.5 py-1 text-[11px]">
        Choisir un profil
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  )
}
