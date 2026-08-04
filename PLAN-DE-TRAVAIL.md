# Le plan du plan — Hermès Hub, refonte Orchestration / Studio

> 4 août 2026. Consolidation de toute la séance : ce qui est fait, ce qui est
> décidé, ce qui reste à vérifier, et dans quel ordre attaquer. Ce document
> remplace la mémoire de la conversation — il doit suffire à reprendre seul.
>
> Les décisions elles-mêmes vivent dans `PLAN-ORCHESTRATION-STUDIO.md`, les
> frictions dans `FRICTIONS-PARCOURS.md`, la grammaire dans
> `GRAMMAIRE-PANNEAUX.md`, la découpe dans `ARCHITECTURE.md`. Ici, seulement
> **l'ordre et l'état**.

---

## 1. Où on en est, exactement

### Fait — construit, commité, poussé

La refonte de l'accueil. Commit `393123a` (« L'accueil devient la
conversation ») contient le build (`dist/`) et est poussé sur `origin/v2`.
**Ce paragraphe annonçait encore « ni construit ni commité » : c'était vrai au
moment où il a été écrit, plus au moment où on l'a relu — les deux gestes qui
manquaient ont eu lieu le même jour.**

| Fichier | Ce qui a changé |
|---|---|
| `pages/HomeView.tsx` | l'accueil est devenu la conversation |
| `components/Conversation.tsx` | props `accueil`, `accueilDessous`, `onFilVide` |
| `components/Automatisations.tsx` | variante `alertesSeules` |
| `components/Sidebar.tsx` | le terminal Hermès, en geste discret |
| `pages/ConfigView.tsx` + `App.tsx` | onglet Développement, Clean Agent |
| `DESIGN.md`, `ADM.md` | index et décisions à jour |

### Joué pour de vrai le 4 août, en sandbox (`dev-v2.ps1`), vraie équipe

Le point 1 de l'« Ensuite » du commit. Constats :

- **La bascule salut → conversation marche sans accroc** — envoi net, salut
  effacé, message affiché, passage en « En direct », retour au salut par
  « + Nouvelle ».
- **La garantie V2 tient en vrai** — un message sans `@nom` ne réveille que
  Hermès ; aucun autre agent ne démarre.
- **Écart entre ce que l'accueil affiche et ce qu'Hermès sait déjà.** Le
  bandeau dit *« Hermes ne sait pas qui tu es »* et le salut affiche
  « Bonjour workspace » (le nom vient de `path.basename(WORKSPACE)`,
  `server/index.js:196` — un repli technique, pas un profil). Mais Hermès,
  dans la même session, a répondu *« Reçu, Raf »* : il lit son propre
  `USER.md` partagé (`AppData\Local\hermes\memories`), une source que
  l'accueil ne consulte jamais. Les deux systèmes d'identité — le nom affiché
  par le Hub et la mémoire que relit Hermès — ne se parlent pas. Non tranché,
  pas bloquant, à reprendre si l'identité de l'accueil est retouchée.
  **Reconfirmé par un autre chemin le 4 août :** l'expérience V1, passée en CLI
  sans aucun contexte de Hub, a écrit *« L'utilisateur (Raf) »* de lui-même.
- **Formulaire « Sept questions, une fois pour toutes »** (Configuration >
  Mémoire) affiche « 5 sur 6 » alors que le texte annonce sept questions —
  incohérence d'affichage mineure, non vérifiée plus loin.
- **F1 est tranché** — voir §6.

### Décidé, écrit, **pas commencé**

Tout le reste : la refonte Orchestration / Studio, le vocabulaire, les
interrupteurs, la carte des compétences, la mémoire. Voir §4.

### Validé visuellement

La maquette `maquette-parcours.html` — sept étapes, validée par kuchu. **Elle
fait foi en cas de doute pendant l'exécution.**

---

## 2. Ce qu'il faut vérifier avant d'écrire une ligne

Étape 5 de la méthode. Quatre inconnues commandent le plan, et trois d'entre
elles peuvent le changer. Chacune se lève en une expérience courte et jetable.

