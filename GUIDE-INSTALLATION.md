# Guide d'installation - Hermes Agent + Obsidian

Ce guide explique ce que l'installateur va faire, etape par etape.

## Ce dont tu as besoin

- Une **connexion internet** (l'installateur telecharge plusieurs logiciels)
- Les **droits administrateur** (l'installateur se lance en mode admin automatiquement)
- Un PC sous **Windows 10 ou 11**

## Ce que l'installateur va faire

L'installateur suit cet ordre precis:

1. **Windows Terminal** - Installe le terminal moderne de Microsoft (si deja present, passe a la suite)
2. **Python 3.11** - Verifie que Python est installe, l'installe si besoin
3. **Node.js LTS** - Verifie que Node.js est installe, l'installe si besoin
4. **uv + Hermes Agent** - Installe le gestionnaire uv, puis Hermes Agent lui-meme
5. **Verification Hermes** - Verifie que Hermes fonctionne. Si erreur "uv trampoline", il repare automatiquement
6. **Obsidian** - Installe Obsidian (l'outil de notes)
7. **hermes setup** - Lance la configuration de Hermes (modele, provider, cles API)
8. **Questions personnelles** - Pose 9 questions pour construire ta memoire globale
9. **Profil pre-rempli** - Demande si tu veux utiliser le profil pre-rempli (regles deja configurees)
10. **Creation du workspace** - Cree le dossier `Documents\Hermes-<TonPrenom>` avec:
    - Vault/ (coffre memoire, avec templates). Il est **declare
      automatiquement dans Obsidian** : au premier lancement il est deja la,
      il n'y a pas de "Open folder as vault" a faire.
    - Hermes-Clean-Memory/ (dossier de test avec profil vierge)
    - Projets/ (tes projets)
    - Hermes-Hub/ (interface web locale + son serveur)
    - icons/ (icones pour les raccourcis)
    - Lancer-Hermes.ps1, Nouveau-Projet.ps1, etc.
11. **Raccourci Bureau** - Cree un seul raccourci: **Hermes Hub**. Tout part de
    la (lancer Hermes, Clean Agent, creer un projet, ouvrir le coffre), donc le
    Bureau reste propre.

## Apres l'installation

**IMPORTANT**: Apres l'installation, tu dois:

1. **Fermer ce terminal et en rouvrir un nouveau** - pour que le PATH soit mis a jour
2. Si Hermes ne marche toujours pas, **redemarre ton PC**
3. Tu peux lancer Hermes en tapant **`hermes`** dans n'importe quel terminal

## Lancer Hermes

Apres redemarrage du terminal:

- Tape `hermes` dans n'importe quel terminal (Windows Terminal, cmd, PowerShell)
- Ou passe par le Hub: bouton "Discuter avec Hermes" sur l'accueil

## Lancer Hermes Hub (interface web)

- Double-clic sur le raccourci "Hermes Hub" sur le Bureau
- Aucune fenetre de terminal ne s'ouvre: le navigateur affiche l'interface sur
  http://127.0.0.1:4317 et le serveur tourne discretement derriere
- Une icone Hermes apparait pres de l'horloge (souvent rangee sous la fleche
  "Afficher les icones cachees" - on peut la glisser dehors pour l'epingler)
- Clic droit sur cette icone: **Ouvrir le Hub**, **Ouvrir le dossier de
  travail**, ou **Arreter le Hub**. C'est la seule facon de couper le serveur,
  donc plus de risque de le fermer par erreur
- Si tu double-cliques une deuxieme fois alors que le Hub tourne deja, il ouvre
  simplement l'onglet du navigateur au lieu de relancer un serveur.

## Si ca ne marche pas

- Ferme le terminal et relance-le
- Si ca ne marche toujours pas, redemarre ton PC
- Si Hermes affiche une erreur "uv trampoline", relance l'installateur
- Verifie que Python et Node.js sont bien installes: `python --version` et `node --version`
- Cas particuliers (script PowerShell bloque, Hermes corrompu, Hub qui ne
  repond pas): voir `NOTES-DEPANNAGE.md`