/**
 * Les sept questions de USER.md, a la souris.
 *
 * ELLES ONT DEJA ECHOUE UNE FOIS, dans un terminal, pendant l'installation :
 * neuf questions au bout de quarante minutes, avant que personne n'ait vu le
 * produit. On tape Entree pour en finir - l'auteur de l'installateur a saute ses
 * propres questions. Ce qui change ici n'est pas la politesse du formulaire,
 * c'est le MOMENT et le fait qu'on puisse montrer ce que la reponse change.
 *
 * SEPT, ET PAS NEUF. Sont parties : objectif a 1 mois et a 6 mois - personne n'y
 * repond honnetement -, la raison d'utiliser Hermes - une question de vendeur -,
 * le type de projets - doublon du metier - et le projet en cours, qui pourrit en
 * trois semaines et dont la place est dans la memoire d'un projet.
 *
 * ET PAS DE CASE « METIER ». « Artisan peintre » est vrai et parfaitement
 * inutile ici : ca ferait parler Hermes de peinture alors qu'on l'utilise pour
 * ses devis et ses courriers. La question exacte et hors sujet est le pire cas.
 * Le champ qui travaille n'est pas QUI ON EST, c'est CE QU'ON VA LUI FAIRE
 * FAIRE - et l'exemple sous le champ le dit plutot qu'une consigne.
 *
 * LE FICHIER RESTE LA SOURCE. Ce formulaire lit le markdown et le reecrit ; il
 * ne tient aucun etat a lui. Quelqu'un qui prefere ecrire directement dans
 * l'editeur en dessous n'est pas puni : ses phrases se retrouvent dans les
 * champs a la visite suivante.
 */
