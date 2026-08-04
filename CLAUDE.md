# Hermès Hub — à lire en ouvrant ce dépôt

> ⏱ **Écrit** le 4 août 2026 à **20:18** · **révisé** le 4 août 2026 à **23:40**
> détail : `git log --follow -- CLAUDE.md`
>
> **Convention d'horodatage du dépôt.** Tout document porte, sous son titre,
> `⏱ **Achevé** le <date> à <heure>`. La date d'écriture est la seule que
> `git log` ne saura jamais donner : il enregistre le **commit**, et sept
> documents écrits le 4 août entre 11h et 16h ont été commités d'un bloc à
> 17:31. Sans heure, deux documents du même jour ne se départagent pas — c'est
> ce qui a permis de voir que `VISION-STUDIO.md` contredisait le plan.
>
> **Cinq documents portent en plus `**révisé**`, et eux seuls sont tenus par la
> barrière de commit** : s'ils changent sans que cette ligne bouge, le commit est
> refusé. Ce sont ceux qui **arbitrent** — `PLAN-DE-TRAVAIL.md`,
> `VISION-STUDIO.md`, `DEMARRER-ICI.md`, `GRAMMAIRE-PANNEAUX.md`, et ce fichier.
> Les autres gardent leur date d'achèvement sans la contrainte : marquer tout le
> monde ferait payer une taxe à chaque commit, et une barrière qu'on contourne
> par réflexe est morte.
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
  différents, et le premier fait passer le second pour acquis. Le protocole est
  juste en dessous, et il n'est pas facultatif.

---

## Un document qui arrive — le protocole d'entrée

Un plan, une vision, une spec, un compte rendu : **rien n'entre dans ce dépôt
sans passer ces cinq pas.** Ils viennent du 4 août 2026, où `VISION-STUDIO.md`
est entré parce qu'il était mal rangé — et où la confrontation complète a montré
que **sur ses onze décisions, une seule tenait encore.**

1. **Le dater avant de le bouger.** Relever son heure d'écriture *avant* tout
   déplacement : sous Windows, un `Move` écrase la date de création et la
   remplace par celle de la dernière écriture. Une fois déplacé, l'information
   est perdue pour de bon. Poser le bloc `⏱ **Achevé** le <date> à <heure>`.
2. **Le confronter, pas le ranger.** Point par point, contre les quatre qui font
   autorité : `PLAN-DE-TRAVAIL.md`, `maquette-parcours.html`,
   `GRAMMAIRE-PANNEAUX.md`, `FRICTIONS-PARCOURS.md`. **Pas contre un seul** — le
   4 août, la comparaison au plan seul avait trouvé quatre écarts et laissé
   croire le reste propre ; il y en avait six de plus.
3. **Marquer sur place** ce qui est périmé — barré, avec ce qui l'a remplacé.
   Un avertissement en tête n'arrête personne : on saute au paragraphe qui
   intéresse. Une ligne barrée, si.
4. **Remonter les orphelins** au §6 de `PLAN-DE-TRAVAIL.md` — ce qui n'est ni
   vrai ni faux, mais que plus rien ne porte. Laissé dans un document périmé,
   c'est enterré.
5. **Dire où la vérification s'arrête.** C'est le seul pas qu'aucune machine ne
   tiendra jamais, et c'est celui qui a fonctionné : « j'ai comparé au plan
   seulement » a suffi à déclencher la confrontation complète.

**Ce qui est automatique et ce qui ne l'est pas.** La barrière de commit refuse
un `.md` neuf à la racine sans bloc `⏱` : un document ne peut plus entrer sans
sa date. Elle ne peut rien dire du reste — une machine garantit qu'un document
**porte une date**, jamais qu'il **dit vrai**.

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
