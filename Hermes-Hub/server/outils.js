/**
 * Les outils MCP de l'equipe.
 *
 * POURQUOI CETTE PIECE EXISTE - et c'est une mesure, pas une intuition. Le
 * 03/08/2026, un serveur MCP temoin a ete branche sur le profil par defaut,
 * puis interroge par quatre chemins avec une chaine indevinable :
 *
 *   sofia par le Hub .......... OUTIL ABSENT
 *   sofia par le terminal ..... OUTIL ABSENT
 *   default par le terminal ... la chaine
 *   default par le Hub ........ la chaine
 *
 * Le Hub ne perd donc rien - c'etait le soupcon de depart, il est leve. Mais
 * LES SERVEURS MCP SONT PAR PROFIL : chaque profil est un home complet avec son
 * propre `config.yaml`. Un client qui branche son outil metier avec
 * `hermes mcp add` le donne a Hermes seul, et jamais a `a-analyste`,
 * `b-redacteur`, `c-metteur` - ceux-la memes qui executent ses taches.
 *
 * Rien ne le signale. L'agent ne dit pas « je n'ai pas cet outil » : il fait
 * autrement, ou il invente. C'est la pire forme de panne, celle qui rend un
 * resultat plausible.
 *
 * LECTURE SUR LE DISQUE, ECRITURE PAR LA LIGNE DE COMMANDE - la regle du depot.
 * Ici elle coute cher et on la garde quand meme : donner un outil a quatre
 * profils, c'est quatre appels de CLI qui reconnectent le serveur a chaque fois,
 * soit plusieurs secondes chacun. Copier le bloc YAML d'un fichier a l'autre
 * serait instantane, et faux : `hermes` valide l'entree (il refuse les
 * commandes en forme d'exfiltration), pose `_config_version`, et reecrit le
 * fichier avec ses commentaires. Ces invariants ne sont pas a nous.
 *
 * DEUX PIEGES MESURES SUR LA LIGNE DE COMMANDE :
 *
 *   - `mcp add` finit par un `input()` brut - « Enable all N tools? ». Sans rien
 *     sur stdin il recoit EOF et ANNULE, sans rien ecrire et en sortant par 0.
 *     Un Hub qui ne nourrit pas stdin croirait donc avoir branche l'outil. On
 *     envoie une ligne vide, qui vaut « tous les outils ».
 *   - `mcp remove`, lui, passe par un `_confirm(default=True)` : EOF vaut oui.
 *     Celui-la marche deja sans terminal.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { listerAgents } from './equipe.js'

const HERMES_HOME =
  process.env.HERMES_HOME || path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')

/** Ce qu'Hermes accepte comme cle de config pour un serveur. */
const NOM_VALIDE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

/**
 * Brancher un serveur reconnecte et redecouvre ses outils, une fois par profil.
 * Mesure : de deux a dix secondes selon le serveur. Multiplie par une equipe,
 * l'attente est reelle - l'interface doit le dire, pas la masquer.
 */
const DELAI = 120000

/** Le profil par defaut n'a pas de nom : le nommer changerait le home. */
function configDe(profil) {
  return profil && profil !== 'default'
    ? path.join(HERMES_HOME, 'profiles', profil, 'config.yaml')
    : path.join(HERMES_HOME, 'config.yaml')
}

function trouverHermes() {
  const local = path.join(HERMES_HOME, 'hermes-agent', 'venv', 'Scripts', 'hermes.exe')
  if (fs.existsSync(local)) return local
  return process.platform === 'win32' ? 'hermes.exe' : 'hermes'
}

