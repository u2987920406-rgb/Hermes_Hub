/**
 * Composer son equipe : ce qu'on refuse avant d'appeler Hermes.
 *
 * AUCUN TEST D'ICI N'APPELLE LA LIGNE DE COMMANDE, et c'est une lecon payee :
 * la premiere version passait par `creerAgent` pour eprouver la validation des
 * noms, et « Majuscule » - normalise en minuscules, donc valide - a pose un
 * vrai profil sur le poste. Il a fallu l'effacer a la main.
 *
 * La validation est donc exportee et testee seule. Ce qui reste teste au
 * travers des verbes ne va jamais jusqu'a l'appel : les refus levent avant.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { bacDeTest } from './bac-essai.js'

bacDeTest('agents')
const { normaliserNom, creerAgent, decrireAgent, renommerAgent, retirerAgent } = await import(
  './agents.js'
)

const BONNE = 'Analyse comptable. Lit les journaux et en tire les ecarts chiffres.'

test('un nom mal forme est refuse', () => {
  for (const nom of ['', 'a', 'avec espace', 'accentue!', 'x'.repeat(40), 'a_b', '-debut']) {
    assert.throws(() => normaliserNom(nom), /minuscules/, `« ${nom} » aurait du etre refuse`)
  }
})

test('la casse est corrigee plutot que refusee', () => {
  // Quelqu'un qui tape « Analyste » veut un agent, pas une lecon. Hermes, lui,
  // exige des minuscules.
  assert.equal(normaliserNom('Analyste'), 'analyste')
  assert.equal(normaliserNom('  B-Redacteur  '), 'b-redacteur')
})

test('un nom valide passe', () => {
  for (const nom of ['a-analyste', 'compta2026', 'x9']) {
    assert.equal(normaliserNom(nom), nom)
  }
})

test('une description absente ou trop courte est refusee', () => {
  // C'est le seul texte que le decomposeur lit pour router une tache. Sans
  // elle, l'agent figure dans l'organigramme et reste oisif a jamais.
  for (const d of ['', 'Analyse.', 'Fait des trucs']) {
    assert.throws(() => creerAgent({ nom: 'jamais-cree', description: d }), /decomposeur/)
  }
})

test('Hermes lui-meme ne se touche pas', () => {
  // Renommer `default` deplacerait le home du poste et emporterait ses
  // credentials.
  assert.throws(() => renommerAgent('default', 'autre'), /ne se touche pas ici/)
  assert.throws(() => retirerAgent('default'), /ne se touche pas ici/)
  assert.throws(() => decrireAgent('default', BONNE), /ne se touche pas ici/)
})

test('le profil d essai pose par l installateur non plus', () => {
  assert.throws(() => retirerAgent('clean'), /installateur/)
  assert.throws(() => renommerAgent('clean', 'autre'), /installateur/)
  assert.throws(() => decrireAgent('clean', BONNE), /installateur/)
})

test('renommer vers le meme nom ne fait rien plutot que d echouer', () => {
  assert.deepEqual(renommerAgent('a-analyste', 'A-Analyste'), {
    id: 'a-analyste',
    renomme: false,
  })
})

test('un nouveau nom mal forme est refuse, et rien n est appele', () => {
  assert.throws(() => renommerAgent('a-analyste', 'Nom Invalide'), /nouveau nom/)
})
