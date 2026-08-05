/**
 * Discussion ou Atelier - dans quel mode la conversation se tient.
 *
 * ~~DEUX MODES, ET AUCUN N'EST ENCORE UNE PROMESSE TENABLE.~~
 * **La promesse est tenable depuis le 05/08/2026 - le heurtoir a 02:50, ce
 * mode-ci a 03:02. Mais elle a DEUX pieces, et la seconde n'est pas dans ce
 * depot. Lire jusqu'en bas.**
 *
 *   - **Atelier** : ce que le Hub a toujours fait. L'agent demande, tu reponds,
 *     le laissez-passer decide de ce qui te derange. Rien ne change ici ;
 *   - **Discussion** : tout ce qui DEMANDE et n'est pas une lecture est refuse
 *     par le Hub, sans t'etre pose, et ca se dit dans le fil. ~~L'agent ne peut
 *     alors QUE lire.~~ ~~**Non - le terminal ne demande pas.**~~ **Il demande,
 *     si un greffon `pre_tool_call` l'y oblige cote Hermes** - voir plus bas.
 *     Sans ce greffon, la phrase barree reste vraie et l'interrupteur mentirait.
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
 * ~~Ce qui reste a chercher est donc du cote d'Hermes, pas du Hub : une
 * configuration qui soumette le terminal a permission. Tant qu'elle n'est pas
 * trouvee, ce module est une moitie de porte - utile, honnete sur ce qu'il
 * fait, et incapable a lui seul de porter le mode Discussion du chantier 3.~~
 *
 * ✅ TROUVE LE 05/08/2026 A 02:50 - CE MODULE N'EST PLUS UNE MOITIE DE PORTE.
 *
 * La configuration n'existe pas, et c'etait la bonne reponse a la mauvaise
 * question : `approvals.mode` ne se declenche que sur les 47 motifs de
 * `DANGEROUS_PATTERNS`, donc la garde d'Hermes porte sur le TEXTE de la
 * commande, pas sur l'outil - et `echo bonjour` n'est le texte de rien.
 *
 * Le crochet `pre_tool_call`, lui, porte sur l'outil. Un greffon pose dans le
 * home d'Hermes qui repond `{"action":"approve"}` force **n'importe quel**
 * appel a passer par `session/request_permission`, donc par ce Hub. Eprouve a
 * l'ecran : `echo bonjour` a ete classe **rouge**, une carte a ete posee, et
 * selon la reponse la commande n'a rien lance ou a rendu `exit_code 0`.
 *
 * **Il ne manquait pas une reecriture a ce module : il lui manquait que le
 * terminal vienne frapper.** La piece est hors de ce depot - elle vit dans le
 * home d'Hermes - et sa distribution chez un client reste a instruire.
 *
 * ~~**Consequence qui depasse ce chantier, et qui vaut pour la version livree :**
 * le classement du laissez-passer (vert / orange / rouge) est aveugle au shell.
 * La carte qui annonce « exige ton accord » dit vrai des outils qui demandent,
 * et ne voit pas passer un `printf > fichier`.~~ **Le meme crochet le rend
 * voyant** : une fois que le terminal frappe, il retombe sur `arbitrer()` comme
 * tout le reste. Le chainon manquait au laissez-passer entier, pas au seul
 * interrupteur.
 *
 * ~~⚠ **Ce qui n'est toujours pas eprouve, au 05/08/2026 :** ce mode-ci. Le refus
 * observe ce soir-la venait d'un delai de 60 s depasse sur une carte que
 * personne n'avait ouverte, le Hub etant en **Atelier** - pas de
 * `enDiscussion()`. La branche haute d'`arbitrer()` reste non jouee.~~
 *
 * ✅ **JOUE A 03:02, ET LE CHRONO SEUL LE QUALIFIE.** Tour ouvert a 03:02:14, la
 * sonde frappe a 03:02:19, le refus revient a 03:02:25 : **onze secondes, aucune
 * carte posee.** C'est bien `enDiscussion() && risque !== 'vert'` qui a parle -
 * la branche haute d'`arbitrer()`, jamais jouee jusque-la. A comparer aux 71,7 s
 * du refus de 02:38, qui n'etait qu'un delai de 60 s depasse sur une carte que
 * personne n'avait ouverte, le Hub etant alors en Atelier.
 *
 * **71,7 s, c'est une porte qui se referme faute de reponse ; 11 s, c'est une
 * decision.** Hermes lit la seconde comme telle : « Action bloquee : tu as
 * refuse l'execution via le systeme de permission. Je ne relance pas. »
 *
 * ~~Reste aussi le VOLUME : escalader chaque appel terminal donne une carte par
 * commande, ce qui est intenable pour un agent au travail.~~
 *
 * ✅ **TRANCHE le 05/08/2026 a 07:30 : LE GREFFON NE FAIT FRAPPER LE TERMINAL
 * QU'EN DISCUSSION.** Trois regles jouees sur une tache ordinaire - douze appels
 * d'outil dont huit par le terminal - et c'est un chiffre inattendu qui a
 * decide : en Discussion, **les trois donnent zero carte**, puisque ce mode
 * refuse d'office au lieu de poser. Le volume n'est donc pas un probleme de cet
 * interrupteur, mais de l'**Atelier** - 2, 3 ou 10 cartes selon la regle. On
 * garde l'Atelier intact.
 *
 * **Ce que ce module coute a l'usage, du coup : rien.** En Atelier il ne change
 * pas une ligne du comportement d'aujourd'hui ; en Discussion il refuse sans
 * poser, donc sans clic. Une garde qui coute un clic par geste n'est pas tenue,
 * elle est eteinte - c'est ce qui a ecarte les deux autres regles.
 *
 * ⚠ **Et voici le prix, qui n'est pas paye ici.** Puisque le terminal ne frappe
 * qu'en Discussion, le laissez-passer reste **aveugle au shell en Atelier**, et
 * il l'est en silence : un `printf > fichier` passe pendant que la carte d'a
 * cote annonce « exige ton accord » sur un `edit`. Ce n'est pas une regression,
 * c'est l'etat d'aujourd'hui, assume. Il est ecrit au §7 de
 * `PLAN-DE-TRAVAIL.md` avec la distribution du greffon, parce que les deux
 * questions portent sur la meme piece. Le raisonnement complet est dans
 * `ADM.md`, « Le heurtoir ne sonne qu'en Discussion » ; la maquette d'arbitrage
 * est `maquette-volume-escalade.html`.
 *
 * LE CHOIX SURVIT AU REDEMARRAGE, et ce n'est pas un detail de confort. Une
 * garantie qui se leve toute seule pendant qu'on a le dos tourne n'est pas une
 * garantie : quelqu'un qui a mis Discussion parce qu'il travaille sur des
 * fichiers qu'il ne veut pas voir bouger doit les retrouver intacts apres un
 * redemarrage du Hub. Le defaut, lui, reste **Atelier** - c'est le
 * comportement d'aujourd'hui, et personne ne doit decouvrir un beau matin que
 * plus rien ne s'ecrit sans avoir demande ce changement.
 */
