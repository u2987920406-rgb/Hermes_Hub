/**
 * Creer, renommer, dissoudre une equipe.
 *
 * Ces trois gestes n'existaient pas : `ecrireEquipes` etait la depuis le debut
 * et n'etait appelee de nulle part. L'ecran montrait des equipes que personne ne
 * pouvait fabriquer.
 *
 * Les tests portent sur les REFUS autant que sur les reussites, et c'est
 * volontaire : un nom en double rend une mention ambigue, et le Hub choisirait
 * pour l'utilisateur. Une equipe vide, elle, n'appellerait personne - un objet
 * qui ne sert a rien mais qui occupe l'ecran.
 *
 * `listerAgents` lit les vrais profils du poste : on borne donc les membres aux
 * agents qui existent partout ici, et `default` en fait toujours partie.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const RACINE = path.join(os.tmpdir(), 'hub-test-equipes')
fs.rmSync(RACINE, { recursive: true, force: true })
fs.mkdirSync(RACINE, { recursive: true })
process.env.HERMES_WORKSPACE = RACINE

const { creerEquipe, dissoudreEquipe, lireEquipes, modifierEquipe } = await import('./equipe.js')
const { listerAgents } = await import('./equipe.js')

/** Deux agents qui existent vraiment sur ce poste, pour ne pas tester a vide. */
const vrais = listerAgents().map((a) => a.id)
const A = vrais[0]
const B = vrais[1] || vrais[0]

test.beforeEach(() => {
  const f = path.join(RACINE, '.hub', 'equipes.json')
  fs.rmSync(f, { force: true })
})

test('creer une equipe la rend lisible, avec ses membres', () => {
  const e = creerEquipe({ nom: 'Les cartographes', membres: [A, B] })
  assert.equal(e.nom, 'Les cartographes')
  assert.equal(e.id, 'les-cartographes')
  assert.deepEqual(e.membres, [...new Set([A, B])])
  assert.equal(lireEquipes().length, 1)
})

test('deux equipes de meme nom sont refusees : la mention serait ambigue', () => {
  creerEquipe({ nom: 'Japon', membres: [A] })
  assert.throws(() => creerEquipe({ nom: 'japon', membres: [A] }), /s'appelle deja/)
  assert.equal(lireEquipes().length, 1)
})

test('une equipe sans membre est refusee : elle n appellerait personne', () => {
  assert.throws(() => creerEquipe({ nom: 'Vide', membres: [] }), /au moins un agent/)
  assert.throws(() => creerEquipe({ nom: 'Vide', membres: ['agent-qui-n-existe-pas'] }), /au moins un agent/)
  assert.equal(lireEquipes().length, 0)
})

test('une arobase dans le nom est refusee : elle casserait la lecture des mentions', () => {
  assert.throws(() => creerEquipe({ nom: '@japon', membres: [A] }), /arobase/)
})

test('un nom trop court ou trop long est refuse', () => {
  assert.throws(() => creerEquipe({ nom: 'a', membres: [A] }), /entre 2 et 40/)
  assert.throws(() => creerEquipe({ nom: 'x'.repeat(41), membres: [A] }), /entre 2 et 40/)
})

test('les doublons de membres sont retires, l ordre est garde', () => {
  const e = creerEquipe({ nom: 'Doublons', membres: [A, A, B, A] })
  assert.deepEqual(e.membres, [...new Set([A, B])])
})

test('renommer garde les membres, et change l identifiant', () => {
  creerEquipe({ nom: 'Avant', membres: [A, B] })
  const e = modifierEquipe('avant', { nom: 'Apres' })
  assert.equal(e.nom, 'Apres')
  assert.equal(e.id, 'apres')
  assert.deepEqual(e.membres, [...new Set([A, B])])
})

test('renommer vers un nom deja pris est refuse, mais garder le sien passe', () => {
  creerEquipe({ nom: 'Une', membres: [A] })
  creerEquipe({ nom: 'Deux', membres: [A] })
  assert.throws(() => modifierEquipe('deux', { nom: 'Une' }), /s'appelle deja/)
  // Se renommer en soi-meme ne doit pas se heurter a sa propre existence.
  const e = modifierEquipe('deux', { nom: 'Deux' })
  assert.equal(e.nom, 'Deux')
})

test('changer les membres sans toucher au nom', () => {
  creerEquipe({ nom: 'Mouvante', membres: [A, B] })
  const e = modifierEquipe('mouvante', { membres: [A] })
  assert.deepEqual(e.membres, [A])
  assert.equal(e.nom, 'Mouvante')
})

test('dissoudre retire l equipe et ne touche aucun agent', () => {
  creerEquipe({ nom: 'Ephemere', membres: [A, B] })
  const avant = listerAgents().length
  assert.deepEqual(dissoudreEquipe('ephemere'), { id: 'ephemere', dissoute: true })
  assert.equal(lireEquipes().length, 0)
  assert.equal(listerAgents().length, avant)
})

test('modifier ou dissoudre une equipe inconnue est refuse', () => {
  assert.throws(() => modifierEquipe('fantome', { nom: 'X' }), /inconnue/)
  assert.throws(() => dissoudreEquipe('fantome'), /inconnue/)
})

test.after(() => fs.rmSync(RACINE, { recursive: true, force: true }))
