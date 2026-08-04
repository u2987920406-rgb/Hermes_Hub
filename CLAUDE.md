# Hermès Hub — à lire en ouvrant ce dépôt

> ⏱ **Écrit** le 4 août 2026 à **20:18** · **révisé** le 4 août 2026 à **22:35**
> détail : `git log --follow -- CLAUDE.md`
>
> **Convention d'horodatage du dépôt.** Tout document porte, sous son titre, la
> date **et l'heure** de son achèvement et de sa dernière révision. Raison : une
> version postérieure implique un changement, donc une comparaison — et sans
> heure, deux documents du même jour ne se départagent pas. C'est ce qui a permis
> de voir, le 4 août, que `VISION-STUDIO.md` contredisait le plan sur quatre
> points.
>
> ⚠ **Ne te fie pas aux dates de création Windows** : elles ont toutes été
> écrasées par les déplacements du 4 août et affichent l'heure de la dernière
> écriture. L'horodatage fiable est celui de ces blocs, plus `git log --follow`.

Tu es à la racine du projet. **Interface web locale qui pilote une équipe
d'agents IA** via la ligne de commande `hermes` — serveur Node sans aucune
dépendance, interface React construite par Vite. Elle est faite pour être
installée chez des clients.

La V2 en construction vit sur la branche `v2` ; `main` reste figée sur ce qui
est livré, et `version.json` est l'interrupteur côté clients.

---

## Si kuchu dit « on reprend », « on en était où ? »

Ne demande pas de précisions. **Fais ceci, puis dis ce que tu comptes faire.**

```
& "C:\Program Files\Git\cmd\git.exe" log -1
& "C:\Program Files\Git\cmd\git.exe" status -sb
```

**La ligne `Ensuite :` du dernier commit est le point de reprise.** Elle donne
les deux prochains coups, une phrase chacun. C'est le seul endroit où vit ce qui
était *prévu* — le journal raconte déjà ce qui a été *fait*.

Puis lis **`DEMARRER-ICI.md`** : il dit quoi lire, dans quel ordre, et pourquoi.
Ne recopie pas son contenu ici, il périmerait en double.

**Ne cherche aucun fichier de reprise.** Il n'y en a pas, et c'est volontaire :
un mémo écrit à la main pourrit quand la séance s'arrête mal — c'est-à-dire pile
quand on en a besoin. Le dépôt est la mémoire.

---

## Quatre règles qui coûtent cher si on les oublie

- **Aucune commande git sans accord explicite.** Ni `add`, ni `commit`, ni
  `push`. Le dépôt versionne `dist/` : un commit automatique embarquerait une
  interface construite dans ce qui est livré aux clients.
- **`git` n'est pas dans le PATH** : `& "C:\Program Files\Git\cmd\git.exe"`.
  Et **cette machine n'a aucune identité git globale** — chaque dépôt porte la
  sienne en local. Un dépôt neuf ne peut donc pas commiter tant qu'on ne la lui
  pose pas ; c'est voulu, ça arrête les `git init` accidentels avant les dégâts.
- **`npm run build` après toute modification de `Hermes-Hub/src/`.** Le serveur
  sert `dist/`, pas `src/` — première cause de « j'ai changé mais rien ne
  bouge ».
- **Lis `Hermes-Hub/DESIGN.md` avant de toucher à l'interface.** C'est la seule
  règle du dépôt qui n'a pas d'exception. La plupart des retouches se résolvent
  en tournant une valeur, sans ouvrir un seul composant.
- **Vérifier avant de ranger.** Un document qu'on déplace ou qu'on versionne doit
  d'abord être confronté aux plus récents : ranger et valider sont deux gestes
  différents, et le premier fait passer le second pour acquis. Le 4 août,
  `VISION-STUDIO.md` est entré dans le dépôt parce qu'il était mal rangé — il
  contredisait le plan sur quatre points, dont un qui aurait fait retirer au
  produit sa seule façon de créer un scénario. C'est kuchu qui l'a demandé, pas
  moi.

Le protocole design complet, l'atelier de réglages et la règle de `diffuser()`
sont dans **`Hermes-Hub/CLAUDE.md`**. Les décisions durables sont dans
**`ADM.md`**, cumulatif — on n'y réécrit pas, une décision qui change d'avis se
barre et la nouvelle se pose en dessous.

---

## Ce qui vit autour, et n'est pas dans ce dépôt

| Où | Ce que c'est |
|---|---|
| `../bac-a-sable-v2/` | workspace et tableau kanban d'essai. **Hors du dépôt**, volontairement |
| `Bureau\Hermes\Maintenance\` | le carnet des réglages de cette machine — **dépôt séparé**, `hermes-maintenance`. Y vit la fiche `rustine-acp.md`, sans laquelle un `hermes update` fait revenir un gel silencieux |
| `Bureau\Hermes\Sauvegardes\` | ⚠ contient `local.py.AVANT-rustine`, seul exemplaire du fichier d'origine. **Ne pas supprimer** |
| `Bureau\Methodes\Fil-Rouge\` | la méthode de projet et ses huit exemples — **dépôt séparé**, `fil-rouge-methode` |
| `Bureau\Methodes\Fil-Rouge\design-universel\` | le kit d'apparence réglable, **extrait d'ici** — dépôt séparé, `design-universel-kit`. `templates.js` y renvoie quand le Hub prépare un projet neuf |

Le Bureau a été rangé le 4 août 2026 : quatre entrées au lieu de onze, et un
`LISEZ-MOI.md` à chaque niveau. Ces chemins-là sont les bons.

**Le dossier qui contient ce dépôt n'est pas le projet.** Ouvre toujours
`Hermes-Installer`, jamais son parent : un dossier qui porte plusieurs projets
ne dit pas duquel on parle, et un agent qui s'y installe finit par y créer un
dépôt vide qui avale tout le reste. C'est arrivé le 4 août 2026.
