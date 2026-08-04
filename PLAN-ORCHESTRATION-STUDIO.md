# Orchestration et Studio — ce qu'ils devraient être

> ⏱ **Achevé** le 4 août 2026 à **12:58** · **révisé** le 4 août 2026 à **22:35**
> (horodatage seul, contenu inchangé) · détail : `git log --follow -- PLAN-ORCHESTRATION-STUDIO.md`
> **Le document le plus récent l'emporte.** Compare cette ligne avant d'appliquer.

> Proposition du 4 août 2026, après le basculement de la conversation sur
> l'accueil. À relire, à trancher, puis à replier dans `PLAN-V2.md` — ce
> document est un brouillon d'arbitrage, pas une source de vérité.

---

## 1. Ce que le basculement a cassé

L'accueil est devenu la conversation. Ce n'est pas un déplacement d'écran :
c'est un déplacement de **la porte d'entrée**. Et trois choses, qui tenaient
debout avant, ne tiennent plus.

**Orchestration porte une conversation qui vit maintenant ailleurs.** Le volet
Conversation y est toujours, avec le même fil. Ce n'était pas absurde tant que
c'était le seul endroit où parler ; ça le devient dès qu'il y en a un autre,
plus visible, ouvert par défaut.

**Il y a deux boîtes où l'on tape une phrase en français.** Le champ de
l'accueil, et « Décris ce que tu veux » dans le volet Pôles. Même geste, même
langue, deux machineries : l'une converse et délègue, l'autre décompose en
graphe de tâches. Rien à l'écran ne dit laquelle choisir, et **c'est exactement
la divergence que le dépôt s'interdit partout ailleurs** — deux sources pour une
même chose finissent par ne plus dire la même chose.

**L'historique est resté du côté où l'on n'écrit plus.** On écrit à l'accueil, on
relit dans Orchestration. Une mémoire rangée loin de l'endroit où elle se
fabrique ne se consulte pas.

---

## 2. La colonne vertébrale : trois écrans, trois questions

C'est la seule idée du document. Tout le reste en découle.

| L'écran | La question | Ce qu'on y fait |
|---|---|---|
| **Accueil** | *Qu'est-ce que je veux ?* | Demander, converser, relire ce qui s'est dit |
| **Orchestration** | *Qu'est-ce que j'ai ?* | L'inventaire : agents, équipes, pôles, automatisations |
| **Studio** | *Qu'est-ce qui se fait ?* | Construire un pôle, le simuler, le lancer, le regarder |

Trois questions disjointes. Un écran qui répond à deux d'entre elles se met à
doubler un autre écran — c'est ce qui vient d'arriver à Orchestration.

Le test à appliquer à chaque ajout futur : *à laquelle des trois questions ça
répond ?* S'il faut hésiter, l'élément est probablement mal placé.

---

## 3. Orchestration : ce qui reste, ce qui part

### Ce qui part

| Ce qui part | Où | Pourquoi |
|---|---|---|
| Le volet **Conversation** | supprimé | Il est à l'accueil. Deux portes vers le même fil n'ajoutent rien et donnent deux endroits à maintenir. |
| Le volet **Historique** | vers l'accueil | On relit là où l'on écrit. Un bouton à côté de « Nouvelle », dans la ligne « En direct » qui existe déjà. |
| La boîte **« Décris ce que tu veux »** | vers l'accueil | Une seule boîte où l'on formule une demande. Voir §4 : ce n'est pas une suppression, c'est une fusion. |

### Ce qui reste, et qui devient tout le sujet

**Volet 1 — Agents et équipes.** Qui j'ai, ce qu'ils savent faire, avec quels
outils. C'est déjà le meilleur volet du Hub : fiches, création, retrait,
équipes, outils MCP partagés. Il garde l'organigramme — le graphe **des agents**,
au repos, qui dépend de qui. À ne pas confondre avec le graphe du Studio : voir
§5.

Les deux portes encore fermées appartiennent ici, et rien n'a changé à leur
sujet : modifier la description d'un agent (`decrireAgent` existe côté serveur,
la route aussi, il manque le geste à l'écran), et modifier une automatisation.

**Volet 2 — Pôles.** Ce qui a tourné, ce qui tourne, ce qui est programmé. Des
vignettes, chacune menant au Studio. C'est la liste, pas l'atelier : on y voit
l'état et la dernière exécution, on n'y manipule rien.

**Volet 3 — Automatisations.** Aujourd'hui elles vivent sur l'accueil, en
entier. Je propose de couper en deux, selon la règle des trois questions :