import fs from 'node:fs'
import os from 'node:os'
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

// -----------------------------------------------------------------------------
// La seconde piece - celle qui n'est pas dans ce depot
// -----------------------------------------------------------------------------
/**
 * LE GREFFON QUI FAIT FRAPPER LE TERMINAL, ET POURQUOI ON LE CONSTATE.
 *
 * Le mode ci-dessus refuse tout ce qui DEMANDE. Le terminal, lui, ne demande
 * rien - mesure le 05/08/2026 : Hermes s'est vu refuser un `edit`, puis a ecrit
 * le meme fichier par le shell, sans qu'aucune demande ne soit posee. La
 * garantie a donc DEUX pieces, et la seconde vit dans le home d'Hermes : un
 * greffon `pre_tool_call` qui oblige l'outil a passer par la porte.
 *
 * Sans lui, Discussion refuse `edit` et `fetch` et laisse passer le shell. Un
 * bouton qui promettrait quand meme serait l'interrupteur qui ment, celui qu'on
 * a refuse d'ecrire le 05/08 a 02:05. D'ou cette lecture : le Hub ne promet
 * rien qu'il n'ait constate.
 *
 * ON CHERCHE `heurtoir`, PAS `sonde-terminal`. La sonde est le greffon jetable
 * du banc d'essai - elle est activee sur le poste de kuchu et nulle part
 * ailleurs. Chercher son nom rendrait la garantie vraie ici et fausse chez tous
 * les clients, c'est-a-dire l'ecart exact qu'on cherche a fermer. Le nom vient
 * d'`ADM.md`, « Le heurtoir ne sonne qu'en Discussion ».
 *
 * FORME DU FICHIER, RELEVEE LE 05/08/2026 sur le poste de kuchu - on ne devine
 * pas, on a regarde :
 *
 *   plugins:
 *     enabled:
 *       - sonde-terminal
 *     disabled: []
 *     entries:
 *       sonde-terminal:
 *         allow_tool_override: false
 *
 * Bloc a deux espaces, listes a tirets a quatre, et `disabled` ecrit en style
 * « flow » quand il est vide. On lit les deux styles : ne reconnaitre que le
 * premier ferait passer un greffon eteint pour un greffon actif, et c'est le
 * seul sens dans lequel une erreur est grave.
 *
 * Aucun analyseur YAML : le serveur n'a aucune dependance npm et n'en aura pas
 * pour ceci. Meme parti-pris que `lireServeurs()` dans `outils.js`, et meme
 * limite assumee - un fichier ecrit a la main dans une forme exotique rend
 * « absent ». **Le doute rend toujours absent**, jamais present : au pire on
 * n'ose pas promettre une garantie qui existe, au mieux on ne promet pas une
 * garantie qui manque. Le second sens est le seul qui abime quelqu'un.
 *
 * DEUX CONSTATS, PAS UN - et c'est la lecon de l'etape 7 de la methode. Un nom
 * dans `enabled` est une DECLARATION : il y reste si le dossier du greffon a
 * ete supprime a la main. « Prouver que la donnee existe n'est pas prouver que
 * le geste aboutit » a deja coute une correction sur ce depot, avec un bouton
 * « Ouvrir le dossier » qui ne pouvait pas marcher. On verifie donc AUSSI que
 * le dossier est la : `<home>\plugins\<nom>`, releve le 05/08/2026 sur le poste
 * de kuchu. Les deux doivent tenir, sinon on ne promet rien.
 */
