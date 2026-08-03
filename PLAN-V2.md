# V2 - Orchestration d'agents

Etude du document "plan hermes studio orchestration" (31 juillet 2026), confronte
a l'etat reel de la machine et du depot, puis arbitre avec kuchu.

Le document decrit un produit juste. Les points 1 a 8 - la vision, les deux modes
de creation, la simulation, le langage commun, le chat a mentions, le monitoring,
l'UX guidee - sont repris tels quels. Les ajustements portent sur le point 9,
l'annexe technique, ecrite sans connaitre ce depot.

---

## 1. Ce que la machine dit

Trois faits verifies, qui commandent le reste.

### Hermes contient deja le moteur

Le point 9.1 propose de construire un "Hermes Kernel" en Python ou Rust pour
l'orchestration, la memoire et les appels modeles. Ce moteur existe et il est
deja installe. `hermes --help` :

| Commande | Ce qu'elle fait | Point du document couvert |
|---|---|---|
| `kanban` | board multi-profils : taches, liens, commentaires | 4 (langage commun), 5 (poles) |
| `curator` | revue auto des skills : elague, consolide, archive, provenance | 7 (boucle memoire) |
| `learning` | graphe des skills apprises dans le temps, sortie `--json` | 7 (memoire), 9.3 (graphe) |
| `skills` | installer, auditer, publier, synchroniser | 1 (competences) |
| `cron` | planification | 8 (planification guidee) |
| `approvals` | mine les approbations passees en allowlist | 7 (niveaux de risque) |
| `moa` | slots provider/modele (Mixture of Agents) | 1 (un cerveau par agent) |
| `fallback` | providers de secours quand le primaire echoue | 1 (robustesse) |
| `profile` | les agents eux-memes | 1, 2 (equipes) |

**La V2 n'est pas un moteur a ecrire, c'est une fenetre a ouvrir.** C'est
l'economie la plus importante de cette etude : plusieurs mois de travail, et
surtout plusieurs mois de bugs qu'on n'aura pas. Le travail se deplace vers
l'interface, les branchements et l'ergonomie - ce qui est precisement la ou le
document est le plus riche.

### Le serveur du Hub n'a aucune dependance

Les six fichiers de `Hermes-Hub/server/` n'importent que des modules natifs de
Node (`http`, `fs`, `child_process`, `node:sqlite`). C'est delibere : le poste
client n'a ni npm ni `node_modules`, l'installateur y copie `dist/` + `server/`,
et la mise a jour ne remplace que ca.

Regle qui en decoule :

- une dependance **front** est gratuite - Vite la compile dans `dist/`, le client
  ne voit qu'un bundle. React Flow entre dans cette categorie ;
- une dependance **serveur** est interdite - il faudrait livrer `node_modules` et
  changer l'installateur, donc casser la mise a jour des postes existants.

### Un seul modele gratuit voit les images

Metadonnees reelles du cache portail :

| Modele | Vision |
|---|---|
| `tencent/hy3:free` | non |
| `poolside/laguna-s-2.1:free` | non (text) |
| `inclusionai/ling-3.0-flash:free` | non (text) |
| `stepfun/step-3.7-flash:free` | **oui** (aussi modele de compaction) |
| `poolside/laguna-xs-2.1:free` | non (text) |

L'Agent Vision est possible, mais il n'a **aucun repli** : si `stepfun` coupe, la
bascule automatique ne trouvera pas d'autre gratuit capable de voir. A savoir
avant de batir un pole dessus. Ollama (voir 3.5) leve cette limite.

### La decomposition rend deja un plan assignable *(mesure du 31 juillet 2026)*

C'etait la seule vraie inconnue du plan. Elle est levee.

Protocole : board neuf dans le bac a sable, une tache en triage portant la
requete de test mot pour mot, puis `hermes kanban decompose <id> --json`.

```
{"task_id":"t_4041ab5b","ok":true,"reason":"decomposed into 3 children",
 "fanout":true,"child_ids":["t_a599b3ea","t_f9c4c267","t_48b7fe90"]}
```

**22,7 secondes, un seul appel modele, trois taches coherentes en francais :**

| Tache | Assignee | Etat |
|---|---|---|
| Rechercher les nouveautes IA sur 5 sites tendance | `default` | ready |
| Synthetiser les nouveautes IA en tableau | **`redacteur`** | todo |
| Generer un PDF a partir du tableau de synthese | `default` | todo |

Les corps sont detailles et executables - le premier nomme meme des sources
plausibles, le deuxieme fixe les colonnes attendues.

**Le graphe de dependances existe**, dans la table `task_links`, lisible
directement comme le Hub lit deja le board :

```
recherche ──▶ tableau ──▶ PDF
    └───────────┴──────────┴──▶ tache d'origine (jonction)
```

Un vrai DAG : la chaine, plus la tache de depart devenue nœud de jonction qui
se termine quand ses trois filles sont finies. **Un pole, c'est une tache avec
des enfants** - le modele de donnees est acquis, il n'y a rien a inventer.

Trois consequences pour le plan :

1. **La phase 3 est courte.** Le difficile - transformer une phrase francaise en
   graphe de taches assignables et ordonnees - est fait par Hermes. Il reste au
   Hub a lire, a montrer et a poser la porte.
2. **La qualite du routage depend de l'existence de l'equipe.** `redacteur` a ete
   trouve parce que ce profil existe et que sa description correspond ; les deux
   autres taches sont tombees sur `default` faute de profil qui fasse de la
   recherche web ou du PDF. La phase 1 n'est donc pas qu'un affichage : c'est
   elle qui rend le routage juste.
