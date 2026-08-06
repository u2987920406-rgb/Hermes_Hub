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

### Les règles de commit ne descendent pas aux exécutants *(06/08/2026)*
`MEMORY.md` portait les règles de git — `Ensuite :`, `ADM.md` cumulatif, pas de
`REPRISE.md`. Elles sont justes, et elles ne concernent **que l'orchestrateur** :
un rédacteur qui exécute une tâche du tableau ne commite pas. Propagées telles
quelles, elles coûtaient ~185 jetons à chaque démarrage de chacun des onze
agents, pour une consigne qu'aucun n'appliquera jamais.

**On ne pouvait pas les retirer du fichier : `default` *est* Hermès.** Son
`MEMORY.md` est à la fois sa mémoire et la source de celle des autres. Ce n'est
donc pas le fichier qu'on a changé, **c'est la copie** — une marque
`<!-- hermes-seul -->` sur un titre, et `propager()` laisse la section derrière.

Trois conséquences, chacune payée par un raisonnement :

- la marque porte sur une **section**, pas sur une ligne : retenir des puces une
  par une serait fragile, déplacer une ligne suffirait à la faire partir ;
- `etatPropagation()` compare à **ce qui sera copié**, pas au fichier d'Hermès.
  Comparer au brut afficherait « en retard » à jamais, et un compteur qui ne
  retombe jamais à zéro est un compteur qu'on cesse de lire ;
- l'écran **dit** qu'une section est retenue. « Envoyer à toute l'équipe »
  mentirait sinon, et quelqu'un croirait avoir diffusé une consigne que personne
  n'a reçue.

### CRLF : cinq tests verts sur un fichier que rien ne coupait *(06/08/2026)*
La coupe ci-dessus a retenu **un seul caractère** au lieu d'une section, sur le
vrai `MEMORY.md`. En JavaScript **`.` ne franchit pas un `\r`** — c'est un
terminateur de ligne — et `$` sans le drapeau `m` exige la fin de la chaîne :
`/^(#{1,6})\s+(.*)$/` ne reconnaît **aucun titre** dans un fichier CRLF.

Les cinq tests étaient verts : ils sont écrits en `\n` pur. **Sur Windows, ne
tester qu'en `\n` revient à ne tester aucun fichier réel.** Tout découpage de
lignes se fait sur `\r?\n`, et un cas CRLF accompagne désormais la règle.

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

### On relit là où l'on écrit *(06/08/2026)*
L'historique quitte Orchestration pour l'accueil. Il était **du côté où l'on
n'écrit plus** : on écrit à l'accueil, on relisait ailleurs — et *une mémoire
rangée loin de l'endroit où elle se fabrique ne se consulte pas.* Il devient un
bouton « Conversations », dans la ligne « En direct » une fois qu'on a parlé, et
rangé avec Projets et Coffre au salut. **Un seul bouton, un seul volet, deux
moments** : le moment change de place, pas le geste — un composant recopié aux
deux endroits aurait divergé au premier réglage.

Il ne reste pas en double dans Orchestration. C'est la règle qui avait déjà fait
partir la bande « automatisation tombée » de l'accueil : **deux surfaces qui
disent la même chose finissent par se contredire.**

### Un bouton dit où il mène, et seulement là où il y mène *(06/08/2026)*
Le seul chemin vers l'accueil s'appelait « Nouvelle ». Ça promet une
conversation neuve, pas un retour — rien ne laissait deviner qu'on y retrouve
ses raccourcis. **C'est le genre de friction dont on ne se plaint jamais : on ne
dit pas « je n'ai pas trouvé », on croit que ça n'existe pas.** Il dit
maintenant « Revenir à l'accueil » — mais **sur l'accueil seulement.** Dans le
volet Conversation d'Orchestration, qui n'a pas de salut, « Nouvelle » reste
exact. Un libellé unique aurait menti d'un côté ou de l'autre.

### Un geste ajouté se suit jusqu'à son arrivée *(06/08/2026)*
`ADM.md` disait déjà qu'*une consigne ne remplace pas un chemin qui manque*.
D'où le bouton « Ouvrir dans le Studio » posé sur le message d'un découpage
raté. **Il menait à un écran vide** — une demande non découpée n'est pas un
pôle, elle vit dans `isolees`, et le Studio répondait « Aucun scénario ouvert ».
Trouvé en cliquant, pas en écrivant. **Offrir un chemin qui ne mène nulle part
est pire que décrire un chemin qu'on laisse chercher** : le premier ment, le
second se contente d'être incomplet. Le Studio fait désormais de cette demande
un scénario d'une seule tâche, ce qu'elle est.

