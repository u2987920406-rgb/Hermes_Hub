/**
 * Agir sur plusieurs taches d'un coup - ce que la souris ne sait pas faire.
 *
 * La souris tient une cible a la fois, et elle le fait mieux que la parole :
 * on voit le geste avant qu'il parte. La parole n'a pas cet avantage, donc
 * elle en prend un autre : dix cibles designees par un critere. Tout le reste
 * du Studio reste a la main.
 *
 * **Les cibles arrivent en identifiants, jamais en critere.** Resoudre « les 10
 * blocs » ou « partout sauf la relecture » est le travail de l'orchestrateur,
 * qui lit le pole ; ici on recoit la liste qu'il en a tiree. Deux facons de
 * designer une tache - par identifiant et par phrase - feraient deux jeux de
 * garde-fous a tenir d'accord, et c'est exactement ce qu'on evite partout
 * ailleurs.
 *
 * L'apercu n'est pas une politesse, c'est le garde-fou principal. Le cerveau
 * qui resout le critere est un 4B : une erreur de cible ne dit plus une
 * betise, elle touche dix taches. On rend donc toujours la liste des titres
 * avant d'ecrire quoi que ce soit, avec les refus deja nommes.
 */
import { assigner, epingler, supprimerTache } from './graphe.js'

/** Ce qui ne se defait pas se demande ; le reste se rattrape au banc. */
const IRREVERSIBLES = new Set(['archiver'])

const VERBES = new Set(['assigner', 'epingler', 'archiver'])

/**
 * Ce qui va se passer, tache par tache - et ce qui ne se passera pas.
 *
 * Trois sorties possibles pour une cible : elle change, elle est deja dans
 * l'etat demande, ou elle est refusee. La deuxieme merite d'exister : « mets
 * tout le monde sur elena » quand trois y sont deja ne doit pas payer trois
 * appels de deux secondes pour ne rien changer.
 */
export function preparer(pole, { verbe, cibles, valeur }) {
  if (!VERBES.has(verbe)) {
    const err = new Error(`Verbe inconnu : ${verbe}`)
    err.status = 400
    throw err
  }

  const parId = new Map(pole.taches.map((t) => [t.id, t]))
  const faisables = []
  const inchangees = []
  const bloquees = []

  for (const id of cibles) {
    const t = parId.get(id)
    if (!t) {
      // L'identifiant voyage en clair : une cible d'un autre pole serait un
      // remaniement invisible sur un ecran qui n'est pas ouvert.
      bloquees.push({ id, titre: id, pourquoi: 'Cette tache n-appartient pas a ce pole.' })
      continue
    }

    if (verbe === 'archiver') {
      if (t.id === pole.id) {
        bloquees.push({
          id,
          titre: t.titre,
          pourquoi: 'C-est la demande elle-meme : la retirer supprimerait le pole entier.',
        })
        continue
      }
      if (t.etat === 'running') {
        bloquees.push({ id, titre: t.titre, pourquoi: 'Cette tache est en cours.' })
        continue
      }
      faisables.push({ id, titre: t.titre, de: null, vers: null })
      continue
    }

    const actuel = verbe === 'assigner' ? t.agent || null : t.modele || null
    const voulu = valeur || null
    if (actuel === voulu) {
      inchangees.push({ id, titre: t.titre, de: actuel, vers: voulu })
      continue
    }
    faisables.push({ id, titre: t.titre, de: actuel, vers: voulu })
  }

  return {
    verbe,
    valeur: valeur || null,
    irreversible: IRREVERSIBLES.has(verbe),
    faisables,
    inchangees,
    bloquees,
    /** Le seul chiffre a annoncer : ce qui va reellement bouger. */
    gestes: faisables.length,
  }
}

/**
 * Les gestes, un par un, et le compte rendu de chacun.
 *
 * On ne s'arrete pas au premier refus. Une commande de masse dont la
 * troisieme cible resiste doit finir les sept autres et le dire - s'arreter
 * laisserait le tableau a moitie fait, sans que personne sache ou.
 */
export function executer(pole, plan) {
  const faits = []
  const refuses = [...plan.bloquees]

  for (const cible of plan.faisables) {
    try {
      if (plan.verbe === 'assigner') assigner(cible.id, plan.valeur)
      else if (plan.verbe === 'epingler') epingler(cible.id, plan.valeur)
      else supprimerTache(cible.id)
      faits.push(cible)
    } catch (err) {
      refuses.push({ id: cible.id, titre: cible.titre, pourquoi: err.message })
    }
  }

  return {
    verbe: plan.verbe,
    valeur: plan.valeur,
    faits,
    inchangees: plan.inchangees,
    refuses,
    gestes: faits.length,
  }
}