- **l'accueil signale** — une automatisation tombée reste visible, c'est déjà
  fait et c'est le bon endroit : on ouvre le Hub, on doit voir ce qui a raté ;
- **Orchestration gère** — programmer, suspendre, retirer. Ce sont des pôles
  qui partiront tout seuls : leur place est auprès des pôles.

Résultat : Orchestration passe de quatre volets à trois, et aucun des trois ne
double un autre écran.

---

## 4. La fusion des deux boîtes — le point qui demande une décision

C'est le seul endroit du plan où je propose de défaire quelque chose qui marche.

Aujourd'hui, dire à Hermès *« cherche les nouveautés IA, fais-moi un tableau et
un PDF »* donne deux résultats selon l'endroit où on le tape. À l'accueil, il
répond et délègue. Dans Orchestration, il décompose en pôle, et la simulation
s'ouvre. Le second chemin est le bon pour ce genre de demande — mais rien ne
l'indique, et c'est le moins visible des deux.

**Ce que je propose est déjà écrit dans le plan V2, section 5 :** une seule
porte, le chat, et c'est *Hermès* qui reconnaît qu'une demande mérite un pôle.
Il répond alors par une carte dans le fil — « je propose un pôle Veille IA avec
cinq agents », avec **Valider / Modifier / Refuser**. Valider écrit la structure
en attente et ouvre le Studio sur son graphe et son script.

Ce que ça gagne : on n'a plus à savoir d'avance si sa demande est « une question »
ou « un chantier ». On demande ; Hermès qualifie ; on valide. Le décomposeur
existe déjà et rend un graphe assignable en ~23 secondes — la mécanique est là,
il manque le branchement et la carte.

Ce que ça coûte : il faut décider **quand** Hermès propose un pôle plutôt que de
répondre. Trop souvent, chaque question devient une cérémonie ; trop rarement, la
porte disparaît. Ma proposition : il propose, il n'impose jamais, et une carte
refusée le fait répondre normalement dans la foulée. On règle le seuil à
l'usage, pas d'avance.

**Décision à prendre.** Si tu préfères garder la boîte séparée dans Orchestration
— c'est explicite, on sait ce qu'on déclenche —, tout le reste du plan tient
sans elle. Dis-le, et je l'écris ainsi.

---

## 5. Le Studio : ta vision, et la seule correction que j'y apporte

### Ce que tu décris, et que je garde entièrement

On entre dans le Studio, on tombe sur un graphe de cases et de liens. On
manipule, on édite, on essaie. On appuie sur **Lancer**, un panneau s'ouvre, et
on voit le script se dérouler en direct.

Et l'idée qui porte tout le reste : **le graphe et le script sont deux vues du
même objet.** L'un est visuel, l'autre est textuel. C'est juste, et c'est ce qui
manquait le plus au Studio — aujourd'hui le graphe montre *que* ça avance, jamais
*ce qui se passe*, et il faut retourner dans la conversation pour le savoir.

### La correction : les cases sont des tâches, pas des agents

Le Hub a déjà **deux** graphes, et les confondre coûterait cher :

| Le graphe | Ce qu'une case représente | Ce qu'un lien veut dire | Où |
|---|---|---|---|
| **Organigramme** | un agent | qui dépend de qui | Orchestration, au repos |
| **Studio** | une tâche, portée par un agent | ce qui doit finir avant quoi | Studio, en travail |

Un graphe d'agents ne peut pas s'animer : un agent n'a pas d'ordre, il a un rôle.
Ce qui se déroule dans le temps, ce sont les tâches. C'est pour ça que le nœud du
Studio **porte les couleurs et le prénom de son agent** — d'où l'impression que
la case est l'agent — mais que l'unité reste la tâche. Un même agent peut occuper
trois cases dans un pôle ; trois cases ne sont pas trois agents.

Je garde donc ta description mot pour mot, avec ce seul déplacement : *les cases
représentent le travail, habillé aux couleurs de qui le fait.*

### Le script : un seul objet, trois moments

C'est là que ta proposition devient plus forte qu'elle n'en a l'air. Le même
panneau sert trois fois, et ce n'est pas une économie de code — c'est ce qui rend
le pôle lisible :

| Moment | Ce que le script montre | Ce qu'il vaut |
|---|---|---|
| **Avant** | la simulation : qui se réveille, dans quel ordre, quels fichiers seraient touchés, quelles autorisations seraient demandées | la porte — rien ne part sans ton accord |
| **Pendant** | les mêmes lignes qui s'allument, se cochent, portent leur durée | le journal, en direct |
| **Après** | la trace complète, relisible | ce qui s'est vraiment passé |

