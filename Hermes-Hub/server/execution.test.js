/**
 * La preuve par le disque, et le filet sous elle.
 *
 * Deux regles qui se repondent : `livrablesManquants` bloque une tache qui
 * n'a pas produit ce qu'elle annoncait, `repecher` va d'abord chercher ce qui
 * est tombe a cote. Chaque cas garde un incident date du 03/08/2026 - les
 * commentaires nomment lequel.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest, poser, vider } from './bac-essai.js'

const BAC = bacDeTest('execution')
const POLE = path.join(BAC.workspace, 'Poles', 'Fiche de Lucas Ferrand')
fs.mkdirSync(POLE, { recursive: true })

const { repecher, livrablesManquants } = await import('./execution.js')

/** L'enonce reel du maquettiste : un chemin absolu vers sa source. */
const TACHE = {
  titre: 'Assembler le dossier dirigeants',
  corps:
    'Genere le dossier de presentation en PDF a partir des donnees.\n' +
    'Lis C:/bac/workspace/donnees_match_lucas_ferrand.md\n' +
    'Produis dossier_dirigeants.pdf',
}

const WS = BAC.workspace
const DEBUT = () => Date.now() - 60_000
const nettoyer = () => {
  vider(WS)
  vider(POLE)
}

test.afterEach(nettoyer)

test('le livrable ecrit a la racine rentre dans le pole', () => {
  // Le cas du maquettiste, 03/08 02:06 : 117 ko de vrai dossier, poses a cote
  // de leur source, et la tache bloquee pour livrable introuvable.
  poser(WS, 'dossier_dirigeants.pdf', 'DOSSIER DIRIGEANTS - Lucas Ferrand')

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), ['dossier_dirigeants.pdf'])
  assert.ok(fs.existsSync(path.join(POLE, 'dossier_dirigeants.pdf')), 'arrive dans le pole')
  assert.ok(!fs.existsSync(path.join(WS, 'dossier_dirigeants.pdf')), 'ne traine plus a la racine')
  assert.equal(livrablesManquants(TACHE, POLE, DEBUT()), null, 'la tache passe la garde')
})

test('un fichier de la veille n est pas repeche', () => {
  // Sans cette borne, une tache qui echoue emporterait dans le pole un fichier
  // de l'utilisateur qui portait le meme nom depuis hier.
  poser(WS, 'dossier_dirigeants.pdf', 'le PDF pose hier', 24 * 3600_000)

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), [])
  assert.ok(fs.existsSync(path.join(WS, 'dossier_dirigeants.pdf')), 'reste a sa place')
})

test('on ne ramasse pas ce que la tache n a pas reclame', () => {
  poser(WS, 'notes_perso.pdf', 'rien a voir')

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), [])
  assert.ok(fs.existsSync(path.join(WS, 'notes_perso.pdf')))
})

test('un livrable deja bien range ne declenche rien', () => {
  poser(POLE, 'dossier_dirigeants.pdf', 'DOSSIER DIRIGEANTS - deja au bon endroit')
  poser(WS, 'dossier_dirigeants.pdf', 'un homonyme a la racine')

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), [])
  assert.ok(fs.existsSync(path.join(WS, 'dossier_dirigeants.pdf')), 'la racine est intacte')
})

test('un livrable creux est repeche, puis bloque pour son aveu', () => {
  // Le cas de Karim : `avis_recrutement.md` ecrit, et disant « Statut : Bloque
  // - donnees manquantes ». La tache passait `done` parce que la preuve ne
  // regardait que le NOM du fichier.
  //
  // Un .md et non un PDF : `livrableEnCreux` ne lit un binaire que par son
  // texte affiche, et du markdown dans un faux PDF ne dirait rien.
  const avis = {
    titre: 'Rediger l avis de recrutement',
    corps: 'Redige avis_recrutement.md a partir des donnees du match.',
  }
  poser(WS, 'avis_recrutement.md', '**Statut :** Bloque - donnees manquantes.')

  assert.deepEqual(repecher(avis, POLE, DEBUT()), ['avis_recrutement.md'])
  // Bloque avec sa vraie raison - « il avoue » plutot que « il n'existe pas ».
  assert.equal(livrablesManquants(avis, POLE, DEBUT())?.motif, 'creux')
})