3. **Le decomposeur n'attribue pas de competences** (`skills: []`). Les
   competences vivent sur le profil, pas sur la tache - ce qui confirme la
   regle des 2-3 competences par agent comme un reglage d'equipe.

Detail d'interface : `hermes kanban ls --json` ne rend pas les liens. Il faut
`kanban show`, ou lire `task_links` - ce que le Hub fait deja.

### Les modeles locaux tiennent la charge *(mesure du 31 juillet 2026)*

Seconde inconnue levee. Ollama tourne sur le poste avec sept modeles installes.
Tache d'essai : extraction structuree d'un extrait de page vers du JSON - le
travail exact d'un agent de lecture.

**A froid, le chargement en memoire ecrase tout. A chaud, l'ecart est net :**

| Modele | 1er jeton (froid) | 1er jeton (chaud) | Total (chaud) | Debit | JSON |
|---|---|---|---|---|---|
| `hermes3:3b` | 3,6 s | **0,49 s** | **1,80 s** | 15 j/s | complet |
| `gemma4:e2b` | 28,7 s | 10,4 s | 11,5 s | 24 j/s | complet |
| `gemma4:e4b` | 60,5 s | - | 68,9 s | 11 j/s | complet |

Les trois rendent un JSON exploitable et complet : **la qualite ne departage
pas, le temps si.**

Trois enseignements :

1. **`hermes3:3b` est le cerveau d'agent.** Moins de deux secondes pour une
   extraction courte, en local, sans limite de debit et sans reseau. C'est plus
   rapide et plus sur qu'un gratuit du portail qui peut couper en plein tour.
2. **Le debit n'est pas la latence.** `gemma4:e2b` a le meilleur debit (24 j/s)
   et la pire attente : ses 10,4 s avant le premier jeton sont constants a chaud,
   donc ce n'est pas du chargement mais un preambule de raisonnement - et il
   sort 281 jetons la ou 28 suffisent. **Un cerveau d'agent se choisit au temps
   de reponse, jamais au debit.**
3. **Il faut garder les modeles chauds.** Le premier appel coute 3 a 5 secondes
   de plus. Pendant un run, le Hub doit maintenir les modeles des agents en
   memoire (`keep_alive`), sinon chaque reveil paie le chargement.

**Vision.** `glm-ocr` n'est pas un modele de vision generale : c'est un
specialiste de l'OCR. Sur une capture d'ecran il n'a pas decrit l'image, il en a
extrait les champs de texte - et en 210 secondes, ce qui l'exclut d'une boucle.
En revanche **`gemma4:e2b` est multimodal** : il a decrit la meme image en
35,5 s. L'Agent Vision a donc un repli local, lent mais reel, ce qui leve la
fragilite signalee plus haut - un seul gratuit voyant les images, sans secours.

**Consequence sur l'ambition.** Le manque de credits cesse d'etre un plafond
pour les taches courtes : trier, extraire, resumer, reformater se font en local
en une a deux secondes. Le portail reste utile pour ce qui demande du
raisonnement - la decomposition, la synthese finale. Les phases 2 a 7 peuvent
donc viser une equipe reellement active plutot qu'un pole a la fois.

---

## 2. Les decisions prises

### Tauri : abandonne

Tauri ne resout pas le probleme qu'on lui pretait. La coexistence V1 / V2 est
**deja resolue et testee** : la branche `v2`, le canal beta, et un poste qui lit
`main/version.json` ou `v2/version.json` selon le canal choisi dans Configuration.
Les clients restent en v1.0.2 sans rien voir ; un poste de test bascule par une
case a cocher.

Tauri changerait l'empaquetage - chaine Rust, binaire signe par plateforme,
nouvel installateur - et casserait la migration des postes existants au lieu de
l'aider. **React Flow est retenu** : c'est du front, donc bundle dans `dist/`,
donc invisible pour le client. C'est le standard pour ce type de graphe.

### La stack : celle du Hub, figee

Aucune technologie nouvelle en dehors de React Flow. La V2 se construit avec
exactement ce qui tourne deja.

| Couche | Choix | Remarque |
|---|---|---|
| Interface | React 18, TypeScript 5.3 | inchange |
| Build | Vite 5 (`tsc && vite build`) | inchange |
| Styles | Tailwind 3 + PostCSS | inchange, y compris les trois themes |
| Etat | zustand 5 (`useHubStore`) | inchange |
| Icones | lucide-react | inchange |
| Graphe | **React Flow** | seule dependance ajoutee, cote front |
| Serveur | Node natif, zero dependance | `http`, `fs`, `child_process`, `node:sqlite` |
| Flux temps reel | SSE (`/api/chat/stream`) | deja en production |
| Donnees | `kanban.db` en lecture directe, profils Hermes | inchange |
| Moteur | le CLI `hermes` via ACP | l'intelligence reste chez Hermes |

React Flow est la seule addition, et elle est sans consequence pour le client :
Vite la compile dans `dist/`, le poste ne recoit qu'un bundle. La regle du
serveur sans dependance reste absolue.

### Studio : une vue du Hub, atteignable par le menu Orchestration

Studio fait partie integrante du Hub. On y entre par Orchestration, il n'existe
nulle part ailleurs. Meme processus, meme serveur, meme livraison, memoire
partagee d'office - donc aucune question de synchronisation entre deux etats.

Techniquement : une route plein ecran (`#/studio`), sans barre laterale, avec son
propre chrome. Le Hub reste le centre de controle leger ; Studio est l'atelier.

### Simulation locale : le coeur du dispositif

Le document l'appelle dry-run. C'est une **simulation locale dans l'application,
sans appel aux modeles**.

