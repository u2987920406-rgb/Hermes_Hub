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

REM Version unique de la livraison : reprise dans les fichiers generes, pour
REM savoir de quelle generation vient le profil d'un poste.
REM
REM ELLE SUIT LA BRANCHE, et il a fallu s'en apercevoir : ce fichier annoncait
REM « INSTALLER v1.0.2 » sur la branche v2, alors qu'il pose le Hub depuis
REM `dist/` et `server/` de la branche courante - donc la V2. Un client aurait
REM lu 1.0.2 a l'ecran, recu la 2.0.0-beta.1, et personne au support n'aurait
REM su ce qu'il avait vraiment sur son poste.
REM
REM Elle doit rester d'accord avec `version.json`, qui est la source lue par le
REM Hub installe pour proposer ses mises a jour.
set "HERMES_VERSION=2.0.0-beta.1"

echo.
echo  ============================================
echo   HERMES HUB + OBSIDIAN - INSTALLER v%HERMES_VERSION%
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
call :resoudre_documents

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
echo [1/13] Installation de Windows Terminal...
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
echo [2/13] Verification de Python...
call :has_python
if errorlevel 1 (
    echo   Python non trouve. Installation via winget...
    winget install Python.Python.3.11 --accept-source-agreements --accept-package-agreements
    call :refresh_path
    call :has_python
    if errorlevel 1 (
        echo.
        echo  ============================================
        echo   ERREUR: Python reste introuvable
        echo  ============================================
        echo   Ferme ce terminal, rouvre-en un neuf,
        echo   puis relance cet installateur.
        echo.
        pause
        exit /b 1
    )
)
echo   OK - Python installe.

REM == Etape 3: Verifier Node.js ==
echo.
echo [3/13] Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   Node.js non trouve. Installation via winget...
    winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    call :refresh_path
    node --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  ============================================
        echo   ERREUR: Node.js reste introuvable
        echo  ============================================
        echo   Ferme ce terminal, rouvre-en un neuf,
        echo   puis relance cet installateur.
        echo.
        pause
        exit /b 1
    )
)
echo   OK - Node.js installe.

REM == Etape 3b: Git ==
REM Pose avant Hermes, pour qu'il le trouve. Hermes s'en sert pour executer des
REM commandes shell (bash.exe) et pour ses fonctions de depot. Son propre
REM installateur sait sinon telecharger un PortableGit dans son coin, mais un
REM git systeme evite le cas vecu ou git est present sans etre dans le PATH:
REM "hermes doctor" le declare alors introuvable et les fonctions concernees
REM sont hors service en silence.
echo.
echo [3b/13] Verification de Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo   Git non trouve. Installation via winget...
    winget install Git.Git --accept-source-agreements --accept-package-agreements
    call :refresh_path
    git --version >nul 2>&1
    if errorlevel 1 (
        echo   ATTENTION: Git reste introuvable dans ce terminal.
        echo   Ce n'est pas bloquant: Hermes telechargera sa propre copie.
        echo   Rouvre une session Windows pour que git soit dans le PATH.
    ) else (
        echo   OK - Git installe.
    )
) else (
    echo   OK - Git deja present.
)

REM == Etape 4: Installer uv puis Hermes ==
echo.
echo [4/13] Installation de Hermes Agent...
REM ETAPE LA PLUS LONGUE, ET LA SEULE QUI PEUT SE FIGER. Le script de Nous
REM telecharge Chromium pour Playwright - 172 Mo - puis l'extrait sans rien
REM afficher. Observe le 03/08/2026 sur un second poste : arrete net apres
REM « 100% of 172.8 MiB », plus aucun CPU, dossier ms-playwright fige a la
REM meme taille sur trois mesures. Huit minutes sans rien.
REM
REM On ne pose PAS de chronometre qui tuerait le processus : sur une ligne
REM lente ce meme telechargement prend legitimement un quart d'heure, et une
REM extraction interrompue laisserait un Chromium a moitie pose que Playwright
REM croirait installe. On prefere le dire a l'utilisateur, parce que le remede
REM est sans risque - c'est le test ci-dessous qui le rend sans risque.
echo   Etape la plus longue: jusqu'a 15 minutes selon la ligne.
echo   Si l'affichage se fige plus de 5 minutes apres "100%% of 172.8 MiB":
echo   ferme cette fenetre et relance l'installateur. Rien n'est perdu, et
echo   le telechargement ne sera pas refait.
echo.
REM On teste que Hermes REPOND, pas seulement qu'il est dans le PATH : une
REM suppression partielle laisse le shim hermes.exe en place alors que le
REM paquet a disparu (ModuleNotFoundError). Avec "where hermes", l'installation
REM etait alors sautee et l'installateur continuait sur une base cassee.
REM
REM C'est aussi ce test qui rend le conseil ci-dessus vrai : Hermes une fois
REM installe, tout le bloc est saute au redemarrage. Verifie en vrai le
REM 03/08/2026 - relance apres blocage, reprise directe a [4b/13].
hermes --version >nul 2>&1
if errorlevel 1 (
    echo   Installation de uv...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
    echo   Refresh PATH...
    set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
    echo   Installation de Hermes via PowerShell...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"
    set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
)

REM == Etape 4b: Verification Hermes - reparation si necessaire ==
REM La reparation ne depend pas du message d'erreur: qu'il s'agisse de
REM "uv trampoline", d'un module hermes_cli manquant ou d'une suppression
REM partielle, le remede est le meme (effacer hermes-agent et reinstaller).
REM Avant, seule l'erreur trampoline declenchait la reparation et tout autre
REM cas se contentait d'un avertissement, laissant l'installation continuer.
echo.
echo [4b/13] Verification de Hermes...
hermes --version >nul 2>&1
if errorlevel 1 (
    echo   Hermes ne repond pas. Reinstallation propre...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -Recurse -Force $env:LOCALAPPDATA\hermes\hermes-agent" 2>nul
    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"
    set "PATH=%USERPROFILE%\.local\bin;%LOCALAPPDATA%\uv;%PATH%"
    echo   Deuxieme verification...
    hermes --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  ============================================
        echo   ERREUR: Hermes ne fonctionne toujours pas
        echo  ============================================
        echo   L'installation s'arrete ici: continuer ecrirait ta memoire
        echo   et tes profils dans une installation cassee.
        echo.
        echo   1. Ferme ce terminal et rouvre-en un neuf
        echo   2. Redemarre ton PC si besoin
        echo   3. Relance cet installateur
        echo.
        pause
        exit /b 1
    )
    echo   OK - Hermes repare avec succes.
) else (
    echo   OK - Hermes repond correctement.
)

