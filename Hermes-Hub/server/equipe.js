/**
 * L'equipe et les poles, pour le menu Orchestration.
 *
 * Deux sources, aucune base de donnees propre au Hub :
 *
 *   - les agents sont les profils d'Hermes. Leur `profile.yaml` porte la
 *     description - c'est elle, et rien d'autre, que le decomposeur de kanban
 *     lit pour router une tache vers le bon specialiste. Leur `config.yaml`
 *     porte le modele : le cerveau de l'agent ;
 *   - les poles sont lus dans `kanban.db`, en direct.
 *
 * On lit la base plutot que d'appeler `hermes kanban list` : un appel de CLI
 * coute environ deux secondes, et il en faudrait un par tache pour obtenir les
 * dependances. La lecture SQLite rend tout le graphe d'un coup.
 *
 * Un bac a sable qui ne deplace que HERMES_KANBAN_DB garde la meme equipe, ce
 * qui est voulu - on developpe avec ses vrais agents sur un faux tableau. Pour
 * changer aussi d'equipe, il faut deplacer HERMES_HOME, comme pour le CLI.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

/**
 * Le home d'Hermes - la meme reponse que celle du CLI, et ce n'etait pas le cas.
 *
 * `HERMES_HOME` d'abord, parce que c'est ce que `hermes` lui-meme honore.
 * Verifie le 03/08/2026 : avec `LOCALAPPDATA` detourne mais `HERMES_HOME`
 * absent, `hermes profile list` rendait les profils du poste reel pendant que
 * le Hub affichait ceux du dossier detourne. Les deux ecrans disaient une
 * equipe differente, et le decomposeur routait vers des agents que l'interface
 * ne montrait pas.
 *
 * Sur une installation normale les deux chemins tombent au meme endroit et
 * rien ne se voit. C'est bien pourquoi il fallait le corriger avant : une
 * divergence qui ne se manifeste qu'en essai finit par se manifester chez un
 * client, sans personne pour la comprendre.
 */
const HERMES_HOME =
  process.env.HERMES_HOME || path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
const PROFILES_DIR = path.join(HERMES_HOME, 'profiles')
const KANBAN_DB = process.env.HERMES_KANBAN_DB || path.join(HERMES_HOME, 'kanban.db')

// -----------------------------------------------------------------------------
// Presentation
// -----------------------------------------------------------------------------
/**
 * Couleur et icone ne viennent pas d'Hermes, qui n'en a pas la notion : c'est
 * le Hub qui les attribue. Un agent doit se reconnaitre d'un coup d'oeil dans
 * l'organigramme, sans lire son nom.
 *
 * Les jetons correspondent aux variables `--jeton-*` de `index.css`, calibrees
 * pour tenir sur les trois themes - y compris le lin de l'antique.
 */
const PALETTE = [
  'ciel',
  'rose',
  'emeraude',
  'violet',
  'orange',
  'cyan',
  'fuchsia',
  'lime',
  'indigo',
  'ambre',
  'jade',
  'corail',
  'azur',
  'mauve',
  'citron',
]

