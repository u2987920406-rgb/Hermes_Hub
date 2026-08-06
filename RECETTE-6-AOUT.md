# La recette — le parcours joué en entier, à la souris

> ⏱ **Achevé** le 6 août 2026 à **21:43**
> détail : `git log --follow -- RECETTE-6-AOUT.md`
> *Constat, pas arbitrage : ce document n'est pas sous la règle d'horodatage.*

> Chantier 6 du `PLAN-DE-TRAVAIL.md`, c'est-à-dire l'**étape 7** de
> `METHODE-PROJET.md`. Joué le 6 août 2026 entre **21:25 et 21:43**, dans le bac
> à sable (`bac-a-sable-v2`, port 4319), sur la V2 construite le soir même.
>
> **Où la vérification s'arrête** — et il faut le lire avant le reste :
>
> - **Ce n'est pas un œil neuf.** Le plan demande « quelqu'un qui n'a pas
>   participé si possible ». J'ai écrit une partie de ce qui est testé ici, donc
>   je sais où cliquer. Tout ce qui suit est donc un **plancher** : un client en
>   trouvera davantage, pas moins.
> - **Un seul parcours, une seule demande.** Pas de deuxième scénario, pas de
>   reprise après fermeture du Hub, pas d'automatisation, pas de Coffre.
> - **Les moments 1 et 2 du parcours de référence n'ont pas été rejoués** : ils
>   supposent une installation neuve, et le bac à sable porte déjà treize agents
>   et trente-cinq conversations.
> - **Deux autorisations ont été accordées par l'API**, pas à la souris, pour ne
>   pas perdre la fenêtre pendant que j'écrivais. C'est dit là où ça compte.

---

## La demande

> « Prépare un dossier de deux pages sur Hokkaido pour un voyage en février :
> ce qu'il faut voir, comment s'y déplacer, et un mot sur l'histoire de l'île. »

Tapée à **21:25:05** dans le champ de l'accueil. Résultat attendu annoncé par le
plan : `hokkaido-fevrier.pdf`.

**Elle n'a jamais été rendue.** À 21:43, le scénario est arrêté à l'étape 3 sur 5,
et le PDF n'existe pas.

---

## 1. Ce qui tient — sept frictions fermées, vues à l'écran

| Friction | Ce qui a été vu |
|---|---|
| **F4** — le retour ne dit pas qu'il est un retour | Le bouton dit « Revenir à l'accueil ». |
| **F5** — vingt-trois secondes de silence | Le silence est **occupé et chiffré** : « Je regarde si ça mérite un plan… **21 s / 90 s** — tu peux continuer à écrire pendant ce temps », puis « Réponse terminée · 25,6 s ». |
| **F6** — « pôle » est un mot du dedans | Le mot n'apparaît nulle part du parcours. On lit « Plan », « scénario », « étapes ». |
| **F7** — « Modifier » ne promet rien | Trois boutons qui disent ce qu'ils font : **Valider le plan**, **Reformuler la demande**, **Refuser**. |
| **F9** — rien ne me dit ce que je peux toucher | La barre du Studio le dit : « tire une prise pour relier ou pour ajouter, Suppr retire un lien ». |
| **F10** — deux nouveautés en même temps | Le plan est un panneau à gauche, lisible seul ; le graphe est à droite. |
| **F12** — l'autorisation arrive-t-elle là où je regarde ? | Elle arrive à **quatre endroits à la fois** : la ligne du haut, le fil, une pastille sur Orchestration, et un badge **sur la case concernée du graphe**. |

**Et le bilan « ANNONCÉ / RENDU » a fait exactement son travail.** À l'arrêt, le
panneau affiche **0 SUR 1**, `hokkaido-fevrier.pdf` barré en rouge, et « 3
fichiers en plus : climat-relief.md, histoire-hokkaido.md,
itineraires-transport-onsen.md ». **Le produit n'a pas prétendu avoir réussi** —
c'est le geste central de la porte du chantier 6, et il tient.

---

## 2. Ce qui ne tient pas

Ordre de gravité, la plus coûteuse d'abord.

### R1 — Une tâche accomplie se retrouve « À cadrer », et tout s'arrête *(haute)*

L'historien **a écrit son fichier** : `histoire-hokkaido.md`, 2 398 octets, à
21:40, dans le dossier du scénario. Son tour s'est terminé normalement
(`Turn ended: reason=text_response`). Sa tâche est pourtant en `triage`, affichée
« À CADRER », et **les trois étapes suivantes ne partiront jamais**.

