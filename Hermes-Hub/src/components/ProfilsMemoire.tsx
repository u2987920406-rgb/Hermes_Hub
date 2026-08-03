/**
 * Les profils de memoire, et l'encart qui explique ce qu'on y joue.
 *
 * POURQUOI L'ENCART EXISTE, et pourquoi il est aussi long qu'un ecran de
 * reglages. C'est la configuration que tout le monde saute - kuchu le premier,
 * de son propre aveu - et celle qui change le plus l'usage quotidien. Les gens
 * ne la sautent pas par paresse : ils la sautent parce que RIEN ne leur dit ce
 * qu'elle change. Un champ vide n'a pas l'air grave.
 *
 * On explique donc trois choses pour chaque fichier : a quoi il sert, un
 * exemple de ce que ca change, et CE QUE CA COUTE. Le cout est la partie qu'on
 * ne voit nulle part ailleurs : ces fichiers sont relus a chaque demarrage de
 * session, donc leur longueur se paie a chaque fois. Sans ce chiffre, on empile
 * des regles en croyant bien faire.
 *
 * LE PROFIL PAR DEFAUT N'EST PAS DANS LA BULLE, et ce n'est pas un oubli : il
 * EST le fichier installe. Le bouton « Version d'origine » le rend deja. L'y
 * mettre en double obligerait le Hub a connaitre un texte que l'installateur
 * possede - et les deux finiraient par diverger.
 */
import { Check, ChevronDown, Info, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useHubStore } from '../store/useHubStore'
import type { EtatProfils, Profil } from '../types'

/** Ce qu'on explique pour chaque fichier : a quoi il sert, et ce qu'il change. */
const LECON: Record<string, { role: string; sans: string; avec: string }> = {
  'MEMORY.md': {
    role: 'Les regles qu Hermes suit, quel que soit le sujet. C est sa charte de travail.',
    sans: 'Il efface un fichier que tu voulais garder, parce que rien ne lui interdisait.',
    avec: 'Il demande avant, parce que « rien d irreversible sans mon accord » est ecrit.',
  },
  'USER.md': {
    role: 'Qui tu es et ce que tu attends de lui. Rien ne peut le deviner a ta place.',
    sans: 'Tu demandes « prepare mon devis » : il improvise une trame generique.',
    avec: 'Il sait que tu fais des devis de chantier, sous Excel, pour des particuliers.',
  },
  'SOUL.md': {
    role: 'Son ton et sa maniere d etre. Le caractere, pas les regles.',
    sans: 'Il repond comme un manuel : correct, et sans personne en face.',
    avec: 'Il repond comme tu veux qu on te parle - bref, chaleureux, ou terre a terre.',
  },
}

