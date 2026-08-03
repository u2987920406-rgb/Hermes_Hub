/**
 * Les profils de memoire.
 *
 * Ce qui se teste ici, et rien d'autre : que le SOCLE NE SOIT JAMAIS PERDU. Un
 * profil qui remplacerait le fichier au lieu de s'ajouter au texte d'origine
 * effacerait les huit garde-fous sans que personne ne le voie - « ne jamais
 * inventer » disparaitrait d'un clic, et l'agent continuerait a repondre.
 * C'est la seule facon dont cette piece peut faire un vrai degat.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

const BAC = bacDeTest('profils')
const MEMOIRE = path.join(BAC.racine, 'memories')
fs.mkdirSync(MEMOIRE, { recursive: true })
const CHEMIN = path.join(MEMOIRE, 'MEMORY.md')
/** Le socle NU, pose par l'installateur avant que l'atelier ne s'y ajoute. */
const ORIGINE = path.join(MEMOIRE, 'MEMORY.socle.md')

const SOCLE = `# Regles de travail

- Rien d'irreversible sans mon accord.
- Ne jamais inventer.
`

const {
  listerProfils, lireProfil, appliquerProfil, enregistrerProfil,
  renommerProfil, supprimerProfil, poids,
} = await import('./profils.js')

function repartirDeZero() {
  fs.writeFileSync(ORIGINE, SOCLE)
  fs.writeFileSync(CHEMIN, SOCLE)
  const f = path.join(process.env.HERMES_WORKSPACE, '.hub', 'profils-memoire.json')
  fs.rmSync(f, { force: true })
}

// -----------------------------------------------------------------------------
// Le socle
// -----------------------------------------------------------------------------
test('tout niveau garde le socle, y compris le plus outille', () => {
  repartirDeZero()
  for (const id of ['essentiel', 'methodique', 'complet']) {
    const { contenu } = lireProfil('MEMORY.md', CHEMIN, id)
    assert.ok(contenu.includes('Ne jamais inventer.'), `« ${id} » a perdu le socle`)
  }
})

test('les niveaux se cumulent, du plus nu au plus outille', () => {
  repartirDeZero()
  const t = (id) => lireProfil('MEMORY.md', CHEMIN, id).contenu

  assert.equal(t('essentiel').trim(), SOCLE.trim())
  assert.ok(t('methodique').includes('## Methode'))
  assert.ok(!t('methodique').includes('## Rigueur'))
  assert.ok(t('complet').includes('## Methode') && t('complet').includes('## Rigueur'))

  // Strictement croissant : sinon « du plus basique au plus avance » est faux.
  const l = ['essentiel', 'methodique', 'complet'].map((id) => t(id).length)
  for (let i = 1; i < l.length; i++) assert.ok(l[i] > l[i - 1], `niveau ${i} n'ajoute rien`)
})

test('le socle nu prime sur le fichier installe', () => {
  // MEMORY.default.md est le fichier LIVRE, atelier compris - c'est le profil
  // par defaut, restaure par « Version d'origine ». Batir « Essentiel » dessus
  // le rendrait identique au fichier livre : la bulle proposerait un choix qui
  // ne change rien.
  repartirDeZero()
  fs.writeFileSync(path.join(MEMOIRE, 'MEMORY.default.md'), SOCLE + '\n## Atelier\n- Tester.\n')
  assert.ok(!lireProfil('MEMORY.md', CHEMIN, 'essentiel').contenu.includes('## Atelier'))
  fs.rmSync(path.join(MEMOIRE, 'MEMORY.default.md'))
})