| # | L'inconnue | Ce qui change si la réponse est non |
|---|---|---|
| **V1** | Le décomposeur peut-il produire un **résultat attendu** — les livrables nommés d'avance ? | Toute la confrontation annoncé / rendu tombe, et le plan perd sa quatrième part. **La plus lourde des quatre.** |
| **V2** | Peut-on **couper les outils par tour** côté ACP, pour que le mode Discussion soit une vraie garantie ? | L'interrupteur devient un décor. Il faudrait alors le dire autrement — ou y renoncer |
| **V3** | Que rend `server/competences.js` ? Assez pour dessiner la carte des compétences **depuis les vraies données** ? | La carte devrait être tenue à la main, donc elle mentirait. Mieux vaudrait ne pas la faire |
| **V4** | Le chargement paresseux du Studio : combien gagne-t-on vraiment sur les 573 Ko ? | Rien de cassé — mais on saura si ça vaut le détour |

**V1 et V2 sont bloquantes** pour les chantiers 3 et 4. V3 l'est pour le
chantier 5. V4 ne bloque rien.

### Résultats — chantier 1, fait le 4 août

**V1 — le résultat attendu. Faisable, mais pas là où on le cherchait.**
`hermes kanban decompose --json` rend `{ok, reason, fanout, child_ids}` : **aucun
champ pour un livrable attendu, et rien pour l'y mettre.** Mais il n'a pas à le
produire. La carte de plan est écrite par **Hermès** dans le fil, pas par le Hub
depuis le JSON du décomposeur : il lit le graphe et rédige la carte, et il peut
nommer les livrables dans le même souffle. Le format commun existe déjà et n'est
jamais montré à l'écran — c'est exactement son emploi. **Aucun appel modèle
supplémentaire.**
**Éprouvé sur la machine de kuchu le 4 août, et c'est net.** `hermes -z` sur un
scénario de trois tâches, cerveau `tencent/hy3:free` : tableau JSON valide du
premier coup, les quatre champs remplis, **sans aucun outil ni appel
supplémentaire**. Il distingue même de lui-même ce qui revient à l'agent de ce
qui revient à l'humain — `"qui": "L'utilisateur (Raf) avec validation de
l'agent"`. La confrontation annoncé / rendu du chantier 4 tient debout.
*Mesure au passage :* **23,5 s**, le bas de la fourchette ci-dessous, pas les
270 s. F5 reste à traiter, mais l'ordre de grandeur nominal est confirmé.

**⚠ Découverte en chemin, et elle aggrave F5.** Le décompte n'est pas de ~23 s.
Le code note quatre essais du 02/08 sur la même phrase, avec le même cerveau :
**19,7 s · 26,4 s · 95,8 s · 270 s.** Quatre minutes et demie de silence dans une
conversation, ce n'est plus « on dirait une panne », c'est un abandon.
*Conséquence :* le décompte doit montrer **où est le plafond** — le Hub le fait
déjà ailleurs avec `PLAFOND_DECOUPAGE_S` — et il faut se demander si la
préparation d'un plan ne devrait pas être **asynchrone**, c'est-à-dire qu'on
puisse continuer d'écrire pendant. *À trancher au chantier 3.*

**V2 — couper les outils. Non, mais la garantie s'obtient autrement.**
La session ACP s'ouvre par `session/new { cwd, mcpServers: [] }` : **il n'existe
aucun paramètre de panoplie par tour.** En revanche l'agent demande, et le Hub
répond — `session/request_permission`. La garantie du mode Discussion s'obtient
donc **en refusant côté Hub toute demande qui n'est pas une lecture.** Ce n'est
pas une consigne dans un prompt, c'est le Hub qui décide : la garantie tient. Et
les mentions sont lues par le Hub (`lireMentions`), donc ne réveiller personne
est entièrement sous notre contrôle.
*Nuance à écrire dans l'interface :* la promesse exacte est « rien ne s'écrit »,
pas « les outils n'existent pas ».

**V3 — la carte des compétences. À moitié seulement.**
`lireCompetences()` existe et rend des fiches structurées — frontmatter, tags,
titre : ce sont les compétences **prouvées** par un run. Mais **les compétences
déclarées d'un profil ne sont lues nulle part** : `skills` n'apparaît dans le
serveur que dans des commentaires. Un poste neuf, qui n'a encore rien fait,
afficherait donc **une carte vide** — soit le pire message possible.
**Éprouvé sur la machine de kuchu le 4 août — et la réponse déplace la carte.**

`hermes profile show <nom>` rend `Skills: 71` : **un compte, pas une liste**, et
il n'existe pas de `--json`. La CLI n'est donc pas la source. En revanche le
disque l'est, et c'est mieux :
`%LOCALAPPDATA%\hermes\profiles\<nom>\skills\<catégorie>\<skill>\SKILL.md`,
chacun avec un frontmatter riche — `name`, `description`, `tags`, `category`.
Lisible sans CLI et sans appel modèle, exactement comme `competences.js` lit
déjà le Coffre.