Le mot `triage` n'existe nulle part dans `server/` : c'est Hermès qui pose cet
état, le Hub ne fait que le lire. La cause exacte n'a pas été cherchée — ce
n'était pas le rôle de la recette.

**Ce qui coûte le plus n'est pas l'état, c'est qu'il n'offre rien.** Le panneau
de la tâche « À cadrer » ne propose que « Retirer du scénario » : ni « remettre
en circulation », ni un mot sur **ce qu'il faut cadrer**. Le parcours s'arrête là,
sans remède.

**Et c'est un vrai cul-de-sac, mesuré après coup :**

- « **Lancer** » reste actif, on clique, **il ne se passe rien et rien ne le
  dit** — aucune tâche n'est `ready` derrière celle à cadrer ;
- la route de déblocage, celle du bouton « Remettre en circulation », **refuse**
  cet état : `cannot unblock t_c19becdb (not blocked/scheduled?)`.

Autrement dit : le seul geste offert par le produit est de **retirer une étape du
plan**. Un client qui a demandé un dossier en deux pages n'a pas d'autre porte.

### R2 — Le graphe ment quand le scénario s'arrête *(haute, intermittente)*

Au premier arrêt, l'écran montrait la tâche 2 « EN COURS » et la 3 « EN
ATTENTE ». Après un rechargement manuel : « TERMINÉ » et « **BLOQUÉ** » en rouge.
Le client attend devant un graphe qui n'est plus vrai.

**Intermittente, et il faut le dire** : au second arrêt, l'écran a suivi
correctement en direct (`triage` → « À CADRER » sans rechargement). Observé une
fois sur deux ; la cause n'est pas établie.

### R3 — Un scénario qui s'arrête ne fait aucun bruit *(haute)*

Retour à l'accueil deux minutes après l'arrêt : rien. La ligne du haut affiche
encore « « Note synthèse vélo en ville » a fini », d'une séance précédente. Ni
« s'est arrêté », ni « attend ton arbitrage ». **F14 est fermée pour les fins,
pas pour les arrêts** — or l'arrêt est le cas où l'on a le plus besoin d'être
prévenu.

### R4 — Deux chemins pour une seule demande *(haute)*

Hermès a lancé `delegate batch (3 tasks)` **avant** que le plan soit proposé.
Trois spécialistes travaillaient déjà quand on m'a demandé de valider un plan de
cinq étapes. **Mesuré sur le disque** :

- racine du workspace, **21:27**, délégation d'Hermès : `histoire-hokkaido.md`
  (1 062 o), `hokkaido-deplacements-fevrier.md` (8 235 o) ;
- dossier du scénario, **21:31–21:40**, le graphe : `climat-relief.md`,
  `itineraires-transport-onsen.md`, `histoire-hokkaido.md`.

Le même travail deux fois, à deux endroits, sans que rien ne le dise. Et le
premier jeu de fichiers n'apparaît dans aucun bilan.

### R5 — Le plan promet du parallèle, le graphe fait une file indienne *(haute)*

Le COMMENT dit : « le géographe, le guide et l'historien produisent leur contenu
**en parallèle**, puis le rédacteur assemble ». Les cinq liens du graphe sont une
**chaîne stricte** — vérifié sur `/api/orchestration`. C'est la porte du
chantier 6 prise en défaut sur sa propre phrase : l'annoncé ne correspond pas au
rendu, dans le document qui sert de référence à tout le reste.

### R6 — La validation ne mène nulle part *(haute)*

Après « Valider le plan » : « Scénario créé, en attente. Aucun agent n'a été
réveillé — il partira quand tu lanceras le scénario. » **Aucun élément cliquable
dans la carte** (vérifié dans le DOM). Le parcours s'arrête pile à la jonction
chat → Studio ; il faut deviner Orchestration → Scénarios → la vignette.

### R7 — La fenêtre d'autorisation fait 60 s, et rien ne le dit *(moyenne)*

Mesuré dans le journal : `Edit approval request timed out or failed` à **60,01 s**
exactement, puis `Edit approval denied by ACP client` — alors que **personne n'a
refusé**. La carte affiche un compteur qui **monte** (« 8 s », « 30 s ») sans
dire vers quoi. Un compte à rebours dirait ce qu'il reste.

Une autorisation a expiré pendant que je lisais le plan. Le Hub l'a dit
proprement — mais voir R8.

### R8 — « L'agent est reparti sans réponse » donne le travail pour perdu *(moyenne)*

Le fichier `histoire-hokkaido.md` (1 062 o) est complet et de bonne qualité : il a
été écrit malgré l'autorisation expirée, l'agent ayant réessayé (journal, 21:36:11
`tool write_file completed`). La seconde phrase renvoie bien à la trace du tour,
mais « reparti sans réponse » se lit « il n'a rien fait ».

