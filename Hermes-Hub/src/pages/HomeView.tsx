/**
 * L'accueil EST la conversation.
 *
 * Il portait un tableau de bord : deux grandes cartes, quatre compteurs, les
 * projets recents. Rien de faux, mais rien qui reponde a la question qu'on se
 * pose en ouvrant le Hub - **ce qu'on veut, c'est demander quelque chose.** Un
 * ecran qui commence par recapituler oblige a choisir une porte avant d'avoir
 * pu formuler sa demande.
 *
 * Alors « Bonjour <prenom> », le champ dessous, et au premier message tout
 * s'efface : il ne reste que le fil. Les compteurs et les projets n'ont pas
 * disparu du produit, ils ont perdu leur place ici - la barre laterale les
 * donne en un clic, et une ligne de raccourcis garde les deux gestes qui n'y
 * figurent pas.
 *
 * CE N'EST PAS UNE DEUXIEME CONVERSATION. C'est celle d'Orchestration, meme
 * composant, meme fil, memes agents : ce qu'on demande ici se retrouve la-bas,
 * et l'historique n'a qu'une source. Deux fils pour un meme interlocuteur
 * auraient diverge sans que personne le remarque avant d'en avoir besoin.
 *
 * CE QUI SURVIT A L'EFFACEMENT : plus rien, et c'est un progres. Une
 * automatisation tombee traversait l'effacement par une bande posee au-dessus
 * du fil - elle doit se voir en ouvrant le Hub, pas se chercher. Mais la
 * **ligne d'alerte** du chantier 2 le fait desormais partout, et mieux : sur
 * les trois ecrans au lieu de celui-ci seul, au meme endroit, avec les
 * autorisations et les scenarios finis. Deux surfaces qui disent la meme chose
 * finissent par se contredire, et la grammaire est formelle - **une seule
 * ligne, jamais deux.**
 */
import { BookOpen, FolderOpen, Landmark, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Automatisations } from '../components/Automatisations'
import { Conversation } from '../components/Conversation'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { Agent, Equipe, Theme, View } from '../types'
import { THEMES } from '../types'

interface Props {
  onNavigate: (view: View, param?: string) => void
  onMenu: () => void
}

export function HomeView({ onNavigate, onMenu }: Props) {
  const stats = useHubStore((s) => s.stats)
  const config = useHubStore((s) => s.config)
  const setTheme = useHubStore((s) => s.setTheme)

  /**
   * L'equipe, lue une fois a l'ouverture.
   *
   * Meme source qu'Orchestration - `api.orchestration()` rend les profils
   * d'Hermes et les equipes constituees. En cas d'echec on n'affiche pas
   * d'erreur : la conversation marche sans annuaire, elle s'adresse alors a
   * Hermes seul, et c'est deja le geste courant.
   */
  const [agents, setAgents] = useState<Agent[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])

  useEffect(() => {
    api
      .orchestration()
      .then((o) => {
        setAgents(o.agents)
        setEquipes(o.equipes)
      })
      .catch(() => null)
  }, [])

  // Le bouton fait defiler les themes : clair -> sombre -> antique -> clair.
  // L'icone montre le theme vers lequel on va, comme l'infobulle : montrer le
  // theme courant pendant que le clic mene ailleurs induisait en erreur.
  const theme: Theme = config?.theme ?? 'light'
  const suivant = THEMES[(THEMES.findIndex((t) => t.value === theme) + 1) % THEMES.length]
  const ICONES: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, antique: Landmark }
  const IconeTheme = ICONES[suivant.value]

  const salut = (
    <div className="text-center">
      <img
        src="./hermes-master.png"
        alt=""
        className="mx-auto mb-4 h-16 w-16 object-contain sm:h-20 sm:w-20"
      />
      <h1 className="text-2xl font-bold sm:text-3xl">
        {config?.userName ? `Bonjour ${config.userName}` : 'Bonjour'}
      </h1>
      <p className="mt-2 text-sm muted">Que veux-tu faire aujourd&apos;hui ?</p>
    </div>
  )

  /**
   * Deux liens, et c'est tout.
   *
   * Les deux portes qui vivaient ici - terminal Hermes et Clean Agent - sont
   * parties, et chacune pour sa raison. **Le terminal a rejoint la barre de
   * menu** : c'est un geste qu'on peut vouloir depuis n'importe quel ecran, pas
   * seulement en arrivant, et une carte sur l'accueil ne le rend accessible
   * qu'au premier instant. **Clean Agent a rejoint Configuration >
   * Developpement** : c'est un outil d'essai, il servait a eprouver Hermes hors
   * contexte, et une porte de cette taille sur l'accueil lui donnait un rang
   * qu'il n'a pas dans l'usage courant.
   *
   * Restent Projets et Coffre, qui doublent la barre laterale a dessein : ils
   * portent un compte, qui etait tout ce que les quatre compteurs disaient
   * d'utile.
   */
  const raccourcis = (
    <>
      <div
        data-zone="raccourcis-accueil"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <button onClick={() => onNavigate('projects')} className="btn-ghost px-3 py-1.5 text-xs">
          <FolderOpen className="mr-1.5 inline h-3.5 w-3.5" />
          Projets
          {stats ? <span className="ml-1.5 tabular-nums opacity-60">{stats.projects}</span> : null}
        </button>
        <button onClick={() => onNavigate('vault')} className="btn-ghost px-3 py-1.5 text-xs">
          <BookOpen className="mr-1.5 inline h-3.5 w-3.5" />
          Coffre
          {stats ? <span className="ml-1.5 tabular-nums opacity-60">{stats.notes}</span> : null}
        </button>
      </div>

      {/* Ce qui tournera sans toi. La section s'efface d'elle-meme s'il n'y a
          rien a dire - un accueil ne porte pas de rubrique vide. */}
      <div className="mt-8">
        <Automatisations />
      </div>
    </>
  )

  return (
    <div data-zone="ecran-accueil" className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Accueil"
        onMenu={onMenu}
        actions={
          <button
            onClick={() => setTheme(suivant.value)}
            /* Discret : pas de pastille pleine, l'icone se fond dans le
               bandeau et ne se revele qu'au survol. */
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-navy-600 dark:hover:bg-navy-800 dark:hover:text-slate-300"
            title={`Passer au theme ${suivant.label}`}
            aria-label={`Passer au theme ${suivant.label}`}
          >
            <IconeTheme className="h-4 w-4" />
          </button>
        }
      />

      <Conversation
        agents={agents}
        equipes={equipes}
        accueil={salut}
        accueilDessous={raccourcis}
      />
    </div>
  )
}
