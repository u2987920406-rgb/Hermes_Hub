@echo off
REM ---------------------------------------------------------------------------
REM  Lance le Hub V2 dans son bac a sable, d'un double-clic.
REM
REM  Pourquoi ce fichier existe : dev-v2.ps1 demande d'ouvrir PowerShell, de se
REM  placer dans le bon dossier et de desserrer la politique d'execution - trois
REM  gestes a refaire a chaque fois, et trois occasions de se tromper. Ici, un
REM  double-clic suffit.
REM
REM  La fenetre reste ouverte tant que le serveur tourne. La fermer arrete le
REM  Hub : c'est normal, et c'est le seul moyen de l'arreter.
REM ---------------------------------------------------------------------------
title Hub V2 - bac a sable
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev-v2.ps1" %*
echo.
echo   Le serveur s'est arrete.
echo.
pause
