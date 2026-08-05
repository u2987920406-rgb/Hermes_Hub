/**
 * La carte de plan - QUI, QUOI, COMMENT, RESULTAT ATTENDU.
 *
 * La regle qui commande tout ce fichier vient de kuchu, le 04/08/2026, et elle
 * est recopiee de `FRICTIONS-PARCOURS.md` :
 *
 *   « Tant qu'Hermes n'a pas propose de plan, il repond, et c'est tout : aucun
 *     bouton de validation, aucun Studio. Les boutons n'apparaissent que
 *     lorsqu'un plan existe - parce qu'alors il y a quelque chose a valider. »
 *
 * D'ou la premiere chose que ce module rend, avant les quatre parts : **est-ce
 * seulement un chantier ?** Une salutation, une question, une demande de
 * conseil n'en est pas un. Ce n'est pas un detail d'ergonomie : un bouton
 * « Valider » pose devant quelque chose qui n'est pas validable est la
 * definition meme d'un bouton qui inquiete.
 *
 * -----------------------------------------------------------------------------
 * CE QUE LA MESURE A CHANGE, LE 06/08/2026
 * -----------------------------------------------------------------------------
 * V1 avait etabli que la carte est ecrite par Hermes et non par le Hub depuis le
 * JSON du decomposeur - lequel rend `{ok, reason, fanout, child_ids}` et **n'a
 * aucun champ pour un livrable attendu**. Elle avait ete eprouvee une fois, sur
 * une demande, avec un cerveau distant.
 *
 * Rejouee dix fois sur le cerveau local (`glm-5.2:cloud` via Ollama), elle a
 * rendu trois choses que la premiere version ne pouvait pas voir :
 *
 *   1. **« bonjour » recevait un plan.** Un agent, une tache, et un livrable
 *      nomme `reponse-conversation.txt`. Sans la sortie `chantier: false`,
 *      la regle de kuchu etait morte a la premiere phrase tapee ;
 *   2. **un agent invente** - `trioueur` la ou `trieur` existe. Un plan qui
 *      nomme quelqu'un qui n'est pas dans l'equipe ne se valide pas, et une
 *      faute d'une lettre ne se voit pas a l'oeil. D'ou `confronter()`, qui
 *      n'est pas de la mefiance mais la meme regle que partout ici : on ne
 *      promet que ce qu'on a constate ;
 *   3. **l'appel peut revenir vide.** Deux essais sur la meme phrase : le
 *      premier n'a rien rendu, le second a repondu en 14,7 s. Une carte qui
 *      n'arrive pas doit le dire, pas laisser un fil muet.
 *
 * Temps releves, meme phrase ou non : 8,5 · 8,6 · 10,3 · 13,3 · 13,3 · 14,7 ·
 * 14,8 · 16,9 · **54,2 s**. L'ecart est le sujet de F5, pas une anomalie : le
 * decompte doit montrer son plafond, parce qu'aucune moyenne ne le predit.
 *
 * **Un seul appel modele, et il n'ecrit rien.** Ni tache, ni fichier, ni
 * reveil : proposer un plan ne coute que du temps. C'est ce qui permet de le
 * refuser sans rien avoir a defaire.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { listerAgents } from './equipe.js'
import { ajouterTache, dernierJson } from './graphe.js'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

/**
 * Le plafond de la preparation, en millisecondes.
 *
 * 90 s pour une mesure haute a 54,2 s : de la marge, mais pas les 180 s du
 * decoupage. Ce n'est pas le meme geste - le decoupage ecrit un graphe et on
 * l'attend ; ici on est **dans une conversation**, et au-dela d'une minute et
 * demie de silence il vaut mieux dire qu'on renonce que continuer a compter.
 *
 * ⚠ Ce chiffre est repris cote interface pour annoncer la coupure avant
 * qu'elle arrive - chercher `PLAFOND_PLAN_S`. Les deux se tiennent par ce
 * commentaire : changer l'un sans l'autre ferait mentir le decompte de la pire
 * facon, en promettant du temps qui n'existe plus.
 */
export const PLAFOND_PLAN = 90000

/** L'agent qu'on prend quand personne ne convient - et le seul nom de repli. */
const REPLI = 'default'

