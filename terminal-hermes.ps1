# ---------------------------------------------------------------------------
#  Le terminal du Hub - ouvert par `terminal-hermes.bat`
#
#  Il ne fait rien d'autre que trois choses : se placer dans `Hermes-Hub`,
#  poser trois verbes courts, et les afficher. Un raccourci qui ne s'affiche
#  pas n'existe pas - c'est deja la regle de l'interface, elle vaut ici.
# ---------------------------------------------------------------------------

$global:HUB = Join-Path $PSScriptRoot 'Hermes-Hub'
$global:DEPOT = $PSScriptRoot
Set-Location -LiteralPath $global:HUB

# `maj` : le garde-fou PUIS la construction, et jamais l'inverse.
# Construire un code que la verification refuse ne prouve rien, et on serait
# tente de regarder l'ecran avec un index qui ment.
function global:maj {
  npm run design
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host '  Le garde-fou a refuse. Rien n a ete construit.' -ForegroundColor Yellow
    return
  }
  npm run build
}

# `hub` : le bac a sable. Le workspace reel et le vrai board ne sont pas touches.
function global:hub { & (Join-Path $global:HUB 'dev-v2.ps1') }

# `g` : git n'est pas dans le PATH sur cette machine, et taper le chemin
# complet a chaque fois decourage de regarder l'etat du depot.
function global:g { & 'C:\Program Files\Git\cmd\git.exe' @args }

Write-Host ''
Write-Host '  Terminal Hermes-Hub' -ForegroundColor Cyan
Write-Host ''
Write-Host '    maj ' -ForegroundColor Green -NoNewline
Write-Host '  npm run design, puis npm run build si le garde-fou passe'
Write-Host '    hub ' -ForegroundColor Green -NoNewline
Write-Host '  lance le bac a sable (dev-v2.ps1), interface sur 127.0.0.1:4319'
Write-Host '    g   ' -ForegroundColor Green -NoNewline
Write-Host '  git, sans son chemin complet     ex :  g status -sb'
Write-Host ''
Write-Host "  Tu es dans $global:HUB" -ForegroundColor DarkGray
Write-Host "  Le depot est $global:DEPOT" -ForegroundColor DarkGray
Write-Host ''
