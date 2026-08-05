/**
 * La carte de plan, eprouvee a froid.
 *
 * Aucun modele n'est appele ici : `lirePlan()` est pure, et c'est deliberé -
 * tout ce qui compte dans ce module se decide sur une chaine de caracteres.
 * Chaque cas ci-dessous vient d'une sortie REELLE relevee le 06/08/2026 sur
 * `glm-5.2:cloud`, ou d'un ecart que ces dix appels ont montre. On ne teste pas
 * des formes imaginaires : on teste ce que le cerveau a vraiment rendu.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { bacDeTest } from './bac-essai.js'

bacDeTest('plan')

const { lirePlan, consignePlan, PLAFOND_PLAN } = await import('./plan.js')

/** L'annuaire tel que `listerAgents()` le rend - reduit a ce qui sert ici. */
const AGENTS = [
  { id: 'default', metier: 'orchestrateur' },
  { id: 'redacteur', metier: 'redige et resume' },
  { id: 'trieur', metier: 'tri et classement' },
  { id: 'maquettiste', metier: 'maquettes HTML et PDF' },
]

// -----------------------------------------------------------------------------
// Le verdict : y a-t-il seulement un chantier ?
// -----------------------------------------------------------------------------
test('« bonjour » ne recoit pas de plan', () => {
  // Sortie reelle, 8,5 s. AVANT que la consigne sache trancher, la meme phrase
  // rendait un plan d'un agent avec un livrable `reponse-conversation.txt` -
  // c'est-a-dire trois boutons de validation sous une salutation.
  const p = lirePlan(
    '{"chantier": false, "pourquoi": "c\'est une simple salutation, pas un travail a accomplir"}',
    AGENTS,
  )
  assert.equal(p.chantier, false)
  assert.match(p.pourquoi, /salutation/)
})

test('un refus sans motif porte quand meme une phrase', () => {
  // Un fil qui dirait « pas de plan » sans dire pourquoi laisse croire a une
  // panne. La phrase de repli n'est pas de la decoration.
  const p = lirePlan('{"chantier": false}', AGENTS)
  assert.equal(p.chantier, false)
  assert.ok(p.pourquoi.length > 10)
})

test('un plan sans le mot `chantier` reste un plan', () => {
  // Lire un silence comme un refus perdrait un plan deja calcule - et il a
  // coute entre 8 et 54 secondes.
  const p = lirePlan(
    '{"titre":"Index photos","quoi":[{"agent":"trieur","tache":"classer par date"}],"resultat":[{"fichier":"index.html","quoi":"index"}]}',
    AGENTS,
  )
  assert.equal(p.chantier, true)
  assert.equal(p.titre, 'Index photos')
})

// -----------------------------------------------------------------------------
// Les noms, confrontes a l'annuaire
// -----------------------------------------------------------------------------
test('un agent invente tombe sur `default` et se laisse nommer', () => {
  // `trioueur` a ete rendu tel quel le 06/08/2026 sur la demande « portrait de
  // Lucas Ferrand », la ou `trieur` existe. Une faute d'une lettre ne se voit
  // pas a l'oeil dans une carte, et un plan qui nomme quelqu'un d'absent ne se
  // valide pas.
  const p = lirePlan(
    JSON.stringify({
      chantier: true,
      titre: 'Portrait',
      qui: [{ agent: 'trioueur', role: 'trie les sources' }],
      quoi: [{ agent: 'trioueur', tache: 'classer les sources' }],
      resultat: [{ fichier: 'portrait.pdf', quoi: 'le portrait' }],
    }),
    AGENTS,
  )
  assert.equal(p.quoi[0].agent, 'default')
  assert.equal(p.qui[0].agent, 'default')
  assert.deepEqual(p.inconnus, ['trioueur'])
})

test('on ne rapproche PAS un nom inconnu du plus ressemblant', () => {
  // `trioueur` -> `trieur` serait une devinette. Une devinette qui se trompe
  // assigne le travail a quelqu'un d'autre, et ca ne se voit nulle part.
  const p = lirePlan(
    '{"chantier":true,"quoi":[{"agent":"redacteurs","tache":"ecrire"}],"resultat":[]}',
    AGENTS,
  )
  assert.equal(p.quoi[0].agent, 'default')
  assert.ok(!p.quoi.some((e) => e.agent === 'redacteur'))
})

