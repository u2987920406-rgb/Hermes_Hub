/**
 * Sauvegarder et restaurer un poste.
 *
 * POURQUOI CETTE PIECE EXISTE. Un poste client qui meurt emporte aujourd'hui les
 * profils, la memoire, le tableau et le Coffre. Il n'y avait aucun bouton, et la
 * personne qu'on appelle dans ce cas-la, c'est celui qui a pose l'installation.
 * C'est ce qui separe un outil d'une responsabilite.
 *
 * DEUX ARCHIVES, ET C'EST LE POINT QUI DECIDE DE TOUT. `hermes backup` ne couvre
 * QUE le home d'Hermes - profils, memoire, sessions, tableau, cron, credentials.
 * Le Coffre et les Projets vivent dans `Documents\Hermes-<prenom>`, et il n'y
 * touche pas. Verifie le 03/08/2026 en lisant sa liste d'exclusions : tout y est
 * relatif au home.
 *
 * S'en remettre a lui seul aurait donc rendu une sauvegarde qui PARAIT complete
 * et laisse les livrables du client dehors. C'est la forme de panne qu'on
 * traque partout ailleurs dans ce depot : celle qui rend un resultat plausible.
 *
 * LA RESTAURATION EST LE VRAI SUJET. Une sauvegarde qu'on n'a jamais restauree
 * n'est pas une sauvegarde - c'est un fichier qui rassure. D'ou le filet :
 * restaurer commence par sauvegarder ce qui est en place. Quelqu'un qui se
 * trompe d'archive doit pouvoir revenir.
 *
 * `hermes import` demande confirmation quand on ne lui passe pas `--force`, et
 * cette question part dans le vide si on redirige sa sortie - la lecon du
 * 03/08/2026. On passe donc `--force` en connaissance de cause, apres avoir pris
 * le filet et apres que l'interface a demande, elle.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { WORKSPACE } from './workspace.js'

const HERMES_HOME =
  process.env.HERMES_HOME || path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')

/**
 * Les sauvegardes vivent A COTE de l'espace de travail, jamais dedans.
 *
 * Dedans, chaque sauvegarde emporterait les precedentes et l'archive doublerait
 * de taille a chaque fois. `hermes backup` exclut d'ailleurs son propre dossier
 * pour cette raison exacte.
 */
export const DOSSIER = process.env.HUB_SAUVEGARDES || path.join(path.dirname(WORKSPACE), 'Sauvegardes-Hermes')

/**
 * Ce qu'on ne met pas dans l'archive de l'espace de travail.
 *
 * `Hermes-Hub` est le produit lui-meme : il revient par l'installateur, et il
 * pese plus que tout le reste. `Depannage` de meme. On archive les DONNEES -
 * ce qu'on ne peut pas refabriquer.
 */
const HORS_ARCHIVE = new Set(['Hermes-Hub', 'Depannage'])

/** Un nom de dossier trie par ordre alphabetique = trie par date. */
function horodatage(quand) {
  const d = quand instanceof Date ? quand : new Date()
  const n = (v) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${n(d.getMonth() + 1)}-${n(d.getDate())}-${n(d.getHours())}h${n(d.getMinutes())}`
}

function trouverHermes() {
  const local = path.join(HERMES_HOME, 'hermes-agent', 'venv', 'Scripts', 'hermes.exe')
  if (fs.existsSync(local)) return local
  return process.platform === 'win32' ? 'hermes.exe' : 'hermes'
}

/** Taille d'un fichier, ou 0. Sert a dire ce que pese une sauvegarde plutot que
    de laisser deviner. */
function taille(chemin) {
  try {
    return fs.statSync(chemin).size
  } catch {
    return 0
  }
}

// -----------------------------------------------------------------------------
// Sauvegarder
// -----------------------------------------------------------------------------
/**
 * L'archive de l'espace de travail, par PowerShell.
 *
 * Node n'a pas de compression dans sa bibliotheque standard, et le serveur n'a
 * aucune dependance npm - regle du depot, elle ne se plie pas pour un zip.
 * `Compress-Archive` est livre avec Windows depuis toujours.
 */
function zipperWorkspace(destination) {
  let entrees
  try {
    entrees = fs
      .readdirSync(WORKSPACE)
      .filter((n) => !HORS_ARCHIVE.has(n))
      .map((n) => path.join(WORKSPACE, n))
  } catch {
    return { ok: false, message: "L'espace de travail est introuvable." }
  }
  if (!entrees.length) return { ok: false, message: "L'espace de travail est vide." }

  // Un tableau PowerShell de chemins entre apostrophes : les apostrophes
  // internes se doublent, c'est le seul echappement de la syntaxe.
  const liste = entrees.map((p) => `'${p.replace(/'/g, "''")}'`).join(',')
  const r = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Compress-Archive -Path ${liste} -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
    ],
    { windowsHide: true, encoding: 'utf8', timeout: 600000 },
  )
  if (r.status !== 0 || !fs.existsSync(destination)) {
    return { ok: false, message: String(r.stderr || '').split('\n')[0] || 'La compression a echoue.' }
  }
  return { ok: true }
}

