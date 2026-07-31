/**
 * L'Agora - l'equipe et le plan en cours.
 *
 * Deux sources, aucune base de donnees propre au Hub :
 *
 *   - les agents sont les profils d'Hermes (`%LOCALAPPDATA%\hermes\profiles`),
 *     leur description vient de `profile.yaml` - c'est elle que le decomposeur
 *     de kanban lit pour router une tache vers le bon specialiste ;
 *   - le plan est le graphe de taches de `kanban.db`, lu en direct.
 *
 * On lit la base plutot que d'appeler `hermes kanban list` : un appel de CLI
 * coute environ deux secondes, et il en faudrait un par tache pour obtenir les
 * dependances. La lecture SQLite rend tout le graphe d'un coup.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HERMES_HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
const PROFILES_DIR = path.join(HERMES_HOME, 'profiles')
const KANBAN_DB = path.join(HERMES_HOME, 'kanban.db')

// -----------------------------------------------------------------------------
// Presentation des agents
// -----------------------------------------------------------------------------
/**
 * Couleur et icone ne viennent pas d'Hermes, qui n'en a pas la notion : c'est
 * le Hub qui les attribue. Un agent doit se reconnaitre d'un coup d'oeil dans
 * l'organigramme, sans lire son nom.
 */
const PALETTE = ['sky', 'violet', 'emerald', 'rose', 'amber', 'teal', 'indigo']

const CONNUS = {
  default: { nom: 'Hermes', role: 'orchestrateur', couleur: 'gold', icone: 'crown' },
  trieur: { nom: 'Trieur', role: 'worker', couleur: 'sky', icone: 'folder-tree' },
  redacteur: { nom: 'Redacteur', role: 'worker', couleur: 'violet', icone: 'pen-line' },
  clean: { nom: 'Clean', role: 'bac-a-sable', couleur: 'slate', icone: 'sparkles' },
}

/** Couleur stable pour un profil inconnu : le meme agent garde la sienne d'une
    session a l'autre, sinon l'organigramme changerait de sens a chaque visite. */
function couleurStable(nom) {
  let somme = 0
  for (let i = 0; i < nom.length; i++) somme = (somme + nom.charCodeAt(i) * (i + 1)) % 9973
  return PALETTE[somme % PALETTE.length]
}

/** `description: |` sur plusieurs lignes, ou sur une seule. Un vrai analyseur
    YAML serait une dependance npm pour deux champs : on lit ce qu'on connait. */
function lireProfileYaml(fichier) {
  let brut
  try {
    brut = fs.readFileSync(fichier, 'utf8')
  } catch {
    return ''
  }

  const lignes = brut.split(/\r?\n/)
  const morceaux = []
  let dedans = false

  for (const ligne of lignes) {
    if (!dedans) {
      const m = ligne.match(/^description:\s*(.*)$/)
      if (!m) continue
      dedans = true
      const reste = m[1].trim()
      // `description: |` ou `>` : la valeur est sur les lignes indentees.
      if (reste && reste !== '|' && reste !== '>' && reste !== '|-' && reste !== '>-') {
        morceaux.push(reste)
      }
      continue
    }
    // La suite n'appartient a la description que tant qu'elle est indentee.
    if (/^\s+\S/.test(ligne)) morceaux.push(ligne.trim())
    else break
  }

  const valeur = morceaux.join(' ').trim()

  // YAML met la valeur entre apostrophes des qu'elle contient un `:`, et y
  // double les apostrophes internes. Sans ce retour en arriere, l'interface
  // afficherait « d''analyse ».
  if (valeur.startsWith("'") && valeur.endsWith("'")) {
    return valeur.slice(1, -1).replace(/''/g, "'").trim()
  }
  if (valeur.startsWith('"') && valeur.endsWith('"')) {
    return valeur.slice(1, -1).replace(/\\"/g, '"').trim()
  }
  return valeur
}

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
      const description =
        nom === 'default'
          ? "Orchestrateur. Recoit la demande, etablit le plan, choisit qui appeler et rassemble les resultats."
          : lireProfileYaml(path.join(PROFILES_DIR, nom, 'profile.yaml'))

      return {
        id: nom,
        nom: connu.nom || nom.charAt(0).toUpperCase() + nom.slice(1),
        // Le profil par defaut n'a pas de nom en ligne de commande : le nommer
        // changerait le home d'Hermes.
        profil: nom === 'default' ? null : nom,
        role: connu.role || 'worker',
        couleur: connu.couleur || couleurStable(nom),
        icone: connu.icone || 'bot',
        description,
        // Un profil sans `.env` rempli n'a aucune credential et ne repondra
        // jamais : autant le dire ici plutot que de le decouvrir a l'execution.
        pretAServir: estPret(nom),
      }
    })
    .sort((a, b) => {
      const rang = { orchestrateur: 0, manager: 1, worker: 2, 'bac-a-sable': 3 }
      return (rang[a.role] ?? 9) - (rang[b.role] ?? 9) || a.nom.localeCompare(b.nom)
    })
}

