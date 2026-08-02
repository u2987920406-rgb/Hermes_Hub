/**
 * L'execution d'un pole - ce qui transforme un graphe valide en travail fait.
 *
 * Le Hub **tire** les taches, il ne delegue pas le lancement. `hermes kanban
 * dispatch` sait pourtant lancer seul : il fait un `Popen` detache de
 * `hermes -p <profil> chat -q ...` dont la sortie part dans un fichier de
 * journal. Branche tel quel, le Hub ne verrait rien - ni texte, ni reflexion,
 * ni outils, ni demandes d'autorisation - seulement des etats qui changent dans
 * la base. Toute la fenetre volante et tout le pont ACP resteraient sur le quai.
 *
 * Hermes prevoit explicitement l'autre voie : un assignataire qui n'est pas un
 * profil lancable est ignore par le dispatcher parce que ces files « sont
 * tirees par les terminaux via claim_task directement ». Le Hub est ce
 * terminal-la.
 *
 * D'ou la boucle, pour chaque pole :
 *
 *   dispatch --max 0    Hermes promeut ce qui est pret. Aucun processus lance -
 *                       la promotion tourne avant la boucle de lancement, et un
 *                       plafond a zero la coupe net.
 *   les taches `ready`  l'ordre n'est pas recalcule ici. Deux copies du graphe
 *                       qui divergent est precisement le bug a ne pas ecrire :
 *                       la base d'Hermes est la seule autorite sur ce qui peut
 *                       partir maintenant. La simulation, elle, garde son tri
 *                       topologique pour *montrer* l'ordre avant.
 *   claim / context     la tache passe en running, et on lit ce que ses parents
 *                       ont rendu.
 *   le pont ACP         l'agent travaille sous nos yeux.
 *   complete            sa reponse devient le resultat de la tache, et c'est
 *                       elle que les filles liront dans leur propre context.
 *
 * On recommence tant qu'il reste des taches pretes : les vagues n'ont pas
 * besoin d'etre calculees, elles tombent toutes seules de l'etat `ready`.
 */
import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'
import { Equipage } from './equipage.js'
import { lireOrchestration } from './equipe.js'
import { dernierMot, hermes } from './graphe.js'
import { lireCapacites, lireFichiers, lireValidation } from './simulation.js'
import { HUB_DIR, WORKSPACE, readJson, sanitizeName, writeJson } from './workspace.js'

/**
 * Duree du claim.
 *
 * Une tache reclamee et non tenue est reprise par Hermes au bout de son bail -
 * quinze minutes par defaut. C'est trop court : un modele local qui reflechit
 * vingt minutes verrait sa tache lui etre retiree sous les pieds, puis relancee
 * en double. Le rythme normal serait `kanban heartbeat`, mais il est hors
 * d'atteinte ici : la propriete d'un claim est un `hote:pid`, et chaque appel
 * de CLI est un pid different - un battement lance depuis le Hub ne
 * reconnaitrait jamais le claim pose par l'appel precedent.
 *
 * On prend donc un bail long, et on le rend explicitement : `arreter()`
 * relache, et le demarrage du serveur relache ce qu'un Hub tombe aurait laisse.
 * Six heures est la borne de securite si les deux echouent - assez pour
 * n'interrompre aucun travail reel, assez court pour que la journee suivante
 * reparte propre.
 */
const BAIL_SECONDES = 6 * 3600

/**
 * Ce qu'on garde de la reponse d'un agent comme resultat de sa tache.
 *
 * Deux raisons a la borne, et la seconde est dure : le resultat voyage en
 * argument de ligne de commande, et Windows refuse au-dela de 32 767
 * caracteres. Hermes tronque de son cote a la lecture du contexte ; on tronque
 * ici a l'ecriture, pour ne pas dependre de sa borne a lui.
 */
const RESULTAT_MAX = 8000

/**
 * Patience accordee a une tache.
 *
 * Dix minutes suffisent a une conversation ; une tache qui redige, cherche sur
 * le web et ecrit un fichier peut depasser sans etre en panne. Trente minutes
 * parce qu'au-dela, ce n'est plus de la lenteur : c'est un agent qui attend une
 * autorisation que personne ne lui donnera, ou un modele qui tourne en rond.
 */
const TOUR_MAX = 30 * 60 * 1000

/**
 * Tentatives accordees au tour d'une tache, et attente entre deux.
 *
 * Le pont sait deja changer de modele quand il reconnait une coupure de
 * fournisseur - mais seulement quand elle se nomme. Deux formes lui echappent :
 * l'adaptateur ACP aplatit parfois une erreur de credits en « Internal error »,
 * et une session qui n'arrive meme pas a s'ouvrir n'a aucun modele a commuter.
 * Reessayer sans chercher a lire l'erreur est la seule reponse qui couvre les
 * trois formes.
 *
 * Une seule reprise, parce que la deuxieme ne dirait rien de plus : si le
 * fournisseur est encore absent apres une minute, ce n'est plus un hoquet.
 * L'attente vise la coupure observee - Hermes ecarte un fournisseur fautif
 * pendant soixante secondes (« marking nous unhealthy for 60s ») et reessayer
 * tout de suite retomberait dedans.
 */
