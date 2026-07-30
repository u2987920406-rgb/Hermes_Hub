@echo off
chcp 65001 >nul

REM -- Auto-elevate to administrator
net session >nul 2>&1
if errorlevel 1 (
    echo  Demarrage en mode administrateur...
    powershell -Command "Start-Process cmd -ArgumentList '/c \""%~f0"' -Verb RunAs"
    exit /b
)

setlocal EnableDelayedExpansion

echo.
echo  ============================================
echo   HERMES HUB + OBSIDIAN - INSTALLER
echo   Installation complete - 1 dossier organise
echo  ============================================
echo.
REM -- Determiner le chemin de l'installateur pour copier Hermes-Hub
REM Le Hub = interface buildee (dist) + serveur local Node (server), les deux sont necessaires.
REM Il vit dans le depot, sous Hermes-Installer\Hermes-Hub. On accepte aussi
REM l'ancienne disposition (dossier frere) pour les copies deja distribuees.
set "INSTALLER_DIR=%~dp0"
set "HERMES_HUB_SRC=%INSTALLER_DIR%Hermes-Hub"
if not exist "%HERMES_HUB_SRC%\server\index.js" set "HERMES_HUB_SRC=%INSTALLER_DIR%..\Hermes-Hub"

set "HERMES_HOME=%LOCALAPPDATA%\hermes"
set "DOCS=%USERPROFILE%\Documents"

:DemandePrenom
set "PRENOM="
set /p PRENOM="  Ton prenom (sera le nom du dossier dans Documents): "
if "!PRENOM!"=="" (
    echo  Tu dois taper un prenom. Reessaie.
    echo.
    goto DemandePrenom
)
set "WORKSPACE=%DOCS%\Hermes-%PRENOM%"

echo.
echo  Dossier de travail: %WORKSPACE%
echo.

REM == Etape 1: Installer Windows Terminal ==
echo [1/12] Installation de Windows Terminal...
winget install Microsoft.WindowsTerminal --accept-source-agreements --accept-package-agreements
echo   OK - Windows Terminal installe.
echo   ^(Aussi disponible sur Microsoft Store: https://apps.microsoft.com/detail/9n0dx20hk701^)

REM -- Relancer dans Windows Terminal si on n'y est pas deja
if not defined WT_SESSION (
    echo   Relancement dans Windows Terminal...
    wt.exe powershell -NoExit -Command "cmd /c '%~f0'"
    exit /b
)

REM == Etape 2: Verifier Python ==
echo [2/12] Verification de Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo   Python non trouve. Installation via winget...
    winget install Python.Python.3.11 --accept-source-agreements --accept-package-agreements
    echo   Redemarre ce script apres installation de Python.
    pause
    exit /b 1
)
echo   OK - Python installe.

REM == Etape 3: Verifier Node.js ==
echo.
echo [3/12] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   Node.js non trouve. Installation via winget...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    echo   Node.js installe. Redemarre ce script si necessaire.
) else (
    echo   OK - Node.js installe.
)

REM == Etape 4: Installer uv puis Hermes ==
echo.
echo [4/12] Installation de Hermes Agent...
where hermes >nul 2>&1
if errorlevel 1 (
    echo   Installation de uv...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
    echo   Refresh PATH...
    set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
    echo   Installation de Hermes via PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"
    set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
)

REM == Etape 4b: Verification Hermes - reparation si uv trampoline ==
echo.
echo [4b/12] Verification de Hermes...
hermes --version >nul 2>&1
if errorlevel 1 (
    echo   Hermes ne repond pas. Verification de l'erreur uv trampoline...
    powershell -NoProfile -Command "hermes --version 2>&1 | Select-String -Pattern 'trampoline'" > "%TEMP%\hermes_check.txt" 2>&1
    findstr /i "trampoline" "%TEMP%\hermes_check.txt" >nul 2>&1
    if not errorlevel 1 (
        echo   Erreur uv trampoline detectee. Reinstallation de Hermes...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Recurse -Force $env:LOCALAPPDATA\hermes\hermes-agent" 2>nul
        echo   Redemarrage de l'installation...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"
        set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
        echo   Deuxieme verification...
        hermes --version >nul 2>&1
        if errorlevel 1 (
            echo.
            echo  ============================================
            echo   ERREUR: Hermes ne fonctionne toujours pas
            echo  ============================================
            echo   Ferme ce terminal, redemarre ton PC,
            echo   puis relance cet installateur.
            echo.
            pause
            exit /b 1
        )
        echo   OK - Hermes repare avec succes.
    ) else (
        echo   Erreur non trampoline. Hermes peut avoir besoin d'un redemarrage du terminal.
        echo   Si Hermes ne marche pas, ferme ce terminal et relance-le.
        echo   Si ca ne marche toujours pas, redemarre ton PC.
    )
) else (
    echo   OK - Hermes repond correctement.
)
del "%TEMP%\hermes_check.txt" >nul 2>&1