export function ProfilsMemoire({
  fichier,
  onApplique,
}: {
  fichier: string
  onApplique: () => void
}) {
  const [etat, setEtat] = useState<EtatProfils | null>(null)
  const [ouvert, setOuvert] = useState(false)
  const [apercu, setApercu] = useState<{ id: string; contenu: string } | null>(null)
  const [renomme, setRenomme] = useState<{ id: string; valeur: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const notifier = useHubStore((s) => s.notify)

  const charger = useCallback(async () => {
    try {
      setEtat(await api.profils(fichier))
    } catch {
      setEtat(null)
    }
  }, [fichier])

  useEffect(() => {
    void charger()
    setOuvert(false)
    setApercu(null)
  }, [charger])

  const appliquer = async (p: Profil) => {
    setOccupe(true)
    try {
      await api.appliquerProfil(fichier, p.id)
      notifier('success', `« ${p.nom} » applique. L etat precedent est garde en .bak.`)
      setOuvert(false)
      setApercu(null)
      await charger()
      onApplique()
    } catch (e) {
      notifier('error', e instanceof Error ? e.message : "Le profil n a pas pu etre applique.")
    } finally {
      setOccupe(false)
    }
  }

  const lecon = LECON[fichier]

  return (
    <div data-zone="profils-memoire" className="space-y-3">
      {/* --- L'encart : a quoi sert ce fichier, et ce qu'il coute ------------- */}
      {lecon && (
        <div className="card space-y-2.5 p-3.5">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-none text-sky-500" />
            <p className="text-xs leading-relaxed">{lecon.role}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-2.5 dark:border-navy-700">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide muted">
                Sans le remplir
              </p>
              <p className="text-[11px] leading-relaxed muted">{lecon.sans}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Rempli
              </p>
              <p className="text-[11px] leading-relaxed">{lecon.avec}</p>
            </div>
          </div>

          {etat && (
            <p className="border-t border-slate-200 pt-2 text-[11px] leading-relaxed muted dark:border-navy-700">
              <strong className="text-slate-700 dark:text-slate-200">
                {etat.actuel.lignes} lignes, environ {etat.actuel.jetons} jetons.
              </strong>{' '}
              Ce fichier est relu <strong>a chaque demarrage de session</strong> : sa longueur se
              paie a chaque fois, et chaque ligne ajoutee rend les autres un peu moins suivies.
              N en ajoute pas sans en retirer.
            </p>
          )}
        </div>
      )}

      {/* --- La bulle -------------------------------------------------------- */}
      <div className="relative">
        <button
          onClick={() => setOuvert((v) => !v)}
          className="btn-ghost w-full justify-between gap-2 px-3 py-2 text-xs"
        >
          <span>Changer de profil</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
        </button>

        {ouvert && etat && (
          <div className="card absolute z-20 mt-1 max-h-72 w-full overflow-y-auto p-1.5 shadow-lg">
            {etat.livres.length === 0 && etat.miens.length === 0 && (
              <p className="p-3 text-[11px] muted">
                Aucun profil a proposer pour ce fichier. Enregistre le tien avec « + ».
              </p>
            )}

            {etat.livres.map((p) => (
              <LigneProfil
                key={p.id}
                profil={p}
                occupe={occupe}
                onApercu={async () => {
                  const t = await api.lireProfil(fichier, p.id).catch(() => null)
                  if (t) setApercu({ id: p.id, contenu: t.contenu })
                }}
                onChoisir={() => void appliquer(p)}
              />
            ))}

            {etat.miens.length > 0 && (
              <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide muted">
                Les miens
              </p>
            )}
            {etat.miens.map((p) =>
              renomme?.id === p.id ? (
                <div key={p.id} className="flex items-center gap-1 p-1.5">
                  <input
                    autoFocus
                    value={renomme.valeur}
                    onChange={(e) => setRenomme({ id: p.id, valeur: e.target.value })}
                    onKeyDown={async (e) => {
                      if (e.key !== 'Enter') return
                      try {
                        await api.renommerProfil(fichier, p.id, renomme.valeur)
                        setRenomme(null)
                        await charger()
                      } catch (err) {
                        notifier('error', err instanceof Error ? err.message : 'Renommage refuse')
                      }
                    }}
                    className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-sky-400 dark:border-navy-700 dark:bg-navy-900"
                  />
                  <button onClick={() => setRenomme(null)} className="btn-ghost px-1.5 py-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <LigneProfil
                  key={p.id}
                  profil={p}
                  occupe={occupe}
                  onApercu={async () => {
                    const t = await api.lireProfil(fichier, p.id).catch(() => null)
                    if (t) setApercu({ id: p.id, contenu: t.contenu })
                  }}
                  onChoisir={() => void appliquer(p)}
                  onRenommer={() => setRenomme({ id: p.id, valeur: p.nom })}
                  onRetirer={async () => {
                    await api.supprimerProfil(fichier, p.id).catch(() => null)
                    await charger()
                  }}
                />
              ),
            )}

            <button
              onClick={async () => {
                try {
                  const p = await api.enregistrerProfil(fichier)
                  notifier('success', `Etat actuel garde sous « ${p.nom} ».`)
                  await charger()
                } catch (e) {
                  notifier('error', e instanceof Error ? e.message : 'Enregistrement impossible')
                }
              }}
              className="mt-1 flex w-full items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-[11px] muted hover:bg-slate-50 dark:border-navy-700 dark:hover:bg-navy-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Garder l etat actuel comme profil
            </button>
          </div>
        )}
      </div>

      {/* Voir avant de choisir : c'etait tout le reproche fait a l'ancienne
          question « utiliser le profil pre-rempli ? ». */}
      {apercu && (
        <div className="card space-y-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold">Ce que ce profil ecrirait</p>
            <button onClick={() => setApercu(null)} className="btn-ghost px-1.5 py-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed dark:bg-navy-900">
            {apercu.contenu}
          </pre>
        </div>
      )}
    </div>
  )
}

function LigneProfil({
  profil,
  occupe,
  onApercu,
  onChoisir,
  onRenommer,
  onRetirer,
}: {
  profil: Profil
  occupe: boolean
  onApercu: () => void
  onChoisir: () => void
  onRenommer?: () => void
  onRetirer?: () => void
}) {
  return (
    <div
      data-zone="ligne-profil"
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-navy-800"
    >
      <button onClick={onApercu} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium">{profil.nom}</p>
        <p className="truncate text-[11px] muted">{profil.resume}</p>
        <p className="text-[10px] tabular-nums muted">
          {profil.lignes} lignes · ~{profil.jetons} jetons a chaque demarrage
        </p>
      </button>

      {onRenommer && (
        <button onClick={onRenommer} className="btn-ghost flex-none px-1.5 py-1" title="Renommer">
          <Pencil className="h-3 w-3" />
        </button>
      )}
      {onRetirer && (
        <button onClick={onRetirer} className="btn-ghost flex-none px-1.5 py-1" title="Retirer">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={onChoisir}
        disabled={occupe}
        className="btn-primary flex-none gap-1 px-2 py-1 text-[11px] disabled:opacity-40"
      >
        <Check className="h-3 w-3" />
        Choisir
      </button>
    </div>
  )
}
