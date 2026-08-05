/**
 * Bascule automatique de modele.
 *
 * Nous Portal coupe le modele en cours sans prevenir : compte a sec, quota
 * atteint, service surcharge. Le piege, c'est que ca ne remonte pas comme une
 * erreur du protocole. Hermes retente trois fois de son cote, puis rend
 * l'echec sous forme de message d'assistant ordinaire, avec un `stopReason`
 * valant `end_turn` :
 *
 *     API call failed after 3 retries: HTTP 404: Model 'anthropic/claude-sonnet-5'
 *     requires available credits. Your account balance is too low [...]
 *
 * Guetter une erreur JSON-RPC ne declencherait donc jamais rien. C'est le
 * *contenu* de la reponse qu'il faut lire - d'ou `estPanneModele`.
 *
 * La liste des modeles gratuits n'est pas ecrite en dur : Hermes met en cache
 * ce que le portail lui a repondu, avec un ordre de preference. On s'en sert,
 * pour que l'ajout d'un modele gratuit chez Nous n'oblige pas a toucher au Hub.
 */
import os from 'node:os'
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

const HERMES_HOME = path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
const CACHE_NOUS = path.join(HERMES_HOME, 'cache', 'nous_recommended_cache.json')
const FICHIER_BASCULE = path.join(HUB_DIR, 'bascule.json')
const AUTH_HERMES = path.join(HERMES_HOME, 'auth.json')

// -----------------------------------------------------------------------------
// La session du fournisseur - « Internal error » a une vraie cause, sur le disque
// -----------------------------------------------------------------------------
/**
 * POURQUOI CE BOUT DE CODE EXISTE, ET CE QU'IL A COUTE DE NE PAS L'AVOIR.
 *
 * Le 05/08/2026 a 16:09 (UTC 14:09), la session Nous a ete revoquee. Douze
 * agents sur treize, Hermes lui-meme compris, se sont tus. Ce que le Hub
 * affichait :
 *
 *     Hermes n'a pas pu repondre : Internal error
 *
 * Ce que Hermes avait ecrit, tout seul, dans `auth.json`, au meme instant :
 *
 *     provider : nous          code : invalid_grant
 *     message  : « Refresh session has been revoked »
 *     reason   : credential_pool_refresh_failure
 *     relogin_required : True
 *
 * **L'information exacte etait sur le disque, en clair, et personne ne la
 * lisait.** Le matin meme, le §7 du plan avait diagnostique « credit error » -
 * un probleme d'argent. C'etait faux : c'est une reconnexion, et elle est
 * gratuite. On a failli rebasculer douze profils sur un autre modele pour
 * reparer une session expiree.
 *
 * `relogin_required` est le mot qui manquait a l'ecran. Un agent muet dont on
 * ignore la cause envoie chercher partout ; le meme agent avec « reconnecte-toi »
 * se repare en une commande.
 *
 * ⚠ On ne lit JAMAIS le jeton lui-meme, seulement le constat d'echec. Le
 * contenu d'`auth.json` n'a rien a faire dans un evenement qui part vers un
 * navigateur.
 */
export function lireSessionFournisseur() {
  const brut = readJson(AUTH_HERMES, null)
  const erreur = brut?.providers?.[brut?.active_provider]?.last_auth_error
  if (!erreur) return null

  // `relogin_required` est le seul champ qui commande un geste. Sans lui, une
  // erreur d'authentification ancienne et deja resolue ferait dire au Hub de se
  // reconnecter alors que tout marche - et une consigne qui se trompe une fois
  // n'est plus suivie ensuite.
  if (erreur.relogin_required !== true) return null

  return {
    fournisseur: String(brut.active_provider || 'le fournisseur'),
    code: erreur.code ? String(erreur.code) : null,
    quand: erreur.at ? String(erreur.at) : null,
  }
}