**Mais ces skills ne sont pas des compétences de métier**, et c'est ce point qui
change le dessin :

| profil | skills |
|---|---|
| geographe | 74 |
| maquettiste | 71 |
| marc | 71 |
| clean | 70 |
| **default** | **0** |

Quasi identiques d'un agent à l'autre — c'est de l'outillage installé
(`apple-notes`, `findmy`, `github`, `mlops`), pas ce que l'agent sait faire. Une
carte bâtie là-dessus rendrait **tous les agents identiques** et annoncerait
`findmy` comme compétence d'un rédacteur. Et `default` à 0 confirme le pire cas
redouté : la carte vide existe pour de vrai, sur cette machine.

**Ce qui distingue réellement les agents, c'est `hermes profile describe`** —
une phrase de métier, déjà écrite, déjà utilisée par l'orchestrateur kanban pour
router : *« Redige et reformule. Transforme des notes, des listes ou un resultat
d'analyse en texte clair et court […]. Ne trie pas et n'analyse pas de gros
volumes. »*

*Conséquence pour le chantier 5 :* la carte se bâtit sur **`describe`** (le
déclaré) **+ `lireCompetences()`** du Coffre (le prouvé). Le dossier `skills/`
n'y entre pas — au mieux comme « outillage disponible », ailleurs et autrement
nommé.

**V4 — le chargement paresseux. Mesuré, et ça vaut le détour.**

| | Avant | Après | Gain |
|---|---|---|---|
| JavaScript initial | 573,6 ko | **368,2 ko** | −205,4 ko, **−36 %** |
| idem, compressé | 171,4 ko | **105,0 ko** | −66,4 ko, −39 % |
| CSS initial | 69,0 ko | 53,2 ko | −15,8 ko |
| Avertissement Vite « > 500 ko » | présent | **disparu** | |

Vérifié au navigateur : l'accueil ne charge que `index.js`, et le morceau
`StudioView.js` n'est demandé qu'en entrant dans le Studio. Aucune erreur.
**Le changement fait trois lignes** — il est prêt, et il attend le chantier 4
pour ne pas se mélanger au commit de l'accueil.

---

## 3. L'ordre des chantiers

Chacun se termine par quelque chose qu'on peut ouvrir et juger — c'est la règle
de la tranche verticale. Et chacun finit par une ligne `Ensuite :` dans son
commit.

### Chantier 0 — Clore l'accueil *(court)*

Construire, regarder à l'écran, commiter, pousser. Rien à écrire.

**Porte :** le commit est poussé sur `v2`, et l'accueil se comporte comme la
maquette sur la vraie machine, avec les vrais agents.

---

### Chantier 1 — Lever les quatre inconnues *(court)*

Les quatre expériences du §2. Du code jetable, une réponse chiffrée par
inconnue, et une ligne écrite dans le plan pour chacune.

**Porte :** plus aucune étape des chantiers suivants ne repose sur un « ça
devrait marcher ».

---

### Chantier 2 — Les fondations partagées

Ce qui sert aux **trois** écrans, et qu'il serait absurde d'écrire trois fois.

- les **gardes** d'abord : cliquet des tailles, détection des exports morts,
  branchés sur `npm run design`. Ils protègent tout ce qui suit ;
- la **grammaire complétée** : `PanelRightClose/Open`, le hamburger dès qu'il n'y
  a plus de barre latérale, Échap qui ferme partout, la recherche dans un
  contenu long ;
- la **ligne d'alerte et son volet** — une seule ligne, un volet qui glisse à
  droite, identiques sur les trois écrans et en plein écran ;
- le **vocabulaire à l'écran** : « scénario » remplace « pôle », `pole` reste
  dans le code. Et le Studio cesse d'être surnommé « l'atelier » dans les
  commentaires, puisque « Atelier » devient un mode.

**Pourquoi maintenant :** le vocabulaire coûte trois fois plus cher après. Et la
ligne d'alerte est réclamée par les chantiers 3, 4 et 5.

**Porte :** on peut déclencher une fausse autorisation et la voir apparaître au
même endroit sur les trois écrans, plein écran compris.

---

### Chantier 3 — Le chat qui propose un plan

Le cœur du parcours. À la fin de ce chantier, **on peut créer un scénario depuis
la conversation**.

- l'**interrupteur Discussion / Atelier**, avec sa garantie écrite dessous et
  appliquée côté serveur (dépend de **V2**) ;
- la **carte de plan** dans le fil : qui, quoi, comment, **résultat attendu**
  (dépend de **V1**) ;
