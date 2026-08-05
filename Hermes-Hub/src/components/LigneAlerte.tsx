/**
 * UNE SEULE LIGNE, AU MEME ENDROIT, SUR TOUS LES ECRANS.
 *
 * Arrete avec kuchu, et c'est le partage qui compte : **la ligne est le signal,
 * le volet est le detail.** La ligne dit la chose la plus urgente en clair et
 * compte le reste ; le volet, convoque au clic, liste tout et mene chaque
 * entree a son endroit.
 *
 * POURQUOI ELLE EXISTE. F12 : « l'autorisation n'arrive pas la ou l'on
 * regarde ». Un agent arrete par une question attend indefiniment, et le seul
 * signe etait une pastille dans la barre laterale - donc invisible des qu'on
 * n'y regardait pas, et absente des ecrans qui n'ont pas de barre laterale.
 * C2 : elle doit apparaitre **la ou l'on est**.
 *
 * TROIS NATURES, ET PAS UNE DE PLUS. Chacune a son icone, et l'icone seule doit
 * suffire a savoir de quoi il s'agit sans lire :
 *
 *   - `ShieldAlert`  une autorisation attend, et un agent est arrete avec elle ;
 *   - `AlarmClock`   une automatisation est tombee, ou ne partira jamais ;
 *   - `CheckCircle2` un scenario a fini - la seule bonne nouvelle du lot.
 *
 * L'ORDRE N'EST PAS ARBITRAIRE : une autorisation bloque quelqu'un maintenant,
 * une automatisation tombee a deja echoue en silence, un scenario fini peut
 * attendre. La ligne montre donc toujours la plus urgente et compte les autres.
 * Trois lignes empilees auraient rendu les trois egales, et l'ecran serait
 * devenu un tableau de bord - exactement ce que l'accueil a cesse d'etre.
 *
 * CE QU'ELLE NE FAIT PAS. Elle ne remplace pas les notifications volantes : une
 * notification raconte ce que **je viens de faire**, cette ligne annonce ce qui
 * **m'attend**. Les confondre ferait disparaitre au bout de trois secondes une
 * demande qui bloque un agent pour la nuit.
 */
import { AlarmClock, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useHubStore } from '../store/useHubStore'
import { VoletAlertes } from './VoletAlertes'
import type { View } from '../types'

type NatureAlerte = 'autorisation' | 'automatisation' | 'scenario'

export interface Alerte {
  cle: string
  nature: NatureAlerte
  /** Ce qui s'affiche, en clair. Jamais un identifiant, jamais un compte seul. */
  texte: string
  detail?: string
  /** Ou mene l'entree, dans le volet. Absente : l'entree ne mene nulle part. */
  vers?: { view: View; param?: string }
  /** Ce qui l'ecarte. Seules les traces s'ecartent : une autorisation qui
      attend ne se congedie pas, elle se repond. */
  onEcarter?: () => void
}

export const ICONES: Record<NatureAlerte, typeof ShieldAlert> = {
  autorisation: ShieldAlert,
  automatisation: AlarmClock,
  scenario: CheckCircle2,
}

/** La teinte porte l'urgence, l'icone porte la nature. Les deux ensemble se
    lisent sans lecture - c'est tout ce qu'on demande a une ligne. */
export const TEINTES: Record<NatureAlerte, string> = {
  autorisation: 'text-amber-600 dark:text-amber-400',
  automatisation: 'text-red-600 dark:text-red-400',
  scenario: 'text-emerald-600 dark:text-emerald-400',
}

/** L'ordre d'urgence. Il commande ce que la ligne montre, et rien d'autre. */
const RANG: Record<NatureAlerte, number> = { autorisation: 0, automatisation: 1, scenario: 2 }

/** Le compte, dans les deux modes. Une seule ecriture : les deux pastilles
    doivent rester identiques a l'oeil, sinon on croit lire deux choses. */
const PASTILLE =
  'flex-none rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums dark:bg-navy-700'

/**
 * Assembler les trois sources en une liste triee.
 *
 * Separee du rendu parce que c'est la seule partie qui decide quelque chose -
 * l'ordre d'urgence, ce qui s'ecarte et ce qui ne s'ecarte pas. Le rendu, lui,
 * n'a plus qu'a poser une icone et un texte.
 */
