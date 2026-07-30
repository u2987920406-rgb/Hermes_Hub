# Hermes Agent + Obsidian — Installer

## Comment utiliser
1. Copie le dossier `Hermes-Installer` en entier sur le PC de la personne
   (il contient `Hermes-Hub/`, ne pas separer les deux)
2. Double-clique sur `installer.bat` (il s'auto-elevate en administrateur)
3. Suis les instructions

## Avant de distribuer l'installer
L'installer copie l'interface **deja construite**. Il faut donc, une fois par livraison:

```
cd Hermes-Hub
npm install
npm run build      # produit Hermes-Hub/dist/
```

L'installer cherche `Hermes-Hub/dist/index.html` et `Hermes-Hub/server/index.js`
**dans le dossier `Hermes-Installer`** (l'ancienne disposition en dossier frere
reste acceptee). S'ils manquent, il le dit et le raccourci "Hermes Hub" ne
fonctionnera pas. Le serveur n'utilise que des modules Node natifs : aucun
`npm install` n'est necessaire sur le PC du client.

`Hermes-Hub/dist/` est volontairement versionne pour cette raison ;
`Hermes-Hub/node_modules/` est ignore.

Si `GUIDE-INSTALLATION.md` a change, regenerer le PDF distribue :

```
python generate_guide_pdf.py
```

La sortie est deterministe : un guide inchange ne produit aucun diff.

## Mettre a jour apres une modification du Hub

Le chemin d'une modification est toujours le meme :

```
Hermes-Hub/src/     ->  npm run build  ->  Hermes-Hub/dist/  ->  installer.bat le copie
```

`dist/` etant versionne, **une nouvelle installation embarque toujours la
derniere interface construite** : il n'y a rien a "injecter" dans l'installeur.
La seule regle a retenir est de reconstruire apres avoir touche a `src/`, sinon
`dist/` reste en arriere et l'installeur distribue l'ancienne version.

Pour une installation **deja en place** (un poste ou installer.bat a deja
tourne), `maj-hub.bat` fait la mise a jour sans refaire l'installation :

```
maj-hub.bat
```

Il reconstruit l'interface si les sources sont presentes, trouve
`Documents\Hermes-*`, arrete le Hub s'il tourne, puis remplace `dist/` et
`server/`. Les projets, le vault, la memoire et les profils ne sont pas
touches. Relancer le Hub et faire Ctrl+F5 suffit ensuite.

Pour verifier avant de distribuer que le build correspond bien aux sources :

```
cd Hermes-Hub
npm run build
git status --short        # aucun changement dans dist/ = tout est a jour
```

## Ce que l'installer fait

### Etape 1: Windows Terminal
L'installer installe **Windows Terminal en premier** via winget, avant toute autre chose.
- Commande: `winget install Microsoft.WindowsTerminal`
- Aussi disponible sur le Microsoft Store: https://apps.microsoft.com/detail/9n0dx20hk701

### Workspace dans Documents (pas sur le Bureau)
L'installer cree le dossier de travail dans **Documents**, pas sur le Bureau:
- Chemin: `Documents/Hermes-{Prenom}/`

### Raccourcis sur le Bureau
Les 4 raccourcis sont places sur le **Bureau** mais pointent vers le workspace dans Documents.
- Les raccourcis lancent via **Windows Terminal** (`wt.exe`), pas `cmd.exe` directement
- Icônes personnalisees pour chaque raccourci (dossier `icons/`)

```
Documents/Hermes-{Prenom}/
  ├─ Vault/                  → Vault Obsidian (cerveau long terme)
  │   ├─ Projets/
  │   ├─ Lessons/
  │   ├─ Skills/
  │   ├─ Decisions/
  │   ├─ Bugs/
  │   ├─ Changelog/
  │   ├─ Templates/          → 6 modèles prêts
  │   └─ README.md
  ├─ Hermes-Clean-Memory/    → Dossier de test (profil vierge)
  │   ├─ .hermes.md
  │   └─ Lancer-Hermes-Clean.ps1  → double-clic = test
  ├─ Hermes-Hub/             → Interface web locale
  │   ├─ dist/               → interface construite (React)
  │   ├─ server/             → serveur local Node (sans dependances)
  │   └─ Lancer-Hermes-Hub.ps1    → double-clic = ouvre le Hub
  ├─ Projets/                → Tes projets (créés via Nouveau-Projet.ps1)
  ├─ icons/                  → Icônes des raccourcis
  ├─ Lancer-Hermes.ps1       → double-clic = Hermes master
  ├─ Nouveau-Projet.ps1      → double-clic = créer un projet
  └─ README.md
```

### Hermes Hub (interface web locale)
- Le raccourci "Hermes Hub" demarre le serveur local puis ouvre le navigateur
  sur `http://127.0.0.1:4317`
- La fenetre de terminal qui s'ouvre **est** le Hub : la fermer arrete le serveur
- Le Hub lit et ecrit directement dans le workspace (`Projets/`, `Vault/`), il n'a
  pas de base de donnees separee
- Il n'ecoute que sur `127.0.0.1` : rien n'est expose sur le reseau

## Questions posées (9)
1. Prénom
2. Métier ou rôle
3. Langue de travail
4. Style de réponse préféré
5. Niveau en tech
6. Projet actuel
7. Objectif 1 mois
8. Objectif 6-12 mois
9. Type de projets

Les questions 6-10 (OS, éditeur, langages, frameworks, paquets) sont automatiques.

## Les 3 profils après installation

### default (master)
- Lancé avec: `hermes` ou double-clic sur `Lancer-Hermes.ps1`
- Te connaît, mémoire globale, valable partout
- C'est le profil par défaut quand on ouvre un terminal

### clean (test)
- Lancé avec: `hermes -p clean` ou double-clic sur `Lancer-Hermes-Clean.ps1`
- Vierge, aucune mémoire, pour tester

### projet-* (isolé)
- Créé avec: `Nouveau-Projet.ps1`
- Crée le dossier + les 6 fichiers standard + profil isolé si demandé
- Lancé avec: `hermes -p mon-projet`

## Fichiers standard par projet
- .hermes.md → règles du projet (auto-chargé)
- BRIEF.md → carte d'identité (stable)
- REPRISE.md → avancement (écrasé à chaque jalon)
- plan.md → plan détaillé
- done.md → historique terminé
- ADM.md → décisions + raisons (cumulatif, jamais effacé)

## Vault Obsidian
- 7 dossiers: Projets, Lessons, Skills, Decisions, Bugs, Changelog, Templates
- 6 templates avec champs YAML complets
- Nourri automatiquement par Hermes après chaque jalon
- Revue mensuelle pour gérer l'obsolescence

## Après installation
1. Ouvrir Obsidian → Open folder as vault → Vault/ (dans Documents/Hermes-{Prenom})
2. Double-clic sur "Lancer Hermes" sur le Bureau (s'ouvre dans Windows Terminal)
3. Dire à Hermes de mémoriser tes infos (voir README dans le dossier créé)
4. Double-clic sur "Hermes Hub" pour l'interface web (laisser la fenêtre ouverte)