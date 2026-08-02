/**
 * Revenir a un essai du banc.
 *
 * Rejouer n'est pas restaurer une sauvegarde : on ne remplace pas le tableau
 * par un fichier. On compare la photo a ce qui existe maintenant, et on rejoue
 * la difference **en verbes** - les memes que la souris, avec les memes refus.
 * Un seul ecrivain, toujours.
 *
 * Un mur, et il est connu : la ligne de commande d'Hermes n'a pas de verbe pour
 * ramener une tache archivee. `promote --force` la refuse (« promote only
 * applies to 'todo' or 'blocked' »), `unblock` aussi. Une tache supprimee se
 * donc **reconstruit, elle ne ressuscite pas** : nouveau numero, et son passe -
 * commentaires, evenements, livrables - reste dans l'archive. Sans consequence
 * pour un plan qu'on met au point avant de lancer, ou rien n'a encore tourne ;
 * reelle des qu'une tache a produit quelque chose. On le dit dans le rapport
 * plutot que de le taire.
 */
import { assigner, ajouterTache, delier, epingler, relier, supprimerTache } from './graphe.js'
import { ecart } from './versions.js'

/** Les liens d'une tache dans un plan, dans les deux sens. */
function voisins(plan, id) {
  return {
    avant: plan.liens.filter((l) => l.vers === id).map((l) => l.de),
    apres: plan.liens.filter((l) => l.de === id).map((l) => l.vers),
  }
}

/**
 * Ce que le retour va faire, sans rien faire.
 *
 * Le meme calcul que `rejouer`, arrete avant le premier verbe. L'ecran s'en
 * sert pour annoncer la note - et surtout pour nommer les taches qui ne
 * reviendront que reconstruites, seule perte du geste.
 */
export function prevoirRetour(pole, plan) {
  const courant = {
    taches: pole.taches.map((t) => ({
      id: t.id,
      titre: t.titre,
      corps: t.corps || '',
      agent: t.agent || null,
      modele: t.modele || null,
    })),
    liens: pole.liens.map((l) => ({ de: l.de, vers: l.vers })),
  }
  const e = ecart(courant, plan)

  // `ecart` regarde du courant vers la photo : « ajoutees » sont donc les
  // taches que la photo avait et qu'on n'a plus - celles qu'il faut rebatir.
  return {
    aRebatir: e.ajoutees.map((t) => ({ id: t.id, titre: t.titre })),
    aRetirer: e.retirees.map((t) => ({ id: t.id, titre: t.titre })),
    reassignations: e.agents,
    modeles: e.modeles,
    liensAPoser: e.poses,
    liensARetirer: e.retires,
    gestes:
      e.ajoutees.length +
      e.retirees.length +
      e.agents.length +
      e.modeles.length +
      e.poses.length +
      e.retires.length,
  }
}

/**
 * L'ordre des gestes n'est pas negociable.
 *
 * 1. retirer d'abord ce qui est en trop : leurs liens partent avec elles, et
 *    on evite de relier une tache qui va disparaitre ;
 * 2. rebatir ensuite ce qui manque, ancre a la demande d'origine - une tache
 *    creee sans aucun lien n'appartiendrait a aucun pole et deviendrait
 *    invisible avant meme qu'on ait pu la relier ;
 * 3. les reglages, qui ne dependent d'aucun lien ;
 * 4. poser les liens manquants **avant** de retirer ceux qui sont en trop :
 *    l'inverse ferait passer une tache par un instant sans aucun lien, ou le
 *    tableau la sortirait du pole ;
 * 5. retirer les liens en trop, l'ancre de l'etape 2 comprise si la photo ne
 *    la contenait pas.
 */
export function rejouer(pole, plan) {
  const prevu = prevoirRetour(pole, plan)
  const rapport = {
    retirees: [],
    rebaties: [],
    reassignees: [],
    modeles: [],
    liensPoses: [],
    liensRetires: [],
    refuses: [],
  }

  // Le numero d'une tache rebatie n'est pas celui de la photo : tout ce qui la
  // designe ensuite doit passer par ici.
  const traduire = new Map()
  const vivant = (id) => traduire.get(id) || id

  const essayer = (quoi, faire) => {
    try {
      faire()
      return true
    } catch (err) {
      rapport.refuses.push({ quoi, pourquoi: err.message })
      return false
    }
  }

  for (const t of prevu.aRetirer) {
    // La demande d'origine tient le pole : la retirer le dissoudrait sous les
    // pieds de l'ecran qui l'affiche. Aucune photo ne peut demander ca.
    if (t.id === pole.id) continue
    if (essayer(`retirer ${t.titre}`, () => supprimerTache(t.id))) rapport.retirees.push(t)
  }

  for (const t of prevu.aRebatir) {
    const modele = plan.taches.find((x) => x.id === t.id)
    const ok = essayer(`rebatir ${t.titre}`, () => {
      const cree = ajouterTache({
        titre: modele.titre,
        corps: modele.corps,
        agent: modele.agent || '',
        modele: modele.modele || '',
        enfants: [pole.id],
      })
      traduire.set(t.id, cree.id)
      rapport.rebaties.push({ ancien: t.id, nouveau: cree.id, titre: modele.titre })
    })
    if (!ok) continue
  }

  for (const c of prevu.reassignations) {
    if (essayer(`reassigner ${c.titre}`, () => assigner(vivant(c.id), c.vers))) {
      rapport.reassignees.push(c)
    }
  }

  for (const c of prevu.modeles) {
    if (essayer(`epingler ${c.titre}`, () => epingler(vivant(c.id), c.vers))) {
      rapport.modeles.push(c)
    }
  }

  const ancre = new Set(rapport.rebaties.map((r) => `${r.nouveau}>${pole.id}`))
  const voulus = new Set(
    plan.liens.map((l) => `${vivant(l.de)}>${vivant(l.vers)}`),
  )

  for (const l of prevu.liensAPoser) {
    const de = vivant(l.de)
    const vers = vivant(l.vers)
    if (ancre.has(`${de}>${vers}`)) continue // deja pose a la creation
    if (essayer(`relier ${de} a ${vers}`, () => relier(de, vers))) {
      rapport.liensPoses.push({ de, vers })
    }
  }

  for (const l of prevu.liensARetirer) {
    if (essayer(`delier ${l.de} de ${l.vers}`, () => delier(l.de, l.vers))) {
      rapport.liensRetires.push(l)
    }
  }

  // L'ancre n'etait qu'un point d'attache le temps de la reconstruction : si la
  // photo ne la contenait pas, elle s'en va maintenant que la tache tient par
  // ses vrais liens.
  for (const r of rapport.rebaties) {
    const lien = `${r.nouveau}>${pole.id}`
    if (voulus.has(lien)) continue
    if (essayer(`retirer l-ancre de ${r.titre}`, () => delier(r.nouveau, pole.id))) {
      rapport.liensRetires.push({ de: r.nouveau, vers: pole.id })
    }
  }

  rapport.gestes =
    rapport.retirees.length +
    rapport.rebaties.length +
    rapport.reassignees.length +
    rapport.modeles.length +
    rapport.liensPoses.length +
    rapport.liensRetires.length

  return rapport
}