### ~~R9 — « Aucun fichier produit » s'affiche pendant que ça tourne~~ ✅ **corrigé le 6 août à 21:55**

Dès le lancement, le panneau annonçait « Le scénario a tourné mais il n'a rien
écrit ici » — **au passé**, alors que la première tâche démarrait. Cause :
`LivrableScenario` ne recevait pas l'information « ça tourne » et prenait « le
dossier existe » pour « il a tourné ». `BilanRendu`, écrit le même jour, avait la
précaution (`aTourne && !enCours`) ; celui-ci ne l'avait pas.

Le bloc a désormais **quatre** états et non trois. Vu à l'écran dans les deux
sens, sur le scénario « Fiches de lecture coffre en PDF » lancé puis arrêté :

- pendant : « **Rien d'écrit pour l'instant** — Le dossier est prêt et le scénario
  travaille. Les fichiers apparaîtront ici au fur et à mesure que les tâches
  rendent. » (gris, pas d'ambre : ce vide-là n'est pas un problème) ;
- après : « **Aucun fichier produit** — Le scénario a tourné mais n'a rien écrit
  ici… » (ambre, inchangé).

### R10 — Le panneau d'une tâche demande un double-clic *(moyenne)*

Un simple clic sur une case ne fait rien. Le contenu, lui, est excellent :
« Elle ne repartira pas d'elle-même. Corrige ce qui l'a fait échouer — l'énoncé,
l'agent, le modèle — puis remets-la en circulation », deux boutons, et une
confirmation de retrait qui précise « archivée sur le tableau, pas effacée — ce
qu'elle a déjà produit reste consultable dans Hermès ». Le geste d'ouverture est
la seule chose qui ne se devine pas.

**Et il ne dit jamais pourquoi.** « Corrige ce qui l'a fait échouer » sans nommer
la cause — que le Hub connaissait pourtant : l'autorisation expirée.

### R11 — Trois comptes pour une même chose *(moyenne)*

La carte du chat dit « **5 étapes** », la vignette « **6 tâches** », le panneau du
Studio « **6 étapes** ». La sixième est **la demande elle-même**, qui n'est pas
une étape.

### R12 — Les autorisations parlent anglais *(faible)*

« Approve edit: … », « Allow edit », « Deny », au milieu d'une interface
française. C'est le texte d'Hermès repris tel quel.

### R13 — Les descriptions sont coupées au caractère *(faible)*

Dans le panneau du plan : « Geographe · Geographie du Japon : relief, climats,
prefectur ». Pas d'ellipse, coupe au milieu d'un mot.

### R14 — Le badge d'autorisation sur une case fait une dizaine de pixels *(faible)*

Il est au bon endroit — c'est ce qui ferme F12 — mais « ton accord ? » et ses deux
pastilles se visent difficilement.

---

## 3. Deux relevés que j'ai corrigés moi-même

Ils sont ici parce qu'un rapport de recette qui ne dit pas ses erreurs fait
douter du reste.

- **`/api/accords` ne garde pas de demandes fantômes.** J'avais noté que le
  compteur mentait. Faux : chaque demande porte un champ `perimee` et un
  identifiant distinct, et `total` ne compte que les vivantes. C'est **mon
  sondage** qui listait tout sans filtrer.
- **Mes clics ratés ne venaient pas de l'interface** mais d'un facteur d'échelle
  de 1707/1568 entre les coordonnées du DOM et celles de la capture d'écran.

---

## 4. La porte

> « L'annoncé correspond au rendu, et personne n'est resté coincé. »

**Elle n'est pas franchie**, et sur les deux moitiés :

- l'annoncé (`hokkaido-fevrier.pdf`) n'a **pas** été rendu — mais **le produit le
  dit lui-même**, chiffré, sans le maquiller : c'est la moitié qui va bien ;
- je **suis** resté coincé, à l'étape 3, devant une tâche « À cadrer » qui
  n'offrait aucun geste.

**Ce que la recette a prouvé de positif** : le Hub ne ment pas sur son résultat.
Le bilan annoncé/rendu, la carte périmée, la tâche bloquée et son remède, le
décompte du découpage — tout ce qui a été construit pour **dire la vérité au
client** a fonctionné. Ce qui manque est ailleurs : **quand ça s'arrête, personne
ne prévient, et il n'y a pas toujours de porte de sortie.**

Les frictions R1 à R14 repartent à l'**étape 1 de la méthode**.