echo.
echo   Si Hermes ne marche pas, ferme ce terminal et relance-le.
echo   Si ca ne marche toujours pas, redemarre ton PC.
echo.

REM == Etape 5: Installer Obsidian ==
echo [5/12] Installation de Obsidian...
winget install Obsidian.Obsidian --accept-source-agreements --accept-package-agreements
echo   OK - Obsidian installe.

REM == Etape 6: Setup Hermes ==
echo.
echo [6/12] Configuration de Hermes - modele, provider, cles API...
echo   Hermes va te guider. Tu pourras changer plus tard.
echo.
hermes setup
echo   OK.

REM == Etape 7: Questions personnelles ==
echo.
echo [7/12] Questions personnelles - ta memoire globale...
echo   Ces infos suivront dans TOUS tes projets.
echo.
echo   Ta memoire globale pourra etre modifiee a tout moment.
echo   Tu pourras la changer plus tard si besoin.
echo.

set /p METIER="  Ton metier ou role: "
echo.
set /p LANGUE="  Ta langue de travail (fr/en/bilingue): "
echo.
set /p STYLE="  Style de reponse prefere (concis/detaille/pedagogique): "
echo.
set /p NIVEAU="  Ton niveau en tech (debutant/intermediaire/avance): "
echo.
set /p PROJET_ACTUEL="  Sur quoi tu travailles en ce moment: "
echo.
set /p OBJECTIF_1M="  Ton objectif dans 1 mois: "
echo.
set /p OBJECTIF_6M="  Ton objectif dans 6-12 mois: "
echo.
set /p TYPE_PROJET="  Type de projets (web/data/IA/automation/tous): "
echo.
set /p RAISON="  Ta principale raison d'utiliser Hermes: "
echo.

set /p PROFIL_RAF="  Utiliser le profil pre-rempli (regles deja configurees) ? (o/n): "
echo.

set MEMORY_RULES=JAMAIS: decisions irreversibles sans accord. Commit sans demander. Supprimer ou acceder fichiers hors cadre sans accord. Inventer une reponse ou mentir. DETESTE: verbosite, hallucinations, coder sans tests, repeter erreurs, suppositions, raccourcis. DOIT: guider via questions quand blocage. Coder en senior expert sinon. Tester avant fini. Honnete sur faisabilite. Ne pas sur-coder. Proactif sans alourdir. Architectures evolutives. Demander accord pour fichiers critiques. Vision sur screenshot. Review visuelle+code par jalon. REPRISE.md par jalon. ADM.md cumulatif. 6 fichiers standard par projet. Vault Obsidian. Revue mensuelle. PROJETS: proactif contextuel - proposer creation projet QUAND conversation devient concrete (jamais systematique). Si accord: creer dossier+6 fichiers, basculer dedans. Notifier changement dossier ENCADRE ROUGE. Au demarrage nouveau projet: demander si utilisateur veut un plan ou en a deja un. Si plan: questions guidees. Si existe: peaufiner ensemble. Valider puis ecrire plan.md.

REM == Etape 8: Creer la structure de dossiers ==
echo.
echo [8/12] Creation du dossier de travail...

mkdir "%WORKSPACE%" 2>nul
mkdir "%WORKSPACE%\Vault" 2>nul
mkdir "%WORKSPACE%\Vault\Projets" 2>nul
mkdir "%WORKSPACE%\Vault\Lessons" 2>nul
mkdir "%WORKSPACE%\Vault\Skills" 2>nul
mkdir "%WORKSPACE%\Vault\Decisions" 2>nul
mkdir "%WORKSPACE%\Vault\Bugs" 2>nul
mkdir "%WORKSPACE%\Vault\Changelog" 2>nul
mkdir "%WORKSPACE%\Vault\Templates" 2>nul
mkdir "%WORKSPACE%\Vault\.obsidian" 2>nul
mkdir "%WORKSPACE%\Hermes-Clean-Memory" 2>nul
mkdir "%WORKSPACE%\Hermes-Hub" 2>nul
mkdir "%WORKSPACE%\Projets" 2>nul
mkdir "%WORKSPACE%\icons" 2>nul

echo   OK - %WORKSPACE%

REM == Etape 9: Vault Obsidian (templates) ==
echo.
echo [9/12] Creation du vault Obsidian...

call :write_templates "%WORKSPACE%\Vault"

