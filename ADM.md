# Hermes Hub — ADM

> **Les décisions, et pourquoi.** Cumulatif : on ajoute, on ne réécrit pas.
> Une décision qui change d'avis se barre et se remplace par la nouvelle,
> juste en dessous — la trace de l'erreur vaut autant que la correction.
>
> Ce fichier existe parce que le raisonnement vivait uniquement dans les
> messages de commit. Ils sont durables et datés, mais retrouver *pourquoi*
> une chose est ainsi demandait un `git log -S` et de savoir quoi chercher.
> Ici, on relit.

---

## Ce que ce dépôt n'a pas, et pourquoi

`Hermes-Installer` n'est pas un projet du Hub : c'est le dépôt qui **fabrique**
le Hub, et il est antérieur à la convention des sept fichiers. Ses équivalents
portent d'autres noms :

| Le standard | Ici |
|---|---|
| `BRIEF.md` | `README.md` et l'ouverture de `PLAN-V2.md` |
| `plan.md` | `PLAN-V2.md`, qui porte aussi l'état de chaque phase |
| `done.md` | `git log` — c'est littéralement un historique |
| `REPRISE.md` | **délibérément absent** |

Le `REPRISE.md` absent n'est pas un oubli. La règle de travail le dit : *« sous
git, finir chaque commit par "Ensuite :" **au lieu de** REPRISE.md »*. Et ce
dépôt a déjà connu `REPRISE-AGORA.md` — le lendemain il annonçait un dépôt non
commité alors que tout était poussé. Un mémo tenu à la main pourrit quand la
séance s'arrête mal, c'est-à-dire pile quand on en a besoin.

---

## Le socle technique

### Tauri abandonné, la stack figée *(31/07/2026)*
Le Hub reste une interface web locale servie par un serveur Node. Empaqueter en
application de bureau ajoutait une chaîne de compilation, une signature, et un
canal de mise à jour — pour un produit qui s'ouvre déjà d'un double-clic.

### Le serveur n'a aucune dépendance npm, et doit le rester
`http`, `fs`, `child_process`, `node:sqlite`. Rien d'autre. Les dépendances de
l'interface sont libres, Vite les empaquette. **Pourquoi** : un serveur sans
dépendance ne casse pas à l'installation chez un client, et n'a pas de
vulnérabilité à suivre.

### `dist/` est versionné → aucune commande git automatique
Le poste du client ne construit rien : il reçoit l'interface déjà bâtie. La
contrepartie est absolue — **aucun `add`, `commit` ni `push` sans accord
explicite**, sinon un build non relu partirait dans ce qui est livré.

### La V2 vit sur `v2`, `main` reste figée
`version.json` est l'interrupteur côté clients. Ils restent en v1.0.2 sans rien
voir ; un poste de test bascule par un fichier.

### SSE, pas WebSocket *(31/07/2026)*
Le flux ne va que dans un sens — le serveur raconte, l'interface écoute. Un
WebSocket coûterait une reconnexion à gérer pour un besoin qu'on n'a pas.

### ACP conservé, la « passerelle » écartée *(03/08/2026)*
Un modèle de connexion alternatif a été proposé et évalué. ACP porte déjà les
appels d'outils, la pensée et **les demandes d'autorisation** — c'est ce dernier
point qui a tranché : le laissez-passer vert/orange/rouge s'y branche
directement.

---

## Le partage des rôles

### Lecture sur le disque, écriture par la ligne de commande
Le Hub lit `kanban.db`, les `profile.yaml`, les `config.yaml` **en direct**. Il
n'écrit **que** par le CLI `hermes`. **Pourquoi** : un seul écrivain connaît ses
invariants — l'arborescence d'un profil, ses credentials, son alias, ses skills.
Et lire la base rend tout le graphe d'un coup là où un appel de CLI coûte deux
secondes par tâche.

### Le Hub ne connaît aucun texte livré *(03/08/2026)*
`MEMORY.md`, `USER.md`, `SOUL.md` : l'installateur en est **seul propriétaire**.
Le Hub lit `MEMORY.socle.md` pour construire ses profils et n'apporte que ses
suppléments. **Pourquoi** : deux sources pour un même texte finissent par
diverger, et personne ne s'en aperçoit avant un client.

### `HERMES_HOME` d'abord, `LOCALAPPDATA` ensuite *(03/08/2026)*
Mesuré : avec `LOCALAPPDATA` détourné mais `HERMES_HOME` absent, le CLI et le
Hub affichaient **deux équipes différentes**, et le décomposeur routait vers des
agents que l'interface ne montrait pas. Une divergence qui ne se manifeste qu'en
essai finit par se manifester chez un client.

---

## L'équipe livrée

### Trois rôles génériques, aucun profil propriétaire *(03/08/2026)*
`a-analyste`, `b-redacteur`, `c-metteur`. Un poste neuf ne reçoit ni Sofia, ni
maquettiste, ni aucune donnée de session.

