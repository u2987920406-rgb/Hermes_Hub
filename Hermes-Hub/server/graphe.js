/**
 * Le graphe qu'on remanie a la souris : ce qui existe, et ce qui depend de quoi.
 *
 * `studio.js` garde le « ou » - les positions posees a la main, qui ne sont
 * qu'un reglage d'interface. Ici on touche au fond : creer une tache, la
 * retirer, poser une dependance, la defaire. Deux fichiers parce que ce sont
 * deux natures - perdre une position ne perd aucun travail, perdre une tache si.
 *
 * Toute ecriture sur le tableau passe par la CLI, jamais par SQLite.
 *
 * Le Hub lit la base en lecture seule et n'y ecrit rien lui-meme : un seul
 * ecrivain, celui qui connait les invariants - promotion, verrous, evenements,
 * runs. Le prix est d'environ deux secondes par appel, connu et accepte. Un
 * `link` pose a la main dans SQLite laisserait par exemple la tache fille en
 * `ready` alors qu'elle attend desormais quelqu'un ; la CLI, elle, la
 * retrograde en `todo` - verifie sur le bac a sable.
 *
 * C'est aussi elle qui refuse les cycles. On ne redemande donc pas au Hub de
 * savoir ce qu'Hermes sait deja : deux gardiens qui divergent valent moins
 * qu'un seul.
 */
import { spawnSync } from 'node:child_process'

