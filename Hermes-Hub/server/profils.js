/**
 * Les profils de memoire : quatre niveaux livres, et les siens.
 *
 * POURQUOI. La question « utiliser le profil pre-rempli ? » de l'installateur
 * avait deux defauts. Personne ne savait ce qu'il acceptait - donc tout le
 * monde repondait oui - et ce qu'on acceptait etait l'atelier d'un
 * developpeur. Chez un comptable, six lignes sur les commits et les jalons ne
 * veulent rien dire, et une charte qu'on ne relit plus parce qu'elle parle d'un
 * autre metier ne protege plus personne.
 *
 * PAS PAR METIER, PAR NIVEAU. « Comptable », « avocat », « architecte » : la
 * liste est infinie et on ne sait pas ecrire un bon profil comptable. On
 * livrerait du vague, qui coute des jetons a chaque demarrage sans rien
 * apporter - exactement la dilution qu'on essaie de supprimer. Quatre niveaux
 * cumulatifs, du plus nu au plus outille, se defendent et se comprennent d'un
 * coup d'oeil.
 *
 * LE SOCLE N'APPARTIENT PAS AU HUB, et c'est la regle qui a decide de toute la
 * forme du module. `index.js` le dit deja pour la version d'origine :
 * l'installateur reste seul proprietaire du contenu livre, sinon les deux
 * finissent par diverger. Un profil ne porte donc QUE son supplement, et le
 * texte applique vaut toujours « le fichier d'origine + les suppplements ». Le
 * socle n'existe qu'a un seul endroit : `MEMORY.default.md`, pose par
 * l'installateur.
 *
 * LE POIDS EST AFFICHE, et ce n'est pas de la coquetterie. Ces fichiers sont
 * relus a CHAQUE demarrage de session. Mesure le 03/08/2026 : l'ancienne liste
 * de regles pesait 46 lignes, environ 553 jetons. Sans un poids visible, on
 * empile trois profils et on retrouve la dilution - en pire, parce que cette
 * fois l'utilisateur l'aura choisie sans le savoir.
 */
import fs from 'node:fs'
import path from 'node:path'
import { HUB_DIR, readJson, writeJson } from './workspace.js'

/** Les profils de l'utilisateur. Ceux-la appartiennent au Hub, pas a Hermes. */
const FICHIER = path.join(HUB_DIR, 'profils-memoire.json')

/**
 * Quatre niveaux cumulatifs pour les regles de travail.
 *
 * `ajout` est ce que le niveau apporte EN PLUS du precedent : appliquer
 * « methodique » colle donc le socle, puis la rigueur, puis la methode. Ecrire
 * chaque bloc une seule fois evite qu'une correction sur la rigueur oublie de
 * descendre dans les deux niveaux qui la contiennent.
 */
const NIVEAUX = [
  {
    id: 'essentiel',
    nom: 'Essentiel',
    resume: 'Les huit garde-fous seuls. Le plus leger.',
    ajout: '',
  },
  {
    id: 'methodique',
    nom: 'Methodique',
    // Deux lignes, et pas quatre : les deux autres que j'avais ecrites - poser
    // le plan, ecrire le point d'arret a chaque jalon - disaient deja ce que
    // portent l'atelier et la section REPRISE. Repeter une consigne sous deux
    // formulations dans un fichier relu a chaque demarrage, c'est la dilution
    // qu'on essaie de supprimer.
    resume: "En plus : etapes finissables, finir avant d'elargir.",
    ajout: `## Methode

- Decouper en etapes qu'on peut finir : une etape qui dure trois jours n'en est
  pas une.
- Ne pas empiler les chantiers ouverts : finir avant d'elargir.`,
  },
  {
    id: 'complet',
    nom: 'Complet',
    resume: 'En plus : sources, incertitude, ne pas extrapoler.',
    ajout: `## Rigueur

- Dire d'ou vient une information : un fichier, une page, une mesure. Sans
  source, le dire aussi.
- Ne pas extrapoler au-dela de ce qui est mesure. Une tendance n'est pas une
  prevision.
- Donner l'incertitude quand elle existe, plutot qu'un chiffre net qui la cache.
- Dans une meme reponse, distinguer ce qui est verifie de ce qui est probable.`,
  },
]