REM == Etape 5: Installer Obsidian ==
echo [5/13] Installation de Obsidian...
winget install Obsidian.Obsidian --accept-source-agreements --accept-package-agreements
echo   OK - Obsidian installe.

REM == Etape 6: Setup Hermes ==
echo.
echo [6/13] Configuration de Hermes - modele, provider, cles API...
echo   Hermes va te guider. Tu pourras changer plus tard.
echo.
hermes setup
if errorlevel 1 (
    echo.
    echo  ============================================
    echo   ERREUR: la configuration de Hermes a echoue
    echo  ============================================
    echo   "hermes setup" s'est termine en erreur. L'installation s'arrete:
    echo   repondre aux questions maintenant ecrirait ta memoire dans une
    echo   installation qui ne fonctionne pas.
    echo.
    echo   1. Ferme ce terminal et rouvre-en un neuf
    echo   2. Lance fix-hermes.bat ^(reinstallation propre^)
    echo   3. Relance cet installateur
    echo.
    pause
    exit /b 1
)
echo   OK - Hermes configure.

REM == Etape 7: Questions personnelles ==
echo.
echo [7/13] Questions personnelles - ta memoire globale...
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

REM DEUX QUESTIONS ONT DISPARU D'ICI, et pour la meme raison : elles
REM proposaient un choix que personne ne pouvait faire en connaissance de cause.
REM
REM « Utiliser le profil pre-rempli ? » - sans savoir ce qu'il contenait. Tout
REM le monde repondait oui, et celui qui repondait non repartait sans aucune
REM regle de travail. Les regles sont maintenant posees d'office, et le Hub
REM offre d'en changer avec le contenu sous les yeux.
REM
REM « Installer le service d'automatisation ? » - sans savoir que sans lui,
REM `hermes cron create` REUSSIT, la tache s'affiche, son echeance se calcule,
REM et rien ne part jamais. Une fonction a moitie morte en silence est pire
REM qu'un service en fond. Il est pose d'office, et annonce.
echo.

REM ON N'INSTALLE PAS UN SERVICE EN SILENCE. Ne plus demander ne veut pas dire
REM ne rien dire : un service qui demarre tout seul et dont personne n'a parle
REM est ce qui fait passer un produit pour intrusif. On l'annonce, et on donne
REM la commande pour le retirer - c'est la difference entre imposer et cacher.
echo   Un petit service en fond sera installe : c'est lui qui declenche les
echo   taches programmees ^(« tous les jours a 9h, fais ceci »^), meme Hub ferme.
echo   Il demarre a l'ouverture de session. Pour le retirer plus tard :
echo     hermes gateway uninstall
echo.

REM Le texte des regles vit dans :write_memory_socle et :write_memory_atelier,
REM qui l'ecrivent dans la
REM memoire d'Hermes. Il etait auparavant stocke ici dans une variable que
REM personne ne lisait : la question ci-dessus restait donc sans effet.

REM == Etape 8: Creer la structure de dossiers ==
echo.
echo [8/13] Creation du dossier de travail...

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

REM == Etape 9: Coffre memoire (templates) ==
echo.
echo [9/13] Creation du coffre memoire...

call :write_templates "%WORKSPACE%\Vault"

REM -- La memoire durable : l'archive qui survit a state.db
REM
REM La memoire native d'Hermes capture tout, automatiquement, et c'est sa
REM force ; mais elle est fragile. Un reset vide `state.db`, sa recherche est
REM lexicale - « ia oublie » ne trouve pas « memoire » - et charger une session
REM entiere brule le contexte. A un an, le rappel n'est pas garanti.
REM
REM L'archive posee ici est la seconde couche, sur le disque, qui survit a la
REM purge. Mesure d'un test a l'aveugle soumis a un modele tiers le 02/08/2026,
REM natif contre archive : rappel a un an 3/20 contre 17, survie a un reset
REM 1/20 contre 18, reformulation 4/20 contre 15. Le natif reprend l'avantage
REM sur la session en cours (17 contre 13) - les deux couches sont
REM complementaires, aucune ne remplace l'autre.
REM
REM ON POSE LE MECANISME, JAMAIS DU CONTENU. Les journaux, les resumes et les
REM ancres de session appartiennent au poste qui les produit : `done.json` part
REM vide, `exclusions.json` aussi, et le template attend son premier sujet. Un
REM installateur qui livrerait les souvenirs d'un autre poste ne serait pas un
REM produit.
REM
REM Les scripts calculent leur racine comme le dossier PARENT du leur, et y
REM cherchent `Vault/`, `Projets/` et `Resumes-Sessions/`. Ils vont donc dans
REM `%WORKSPACE%\scripts` et nulle part ailleurs - les ranger plus profond les
REM casserait sans le dire.
if exist "%INSTALLER_DIR%memoire-kit" (
    xcopy "%INSTALLER_DIR%memoire-kit\*" "%WORKSPACE%\" /E /Y /Q >nul 2>&1
    if errorlevel 1 (
        echo   Attention: la memoire durable n'a pas pu etre posee.
    ) else (
        echo   OK - memoire durable : scripts, template de journal, specs.
    )
) else (
    echo   Attention: dossier memoire-kit introuvable, memoire durable ignoree.
)

REM -- README du coffre
(
echo # Coffre memoire de %PRENOM% - Cerveau long terme
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
echo 1. Ouvre Obsidian: ce coffre y est deja declare
echo 2. Hermes nourrit le coffre automatiquement apres chaque jalon
echo 3. Revue mensuelle: verifier notes obsoletes
) > "%WORKSPACE%\Vault\README.md"

echo {} > "%WORKSPACE%\Vault\.obsidian\app.json"
echo   OK - Coffre cree.

