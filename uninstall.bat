@echo off
chcp 65001 >nul

REM -- Auto-elevate to administrator
net session >nul 2>&1
if errorlevel 1 (
    echo  Demarrage en mode administrateur...
    powershell -Command "Start-Process cmd -ArgumentList '/c \""%~f0\"' -Verb RunAs"
    exit /b
)

setlocal EnableDelayedExpansion

REM -- Se mettre a l'abri avant de supprimer le sol sous ses pieds
REM L'installeur depose une copie de ce script dans Depannage\, donc a
REM l'interieur de l'espace de travail que "tout supprimer" envoie a la
REM corbeille. Or cmd lit un .bat ligne a ligne, en gardant le fichier ouvert :
REM un script qui se deplace lui-meme s'interrompt en plein milieu. On repart
REM donc depuis %TEMP%, et on rend la main tout de suite.
if exist "%~dp0..\Vault" (
    set "COPIE=%TEMP%\hermes-desinstallation"
    mkdir "!COPIE!" 2>nul
    copy /y "%~f0" "!COPIE!\uninstall.bat" >nul 2>&1
    if exist "!COPIE!\uninstall.bat" (
        start "" cmd /c ""!COPIE!\uninstall.bat""
        exit /b
    )
)

REM Ces trois chemins sont regroupes ici pour pouvoir rejouer le script sur un
REM faux profil pendant les tests, sans toucher a la vraie machine.
if not defined DOCS call :resoudre_documents
if not defined DESKTOP set "DESKTOP=%USERPROFILE%\Desktop"
if not defined HERMES_HOME set "HERMES_HOME=%LOCALAPPDATA%\hermes"

echo.
echo  ============================================
echo   HERMES - DESINSTALLATION
echo  ============================================
echo.
echo  Deux choses distinctes peuvent partir:
echo.
echo   1. Hermes Agent      le moteur IA et ta memoire globale
echo                        ^(%HERMES_HOME%^)
echo   2. Espace de travail tes projets et ton coffre memoire
echo                        ^(%DOCS%\Hermes-*^)
echo.
echo  Que veux-tu faire ?
echo.
echo   [1] Tout supprimer            moteur + projets + coffre
echo   [2] Garder mes donnees        moteur supprime, projets et coffre conserves
echo   [3] Seulement Hermes Agent    l'espace de travail n'est pas touche
echo   [4] Annuler
echo.
echo  Rien n'est efface definitivement: tout part a la corbeille Windows,
echo  sauf le moteur lui-meme qui se reinstalle avec installer.bat.
echo.
set "CHOIX="
set /p CHOIX="  Ton choix (1-4): "

if "%CHOIX%"=="1" (
    set "MODE_WS=tout"
    set "SUPPR_AGENT=1"
) else if "%CHOIX%"=="2" (
    set "MODE_WS=garder"
    set "SUPPR_AGENT=1"
) else if "%CHOIX%"=="3" (
    set "MODE_WS=aucun"
    set "SUPPR_AGENT=1"
) else (
    echo.
    echo  Annulation. Rien n'a ete supprime.
    pause
    exit /b
)

echo.
if "%MODE_WS%"=="tout" set "RESUME=moteur, projets et coffre"
if "%MODE_WS%"=="garder" set "RESUME=moteur seulement, tes projets et ton coffre restent"
if "%MODE_WS%"=="aucun" set "RESUME=moteur seulement, l'espace de travail n'est pas touche"
echo  Choix retenu: !RESUME!
echo.
set "CONFIRM="
set /p CONFIRM="  Confirmer ? (o/n): "
if /i not "%CONFIRM%"=="o" (
    echo  Annulation. Rien n'a ete supprime.
    pause
    exit /b
)

REM == Etape 1: arreter le Hub, qui verrouille le dossier ==
echo.
echo  [1/4] Arret de Hermes Hub s'il tourne...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*Hermes-Hub*index.js*') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*Lancer-Hermes-Hub.ps1*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo    OK.

REM == Etape 2: le moteur ==
echo.
echo  [2/4] Hermes Agent...
if "%SUPPR_AGENT%"=="1" (
    if exist "%HERMES_HOME%" (
        REM Plusieurs centaines de Mo d'environnement Python: le mettre a la
        REM corbeille la remplirait pour rien, et tout se reinstalle.
        rmdir /s /q "%HERMES_HOME%" 2>nul
        echo    OK - moteur et memoire globale supprimes.
    ) else (
        echo    Deja absent.
    )
) else (
    echo    Conserve.
)

REM == Etape 3: l'espace de travail ==
echo.
echo  [3/4] Espace de travail...
if "%MODE_WS%"=="aucun" (
    echo    Conserve, rien n'a ete touche.
) else (
    set "TROUVE="
    for /d %%D in ("%DOCS%\Hermes-*") do (
        set "TROUVE=1"
        call :traiter_workspace "%%D"
    )
    if not defined TROUVE echo    Aucun espace de travail trouve dans %DOCS%.
)

