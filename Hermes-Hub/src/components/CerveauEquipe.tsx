/**
 * Le cerveau de chaque agent, choisi a la souris.
 *
 * CET ECRAN EXISTE POUR UNE PANNE TOTALE. Le 05/08/2026, les treize agents
 * pointaient vers un fournisseur qui a coupe. **Plus un seul agent capable de
 * penser, et aucun moyen de le reparer sans terminal** - le Hub affichait
 * « Internal error ». La demande de kuchu est nee la, et son architecture est
 * a deux etages : un cerveau pour tout le monde, des exceptions declarees.
 *
 * MEME GRAMMAIRE QUE LES OUTILS MCP, et ce n'est pas un hasard : c'est le meme
 * probleme. Toute l'equipe herite du reglage general, on declare les cas
 * particuliers - « le defaut doit etre celui qui marche ». Un specialiste qui
 * tourne en local, gratuit et hors ligne, est une exception, pas une regle.
 *
 * ⚠ CE PANNEAU NE PROMET PAS QU'UN MODELE REPOND. La liste vient de l'inventaire
 * annonce par Hermes, pas d'un essai : le 06/08, les modeles `nous:` y
 * figuraient pendant que la session Nous etait revoquee. Promettre serait
 * refaire l'interrupteur qui ment. C'est le bandeau de session qui dit quand
 * plus rien ne repond, et lui seul.
 *
 * ⚠ ET IL NE REVEILLE PERSONNE TOUT SEUL. Lire l'inventaire demande une session
 * ACP ouverte, donc un processus Hermes qui demarre - 4,2 s mesurees. Le faire
 * en ouvrant l'ecran reveillerait quelqu'un sans qu'on l'ait demande, contre la
 * regle que la V2 tient depuis le debut. On propose, on ne fait pas.
 */
import { BrainCircuit, Check, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { Cerveau } from '../types'

/** `default` est Hermes - le decomposeur, celui qu'on veut le moins voir tomber. */
const joli = (id: string) => (id === 'default' ? 'Hermes' : id)

export function CerveauEquipe({ nomsAgents }: { nomsAgents: Map<string, string> }) {
  const [etat, setEtat] = useState<Cerveau | null>(null)
  const [occupe, setOccupe] = useState<string | null>(null)
  const notifier = useHubStore((s) => s.notify)

  const charger = useCallback(async (reveiller?: string) => {
    try {
      setEtat(await api.cerveau(reveiller))
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "Les cerveaux n ont pas pu etre lus.")
    }
  }, [notifier])

  useEffect(() => {
    void charger()
  }, [charger])

  const poser = async (
    cle: string,
    patch: { universel?: string | null; agent?: string; modele?: string | null },
  ) => {
    setOccupe(cle)
    try {
      setEtat(await api.poserCerveau(patch))
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "Le cerveau n a pas pu etre pose.")
    } finally {
      setOccupe(null)
    }
  }

  if (!etat) return null

  const nom = (id: string) => nomsAgents.get(id) || joli(id)
  const vide = etat.disponibles.length === 0

  return (
    <div data-zone="cerveau-equipe" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <BrainCircuit className="h-4 w-4 flex-none muted" />
        <p className="min-w-0 flex-1 text-xs muted">
          Un cerveau pour toute l equipe, et des exceptions quand un agent doit tourner ailleurs.
        </p>
        {vide && (
          <button
            onClick={() => void charger('default')}
            className="btn-ghost flex-none gap-1.5 px-3 py-1.5 text-xs"
            title="Ouvre une session avec Hermes pour lire les modeles qu il annonce"
          >
            Reveiller Hermes pour lire la liste
          </button>
        )}
      </div>

      {/* La liste vide n'est pas une panne, et le dire evite de la chercher. */}
      {vide ? (
        <p className="text-[11px] leading-relaxed muted">
          Personne n est eveille, donc Hermes n a rien annonce. La liste des modeles vient de lui,
          jamais d une copie tenue ici : une liste recopiee serait juste le jour ou on l ecrit, et
          fausse au premier fournisseur ajoute.
        </p>
      ) : (
        <>
          <Choix
            titre="Toute l equipe"
            aide="Chaque agent garde le modele de son profil tant que rien n est choisi ici."
            valeur={etat.universel}
            disponibles={etat.disponibles}
            occupe={occupe === '*'}
            onChoisir={(m) => void poser('*', { universel: m })}
            libelleVide="celui de chaque profil"
          />

          {/*
            ⚠ TOUTE L'EQUIPE, PAS SEULEMENT CEUX QUI SONT EVEILLES.
            Premier essai : une ligne par session ouverte. Vu a l'ecran, ca
            donnait UNE ligne sur treize - et c'etait exactement a cote de la
            question. On vient ici parce qu'un agent NE REPOND PAS, donc parce
            qu'il dort. Un ecran qui ne propose que les agents en train de
            tourner refuse de regler ceux qu'on est venu regler.

            L'annuaire donne la liste, les sessions ouvertes donnent seulement
            « sur quoi il tourne en ce moment » - une information en plus, pas
            la condition d'exister.
          */}
          <div className="space-y-1.5">
            {[...nomsAgents.keys()].map((id) => {
              const vivant = etat.agents.find((a) => a.agent === id)
              return (
                <Choix
                  key={id}
                  titre={nom(id)}
                  aide={vivant?.modele ? `tourne en ce moment sur ${vivant.modele}` : 'endormi'}
                  valeur={etat.exceptions[id] || null}
                  disponibles={etat.disponibles}
                  occupe={occupe === id}
                  onChoisir={(m) => void poser(id, { agent: id, modele: m })}
                  libelleVide="comme toute l equipe"
                  compact
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Une ligne de choix. Le vide est une VALEUR, pas une absence - « comme toute
 * l equipe » se choisit, sinon on ne pourrait jamais defaire une exception.
 */
function Choix({
  titre,
  aide,
  valeur,
  disponibles,
  occupe,
  onChoisir,
  libelleVide,
  compact,
}: {
  titre: string
  aide: string
  valeur: string | null
  disponibles: { id: string; nom: string }[]
  occupe: boolean
  onChoisir: (modele: string | null) => void
  libelleVide: string
  compact?: boolean
}) {
  return (
    <div
      data-zone="ligne-cerveau"
      className={`flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-navy-800 ${
        compact ? 'py-1.5' : 'py-2.5'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block ${compact ? 'text-xs' : 'text-sm font-semibold'}`}>{titre}</span>
        <span className="block text-[10.5px] leading-snug muted">{aide}</span>
      </span>

      {occupe ? (
        <Loader2 className="h-3.5 w-3.5 flex-none animate-spin text-sky-500" />
      ) : (
        valeur && <Check className="h-3.5 w-3.5 flex-none teinte-sens sens-succes" />
      )}

      <select
        value={valeur || ''}
        disabled={occupe}
        onChange={(e) => onChoisir(e.target.value || null)}
        className="input max-w-[16rem] flex-none px-2 py-1 text-[11px] disabled:opacity-40"
      >
        <option value="">— {libelleVide}</option>
        {disponibles.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
      </select>
    </div>
  )
}