const ESSAIS_TOUR = 2
const ATTENTE_REPRISE = 60 * 1000

/** Une tache sans reponse ne doit pas transmettre un blanc a ses filles :
    elles liraient un silence sans savoir que c'en est un. */
const RIEN_RENDU = "L'agent n'a rien repondu."

const pause = (ms) => new Promise((f) => setTimeout(f, ms))

// -----------------------------------------------------------------------------
// La ligne de commande d'Hermes
// -----------------------------------------------------------------------------
/**
 * Un tour de dispatcher sans lancer personne.
 *
 * `--max 0` n'est pas un detournement : le plafond est teste au debut de la
 * boucle de lancement, tandis que la reprise des claims perimes et la promotion
 * `todo -> ready` tournent avant elle. On obtient donc exactement le travail de
 * comptabilite du dispatcher, et rien de son travail de lanceur. Verifie sur le
 * bac a sable : zero `spawned`.
 *
 * Le tour porte sur le tableau entier, pas sur un pole : promouvoir une tache
 * d'un autre pole ne lance rien non plus, et un dispatcher ne sait pas se
 * restreindre. C'est sans consequence tant que personne d'autre ne tire.
 */
function promouvoir() {
  const r = hermes(['dispatch', '--max', '0', '--json'])
  if (r.status !== 0) return null
  try {
    return JSON.parse(r.stdout)
  } catch {
    return null
  }
}

// -----------------------------------------------------------------------------
// La preuve par le disque
// -----------------------------------------------------------------------------
/**
 * Un agent qui dit avoir ecrit un fichier a-t-il ecrit un fichier ?
 *
 * La question n'est pas theorique : une tache « Generer le PDF des paroles » a
 * ete rendue `done` avec pour resultat « # Chanson: "Lore sur..." » et aucun
 * PDF nulle part. Sans verification, ce mensonge part dans `kanban context`
 * vers les taches filles, qui batissent sur un livrable qui n'existe pas.
 *
 * On ne verifie que ce qui est verifiable : une tache dont la formulation
 * reclame une ecriture ET nomme au moins un fichier. Une tache qui rend du
 * texte - une analyse, un arbitrage - n'a rien a prouver sur le disque.
 *
 * La borne est volontairement basse : il suffit qu'UN des fichiers nommes
 * existe. Un agent qui en annonce trois et en produit deux a travaille ; un
 * agent qui n'en produit aucun a invente. On cherche le second cas, pas la
 * perfection - et on cherche par nom de base, en profondeur, parce qu'un agent
 * range parfois dans un sous-dossier qu'il a cree lui-meme.
 */
function livrablesManquants(tache, dossier) {
  const texte = `${tache.titre || ''}\n${tache.corps || ''}`
  const ecrit = lireCapacites({ titre: tache.titre, corps: tache.corps }).some(
    (c) => c.id === 'ecriture',
  )
  if (!ecrit) return null

  const attendus = lireFichiers(texte)
  if (!attendus.length) return null

  // Le chemin complet, pas seulement le nom : il faut pouvoir lire le fichier
  // pour savoir si c'est un livrable ou un constat d'echec.
  const surLeDisque = new Map()
  const parcourir = (dir, profondeur) => {
    if (profondeur > 4) return
    let entrees
    try {
      entrees = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entrees) {
      if (e.isDirectory()) parcourir(path.join(dir, e.name), profondeur + 1)
      else if (!surLeDisque.has(e.name.toLowerCase())) {
        surLeDisque.set(e.name.toLowerCase(), path.join(dir, e.name))
      }
    }
  }
  parcourir(dossier, 0)

  const trouves = attendus
    .map((f) => surLeDisque.get(path.posix.basename(f.chemin).toLowerCase()))
    .filter(Boolean)

  if (!trouves.length) return { chemins: attendus.map((f) => f.chemin), motif: 'absent' }

  // Le fichier existe - mais dit-il autre chose que « je n'ai pas pu » ?
  const creux = trouves.map((p) => livrableEnCreux(p))
  if (creux.every(Boolean)) {
    return { chemins: attendus.map((f) => f.chemin), motif: 'creux', aveu: creux.find(Boolean) }
  }
  return null
}