### Un couplage doit sortir la chose de la pénombre *(06/08/2026)*
Survoler une ligne du plan allume son nœud (C3). Premier essai : la classe était
posée, `transform` valait bien `scale(1.04)`, **et on ne voyait rien.** Une
tâche qui attend son tour est à 55 % d'opacité et désaturée — le surlignage se
battait contre le retrait et perdait. Il lève donc aussi l'opacité et le filtre.
Ce qu'il ne fait toujours pas : changer la couleur ou l'état. **Survoler n'est
pas un événement du scénario**, et un nœud qui prendrait l'air « en cours » sous
le curseur mentirait sur ce qui se passe.

### Un bouton qui ne garde plus de porte s'enlève *(06/08/2026)*
« Valider la simulation » certifiait qu'on avait vu le plan, à l'époque où le
plan était une fenêtre qu'on ouvrait. Depuis qu'il est un **panneau permanent**,
il est sous les yeux : le regarder EST l'ouvrir, et le bouton ne certifie plus
rien. Il disparaît, et le refus côté serveur avec lui — `lancer()` **date
l'accord** au lieu de le réclamer. **La règle qui compte est conservée
entière** : rien ne part sans un clic explicite, après avoir eu la forme du
travail sous les yeux. Deux gestes, pas trois — valider le plan dans le chat,
lancer dans le Studio.

*Et l'ordre comptait :* F11 a dû attendre que le panneau plan existe. Une
friction dont l'argument repose sur une pièce non encore posée ne se règle pas
avant elle.

### Un seul bandeau de configuration, et le silence passe devant l'imprécision *(06/08/2026)*
Le bandeau de session expirée partage l'emplacement du bandeau de profil, et il
**passe devant** quand les deux sont vrais. La raison n'est pas l'ancienneté ni
la gravité en général, c'est le symptôme : un profil non choisi fait répondre
Hermès **à côté** de ce qu'on voulait ; une session expirée fait qu'il **ne
répond pas**. Devant un écran muet, on ne cherche pas — on referme.

Les empiler aurait fait deux affirmations sur le même sujet, la configuration :
exactement ce que la grammaire refuse depuis « une seule ligne d'alerte, jamais
deux ». Un emplacement, une phrase, un geste.

### Ce qu'on retient et ce qu'on constate ne vivent pas dans le même fichier *(06/08/2026)*
La route `/accueil` rend deux choses de nature différente : `lireAccueil()`, deux
drapeaux **écrits sur le disque** par le Hub, et `lireSessionFournisseur()`,
**relu dans l'`auth.json` d'Hermès à chaque appel**. Elles voyagent ensemble
parce qu'elles commandent la même surface — deux appels pour un bandeau feraient
deux moments où il peut se contredire.

Mais elles ne sont **pas** rangées dans le même fichier, et c'est le point :
`noterAccueil` écrit ce qu'il reçoit. Une valeur constatée qui passerait par là
serait figée comme si elle était acquise, et le Hub annoncerait une session
expirée le jour où elle est réparée. *Ce qu'on retient s'écrit ; ce qu'on
constate se relit.*

### Un message d'erreur ne contient ni pronom de rappel ni nom ambigu *(06/08/2026)*
Deux fautes vues **à l'écran seulement**, dans un bandeau relu trois fois :

*« La session nous a expiré »* — `nous` est le nom du fournisseur, et il se lit
comme le pronom. Le nom propre est sorti de la phrase et posé dans un `code`, où
il ne peut plus être pris pour un mot de la langue.

*« Tes agents ne répondront pas tant qu'elle ne l'est pas »* — le seul antécédent
disponible était « expirée ». La phrase disait donc l'inverse exact de ce qu'elle
voulait dire. Un pronom de rappel économise trois mots et coûte une lecture ;
dans un message qu'on lit en panique, on renomme la chose.

*La règle générale :* **une phrase d'erreur se relit à voix haute, à l'écran, pas
dans l'éditeur.** Les deux fautes étaient invisibles dans le code — l'une parce
que la variable s'appelait `session.fournisseur`, l'autre parce que l'antécédent
qu'on avait en tête n'était pas celui que la phrase offrait.