### Identifiant parlant pour la machine, nom neutre pour l'œil
Mesuré le 03/08/2026, même demande décomposée deux fois : avec `redacteur` et
`maquettiste`, les deux tâches sont parties au bon spécialiste ; avec `a`, `b`,
`c`, une seule sur deux, et `b` n'a jamais servi. **C'est l'identifiant que le
décomposeur choisit, et une lettre ne lui dit rien.** D'où la dissociation :
`b-redacteur` dans le fichier, « B (Beatrice) » à l'écran.

### La lettre DANS l'identifiant
`redacteur` tout court entrait en collision avec un profil du même nom déjà
présent sur un poste : `hermes profile create` échouait en silence, et le profil
de l'utilisateur s'affichait « B (Beatrice) ». **Un identifiant qu'on pose chez
les autres doit être à nous.**

### La description est le seul texte qui travaille
C'est elle — et rien d'autre — que le décomposeur lit pour router une tâche. Un
agent sans description n'est pas cassé : il est **oisif**, figure dans
l'organigramme et ne reçoit jamais rien, sans que rien ne l'explique. D'où son
caractère obligatoire à la création, alors que le CLI l'accepte vide.

### Les serveurs MCP sont par profil *(mesuré le 03/08/2026)*
Chaque profil est un home complet avec son `config.yaml`. `hermes mcp add` ne
branche l'outil que sur le profil courant — donc un outil métier branché au
terminal n'atteint **aucun** des agents qui exécutent les tâches, et rien ne le
signale. Le Hub le répare : Orchestration → Agents, « Donner à toute l'équipe ».

---

## La mémoire et le premier contact

### Le point de reprise est la ligne `Ensuite :`, jamais un fichier
Chaque commit finit par les deux prochains coups, une phrase chacun. Le journal
raconte ce qui a été *fait* ; cette ligne est le seul endroit où vit ce qui était
*prévu*. Voir plus haut pour ce que `REPRISE-AGORA.md` a coûté.

### Un garde-fou n'est pas un goût *(03/08/2026)*
Le socle — huit règles — se pose **toujours**, sans question. Les habitudes
d'atelier logiciel se proposent. Auparavant une seule question gouvernait les
deux, et un client répondant « non » démarrait **sans aucune règle**.

### Une procédure n'est pas un comportement, et ça décide d'où elle vit
Un comportement doit être en contexte **toujours** : on ne cherche pas « ne pas
inventer » au moment où l'on invente. Une procédure ne sert que le jour où on
l'exécute → elle part dans un fichier qu'on lit à la demande, avec un pointeur
qui dit **quand** aller le lire. Un pointeur sans déclencheur ne se suit pas.

### Montrer plutôt qu'obliger *(03/08/2026)*
La configuration de la mémoire est celle que tout le monde saute. Un mur ne
produit pas des réponses, il produit « azerty » — et **une réponse bidon est pire
que le vide** : le vide se voit et se corrige, le faux ne se relit jamais. D'où
la fenêtre qui montre l'écart, et le bandeau qui ne s'éteint qu'en répondant.

### Ne plus demander ne veut pas dire ne rien dire
Le service d'automatisation est installé d'office — mais **annoncé**, avec la
commande pour le retirer. Un service qui démarre seul et dont personne n'a parlé
fait passer un produit pour intrusif.

### Une consigne ne remplace pas un chemin qui manque *(03/08/2026)*
Hermès a écrit « je n'ai pas d'outil pour créer des agents », puis a lancé cinq
`hermes profile create --clone` avec succès. Il n'a pas menti : il a répondu
depuis sa liste d'outils MCP sans regarder qu'il avait un terminal.

La correction réflexe est une règle de plus dans `MEMORY.md`. Elle est bon
marché — une ligne, ~37 jetons — et **elle ne suffira pas** : « compose-moi une
équipe » n'a aucune porte dans le Hub, alors `creerAgent` existe côté serveur
avec nom validé et description obligatoire. Hermès improvise parce qu'il ne peut
pas l'atteindre, et l'utilisateur paie sept autorisations rouges pour un geste
que le Hub sait faire proprement.

**Quand un agent invente un chemin, regarder d'abord si le bon manquait.** La
consigne rend prudent ; seule la porte rend inutile d'improviser.

Formulation retenue pour la consigne, et sa portée compte : *« ne conclus pas
depuis ta liste d'outils : avant d'annoncer que tu n'as pas de quoi faire une
chose, regarde ce dont tu disposes vraiment. »* Le piège évité est « avant de
dire que tu ne peux pas, essaie » — qui autoriserait à **tenter** l'action, y
compris effacer ou envoyer. On vérifie ce qu'on a, on ne tente pas ce qu'on veut
faire.

---

## L'accueil

### L'accueil EST la conversation *(04/08/2026)*
Demandé par kuchu : « Bonjour <prénom> » au milieu, et au premier message tout
s'efface. L'ancien écran récapitulait — deux cartes, quatre compteurs, projets
récents — alors que **ce qu'on veut en ouvrant le Hub, c'est demander quelque
chose.** Un écran qui commence par récapituler oblige à choisir une porte avant
d'avoir pu formuler sa demande.

