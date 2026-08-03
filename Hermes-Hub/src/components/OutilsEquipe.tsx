/**
 * Les outils MCP de l'equipe.
 *
 * CET ECRAN EXISTE POUR RENDRE UNE PANNE VISIBLE. Mesure le 03/08/2026 : les
 * serveurs MCP sont par profil. Un client qui branche son outil metier avec
 * `hermes mcp add` le donne a Hermes seul - jamais a A, B et C, ceux-la memes
 * qui executent ses taches. Et rien ne le signale : un agent prive d'outil ne
 * dit pas qu'il lui manque, il fait autrement, ou il invente. C'est la pire
 * forme de panne, celle qui rend un resultat plausible.
 *
 * D'ou la forme retenue : la ligne d'un outil n'affiche pas d'abord ce qu'il
 * est, mais QUI L'A. « 1 agent sur 4 » en orange, et le bouton qui repare juste
 * a cote. Le reste - transport, adresse - passe en second, en petit.
 *
 * Le geste par defaut du formulaire est « toute l'equipe », decoche-able. La
 * ligne de commande fait l'inverse, et c'est precisement ce qu'on repare : le
 * defaut doit etre celui qui marche.
 */
import { AlertTriangle, Check, Plug, Plus, Trash2, Users, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { EtatOutils, Outil, PoseOutil } from '../types'

/** Le nom affiche d'un profil, sans refaire l'annuaire : `default` est Hermes. */
const joli = (id: string) => (id === 'default' ? 'Hermes' : id)

export function OutilsEquipe({ nomsAgents }: { nomsAgents: Map<string, string> }) {
  const [etat, setEtat] = useState<EtatOutils | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const nom = useCallback(
    (id: string) => nomsAgents.get(id) || joli(id),
    [nomsAgents],
  )

  const charger = useCallback(async () => {
    try {
      setEtat(await api.outils())
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Les outils n ont pas pu etre lus.')
    }
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  /** Un branchement reussit chez les uns et echoue chez les autres : on rend
      compte des deux, sinon un agent reste sans outil sans que rien ne le dise. */
  const rendreCompte = (pose: PoseOutil) => {
    const rates = pose.resultats.filter((r) => !r.ok)
    if (!rates.length) {
      const n = pose.resultats.length
      notifier('success', `« ${pose.nom} » est chez ${n} agent${n > 1 ? 's' : ''}.`)
      return
    }
    notifier(
      'error',
      `« ${pose.nom} » a echoue chez ${rates.map((r) => nom(r.profil)).join(', ')} : ` +
        (rates[0].message || 'sans motif.'),
    )
  }

  const agir = async (cle: string, action: () => Promise<PoseOutil>) => {
    setOccupe(cle)
    try {
      rendreCompte(await action())
      await charger()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L'appel a echoue.")
    } finally {
      setOccupe(null)
    }
  }

  if (erreur) {
    return (
      <div className="bandeau sens-danger">
        <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
        <span>{erreur}</span>
      </div>
    )
  }
  if (!etat) return <p className="text-xs muted">Lecture des outils...</p>

  const incomplets = etat.outils.filter((o) => !o.partout).length

  return (
    <div data-zone="outils-equipe" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {etat.outils.length} outil{etat.outils.length > 1 ? 's' : ''} MCP
          </p>
          <p className="text-[11px] muted">
            {incomplets > 0
              ? `${incomplets} ne ${incomplets > 1 ? 'sont' : 'est'} pas chez tout le monde.`
              : `Chacun est chez les ${etat.equipe.length} agents.`}
          </p>
        </div>
        <button
          onClick={() => setFormulaire((v) => !v)}
          className="btn-ghost flex-none gap-1.5 px-3 py-1.5 text-xs"
        >
          {formulaire ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formulaire ? 'Fermer' : 'Brancher un outil'}
        </button>
      </div>

      {formulaire && (
        <NouvelOutil
          equipe={etat.equipe}
          nom={nom}
          onFait={async (pose) => {
            rendreCompte(pose)
            setFormulaire(false)
            await charger()
          }}
        />
      )}

      {etat.outils.length === 0 && !formulaire && (
        <div className="card p-4 text-center">
          <Plug className="mx-auto h-5 w-5 muted" />
          <p className="mt-2 text-xs muted">
            Aucun outil branche. Un serveur MCP donne a l equipe des capacites qu elle n a pas -
            lire une boite mail, interroger un logiciel metier, piloter un service.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {etat.outils.map((o) => (
          <LigneOutil
            key={o.nom}
            outil={o}
            total={etat.equipe.length}
            nom={nom}
            occupe={occupe === o.nom}
            onPartager={() => void agir(o.nom, () => api.partagerOutil(o.nom))}
            onRetirer={() => void agir(o.nom, () => api.debrancherOutil(o.nom))}
          />
        ))}
      </div>

      {etat.outils.length > 0 && (
        <p className="text-[11px] leading-relaxed muted">
          Les agents chargent leurs outils au reveil : ceux qui sont deja en train de travailler
          garderont les anciens jusqu a leur prochaine tache.
        </p>
      )}
    </div>
  )
}

function LigneOutil({
  outil,
  total,
  nom,
  occupe,
  onPartager,
  onRetirer,
}: {
  outil: Outil
  total: number
  nom: (id: string) => string
  occupe: boolean
  onPartager: () => void
  onRetirer: () => void
}) {
  const [confirme, setConfirme] = useState(false)

  return (
    <div
      data-zone="ligne-outil"
      className={`card flex items-center gap-3 p-3 ${
        outil.partout ? '' : 'border-amber-300 dark:border-amber-500/40'
      }`}
    >
      <Plug className={`h-4 w-4 flex-none ${outil.partout ? 'muted' : 'text-amber-500'}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{outil.nom}</p>
          <span className="flex-none text-[10px] uppercase tracking-wide muted">
            {outil.transport}
          </span>
          {!outil.actif && (
            <span className="flex-none text-[10px] uppercase tracking-wide muted">eteint</span>
          )}
        </div>
        <p className="truncate font-mono text-[11px] muted">{outil.resume}</p>

        {outil.partout ? (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3 flex-none" />
            Chez les {total} agents
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
            {outil.present.length} agent{outil.present.length > 1 ? 's' : ''} sur {total} —{' '}
            <span className="muted">
              il manque a {outil.manque.map(nom).join(', ')}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-none items-center gap-1">
        {!outil.partout &&
          (outil.pourquoiPas ? (
            <span
              title={outil.pourquoiPas}
              className="cursor-help px-2 text-[11px] text-amber-600 dark:text-amber-400"
            >
              ne se recopie pas
            </span>
          ) : (
            <button
              onClick={onPartager}
              disabled={occupe}
              className="btn-primary gap-1.5 text-xs disabled:opacity-40"
              title="Le brancher aussi sur les agents qui ne l ont pas"
            >
              <Users className="h-3.5 w-3.5" />
              {occupe ? 'Branchement...' : 'Donner a toute l equipe'}
            </button>
          ))}

        {confirme ? (
          <>
            <button onClick={onRetirer} disabled={occupe} className="btn-danger text-xs">
              Retirer partout
            </button>
            <button onClick={() => setConfirme(false)} className="btn-ghost px-1.5 py-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirme(true)}
            disabled={occupe}
            className="btn-ghost px-2 py-1.5"
            title="Retirer cet outil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Brancher un outil.
 *
 * Deux transports, et le choix se fait a la saisie plutot que par un selecteur :
 * une adresse OU une commande. Ce que le client a sous les yeux, c'est la
 * documentation de son outil, qui donne l'un ou l'autre.
 */
function NouvelOutil({
  equipe,
  nom,
  onFait,
}: {
  equipe: string[]
  nom: (id: string) => string
  onFait: (pose: PoseOutil) => void | Promise<void>
}) {
  const [identifiant, setIdentifiant] = useState('')
  const [adresse, setAdresse] = useState('')
  const [commande, setCommande] = useState('')
  const [args, setArgs] = useState('')
  const [pour, setPour] = useState<string[]>(equipe)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const poser = async () => {
    setOccupe(true)
    try {
      const pose = await api.brancherOutil({
        nom: identifiant.trim(),
        url: adresse.trim() || undefined,
        commande: commande.trim() || undefined,
        // Les arguments se separent a l'espace, sauf entre guillemets : un
        // chemin Windows en contient souvent un.
        args: (args.match(/"[^"]*"|\S+/g) || []).map((a) => a.replace(/^"|"$/g, '')),
        pour,
      })
      await onFait(pose)
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "L'outil n a pas pu etre branche.")
    } finally {
      setOccupe(false)
    }
  }

  const pret = identifiant.trim() && (adresse.trim() || commande.trim()) && pour.length > 0

  return (
    <div data-zone="nouvel-outil" className="card space-y-2.5 border-sky-200 p-3 dark:border-sky-500/30">
      <input
        value={identifiant}
        onChange={(e) => setIdentifiant(e.target.value)}
        placeholder="son nom : compta, crm, boite-mail"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
      />

      <input
        value={adresse}
        onChange={(e) => setAdresse(e.target.value)}
        disabled={!!commande.trim()}
        placeholder="son adresse : https://exemple.fr/mcp"
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 disabled:opacity-40 dark:border-navy-700 dark:bg-navy-900"
      />

      <p className="text-center text-[10px] uppercase tracking-wide muted">ou</p>

      <div className="flex gap-2">
        <input
          value={commande}
          onChange={(e) => setCommande(e.target.value)}
          disabled={!!adresse.trim()}
          placeholder="commande : npx"
          className="w-32 flex-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 disabled:opacity-40 dark:border-navy-700 dark:bg-navy-900"
        />
        <input
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          disabled={!!adresse.trim()}
          placeholder="ses arguments"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sky-400 disabled:opacity-40 dark:border-navy-700 dark:bg-navy-900"
        />
      </div>

      {/* Toute l'equipe est coche d'avance, et c'est le coeur de l'ecran : la
          ligne de commande fait l'inverse, et c'est la panne qu'on repare. */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium">Pour qui</p>
        <div className="flex flex-wrap gap-1.5">
          {equipe.map((id) => {
            const coche = pour.includes(id)
            return (
              <button
                key={id}
                onClick={() =>
                  setPour((p) => (coche ? p.filter((x) => x !== id) : [...p, id]))
                }
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  coche
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
                    : 'muted hover:bg-slate-100 dark:hover:bg-navy-800'
                }`}
              >
                {coche && <Check className="mr-1 inline h-3 w-3" />}
                {nom(id)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed muted">
          Le serveur est reconnecte chez chaque agent, l un apres l autre : compte quelques
          secondes par agent. Tous ses outils sont actives — affine ensuite avec
          <span className="font-mono"> hermes mcp configure</span>.
        </p>
        <button
          onClick={() => void poser()}
          disabled={occupe || !pret}
          className="btn-primary flex-none text-xs disabled:opacity-40"
        >
          {occupe ? 'Branchement...' : 'Brancher'}
        </button>
      </div>
    </div>
  )
}