### Un `try/catch` ne rattrape pas une panne annoncée plus tard *(06/08/2026)*
Le Hub est mort en plein run — `write EPIPE`, *unhandled 'error' event* — et
avec lui les trois agents qui travaillaient. La cause : `PontAcp` écrit ses
trames dans `child.stdin`, et **ce tube n'avait pas d'écouteur `'error'`**.
Celui posé sur le *processus* ne couvre que le spawn.

**Ce qui rend le cas instructif, c'est que le code avait l'air protégé.**
`#envoyer` vérifiait que l'enfant existait, `#repondre` entourait l'appel d'un
`try/catch`. Deux gardes visibles, zéro garde réelle : **`write()` sur un tube
rompu ne lève pas.** Il rend `false` et signale la panne au tour suivant de la
boucle, en émettant `'error'` sur le flux. Un `catch` synchrone ne peut rien
attraper d'asynchrone, et un flux qui émet `'error'` sans écouteur tue le
processus — c'est la règle de Node, pas un cas limite.

*La règle à retenir, et elle dépasse ce fichier :* **un garde-fou se juge sur le
mode de défaillance, pas sur sa forme.** Devant un `try/catch`, la question
n'est pas « y a-t-il une garde » mais « la panne arrive-t-elle par où la garde
regarde ». Ici elle arrivait par un autre chemin, et le `catch` servait surtout
à rassurer celui qui relisait.

*Et une conséquence de portée :* un tube rompu appartient à **un** agent ; le
processus qui meurt les sert **tous**. Toute panne non rattrapée dans le pont
ACP a ce facteur d'amplification, et c'est ce qui la rend grave chez un client.

### Un raccourci qui saute la surface saute ce que la surface fait *(06/08/2026)*
F19 — la phrase « tu peux continuer à écrire pendant ce temps » — était écrite
depuis la veille et n'avait jamais été vue. Pour la faire paraître, la demande a
été postée directement sur `/api/chat/message`, ce qui est plus rapide que de
taper dans le champ. **La carte n'est jamais venue, et rien n'a échoué :** le
verdict « est-ce un chantier ? » part de `mettreDeCote()`, appelé **à l'envoi
depuis l'interface**. Sans lui, `usePlan` n'a rien en attente, donc rien à
proposer. Hermès répondait, déléguait, le fil se remplissait — tout marchait
sauf ce qu'on regardait.

**Un banc d'essai qui court-circuite l'interface n'éprouve pas le produit.** La
règle vaut au-delà d'ici : dès qu'un raccourci contourne une surface, il faut se
demander ce que cette surface faisait en plus de transmettre. Souvent, c'est
exactement la chose qu'on cherchait à voir.

### Un seul bloc, deux natures : il annonce avant, il constate après *(06/08/2026)*
Le « Résultat attendu » du panneau plan devient « Annoncé / rendu » quand le
scénario a fini. Ce n'est pas deux surfaces qui se remplacent, c'est **la même
part du plan à deux moments** — et c'est ce qui fait qu'on la retrouve où on
l'avait laissée. Trois conditions pour basculer, et chacune évite un mensonge
précis : le scénario a tourné *(sinon un plan validé mais jamais lancé
afficherait un bilan tout rouge, c'est-à-dire un échec là où il n'y a qu'une
attente)*, rien n'est en cours *(sinon on poserait « pas rendu » sur un fichier
qui s'écrit à la seconde même)*, et quelque chose a été **annoncé** *(sinon il
n'y a pas de moitié gauche, et on n'invente pas de livrable pour avoir l'air
complet — une confrontation fausse est pire qu'une confrontation absente, parce
qu'on croirait pouvoir juger)*.

### On montre les deux noms, on ne les apparie jamais *(06/08/2026)*
Un fichier rendu que le plan n'annonçait pas part dans « en plus ». Il n'est
**jamais** rapproché d'un livrable manquant, même quand la ressemblance saute
aux yeux — `veille-2026-08-04.pdf` face à `veille.pdf` promis. Le dépôt avait
déjà tranché ce cas sur les noms d'agents : *« rapprocher deux chaînes est une
devinette, et une devinette qui se trompe donne le travail à quelqu'un d'autre
sans que ça se voie. »* Ici elle ferait pire — elle ferait passer un livrable
manquant pour un livrable tenu, **exactement ce que ce bilan existe pour
empêcher**. Les deux lignes sous les yeux, l'œil tranche en une seconde ; la
machine, elle, se tairait sur son doute.

