/**
 * LE TUBE D'ENTREE D'HERMES - un test ne pour une panne, le 06/08/2026.
 *
 * Ce qui s'est passe : un scenario joue jusqu'au bout, le serveur s'arrete net.
 *
 *     Error: write EPIPE ... Emitted 'error' event on Socket instance
 *
 * Le Hub entier, avec TOUS les agents, tue par un seul tube rompu. Le code
 * avait pourtant l'air protege - `#envoyer` verifiait `this.child`, `#repondre`
 * entourait l'appel d'un `try/catch`. Aucun des deux ne servait : `write()` sur
 * un tube rompu ne leve pas, il signale plus tard en emettant 'error' sur le
 * flux, et un `catch` synchrone n'attrape rien d'asynchrone.
 *
 * Le correctif a deux moities, et ce fichier n'en eprouve qu'une :
 *
 *   - un ecouteur 'error' sur `child.stdin`, pose dans `demarrer()`. C'est LUI
 *     qui evite la mort du processus, et il n'est pas eprouve ici : `demarrer()`
 *     lance un vrai Hermes, et le depot a deja paye la lecon inverse - « un test
 *     qui passe par le verbe finit par toucher le poste ». Verifie en vrai, en
 *     rejouant un scenario complet ;
 *   - le test `writable` ci-dessous, lui, est deterministe. Il transforme une
 *     panne asynchrone en refus qu'on peut rattraper, et c'est ce qui permet a
 *     `appeler()` de rendre une erreur propre au lieu de laisser un appel
 *     pendre jusqu'au delai de dix minutes.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

const { PontAcp } = await import('./acp.js')

/** Un enfant en toc : il n'a que ce que `#envoyer` regarde. */
function enfant(writable) {
  let ecrit = 0
  return {
    faux: {
      stdin: {
        writable,
        write() {
          ecrit++
          return true
        },
      },
    },
    ecrites: () => ecrit,
  }
}

test('un tube ferme fait refuser l appel, il ne le laisse pas ecrire', async () => {
  const pont = new PontAcp({ cwd: process.cwd() })
  const e = enfant(false)
  pont.child = e.faux

  await assert.rejects(() => pont.appeler('session/prompt', {}, 50), /fermee/)
  assert.equal(e.ecrites(), 0, 'rien ne doit partir dans un tube ferme')
  assert.equal(pont.enAttente.size, 0, "l'appel refuse ne doit pas rester en attente")
})

test('un tube ouvert laisse passer, et l appel attend sa reponse', async () => {
  const pont = new PontAcp({ cwd: process.cwd() })
  const e = enfant(true)
  pont.child = e.faux

  // Le delai est court : on veut savoir que la trame est PARTIE, pas attendre
  // une reponse que ce faux enfant ne donnera jamais.
  await assert.rejects(() => pont.appeler('session/prompt', {}, 50), /n'a pas repondu/)
  assert.equal(e.ecrites(), 1, 'la trame doit partir quand le tube est ouvert')
})
