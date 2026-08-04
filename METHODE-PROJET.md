# Monter un projet, de zéro au produit — la méthode

> ⏱ **Achevé** le 4 août 2026 à **13:56** · révisions : `git log --follow -- METHODE-PROJET.md`
> **Le document le plus récent l'emporte.** Compare cette date avant d'appliquer.
> *Méthode réutilisable, pas décision de produit : hors règle d'horodatage.*
> *Une copie de ce fichier vit dans `Bureau\Methodes\Fil-Rouge\` — dépôt
> `fil-rouge-methode`. Les deux divergeront : celui-ci sert le projet, l'autre
> sert n'importe quel projet.*

> À déposer en tête d'un projet, dans les premières lignes de la discussion.
> Il sert de ligne de conduite commune : la personne sait ce qui vient, le modèle
> sait ce qu'on attend de lui, et aucun des deux ne saute une étape par
> enthousiasme.
>
> Écrit après la refonte d'Hermès Hub (août 2026), où la méthode a été suivie en
> vrai. Chaque étape cite ce qu'elle a coûté et ce qu'elle a rapporté ce jour-là.

---

## Comment s'en servir

**Une phrase suffit à l'ouvrir :** *« On suit `METHODE-PROJET.md`. On en est à
l'étape 1. »* Le modèle sait alors qu'il ne doit pas écrire de code, et toi tu
sais quoi lui demander.

Les étapes se franchissent **dans l'ordre**, et chacune a une **porte** : une
condition à remplir pour passer à la suivante. Une porte sautée ne se voit pas
tout de suite — elle se paie trois étapes plus loin, quand il est cher de
revenir.

---

## Les six principes qui traversent tout

**Écrire le pourquoi, pas seulement le quoi.** Ce qui a été fait se retrouve dans
l'historique du code ; pourquoi ça a été fait ne se retrouve nulle part. Sans
cette trace, on refait les mêmes débats tous les trois mois.

**Mesurer plutôt que supposer.** Une inconnue qui commande une décision se mesure
avant, pas après. Deux mesures d'une demi-journée ont sauvé des mois de travail
sur Hermès Hub : *le moteur savait déjà décomposer une demande* — il n'y avait
donc rien à écrire —, et *les modèles locaux tenaient la charge* — le manque de
crédits cessait d'être un plafond.

**Se tromper là où c'est bon marché.** Une maquette qu'on jette coûte une heure ;
un écran de mille lignes qu'on jette coûte une semaine. Toute la méthode consiste
à déplacer les erreurs vers l'endroit où elles ne coûtent rien.

**Ne jamais inventer ce qui existe.** Dans le produit — une commande, une
convention, une icône déjà employée ailleurs — comme dehors : les métiers qui
font ça depuis cent ans ont déjà résolu le problème. Une mémoire à étages
existait aux Archives nationales depuis 1961.

**Regarder l'écran, pas la compilation.** Ce qui compile sans erreur peut être
illisible, mal placé ou invisible. Sur la refonte de l'accueil, deux défauts sur
deux ont été trouvés en regardant, zéro en compilant.

**Rien d'irréversible sans accord.** Réversible : le modèle décide seul.
Irréversible — publier, supprimer, envoyer, valider une dépense : il s'arrête et
demande. Dans le doute, il demande.

**Une règle que rien ne vérifie est un vœu.** C'est le principe le plus rentable
de la liste, et le plus souvent oublié. Une convention de nommage, une limite de
taille, un document à tenir à jour : tout ce qui repose sur la seule discipline
se dégrade, sans que personne ait fauté. À chaque fois qu'on écrit une règle, la
vraie question est **qui la vérifiera** — et si la réponse est « nous », elle ne
tiendra pas six mois.

---

## Étape 1 — Discussion

**Ce qu'on fait.** On parle du besoin sans parler de solution. On répond à cinq
questions, et à elles seules : **pourquoi, pour qui, comment, quand, où.**

**Le piège évité.** Décrire une solution en croyant décrire un besoin. « Je veux
un bouton d'export » est une solution ; le besoin est peut-être « je n'arrive pas
à montrer mon travail à quelqu'un d'autre », et le bouton n'est pas la réponse.

**En clair.** Les cinq questions ne sont pas un formulaire : c'est un filet. Une
demande à laquelle on ne peut pas répondre « pour qui » n'est pas encore mûre.

**Si un produit existe déjà**, on y ajoute un **parcours cognitif** — méthode
d'ergonomie de 1990 : on joue une tâche comme un nouvel utilisateur, et à chaque
pas on demande *saura-t-il quoi faire ? verra-t-il la commande ? comprendra-t-il
ce qui vient de se passer ?* On note les frictions **numérotées**, pour pouvoir
en discuter une par une.

**Ce qui en sort.** Une liste de frictions numérotées, ou une page de besoin.

**La porte.** On sait dire pour qui c'est, et ce qui se passe si on ne le fait
pas.

---

## Étape 2 — Préparation du plan

**Ce qu'on fait.** On inventorie l'existant et on mesure ce qui commande une
décision. Le modèle lit le code, compte, teste, et rapporte des **chiffres**.

**Le piège évité.** Planifier d'écrire quelque chose qui existe déjà. C'est
l'économie la plus grande et la plus discrète de toutes.

**En clair.** Avant de dessiner la maison, on regarde ce qu'il y a sur le
terrain. Ce qui semble être un mois de travail est parfois un branchement.

**Ce qui en sort.** Un état des lieux chiffré : ce qui existe, ce qui manque, ce
qui pèse. Et la liste des **inconnues qui pourraient changer le plan** — celles
qu'on ira mesurer à l'étape 5, ou tout de suite si elles bloquent tout.

**La porte.** Aucune décision du plan ne repose sur une supposition qu'on aurait
pu vérifier en une heure.

---

## Étape 3 — Établissement du plan

**Ce qu'on fait.** On écrit le plan : ce qu'on construit, dans quel ordre, et
**pourquoi chaque arbitrage a été tranché ainsi**. Les questions non tranchées
restent écrites comme telles, jamais enterrées.

**La notion.** C'est un **journal de décisions d'architecture** — *Architecture
Decision Records*, formalisé en 2011. Le principe : cumulatif, on n'y réécrit
jamais. Une décision qui change d'avis se barre et la nouvelle se pose en
dessous — **la trace de l'erreur vaut autant que la correction**.

**En clair.** Un plan qui dit seulement *quoi* devient faux dès qu'on en dévie.
Un plan qui dit *pourquoi* reste utile même quand on en dévie, parce qu'on sait
ce qu'on est en train d'abandonner.

**Ce qui en sort.** `plan.md` et `ADM.md`, séparés : le plan porte la route, l'ADM
porte les raisons.

**Un plan se dit en quatre parts, et la quatrième est celle qu'on oublie :**
**qui** s'en occupe, **quoi** exactement et dans quel ordre, **comment** — les
moyens, ce qui sera touché —, et le **résultat attendu** : ce qui devra exister à
la fin, nommément. Sans cette dernière part, la fin d'un travail n'est comparable
à rien : on regarde ce qui est sorti et on juge au ressenti. Avec elle, **un
travail à moitié raté cesse de ressembler à un travail réussi.**

**La porte.** Chaque décision du plan a une phrase de « pourquoi », les questions
ouvertes sont numérotées et posées, le résultat attendu est écrit noir sur blanc
— et **tout tient dans un seul document qu'on peut lire seul**, sans avoir
assisté à la discussion.

**Le plan inversé.** Une discussion longue part dans tous les sens, c'est sa
nature et ce n'est pas un défaut : c'est là qu'on trouve. Mais elle produit des
décisions éparpillées, et le risque n'est pas de se contredire — c'est de
**perdre en route la moitié de ce qu'on a trouvé**.

Le remède est emprunté à l'édition : on reconstruit le plan **depuis ce qui a été
produit**, au lieu de le relire. On inventorie l'état exact, on ordonne les
chantiers, on liste les inconnues, et surtout **on rattache chaque trouvaille à
son chantier** dans un tableau — chaque friction, chaque idée, chaque couplage.
Ce qui n'a pas de chantier est soit hors périmètre, et on le dit, soit oublié, et
on vient de le rattraper.

C'est aussi le moment où les dépendances cachées apparaissent. Sur Hermès Hub,
le plan inversé a montré qu'il ne fallait surtout pas commencer par le chantier
le plus simple : il aurait retiré la seule porte permettant de créer un scénario,
et personne ne s'en serait aperçu avant d'en vouloir un.

---

## Étape 4 — Maquette et rendu visuel

**Ce qu'on fait.** On dessine avant de coder. Une maquette **cliquable**, dans
les vraies couleurs, qui joue le parcours du début à la fin.

**La notion.** **Prototypage basse fidélité**, dans une démarche *design-first* :
décider en dessinant plutôt qu'en codant. Et si le produit a une identité, on
relève d'abord sa **grammaire** — le vocabulaire d'interaction déjà employé :
quelle icône veut dire fermer, replier, agrandir, revenir.

**En clair.** Tant qu'on ne peut pas cliquer, on discute d'imaginations
différentes en croyant parler de la même. Le clic est ce qui met tout le monde
devant le même objet.

**Trois détails qui font que ça marche**, et sans eux la maquette ne sert à rien :

- **les vraies couleurs.** Un fil de fer gris cache les problèmes de contraste et
  fait valider quelque chose qui sera laid ;
- **la grammaire relevée, pas inventée.** On prend les icônes et les gestes déjà
  présents dans le produit ; on n'en crée un que si aucun ne convient ;
- **assez bon marché pour avoir tort.** Si changer la maquette coûte une
  demi-journée, on défendra son premier jet au lieu de l'améliorer.

**Ce qui en sort.** Un fichier HTML autonome, et une grammaire écrite.

**La porte.** La personne a cliqué le parcours entier et dit « c'est ça ».

---

## Étape 5 — Vérification de faisabilité, et comment

**Ce qu'on fait.** On prend les points du plan dont on n'est pas sûr qu'ils
soient réalisables, et on les éprouve **pour de vrai**, en petit, jetable.

**La notion.** C'est un **spike** — une expérience minuscule, limitée dans le
temps, dont le seul produit est une réponse. Le code du spike se jette, même
quand il marche.

**En clair.** On ne demande pas « est-ce possible ? », on essaie la plus petite
version possible et on regarde. La réponse est un chiffre ou un oui/non, jamais
une opinion.

**Ce qui en sort.** Une ligne par inconnue : *mesuré, voici le résultat, voici ce
que ça change au plan.* Et parfois : le plan change.

**La porte.** Plus aucune étape du plan ne repose sur un « ça devrait marcher ».

---

## Étape 6 — Exécution par étapes

**Ce qu'on fait.** On construit par **tranches**, et chaque tranche se termine par
quelque chose qu'on peut ouvrir et juger. Pas une couche technique complète —
une fonction qui traverse le produit de bout en bout, même minuscule.

**En clair.** Une tranche verticale, c'est « ce bouton fait maintenant quelque
chose de visible », pas « la base de données est prête ». Un projet qui n'est
démontrable qu'à la fin est un projet qu'on n'ose jamais publier.

**Le refactoring au fil de l'eau — et c'est le cœur de cette étape.**

**La notion.** La **règle du boy-scout** : on laisse l'endroit un peu plus propre
qu'on ne l'a trouvé. Et son contraire à éviter, la **dette technique** : chaque
raccourci pris est un emprunt, et les intérêts se paient en lenteur à chaque
modification suivante.

**Comment on fait, concrètement :**

- **on nettoie ce qu'on touche, jamais ce qu'on ne touche pas.** Découper du code
  qu'on ne modifie pas, c'est risquer une régression sans contrepartie ;
- **un peu plus propre, jamais beaucoup plus.** Un nettoyage qui déborde du
  travail du jour devient un chantier qu'on n'a pas décidé d'ouvrir ;
- **une règle de découpe écrite d'avance**, sinon on ajoute toujours là où on est
  et les fichiers enflent sans que personne ait fauté. Exemple de règle : *un
  fichier répond à une seule question ; au-delà de ~400 lignes, il en contient
  une deuxième.*

**Le piège évité.** Le grand refactoring de la fin. Il n'arrive jamais, et quand
il arrive il casse des choses que plus personne ne sait tester.

### Les vérifications qui empêchent le glissement

Le nettoyage au fil de l'eau repose sur la discipline, donc il ne tiendra pas —
sauf si quelque chose le vérifie. Trois dispositifs, aucun ne demande d'effort au
quotidien.

**Le cliquet.** Un fichier enregistre l'état actuel — taille des fichiers, nombre
d'avertissements, poids du paquet livré, ce qu'on veut. La vérification échoue
**si une valeur dépasse sa propre marque**, jamais parce qu'elle est déjà haute.
On n'exige donc aucun grand rangement : on interdit seulement d'empirer, et
chaque amélioration abaisse la marque. **Le projet ne peut plus qu'aller dans le
bon sens, sans qu'on ait jamais à décider d'un chantier.**

C'est le dispositif le plus rentable de toute cette méthode, et il s'applique à
n'importe quel projet — taille des fichiers, couverture de tests, temps de
démarrage, poids d'une page.

**La détection de ce qui est mort.** Ce que plus personne n'appelle est signalé.
Sans ça, le code mort s'accumule sans bruit : sur Hermès Hub, une fonction est
restée inutilisée depuis le premier jour et une autre était morte au moment de
la refonte — non par négligence, mais parce que **rien ne signalait leur mort**.

**Se greffer sur une habitude qui existe déjà.** Ces vérifications doivent partir
avec une commande qu'on lance **de toute façon** — celle du build, celle du
commit. Un rituel de plus, à lancer en conscience, meurt en trois semaines.

---

**Ce qui en sort.** À chaque tranche : quelque chose qui s'ouvre, et une trace
écrite de ce qui a été décidé en chemin.

**La porte, à chaque tranche.** Ça se démontre en cliquant. Et la ligne
« **Ensuite :** » est écrite — les deux prochains coups, une phrase chacun. C'est
elle, et pas un fichier tenu à la main, qui porte le point de reprise : un mémo
séparé pourrit dès que la séance s'arrête mal, c'est-à-dire pile quand on en a
besoin.

---

## Étape 7 — Le produit à éprouver

**Ce qu'on fait.** On joue le parcours entier **à la souris**, comme quelqu'un
qui découvre, en notant chaque endroit où l'on se retrouve coincé.

**Le piège évité.** Croire qu'une donnée qui existe prouve qu'un geste aboutit.
Vécu : la route qui *lisait* les livrables d'un pôle a été éprouvée sur les
vraies données, dix fichiers rendus. On en a conclu que le bouton « Ouvrir le
dossier » marchait. Il ne pouvait pas — un `await` manquait dix-huit lignes plus
bas. **Prouver que la donnée existe n'est pas prouver que le geste aboutit.**

**En clair.** Les tests automatiques attrapent ce qu'on a pensé à leur demander.
Le parcours joué en vrai attrape le reste — et le reste est la majorité.

**Et on confronte l'annoncé au rendu.** Le plan de l'étape 3 disait ce qui devait
exister à la fin ; on met les deux listes côte à côte. C'est immédiat, et ça
attrape le seul cas vraiment coûteux : celui où le travail paraît fini et qu'il
manque une pièce que personne ne cherche.

**Ce qui en sort.** Une liste de frictions… qui repart à l'étape 1. La méthode
est une boucle, pas une ligne.

**La porte.** Quelqu'un qui n'a pas participé arrive à faire la chose principale
sans qu'on lui explique — et l'annoncé correspond au rendu.

---

## Deux dispositifs, pour les projets longs seulement

À proposer quand un projet dure des mois, ou quand la mémoire **est** le sujet.
Sur un travail de deux semaines, ils coûtent plus qu'ils ne rapportent.

### Le document qui ne peut pas mentir

Un document de référence — un index, une liste de composants, un inventaire — a
un défaut fatal : il est vrai le jour où on l'écrit, et faux au troisième
changement. Or un index faux **envoie chercher au mauvais endroit avec
assurance** : il est pire qu'une absence d'index.

Le remède tient dans un partage :

| La partie | Qui l'écrit | Ce qu'elle garantit |
|---|---|---|
| **Les faits** — la liste, les valeurs, les emplacements | un script, régénéré à chaque fois | elle **ne peut pas** mentir |
| **Le sens** — à quoi ça sert, pourquoi c'est ainsi | un humain, une fois | elle vaut ce que vaut son auteur |

Et le script vérifie une chose de plus : qu'aucun élément du code n'a été
**oublié** dans la prose, et qu'aucun élément de la prose n'a **disparu** du code.
Il ne réécrit pas les phrases — il refuse simplement que l'inventaire et la
réalité divergent.

Un document tenu ainsi se relit dans un an sans méfiance. C'est rare.

### La mémoire du projet, à trois étages

Un projet long oublie son propre raisonnement. Trois mois après, on ne sait plus
pourquoi une chose est ainsi, et on rouvre un débat déjà tranché.

La même architecture sert à la mémoire d'un produit et à celle d'un projet :

| L'étage | Dans un projet | Sa vie |
|---|---|---|
| **Le courant** | la conversation ou la séance en cours, en entier | éphémère — il se vide en se résumant |
| **L'index** | une ligne par séance : sujet, décision, ce qui a été touché | s'accumule, se replie par projet clos |
| **Le durable** | les décisions et leur pourquoi — le journal de décisions | ne se résume jamais, ne s'efface jamais |

**L'invariant qui fait tenir l'ensemble : les étages ne contiennent jamais la
même chose.** Pas trois copies — un tuyau. Une séance est *courante* tant qu'elle
n'est pas résumée ; à sa clôture elle devient une ligne d'index et cesse d'être
courante. Aucun recouvrement, donc aucune contradiction possible.

Deux règles de service :

- **l'index n'est pas de la prose libre.** « On a parlé de la veille » est
  introuvable trois mois plus tard ; « Veille — 5 sites, tableau + PDF, rendu
  `veille.md` » se retrouve. **La structure est ce qui rend retrouvable** ;
- **un projet clos s'archive en un seul document**, et quitte l'index. L'index
  cesse alors de grossir avec le temps : il grossit avec le nombre de projets
  **ouverts**, une quantité qu'on tient à dix ou quinze.

Et le moment de l'archivage est utile en lui-même : **archiver, c'est décider ce
qui reste.** Ce qui a valeur générale monte à l'étage durable ; le reste part
dans l'archive.

*C'est, à un siècle près, la théorie des trois âges des archivistes — courantes,
intermédiaires, définitives, formalisée en 1961 et toujours en vigueur aux
Archives nationales. Rien à inventer, là non plus.*

---

## Ce qui fait échouer la méthode

**Coder à l'étape 3.** C'est la faute la plus fréquente et la plus coûteuse. Le
plan a l'air fini, le code démange. On perd la maquette, donc la seule chance de
se tromper pour pas cher.

**Un plan sans « pourquoi ».** Il devient faux au premier imprévu et personne ne
sait s'il est encore valable.

**Une maquette trop belle.** Si elle ressemble à un produit fini, on discute des
pixels au lieu du parcours — et on n'ose plus la jeter.

**Repousser le nettoyage.** Voir l'étape 6. Le grand rangement de la fin n'existe
pas.

**Sauter le parcours final** parce que « les tests passent ». Ils passent sur ce
qu'on leur a demandé.

---

## Les notions, ramassées

| L'étape | La notion, son nom, sa date |
|---|---|
| 1 | **Parcours cognitif** — *cognitive walkthrough*, Polson & Lewis, 1990 |
| 2 | **Mesurer avant de planifier** — l'inconnue qui commande se lève d'abord |
| 3 | **Journal de décisions** — *Architecture Decision Records*, Nygard, 2011 |
| 4 | **Prototypage basse fidélité** et **système de design** — *design-first* |
| 5 | **Spike** — expérience jetable et limitée dans le temps, issue de l'Extreme Programming |
| 6 | **Tranche verticale**, **règle du boy-scout**, **dette technique** — Cunningham, 1992 |
| 6 | **Le cliquet** — interdire d'empirer plutôt qu'exiger de ranger |
| 7 | **Recette** et parcours joué à la main — ce que les tests ne voient pas |
| longs projets | **Document généré / prose vérifiée** — un index qui ne peut pas mentir |
| longs projets | **Mémoire à trois âges** — courant, intermédiaire, définitif ; Pérotin, 1961 |