**Pole existant** - zero appel. La structure du pole est sur le disque : agents,
ordre, liens, entrees/sorties, outils declares, niveau de risque. La simulation
rejoue ce graphe et montre la timeline, qui se reveille et quand, qui recoit quoi,
quels fichiers seraient touches, quelles autorisations seraient demandees.

**Nouvelle demande** (mode assiste) - un seul appel. Hermes doit lire la phrase
pour proposer une equipe : c'est la decomposition. Ensuite la simulation redevient
purement locale.

Ce que la simulation montre : **la forme du travail**. Ce qu'elle ne montre pas :
le contenu des reponses - il faudrait faire tourner les modeles. Et c'est
suffisant, parce que c'est dans la forme que se voient les deux erreurs qui
coutent cher : un mauvais routage, et un fichier qu'il ne fallait pas toucher.

Etant locale, elle peut etre **obligatoire avant toute execution reelle** comme le
prevoit la regle generale du point 7, sans jamais devenir un peage qu'on
desactive.

Presentation : fenetre volante, 75 % de l'ecran au premier lancement avec flou en
arriere-plan, redimensionnable ensuite, mode Grand ou Compact au choix, et elle
disparait completement apres usage.

### Le flux : SSE, pas WebSocket

Le Hub diffuse deja ses evenements en SSE (`/api/chat/stream`), en production.
Un graphe vivant est un flux descendant : le serveur raconte, l'interface affiche.
Les actions remontantes (valider, annuler, modifier) sont des POST ordinaires.
Le WebSocket ajouterait reconnexion, heartbeat et etat bidirectionnel pour un
gain nul.

### Les couts : un affichage, pas une contrainte

Le suivi analytique existe deja cote utilisateur. Le Hub affiche donc ce qu'il
sait - appels, duree, tokens quand le protocole les rend - sans en faire une regle
de conception. On y ajoute un compteur qui n'existe nulle part ailleurs : **le
nombre de bascules automatiques de modele**, qui est le signal avance de
l'epuisement d'un fournisseur.

### Ce qui peut etre garanti

Le cadre est deterministe, le contenu ne l'est pas - deux appels au meme modele
avec le meme prompt ne rendent pas le meme texte. Sont garantis, et c'est ce que
l'interface doit promettre :

- le **routage** : telle tache va a tel agent, selon une regle lisible ;
- les **permissions** : un agent n'appelle que les outils de ses competences, et
  le protocole ACP le fait deja respecter ;
- les **portes** : rien ne s'execute sans validation, et l'etat de validation est
  ecrit sur le disque ;
- la **tracabilite** : chaque tache garde qui, quand, quel modele, quel resultat.

---

## 3. Repris du document sans modification

- **CEO qui valide** toutes les decisions importantes.
- **Deux modes de creation** : manuel via le graphe, ou assiste par Hermes qui
  propose puis attend ta validation.
- **Regle stricte** : Hermes propose toujours une solution - creer un agent ou
  ajouter une competence - sans jamais depasser 2-3 competences par agent. La
  raison technique renforce l'intuition : moins de competences = prompt plus
  court = routage plus previsible = moins de derive. Hermes accepte `--skills`.
- **Reveil / sommeil** : un reveil = un processus `hermes --profile X`, environ
  deux secondes. Confortable jusqu'a une dizaine d'agents en parallele.
- **Prenom, couleur, icone** : deja modelise dans `types/index.ts` (`Agent`).
- **Langage commun JSON strict** : emetteur, destinataire, type (task, result,
  status, proposal), entrees/sorties, statut, confiance, logs, artifacts,
  metadonnees. Etendu depuis l'enregistrement kanban plutot qu'invente a cote.
- **Jamais de JSON visible** : Hermes parle francais lisible + boutons d'action.
- **Chat a mentions** : `@Hermes`, `@Leo`, `@equipe Veille`, `@pole Veille`. Seuls
  les mentionnes se reveillent.
- **Niveaux de risque** Vert / Orange / Rouge, par competence, par agent, par pole
  entier - branches sur les demandes d'autorisation ACP existantes.
- **Notifications selon la fenetre ou tu te trouves** : evite le double
  signalement.
- **Skills prouvees** : simulation validee + au moins un run reel. Une competence
  n'entre pas en memoire parce qu'elle a semble marcher.
- **Bouton "Valider et mettre en memoire"** apres chaque simulation validee.
- **Regle generale** : toute modification - agent, skill, pole, parametres,
  risque - impose une simulation avant activation.
- **Toute l'UX du point 8** : interrupteurs pour oui/non, menus deroulants pour
  les listes, sliders avec valeur affichee pour les nombres, bouton `+` pour
  ajouter competence ou modele, color picker, selecteur colore pour le risque,
  planification "Tous les [jour] a [heure]" plutot qu'une syntaxe cron.
- **Graphe** : noeuds avec en-tete prenom + icone + pastille de couleur, statut
  visuel en direct, pastilles d'entree/sortie, liaisons animees pendant le
  transit, indicateur de risque porte par la transition.
- **Memoire Obsidian** : markdown + frontmatter YAML, une fiche par competence
  validee, journaux de runs lisibles dans le coffre.

---

## 4. Le langage visuel du graphe

Le point 9.3 du document decrit les subtilites qui font qu'un graphe se lit d'un
coup d'oeil au lieu de se dechiffrer. Elles sont detaillees ici parce qu'elles ne
s'improvisent pas au moment de coder, et parce que chacune doit tenir dans les
**trois themes** du Hub - clair, sombre, et antique (lin et pierre, barre laterale
bleu nuit). Une animation reglee pour le sombre devient invisible sur le lin.

### 4.1 La couleur de l'agent est une variable, pas une classe

Aujourd'hui `Agent.couleur` est un jeton traduit en classes Tailwind. Pour le
graphe, cette couleur doit irriguer la bordure, le halo, les pastilles, l'ombre et
le degrade des liaisons. On la pose une fois a la racine du noeud :

