<#
  Demarre le serveur local du Hub sans fenetre de terminal et pose une icone
  dans la zone de notification (a cote de l'horloge).

  Pourquoi : avec un terminal visible, fermer la mauvaise fenetre coupait le
  Hub sans le vouloir. Ici la seule facon de l'arreter est le menu de l'icone.

  Ce script est lance par Hermes-Hub.vbs, qui le demarre sans console.
  Il vit dans <workspace>\Hermes-Hub\ : le workspace est le dossier parent.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$hub = $PSScriptRoot
$workspace = Split-Path $hub -Parent
$url = 'http://127.0.0.1:4317'
$env:HERMES_WORKSPACE = $workspace

function Show-Erreur($texte) {
    [System.Windows.Forms.MessageBox]::Show(
        $texte, 'Hermes Hub',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

# Le port repond-il ? Sert a detecter une instance deja lancee, puis a
# attendre que le serveur soit vraiment pret avant d'ouvrir le navigateur.
function Test-HubEnLigne {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', 4317)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Show-Erreur "Node.js est introuvable.`n`nRelance installer.bat, puis ouvre une nouvelle session Windows."
    exit 1
}

# Deja lance : on montre l'instance existante plutot que d'en demarrer une 2e.
if (Test-HubEnLigne) {
    Start-Process $url
    exit 0
}

$sortie = Join-Path $hub 'hub.log'
$erreurs = Join-Path $hub 'hub-erreurs.log'

$script:serveur = Start-Process -FilePath $node.Source `
    -ArgumentList "`"$hub\server\index.js`"" `
    -WorkingDirectory $hub `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $sortie -RedirectStandardError $erreurs

# Le serveur met un instant a ouvrir le port : on attend jusqu'a 10 s.
$pret = $false
foreach ($essai in 1..40) {
    if ($script:serveur.HasExited) { break }
    if (Test-HubEnLigne) { $pret = $true; break }
    Start-Sleep -Milliseconds 250
}

if (-not $pret) {
    try { if (-not $script:serveur.HasExited) { $script:serveur.Kill() } } catch {}
    # Deux double-clics coup sur coup : l'autre instance a gagne la course et
    # tient deja le port. Rien a signaler, on montre juste l'interface.
    if (Test-HubEnLigne) {
        Start-Process $url
        exit 0
    }
    Show-Erreur "Le Hub n'a pas demarre.`n`nDetail de l'erreur :`n$erreurs"
    exit 1
}

# --- Icone de la zone de notification ---------------------------------------
$fichierIcone = Join-Path $workspace 'icons\hermes-hub.ico'
$script:tray = New-Object System.Windows.Forms.NotifyIcon
if (Test-Path $fichierIcone) {
    $script:tray.Icon = New-Object System.Drawing.Icon $fichierIcone
} else {
    $script:tray.Icon = [System.Drawing.SystemIcons]::Application
}
$script:tray.Text = 'Hermes Hub - 127.0.0.1:4317'

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$ouvrir = $menu.Items.Add('Ouvrir le Hub')
$dossier = $menu.Items.Add('Ouvrir le dossier de travail')
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
$arreter = $menu.Items.Add('Arreter le Hub')

$script:tray.ContextMenuStrip = $menu
$script:tray.Visible = $true

function Stop-Hub {
    try { if (-not $script:serveur.HasExited) { $script:serveur.Kill() } } catch {}
    $script:tray.Visible = $false
    $script:tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
}

$ouvrir.add_Click({ Start-Process $url })
$dossier.add_Click({ Start-Process explorer.exe $workspace })
$arreter.add_Click({ Stop-Hub })
$script:tray.add_DoubleClick({ Start-Process $url })

# Si le serveur meurt de lui-meme, l'icone ne doit pas rester dans la barre.
$veille = New-Object System.Windows.Forms.Timer
$veille.Interval = 5000
$veille.add_Tick({
        if ($script:serveur.HasExited) {
            $veille.Stop()
            $script:tray.ShowBalloonTip(5000, 'Hermes Hub', "Le serveur s'est arrete.", [System.Windows.Forms.ToolTipIcon]::Warning)
            Start-Sleep -Milliseconds 500
            Stop-Hub
        }
    })
$veille.Start()

$script:tray.ShowBalloonTip(4000, 'Hermes Hub',
    "Le Hub tourne. Clic droit sur l'icone pour l'arreter.",
    [System.Windows.Forms.ToolTipIcon]::Info)

Start-Process $url

[System.Windows.Forms.Application]::Run()