Une seule liste, trois états. Aujourd'hui ces trois moments vivent à trois
endroits : la fenêtre volante, le graphe animé, et la conversation.

### La conséquence : la fenêtre volante devient un panneau

Et c'est un revirement assumé par rapport au plan V2, qui décrivait une fenêtre
volante à 75 % de l'écran, flou derrière, **disparaissant complètement** après
usage.

Cette fenêtre a été conçue quand la simulation était la seule chose à montrer.
Une fenêtre qui disparaît ne peut pas porter le « pendant » : elle masque le
graphe au moment précis où l'on veut regarder les deux. Et le plan V2 note déjà
le symptôme sans le nommer — *« la porte de validation vit dans la fenêtre de
simulation, donc valider se trouve à un endroit qu'on n'ouvre pas forcément
avant de vouloir lancer »*.

Un panneau escamotable règle les deux : il est là sans qu'on l'ouvre, on le
replie quand le graphe suffit.

**Où le poser : à gauche.** La droite est déjà prise par les réglages du nœud
(`<aside>` à droite du canevas), et deux panneaux du même côté se disputeraient
la place. Et l'ordre de lecture y aide : le script raconte (à gauche, comme un
texte), le graphe est le sujet (au centre), les réglages sont l'outil (à droite).

### Le couplage des deux vues — le vrai gain

Si les deux vues montrent le même objet, elles doivent se répondre :

- survoler une ligne du script surligne son nœud dans le graphe ;
- cliquer un nœud fait défiler le script jusqu'à sa ligne ;
- une tâche en échec est rouge dans les deux, et le script dit *pourquoi* — ce
  que le graphe ne pourra jamais tenir dans une case.

Sans ce couplage, on a deux affichages côte à côte. Avec, on a un instrument.

---

## 6. Le parcours entier, après changement

1. **Accueil.** Tu écris ce que tu veux.
2. Hermès répond — ou, si la demande est un chantier, **propose un pôle** dans le
   fil : Valider / Modifier / Refuser.
3. **Valider** écrit la structure en attente et ouvre le **Studio**.
4. Le Studio montre le graphe, et le script à gauche **en mode simulation** :
   l'ordre, les fichiers, les autorisations, le risque. Rien n'a tourné.
5. Tu ajustes à la souris si besoin — le script se refait.
6. **Lancer.** Le même panneau passe en direct, les nœuds s'allument, les lignes
   se cochent.
7. Une autorisation rouge arrête et attend, dans le script comme dans le graphe.
8. À la fin : les livrables, les compteurs, et « Valider et mettre en mémoire ».
9. **Orchestration** garde la vignette du pôle, son état, sa dernière exécution
   — et de quoi le programmer.

---

## 7. Ce qui reste à trancher

1. **La fusion des deux boîtes** (§4) — une seule porte par le chat, ou on garde
   la boîte de demande séparée dans Orchestration ?
2. **La fenêtre volante devient un panneau à gauche** (§5) — ça défait une
   décision écrite du plan V2, je la crois périmée, mais c'est ton appel.
3. **Les automatisations coupées en deux** (§3) — l'accueil signale, Orchestration
   gère. Ou bien elles restent entièrement sur l'accueil.

Et un quatrième, plus lourd, que je ne proposerais pas pour maintenant : le
Studio est aujourd'hui plein écran, hors barre latérale. Si le script y prend une
place permanente, il devient l'écran où l'on passe le plus de temps — et la
question de le ramener dans le cadre commun se posera. À laisser venir de
l'usage. *(Tranché depuis : il rejoint le cadre commun, avec un bouton pour
grandir.)*

---

## 8. Mis de côté pour ne pas être perdu — la mémoire de contexte

> Soulevé par kuchu le 4 août, hors du sujet du jour et **volontairement non
> tranché**. Consigné ici parce que c'est né d'un vrai vécu : « ça m'est arrivé
> trop souvent lors des premiers tests ».

**Le besoin.** Reprendre un sujet abandonné depuis longtemps oblige aujourd'hui à
tout réexpliquer. On voudrait pouvoir **rappeler l'entièreté d'un contexte** avant
d'en reparler — sans l'avoir gardé en mémoire vive tout ce temps.

**L'intuition qui porte l'idée**, et elle est juste : *le cerveau ne retient pas
tout en permanence, il retrouve quand on le lui demande.* Donc la mémoire ne doit
pas peser en continu ; elle doit être **convoquée**. C'est exactement la règle
qu'on vient d'appliquer aux panneaux — une chose convoquée ne s'impose pas — et
elle vaut aussi pour ce qu'on se rappelle.

