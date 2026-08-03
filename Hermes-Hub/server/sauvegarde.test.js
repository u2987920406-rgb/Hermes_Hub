/**
 * Sauvegarder et restaurer.
 *
 * AUCUN TEST D'ICI NE LANCE UNE VRAIE SAUVEGARDE, et la raison est plus lourde
 * qu'ailleurs : `restaurer` appelle `hermes import --force`, qui ECRASE le home
 * du poste. Un test qui irait jusqu'a l'appel remplacerait les profils, la
 * memoire et le tableau de la machine qui l'execute.
 *
 * On eprouve donc ce qui se decide AVANT l'appel - le nommage, la lecture du
 * dossier, ce qu'on met dans l'archive et ce qu'on en sort, et les refus - plus
 * la garde de chemin, qui est la seule chose ici capable de detruire hors du
 * dossier des sauvegardes.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const RACINE = path.join(os.tmpdir(), 'hub-test-sauvegarde')
fs.rmSync(RACINE, { recursive: true, force: true })
const WORKSPACE = path.join(RACINE, 'Hermes-essai')
fs.mkdirSync(WORKSPACE, { recursive: true })
process.env.HERMES_WORKSPACE = WORKSPACE
const DOSSIER = path.join(RACINE, 'Sauvegardes')
process.env.HUB_SAUVEGARDES = DOSSIER

const { listerSauvegardes, restaurer, supprimerSauvegarde, DOSSIER: RESOLU } = await import(
  './sauvegarde.js'
)

/** Une sauvegarde posee a la main : on eprouve la LECTURE, pas l'ecriture. */
function poser(nom, { home = 1000, travail = 2000 } = {}) {
  const d = path.join(DOSSIER, nom)
  fs.mkdirSync(d, { recursive: true })
  if (home) fs.writeFileSync(path.join(d, 'hermes-home.zip'), Buffer.alloc(home))
  if (travail) fs.writeFileSync(path.join(d, 'espace-de-travail.zip'), Buffer.alloc(travail))
  return d
}

test('le dossier des sauvegardes est HORS de l espace de travail', () => {
  // Dedans, chaque sauvegarde emporterait les precedentes et l'archive
  // doublerait de taille a chaque fois. `hermes backup` exclut son propre
  // dossier pour cette raison exacte.
  assert.equal(RESOLU, DOSSIER)
  assert.ok(!RESOLU.startsWith(WORKSPACE + path.sep))
})

test('pas de dossier : une liste vide, pas une erreur', () => {
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  assert.deepEqual(listerSauvegardes().sauvegardes, [])
})

test('les sauvegardes sortent de la plus recente a la plus ancienne', () => {
  // Le nom est un horodatage : le tri alphabetique inverse EST le tri par date.
  // Sans ca, celle qu'on veut restaurer serait en bas de la liste.
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  poser('2026-08-01-09h00')
  poser('2026-08-03-14h30')
  poser('2026-08-02-18h05')
  assert.deepEqual(
    listerSauvegardes().sauvegardes.map((s) => s.nom),
    ['2026-08-03-14h30', '2026-08-02-18h05', '2026-08-01-09h00'],
  )
})

test('une sauvegarde amputee se voit AVANT qu on en ait besoin', () => {
  // C'est tout l'interet du champ : `hermes backup` ne couvre que le home, et
  // une archive sans l'espace de travail laisse les livrables du client dehors.
  // Le jour ou on restaure, il est trop tard pour s'en apercevoir.
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  poser('2026-08-03-10h00', { travail: 0 })
  poser('2026-08-03-11h00')

  const [sansTravail, entiere] = [
    listerSauvegardes().sauvegardes.find((s) => s.nom === '2026-08-03-10h00'),
    listerSauvegardes().sauvegardes.find((s) => s.nom === '2026-08-03-11h00'),
  ]
  assert.equal(sansTravail.complete, false)
  assert.equal(sansTravail.home, true)
  assert.equal(sansTravail.travail, false)
  assert.equal(entiere.complete, true)
})

test('le poids annonce est celui des deux archives', () => {
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  poser('2026-08-03-12h00', { home: 1500, travail: 2500 })
  assert.equal(listerSauvegardes().sauvegardes[0].octets, 4000)
})

test('restaurer une sauvegarde inconnue est refuse, et rien n est appele', () => {
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  assert.throws(() => restaurer('jamais-vue'), /introuvable/)
})

test('on ne sort pas du dossier des sauvegardes', () => {
  // `supprimerSauvegarde` efface un dossier entier. Sans `path.basename`,
  // « ../../Documents » serait un chemin valide - et cette fonction est
  // atteignable par une route HTTP.
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  const dehors = path.join(RACINE, 'ne-pas-toucher')
  fs.mkdirSync(dehors, { recursive: true })

  assert.throws(() => supprimerSauvegarde('../ne-pas-toucher'), /introuvable/)
  assert.throws(() => restaurer('../../ne-pas-toucher'), /introuvable/)
  assert.ok(fs.existsSync(dehors), 'un dossier hors des sauvegardes a ete touche')
})

test('supprimer retire le dossier, et deux fois ne passe pas', () => {
  fs.rmSync(DOSSIER, { recursive: true, force: true })
  poser('2026-08-03-13h00')
  supprimerSauvegarde('2026-08-03-13h00')
  assert.deepEqual(listerSauvegardes().sauvegardes, [])
  assert.throws(() => supprimerSauvegarde('2026-08-03-13h00'), /introuvable/)
})
