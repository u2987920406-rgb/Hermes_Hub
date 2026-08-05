# Fabriquer un PDF

> ⏱ **Achevé** le 5 août 2026 à **12:40** · **joué pour de vrai** le 5 août 2026
> à **15:56**
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
`file:///C:/Mes%20dossiers/a.html`. Garde-la : elle ne coûte rien et elle rend
la commande vraie dans **tous** les shells.

> ⚠ **Mais ce n'est pas elle qui a produit les PDF de 24 Ko — mesuré le 5 août
> à 15:56, et le diagnostic d'origine était faux.**
>
> ~~Sans elle, un chemin qui contient un espace est coupé au premier blanc.~~
> **En PowerShell, non.** Éprouvé sur `…\Portrait de Lucas Ferrand\dossier.html`,
> Chrome 151.0.7922.75 : la commande **avec** `AbsoluteUri` et la commande
> **sans** (`"file:///$page"`, espace compris) rendent deux fichiers de
> **74 618 octets au même SHA-256**. PowerShell passe une chaîne entre
> guillemets comme **un seul argument** — il ne la découpe pas.
>
> Le découpage existe, mais ailleurs : dès qu'on construit la ligne comme un
> **texte brut** — `cmd.exe`, un `Start-Process -ArgumentList` mal formé, un
> `subprocess` sans liste. Reproduit ce jour-là avec
> `Start-Process -ArgumentList @(…)` : Chrome répond *« Multiple targets are not
> supported in headless mode »* et sort en **13**. Et c'est le chemin de
> **sortie** qui a cassé, pas celui d'entrée.

**La vraie cause d'un PDF de 24 Ko est plus bête et plus fréquente : le fichier
HTML n'était pas là.** Chrome imprime alors sa page d'erreur. C'est ce
qu'`execution.js` avait déjà relevé pour l'incident du 3 août — le maquettiste
avait écrit son `.html` dans un dossier de travail **éphémère, effacé
entre-temps**. Reproduit à l'identique le 5 août en pointant Chrome sur un
fichier absent : **24 879 octets**, à 44 octets de l'incident réel (24 923).

Ce n'est donc pas une hypothèse : c'est arrivé deux fois, les **1er** et
**5 août 2026**. La seconde a produit `dossier_dirigeants.pdf`, 24 Ko, déclaré
livrable d'un scénario terminé.

**Ce qu'il faut en retenir pour ne pas le refaire :** vérifie que ton `.html`
existe **au moment où tu lances Chrome**, pas au moment où tu l'as écrit. Un
dossier de travail peut disparaître entre les deux.

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

> ~~Cette recette n'a **pas** été jouée sur le poste au moment où elle a été
> écrite. Le diagnostic — le chemin non encodé — vient de la taille du fichier
> et de la signature d'erreur, pas de la lecture du PDF fautif.~~
> **Jouée le 5 août 2026 à 15:56. Ce paragraphe est remplacé par la mesure, comme
> il le demandait.**

**Ce qui a été joué**, sur ce poste, Chrome **151.0.7922.75**, dossier
`…\Portrait de Lucas Ferrand\` (avec ses espaces) :

| Ce qu'on a lancé | Résultat |
|---|---|
| la commande de cette fiche, telle quelle | **74 618 o**, document lisible ✅ |
| la même **sans** `AbsoluteUri`, espaces bruts | **74 618 o**, même SHA-256 — le piège ne se produit pas en PowerShell |
| la ligne construite en **texte brut** (`Start-Process -ArgumentList`) | `Multiple targets are not supported`, **exit 13**, aucun fichier |
| Chrome sur un **fichier absent** | **24 879 o** — la page d'erreur, à 44 o de l'incident réel |

**Ce qui n'a pas été vérifié**, et il faut le savoir :

- la recette n'a été jouée **qu'en PowerShell**. Sous `cmd.exe`, sous `bash`, ou
  depuis l'outil terminal d'un agent, le découpage au premier blanc **peut**
  se produire : c'est le cas de la troisième ligne du tableau. L'encodage reste
  donc la bonne habitude, pour une raison différente de celle qu'on croyait ;
- `@page`, les polices système et « aucun script » **n'ont pas été éprouvés
  séparément** — le document d'essai les utilisait tous et il est sorti juste,
  ce qui ne dit pas lequel aurait cassé seul ;
- la page d'erreur a été produite **en français et en anglais**. Les autres
  langues n'ont pas été regardées.

*Ce que la mesure a servi ailleurs :* les trois PDF sont entrés dans le dépôt du
Hub comme échantillons de test — `Hermes-Hub/server/echantillons/` — et ils y ont
trouvé un défaut. Le détecteur de livrable en creux ne mordait que par **une
signature sur quatre**. Voir le `LISEZ-MOI.md` de ce dossier.