function useAlertes(): Alerte[] {
  const demandes = useHubStore((s) => s.demandes)
  const automatisations = useHubStore((s) => s.automatisations)
  const scenariosFinis = useHubStore((s) => s.scenariosFinis)
  const oublierScenario = useHubStore((s) => s.oublierScenario)
  const alerteEssai = useHubStore((s) => s.alerteEssai)
  const basculerAlerteEssai = useHubStore((s) => s.basculerAlerteEssai)

  const liste: Alerte[] = []

  // La fausse demande de Configuration > Developpement. Elle se dit fausse -
  // une alerte d'essai qu'on prendrait pour une vraie serait pire qu'aucune.
  if (alerteEssai) {
    liste.push({
      cle: 'essai',
      nature: 'autorisation',
      texte: 'Pablo demande : ecrire veille-ia.md (essai)',
      detail: "Fausse demande, posee depuis Configuration > Developpement. Elle ne bloque personne.",
      vers: { view: 'orchestration' },
      onEcarter: basculerAlerteEssai,
    })
  }

  // `perimee` est ecarte, et c'est la phrase du dessous qui l'exige : « il est
  // arrete tant que la reponse ne vient pas » cesse d'etre vraie a la seconde ou
  // la porte se referme cote Hermes - l'agent est justement reparti SANS la
  // reponse. Mesure le 05/08 : l'alerte a survecu 74 s a son motif, et son
  // bouton « Y aller » menait a une carte que plus rien n'ecoutait.
  //
  // La carte, elle, reste dans le fil - c'est la qu'on lit ce qui s'est passe,
  // pas dans un bandeau d'urgence qui reclame un geste devenu sans effet.
  for (const d of demandes.filter((d) => !d.perimee)) {
    liste.push({
      cle: `accord:${d.agent}:${d.demande}`,
      nature: 'autorisation',
      // Le titre vient d'Hermes et dit deja l'acte : « Ecrire veille.md ».
      texte: `${d.agent} demande : ${d.titre}`,
      detail: 'Il est arrete tant que la reponse ne vient pas.',
      vers: { view: 'orchestration' },
    })
  }

  if (automatisations?.muettes) {
    liste.push({
      cle: 'automatisations:muettes',
      nature: 'automatisation',
      texte: 'Tes automatisations ne partiront pas',
      detail: "La passerelle d-Hermes ne tourne pas. Dans un terminal : hermes gateway install",
      vers: { view: 'home' },
    })
  }
  for (const a of automatisations?.automatisations || []) {
    // Une suspendue ne partira pas : son echec d'hier n'a plus rien d'urgent.
    if (a.resultat !== 'error' || a.suspendue) continue
    liste.push({
      cle: `automatisation:${a.id}`,
      nature: 'automatisation',
      texte: `« ${a.nom} » : derniere execution en echec`,
      detail: a.erreur || undefined,
      vers: { view: 'home' },
    })
  }

  for (const t of scenariosFinis) {
    // « 4 faites » n'est pas la meme nouvelle que « 4 faites, 1 echouee » : on
    // ne dit jamais qu'un scenario a abouti quand il reste des taches derriere.
    const reste = t.echouees + t.restantes
    liste.push({
      cle: t.cle,
      nature: 'scenario',
      texte: t.arrete
        ? `« ${t.titre} » a ete arrete`
        : reste > 0
          ? `« ${t.titre} » s-est arrete avant la fin`
          : `« ${t.titre} » a fini`,
      detail:
        `${t.faites} tache${t.faites > 1 ? 's' : ''} faite${t.faites > 1 ? 's' : ''}` +
        (t.echouees ? `, ${t.echouees} en echec` : '') +
        (t.restantes ? `, ${t.restantes} restante${t.restantes > 1 ? 's' : ''}` : ''),
      onEcarter: () => oublierScenario(t.cle),
    })
  }

  return liste.sort((a, b) => RANG[a.nature] - RANG[b.nature])
}

interface Props {
  /**
   * La barre du scenario n'a pas la place d'une ligne entiere.
   *
   * En plein ecran, la barre laterale disparait et avec elle le compteur : F13.
   * La ligne doit s'y poser quand meme, sans quoi agrandir revient a
   * s'aveugler au moment ou l'on regarde le plus attentivement. En compact
   * elle se reduit a l'icone et au compte - le volet, lui, est identique.
   */
  compact?: boolean
}

export function LigneAlerte({ compact = false }: Props) {
  const alertes = useAlertes()
  const rafraichirAutomatisations = useHubStore((s) => s.rafraichirAutomatisations)
  const [voletOuvert, setVoletOuvert] = useState(false)

  // Les accords sont deja relus a chaque evenement du flux, par `App`. Les
  // automatisations n'ont pas d'evenement : elles vivent chez le planificateur
  // d'Hermes, qui tourne meme Hub ferme. On les relit donc a l'ouverture.
  useEffect(() => {
    void rafraichirAutomatisations()
  }, [rafraichirAutomatisations])

  // Rien a dire : rien a l'ecran. Une ligne « tout va bien » permanente est du
  // bruit, et elle apprend a ne plus regarder cet endroit-la.
  if (!alertes.length) return null

  const tete = alertes[0]
  const Icone = ICONES[tete.nature]
  const autres = alertes.length - 1

  return (
    <>
      <button
        data-zone="ligne-alerte"
        onClick={() => setVoletOuvert(true)}
        title={compact ? `${tete.texte}${autres ? ` - et ${autres} de plus` : ''}` : undefined}
        aria-label={`${alertes.length} chose${alertes.length > 1 ? 's' : ''} demandent ton attention`}
        className={`flex items-center gap-2 border-slate-200 text-[11px] transition-colors hover:bg-slate-100 dark:border-navy-800 dark:hover:bg-navy-800 ${
          compact
            ? 'rounded-lg px-2 py-1.5'
            : 'w-full flex-shrink-0 border-b bg-white px-4 py-1.5 text-left dark:bg-navy-900 sm:px-6'
        }`}
      >
        <Icone className={`h-3.5 w-3.5 flex-none ${TEINTES[tete.nature]}`} />
        {!compact && <span className="min-w-0 truncate">{tete.texte}</span>}
        {/* LA MEME PASTILLE, DEUX SENS - parce que ce qui l'entoure change. En
            plein, la plus urgente est ecrite juste a cote : on compte donc les
            AUTRES. En compact il n'y a pas de texte de tete, et « +2 » se
            lisait « deux » quand il y en avait trois - on y met le TOTAL.
            Trouve a l'ecran : avec une seule alerte les deux formes donnent
            « 1 », et c'est le cas qu'on essaie en premier. */}
        {compact ? (
          <span className={PASTILLE}>{alertes.length}</span>
        ) : (
          autres > 0 && <span className={PASTILLE}>+{autres}</span>
        )}
        {!compact && <ChevronRight className="ml-auto h-3.5 w-3.5 flex-none muted" />}
      </button>

      {voletOuvert && <VoletAlertes alertes={alertes} onFermer={() => setVoletOuvert(false)} />}
    </>
  )
}
