/**
 * Un workspace jetable, pose avant que le module teste ne soit charge.
 *
 * `WORKSPACE` est resolu **a l'import** de `workspace.js` : une variable
 * d'environnement posee apres coup n'aurait plus aucun effet, et les tests
 * ecriraient dans le vrai espace de travail. D'ou la forme imposee a chaque
 * fichier de test - on appelle ceci d'abord, on importe ensuite, et l'import
 * doit etre dynamique :
 *
 *   const BAC = bacDeTest('compteurs')
 *   const { ... } = await import('./compteurs.js')
 *
 * Un import statique serait hisse en tete de fichier par le moteur, donc
 * execute AVANT cette ligne. C'est le seul piege de ce socle, et il est
 * silencieux : rien n'echouerait, les fichiers partiraient simplement au
 * mauvais endroit.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function bacDeTest(nom) {
  const racine = path.join(os.tmpdir(), `hub-test-${nom}`)
  fs.rmSync(racine, { recursive: true, force: true })

  const workspace = path.join(racine, 'workspace')
  fs.mkdirSync(workspace, { recursive: true })
  process.env.HERMES_WORKSPACE = workspace

  return { racine, workspace }
}

/** Un fichier pose dans le bac, vieilli si on le demande. */
export function poser(dossier, nom, contenu, ageMs = 0) {
  const chemin = path.join(dossier, nom)
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(chemin, contenu)
  if (ageMs) {
    const t = new Date(Date.now() - ageMs)
    fs.utimesSync(chemin, t, t)
  }
  return chemin
}

/** Vide les fichiers d'un dossier sans toucher a ses sous-dossiers. */
export function vider(dossier) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.isFile()) fs.rmSync(path.join(dossier, e.name))
  }
}