/** Les niveaux livres ne concernent que les regles : ni `USER.md` - que nous ne
    pouvons pas deviner - ni `SOUL.md`, sur lequel un nouveau venu n'a aucun
    avis. Ces deux-la n'ont que les profils qu'on y enregistre. */
const AVEC_NIVEAUX = 'MEMORY.md'

/**
 * Ce que coute un texte a chaque demarrage.
 *
 * Le rapport caracteres/jetons est une approximation assumee - environ 3,6 sur
 * du francais accentue. On affiche un ordre de grandeur pour qu'une charte de
 * quarante lignes se voie comme telle, pas une facture.
 */
export function poids(texte) {
  const t = String(texte || '')
  return {
    lignes: t.split('\n').filter((l) => l.trim()).length,
    jetons: Math.round(t.length / 3.6),
  }
}

function tousLesProfils() {
  const brut = readJson(FICHIER, null)
  return brut && typeof brut === 'object' ? brut : {}
}

/** L'identifiant d'un profil enregistre : lisible, et stable pour l'URL. */
function identifiant(nom) {
  const id = String(nom || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  if (!id) {
    const err = new Error('Donne un nom a ce profil.')
    err.status = 400
    throw err
  }
  return id
}

/**
 * Ce nom est-il deja celui d'un niveau livre ?
 *
 * On compare a l'identifiant ET au nom affiche, et ce n'est pas de la ceinture
 * et bretelles : les deux ont diverge des qu'on a renomme « Essentiel » en
 * « Par defaut ». La garde ne regardait que `id`, donc « Par defaut » passait -
 * et la bulle affichait deux entrees du meme nom, l'une livree, l'autre non.
 * Trouve par son test le 03/08/2026.
 */
function estNomLivre(id) {
  return NIVEAUX.some((n) => n.id === id || identifiant(n.nom) === id)
}

/**
 * Le socle nu, tel que l'installateur l'a pose. Le Hub ne le connait pas : il
 * le lit.
 *
 * DEUX FICHIERS, ET L'ORDRE COMPTE. `MEMORY.socle.md` est les garde-fous seuls,
 * copies avant que l'atelier ne s'y ajoute ; `MEMORY.default.md` est le fichier
 * INSTALLE, atelier compris - c'est lui que restaure le bouton « Version
 * d'origine », et c'est le profil par defaut, qui n'a donc pas a figurer dans
 * la bulle.
 *
 * Construire « Essentiel » sur le second le rendrait identique au fichier
 * livre : la bulle proposerait un choix qui ne change rien. Le repli existe
 * quand meme pour les postes installes avant que le socle nu ne soit ecrit -
 * mieux vaut une bulle imparfaite qu'une bulle absente.
 */
function origine(chemin) {
  for (const suffixe of ['.socle.md', '.default.md']) {
    try {
      return fs.readFileSync(chemin.replace(/\.md$/, suffixe), 'utf8').replace(/\s+$/, '')
    } catch {
      /* l'autre, alors */
    }
  }
  return null
}

/** Le texte qu'un niveau produirait : le socle, puis les suppplements jusqu'a
    lui. */
function texteNiveau(chemin, id) {
  const socle = origine(chemin)
  if (socle === null) {
    const err = new Error(
      "Aucune version d'origine sur ce poste : les niveaux livres s'appuient dessus. " +
        'Elle est posee par l installateur ; une installation anterieure a la v1.0.0 n en a pas.',
    )
    err.status = 404
    throw err
  }
  const jusqua = NIVEAUX.findIndex((n) => n.id === id)
  if (jusqua === -1) return null
  const blocs = NIVEAUX.slice(0, jusqua + 1)
    .map((n) => n.ajout)
    .filter(Boolean)
  return [socle, ...blocs].join('\n\n') + '\n'
}

/**
 * Ce qu'on peut choisir pour un fichier, et ce qu'il pese aujourd'hui.
 *
 * On ne cherche pas a deviner quel profil est « actif » : l'utilisateur edite
 * son fichier a la main, et un profil applique puis retouche ne l'est plus
 * vraiment. Annoncer un profil actif qui ne correspond plus au contenu
 * mentirait. On rend le poids reel, et c'est tout ce qui est vrai.
 */
export function listerProfils(nom, chemin) {
  const miens = (tousLesProfils()[nom] || []).map((p) => ({
    id: p.id,
    nom: p.nom,
    resume: `${poids(p.contenu).lignes} lignes, enregistre par toi`,
    ...poids(p.contenu),
  }))

  let livres = []
  if (nom === AVEC_NIVEAUX && origine(chemin) !== null) {
    livres = NIVEAUX.map((n) => ({
      id: n.id,
      nom: n.nom,
      resume: n.resume,
      recommande: !!n.recommande,
      ...poids(texteNiveau(chemin, n.id)),
    }))
  }

  let actuel = { lignes: 0, jetons: 0 }
  try {
    actuel = poids(fs.readFileSync(chemin, 'utf8'))
  } catch {
    /* fichier absent : zero, ce qui est vrai */
  }

  return { fichier: nom, livres, miens, actuel }
}

/** Le texte d'un profil sans l'appliquer : l'ecran le montre avant qu'on
    choisisse. C'etait tout le reproche fait a l'ancienne question. */
export function lireProfil(nom, chemin, id) {
  const livre = texteNiveau(chemin, id)
  if (livre !== null) return { id, contenu: livre, ...poids(livre) }

  const mien = (tousLesProfils()[nom] || []).find((p) => p.id === id)
  if (!mien) {
    const err = new Error(`Profil « ${id} » introuvable.`)
    err.status = 404
    throw err
  }
  return { id, contenu: mien.contenu, ...poids(mien.contenu) }
}

/**
 * Appliquer un profil.
 *
 * L'etat courant part en `.bak` avant d'etre remplace, comme le fait deja la
 * remise a zero : quelqu'un qui essaie un niveau pour voir doit pouvoir revenir
 * a ce qu'il avait ecrit.
 */
export function appliquerProfil(nom, chemin, id) {
  const { contenu } = lireProfil(nom, chemin, id)
  if (fs.existsSync(chemin)) fs.copyFileSync(chemin, chemin + '.bak')
  fs.mkdirSync(path.dirname(chemin), { recursive: true })
  fs.writeFileSync(chemin, contenu, 'utf8')
  // Choisir, c'est avoir regarde : le bandeau n'a plus lieu d'etre.
  if (nom === AVEC_NIVEAUX) noterAccueil({ profilValide: true })
  return { applique: id }
}

/** Le prochain « Custom N » libre : on ne demande pas un nom a quelqu'un qui
    veut juste garder ce qu'il a. Il le renommera s'il y tient. */
function prochainNom(liste) {
  let n = 1
  while (liste.some((p) => p.id === `custom-${n}`)) n += 1
  return `Custom ${n}`
}

/** Garder l'etat courant sous un nom. C'est le « + Custom » de la bulle. */
export function enregistrerProfil(nom, chemin, titre) {
  const tousAvant = tousLesProfils()[nom] || []
  const vrai = String(titre || '').trim() || prochainNom(tousAvant)
  const id = identifiant(vrai)
  let contenu = ''
  try {
    contenu = fs.readFileSync(chemin, 'utf8')
  } catch {
    /* rien a garder */
  }
  if (!contenu.trim()) {
    const err = new Error("Ce fichier est vide : il n'y a rien a enregistrer.")
    err.status = 400
    throw err
  }
  if (estNomLivre(id)) {
    const err = new Error(`« ${vrai} » est le nom d'un profil livre. Choisis-en un autre.`)
    err.status = 409
    throw err
  }

  const tous = tousLesProfils()
  const liste = (tous[nom] || []).filter((p) => p.id !== id)
  liste.push({ id, nom: vrai, contenu })
  tous[nom] = liste
  writeJson(FICHIER, tous)
  return { id, nom: vrai, ...poids(contenu) }
}

/** Renommer un profil enregistre. Son identifiant suit son nom - c'est lui qui
    sert d'URL - donc renommer, c'est deplacer l'entree. */
export function renommerProfil(nom, id, titre) {
  const neuf = identifiant(titre)
  if (estNomLivre(neuf)) {
    const err = new Error(`« ${titre} » est le nom d'un profil livre. Choisis-en un autre.`)
    err.status = 409
    throw err
  }

  const tous = tousLesProfils()
  const liste = tous[nom] || []
  const cible = liste.find((p) => p.id === id)
  if (!cible) {
    const err = new Error(`Profil « ${id} » introuvable.`)
    err.status = 404
    throw err
  }
  if (neuf !== id && liste.some((p) => p.id === neuf)) {
    const err = new Error(`Un profil « ${String(titre).trim()} » existe deja.`)
    err.status = 409
    throw err
  }

  cible.id = neuf
  cible.nom = String(titre).trim()
  tous[nom] = liste
  writeJson(FICHIER, tous)
  return { id: neuf, nom: cible.nom }
}

// -----------------------------------------------------------------------------
// L'accueil du premier lancement
// -----------------------------------------------------------------------------
/**
 * Ce qu'on retient de la premiere visite.
 *
 * COTE SERVEUR, ET PAS DANS LE NAVIGATEUR. Un `localStorage` se vide quand on
 * change de navigateur, quand on nettoie ses donnees, ou quand le Hub s'ouvre
 * depuis un autre raccourci - et la fenetre reviendrait chez quelqu'un qui a
 * deja tout rempli. L'etat appartient au poste, pas a l'onglet.
 *
 * DEUX DRAPEAUX, ET LEUR SEPARATION EST TOUT LE DISPOSITIF. `fenetreVue` est
 * coche par la case « ne plus afficher » : il eteint le RAPPEL. `profilValide`
 * ne s'obtient qu'en allant choisir - ou en gardant sciemment celui qui est
 * livre - et lui seul eteint le BANDEAU.
 *
 * Une case qui eteindrait les deux annulerait l'objectif : ceux qui la cochent
 * sont exactement ceux qu'on veut atteindre. Le rappel ponctuel se refuse, la
 * mention permanente se merite.
 */
const ACCUEIL = path.join(HUB_DIR, 'accueil.json')

export function lireAccueil() {
  const brut = readJson(ACCUEIL, null) || {}
  return {
    fenetreVue: !!brut.fenetreVue,
    profilValide: !!brut.profilValide,
  }
}

export function noterAccueil(patch) {
  const etat = { ...lireAccueil() }
  if (typeof patch?.fenetreVue === 'boolean') etat.fenetreVue = patch.fenetreVue
  if (typeof patch?.profilValide === 'boolean') etat.profilValide = patch.profilValide
  writeJson(ACCUEIL, etat)
  return etat
}

export function supprimerProfil(nom, id) {
  const tous = tousLesProfils()
  const liste = tous[nom] || []
  const reste = liste.filter((p) => p.id !== id)
  if (reste.length === liste.length) {
    const err = new Error(`Profil « ${id} » introuvable.`)
    err.status = 404
    throw err
  }
  tous[nom] = reste
  writeJson(FICHIER, tous)
  return { id, retire: true }
}