REM -- README du vault
(
echo # %PRENOM%-Vault - Cerveau long terme
echo.
echo ## Structure
echo - Projets/ - une note par projet
echo - Lessons/ - ce que tu as appris
echo - Skills/ - competences acquises
echo - Decisions/ - decisions techniques + raisons
echo - Bugs/ - bugs rencontres et resolutions
echo - Changelog/ - journal mensuel des changements IA
echo - Templates/ - modeles de notes
echo.
echo ## Utilisation
echo 1. Ouvre ce dossier comme vault dans Obsidian
echo 2. Hermes nourrit le vault automatiquement apres chaque jalon
echo 3. Revue mensuelle: verifier notes obsoletes
) > "%WORKSPACE%\Vault\README.md"

echo {} > "%WORKSPACE%\Vault\.obsidian\app.json"
echo   OK - Vault cree.

REM == Etape 9b: Copier Hermes Hub ==
echo.
echo [9b/12] Copie de Hermes Hub...

set "HUB_OK=0"
if exist "%HERMES_HUB_SRC%\dist\index.html" if exist "%HERMES_HUB_SRC%\server\index.js" set "HUB_OK=1"

if "%HUB_OK%"=="1" (
    mkdir "%WORKSPACE%\Hermes-Hub\dist" 2>nul
    mkdir "%WORKSPACE%\Hermes-Hub\server" 2>nul
    xcopy "%HERMES_HUB_SRC%\dist\*" "%WORKSPACE%\Hermes-Hub\dist\" /E /Y /Q >nul 2>&1
    xcopy "%HERMES_HUB_SRC%\server\*" "%WORKSPACE%\Hermes-Hub\server\" /E /Y /Q >nul 2>&1
    echo   OK - Hermes Hub copie ^(interface + serveur local^).
) else (
    echo   ATTENTION: Hermes Hub introuvable ou pas encore construit.
    echo   Chemin attendu: %HERMES_HUB_SRC%
    echo   Il faut "dist\index.html" ^(npm run build^) et "server\index.js".
    echo   Le raccourci Hermes Hub ne fonctionnera pas.
)

REM -- Script de lancement du Hub (serveur local Node sur 127.0.0.1:4317)
if "%HUB_OK%"=="1" call :write_hub_launcher "%WORKSPACE%\Hermes-Hub\Lancer-Hermes-Hub.ps1"

REM == Etape 10: Dossier Hermes Clean Agent + bat ==
echo.
echo [10/12] Creation du dossier Hermes Clean Agent...

(
echo # Hermes Clean Agent - Dossier de test
echo.
echo ## Identite
echo Terrain neutre pour tester Hermes sans memoire ni contexte.
echo Lance avec hermes -p clean depuis ce dossier.
echo.
echo ## Regles
echo - Ne jamais memoriser dans ce profil
echo - Ne pas polluer la memoire globale
) > "%WORKSPACE%\Hermes-Clean-Memory\.hermes.md"

REM -- Script PowerShell pour Hermes Clean Agent
set "PS_CLEAN=%WORKSPACE%\Hermes-Clean-Memory\Lancer-Hermes-Clean.ps1"
> "%PS_CLEAN%" echo Write-Host ""
>> "%PS_CLEAN%" echo Write-Host " === Hermes Clean Agent ===" -ForegroundColor Green
>> "%PS_CLEAN%" echo Write-Host " Profil: clean (vierge, mode test)" -ForegroundColor Cyan
>> "%PS_CLEAN%" echo Write-Host " Dossier: $PWD" -ForegroundColor Cyan
>> "%PS_CLEAN%" echo Write-Host ""
>> "%PS_CLEAN%" echo hermes -p clean

REM -- Profil clean
hermes profile create clean >nul 2>&1
if exist "!HERMES_HOME!\.env" (
    copy "!HERMES_HOME!\.env" "!HERMES_HOME!\profiles.clean..env" >nul 2>&1
)
hermes config set model.provider "ollama" -p clean >nul 2>&1
hermes config set model.default "qwen2.5:0.5b" -p clean >nul 2>&1

echo   OK - Hermes Clean Agent + profil clean crees.

REM == Etape 11: SOUL.md + scripts + memoire ==
echo.
echo [11/12] Configuration finale...