test('un nom exact traverse intact', () => {
  const p = lirePlan(
    '{"chantier":true,"quoi":[{"agent":"maquettiste","tache":"produire le PDF"}],"resultat":[]}',
    AGENTS,
  )
  assert.equal(p.quoi[0].agent, 'maquettiste')
  assert.deepEqual(p.inconnus, [])
})

// -----------------------------------------------------------------------------
// Les quatre parts
// -----------------------------------------------------------------------------
test('QUI se deduit de QUOI quand il manque', () => {
  // Une carte a trois parts vaut mieux qu'un refus pour une part omise.
  const p = lirePlan(
    '{"chantier":true,"quoi":[{"agent":"trieur","tache":"classer"},{"agent":"redacteur","tache":"rediger"}],"resultat":[]}',
    AGENTS,
  )
  assert.deepEqual(
    p.qui.map((q) => q.agent),
    ['trieur', 'redacteur'],
  )
})

test('un agent deja cite dans QUI n apparait pas deux fois', () => {
  const p = lirePlan(
    '{"chantier":true,"qui":[{"agent":"trieur","role":"classe"}],"quoi":[{"agent":"trieur","tache":"classer"}],"resultat":[]}',
    AGENTS,
  )
  assert.equal(p.qui.length, 1)
  assert.equal(p.qui[0].role, 'classe')
})

test('un plan sans livrable le dit au lieu d en inventer un', () => {
  // Le RESULTAT ATTENDU est la seule part qui permette de juger apres coup
  // (C8). En fabriquer un a la place du plan rendrait la confrontation
  // annonce / rendu fausse plutot qu'absente.
  const p = lirePlan(
    '{"chantier":true,"quoi":[{"agent":"redacteur","tache":"rediger"}]}',
    AGENTS,
  )
  assert.equal(p.sansLivrable, true)
  assert.deepEqual(p.resultat, [])
})

test('un titre absent se replie sur la premiere tache', () => {
  const p = lirePlan(
    '{"chantier":true,"quoi":[{"agent":"redacteur","tache":"rediger le resume de la veille"}]}',
    AGENTS,
  )
  assert.match(p.titre, /rediger le resume/)
})

// -----------------------------------------------------------------------------
// Les refus
// -----------------------------------------------------------------------------
test('une sortie vide ne rend pas une carte vide', () => {
  // Mesure du 06/08/2026 : deux essais sur la meme phrase, le premier n'a RIEN
  // rendu, le second a repondu en 14,7 s. Un fil muet apres une demande se lit
  // comme une panne - il faut le dire, et dire quoi faire.
  assert.throws(() => lirePlan('', AGENTS), /Reessaie/)
  assert.throws(() => lirePlan('je ne comprends pas la demande', AGENTS), /Reessaie/)
})

test('un plan sans aucune etape est refuse', () => {
  // Il n y aurait rien a valider, et le scenario pose serait vide.
  assert.throws(
    () => lirePlan('{"chantier":true,"titre":"Veille","quoi":[],"resultat":[]}', AGENTS),
    /aucune etape/,
  )
})

test('une etape sans phrase ne compte pas comme une etape', () => {
  assert.throws(
    () => lirePlan('{"chantier":true,"quoi":[{"agent":"trieur","tache":"  "}]}', AGENTS),
    /aucune etape/,
  )
})

// -----------------------------------------------------------------------------
// La consigne
// -----------------------------------------------------------------------------
test('la consigne tranche AVANT de montrer le gabarit', () => {
  // L ordre n est pas cosmetique : presenter le gabarit en premier revient a
  // annoncer qu un plan est attendu, et c est exactement ce qui a fait
  // planifier « bonjour ».
  const c = consignePlan('bonjour', AGENTS)
  assert.ok(c.indexOf("D'ABORD, TRANCHE") < c.indexOf('"titre"'))
})

test('la consigne nomme les vrais agents, et eux seuls', () => {
  const c = consignePlan('range mes photos', AGENTS)
  for (const a of AGENTS) assert.ok(c.includes(`- ${a.id} —`), `${a.id} manque`)
})

test('le plafond laisse de la marge sur la mesure haute', () => {
  // 54,2 s releves le 06/08/2026. Un plafond sous cette valeur couperait un
  // plan qui allait aboutir.
  assert.ok(PLAFOND_PLAN > 54200, 'le plafond doit depasser la mesure la plus longue')
})
