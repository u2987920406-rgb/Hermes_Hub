/**
 * Ce qu'on apprend d'un pole, et ce qu'on refuse d'apprendre.
 *
 * Le refus compte autant que l'apprentissage : une competence tiree d'un pole
 * a moitie echoue serait proposee plus tard, en confiance, pour rejouer une
 * forme qui n'a jamais fonctionne.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

const BAC = bacDeTest('competences')
const { apprendre, lireCompetences, proposerPour, oublierCompetence } = await import(
  './competences.js'
)

const SKILLS = path.join(BAC.workspace, 'Vault', 'Skills')

const AGENTS = new Map([
  ['a-analyste', { metier: 'Analyse' }],
  ['b-redacteur', { metier: 'Redaction' }],
  ['c-metteur', { metier: 'Mise en page' }],
])

function pole(etats = ['done', 'done', 'done']) {
  return {
    id: 't_essai',
    titre: 'Bilan chiffre des ventes du trimestre puis document PDF pour la direction',
    taches: [
      { id: 't1', titre: 'Analyser le fichier des ventes', agent: 'a-analyste', etat: etats[0] },
      { id: 't2', titre: 'Rediger la note de synthese', agent: 'b-redacteur', etat: etats[1] },
      { id: 't3', titre: 'Mettre en page et generer le PDF', agent: 'c-metteur', etat: etats[2] },
    ],
    liens: [
      { de: 't1', vers: 't2' },
      { de: 't2', vers: 't3' },
    ],
  }
}

const vider = () => fs.rmSync(SKILLS, { recursive: true, force: true })

test('un pole abouti devient une fiche dans le Coffre', () => {
  vider()
  const r = apprendre(pole(), AGENTS)
  assert.equal(r.etapes, 3)
  assert.ok(fs.existsSync(r.fichier), 'la fiche est ecrite')

  const texte = fs.readFileSync(r.fichier, 'utf8')
  assert.ok(texte.startsWith('---'), 'elle porte un frontmatter')
  assert.ok(/^type: skill$/m.test(texte), 'du bon type pour le Coffre')
  assert.ok(/^tags: \[.+\]$/m.test(texte), 'avec des tags remplis')
  assert.ok(/^pole: t_essai$/m.test(texte), 'et le pole d origine')
})

test('les etapes sont dans l ordre du graphe, pas de la liste', () => {
  vider()
  const p = pole()
  // On melange la liste : seul l'ordre des liens doit compter.
  p.taches = [p.taches[2], p.taches[0], p.taches[1]]
  const r = apprendre(p, AGENTS)
  const texte = fs.readFileSync(r.fichier, 'utf8')
  const metiers = [...texte.matchAll(/^\| \d+ \| ([^|]+) \|/gm)].map((m) => m[1].trim())
  assert.deepEqual(metiers, ['Analyse', 'Redaction', 'Mise en page'])
})

test('un pole avec une tache bloquee ne s apprend pas', () => {
  vider()
  assert.throws(() => apprendre(pole(['done', 'blocked', 'done']), AGENTS), /pas alle au bout/)
  assert.equal(lireCompetences().length, 0, 'et rien n est ecrit')
})

test('un pole inachevé ne s apprend pas non plus', () => {
  vider()
  assert.throws(() => apprendre(pole(['done', 'done', 'todo']), AGENTS), /pas alle au bout/)
})

test('le Coffre se relit, sans les fiches sans tag', () => {
  vider()
  apprendre(pole(), AGENTS)
  // Le gabarit vierge livre par l'installateur, et une note ecrite a la main :
  // ni l'un ni l'autre ne sont des competences reconnaissables.
  fs.writeFileSync(path.join(SKILLS, 'gabarit.md'), '---\ntype: skill\ntags: []\n---\n# Vide\n')
  fs.writeFileSync(path.join(SKILLS, 'a-la-main.md'), '# Une note sans frontmatter\n')

  const c = lireCompetences()
  assert.equal(c.length, 1, 'seule la competence taggee est retenue')
  assert.equal(c[0].etapes, 3)
})

test('une demande du meme genre retrouve la competence', () => {
  vider()
  apprendre(pole(), AGENTS)
  const p = proposerPour(
    'Produis un bilan des ventes du trimestre et un PDF pour la direction',
  )
  assert.equal(p.length, 1)
  assert.ok(p[0].score >= 2, 'au moins deux mots en commun')
})

test('une demande sans rapport ne propose rien', () => {
  vider()
  apprendre(pole(), AGENTS)
  assert.deepEqual(proposerPour('Compose une chanson sur la pluie et enregistre la melodie'), [])
})

test('un seul mot commun ne suffit pas', () => {
  // Deux demandes qui partagent « rapport » n'ont rien a voir. Le seuil est a
  // deux mots porteurs, sinon on proposerait n'importe quoi a n'importe qui.
  vider()
  apprendre(pole(), AGENTS)
  assert.deepEqual(proposerPour('Range le trimestre dans le calendrier'), [])
})

test('une demande trop courte ne propose rien', () => {
  vider()
  apprendre(pole(), AGENTS)
  assert.deepEqual(proposerPour('ventes'), [])
})

test('oublier une competence', () => {
  vider()
  const r = apprendre(pole(), AGENTS)
  const nom = path.basename(r.fichier)
  assert.deepEqual(oublierCompetence(nom), { oubliee: nom })
  assert.equal(lireCompetences().length, 0)
  assert.throws(() => oublierCompetence(nom), /deja partie/)
})

test('pas de dossier Skills : aucune competence, pas une erreur', () => {
  vider()
  assert.deepEqual(lireCompetences(), [])
  assert.deepEqual(proposerPour('une demande quelconque sur les ventes'), [])
})