test('sans version d origine, on refuse plutot que d inventer un socle', () => {
  // Le Hub ne connait aucun texte par defaut - c'est l'installateur qui les
  // possede. Sans son fichier, un niveau ne peut pas etre construit, et le dire
  // vaut mieux que de poser un socle invente ici.
  repartirDeZero()
  fs.rmSync(ORIGINE)
  assert.throws(() => lireProfil('MEMORY.md', CHEMIN, 'complet'), /version d'origine/)
  assert.deepEqual(listerProfils('MEMORY.md', CHEMIN).livres, [])
})

// -----------------------------------------------------------------------------
// Appliquer
// -----------------------------------------------------------------------------
test('appliquer ecrit le fichier et garde l etat precedent en .bak', () => {
  // Quelqu'un qui essaie un niveau pour voir doit pouvoir revenir a ce qu'il
  // avait ecrit.
  repartirDeZero()
  fs.writeFileSync(CHEMIN, SOCLE + '\n- Une regle a moi.\n')
  appliquerProfil('MEMORY.md', CHEMIN, 'complet')

  assert.ok(fs.readFileSync(CHEMIN, 'utf8').includes('## Rigueur'))
  assert.ok(fs.readFileSync(CHEMIN + '.bak', 'utf8').includes('Une regle a moi.'))
})

test('un profil inconnu est refuse par son nom', () => {
  repartirDeZero()
  assert.throws(() => appliquerProfil('MEMORY.md', CHEMIN, 'jamais-vu'), /jamais-vu/)
})

// -----------------------------------------------------------------------------
// Les siens
// -----------------------------------------------------------------------------
test('enregistrer sans nom donne Custom 1, puis Custom 2', () => {
  repartirDeZero()
  assert.equal(enregistrerProfil('MEMORY.md', CHEMIN, '').nom, 'Custom 1')
  fs.writeFileSync(CHEMIN, SOCLE + '\n- Autre chose.\n')
  assert.equal(enregistrerProfil('MEMORY.md', CHEMIN, '').nom, 'Custom 2')
})

test('un profil enregistre se relit tel quel', () => {
  repartirDeZero()
  fs.writeFileSync(CHEMIN, SOCLE + '\n- Ma ligne a moi.\n')
  const { id } = enregistrerProfil('MEMORY.md', CHEMIN, 'Le mien')
  assert.match(lireProfil('MEMORY.md', CHEMIN, id).contenu, /Ma ligne a moi\./)
})

test('on ne peut pas voler le nom d un profil livre', () => {
  // Sans ce refus, un « Par defaut » enregistre par-dessus masquerait celui qui
  // est livre : la liste montrerait deux entrees du meme nom.
  repartirDeZero()
  assert.throws(() => enregistrerProfil('MEMORY.md', CHEMIN, 'Essentiel'), /profil livre/)
  const { id } = enregistrerProfil('MEMORY.md', CHEMIN, 'Le mien')
  assert.throws(() => renommerProfil('MEMORY.md', id, 'Complet'), /profil livre/)
})

test('un fichier vide ne s enregistre pas', () => {
  repartirDeZero()
  fs.writeFileSync(CHEMIN, '   \n')
  assert.throws(() => enregistrerProfil('MEMORY.md', CHEMIN, 'Vide'), /rien a enregistrer/)
})

test('renommer deplace l entree et garde le contenu', () => {
  repartirDeZero()
  fs.writeFileSync(CHEMIN, SOCLE + '\n- Ma ligne a moi.\n')
  const { id } = enregistrerProfil('MEMORY.md', CHEMIN, 'Custom 1')
  const apres = renommerProfil('MEMORY.md', id, 'Kuchu')

  assert.equal(apres.id, 'kuchu')
  assert.match(lireProfil('MEMORY.md', CHEMIN, 'kuchu').contenu, /Ma ligne a moi\./)
  assert.throws(() => lireProfil('MEMORY.md', CHEMIN, id), /introuvable/)
})

test('deux profils ne peuvent pas porter le meme nom', () => {
  repartirDeZero()
  enregistrerProfil('MEMORY.md', CHEMIN, 'Bureau')
  const { id } = enregistrerProfil('MEMORY.md', CHEMIN, 'Maison')
  assert.throws(() => renommerProfil('MEMORY.md', id, 'Bureau'), /existe deja/)
})

test('supprimer retire de la liste, et deux fois ne passe pas', () => {
  repartirDeZero()
  const { id } = enregistrerProfil('MEMORY.md', CHEMIN, 'Jetable')
  supprimerProfil('MEMORY.md', id)
  assert.deepEqual(listerProfils('MEMORY.md', CHEMIN).miens, [])
  assert.throws(() => supprimerProfil('MEMORY.md', id), /introuvable/)
})

// -----------------------------------------------------------------------------
// USER.md et SOUL.md
// -----------------------------------------------------------------------------
test('USER.md et SOUL.md n ont aucun niveau livre', () => {
  // On ne peut pas deviner qui est quelqu'un, et un nouveau venu n'a aucun avis
  // sur le caractere de son agent. Ces deux-la n'ont que les profils qu'on y
  // enregistre.
  repartirDeZero()
  const u = path.join(MEMOIRE, 'USER.md')
  fs.writeFileSync(u, '# Qui je suis\n\n- Prenom : essai\n')
  assert.deepEqual(listerProfils('USER.md', u).livres, [])

  const { id } = enregistrerProfil('USER.md', u, 'Bureau')
  assert.equal(listerProfils('USER.md', u).miens[0].id, id)
  // Et ils ne se melangent pas d'un fichier a l'autre.
  assert.deepEqual(listerProfils('MEMORY.md', CHEMIN).miens, [])
})

// -----------------------------------------------------------------------------
// Le poids
// -----------------------------------------------------------------------------
test('le poids ne compte pas les lignes vides', () => {
  // Il sert a montrer ce qu'on relit a chaque demarrage : compter les blancs
  // gonflerait le chiffre sans que rien ne soit lu de plus.
  assert.deepEqual(poids('une\n\n\ndeux\n'), { lignes: 2, jetons: Math.round(11 / 3.6) })
  assert.deepEqual(poids(''), { lignes: 0, jetons: 0 })
})

test('le poids annonce est celui du fichier tel qu il est', () => {
  repartirDeZero()
  appliquerProfil('MEMORY.md', CHEMIN, 'complet')
  const etat = listerProfils('MEMORY.md', CHEMIN)
  const complet = etat.livres.find((n) => n.id === 'complet')
  assert.equal(etat.actuel.lignes, complet.lignes)
  assert.ok(etat.actuel.jetons > 0)
})