*La seule normalisation admise est celle qui ne suppose rien :* le nom nu, en
minuscules. Le plan annonce parfois un chemin, le disque rend un nom, et
Windows ne distingue pas la casse — ce sont des faits, pas des paris.

### Ce qui revient à Hermès par nature n'est pas un manque *(06/08/2026)*
C4/F17 signale les étapes qui tombent sur l'agent par défaut. **La demande en
tête de pôle en est toujours une**, et elle ne compte pas : c'est Hermès qui a
découpé, il figure en tête de tout scénario. La compter ferait crier au manque
sur **tous** les scénarios, tout le temps — et une alerte permanente ne s'alerte
plus, c'est la même règle que « si tout est plein, plus rien ne ressort ».

*Vérifié par un contrôle négatif, et c'est ce qui le prouve :* un scénario dont
seule la tête revient à Hermès n'affiche aucun bloc. Sans ce contrôle, on aurait
tenu pour juste un bloc qui s'affiche toujours.

### Le libellé change, le formulaire jamais *(06/08/2026)*
« Créer un spécialiste » ouvre **la fiche de création d'agent de l'équipe**, pas
une seconde faite pour l'occasion. Seul le libellé du bouton dit d'où l'on
vient. Deux fiches pour un seul geste, ce serait deux endroits à corriger le
jour où la règle de description change — et c'est cette règle qui décide si un
agent reçoit du travail ou reste oisif.

*Prix assumé, vu à l'écran :* dans les 256 px du panneau plan, la fiche est
serrée — l'exemple d'identifiant se coupe. Elle reste utilisable ; l'élargir
demanderait soit un panneau plus large, soit une fenêtre, et les deux sont des
décisions de dessin, pas un réglage.

### Les deux orphelins de `VISION-STUDIO.md` sont refusés comme pièces, gardés comme besoins *(06/08/2026)*
Sur onze décisions de ce document, une seule avait traversé intacte la
confrontation du 4 août. Deux n'étaient pas contredites — elles avaient perdu ce
qui les portait, et le §6 du plan les gardait *« à trancher au chantier 4 »*.
Tranchées ici, et **dans le même sens : le besoin est réel, la pièce séparée ne
l'est pas.**

**Le mode réflexion du Studio** — « le graphe montre où ça a bloqué, le journal
où ça a dérapé ». Son argument reposait sur une **paire**, et il en manque une
moitié : le journal de livraisons n'a plus de colonne depuis la refonte. Reste
qu'un mode est **une seconde lecture du même écran**, et la grammaire n'en a pas
la place : une chose permanente se replie, une chose convoquée se ferme — un
mode ne fait ni l'un ni l'autre, il se *retient*, et on oublie dans lequel on
est. Le besoin, lui, est déjà servi à deux endroits qui existent : le graphe
porte `data-etat` par nœud, donc *où ça a bloqué* se voit sans rien allumer ; et
le bilan annoncé / rendu *(C8)* dit ce qui manque à la fin. **Rien à écrire.**

**La relecture par l'orchestrateur** — « il propose, il ne modifie jamais, chaque
remarque est un bouton à accepter ». Le principe reste juste ; son bouton est
parti avec F11. Il n'a pas besoin d'en retrouver un : **C4 / F17 en est
exactement la forme** — le plan remarque qu'une étape tombe sur l'agent par
défaut, et propose de créer un spécialiste. Une remarque, un bouton, aucune
modification d'office. En faire une pièce à part donnerait deux endroits où
l'orchestrateur parle, pour une seule voix.

*Ce qui vaut au-delà d'ici :* **une décision orpheline se juge sur son besoin,
pas sur sa forme.** Les deux formes proposées étaient mortes ; les deux besoins
étaient vivants, et déjà logés ailleurs. C'est le cas ordinaire — et c'est
pourquoi on remonte les orphelins au lieu de les laisser dans le document
périmé, où ils auraient été relus un jour comme des acquis.

