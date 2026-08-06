/**
 * C8 - CE QUI A ETE ANNONCE, ET CE QUI A ETE RENDU.
 *
 * UN SEUL BLOC, DEUX NATURES. Avant que le scenario ait tourne, il annonce :
 * « Resultat attendu ». Apres, il constate : « Annonce / rendu ». Ce n'est pas
 * deux surfaces qui se remplacent, c'est la meme part du plan a deux moments -
 * et c'est ce qui fait qu'on la retrouve ou on l'avait laissee.
 *
 * POURQUOI CETTE PART EXISTE. C'est la quatrieme du plan, celle qu'on oublie :
 * *« sans elle, la fin d'un travail n'est comparable a rien : on regarde ce qui
 * est sorti et on juge au ressenti. Avec elle, un travail a moitie rate cesse de
 * ressembler a un travail reussi. »* La confrontation est immediate, et elle
 * attrape le seul cas vraiment couteux : celui ou il manque une piece que
 * personne ne cherche.
 *
 * ON N'INVENTE RIEN DES DEUX COTES. Pas de livrable suppose quand le plan
 * n'annonce rien - une confrontation FAUSSE est pire qu'une confrontation
 * absente, parce qu'on croirait pouvoir juger. Et pas d'appariement au plus
 * ressemblant entre un nom promis et un nom rendu : voir le bloc « en plus ».
 */
import { Check, X } from 'lucide-react'

/**
 * Le nom nu, en minuscules.
 *
 * Le plan annonce parfois un chemin - « docs/veille.md » -, le disque rend un
 * nom. Comparer les deux entiers poserait un « pas rendu » sur un fichier qui
 * est la. La casse tombe aussi : ce Hub tourne sur Windows, ou `Veille.md` et
 * `veille.md` sont le meme fichier.
 */
function nomNu(s: string) {
  return (s.split(/[\\/]/).pop() || s).trim().toLowerCase()
}

interface Props {
  /** Les livrables annonces par le plan garde a cote du scenario. */
  resultat: { fichier: string; quoi: string }[]
  /** Ce que le scenario a reellement ecrit dans son dossier. */
  rendus: { nom: string; octets: number }[]
  /** Le scenario a-t-il tourne au moins une fois ? */
  aTourne: boolean
  /** Une tache est-elle en train de tourner ? */
  enCours: boolean
}

export function BilanRendu({ resultat, rendus, aTourne, enCours }: Props) {
  if (resultat.length === 0) return null

  /**
   * LE BILAN NE S'OUVRE QU'A LA FIN, et il faut les trois conditions.
   *
   * `aTourne` : un plan valide mais jamais lance n'a rien a se reprocher, et un
   * bilan tout rouge lui ferait annoncer un echec la ou il n'y a qu'une
   * attente. Rien en cours : juger au milieu poserait « pas rendu » sur un
   * fichier qui s'ecrit a la seconde meme. Et quelque chose d'annonce, sans
   * quoi il n'y a pas de moitie gauche.
   */
  const bilan = aTourne && !enCours

  const rendusNoms = new Set(rendus.map((f) => nomNu(f.nom)))
  const annoncesNoms = new Set(resultat.map((r) => nomNu(r.fichier)))
  const tenus = resultat.filter((r) => rendusNoms.has(nomNu(r.fichier))).length
  const enPlus = rendus.filter((f) => !annoncesNoms.has(nomNu(f.nom)))

  return (
    <div
      data-zone="bilan-rendu"
      className="mt-3 border-t border-slate-200 px-1 pt-3 dark:border-navy-800"
    >
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[9px] font-bold uppercase tracking-[0.09em] muted">
        {bilan ? 'Annonce / rendu' : 'Resultat attendu'}
        {bilan && (
          <span className="ml-auto tabular-nums tracking-normal">
            {tenus} sur {resultat.length}
          </span>
        )}
      </span>

      {bilan ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-navy-800">
          {resultat.map((r, i) => {
            const tenu = rendusNoms.has(nomNu(r.fichier))
            return (
              <div
                key={i}
                className={`ligne-bilan ${tenu ? 'sens-succes' : 'sens-danger'} ${
                  i > 0 ? 'border-t border-slate-200 dark:border-navy-800' : ''
                }`}
              >
                {tenu ? (
                  <Check className="mt-0.5 h-3 w-3 flex-none teinte-sens" />
                ) : (
                  <X className="mt-0.5 h-3 w-3 flex-none teinte-sens" />
                )}
                {/* LE NOM DU FICHIER SUR SA PROPRE LIGNE, et en premier.
                    Premier essai : le libelle a gauche, le fichier pousse a
                    droite - comme la maquette, dont les noms tenaient en douze
                    caracteres. Vu a l'ecran dans 256 px, les DEUX se coupaient :
                    « l analyse chiffre… » face a « analyse_performan… ». Or
                    c'est le nom qui identifie le livrable ; le libelle ne fait
                    que le decrire. Ce qu'on ne peut pas lire en entier, on le
                    met en dessous - pas a cote. */}
                <span className="min-w-0 flex-1">
                  <code className="block truncate text-[10.5px]" title={r.fichier}>
                    {r.fichier}
                  </code>
                  {r.quoi && (
                    <span className="block truncate text-[10px] leading-snug muted" title={r.quoi}>
                      {tenu ? r.quoi : `${r.quoi} — pas rendu`}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {resultat.map((r, i) => (
            <span key={i} className="text-[11px] leading-snug">
              <code
                className="rounded px-1.5 py-px text-[10.5px]"
                style={{ background: 'var(--surlignage, rgba(128,128,128,.14))' }}
              >
                {r.fichier}
              </code>
              {r.quoi && <span className="muted"> — {r.quoi}</span>}
            </span>
          ))}
        </div>
      )}

      {/*
        CE QUI EST RENDU SANS AVOIR ETE ANNONCE - montre, jamais apparie.
        Un `veille-2026-08-04.pdf` la ou `veille.pdf` etait promis se voit d'un
        coup d'oeil quand les deux lignes sont sous les yeux ; les rapprocher A
        NOTRE PLACE serait une devinette, et le depot a deja tranche ce cas sur
        les noms d'agents : « rapprocher deux chaines est une devinette, et une
        devinette qui se trompe donne le travail a quelqu'un d'autre sans que ca
        se voie ». Ici, elle ferait passer un livrable manquant pour un livrable
        tenu - exactement ce que ce bilan existe pour empecher.
      */}
      {bilan && enPlus.length > 0 && (
        <p className="mt-1.5 text-[10px] leading-snug muted">
          {enPlus.length} fichier{enPlus.length > 1 ? 's' : ''} en plus :{' '}
          {enPlus.map((f) => f.nom).join(', ')}
        </p>
      )}
    </div>
  )
}
