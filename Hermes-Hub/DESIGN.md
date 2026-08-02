# Le design du Hub - ou tirer les leviers

Ce fichier repond a une seule question : **je veux changer l'apparence de
quelque chose, ou est-ce que je touche ?**

Il est ecrit pour etre lu par quelqu'un qui ne connait pas le code - un humain
presse, ou une IA qui ouvre le projet pour la premiere fois.

---

## 0. Le protocole - quatre pas, dans l'ordre

> 1. **Trouve la ligne dans l'index** (section 1). Il est classe par ce que tu
>    vois a l'ecran, pas par arborescence de fichiers.
> 2. **Si une molette existe, tourne-la** dans la console de `src/index.css` -
>    et n'ouvre aucun `.tsx`. Une molette agit sur toute l'application d'un coup.
> 3. **Sinon, `grep` le nom de zone** (`data-zone="bulle-agent"`). Tu tombes
>    directement sur le composant, sans lire les 900 lignes du fichier.
> 4. **`npm run build`, puis REGARDE le rendu.** Pas seulement la compilation.

Le quatrieme pas n'est pas de la politesse. Une barre de defilement fantome et
un titre de conversation qui avalait la phrase de l'utilisateur ont tous les
deux compile sans une erreur, et ne se voyaient que sur l'ecran.

**Ce que l'index ne promet pas.** Certaines demandes ne sont pas des reglages :
deplacer l'historique dans le menu, replier une rangee par defaut, changer
l'ordre des ecrans. Aucune molette ne fera ca, et l'index le dit dans sa
derniere colonne plutot que de laisser chercher. Une molette inventee pour
l'occasion est pire qu'un composant modifie franchement.

---

## 1. L'index des zones

Chaque bloc visuel porte un nom stable dans le code :

```tsx
<div data-zone="bulle-agent" …>
```

Ce nom **vit dans le code**, donc il survit aux deplacements et aux refactos -
contrairement a un index en `fichier:ligne`, faux des le troisieme commit. Il
sert dans les deux sens : `grep` pour le trouver, et l'inspecteur du navigateur
pour le nommer quand on veut demander une modification.

### Le fil de conversation

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Une bulle d'agent qui parle | `bulle-agent` | `--agent-point`, `--agent-halo`, `--bulle-retrait` | `Conversation.tsx` |
| Ta propre bulle, a droite | `bulle-moi` | `--bulle-rayon`, `--bulle-largeur` | idem |
| « X confie le travail a Y » | `trace-delegation` | — | idem |
| La colonne qui defile | `fil-conversation` | — | largeur : `max-w-3xl` |
| La barre du bas | `barre-saisie` | — | idem |
| « Louise et Gabriel travaillent - 12 s » | `agents-au-travail` | `--agent-point-compact` | idem, composant `AuTravail` |
| La rangee de pastilles d'agents | `rangee-agents` | `--agent-point-compact` | repliee par defaut, voir `deplie` |
| Une pastille d'agent | `pastille-agent` | `--agent-point-compact` | idem |

### L'orchestration

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Le menu de gauche (Historique, Conversation…) | `nav-orchestration` | — | l'ordre vient de `VOLETS` |
| Une fiche dans la liste des agents | `fiche-agent` | `--agent-lisere`, `--agent-point`, `--densite` | `OrchestrationView.tsx` |
| Une conversation dans l'historique | `ligne-historique` | `--densite` | tri : `ONGLETS` |
| Une vignette de pole | `vignette-pole` | `--agent-lisere-vignette` | idem |
| Une vignette d'equipe | `vignette-equipe` | `--agent-lisere-vignette` | idem |
| Le champ « Decris ce que tu veux » | `boite-demande` | — | idem |
| Les autorisations en attente, en haut du pole | `accords-orchestration` | — | idem |
| La fenetre de simulation | `fenetre-simulation` | — | `FenetreSimulation.tsx` |
| Le decompte pendant qu-Hermes decoupe | `decompte-decoupage` | — | idem, `PLAFOND_DECOUPAGE_S` |
| Le banc d'essai, en bas de la simulation | `banc-essai` | — | `BancEssai.tsx` |
| Une ligne du banc : un essai et sa mesure | `ligne-banc` | `--densite` | idem, c'est un `.rang` |