### Le même fil aux deux endroits, jamais deux *(04/08/2026)*
L'accueil n'a PAS sa propre conversation : c'est celle d'Orchestration, même
composant, même fil, même historique, ouvert par les props `accueil` /
`accueilDessous`. **Deux fils pour un même interlocuteur auraient divergé sans
que personne le remarque avant d'en avoir besoin.** Même raison pour le champ,
qui ne se recopie pas pour changer de place : il reste où il est écrit, ce sont
les deux espaces qui l'encadrent qui le poussent au milieu. Un composant qui se
duplique pour changer de position finit par diverger de lui-même — une
correction posée sur un exemplaire, oubliée sur l'autre.

### On bascule à l'envoi, pas au retour du serveur *(04/08/2026)*
Le message n'entre dans le fil que lorsque le serveur l'inscrit et le renvoie.
En s'en remettant au fil, le salut serait resté affiché pendant l'aller-retour :
il aurait vacillé au lieu de s'effacer net. **Un état d'interface se règle sur
le geste de l'utilisateur, pas sur l'accusé de réception.**

### Une destination ou un geste, et ça décide de l'endroit *(04/08/2026)*
Le lanceur du terminal a occupé une grande carte, puis une carte compacte, avant
de finir dans la barre de menu. Le bon argument n'était pas la taille — kuchu
demandait « plus discret, plus petit » — mais que **ce n'est pas une
destination, c'est un geste**, et un geste qu'on veut depuis n'importe quel
écran. En carte sur l'accueil il devenait inatteignable dès qu'on avait commencé
à parler, c'est-à-dire au moment précis où une ligne de commande sert. Il porte
donc le traitement du bouton Rechercher, qui n'est pas une navigation non plus :
ni liseré de sélection, ni état actif — il n'y a pas d'écran où l'on « est ».

Corollaire tiré le même jour : Clean Agent est descendu dans Configuration >
Développement. C'est un banc d'essai, et une carte à égalité avec la
conversation lui donnait un rang qu'il n'a pas dans l'usage courant.

### Ce qui survit à l'effacement, et pourquoi c'est une seule chose *(04/08/2026)*
Une automatisation tombée reste visible une fois le salut parti — passerelle
absente, dernière exécution en échec, rien d'autre. **Une tâche qui part chaque
matin et rate en silence ne se découvre autrement qu'en allant la chercher, or
on ne cherche pas ce qu'on croit acquis.** Tout le reste revient en repartant
d'une conversation neuve.

---

## Les pièges appris à la dure

### Rediriger la sortie d'une commande ne la rend pas muette, ça la rend aveugle
`>nul 2>&1` détourne stdout et stderr, **jamais stdin**. Rencontré trois fois le
03/08/2026 : `hermes mcp add` prend EOF pour une annulation *en sortant par 0*,
et `hermes gateway install` a figé une installation client sur une question que
personne ne voyait. Toute commande interactive appelée depuis un script doit
porter ses réponses sur sa ligne.

### On joue les blocs, on ne les relit pas
Le rendu d'un `echo` batch ne se devine pas. `echo "^<nom^>"` a sorti des carets
littéraux — entre guillemets, `^` n'échappe rien. Chaque bloc de l'installateur
est désormais **exécuté** avant commit.

### Lancer pour de vrai trouve ce qu'aucun test ne voit
Le repêchage restait muet parce qu'un fichier homonyme d'une exécution
précédente traînait dans le pôle. Aucun test unitaire ne l'aurait vu : il a fallu
une borne de fraîcheur, trouvée en lançant un vrai pôle.

### Un test qui passe par le verbe finit par toucher le poste
Éprouver la validation des noms via `creerAgent` a posé un vrai profil sur la
machine, qu'il a fallu effacer à la main. Les validations sont exportées et
testées seules — aucun test ne va jusqu'à l'appel.

### Une lecture qui réussit ne prouve rien d'une action qui écrit *(03/08/2026)*
La route qui LIT le livrable d'un pôle a été éprouvée sur les vraies données —
dix fichiers rendus, tout juste. J'en ai conclu que le bouton « Ouvrir le
dossier » marchait. Il ne pouvait pas : un `await` manquait dans la route
voisine, `.poles` valait `undefined`, et `.find` jetait à chaque clic. Le bon
code était écrit trois minutes plus tôt, dix-huit lignes plus bas.

**Prouver que la donnée existe n'est pas prouver que le geste aboutit.** Chaque
chemin de code se parcourt jusqu'au bout, y compris celui qui n'a pas l'air de
mériter un essai.

### Un `.catch(() => null)` transforme une panne en « le bouton ne marche pas »
Trente avaleurs d'erreur silencieux dans dix fichiers, onze pour le seul Studio.
Le serveur refusait, il ne se passait RIEN — ni action, ni message, ni trace.
Il n'y a qu'une lecture possible pour qui regarde l'écran, et c'est celle qui a
été faite. Corrigé le soir même ; **le correctif a attrapé le bug de son auteur
dans l'heure** — l'`await` manquant ci-dessus se serait perdu en silence.