**Le mécanisme, arrêté avec kuchu le 4 août.** Un tampon par conversation : soit
effacé, soit conservé sous forme de résumé. Le fil entier reste sur le disque ;
seul le résumé revient en contexte, et le détail se recharge à la demande.

### Trois étages, et aucun ne fait le travail d'un autre

Les deux façons d'oublier sont opposées, et une mémoire unique ne peut pas
couvrir les deux : oublier **qu'**une chose a eu lieu est un défaut de largeur,
oublier **comment** elle s'est passée est un défaut de profondeur.

| L'étage | Ce qu'il tient | Sa vie |
|---|---|---|
| **Le tampon** | la session non encore résumée, en entier | éphémère — il se vide en se résumant |
| **L'index** | une ligne structurée par session | s'accumule, se replie par projet |
| **Le durable** | les décisions et le *pourquoi* — `ADM.md`, fiches du Coffre | ne se résume jamais, ne s'efface jamais |

Les deux premiers oublient par construction. Le troisième n'oublie pas — **et
c'est pour ça qu'il ne faut jamais les fusionner.** Un résumé garde ce qui a été
fait ; il perd le pourquoi. `ADM.md` existe précisément parce que le raisonnement
ne vivait que dans les messages de commit.

### L'invariant qui fait tenir l'ensemble

**Les étages ne contiennent jamais la même chose.** Pas deux copies — un tuyau.
Une session est *profonde* tant qu'elle n'est pas résumée ; à sa clôture elle
devient une ligne d'index **et cesse d'être profonde**. Aucun recouvrement, donc
aucune contradiction possible entre les deux. Sans cet invariant, l'architecture
se dégrade en six mois en deux mémoires qui se démentent.

Deux conséquences de service :

- **le tampon suit le sujet, pas l'horloge.** « La dernière session » au sens
  chronologique est souvent le mauvais choix : trois bavardages, et la vraie
  suite du travail est quatre sessions en arrière. L'interrupteur
  Discussion / Atelier fait le tri gratuitement ;
- **l'index n'est pas de la prose libre.** « On a parlé de la veille IA » est
  introuvable trois mois plus tard ; « Veille IA — 5 sites, tableau + PDF,
  scénario créé, rendu `veille.md` » se retrouve. Deux ou trois phrases, mais
  avec des poignées : le sujet, ce qui a été décidé, ce qui a été touché. Même
  raison que pour le plan : **la structure est ce qui rend retrouvable.**

### Quatre crans, et le prix monte avec le consentement

| Cran | Ce qu'on charge | Ce qu'il faut pour l'obtenir |
|---|---|---|
| 1 | l'index entier | rien — il est toujours là, il est bon marché |
| 2 | le tampon de la session en cours | rien — récent et borné |
| 3 | le fil complet d'une vieille session | **l'interrupteur de rappel**, en Atelier |
| 4 | l'archive entière d'un projet clos | une demande explicite, et Hermès annonce le coût |

L'interrupteur (cran 3) est une **autorisation, pas une commande** : tu ne
désignes pas le souvenir, tu donnes le droit d'aller voir. En contrepartie,
Hermès doit **dire ce qu'il a puisé** — une ligne dans le fil : *« contexte
rappelé : Veille IA, 12 juillet — 3 200 mots résumés en 180 »*. Une autorisation
à ce qu'on ne voit pas n'est pas une autorisation.

Et on affiche le **poids réel** plutôt qu'un « ça coûte plus cher » : un
avertissement sans chiffre devient un bandeau qu'on apprend à ne plus lire. C'est
déjà la doctrine du dépôt — les coûts sont un affichage, pas une contrainte.

### L'archivage par projet — ce qui empêche l'index de grossir sans fin

*Idée de kuchu, et c'est elle qui règle l'arithmétique.* Trois phrases ≈ 55
jetons, donc mille sessions ≈ 55 000 jetons : l'index ne peut pas croître
indéfiniment.

Une consolidation par ancienneté serait arbitraire — six mois ne veut rien dire,
et on fusionnerait des choses encore vivantes. **On se replie sur une frontière
que l'utilisateur déclare lui-même : la fin d'un projet.** Un projet clos quitte
l'index et devient **un seul fichier d'archive** dans le Coffre, rubrique
Archives, lisible dans Obsidian.

La propriété qu'on y gagne est la bonne : **l'index ne grossit plus avec le
temps, mais avec le nombre de projets ouverts** — une quantité qu'une personne
tient à dix ou quinze, pas à mille.

Et le moment de l'archivage devient utile en lui-même : **archiver un projet,
c'est décider ce qui en reste.** Ce qui a valeur générale — une compétence
prouvée, une règle apprise — monte à l'étage durable ; le reste part dans
l'archive. C'est le même arbitrage que « valider et mettre en mémoire », au
niveau du projet.