### Le Studio

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| L'ecran entier, sans barre laterale | `studio` | — | `StudioView.tsx` |
| Une case du canevas | `noeud-studio` | `--agent-lisere-noeud`, `--agent-point` | `NoeudStudio.tsx` |
| La fiche « une tache de plus » | `brouillon-tache` | — | `StudioView.tsx` |
| Le panneau de reglages a droite | — | — | `StudioView.tsx`, cherche `<aside` |
| Les traits entre les cases | — | — | pas de molette : la couleur vient de l'agent amont |

### L'organigramme

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Le graphe entier | `organigramme` | `REGLAGES` (en JS, voir plus bas) | `Organigramme.tsx` |
| Une case | `noeud-organigramme` | `--agent-lisere-noeud`, `--agent-point` | idem |
| Une equipe qui deborde du bloc | — | baisser `REGLAGES.L` | la mise a l'echelle est automatique |

### Le reste de l'application

| Ce que tu vois | Zone a grep |
|---|---|
| Le menu bleu nuit de gauche | `menu-lateral` |
| Le bandeau de titre d'un ecran | `entete-page` |
| Une carte de projet | `carte-projet` |
| Les notifications volantes | `notifications` |
| Une fenetre modale | `fenetre-modale` |
| Le formulaire de creation d'un projet | `formulaire-nouveau-projet` |
| La palette de commandes | `palette-commandes` |
| Les ecrans complets | `ecran-accueil`, `ecran-projets`, `ecran-detail-projet`, `ecran-configuration`, `ecran-coffre`, `ecran-corbeille`, `ecran-clean` |

Ces derniers portent **le nom seul, pas de molettes** : ce sont les ecrans
livres aux clients. On peut les trouver en une seconde, mais on ne les
retouche pas pour la symetrie - voir section 9.

### Ou vit chaque zone

Ce tableau n'est pas ecrit a la main : `npm run design` le regenere depuis le
code. **Il ne peut donc pas mentir**, contrairement aux libelles ci-dessus, qui
sont de la prose - et que la meme commande verifie sans les reecrire.

<!-- ZONES:DEBUT -->
| Zone | Fichier |
|---|---|
| `accords-orchestration` | `src/pages/OrchestrationView.tsx` |
| `agents-au-travail` | `src/components/Conversation.tsx` |
| `banc-essai` | `src/components/BancEssai.tsx` |
| `barre-saisie` | `src/components/Conversation.tsx` |
| `boite-demande` | `src/pages/OrchestrationView.tsx` |
| `brouillon-tache` | `src/pages/StudioView.tsx` |
| `bulle-agent` | `src/components/Conversation.tsx` |
| `bulle-moi` | `src/components/Conversation.tsx` |
| `carte-projet` | `src/components/ProjectCard.tsx` |
| `decompte-decoupage` | `src/components/FenetreSimulation.tsx` |
| `ecran-accueil` | `src/pages/HomeView.tsx` |
| `ecran-clean` | `src/pages/CleanView.tsx` |
| `ecran-coffre` | `src/pages/VaultView.tsx` |
| `ecran-configuration` | `src/pages/ConfigView.tsx` |
| `ecran-corbeille` | `src/pages/TrashView.tsx` |
| `ecran-detail-projet` | `src/pages/ProjectDetail.tsx` |
| `ecran-projets` | `src/pages/ProjectsView.tsx` |
| `entete-page` | `src/components/PageHeader.tsx` |
| `fenetre-modale` | `src/components/Modal.tsx` |
| `fenetre-simulation` | `src/components/FenetreSimulation.tsx` |
| `fiche-agent` | `src/pages/OrchestrationView.tsx` |
| `fil-conversation` | `src/components/Conversation.tsx` |
| `formulaire-nouveau-projet` | `src/components/NewProjectModal.tsx` |
| `ligne-banc` | `src/components/BancEssai.tsx` |
| `ligne-historique` | `src/pages/OrchestrationView.tsx` |
| `menu-lateral` | `src/components/Sidebar.tsx` |
| `nav-orchestration` | `src/pages/OrchestrationView.tsx` |
| `noeud-organigramme` | `src/components/Organigramme.tsx` |
| `noeud-studio` | `src/components/NoeudStudio.tsx` |
| `notifications` | `src/components/Toasts.tsx` |
| `organigramme` | `src/components/Organigramme.tsx` |
| `palette-commandes` | `src/components/CommandPalette.tsx` |
| `pastille-agent` | `src/components/Conversation.tsx` |
| `rangee-agents` | `src/components/Conversation.tsx` |
| `studio` | `src/pages/StudioView.tsx` |
| `trace-delegation` | `src/components/Conversation.tsx` |
| `vignette-equipe` | `src/pages/OrchestrationView.tsx` |
| `vignette-pole` | `src/pages/OrchestrationView.tsx` |
<!-- ZONES:FIN -->