### On bascule à l'envoi, pas au retour du serveur *(04/08/2026)*
Le message n'entre dans le fil que lorsque le serveur l'inscrit et le renvoie.
En s'en remettant au fil, le salut serait resté affiché pendant l'aller-retour :
il aurait vacillé au lieu de s'effacer net. **Un état d'interface se règle sur
le geste de l'utilisateur, pas sur l'accusé de réception.**

### Une chose permanente se replie, une chose convoquée se ferme *(05/08/2026)*
La règle qui départage `PanelLeftClose` de `X`, et elle suffit. Le plan est
permanent dans le Studio → il se replie, par le même bouton, au même endroit,
et il retrouve son état à la session suivante. Les réglages d'un nœud n'existent
que parce qu'on a cliqué le nœud → ils se ferment, par `X` ou par Échap. **Un
`X` sur une chose permanente est un mensonge** : elle reviendrait toute seule au
clic suivant.

Trois conséquences qui vivent dans le code : `useEchap` est le seul endroit qui
écoute Échap, `useRepli` le seul qui retient un repli, et l'icône montre
toujours **la destination, pas l'état courant** — comme le bouton de thème, et
pour la même raison.

### Le hamburger n'est pas un geste de petit écran *(05/08/2026)*
C'est le geste de « pas de barre latérale ». Il ne vivait qu'en `lg:hidden`
parce que c'était la seule situation où elle disparaissait ; le plein écran en
crée une deuxième. Sans lui, agrandir revient à se couper de la navigation au
moment où l'on regarde le plus attentivement.

### « Scénario » à l'écran, `pole` dans le code *(05/08/2026)*
« Pôle » est un mot du dedans *(F6)* : il ne dit rien à qui ouvre le Hub. À
l'écran on dit **scénario**, partout. Dans le code, `pole` reste l'identifiant —
c'est le mot du tableau d'Hermès, et le renommer traverserait le serveur, la
ligne de commande et le disque pour un gain nul. Le vocabulaire coûte trois fois
plus cher après : c'est pour ça qu'il est traité au chantier 2 et pas au 5.

Et le Studio cesse d'être surnommé « l'atelier », y compris dans les
commentaires : **« Atelier » devient le nom d'un mode** de la conversation, en
face de « Discussion ». Deux choses qui portent le même mot finissent par se
confondre dans une phrase.

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

### ~~Ce qui survit à l'effacement, et pourquoi c'est une seule chose~~ *(04/08/2026)*
~~Une automatisation tombée reste visible une fois le salut parti — passerelle
absente, dernière exécution en échec, rien d'autre. **Une tâche qui part chaque
matin et rate en silence ne se découvre autrement qu'en allant la chercher, or
on ne cherche pas ce qu'on croit acquis.** Tout le reste revient en repartant
d'une conversation neuve.~~

**Remplacée par « Une seule ligne d'alerte, jamais deux » ci-dessous
*(05/08/2026)*.** Le besoin était juste, l'endroit ne l'était pas : la bande ne
vivait que sur l'accueil, donc pas là où l'on est le reste du temps.

### Une seule ligne d'alerte, jamais deux *(05/08/2026)*
Trois natures — une autorisation attend, une automatisation est tombée, un
scénario a fini — et **une seule ligne pour les trois**, au même endroit sur
tous les écrans, Studio compris. Elle montre la plus urgente en clair et compte
le reste ; le volet, convoqué au clic, liste tout et mène chaque entrée à son
endroit.

L'ordre d'urgence n'est pas cosmétique : une autorisation bloque quelqu'un
maintenant, une automatisation tombée a déjà échoué en silence, un scénario fini
peut attendre. Empiler trois bandes les aurait rendues égales, et l'écran serait
redevenu un tableau de bord — exactement ce que l'accueil a cessé d'être.

**Elle ne remplace pas les notifications volantes.** Une notification raconte ce
que *je viens de faire* ; cette ligne annonce ce qui *m'attend*. Les confondre
ferait disparaître au bout de trois secondes une demande qui bloque un agent
pour la nuit.

### Un scénario fini laisse une trace, parce que l'événement ne repasse pas *(05/08/2026)*
`chantier-fin` passe une fois dans le flux, et rien sur le disque ne dit ensuite
« c'était fini ». Qui n'avait pas le Hub sous les yeux à cet instant-là ne le
saurait jamais. C'est **le seul endroit du Hub qui retient un événement au lieu
de réinterroger le serveur**, et c'est assumé : il n'y a rien à interroger. La
trace vit dans `localStorage` — « j'ai vu » est une affaire de poste et de
personne, pas du workspace partagé avec Hermès.

