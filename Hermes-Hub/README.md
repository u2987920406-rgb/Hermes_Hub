# Hermes Hub

## Ce que fait Hermes Hub
- Liste de projets visuelle avec statut (En cours / Terminé / Factory Setup)
- Lancement d'Hermes par clic sur un projet
- Mode Hermes Factory Setup (session sans mémoire, vierge)
- Accès au Vault Obsidian
- Gestion de la configuration mémoire/profil

## Architecture
- Frontend : React + TypeScript + Vite (react-flow, Zustand, Tailwind)
- Backend : Node + TypeScript + Fastify WebSocket
- Persistance : SQLite (bus de messages = event log + index)
- Packaging : Tauri (multi-OS : Windows, macOS, Linux)
- Source Hermes dans vendor/hermes-src/ (lecture seule, source de vérité)

## Prérequis pour le développement
- Node.js 18+
- npm install -g @anthropic-ai/claude-code (optionnel, pour coder via Claude)
- Hermes Agent installé sur la machine

## Démarrage rapide (en développement)
1. Cloner le repo dans C:\Users\<utilisateur>\Documents\Hermes-Hub\
2. Ouvrir un terminal dans ce dossier
3. npm install
4. npm run dev
5. Ouvre http://localhost:3000 dans le navigateur

## Prérequis pour le packaging Tauri
- Rust installé (via rustup)
- npm run tauri build pour créer l'installateur .msi (Windows)

## Prérequis pour la production chez un client
- C:\Hermes-Hub\ (dossier unique)
- Raccourci Bureau "Hermes Hub"
- Hermes Agent déjà installé sur la machine client
- Connexion Internet (pour les modèles cloud)

## Structure prévue
```
Hermes-Hub/
├── src/               # Code source React + TypeScript
│   ├── App.tsx        # Composant principal
│   ├── components/    # Composants UI
│   │   ├── Sidebar.tsx        # Navigation latérale
│   │   ├── ProjectCard.tsx    # Carte projet
│   │   ├── HomeView.tsx       # Vue d'accueil
│   │   ├── FactoryView.tsx    # Vue Hermes Factory Setup
│   │   ├── VaultView.tsx      # Vue Vault Obsidian
│   │   └── ConfigView.tsx     # Vue configuration
│   ├── hooks/         # Hooks personnalisés
│   ├── store/         # Zustand state management
│   └── types/         # Types TypeScript
├── public/            # Assets statiques (logos, icônes)
├── vendor/hermes-src/ # Source Hermes (lecture seule)
├── package.json
├── vite.config.ts
├── tauri.conf.json
└── README.md
```

## Couleurs et design
- Fond principal : #ffffff (blanc)
- Sidebar : #1a1a2e (bleu nuit)
- Accent : #60a5fa (bleu clair)
- Texte : #1a1a2e (bleu foncé)
- Texte secondaire : #888888 (gris)
- Succès : #16a34a (vert)
- Avertissement : #d97706 (orange)
- Info : #2563eb (bleu)

## Fonctionnalités principales

### Vue Accueil
- Message de bienvenue "Bonjour Raf"
- Liste des projets récents
- Bouton "Nouveau Projet"
- Lien direct vers Hermes Factory Setup
- Lien direct vers Vault Obsidian

### Vue Projets
- Grille de cartes de projets
- Chaque carte : nom, description, statut, date de dernière utilisation
- Boutons par carte : "Lancer Hermes", "Ouvrir le dossier"
- Bouton "+ Nouveau Projet" en haut à droite

### Vue Hermes Factory Setup
- Écran dédié pour lancer Hermes sans mémoire
- Avertissement "Attention : aucune mémoire ne sera conservée"
- Bouton "Lancer Hermes Factory Setup"
- Après utilisation, option pour sauvegarder ou supprimer la session

### Vue Vault Obsidian
- Arbre des dossiers du vault
- Lien pour ouvrir Obsidian
- Dossiers visibles : Scripts, Lessons, Decisions, Bugs, Projects, Changelogs

### Vue Configuration
- Mémoire globale (visualisation et édition)
- Profil actif
- Modèle utilisé
- Provider configuré
- Bouton "Réinitialiser la mémoire"

## Règles de navigation
- Peu importe ce que l'utilisateur clique, Hermes est lancé avec la bonne configuration
- La sidebar reste visible en permanence
- Le contenu change selon la vue sélectionnée
- Le mode Factory Setup ne pollue jamais la mémoire du profil master