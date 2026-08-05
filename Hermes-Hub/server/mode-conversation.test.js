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
import os from 'node:os'
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

// -----------------------------------------------------------------------------
// Le constat du greffon - ce qui autorise le bouton a promettre
// -----------------------------------------------------------------------------
/**
 * Deux assertions portent ce bloc, et ce sont les deux facons de rendre
 * l'interrupteur menteur : **la sonde d'essai ne vaut pas le heurtoir**, et
 * **un nom declare ne remplace pas un dossier pose**. Les autres verifient que
 * le doute retombe toujours du meme cote - absent, jamais present.
 */
const { lireGreffon, GREFFON } = await import('./mode-conversation.js')

const homeAvant = process.env.HERMES_HOME
let home

function poserConfig(texte, greffonsPoses = []) {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-home-'))
  process.env.HERMES_HOME = home
  fs.writeFileSync(path.join(home, 'config.yaml'), texte)
  for (const nom of greffonsPoses) {
    fs.mkdirSync(path.join(home, 'plugins', nom), { recursive: true })
  }
}

const AVEC_HEURTOIR = `model:\n  default: tencent/hy3:free\nplugins:\n  enabled:\n    - sonde-terminal\n    - ${'heurtoir'}\n  disabled: []\n  entries:\n    sonde-terminal:\n      allow_tool_override: false\n`

const SONDE_SEULE = `plugins:\n  enabled:\n    - sonde-terminal\n  disabled: []\n  entries:\n    sonde-terminal:\n      allow_tool_override: false\n`

test('LA SONDE D ESSAI NE VAUT PAS LE HEURTOIR', () => {
  // L'assertion qui vaut le bloc. `sonde-terminal` est allumee sur le poste de
  // kuchu et nulle part ailleurs : la confondre avec le greffon de production
  // rendrait la garantie vraie ici et fausse chez tous les clients - l'ecart
  // exact que ce constat existe pour fermer.
  poserConfig(SONDE_SEULE, ['sonde-terminal'])
  assert.deepEqual(lireGreffon(), { present: false, nom: GREFFON, raison: 'absent' })
})

test('DECLARE N EST PAS POSE : le dossier doit exister aussi', () => {
  // La seconde facon de mentir, et la plus discrete : le nom reste dans
  // `enabled` quand le dossier a ete supprime a la main. Le config dit oui, le
  // disque dit non - on ne promet pas.
  poserConfig(AVEC_HEURTOIR, ['sonde-terminal'])
  assert.deepEqual(lireGreffon(), {
    present: false,
    nom: GREFFON,
    raison: 'declare-mais-introuvable',
  })
})

test('declare ET pose : la seule combinaison qui promet', () => {
  poserConfig(AVEC_HEURTOIR, ['sonde-terminal', 'heurtoir'])
  assert.deepEqual(lireGreffon(), { present: true, nom: GREFFON, raison: null })
})

test('un heurtoir eteint ne promet pas, meme pose et meme declare', () => {
  poserConfig(
    `plugins:\n  enabled:\n    - heurtoir\n  disabled: [heurtoir]\n`,
    ['heurtoir'],
  )
  assert.equal(lireGreffon().present, false)
  assert.equal(lireGreffon().raison, 'eteint')
})

test('le doute retombe toujours du cote qui ne promet rien', () => {
  // Trois facons de douter, un seul resultat. Retomber sur `present` ferait
  // croire a une protection que personne n'a posee.
  poserConfig('model:\n  default: x\n')
  assert.equal(lireGreffon().raison, 'sans-bloc-plugins')

  poserConfig('plugins:\n  disabled: []\n')
  assert.equal(lireGreffon().raison, 'sans-liste-enabled')

  home = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-vide-'))
  process.env.HERMES_HOME = home
  assert.equal(lireGreffon().raison, 'config-introuvable')

  for (const r of ['sans-bloc-plugins', 'sans-liste-enabled', 'config-introuvable']) {
    assert.ok(r, 'chaque doute porte un nom que l ecran peut afficher')
  }
})

test('la reponse porte TOUJOURS les deux champs, mode et greffon', () => {
  // Ecrit apres un ecran blanc. L'interface lisait `greffon.present` sur une
  // reponse qui n'avait pas de `greffon` - une route voisine avait repondu a sa
  // place, avec un objet parfaitement valide. Rien n'avait echoue, donc rien
  // n'avait ete rattrape. Le contrat de la route est ici, pas dans un type.
  poserConfig(SONDE_SEULE, ['sonde-terminal'])
  const rendu = { ...lireMode(), greffon: lireGreffon() }

  assert.ok('mode' in rendu, 'le mode')
  assert.ok('greffon' in rendu, 'et le greffon, jamais l un sans l autre')
  assert.equal(typeof rendu.greffon.present, 'boolean', 'present est un booleen, pas un absent')
  assert.ok(rendu.greffon.nom, 'un manque qu on ne peut pas nommer envoie chercher a l aveugle')
})

test.after(() => {
  if (homeAvant === undefined) delete process.env.HERMES_HOME
  else process.env.HERMES_HOME = homeAvant
})