const CONNUS = {
  default: {
    nom: 'Hermes',
    role: 'orchestrateur',
    couleur: 'ardoise',
    icone: 'boussole',
    metier: 'Orchestration',
  },
  trieur: { nom: 'Trieur', role: 'worker', couleur: 'ciel', icone: 'entonnoir' },
  clean: { nom: 'Clean', role: 'bac-a-sable', couleur: 'ardoise', icone: 'etincelle' },

  // Les trois roles poses par l'installateur - la seule equipe qu'un poste
  // neuf possede. Sans eux, le premier ecran d'Orchestration ne montre
  // qu'Hermes : verifie le 03/08/2026 sur un home vierge, un agent, aucune
  // equipe, aucun pole.
  //
  // La lettre d'abord, le prenom entre parentheses ensuite. Une lettre seule
  // rendrait le graphe illisible - trois boites qu'on ne distingue que par
  // leur couleur - et un prenom seul ferait croire a un personnage livre avec
  // le produit. Les deux ensemble disent ce qu'il faut : ceci est un
  // emplacement, et il se renomme.
  //
  // MAIS l'identifiant, lui, reste un metier - et cette dissociation est le
  // resultat d'une mesure. Le 03/08/2026, meme demande decomposee deux fois :
  // avec des profils nommes `redacteur` et `maquettiste`, les deux taches sont
  // parties au bon specialiste ; avec `a`, `b` et `c`, une seule sur deux, le
  // plan est tombe de trois taches a deux, et `b` n'a jamais servi. C'est
  // l'identifiant que le decomposeur choisit, et une lettre ne lui dit rien.
  // La description aide, elle ne remplace pas un nom qui a un sens.
  //
  // Donc : identifiant parlant pour la machine, nom neutre pour l'oeil - et la
  // lettre DANS l'identifiant. Sans elle, `redacteur` tout court entrait en
  // collision avec un profil du meme nom deja present sur un poste : le sien
  // se serait affiche « B (Beatrice) », et `hermes profile create redacteur`
  // aurait echoue en silence a l'installation. Un identifiant qu'on pose chez
  // les autres doit etre a nous.
  //
  // On ne fige QUE le nom. La couleur se distribue avec les autres, le metier
  // et le role se lisent dans la description - c'est elle qui travaille, pas
  // cette table.
  'a-analyste': { nom: 'A (Alphonse)' },
  'b-redacteur': { nom: 'B (Beatrice)', couleur: 'violet', icone: 'plume' },
  'c-metteur': { nom: 'C (Camille)' },
}

