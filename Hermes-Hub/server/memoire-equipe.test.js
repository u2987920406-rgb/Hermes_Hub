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

import { cheminAgent, estPartage, etatPropagation, pourEquipe, propager } from './memoire-equipe.js'

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

// -----------------------------------------------------------------------------
// Ce qui reste chez Hermes
// -----------------------------------------------------------------------------
/**
 * Le cas reel du 06/08/2026 : les regles de commit vivent dans `MEMORY.md`, et
 * elles ne concernent qu'Hermes. On ne pouvait pas les retirer du fichier -
 * `default` EST Hermes - donc c'est la copie qui les laisse derriere.
 */
const AVEC_MARQUE = `# Regles de travail

## DOIT
- Tester avant d'annoncer que c'est fini

## Git et reprise <!-- hermes-seul -->
- Sous git: finir chaque commit par "Ensuite :"
- ADM.md en cumulatif

## PDF
Ouvre toujours celui que tu viens de produire.
`

test("une section marquee ne part pas a l'equipe", () => {
  const rendu = pourEquipe(AVEC_MARQUE)
  assert.ok(!rendu.includes('Git et reprise'))
  assert.ok(!rendu.includes('Ensuite'))
  // Et surtout : le reste passe entier, avant ET apres la coupe.
  assert.ok(rendu.includes("Tester avant d'annoncer"))
  assert.ok(rendu.includes('Ouvre toujours celui que tu viens de produire'))
})

test('un fichier sans marque traverse inchange', () => {
  // La regle ne doit rien changer a ce qui existait : `USER.md` et tout fichier
  // ecrit avant elle se propagent comme avant, a l'octet pres.
  assert.equal(pourEquipe(REMPLI), REMPLI)
})

test('la marque retient jusqu au prochain titre de meme niveau', () => {
  // Le piege : couper trop loin emporterait la section suivante en silence.
  const rendu = pourEquipe('## A <!-- hermes-seul -->\nx\n\n### sous-titre\ny\n\n## B\nz\n')
  assert.ok(!rendu.includes('x') && !rendu.includes('y'), 'le sous-titre part avec sa section')
  assert.ok(rendu.includes('## B') && rendu.includes('z'), 'la section suivante reste')
})

test('un fichier Windows en CRLF est coupe comme les autres', () => {
  /**
   * ⚠ LE TEST QUI MANQUAIT, ET QUI A LAISSE PASSER LA PANNE.
   *
   * Tous les cas ci-dessus sont ecrits en `\n` pur, et ils passaient pendant
   * que la vraie coupe ne faisait RIEN sur le `MEMORY.md` de kuchu. En
   * JavaScript `.` ne franchit pas un `\r` : le motif de titre ne reconnaissait
   * aucun titre dans un fichier Windows, donc rien n'etait retenu. Mesure du
   * 06/08/2026 : un seul caractere de difference au lieu d'une section.
   *
   * Windows ecrit en CRLF par defaut. Ne tester qu'en `\n`, sur ce poste,
   * revient a ne tester aucun fichier reel.
   */
  const rendu = pourEquipe(AVEC_MARQUE.replace(/\n/g, '\r\n'))
  assert.ok(!rendu.includes('Ensuite'), 'la section marquee doit partir, CRLF ou non')
  assert.ok(rendu.includes('Ouvre toujours celui que tu viens de produire'))
})

test('la coupe ne laisse pas de trou de lignes vides', () => {
  // Un fichier qui differe de sa source par un blanc ferait afficher « en
  // retard » a tout le monde, pour rien.
  assert.ok(!pourEquipe(AVEC_MARQUE).includes('\n\n\n'))
})

test('propager copie la version rognee, et le compteur retombe a zero', () => {
  const home = poserHome(['sofia', 'karim'], { source: AVEC_MARQUE, chez: '# vide\n' })

  const r = propager('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(r.portee, ['sofia', 'karim'])
  assert.equal(r.retenu, true, 'la propagation doit dire qu elle a retenu quelque chose')

  const chezSofia = fs.readFileSync(cheminAgent('USER.md', 'sofia', home), 'utf8')
  assert.ok(!chezSofia.includes('Ensuite'))
  assert.ok(chezSofia.includes('PDF'))

  // LE CAS QUI COMPTE : on compare a ce qui SERA copie, pas au fichier
  // d'Hermes. Sinon les agents resteraient « en retard » a jamais, puisque
  // aucun ne recevra jamais la section retenue - et un compteur qui ne retombe
  // jamais a zero est un compteur qu'on cesse de lire.
  const apres = etatPropagation('USER.md', ['default', 'sofia', 'karim'], { home })
  assert.deepEqual(apres.enRetard, [])
  assert.equal(apres.aJour.length, 2)
  assert.equal(apres.retenu, true)
})

test("Hermes garde sa section : la source n'est jamais reecrite", () => {
  const home = poserHome(['sofia'], { source: AVEC_MARQUE, chez: '# vide\n' })
  propager('USER.md', ['default', 'sofia'], { home })

  const chezHermes = fs.readFileSync(cheminAgent('USER.md', 'default', home), 'utf8')
  assert.equal(chezHermes, AVEC_MARQUE, "le fichier d'Hermes ne bouge pas d'un octet")
})

test.after(() => fs.rmSync(RACINE, { recursive: true, force: true }))
