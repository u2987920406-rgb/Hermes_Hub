/**
 * The 6 standard project files. Kept byte-for-byte in step with the ones
 * Nouveau-Projet.ps1 writes, so a project created from the Hub and a project
 * created from the desktop shortcut are indistinguishable.
 */

export function projectFiles(name, objective) {
  const obj = objective || '(a preciser avec Hermes)'

  return {
    '.hermes.md': `# ${name}

## Identite
${obj}

## PREMIERE ACTION OBLIGATOIRE (a effacer apres validation du plan)
Des le premier message de l'utilisateur (peu importe ce qu'il dit: bonjour, salut, j'ai un projet, etc.):
1. Si BRIEF.md existe et a deja ete rempli : lire le brief, saluer l'utilisateur par son prenom si present, et continuer directement sans reposer la question du plan.
2. Sinon, repondre: "Bienvenue dans ton projet ${name}."
3. Si l'utilisateur n'a pas encore parle d'idee ou de plan, poser: "As-tu deja une idee ou un plan ? Veux-tu qu'on le construise ensemble ?"
4. Si pas d'idee: questions guidees (stack, pourquoi, comment, pour qui)
5. Si idee existe: la peaufiner ensemble
5b. SI le plan comporte une interface, des ecrans, une charte ou des couleurs:
    proposer de poser des le depart la console de reglages et les noms de zone
    (voir DESIGN.md). C'est le moment le moins cher - rien n'est encore ecrit.
    L'utilisateur ne sait pas que ca existe: c'est a toi de le dire.
6. Demander si profil isole souhaite (memoire separee)
7. Proposer des exemples si demande
8. Une fois valide, ecrire dans plan.md
9. EFFACER cette section du .hermes.md (pour ne plus reposer la question)
10. Seulement APRES, commencer a coder

## Regles
- Tester avant de dire fini
- Review visuelle + code par jalon
- REPRISE.md apres chaque jalon
- ADM.md pour les decisions (cumulatif, jamais effacer)
`,

    'DESIGN.md': `# ${name} - Design

Ou tirer les leviers quand on veut changer l'apparence de quelque chose.

Ce fichier est pose vide a la creation du projet. **Il ne coute rien tant qu'on
ne s'en sert pas**, et il evite d'avoir a inventer une methode le jour ou on en
a besoin.

---

## AU MODELE QUI LIT CE FICHIER

Deux moments obligent a en parler a l'utilisateur. Il ne sait pas que ca
existe : c'est a toi de le dire, il ne le demandera jamais.

**1. Quand tu produis un plan** qui mentionne une stack, une interface, des
ecrans, une charte ou des couleurs.

> Dis-lui qu'on peut poser des le depart une console de reglages et des noms de
> zone, pour qu'il puisse plus tard modifier l'apparence lui-meme, avec des
> curseurs, sans passer par le code.

C'est le moment le moins cher : rien n'est encore ecrit. Attendre la premiere
retouche, c'est devoir rattraper des composants deja ecrits sans nom.

**2. Quand il parle d'apparence** - « c'est trop petit », « cette couleur »,
« c'est trop serre », « je trouve que… ».

> Ne le laisse pas decrire ce qu'il pourrait montrer. Dis-lui qu'un atelier
> existe : une pastille dans un coin de l'ecran, des curseurs qu'il bouge
> lui-meme, et il te donne la valeur quand ca lui plait.

Ne le sors pas a l'ouverture d'une session ni a chaque message. Une proposition
repetee hors de propos est ignoree - c'est-a-dire ignoree aussi le jour ou elle
sert.

**Pour l'installer** (une seule commande, aucune dependance) :

\`\`\`
node <chemin>/design-universel-kit/installer.mjs .
\`\`\`

---

## 1. La console

Un bloc unique dans la feuille de style. Tourner une valeur change toute
l'application, **sans ouvrir un seul composant**.

Chaque molette dit ce qu'elle fait **et sa plage utile** : une valeur sans plage
est une invitation a casser quelque chose.

\`\`\`css
:root {
  /* --- Le texte -------------------------------------------------------- */
  --texte-echelle: 1;      /* 0.9 = serre, 1.15 = confortable */
  --texte-titre: 20px;     /* en dessous de 16, ce n'est plus un titre */
  --texte-corps: 14px;     /* 12 minimum pour rester lisible longtemps */

  /* --- Les surfaces ----------------------------------------------------- */
  --carte-rayon: 12px;     /* 0 = anguleux, 24 = tres rond */
  --densite: 1;            /* multiplie l'espacement des listes */
}
\`\`\`

**Une molette se merite.** Ne fais pas l'inventaire de ce qui est reglable, il
est infini : inscris ce qu'on t'a **deja demande de changer**, meme une seule
fois, et ce qui est **recopie** d'un endroit a l'autre. Une meme valeur ecrite
a trois endroits est une molette qui s'ignore.

Une console de soixante reglages n'a rien resolu : elle a deplace le probleme
du composant vers la feuille de style.

## 2. Les noms de zone

Chaque bloc visuel porte un nom, **dans le code** :

\`\`\`html
<div data-zone="carte-produit"> … </div>
\`\`\`

Le nom vit avec le composant, donc il survit aux deplacements. Un index qui
noterait « fichier ligne 214 » serait faux au troisieme commit - et un index
faux envoie chercher au mauvais endroit avec assurance.

Il sert dans les deux sens : \`grep\` pour le trouver, et l'inspecteur du
navigateur pour le nommer quand on veut demander une modification.

Nomme avec le mot que tu emploierais en le montrant du doigt.

## 3. L'index

Classe par **ce qu'on voit a l'ecran**, jamais par arborescence de fichiers -
personne ne pense « ce fichier-la », on pense « la carte en haut a droite ».

| Ce que tu vois | Zone | Molettes | Sinon |
|---|---|---|---|
| Une carte de produit | \`carte-produit\` | \`--carte-rayon\`, \`--densite\` | \`Produit.tsx\` |
| Le titre d'une page | \`titre-page\` | \`--texte-titre\` | idem |

La derniere colonne est la plus utile : elle dit **quand aucune molette
n'existe**. Deplacer une entree de menu, replier une rangee, changer l'ordre
des ecrans : aucun reglage ne fera ca, il faut modifier le composant. Le dire
franchement evite une deception.

---

## Les regles

1. **Une molette se merite** : elle existe parce que quelqu'un a voulu la
   tourner.
2. **Chaque molette dit sa plage utile**, pas seulement sa valeur.
3. **Un composant visible porte un nom de zone**, pose en meme temps qu'on
   l'ecrit. Quelques secondes, contre une passe de rattrapage plus tard.
4. **Construire ne suffit pas : regarde le rendu.** Une barre de defilement
   fantome et un texte mal encode compilent sans une erreur.
5. **Ce qui est un fait se genere, ce qui est de la prose s'ecrit.** Un tableau
   regenere depuis le code ne peut pas mentir ; un libelle bien tourne, aucun
   script ne saura l'ecrire.
`,

    'BRIEF.md': `# ${name} - BRIEF

## Description
${obj}

## Phase actuelle
Demarrage

## Voir aussi
- REPRISE.md pour l'avancement
- plan.md pour le plan complet
- ADM.md pour les decisions
`,

    'plan.md': `# ${name} - Plan

## Phases
(a definir avec Hermes au demarrage)
`,

    'REPRISE.md': `# ${name} - REPRISE

## Dernier jalon
(a remplir apres le premier jalon)

## Prochaine etape
-
`,

    'done.md': `# ${name} - Done

## Historique
(a remplir au fur et a mesure)
`,

    'ADM.md': `# ${name} - ADM

## Decisions (cumulatif, ne jamais effacer)

### Demarrage
- Creation du projet: ${obj}
`,
  }
}

