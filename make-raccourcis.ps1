# Cree les raccourcis Windows des scripts .bat de ce dossier.
#
# Un .bat ne peut pas porter d'icone : c'est le raccourci .lnk qui la porte.
# Ces raccourcis enregistrent un chemin absolu, ils ne sont donc pas versionnes
# et doivent etre recrees apres chaque copie du dossier sur un autre poste :
#
#     powershell -ExecutionPolicy Bypass -File make-raccourcis.ps1

$dossier = $PSScriptRoot
$shell = New-Object -ComObject WScript.Shell

$raccourcis = @(
    @{ Nom = 'Installer Hermes';    Script = 'installer.bat';  Icone = 'installer.ico'
       Description = 'Installe Hermes Agent, Obsidian et le Hub' },
    @{ Nom = 'Reparer Hermes';      Script = 'fix-hermes.bat'; Icone = 'reparer.ico'
       Description = 'Reinstalle proprement Hermes Agent' },
    @{ Nom = 'Desinstaller Hermes'; Script = 'uninstall.bat';  Icone = 'desinstaller.ico'
       Description = 'Supprime Hermes, le workspace et les raccourcis' }
)

foreach ($r in $raccourcis) {
    $cible = Join-Path $dossier $r.Script
    $icone = Join-Path $dossier "icons\$($r.Icone)"

    if (-not (Test-Path $cible)) {
        Write-Host "  $($r.Script) introuvable, raccourci ignore" -ForegroundColor Yellow
        continue
    }

    $lnk = $shell.CreateShortcut((Join-Path $dossier "$($r.Nom).lnk"))
    $lnk.TargetPath = $cible
    $lnk.WorkingDirectory = $dossier
    $lnk.Description = $r.Description
    if (Test-Path $icone) { $lnk.IconLocation = "$icone, 0" }
    $lnk.Save()

    Write-Host "  $($r.Nom).lnk -> $($r.Script)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Termine. Les icones viennent de icons/ (generees par generate_icons.py)."
