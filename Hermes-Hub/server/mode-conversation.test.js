/**
 * Discussion : la seule promesse que le Hub fait a la place d'un modele.
 *
 * Tout ce qui suit garde une facon de la trahir. Deux assertions comptent plus
 * que les autres, et ce sont celles qu'on n'aurait pas ecrites en relisant le
 * code : **le laissez-passer coupe ne leve pas la garantie**, et **une lecture
 * douteuse du fichier ne l'active pas**. La premiere protege l'utilisateur, la
 * seconde le protege d'une confiance qu'il n'a pas demandee.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

bacDeTest('mode-conversation')
const { lireMode, ecrireMode, enDiscussion, MODES } = await import('./mode-conversation.js')
const { arbitrer, ecrireReglage } = await import('./laissez-passer.js')
const { HUB_DIR } = await import('./workspace.js')

const OPTIONS = [
  { id: 'allow_once', libelle: 'Allow once', genre: 'allow_once' },
  { id: 'allow_always', libelle: 'Allow always', genre: 'allow_always' },
  { id: 'reject_once', libelle: 'Reject', genre: 'reject_once' },
]

test('Atelier par defaut : personne ne decouvre un matin que rien ne s ecrit', () => {
  assert.deepEqual(lireMode(), { mode: 'atelier' })
  assert.equal(enDiscussion(), false)
})

test('le mode s ecrit, se relit, et survit a la relecture', () => {
  assert.deepEqual(ecrireMode('discussion'), { mode: 'discussion' })
  assert.equal(enDiscussion(), true)
  assert.deepEqual(ecrireMode('atelier'), { mode: 'atelier' })
})

test('un mode inconnu retombe sur Atelier, jamais sur la garantie', () => {
  // Le doute doit rendre le comportement ORDINAIRE. Retomber sur Discussion
  // ferait croire a une protection qu'on n'a pas demandee - et le jour ou elle
  // s'expliquerait, ce serait par « pourquoi rien ne marche ».
  assert.deepEqual(ecrireMode('bavardage'), { mode: 'atelier' })
  assert.deepEqual(ecrireMode(undefined), { mode: 'atelier' })
  assert.deepEqual(MODES, ['atelier', 'discussion'])
})

test('un fichier abime ne vaut pas une garantie', () => {
  fs.mkdirSync(HUB_DIR, { recursive: true })
  fs.writeFileSync(path.join(HUB_DIR, 'mode-conversation.json'), '{ ceci n est pas du json')
  assert.deepEqual(lireMode(), { mode: 'atelier' })
  ecrireMode('atelier')
})

test('en Discussion, ce qui lit passe encore : on n a pas rendu l agent muet', () => {
  ecrireMode('discussion')
  for (const genre of ['read', 'search', 'think']) {
    const r = arbitrer({ kind: genre }, OPTIONS)
    assert.equal(r.refus, null, genre)
    assert.equal(r.auto?.id, 'allow_once', genre)
  }
  ecrireMode('atelier')
})

test('en Discussion, tout le reste est refuse - sans etre pose', () => {
  ecrireMode('discussion')
  // L'orange aussi, et c'est voulu : `move` deplace un fichier, `fetch` fait
  // sortir quelque chose de la machine. La promesse tenue a l'ecran est « il ne
  // peut que lire », pas « il n ecrit pas dans le dossier courant ».
  for (const genre of ['fetch', 'move', 'switch_mode', 'edit', 'delete', 'execute', 'inconnu']) {
    const r = arbitrer({ kind: genre }, OPTIONS)
    assert.ok(r.refus, `${genre} devrait etre refuse`)
    assert.equal(r.auto, null, genre)
    assert.equal(r.refus.option, 'reject_once', `${genre} : refus explicite, pas annulation`)
  }
  ecrireMode('atelier')
})

test('refuser sans option de refus : on annule, mais on refuse quand meme', () => {
  ecrireMode('discussion')
  const r = arbitrer({ kind: 'edit' }, [{ id: 'allow_once', genre: 'allow_once' }])
  assert.ok(r.refus, 'la garantie ne depend pas de ce qu Hermes propose')
  assert.equal(r.refus.option, null, 'a l appelant d annuler')
  ecrireMode('atelier')
})

test('COUPER LE LAISSEZ-PASSER NE LEVE PAS LA GARANTIE', () => {
  // L'assertion qui vaut le module. Le laissez-passer se coupe pour revenir a
  // « tout demander » ; s'il levait Discussion en passant, la promesse ecrite
  // sous l'interrupteur deviendrait fausse sans que rien a l'ecran ne bouge.
  ecrireMode('discussion')
  ecrireReglage(false)

  const r = arbitrer({ kind: 'edit', title: 'Write rapport.md' }, OPTIONS)
  assert.ok(r.refus, 'refuse malgre le laissez-passer coupe')
  assert.equal(r.auto, null)

  // Et l'inverse tient aussi : hors Discussion, couper rend bien la main.
  ecrireMode('atelier')
  const libre = arbitrer({ kind: 'edit' }, OPTIONS)
  assert.equal(libre.refus, null)
  assert.equal(libre.options.length, 3, 'les options restent intactes')

  ecrireReglage(true)
})

test('revenir en Atelier rend exactement le comportement d avant', () => {
  ecrireMode('atelier')
  const rouge = arbitrer({ kind: 'delete' }, OPTIONS)
  assert.equal(rouge.refus, null)
  assert.deepEqual(rouge.options.map((o) => o.id), ['allow_once', 'reject_once'])
  assert.equal(arbitrer({ kind: 'read' }, OPTIONS).auto?.id, 'allow_once')
})