---

## 2. La console de reglages

En tete de `src/index.css`, un bloc encadre. **Tourner une valeur la change
l'application entiere, sans ouvrir un composant.**

Ce tableau vient de `index.css` lui-meme - valeurs et commentaires compris.
`npm run design` le reecrit : il ne peut pas se desynchroniser du reglage reel.

<!-- MOLETTES:DEBUT -->
| Molette | Aujourd'hui | Ce qu'elle fait |
|---|---|---|
| `--agent-lisere` | `55%` | une fiche ou une ligne d'agent |
| `--agent-lisere-noeud` | `60%` | une case d'organigramme : petite, donc plus franche |
| `--agent-lisere-vignette` | `45%` | une vignette d'equipe ou de pole |
| `--agent-point` | `10px` | bulle du fil, case d'organigramme, ligne d'agent |
| `--agent-point-compact` | `8px` | rangee de pastilles sous le fil |
| `--agent-halo` | `20%` | — |
| `--agent-halo-taille` | `3px` | — |
| `--texte-echelle` | `1` | 0.9 = serre, 1.15 = confortable |
| `--texte-nom` | `calc(13px * var(--texte-echelle))` | le nom d'un agent, partout |
| `--texte-metier` | `calc(10.5px * var(--texte-echelle))` | sa ligne de metier, sous le nom |
| `--texte-corps` | `calc(13px * var(--texte-echelle))` | ce qu'un agent dit, une description |
| `--texte-detail` | `calc(10.5px * var(--texte-echelle))` | role, modele, mentions discretes |
| `--bulle-rayon` | `16px` | 4 = anguleux, 24 = tres rond |
| `--bulle-largeur` | `85%` | part de la colonne qu'une bulle peut occuper |
| `--bulle-retrait` | `18px` | decalage du corps sous le point, pour l'aligner |
| `--densite` | `1` | — |
<!-- MOLETTES:FIN -->

Quatre classes consomment ces molettes, et remplacent les inlines qu'on
recopiait de composant en composant :

```
.point-agent            le point d'identite (+ .point-agent-compact)
.lisere-agent           le contour colore (+ -noeud, + -vignette)
.rang / .rang-y         une ligne de liste : le seul endroit qui suit --densite
```

Elles attendent `--agent` posee sur un ancetre, ce que fait le composant :