/** Sans accents : les descriptions sont ecrites tantot avec, tantot sans. */
function aplatir(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/**
 * Le metier tient dans la premiere phrase de la description.
 *
 * Ce n'est pas un hasard : la description est ecrite pour le decomposeur, et
 * on la commence naturellement par ce que l'agent fait - « Direction
 * artistique musicale. », « Ecriture de paroles. ». On la relit donc telle
 * quelle plutot que d'ajouter un champ que personne ne remplirait.
 *
 * Sans description, pas de metier invente : un agent muet doit se voir comme
 * tel, c'est deja ce que l'interface signale ailleurs.
 */
function lireMetier(description) {
  const phrase = String(description || '').split(/(?<=\.)\s+|\n/)[0] || ''
  return phrase.replace(/\.$/, '').trim().slice(0, 48)
}

/**
 * Qui decide, dans une equipe.
 *
 * Hermes n'a pas la notion de hierarchie et on ne va pas lui en inventer une
 * dans un fichier a tenir a la main. On la lit la ou elle est deja ecrite : un
 * agent qui arbitre, qui tranche, ou qui tient la coherence de l'ensemble se
 * decrit comme tel. Les verbes retenus sont ceux qui portent sur le travail
 * *des autres* - « decide du rythme de son montage » ne fait de personne un
 * chef, et c'est pourquoi `decide` seul ne suffit pas.
 */
const SIGNES_CHEF =
  /\b(arbitre|arbitrer|tranche|trancher|coordonne|coordonner|dirige|diriger|supervise|superviser|pilote|piloter)\b|coherence de l['e ]ensemble|les autres (proposent|suivent)|valide (le|la|les) (travail|propositions?|rendu)/

function lireRole(description) {
  return SIGNES_CHEF.test(aplatir(description)) ? 'manager' : 'worker'
}

/** Preference de couleur d'un profil : stable d'une session a l'autre, sinon
    l'organigramme changerait de sens a chaque visite. */
function preference(nom) {
  let somme = 0
  for (let i = 0; i < nom.length; i++) somme = (somme + nom.charCodeAt(i) * (i + 1)) % 9973
  return somme % PALETTE.length
}

/**
 * Distribue les couleurs sans doublon.
 *
 * Un simple hachage suffisait a trois agents ; a treize il collait la meme
 * teinte a Theo, Karim et Louise - et un code couleur qui se repete ne code
 * plus rien. Chacun part donc de sa couleur preferee, et prend la suivante
 * libre si elle est deja prise. Le parcours suit l'ordre alphabetique des
 * identifiants : l'attribution ne depend pas de l'ordre de lecture du disque,
 * donc elle ne bouge pas d'un demarrage a l'autre.
 *
 * Au-dela de la palette, on recycle plutot que d'inventer : mieux vaut deux
 * agents de meme teinte que quinze nuances qu'on ne distingue plus.
 */
function distribuerCouleurs(noms, reservees = []) {
  // Les couleurs fixees d'avance sont prises avant que le premier profil ne
  // choisisse : sans ca, le distributeur redonne joyeusement le ciel de Trieur.
  const prises = new Set(reservees)
  const choix = new Map()

  for (const nom of [...noms].sort()) {
    const depart = preference(nom)
    let couleur = null
    for (let i = 0; i < PALETTE.length; i++) {
      const essai = PALETTE[(depart + i) % PALETTE.length]
      if (!prises.has(essai)) {
        couleur = essai
        break
      }
    }
    couleur = couleur || PALETTE[depart]
    prises.add(couleur)
    choix.set(nom, couleur)
  }

  return choix
}

/**
 * `description: |` sur plusieurs lignes, ou sur une seule. Un vrai analyseur
 * YAML serait une dependance npm pour deux champs, et le serveur n'en a aucune.
 */
function lireDescription(fichier) {
  let brut
  try {
    brut = fs.readFileSync(fichier, 'utf8')
  } catch {
    return ''
  }

  const morceaux = []
  let dedans = false

  for (const ligne of brut.split(/\r?\n/)) {
    if (!dedans) {
      const m = ligne.match(/^description:\s*(.*)$/)
      if (!m) continue
      dedans = true
      const reste = m[1].trim()
      if (reste && !['|', '>', '|-', '>-'].includes(reste)) morceaux.push(reste)
      continue
    }
    // La suite n'appartient a la description que tant qu'elle est indentee.
    if (/^\s+\S/.test(ligne)) morceaux.push(ligne.trim())
    else break
  }

  const valeur = morceaux.join(' ').trim()

  // YAML met la valeur entre apostrophes des qu'elle contient un `:`, et double
  // les apostrophes internes. Sans ce retour en arriere, l'interface afficherait
  // « d''analyse ».
  if (valeur.startsWith("'") && valeur.endsWith("'")) {
    return valeur.slice(1, -1).replace(/''/g, "'").trim()
  }
  if (valeur.startsWith('"') && valeur.endsWith('"')) {
    return valeur.slice(1, -1).replace(/\\"/g, '"').trim()
  }
  return valeur
}

/** Le cerveau de l'agent : `model.default` dans son `config.yaml`. */
function lireModele(fichier) {
  try {
    const brut = fs.readFileSync(fichier, 'utf8')
    const bloc = brut.match(/^model:\s*$([\s\S]*?)^\S/m)
    const zone = bloc ? bloc[1] : brut
    const m = zone.match(/^\s+default:\s*(.+)$/m)
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null
  } catch {
    return null
  }
}

/** Un `.env` fraichement cree ne contient que des commentaires : ce n'est pas
    la presence du fichier qui compte, c'est qu'il porte une cle. */
function estPret(nom) {
  if (nom === 'default') return true
  try {
    return /^[A-Z0-9_]+\s*=\s*\S/m.test(fs.readFileSync(path.join(PROFILES_DIR, nom, '.env'), 'utf8'))
  } catch {
    return false
  }
}

const RANG = { orchestrateur: 0, manager: 1, worker: 2, 'bac-a-sable': 3 }

export function listerAgents() {
  const noms = new Set(['default'])
  try {
    for (const e of fs.readdirSync(PROFILES_DIR, { withFileTypes: true })) {
      if (e.isDirectory()) noms.add(e.name)
    }
  } catch {
    /* pas de dossier profils : il reste `default`, qui existe toujours */
  }

  // Les couleurs se decident sur l'annuaire entier, pas profil par profil :
  // eviter un doublon demande de savoir ce que les autres ont deja pris.
  const couleurs = distribuerCouleurs(
    [...noms].filter((n) => !CONNUS[n]?.couleur),
    // L'ardoise est le gris d'Hermes et du bac a sable : elle n'entre pas dans
    // la ronde des identites, et se partager n'a pas d'importance.
    Object.values(CONNUS)
      .map((c) => c.couleur)
      .filter((c) => c && c !== 'ardoise'),
  )

  return [...noms]
    .map((nom) => {
      const connu = CONNUS[nom] || {}
      const dossier = path.join(PROFILES_DIR, nom)
      const description =
        nom === 'default'
          ? 'Orchestrateur. Recoit la demande, etablit le plan, choisit qui appeler et rassemble les resultats.'
          : lireDescription(path.join(dossier, 'profile.yaml'))

      return {
        id: nom,
        nom: connu.nom || nom.charAt(0).toUpperCase() + nom.slice(1),
        // Le profil par defaut n'a pas de nom en ligne de commande : le nommer
        // changerait le home d'Hermes.
        profil: nom === 'default' ? null : nom,
        role: connu.role || lireRole(description),
        couleur: connu.couleur || couleurs.get(nom) || 'ardoise',
        icone: connu.icone || 'agent',
        description,
        /** Ce qu'il fait, en trois mots - de quoi le reconnaitre sans lire sa
            fiche entiere. */
        metier: connu.metier || lireMetier(description),
        modele: lireModele(path.join(nom === 'default' ? HERMES_HOME : dossier, 'config.yaml')),
        pretAServir: estPret(nom),
        taches: 0,
        enCours: 0,
        finies: 0,
      }
    })
    .sort((a, b) => (RANG[a.role] ?? 9) - (RANG[b.role] ?? 9) || a.nom.localeCompare(b.nom))
}

// -----------------------------------------------------------------------------
// Les equipes
// -----------------------------------------------------------------------------
/**
 * Une equipe est un groupe d'agents qu'on nomme et qu'on appelle d'un bloc.
 *
 * A ne pas confondre avec un pole, qui est un graphe de taches : le pole dit
 * ce qui est fait, l'equipe dit qui pourrait le faire. Un agent appartient a
 * autant d'equipes qu'on veut.
 *
 * Le fichier appartient au Hub - Hermes n'a pas cette notion.
 */
const FICHIER_EQUIPES = path.join(HUB_DIR, 'equipes.json')

export function lireEquipes() {
  const brut = readJson(FICHIER_EQUIPES, null)
  if (!Array.isArray(brut)) return []

  const existants = new Set(listerAgents().map((a) => a.id))
  return brut
    .filter((e) => e && typeof e.nom === 'string')
    .map((e) => ({
      id: String(e.id || e.nom).toLowerCase().replace(/\s+/g, '-'),
      nom: e.nom,
      couleur: e.couleur || 'ciel',
      // Un profil supprime en ligne de commande ne doit pas laisser un membre
      // fantome dans l'equipe.
      membres: (Array.isArray(e.membres) ? e.membres : []).filter((m) => existants.has(m)),
    }))
}

export function ecrireEquipes(equipes) {
  writeJson(FICHIER_EQUIPES, equipes)
  return lireEquipes()
}

/**
 * Creer, renommer, dissoudre.
 *
 * POURQUOI CES TROIS N'EXISTAIENT PAS. `lireEquipes` et `ecrireEquipes` sont la
 * depuis le debut ; la seconde n'etait appelee de NULLE PART. L'ecran affichait
 * donc des equipes que personne ne pouvait fabriquer, changer ni jeter - le seul
 * moyen d'en creer une etait d'editer `.hub/equipes.json` a la main. Mesure le
 * 03/08/2026 : aucune route, aucun appel. kuchu : « on voit juste les equipes,
 * on ne peut meme pas parametrer, donc on peut l'enlever ».
 *
 * On ne l'enleve pas : `@NomDEquipe` REVEILLE le groupe en conversation, et
 * c'est le seul moyen d'appeler cinq agents sans taper cinq noms. Ce n'est pas
 * la fonctionnalite qui manquait, c'est la porte.
 *
 * Le nom est la cle : c'est lui qu'on tape apres l'arobase. Deux equipes de meme
 * nom rendraient une mention ambigue, et le Hub choisirait pour toi - donc on
 * refuse.
 */
function identifiant(nom) {
  return String(nom).trim().toLowerCase().replace(/\s+/g, '-')
}

function exigerNom(nom, equipes, saufId = null) {
  const n = String(nom || '').trim()
  if (n.length < 2 || n.length > 40) {
    const err = new Error("Le nom d'une equipe tient entre 2 et 40 caracteres.")
    err.status = 400
    throw err
  }
  // L'arobase et les espaces multiples casseraient la lecture des mentions.
  if (/[@\n\r]/.test(n)) {
    const err = new Error("Le nom d'une equipe ne peut pas contenir d'arobase.")
    err.status = 400
    throw err
  }
  if (equipes.some((e) => e.id !== saufId && identifiant(e.nom) === identifiant(n))) {
    const err = new Error(`Une equipe s'appelle deja « ${n} ». Les mentions seraient ambigues.`)
    err.status = 409
    throw err
  }
  return n
}

/** Des membres qui existent vraiment, sans doublon, dans l'ordre donne. */
function exigerMembres(membres) {
  const existants = new Set(listerAgents().map((a) => a.id))
  const vus = new Set()
  const propres = (Array.isArray(membres) ? membres : [])
    .map((m) => String(m))
    .filter((m) => existants.has(m) && !vus.has(m) && vus.add(m))
  if (propres.length === 0) {
    const err = new Error('Une equipe sans membre n-appellerait personne : choisis au moins un agent.')
    err.status = 400
    throw err
  }
  return propres
}

export function creerEquipe({ nom, membres, couleur }) {
  const brut = readJson(FICHIER_EQUIPES, null)
  const liste = Array.isArray(brut) ? brut : []
  const courantes = lireEquipes()
  const n = exigerNom(nom, courantes)
  const m = exigerMembres(membres)
  liste.push({ id: identifiant(n), nom: n, couleur: couleur || 'ciel', membres: m })
  ecrireEquipes(liste)
  return lireEquipes().find((e) => e.id === identifiant(n))
}

export function modifierEquipe(id, { nom, membres, couleur }) {
  const brut = readJson(FICHIER_EQUIPES, null)
  const liste = Array.isArray(brut) ? brut : []
  const courantes = lireEquipes()
  const i = liste.findIndex((e) => identifiant(e.id || e.nom) === id)
  if (i < 0) {
    const err = new Error('Equipe inconnue')
    err.status = 404
    throw err
  }
  const n = nom === undefined ? liste[i].nom : exigerNom(nom, courantes, id)
  const m = membres === undefined ? liste[i].membres : exigerMembres(membres)
  liste[i] = { ...liste[i], id: identifiant(n), nom: n, membres: m, couleur: couleur || liste[i].couleur }
  ecrireEquipes(liste)
  return lireEquipes().find((e) => e.id === identifiant(n))
}

export function dissoudreEquipe(id) {
  const brut = readJson(FICHIER_EQUIPES, null)
  const liste = Array.isArray(brut) ? brut : []
  const restantes = liste.filter((e) => identifiant(e.id || e.nom) !== id)
  if (restantes.length === liste.length) {
    const err = new Error('Equipe inconnue')
    err.status = 404
    throw err
  }
  // Dissoudre ne touche AUCUN agent : une equipe n'est qu'un nom pose sur des
  // profils qui existent par eux-memes. C'est ce qui rend le geste sans danger,
  // et ce qui doit se lire a l'ecran avant de cliquer.
  ecrireEquipes(restantes)
  return { id, dissoute: true }
}

// -----------------------------------------------------------------------------
// Le tableau
// -----------------------------------------------------------------------------
let sqlite = null
let sqliteTeste = false

/** `node:sqlite` n'existe qu'a partir de Node 22.5. Sur un poste plus ancien on
    ne fait pas semblant : on rend une raison lisible plutot qu'un ecran vide. */
async function chargerSqlite() {
  if (sqliteTeste) return sqlite
  sqliteTeste = true
  try {
    sqlite = await import('node:sqlite')
  } catch {
    sqlite = null
  }
  return sqlite
}

const FINIS = new Set(['done'])

/**
 * Un pole est une composante connexe du graphe de taches.
 *
 * On ne se fie pas a un champ d'Hermes : `decompose` rattache les nouvelles
 * taches a l'ancienne en faisant de celle-ci leur *enfant* - elle depend d'elles
 * et se termine en dernier. Le lien parent->enfant dit donc « le parent doit
 * finir avant l'enfant », pas « l'enfant appartient au parent ». Regrouper par
 * composante connexe marche pour `decompose` comme pour `swarm`, sans connaitre
 * la maniere dont le graphe a ete construit.
 */
function grouperEnPoles(taches, liens) {
  const parent = new Map(taches.map((t) => [t.id, t.id]))
  const trouver = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x)
    }
    return x
  }
  const unir = (a, b) => {
    const ra = trouver(a)
    const rb = trouver(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const l of liens) {
    if (parent.has(l.de) && parent.has(l.vers)) unir(l.de, l.vers)
  }

  const groupes = new Map()
  for (const t of taches) {
    const r = trouver(t.id)
    if (!groupes.has(r)) groupes.set(r, [])
    groupes.get(r).push(t)
  }

  const poles = []
  const isolees = []

  for (const membres of groupes.values()) {
    if (membres.length < 2) {
      isolees.push(...membres)
      continue
    }
    const ids = new Set(membres.map((t) => t.id))
    const internes = liens.filter((l) => ids.has(l.de) && ids.has(l.vers))

    // La tache finale ne precede rien : c'est la demande d'origine, celle dont
    // le titre nomme le pole.
    const precede = new Set(internes.map((l) => l.de))
    const finales = membres.filter((t) => !precede.has(t.id))
    const tete = finales[0] || membres[membres.length - 1]

    poles.push({
      id: tete.id,
      titre: tete.titre,
      corps: tete.corps,
      taches: membres,
      liens: internes,
      enCours: membres.some((t) => t.etat === 'running'),
      finies: membres.filter((t) => FINIS.has(t.etat)).length,
      creeLe: Math.min(...membres.map((t) => t.creeLe || 0)),
    })
  }

  poles.sort((a, b) => b.creeLe - a.creeLe)
  return { poles, isolees }
}

export async function lireOrchestration() {
  const agents = listerAgents()
  const equipes = lireEquipes()

  if (!fs.existsSync(KANBAN_DB)) {
    return { agents, equipes, poles: [], isolees: [], tableau: { disponible: false, raison: 'init' } }
  }

  const mod = await chargerSqlite()
  if (!mod) {
    return { agents, equipes, poles: [], isolees: [], tableau: { disponible: false, raison: 'node' } }
  }

  let db
  try {
    db = new mod.DatabaseSync(KANBAN_DB, { readOnly: true })
  } catch (err) {
    return {
      agents,
      equipes,
      poles: [],
      isolees: [],
      tableau: { disponible: false, raison: 'lecture', message: err.message },
    }
  }

  try {
    const taches = db
      .prepare(
        `select id, title, body, assignee, status, created_at, started_at,
                completed_at, model_override
           from tasks
          where status != 'archived'
          order by created_at asc`,
      )
      .all()
      .map((t) => ({
        id: t.id,
        titre: t.title,
        corps: t.body || '',
        agent: t.assignee || null,
        etat: t.status,
        modele: t.model_override || null,
        creeLe: t.created_at || 0,
        demarreLe: t.started_at || null,
        finiLe: t.completed_at || null,
      }))

    const liens = db
      .prepare('select parent_id, child_id from task_links')
      .all()
      .map((l) => ({ de: l.parent_id, vers: l.child_id }))

    // Les compteurs de chaque agent, pour l'organigramme.
    const parAgent = new Map(agents.map((a) => [a.id, a]))
    for (const t of taches) {
      const a = parAgent.get(t.agent || 'default')
      if (!a) continue
      a.taches += 1
      if (t.etat === 'running') a.enCours += 1
      else if (FINIS.has(t.etat)) a.finies += 1
    }
    // Un agent n'est eveille que le temps d'une tache.
    for (const a of agents) a.eveille = a.enCours > 0

    const { poles, isolees } = grouperEnPoles(taches, liens)
    return { agents, equipes, poles, isolees, tableau: { disponible: true } }
  } catch (err) {
    return {
      agents,
      equipes,
      poles: [],
      isolees: [],
      tableau: { disponible: false, raison: 'lecture', message: err.message },
    }
  } finally {
    try {
      db.close()
    } catch {
      /* deja fermee */
    }
  }
}