- les boutons **Valider / Modifier / Refuser**, qui n'existent que parce qu'un
  plan existe ;
- la **bascule proposée** quand une demande en Discussion mérite un plan ;
- l'**indicateur d'attente** qui dit ce qu'il fait pendant les ~23 s *(F5)* ;
- l'**historique** déménage à l'accueil, et le **retour au salut se nomme**
  *(F4, C7)*.

**Porte :** depuis le chat, une demande devient un scénario écrit sur le disque,
en attente, sans qu'aucun agent ait été réveillé.

---

### Chantier 4 — Le Studio et son plan

- le **panneau plan à gauche**, ses trois moments : prévu, en cours, passé ;
- le **couplage** ligne ↔ nœud, dans les deux sens *(C3)* ;
- le Studio **dans le cadre commun**, avec `Maximize2` pour grandir ;
- l'**alerte dans la barre du scénario** en plein écran *(F13)* ;
- **un seul bouton Lancer** — la validation de simulation disparaît *(F11)* ;
- la **confrontation annoncé / rendu** en fin de run *(C8)* ;
- le plan dit **quand une tâche tombe sur l'agent par défaut**, et mène à la
  création d'un spécialiste *(F17, C4)*.

La **découpe des fichiers** de `ARCHITECTURE.md` se fait ici, en écrivant — pas
après.

**Porte :** le parcours entier de la maquette se joue à la souris, du chat au
livrable.

---

### Chantier 5 — Orchestration

**Et pas avant** : voir l'avertissement du §5.

- retirer le volet **Conversation** ;
- retirer la **boîte « Décris ce que tu veux »** — le chat l'a remplacée ;
- trois volets : **Agents et équipes**, **Scénarios**, **Automatisations** ;
- l'**organigramme de compétences**, bâti depuis les vraies données : le
  **déclaré** vient de `hermes profile describe`, le **prouvé** de
  `lireCompetences()` (Coffre). **Pas** du dossier `skills/` d'un profil — voir
  §2, V3 ;
- les **portes de modification manquantes** : décrire un agent — la route existe,
  le geste manque —, et modifier une automatisation, qui n'a ni route ni geste ;
- les compétences d'un agent, à la création et après, avec un **enregistrement
  explicite**.

**Porte :** on compose une équipe, on corrige la description d'un agent, on
modifie une automatisation — sans jamais ouvrir de terminal.

---

### Chantier 6 — La recette

Le parcours joué en entier, à la souris, par quelqu'un qui n'a pas participé si
possible. Les frictions restantes repartent à l'étape 1 de la méthode.

**Porte :** l'annoncé correspond au rendu, et personne n'est resté coincé.

---

## 4. Rien ne doit se perdre — la table de rattachement

Chaque friction et chaque couplage a un chantier. Ce tableau est là pour qu'aucun
ne s'évapore dans l'exécution.

| Réf | Ce que c'est | Chantier |
|---|---|---|
| F1 | La fenêtre du premier lancement recouvre un écran qui invite à écrire | *tranché le 4 août : on garde la fenêtre modale, telle quelle — aucun code à écrire* |
| F2 | « ton équipe » désigne des inconnus | 3 — réglé par le placeholder du mode |
| F3 | Le premier message efface tout | *voulu* — aucun |
| F4 | Le retour au salut ne dit pas qu'il ramène | 3 |
| F5 | 23 s de silence dans un chat | 3 |
| F6 | « pôle » est un mot du dedans | 2 — devient « scénario » |
| F7 | « Modifier » ne promet rien de précis | 3 |
| F8 | On quitte le fil et le fil n'en dit rien | 3 *(= C1)* |
| F9 | Rien ne dit ce qu'on peut toucher dans le graphe | 4 |
| F10 | Graphe et plan arrivent ensemble | 4 *(réglé par C3)* |
| F11 | Deux validations pour un acte | 4 — **tranché : un seul Lancer** |
| F12 | L'autorisation n'arrive pas là où l'on regarde | 2 *(= C2)* |
| F13 | Plein écran = plus de pastille d'alerte | 4 |
| F14 | Rien ne dit qu'un scénario a fini | 2 *(= C5)* |
| F15 | Organigramme et graphe se ressemblent trop | 5 — réglé par la carte des compétences |
| F16 | Le mot « Orchestration » | *reporté* |
| F17 | Personne ne dit que l'équipe ne sait pas faire | 4 *(= C4)* |
| F18 | « le tableau » est un mot du dedans, dans le jalon d'attente | 3 |
| F19 | Rien ne dit qu'on peut écrire pendant qu'un plan se prépare | 3 |
| F20 | Le message de dépassement décrit le chemin sans l'offrir | 3 |
| C1 | La carte de plan porte son état dans le fil, et cite la demande | 3 |
| C2 | L'autorisation apparaît là où l'on est | 2 |
| C3 | Ligne du plan ↔ nœud du graphe | 4 |
| C4 | Le plan mène à « créer un spécialiste » | 4 |
| C5 | Un scénario fini laisse une trace persistante | 2 |
| C6 | Planifier ici, gérer là — avec passerelle | 5 |
| C7 | Le retour au salut se nomme et se voit | 3 |
| C8 | Annoncé confronté au rendu | 4 |