// -----------------------------------------------------------------------------
// La consigne
// -----------------------------------------------------------------------------
/**
 * Ce qu'on demande a Hermes, et pourquoi chaque bloc y est.
 *
 * L'ordre compte : le verdict AVANT la forme du plan. Presenter le gabarit en
 * premier revient a annoncer qu'un plan est attendu - et c'est exactement ce
 * qui a fait planifier « bonjour ».
 *
 * La regle sur les noms est ecrite en dernier et en majuscules parce qu'elle
 * est la seule que la mesure a vue enfreinte. « Recopie » plutot que
 * « utilise » : un modele qui croit corriger une coquille ecrit `trioueur`.
 */
export function consignePlan(texte, agents) {
  return [
    "Tu decides si une demande merite un PLAN de travail pour une equipe d'agents IA.",
    "Tu ne fais RIEN d'autre : aucun outil, aucun fichier, aucune recherche.",
    '',
    'LA DEMANDE :',
    String(texte || '').trim(),
    '',
    'LES AGENTS DISPONIBLES (nom exact — specialite) :',
    // `metier` est le « en trois mots » de l'annuaire ; la description entiere
    // ferait une consigne de plusieurs pages avec treize agents, et un modele
    // qui lit trop loin choisit moins bien.
    ...agents.map((a) => `- ${a.id} — ${a.metier || a.role || 'polyvalent'}`),
    '',
    "D'ABORD, TRANCHE. Un plan ne se justifie QUE si la demande est un vrai",
    'travail : plusieurs etapes, ou un fichier a produire, ou plusieurs agents.',
    "Une salutation, une question, une demande d'explication ou de conseil",
    "n'en est PAS un : on y repond, on ne monte pas une equipe.",
    '',
    'Si ce n est PAS un chantier, reponds UNIQUEMENT :',
    '{"chantier": false, "pourquoi": "une phrase qui dit pourquoi tu reponds directement"}',
    '',
    'Si c en est un, reponds UNIQUEMENT par cet objet, sans texte autour ni balise :',
    '{',
    '  "chantier": true,',
    '  "titre": "3 a 6 mots",',
    '  "qui": [{"agent": "nom EXACT pris dans la liste ci-dessus", "role": "ce qu il fait, 5 mots"}],',
    '  "quoi": [{"agent": "nom EXACT", "tache": "une phrase a l infinitif"}],',
    '  "comment": "2 a 3 phrases : l ordre, ce qui va en parallele, les outils employes, ce qui sera ecrit sur le disque",',
    '  "resultat": [{"fichier": "nom-de-fichier.ext", "quoi": "ce que c est, 6 mots"}]',
    '}',
    '',
    'REGLE ABSOLUE SUR LES NOMS : chaque "agent" doit etre RECOPIE caractere pour',
    'caractere depuis la liste ci-dessus. N invente aucun nom, n en corrige aucun.',
    'Si aucun agent ne convient pour une tache, ecris exactement "default".',
  ].join('\n')
}

// -----------------------------------------------------------------------------
// La lecture - tout ce qui est verifiable sans appeler personne
// -----------------------------------------------------------------------------
const texteCourt = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

function erreur(message, status = 502) {
  const err = new Error(message)
  err.status = status
  return err
}

/**
 * Les noms cites, confrontes a l'annuaire reel.
 *
 * Un nom inconnu n'est pas corrige au plus proche : `trioueur` ressemble a
 * `trieur`, mais rapprocher deux chaines est une devinette, et une devinette
 * qui se trompe assigne le travail a quelqu'un d'autre sans que personne le
 * voie. Il tombe donc sur `default` - l'orchestrateur, qui sait deleguer - et
 * **son nom est garde** pour que la carte puisse le dire. C'est aussi ce que
 * reclame C4 : le plan doit dire quand une tache tombe sur l'agent par defaut.
 */
function confronter(nom, connus, inconnus) {
  const propre = texteCourt(nom, 60)
  if (connus.has(propre)) return propre
  if (propre) inconnus.add(propre)
  return REPLI
}

/**
 * La sortie brute d'Hermes devient un plan, ou une raison de ne pas en avoir.
 *
 * Fonction pure : c'est elle que les tests eprouvent, sans jamais reveiller un
 * modele. Tout ce qui suit est donc verifiable a froid - la forme, les noms,
 * les refus - et il ne reste d'incertain que le temps de l'appel.
 */
