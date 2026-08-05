/**
 * L'equipage - plusieurs agents dans la meme conversation.
 *
 * Un pont ACP par agent, ouvert a la demande et referme apres un temps de
 * silence. Un agent n'existe donc comme processus que le temps ou on a besoin
 * de lui, ce qui est la regle du produit : ils se reveillent quand on les
 * appelle, puis se rendorment.
 *
 * Le compromis du sommeil est reel et assume : refermer tout de suite libere la
 * memoire mais fait repayer un demarrage a froid - le chargement des MCP, du
 * modele et des skills prend plusieurs secondes. On garde donc l'agent eveille
 * un moment apres sa derniere phrase, assez pour enchainer une question, trop
 * peu pour qu'une equipe entiere reste en memoire toute la journee.
 */
import { PontAcp } from './acp.js'
import { expliquerPanne } from './modeles.js'

/** Silence au-dela duquel un agent se rendort. */
const DELAI_SOMMEIL = 120000

/**
 * Profondeur maximale de delegation.
 *
 * 0 = ce que tu ecris. 1 = ce qu'Hermes confie a quelqu'un. 2 = ce que ce
 * quelqu'un confie a son tour. On s'arrete la : au-dela, une equipe qui se
 * renvoie le travail tourne en rond sans que personne ne s'en apercoive, et
 * chaque niveau coute un demarrage et un appel modele.
 */
const PROFONDEUR_MAX = 2

/**
 * Deux plafonds, appris d'un essai qui a fini avec quatorze agents en ligne.
 *
 * Un modele qui recopie l'annuaire dans sa reponse ecrit onze mentions d'un
 * coup ; le Hub les lisait toutes et reveillait tout le monde. La consigne
 * d'ecriture aide, mais elle depend du modele - ces bornes, non.
 *
 * ELARGISSEMENT_MAX : ce qu'une seule delegation peut convoquer.
 * CONVOQUES_MAX     : le total pour un message, toutes profondeurs confondues.
 *
 * **Ils ne bornent que la delegation** - ce que les agents se renvoient entre
 * eux. Ce que l'utilisateur mentionne lui-meme n'est jamais tronque : `envoyer`
 * sert la liste entiere.
 *
 * Le total est passe de 6 a 10 le 02/08/2026, sur mesure : dix agents mentionnes
 * d'un coup repondent en parallele en moins de 6 s, chacun dans son metier. Six
 * etait une prudence posee avant d'avoir vu la machine encaisser, et elle avait
 * un effet de bord bete - une reunion a dix laissait le compteur au-dessus du
 * plafond, donc aucun des dix ne pouvait appeler un absent.
 *
 * ELARGISSEMENT_MAX reste a 3, et ce n'est pas la meme chose : ce n'est pas un
 * plafond de charge, c'est **un detecteur**. Au-dela de trois mentions dans une
 * seule reponse, un modele ne delegue pas, il recite l'annuaire. Le monter
 * ferait revenir les quatorze agents en ligne.
 */
const ELARGISSEMENT_MAX = 3
const CONVOQUES_MAX = 10