---

## 5. L'avertissement qui compte

**Ne pas retirer la boîte « Décris ce que tu veux » avant que le chat sache
proposer un plan.**

C'est aujourd'hui **le seul chemin** pour créer un scénario. La retirer au
chantier 5 alors que le chantier 3 n'est pas fini enlèverait au produit sa
fonction principale, et personne ne s'en apercevrait tant qu'on ne cherche pas à
créer un scénario.

C'est pour cette seule raison qu'Orchestration passe **après** le chat et le
Studio, alors que c'est le chantier le plus simple des trois.

---

## 6. Ce qui reste ouvert

Deux questions, aucune bloquante.

1. **L'interrupteur de rappel de mémoire** reste-t-il allumé d'une conversation
   à l'autre ? Penchant : oui, parce que le poids s'affiche à chaque usage.
2. **Le mot « Orchestration »** *(F16)* ne dit pas ce qu'il y a derrière. Mineur,
   reporté.

*F1 (la fenêtre du premier lancement) a été tranché le 4 août : on garde la
fenêtre modale telle quelle — voir §1, « Joué pour de vrai le 4 août ».*

---

## 7. Hors périmètre — à rouvrir après

**La mémoire de contexte** — les trois étages, les quatre crans, l'archivage par
projet. Tout est décidé et écrit en section 8 de
`PLAN-ORCHESTRATION-STUDIO.md`, et **rien n'en dépend dans les six chantiers
ci-dessus.** C'est un projet en soi, qui touche le serveur, le Coffre et le
curateur. À reprendre quand la refonte sera livrée et éprouvée.

Deux autres, plus anciennes, qui n'ont pas bougé de la séance :

- la **sauvegarde depuis le Hub** — `hermes backup` existe, le Hub n'a aucun
  bouton. C'était noté « le plus urgent » de la phase 9 ;
- les **clés et modèles depuis le Hub** — un client dont la clé expire doit
  ouvrir un terminal.

Trois de plus, ouvertes le 4 août au soir en rangeant ce plan dans le dépôt :

- **`Fil-Rouge` n'est versionné nulle part.** Le kit de méthode et ses huit
  exemples vivent sur le Bureau, sur ce disque et nulle part ailleurs. C'est du
  travail réutilisable hors d'Hermès — il mériterait son propre petit dépôt.
  **Mais plus par un simple `git init` :** `design-universel/` a rejoint
  `Fil-Rouge/` le 4 août au soir, et c'est **déjà un dépôt** — celui-là même
  qu'Hermès a engendré, `design-universel-kit`. Versionner `Fil-Rouge` sans rien
  dire y enfermerait un dépôt dans un dépôt, exactement le piège du matin même,
  retourné. Il faut donc l'exclure par `.gitignore`, ou le déclarer en
  sous-module — et le choisir, pas le subir. Le `.zip` de séance (167 ko) reste
  dehors dans les deux cas ;
- **trois documents sont restés hors du dépôt** — `RAPPORT-BUG-ACP.md`,
  `ANNULER-RUSTINE-ACP.md`, `TRI-MEMOIRE-HERMES.md`. Ils ne relèvent pas de
  cette refonte, et les faire entrer aurait élargi un commit qui devait rester
  lisible. À décider séparément ;
- **une tension à trancher un jour :** `CLAUDE.md` dit « ne cherche aucun fichier
  de reprise, le dépôt est la mémoire », et ce document porte justement de
  l'état, écrit à la main. Ça tient tant qu'il est tenu à jour ; ça pourrit si
  une séance s'arrête mal — exactement le cas que la règle visait. Si l'état
  descendait entièrement dans les lignes `Ensuite :`, ce fichier n'aurait plus
  qu'à porter l'ordre des chantiers, qui lui ne périme pas.