**Une seule chose à ne pas confondre, et elle est décisive : cher en contexte
n'est pas cher sur le disque.** Les fils bruts ne sont jamais supprimés — le
disque est gratuit, les jetons ne le sont pas. L'archive **remplace** les fils
dans le contexte, elle ne les efface pas. C'est ce qui rend le cran 4 réversible :
relancer une archive peut, si besoin, redescendre jusqu'à la matière d'origine.

### Le même geste, partout

Trois fois dans ce plan, Hermès fait exactement la même chose : **il propose, il
nomme le coût, il laisse décider.** Pour un plan de travail, pour rappeler un
contexte, pour relancer une archive. Un seul geste à apprendre, appris une fois.

**Ce qui existe déjà dans Hermès et qu'il faudra regarder avant d'écrire quoi que
ce soit** — il y a probablement plus de matière que prévu :

| Ce qui existe | Ce que ça fait | Ce que ça ne fait pas |
|---|---|---|
| `hermes curator` | revoit les compétences apprises : élague, consolide, archive | ne touche pas aux conversations |
| `hermes learning --json` | le graphe des compétences dans le temps | idem |
| Les fils de conversation | gardés **en événements bruts**, rejouables tels quels | aucun résumé, aucun rappel sélectif |
| Le Coffre | fiches de compétence prouvée en markdown | mémoire du *savoir-faire*, pas du *contexte* |
| Phase 6 du plan V2 | « la mémoire qui apprend » | apprend des **compétences**, pas des conversations |

**Le point à ne pas confondre, et c'est le piège.** Le dépôt porte déjà une règle
sur la mémoire : *« ne pas raccourcir pour économiser »* — elle vise `SOUL.md`,
`MEMORY.md`, `USER.md`, qui pèsent ~750 jetons pour un contexte de 200 000, et
que raccourcir ne fait rien gagner. **Cette règle ne s'applique pas ici.** Un fil
de conversation n'est pas une règle de comportement : il peut peser cent fois
plus, et il ne sert que le jour où l'on rouvre le sujet. Résumer les règles est
une fausse économie ; résumer les conversations est le sujet même.

Quelqu'un qui lira les deux textes dans six mois croira qu'ils se contredisent.
Ils ne se contredisent pas : **une règle est toujours utile, un souvenir ne l'est
que parfois.**

### Les deux questions, tranchées

**Qui décide qu'un souvenir est gardé ?** La question s'est déplacée en
l'examinant : les fils sont **déjà** conservés en entier, rien n'est perdu
aujourd'hui. Ce qu'on arbitre n'est pas la conservation, c'est le **résumé** —
qui coûte un appel modèle, peut mentir, et doit vivre quelque part.

Réponse : **Hermès génère, l'utilisateur corrige.** Deux raisons, aucune n'est
une opinion. La règle du dépôt d'abord — réversible, l'agent décide seul ; un
résumé se supprime et se refait. Le constat de kuchu ensuite, déjà écrit dans
`ADM.md` : *la configuration de la mémoire est celle que tout le monde saute*.
Une question posée à chaque fin de conversation recevrait « non » pour toujours,
et la fonction n'existerait que sur le papier.

Le résumé s'écrit **à la clôture du fil** — le bouton « Nouvelle » existe déjà et
dit exactement ça — et il vit dans le **Coffre**, dossier à part, markdown +
frontmatter, avec sa provenance : auto-généré, ou relu. Sans quoi on pollue un
coffre tenu à la main avec des textes qu'aucun humain n'a validés.

**Comment rappelle-t-on un contexte ?** Par un geste explicite, jamais
automatiquement. Tu le nommes, ou tu le cherches dans l'historique — qui déménage
à l'accueil, donc **on rappelle là où l'on écrit**. Hermès peut *suggérer*, et le
produit sait déjà le faire proprement : la boîte de demande affiche ce qu'on
avait déjà fait de ce genre, en donnant le nom et la forme de la fiche, et
l'utilisateur juge. Suggérer, nommer, laisser décider — jamais charger seul.

Ce qui retombe sur la règle du jour, la même que pour les panneaux : **une
mémoire se convoque, elle ne s'impose pas.**

**Reste ouvert, et c'est mineur :** l'interrupteur de rappel reste-t-il allumé
d'une conversation à l'autre ? Penchant : oui — sinon on le rallume vingt fois et
il devient une corvée — **précisément parce que** le poids s'affiche à chaque
usage. Ce qui reste visible peut rester allumé.