---

## Les gardes du code

### Le cliquet, plutôt que le grand rangement *(05/08/2026)*
`design/tailles.json` retient la taille de chaque fichier et `npm run design`
refuse qu'elle augmente. Il n'exige **aucun** nettoyage : ce qui est déjà gros
le reste, et chaque fois qu'un fichier maigrit sa marque descend avec lui, sans
jamais remonter. On n'a donc pas à décider d'un chantier — le code ne peut plus
qu'aller dans le bon sens, au rythme où on le touche.

Deux détails qui font la différence entre un garde-fou et un compteur : la
marque d'un fichier qui a grossi **n'est pas** mise à jour, sinon le second
passage avalerait en silence ce que le premier a refusé ; et relever une marque
à la main est permis, mais se dit dans le commit.

*Éprouvé le jour même :* le cliquet a mordu cinq fois sur le chantier qui
l'introduisait. Deux fois il avait raison et le code a été découpé
(`store/alertes.ts`, `AlerteEssai.tsx`) ; trois fois la croissance était de la
prose et les marques ont été relevées.

### La dette d'exports morts est écrite, pas tolérée en silence *(05/08/2026)*
Le détecteur d'exports que personne n'importe trouve treize entrées le jour où
il est écrit — dont neuf dans `types/index.ts`, le fichier qu'on a justement
promis de découper domaine par domaine. Exiger leur disparition d'un coup aurait
ouvert un chantier que personne n'avait décidé. `design/exports-morts.json`
porte donc cette dette, **une raison par entrée** ; un export mort de plus fait
échouer la vérification.

*Il a servi tout de suite :* trois exports écrits « au cas où » dans le même
chantier ont été signalés le jour de leur naissance, et retirés. C'est
exactement ce qu'on lui demandait — attraper la mort à la naissance plutôt qu'au
troisième mois.

---

## Les pièges appris à la dure

### Une porte ne garde que ceux qui frappent *(05/08/2026)*
Le mode Discussion du chantier 3 devait tenir une promesse : *l'agent ne peut que
lire*. Le mécanisme paraissait solide — l'agent demande, le Hub répond, donc le
Hub refuse. Éprouvé en vrai : Hermès demande l'autorisation d'`edit`, le Hub
refuse, **puis Hermès écrit le même fichier par le terminal**, sans aucune
demande. `exit_code 0`, et il conclut « Fait ».

**Le refus côté Hub est réel, et il ne couvre que ce qui frappe à la porte.** La
faute de raisonnement tient dans une phrase qu'on n'avait pas écrite parce
qu'elle semblait aller de soi : *toute action passe par la demande
d'autorisation*. Elle n'y passe pas.

La conséquence dépasse le chantier : **le classement du laissez-passer est
aveugle au shell**, dans la version livrée. Vérifié en mode Atelier —
`terminal: echo bonjour` s'exécute sans qu'aucune carte n'apparaisse. Vert,
orange, rouge, « exige ton accord », l'option « toujours » retirée : tout cela
dit vrai des outils qui demandent, et ne voit pas passer un `printf > fichier`.

*Ce qu'on en retire, et qui vaut au-delà d'ici :* **avant de promettre qu'une
chose est impossible, faire la chose.** Aucune relecture de code n'aurait trouvé
ça — le code faisait exactement ce qu'il annonçait. C'est le second chemin qui
manquait au raisonnement, et seul un essai réel pouvait le montrer.

### Mieux vaut pas d'interrupteur qu'un interrupteur qui ment *(05/08/2026)*
Une fois la faille connue, la tentation était d'écrire le mode Discussion quand
même, avec une promesse plus molle. On ne le fait pas. Un interrupteur qui
annonce une garantie qu'il ne tient pas est **pire que son absence** : sans lui
on reste prudent, avec lui on se croit couvert. Le module reste au dépôt, avec sa
mesure et son avertissement en tête — c'est une moitié de porte, et elle se
présente comme telle.

### Il manquait un heurtoir, pas une serrure *(05/08/2026)*
Suite directe des deux entrées ci-dessus, le même soir — **et elles restent
vraies toutes les deux.** La porte ne garde toujours que ceux qui frappent ; on
n'a pas écrit d'interrupteur menteur. On a fait frapper celui qui n'y pensait
pas.