REM -- Declarer le coffre dans Obsidian: sans ca il faut faire
REM    "Open folder as vault" a la main, etape que beaucoup ratent.
call :declare_obsidian

REM == Etape 9b: Copier Hermes Hub ==
echo.
echo [9b/13] Copie de Hermes Hub...

set "HUB_OK=0"
if exist "%HERMES_HUB_SRC%\dist\index.html" if exist "%HERMES_HUB_SRC%\server\index.js" if exist "%HERMES_HUB_SRC%\launcher\Hermes-Hub.vbs" set "HUB_OK=1"

if "%HUB_OK%"=="1" (
    mkdir "%WORKSPACE%\Hermes-Hub\dist" 2>nul
    mkdir "%WORKSPACE%\Hermes-Hub\server" 2>nul
    xcopy "%HERMES_HUB_SRC%\dist\*" "%WORKSPACE%\Hermes-Hub\dist\" /E /Y /Q >nul 2>&1
    xcopy "%HERMES_HUB_SRC%\server\*" "%WORKSPACE%\Hermes-Hub\server\" /E /Y /Q >nul 2>&1
    echo   OK - Hermes Hub copie ^(interface + serveur local^).
) else (
    echo   ATTENTION: Hermes Hub introuvable ou pas encore construit.
    echo   Chemin attendu: %HERMES_HUB_SRC%
    echo   Il faut "dist\index.html" ^(npm run build^), "server\index.js"
    echo   et "launcher\Hermes-Hub.vbs".
    echo   Le raccourci Hermes Hub ne fonctionnera pas.
)

REM -- Lanceur du Hub: serveur local sans terminal, pilote par une icone
REM    dans la zone de notification (voir launcher\Lancer-Hermes-Hub.ps1).
if "%HUB_OK%"=="1" xcopy "%HERMES_HUB_SRC%\launcher\*" "%WORKSPACE%\Hermes-Hub\" /Y /Q >nul 2>&1

REM == Etape 9c: Depannage - laisser au client ses deux issues de secours ==
REM    Le dossier d'installation n'est qu'une trousse de livraison : il finit
REM    souvent a la corbeille une fois l'installation faite. Sans ces deux
REM    copies, plus rien sur le poste ne permet de reparer ni de desinstaller.
REM    maj-hub.bat n'est pas copie : il attend un Hermes-Hub source a cote de
REM    lui, ici il se copierait sur lui-meme.
echo.
echo [9c/13] Outils de depannage...
mkdir "%WORKSPACE%\Depannage" 2>nul
set "DEP_OK=0"
if exist "%INSTALLER_DIR%uninstall.bat" (
    copy /y "%INSTALLER_DIR%uninstall.bat" "%WORKSPACE%\Depannage\" >nul 2>&1
    set "DEP_OK=1"
)
if exist "%INSTALLER_DIR%fix-hermes.bat" (
    copy /y "%INSTALLER_DIR%fix-hermes.bat" "%WORKSPACE%\Depannage\" >nul 2>&1
    set "DEP_OK=1"
)
REM Le controle d'installation part avec eux, et pour la meme raison : la
REM trousse de livraison finit a la corbeille, et c'est le jour ou quelque
REM chose cloche qu'on voudrait pouvoir verifier.
if exist "%INSTALLER_DIR%verif\verifier-installation.py" (
    mkdir "%WORKSPACE%\Depannage\verif" 2>nul
    copy /y "%INSTALLER_DIR%verif\verifier-installation.py" "%WORKSPACE%\Depannage\verif\" >nul 2>&1
    if exist "%INSTALLER_DIR%VERIFIER-INSTALLATION.md" (
        copy /y "%INSTALLER_DIR%VERIFIER-INSTALLATION.md" "%WORKSPACE%\Depannage\" >nul 2>&1
    )
    if exist "%INSTALLER_DIR%TESTER-LES-FONCTIONS.md" (
        copy /y "%INSTALLER_DIR%TESTER-LES-FONCTIONS.md" "%WORKSPACE%\Depannage\" >nul 2>&1
    )
    if exist "%INSTALLER_DIR%CONSIGNE-TESTEUR.md" (
        copy /y "%INSTALLER_DIR%CONSIGNE-TESTEUR.md" "%WORKSPACE%\Depannage\" >nul 2>&1
    )
    set "DEP_OK=1"
)
(
echo Deux scripts a garder sous la main.
echo.
echo   fix-hermes.bat   Hermes ne demarre plus ou repond une erreur de chemin :
echo                    reinstalle proprement le moteur. Ne touche ni aux
echo                    projets, ni au coffre.
echo.
echo   uninstall.bat    Retire Hermes de ce PC. Il demande d'abord quoi garder,
echo                    et tout part a la corbeille Windows.
echo.
echo Clic droit ^> Executer en tant qu'administrateur.
echo Installe avec Hermes Hub v%HERMES_VERSION%.
) > "%WORKSPACE%\Depannage\LISEZ-MOI.txt"
if "!DEP_OK!"=="1" (
    echo   OK - reparation et desinstallation dans Depannage\.
) else (
    echo   ATTENTION: uninstall.bat et fix-hermes.bat introuvables a cote de
    echo   l'installeur. Le poste n'aura pas d'outil de depannage local.
)

REM == Etape 10: Dossier Hermes Clean Agent + bat ==
echo.
echo [10/13] Creation du dossier Hermes Clean Agent...

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