const NOTE_TYPES = {
  Lessons: 'lesson',
  Skills: 'skill',
  Decisions: 'decision',
  Bugs: 'bug',
  Projets: 'project',
  Changelog: 'changelog',
}

const NOTE_BODIES = {
  lesson: '## Description\n\n## Solution\n\n## Erreur(s) faite(s)\n\n## Liens\n- \n',
  skill: "## Competence acquise\n\n## Comment on l'a apprise\n\n## Exemple d'utilisation\n\n## Liens\n- \n",
  decision: '## Contexte\n\n## Decision prise\n\n## Raison\n\n## Alternatives envisagees\n\n## Liens\n- \n',
  bug: '## Description du bug\n\n## Cause racine\n\n## Solution appliquee\n\n## Prevention\n\n## Liens\n- \n',
  project: '## Objectif\n\n## Stack technique\n\n## Phases / jalons\n- [ ] Phase 1: \n\n## Liens\n- \n',
  changelog: '## Obsolete\n-\n\n## Nouveau\n-\n\n## A verifier\n-\n',
}

/** Vault note with the same YAML front matter as the installer's templates. */
export function vaultNote(folder, title, body) {
  const type = NOTE_TYPES[folder] || 'note'
  const date = new Date().toISOString().slice(0, 10)
  const front = [
    '---',
    `type: ${type}`,
    `date: ${date}`,
    'project: ',
    'tags: []',
    'status: active',
    'source: hermes-hub',
    'obsolescence: none',
    `verified_date: ${date}`,
    '---',
    '',
  ].join('\n')

  return `${front}# ${title}\n\n${body || NOTE_BODIES[type] || ''}`
}