```tsx
<div style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

**Ou s'arrete `--densite`.** Elle agit sur les lignes de liste, et rien
d'autre. Rendre les boutons et les cartes elastiques aussi ferait bouger
l'ecran entier d'un cran a chaque reglage - c'est une console, pas un zoom.

**La console de geometrie.** Cinq nombres echappent au CSS : `REGLAGES` en tete
d'`Organigramme.tsx` (largeur et hauteur d'une case, les trois ecarts). Ils
servent a calculer des coordonnees SVG, et une chaine `"184px"` ne s'additionne
pas. C'est la seule exception, et elle est signalee ici pour qu'on ne la
cherche pas dans la feuille de style.

---

## 3. Les trois fichiers

| Fichier | Ce qu'il commande |
|---|---|
| `tailwind.config.ts` | les palettes maison (`navy`, `gold`), la police, les animations |
| `src/index.css` | la console, les classes de composants, les trois themes, les jetons |
| les `.tsx` | la structure, et quelques couleurs de surface (voir section 9) |

---

## 4. Les trois themes

Le Hub pose une classe a la racine du document : rien en clair, `.dark` en
sombre, `.antique` pour le lin. Les composants ne sont **jamais** au courant du
theme : ils utilisent des classes et des variables, qui changent de valeur sous
la racine.

Consequence pratique : **un nouveau theme ne demande de toucher aucun
composant.** On ajoute un bloc de plus dans `index.css`.

---

## 5. Changer les boutons

C'est le levier le plus demande, et c'est un seul endroit :
`src/index.css`, bloc `@layer components`.

```css
.btn          /* la forme commune : rayon, espacement, taille de texte */
.btn-primary  /* l'action principale */
.btn-gold     /* l'action « Hermes » */
.btn-ghost    /* l'action secondaire */
.btn-danger   /* l'action destructrice */
```

Tous les boutons de l'application passent par la. Rendre le primaire plus
colore, c'est modifier `.btn-primary` - la centaine de boutons de l'app suit.

Meme principe pour `.card` (toutes les boites), `.input` (tous les champs) et
`.muted` (tous les textes d'explication).

---

## 6. Le vocabulaire des etats

Une pastille porte **un sens**, jamais une couleur :

```tsx
<span className="puce sens-succes">termine</span>
<span className="puce puce-pleine sens-succes">en cours</span>
<span className="puce sens-alerte">sans cle</span>
```

et non `bg-emerald-100 text-emerald-700`, qui ne dit pas pourquoi c'est vert et
qu'il faudrait retrouver partout le jour ou ca change.

**Les cinq sens**, definis pour les trois themes dans `index.css` :

| Variable | Sert a |
|---|---|
| `--succes` | c'est fait, ca marche |
| `--alerte` | attention, il manque quelque chose |
| `--danger` | c'est casse, ou c'est destructeur |
| `--info` | selection, mise en avant neutre |
| `--neutre` | en attente, sans etat particulier |

**Les classes qui les consomment :**

| Classe | Effet |
|---|---|
| `.puce` | pastille teintee (fond a 16 %, texte colore) |
| `.puce-pleine` | modificateur : aplat plein, texte en contraste |
| `.bandeau` | message encadre (bordure a 45 %, fond a 7 %) |
| `.teinte-sens` | colore un texte ou une icone selon le sens ambiant |
| `.sens-succes` … | pose le sens ; se combine avec les quatre au-dessus |

Une regle de composition : **l'aplat est reserve a ce qui se passe
maintenant.** « En cours » est plein, « termine » est teinte. Si tout est plein,
plus rien ne ressort.

Pour changer la couleur de « termine » dans toute l'application, une ligne :

```css
:root { --succes: #0d9488; }   /* et le pendant dans .dark et .antique */
```

---

## 7. Les couleurs d'agent

Chaque agent porte un **jeton**. Le serveur l'attribue (`server/equipe.js`),
l'interface le traduit en variable :

```tsx
<div style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

A partir de la, **la bordure, le point d'identite, son halo, l'anneau
d'activite, l'ombre portee et le degrade des liaisons en decoulent tous.**
Recolorer un agent, c'est changer son jeton, une fois.

### Les memes couleurs dans les trois themes

C'est **l'exception assumee** a la regle du theme, et elle a une raison : un
fond suit l'ambiance, une identite non. Si Elena vire au brun terreux en passant
a l'antique, on ne la reconnait plus et le code couleur ne code plus rien.

Les seize jetons sont donc definis **une seule fois, dans `:root`**. `.dark` et
`.antique` n'en redefinissent qu'un : `--jeton-ardoise`, qui sert de gris - et
un gris doit se detacher de son fond.

`--sur-jeton` est ce qui se pose sur un aplat de couleur : blanc en clair,
lin en antique, bleu nuit en sombre.

### Fond transparent, couleur dans le lisere

Une fiche d'agent ne prend **jamais** d'aplat teinte en fond. Quinze cartes
lavees de quinze couleurs font une mosaique qu'on ne lit plus. L'identite passe
par deux choses seulement :

| Element | Reglage |
|---|---|
| le lisere | `color-mix(in srgb, var(--agent) 45-60%, transparent)` |
| le point | `background: var(--agent)` + halo `box-shadow` a 20 % |

Le pourcentage du lisere monte avec l'importance de la surface : 60 % sur un
noeud d'organigramme, 55 % sur une ligne d'agent, 45 % sur une vignette
d'equipe. Le fond, lui, reste celui de `.card`.

Pas d'initiales dans une pastille : trois lettres dans un carre colore font un
logo, et quinze logos font du bruit. Un point suffit a dire qui parle.

### Quinze teintes, sans doublon

`PALETTE` compte quinze teintes espacees d'environ 28 degres sur la roue, plus
l'ardoise reservee a Hermes et au bac a sable. `distribuerCouleurs()` part de la
couleur preferee de chaque agent - un hachage de son identifiant, donc stable
d'un demarrage a l'autre - et prend **la suivante libre** si elle est deja
prise.

Deux pieges qui ont chacun coute une correction :

1. Les couleurs de `CONNUS` sont **reservees avant** le premier tirage, sinon le
   distributeur redonne joyeusement le ciel du Trieur a quelqu'un d'autre.
2. Le parcours suit **l'ordre alphabetique** des identifiants, pas l'ordre de
   lecture du disque : sans ca l'organigramme change de couleurs au redemarrage.

---

## 8. Ajouter un agent, un sens, un theme

**Un jeton d'agent** : **une** ligne dans le bloc `:root` de `index.css` - pas
trois, les jetons ne se declinent pas par theme - puis le nom du jeton dans
`PALETTE` de `server/equipe.js`.

**Un sens** : trois lignes dans `index.css`, plus une classe `.sens-<nom>`.

**Un theme** : un bloc `.<nom>` reprenant les variables, et les surcharges de
surface sur le modele de `.antique`. Aucun composant a modifier.

---

## 9. Ce qui n'est pas centralise, et pourquoi

Environ 300 classes de couleur restent ecrites dans les `.tsx` :
`bg-slate-100`, `border-navy-800`, `text-slate-400`…

Ce sont des **surfaces de structure**, pas du vocabulaire : le fond d'un
survol, la teinte d'une separation. Elles sont deja rattrapees par le theme
antique, qui les surcharge en bloc plutot que de retoucher chaque composant.

Les ramener a des variables serait un refactor de tous les fichiers pour un
gain nul - un produit livre ne se refactorise pas pour la symetrie. Les
couleurs de **sens**, elles, valent le deplacement, parce que ce sont les
seules qu'on change vraiment : c'est pour ca qu'elles seules ont ete extraites.

**Etat de la migration** (verifie le 1er aout 2026). Les jetons de sens
existent et sont complets pour les trois themes. Les ecrans d'Orchestration ne
portent **aucune couleur de sens en dur** : ce qui y reste ecrit en Tailwind est
du bleu de selection et de survol, c'est-a-dire de la surface.

Les ecrans plus anciens en portent encore une centaine, concentres dans
`ConfigView` (34), `Toasts` (18), `HomeView` (14) et `ProjectDetail` (12). Ils
marchent, mais ils echapperont a un changement de `--alerte` ou de `--danger`.

La regle : **on les convertit au fil de l'eau**, quand on touche un ecran pour
une autre raison. Une passe dediee sur des ecrans livres et stables ferait
courir un risque de regression sans rien apporter tant que les couleurs ne
changent pas.

---

## 10. Les regles a tenir

1. **Un composant n'ecrit jamais une couleur de sens en dur.** `puce
   sens-alerte`, jamais `bg-amber-100`.
2. **Les couleurs de sens se declinent pour les trois themes**, y compris
   l'antique : un reglage calibre pour le sombre est invisible sur le lin. Les
   **jetons d'agent font l'inverse** et restent identiques partout (section 7).
3. **L'aplat se merite.** Il signale ce qui se passe maintenant.
4. **La couleur d'un agent est une variable**, pas une classe : elle doit
   pouvoir irriguer une bordure, une ombre et un degrade SVG a la fois.
5. **Le fond reste neutre, la couleur va dans le lisere et le point.** Une
   identite se signale, elle ne se peint pas.
6. **Un organigramme tient dans un bloc, quel que soit le pole.** On doit voir
   l'equipe entiere sans glisser l'image : c'est ce que la vue sert a montrer.
   D'ou la mesure au `ResizeObserver`, le repli des niveaux trop larges en
   vertical et la mise a l'echelle en horizontal.
7. **Tout doit s'atteindre a la souris.** Le clavier est un raccourci, jamais un
   passage oblige : chaque filtre a son menu, chaque tri son bouton.
8. **Les animations respectent `prefers-reduced-motion`.** Le mouvement porte
   du confort, jamais de l'information seule.