test('un homonyme perime du pole ne se fait pas passer pour le travail du jour', () => {
  // Le defaut trouve au premier essai reel du repechage, 03/08 04:04. Un PDF
  // du run precedent dormait dans le pole ; le nom etait donc pris, rien n'a
  // paru manquer, rien n'a ete repeche - et la garde a valide la tache sur un
  // fichier qu'elle n'avait pas produit. Le travail du jour est reste dehors.
  poser(POLE, 'dossier_dirigeants.pdf', 'le PDF du run precedent', 2 * 3600_000)
  poser(WS, 'dossier_dirigeants.pdf', 'DOSSIER DIRIGEANTS - le travail de ce tour-ci')

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), ['dossier_dirigeants.pdf'])
  assert.equal(
    fs.readFileSync(path.join(POLE, 'dossier_dirigeants.pdf'), 'utf8'),
    'DOSSIER DIRIGEANTS - le travail de ce tour-ci',
    'le frais ecrase le perime',
  )
  assert.equal(livrablesManquants(TACHE, POLE, DEBUT()), null)
})

test('un perime seul dans le pole ne suffit pas a passer la garde', () => {
  poser(POLE, 'dossier_dirigeants.pdf', 'le PDF du run precedent', 2 * 3600_000)

  assert.deepEqual(repecher(TACHE, POLE, DEBUT()), [], 'rien a repecher')
  assert.equal(livrablesManquants(TACHE, POLE, DEBUT())?.motif, 'absent')
  // Et la preuve du defaut d'origine : sans la borne, il passait encore.
  assert.equal(livrablesManquants(TACHE, POLE), null)
})

test('le livrable depose a cote d une source HORS de la racine est repeche', () => {
  // La racine du workspace ne couvrait le cas documente que par hasard : les
  // donnees d'essai s'y trouvaient. Un enonce qui pointe ailleurs y verrait son
  // livrable depose, et le filet restait muet.
  const ailleurs = path.join(BAC.racine, 'donnees-client')
  fs.mkdirSync(ailleurs, { recursive: true })
  poser(ailleurs, 'source.csv', 'des chiffres')

  const tache = {
    titre: 'Analyser les ventes du client',
    corps:
      `Lis ${ailleurs.replace(/\\/g, '/')}/source.csv et redige rapport_ventes.md ` +
      `dans le meme dossier.`,
  }
  poser(ailleurs, 'rapport_ventes.md', 'RAPPORT - chiffres du trimestre')

  assert.deepEqual(repecher(tache, POLE, DEBUT()), ['rapport_ventes.md'])
  assert.ok(fs.existsSync(path.join(POLE, 'rapport_ventes.md')), 'arrive dans le pole')
  assert.ok(!fs.existsSync(path.join(ailleurs, 'rapport_ventes.md')), 'ne traine plus la-bas')
  // La source, elle, ne bouge pas : on ne repeche que ce que la tache promet.
  assert.ok(fs.existsSync(path.join(ailleurs, 'source.csv')), 'la source reste')
  fs.rmSync(ailleurs, { recursive: true, force: true })
})

test('on ne repeche jamais depuis une racine de volume', () => {
  // Un enonce qui nommerait « C:/rapport.md » ferait designer `C:\` comme
  // endroit ou chercher. Deplacer un fichier depuis la ne se rattrape pas.
  const tache = {
    titre: 'Ecrire le rapport',
    corps: 'Redige C:/rapport_racine_test.md a partir des donnees.',
  }
  // Rien n'est pose a la racine du volume : on verifie seulement que l'appel
  // ne leve pas et ne ramene rien.
  assert.deepEqual(repecher(tache, POLE, DEBUT()), [])
})

test('une tache qui ne produit aucun fichier n a rien a prouver', () => {
  const analyse = { titre: 'Arbitrer entre les deux profils', corps: 'Donne ton avis argumente.' }
  poser(WS, 'dossier_dirigeants.pdf', 'peu importe')

  assert.deepEqual(repecher(analyse, POLE, DEBUT()), [])
  assert.equal(livrablesManquants(analyse, POLE, DEBUT()), null)
})
