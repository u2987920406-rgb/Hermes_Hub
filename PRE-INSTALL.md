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
9. Créer le **Vault Obsidian** avec 6 templates
10. Créer le dossier **Hermes Factory Setup** (session vierge, sans mémoire)
11. Placer 3 raccourcis sur ton **Bureau** avec icônes

## Ce qu'il te faut

- **Windows 10 ou 11**
- **Connexion Internet** (pour télécharger les logiciels)
- **Droits administrateur** (l'installateur te demandera)
- **700 Mo d'espace disme** environ

## Ce qui se passe après l'installation

1. **Ouvre Obsidian** → "Open folder as vault" → sélectionne le dossier `Hermes-Raf/Vault` dans tes Documents
2. **Double-clique** sur le raccourci "Lancer Hermes" sur ton Bureau
3. Hermes démarre, tu tapes "Bonjour" et il te guide

## Les 3 raccourcis sur ton Bureau

| Raccourci | Icône | Action |
|-----------|-------|--------|
| Lancer Hermes | ⚡ éclair bleu | Lance Hermes (profil master — tes projets habituels) |
| Hermes Factory Setup | 🔧 tube vert | Lance Hermes sans mémoire (session vierge pour tester) |
| Nouveau Projet | 📁 dossier violet | Crée un nouveau projet + lance Hermes dessus |

## En cas de problème

- Si Hermes ne démarre pas → **redémarre ton PC** puis réessaie
- Si l'installateur plante → relance-le en tant qu'administrateur
- Si tu veux tout supprimer → supprime le dossier `Hermes-Raf` dans tes Documents et les raccourcis sur ton Bureau

## Après l'installation

Tu peux personnaliser Hermes à tout moment :
- `hermes setup` → reconfigurer modèle, provider, outils
- tes fichiers `.hermes.md` dans chaque dossier projet contiennent les règles spécifiques
- ta mémoire globale est dans `C:\Users\<toi>\AppData\Local\hermes\memories\`

---

> **Exemple :** (tu es un artisan entrepreneur qui utilise Hermes pour gérer tes projets et automatiser tes tâches — cette installation met tout ça en place sur ton PC)