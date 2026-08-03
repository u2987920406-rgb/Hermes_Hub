/**
 * Les automatisations, cote lecture.
 *
 * On ne teste pas l'ecriture : elle passe par `hermes cron`, et un test qui
 * creerait de vraies taches programmees sur le poste qui l'execute laisserait
 * des traces qu'aucun nettoyage ne garantit. Ce qui est teste ici est ce qui
 * peut se tromper en silence - la lecture du fichier d'Hermes, et le verdict
 * sur la passerelle.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

const BAC = bacDeTest('planification')
// Le module lit `<HERMES_HOME>/cron/jobs.json` : on lui donne un home a nous.
const HOME = path.join(BAC.racine, 'hermes')
fs.mkdirSync(path.join(HOME, 'cron'), { recursive: true })
process.env.HERMES_HOME = HOME

const { lireAutomatisations } = await import('./planification.js')

const JOBS = path.join(HOME, 'cron', 'jobs.json')
const poser = (jobs) => fs.writeFileSync(JOBS, JSON.stringify({ jobs }), 'utf8')

test('pas de fichier : aucune automatisation, pas une erreur', () => {
  // L'etat normal d'un poste neuf. Une exception ici viderait l'accueil.
  fs.rmSync(JOBS, { force: true })
  assert.deepEqual(lireAutomatisations(), [])
})

test('un fichier illisible ne fait pas tomber l accueil', () => {
  fs.writeFileSync(JOBS, '{ ceci n est pas du json', 'utf8')
  assert.deepEqual(lireAutomatisations(), [])
})

test('une tache programmee est lue avec ce qui compte', () => {
  poser([
    {
      id: 'abc123',
      name: 'Veille du matin',
      prompt: 'Resume les nouveautes',
      schedule: { kind: 'cron', expr: '0 9 * * *', display: 'tous les jours a 9h' },
      schedule_display: 'tous les jours a 9h',
      enabled: true,
      state: 'scheduled',
      next_run_at: '2026-08-04T09:00:00+02:00',
      last_run_at: null,
      last_status: null,
      workdir: 'C:/travail',
    },
  ])
  const [a] = lireAutomatisations()
  assert.equal(a.id, 'abc123')
  assert.equal(a.nom, 'Veille du matin')
  assert.equal(a.quand, 'tous les jours a 9h')
  assert.equal(a.actif, true)
  assert.equal(a.suspendue, false)
  assert.equal(a.dossier, 'C:/travail')
})

test('une tache suspendue se voit comme telle', () => {
  poser([
    { id: 'x', name: 'X', prompt: 'p', state: 'paused', paused_at: '2026-08-03T00:00:00Z',
      enabled: true, schedule: { expr: '30m' } },
  ])
  const [a] = lireAutomatisations()
  assert.equal(a.suspendue, true)
  assert.equal(a.actif, false, 'suspendue ne doit pas compter comme active')
})

test('une tache desactivee n est pas active', () => {
  poser([{ id: 'y', name: 'Y', prompt: 'p', enabled: false, schedule: { expr: '30m' } }])
  assert.equal(lireAutomatisations()[0].actif, false)
})

test('l horaire brut sert de repli quand Hermes n en donne pas de lisible', () => {
  poser([{ id: 'z', name: 'Z', prompt: 'p', enabled: true, schedule: { expr: '0 6 * * 1' } }])
  assert.equal(lireAutomatisations()[0].quand, '0 6 * * 1')
})

test('une erreur de la derniere execution remonte', () => {
  poser([
    { id: 'e', name: 'E', prompt: 'p', enabled: true, schedule: { expr: '30m' },
      last_status: 'error', last_error: 'le modele n a pas repondu' },
  ])
  const [a] = lireAutomatisations()
  assert.equal(a.resultat, 'error')
  assert.equal(a.erreur, 'le modele n a pas repondu')
})
