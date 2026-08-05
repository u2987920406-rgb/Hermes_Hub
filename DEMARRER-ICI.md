# Démarrer une séance sur Hermès Hub

> ⏱ **Achevé** le 4 août 2026 à **14:42** · **révisé** le 5 août 2026 à **18:15**
> détail : `git log --follow -- DEMARRER-ICI.md`
> **Le document le plus récent l'emporte.** Compare cette ligne avant d'appliquer.

> Ce fichier ne contient **aucun état** — volontairement. Un mémo d'avancement
> tenu à la main pourrit dès que la séance s'arrête mal, c'est-à-dire pile quand
> on en a besoin. Ici, seulement : où lire, quelles règles, et par quoi ouvrir.

---

## Le projet en trois lignes

Hermès Hub est une **interface web locale** qui pilote une équipe d'agents IA par
la ligne de commande `hermes`. Serveur Node **sans aucune dépendance**, interface
React construite par Vite. La V2 vit sur la branche `v2` ; `main` reste figée sur
ce qui est livré aux clients.

---

## Où lire, et dans quel ordre

| # | Fichier | Ce qu'on y trouve |
|---|---|---|
| 1 | `PLAN-DE-TRAVAIL.md` | **l'état exact, les six chantiers, l'ordre.** Commence toujours par lui |
| 2 | `git log -1` — **ici même**, ce dossier est la racine du dépôt | le point de reprise réel, dans la ligne « Ensuite : » |
| 3 | `PLAN-ORCHESTRATION-STUDIO.md` | le **pourquoi** de chaque décision, et la mémoire à trois étages (§8) |
| 3 bis | `VISION-STUDIO.md` | la vision du Studio et de l'Orchestration, partiellement arbitrée. **Entré dans le dépôt le 4 août** — il dormait sur le Bureau |
| 4 | `maquette-parcours.html` | **la maquette validée. Elle fait foi en cas de doute** |
| 5 | `FRICTIONS-PARCOURS.md` | les 20 frictions et 8 couplages, numérotés |
| 6 | `GRAMMAIRE-PANNEAUX.md` | replier / fermer / agrandir, et la conduite de l'attente |
| 7 | `Hermes-Hub/ARCHITECTURE.md` | la règle de découpe et le cliquet |
| 8 | `Hermes-Hub/DESIGN.md` | **à lire avant de toucher à l'interface** — index des zones |
| 9 | `ADM.md` | les décisions durables et leurs raisons |
| 10 | `PLAN-V2.md` | l'étude V2 d'ensemble (31 juillet) — le périmètre large, dont la refonte n'est qu'une part |
| 11 | `CONFRONTATION-HERMES-WEBUI.md` | ce qu'on a trouvé **dans le code d'Hermès et d'une interface tierce** (5 août). À lire avant le chantier 5 : le cerveau par tâche, le YOLO gelé, le journal `task_events`. Porte aussi ses trois erreurs, gardées exprès |

**L'état ne vit qu'aux points 1 et 2.** Tout le reste est durable et ne périme
pas.

---

## Les règles qui ne se devinent pas

- **Aucune commande git sans accord explicite** — ni `add`, ni `commit`, ni
  `push`. Le dépôt versionne `dist/` : un commit automatique embarquerait une
  interface construite dans ce qui est livré aux clients.
- **`git` n'est pas dans le PATH** : `& "C:\Program Files\Git\cmd\git.exe"`.
- **`npm run build` après toute modification de `src/`** — le serveur sert
  `dist/`, pas `src/`. Une modification non construite ne se voit nulle part.
- **`npm run design` doit passer** — il refuse un commit dont les zones neuves ne
  sont pas documentées. Il a déjà eu raison.
- **Lire `DESIGN.md` avant de toucher à l'interface.** C'est la seule règle du
  dépôt qui n'a pas d'exception.
- **Chaque commit finit par une ligne « Ensuite : »** — les deux prochains coups,
  une phrase chacun.
- **Ne pas lancer `maj-hub.bat` sans accord** : il remplace le Hub installé.
- **Regarder le rendu, pas seulement la compilation.**

---

## Plus aucune vérification suspendue

Les deux qui demandaient la machine ont été jouées le 4 août : Hermès **émet
bien** le bloc structuré (23,5 s, quatre champs, sans outil), et `hermes
profile` ne rend qu'un **compte** de skills — la carte des compétences se bâtit
donc sur `describe` et sur le Coffre, pas sur le dossier `skills/`. Les deux
résultats sont écrits au §2 de `PLAN-DE-TRAVAIL.md`.

**Le chantier 1 est clos.** Le suivant est le chantier 2, les fondations
partagées.

---

## Par quoi ouvrir la séance

> « On reprend Hermès Hub. Lis `PLAN-DE-TRAVAIL.md` et `git log -1`, puis dis-moi
> où on en est et ce que tu proposes comme premier pas. On suit
> `METHODE-PROJET.md`, on en est à l'étape 6. »

Et si le travail à venir n'est pas du code mais de la conception, le dossier
`Fil-Rouge` sur le bureau porte la méthode et ses exemples.