/**
 * La commande de reconnexion - **et elle est recopiee d'Hermes, pas inventee.**
 *
 * ⚠ CE COMMENTAIRE EXISTE PARCE QU'ON S'EST TROMPE, LE 05/08/2026 A 20:50.
 * La premiere version de ce fichier disait `hermes auth login <fournisseur>`.
 * **Cette sous-commande n'existe pas** - `hermes auth` n'offre que `add`,
 * `list`, `remove`, `reset`, `status`, `logout` et `spotify`. La commande avait
 * ete repetee quatre fois a kuchu, puis ECRITE DANS LE MESSAGE D'ERREUR DU
 * PRODUIT, sans jamais avoir ete lancee une seule fois.
 *
 * Un message d'erreur qui envoie taper une commande inexistante est pire que
 * « Internal error » : le second n'aide pas, le premier fait perdre du temps en
 * promettant de l'aide. C'est la meme faute que le bouton « Ouvrir le dossier »
 * qui ne pouvait pas marcher, et que le §2 du plan resume ainsi - prouver que la
 * donnee existe n'est pas prouver que le geste aboutit.
 *
 * `hermes model` est verifie deux fois : son `--help` existe et annonce
 * « Interactively select your inference provider and default model » avec les
 * options de connexion Nous, et c'est **le mot d'Hermes lui-meme** dans son
 * refus - « No access token found for Nous Portal login. Run `hermes model` to
 * re-authenticate. » On recopie sa phrase plutot que d'en fabriquer une.
 *
 * On ne nomme donc PAS de commande par fournisseur : `hermes model` est le
 * selecteur interactif qui les couvre tous, et deviner la porte de chacun
 * refabriquerait exactement l'erreur qu'on repare ici.
 */
const COMMANDE_RECONNEXION = 'hermes model'

/**
 * Le message brut d'Hermes, enrichi de la cause quand elle est connue.
 *
 * `Internal error` est le cas qui a coute cher, mais on n'essaie pas de
 * reconnaitre les messages opaques un par un : des qu'une session demande une
 * reconnexion, TOUTE panne d'agent a de bonnes chances d'en venir. On ajoute
 * donc la phrase sans remplacer le message d'origine - qui reste la seule piste
 * si la vraie cause est ailleurs.
 */
export function expliquerPanne(message) {
  const session = lireSessionFournisseur()
  if (!session) return message
  return (
    `${message} — la session ${session.fournisseur} a expire. ` +
    `Lance ${COMMANDE_RECONNEXION} dans un terminal pour te reconnecter.`
  )
}

// -----------------------------------------------------------------------------
// Reconnaitre une panne de modele
// -----------------------------------------------------------------------------
/**
 * Signes formels : la phrase ne peut pas apparaitre ailleurs que dans un echec
 * d'appel. On les accepte quelle que soit la longueur de la reponse.
 */
const SIGNES_CERTAINS = [
  [/API call failed after \d+ retries/i, 'appel refuse apres plusieurs essais'],
  [/requires available credits/i, 'credits epuises'],
  [/account balance is too low/i, 'credits epuises'],
  [/insufficient[_ ]quota/i, 'quota epuise'],
  [/insufficient (?:credits?|balance|funds)/i, 'credits epuises'],
]

/**
 * Signes probables : un modele peut tres bien *parler* de rate limit ou d'une
 * erreur 503 dans une reponse legitime. On ne les retient que si la reponse est
 * courte, parce qu'un echec d'appel remplace la reponse entiere au lieu de s'y
 * glisser.
 */