/**
 * Une sauvegarde complete : le home d'Hermes, et l'espace de travail.
 *
 * On ne s'arrete pas si l'une des deux echoue - l'autre a de la valeur, et le
 * compte rendu dit laquelle manque. Une sauvegarde a moitie faite qu'on annonce
 * comme telle vaut mieux qu'un echec total.
 */
export function sauvegarder({ quand } = {}) {
  const nom = horodatage(quand)
  const dossier = path.join(DOSSIER, nom)
  fs.mkdirSync(dossier, { recursive: true })

  const zipHome = path.join(dossier, 'hermes-home.zip')
  const zipTravail = path.join(dossier, 'espace-de-travail.zip')

  const r = spawnSync(trouverHermes(), ['backup', '-o', zipHome], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 600000,
    input: '\n',
  })
  const home =
    fs.existsSync(zipHome) && taille(zipHome) > 0
      ? { ok: true, octets: taille(zipHome) }
      : {
          ok: false,
          message:
            String(`${r.stderr || ''}${r.stdout || ''}`).split('\n').filter(Boolean).pop() ||
            "Hermes n'a pas rendu d'archive.",
        }

  const w = zipperWorkspace(zipTravail)
  const travail = w.ok ? { ok: true, octets: taille(zipTravail) } : w

  ecrireNotice(dossier, nom, home, travail)
  return { nom, dossier, home, travail, complete: home.ok && travail.ok }
}

/**
 * Le mode d'emploi, DANS la sauvegarde.
 *
 * Une archive qu'on ne sait pas restaurer n'est pas une sauvegarde. Et le jour
 * ou on en a besoin, le Hub n'est peut-etre plus la pour l'expliquer - c'est
 * meme le cas le plus probable.
 */
function ecrireNotice(dossier, nom, home, travail) {
  const lignes = [
    `# Sauvegarde Hermes du ${nom.replace(/-/g, '/').replace(/\//g, '-')}`,
    '',
    'Deux archives, parce que les donnees vivent a deux endroits.',
    '',
    `- hermes-home.zip .......... ${home.ok ? 'profils, memoire, tableau, sessions, cle' : 'MANQUE - ' + home.message}`,
    `- espace-de-travail.zip .... ${travail.ok ? 'Coffre, Projets, journaux' : 'MANQUE - ' + travail.message}`,
    '',
    '## Pour restaurer',
    '',
    'Le plus simple : le Hub, Configuration > Sauvegarde, bouton Restaurer.',
    '',
    "Si le Hub n'est plus la :",
    '',
    '  1. Installer Hermes (installer.bat), puis FERMER le Hub et Hermes.',
    '  2. hermes import "chemin\\vers\\hermes-home.zip" --force',
    "  3. Decompresser espace-de-travail.zip dans Documents\\Hermes-<prenom>\\,",
    '     en ecrasant.',
    '',
    "L'ordre compte : importer pendant qu'un agent travaille ecraserait des",
    'fichiers en cours de lecture.',
    '',
    "## Ce qui n'est PAS dedans",
    '',
    "Le Hub lui-meme et le dossier Depannage : ils reviennent par l'installateur,",
    "et ils pesent plus que tout le reste. On archive ce qu'on ne peut pas",
    'refabriquer.',
    '',
  ]
  try {
    fs.writeFileSync(path.join(dossier, 'LISEZ-MOI.txt'), lignes.join('\r\n'), 'utf8')
  } catch {
    /* la notice est un plus, son absence n'invalide pas la sauvegarde */
  }
}

