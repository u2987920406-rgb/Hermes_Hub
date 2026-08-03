# Vérifier une installation — à lancer juste après `installer.bat`

> À faire sur le PC qu'on vient d'installer, avant de s'en servir.
> Dure environ une minute. N'écrit rien dans l'installation.

Un installateur qui se termine par « OK » n'a prouvé qu'une chose : qu'il est
allé au bout. Il n'a pas prouvé que Node démarre, que le port s'ouvre, que
l'équipe a des credentials, ni qu'aucune donnée d'un autre poste n'a voyagé
avec lui. C'est ce que fait ce contrôle.

---

## La commande

Depuis le dossier de l'installateur :

```
python verif/verifier-installation.py
```

Il trouve tout seul l'espace de travail (`Documents\Hermes-*`, le plus récent).
S'il en existe plusieurs, désigne-le :

```
python verif/verifier-installation.py --racine "C:/Users/<prénom>/Documents/Hermes-<prénom>"
```

**Le verdict est le code de sortie.** `0` = tout est en place, `1` = il reste
une panne, et le bilan la nomme.

### Le contrôle payant, séparé

Le routage demande **un appel modèle** — c'est le seul de toute la vérification,
et il est donc hors du passage par défaut :

```
python verif/verifier-installation.py --avec-modele
```

Il pose une demande d'essai sur un tableau jetable, la fait décomposer, et
regarde à qui les tâches sont confiées. C'est le seul moyen de savoir si le
produit sait déléguer — trois agents que personne n'appelle valent zéro agent.

---

## Ce qu'il regarde, et pourquoi

Chaque contrôle correspond à quelque chose qui a réellement cassé pendant la
mise au point. Le nom du contrôle dit quoi.

| | Ce qu'il vérifie | Ce que ça attrape |
|---|---|---|
| **1** | `node`, `python`, `hermes` répondent | Le PATH ne suit pas tant qu'on n'a pas rouvert une session Windows |
| **2** | Vault, Projets, Hub, lanceur, icônes | Une copie interrompue laisse un Hub sans son lanceur, donc sans icône |
| **3** | Scripts, template, `Resumes-Sessions` vides, `MEMORY.md` | Les scripts calculent leur racine comme leur dossier parent : mal rangés, ils cherchent `Vault/` au mauvais endroit **sans le dire** |
| **4** | `a-analyste`, `b-redacteur`, `c-metteur` : description **et** credential | Une description vide, et le décomposeur n'a personne à qui confier la tâche. Un `.env` vide, et l'agent ne répond jamais |
| **5** | Le serveur démarre, `/api/health`, l'équipe vue par le Hub | Le Hub et la ligne de commande peuvent lire deux équipes différentes |
| **6** | `nourrir-vault.py` et `resume-sessions.py` s'exécutent | Ils levaient une trace Python sur un poste sans dossier `Projets` |
| **7** | Aucune donnée héritée d'un autre poste | Le pack d'origine annonçait des `Resumes-Sessions` vides et contenait sept sessions réelles |
| **8** | Le routage *(avec `--avec-modele`)* | Trois agents à l'écran ne prouvent pas que le décomposeur les appelle |

Le serveur est démarré sur un **port libre au-dessus de 4331**, avec un espace
de travail temporaire : il ne touche ni ton port habituel, ni tes données, et
il est arrêté à la fin.

---

## Lire le résultat

```
  38 controles, 0 echec(s).
  Tout est en place.
```

Sinon, chaque échec porte sa cause. Les trois qu'on rencontre le plus :

**`node INTROUVABLE`** — l'installation s'est bien passée, mais le PATH de la
session en cours date d'avant. Ferme la session Windows, rouvre-la, relance le
contrôle. Ce n'est pas une réinstallation qu'il faut.

**`profil a-analyste absent`** — les trois rôles n'ont pas été créés. Vérifie que
l'étape `[10 bis] Equipe de depart` est bien passée dans la sortie de
l'installateur. À la main :

