@echo off
chcp 65001 >nul

echo.
echo  ============================================
echo   REPARATION HERMES - Clean Install
echo  ============================================
echo.
echo  Ce script supprime l'installation corrompue
echo  de Hermes et la reinstalle proprement.
echo.
echo  Utile si tu as l'erreur:
echo   "uv trampoline failed to canonicalize script path"
echo.
set /p CONFIRM="  Continuer ? (o/n): "
if /i not "%CONFIRM%"=="o" (
    echo  Annulation.
    pause
    exit /b
)

echo.
echo  [1/3] Suppression de l'installation corrompue...
powershell -NoProfile -Command "Remove-Item -Recurse -Force $env:LOCALAPPDATA\hermes\hermes-agent" 2>nul
echo    OK.

echo.
echo  [2/3] Reinstallation de Hermes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"
echo    OK.

echo.
echo  [3/3] Verification...
where hermes >nul 2>&1
if errorlevel 1 (
    echo    ATTENTION: Hermes non trouve dans le PATH.
    echo    Ferme ce terminal et reouvre-le.
    echo    Si ca ne marche toujours pas, redemarre ton PC.
) else (
    echo    OK - Hermes installe correctement.
    hermes --version 2>nul
)

echo.
echo  ============================================
echo   REPARATION TERMINEE
echo  ============================================
echo.
echo  Si Hermes ne marche toujours pas:
echo   1. Ferme ce terminal
echo   2. Rouvre un nouveau terminal
echo   3. Tape: hermes --version
echo   4. Si ca ne marche pas, redemarre ton PC
echo.
pause