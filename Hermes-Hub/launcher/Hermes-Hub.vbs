' Demarre Hermes Hub sans aucune fenetre de terminal.
'
' wscript.exe n'a pas de console : c'est ce qui evite le clignotement d'une
' fenetre noire au lancement. Le serveur vit ensuite dans une icone de la zone
' de notification, geree par Lancer-Hermes-Hub.ps1 (dans le meme dossier).

Set fso = CreateObject("Scripting.FileSystemObject")
dossier = fso.GetParentFolderName(WScript.ScriptFullName)

commande = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dossier & "\Lancer-Hermes-Hub.ps1"""

' 0 = aucune fenetre, False = ne pas attendre la fin du script.
CreateObject("WScript.Shell").Run commande, 0, False
