/**
 * La memoire arrive-t-elle aux agents ?
 *
 * Ces tests montent un faux HERMES_HOME dans le dossier temporaire et n'appellent
 * jamais `hermes` : il n'y a rien a lui demander ici, la propagation est une
 * copie de fichiers. Ils peuvent donc aller jusqu'au bout, contrairement a ceux
 * de la sauvegarde.
 *
 * Le cas qui compte est le premier : c'est exactement l'etat mesure sur le poste
 * de kuchu le 03/08/2026 - un `USER.md` rempli chez `default`, le gabarit vide
 * partout ailleurs.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { cheminAgent, estPartage, etatPropagation, propager } from './memoire-equipe.js'

const RACINE = path.join(os.tmpdir(), 'hub-test-memoire-equipe')

const REMPLI = '# Qui je suis\n\n- Prenom : raf\n- Metier : artisan\n'
const GABARIT = '# Qui je suis\n\n- Prenom : raf\n- Metier :\n'

/** Un home neuf a chaque test : les copies laissent des traces. */
function poserHome(agents, { source = REMPLI, chez = GABARIT } = {}) {
  fs.rmSync(RACINE, { recursive: true, force: true })
  const home = path.join(RACINE, 'hermes')
  fs.mkdirSync(path.join(home, 'memories'), { recursive: true })
  if (source !== null) fs.writeFileSync(cheminAgent('USER.md', 'default', home), source)
  for (const a of agents) {
    fs.mkdirSync(path.join(home, 'profiles', a, 'memories'), { recursive: true })
    if (chez !== null) fs.writeFileSync(cheminAgent('USER.md', a, home), chez)
  }
  return home
}

test('le cas mesure : un agent rempli, les autres avec le gabarit vide', () => {
  const home = poserHome(['sofia', 'karim'])

  const avant = etatPropagation('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(avant.enRetard, ['sofia', 'karim'])
  assert.deepEqual(avant.aJour, [])

  const r = propager('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(r.portee, ['sofia', 'karim'])
  assert.equal(r.echecs.length, 0)

  assert.equal(fs.readFileSync(cheminAgent('USER.md', 'sofia', home), 'utf8'), REMPLI)
  assert.equal(fs.readFileSync(cheminAgent('USER.md', 'karim', home), 'utf8'), REMPLI)

  const apres = etatPropagation('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(apres.enRetard, [])
  assert.deepEqual(apres.aJour, ['sofia', 'karim'])
})

test("SOUL.md ne se propage jamais : le caractere de Sofia n'est pas celui de Karim", () => {
  const home = poserHome(['sofia'])
  assert.equal(estPartage('SOUL.md'), false)

  const r = propager('SOUL.md', ['default', 'sofia'], { home })
  assert.equal(r.partage, false)
  assert.deepEqual(r.portee, [])

  const etat = etatPropagation('SOUL.md', ['default', 'sofia'], { home })
  assert.equal(etat.partage, false)
})

test("l'ancienne version part en .bak : on n'ecrase pas une memoire sans filet", () => {
  const home = poserHome(['sofia'])
  propager('USER.md', ['default', 'sofia'], { home })

  const bak = `${cheminAgent('USER.md', 'sofia', home)}.bak`
  assert.equal(fs.existsSync(bak), true)
  assert.equal(fs.readFileSync(bak, 'utf8'), GABARIT)
})

test('un agent deja a jour ne perd pas son .bak sous une copie de lui-meme', () => {
  const home = poserHome(['sofia'])
  propager('USER.md', ['default', 'sofia'], { home })
  const bak = `${cheminAgent('USER.md', 'sofia', home)}.bak`
  assert.equal(fs.readFileSync(bak, 'utf8'), GABARIT)

  // Deuxieme passage : rien a faire, et surtout le filet doit tenir.
  const r = propager('USER.md', ['default', 'sofia'], { home })
  assert.deepEqual(r.portee, [])
  assert.equal(fs.readFileSync(bak, 'utf8'), GABARIT)
})

test('un agent sans dossier memories le recoit quand meme', () => {
  const home = poserHome(['sofia'], { chez: null })
  fs.rmSync(path.join(home, 'profiles', 'sofia', 'memories'), { recursive: true, force: true })

  const r = propager('USER.md', ['default', 'sofia'], { home })
  assert.deepEqual(r.portee, ['sofia'])
  assert.equal(fs.readFileSync(cheminAgent('USER.md', 'sofia', home), 'utf8'), REMPLI)
})

test('sans fichier source, on refuse au lieu de propager du vide', () => {
  const home = poserHome(['sofia'], { source: null })
  assert.throws(() => propager('USER.md', ['default', 'sofia'], { home }), /rien a propager/)
  // Et surtout : le fichier de sofia n'a pas ete efface.
  assert.equal(fs.readFileSync(cheminAgent('USER.md', 'sofia', home), 'utf8'), GABARIT)
})

test('`default` est la source : il ne se recopie pas sur lui-meme', () => {
  const home = poserHome([])
  const r = propager('USER.md', ['default'], { home })
  assert.deepEqual(r.portee, [])
  assert.equal(fs.existsSync(`${cheminAgent('USER.md', 'default', home)}.bak`), false)
})

test('un profil illisible ne prive pas les autres', () => {
  const home = poserHome(['sofia', 'karim'])
  // Un dossier la ou le fichier devrait etre : l'ecriture echouera pour lui seul.
  const dest = cheminAgent('USER.md', 'karim', home)
  fs.rmSync(dest, { force: true })
  fs.mkdirSync(dest, { recursive: true })

  const r = propager('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(r.portee, ['sofia'])
  assert.equal(r.echecs.length, 1)
  assert.equal(r.echecs[0].agent, 'karim')
  assert.equal(fs.readFileSync(cheminAgent('USER.md', 'sofia', home), 'utf8'), REMPLI)
})

test.after(() => fs.rmSync(RACINE, { recursive: true, force: true }))
