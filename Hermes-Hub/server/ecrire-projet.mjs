/**
 * Ecrit les fichiers standard d'un projet dans un dossier.
 *
 * Existe pour que `Nouveau-Projet.ps1` - le raccourci pose dans le workspace -
 * lise le meme gabarit que le Hub au lieu d'en tenir une copie. Les deux en ont
 * tenu une chacun, et ils ont diverge : le jour ou DESIGN.md est arrive dans
 * `templates.js`, le raccourci a continue d'ecrire six fichiers quand le Hub en
 * ecrivait sept, sans que rien ne le signale.
 *
 * Le gabarit n'a donc plus qu'une source, `templates.js`, et les deux chemins
 * de creation passent par elle.
 *
 * Usage : node ecrire-projet.mjs <dossier> <nom> [objectif]
 * Sortie : la liste des fichiers ecrits, un par ligne.
 */
import fs from 'node:fs'
import path from 'node:path'
import { projectFiles } from './templates.js'

const [dossier, nom, objectif] = process.argv.slice(2)

if (!dossier || !nom) {
  console.error('Usage : node ecrire-projet.mjs <dossier> <nom> [objectif]')
  process.exit(2)
}

try {
  fs.mkdirSync(dossier, { recursive: true })
  for (const [fichier, contenu] of Object.entries(projectFiles(nom, objectif))) {
    fs.writeFileSync(path.join(dossier, fichier), contenu, 'utf8')
    console.log(fichier)
  }
} catch (err) {
  console.error(`Ecriture impossible dans ${dossier} : ${err.message}`)
  process.exit(1)
}
