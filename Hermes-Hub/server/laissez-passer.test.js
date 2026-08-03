/**
 * Le laissez-passer : ce qui passe seul, ce qui demande, ce qui exige.
 *
 * C'est le seul module du Hub qui peut repondre OUI a la place de
 * l'utilisateur. Chaque assertion d'ici garde donc une facon de trop
 * autoriser - et la derniere garde l'inverse, une facon de rendre une tache
 * indebloquable.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { bacDeTest } from './bac-essai.js'

bacDeTest('laissez-passer')
const { classer, arbitrer, lireReglage, ecrireReglage } = await import('./laissez-passer.js')

/** Les options telles qu'Hermes les propose vraiment. */
const OPTIONS = [
  { id: 'allow_once', libelle: 'Allow once', genre: 'allow_once' },
  { id: 'allow_always', libelle: 'Allow always', genre: 'allow_always' },
  { id: 'reject_once', libelle: 'Reject', genre: 'reject_once' },
]

test('le classement suit le genre ACP, pas la formulation de la tache', () => {
  for (const genre of ['read', 'search', 'think']) {
    assert.equal(classer({ kind: genre }).risque, 'vert', genre)
  }
  for (const genre of ['fetch', 'move', 'switch_mode']) {
    assert.equal(classer({ kind: genre }).risque, 'orange', genre)
  }
  for (const genre of ['edit', 'delete', 'execute']) {
    assert.equal(classer({ kind: genre }).risque, 'rouge', genre)
  }
})

test('ce qu on ne sait pas lire ne passe jamais pour vert', () => {
  // Un genre inconnu est un genre qu'on n'a pas su lire, et l'inconnu ne se
  // laisse pas passer.
  assert.equal(classer({ kind: 'teleporter' }).risque, 'orange')
  assert.equal(classer({}).risque, 'orange')
  assert.equal(classer(undefined).risque, 'orange')
})

test('vert : repond seul', () => {
  const r = arbitrer({ kind: 'read', title: 'Read donnees.md' }, OPTIONS)
  assert.equal(r.auto?.id, 'allow_once')
})

test('vert sans option d autorisation : on demande plutot que de deviner', () => {
  // On ne sait pas quelle reponse Hermes attend, et repondre au hasard vaut
  // moins que poser la question.
  const r = arbitrer({ kind: 'read' }, [{ id: 'reject_once', genre: 'reject_once' }])
  assert.equal(r.auto, null)
})

test('rouge : demande, et « toujours » est retire', () => {
  const r = arbitrer({ kind: 'delete', title: 'Delete rapport.md' }, OPTIONS)
  assert.equal(r.auto, null)
  // Un agent detourne une seule fois ne doit pas emporter une permission
  // permanente.
  assert.deepEqual(r.options.map((o) => o.id), ['allow_once', 'reject_once'])
})

test('orange : demande, et « toujours » reste possible', () => {
  const r = arbitrer({ kind: 'fetch', title: 'Fetch https://...' }, OPTIONS)
  assert.equal(r.auto, null)
  assert.equal(r.options.length, 3)
})

test('rouge dont « toujours » est le seul oui : on le garde', () => {
  // Le defaut d'origine testait « la liste n'est pas vide » : un refus
  // survivant suffisait a la satisfaire, et la carte ne proposait plus que de
  // refuser - une tache qu'on ne pouvait plus debloquer, sans rien pour
  // l'expliquer.
  const r = arbitrer({ kind: 'edit' }, [
    { id: 'allow_always', genre: 'allow_always' },
    { id: 'reject_once', genre: 'reject_once' },
  ])
  assert.deepEqual(r.options.map((o) => o.id), ['allow_always', 'reject_once'])
})

test('l interrupteur coupe tout, et le rallumage rend le vert', () => {
  assert.deepEqual(lireReglage(), { actif: true }, 'actif par defaut')

  ecrireReglage(false)
  assert.deepEqual(lireReglage(), { actif: false })
  const coupe = arbitrer({ kind: 'read' }, OPTIONS)
  assert.equal(coupe.auto, null, 'rien ne passe seul')
  assert.equal(coupe.options.length, 3, 'les options restent intactes')
  assert.equal(coupe.risque, null, 'aucun jugement annonce puisque rien n a ete classe')

  ecrireReglage(true)
  assert.equal(arbitrer({ kind: 'read' }, OPTIONS).auto?.id, 'allow_once')
})
