# Lance le Hub de developpement V2 dans un bac a sable.
#
# Ce qui est isole du poste reel :
#   - le workspace (Projets, Vault, .hub)  -> HERMES_WORKSPACE
#   - le tableau de bord kanban            -> HERMES_KANBAN_DB
#
# Ce qui reste partage, volontairement :
#   - le home d'Hermes (credentials, sessions, memoire, config.yaml)
#   - les profils, donc l'equipe : Hermes les ancre au dossier utilisateur et
#     non au home actif. Un home separe obligerait a recopier les credentials,
#     et un profil sans .env rempli ne repond jamais.
#
# Le bac a sable vit HORS de Documents, et c'est deliberé : sans
# HERMES_WORKSPACE, le Hub choisit le dossier "Documents\Hermes-*" le plus
# recemment modifie. Un bac a sable range la-bas detournerait le Hub installe
# vers lui des le premier build.
#
# Usage :  .\dev-v2.ps1  [-Port 4319]

param([int]$Port = 4319)

$ErrorActionPreference = 'Stop'
$racine = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'bac-a-sable-v2'

$env:HERMES_WORKSPACE = Join-Path $racine 'workspace'
$env:HERMES_KANBAN_DB = Join-Path $racine 'kanban.db'

# L'atelier de design : la pastille en bas a droite de l'interface. Ce drapeau
# n'existe qu'ici, donc un poste client ne l'a jamais - voir server/index.js.
$env:HUB_ATELIER = '1'

New-Item -ItemType Directory -Force -Path $env:HERMES_WORKSPACE | Out-Null

Write-Host ""
Write-Host "  Hub V2 - bac a sable" -ForegroundColor Cyan
Write-Host "  workspace : $env:HERMES_WORKSPACE"
Write-Host "  kanban    : $env:HERMES_KANBAN_DB"
Write-Host "  interface : http://127.0.0.1:$Port/"
Write-Host ""
Write-Host "  Le workspace reel et le vrai board ne sont pas touches." -ForegroundColor DarkGray
Write-Host ""

node (Join-Path $PSScriptRoot 'server\index.js') --port $Port