export function hermes(args, { timeout = 30000 } = {}) {
  return spawnSync('hermes', ['kanban', ...args], {
    windowsHide: true,
    timeout,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
}

/** La derniere ligne utile d'une sortie d'erreur : le reste est du journal. */
export function dernierMot(sortie) {
  const lignes = String(sortie || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return lignes[lignes.length - 1] || ''
}

/**
 * Le dernier objet JSON d'une sortie de CLI.
 *
 * On balaie les accolades plutot que les lignes : `kanban create` indente sa
 * sortie sur vingt lignes, `decompose --json` en met une par tache, et les
 * deux peuvent etre precedes de journal. Compter les accolades est la seule
 * lecture qui tienne pour les trois cas - en ignorant celles qui vivent dans
 * une chaine, sans quoi un titre contenant `{` decalerait tout le compte.
 */
export function dernierJson(sortie) {
  const texte = String(sortie || '')
  const objets = []
  let debut = -1
  let profondeur = 0
  let dansChaine = false
  let echappe = false

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (dansChaine) {
      if (echappe) echappe = false
      else if (c === '\\') echappe = true
      else if (c === '"') dansChaine = false
      continue
    }
    if (c === '"') dansChaine = true
    else if (c === '{') {
      if (profondeur === 0) debut = i
      profondeur++
    } else if (c === '}' && profondeur > 0) {
      profondeur--
      if (profondeur === 0 && debut >= 0) objets.push(texte.slice(debut, i + 1))
    }
  }

  for (let i = objets.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(objets[i])
    } catch {
      /* bloc tronque : on essaie le precedent */
    }
  }
  return null
}

/**
 * Le refus d'Hermes, rendu en francais.
 *
 * Un seul cas merite d'etre traduit parce que c'est le seul qu'on provoque en
 * se trompant plutot qu'en cassant quelque chose : relier deux taches dans le
 * mauvais sens. Le message d'origine nomme les identifiants, que personne ne
 * lit a l'ecran ; celui-ci nomme le geste.
 */
function refus(r, defaut) {
  const brut = dernierMot(r.stderr) || dernierMot(r.stdout) || ''
  const err = new Error(
    /cycle/i.test(brut)
      ? 'Ce lien fermerait une boucle : chacune des deux taches attendrait l-autre, et aucune ne pourrait commencer.'
      : brut || defaut,
  )
  err.status = 400
  return err
}

/**
 * Une tache de plus sur le tableau.
 *
 * `parents` est pose des la creation plutot qu'apres coup : une tache creee
 * seule nait `ready`, et une tache `ready` qui attend en fait quelqu'un est
 * exactement ce qu'un dispatcher lancera trop tot. Avec `--parent`, elle nait
 * `todo` et ne bougera qu'a son tour.
 *
 * `enfants`, lui, ne peut etre que pose apres - on ne connait l'identifiant
 * qu'une fois la tache creee.
 */
export function ajouterTache({ titre, corps, agent, modele, parents = [], enfants = [] }) {
  const args = ['create', titre, '--json']
  if (corps) args.push('--body', corps)
  if (agent) args.push('--assignee', agent)
  if (modele) args.push('--model', modele)
  for (const p of parents) args.push('--parent', p)

  const r = hermes(args)
  const tache = dernierJson(r.stdout)
  const id = tache?.id || tache?.task_id
  if (!id) throw refus(r, "La tache n'a pas pu etre creee sur le tableau.")

  // Un lien refuse ici laisserait une tache orpheline, donc invisible : elle
  // n'appartiendrait a aucun pole. On la retire plutot que de la laisser
  // trainer sur un tableau ou personne n'ira la chercher.
  for (const e of enfants) {
    const lien = hermes(['link', id, e])
    if (lien.status !== 0) {
      hermes(['archive', id])
      throw refus(lien, 'Le lien vers la tache existante a ete refuse.')
    }
  }

  return { id, etat: tache?.status || null }
}

/**
 * Archivee, pas effacee.
 *
 * `lireOrchestration` ignore deja les archivees, donc la tache disparait de
 * l'ecran ; mais son historique, ses commentaires et ses evenements restent
 * dans la base. Un geste de souris ne doit pas pouvoir detruire ce qu'un agent
 * a mis vingt minutes a produire.
 */
export function supprimerTache(id) {
  const r = hermes(['archive', id])
  if (r.status !== 0) throw refus(r, "La tache n'a pas pu etre retiree du tableau.")
  return { retiree: id }
}

/** `de` doit finir avant `vers` - c'est le sens du lien partout dans le Hub. */
export function relier(de, vers) {
  const r = hermes(['link', de, vers])
  if (r.status !== 0) throw refus(r, "Le lien n'a pas pu etre pose.")
  return { de, vers, lie: true }
}

export function delier(de, vers) {
  const r = hermes(['unlink', de, vers])
  if (r.status !== 0) throw refus(r, "Le lien n'a pas pu etre retire.")
  return { de, vers, lie: false }
}

/**
 * Qui s'en occupe. `null` rend la tache a personne.
 *
 * Le mot `none` est celui de la CLI pour desassigner ; on le traduit ici plutot
 * que de laisser chaque appelant s'en souvenir.
 */
export function assigner(id, agent) {
  const r = hermes(['assign', id, agent || 'none'])
  if (r.status !== 0) throw refus(r, "La tache n'a pas pu etre reassignee.")
  return { id, agent: agent || null }
}

/**
 * Une tache bloquee qu'on remet en circulation.
 *
 * C'etait l'impasse du Studio, et elle se refermait un peu plus a chaque garde
 * qu'on ajoutait. Le Hub bloque une tache quand elle n'a pas produit son
 * livrable, quand le fichier ecrit avoue un echec, quand un PDF n'est qu'une
 * page d'erreur - autant de refus justes. Mais rien dans l'interface ne
 * permettait de repartir : le 03/08/2026, il a fallu `hermes kanban unblock`
 * en ligne de commande pour relancer un pole. Un produit qui sait dire non doit
 * savoir dire « recommence ».
 *
 * La raison est portee en commentaire sur la tache plutot que perdue : le
 * tableau garde donc la trace du blocage ET celle de la reprise, et la tache
 * suivante lira les deux dans `kanban context`.
 */
export function debloquer(id, raison) {
  const args = ['unblock', id]
  if (raison) args.push('--reason', raison)
  const r = hermes(args)
  if (r.status !== 0) throw refus(r, "La tache n'a pas pu etre debloquee.")
  return { id, debloquee: true }
}

/**
 * Le modele impose a une tache, par-dessus celui de son agent.
 *
 * `null` retire l'epingle : la tache repart sur le modele de son agent. La CLI
 * previent que le changement ne prend effet qu'au prochain dispatch - une tache
 * deja en cours garde donc le sien, et c'est bien ainsi.
 */
export function epingler(id, modele) {
  const r = hermes(['set-model', id, modele || 'none'])
  if (r.status !== 0) throw refus(r, "Le modele n'a pas pu etre change.")
  return { id, modele: modele || null }
}
