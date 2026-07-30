@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo  ============================================
echo   MISE A JOUR DE HERMES HUB
echo  ============================================
echo.
echo  Met a jour l'interface d'une installation existante,
echo  sans refaire l'installation complete ni toucher a
echo  tes projets, ton vault ou ta memoire.
echo.

REM -- Source: le Hub du depot (ou le dossier frere pour les copies anciennes)
set "SRC=%~dp0Hermes-Hub"
if not exist "%SRC%\server\index.js" set "SRC=%~dp0..\Hermes-Hub"

if not exist "%SRC%\server\index.js" (
    echo  ERREUR: Hermes-Hub introuvable a cote de ce script.
    echo  Chemin attendu: %~dp0Hermes-Hub
    pause
    exit /b 1
)

REM == Etape 1: reconstruire l'interface si les sources sont la ==
if exist "%SRC%\node_modules" (
    echo [1/4] Reconstruction de l'interface...
    pushd "%SRC%"
    call npm run build
    if errorlevel 1 (
        popd
        echo.
        echo  ERREUR: la construction a echoue. Rien n'a ete copie.
        pause
        exit /b 1
    )
    popd
    echo   OK - interface reconstruite.
) else (
    echo [1/4] Pas de sources ici: on utilise l'interface deja construite.
)

if not exist "%SRC%\dist\index.html" (
    echo  ERREUR: %SRC%\dist\index.html introuvable.
    echo  Lance "npm run build" dans Hermes-Hub.
    pause
    exit /b 1
)

REM == Etape 2: trouver l'installation a mettre a jour ==
echo.
echo [2/4] Recherche de ton espace de travail...
set "DOCS=%USERPROFILE%\Documents"
set "WS="
set /a NB=0
for /d %%D in ("%DOCS%\Hermes-*") do (
    set /a NB+=1
    set "WS=%%D"
)

if %NB%==0 (
    echo   Aucun dossier Documents\Hermes-* trouve.
    echo   Lance d'abord installer.bat.
    pause
    exit /b 1
)

if %NB% GTR 1 (
    echo   Plusieurs espaces de travail trouves:
    for /d %%D in ("%DOCS%\Hermes-*") do echo     %%~nxD
    echo.
    set /p CHOIX="  Lequel mettre a jour (nom exact du dossier): "
    set "WS=%DOCS%\!CHOIX!"
)

if not exist "!WS!\Hermes-Hub" (
    echo   ERREUR: !WS!\Hermes-Hub introuvable.
    pause
    exit /b 1
)
echo   OK - !WS!

REM == Etape 3: arreter le Hub s'il tourne (il verrouille ses fichiers) ==
echo.
echo [3/4] Arret du Hub s'il est lance...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*Hermes-Hub*index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
echo   OK.

REM == Etape 4: copier interface + serveur ==
echo.
echo [4/4] Copie de la nouvelle version...
REM Les anciens bundles portent un nom different a chaque build: on vide
REM assets/ pour ne pas accumuler des fichiers morts a chaque mise a jour.
if exist "!WS!\Hermes-Hub\dist\assets" rmdir /s /q "!WS!\Hermes-Hub\dist\assets"
mkdir "!WS!\Hermes-Hub\dist" 2>nul
mkdir "!WS!\Hermes-Hub\server" 2>nul
xcopy "%SRC%\dist\*" "!WS!\Hermes-Hub\dist\" /E /Y /Q >nul
xcopy "%SRC%\server\*" "!WS!\Hermes-Hub\server\" /E /Y /Q >nul
echo   OK - interface et serveur mis a jour.

echo.
echo  ============================================
echo   MISE A JOUR TERMINEE
echo  ============================================
echo.
echo  Tes projets, ton vault et ta memoire n'ont pas ete touches.
echo.
echo  1. Double-clic sur "Hermes Hub" sur le Bureau
echo  2. Dans le navigateur, Ctrl+F5 pour forcer le rechargement
echo.
pause
