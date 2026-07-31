/**
 * Orchestration - le seul lieu de l'equipe et de ses poles.
 *
 * Deux volets, comme la Configuration : les agents d'un cote, les poles de
 * l'autre. Ce sont deux questions differentes - « qui ai-je ? » et « que
 * font-ils ? » - et les melanger sur un seul ecran obligeait a defiler pour
 * passer de l'une a l'autre.
 *
 * Les poles sont des vignettes plutot qu'une pile de panneaux : a dix poles,
 * une pile devient un couloir qu'on parcourt au lieu d'un tableau qu'on
 * embrasse. L'organigramme s'ouvre par-dessus, dans la meme fenetre que celle
 * qui portera la simulation.
 *
 * Rien n'est invente ici : les agents sont les profils d'Hermes, les poles sont
 * lus dans son tableau kanban.
 */
import { AlertTriangle, Network, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Modal } from '../components/Modal'
import { Organigramme } from '../components/Organigramme'
import type { LienOrg, NoeudOrg } from '../components/Organigramme'
import { PageHeader } from '../components/PageHeader'
import { api } from '../lib/api'
import { ETATS_TACHE } from '../types'
import type { Agent, EtatTache, Orchestration, Pole } from '../types'

interface Props {
  onMenu: () => void
}

const FINI: EtatTache[] = ['done']
const BLOQUE: EtatTache[] = ['blocked', 'review']
const DORMANT: EtatTache[] = ['triage', 'todo', 'scheduled']

type Volet = 'agents' | 'poles'

const VOLETS: { id: Volet; label: string; icon: typeof Users }[] = [
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'poles', label: 'Poles / Equipes', icon: Network },
]

/** Ce qui est ouvert par-dessus : l'organigramme de l'equipe, ou celui d'un pole. */
type Ouvert = { genre: 'equipe' } | { genre: 'pole'; id: string }

