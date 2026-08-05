/**
 * « Internal error » a une cause, et elle est sur le disque.
 *
 * Le 05/08/2026, une session Nous revoquee a rendu douze agents muets. Le Hub
 * affichait « Internal error » pendant qu'Hermes ecrivait `relogin_required:
 * True` dans `auth.json`. Ces tests tiennent les deux sens de la lecture - dire
 * quand il faut se reconnecter, et SURTOUT se taire quand il ne faut pas.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { bacDeTest } from './bac-essai.js'

const BAC = bacDeTest('session-fournisseur')

// `modeles.js` calcule le home d'Hermes A L'IMPORT, depuis LOCALAPPDATA. Il
// faut donc le detourner avant l'import dynamique - meme piege que le workspace,
// et meme remede.
const HOME = path.join(BAC.racine, 'hermes')
fs.mkdirSync(HOME, { recursive: true })
process.env.LOCALAPPDATA = BAC.racine

const { lireSessionFournisseur, expliquerPanne } = await import('./modeles.js')

const AUTH = path.join(HOME, 'auth.json')
const ecrireAuth = (objet) => fs.writeFileSync(AUTH, JSON.stringify(objet, null, 2))
const effacerAuth = () => fs.rmSync(AUTH, { force: true })

/** La forme exacte relevee sur le poste de kuchu le 05/08/2026. */
const REVOQUEE = {
  active_provider: 'nous',
  providers: {
    nous: {
      last_auth_error: {
        provider: 'nous',
        code: 'invalid_grant',
        message: 'Refresh session has been revoked',
        reason: 'credential_pool_refresh_failure',
        relogin_required: true,
        at: '2026-08-05T14:09:01.755072+00:00',
      },
    },
  },
}

test.afterEach(effacerAuth)

test('une session revoquee est reconnue, et nomme son fournisseur', () => {
  ecrireAuth(REVOQUEE)

  const s = lireSessionFournisseur()
  assert.equal(s?.fournisseur, 'nous')
  assert.equal(s?.code, 'invalid_grant')
  assert.equal(s?.quand, '2026-08-05T14:09:01.755072+00:00')
})

test('le message de panne porte le geste a faire', () => {
  ecrireAuth(REVOQUEE)

  const m = expliquerPanne("Hermes n'a pas pu repondre : Internal error")
  // Le message d'origine RESTE : si la vraie cause est ailleurs, c'est la seule
  // piste, et l'ecraser reviendrait a remplacer un mauvais diagnostic par un
  // autre.
  assert.match(m, /Internal error/)
  assert.match(m, /reconnecter/)
  assert.match(m, /hermes model/)
})

test('la commande proposee existe vraiment', () => {
  // Le 05/08 a 20:50, ce message disait `hermes auth login <fournisseur>` - une
  // sous-commande qui N'EXISTE PAS. Elle avait ete repetee quatre fois puis
  // ecrite dans le produit sans avoir ete lancee une seule fois. Ce test tient
  // la seule chose qu'un test PEUT tenir ici : que la phrase reste celle
  // qu'Hermes recommande lui-meme dans son refus, et qu'on n'en refabrique pas
  // une par fournisseur.
  ecrireAuth(REVOQUEE)
  const m = expliquerPanne('peu importe')

  assert.ok(!/auth login/.test(m), "pas de sous-commande `auth login` - elle n'existe pas")
  // `hermes model` est le selecteur interactif : il ne prend pas le nom du
  // fournisseur en argument. Coller `nous` derriere refabriquerait une commande
  // inventee, exactement la faute qu'on repare.
  assert.ok(!/hermes model\s+nous/.test(m), 'le fournisseur ne se colle pas derriere la commande')
})

test('sans relogin_required, on ne dit RIEN', () => {
  // Le sens qui compte le plus. Une erreur d'authentification ancienne et deja
  // resolue traine dans `auth.json` : envoyer se reconnecter alors que tout
  // marche est le genre de consigne qu'on suit une fois, puis plus jamais.
  ecrireAuth({
    active_provider: 'nous',
    providers: { nous: { last_auth_error: { code: 'invalid_grant', relogin_required: false } } },
  })

  assert.equal(lireSessionFournisseur(), null)
  assert.equal(expliquerPanne('message brut'), 'message brut')
})

test('un auth.json absent ou abime ne fait pas tomber la lecture', () => {
  // Le Hub tourne sur des postes ou Hermes n'a peut-etre jamais ete authentifie.
  effacerAuth()
  assert.equal(lireSessionFournisseur(), null)

  fs.writeFileSync(AUTH, '{ ceci n est pas du JSON')
  assert.equal(lireSessionFournisseur(), null)
  assert.equal(expliquerPanne('message brut'), 'message brut')
})

test('un fournisseur actif sans erreur enregistree ne dit rien', () => {
  ecrireAuth({ active_provider: 'nous', providers: { nous: { access_token: 'peu importe' } } })
  assert.equal(lireSessionFournisseur(), null)
})

test('le jeton ne sort jamais de la lecture', () => {
  // On ne lit que le constat d'echec. Ce qui part vers un navigateur ne doit
  // porter aucun secret - et la seule garantie qui tienne est un test.
  ecrireAuth({
    active_provider: 'nous',
    providers: {
      nous: {
        access_token: 'SECRET-A-NE-JAMAIS-DIFFUSER',
        refresh_token: 'SECRET-AUSSI',
        last_auth_error: { code: 'invalid_grant', relogin_required: true },
      },
    },
  })

  const rendu = JSON.stringify(lireSessionFournisseur()) + expliquerPanne('panne')
  assert.ok(!rendu.includes('SECRET'), 'aucun jeton dans ce qui est rendu')
})