REM == Etape 4: les raccourcis ==
echo.
echo  [4/4] Raccourcis du Bureau...
if "%MODE_WS%"=="aucun" (
    echo    Conserves ^(le Hub fonctionne encore sans le moteur^).
) else (
    for %%L in ("Hermes Hub" "Lancer Hermes" "Lancer Hermes Clean Agent" "Nouveau Projet") do (
        if exist "%DESKTOP%\%%~L.lnk" del /q "%DESKTOP%\%%~L.lnk" 2>nul
    )
    echo    OK.
)

echo.
echo  ============================================
echo   DESINSTALLATION TERMINEE
echo  ============================================
echo.
if "%MODE_WS%"=="garder" (
    echo  Tes projets et ton coffre memoire sont restes en place:
    REM Meme filtre qu'a la suppression : ne pas citer un dossier personnel
    REM qui porterait le prefixe Hermes- sans etre un espace de travail.
    for /d %%D in ("%DOCS%\Hermes-*") do call :citer_si_workspace "%%D"
    echo.
)
if not "%MODE_WS%"=="aucun" (
    echo  Ce qui a ete jete est dans la corbeille Windows: tant qu'elle n'est
    echo  pas videe, un clic droit "Restaurer" ramene tout.
    echo.
)
echo  Ce qui reste sur ton PC:
echo   - Obsidian, Windows Terminal, Python, Node.js, uv
echo     ^(a desinstaller via Parametres ou winget si besoin^)
echo.
echo  Pour tout reinstaller: relance installer.bat
echo.
pause
exit /b

REM ================================================
REM :resoudre_documents - trouve le vrai dossier Documents
REM   Meme ordre que installer.bat et que Hermes-Hub\server\workspace.js : si les
REM   trois ne s'accordent pas, la desinstallation ne trouve pas l'espace de
REM   travail que l'installation a cree.
REM ================================================
:resoudre_documents
set "DOCS=%USERPROFILE%\Documents"
if exist "%DOCS%" exit /b 0
set "DOCS=%USERPROFILE%\OneDrive\Documents"
if exist "%DOCS%" exit /b 0
set "DOCS=%USERPROFILE%\OneDrive - Personnel\Documents"
if exist "%DOCS%" exit /b 0
set "DOCS=%USERPROFILE%\Documents"
exit /b 0

REM ================================================
REM :citer_si_workspace - affiche le dossier s'il reste un espace Hermes
REM ================================================
:citer_si_workspace
if exist "%~1\Vault" if exist "%~1\Projets" echo    %~1
exit /b 0

REM ================================================
REM :traiter_workspace - traite un dossier Documents\Hermes-*
REM   %1 = chemin du dossier
REM Un dossier personnel nomme "Hermes-quelque-chose" ne doit pas etre
REM confondu avec un espace de travail: on exige ses marqueurs.
REM ================================================
:traiter_workspace
set "WS=%~1"
set "EST_HERMES="
if exist "%WS%\Vault" if exist "%WS%\Lancer-Hermes.ps1" set "EST_HERMES=1"
if exist "%WS%\Vault" if exist "%WS%\.hub" set "EST_HERMES=1"
if not defined EST_HERMES (
    echo    Ignore, ne ressemble pas a un espace Hermes: %~nx1
    exit /b 0
)

if "%MODE_WS%"=="tout" (
    echo    Corbeille: %WS%
    call :corbeille "%WS%" dir
    exit /b 0
)

REM Mode "garder": on retire l'outillage, on laisse Projets\ et Vault\.
for %%X in (Hermes-Hub Hermes-Clean-Memory icons .hub Depannage) do (
    if exist "%WS%\%%X" call :corbeille "%WS%\%%X" dir
)
for %%X in (Lancer-Hermes.ps1 Nouveau-Projet.ps1 README.md) do (
    if exist "%WS%\%%X" call :corbeille "%WS%\%%X" file
)
echo    Nettoye, donnees conservees: %WS%
exit /b 0

REM ================================================
REM :corbeille - envoie un chemin a la corbeille Windows
REM   %1 = chemin, %2 = "dir" ou "file"
REM Le chemin passe par l'environnement: pas de souci de guillemets ni
REM d'apostrophe dans un nom de dossier.
REM ================================================
:corbeille
if not exist "%~1" exit /b 0
set "HUB_RECYCLE_TARGET=%~1"
if "%~2"=="dir" (set "METHODE=DeleteDirectory") else (set "METHODE=DeleteFile")
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::%METHODE%($env:HUB_RECYCLE_TARGET, 'OnlyErrorDialogs', 'SendToRecycleBin')" >nul 2>&1
exit /b 0