export function OrchestrationView({ onMenu }: Props) {
  const [data, setData] = useState<Orchestration | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [volet, setVolet] = useState<Volet>('agents')
  const [ouvert, setOuvert] = useState<Ouvert | null>(null)

  const charger = useCallback(async () => {
    try {
      setData(await api.orchestration())
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  const agents = data?.agents || []
  const poles = data?.poles || []
  const prets = agents.filter((a) => a.pretAServir).length
  const actifs = poles.filter((p) => p.enCours).length
  const poleOuvert = ouvert?.genre === 'pole' ? poles.find((p) => p.id === ouvert.id) : null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Orchestration"
        icon={<Network className="h-4 w-4 text-indigo-500" />}
        onMenu={onMenu}
        actions={
          <button onClick={() => void charger()} className="btn-ghost px-2.5 py-2" title="Recharger">
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <nav className="flex flex-shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-navy-800 dark:bg-navy-900 lg:w-56 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden px-2 py-2 lg:block">
            <p className="text-[10px] font-medium uppercase tracking-wide muted">Orchestration</p>
          </div>
          {VOLETS.map(({ id, label, icon: Icone }) => (
            <button
              key={id}
              onClick={() => setVolet(id)}
              aria-current={volet === id ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors lg:w-full ${
                volet === id
                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                  : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
              }`}
            >
              <Icone className="h-4 w-4 flex-shrink-0" />
              {label}
              <span className="ml-auto hidden text-[10px] tabular-nums opacity-60 lg:inline">
                {id === 'agents' ? agents.length : poles.length}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-4">
              {erreur && (
                <div className="bandeau sens-danger">
                  <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
                  <span>{erreur}</span>
                </div>
              )}

              {volet === 'agents' && (
                <>
                  <Entete
                    titre={`${agents.length} agent${agents.length > 1 ? 's' : ''}`}
                    detail={`${prets} pret${prets > 1 ? 's' : ''} a servir`}
                    action={
                      agents.length > 0 ? (
                        <button
                          className="btn-ghost px-3 py-1.5 text-xs"
                          onClick={() => setOuvert({ genre: 'equipe' })}
                        >
                          Voir l organigramme
                        </button>
                      ) : null
                    }
                  />
                  <div className="space-y-2">
                    {agents.map((a) => (
                      <LigneAgent key={a.id} agent={a} />
                    ))}
                  </div>
                </>
              )}

              {volet === 'poles' && (
                <>
                  <Entete
                    titre={`${poles.length} pole${poles.length > 1 ? 's' : ''}`}
                    detail={actifs > 0 ? `${actifs} en cours` : 'aucun en cours'}
                  />

                  {data && !data.tableau.disponible && (
                    <TableauIndisponible raison={data.tableau.raison} />
                  )}

                  {poles.length === 0 ? (
                    <AucunPole tableauPret={!!data?.tableau.disponible} />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {poles.map((p) => (
                        <Vignette
                          key={p.id}
                          titre={p.titre}
                          detail={`${p.taches.length} tache${p.taches.length > 1 ? 's' : ''}`}
                          agents={agentsDuPole(p, agents)}
                          avancement={{ faites: p.finies, total: p.taches.length }}
                          etat={
                            p.enCours ? 'encours' : p.finies === p.taches.length ? 'fini' : 'attente'
                          }
                          onOuvrir={() => setOuvert({ genre: 'pole', id: p.id })}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {ouvert?.genre === 'equipe' && (
        <Modal
          title="Ton equipe"
          icon={<Users className="h-4 w-4 text-violet-500" />}
          maxWidth="max-w-4xl"
          onClose={() => setOuvert(null)}
        >
          <Organigramme {...equipeEnGraphe(agents)} />
          <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] muted dark:border-navy-800">
            La description d un agent n est pas decorative : c est elle que le decomposeur lit
            pour lui confier une tache. Un agent mal decrit ne recoit rien, et le travail
            retombe sur Hermes.
          </p>
        </Modal>
      )}

      {poleOuvert && (
        <Modal
          title={poleOuvert.titre}
          icon={<Network className="h-4 w-4 text-sky-500" />}
          maxWidth="max-w-5xl"
          onClose={() => setOuvert(null)}
        >
          {poleOuvert.corps && (
            <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed muted dark:bg-navy-800">
              {poleOuvert.corps}
            </p>
          )}
          <Organigramme {...poleEnGraphe(poleOuvert, agents)} />
        </Modal>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Traductions vers le graphe
// -----------------------------------------------------------------------------
/** Les agents reellement mobilises par un pole, sans doublon et dans l'ordre. */
function agentsDuPole(pole: Pole, agents: Agent[]): Agent[] {
  const parId = new Map(agents.map((a) => [a.id, a]))
  const vus = new Set<string>()
  const sortie: Agent[] = []
  for (const t of pole.taches) {
    const id = t.agent || 'default'
    if (vus.has(id)) continue
    vus.add(id)
    const a = parId.get(id)
    if (a) sortie.push(a)
  }
  return sortie
}

/** Hermes en tete, l equipe en dessous : l orchestrateur precede tout le monde. */
function equipeEnGraphe(agents: Agent[]): { noeuds: NoeudOrg[]; liens: LienOrg[]; vide: string } {
  const chef = agents.find((a) => a.role === 'orchestrateur')

  const noeuds: NoeudOrg[] = agents.map((a) => ({
    id: a.id,
    titre: a.nom,
    sousTitre: a.description || 'Sans description : le decomposeur ne saura pas quoi lui confier.',
    couleur: a.couleur,
    icone: a.icone,
    endormi: !a.eveille,
    actif: a.eveille,
    muet: !a.pretAServir,
    etiquette: a.taches > 0 ? `${a.taches} tache${a.taches > 1 ? 's' : ''}` : undefined,
  }))

  const liens: LienOrg[] = chef
    ? agents.filter((a) => a.id !== chef.id).map((a) => ({ de: chef.id, vers: a.id }))
    : []

  return { noeuds, liens, vide: 'Aucun profil Hermes trouve.' }
}

function poleEnGraphe(
  pole: Pole,
  agents: Agent[],
): { noeuds: NoeudOrg[]; liens: LienOrg[]; vide: string; numeroter: true } {
  const parId = new Map(agents.map((a) => [a.id, a]))

  const noeuds: NoeudOrg[] = pole.taches.map((t) => {
    const a = parId.get(t.agent || 'default')
    return {
      id: t.id,
      // La tache qui ferme le pole est la demande d'origine, pas une etape :
      // sans ce surtitre elle se lit comme un travail de plus.
      chapeau: t.id === pole.id ? 'la demande' : undefined,
      titre: t.titre,
      sousTitre: a ? `${a.nom}${t.modele ? ` - ${t.modele}` : ''}` : t.agent || 'non assignee',
      couleur: a?.couleur || 'ardoise',
      icone: a?.icone || 'agent',
      fini: FINI.includes(t.etat),
      bloque: BLOQUE.includes(t.etat),
      actif: t.etat === 'running',
      endormi: DORMANT.includes(t.etat),
      etiquette: ETATS_TACHE[t.etat] || t.etat,
    }
  })

  return { noeuds, liens: pole.liens, vide: 'Ce pole n a aucune tache.', numeroter: true }
}

// -----------------------------------------------------------------------------
// Morceaux d interface
// -----------------------------------------------------------------------------
function Entete({
  titre,
  detail,
  action,
}: {
  titre: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{titre}</p>
        <p className="text-xs muted">{detail}</p>
      </div>
      {action}
    </div>
  )
}

/** Une ligne par agent : son nom, ce qu'il sait faire, son cerveau. */
function LigneAgent({ agent }: { agent: Agent }) {
  const style = { '--agent': `var(--jeton-${agent.couleur})` } as CSSProperties

  return (
    <div style={style} className="card relative flex items-start gap-3 overflow-hidden p-3">
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.1]"
        style={{ backgroundColor: 'var(--agent)' }}
      />
      <span
        className="relative grid h-9 w-9 flex-none place-items-center rounded-xl text-sm font-bold"
        style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
      >
        {agent.nom.charAt(0)}
      </span>

      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{agent.nom}</span>
          <span className="text-[10px] uppercase tracking-wide muted">{agent.role}</span>
          {agent.eveille && <span className="puce puce-pleine sens-succes">eveille</span>}
          {!agent.pretAServir && <span className="puce sens-alerte">sans cle</span>}
        </div>

        <p className="mt-0.5 text-xs leading-snug muted">
          {agent.description || (
            <span className="sens-alerte teinte-sens">
              Sans description : le decomposeur ne saura pas quoi lui confier.
            </span>
          )}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] muted">
          {agent.modele && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-navy-800">
              {agent.modele}
            </span>
          )}
          {agent.taches > 0 && (
            <span>
              {agent.taches} tache{agent.taches > 1 ? 's' : ''}
              {agent.finies > 0 ? ` - ${agent.finies} terminee${agent.finies > 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * La vignette doit se suffire : on ne doit l'ouvrir que pour voir *comment* le
 * travail s'enchaine, jamais pour savoir qui s'en occupe ni ou ca en est.
 */
function Vignette({
  titre,
  detail,
  agents,
  avancement,
  etat,
  onOuvrir,
}: {
  titre: string
  detail: string
  agents: Agent[]
  avancement?: { faites: number; total: number }
  etat?: 'encours' | 'fini' | 'attente'
  onOuvrir: () => void
}) {
  const style = { '--agent': `var(--jeton-ciel)` } as CSSProperties
  const part = avancement && avancement.total > 0 ? avancement.faites / avancement.total : 0

  return (
    <button
      type="button"
      onClick={onOuvrir}
      style={style}
      className="card group relative overflow-hidden p-0 text-left transition-shadow hover:shadow-md"
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-[0.05] transition-opacity group-hover:opacity-[0.1] dark:opacity-[0.1] dark:group-hover:opacity-[0.18]"
        style={{ backgroundColor: 'var(--agent)' }}
      />

      <span className="relative flex flex-col gap-2.5 p-3.5">
        <span className="flex items-start gap-2.5">
          <span
            className="grid h-8 w-8 flex-none place-items-center rounded-lg"
            style={{ backgroundColor: 'var(--agent)', color: 'var(--sur-jeton)' }}
          >
            <Network className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{titre}</span>
            <span className="mt-0.5 block truncate text-[11px] muted">{detail}</span>
          </span>
          {etat && <Pastille etat={etat} />}
        </span>

        <Trombinoscope agents={agents} />

        {avancement && avancement.total > 0 && (
          <span className="block h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
            <span
              className="block h-full rounded-full transition-[width]"
              style={{ width: `${Math.round(part * 100)}%`, backgroundColor: 'var(--succes)' }}
            />
          </span>
        )}
      </span>
    </button>
  )
}

/** Les visages de l'equipe : on voit qui travaille sans ouvrir quoi que ce soit. */
function Trombinoscope({ agents }: { agents: Agent[] }) {
  const montres = agents.slice(0, 6)
  const reste = agents.length - montres.length

  return (
    <span className="flex flex-wrap items-center gap-1">
      {montres.map((a) => (
        <span
          key={a.id}
          title={`${a.nom}${a.pretAServir ? '' : ' - sans cle'}`}
          className={`h-5 w-5 rounded-md ${a.pretAServir ? '' : 'opacity-40 saturate-0'}`}
          style={{ backgroundColor: `var(--jeton-${a.couleur})` }}
        />
      ))}
      {reste > 0 && <span className="text-[10px] font-medium muted">+{reste}</span>}
    </span>
  )
}

function Pastille({ etat }: { etat: 'encours' | 'fini' | 'attente' }) {
  // Un travail en cours est le seul a meriter un aplat : c'est ce qui se passe
  // maintenant. Le reste se contente d'une teinte.
  if (etat === 'encours') return <span className="puce puce-pleine sens-succes">en cours</span>
  if (etat === 'fini') return <span className="puce sens-succes">termine</span>
  return <span className="puce sens-neutre">en attente</span>
}

function AucunPole({ tableauPret }: { tableauPret: boolean }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-sm font-medium">Aucun pole pour l instant</p>
      <p className="mx-auto mt-1 max-w-md text-xs muted">
        {tableauPret
          ? "Un pole nait d une demande : Hermes la decompose en taches liees, et le groupe qui en resulte apparait ici. Ton equipe, elle, est deja la."
          : 'Le tableau des taches ne peut pas etre lu, donc aucun pole ne peut apparaitre. Ton equipe reste consultable.'}
      </p>
    </div>
  )
}

function TableauIndisponible({ raison }: { raison?: string }) {
  const texte =
    raison === 'init'
      ? "Le tableau kanban n a jamais ete initialise. Lance `hermes kanban init` pour qu Hermes puisse y ranger ses taches."
      : raison === 'node'
        ? 'Ce poste utilise une version de Node anterieure a la 22.5 : le Hub ne sait pas lire le tableau.'
        : 'Le tableau kanban existe mais n a pas pu etre lu.'

  return (
    <div className="bandeau sens-alerte">
      <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
      <span>{texte} L equipe reste consultable.</span>
    </div>
  )
}
