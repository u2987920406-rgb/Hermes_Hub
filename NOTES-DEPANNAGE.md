# Notes de depannage

Memo des problemes rencontres sur le terrain et de leur solution.

## Un script PowerShell refuse de demarrer

Message type : *"l'execution de scripts est desactivee sur ce systeme"*.

Windows demarre en politique `Restricted`, qui interdit tout `.ps1`.

Depuis la version actuelle de l'installateur, **les 4 raccourcis du Bureau
passent `-ExecutionPolicy Bypass`** : la manipulation ci-dessous ne devrait
plus etre necessaire pour eux. Elle reste utile pour lancer un `.ps1` a la
main (par exemple `Lancer-Hermes.ps1` depuis un terminal) :

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

`Bypass` dans un raccourci ne vaut que pour le processus lance ; la commande
ci-dessus, elle, modifie durablement le profil de l'utilisateur.

## Supprimer proprement Hermes Agent

Quand l'installation est corrompue (typiquement l'erreur
*"uv trampoline failed to canonicalize script path"*) :

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\hermes\hermes-agent"
```

Puis reinstaller. `fix-hermes.bat` enchaine les deux automatiquement :
suppression, reinstallation via le script officiel, verification du PATH.

## Hermes introuvable apres installation

Le PATH n'est pas rafraichi dans les terminaux deja ouverts.

1. Fermer le terminal et en rouvrir un neuf
2. `hermes --version`
3. Si ca echoue toujours, redemarrer le PC

## Le Hub n'ouvre pas / page blanche

- La fenetre de terminal ouverte par le raccourci **est** le serveur : si elle
  est fermee, le Hub ne repond plus.
- Verifier que Node est installe : `node --version`
- Verifier que le serveur repond : http://127.0.0.1:4317
- Un double-clic alors que le Hub tourne deja rouvre simplement l'onglet.
