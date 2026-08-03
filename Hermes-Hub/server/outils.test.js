/**
 * Les outils MCP : ce qu'on lit sur le disque, et ce qu'on refuse avant d'appeler.
 *
 * AUCUN TEST D'ICI N'APPELLE LA LIGNE DE COMMANDE. La lecon est celle
 * d'`agents.test.js` : un test qui passe par le verbe pour eprouver une
 * validation finit par poser quelque chose de vrai sur le poste. Ici ce serait
 * pire qu'un profil de trop - brancher un serveur MCP sur les vrais agents
 * changerait ce qu'ils savent faire.
 *
 * Ce qui reste teste au travers des verbes ne va donc jamais jusqu'a l'appel :
 * les refus levent avant, et les cas « rien a faire » rendent sans appeler.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// Un faux home d'Hermes, pose AVANT l'import : `HERMES_HOME` est resolu a
// l'import de `outils.js` comme de `equipe.js`.
const RACINE = path.join(os.tmpdir(), 'hub-test-outils')
fs.rmSync(RACINE, { recursive: true, force: true })
const HOME = path.join(RACINE, 'hermes')
process.env.HERMES_HOME = HOME
process.env.HERMES_KANBAN_DB = path.join(RACINE, 'inexistant.db')

function poserProfil(nom, config) {
  const d = nom === 'default' ? HOME : path.join(HOME, 'profiles', nom)
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(d, 'config.yaml'), config)
  if (nom !== 'default') {
    fs.writeFileSync(path.join(d, 'profile.yaml'), `description: Un role d essai qui fait des choses.\n`)
  }
}

const AVEC_TEMOIN = `model:
  default: qwen2.5:0.5b
_config_version: 33
mcp_servers:
  temoin:
    command: node
    args:
      - C:\\outils\\temoin.mjs
    env:
      CLE: abc123
    enabled: true
  meteo:
    url: https://exemple.test/mcp
    enabled: true

# ── Security ──────────────────────────────────
# un commentaire qui suit le bloc
`

const SANS_RIEN = `model:
  default: qwen2.5:0.5b
`

poserProfil('default', AVEC_TEMOIN)
poserProfil('a-analyste', SANS_RIEN)
poserProfil('b-redacteur', SANS_RIEN)
// Le bac a sable porte l'outil, et ne doit compter nulle part.
poserProfil('clean', AVEC_TEMOIN)

const { lireServeurs, listerOutils, equipeVisee, argsDepuis, brancherOutil, repartirOutil } =
  await import('./outils.js')

const CFG = (n) =>
  n === 'default' ? path.join(HOME, 'config.yaml') : path.join(HOME, 'profiles', n, 'config.yaml')

// -----------------------------------------------------------------------------
// Lire
// -----------------------------------------------------------------------------
test('un bloc mcp_servers se relit entierement', () => {
  const s = lireServeurs(CFG('default'))
  assert.deepEqual(Object.keys(s).sort(), ['meteo', 'temoin'])
  assert.equal(s.temoin.command, 'node')
  assert.deepEqual(s.temoin.args, ['C:\\outils\\temoin.mjs'])
  assert.deepEqual(s.temoin.env, { CLE: 'abc123' })
  assert.equal(s.meteo.url, 'https://exemple.test/mcp')
})

test('le commentaire qui suit le bloc n est pas avale', () => {
  // Hermes reecrit config.yaml avec un pave de commentaires apres ses cles. Un
  // analyseur qui ne s arrete pas au retour a la marge y verrait des serveurs.
  const s = lireServeurs(CFG('default'))
  assert.equal(Object.keys(s).length, 2)
})

test('un config.yaml sans bloc, ou absent, rend une liste vide', () => {
  assert.deepEqual(lireServeurs(CFG('a-analyste')), {})
  assert.deepEqual(lireServeurs(path.join(RACINE, 'nulle-part.yaml')), {})
})

test('le bac a sable ne fait pas partie de l equipe', () => {
  // Il existe pour eprouver l installation. L y inclure ferait payer un appel
  // de plus a chaque branchement, pour un profil qui ne travaille pas.
  assert.ok(!equipeVisee().includes('clean'))
  assert.ok(equipeVisee().includes('default'))
})

test('un outil que seul Hermes possede se voit comme tel', () => {
  // C est la panne mesuree le 03/08/2026, rendue visible : le client a branche
  // son outil metier, ses agents travaillent sans, et rien ne le disait.
  const { outils } = listerOutils()
  const temoin = outils.find((o) => o.nom === 'temoin')
  assert.deepEqual(temoin.present, ['default'])
  assert.deepEqual(temoin.manque.sort(), ['a-analyste', 'b-redacteur'])
  assert.equal(temoin.partout, false)
  assert.equal(temoin.pourquoiPas, null)
})

test('le transport et le resume distinguent les deux sortes', () => {
  const { outils } = listerOutils()
  const parNom = Object.fromEntries(outils.map((o) => [o.nom, o]))
  assert.equal(parNom.temoin.transport, 'stdio')
  assert.equal(parNom.temoin.resume, 'node C:\\outils\\temoin.mjs')
  assert.equal(parNom.meteo.transport, 'http')
  assert.equal(parNom.meteo.resume, 'https://exemple.test/mcp')
})

// -----------------------------------------------------------------------------
// Reconstruire
// -----------------------------------------------------------------------------
test('--args passe en dernier, toujours', () => {
  // `--args` avale tout ce qui suit. Un `--env` place apres partirait en
  // argument du serveur, qui l ignorerait sans rien dire.
  const ligne = argsDepuis({
    command: 'node',
    args: ['serveur.mjs', '--port', '9000'],
    env: { CLE: 'abc' },
  })
  assert.equal(ligne[ligne.length - 4], '--args')
  assert.ok(ligne.indexOf('--env') < ligne.indexOf('--args'))
  assert.deepEqual(ligne, [
    '--env',
    'CLE=abc',
    '--command',
    'node',
    '--args',
    'serveur.mjs',
    '--port',
    '9000',
  ])
})

test('une adresse seule tient sans --args', () => {
  assert.deepEqual(argsDepuis({ url: 'https://exemple.test/mcp' }), [
    '--url',
    'https://exemple.test/mcp',
  ])
})

// -----------------------------------------------------------------------------
// Refuser avant d appeler
// -----------------------------------------------------------------------------
test('un nom mal forme est refuse', () => {
  for (const nom of ['', 'avec espace', 'accent!', '-debut', 'x'.repeat(70)]) {
    assert.throws(
      () => brancherOutil({ nom, url: 'https://exemple.test' }),
      /sans espace/,
      `« ${nom} » aurait du etre refuse`,
    )
  }
})

test('sans adresse ni commande, on ne branche rien', () => {
  assert.throws(() => brancherOutil({ nom: 'vide' }), /soit une adresse/)
})

test('viser des agents qui n existent pas est refuse plutot qu ignore', () => {
  // Sans ce refus, `pour: ['fantome']` tomberait sur une liste vide et
  // l interface annoncerait un succes sans qu aucun agent ait rien recu.
  assert.throws(
    () => brancherOutil({ nom: 'temoin', url: 'https://x.test', pour: ['fantome'] }),
    /n'existe sur ce poste/,
  )
})

test('repartir un outil inconnu dit lequel', () => {
  assert.throws(() => repartirOutil('jamais-vu'), /jamais-vu/)
})

test('repartir un outil que tout le monde a ne fait rien plutot que d appeler', () => {
  poserProfil('a-analyste', AVEC_TEMOIN)
  poserProfil('b-redacteur', AVEC_TEMOIN)
  assert.deepEqual(repartirOutil('temoin'), { nom: 'temoin', resultats: [], deja: true })
  poserProfil('a-analyste', SANS_RIEN)
  poserProfil('b-redacteur', SANS_RIEN)
})

test('un outil a en-tete d authentification refuse d etre recopie, et dit pourquoi', () => {
  // Le recopier brancherait un serveur qui repond 401 sans expliquer pourquoi :
  // exactement la panne qu on essaie de supprimer.
  poserProfil(
    'default',
    `mcp_servers:
  prive:
    url: https://prive.test/mcp
    headers:
      Authorization: Bearer secret
    enabled: true
`,
  )
  const { outils } = listerOutils()
  const prive = outils.find((o) => o.nom === 'prive')
  assert.match(prive.pourquoiPas, /en-tete d'authentification/)
  assert.throws(() => repartirOutil('prive'), /en-tete d'authentification/)
  poserProfil('default', AVEC_TEMOIN)
})