REM -- SOUL.md
(
echo Tu es Hermes, un agent IA cree par Nous Research.
echo.
echo PERSONNALITE:
echo - Honnete et direct. Tu dis quand tu ne sais pas.
echo - Pedagogique. Tu expliques simplement, sans jargon inutile.
echo - Concis. Tu vas a l'essentiel. Pas de blabla.
echo - Rigoureux. Tu testes avant de dire que c'est fini.
echo - Prudent. Tu demandes avant d'agir sur quelque chose d'irreversible.
echo.
echo RELATION AVEC L'UTILISATEUR:
echo - Tu guides via des questions quand l'utilisateur bloque sur une competence ou la faisabilite.
echo - Sinon, tu codes comme un senior expert et tu prends des decisions seul.
echo - Tu trouves la solution ensemble uniquement quand c'est necessaire.
echo - Tu es proactif dans l'amelioration sans alourdir.
echo - Tu ne mens jamais pour faire plaisir.
echo - Tu adaptes ton niveau de detail au contexte de l'utilisateur.
echo.
echo PRINCIPES:
echo - L'IA evolue vite. Ce qui etait vrai hier ne l'est plus forcement aujourd'hui.
echo - Verifier vaut mieux que supposer.
echo - Une architecture evolutive vaut mieux qu'une solution rigide.
echo - Ne jamais sur-coder. Faire simple, faire juste.
) > "!HERMES_HOME!\SOUL.md"

REM -- Script nouveau projet PowerShell
call :write_nouveau_projet_ps1 "%WORKSPACE%\Nouveau-Projet.ps1"

REM -- Script lancer Hermes depuis le workspace (PowerShell)
set "PS_HERMES=%WORKSPACE%\Lancer-Hermes.ps1"
> "%PS_HERMES%" echo Write-Host ""
>> "%PS_HERMES%" echo Write-Host " === Hermes ===" -ForegroundColor Blue
>> "%PS_HERMES%" echo Write-Host " Profil: default (master)" -ForegroundColor Cyan
>> "%PS_HERMES%" echo Write-Host " Dossier: $PWD" -ForegroundColor Cyan
>> "%PS_HERMES%" echo Write-Host ""
>> "%PS_HERMES%" echo hermes

