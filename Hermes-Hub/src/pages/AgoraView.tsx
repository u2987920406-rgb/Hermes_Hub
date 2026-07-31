/**
 * L'Agora - un seul lieu : on parle a Hermes, et on voit son equipe travailler.
 *
 * La conversation et le plan etaient deux ecrans separes. C'etait une erreur :
 * un plan qu'il faut aller chercher ailleurs n'est pas un plan qu'on valide.
 * Ici la demande, l'equipe proposee et le graphe des taches tiennent dans le
 * meme regard.
 */
import { Network, RefreshCw, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Conversation } from '../components/Conversation'
import {
  CarteAgent,
  DetailTache,
  Organigramme,
  PlanIndisponible,
} from '../components/Equipe'
import { PageHeader } from '../components/PageHeader'
import { api, ApiError } from '../lib/api'
import type { AgoraData } from '../types'

interface Props {
  onMenu: () => void
}

type Onglet = 'plan' | 'equipe'

export function AgoraView({ onMenu }: Props) {
  const [data, setData] = useState<AgoraData | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [onglet, setOnglet] = useState<Onglet>('plan')
  const [choisie, setChoisie] = useState<string | null>(null)

  const charger = useCallback(async () => {
    try {
      setData(await api.agora())
      setErreur(null)
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : String(err))
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    void charger()
    // Un agent s'eveille et se rendort en quelques secondes : sans
    // rafraichissement, l'ecran manquerait justement ce qu'il doit montrer.
    const t = setInterval(() => void charger(), 3000)
    return () => clearInterval(t)
  }, [charger])

  const agents = useMemo(() => new Map((data?.agents || []).map((a) => [a.id, a])), [data])
  const plan = data?.plan || null
  const eveilles = (data?.agents || []).filter((a) => a.eveille).length
  const tache = choisie ? plan?.taches.find((t) => t.id === choisie) : null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Agora"
        subtitle={
          plan?.disponible && plan.taches.length
            ? `${plan.taches.length} tache${plan.taches.length > 1 ? 's' : ''}${eveilles ? ` - ${eveilles} agent${eveilles > 1 ? 's' : ''} eveille${eveilles > 1 ? 's' : ''}` : ''}`
            : "Parle a Hermes, il compose l'equipe"
        }
        icon={<Users className="h-4 w-4 text-indigo-500" />}
        onMenu={onMenu}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Conversation agents={agents} plan={plan} />

        {/* Le plan, a droite : il se remplit pendant qu'on parle. */}
        <aside className="flex min-h-0 flex-shrink-0 flex-col border-t border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-900 lg:w-[22rem] lg:border-l lg:border-t-0 xl:w-[26rem]">
          <div className="flex flex-shrink-0 items-center gap-1 border-b border-slate-200 px-2 py-1.5 dark:border-navy-800">
            {(
              [
                ['plan', 'Plan', Network],
                ['equipe', "L'equipe", Users],
              ] as const
            ).map(([id, libelle, Icone]) => (
              <button
                key={id}
                onClick={() => setOnglet(id)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  onglet === id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
              >
                <Icone className="h-3.5 w-3.5" />
                {libelle}
              </button>
            ))}
            <button
              onClick={() => void charger()}
              className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-navy-800"
              title="Rafraichir"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${chargement ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            {erreur && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {erreur}
              </div>
            )}

            {onglet === 'equipe' && (
              <div className="space-y-2">
                {(data?.agents || []).map((a) => (
                  <CarteAgent key={a.id} agent={a} />
                ))}
              </div>
            )}

            {onglet === 'plan' && plan && !plan.disponible && <PlanIndisponible plan={plan} />}

            {onglet === 'plan' && plan?.disponible && plan.taches.length === 0 && (
              <div className="px-2 py-8 text-center">
                <Network className="mx-auto h-8 w-8 text-slate-300 dark:text-navy-700" />
                <p className="mx-auto mt-3 max-w-[15rem] text-[11px] leading-relaxed muted">
                  Aucun plan en cours. Demande quelque chose a Hermes : le graphe de son plan se
                  dessine ici, un noeud par tache et une fleche par dependance.
                </p>
              </div>
            )}

            {onglet === 'plan' && plan?.disponible && plan.taches.length > 0 && (
              <>
                <Organigramme
                  plan={plan}
                  agents={agents}
                  choisie={choisie}
                  onChoisir={(id) => setChoisie((c) => (c === id ? null : id))}
                />
                {tache && <DetailTache tache={tache} agent={agents.get(tache.agent || '')} />}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