Côté Hermès, la configuration cherchée n'existe pas : `approvals.mode` ne se
déclenche que sur les 47 motifs de `DANGEROUS_PATTERNS`, donc `manual` demande
« pour les commandes dangereuses » et laisse passer `echo bonjour`. **Sa garde
est bâtie sur le texte de la commande, pas sur l'outil.** Mais un crochet porte
sur l'outil, lui : `pre_tool_call`. Un greffon qui répond `{"action":"approve"}`
force *n'importe quel* appel à passer par la porte humaine — et sur ACP cette
porte est déjà pontée vers `session/request_permission`.

Éprouvé à l'écran, **en mode Atelier, dans les deux sens** : la même commande
qui, trois heures plus tôt, s'exécutait sans qu'aucune carte n'apparaisse, a été
classée **rouge** et a **posé une carte**. Laissée sans réponse, elle s'est
fermée seule au bout de 60 s et Hermès n'a rien lancé ; répondue *Allow*, elle a
donné `bonjour` et `exit_code 0`. Les deux tours sur l'ancienne interface — la
carte se rendait déjà.

*Ce qu'on en retire, et qui vaut au-delà d'ici :* **« il n'y a pas de
configuration » n'est pas « il n'y a pas de moyen ».** La recherche portait sur
un réglage, et la réponse était un point d'extension. Deux fois de suite sur le
même sujet, la conclusion négative venait d'avoir cherché la bonne chose au
mauvais étage — d'abord le Hub quand c'était Hermès, puis la config quand
c'étaient les greffons.

*Et une conséquence qui dépasse l'interrupteur :* le classement du laissez-passer
était **aveugle au shell**. Une fois que le terminal frappe, il retombe sur
`arbitrer()` comme n'importe quel autre outil. Le chaînon manquait au
laissez-passer entier.

~~*Non éprouvé :* le mode Discussion lui-même, jamais activé de la soirée — la
branche haute d'`arbitrer()` reste non jouée ;~~ **joué à 03:02 : refus immédiat
en 11 s, sans carte posée — contre 71,7 s pour le refus par délai dépassé. Le
chrono seul les distingue, et c'est ce qui les qualifie.** Restent le **volume**,
une carte par commande étant intenable pour un agent au travail, et la livraison
chez un client, le greffon vivant dans le home d'Hermès et non dans le dépôt.

### Un interrupteur peut s'écrire avant de pouvoir se livrer *(05/08/2026)*
La garantie du mode Discussion a **deux pièces** : l'arbitrage du Hub, qui est
dans ce dépôt, et un greffon `pre_tool_call` dans le home d'Hermès, qui n'y est
pas. Sans la seconde, Discussion refuse ce qui demande — `edit`, `fetch` — et
laisse passer le shell : c'est mot pour mot l'interrupteur qui ment, celui qu'on
avait refusé d'écrire quelques heures plus tôt.

**On écrit donc le bouton, mais il ne promet rien qu'il n'ait constaté.** Le Hub
lit `plugins.enabled` dans le `config.yaml` d'Hermès — lecture pure — et dit la
vérité quand la pièce manque. Un interrupteur qui vérifie sa propre condition
vaut mieux qu'un interrupteur qu'on n'ose pas livrer, et mieux encore qu'un
interrupteur livré à l'aveugle.

*Le corollaire, qui n'est pas de ce chantier :* poser le greffon chez un client
est l'affaire de l'**installateur**. Tant que ce n'est pas fait, la garantie est
vraie sur le poste de kuchu et fausse partout ailleurs — et c'est exactement le
genre d'écart qu'une capture d'écran ne montre jamais.

### Le heurtoir ne sonne qu'en Discussion *(05/08/2026)*
Trancher le **volume** était la condition posée pour écrire l'interrupteur : une
fois le greffon en place, le terminal frappe à *chaque* commande, et un agent au
travail en enchaîne des dizaines. Les trois règles possibles ont été jouées sur
une tâche ordinaire — douze appels d'outil, dont huit par le terminal.

| la règle | en Atelier | en Discussion |
|---|---|---|
| le terminal ne frappe **qu'en Discussion** | 2 cartes, mais le `printf >` passe sans être vu | 0 carte, 10 refus |
| il frappe partout, « pour la session » absorbe | 3 cartes | 0 carte, 10 refus |
| il frappe partout, une carte par commande | **10 cartes** | 0 carte, 10 refus |