function hermes(profil, args, entree = '\n') {
  const avant = profil && profil !== 'default' ? ['--profile', profil] : []
  return spawnSync(trouverHermes(), [...avant, 'mcp', ...args], {
    input: entree,
    windowsHide: true,
    timeout: DELAI,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
}

// -----------------------------------------------------------------------------
// Lire
// -----------------------------------------------------------------------------
/**
 * Les serveurs d'un `config.yaml`, sans analyseur YAML.
 *
 * Le serveur n'a aucune dependance npm et n'en aura pas pour ceci. On ne lit
 * que ce dont l'interface a besoin - le nom, le transport, l'interrupteur - et
 * on s'appuie sur la forme qu'Hermes ECRIT, verifiee le 03/08/2026 : bloc a
 * deux espaces, un serveur par cle, valeurs scalaires ou liste a tirets.
 *
 * Un fichier ecrit a la main en style « flow » (`mcp_servers: {a: {...}}`)
 * rendrait donc une liste vide. C'est assume et c'est le bon defaut : mieux
 * vaut ne rien annoncer que d'annoncer faux. La ligne de commande reste la
 * reference, et l'interface y renvoie.
 */
export function lireServeurs(fichier) {
  let brut
  try {
    brut = fs.readFileSync(fichier, 'utf8')
  } catch {
    return {}
  }

  const lignes = brut.split(/\r?\n/)
  const debut = lignes.findIndex((l) => /^mcp_servers:\s*$/.test(l))
  if (debut === -1) return {}

  const serveurs = {}
  let courant = null
  let listeEnCours = null

  for (let i = debut + 1; i < lignes.length; i++) {
    const ligne = lignes[i]
    if (!ligne.trim() || ligne.trimStart().startsWith('#')) continue
    // Retour a la marge : on a quitte le bloc.
    if (/^\S/.test(ligne)) break

    const nom = ligne.match(/^ {2}([A-Za-z0-9][A-Za-z0-9_-]*):\s*$/)
    if (nom) {
      courant = nom[1]
      listeEnCours = null
      serveurs[courant] = { args: [], env: {}, headers: {} }
      continue
    }
    if (!courant) continue

    const champ = ligne.match(/^ {4}([a-z_]+):\s*(.*)$/)
    if (champ) {
      const [, cle, valeur] = champ
      listeEnCours = valeur.trim() === '' ? cle : null
      if (valeur.trim() === '') continue
      const v = valeur.trim().replace(/^['"]|['"]$/g, '')
      if (cle === 'enabled') serveurs[courant].enabled = v !== 'false'
      else if (cle === 'command') serveurs[courant].command = v
      else if (cle === 'url') serveurs[courant].url = v
      continue
    }

    // Suite d'une liste (`args`) ou d'une table (`env`, `headers`, `tools`).
    const tiret = ligne.match(/^ {6}- (.*)$/)
    if (tiret && listeEnCours === 'args') {
      serveurs[courant].args.push(tiret[1].trim().replace(/^['"]|['"]$/g, ''))
      continue
    }
    const paire = ligne.match(/^ {6}([A-Za-z0-9_-]+):\s*(.*)$/)
    if (paire && (listeEnCours === 'env' || listeEnCours === 'headers')) {
      serveurs[courant][listeEnCours][paire[1]] = paire[2].trim().replace(/^['"]|['"]$/g, '')
    }
  }

  return serveurs
}

/** De quoi le reconnaitre d'un coup d'oeil dans une liste. */
function resumer(entree) {
  if (entree.url) return entree.url
  const args = entree.args || []
  const dernier = args.length ? args[args.length - 1] : ''
  return [entree.command, dernier].filter(Boolean).join(' ')
}

/**
 * Qui compte comme « l'equipe ».
 *
 * Hermes lui-meme en fait partie : c'est lui qui recoit la demande, et un outil
 * qu'il ignore ne sera jamais propose dans un plan. Le bac a sable, non - il
 * existe pour eprouver l'installation, pas pour travailler, et l'y inclure
 * ferait payer un appel de plus a chaque branchement.
 */
export function equipeVisee() {
  return listerAgents()
    .map((a) => a.id)
    .filter((id) => id !== 'clean')
}

/**
 * Tous les outils du poste, et qui les a.
 *
 * `manque` est le champ qui travaille : c'est lui qui rend visible la panne
 * silencieuse. Un outil que seul Hermes possede s'affiche « 1 agent sur 4 »,
 * et le bouton d'a cote le repare.
 */
export function listerOutils() {
  const equipe = equipeVisee()
  const parProfil = new Map(equipe.map((id) => [id, lireServeurs(configDe(id))]))

  const noms = new Set()
  for (const serveurs of parProfil.values()) for (const n of Object.keys(serveurs)) noms.add(n)

  const outils = [...noms].sort().map((nom) => {
    const present = equipe.filter((id) => parProfil.get(id)[nom])
    const manque = equipe.filter((id) => !parProfil.get(id)[nom])
    // On decrit l'outil d'apres l'entree la plus riche : un profil peut l'avoir
    // recu avec ses variables d'environnement et un autre sans.
    const entree = present
      .map((id) => parProfil.get(id)[nom])
      .sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0]

    const pourquoiPas = raisonDeNePasRepartir(entree)
    return {
      nom,
      transport: entree.url ? 'http' : 'stdio',
      resume: resumer(entree),
      actif: entree.enabled !== false,
      present,
      manque,
      partout: manque.length === 0,
      pourquoiPas,
    }
  })

  return { equipe, outils }
}

// -----------------------------------------------------------------------------
// Ecrire
// -----------------------------------------------------------------------------
function exigerNom(nom) {
  const n = String(nom || '').trim()
  if (!NOM_VALIDE.test(n)) {
    const err = new Error(
      "Le nom de l'outil doit tenir en lettres, chiffres, tirets et soulignes, sans espace.",
    )
    err.status = 400
    throw err
  }
  return n
}

/**
 * Ce qui empeche de recopier un outil vers un autre agent.
 *
 * Un en-tete d'authentification ou un jeton OAuth ne se relit pas depuis la
 * ligne de commande : `mcp add --auth header` demande le secret a la main, et
 * un jeton OAuth appartient au profil qui l'a obtenu. On le dit plutot que de
 * brancher un serveur qui repondra 401 sans expliquer pourquoi.
 */
function raisonDeNePasRepartir(entree) {
  if (Object.keys(entree.headers || {}).length) {
    return "Cet outil porte un en-tete d'authentification, qui ne se recopie pas : ajoute-le a chaque agent depuis le formulaire, avec son secret."
  }
  if (!entree.url && !entree.command) {
    return "Cet outil est configure d'une facon que le Hub ne sait pas relire. Passe par « hermes mcp add »."
  }
  return null
}

/**
 * L'entree d'un outil, retournee en ligne de commande.
 *
 * Exportee pour ses tests, comme `normaliserNom` l'est dans `agents.js` et pour
 * la meme raison : c'est la seule piece qu'on ne peut pas eprouver au travers
 * des verbes sans brancher de vrais serveurs sur de vrais profils. Et c'est la
 * plus fragile - `--args` avale tout ce qui suit, donc un seul champ place
 * apres lui part en argument du serveur au lieu d'etre lu par Hermes.
 */
export function argsDepuis(entree) {
  const args = []
  if (entree.url) args.push('--url', entree.url)
  for (const [k, v] of Object.entries(entree.env || {})) args.push('--env', `${k}=${v}`)
  // `--args` avale tout ce qui suit : il passe en dernier, toujours.
  if (entree.command) {
    args.push('--command', entree.command)
    if (entree.args?.length) args.push('--args', ...entree.args)
  }
  return args
}

/**
 * Le compte rendu d'un appel, lu dans ce qu'Hermes ANNONCE.
 *
 * Le code de sortie ne suffit pas : une annulation sort par 0. On cherche donc
 * la phrase de succes, et a defaut la derniere ligne utile - c'est elle qui
 * porte le refus de securite (« NOT saved due to suspicious configuration »),
 * le seul motif d'echec qu'un utilisateur doit pouvoir lire tel quel.
 */
function compteRendu(r) {
  const texte = `${r.stdout || ''}${r.stderr || ''}`
  if (r.error?.code === 'ETIMEDOUT' || r.signal) {
    return { ok: false, message: "Le serveur n'a pas repondu a temps." }
  }
  if (/\bSaved\b|\bRemoved\b/i.test(texte)) return { ok: true, message: null }

  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.replace(/\[[0-9;]*m/g, '').trim())
    .filter((l) => l && !/^Enable all|^Connecting|^Remove server/i.test(l))
  return { ok: false, message: lignes[lignes.length - 1] || "Hermes n'a rien annonce." }
}

/**
 * Brancher un outil sur plusieurs agents d'un coup.
 *
 * On ne s'arrete pas au premier echec : un serveur peut manquer sur un profil
 * dont la cle n'est pas posee, et les autres doivent quand meme l'avoir. Le
 * compte rendu est donc par agent, et l'interface montre les deux colonnes.
 */
export function brancherOutil({ nom, commande, args, url, env, pour }) {
  const n = exigerNom(nom)
  const entree = {
    command: String(commande || '').trim() || undefined,
    args: Array.isArray(args) ? args.filter((a) => String(a).trim()) : [],
    url: String(url || '').trim() || undefined,
    env: env && typeof env === 'object' ? env : {},
  }
  if (!entree.command && !entree.url) {
    const err = new Error("Donne soit une adresse (http), soit une commande a lancer (stdio).")
    err.status = 400
    throw err
  }

  const cibles = choisirCibles(pour)
  const ligne = argsDepuis(entree)
  return {
    nom: n,
    resultats: cibles.map((profil) => ({ profil, ...compteRendu(hermes(profil, ['add', n, ...ligne])) })),
  }
}

/**
 * Donner a toute l'equipe un outil que quelqu'un a deja.
 *
 * C'est le geste qui repare la panne mesuree : un client branche son outil
 * metier au terminal, il arrive sur Hermes seul, et ses agents travaillent sans.
 */
export function repartirOutil(nom) {
  const n = exigerNom(nom)
  const { outils } = listerOutils()
  const outil = outils.find((o) => o.nom === n)
  if (!outil) {
    const err = new Error(`Aucun agent ne connait l'outil « ${n} ».`)
    err.status = 404
    throw err
  }
  if (outil.partout) return { nom: n, resultats: [], deja: true }
  if (outil.pourquoiPas) {
    const err = new Error(outil.pourquoiPas)
    err.status = 409
    throw err
  }

  const source = lireServeurs(configDe(outil.present[0]))[n]
  const ligne = argsDepuis(source)
  return {
    nom: n,
    resultats: outil.manque.map((profil) => ({
      profil,
      ...compteRendu(hermes(profil, ['add', n, ...ligne])),
    })),
  }
}

/** Retirer un outil. Sans `pour`, on le retire de partout ou il se trouve. */
export function debrancherOutil(nom, pour) {
  const n = exigerNom(nom)
  const cibles = pour
    ? choisirCibles(pour)
    : equipeVisee().filter((id) => lireServeurs(configDe(id))[n])

  return {
    nom: n,
    // stdin vide : `mcp remove` prend EOF pour un oui.
    resultats: cibles.map((profil) => ({ profil, ...compteRendu(hermes(profil, ['remove', n], '')) })),
  }
}

/**
 * `pour` absent vaut TOUTE L'EQUIPE, et ce defaut est le coeur de la piece.
 *
 * Le geste par defaut doit etre celui qui marche. Brancher un outil sur un seul
 * agent est le cas rare - et c'est pourtant ce que fait la ligne de commande,
 * d'ou la panne qu'on repare ici.
 */
function choisirCibles(pour) {
  const equipe = equipeVisee()
  if (!Array.isArray(pour) || pour.length === 0) return equipe
  const connus = new Set(equipe)
  const cibles = pour.map(String).filter((p) => connus.has(p))
  if (!cibles.length) {
    const err = new Error("Aucun des agents vises n'existe sur ce poste.")
    err.status = 400
    throw err
  }
  return cibles
}
