/**
 * Le banc d'essai : les plans qu'on a deja essayes, et ce qu'ils valaient.
 *
 * Une orchestration faite main ne se trouve pas du premier coup. Au troisieme
 * essai on ne sait plus lequel etait bon - le banc repond a cette question, et
 * a aucune autre. Chaque ligne est un plan, sa mesure, et l'etoile qu'on lui a
 * mise.
 *
 * Il ne se remplit pas ici : c'est simuler qui photographie. Ce composant lit,
 * marque, compare et fait revenir.
 */
import { useCallback, useState } from 'react'
import { AlertTriangle, GitCompare, RotateCcw, Star, X } from 'lucide-react'
import { api } from '../lib/api'
import type { Comparaison, NoteRetour, Risque, VersionBanc } from '../types'

const SENS_RISQUE: Record<Risque, string> = {
  vert: 'sens-succes',
  orange: 'sens-alerte',
  rouge: 'sens-danger',
}

/** Le reveil se compte en secondes : la milliseconde donnerait l'illusion
    d'une mesure alors que c'est une estimation. */
function secondes(ms: number) {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

function heure(ms: number) {
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Un ecart signe : « + 6,2 s » se lit, « 6200 » non. */
function signe(ms: number) {
  if (!ms) return 'meme reveil'
  return `${ms > 0 ? '+' : '−'} ${secondes(Math.abs(ms))}`
}

interface Props {
  pole: string
  banc: VersionBanc[]
  /** L'essai que la derniere simulation vient de prendre ou de reconnaitre. */
  courante: string
  /** Rejouee apres un retour : le tableau a change, la simulation doit suivre. */
  onRafraichir: () => void
}

export function BancEssai({ pole, banc, courante, onRafraichir }: Props) {
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  /** La note d'un retour, une fois demandee - le geste attend qu'on l'ait lue. */
  const [note, setNote] = useState<{ version: string; note: NoteRetour } | null>(null)
  const [choisis, setChoisis] = useState<string[]>([])
  const [face, setFace] = useState<Comparaison | null>(null)

  const agir = useCallback(async (faire: () => Promise<unknown>) => {
    setOccupe(true)
    setErreur(null)
    try {
      await faire()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setOccupe(false)
    }
  }, [])

  const etoiler = (v: VersionBanc) =>
    void agir(async () => {
      await api.favoriBanc(pole, v.id, !v.favori)
      onRafraichir()
    })

  const demanderRetour = (v: VersionBanc) =>
    void agir(async () => {
      setNote({ version: v.id, note: await api.prevoirRetour(pole, v.id) })
    })

  const revenir = (version: string) =>
    void agir(async () => {
      await api.revenirVersion(pole, version)
      setNote(null)
      onRafraichir()
    })

  const comparer = (v: VersionBanc) =>
    void agir(async () => {
      const suite = choisis.includes(v.id)
        ? choisis.filter((x) => x !== v.id)
        : [...choisis, v.id].slice(-2)
      setChoisis(suite)
      setFace(suite.length === 2 ? await api.comparaison(pole, suite[0], suite[1]) : null)
    })

  if (!banc.length) return null

  return (
    <div data-zone="banc-essai" className="mt-4">
      <div className="mb-2 flex items-baseline gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide muted">Banc d-essai</p>
        <p className="texte-detail muted">
          {banc.length} essai{banc.length > 1 ? 's' : ''}
          {banc.some((v) => v.favori) && ` · ${banc.filter((v) => v.favori).length} garde${
            banc.filter((v) => v.favori).length > 1 ? 's' : ''
          }`}
        </p>
      </div>

      {erreur && (
        <div className="bandeau sens-danger mb-2">
          <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
          <span>{erreur}</span>
        </div>
      )}

      {face && <FaceAFace face={face} onFermer={() => { setFace(null); setChoisis([]) }} />}

      <div className="space-y-1">
        {banc.map((v) => (
          <Ligne
            key={v.id}
            version={v}
            ici={v.id === courante}
            choisi={choisis.includes(v.id)}
            occupe={occupe}
            note={note?.version === v.id ? note.note : null}
            onEtoiler={() => etoiler(v)}
            onComparer={() => comparer(v)}
            onRetour={() => demanderRetour(v)}
            onAnnuler={() => setNote(null)}
            onConfirmer={() => revenir(v.id)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Une ligne du banc.
 *
 * L'essai en cours ne propose pas de retour : on y est deja, et un bouton qui
 * ne fait rien est pire qu'un bouton absent.
 */
function Ligne({
  version,
  ici,
  choisi,
  occupe,
  note,
  onEtoiler,
  onComparer,
  onRetour,
  onAnnuler,
  onConfirmer,
}: {
  version: VersionBanc
  ici: boolean
  choisi: boolean
  occupe: boolean
  note: NoteRetour | null
  onEtoiler: () => void
  onComparer: () => void
  onRetour: () => void
  onAnnuler: () => void
  onConfirmer: () => void
}) {
  return (
    <div
      data-zone="ligne-banc"
      className={`rang rounded-lg border ${
        ici
          ? 'border-brand-400 bg-brand-50/60 dark:border-brand-500/50 dark:bg-brand-500/10'
          : choisi
            ? 'border-slate-300 bg-slate-50 dark:border-navy-600 dark:bg-navy-800/60'
            : 'border-slate-200 dark:border-navy-700'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onEtoiler}
          disabled={occupe}
          title={version.favori ? 'Retirer des essais gardes' : 'Garder cet essai'}
          className="btn-ghost flex-none px-1.5 py-1"
        >
          <Star
            className={`h-3.5 w-3.5 ${version.favori ? 'fill-amber-400 text-amber-400' : ''}`}
          />
        </button>

        <span className="texte-detail muted flex-none tabular-nums">{heure(version.prisLe)}</span>

        <span className="min-w-0 flex-1 truncate text-[11px]">
          {version.nom || 'sans changement'}
          {version.revuLe !== version.prisLe && (
            <span className="muted"> · revu a {heure(version.revuLe)}</span>
          )}
        </span>

        <span className="texte-detail muted flex-none tabular-nums">
          {version.taches} taches · {version.mesure.vagues} vagues ·{' '}
          {secondes(version.mesure.reveilMs)}
        </span>

        <span className={`puce flex-none ${SENS_RISQUE[version.mesure.risque]}`}>
          {version.mesure.risque}
        </span>

        <button
          onClick={onComparer}
          disabled={occupe}
          title="Comparer avec un autre essai"
          className={`btn-ghost flex-none px-1.5 py-1 ${choisi ? 'text-brand-600' : ''}`}
        >
          <GitCompare className="h-3.5 w-3.5" />
        </button>

        {ici ? (
          <span className="texte-detail muted flex-none px-1.5">ici</span>
        ) : (
          <button
            onClick={onRetour}
            disabled={occupe}
            title="Revenir a cet essai"
            className="btn-ghost flex-none gap-1 px-1.5 py-1 text-[10px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Revenir
          </button>
        )}
      </div>

      {note && <Note note={note} occupe={occupe} onAnnuler={onAnnuler} onConfirmer={onConfirmer} />}
    </div>
  )
}

/**
 * Ce que le retour va faire, avant qu'il le fasse.
 *
 * Une seule chose merite d'etre criee : les taches qui ne reviendront que
 * rebaties. Aucun verbe d'Hermes ne ramene une tache archivee - elle repartira
 * donc avec un numero neuf, et ses commentaires, ses evenements et ses
 * livrables resteront dans l'archive. C'est sans consequence sur un plan qui
 * n'a pas encore tourne, et c'est une perte des qu'il a produit quelque chose.
 */
function Note({
  note,
  occupe,
  onAnnuler,
  onConfirmer,
}: {
  note: NoteRetour
  occupe: boolean
  onAnnuler: () => void
  onConfirmer: () => void
}) {
  return (
    <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-navy-700">
      <p className="text-[11px] font-semibold">
        {note.gestes} geste{note.gestes > 1 ? 's' : ''} sur le tableau
      </p>

      <ul className="mt-1 space-y-0.5 texte-detail muted">
        {!!note.aRetirer.length && <li>{note.aRetirer.length} tache(s) retiree(s)</li>}
        {!!note.reassignations.length && <li>{note.reassignations.length} reassignation(s)</li>}
        {!!note.modeles.length && <li>{note.modeles.length} modele(s) change(s)</li>}
        {!!note.liensAPoser.length && <li>{note.liensAPoser.length} lien(s) a poser</li>}
        {!!note.liensARetirer.length && <li>{note.liensARetirer.length} lien(s) a retirer</li>}
      </ul>

      {!!note.aRebatir.length && (
        <div className="bandeau sens-alerte mt-2">
          <AlertTriangle className="h-4 w-4 flex-none teinte-sens" />
          <span className="text-[11px]">
            {note.aRebatir.length} tache{note.aRebatir.length > 1 ? 's' : ''} sera
            {note.aRebatir.length > 1 ? 'ont' : ''} <strong>rebatie</strong>
            {note.aRebatir.length > 1 ? 's' : ''}, pas ressuscitee
            {note.aRebatir.length > 1 ? 's' : ''} : nouveau numero, et le passe reste dans
            l-archive.
            <span className="mt-0.5 block muted">
              {note.aRebatir.map((t) => t.titre).join(' · ')}
            </span>
          </span>
        </div>
      )}

      <div className="mt-2 flex justify-end gap-1.5">
        <button onClick={onAnnuler} disabled={occupe} className="btn-ghost px-2 py-1 text-[11px]">
          Annuler
        </button>
        <button
          onClick={onConfirmer}
          disabled={occupe}
          className="btn-primary px-2.5 py-1 text-[11px]"
        >
          {note.aRebatir.length ? 'Revenir et rebatir' : 'Revenir'}
        </button>
      </div>
    </div>
  )
}

/** Deux essais cote a cote : ce qui a bouge, et ce que ca a coute. */
function FaceAFace({ face, onFermer }: { face: Comparaison; onFermer: () => void }) {
  const e = face.ecart
  const morceaux = [
    e.agents.length && `${e.agents.length} reassignation(s)`,
    e.modeles.length && `${e.modeles.length} modele(s)`,
    e.poses.length && `${e.poses.length} lien(s) pose(s)`,
    e.retires.length && `${e.retires.length} lien(s) retire(s)`,
    e.ajoutees.length && `${e.ajoutees.length} tache(s) en plus`,
    e.retirees.length && `${e.retirees.length} tache(s) en moins`,
  ].filter(Boolean)

  return (
    <div className="mb-2 rounded-lg border border-slate-200 p-2 dark:border-navy-700">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px]">
          <span className="muted">{heure(face.a.prisLe)}</span> {face.a.nom || 'sans changement'}
          <span className="muted"> comparé à </span>
          <span className="muted">{heure(face.b.prisLe)}</span> {face.b.nom || 'sans changement'}
        </p>
        {/* `normal-case` contre la pastille : elle met tout en capitales, ce qui
            convient a « ROUGE » mais transformait « 9,5 s » en « 9,5 S ». */}
        <span
          className={`puce flex-none normal-case ${
            face.reveilDelta > 0 ? 'sens-alerte' : face.reveilDelta < 0 ? 'sens-succes' : 'sens-neutre'
          }`}
        >
          {signe(face.reveilDelta)}
        </span>
        <button onClick={onFermer} className="btn-ghost flex-none px-1.5 py-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 texte-detail muted">
        {face.changements} changement{face.changements > 1 ? 's' : ''}
        {morceaux.length ? ` — ${morceaux.join(' · ')}` : ''}
      </p>
    </div>
  )
}
