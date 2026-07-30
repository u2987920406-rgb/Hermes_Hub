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

echo.
echo  ============================================
echo   HERMES HUB - DESINSTALLATION
echo  ============================================
echo.
echo  Ce script va supprimer:
echo   - Hermes Hub s'il tourne (le serveur local sera arrete)
echo   - Hermes Agent (%LOCALAPPDATA%\hermes)
echo   - Le dossier workspace (Documents\Hermes-*)
echo   - Les raccourcis sur le Bureau (Lancer Hermes, Lancer Hermes Clean Agent, Nouveau Projet, Hermes Hub)
echo   - Le profil "clean" (Hermes Clean Agent)
echo.
echo  OBSIDIAN NE SERA PAS SUPPRIME.
echo  (tu peux le desinstaller manuellement via Parametres > Applications)
echo.
echo  -- ATTENTION: cette action est irreversible --
echo.
set /p CONFIRM="  Veux-tu vraiment tout supprimer ? (o/n): "
if /i not "%CONFIRM%"=="o" (
    echo  Annulation. Rien n'a ete supprime.
    pause
    exit /b
)

echo.
echo  [1/4] Suppression de Hermes Agent...
if exist "%LOCALAPPDATA%\hermes" (
    rmdir /s /q "%LOCALAPPDATA%\hermes" 2>nul
    echo    OK - Hermes Agent supprime.
) else (
    echo    Hermes Agent non trouve, skip.
)

echo.
echo  [2/4] Suppression du workspace dans Documents...

REM -- Arreter Hermes Hub s'il tourne: son serveur verrouille le dossier workspace
REM    (le serveur node, et le PowerShell cache qui tient l'icone de notification)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*Hermes-Hub*index.js*') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*Lancer-Hermes-Hub.ps1*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

set "DOCS=%USERPROFILE%\Documents"
for /d %%D in ("%DOCS%\Hermes-*") do (
    echo    Suppression: %%D
    rmdir /s /q "%%D" 2>nul
)
echo    OK - Workspace supprime.

echo.
echo  [3/4] Suppression des raccourcis Bureau...
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%DESKTOP%\Lancer Hermes.lnk" del /q "%DESKTOP%\Lancer Hermes.lnk" 2>nul
if exist "%DESKTOP%\Lancer Hermes Clean Agent.lnk" del /q "%DESKTOP%\Lancer Hermes Clean Agent.lnk" 2>nul
if exist "%DESKTOP%\Nouveau Projet.lnk" del /q "%DESKTOP%\Nouveau Projet.lnk" 2>nul
if exist "%DESKTOP%\Hermes Hub.lnk" del /q "%DESKTOP%\Hermes Hub.lnk" 2>nul
echo    OK - Raccourcis supprimes.

echo.
echo  [4/4] Suppression du profil "clean" (Clean Agent)...
if exist "%LOCALAPPDATA%\hermes\profiles.clean..env" del /q "%LOCALAPPDATA%\hermes\profiles.clean..env" 2>nul
if exist "%LOCALAPPDATA%\hermes\profiles.clean" rmdir /s /q "%LOCALAPPDATA%\hermes\profiles.clean" 2>nul
echo    OK.

echo.
echo  ============================================
echo   DESINSTALLATION TERMINEE
echo  ============================================
echo.
echo  Hermes Hub a ete completement supprime.
echo.
echo  Ce qui reste sur ton PC:
echo   - Obsidian (a desinstaller via Parametres si besoin)
echo   - Windows Terminal (a desinstaller via Parametres si besoin)
echo   - Python, Node.js, uv (a desinstaller via winget si besoin)
echo.
echo  Pour tout reinstaller: relance installer.bat
echo.
pause