---
name: audit-livraison
description: "Auditer une livraison par ses effets : ce qui est promis doit exister sur le disque."
version: 1.0.0
author: Raf
license: MIT
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [audit, qualite, installeur, verification, post-conditions, recette]
    related_skills: [systematic-debugging, test-driven-development, requesting-code-review]
---

# Audit d'une livraison

Verifier qu'une livraison **produit ce qu'elle promet**, pas seulement qu'elle
s'execute sans erreur.

Ecrite apres un cas reel : un installateur demandait *"utiliser le profil
pre-rempli ?"*, stockait les regles dans une variable, ne l'ecrivait nulle part,
et affichait "configuration terminee". Un audit de syntaxe, de fichiers
references et d'execution etait passe a cote. Seul un manifeste d'artefacts
pouvait l'attraper.

## Regle unique

> Toute entree collectee doit avoir un effet observable.
> Toute promesse faite a l'utilisateur doit avoir une assertion qui la verifie.

## Procedure

### 1. Recenser les promesses

Lire la cible et extraire **tout ce qui est annonce** :
- chaque message affiche a l'utilisateur ("coffre cree", "9 questions...")
- chaque question posee et chaque option proposee
- chaque ligne de la documentation et du README
- chaque etape numerotee

Une promesse = une ligne dans le manifeste. Ne rien resumer : c'est la liste
exhaustive qui fait le travail.

### 2. Construire le manifeste d'artefacts

Pour chaque promesse, ecrire **ce qui doit exister apres coup** : chemin exact
du fichier ou du dossier, cle de configuration, raccourci, entree de registre,
processus lance. Si une promesse ne correspond a aucun artefact verifiable,
c'est deja une anomalie : la signaler.

### 3. Chasser les ecritures mortes

Avant meme d'executer, pour chaque variable definie dans la cible : est-elle
lue ailleurs ? Pour chaque saisie utilisateur : sa valeur est-elle utilisee ?
Un `grep` du nom suffit, il faut seulement penser a le faire.

Faux positif classique : une variable transmise a un processus fils **par
l'environnement** (`$env:MA_VAR` en PowerShell, `os.environ` en Python) n'est
jamais relue sous la forme `%MA_VAR%` dans le script parent. Verifier l'usage
dans les scripts generes avant de conclure.

Symptomes a nommer :
- **ecriture morte** : variable assignee, jamais lue
- **no-op silencieux** : question posee dont la reponse n'a aucun effet
- **succes en trompe-l'oeil** : etape qui retourne 0 sans rien produire

### 4. Executer dans un bac a sable

Rejouer la cible, ou ses sous-programmes isoles, avec les chemins detournes
vers un faux profil : `HERMES_HOME`, `APPDATA`, `DOCS`, `DESKTOP`, `TEMP`.
Ne jamais auditer sur la vraie machine ce qui ecrit ou supprime.

Pour un script long et non rejouable en entier, extraire le sous-programme vise
dans un fichier de test et l'executer seul.

### 5. Comparer le disque au manifeste

C'est l'etape qui trouve les bugs. Pour chaque artefact attendu : present ?
contenu conforme ? Rapporter chaque ecart, meme mineur.

### 6. Idempotence et rollback

- Relancer deux fois : meme etat final, pas de doublon, aucune donnee
  utilisateur ecrasee.
- Desinstaller : retire exactement ce qui a ete cree, et rien d'autre. Tester
  avec un **leurre**, un dossier au nom voisin qui ne doit pas etre touche.

### 7. S'appuyer sur les outils du produit

Si la cible dispose d'un diagnostic (`hermes doctor`, `npm audit`, `--dry-run`),
l'utiliser comme oracle. Mais ne jamais s'y fier seul : un outil de diagnostic
ne signale que ce que son auteur a juge anormal. L'absence d'un fichier peut y
etre affichee comme normale alors que ton manifeste l'exigeait.

## Rapport attendu

Pour chaque anomalie :
1. la promesse concernee, citee
2. l'artefact attendu, chemin exact
3. ce qui a ete constate
4. le nom du defaut (ecriture morte, no-op silencieux, ...)
5. la correction proposee, minimale

Terminer par ce qui **n'a pas pu etre verifie** et pourquoi. Un audit qui ne
declare pas ses angles morts se fait passer pour exhaustif.

## Ce qui ne suffit pas

- "le script s'execute sans erreur" : un `echo` qui n'ecrit rien reussit
- "la syntaxe est valide" : du code mort est syntaxiquement parfait
- "les fichiers sources sont presents" : ils peuvent n'etre jamais copies
- "l'interface s'affiche" : un bouton peut appeler une fonction vide
- "les tests passent" : ils peuvent ne rien affirmer sur l'etat final