// -----------------------------------------------------------------------------
// Lire
// -----------------------------------------------------------------------------
export function listerSauvegardes() {
  let noms
  try {
    noms = fs.readdirSync(DOSSIER, { withFileTypes: true }).filter((e) => e.isDirectory())
  } catch {
    return { dossier: DOSSIER, sauvegardes: [] }
  }

  const sauvegardes = noms
    .map((e) => {
      const d = path.join(DOSSIER, e.name)
      const home = taille(path.join(d, 'hermes-home.zip'))
      const travail = taille(path.join(d, 'espace-de-travail.zip'))
      return {
        nom: e.name,
        octets: home + travail,
        home: home > 0,
        travail: travail > 0,
        // Une sauvegarde amputee doit se voir AVANT qu'on en ait besoin.
        complete: home > 0 && travail > 0,
      }
    })
    .sort((a, b) => b.nom.localeCompare(a.nom))

  return { dossier: DOSSIER, sauvegardes }
}

// -----------------------------------------------------------------------------
// Restaurer
// -----------------------------------------------------------------------------
/**
 * Remettre un poste dans l'etat d'une sauvegarde.
 *
 * LE FILET D'ABORD. On sauvegarde ce qui est en place avant d'ecraser quoi que
 * ce soit : quelqu'un qui se trompe d'archive doit pouvoir revenir. Ca double la
 * duree et ca ne se discute pas.
 */
export function restaurer(nom) {
  const dossier = path.join(DOSSIER, path.basename(String(nom || '')))
  if (!fs.existsSync(dossier)) {
    const err = new Error(`La sauvegarde « ${nom} » est introuvable.`)
    err.status = 404
    throw err
  }

  const filet = sauvegarder()
  const resultats = []

  const zipHome = path.join(dossier, 'hermes-home.zip')
  if (fs.existsSync(zipHome)) {
    // `--force` en connaissance de cause : sans lui, `hermes import` pose une
    // question qui partirait dans le vide. C'est l'interface qui a demande.
    const r = spawnSync(trouverHermes(), ['import', zipHome, '--force'], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 900000,
      input: '\n',
    })
    const texte = `${r.stdout || ''}${r.stderr || ''}`
    resultats.push({
      quoi: 'home',
      ok: r.status === 0,
      message: r.status === 0 ? null : texte.split('\n').filter(Boolean).pop() || 'Import refuse.',
    })
  }

  const zipTravail = path.join(dossier, 'espace-de-travail.zip')
  if (fs.existsSync(zipTravail)) {
    const r = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Expand-Archive -Path '${zipTravail.replace(/'/g, "''")}' -DestinationPath '${WORKSPACE.replace(/'/g, "''")}' -Force`,
      ],
      { windowsHide: true, encoding: 'utf8', timeout: 900000 },
    )
    resultats.push({
      quoi: 'travail',
      ok: r.status === 0,
      message: r.status === 0 ? null : String(r.stderr || '').split('\n')[0] || 'Extraction refusee.',
    })
  }

  return { nom, filet: filet.nom, resultats, ok: resultats.every((r) => r.ok) }
}

export function supprimerSauvegarde(nom) {
  const dossier = path.join(DOSSIER, path.basename(String(nom || '')))
  // `path.basename` interdit de sortir du dossier des sauvegardes : sans lui,
  // « ../../Documents » serait un chemin valide.
  if (!fs.existsSync(dossier)) {
    const err = new Error(`La sauvegarde « ${nom} » est introuvable.`)
    err.status = 404
    throw err
  }
  fs.rmSync(dossier, { recursive: true, force: true })
  return { nom, retire: true }
}