```tsx
<div className="noeud-agent" style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

Tout le reste en derive (`border-color: var(--agent)`,
`box-shadow: 0 4px 20px -6px var(--agent)`, etc.). Un seul endroit a changer pour
recolorer un agent, et les liaisons suivent automatiquement.

Huit jetons, chacun decline pour les trois themes : ambre, emeraude, ciel, violet,
rose, cyan, orange, ardoise. Le critere de choix n'est pas l'esthetique mais le
**contraste sur les trois fonds** - sur le lin de l'antique, un jaune pale
disparait.

### 4.2 Le noeud : cinq etats, une seule lecture

| Etat | Bordure | Fond | Mouvement |
|---|---|---|---|
| Endormi | grise, fine | desature, opacite 55 % | aucun |
| Reveil | passe a `--agent` | remonte | une pulsation breve (300 ms) |
| En reflexion | `--agent` | normal | halo qui respire, 2 s, tres doux |
| En cours | `--agent` | normal | liseré qui tourne autour du cadre |
| Succes | emeraude 1,2 s puis retour | normal | coche qui apparait en fondu |
| Erreur | rouge, maintenue | normal | une secousse de 200 ms, **puis plus rien** |

Le detail qui compte : **l'erreur ne clignote pas en boucle.** Une bordure rouge
fixe se voit aussi bien et ne fatigue pas au bout de trois minutes.

Second detail : **un agent qui s'endort ne disparait pas**, il se desature. La
carte mentale du pole reste entiere, on voit ou il est meme au repos.

En-tete du noeud : pastille de couleur pleine, icone lucide, prenom. Sous
l'en-tete, la jauge de confiance en filet de 2 px, et - pendant l'execution
seulement - un compteur discret de duree qui s'estompe a la fin. Dans un coin, le
numero d'ordre d'execution en tres petit : c'est ce qui permet de lire la
sequence sans suivre les fleches.

**L'ombre portee prend une teinte de la couleur de l'agent**, pas du noir. C'est
imperceptible consciemment et c'est ce qui fait qu'un graphe parait compose plutot
qu'assemble.

### 4.3 Les pastilles d'entree/sortie

Petits cercles sur les bords du noeud (les *handles* React Flow), remplis de
`--agent`. Au repos, 8 px et discrets. Au survol du noeud, ils grossissent a 12 px
en `transform: scale()`. Pendant qu'on tire une liaison, **seules les pastilles
compatibles s'illuminent** - les incompatibles s'estompent. On ne peut pas se
tromper de branchement, et on n'a rien eu a lire pour le savoir.

### 4.4 Les liaisons qui scintillent

C'est la subtilite centrale du document, et la technique compte parce qu'un graphe
en a beaucoup.

**Au repos** : trait de 1,5 px, gris, opacite 0,4.

**Pendant le transit** : le trait passe en `stroke-dasharray` et on anime
`stroke-dashoffset` en CSS. Les tirets defilent le long du chemin - c'est le
scintillement. En CSS pur, donc compose par le GPU, donc tenable sur trente
liaisons simultanees. Une animation pilotee en JavaScript image par image
s'effondrerait bien avant.

**Le degrade** : le trait va de la couleur de l'agent source a celle de l'agent
cible (`<linearGradient>` SVG). On voit d'ou vient la donnee sans suivre la fleche
du regard. C'est la subtilite la plus rentable de toute la liste.

**Une trainee** suit les tirets et s'efface derriere eux, pour donner le sens de
circulation sans ajouter de fleche.

**Le risque de la transition** : petite pastille vert / orange / rouge posee au
milieu du chemin, qui grossit legerement au survol pour livrer son detail.

**Liaison en erreur** : rouge, tirets figes. L'arret du mouvement dit l'echec
avant que la couleur ne soit lue.

### 4.5 Le focus sans le masquage

Quand un chemin s'active, les liaisons non concernees descendent a 0,15 d'opacite
au lieu de disparaitre. L'attention va au bon endroit, la structure reste lisible.

Le graphe **recentre en douceur** sur le noeud actif - une transition de 400 ms
avec easing, jamais un saut. Un saut fait perdre le fil ; un glissement le
conserve.

### 4.6 La fenetre volante de simulation

75 % de l'ecran au premier lancement, `backdrop-blur` sur l'arriere-plan, le
graphe restant visible derriere mais fige. Redimensionnable ensuite a la souris,
mode Grand ou Compact au choix. Elle **disparait completement** apres usage -
aucune trace, aucun panneau residuel.

Le Hub a deja `Modal.tsx` et Tailwind fait le flou : c'est de l'assemblage, pas de
l'invention.

### 4.7 Les deux disciplines a tenir

**`prefers-reduced-motion`.** Le systeme d'exploitation sait si l'utilisateur veut
moins d'animation. Dans ce cas, tout le mouvement est remplace par des etats de
couleur fixes - l'information passe entierement, sans un pixel qui bouge. C'est
une media query, ca coute cinq lignes, et sans elle le produit devient inutilisable
pour une partie des gens.

**Le budget d'animation.** Les animations s'arretent quand l'onglet passe en
arriere-plan, et le scintillement se coupe au-dela d'un certain nombre de liaisons
actives - la couleur suffit alors. Un graphe qui rame donne l'impression que le
systeme rame, meme quand les agents travaillent parfaitement.

### 4.8 Ou ca se branche dans le Hub existant

Le langage visuel n'est pas une couche a part : il se pose sur le systeme deja
en place.

**Les jetons vont dans `src/index.css`**, hors `@layer`, en fin de fichier - la
ou vit deja le theme antique. Trois blocs, un par theme, sur le meme modele que
l'existant :

```css
:root      { --jeton-ambre:#D97706; ... }   /* clair  */
.dark      { --jeton-ambre:#FBBF24; ... }   /* sombre */
.antique   { --jeton-ambre:#A9631A; ... }   /* lin    */
```

Le Hub bascule deja de theme en posant `.dark` / `.antique` a la racine : les
jetons suivent sans une ligne de JavaScript. Les composants ne connaissent que
`var(--jeton-X)`.

**Les composants** rejoignent `src/components/` a cote des existants :
`NoeudAgent.tsx`, `LiaisonAgent.tsx`, `FenetreSimulation.tsx`. Le nœud reutilise
la grammaire de `ProjectCard.tsx` - meme rayon, meme ombre, meme densite - pour
que le graphe paraisse du meme produit que le reste.

**Les etats** sont un attribut `data-etat` pilote par le store zustand depuis les
evenements SSE, pas une cascade de classes conditionnelles en TypeScript. Toute
la logique visuelle reste en CSS, ou elle se relit.

**La maquette de validation** est archivee comme reference : les six etats, les
liaisons a degrade, les trois themes, les deux interrupteurs. C'est elle qui fait
foi en cas de doute pendant la phase 4.

---

## 5. Le parcours, du double-clic au run automatise

Le parcours complet, dans l'ordre. Chaque moment dit ce que tu vois, ce que tu
fais, et ce qui se passe dessous.

### 1. Le double-clic

`Hermes-Hub.vbs` demarre `node server/index.js` sans fenetre noire, le serveur
ecoute sur `127.0.0.1:4317` et le navigateur s'ouvre. Inchange par rapport a
aujourd'hui.

### 2. L'accueil

Le bouton de lancement d'Hermes et la section Projets sont a leur place. **Une
zone nouvelle a gauche : "Automatisations en cours".** Au premier demarrage elle
est vide et le dit : *aucune automatisation pour l'instant*.

### 3. Orchestration

Nouvelle entree dans la barre laterale, sous l'accueil. **C'est le seul lieu de
l'orchestration** - il n'y a pas d'autre ecran qui montre les memes choses
autrement.

Elle ouvre le tableau de bord leger : la liste des poles, leur etat, leur dernier
run, leur prochain declenchement.

**Un panneau deroulant y ouvre les equipes.** On deplie une equipe, et son
organigramme s'affiche : les agents, leurs competences, qui depend de qui. C'est
la vue de repos du graphe - la meme grammaire visuelle que pendant un run, mais
immobile, pour consulter plutot que pour surveiller.

Vide la premiere fois, avec deux portes :

- **Composer une equipe** - ouvre Studio, tu montes le graphe a la main (mode 1) ;
- **Decrire ce que je veux** - te met dans le chat (mode 2).

Le parcours ci-dessous suit le mode 2, qui est celui du quotidien.

### 4. Tu decris ce que tu veux

Dans le chat d'Orchestration, en francais :

> cherche sur les 5 sites les plus tendance les nouveautes IA du moment,
> fais-moi un resume sous forme de tableau, plus un PDF

Hermes passe en reflexion. **Il n'execute rien.** C'est le seul appel modele de
toute cette phase : la decomposition.

### 5. Hermes propose

Une carte apparait dans le fil, en francais, sans une ligne de JSON :

> Je propose un pole **Veille IA** avec cinq agents.
>
> - **Leo** - veille web - *recherche web*, *lecture de page*
> - **Iris** et **Milo** - lecture & extraction - *extraction*, *resume*
> - **Nour** - synthese - *tableau*, *redaction*
> - **Pablo** - mise en page - *export PDF*
>
> Iris et Milo travaillent en parallele pour tenir les cinq sites.
> Aucun agent ne depasse trois competences.

Boutons : **Valider** / **Modifier** / **Refuser**.

Regle du document tenue : Hermes propose toujours quelque chose - creer un agent
ou ajouter une competence - et ne franchit jamais la limite de trois competences.

### 6. Tu valides la proposition

La structure est ecrite sur le disque **en attente**, pas active : profils Hermes
crees avec `--clone-from default` (sans quoi ils n'ont pas de credentials et ne
repondront jamais), chacun avec sa description - c'est elle que le decomposeur
kanban lit pour router les taches - ses competences et son modele.

Rien ne peut encore s'executer.

### 7. La simulation

Elle part toute seule. Fenetre volante, 75 % de l'ecran, flou derriere, le graphe
visible mais fige.

**Aucun appel modele.** La structure est locale, la simulation la rejoue :

- la timeline - qui se reveille, quand, dans quel ordre ;
- ce que chacun recoit et produit ;
- **les fichiers qui seraient touches** : `Projets/veille-ia/tableau.md`,
  `Projets/veille-ia/2026-08-01.pdf` ;
- les autorisations qui seraient demandees : Leo veut sortir sur le web, Pablo
  veut ecrire un fichier ;
- le niveau de risque de chaque etape.

Boutons : **Valider** / **Modifier**. "Modifier" te renvoie au chat ou dans
Studio, et la simulation repart apres.

C'est le moment ou se voient les deux erreurs qui coutent cher : un mauvais
routage, et un fichier qu'il ne fallait pas toucher.

### 8. Tu valides : le pole existe

Le pole devient actif et apparait dans Orchestration. La fenetre volante
disparait completement - aucun panneau residuel.

### 9. Le premier run reel

Bouton **Lancer**, ou dans le chat : `@pole Veille IA lance`.

Studio s'ouvre sur le graphe vivant. Hermes s'allume, puis Leo se reveille - le
nœud sort de sa desaturation, une pulsation, le lisere se met a tourner. La
liaison Hermes → Leo scintille.

Leo finit, sa bordure passe au vert. Deux liaisons partent vers Iris et Milo, qui
s'allument ensemble. Leurs deux traits convergent ensuite vers Nour, chacun
gardant sa couleur d'origine avant de virer vers l'ambre.

### 10. Une autorisation rouge

Pablo veut ecrire le PDF. L'etape est Rouge : **elle s'arrete et attend.**

Une carte dans le fil, une notification - et selon la fenetre ou tu te trouves,
une seule fois, pas deux. Tu vois le chemin exact du fichier avant d'accepter.

Tu acceptes. Pablo repart.

### 11. Le resultat

Le tableau et le PDF sont la, ouvrables d'un clic. Les compteurs affichent la
duree, le nombre d'appels, et le nombre de bascules automatiques de modele s'il y
en a eu.

L'equipe se rendort : les nœuds se desaturent sans disparaitre.

### 12. Valider et mettre en memoire

Le bouton n'apparait que maintenant, parce que la regle est **simulation validee
+ au moins un run reel**. Une competence n'entre pas en memoire parce qu'elle a
semble marcher.

Tu cliques. Une fiche markdown + frontmatter YAML part dans le Coffre, lisible
dans Obsidian. `hermes curator` la reverra plus tard pour consolider ou archiver.

A la prochaine demande du meme genre, Hermes proposera ce pole de lui-meme.

### 13. Automatiser

Bouton **Planifier**. Interface guidee : *Tous les* [lundi] *a* [9h00]. Aucune
syntaxe cron a taper.

Ca ecrit dans **`hermes cron`**, pas dans une horloge du Hub - le Hub ne tourne
que quand tu l'ouvres, une planification qu'il porterait ne partirait jamais.

Le pole apparait desormais dans "Automatisations en cours" sur l'accueil.

### 14. Le lendemain matin

Hub ferme, la tache est partie a 9h00. Tu double-cliques : l'accueil porte une
pastille sur "Automatisations en cours". Tu cliques, le run est la - le graphe
rejouable, le tableau, le PDF.

Si quelque chose a echoue, le nœud fautif est rouge et sa liaison a les tirets
figes. Le message dit lequel et pourquoi.

**La boucle est fermee.** Du double-clic au run automatise et valide.

### Ce qui peut casser, et ou

| Ou | Quoi | Reponse |
|---|---|---|
| Moment 5 | une tache tombe sur `default` faute de profil qui corresponde | **le risque reel** - la qualite du routage tient a la description des profils, donc a la phase 1 |
| Moment 6 | profil cree sans `--clone-from default` | il ne repondra jamais ; le Hub doit le refuser, pas le creer |
| Moment 9 | le fournisseur coupe le modele | la bascule automatique existe deja et fonctionne |
| Moment 9 | agent vision sans repli | un seul gratuit voit les images, voir 1.3 |
| Moment 13 | `hermes cron` ne part pas machine eteinte | c'est vrai de tout planificateur ; a dire dans l'interface |

---

## 6. Le plan par phases

Chaque phase se termine par quelque chose que tu peux ouvrir et juger. Une V2 qui
n'est demontrable qu'a la fin est une V2 qu'on n'ose jamais publier.

### Phase 0 - Socle *(fait)*

Branche `v2`, canal beta, controle automatique CI, bac a sable isole, bascule
automatique de modele verifiee en conditions reelles - interrupteur ouvert comme
ferme.

### Phase 1 - L'equipe existe pour de vrai *(fait)*

Menu **Orchestration** cree dans la barre laterale, avec son tableau de bord et
son panneau deroulant des equipes. Chaque equipe depliee montre son organigramme :
prenom, couleur, icone, competences, etat, et si l'agent est capable de repondre.

*Livrable* : tu ouvres le Hub, tu deplies une equipe, tu vois son organigramme.
*Preuve* : tu crees un profil en ligne de commande, il apparait sans redemarrage.

### Phase 2 - Le chat a mentions *(fait)*

`@Hermes`, `@Leo`, `@pole Veille`. Seuls les agents mentionnes se reveillent.
Liste laterale avec statut endormi/actif et les reglages legers modifiables.

*Livrable* : `@redacteur resume-moi ce fichier` ne reveille que lui.
*Preuve* : un seul processus `hermes --profile redacteur`, et il disparait a la
fin.

### Phase 3 - La simulation locale et la porte *(fait)*

Le format JSON commun est fige. `hermes kanban decompose` transforme la demande
en graphe assignable - **mesure faite, 22,7 s et un seul appel** (section 1) - et
la simulation rejoue ce graphe localement dans la fenetre volante, en lisant
`tasks` et `task_links`. Boutons Valider / Modifier. Rien ne s'execute avant ton
accord.

*Livrable* : ta requete de test - les cinq sites tendance IA, tableau + PDF -
affiche sa simulation avant que rien ne bouge.
*Preuve* : entre l'envoi et ta validation, aucun agent n'a ete lance.

**Phase pivot**, mais courte : le difficile est deja fait par Hermes. Prevoir un
indicateur d'attente - vingt secondes sans signal paraissent une panne.

### Phase 4 - Le graphe vivant (Studio) *(a moitie)*

Route `#/studio` plein ecran, React Flow, **selon le langage visuel de la
section 4** - jetons de couleur, cinq etats de noeud, liaisons a degrade
scintillantes, focus sans masquage. Alimente par le flux SSE existant.
Composition manuelle d'equipe (mode 1).

*Livrable* : tu regardes le travail se faire, et tu composes une equipe a la main.
*Preuve* : une tache qui passe en `running` allume son noeud en moins d'une
seconde.

**Ce qui est fait** : le canevas, les cinq etats, le flux SSE, et davantage que
prevu - on batit le graphe a la souris (tirer une prise ajoute une tache ou pose
une dependance, `Suppr` retire un lien), et le banc d'essai photographie chaque
simulation.

**Ce qui ne l'est pas, et pourquoi la phase reste ouverte.** Le Studio sait
construire un graphe et le regarder tourner. Le parcours autour n'est pas
boucle :

- ~~une tache bloquee est une impasse~~ **- ferme le 03/08/2026.** Le panneau
  du noeud porte « Remettre en circulation » des que la tache est bloquee, et
  le tableau la rend a `ready` par le meme verbe que le reste. C'etait le
  manque le plus grave : bloquer est ce que font toutes les gardes - livrable
  absent, livrable creux, PDF d'erreur - et chaque garde ajoutee rendait
  l'impasse plus frequente ;
- **la simulation a change de place sans que le parcours suive.** Elle vivait
  dans Orchestration ; depuis que la vignette d'un pole mene au Studio, elle
  n'est plus atteignable que de la. Ce n'est pas forcement faux, mais ca n'a
  jamais ete rejoue de bout en bout ;
- **la porte de validation vit dans la fenetre de simulation**, donc « valider »
  se trouve a un endroit qu'on n'ouvre pas forcement avant de vouloir lancer ;
- ~~**on ne cree pas d'agent**~~ **- ferme le 03/08/2026.** « Nouvel agent »
  vit dans Orchestration : identifiant, description obligatoire d'au moins
  vingt caracteres - c'est le seul texte que le decomposeur lit pour router -
  et `--clone-from default` pour qu'il naisse avec la cle du poste. Le client
  compose desormais l'equipe autant que le graphe.

Et le fond du probleme : **le parcours de la section 5 n'a jamais ete joue en
entier a la souris.** Le 03/08/2026, simuler puis valider puis lancer a ete fait
en appelant les routes HTTP directement. Personne n'a verifie que le chemin tient
au clic, du premier ecran jusqu'au livrable.

*Ce qui reste a prouver* : jouer ce parcours en entier, en notant chaque endroit
ou l'on se retrouve coince. C'est la methode qui a paye cette semaine - lancer
pour de vrai a trouve ce qu'aucun test unitaire n'aurait vu.

### Phase 5 - Risque et compteurs *(fait)*

Vert / Orange / Rouge par competence, agent et pole, branches sur les
autorisations ACP. Vert passe seul, Orange demande, Rouge exige ton accord.
Compteurs d'appels, de duree, de bascules. Notifications contextuelles.

*Livrable* : une competence Rouge ne peut pas s'executer sans toi.
*Preuve* : on tente de la lancer, elle attend.

### Phase 6 - La memoire qui apprend *(faite)*

Bouton "Valider et mettre en memoire". Fiche de competence en markdown +
frontmatter dans le Coffre. Branchement de `hermes curator` et
`hermes learning --json` pour le graphe de memoire. Proactivite d'Hermes : il
propose une competence prouvee quand la demande s'y prete.

*Livrable* : une competence prouvee devient reutilisable et visible dans Obsidian.
*Preuve* : elle est proposee d'elle-meme a la demande suivante du meme genre.

### Phase 7 - La planification guidee *(faite)*

"Tous les [jour] a [heure]" ecrivant dans `hermes cron` - **pas dans une horloge
du Hub**, qui ne tourne que quand tu l'ouvres. Zone "Automatisations en cours" a
gauche de l'accueil.

*Livrable* : un pole tourne a l'heure dite, Hub ferme.
*Preuve* : tu le retrouves fait le lendemain matin.

### Phase 8 - Studio complet *(entamee)*

Creation et edition fine d'agents et de poles, sous-graphes, propositions
multi-poles, monitoring detaille.

**Fait le 03/08/2026** : la composition d'equipe - creer, decrire, renommer,
retirer un agent depuis le Hub, avec `default` et le bac a sable intouchables.
Et les **outils MCP de l'equipe**, qui n'etaient pas au plan et se sont reveles
indispensables : mesure faite, les serveurs MCP sont PAR PROFIL, donc un outil
metier branche par un client avec `hermes mcp add` n'atteint aucun des agents
qui executent ses taches - sans que rien ne le signale. L'ecran montre qui
possede quoi et repare d'un bouton.

*Reste* : sous-graphes, propositions multi-poles, monitoring detaille.

### Phase 9 - Le poste tient tout seul *(a ecrire, apres l'usage du Studio)*

Demandee par kuchu le 03/08/2026 sous la forme « API, menu de configuration et
autres parametres », et volontairement laissee ouverte : elle se precisera quand
il aura joue le parcours du Studio, parce que c'est l'usage qui dira ce qui
manque vraiment.

Ce qui est deja certain, dans l'ordre ou je le ferais.

**9.1 - La sauvegarde, et c'est le plus urgent.** `hermes backup` existe deja et
fait exactement le travail : un zip de la configuration, des skills, des
sessions et des donnees, plus un mode `--quick` pour l'etat critique seul. **Le
Hub n'a aucun bouton.** Aujourd'hui, un poste client qui meurt emporte les
profils, la memoire, le tableau et le Coffre - et la personne qu'on appellera,
c'est kuchu. C'est ce qui separe un outil d'une responsabilite, et ca coute un
appel de CLI.

*Livrable* : « Sauvegarder maintenant » dans Configuration, et un fichier qu'on
peut poser sur une cle. Puis la restauration, qui est le vrai sujet - une
sauvegarde qu'on n'a jamais restauree n'est pas une sauvegarde.

**9.2 - Les cles et les modeles depuis le Hub.** C'est le « API » de kuchu, et
le trou est mesure : le champ « Modele par defaut » de Configuration porte
« Informatif - le vrai reglage se fait avec `hermes setup` ». Donc **un client
dont la cle expire doit ouvrir un terminal**, et c'est precisement le moment ou
il appelle a l'aide.

La regle du depot ne change pas : le Hub ne devient pas proprietaire du reglage,
il PILOTE `hermes setup` et `hermes config set`. Lecture sur le disque, ecriture
par la ligne de commande, comme partout ailleurs - sinon deux sources pour un
meme reglage, et elles divergeront.

*Un point a trancher avant d'ecrire une ligne* : saisir une cle d'API dans un
formulaire web, meme sur 127.0.0.1, merite d'etre pese. Le Hub peut la passer a
`hermes` sans jamais l'ecrire lui-meme, mais elle transite par un champ, un POST
et un journal potentiel. A decider avec kuchu, pas seul.

**9.3 - Le menu de configuration remis d'aplomb.** `ConfigView.tsx` depasse les
800 lignes pour six volets, et la memoire a beaucoup grossi le 03/08/2026. Ce
n'est pas un probleme de code mais de lecture : quelqu'un qui cherche un reglage
doit le trouver, pas le parcourir.

**9.4 - Composer une equipe depuis le Hub.** Demande par kuchu le 03/08/2026,
et il a precise que **c'est une requete qu'il fera souvent** : « cree-moi une
equipe de specialistes du Japon ».

Le trou est mesure, pas suppose. Hermes a d'abord repondu « je n'ai pas d'outil
pour creer des agents » - faux - puis a lance cinq `hermes profile create
--clone` dans un terminal. Resultat correct : cinq profils avec description,
`SOUL.md`, et le `USER.md` rempli herite de `default`. Mais le chemin etait
improvise, et kuchu a du autoriser **sept commandes rouges une par une**.

Or `creerAgent` existe deja dans `server/agents.js` : nom valide, description
obligatoire - la seule chose qui route une tache - et les intouchables proteges.
Hermes ne l'utilise pas parce qu'il ne peut pas l'atteindre.

*Le patron existe deja, il suffit de l'appliquer a l'equipe au lieu du plan :*

| Pour les taches (fait) | Pour les agents (9.4) |
|---|---|
| tu decris ce que tu veux | idem |
| Hermes decompose en graphe | Hermes propose une roster |
| tu valides dans la simulation | tu valides la liste |
| le Hub execute | le Hub cree via `creerAgent` |

La partie difficile est deja acquise : la roster proposee le 03/08 etait bonne -
cinq specialistes, perimetres nets, sans chevauchement. **Ce qui manque, c'est la
porte.** Une validation au lieu de sept autorisations, aucune commande terminal,
descriptions garanties.

*A trancher en meme temps* : la consigne « ne conclus pas depuis ta liste
d'outils » (~37 jetons dans `MEMORY.md`, un clic pour la propager). Elle rend
prudent mais ne remplace pas la porte - voir `ADM.md`, « Une consigne ne remplace
pas un chemin qui manque ».

*Ce qui n'entre PAS dans cette phase* : les sous-graphes et les propositions
multi-poles restent a la phase 8. On ne melange pas ce qui construit et ce qui
regle.

---

### Hors phases - le premier contact *(fait le 03/08/2026)*

Ce chantier ne figurait dans aucune phase, et c'est le constat de kuchu qui l'a
ouvert : **la memoire est la configuration qui change le plus l'usage quotidien,
et c'est celle que tout le monde saute.** Lui le premier, par flemme, au debut.

Les neuf questions posees pendant l'installation ont echoue pour une raison
mesurable : dans un terminal, au bout de quarante minutes, on tape Entree pour
en finir. L'auteur de l'installateur a saute ses propres questions.

Ce qui est en place :

- **l'installateur ne pose plus que le prenom.** Deux questions supprimees -
  le profil pre-rempli et le service d'automatisation - parce qu'elles
  proposaient un choix que personne ne pouvait faire en connaissance de cause ;
- **les trois fichiers de memoire partent en gabarits.** `USER.md` pose ses
  sept questions, `MEMORY.md` et `SOUL.md` s'annoncent. Un fichier blanc
  n'apprend rien ;
- **une fenetre au premier lancement** qui MONTRE l'ecart - la meme demande
  avec et sans profil - plutot que d'obliger. Un mur produit « azerty », et une
  reponse bidon est pire que le vide ;
- **un bandeau qui ne s'eteint qu'en repondant.** La case « ne plus afficher »
  eteint la fenetre, jamais le bandeau ;
- **trois profils de regles** dans une bulle, chacun avec son poids en jetons.

*Reste* : rien de bloquant. Le parcours n'a pas ete joue a la souris, comme
celui du Studio.

---

## 7. Les mesures qui commandent le plan

Deux inconnues pouvaient le changer. La premiere est levee.

1. ~~**Ce que `hermes kanban` sait deja decomposer.**~~ **Fait le 31 juillet 2026**
   - la decomposition rend un graphe assignable en 22,7 s. Voir 1.4. La phase 3
   - la decomposition rend un graphe assignable en 22,7 s. Voir la section 1.
   La phase 3 est courte, et la phase 1 gagne en importance : c'est l'existence
   de l'equipe qui rend le routage juste.

2. ~~**Ollama sur ta machine.**~~ **Fait le 31 juillet 2026** - `hermes3:3b`
   repond en 1,8 s a chaud avec un JSON complet, et `gemma4:e2b` sert de repli
   vision. Voir la section 1. Les taches courtes des agents passent en local ;
   le portail reste pour le raisonnement.

**Les deux inconnues sont levees. Le plan tient : la phase 1 peut commencer.**