REM == Etape 10 bis: l'equipe de depart ==
REM
REM Sans elle, le Hub s'ouvre sur un seul agent - Hermes - et le menu
REM Orchestration est vide. Verifie le 03/08/2026 sur un home vierge : un
REM agent, aucune equipe, aucun pole, et chaque tache decomposee retombe sur
REM l'orchestrateur faute de specialiste a qui la donner.
REM
REM Trois roles, et ce sont ceux de tous les poles qu'on a fait tourner :
REM lire la matiere, ecrire le livrable, mettre en forme. Aucun metier
REM particulier, aucun personnage - des emplacements que le client renomme.
REM
REM --clone-from default : ils heritent du .env de l'installation, donc de LA
REM CLE DU CLIENT. Un profil sans credential ne repond jamais, et c'est
REM exactement ce que la simulation signale par « n a aucune credential ».
REM
REM La description n'est pas une politesse : c'est le SEUL texte que le
REM decomposeur de kanban lit pour router une tache. Sa premiere phrase donne
REM aussi le metier affiche dans le Hub - d'ou la forme « Metier. Puis ce
REM qu'il fait. » Et aucun verbe de commandement dedans : « coordonne »,
REM « arbitre » ou « supervise » feraient passer l'agent pour un chef dans
REM l'organigramme.
REM
REM L'IDENTIFIANT est un metier, le nom affiche est une lettre. Mesure du
REM 03/08/2026, meme demande decomposee deux fois : avec `redacteur` et
REM `maquettiste`, les deux taches sont parties au bon specialiste ; avec `a`,
REM `b` et `c`, une seule sur deux, et le plan est tombe de trois taches a
REM deux. C'est l'identifiant que le decomposeur choisit, et une lettre ne lui
REM dit rien. Le Hub, lui, les affiche « A (Alphonse) », « B (Beatrice) »,
REM « C (Camille) » - voir CONNUS dans server/equipe.js.
echo.
echo [10 bis] Equipe de depart...

hermes profile create a-analyste --clone-from default --description "Analyse. Lit les documents et les donnees fournis, en tire les chiffres, les faits et les ecarts verifiables. Produit la matiere chiffree dont les autres se serviront, sans rediger le livrable final." >nul 2>&1

hermes profile create b-redacteur --clone-from default --description "Redaction. Ecrit le texte du livrable a partir de l analyse fournie : notes, rapports, comptes rendus, courriers. Travaille la clarte et la structure, et ne met pas en page." >nul 2>&1

hermes profile create c-metteur --clone-from default --description "Mise en page. Assemble le document final a remettre : page HTML autonome puis PDF, tableaux et sections lisibles. Part de ce que les autres ont ecrit et n en change pas le fond." >nul 2>&1

echo   OK - trois roles crees : A (Alphonse), B (Beatrice), C (Camille).
echo        Renomme-les avec "hermes profile rename".

REM == Etape 10 ter: la passerelle ==
REM Posee d'office, et annoncee a l'etape 7. Sans elle, `hermes cron create`
REM reussit, la tache s'affiche, son echeance se calcule, et rien ne part
REM jamais : une fonction a moitie morte en silence est pire qu'un service en
REM fond, et une question que personne ne comprend n'est pas un choix.
echo.
echo [10 ter] Installation du service d'automatisation...
    REM LES DEUX DRAPEAUX NE SONT PAS DECORATIFS - sans eux l'installation se
    REM fige ici, et de la pire facon. Mesure le 03/08/2026 sur un second poste :
    REM « hermes gateway install » teste sys.stdin.isatty() et, sur un vrai
    REM terminal, POSE DEUX QUESTIONS. Le « >nul 2>&1 » redirige la sortie, pas
    REM l'entree : les questions partaient dans nul et l'installateur attendait
    REM indefiniment une reponse a une question que personne ne voyait.
    REM
    REM Meme piege que « hermes mcp add » repare ce matin, et c'est le meme
    REM enseignement : rediger la sortie d'une commande ne la rend pas muette,
    REM ca la rend AVEUGLE. Toute commande interactive appelee ici doit porter
    REM ses reponses sur sa ligne.
    REM
    REM Les autres appels « hermes ... >nul » du fichier ont ete relus dans la
    REM foulee - version, profile create, config set, cron status. Aucun ne pose
    REM de question : le seul input() de profiles.py garde la SUPPRESSION, et
    REM elle n'est jamais appelee ici. Audit fait le 03/08/2026, a refaire si un
    REM appel est ajoute.
    REM
    REM Les deux valent « oui », qui est aussi leur defaut : le service demarre
    REM tout de suite et repart a l'ouverture de session - sans quoi les taches
    REM programmees ne partiraient qu'avec le Hub ouvert, ce qui les vide de leur
    REM sens.
hermes gateway install --start-now --start-on-login >nul 2>&1
hermes cron status >nul 2>&1
if errorlevel 1 (
    echo   Le service n'a pas pu etre installe. Les automatisations
    echo   s'afficheront dans le Hub sans se declencher. Pour reessayer :
    echo     hermes gateway install
) else (
    echo   OK - les taches programmees se declencheront, Hub ferme.
)

REM == Etape 11: SOUL.md + scripts + memoire ==
echo.
echo [11/13] Configuration finale...

