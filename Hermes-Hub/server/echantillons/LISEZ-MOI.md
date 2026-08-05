# Les échantillons — de vrais PDF, pas des imitations

> ⏱ **Achevé** le 5 août 2026 à **16:35**

Trois PDF **réellement imprimés par Chrome 151.0.7922.75** sur ce poste, le
5 août 2026. Ils servent `execution.test.js`, et ils ne sont pas décoratifs :
le détecteur de livrable en creux ne lit pas un PDF, il lit ce que Chrome en a
fait — et c'est exactement là que la version précédente se trompait.

| Fichier | Ce que c'est | Ce qu'il doit déclencher |
|---|---|---|
| `erreur-chrome-fr.pdf` | `--print-to-pdf` sur un fichier absent, locale française | **bloque** — page d'erreur |
| `erreur-chrome-en.pdf` | le même, `--lang=en-US` | **bloque** — page d'erreur |
| `vrai-contenu.pdf` | un vrai document d'une page | **passe** — c'est un livrable |

## Pourquoi de vrais fichiers, et pas un PDF fabriqué à la main

Parce que le défaut à attraper vit dans le **codage**, pas dans le texte. Un
échantillon écrit à la main porterait le texte qu'on croit que Chrome écrit —
et c'est précisément la croyance qui était fausse. Ce que Chrome met vraiment
dans le flux :

```
FR  « Impossible d'accder  v otr e fichier [...] ERR_FILE_NO T_FOUND »
EN  « Y our file couldnÔt be accessed [...] ERR_FILE_NO T_FOUND »
```

Accents perdus, apostrophe en `Ô`, et **une espace au milieu des mots** — y
compris dans `ERR_FILE_NO T_FOUND`. Trois des quatre signatures du détecteur ne
pouvaient donc mordre sur rien, et personne ne l'avait vu parce qu'aucun test
n'avait jamais vu un vrai PDF.

**Un banc d'essai ne doit rien affirmer qu'il ne mesure** — la leçon du 5 août
à 02:38, appliquée ici.

## Les refabriquer

```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"

& $chrome --headless=new --disable-gpu --no-pdf-header-footer `
  --print-to-pdf="erreur-chrome-fr.pdf" "file:///C:/dossier-absent/introuvable.html"

& $chrome --headless=new --disable-gpu --no-pdf-header-footer --lang=en-US `
  --print-to-pdf="erreur-chrome-en.pdf" "file:///C:/dossier-absent/introuvable.html"
```

Une page d'erreur pèse ~24 Ko. Si une version future de Chrome change sa mise en
page, **les tests le diront** — et c'est le but : ils tiennent le codage réel,
pas une idée de ce codage.
