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
]

/**
 * Signes probables : un modele peut tres bien *parler* de rate limit ou d'une
 * erreur 503 dans une reponse legitime. On ne les retient que si la reponse est
 * courte, parce qu'un echec d'appel remplace la reponse entiere au lieu de s'y
 * glisser.
 */
const SIGNES_PROBABLES = [
  [/\bHTTP (?:401|403|404|408|429|500|502|503|529)\b/, 'le fournisseur a refuse l-appel'],
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
