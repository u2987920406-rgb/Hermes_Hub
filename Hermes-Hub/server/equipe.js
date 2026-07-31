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
 * Les profils sont ancres au dossier utilisateur et non au home actif : un bac
 * a sable qui deplace HERMES_KANBAN_DB garde donc la meme equipe, ce qui est
 * voulu - on developpe avec ses vrais agents sur un faux tableau.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HERMES_HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
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
const PALETTE = ['ciel', 'violet', 'emeraude', 'rose', 'ambre', 'cyan', 'orange']

const CONNUS = {
  default: { nom: 'Hermes', role: 'orchestrateur', couleur: 'ardoise', icone: 'boussole' },
  trieur: { nom: 'Trieur', role: 'worker', couleur: 'ciel', icone: 'entonnoir' },
  redacteur: { nom: 'Redacteur', role: 'worker', couleur: 'violet', icone: 'plume' },
  clean: { nom: 'Clean', role: 'bac-a-sable', couleur: 'ardoise', icone: 'etincelle' },
}

/** Couleur stable pour un profil inconnu : le meme agent garde la sienne d'une
    session a l'autre, sinon l'organigramme changerait de sens a chaque visite. */
function couleurStable(nom) {
  let somme = 0
  for (let i = 0; i < nom.length; i++) somme = (somme + nom.charCodeAt(i) * (i + 1)) % 9973
  return PALETTE[somme % PALETTE.length]
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

  return [...noms]
    .map((nom) => {
      const connu = CONNUS[nom] || {}
      const dossier = path.join(PROFILES_DIR, nom)

      return {
        id: nom,
        nom: connu.nom || nom.charAt(0).toUpperCase() + nom.slice(1),
        // Le profil par defaut n'a pas de nom en ligne de commande : le nommer
        // changerait le home d'Hermes.
        profil: nom === 'default' ? null : nom,
        role: connu.role || 'worker',
        couleur: connu.couleur || couleurStable(nom),
        icone: connu.icone || 'agent',
        description:
          nom === 'default'
            ? 'Orchestrateur. Recoit la demande, etablit le plan, choisit qui appeler et rassemble les resultats.'
            : lireDescription(path.join(dossier, 'profile.yaml')),
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

  if (!fs.existsSync(KANBAN_DB)) {
    return { agents, poles: [], isolees: [], tableau: { disponible: false, raison: 'init' } }
  }

  const mod = await chargerSqlite()
  if (!mod) {
    return { agents, poles: [], isolees: [], tableau: { disponible: false, raison: 'node' } }
  }

  let db
  try {
    db = new mod.DatabaseSync(KANBAN_DB, { readOnly: true })
  } catch (err) {
    return {
      agents,
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
    return { agents, poles, isolees, tableau: { disponible: true } }
  } catch (err) {
    return {
      agents,
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