function estPret(nom) {
  if (nom === 'default') return true
  const env = path.join(PROFILES_DIR, nom, '.env')
  try {
    // Un `.env` fraichement cree ne contient que des commentaires : ce n'est
    // pas la presence du fichier qui compte, c'est qu'il porte une cle.
    return /^[A-Z0-9_]+\s*=\s*\S/m.test(fs.readFileSync(env, 'utf8'))
  } catch {
    return false
  }
}

// -----------------------------------------------------------------------------
// Le plan
// -----------------------------------------------------------------------------
let sqlite = null
let sqliteTeste = false

/** `node:sqlite` n'existe qu'a partir de Node 22.5. Sur un poste plus ancien on
    ne fait pas semblant : on rend une erreur lisible plutot qu'un ecran vide. */
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

export async function lirePlan() {
  if (!fs.existsSync(KANBAN_DB)) {
    return { disponible: false, raison: 'init', taches: [], liens: [] }
  }

  const mod = await chargerSqlite()
  if (!mod) {
    return { disponible: false, raison: 'node', taches: [], liens: [] }
  }

  let db
  try {
    db = new mod.DatabaseSync(KANBAN_DB, { readOnly: true })
  } catch (err) {
    return { disponible: false, raison: 'lecture', message: err.message, taches: [], liens: [] }
  }

  try {
    const taches = db
      .prepare(
        `select id, title, body, assignee, status, priority, created_at, started_at,
                completed_at, result, model_override, last_failure_error
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
        creeLe: t.created_at,
        demarreLe: t.started_at,
        finiLe: t.completed_at,
        resultat: t.result || null,
        erreur: t.last_failure_error || null,
      }))

    const vivantes = new Set(taches.map((t) => t.id))
    const liens = db
      .prepare('select parent_id, child_id from task_links')
      .all()
      // Une tache archivee laisse ses liens derriere elle : une arete vers un
      // noeud absent ferait une fleche dans le vide.
      .filter((l) => vivantes.has(l.parent_id) && vivantes.has(l.child_id))
      .map((l) => ({ de: l.parent_id, vers: l.child_id }))

    return { disponible: true, taches, liens }
  } finally {
    db.close()
  }
}

/**
 * L'equipe et le plan ensemble : c'est ce que l'ecran affiche, et le compte des
 * taches par agent decide de qui est represente comme eveille.
 */
export async function lireAgora() {
  const plan = await lirePlan()
  const agents = listerAgents()

  const parAgent = new Map()
  for (const t of plan.taches) {
    if (!t.agent) continue
    const c = parAgent.get(t.agent) || { total: 0, enCours: 0, finies: 0 }
    c.total++
    if (t.etat === 'running') c.enCours++
    if (t.etat === 'done') c.finies++
    parAgent.set(t.agent, c)
  }

  return {
    agents: agents.map((a) => {
      const c = parAgent.get(a.id) || { total: 0, enCours: 0, finies: 0 }
      return {
        ...a,
        taches: c.total,
        enCours: c.enCours,
        finies: c.finies,
        // « Se reveille et se rendort » : un agent n'est eveille que le temps
        // d'une tache, il n'y a pas de process qui l'attend entre deux.
        eveille: c.enCours > 0,
      }
    }),
    plan,
  }
}