/**
 * Un fichier qui avoue lui-meme n'etre pas le livrable.
 *
 * Vu le 03/08/2026 sur un vrai pole : Karim a bien ecrit `avis_recrutement.md`,
 * et le fichier disait « **Statut :** Bloque - donnees manquantes. Je refuse de
 * rediger un avis argumente sur la base de suppositions ». Sa tache est passee
 * `done` : la preuve par le disque ne regardait que le NOM du fichier. En aval,
 * le maquettiste aurait assemble un dossier bati sur un refus, et le mensonge
 * serait reparti par `kanban context` exactement comme avant la preuve.
 *
 * L'honnetete de l'agent devient alors un piege : celui qui refuse proprement
 * passe pour avoir reussi, tandis que celui qui n'ecrit rien est bloque. On
 * inverse : ecrire son refus dans le bon fichier ne vaut pas mieux que ne rien
 * ecrire, et les deux bloquent avec une raison lisible.
 *
 * Meme forme que `estPanneModele` dans `modeles.js`, pour la meme raison : un
 * signe formel se lit dans un document de n'importe quelle longueur, un signe
 * de prose ne vaut que si le document est court. Un plan de montage de 5 ko qui
 * liste ses « inputs manquants » en passant EST un livrable - il a ete produit
 * le meme jour, il ne doit pas tomber ici.
 */
