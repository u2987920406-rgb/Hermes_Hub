# Auditer une livraison

Note ecrite apres un bug qui a survecu a un audit complet : `installer.bat`
demandait *"utiliser le profil pre-rempli ?"*, stockait les regles dans une
variable `MEMORY_RULES`... et ne l'ecrivait nulle part. Hermes demarrait donc
sans aucune regle, alors que l'installateur affichait que tout etait configure.

L'audit precedent avait verifie la **forme** (syntaxe des scripts generes,
fichiers references presents, etapes numerotees, execution sans erreur). Aucune
de ces verifications ne pouvait attraper ce defaut.

## Le nom des choses

| Defaut | Nom |
|---|---|
| Variable ecrite, jamais lue | **ecriture morte** (*dead store*) |
| Question posee dont la reponse n'a aucun effet | **no-op silencieux** (*silent no-op*) |
| Etape qui reussit sans rien produire | **succes en trompe-l'oeil** (*false-positive success*) |
| Verifier que ca s'execute, pas que ca produise | **absence d'assertion sur les post-conditions** |

La regle qui les couvre toutes :

> **Toute entree collectee doit avoir un effet observable.
> Toute promesse faite a l'utilisateur doit avoir une assertion qui la verifie.**

## La methode

1. **Manifeste d'artefacts** (*expected-state manifest*). Lister tout ce que la
   livraison doit produire : fichiers, dossiers, raccourcis, cles, entrees de
   configuration. Executer, puis comparer le disque au manifeste. C'est cette
   etape, et elle seule, qui aurait attrape le bug ci-dessus :
   `memories/MEMORY.md` etait attendu, il etait absent.

2. **Tracabilite promesse -> artefact -> assertion**. Chaque phrase affichee a
   l'utilisateur ("9 questions pour construire ta memoire", "coffre cree") et
   chaque ligne de doc doit pointer vers un fichier verifiable. Une promesse
   sans assertion est une promesse non tenue en puissance.

3. **Chasse aux ecritures mortes**. Pour chaque variable definie : est-elle lue
   ailleurs ? Pour chaque `set /p` : sa reponse est-elle utilisee ? Un simple
   `grep` du nom de variable suffit, il faut juste penser a le faire.

4. **Idempotence**. Relancer deux fois doit donner le meme etat : pas de
   doublon, pas d'ecrasement de donnees utilisateur.

5. **Rollback**. La desinstallation retire exactement ce que l'installation a
   cree, et rien d'autre. Tester avec un leurre (un dossier au nom proche qui
   ne doit pas etre touche).

6. **Bac a sable, pas la vraie machine**. Rejouer les sous-programmes avec
   `HERMES_HOME`, `DOCS`, `APPDATA`, `DESKTOP` pointes vers un faux profil.
   C'est ce qui permet de tester la desinstallation sans rien perdre.

7. **Outils du produit lui-meme**. `hermes doctor` verifie l'etat d'une
   installation Hermes ; s'en servir comme oracle plutot que de reimplementer
   ses controles.

## Ce qui ne suffit pas

- "Le script s'execute sans erreur" : un `echo` qui n'ecrit rien reussit.
- "La syntaxe est valide" : du code mort est syntaxiquement parfait.
- "Les fichiers sources sont presents" : ils peuvent n'etre jamais copies.
- "L'interface s'affiche" : un bouton peut appeler une fonction vide.
