# Fabriquer un PDF

> ⏱ **Achevé** le 5 août 2026 à **12:40**
>
> _Ce fichier n'est pas chargé au démarrage. Va le lire quand une tâche demande
> un PDF — la mémoire te le dit._

Il n'y a **aucun générateur de PDF** sur ce poste, et il n'en faut pas : Chrome
est déjà installé et sait imprimer une page. On écrit donc du HTML avec du CSS,
et Chrome en fait le PDF.

## La commande

```powershell
$page = "C:\...\dossier.html"
$sortie = "C:\...\dossier.pdf"

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

& $chrome --headless=new --disable-gpu --no-pdf-header-footer `
  --print-to-pdf="$sortie" ([Uri]$page).AbsoluteUri
```

## La ligne qui compte, et pourquoi

**`([Uri]$page).AbsoluteUri`.** Elle transforme `C:\Mes dossiers\a.html` en
`file:///C:/Mes%20dossiers/a.html`.

Sans elle, un chemin qui contient un espace est coupé au premier blanc — et un
dossier de scénario en contient **toujours**, puisqu'il porte la demande en
entier. Chrome ne trouve alors rien, affiche `ERR_FILE_NOT_FOUND`… **et imprime
cette page d'erreur.** Le PDF sort à 24 Ko et ne contient que le message du
navigateur.

Ce n'est pas une hypothèse : c'est arrivé deux fois, les **1er** et
**5 août 2026**. La seconde a produit `dossier_dirigeants.pdf`, 24 Ko, déclaré
livrable d'un scénario terminé.

## Vérifier avant de rendre — toujours

- **Ouvre le PDF que tu viens de produire.** Un document de plusieurs pages qui
  pèse moins de 30 Ko est presque toujours une page d'erreur ;
- s'il porte `ERR_`, « site can't be reached » ou « fichier introuvable », ce
  n'est pas un livrable, c'est un échec déguisé en fichier ;
- dans le doute, **dis-le plutôt que de rendre**. Un travail annoncé fini et
  vide coûte plus cher qu'un travail annoncé bloqué : personne ne va vérifier
  ce qui est marqué terminé.

## Ce que Chrome imprime, et ce qu'il n'imprime pas

- `@page { size: A4; margin: 18mm; }` fixe le format. Sans ça, Chrome prend
  Letter et ajoute ses propres marges ;
- **aucun script.** Une page qui se remplit en JavaScript sort blanche : tout ce
  qui doit apparaître doit être dans le HTML au moment où on l'écrit ;
- les **images en chemin absolu**, et elles subissent la même règle d'encodage
  que la page elle-même ;
- les **polices du système** seulement. Une police téléchargée depuis le web ne
  sera pas là — Georgia, Times, Arial, Segoe UI le sont.

## Où la vérification s'arrête

Cette recette n'a **pas** été jouée sur le poste au moment où elle a été écrite.
Le diagnostic — le chemin non encodé — vient de la taille du fichier et de la
signature d'erreur, pas de la lecture du PDF fautif. La commande, elle, est la
forme standard de Chrome. **Le jour où quelqu'un la joue pour de vrai, qu'il
remplace ce paragraphe par ce qu'il a mesuré.**