const AVEUX_CERTAINS = [
  // Un champ « Statut » qui vaut bloque/echec : c'est le document qui se declare.
  [/^[*_\s>#-]*statut\s*[:*_\s]*[-–—]?\s*(bloqu|echec|échec|impossible|non\s+r[eé]alis)/im, 'le fichier se declare bloque'],
  [/^\s*BLOCKED\s*:/im, 'le fichier se declare bloque'],
  [/^[*_\s>#-]*(livrable|resultat|résultat)\s*[:*_\s]*[-–—]?\s*(aucun|neant|néant|non produit)/im, 'le fichier se declare vide'],
]

/** Retenus seulement sur un document court : dans un long, ce sont des reserves
    de travail, pas un renoncement. */
const AVEUX_PROBABLES = [
  [/je\s+refuse\s+de\s+(rediger|rédiger|produire|ecrire|écrire)/i, 'l agent a refuse de produire'],
  [/je\s+ne\s+peux\s+pas\s+(rediger|rédiger|produire|ecrire|écrire|fournir)/i, 'l agent s est declare incapable'],
  [/aucune?\s+(donnee|donnée|statistique|information)[^.]{0,60}(transmis|fourni|disponible)/i, 'aucune matiere fournie'],
]

/** Au-dela, un document a de la substance meme s'il signale des manques. */
const COURT = 2500

/**
 * Une page d'erreur du navigateur, imprimee en PDF.
 *
 * Le cas reel du 03/08/2026, et il a franchi TROIS garde-fous : le maquettiste
 * a ecrit son `.html` dans le dossier de travail que le kanban lui prete, a
 * lance Chrome dessus, et ce dossier avait disparu entre-temps - il est
 * ephemere. Chrome n'a pas trouve le fichier, a **imprime sa page d'erreur**,
 * et le PDF a ete copie dans le pole comme livrable.
 *
 * Ce qui l'a laisse passer : le fichier existe, il pese 24 923 octets - donc la
 * consigne « verifie qu'il n'est pas vide » etait satisfaite - et la premiere
 * version de `livrableEnCreux` ecartait les binaires, en supposant qu'un PDF ne
 * pouvait pas mentir. Celui-la ment, et il le dit en toutes lettres : son texte
 * est « Impossible d'acceder a votre fichier [...] ERR_FILE_NOT_FOUND ».
 *
 * `ERR_<MAJUSCULES>` est le signe le plus sur : c'est un code d'erreur reseau
 * de Chrome, il n'a rien a faire dans un document remis a des dirigeants.
 */
const ERREURS_NAVIGATEUR = [
  [/\bERR_[A-Z_]{3,}/, 'le PDF est une page d erreur du navigateur'],
  [/Impossible d.?acc[eé]der [aà] votre fichier/i, 'le PDF est une page d erreur du navigateur'],
  [/This (?:site|page) can.?t be reached/i, 'le PDF est une page d erreur du navigateur'],
  [/Your file (?:was|couldn.?t be) (?:not )?found/i, 'le PDF est une page d erreur du navigateur'],
]

/**
 * Le texte affiche d'un PDF, sans bibliotheque.
 *
 * On ne decompresse que les flux de CONTENU - ceux qui portent des operateurs
 * de texte. Sans ce tri, on remonte les tables des polices embarquees, ce qui
 * noie le texte reel sous des kilo-octets de binaire.
 *
 * Deux ecritures a lire : `(texte) Tj` en clair, et `<hex> Tj` ou les valeurs
 * sont des identifiants de glyphes. Chrome sous-ensemble ses polices dans
 * l'ordre du jeu de caracteres, ce qui donne un decalage constant de 29 par
 * rapport au code ASCII - vrai pour les pages d'erreur, qui sont ce qu'on
 * cherche ici. On ne pretend pas extraire un PDF quelconque : on cherche une
 * signature, pas a faire un lecteur.
 */
function texteDuPdf(chemin) {
  let buf
  try {
    buf = fs.readFileSync(chemin)
  } catch {
    return ''
  }

  let sortie = ''
  let i = 0
  while (sortie.length < 8000) {
    const debut = buf.indexOf('stream', i)
    if (debut < 0) break
    let s = debut + 6
    if (buf[s] === 13) s++
    if (buf[s] === 10) s++
    const fin = buf.indexOf('endstream', s)
    if (fin < 0) break

    let flux = null
    try {
      flux = zlib.inflateSync(buf.subarray(s, fin)).toString('latin1')
    } catch {
      /* flux non compresse, image, police : rien a lire */
    }
    if (flux && /\bBT\b/.test(flux) && /T[Jj]/.test(flux)) {
      for (const m of flux.matchAll(/\(((?:[^()\\]|\\.)*)\)|<([0-9A-Fa-f]{4,})>/g)) {
        if (m[1] !== undefined) sortie += m[1].replace(/\\([()\\])/g, '$1')
        else {
          const h = m[2]
          for (let k = 0; k + 4 <= h.length; k += 4) {
            sortie += String.fromCharCode(parseInt(h.slice(k, k + 4), 16) + 29)
          }
        }
        sortie += ' '
      }
    }
    i = fin + 9
  }
  return sortie
}

/** Les binaires qui n'ont pas de texte a offrir : on ne peut rien en dire. */
const OPAQUES = /\.(png|jpe?g|gif|webp|zip|wav|mp3|mp4|xlsx?|docx?|pptx?)$/i

function livrableEnCreux(chemin) {
  if (/\.pdf$/i.test(chemin)) {
    const texte = texteDuPdf(chemin)
    for (const [signe, raison] of ERREURS_NAVIGATEUR) if (signe.test(texte)) return raison
    return null
  }
  if (OPAQUES.test(chemin)) return null

  let contenu
  try {
    contenu = fs.readFileSync(chemin, 'utf8')
  } catch {
    return null // illisible : ce n'est pas a nous d'en juger
  }

  const tete = contenu.slice(0, 4000)
  for (const [signe, raison] of AVEUX_CERTAINS) if (signe.test(tete)) return raison
  if (contenu.length <= COURT) {
    for (const [signe, raison] of AVEUX_PROBABLES) if (signe.test(tete)) return raison
  }
  return null
}

// -----------------------------------------------------------------------------
// Les baux en cours, sur le disque
// -----------------------------------------------------------------------------
/**
 * Les taches que CE Hub tient en ce moment.
 *
 * Ecrit au fil de l'eau parce que la question se pose apres un plantage, quand
 * la memoire n'existe plus : une tache laissee `running` bloque ses filles
 * jusqu'a l'expiration du bail, et Hermes ne peut pas s'en apercevoir seul - sa
 * detection de plantage suit le `worker_pid` de ses propres lancements, et le
 * Hub n'en pose aucun.
 *
 * On note donc ce qu'on tient, et on ne relache au demarrage que ca : une tache
 * lancee par le dispatcher d'Hermes, ou par un autre poste sur un tableau
 * partage, ne doit surtout pas etre reprise sous lui.
 */
const FICHIER_BAUX = path.join(HUB_DIR, 'baux.json')

function lireBaux() {
  const brut = readJson(FICHIER_BAUX, null)
  return brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {}
}

function noterBail(tache, info) {
  const tout = lireBaux()
  tout[tache] = { ...info, depuis: Date.now() }
  writeJson(FICHIER_BAUX, tout)
}

function oublierBail(tache) {
  const tout = lireBaux()
  if (!(tache in tout)) return
  delete tout[tache]
  writeJson(FICHIER_BAUX, tout)
}

// -----------------------------------------------------------------------------
// Le dossier du pole
// -----------------------------------------------------------------------------
/**
 * Ou les agents d'un pole ecrivent leurs fichiers.
 *
 * Hermes donnerait a chaque tache un dossier `scratch` isole, sous la racine du
 * tableau : etanche, mais introuvable - le PDF d'une chanson finirait dans un
 * dossier dont l'utilisateur ignore l'existence. Comme c'est le Hub qui ouvre
 * la session ACP, c'est lui qui choisit le dossier de travail, et il le prend
 * dans le workspace : un dossier par pole, a cote de Projets et de Vault.
 *
 * Le titre du pole nomme le dossier, parce que c'est ce qu'on reconnait. Deux
 * poles homonymes ne se marchent pas dessus pour autant : le marqueur porte
 * l'identifiant, et un dossier deja tenu par un autre pole en fait naitre un
 * second, suffixe.
 */
const POLES_DIR = path.join(WORKSPACE, 'Poles')

function dossierDuPole(pole) {
  fs.mkdirSync(POLES_DIR, { recursive: true })

  let base
  try {
    base = sanitizeName(pole.titre.slice(0, 60).trim())
  } catch {
    base = pole.id
  }

  for (const nom of [base, `${base} (${pole.id})`]) {
    const dir = path.join(POLES_DIR, nom)
    const marqueur = path.join(dir, '.pole.json')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      writeJson(marqueur, { pole: pole.id, titre: pole.titre, ouvertLe: Date.now() })
      return dir
    }
    const a = readJson(marqueur, null)
    // Un dossier sans marqueur nous revient aussi : c'est un pole d'avant, ou
    // un dossier que l'utilisateur a range la lui-meme sous le bon nom.
    if (!a || a.pole === pole.id) return dir
  }

  // Les deux noms sont tenus par d'autres : l'identifiant seul ne collisionne pas.
  const dir = path.join(POLES_DIR, pole.id)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

// -----------------------------------------------------------------------------
// Ce qu'on dit a l'agent
// -----------------------------------------------------------------------------
/**
 * La consigne d'execution, posee devant la fiche que rend `kanban context`.
 *
 * Trois choses, et chacune repare une erreur que le modele ferait sans elle :
 *
 *   - sa reponse EST le resultat. Sans le dire, un agent annonce ce qu'il va
 *     faire, et c'est cette annonce qui partirait aux taches filles ;
 *   - ne mentionner personne. Le circuit de delegation de la conversation n'est
 *     pas branche ici, et c'est voulu : une mention ouvrirait une chaine
 *     parallele hors du graphe, que le tableau ne verrait jamais. Autant le
 *     dire, plutot que de laisser l'agent ecrire dans le vide ;
 *   - le dossier courant. L'agent a `write_file` et `terminal` ; il faut qu'il
 *     sache ou poser ce qu'il produit ;
 *   - le shell est PowerShell. Sans ce mot, le modele ecrit `ls -la`, que
 *     PowerShell lit comme `Get-ChildItem -LiteralPath <valeur manquante>` et
 *     pour quoi il **attend une saisie au clavier**. Personne n'est devant le
 *     clavier : le tour se fige jusqu'a sa borne. Vu des la premiere tache
 *     lancee, et ce n'est pas un cas rare - un modele ecrit du Unix par defaut.
 */
function consigne(dossier) {
  return [
    '[Tache du tableau]',
    "Tu executes une tache d'un pole. Sa fiche complete suit, telle que le",
    "tableau d'Hermes la donne - le corps de la tache, et les resultats des",
    'taches dont elle depend.',
    '',
    '- Ta reponse est enregistree comme resultat de la tache, et transmise telle',
    '  quelle aux taches qui dependent de la tienne. Rends le travail lui-meme,',
    '  pas une annonce de ce que tu vas faire.',
    "- N'appelle personne par une mention : les autres agents ont deja leurs",
    '  propres taches sur ce meme pole, et une mention partie d ici ne reveille',
    '  personne.',
    `- Ecris tes fichiers dans le dossier courant : ${dossier}`,
    '- Le terminal est PowerShell sur Windows. Pas de commandes Unix : ni `ls`,',
    '  ni `cat`, ni `grep`, ni `touch`. Une commande Unix ne rend pas une erreur',
    "  ici, elle attend une saisie au clavier que personne ne fera - et ton tour",
    '  reste fige. Utilise `Get-ChildItem`, `Get-Content`, `Select-String`. Mieux',
    '  encore : pour lire et ecrire des fichiers, sers-toi de tes outils',
    '  `read_file` et `write_file` plutot que du terminal.',
    '- Reponds en francais.',
  ].join('\n')
}

// -----------------------------------------------------------------------------
// Le chantier
// -----------------------------------------------------------------------------
/**
 * Un pole en train d'etre execute.
 *
 * Il a son propre equipage, donc ses propres ponts, distincts de ceux de la
 * conversation. Deux raisons : le dossier de travail n'est pas le meme, et un
 * agent occupe par une tache ne doit pas rendre la conversation indisponible -
 * un pont ne tient qu'un tour a la fois.
 */
class Chantier {
  constructor(pole, { diffuser }) {
    this.poleId = pole.id
    this.titre = pole.titre
    this.dossier = dossierDuPole(pole)
    this.arrete = false
    this.fini = false
    /** id de tache -> { agent, titre } : ce qui tourne, et ce qu'il faut
        relacher si on coupe. */
    this.enCours = new Map()
    this.faites = []
    this.echouees = []

    this.diffuser = (e) => diffuser({ ...e, pole: this.poleId })
    this.equipage = new Equipage({ cwd: this.dossier, diffuser: this.diffuser })
  }

  etat() {
    return {
      pole: this.poleId,
      titre: this.titre,
      dossier: this.dossier,
      actif: !this.fini && !this.arrete,
      enCours: [...this.enCours].map(([tache, v]) => ({ tache, ...v })),
      faites: this.faites,
      echouees: this.echouees,
      // Les accords en attente doivent survivre a un rechargement de page.
      //
      // Un agent qui demande la permission d'ecrire arrete tout jusqu'a la
      // reponse, et repondre exige l'identifiant de la demande. Sans lui ici,
      // un navigateur qui arrive apres coup ne l'a plus : le pole reste bloque
      // pour de bon. Le pont les conserve deja pour cette raison - on ne fait
      // que les rendre visibles, comme `equipage.etat()` le fait pour la
      // conversation.
      accords: [...this.equipage.ponts].flatMap(([agent, { pont }]) =>
        pont.etat().autorisations.map((a) => ({ ...a, agent })),
      ),
    }
  }

  /**
   * La boucle. Elle s'arrete faute de taches pretes - soit parce que le pole
   * est fait, soit parce que ce qui reste attend quelque chose que le tableau
   * ne debloquera pas tout seul.
   */
  async tourner() {
    this.diffuser({ type: 'chantier-debut', titre: this.titre, dossier: this.dossier })

    try {
      for (;;) {
        if (this.arrete) break

        promouvoir()
        const prets = await this.#prets()
        if (!prets.length) break

        // Les taches d'agents differents partent ensemble ; celles d'un meme
        // agent s'enchainent, parce qu'un pont ne tient qu'un tour a la fois -
        // le lui demander rendrait un 409 au lieu d'un travail.
        const parAgent = new Map()
        for (const t of prets) {
          if (!parAgent.has(t.agentId)) parAgent.set(t.agentId, [])
          parAgent.get(t.agentId).push(t)
        }

        let avance = 0
        await Promise.all(
          [...parAgent.values()].map(async (taches) => {
            for (const t of taches) {
              if (this.arrete) return
              if (await this.#executer(t)) avance += 1
            }
          }),
        )

        // Des taches se disent pretes et pas une n'a pu etre prise : elles sont
        // tenues par quelqu'un d'autre. Repasser ne ferait que tourner a vide,
        // aussi vite que le disque le permet.
        if (!avance) break
      }
    } finally {
      this.fini = true
      // Les ponts de ce chantier n'ont plus de raison d'etre : les garder
      // eveilles retiendrait un processus par agent, pour personne.
      this.equipage.endormirTous()
      this.diffuser({
        type: 'chantier-fin',
        titre: this.titre,
        arrete: this.arrete,
        faites: this.faites.length,
        echouees: this.echouees.length,
        restantes: await this.#restantes(),
      })
    }
  }

  /** Les taches de ce pole que le tableau declare pretes a partir. */
  async #prets() {
    const etat = await lireOrchestration()
    const pole = etat.poles.find((p) => p.id === this.poleId)
    if (!pole) return []

    const prets = []
    for (const t of pole.taches) {
      if (t.etat !== 'ready') continue
      const agent = etat.agents.find((a) => a.id === (t.agent || 'default'))
      if (!agent) {
        // La simulation le signalait deja ; ici on ne peut plus passer outre -
        // reclamer une tache qu'on ne saura pas faire tourner la bloquerait.
        this.#bloquer(t.id, t.titre, t.agent, `« ${t.agent} » n'est pas un profil Hermes.`)
        continue
      }
      prets.push({ id: t.id, titre: t.titre, corps: t.corps, agentId: agent.id, agent })
    }
    return prets
  }

  async #restantes() {
    const etat = await lireOrchestration().catch(() => null)
    const pole = etat?.poles.find((p) => p.id === this.poleId)
    return pole ? pole.taches.filter((t) => t.etat !== 'done').length : 0
  }

  /**
   * Une tache, du claim au complete. Rend vrai si elle a ete prise.
   *
   * Le claim est atomique, et c'est lui la porte : s'il echoue, la tache
   * n'etait plus prete - quelqu'un d'autre l'a saisie, ou un parent n'avait pas
   * fini. On passe, sans la marquer en echec.
   */
  async #executer({ id, titre, corps, agentId, agent }) {
    const pris = hermes(['claim', id, '--ttl', String(BAIL_SECONDES)])
    if (pris.status !== 0) return false

    this.enCours.set(id, { agent: agentId, titre })
    noterBail(id, { pole: this.poleId, agent: agentId })
    this.diffuser({ type: 'tache-etat', tache: id, titre, etat: 'running', agent: agentId })

    const fiche = hermes(['context', id])
    const contexte = fiche.status === 0 ? fiche.stdout.trim() : `# Tache ${id} : ${titre}`

    const message = `${consigne(this.dossier)}\n\n---\n\n${contexte}`

    let pont = null
    try {
      // La reprise n'entoure que le tour : ni la garde des livrables ni la
      // cloture. Celles-la echouent sur un travail deja fait et mal fait -
      // rejouer l'agent lui donnerait une seconde chance qu'il n'a pas
      // meritee, et ferait payer deux fois le meme travail.
      for (let essai = 1; essai <= ESSAIS_TOUR; essai++) {
        try {
          pont = await this.equipage.reveiller(agent)

          // Le pont nu, pas `equipage.envoyer` : celui-ci injecte l'annuaire,
          // puis relit la reponse pour y suivre les mentions. Sur un pole,
          // cette relecture ouvrirait une seconde chaine de travail a cote du
          // graphe.
          pont.contexte = { tache: id }
          await pont.envoyer(message, { delai: TOUR_MAX })
          break
        } catch (err) {
          if (this.arrete || essai === ESSAIS_TOUR) throw err

          this.diffuser({
            type: 'tache-etat',
            tache: id,
            titre,
            etat: 'running',
            agent: agentId,
            reprise: `${dernierMot(err.message) || err.message} - on retente dans ${ATTENTE_REPRISE / 1000} s`,
          })

          // Le pont qui vient de tomber ne sert plus a rien : sa session est
          // morte, ou n'a jamais existe. On l'endort pour que la tentative
          // suivante en ouvre un neuf.
          this.equipage.endormir(agentId)
          pont = null

          await pause(ATTENTE_REPRISE)
          if (this.arrete) return false
        }
      }

      const resultat = String(pont.texteTour || '').trim().slice(0, RESULTAT_MAX)

      // La porte de sortie : on ne clot pas une tache qui devait produire un
      // fichier et n'en a produit aucun - ni une qui a bien ecrit le fichier,
      // mais pour y avouer qu'elle n'a pas pu. Bloquer plutot que clore, sinon
      // le mensonge part aux taches filles par `kanban context`.
      const manque = livrablesManquants({ titre, corps }, this.dossier)
      if (manque) {
        throw new Error(
          manque.motif === 'creux'
            ? `elle a ecrit ${manque.chemins.join(', ')} mais ${manque.aveu} : il n'y a pas de livrable dans ${this.dossier}`
            : `elle devait produire ${manque.chemins.join(', ')} - aucun de ces fichiers n'existe dans ${this.dossier}`,
        )
      }

      const fait = hermes(['complete', id, '--result', resultat || RIEN_RENDU])
      if (fait.status !== 0) {
        throw new Error(dernierMot(fait.stderr) || 'le tableau a refuse la cloture')
      }

      this.faites.push(id)
      this.diffuser({ type: 'tache-etat', tache: id, titre, etat: 'done', agent: agentId, resultat })
    } catch (err) {
      // Un arret demande passe forcement par ici : couper le pont fait echouer
      // le tour en cours. Mais `arreter` a deja relache la tache, et la bloquer
      // maintenant reviendrait a punir une tache dont personne n'a montre
      // qu'elle etait mauvaise - il faudrait la debloquer a la main avant de
      // pouvoir relancer le pole.
      if (this.arrete) return false

      // Sinon : bloquer plutot que relacher. Une tache qui repartirait en
      // `ready` serait reprise au tour suivant et rejouerait le meme echec en
      // boucle. Le genre `transient` dit a Hermes que ce n'est pas la tache qui
      // est mauvaise, c'est cette tentative-la.
      this.#bloquer(id, titre, agentId, err.message)
    } finally {
      if (pont) pont.contexte = null
      this.enCours.delete(id)
      oublierBail(id)
    }
    return true
  }

  #bloquer(id, titre, agentId, raison) {
    hermes(['block', id, `Le Hub n'a pas pu la faire executer : ${raison}`, '--kind', 'transient'])
    this.echouees.push({ tache: id, raison })
    this.diffuser({ type: 'tache-etat', tache: id, titre, etat: 'blocked', agent: agentId, raison })
  }

  /**
   * Couper. Les agents s'arretent, et les taches en cours retournent au
   * tableau : sans ce relachement, elles resteraient `running` jusqu'a
   * l'expiration du bail, et rien ne pourrait etre relance.
   */
  async arreter() {
    this.arrete = true

    // La liste est prise AVANT d'interrompre, et videe dans la foulee. Couper
    // le pont fait echouer le tour en cours, donc reveille le `finally` de
    // `#executer`, qui retire l'entree : sans cette saisie, on courrait celui
    // des deux qui arrive le premier, et la tache resterait `running` sans que
    // personne ne la tienne.
    const tenues = [...this.enCours]
    this.enCours.clear()

    await this.equipage.interrompre().catch(() => null)

    for (const [id, { titre, agent }] of tenues) {
      hermes(['reclaim', id, '--reason', 'arret demande depuis le Hub'])
      oublierBail(id)
      this.diffuser({ type: 'tache-etat', tache: id, titre, etat: 'ready', agent, arret: true })
    }
    this.equipage.endormirTous()
    return { arrete: true, pole: this.poleId }
  }
}

// -----------------------------------------------------------------------------
// Le registre
// -----------------------------------------------------------------------------
/** poleId -> Chantier. Un pole ne s'execute qu'une fois a la fois. */
const chantiers = new Map()

/**
 * Lance un pole. Rend la main tout de suite : le travail dure des minutes, et
 * il se raconte par le flux.
 *
 * La porte est verifiee ici, cote serveur, et pas seulement par un bouton grise
 * dans l'interface : c'est la seule facon qu'elle tienne aussi pour un appel
 * qui ne passerait pas par elle.
 */
export async function lancer(poleId, { diffuser }) {
  const dejaLa = chantiers.get(poleId)
  if (dejaLa && !dejaLa.fini) {
    const err = new Error('Ce pole est deja en train de tourner.')
    err.status = 409
    throw err
  }

  const etat = await lireOrchestration()
  if (!etat.tableau.disponible) {
    const err = new Error('Le tableau des taches ne peut pas etre lu : rien a lancer.')
    err.status = 409
    throw err
  }

  const pole = etat.poles.find((p) => p.id === poleId)
  if (!pole) {
    const err = new Error('Pole introuvable.')
    err.status = 404
    throw err
  }

  if (!lireValidation(poleId)) {
    const err = new Error(
      "Ce pole n'a pas ete valide. Ouvre sa simulation et valide-la avant de le lancer.",
    )
    err.status = 409
    throw err
  }

  const chantier = new Chantier(pole, { diffuser })
  chantiers.set(poleId, chantier)

  // Le `catch` couvre la boucle entiere : une panne imprevue doit se voir dans
  // le flux, pas mourir dans une promesse que personne n'attend.
  chantier.tourner().catch((e) => {
    diffuser({ type: 'chantier-panne', pole: poleId, message: e.message })
  })

  return { lance: true, pole: poleId, dossier: chantier.dossier }
}

export async function arreter(poleId) {
  const chantier = chantiers.get(poleId)
  if (!chantier || chantier.fini) return { arrete: false, pole: poleId }
  return chantier.arreter()
}

/**
 * A la fermeture du Hub : couper les processus, et rien de plus.
 *
 * On ne relache pas les taches ici, et c'est deliberé. Le gestionnaire d'arret
 * de Node n'attend rien : relacher demanderait un appel de CLI par tache, deux
 * secondes chacun, sur un chemin qui doit rendre la main tout de suite. Les
 * baux sont sur le disque - `relacherOrphelines` les reprendra au demarrage
 * suivant, et entre-temps personne ne regarde ce tableau.
 */
export function endormirChantiers() {
  for (const chantier of chantiers.values()) {
    chantier.arrete = true
    chantier.equipage.endormirTous()
  }
}

/** Ce qu'un flux qui arrive en cours de route doit savoir des chantiers. */
export function etatChantiers() {
  return { chantiers: [...chantiers.values()].map((c) => c.etat()) }
}

/**
 * Un pole au travail ne se remanie pas.
 *
 * Ses taches sont reclamees sous un bail, ses agents tournent, et la boucle
 * relit la liste des pretes a chaque vague : retirer un lien sous ses pieds
 * lancerait une tache dont le parent n'a pas fini, archiver une tache en cours
 * laisserait un agent travailler pour un tableau qui l'a oubliee.
 */
export function poleActif(poleId) {
  const c = chantiers.get(poleId)
  return !!c && c.etat().actif
}

/**
 * Repondre a une autorisation demandee par un agent au travail.
 *
 * Un agent de pole ne vit pas dans l'equipage de la conversation : il a le sien,
 * ouvert sur le dossier du pole. Sans ce passage, la premiere ecriture de
 * fichier d'une tache attend une reponse que la route de la conversation ne
 * sait pas lui porter - et un pole entier se fige sur son premier livrable.
 *
 * On essaie tous les chantiers : deux poles peuvent employer le meme agent, et
 * c'est l'identifiant de la demande qui tranche - il est unique par pont.
 */
export function autoriserChantier(agentId, demande, optionId) {
  for (const chantier of chantiers.values()) {
    if (chantier.equipage.autoriser(agentId, demande, optionId)) return true
  }
  return false
}

/**
 * Au demarrage : relacher ce que le Hub tenait quand il s'est ferme.
 *
 * On ne relache que ce qui est inscrit dans `baux.json`, et rien d'autre. Une
 * tache lancee par le dispatcher d'Hermes, ou par un autre poste sur un tableau
 * partage, est en `running` pour de bonnes raisons : la reprendre reviendrait a
 * la faire executer deux fois.
 */
export async function relacherOrphelines() {
  const baux = lireBaux()
  const ids = Object.keys(baux)
  if (!ids.length) return { relachees: [] }

  const relachees = []
  for (const id of ids) {
    const r = hermes(['reclaim', id, '--reason', 'le Hub a redemarre'])
    // Un echec ici n'est pas une anomalie : la tache a pu etre terminee, ou
    // deja reprise par Hermes. Ce qui compte est que le bail disparaisse.
    if (r.status === 0) relachees.push(id)
  }
  writeJson(FICHIER_BAUX, {})

  if (relachees.length) {
    console.log('[hub] taches relachees au demarrage :', relachees.join(', '))
  }
  return { relachees }
}