REM -- SOUL.md
(
echo Tu es Hermes, un agent IA cree par Nous Research.
echo.
echo ^(profil Hermes Hub v%HERMES_VERSION%^)
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
copy /y "!HERMES_HOME!\SOUL.md" "!HERMES_HOME!\SOUL.default.md" >nul 2>&1

REM -- Skills maison livrees avec l'installeur (audit-livraison, etc.)
if exist "%INSTALLER_DIR%skills" (
    xcopy "%INSTALLER_DIR%skills\*" "!HERMES_HOME!\skills\software-development\" /E /I /Y /Q >nul 2>&1
    echo   OK - Skills maison installees.
)

REM -- Profil : les 9 reponses de l'etape 7. Elles etaient saisies puis jetees,
REM    Hermes ne savait donc rien de l'utilisateur.
call :write_user_memory

REM -- Regles de travail : c'est la reponse a la question posee a l'etape 7.
REM    Sans cette ecriture, la question ne servait a rien et Hermes demarrait
REM    sans aucune regle.
REM PLUS DE QUESTION ICI, et c'est voulu. « Utiliser le profil pre-rempli ? »
REM ne voulait rien dire pour qui ne savait pas ce qu'on lui proposait - donc
REM tout le monde repondait oui, et un client repondant non repartait sans
REM AUCUNE regle. Ce qui se pose ici est desormais le profil par defaut, entier,
REM et c'est le Hub qui offre d'en changer : Configuration ^> Memoire.
call :write_memory_socle

REM Le socle NU, copie avant que l'atelier ne s'ajoute. C'est ce fichier que le
REM Hub lit pour construire ses profils, et il n'existe que pour ca : sans lui,
REM « Essentiel » vaudrait exactement le fichier installe et le choix ne
REM servirait a rien. Le Hub ne connait ainsi toujours aucun texte livre - il
REM apporte ses supplements, jamais la base.
copy /y "!HERMES_HOME!\memories\MEMORY.md" "!HERMES_HOME!\memories\MEMORY.socle.md" >nul 2>&1

call :write_memory_atelier

REM La memoire durable ne se refuse pas avec les regles : ses scripts sont
REM poses dans tous les cas, donc son mode d'emploi aussi. Sinon un client qui
REM refuse le profil pre-rempli recoit les scripts sans savoir qu'ils existent.
call :write_memory_durable

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
echo Installe avec Hermes Hub v%HERMES_VERSION%
echo.
echo ## Structure
echo - Vault/           - Coffre memoire ^(cerveau long terme^)
echo - Hermes-Clean-Memory/     - Dossier de test ^(profil vierge^)
echo - Projets/         - Tes projets
echo - Hermes-Hub/      - Interface web locale ^(serveur Node, http://127.0.0.1:4317^)
echo - Depannage/       - Reparer ou desinstaller Hermes ^(voir LISEZ-MOI.txt^)
echo - Lancer-Hermes.ps1        - Lance Hermes ^(master^)
echo - Nouveau-Projet.ps1       - Cree un nouveau projet
echo.
echo ## Profils
echo - default ^(master^) - te connait, lance avec: .\Lancer-Hermes.ps1
echo - clean            - vierge, lance avec: .\Hermes-Clean-Memory\Lancer-Hermes-Clean.ps1
echo - projet-*         - isole, cree avec: .\Nouveau-Projet.ps1
echo.
echo ## Demarrage
echo 1. Ouvre Obsidian: ton coffre est deja declare, rien a configurer
echo 2. Double-clic sur "Hermes Hub" sur le Bureau
echo 3. Bouton "Discuter avec Hermes", puis dis-lui de memoriser tes infos
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

REM == Etape 12: Copier icones + raccourci sur le Bureau ==
REM    Un seul raccourci: tout part du Hub. Les autres entrees (Hermes,
REM    Clean Agent, nouveau projet) sont des boutons dans son interface.
echo.
echo [12/13] Raccourci Hermes Hub sur le Bureau...

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
REM Chaque raccourci passe -ExecutionPolicy Bypass: la politique par defaut de
REM Windows (Restricted) refuse d'executer un .ps1, et sans ca l'utilisateur
REM devait lancer "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned" a la main.
REM Bypass ne vaut que pour le processus lance, la machine n'est pas modifiee.
set "PS1=%TEMP%\hermes_shortcuts.ps1"
> "%PS1%" echo $ws = New-Object -ComObject WScript.Shell
>> "%PS1%" echo $desktop = [Environment]::GetFolderPath('Desktop')
>> "%PS1%" echo $wsx = '%WORKSPACE%'
>> "%PS1%" echo $icons = "$wsx\icons"
>> "%PS1%" echo $sc4 = $ws.CreateShortcut("$desktop\Hermes Hub.lnk")
>> "%PS1%" echo $sc4.TargetPath = "$env:SystemRoot\System32\wscript.exe"
>> "%PS1%" echo $sc4.Arguments = "`"$wsx\Hermes-Hub\Hermes-Hub.vbs`""
>> "%PS1%" echo $sc4.IconLocation = "$icons\hermes-hub.ico, 0"
>> "%PS1%" echo $sc4.WorkingDirectory = "$wsx\Hermes-Hub"
>> "%PS1%" echo $sc4.Description = 'Ouvre Hermes Hub (icone dans la zone de notification)'
>> "%PS1%" echo $sc4.Save()
>> "%PS1%" echo Write-Output 'Raccourci Hermes Hub cree sur le Bureau.'
REM -- Menage: anciennes installations posaient 3 raccourcis de plus
>> "%PS1%" echo foreach ($vieux in 'Lancer Hermes','Lancer Hermes Clean Agent','Nouveau Projet') {
>> "%PS1%" echo     Remove-Item "$desktop\$vieux.lnk" -Force -ErrorAction SilentlyContinue
>> "%PS1%" echo }
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
del "%PS1%" >nul 2>&1

echo   OK - raccourci Hermes Hub sur le Bureau.

echo.
echo  ============================================
echo   INSTALLATION TERMINEE
echo  ============================================
echo.
echo  Ton dossier: %WORKSPACE%
echo.
echo  Contenu:
echo   - Vault/              (coffre memoire)
echo   - Hermes-Clean-Memory/        (tests)
echo   - Projets/            (tes projets)
echo   - Hermes-Hub/         (interface web locale + serveur)
echo   - Depannage/          (reparer / desinstaller, voir LISEZ-MOI.txt)
echo   - Lancer-Hermes.ps1   (double-clic = master)
echo   - Nouveau-Projet.ps1  (double-clic = nouveau projet)
echo   - icons/              (icones)
echo   - README.md
echo.
echo  Un seul raccourci sur le Bureau: Hermes Hub.
echo   Tout part de la: lancer Hermes, Clean Agent, creer un projet,
echo   ouvrir le coffre. Le Hub ouvre http://127.0.0.1:4317 et pose une
echo   icone pres de l'horloge (clic droit pour l'arreter).
echo.
echo  PROCHAINES ETAPES:
echo   1. Ouvre Obsidian: ton coffre est deja declare, rien a configurer
echo   2. Double-clic sur "Hermes Hub" sur le Bureau
echo   3. Bouton "Discuter avec Hermes" et dis-lui de memoriser tes infos
echo.
echo  IMPORTANT: Ferme ce terminal et rouvre-en un nouveau.
echo  Tu peux lancer Hermes en tapant "hermes" dans n'importe quel terminal.
echo.
pause
exit /b 0

REM ================================================
REM :resoudre_documents - trouve le vrai dossier Documents
REM   Quand OneDrive reprend les dossiers personnels, "%USERPROFILE%\Documents"
REM   n'est plus celui que l'utilisateur voit dans l'Explorateur. Ecrire l'espace
REM   de travail au mauvais endroit le rendrait invisible pour lui, et surtout
REM   introuvable pour le Hub.
REM   L'ordre d'essai est celui de Hermes-Hub\server\workspace.js (documentsDir):
REM   les deux doivent retenir le meme dossier, sinon le Hub cherche ou
REM   l'installeur n'a pas ecrit. A modifier des deux cotes a la fois.
REM ================================================
:resoudre_documents
set "DOCS=%USERPROFILE%\Documents"
if exist "%DOCS%" exit /b 0
set "DOCS=%USERPROFILE%\OneDrive\Documents"
if exist "%DOCS%" exit /b 0
set "DOCS=%USERPROFILE%\OneDrive - Personnel\Documents"
if exist "%DOCS%" exit /b 0
REM Aucun n'existe : on retient le chemin classique, mkdir le creera.
set "DOCS=%USERPROFILE%\Documents"
exit /b 0

REM ================================================
REM :refresh_path - recharge le PATH depuis le registre
REM   winget met a jour le PATH persistant, pas celui du processus en cours.
REM   Sans ce rechargement, l'installateur devait etre relance a la main apres
REM   chaque installation ("Redemarre ce script apres installation de Python").
REM ================================================
:refresh_path
set "REG_SYS="
set "REG_USR="
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul ^| find "REG_"') do set "REG_SYS=%%B"
for /f "tokens=2,*" %%A in ('reg query "HKCU\Environment" /v Path 2^>nul ^| find "REG_"') do set "REG_USR=%%B"
if defined REG_SYS set "PATH=%PATH%;%REG_SYS%"
if defined REG_USR set "PATH=%PATH%;%REG_USR%"
REM deuxieme passe: le registre peut contenir des %SystemRoot% non resolus
call set "PATH=%PATH%"
exit /b 0

REM ================================================
REM :has_python - Python utilisable ? (0 = oui)
REM   WindowsApps\python.exe est un raccourci vers le Microsoft Store qui
REM   repond a la place d'un vrai Python et sort en erreur. On teste donc une
REM   execution reelle, puis le lanceur "py" qui n'est jamais masque.
REM ================================================
:has_python
python -c "pass" >nul 2>&1
if not errorlevel 1 exit /b 0
py -3 --version >nul 2>&1
if not errorlevel 1 exit /b 0
exit /b 1

REM ================================================
REM :write_user_memory - ecrit les reponses aux 9 questions
REM   Hermes lit HERMES_HOME\memories\USER.md a chaque session : c'est la que
REM   vit ce qu'il sait de l'utilisateur. Les 9 reponses de l'etape 7 y sont
REM   ecrites; sans ca elles etaient saisies puis jetees.
REM ================================================
:write_user_memory
mkdir "!HERMES_HOME!\memories" 2>nul
(
echo # Qui je suis
echo.
echo _Hermes Hub v%HERMES_VERSION% - modifiable depuis le Hub : Configuration ^> Memoire_
echo.
REM Expansion differee (!VAR! et non %VAR%) : ces valeurs viennent de l'
REM utilisateur. Avec %VAR%, une reponse contenant ^& ou une parenthese est
REM relue par cmd comme du code - "commerce ^& marketing" ecrivait "commerce"
REM puis tentait d'executer "marketing". Avec !VAR!, la substitution a lieu
REM apres l'analyse : le texte reste du texte.
echo - Prenom : !PRENOM!
echo - Metier ou role : !METIER!
echo - Langue de travail : !LANGUE!
echo - Style de reponse attendu : !STYLE!
echo - Niveau en tech : !NIVEAU!
echo.
echo ## Ce sur quoi je travaille
echo - En ce moment : !PROJET_ACTUEL!
echo - Type de projets : !TYPE_PROJET!
echo.
echo ## Mes objectifs
echo - Dans 1 mois : !OBJECTIF_1M!
echo - Dans 6 a 12 mois : !OBJECTIF_6M!
echo.
echo ## Pourquoi j'utilise Hermes
echo - !RAISON!
) > "!HERMES_HOME!\memories\USER.md"
copy /y "!HERMES_HOME!\memories\USER.md" "!HERMES_HOME!\memories\USER.default.md" >nul 2>&1
echo   OK - Profil ecrit dans la memoire d'Hermes.
exit /b 0

REM ================================================
REM :write_memory_socle - les garde-fous, pour tout le monde
REM ================================================
REM   Hermes lit HERMES_HOME\memories\MEMORY.md a CHAQUE session : c'est la que
REM   vivent les regles de travail, et c'est aussi pourquoi leur longueur se
REM   paie a chaque demarrage. Mesure le 03/08/2026 : l'ancienne liste faisait
REM   46 lignes, environ 553 jetons.
REM
REM   LE COUT EN ARGENT N'EST PAS L'ARGUMENT - trois dixiemes de centime par
REM   session, moins encore avec le cache. Le vrai cout est la dilution : sur
REM   les 25 lignes de l'ancienne liste, six parlaient de commits, de tests et
REM   d'architectures evolutives. Chez un comptable ou un avocat elles ne
REM   veulent rien dire, et une charte qu'on ne relit plus parce qu'elle parle
REM   d'un autre metier ne protege plus personne.
REM
REM   D'OU LA SEPARATION, et c'est la meme lecon que pour la memoire durable :
REM   un garde-fou n'est pas un gout. « Ne jamais inventer » ne se refuse pas.
REM   Le socle part donc dans tous les cas ; l'atelier logiciel, lui, reste
REM   derriere une question - et la question dit desormais ce qu'elle propose.
REM ================================================
:write_memory_socle
mkdir "!HERMES_HOME!\memories" 2>nul
(
echo # Regles de travail
echo.
echo _Hermes Hub v%HERMES_VERSION% - modifiable depuis le Hub : Configuration ^> Memoire_
echo.
echo Ce que j'attends de toi, dans tous les cas. Huit lignes, relues a chaque
echo demarrage : n'en ajoute pas sans en retirer.
echo.
echo - Rien d'irreversible sans mon accord : supprimer, ecraser, envoyer,
echo   publier, payer.
echo - Ne jamais inventer. « Je ne sais pas » est une reponse ; une reponse
echo   plausible et fausse n'en est pas une.
echo - Verifier plutot que supposer, et dire ce qui a ete verifie et ce qui ne
echo   l'a pas ete.
echo - Ne pas annoncer fini ce qui n'a pas ete eprouve : essaie-le d'abord.
echo - Dire ce qui a rate, tout de suite et sans l'enrober.
echo - Faire ce qui est demande, ni moins ni plus. Un doute qui change le
echo   travail se pose ; le reste se tranche.
echo - Quand je bloque, guide-moi par questions plutot que de deviner a ma place.
echo - Aller a l'essentiel : pas de preambule, pas de resume de ce que je viens
echo   de dire.
echo.
echo ## REPRISE
echo.
echo Quand je dis « on reprend », « on en etait ou ? », « continue le projet » :
echo ne pose aucune question. Va lire le point de reprise, puis annonce ce que
echo tu comptes faire avant de commencer.
echo.
echo - Projet sous git : "git log -1", la ligne « Ensuite : » du dernier commit
echo - Projet sans git : REPRISE.md, section « Prochaine etape »
echo - Hors projet     : ce fichier, puis demande sur quoi on repart
echo.
echo Ne cherche jamais un fichier de reprise ecrit a la main hors de ces
echo endroits : un memo tenu a cote pourrit quand la seance s'arrete mal,
echo c'est-a-dire pile quand on en a besoin.
) > "!HERMES_HOME!\memories\MEMORY.md"
goto :eof

REM ================================================
REM :write_memory_atelier - les habitudes d'un atelier logiciel
REM ================================================
REM   Tout ce qui suppose qu'on ecrit du code. C'etait melange au socle, et
REM   c'est ce melange qu'on defait : le socle protege, ceci organise. Le
REM   premier ne se refuse pas, le second ne concerne pas tout le monde.
REM
REM   Le bloc s'annonce pour ce qu'il est et invite a l'elaguer. Un texte lu a
REM   chaque demarrage doit pouvoir maigrir, et personne ne coupe dans un
REM   fichier qui a l'air officiel : c'est le fichier qui doit le permettre.
REM ================================================
:write_memory_atelier
(
echo.
echo ## Habitudes d'atelier logiciel
echo.
echo _Ces lignes supposent qu'on ecrit du code, et elles sont relues a chaque
echo demarrage comme les autres. Efface celles qui ne te concernent pas._
echo.
echo - Tester avant d'annoncer fini ; ne rien commiter sans demander
echo - Ne pas sur-coder : simple et juste plutot qu'evolutif par principe
echo - Revue visuelle ET code a chaque jalon ; analyser les captures d'ecran
echo - Ecrire REPRISE.md a chaque jalon, ADM.md en cumulatif
echo - Tenir les 6 fichiers standard par projet, nourrir le coffre memoire
echo - Proposer un projet QUAND la conversation devient concrete, jamais
echo   systematiquement. Si j'accepte : creer le dossier et les 6 fichiers,
echo   signaler le changement dans un ENCADRE ROUGE, et valider le plan avec
echo   moi avant d'ecrire plan.md
) >> "!HERMES_HOME!\memories\MEMORY.md"
goto :eof

REM -----------------------------------------------------------------------------
REM :write_memory_durable - le mode d'emploi de l'archive qui survit a state.db
REM -----------------------------------------------------------------------------
REM Separe de :write_memory_atelier, et ce n'est pas un detail d'organisation.
REM Les habitudes d'atelier sont un GOUT - elles vivent derriere une question,
REM et un client peut les refuser. La memoire durable n'est pas un gout : ses
REM scripts sont installes dans tous les cas, donc son mode d'emploi doit l'etre
REM aussi. Melangees, un client repondant « n » recevait les scripts sans jamais
REM savoir qu'ils existent.
REM
REM C'est ce meme partage qui a fini par separer le socle de l'atelier : ce qui
REM protege se pose toujours, ce qui organise se propose.
REM
REM Ecrit en ajout : le socle a deja cree le fichier, on complete.
:write_memory_durable
mkdir "!HERMES_HOME!\memories" 2>nul
if not exist "!HERMES_HOME!\memories\MEMORY.md" (
    > "!HERMES_HOME!\memories\MEMORY.md" echo # Memoire
)
(
echo.
echo ## MEMOIRE DURABLE
echo.
echo _La couche d'indice que la memoire native n'a pas : une ligne par grand
echo sujet, pointant vers son journal. Jamais le contenu ici - seulement
echo l'indice, car ce bloc est charge a chaque demarrage._
echo.
echo - state.db est FRAGILE : un reset le vide. L'archive disque - journaux
echo   thematiques et Resumes-Sessions/ - lui survit. C'est elle le garant.
echo - Pour retrouver un sujet ancien : lire ce bloc, puis grep des TAGS dans
echo   l'INDEX du journal ^(jamais le fichier entier^), puis ouvrir le seul bloc
echo   vise. Repli : scripts/resume-sessions.py si state.db est encore la.
echo - Un nouveau grand sujet : copier memoire/TEMPLATE-JOURNAL-THEMATIQUE.md
echo   en Journal-^<Sujet^>.md, et ajouter ICI une ligne - une seule.
echo - Anti-doublon : une session deja couverte par un journal va dans
echo   Resumes-Sessions/exclusions.json, sinon elle sera resumee deux fois.
REM Pas de ^ sur le chevron entre guillemets : les guillemets protegent deja de
REM la redirection, et le ^ s'y ecrit alors tel quel. Sorti « "^<nom^>" » a
REM l'essai du 03/08/2026.
echo - Pont Vault, a la demande : python scripts/nourrir-vault.py --projet
echo   "<nom>". Voir PARAMETRES-DECLENCHEUR.md pour le mode automatique, qui
echo   n'est PAS actif par defaut.
echo.
echo ## OUTILS MCP
echo.
echo Les serveurs MCP sont PAR PROFIL - mesure le 03/08/2026. Chaque profil est
echo un home complet avec son propre config.yaml.
echo.
echo - "hermes mcp add" ne branche l'outil que sur le profil courant. Lance seul
echo   dans un terminal, il le donne a Hermes et a personne d'autre : a-analyste,
echo   b-redacteur et c-metteur - ceux qui executent les taches - travailleront
echo   sans. Rien ne le signale, l'agent fait autrement ou invente.
echo - Donc : brancher un outil se fait depuis le Hub, Orchestration ^> Agents,
echo   section "outils MCP". Toute l'equipe est cochee d'avance.
echo - Un outil deja branche a l'ancienne s'y voit en ambre ^("1 agent sur 4"^),
echo   avec le bouton "Donner a toute l'equipe" a cote.
echo - Les agents chargent leurs outils au reveil : un agent en train de
echo   travailler garde les anciens jusqu'a sa prochaine tache.
echo.
echo _MEMOIRE THEMATIQUE - une ligne par sujet, a remplir au fil du temps :_
echo.
) >> "!HERMES_HOME!\memories\MEMORY.md"
REM Copie de reference : c'est elle que le bouton "Version d'origine" du Hub
REM restaure. Le Hub ne connait ainsi aucun texte par defaut.
copy /y "!HERMES_HOME!\memories\MEMORY.md" "!HERMES_HOME!\memories\MEMORY.default.md" >nul 2>&1
echo   OK - Regles ecrites dans la memoire d'Hermes.
exit /b 0

REM ================================================
REM :declare_obsidian - inscrit le coffre dans Obsidian
REM   Obsidian tient la liste de ses coffres dans
REM   %APPDATA%\obsidian\obsidian.json. En y ajoutant le notre, il apparait
REM   directement au lancement: plus de "Open folder as vault" a la main.
REM   Le fichier est fusionne, jamais ecrase - un utilisateur peut deja avoir
REM   ses propres coffres. Et on ne s'impose comme coffre d'ouverture que si
REM   c'est le premier: on ne detourne pas le coffre par defaut de quelqu'un.
REM ================================================
:declare_obsidian
set "PS_OBS=%TEMP%\hermes_obsidian.ps1"
> "%PS_OBS%" echo $vault = $env:HUB_VAULT
>> "%PS_OBS%" echo $fichier = Join-Path $env:APPDATA 'obsidian\obsidian.json'
>> "%PS_OBS%" echo $dossier = Split-Path $fichier
>> "%PS_OBS%" echo if (-not (Test-Path $dossier)) { [void](New-Item -ItemType Directory -Force -Path $dossier) }
>> "%PS_OBS%" echo $obj = $null
>> "%PS_OBS%" echo if (Test-Path $fichier) { try { $obj = ConvertFrom-Json (Get-Content -LiteralPath $fichier -Raw) } catch { $obj = $null } }
>> "%PS_OBS%" echo if (-not $obj) { $obj = New-Object PSObject }
>> "%PS_OBS%" echo if (-not $obj.PSObject.Properties['vaults']) { Add-Member -InputObject $obj -MemberType NoteProperty -Name vaults -Value (New-Object PSObject) }
>> "%PS_OBS%" echo $deja = $false
>> "%PS_OBS%" echo $nb = 0
>> "%PS_OBS%" echo foreach ($p in $obj.vaults.PSObject.Properties) { $nb = $nb + 1; if ($p.Value.path -eq $vault) { $deja = $true } }
>> "%PS_OBS%" echo if ($deja) { Write-Output '  OK - Coffre deja connu d Obsidian.'; exit 0 }
>> "%PS_OBS%" echo $entree = New-Object PSObject
>> "%PS_OBS%" echo Add-Member -InputObject $entree -MemberType NoteProperty -Name path -Value $vault
>> "%PS_OBS%" echo Add-Member -InputObject $entree -MemberType NoteProperty -Name ts -Value ([int64]([datetime]::UtcNow - [datetime]'1970-01-01').TotalMilliseconds)
>> "%PS_OBS%" echo Add-Member -InputObject $entree -MemberType NoteProperty -Name open -Value ($nb -eq 0)
>> "%PS_OBS%" echo $id = [guid]::NewGuid().ToString('N').Substring(0,16)
>> "%PS_OBS%" echo Add-Member -InputObject $obj.vaults -MemberType NoteProperty -Name $id -Value $entree
>> "%PS_OBS%" echo Set-Content -LiteralPath $fichier -Value (ConvertTo-Json -InputObject $obj -Depth 8) -Encoding UTF8
>> "%PS_OBS%" echo Write-Output '  OK - Coffre declare dans Obsidian.'
set "HUB_VAULT=%WORKSPACE%\Vault"
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_OBS%"
del "%PS_OBS%" >nul 2>&1
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
>> "%OUT%" echo Write-Host "Creation des fichiers standard..." -ForegroundColor Green
>> "%OUT%" echo Write-Host ""
>> "%OUT%" echo.
>> "%OUT%" echo # Le gabarit ne vit qu'a un seul endroit: Hermes-Hub\server\templates.js.
>> "%OUT%" echo # Ce script et le Hub ecrivent donc exactement les memes fichiers.
>> "%OUT%" echo $GABARIT = Join-Path $SCRIPT_DIR "Hermes-Hub\server\ecrire-projet.mjs"
>> "%OUT%" echo if (-not (Test-Path $GABARIT)) {
>> "%OUT%" echo     Write-Host "Gabarit introuvable: $GABARIT" -ForegroundColor Red
>> "%OUT%" echo     Write-Host "Le dossier Hermes-Hub doit rester a cote de ce script." -ForegroundColor Red
>> "%OUT%" echo     Read-Host "Appuie sur Entree pour fermer"
>> "%OUT%" echo     exit 1
>> "%OUT%" echo }
>> "%OUT%" echo if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
>> "%OUT%" echo     Write-Host "Node.js est introuvable. Relance installer.bat." -ForegroundColor Red
>> "%OUT%" echo     Read-Host "Appuie sur Entree pour fermer"
>> "%OUT%" echo     exit 1
>> "%OUT%" echo }
>> "%OUT%" echo node $GABARIT $PROJET_DIR $PROJET_NOM $PROJET_OBJ
>> "%OUT%" echo if ($LASTEXITCODE -ne 0) {
>> "%OUT%" echo     Write-Host "La creation des fichiers a echoue." -ForegroundColor Red
>> "%OUT%" echo     Read-Host "Appuie sur Entree pour fermer"
>> "%OUT%" echo     exit 1
>> "%OUT%" echo }
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
