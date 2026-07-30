# Pré-requis avant d'installer Hermes Station

## Ce que tu vas installer

En un seul clic, l'installateur va :

1. Installer **Windows Terminal** (si pas déjà fait)
2. Vérifier **Python 3.11**
3. Vérifier **Node.js**
4. Installer **uv** (outil Python)
5. Installer **Hermes Agent** (l'agent IA open-source de Nous Research)
6. Configurer **Hermes** (modèle, provider, outils) — tu sera guidé
7. Installer **Obsidian** (application de notes)
8. Créer ton **workspace** Hermes-Raf dans tes Documents
9. Créer le **Coffre mémoire** avec 6 templates
10. Créer le dossier **Hermes Factory Setup** (session vierge, sans mémoire)
11. Placer le raccourci **Hermes Hub** sur ton Bureau

## Ce qu'il te faut

- **Windows 10 ou 11**
- **Connexion Internet** (pour télécharger les logiciels)
- **Droits administrateur** (l'installateur te demandera)
- **700 Mo d'espace disme** environ

## Ce qui se passe après l'installation

1. **Ouvre Obsidian** → "Open folder as vault" → sélectionne le dossier `Hermes-Raf/Vault` dans tes Documents
2. **Double-clique** sur le raccourci "Hermes Hub" sur ton Bureau
3. Clique sur "Discuter avec Hermes", tu tapes "Bonjour" et il te guide

## Un seul raccourci sur ton Bureau

**Hermes Hub** — c'est la porte d'entrée unique. L'interface s'ouvre dans ton
navigateur et tout part de là :

| Depuis le Hub | Action |
|---------------|--------|
| Discuter avec Hermes | Un terminal pour discuter : revue du coffre, question hors projet, une idée |
| Clean Agent | Session vierge, sans mémoire ni contexte (pour tester) |
| Nouveau projet | Crée le dossier + les 6 fichiers, puis lance Hermes dessus |
| Coffre mémoire | Tes notes long terme (lisibles aussi dans Obsidian) |

Le Hub tourne sans fenêtre de terminal : une icône Hermes apparaît près de
l'horloge, clic droit dessus pour l'arrêter.

## En cas de problème

- Si Hermes ne démarre pas → **redémarre ton PC** puis réessaie
- Si l'installateur plante → relance-le en tant qu'administrateur
- Si tu veux désinstaller → lance `uninstall.bat`. Il te demande d'abord quoi retirer : **tout**, ou **seulement le moteur en gardant tes projets et ton coffre**. Ce qui part va à la corbeille Windows, donc c'est récupérable.

## Après l'installation

Tu peux personnaliser Hermes à tout moment :
- `hermes setup` → reconfigurer modèle, provider, outils
- tes fichiers `.hermes.md` dans chaque dossier projet contiennent les règles spécifiques
- ta mémoire globale est dans `C:\Users\<toi>\AppData\Local\hermes\memories\`

---

> **Exemple :** (tu es un artisan entrepreneur qui utilise Hermes pour gérer tes projets et automatiser tes tâches — cette installation met tout ça en place sur ton PC)