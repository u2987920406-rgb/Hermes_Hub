/**
 * Ce que la simulation lit dans une tache, avant que rien ne tourne.
 *
 * Trois lectures, et les trois commandent des decisions serieuses : quels
 * fichiers seraient touches, ce que la tache s'engage a produire, et quel
 * risque elle porte. Chacune est un motif d'expression reguliere - donc
 * exactement le genre de code qui se casse sans bruit et qu'aucune relecture
 * n'attrape.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { bacDeTest } from './bac-essai.js'

bacDeTest('simulation')
const { lireFichiers, lireLivrables, lireCapacites } = await import('./simulation.js')

const chemins = (corps) => lireFichiers(corps).map((f) => f.chemin)

// -----------------------------------------------------------------------------
// Les chemins
// -----------------------------------------------------------------------------
test('un chemin absolu Windows est lu en entier', () => {
  // Le `:` de `C:` n'appartient a aucune classe de caracteres d'un chemin, et
  // le motif exige un blanc devant : un chemin absolu ne rendait donc RIEN.
  // La simulation affichait des chemins tronques, et le repechage ne trouvait
  // aucun dossier a fouiller - or c'est le cas qu'il vise.
  assert.deepEqual(chemins('Lis C:/data/source.csv et ecris rapport.md'),
                   ['C:/data/source.csv', 'rapport.md'])
  assert.deepEqual(chemins('Lis C:\\data\\source.csv et ecris rapport.md'),
                   ['C:/data/source.csv', 'rapport.md'])
})

test('la lettre de lecteur est acceptee en minuscule', () => {
  assert.ok(chemins('Lis d:/travail/notes.txt et produis resume.md')
    .includes('d:/travail/notes.txt'))
})

test('un chemin a espaces est lu s il est entre guillemets', () => {
  // Nu, il n'y a pas de remede : rien ne distingue l'espace d'un nom de
  // dossier de celui qui termine le chemin. Entre guillemets, si.
  assert.ok(chemins(`Lis 'C:/Mes Documents/base client.csv' et ecris bilan.md`)
    .includes('C:/Mes Documents/base client.csv'))
})

test('un chemin relatif et un nom nu restent lus', () => {
  assert.deepEqual(chemins('Lis donnees/source.csv et produis sortie/rapport.md'),
                   ['donnees/source.csv', 'sortie/rapport.md'])
  assert.deepEqual(chemins('Produis dossier.pdf'), ['dossier.pdf'])
})

test('un fichier n est compte qu une fois', () => {
  assert.deepEqual(chemins('Ecris rapport.md puis relis rapport.md'), ['rapport.md'])
})

// -----------------------------------------------------------------------------
// Les livrables
// -----------------------------------------------------------------------------
test('la source lue n est pas un livrable', () => {
  // `lireLivrables` ecarte ce qui est designe comme lecture : sans ce tri, la
  // garde exigerait que la tache ait produit le fichier qu'on lui a donne.
  const corps = 'Lis C:/data/source.csv et produis rapport.md'
  assert.deepEqual(lireLivrables(corps).map((f) => f.chemin), ['rapport.md'])
})

// -----------------------------------------------------------------------------
// Les capacites, donc le risque
// -----------------------------------------------------------------------------
test('un accent ne cache plus une ecriture', () => {
  // Le 03/08/2026 : « Générer le PDF » est passe pour vert parce que le motif
  // d'ecriture ne reconnaissait pas le mot accentue. Un faux vert qui s'affiche
  // est une erreur d'affichage ; un faux vert qui autorise est une action non
  // voulue.
  const ids = (t) => lireCapacites(t).map((c) => c.id)
  assert.ok(ids({ titre: 'Générer le PDF', corps: '' }).includes('ecriture'))
  assert.ok(ids({ titre: 'Rédiger la note', corps: '' }).includes('ecriture'))
  assert.ok(ids({ titre: 'Créer le dossier', corps: '' }).includes('ecriture'))
})

test('une tache qui ne fait que lire n ecrit pas', () => {
  const c = lireCapacites({ titre: 'Analyser les donnees du match', corps: '' })
  assert.ok(c.some((x) => x.id === 'lecture'))
  assert.ok(!c.some((x) => x.id === 'ecriture'))
})

test('ecrire et lancer une commande sont rouges, le web est orange', () => {
  const risque = (titre) => {
    const c = lireCapacites({ titre, corps: '' })
    return Object.fromEntries(c.map((x) => [x.id, x.risque]))
  }
  assert.equal(risque('Ecrire le rapport').ecriture, 'rouge')
  assert.equal(risque('Lancer un script python').terminal, 'rouge')
  assert.equal(risque('Chercher sur le web').web, 'orange')
  assert.equal(risque('Lire le fichier').lecture, 'vert')
})
