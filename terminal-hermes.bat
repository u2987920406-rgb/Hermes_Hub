@echo off
REM ---------------------------------------------------------------------------
REM  Ouvre un PowerShell deja place dans Hermes-Hub, avec `maj`, `hub` et `g`.
REM  Epingle ce fichier a ta barre des taches : c'est la porte d'entree du Hub.
REM  Tout ce qu'il fait est dans terminal-hermes.ps1, a cote - lisible, modifiable.
REM ---------------------------------------------------------------------------
start "Hermes-Hub" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0terminal-hermes.ps1"