export function lirePlan(sortie, agents) {
  const brut = dernierJson(sortie)
  if (!brut || typeof brut !== 'object') {
    throw erreur(
      "Hermes n'a pas rendu de plan lisible. Reessaie : le meme cerveau ne repond pas deux fois pareil.",
    )
  }

  // Le verdict d'abord. `chantier` absent vaut « oui » : un objet qui porte des
  // taches et des livrables EST un plan, meme si le mot manque. L'inverse - lire
  // un silence comme un refus - ferait perdre un plan deja calcule.
  if (brut.chantier === false) {
    return {
      chantier: false,
      pourquoi:
        texteCourt(brut.pourquoi, 300) ||
        "Hermes repond directement : ce n'est pas un travail a confier a l'equipe.",
    }
  }

  const connus = new Set(agents.map((a) => a.id))
  const inconnus = new Set()

  const quoi = (Array.isArray(brut.quoi) ? brut.quoi : [])
    .map((e) => ({
      agent: confronter(e?.agent, connus, inconnus),
      tache: texteCourt(e?.tache, 200),
    }))
    .filter((e) => e.tache)

  // Un plan sans etape n'est pas un plan : il n'y aurait rien a valider, et le
  // scenario pose sur le disque serait vide. On refuse plutot que de montrer
  // une carte creuse avec trois boutons dessous.
  if (!quoi.length) {
    throw erreur(
      "Hermes a repondu, mais sans aucune etape a valider. Reformule la demande, ou ouvre le Studio pour la construire a la main.",
    )
  }

  const qui = (Array.isArray(brut.qui) ? brut.qui : [])
    .map((e) => ({
      agent: confronter(e?.agent, connus, inconnus),
      role: texteCourt(e?.role, 120),
    }))
    .filter((e) => e.agent)

  // QUI se deduit de QUOI quand il manque : ce sont les memes agents, et une
  // carte a trois parts vaut mieux qu'un refus pour une part omise.
  const vus = new Set(qui.map((e) => e.agent))
  for (const e of quoi) {
    if (!vus.has(e.agent)) {
      vus.add(e.agent)
      qui.push({ agent: e.agent, role: '' })
    }
  }

  const resultat = (Array.isArray(brut.resultat) ? brut.resultat : [])
    .map((r) => ({ fichier: texteCourt(r?.fichier, 120), quoi: texteCourt(r?.quoi, 160) }))
    .filter((r) => r.fichier)

  return {
    chantier: true,
    titre: texteCourt(brut.titre, 120) || texteCourt(quoi[0].tache, 60),
    qui,
    quoi,
    comment: texteCourt(brut.comment, 900),
    resultat,
    /**
     * Les noms que le plan a inventes, tombes sur `default`. Vide presque
     * toujours - et c'est justement pour le presque que la carte doit pouvoir
     * le dire.
     */
    inconnus: [...inconnus],
    /**
     * Ce que le plan NE dit pas, et qu'on ne fabrique pas a sa place. Sans
     * livrable nomme, la confrontation annonce / rendu de la fin de run n'a
     * rien a comparer - c'est la seule part qui permette de juger apres coup.
     */
    sansLivrable: resultat.length === 0,
  }
}

// -----------------------------------------------------------------------------
// L'appel
// -----------------------------------------------------------------------------
/**
 * `hermes -z` : la reponse finale, sans les outils ni les etapes.
 *
 * Meme forme que `hermesLent` dans `index.js`, et pour la meme raison :
 * `spawnSync` figerait le processus Node entier pendant tout l'appel, donc les
 * flux SSE, donc le decompte qu'on veut afficher par-dessus.
 */
function hermesZ(consigne, delai) {
  return new Promise((resolve) => {
    const enfant = spawn('hermes', ['-z', consigne], { windowsHide: true })
    let sortie = ''
    let tue = false

    enfant.stdout.setEncoding('utf8')
    enfant.stdout.on('data', (bout) => {
      if (sortie.length < 1024 * 1024) sortie += bout
    })
    enfant.stderr.resume()

    const minuterie = setTimeout(() => {
      tue = true
      enfant.kill()
    }, delai)

    const finir = (code) => {
      clearTimeout(minuterie)
      resolve({ sortie, code, tue })
    }
    enfant.on('close', finir)
    // `hermes` absent du PATH n'emet jamais `close` : sans ceci la promesse ne
    // se resout pas et le decompte monte jusqu'a l'infini.
    enfant.on('error', () => finir(null))
  })
}

/** Un plan, ou la raison de ne pas en proposer. Aucune ecriture, nulle part. */
export async function preparerPlan(texte) {
  const demande = String(texte || '').trim()
  if (!demande) throw erreur('Demande vide', 400)

  const agents = listerAgents()
  const r = await hermesZ(consignePlan(demande, agents), PLAFOND_PLAN)

  if (r.tue) {
    throw erreur(
      `La preparation du plan a depasse ${Math.round(PLAFOND_PLAN / 1000)} secondes et a ete arretee. Relance : le meme cerveau ne met pas le meme temps deux fois.`,
    )
  }
  return { ...lirePlan(r.sortie, agents), demande }
}