export const GREFFON = 'heurtoir'

/**
 * Le home d'Hermes.
 *
 * `HERMES_HOME` passe devant, parce que c'est ce que `hermes` lui-meme honore -
 * verifie le 03/08/2026 dans `equipe.js`, avec `LOCALAPPDATA` detourne. Le Hub
 * doit regarder le meme home que le processus qu'il pilote, sinon il constate
 * l'etat d'une autre installation. *(A noter : `index.js` calcule ce chemin
 * sans honorer la variable. Ce n'est pas de ce chantier, mais les deux
 * divergent le jour ou quelqu'un s'en sert.)*
 */
function homeHermes() {
  return (
    process.env.HERMES_HOME ||
    path.join(process.env.LOCALAPPDATA || os.homedir(), 'hermes')
  )
}

/** Le `config.yaml` du profil par defaut - celui que la session ACP honore. */
function configHermes() {
  return path.join(homeHermes(), 'config.yaml')
}

/** Le dossier du greffon, s'il est vraiment pose. */
function greffonSurDisque() {
  try {
    return fs.statSync(path.join(homeHermes(), 'plugins', GREFFON)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Les noms d'une cle de liste sous `plugins:`, quel que soit son style.
 *
 * Rend `null` - et non `[]` - quand la cle est absente : « pas de liste » et
 * « liste vide » ne veulent pas dire la meme chose pour l'appelant.
 */
function listeSous(lignes, debut, cle) {
  const enTete = new RegExp(`^ {2}${cle}:\\s*(.*)$`)
  for (let i = debut + 1; i < lignes.length; i++) {
    const ligne = lignes[i]
    if (!ligne.trim() || ligne.trimStart().startsWith('#')) continue
    // Retour a la marge : on a quitte le bloc `plugins`.
    if (/^\S/.test(ligne)) return null

    const trouve = ligne.match(enTete)
    if (!trouve) continue

    // Style « flow » sur la meme ligne : `disabled: []`, `enabled: [a, b]`.
    const reste = trouve[1].trim()
    if (reste.startsWith('[')) {
      return reste
        .slice(1, reste.lastIndexOf(']') > 0 ? reste.lastIndexOf(']') : undefined)
        .split(',')
        .map((n) => n.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    }
    if (reste) return null

    // Style « bloc » : les tirets qui suivent, jusqu'a la prochaine cle.
    const noms = []
    for (let j = i + 1; j < lignes.length; j++) {
      const suite = lignes[j]
      if (!suite.trim() || suite.trimStart().startsWith('#')) continue
      const tiret = suite.match(/^ {4}-\s*(.+?)\s*$/)
      if (!tiret) break
      noms.push(tiret[1].replace(/^['"]|['"]$/g, ''))
    }
    return noms
  }
  return null
}

/**
 * Le greffon est-il declare et allume ?
 *
 * `raison` n'est pas decorative : c'est ce que l'interface a le droit de dire a
 * l'ecran. Un bandeau qui annonce un manque sans pouvoir le nommer envoie
 * chercher a l'aveugle.
 */
export function lireGreffon() {
  const fichier = configHermes()
  let brut
  try {
    brut = fs.readFileSync(fichier, 'utf8')
  } catch {
    return { present: false, nom: GREFFON, raison: 'config-introuvable' }
  }

  const lignes = brut.split(/\r?\n/)
  const debut = lignes.findIndex((l) => /^plugins:\s*$/.test(l))
  if (debut === -1) return { present: false, nom: GREFFON, raison: 'sans-bloc-plugins' }

  const eteints = listeSous(lignes, debut, 'disabled') || []
  if (eteints.includes(GREFFON)) {
    return { present: false, nom: GREFFON, raison: 'eteint' }
  }

  const allumes = listeSous(lignes, debut, 'enabled')
  if (!allumes) return { present: false, nom: GREFFON, raison: 'sans-liste-enabled' }
  if (!allumes.includes(GREFFON)) return { present: false, nom: GREFFON, raison: 'absent' }

  // Declare, mais pose ? Les deux constats, jamais un seul.
  if (!greffonSurDisque()) {
    return { present: false, nom: GREFFON, raison: 'declare-mais-introuvable' }
  }

  return { present: true, nom: GREFFON, raison: null }
}