```
hermes profile create a-analyste --clone-from default --description "Analyse. ..."
```

**`N fichier(s) portent des traces d'un autre poste`** — sur un poste neuf,
c'est grave : des données ont voyagé avec l'installateur. **Sur une machine
déjà utilisée, c'est normal** — ce sont ses propres fichiers. Ce contrôle ne
veut dire quelque chose que là où rien n'a encore été produit.

---

## Le contrôle que ce fichier ne fait pas

**L'icône dans la zone de notification.** Elle demande une vraie session
graphique et un double-clic ; aucun script ne peut l'observer à ta place.

Fais-le à la main, c'est trente secondes :

1. Double-clic sur **Hermes Hub** au Bureau.
2. Une bulle apparaît près de l'horloge. **Windows 11 range les icônes
   nouvelles derrière le chevron `^`** — clique dessus si tu ne la vois pas.
3. Ferme l'onglet du navigateur : le Hub doit continuer de tourner.
4. Clic droit sur l'icône → **Arrêter le Hub**.

Si rien n'apparaît, le lanceur écrit désormais ce qui lui est arrivé :

```
Documents\Hermes-<prénom>\Hermes-Hub\lanceur.log
```

Et si ce dossier n'était pas inscriptible — le cas qu'on soupçonne sur les
postes où l'icône manquait — il bascule sur :

```
%TEMP%\hermes-hub-lanceur.log
```

Avant, ce script mourait en silence : pas de fenêtre, pas de message, rien dans
les journaux. C'était impossible à diagnostiquer à distance. Maintenant toute
panne se termine par une boîte de dialogue qui nomme le fichier à lire.

---

## Pendant l'installation : la seule étape qui peut se figer

**Observé le 03/08/2026, sur un second poste.** L'étape `[4/13]` télécharge
Chromium pour Playwright — 172 Mo — puis l'extrait **sans rien afficher**.
Elle s'est arrêtée net après `100% of 172.8 MiB` : plus aucun CPU, dossier
`ms-playwright` figé à la même taille sur trois mesures, huit minutes de rien.

Le remède est sans risque, et c'est la structure de l'installateur qui le rend
sans risque :

1. **Ferme la fenêtre** — pas `Ctrl+C`. Rien n'est perdu : les profils et la
   mémoire ne sont écrits qu'à partir de l'étape 6.
2. **Relance `installer.bat`.** L'étape 4 commence par tester si Hermès
   *répond*. S'il répond, tout le bloc de téléchargement est **sauté** et la
   reprise se fait directement à `[4b/13]`.

Pour distinguer un blocage d'une simple lenteur, dans un **second** terminal :

```powershell
$p = "$env:LOCALAPPDATA\ms-playwright"
"{0:N0} Mo" -f ((Get-ChildItem $p -Recurse -File -EA 0 | Measure-Object Length -Sum).Sum / 1MB)
```

Refais-la trente secondes plus tard. **Si le nombre a bougé, ça travaille** —
laisse faire, sur une ligne lente ce téléchargement prend légitimement un quart
d'heure. S'il est identique deux fois, c'est figé.

> Réflexe à écarter d'abord : une console Windows **gèle le processus** dès
> qu'un clic y sélectionne du texte. Si le titre commence par
> « Sélectionner », appuie sur **Échap** — ça repart aussitôt.

---

## Après l'installation : ce qu'on peut jeter

Si la machine avait déjà connu Hermès, le script en a mis l'ancienne copie de
côté plutôt que de l'effacer :

```
%LOCALAPPDATA%\hermes\hermes-agent.broken-<date>-<heure>
```

Plusieurs centaines de mégaoctets de poids mort. Une fois l'installation
vérifiée, ce dossier se supprime sans conséquence — **le code seul y vit**. Les
profils, la mémoire, le tableau et les clés sont un cran au-dessus, dans
`%LOCALAPPDATA%\hermes\`, et n'ont jamais été touchés.