// -----------------------------------------------------------------------------
// Poser le scenario sur le disque - et c'est ici qu'aucun modele n'est appele
// -----------------------------------------------------------------------------
/**
 * LE PLAN VALIDE DEVIENT UN GRAPHE, SANS RIEN REDEMANDER A PERSONNE.
 *
 * C'est la difference avec le chemin d'aujourd'hui, et elle vaut d'etre dite :
 * `/api/demande` appelle `kanban decompose`, donc un modele, et **on valide
 * ensuite un graphe qu'on n'a pas vu**. Ici l'ordre est inverse - on lit le
 * plan, on le valide, et le graphe pose est exactement celui qu'on a lu. Le
 * seul appel modele du parcours a deja eu lieu.
 *
 * LA FORME DU GRAPHE est celle que `decompose` produit, parce que
 * `grouperEnPoles` la reconnait deja : les etapes s'enchainent, et **la demande
 * d'origine est la derniere** - elle depend de tout et ne precede rien, ce qui
 * en fait la tete du pole et lui donne son titre.
 *
 * L'ordre est celui de `quoi`, en chaine. Le plan decrit parfois des paralleles
 * dans son COMMENT ; on ne les devine pas depuis une prose. Enchainer est le
 * pire des cas en duree et le seul qui ne puisse pas lancer une etape avant que
 * ce dont elle depend existe.
 */
export function poserScenario(plan, demande) {
  if (!plan?.chantier || !Array.isArray(plan.quoi) || !plan.quoi.length) {
    throw erreur("Ce plan n'a aucune etape a poser.", 400)
  }

  const texte = String(demande || plan.demande || '').trim()
  const titre = texteCourt(plan.titre, 120) || 'Scenario'

  const etapes = []
  let precedente = null
  for (const [i, e] of plan.quoi.entries()) {
    // Le corps porte le livrable attendu : c'est ce que l'agent lit, et sans
    // lui il redecouvre au jugé ce qu'il doit produire.
    const corps = [
      e.tache,
      '',
      `Etape ${i + 1} sur ${plan.quoi.length} du scenario « ${titre} ».`,
      plan.resultat.length
        ? `Livrables attendus du scenario : ${plan.resultat.map((r) => r.fichier).join(', ')}.`
        : '',
      '',
      'La demande d origine :',
      texte,
    ]
      .filter((l) => l !== null)
      .join('\n')

    const { id } = ajouterTache({
      titre: texteCourt(e.tache, 100),
      corps,
      agent: e.agent === REPLI ? null : e.agent,
      parents: precedente ? [precedente] : [],
    })
    etapes.push({ id, agent: e.agent, tache: e.tache })
    precedente = id
  }

  // La demande d'origine ferme la chaine : elle depend de la derniere etape,
  // donc elle finit en dernier, donc elle nomme le pole.
  const { id: pole } = ajouterTache({
    titre,
    corps: texte,
    parents: precedente ? [precedente] : [],
  })

  ecrirePlan(pole, { ...plan, demande: texte, etapes, poseLe: Date.now() })
  return { pole, titre, etapes }
}

// -----------------------------------------------------------------------------
// Le plan garde a cote du pole
// -----------------------------------------------------------------------------
/**
 * Pourquoi le plan ne vit pas dans le corps de la tache.
 *
 * Le corps est lu par les agents et affiche dans le Studio : y coller un JSON
 * le rendrait illisible aux deux. Et le plan doit survivre pour une raison
 * precise - C8, la confrontation annonce / rendu en fin de run : sans le
 * RESULTAT ATTENDU garde quelque part, un pole en echec partiel ressemble
 * exactement a un pole reussi.
 *
 * Meme partage que `studio.js` pour les positions : ce qui appartient au Hub
 * reste dans le Hub, le tableau reste a Hermes.
 */
const DOSSIER = path.join(HUB_DIR, 'plans')

export function ecrirePlan(poleId, plan) {
  writeJson(path.join(DOSSIER, `${String(poleId).replace(/[^\w.-]/g, '')}.json`), plan)
  return plan
}

export function lirePlanDuPole(poleId) {
  return readJson(path.join(DOSSIER, `${String(poleId).replace(/[^\w.-]/g, '')}.json`), null)
}
