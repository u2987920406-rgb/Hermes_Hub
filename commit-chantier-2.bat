@echo off
setlocal
chcp 65001 >nul
title Chantier 2 - build, garde-fou, commit, push

REM ---------------------------------------------------------------------------
REM  Ce script fait les cinq gestes du chantier 2, dans l'ordre, et s'arrete au
REM  premier qui echoue. Il ne s'ajoute PAS au commit : il se retire de l'index
REM  avant `git commit`, et reste chez toi en fichier non suivi - a supprimer
REM  quand tu veux.
REM
REM  Rien n'est pousse avant que tu aies vu la branche et la liste des fichiers.
REM ---------------------------------------------------------------------------

set "GIT=C:\Program Files\Git\cmd\git.exe"
set "RACINE=%~dp0"
cd /d "%RACINE%"

echo.
echo ===========================================================================
echo  1/5  Retirer LivrablePole.tsx - remplace par LivrableScenario.tsx
echo ===========================================================================
if exist "Hermes-Hub\src\components\LivrablePole.tsx" (
  del /q "Hermes-Hub\src\components\LivrablePole.tsx" || goto :rate
  echo      supprime.
) else (
  echo      deja absent, rien a faire.
)

echo.
echo ===========================================================================
echo  2/5  npm run design - l'index, le cliquet des tailles, les exports morts
echo ===========================================================================
cd /d "%RACINE%Hermes-Hub"
call npm run design
if errorlevel 1 goto :rate

echo.
echo ===========================================================================
echo  3/5  npm run build - le serveur sert dist/, pas src/
echo ===========================================================================
call npm run build
if errorlevel 1 goto :rate

echo.
echo ===========================================================================
echo  4/5  Ce qui va etre commite
echo ===========================================================================
cd /d "%RACINE%"
"%GIT%" status -sb
if errorlevel 1 goto :rate
echo.
echo  ^>^> Verifie la branche ci-dessus : elle doit etre v2.
echo  ^>^> Ctrl+C pour tout arreter, ou une touche pour commiter et pousser.
pause >nul

"%GIT%" add -A
if errorlevel 1 goto :rate
REM Ce script ne fait pas partie du chantier : il sort de l'index.
"%GIT%" reset -q -- "%~nx0" 2>nul

"%GIT%" commit ^
 -m "Chantier 2 - les fondations partagees" ^
 -m "Les gardes : cliquet des tailles (design/tailles.json) et detecteur d'exports morts (design/exports-morts.json), branches sur npm run design. Le cliquet a mordu cinq fois sur le chantier qui l'introduisait - deux fois a raison (store/alertes.ts et AlerteEssai.tsx sortis de leur carrefour), trois marques relevees a la main pour de la prose : App.tsx, PageHeader.tsx, StudioView.tsx. Le detecteur a attrape trois exports nes le jour meme, exportes au cas ou et importes nulle part." ^
 -m "La grammaire : useEchap generalise (Modal, fenetre de simulation, volet), BoutonRepli + useRepli avec les deux cotes et l'etat retenu, ChampRecherche partage, Ctrl B sur la barre laterale avec son raccourci affiche, menuToujours sur l'en-tete de page pour le plein ecran." ^
 -m "La ligne d'alerte : une seule ligne, un volet qui glisse a droite, sur les trois ecrans ET dans la barre du Studio (F12, C2, C5, F13). Trois natures, un ordre d'urgence. La bande alertesSeules de l'accueil disparait - deux surfaces disaient la meme chose sur un seul ecran." ^
 -m "Le vocabulaire : scenario a l'ecran, pole dans le code (F6). Le Studio n'est plus surnomme l'atelier, Atelier devenant un mode." ^
 -m "Porte non franchie : rien n'a ete joue a l'ecran. Configuration > Developpement > Alerte d'essai ouvre la fausse autorisation." ^
 -m "Ensuite : jouer la porte a l'ecran - alerte d'essai, puis Accueil, Projets, Orchestration et Studio ; puis chantier 3, l'interrupteur Discussion / Atelier et la carte de plan dans le fil."
if errorlevel 1 goto :rate

echo.
echo ===========================================================================
echo  5/5  Pousser sur origin/v2
echo ===========================================================================
"%GIT%" push
if errorlevel 1 goto :rate

echo.
echo  Fait. `git log -1` donnera le point de reprise.
goto :fin

:rate
echo.
echo  ###  ARRETE : l'etape ci-dessus a echoue. Rien de plus n'a ete tente.
echo  ###  Le message d'erreur est juste au-dessus.

:fin
echo.
pause
endlocal
