/**
 * Le cerveau de chaque agent - et surtout ce que ce module refuse de faire.
 *
 * Deux assertions comptent plus que les autres, et ce sont celles qu'on
 * n'aurait pas ecrites en relisant le code :
 *
 *   - **rien n'est impose tant que rien n'a ete choisi.** Un Hub qui poserait
 *     un cerveau des le premier lancement changerait un reglage que personne ne
 *     lui a demande de changer ;
 *   - **une exception se retire.** Une case qu'on coche sans pouvoir la
 *     decocher n'est pas un reglage, c'est un piege - et c'est exactement la
 *     panne que le §7 redoutait, un specialiste regle expres qu'on ne peut plus
 *     defaire.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

bacDeTest('cerveau')
const { lireCerveau, ecrireCerveau, modelePour } = await import('./cerveau.js')
const { HUB_DIR } = await import('./workspace.js')

// Le choix vit sur le disque, donc il survit d'un test au suivant : sans cette
// remise a zero, chaque test lirait ce que le precedent a laisse - et le
// premier a echouer serait celui qui verifie qu'on part de rien.
test.beforeEach(() => fs.rmSync(path.join(HUB_DIR, 'cerveau.json'), { force: true }))

test('rien n est impose tant que rien n a ete choisi', () => {
  assert.deepEqual(lireCerveau(), { universel: null, exceptions: {} })
  assert.equal(modelePour('redacteur'), null, 'un fichier absent ne doit imposer aucun modele')
})

test('l universel vaut pour tout le monde', () => {
  ecrireCerveau({ universel: 'custom:glm-5.2:cloud' })
  assert.equal(modelePour('redacteur'), 'custom:glm-5.2:cloud')
  assert.equal(modelePour('maquettiste'), 'custom:glm-5.2:cloud')
  assert.equal(modelePour('default'), 'custom:glm-5.2:cloud')
})

test('une exception l emporte, et elle seule', () => {
  ecrireCerveau({ universel: 'custom:glm-5.2:cloud' })
  ecrireCerveau({ agent: 'maquettiste', modele: 'nous:anthropic/claude-opus-5' })

  assert.equal(modelePour('maquettiste'), 'nous:anthropic/claude-opus-5')
  assert.equal(modelePour('redacteur'), 'custom:glm-5.2:cloud', 'les autres ne bougent pas')
})

test('une exception se retire, et on retombe sur l universel', () => {
  ecrireCerveau({ universel: 'custom:glm-5.2:cloud' })
  ecrireCerveau({ agent: 'maquettiste', modele: 'nous:anthropic/claude-opus-5' })
  ecrireCerveau({ agent: 'maquettiste', modele: null })

  assert.deepEqual(lireCerveau().exceptions, {}, "l'exception doit disparaitre, pas valoir vide")
  assert.equal(modelePour('maquettiste'), 'custom:glm-5.2:cloud')
})

test('retirer l universel ne retire pas les exceptions', () => {
  // Elles ont ete posees EXPRES, une par une. Les emporter avec le reglage
  // general serait precisement l'ecrasement silencieux que ce module existe
  // pour rendre impossible.
  ecrireCerveau({ universel: 'custom:glm-5.2:cloud' })
  ecrireCerveau({ agent: 'clean', modele: 'custom:qwen2.5:0.5b' })
  ecrireCerveau({ universel: null })

  assert.equal(lireCerveau().universel, null)
  assert.equal(modelePour('clean'), 'custom:qwen2.5:0.5b')
  assert.equal(modelePour('redacteur'), null, 'sans universel, les autres redeviennent libres')
})

test('un fichier abime ne fait rien imposer', () => {
  // Le pire cas serait d'imposer un modele lu de travers : l'agent repondrait
  // par un autre cerveau que celui affiche, et rien ne le dirait.
  ecrireCerveau({ universel: '   ' })
  assert.equal(lireCerveau().universel, null, 'une chaine vide n est pas un choix')

  ecrireCerveau({ agent: 'redacteur', modele: '  ' })
  assert.deepEqual(lireCerveau().exceptions, {})
})