REM -- README principal
(
echo # Hermes-%PRENOM% - Espace de travail
echo.
echo ## Structure
echo - Vault/           - Vault Obsidian ^(cerveau long terme^)
echo - Hermes-Clean-Memory/     - Dossier de test ^(profil vierge^)
echo - Projets/         - Tes projets
echo - Hermes-Hub/      - Interface web locale ^(serveur Node, http://127.0.0.1:4317^)
echo - Lancer-Hermes.ps1        - Lance Hermes ^(master^)
echo - Nouveau-Projet.ps1       - Cree un nouveau projet
echo.
echo ## Profils
echo - default ^(master^) - te connait, lance avec: .\Lancer-Hermes.ps1
echo - clean            - vierge, lance avec: .\Hermes-Clean-Memory\Lancer-Hermes-Clean.ps1
echo - projet-*         - isole, cree avec: .\Nouveau-Projet.ps1
echo.
echo ## Demarrage
echo 1. Ouvre Obsidian - Open folder as vault - %WORKSPACE%\Vault
echo 2. Double-clic sur "Lancer Hermes" sur le Bureau
echo 3. Dis a Hermes de memoriser tes infos (voir README)
echo.
echo ## Fichiers standard par projet
echo - .hermes.md  - regles du projet
echo - BRIEF.md    - carte d'identite
echo - REPRISE.md  - avancement ^(ecrase a chaque jalon^)
echo - plan.md     - plan detaille
echo - done.md     - historique termine
echo - ADM.md      - decisions ^(cumulatif, jamais effacer^)
) > "%WORKSPACE%\README.md"

echo   OK - Tout configure.

REM == Etape 12: Copier icones + raccourcis sur le Bureau ==
echo.
echo [12/12] Raccourcis sur le Bureau...

set "SRC=%~dp0"
set "ICONS_SRC=%SRC%icons"

REM -- Copier les icones dans le workspace
if exist "%ICONS_SRC%\hermes-master.ico" copy "%ICONS_SRC%\hermes-master.ico" "%WORKSPACE%\icons\" >nul 2>&1
if exist "%ICONS_SRC%\hermes-clean.ico" copy "%ICONS_SRC%\hermes-clean.ico" "%WORKSPACE%\icons\" >nul 2>&1
if exist "%ICONS_SRC%\nouveau-projet.ico" copy "%ICONS_SRC%\nouveau-projet.ico" "%WORKSPACE%\icons\" >nul 2>&1
if exist "%ICONS_SRC%\hermes-hub.ico" copy "%ICONS_SRC%\hermes-hub.ico" "%WORKSPACE%\icons\" >nul 2>&1

REM -- Creer les raccourcis sur le Bureau via PowerShell
REM On utilise >> pour eviter les problemes de parentheses dans un block ()
REM Les raccourcis utilisent PowerShell au lieu de cmd.exe
set "PS1=%TEMP%\hermes_shortcuts.ps1"
> "%PS1%" echo $ws = New-Object -ComObject WScript.Shell
>> "%PS1%" echo $desktop = [Environment]::GetFolderPath('Desktop')
>> "%PS1%" echo $wsx = '%WORKSPACE%'
>> "%PS1%" echo $icons = "$wsx\icons"
>> "%PS1%" echo $sc1 = $ws.CreateShortcut("$desktop\Lancer Hermes.lnk")
>> "%PS1%" echo $sc1.TargetPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
>> "%PS1%" echo $sc1.Arguments = "powershell -NoExit -Command `"Set-Location '$wsx'; . '$wsx\Lancer-Hermes.ps1'`""
>> "%PS1%" echo $sc1.IconLocation = "$icons\hermes-master.ico, 0"
>> "%PS1%" echo $sc1.WorkingDirectory = $wsx
>> "%PS1%" echo $sc1.Description = 'Lance Hermes (master)'
>> "%PS1%" echo $sc1.Save()
>> "%PS1%" echo $sc2 = $ws.CreateShortcut("$desktop\Lancer Hermes Clean Agent.lnk")
>> "%PS1%" echo $sc2.TargetPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
>> "%PS1%" echo $sc2.Arguments = "powershell -NoExit -Command `"Set-Location '$wsx\Hermes-Clean-Memory'; . '$wsx\Hermes-Clean-Memory\Lancer-Hermes-Clean.ps1'`""
>> "%PS1%" echo $sc2.IconLocation = "$icons\hermes-clean.ico, 0"
>> "%PS1%" echo $sc2.WorkingDirectory = $wsx
>> "%PS1%" echo $sc2.Description = 'Lance Hermes Clean Agent (profil vierge, tests)'
>> "%PS1%" echo $sc2.Save()
>> "%PS1%" echo $sc3 = $ws.CreateShortcut("$desktop\Nouveau Projet.lnk")
>> "%PS1%" echo $sc3.TargetPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
>> "%PS1%" echo $sc3.Arguments = "powershell -NoExit -Command `"Set-Location '$wsx'; . '$wsx\Nouveau-Projet.ps1'`""
>> "%PS1%" echo $sc3.IconLocation = "$icons\nouveau-projet.ico, 0"
>> "%PS1%" echo $sc3.WorkingDirectory = $wsx
>> "%PS1%" echo $sc3.Description = 'Cree un nouveau projet avec 6 fichiers standard'
>> "%PS1%" echo $sc3.Save()
>> "%PS1%" echo $sc4 = $ws.CreateShortcut("$desktop\Hermes Hub.lnk")
>> "%PS1%" echo $sc4.TargetPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\wt.exe"
>> "%PS1%" echo $sc4.Arguments = "powershell -NoExit -ExecutionPolicy Bypass -File `"$wsx\Hermes-Hub\Lancer-Hermes-Hub.ps1`""
>> "%PS1%" echo $sc4.IconLocation = "$icons\hermes-hub.ico, 0"
>> "%PS1%" echo $sc4.WorkingDirectory = "$wsx\Hermes-Hub"
>> "%PS1%" echo $sc4.Description = 'Ouvre Hermes Hub (serveur local + navigateur)'
>> "%PS1%" echo $sc4.Save()
>> "%PS1%" echo Write-Output 'Raccourcis crees sur le Bureau.'
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
del "%PS1%" >nul 2>&1

echo   OK - 4 raccourcis sur le Bureau.

echo.
echo  ============================================
echo   INSTALLATION TERMINEE
echo  ============================================
echo.
echo  Ton dossier: %WORKSPACE%
echo.
echo  Contenu:
echo   - Vault/              (Obsidian)
echo   - Hermes-Clean-Memory/        (tests)
echo   - Projets/            (tes projets)
echo   - Hermes-Hub/         (interface web locale + serveur)
echo   - Lancer-Hermes.ps1   (double-clic = master)
echo   - Nouveau-Projet.ps1  (double-clic = nouveau projet)
echo   - icons/              (icones)
echo   - README.md
echo.
echo  Raccourcis sur le Bureau:
echo   - Lancer Hermes       (eclair bleu = master)
echo   - Lancer Hermes Clean Agent   (tube vert = test)
echo   - Nouveau Projet      (dossier violet = creation)
echo   - Hermes Hub          (ouvre http://127.0.0.1:4317 dans le navigateur)
echo.
echo  PROCHAINES ETAPES:
echo   1. Ouvre Obsidian - Open folder as vault - %WORKSPACE%\Vault
echo   2. Double-clic sur "Lancer Hermes" sur le Bureau
echo   3. Dis a Hermes de memoriser tes infos (voir README)
echo.
echo  IMPORTANT: Ferme ce terminal et rouvre-en un nouveau.
echo  Tu peux lancer Hermes en tapant "hermes" dans n'importe quel terminal.
echo.
pause
exit /b 0

REM ================================================
REM :write_hub_launcher - ecrit le lanceur du Hub
REM   %1 = chemin du .ps1 a creer
REM   Demarre le serveur local et ouvre le navigateur.
REM ================================================
:write_hub_launcher
set "PS_HUB=%~1"
> "%PS_HUB%" echo $env:HERMES_WORKSPACE = '%WORKSPACE%'
>> "%PS_HUB%" echo Set-Location $PSScriptRoot
>> "%PS_HUB%" echo Write-Host ""
>> "%PS_HUB%" echo Write-Host " === Hermes Hub ===" -ForegroundColor Yellow
>> "%PS_HUB%" echo Write-Host " Interface: http://127.0.0.1:4317" -ForegroundColor Cyan
>> "%PS_HUB%" echo Write-Host " Ferme cette fenetre pour arreter le Hub." -ForegroundColor DarkGray
>> "%PS_HUB%" echo Write-Host ""
>> "%PS_HUB%" echo if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
>> "%PS_HUB%" echo     Write-Host " Node.js introuvable. Ferme ce terminal, rouvre-en un neuf." -ForegroundColor Red
>> "%PS_HUB%" echo     Write-Host " Si le probleme persiste, relance installer.bat." -ForegroundColor Red
>> "%PS_HUB%" echo     Read-Host " Entree pour fermer"
>> "%PS_HUB%" echo     exit 1
>> "%PS_HUB%" echo }
>> "%PS_HUB%" echo node "$PSScriptRoot\server\index.js" --open
exit /b 0

REM ================================================
REM :write_templates - ecrit les 6 templates
REM ================================================
:write_templates
set "V=%~1"

(
echo ---
echo type: lesson
echo date: {{date}}
echo project: 
echo tags: []
echo status: active
echo difficulty: 1
echo source: hermes
echo time_spent: 
echo success_rate: 
echo ai_assisted: true
echo before_level: 1
echo after_level: 1
echo obsolescence: none
echo verified_date: {{date}}
echo replaced_by: 
echo ---
echo.
echo # 
echo.
echo ## Description
echo.
echo ## Solution
echo.
echo ## Erreur^(s^) faite^(s^)
echo.
echo ## Liens
echo - [[]]
) > "%V%\Templates\Lesson.md"

(
echo ---
echo type: skill
echo date: {{date}}
echo project: 
echo tags: []
echo status: learning
echo difficulty: 1
echo source: hermes
echo time_spent: 
echo ai_assisted: true
echo before_level: 1
echo after_level: 1
echo obsolescence: none
echo verified_date: {{date}}
echo replaced_by: 
echo ---
echo.
echo # 
echo.
echo ## Competence acquise
echo.
echo ## Comment on l'a apprise
echo.
echo ## Exemple d'utilisation
echo.
echo ## Liens
echo - [[]]
) > "%V%\Templates\Skill.md"

(
echo ---
echo type: decision
echo date: {{date}}
echo project: 
echo tags: []
echo status: active
echo obsolescence: none
echo verified_date: {{date}}
echo replaced_by: 
echo ---
echo.
echo # 
echo.
echo ## Contexte
echo.
echo ## Decision prise
echo.
echo ## Raison
echo.
echo ## Alternatives envisagees
echo.
echo ## Liens
echo - [[]]
) > "%V%\Templates\Decision.md"

(
echo ---
echo type: bug
echo date: {{date}}
echo project: 
echo tags: []
echo status: active
echo difficulty: 1
echo source: hermes
echo time_spent: 
echo success_rate: 
echo ai_assisted: true
echo obsolescence: none
echo verified_date: {{date}}
echo ---
echo.
echo # 
echo.
echo ## Description du bug
echo.
echo ## Cause racine
echo.
echo ## Solution appliquee
echo.
echo ## Erreur^(s^) faite^(s^) avant de trouver
echo.
echo ## Prevention
echo.
echo ## Liens
echo - [[]]
) > "%V%\Templates\Bug.md"

(
echo ---
echo type: project
echo date: {{date}}
echo tags: []
echo status: active
echo obsolescence: none
echo ---
echo.
echo # 
echo.
echo ## Objectif
echo.
echo ## Stack technique
echo.
echo ## Phases / jalons
echo - [ ] Phase 1: 
echo.
echo ## Liens
echo - [[]]
) > "%V%\Templates\Project.md"

(
echo ---
echo type: changelog
echo date: {{date}}
echo ---
echo.
echo # {{date}} - Changements IA
echo.
echo ## Obsolete
echo -
echo.
echo ## Nouveau
echo -
echo.
echo ## A verifier
echo -
) > "%V%\Templates\Changelog.md"

exit /b 0

REM ================================================
REM :write_nouveau_projet_ps1 - script creation projet
REM Ecrit un VRAI script PowerShell propre.
REM ================================================
:write_nouveau_projet_ps1
set "OUT=%~1"

> "%OUT%" echo Write-Host ""
>> "%OUT%" echo Write-Host " === NOUVEAU PROJET ===" -ForegroundColor Cyan
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo $PROJET_NOM = Read-Host "Nom du projet"
>> "%OUT%" echo $SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
>> "%OUT%" echo $PROJET_DIR = Join-Path $SCRIPT_DIR "Projets\$PROJET_NOM"
>> "%OUT%" echo if (Test-Path $PROJET_DIR) {
>> "%OUT%" echo     Write-Host ""
>> "%OUT%" echo     Write-Host "ATTENTION: Un projet nomme '$PROJET_NOM' existe deja." -ForegroundColor Yellow
>> "%OUT%" echo     $CHOIX = Read-Host "Que veux-tu faire ? (e=ecraser / n=nouveau nom / a=annuler)"
>> "%OUT%" echo     if ($CHOIX -eq "e") {
>> "%OUT%" echo         Remove-Item -Recurse -Force $PROJET_DIR
>> "%OUT%" echo     } elseif ($CHOIX -eq "n") {
>> "%OUT%" echo         $PROJET_NOM = Read-Host "Nouveau nom"
>> "%OUT%" echo         $PROJET_DIR = Join-Path $SCRIPT_DIR "Projets\$PROJET_NOM"
>> "%OUT%" echo         if (Test-Path $PROJET_DIR) {
>> "%OUT%" echo             Write-Host "Ce nom existe aussi. Annulation." -ForegroundColor Red
>> "%OUT%" echo             Read-Host "Appuie sur Entree pour fermer"
>> "%OUT%" echo             exit 1
>> "%OUT%" echo         }
>> "%OUT%" echo     } else {
>> "%OUT%" echo         Write-Host "Annulation." -ForegroundColor Yellow
>> "%OUT%" echo         Read-Host "Appuie sur Entree pour fermer"
>> "%OUT%" echo         exit 0
>> "%OUT%" echo     }
>> "%OUT%" echo }
>> "%OUT%" echo $PROJET_OBJ = Read-Host "Decris-moi ton projet en 1 phrase"
>> "%OUT%" echo New-Item -ItemType Directory -Path $PROJET_DIR -Force ^| Out-Null
>> "%OUT%" echo Set-Location $PROJET_DIR
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo Write-Host "Creation des 6 fichiers standard..." -ForegroundColor Green
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo.
>> "%OUT%" echo # .hermes.md
>> "%OUT%" echo $hermesContent = @"
>> "%OUT%" echo # $PROJET_NOM
>> "%OUT%" echo.
>> "%OUT%" echo ## Identite
>> "%OUT%" echo $PROJET_OBJ
>> "%OUT%" echo.
>> "%OUT%" echo ## PREMIERE ACTION OBLIGATOIRE (a effacer apres validation du plan)
>> "%OUT%" echo Des le premier message de l'utilisateur (peu importe ce qu'il dit: bonjour, salut, j'ai un projet, etc.):
>> "%OUT%" echo 1. Si BRIEF.md existe et a deja ete rempli : lire le brief, saluer l'utilisateur par son prenom si present, et continuer directement sans reposer la question du plan.
>> "%OUT%" echo 2. Sinon, repondre: "Bienvenue dans ton projet $PROJET_NOM."
>> "%OUT%" echo 3. Si l'utilisateur n'a pas encore parle d'idee ou de plan, poser: "As-tu deja une idee ou un plan ? Veux-tu qu'on le construise ensemble ?"
>> "%OUT%" echo 4. Si pas d'idee: questions guidees (stack, pourquoi, comment, pour qui)
>> "%OUT%" echo 5. Si idee existe: la peaufiner ensemble
>> "%OUT%" echo 6. Demander si profil isole souhaite (memoire separee)
>> "%OUT%" echo 7. Proposer des exemples si demande
>> "%OUT%" echo 8. Une fois valide, ecrire dans plan.md
>> "%OUT%" echo 9. EFFACER cette section du .hermes.md (pour ne plus reposer la question)
>> "%OUT%" echo 10. Seulement APRES, commencer a coder
>> "%OUT%" echo.
>> "%OUT%" echo ## Regles
>> "%OUT%" echo - Tester avant de dire fini
>> "%OUT%" echo - Review visuelle + code par jalon
>> "%OUT%" echo - REPRISE.md apres chaque jalon
>> "%OUT%" echo - ADM.md pour les decisions (cumulatif, jamais effacer)
>> "%OUT%" echo "@
>> "%OUT%" echo $hermesContent = $ExecutionContext.InvokeCommand.ExpandString($hermesContent)
>> "%OUT%" echo $hermesContent ^| Out-File -FilePath ".hermes.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo # BRIEF.md
>> "%OUT%" echo $briefContent = @"
>> "%OUT%" echo # `$PROJET_NOM - BRIEF
>> "%OUT%" echo.
>> "%OUT%" echo ## Description
>> "%OUT%" echo `$PROJET_OBJ
>> "%OUT%" echo.
>> "%OUT%" echo ## Phase actuelle
>> "%OUT%" echo Demarrage
>> "%OUT%" echo.
>> "%OUT%" echo ## Voir aussi
>> "%OUT%" echo - REPRISE.md pour l'avancement
>> "%OUT%" echo - plan.md pour le plan complet
>> "%OUT%" echo - ADM.md pour les decisions
>> "%OUT%" echo "@
>> "%OUT%" echo $briefContent = $ExecutionContext.InvokeCommand.ExpandString($briefContent)
>> "%OUT%" echo $briefContent ^| Out-File -FilePath "BRIEF.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo # plan.md
>> "%OUT%" echo $planContent = @"
>> "%OUT%" echo # `$PROJET_NOM - Plan
>> "%OUT%" echo.
>> "%OUT%" echo ## Phases
>> "%OUT%" echo (a definir avec Hermes au demarrage)
>> "%OUT%" echo "@
>> "%OUT%" echo $planContent = $ExecutionContext.InvokeCommand.ExpandString($planContent)
>> "%OUT%" echo $planContent ^| Out-File -FilePath "plan.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo # REPRISE.md
>> "%OUT%" echo $repriseContent = @"
>> "%OUT%" echo # `$PROJET_NOM - REPRISE
>> "%OUT%" echo.
>> "%OUT%" echo ## Dernier jalon
>> "%OUT%" echo (a remplir apres le premier jalon)
>> "%OUT%" echo.
>> "%OUT%" echo ## Prochaine etape
>> "%OUT%" echo -
>> "%OUT%" echo "@
>> "%OUT%" echo $repriseContent = $ExecutionContext.InvokeCommand.ExpandString($repriseContent)
>> "%OUT%" echo $repriseContent ^| Out-File -FilePath "REPRISE.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo # done.md
>> "%OUT%" echo $doneContent = @"
>> "%OUT%" echo # `$PROJET_NOM - Done
>> "%OUT%" echo.
>> "%OUT%" echo ## Historique
>> "%OUT%" echo (a remplir au fur et a mesure)
>> "%OUT%" echo "@
>> "%OUT%" echo $doneContent = $ExecutionContext.InvokeCommand.ExpandString($doneContent)
>> "%OUT%" echo $doneContent ^| Out-File -FilePath "done.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo # ADM.md
>> "%OUT%" echo $admContent = @"
>> "%OUT%" echo # `$PROJET_NOM - ADM
>> "%OUT%" echo.
>> "%OUT%" echo ## Decisions (cumulatif, ne jamais effacer)
>> "%OUT%" echo.
>> "%OUT%" echo ### Demarrage
>> "%OUT%" echo - Creation du projet: `$PROJET_OBJ
>> "%OUT%" echo "@
>> "%OUT%" echo $admContent = $ExecutionContext.InvokeCommand.ExpandString($admContent)
>> "%OUT%" echo $admContent ^| Out-File -FilePath "ADM.md" -Encoding utf8
>> "%OUT%" echo.
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo Write-Host " ==============================" -ForegroundColor Green
>> "%OUT%" echo Write-Host "  Projet: $PROJET_NOM" -ForegroundColor Green
>> "%OUT%" echo Write-Host "  Description: $PROJET_OBJ" -ForegroundColor Green
>> "%OUT%" echo Write-Host "  Dossier: $PROJET_DIR" -ForegroundColor Green
>> "%OUT%" echo Write-Host " ==============================" -ForegroundColor Green
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo Write-Host " Lancement de Hermes..." -ForegroundColor Cyan
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo hermes

exit /b 0