/** Sans accents ni casse : on ecrit `@Redacteur` comme `@redacteur`. */
function normaliser(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

// -----------------------------------------------------------------------------
// Les mentions
// -----------------------------------------------------------------------------
/**
 * Un `@` ne compte qu'en debut de mot.
 *
 * Sans cette garde, « ecris a jean@exemple.fr » appelle un agent nomme
 * « exemple ». Une adresse mail dans un message est un cas courant, pas une
 * curiosite.
 */
const MOT_AGENT = /(?<!\S)@([\p{L}][\p{L}0-9_-]*)/gu
const MOT_GROUPE = /(?<!\S)@(?:pole|pôle|equipe|équipe)\s+/giu

/**
 * Extrait les mentions d'un message.
 *
 * Deux formes : `@nom` pour un agent, `@pole <nom>` ou `@equipe <nom>` pour un
 * groupe. Le mot-cle est consomme avec son argument, sinon `@pole Veille`
 * chercherait aussi un agent nomme « pole ».
 *
 * Le nom d'un groupe porte des espaces, et rien dans la phrase ne dit ou il
 * s'arrete : « @pole Veille IA lance » ne se decoupe qu'en connaissant les
 * poles existants. On essaie donc les prefixes du plus long au plus court, et
 * on garde le premier qui designe un pole. A defaut, on prend jusqu'a la
 * ponctuation - assez pour rendre une mention inconnue lisible dans l'erreur.
 *
 * @param {string} texte
 * @param {string[]} titresPoles titres connus, pour couper au bon endroit
 * @returns {{ agents: string[], groupes: string[], reste: string }}
 */
export function lireMentions(texte, titresPoles = []) {
  const agents = []
  const groupes = []
  const connus = titresPoles.map(normaliser)

  let reste = ''
  let i = 0
  const brut = String(texte || '')

  MOT_GROUPE.lastIndex = 0
  for (let m = MOT_GROUPE.exec(brut); m; m = MOT_GROUPE.exec(brut)) {
    reste += brut.slice(i, m.index) + ' '
    const apres = brut.slice(m.index + m[0].length)

    // Les mots candidats s'arretent a la ponctuation forte : un titre de pole
    // n'en contient pas.
    const mots = (apres.match(/^[^\n,;:!?]*/) || [''])[0].trim().split(/\s+/).filter(Boolean)

    let pris = 0
    for (let n = mots.length; n > 0; n--) {
      const essai = normaliser(mots.slice(0, n).join(' '))
      if (essai && connus.some((t) => t.includes(essai))) {
        pris = n
        break
      }
    }
    if (pris === 0) pris = mots.length // pole inconnu : on rend le nom entier

    groupes.push(mots.slice(0, pris).join(' '))
    i = m.index + m[0].length + apres.indexOf(mots.slice(0, pris).join(' ')) +
        mots.slice(0, pris).join(' ').length
    MOT_GROUPE.lastIndex = i
  }
  reste += brut.slice(i)

  reste = reste.replace(MOT_AGENT, (_, nom) => {
    agents.push(nom)
    return ' '
  })

  return { agents, groupes, reste: reste.replace(/\s+/g, ' ').trim() }
}

/**
 * A qui parle ce message ?
 *
 * Sans mention, c'est Hermes : il est l'interlocuteur par defaut, et c'est lui
 * qui sait deleguer. Une mention inconnue n'est pas silencieusement ignoree -
 * on la remonte, sinon l'utilisateur croit avoir appele quelqu'un.
 *
 * @returns {{ destinataires: object[], inconnues: string[] }}
 */
export function resoudre(texte, agents, groupesConnus = []) {
  const { agents: nomsAgents, groupes } = lireMentions(
    texte,
    groupesConnus.map((g) => g.titre),
  )
  const inconnues = []
  const choisis = new Map()

  const trouver = (nom) => {
    const n = normaliser(nom)
    return agents.find((a) => normaliser(a.id) === n || normaliser(a.nom) === n)
  }

  for (const nom of nomsAgents) {
    const a = trouver(nom)
    if (a) choisis.set(a.id, a)
    else inconnues.push('@' + nom)
  }

  for (const nom of groupes) {
    const n = normaliser(nom)
    // Le nom exact l'emporte sur une correspondance partielle : « @equipe
    // Musique » ne doit pas attraper « Musique de film » s'il existe aussi une
    // equipe « Musique » tout court.
    const groupe =
      groupesConnus.find((g) => normaliser(g.titre) === n) ||
      groupesConnus.find((g) => normaliser(g.titre).includes(n))

    if (!groupe) {
      inconnues.push('@equipe ' + nom)
      continue
    }
    for (const id of groupe.membres) {
      const a = agents.find((x) => x.id === id)
      if (a) choisis.set(a.id, a)
    }
  }

  if (choisis.size === 0 && inconnues.length === 0) {
    const hermes = agents.find((a) => a.role === 'orchestrateur') || agents[0]
    if (hermes) choisis.set(hermes.id, hermes)
  }

  return { destinataires: [...choisis.values()], inconnues }
}

// -----------------------------------------------------------------------------
// Ce que l'orchestrateur doit savoir de son equipe
// -----------------------------------------------------------------------------
/**
 * Sans ce rappel, Hermes ignore qu'une equipe existe : il cherche « trieur »
 * dans ses sessions passees et demande du contexte, faute de savoir que c'est
 * un collegue qu'il peut appeler.
 *
 * On lui donne donc l'annuaire et un moyen d'agir - et ce moyen est celui que
 * l'utilisateur emploie deja. Deleguer, c'est ecrire une mention : un seul
 * mecanisme pour les deux, donc un seul a comprendre et a corriger.
 */
export function annuaire(agents, moi, dernierNiveau = false) {
  const autres = agents.filter((a) => a.id !== moi && a.pretAServir)
  if (!autres.length) return ''

  const lignes = autres.map((a) => {
    const nom = a.id === 'default' ? 'hermes' : a.id
    return `- @${nom} (${a.nom}) : ${a.description || 'pas de description'}`
  })

  const entete = ["[Ton equipe] Tu n'es pas seul : voici les autres agents.", ...lignes, '']

  // Au dernier niveau, deleguer ne menerait nulle part : autant le dire, plutot
  // que de laisser l'agent ecrire une mention qui sera ignoree.
  if (dernierNiveau) {
    return [
      ...entete,
      'Tu es au bout de la chaine : tu ne peux appeler personne pour cette',
      'demande. Reponds avec ce que tu sais, et dis franchement ce qui te',
      "manque plutot que d'inventer.",
    ].join('\n')
  }

  return [
    ...entete,
    "Pour confier un travail a l'un d'eux, ecris sa mention en debut de ligne,",
    'suivie de la consigne complete - il ne voit pas notre conversation :',
    '  @nom fais ceci, avec tout le contexte necessaire',
    'Le systeme le reveille et rapporte sa reponse.',
    '',
    "N'annonce pas que tu vas le faire et ne demande pas la permission : ecris",
    'directement la mention. Si la demande nomme quelqu un, appelle-le. Si tu',
    'peux repondre seul, reponds seul, sans mentionner personne.',
    'Reponds toujours en francais.',
  ].join('\n')
}

/**
 * Ce qu'il faut dire quand plusieurs agents recoivent le MEME message.
 *
 * Sans ca, chacun voit une demande qui lui est adressee et un annuaire de
 * collegues a qui deleguer : il en conclut, tres logiquement, qu'il est seul
 * saisi et doit couvrir toute la demande. Sur cinq agents d'une equipe, trois
 * repondaient au nom de tout le monde - et le fil racontait trois fois le meme
 * travail, signe de trois personnes differentes.
 *
 * Deux consequences a couper, pas une :
 *   - repondre pour les autres, donc produire du faux : personne n'a mandate
 *     l'agent qui parle, et ce qu'il prete a ses collegues, il l'invente ;
 *   - appeler un collegue qui traite deja la meme demande, ce qui double le
 *     travail et peut relancer une chaine entiere.
 *
 * La consigne part a CHAQUE message collectif, contrairement a l'annuaire qui
 * n'est donne qu'une fois : etre plusieurs est vrai de ce message-ci, pas de la
 * session.
 */
export function consigneCollective(destinataires, moi) {
  if (!Array.isArray(destinataires) || destinataires.length < 2) return ''

  const autres = destinataires.filter((a) => a.id !== moi)
  if (!autres.length) return ''

  const noms = autres.map((a) => a.nom || a.id).join(', ')

  return [
    `[Vous etes ${destinataires.length} sur cette demande]`,
    `Le meme message vient d'etre envoye en meme temps a : ${noms}.`,
    '',
    'Donc :',
    '- Reponds pour TON metier seulement, sur ta part du travail.',
    "- N'ecris pas au nom de l'equipe et ne resume pas ce que font les autres :",
    "  tu ne le sais pas, et l'utilisateur lit deja leurs reponses a cote.",
    '- Ne les appelle pas par une mention : ils traitent deja cette demande.',
    '- Si ta part depend de la leur, dis-le en une phrase et donne ce que tu',
    "  peux des maintenant, plutot que d'attendre.",
  ].join('\n')
}

// -----------------------------------------------------------------------------
// Le registre des ponts
// -----------------------------------------------------------------------------
export class Equipage {
  /** @param {{ cwd: string, diffuser: (e: object) => void }} options */
  constructor({ cwd, diffuser }) {
    this.cwd = cwd
    this.diffuser = diffuser
    /** id d'agent -> { pont, minuteur } */
    this.ponts = new Map()
  }

  /** Les agents actuellement eveilles, pour l'interface. */
  eveilles() {
    return [...this.ponts.keys()]
  }

  aPont(id) {
    return this.ponts.has(id)
  }

  /**
   * Le pont d'un agent, cree et demarre si besoin. La session ACP est ouverte
   * ici : c'est elle qui coute le demarrage a froid, et l'appelant doit pouvoir
   * l'attendre pour savoir quand l'agent est vraiment la.
   */
  async reveiller(agent) {
    const existant = this.ponts.get(agent.id)
    if (existant) {
      this.#reporterSommeil(agent.id)
      return existant.pont
    }

    const pont = new PontAcp({ cwd: this.cwd, profil: agent.profil, agent: agent.id })
    pont.on('evenement', (e) => this.diffuser(e))
    this.ponts.set(agent.id, { pont, minuteur: null })

    this.diffuser({ type: 'reveil', agent: agent.id, nom: agent.nom })
    try {
      await pont.ouvrirSession()
    } catch (err) {
      this.endormir(agent.id)
      throw err
    }
    this.#reporterSommeil(agent.id)
    return pont
  }

  /** Referme le pont d'un agent : le processus disparait. */
  endormir(id) {
    const entree = this.ponts.get(id)
    if (!entree) return false
    if (entree.minuteur) clearTimeout(entree.minuteur)
    this.ponts.delete(id)
    try {
      entree.pont.fermer()
    } catch {
      /* deja ferme */
    }
    this.diffuser({ type: 'sommeil', agent: id })
    return true
  }

  endormirTous() {
    for (const id of [...this.ponts.keys()]) this.endormir(id)
  }

  #reporterSommeil(id) {
    const entree = this.ponts.get(id)
    if (!entree) return
    if (entree.minuteur) clearTimeout(entree.minuteur)

    entree.minuteur = setTimeout(() => {
      const e = this.ponts.get(id)
      if (!e) return
      // Un agent qui reflechit encore ne doit pas etre referme sous lui : le
      // delai compte le SILENCE, pas le temps ecoule. Sans ce test, une longue
      // reflexion se termine par « session interrompue » et aucune reponse.
      if (e.pont.enCours) return this.#reporterSommeil(id)
      this.endormir(id)
    }, DELAI_SOMMEIL)

    // `unref` : un agent qui somnole ne doit pas empecher le Hub de s'arreter.
    if (typeof entree.minuteur.unref === 'function') entree.minuteur.unref()
  }

  /**
   * Envoie le message a ses destinataires.
   *
   * Les agents travaillent en parallele : chacun a son process, rien ne les
   * serialise, et les attendre l'un apres l'autre ferait payer la somme des
   * temps au lieu du plus long. Un echec chez l'un n'arrete pas les autres -
   * il est signale a sa place dans le fil.
   *
   * Une fois l'agent silencieux, on relit sa reponse : s'il y a mentionne
   * quelqu'un, c'est une delegation, et elle repart dans le meme circuit.
   *
   * @param {number} profondeur 0 pour un message de l'utilisateur
   * @param {object[]} tous l'annuaire complet, pour resoudre les delegations
   */
  async envoyer(texte, destinataires, { profondeur = 0, tous = [], groupes = [], convoques } = {}) {
    // Le compteur nait avec le message de l'utilisateur et voyage jusqu'au bout
    // de la chaine : c'est le total qu'on plafonne, pas chaque etage.
    const compte = convoques || new Set()
    for (const a of destinataires) compte.add(a.id)

    await Promise.all(
      destinataires.map(async (agent) => {
        try {
          const pont = await this.reveiller(agent)

          // L'annuaire va a TOUS, pas au seul orchestrateur : sinon un agent
          // sollicite ignore lui aussi que l'equipe existe, et il propose de
          // te demander ce qu'il pourrait obtenir en une mention.
          //
          // Une seule fois par session : le pont reste ouvert entre deux
          // messages, le repeter alourdirait chaque tour pour rien.
          let aEnvoyer = texte

          // Etre plusieurs est vrai de CE message, pas de la session : la
          // consigne collective repart donc a chaque fois, la ou l'annuaire
          // n'est donne qu'une fois.
          const collective = consigneCollective(destinataires, agent.id)
          if (collective) aEnvoyer = `${collective}\n\n---\n\n${aEnvoyer}`

          if (!pont.annuaireDonne) {
            const carte = annuaire(tous, agent.id, profondeur >= PROFONDEUR_MAX - 1)
            if (carte) aEnvoyer = `${carte}\n\n---\n\n${aEnvoyer}`
            pont.annuaireDonne = true
          }

          await pont.envoyer(aEnvoyer)
          await this.#deleguer(pont, agent, { profondeur, tous, groupes, convoques: compte })
        } catch (err) {
          // `expliquerPanne` va chercher dans `auth.json` la cause qu'Hermes y
          // a ecrite lui-meme. Sans elle, une session expiree remonte ici en
          // « Internal error » - ce qui n'envoie chercher nulle part. Mesure du
          // 05/08 : douze agents muets, la cause en clair sur le disque, et une
          // demi-journee passee a soupconner un probleme de credits.
          this.diffuser({
            type: 'panne',
            agent: agent.id,
            message: expliquerPanne(`${agent.nom} n'a pas pu repondre : ${err.message}`),
          })
        } finally {
          this.#reporterSommeil(agent.id)
        }
      }),
    )
  }

  /**
   * Un agent a-t-il appele quelqu'un dans sa reponse ?
   *
   * On ne se fie qu'au texte qu'il vient d'ecrire - `texteTour` est remis a
   * zero a chaque tour par le pont. Un agent ne peut pas s'appeler lui-meme :
   * ce serait une boucle immediate, et c'est l'erreur que fait un modele qui
   * repete la consigne au lieu de l'executer.
   */
  async #deleguer(pont, agent, { profondeur, tous, groupes, convoques }) {
    if (profondeur >= PROFONDEUR_MAX) return

    const reponse = String(pont.texteTour || '')
    if (!reponse.includes('@')) return

    const titres = groupes.map((g) => g.titre)
    const lu = lireMentions(reponse, titres)

    // Sans mention, `resoudre` designe l'orchestrateur par defaut. Ici, une
    // reponse qui ne mentionne personne ne doit reveiller personne.
    if (!lu.agents.length && !lu.groupes.length) return

    // Une reponse bourree de mentions recopie l'annuaire, elle ne delegue pas.
    // C'est le signe le plus sur d'un modele qui recite au lieu d'agir.
    if (lu.agents.length > ELARGISSEMENT_MAX) {
      this.diffuser({
        type: 'delegation-ignoree',
        agent: agent.id,
        nom: agent.nom,
        citees: lu.agents.length,
      })
      return
    }

    const { destinataires } = resoudre(reponse, tous, groupes)
    const voulus = destinataires
      .filter((a) => a.id !== agent.id)
      .filter((a) => !convoques.has(a.id)) // deja appele : on ne l'appelle pas deux fois
      .slice(0, ELARGISSEMENT_MAX)

    // On ne depasse pas le total, quitte a tronquer la derniere delegation.
    const suite = voulus.slice(0, Math.max(0, CONVOQUES_MAX - convoques.size))

    // Le plafond total se taisait : `return` sec, et l'appel disparaissait sans
    // trace. Un agent qui en appelait un autre pour finir le travail voyait sa
    // demande s'evaporer, et l'utilisateur attendait une reponse qui ne viendrait
    // jamais. Un plafond qui ne se dit pas n'est pas un plafond, c'est un bug.
    if (voulus.length > suite.length) {
      this.diffuser({
        type: 'plafond-atteint',
        agent: agent.id,
        nom: agent.nom,
        refuses: voulus.slice(suite.length).map((a) => a.nom),
        plafond: CONVOQUES_MAX,
      })
    }

    if (!suite.length) return

    const consigne = lu.reste || reponse

    this.diffuser({
      type: 'delegation',
      agent: agent.id,
      nom: agent.nom,
      vers: suite.map((a) => a.id),
      texte: consigne,
    })

    await this.envoyer(consigne, suite, {
      profondeur: profondeur + 1,
      tous,
      groupes,
      convoques,
    })
  }

  /** Interrompt tout ce qui parle. */
  async interrompre() {
    const arrets = [...this.ponts.values()].map((e) =>
      e.pont.interrompre().catch(() => null),
    )
    await Promise.all(arrets)
    return { interrompu: true }
  }

  /** L'autorisation porte le nom de l'agent qui l'a demandee. */
  autoriser(agentId, demande, optionId) {
    const entree = this.ponts.get(agentId)
    if (!entree) return false
    return entree.pont.autoriser(demande, optionId)
  }

  /**
   * Ce que les agents eveilles declarent savoir faire : leurs modes ACP.
   *
   * ECRIT POUR UNE EXPERIENCE, ET LA QUESTION EST PRECISE. Le 05/08/2026, le
   * mode Discussion a ete contourne : le Hub refusait bien la demande d'`edit`,
   * et Hermes a ecrit le fichier par le terminal - un appel qui n'est jamais
   * passe par `session/request_permission`. Refuser cote Hub ne suffit donc
   * pas. Reste a savoir si le moteur d'Hermes offre lui-meme un mode ou rien
   * ne s'ecrit : ce serait la seule garantie qui prenne AUSSI le terminal,
   * parce qu'elle serait tenue en amont du Hub.
   *
   * **N'OUVRE AUCUNE SESSION.** Interroger reveillerait un agent pour repondre
   * a une question d'inventaire, et un inventaire qui change ce qu'il compte
   * ne vaut rien. On rend ce qu'on sait des ponts deja ouverts, et `null`
   * quand il n'y en a pas - a l'appelant de dire « envoie un message d'abord »
   * plutot que de le faire dans son dos.
   */
  modes() {
    const agents = []
    for (const [id, { pont }] of this.ponts) {
      const s = pont.session
      agents.push({
        agent: id,
        ouvert: !!s,
        modes: s?.modes || [],
        modeActuel: s?.modeActuel ?? null,
      })
    }
    return { agents, aucunPontOuvert: agents.length === 0 }
  }

  /** Ce qu'un flux qui arrive en cours de route doit savoir. */
  etat() {
    const agents = []
    for (const [id, { pont }] of this.ponts) {
      agents.push({ agent: id, ...pont.etat() })
    }
    return { agents }
  }
}

export { DELAI_SOMMEIL }
