/**
 * Les compteurs : ce que le travail a coute.
 *
 * Ce qui est garde ici, ce sont les deux pieges du comptage - une tache
 * relancee qui doublerait ses chiffres, et un fichier qui grossirait sans fin
 * jusqu'a se faire relire a chaque tache.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

const BAC = bacDeTest('compteurs')
const { noterTache, lireCompteurs, oublierCompteurs } = await import('./compteurs.js')

/** Trois taches, deux agents - le jeu de base de presque tous les cas. */
function troisTaches(pole = 'p1') {
  noterTache({ pole, tache: 't1', titre: 'Analyser', agent: 'sofia', ms: 61_000, appels: 1, bascules: 0, etat: 'done' })
  noterTache({ pole, tache: 't2', titre: 'Rediger', agent: 'karim', ms: 120_000, appels: 3, bascules: 2, etat: 'done' })
  noterTache({ pole, tache: 't3', titre: 'Assembler', agent: 'sofia', ms: 30_000, appels: 1, bascules: 1, etat: 'blocked' })
}

test('additionne durees, appels et bascules', () => {
  troisTaches('somme')
  const c = lireCompteurs('somme')
  assert.equal(c.cumul, 211_000)
  assert.equal(c.appels, 5)
  assert.equal(c.bascules, 3)
})

test('agrege par agent, du plus couteux en temps au moins couteux', () => {
  troisTaches('agents')
  const c = lireCompteurs('agents')
  // Karim n'a qu'une tache mais elle dure 120 s ; Sofia en a deux pour 91 s.
  // Le tri est par temps, pas par nombre - c'est le temps qui coute.
  assert.deepEqual(c.agents.map((a) => a.agent), ['karim', 'sofia'])
  assert.deepEqual(c.agents[1], { agent: 'sofia', taches: 2, ms: 91_000, appels: 2, bascules: 1 })
})

test('une tache bloquee garde ses chiffres', () => {
  troisTaches('bloquee')
  // C'est meme la qu'ils servent le plus : une tache qui a brule trois appels
  // avant d'echouer ne se repare pas comme une qui a echoue net.
  const t = lireCompteurs('bloquee').taches.find((x) => x.tache === 't3')
  assert.equal(t.etat, 'blocked')
  assert.equal(t.appels, 1)
})

test('une tache relancee remplace ses chiffres, elle ne les double pas', () => {
  troisTaches('relance')
  noterTache({ pole: 'relance', tache: 't3', titre: 'Assembler', agent: 'sofia', ms: 45_000, appels: 2, bascules: 0, etat: 'done' })

  const c = lireCompteurs('relance')
  assert.equal(c.taches.length, 3, 'toujours trois taches')
  assert.equal(c.taches.find((t) => t.tache === 't3').ms, 45_000)
  assert.equal(c.cumul, 226_000)
})

test('les planchers : un appel au minimum, jamais de negatif', () => {
  noterTache({ pole: 'bornes', tache: 'x', titre: 'X', agent: 'a', ms: -5, appels: 0, bascules: -3, etat: 'done' })
  const t = lireCompteurs('bornes').taches[0]
  assert.equal(t.appels, 1)
  assert.equal(t.ms, 0)
  assert.equal(t.bascules, 0)
})

test('sans pole ou sans tache, on n ecrit rien', () => {
  assert.equal(noterTache({ tache: 't', agent: 'a', ms: 1 }), null)
  assert.equal(noterTache({ pole: 'p', agent: 'a', ms: 1 }), null)
})

test('un pole inconnu rend des listes vides, pas une erreur', () => {
  assert.deepEqual(lireCompteurs('jamais-vu'), {
    taches: [],
    agents: [],
    cumul: 0,
    appels: 0,
    bascules: 0,
  })
})

test('au-dela de vingt poles, les plus anciens partent', () => {
  // Un fichier qui grossit sans borne finit par etre relu a chaque tache, et
  // c'est pendant l'execution qu'on ne veut pas payer ca.
  for (let i = 0; i < 25; i++) {
    noterTache({ pole: `vague${i}`, tache: 'a', titre: 'A', agent: 'a', ms: 1000, appels: 1, bascules: 0, etat: 'done' })
  }
  const fichier = JSON.parse(fs.readFileSync(path.join(BAC.workspace, '.hub', 'compteurs.json'), 'utf8'))
  assert.equal(Object.keys(fichier).length, 20)
  assert.equal(lireCompteurs('vague24').taches.length, 1, 'le dernier ecrit reste')
  assert.equal(lireCompteurs('vague0').taches.length, 0, 'le plus ancien est parti')
})

test('oublier un pole', () => {
  noterTache({ pole: 'a-oublier', tache: 'a', titre: 'A', agent: 'a', ms: 1000, appels: 1, bascules: 0, etat: 'done' })
  assert.deepEqual(oublierCompteurs('a-oublier'), { oublie: true })
  assert.deepEqual(oublierCompteurs('jamais-vu'), { oublie: false })
  assert.equal(lireCompteurs('a-oublier').taches.length, 0)
})
