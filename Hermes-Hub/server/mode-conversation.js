/**
 * Discussion ou Atelier - dans quel mode la conversation se tient.
 *
 * DEUX MODES, ET AUCUN N'EST ENCORE UNE PROMESSE TENABLE.
 *
 *   - **Atelier** : ce que le Hub a toujours fait. L'agent demande, tu reponds,
 *     le laissez-passer decide de ce qui te derange. Rien ne change ici ;
 *   - **Discussion** : tout ce qui DEMANDE et n'est pas une lecture est refuse
 *     par le Hub, sans t'etre pose, et ca se dit dans le fil. ~~L'agent ne peut
 *     alors QUE lire.~~ **Non - le terminal ne demande pas.** Lire
 *     l'avertissement ci-dessous avant de poser un interrupteur dessus.
 *
 * POURQUOI CE MODULE EXISTE PLUTOT QU'UNE CONSIGNE DANS UN PROMPT. La question
 * a ete posee franchement au chantier 1, et la reponse a deplace le dispositif :
 * la session ACP s'ouvre par `session/new { cwd, mcpServers }`, et **il n'existe
 * aucun parametre de panoplie par tour** - on ne peut pas retirer les outils a
 * l'agent pour la duree d'un message. En revanche l'agent DEMANDE, et c'est le
 * Hub qui repond. ~~La garantie s'obtient donc en refusant cote Hub, ce qui la
 * rend vraie : ce n'est pas une consigne qu'un modele peut ignorer, c'est une
 * porte qu'il ne franchit pas.~~ **Faux, et mesure - voir l'avertissement
 * ci-dessous.** L'agent demande pour CERTAINS outils seulement.
 *
 * ⚠ CE MODULE NE SUFFIT PAS, ET IL FAUT LE LIRE AVANT DE S'EN SERVIR.
 *
 * Eprouve le 05/08/2026 sur la machine de kuchu, et le resultat a ete net :
 * Hermes a demande l'autorisation d'`edit`, le Hub a refuse - puis Hermes a
 * ecrit le meme fichier par **le terminal**, et cet appel-la n'est jamais passe
 * par `session/request_permission`. Zero demande posee, zero refus, exit_code 0.
 * Verifie une seconde fois en Atelier avec un simple `echo` : le terminal ne
 * demande RIEN, dans aucun mode.
 *
 * Ce que ce module fait, exactement : **il refuse tout ce qui demande.** Ce
 * qu'il ne fait pas : arreter ce qui ne demande pas - c'est-a-dire le shell,
 * c'est-a-dire tout. On ne peut donc PAS ecrire « il ne peut que lire » sous
 * un interrupteur. Ce serait un mensonge, et le pire genre : celui qui donne
 * confiance.
 *
 * La piste ACP est morte, elle aussi. Hermes n'annonce que trois modes -
 * `default` (« Ask before edits »), `accept_edits`, `dont_ask` - **et les trois
 * vont dans le sens permissif.** Aucun mode lecture seule, et aucun ne parle du
 * terminal. `session/set_mode` ne donnera pas la garantie.
 *
 * Ce qui reste a chercher est donc du cote d'Hermes, pas du Hub : une
 * configuration qui soumette le terminal a permission. Tant qu'elle n'est pas
 * trouvee, ce module est une moitie de porte - utile, honnete sur ce qu'il
 * fait, et incapable a lui seul de porter le mode Discussion du chantier 3.
 *
 * **Consequence qui depasse ce chantier, et qui vaut pour la version livree :**
 * le classement du laissez-passer (vert / orange / rouge) est aveugle au shell.
 * La carte qui annonce « exige ton accord » dit vrai des outils qui demandent,
 * et ne voit pas passer un `printf > fichier`.
 *
 * LE CHOIX SURVIT AU REDEMARRAGE, et ce n'est pas un detail de confort. Une
 * garantie qui se leve toute seule pendant qu'on a le dos tourne n'est pas une
 * garantie : quelqu'un qui a mis Discussion parce qu'il travaille sur des
 * fichiers qu'il ne veut pas voir bouger doit les retrouver intacts apres un
 * redemarrage du Hub. Le defaut, lui, reste **Atelier** - c'est le
 * comportement d'aujourd'hui, et personne ne doit decouvrir un beau matin que
 * plus rien ne s'ecrit sans avoir demande ce changement.
 */
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

export const MODES = ['atelier', 'discussion']

const FICHIER = path.join(HUB_DIR, 'mode-conversation.json')

/**
 * Le mode courant.
 *
 * Tout ce qui n'est pas exactement `discussion` rend `atelier` : un fichier
 * abime, une valeur d'une version future, une main qui a edite le JSON. On ne
 * veut jamais qu'une lecture douteuse ACTIVE une garantie - quelqu'un croirait
 * etre protege par un accident. Le doute rend donc le comportement ordinaire,
 * qui lui demande toujours avant d'ecrire.
 */
export function lireMode() {
  const brut = readJson(FICHIER, null)
  return { mode: brut?.mode === 'discussion' ? 'discussion' : 'atelier' }
}

export function ecrireMode(mode) {
  const propre = MODES.includes(mode) ? mode : 'atelier'
  writeJson(FICHIER, { mode: propre })
  return lireMode()
}

/** Vrai quand le Hub doit refuser tout ce qui n'est pas une lecture. */
export function enDiscussion() {
  return lireMode().mode === 'discussion'
}