const SIGNES_PROBABLES = [
  [/\bHTTP (?:401|403|404|408|429|500|502|503|529)\b/, 'le fournisseur a refuse l-appel'],
  // Le code sans le mot « HTTP » : une exception le rend souvent nu. Volontai-
  // rement plus etroit que la ligne au-dessus - 401 et 403 disent un probleme
  // d'authentification, que changer de modele chez le meme fournisseur ne
  // reglerait pas, et 404 se promene trop en prose pour etre lu comme un signe.
  [/\b(?:status|code|error|returned)[ :]*(?:429|500|502|503|529)\b/i, 'le fournisseur a refuse l-appel'],
  [/rate[ _-]?limit/i, 'limite de debit atteinte'],
  [/\boverloaded\b/i, 'service surcharge'],
  [/\b(?:connection|connexion) (?:error|refused|reset|aborted)/i, 'connexion interrompue'],
]

/** Au-dela, c'est une vraie reponse : un echec d'appel tient en trois lignes. */
const SEUIL_REPONSE_COURTE = 800

/** @returns {string|null} la raison lisible, ou null si la reponse va bien. */
export function estPanneModele(texte) {
  const t = String(texte || '').trim()
  if (!t) return null

  for (const [motif, raison] of SIGNES_CERTAINS) {
    if (motif.test(t)) return raison
  }
  if (t.length > SEUIL_REPONSE_COURTE) return null
  for (const [motif, raison] of SIGNES_PROBABLES) {
    if (motif.test(t)) return raison
  }
  return null
}

// -----------------------------------------------------------------------------
// Les modeles gratuits, dans l'ordre du portail
// -----------------------------------------------------------------------------
export function estGratuit(id) {
  return /:free$/.test(String(id || ''))
}

/**
 * L'ordre de preference tel que Nous le publie (`freeRecommendedModels`). Le
 * cache appartient a Hermes : s'il manque ou a change de forme, on rend une
 * liste vide et l'appelant garde l'ordre de la session.
 */
function ordreDuPortail() {
  const cache = readJson(CACHE_NOUS, null)
  if (!cache || typeof cache !== 'object') return []

  for (const entree of Object.values(cache)) {
    const libres = entree?.data?.freeRecommendedModels
    if (Array.isArray(libres) && libres.length) {
      return libres.map((m) => String(m.modelName || '')).filter(Boolean)
    }
  }
  return []
}

/**
 * Les modeles gratuits d'une session, classes.
 *
 * Les identifiants de session portent leur fournisseur (`nous:tencent/hy3:free`)
 * la ou le cache ne nomme que le modele (`tencent/hy3:free`) : on rapproche les
 * deux par la fin de la chaine.
 */
export function gratuitsOrdonnes(modeles) {
  const gratuits = (modeles || []).map((m) => (typeof m === 'string' ? m : m.id)).filter(estGratuit)
  const ordre = ordreDuPortail()

  const rang = (id) => {
    const i = ordre.findIndex((nom) => id === nom || id.endsWith(':' + nom) || id.endsWith('/' + nom))
    // Un gratuit absent du cache passe apres ceux que le portail recommande,
    // sans etre ecarte : il reste un recours valable.
    return i === -1 ? ordre.length : i
  }

  return [...gratuits].sort((a, b) => rang(a) - rang(b))
}

/**
 * Le prochain modele a essayer : le premier gratuit qui n'a pas deja echoue
 * pendant ce message. `null` quand tous ont ete essayes - il faut alors
 * s'arreter et le dire, pas boucler.
 */
export function prochainGratuit(modeles, dejaEssayes = []) {
  const ecartes = new Set(dejaEssayes)
  return gratuitsOrdonnes(modeles).find((id) => !ecartes.has(id)) || null
}

// -----------------------------------------------------------------------------
// L'interrupteur
// -----------------------------------------------------------------------------
/**
 * Actif par defaut : sans crédits sur le compte, une coupure est le cas
 * courant, pas l'exception. Mais l'etat reste ecrit sur le disque des qu'on y
 * touche, pour survivre au redemarrage du Hub.
 */
export function lireBascule() {
  const etat = readJson(FICHIER_BASCULE, {})
  return etat.actif !== false
}

export function ecrireBascule(actif) {
  writeJson(FICHIER_BASCULE, { actif: actif === true })
  return actif === true
}