**Retenu : le greffon ne renvoie l'appel vers le Hub qu'en mode Discussion.**

Trois choses ont décidé, et la première n'était pas attendue. **La colonne
Discussion est identique dans les trois règles** — le mode refuse d'office, donc
il ne pose jamais de carte. Le volume n'est donc pas un problème de
l'interrupteur : c'est un problème de l'**Atelier**, c'est-à-dire du seul mode
que les clients utilisent. Ensuite, dix cartes pour un tour, c'est exactement la
porte qu'on repousse cent fois par jour et qu'on finit par retirer en entier.
Enfin, « pour la session » rendrait au rouge le « toujours » qu'on lui avait
retiré exprès — et la réponse qui couvre tout serait prise sur `ls -R src`, la
commande la plus anodine du tour, pour ouvrir ensuite `sed -i` et `printf >`.

**Le prix est nommé, pas réglé :** en Atelier, le laissez-passer reste **aveugle
au shell**, et il l'est en silence. La carte qui annonce « exige ton accord » dit
vrai des outils qui demandent et ne voit pas passer un `printf > fichier`. Ce
n'est pas une régression de ce chantier — c'est l'état d'aujourd'hui, qu'on
choisit de ne pas corriger ici. Il part au §7 de `PLAN-DE-TRAVAIL.md`, avec la
distribution du greffon, parce qu'un coût qu'on assume sans l'écrire quelque part
est un coût qu'on a oublié.

*Ce qu'on en retire, et qui vaut au-delà d'ici :* **une garde qui coûte un clic
par geste n'est pas tenue, elle est éteinte.** Le mécanisme qui rend le terminal
voyant est le même dans les trois règles ; ce qui les sépare n'est pas la
sécurité obtenue mais celle qui survit à une semaine d'usage.

### On a lu sa propre phrase comme un verdict de la machine *(05/08/2026)*
Le greffon d'essai annonçait « le mode Discussion est actif » dans le texte qu'il
envoyait à la porte d'autorisation. Ce texte est remonté à l'écran, Hermès l'a
recopié dans sa réponse — et il en est redescendu comme un **fait mesuré**. Le
plan a été écrit et commité sur cette lecture : *le Hub a refusé parce que le
mode Discussion était actif*. Il n'y avait aucun `mode-conversation.json` sur le
disque ; le Hub était en Atelier depuis le début, et le refus venait d'un délai
de 60 s dépassé sur une carte que personne n'avait ouverte.

**Un banc d'essai ne doit rien affirmer qu'il ne mesure.** Le texte d'une sonde
décrit ce qu'elle fait, jamais l'état qu'elle suppose — sinon l'hypothèse
voyage jusqu'à l'écran et revient déguisée en preuve. Et ce qui a fini par
trancher n'était pas une relecture du raisonnement, mais **l'absence d'un
fichier** : ce que la machine n'a pas écrit dit autant que ce qu'elle affiche.

### `git add -A` ramasse ce que personne n'a décidé *(05/08/2026)*
Trois fois dans la même soirée. `.claude/` — des autorisations par poste — a
failli partir chez les clients ; trois scripts d'outillage sont entrés sans
décision ; et un commit a annoncé une correction que sa mise en scène ne portait
pas, le fichier ayant été écrit après le `add`.

**Le remède n'est pas de bannir `add -A`, c'est de lire ce que git a répondu.**
Les `??` du `status` autant que les `M`, et la ligne `n files changed` du commit
plutôt que l'intention qu'on avait en tapant. Trois symptômes, une seule cause :
on regarde la commande qu'on écrit, pas la réponse qu'on reçoit.

### Un garde-fou qui mord son auteur le jour de sa naissance a bien été écrit *(05/08/2026)*
Le cliquet des tailles a refusé cinq fichiers du chantier qui l'introduisait, et
le détecteur d'exports morts a signalé trois exports nés dans l'heure. Ce n'est
pas un défaut de réglage : c'est la preuve qu'ils regardent le vrai code et non
une idée du code. Deux des cinq refus étaient justes et ont fait sortir du code
dans son propre fichier ; les trois autres étaient de la prose, et les marques
ont été relevées à la main **en le disant dans le commit**. Un garde-fou qu'on
relève en silence est un compteur.

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
