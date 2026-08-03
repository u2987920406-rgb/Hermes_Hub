<#
  Demarre le serveur local du Hub sans fenetre de terminal et pose une icone
  dans la zone de notification (a cote de l'horloge).

  Pourquoi : avec un terminal visible, fermer la mauvaise fenetre coupait le
  Hub sans le vouloir. Ici la seule facon de l'arreter est le menu de l'icone.

  Ce script est lance par Hermes-Hub.vbs, qui le demarre sans console.
  Il vit dans <workspace>\Hermes-Hub\ : le workspace est le dossier parent.

  IL NE DOIT JAMAIS ECHOUER EN SILENCE. Signale le 03/08/2026 : sur certains
  postes l'icone n'apparaissait pas, et l'utilisateur n'avait rien - pas de
  fenetre, pas de message, rien dans les journaux. C'est la consequence directe
  d'un script qui tourne cache : une exception le tue sans laisser de trace,
  car `hub-erreurs.log` ne recoit que la sortie d'erreur de node, jamais celle
  de PowerShell.

  D'ou la forme d'ici : tout le flux est sous `try`, chaque etape ecrit dans
  `lanceur.log`, et toute panne se termine par une boite de dialogue qui nomme
  le fichier a lire. On ne sait pas encore POURQUOI ces postes echouent - on
  s'assure qu'ils le disent.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$hub = $PSScriptRoot
$workspace = Split-Path $hub -Parent
$port = 4317
$url = "http://127.0.0.1:$port"
$env:HERMES_WORKSPACE = $workspace

# -----------------------------------------------------------------------------
# Le journal du lanceur
# -----------------------------------------------------------------------------
# A cote du script si possible. Sinon dans TEMP - et ce repli n'est pas
# theorique : un dossier de travail non inscriptible est justement l'une des
# pannes qu'on cherche a voir. Un journal qu'on ne peut pas ecrire la ou on
# echoue ne sert a rien.
$script:journal = Join-Path $hub 'lanceur.log'
try {
    [System.IO.File]::AppendAllText($script:journal, '')
} catch {
    $script:journal = Join-Path $env:TEMP 'hermes-hub-lanceur.log'
}

function Write-Journal($texte) {
    try {
        $ligne = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $texte
        Add-Content -Path $script:journal -Value $ligne -Encoding UTF8
    } catch {
        # Meme le repli a echoue : on ne va pas faire tomber le lanceur pour
        # une ligne de journal.
    }
}

function Show-Erreur($texte) {
    Write-Journal "ECHEC : $texte"
    [System.Windows.Forms.MessageBox]::Show(
        "$texte`n`nDetail : $script:journal",
        'Hermes Hub',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

# -----------------------------------------------------------------------------
# Qui repond sur le port
# -----------------------------------------------------------------------------
<#
  Trois reponses possibles, et il a fallu les distinguer.

  L'ancienne version ne demandait que « le port repond-il ? ». Si oui, elle
  ouvrait le navigateur et sortait - SANS POSER D'ICONE. Un autre logiciel sur
  4317 suffisait donc a produire exactement le symptome rapporte : pas d'icone,
  et un onglet ouvert sur un serveur qui n'est pas le notre.

  `/api/health` tranche : c'est le Hub qui repond, ou ce n'est pas lui.
#>
function Get-EtatPort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect('127.0.0.1', $port)
    } catch {
        return 'libre'
    } finally {
        $client.Close()
    }

    try {
        $r = Invoke-WebRequest -Uri "$url/api/health" -UseBasicParsing -TimeoutSec 3
        if ($r.Content -match '"ok"\s*:\s*true') { return 'hub' }
    } catch {
        # Le port repond mais pas en HTTP, ou pas comme le Hub.
    }
    return 'occupe'
}

# -----------------------------------------------------------------------------
# Le lancement
# -----------------------------------------------------------------------------
try {
    Write-Journal "--- demarrage ---  hub=$hub"

    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Show-Erreur "Node.js est introuvable.`n`nRelance installer.bat, puis ouvre une nouvelle session Windows."
        exit 1
    }

    $etat = Get-EtatPort
    Write-Journal "port $port : $etat"

    if ($etat -eq 'hub') {
        # Deja lance : on montre l'instance existante plutot que d'en demarrer
        # une seconde. Elle a deja son icone.
        Start-Process $url
        exit 0
    }
    if ($etat -eq 'occupe') {
        Show-Erreur "Le port $port est deja pris par un autre programme.`n`nHermes Hub ne peut pas demarrer tant qu'il n'est pas libre."
        exit 1
    }

    $sortie = Join-Path $hub 'hub.log'
    $erreurs = Join-Path $hub 'hub-erreurs.log'

    # La redirection ecrit dans le dossier du Hub. Si ce dossier n'est pas
    # inscriptible - Documents redirige vers OneDrive et synchronise au mauvais
    # moment, par exemple - `Start-Process` leve, et l'ancienne version mourait
    # la, avant l'icone. On demarre alors sans journaux plutot que pas du tout :
    # un Hub qui tourne sans trace vaut mieux qu'un Hub qui ne tourne pas.
    try {
        $script:serveur = Start-Process -FilePath $node.Source `
            -ArgumentList "`"$hub\server\index.js`"" `
            -WorkingDirectory $hub `
            -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput $sortie -RedirectStandardError $erreurs
    } catch {
        Write-Journal "redirection impossible ($($_.Exception.Message)) - demarrage sans journaux"
        $script:serveur = Start-Process -FilePath $node.Source `
            -ArgumentList "`"$hub\server\index.js`"" `
            -WorkingDirectory $hub `
            -WindowStyle Hidden -PassThru
    }

    # Le serveur met un instant a ouvrir le port : on attend jusqu'a 10 s.
    $pret = $false
    foreach ($essai in 1..40) {
        if ($script:serveur.HasExited) { break }
        if ((Get-EtatPort) -eq 'hub') { $pret = $true; break }
        Start-Sleep -Milliseconds 250
    }

    if (-not $pret) {
        try { if (-not $script:serveur.HasExited) { $script:serveur.Kill() } } catch {}
        # Deux double-clics coup sur coup : l'autre instance a gagne la course
        # et tient deja le port. Rien a signaler, on montre juste l'interface.
        if ((Get-EtatPort) -eq 'hub') {
            Write-Journal 'une autre instance a gagne la course'
            Start-Process $url
            exit 0
        }
        $detail = ''
        if (Test-Path $erreurs) { $detail = (Get-Content $erreurs -Tail 5 -ErrorAction SilentlyContinue) -join ' ' }
        Write-Journal "le serveur n'a pas ouvert le port. node dit : $detail"
        Show-Erreur "Le Hub n'a pas demarre."
        exit 1
    }

    Write-Journal 'serveur pret'

    # --- Icone de la zone de notification -------------------------------------
    $fichierIcone = Join-Path $workspace 'icons\hermes-hub.ico'
    $script:tray = New-Object System.Windows.Forms.NotifyIcon
    if (Test-Path $fichierIcone) {
        try {
            $script:tray.Icon = New-Object System.Drawing.Icon $fichierIcone
        } catch {
            # Un .ico illisible ne doit pas coder l'absence d'icone : on prend
            # celle du systeme et on le note.
            Write-Journal "icone illisible ($fichierIcone) : $($_.Exception.Message)"
            $script:tray.Icon = [System.Drawing.SystemIcons]::Application
        }
    } else {
        Write-Journal "icone absente ($fichierIcone) - icone systeme utilisee"
        $script:tray.Icon = [System.Drawing.SystemIcons]::Application
    }
    $script:tray.Text = "Hermes Hub - 127.0.0.1:$port"

    $menu = New-Object System.Windows.Forms.ContextMenuStrip
    $ouvrir = $menu.Items.Add('Ouvrir le Hub')
    $dossier = $menu.Items.Add('Ouvrir le dossier de travail')
    $menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
    $arreter = $menu.Items.Add('Arreter le Hub')

    $script:tray.ContextMenuStrip = $menu
    $script:tray.Visible = $true
    Write-Journal 'icone posee dans la zone de notification'

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
                Write-Journal 'le serveur s est arrete de lui-meme'
                $script:tray.ShowBalloonTip(5000, 'Hermes Hub', "Le serveur s'est arrete.", [System.Windows.Forms.ToolTipIcon]::Warning)
                Start-Sleep -Milliseconds 500
                Stop-Hub
            }
        })
    $veille.Start()

    # Windows 11 range les icones nouvelles dans le debordement, derriere le
    # chevron. La bulle est donc le seul moment ou l'utilisateur apprend que
    # l'icone existe et ou la chercher.
    $script:tray.ShowBalloonTip(6000, 'Hermes Hub',
        "Le Hub tourne. L'icone est pres de l'horloge - clique le chevron si tu ne la vois pas. Clic droit pour l'arreter.",
        [System.Windows.Forms.ToolTipIcon]::Info)

    Start-Process $url

    [System.Windows.Forms.Application]::Run()
} catch {
    # Le filet. Sans lui, toute exception imprevue tuait le script sans laisser
    # la moindre trace - c'est precisement la panne qu'on n'arrivait pas a
    # diagnostiquer sur les postes ou l'icone n'apparaissait pas.
    Write-Journal "exception : $($_.Exception.Message)"
    Write-Journal "  a la ligne $($_.InvocationInfo.ScriptLineNumber) : $($_.InvocationInfo.Line.Trim())"
    Show-Erreur "Hermes Hub n'a pas pu demarrer.`n`n$($_.Exception.Message)"
    exit 1
}