import { Check, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'

/**
 * L'ordre des sections est celui du gabarit pose par l'installateur : le
 * formulaire et le fichier doivent se relire l'un l'autre sans perte.
 */
const CHAMPS = [
  {
    cle: 'qui',
    titre: 'Qui je suis',
    invite: 'Metier, role, activite, passion - ce que tu veux, en une phrase.',
    exemple: 'Artisan peintre, a mon compte depuis huit ans.',
    lignes: 2,
  },
  {
    cle: 'pour',
    titre: 'Ce que je compte lui faire faire',
    invite:
      "C'est LA question qui change ses reponses, et ce n'est pas forcement ton metier : on peut travailler de ses mains et n'attendre d'Hermes que l'ecrit et le classement.",
    exemple:
      "Preparer mes devis et mes courriers, suivre mes dossiers, retrouver ce que j'ai ecrit.",
    lignes: 3,
  },
  {
    cle: 'jamais',
    titre: 'Ce qu il ne doit jamais faire avec moi',
    invite: 'Tes lignes rouges a toi. Il les respectera avant tout le reste.',
    exemple: "Ne touche jamais a mes fichiers de comptabilite. N'envoie rien en mon nom.",
    lignes: 2,
  },
  {
    cle: 'outils',
    titre: 'Mes outils et mes formats',
    invite: 'Ceci change ce qu il PRODUIT, pas seulement ce qu il dit.',
    exemple: 'Excel pour les chiffres, Word pour les courriers, PDF pour envoyer.',
    lignes: 2,
  },
  {
    cle: 'avec',
    titre: 'Avec qui je travaille',
    invite: 'Ca change le ton d un livrable.',
    exemple: 'Seul, pour des particuliers. Un apprenti de temps en temps.',
    lignes: 2,
  },
] as const

const LANGUES = ['Francais', 'Anglais', 'Les deux']
const TONS = ['Court', 'Detaille', 'Pedagogique']
const ADRESSES = ['Tutoiement', 'Vouvoiement']

type Reponses = Record<string, string>

/**
 * Relit le markdown pour reremplir les champs.
 *
 * Les lignes en italique sont les INDICATIONS du gabarit, pas des reponses : les
 * garder ferait croire a l'utilisateur qu'il a deja repondu, et Hermes lirait
 * « Metier, role, activite... » comme une description de quelqu'un.
 */
function relire(texte: string): Reponses {
  const out: Reponses = {}
  let section: string | null = null
  const morceaux: Record<string, string[]> = {}

  for (const brut of String(texte || '').split(/\r?\n/)) {
    const ligne = brut.trim()
    const titre = ligne.match(/^##\s+(.*)$/)
    if (titre) {
      section = titre[1].trim()
      morceaux[section] = []
      continue
    }
    if (!section || !ligne) continue
    if (ligne.startsWith('_') || ligne.startsWith('#')) continue
    if (/^Prenom\s*:/i.test(ligne)) {
      out.prenom = ligne.replace(/^Prenom\s*:\s*/i, '')
      continue
    }
    morceaux[section].push(ligne)
  }

  for (const c of CHAMPS) {
    const trouve = Object.keys(morceaux).find(
      (t) => t.toLowerCase().replace(/[^a-z ]/g, '') === c.titre.toLowerCase().replace(/[^a-z ]/g, ''),
    )
    out[c.cle] = trouve ? morceaux[trouve].join('\n') : ''
  }

  const reponse = Object.entries(morceaux).find(([t]) => /langue/i.test(t))?.[1].join(' ') || ''
  out.langue = LANGUES.find((l) => reponse.includes(l)) || ''
  out.ton = TONS.find((t) => reponse.includes(t)) || ''
  out.adresse = ADRESSES.find((a) => reponse.includes(a)) || ''
  return out
}

/** Recompose le fichier. Les indications ne sont reecrites que pour les champs
    restes vides : une question repondue n'a plus besoin de sa consigne, et tout
    ce qui reste ici se relit a chaque demarrage. */
function composer(r: Reponses): string {
  const bloc = (c: (typeof CHAMPS)[number]) => {
    const valeur = (r[c.cle] || '').trim()
    return `## ${c.titre}\n\n${valeur || `_${c.invite}_`}\n`
  }

  const reglages = [r.langue, r.ton, r.adresse].filter(Boolean).join(' · ')

  return [
    '# Qui je suis',
    '',
    "_Hermes lit ce fichier a chaque session. Ce qui reste sans reponse, il ne le",
    'saura pas - et il repondra a cote. Modifiable depuis le Hub :',
    'Configuration > Memoire._',
    '',
    '## Qui je suis',
    '',
    `Prenom : ${(r.prenom || '').trim()}`,
    '',
    (r.qui || '').trim() || `_${CHAMPS[0].invite}_`,
    '',
    ...CHAMPS.slice(1).map((c) => bloc(c) + ''),
    '## Ma langue, et comment je veux qu il me reponde',
    '',
    reglages ||
      '_Francais ou anglais. Court, detaille ou pedagogique. Tutoiement ou vouvoiement._',
    '',
  ].join('\n')
}

export function QuestionsUser({ onEnregistre }: { onEnregistre: () => void }) {
  const [reponses, setReponses] = useState<Reponses | null>(null)
  const [stamp, setStamp] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  useEffect(() => {
    api
      .readMemory('USER.md')
      .then((m) => {
        setReponses(relire(m.content))
        setStamp(m.stamp)
      })
      .catch(() => setReponses({}))
  }, [])

  if (!reponses) return null

  const poser = (cle: string, v: string) => setReponses((r) => ({ ...(r || {}), [cle]: v }))

  const enregistrer = async () => {
    // L'empreinte est ce qui empeche d'ecraser ce qu'Hermes vient d'apprendre :
    // il ecrit lui-meme dans ce fichier quand on lui dit « memorise ca ». La
    // contourner avec une valeur vide desarmerait la garde en silence - mieux
    // vaut refuser et faire recharger.
    if (!stamp) {
      notifier('error', "USER.md n'a pas pu etre lu. Recharge la page avant d'enregistrer.")
      return
    }
    setOccupe(true)
    try {
      const m = await api.writeMemory('USER.md', composer(reponses), stamp)
      setStamp(m.stamp)
      // Etre venu ici et avoir repondu vaut validation : le bandeau n'a plus
      // lieu d'etre.
      await api.noterAccueil({ profilValide: true }).catch(() => null)
      notifier('success', 'Hermes sait maintenant qui tu es.')
      onEnregistre()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "Ca n'a pas pu etre enregistre.")
    } finally {
      setOccupe(false)
    }
  }

  const remplis = CHAMPS.filter((c) => (reponses[c.cle] || '').trim()).length

  return (
    <div data-zone="questions-user" className="card space-y-3 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Sept questions, une fois pour toutes</p>
        <p className="flex-none text-[11px] tabular-nums muted">
          {remplis} sur {CHAMPS.length + 1}
        </p>
      </div>

      <input
        value={reponses.prenom || ''}
        onChange={(e) => poser('prenom', e.target.value)}
        placeholder="Ton prenom"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />

      {CHAMPS.map((c) => (
        <div key={c.cle} className="space-y-1">
          <p className="text-[11px] font-medium">{c.titre}</p>
          <p className="text-[11px] leading-relaxed muted">{c.invite}</p>
          <textarea
            value={reponses[c.cle] || ''}
            onChange={(e) => poser(c.cle, e.target.value)}
            rows={c.lignes}
            placeholder={c.exemple}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium">Ma langue, et comment il me repond</p>
        {[
          { cle: 'langue', choix: LANGUES },
          { cle: 'ton', choix: TONS },
          { cle: 'adresse', choix: ADRESSES },
        ].map(({ cle, choix }) => (
          <div key={cle} className="flex flex-wrap gap-1.5">
            {choix.map((c) => (
              <button
                key={c}
                onClick={() => poser(cle, reponses[cle] === c ? '' : c)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  reponses[cle] === c
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                    : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
              >
                {reponses[cle] === c && <Check className="mr-1 inline h-3 w-3" />}
                {c}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-3 dark:border-navy-800">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed muted">
          Une question laissee vide garde son indication : elle te rappellera qu elle attend une
          reponse, et Hermes saura qu il ne sait pas.
        </p>
        <button
          onClick={() => void enregistrer()}
          disabled={occupe}
          className="btn-primary flex-none gap-1.5 text-xs disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          Enregistrer
        </button>
      </div>
    </div>
  )
}
