# Consigne pour qui teste cette installation

> À donner tel quel à la personne — ou à l'instance — qui fera les essais.
> Elle n'a besoin d'aucun historique : tout ce qu'il faut savoir est ici.

---

## Ce qu'on te demande

Installer ce produit sur une machine neuve, et **dire ce qui ne marche pas**.

Tu n'es pas là pour réparer. Tu es là pour **observer et rapporter**. Une panne
que tu corriges sans la décrire est une panne qu'on livrera chez un client.

**Ne modifie aucun fichier du produit.** Si quelque chose casse, note l'erreur
exacte, la commande qui l'a produite, et continue les autres sections. Un test
interrompu à la première difficulté ne dit presque rien ; un test mené au bout
avec quatre échecs notés dit tout.

---

## Le contexte, en cinq lignes

**Hermes Hub** est une interface web locale qui pilote une équipe d'agents IA.
Elle est destinée à être installée chez des clients. On prépare une version 2 :
elle exécute désormais de vrais graphes de tâches, compte ce que ça coûte,
demande les autorisations qui comptent, et retient ce qui a marché.

Le produit est **en construction**. Plusieurs choses n'ont jamais été
vérifiées ailleurs que sur le poste de développement — elles sont nommées plus
bas. C'est précisément ce qu'on veut savoir.

---

## Ce dont tu as besoin

- Une machine **Windows** que tu peux salir : l'installateur pose des logiciels
  (Node, Python, Git, Hermes Agent), crée un dossier dans `Documents`, et met
  un raccourci sur le Bureau.
- Une connexion internet.
- **Un compte Hermes** (Nous Portal). Sans identifiants, les agents ne
  répondront pas et les sections 3, 6, 7 seront impossibles.
- Environ **deux heures**, dont une d'attente pendant que des agents travaillent.

---

## L'ordre, et il compte

### 1. Installer

Clic droit sur `installer.bat` → **Exécuter en tant qu'administrateur**.

Deux questions te seront posées. **Réponds `o` aux deux** : sinon tu ne pourras
pas tester ce qu'elles activent.

- « Utiliser le profil pré-rempli ? » → `o`
- « Installer ce service d'automatisation ? » → `o`

**Note tout ce qui s'affiche en rouge ou commence par « ERREUR » ou
« Attention »**, même si l'installation continue ensuite.

### 2. Fermer la session Windows, et la rouvrir

Ce n'est pas facultatif. Les logiciels installés ne sont pas dans le `PATH` de
la session en cours. Sans ce redémarrage, tout ce qui suit échouera pour une
raison qui n'a rien à voir avec le produit.

### 3. Vérifier — `VERIFIER-INSTALLATION.md`

```
python verif/verifier-installation.py
```

**Le verdict est le code de sortie.** `0` = tout est en place. Sinon le bilan
nomme chaque manque.

**Si ce contrôle échoue, arrête-toi et rapporte.** Tester les fonctions sur une
installation incomplète te ferait chercher des pannes au mauvais endroit.

### 4. Éprouver — `TESTER-LES-FONCTIONS.md`

Douze sections, à la souris. Coche au fur et à mesure.

---

## Quatre pièges à connaître

**Le coût.** La plupart des contrôles sont gratuits. Trois ne le sont pas et
appellent un modèle : la section 3 (la demande devient un graphe), la section 6
(l'exécution d'un pôle), et l'option `--avec-modele` du vérificateur. Ne les
répète pas en boucle.

**La section 7 du vérificateur** — « aucune donnée héritée » — n'a de sens que
sur une machine **neuve**. Sur un poste déjà utilisé elle signalera les fichiers
de son propriétaire, et **ce n'est pas une panne**.

**Windows 11 cache les icônes nouvelles** derrière le chevron `^` de la barre
des tâches. Avant de conclure que l'icône du Hub n'apparaît pas, clique dessus.

**La lenteur n'est pas une panne.** Un agent met parfois plusieurs minutes. Le
Hub coupe de lui-même à trente minutes. Une décomposition peut prendre de 20 à
90 secondes — c'est mesuré et normal.

---

## Ce qui n'a jamais été vérifié ailleurs

Sois particulièrement attentif là-dessus — c'est la vraie raison de ce test.

| | Ce qu'on ne sait pas |
|---|---|
| **`installer.bat` en entier** | Chaque bloc a été éprouvé isolément. **La chaîne complète n'a jamais tourné.** C'est la première fois. |
| **Le repêchage** (§9) | Quand un agent écrit son livrable à côté du pôle, le Hub va le chercher. Testé unitairement, **jamais vu marcher sur un vrai run**. |
| **L'icône de notification** (§1) | Elle manque sur certains postes, sans qu'on sache pourquoi. Le lanceur écrit maintenant un journal — c'est lui qu'il nous faut. |
| **Le routage** (§3) | Trois agents à l'écran ne prouvent pas que le décomposeur les appelle. |

---

## Ce que tu dois rapporter

Par ordre d'utilité pour nous :

**1. Le routage.** Combien de tâches sur combien sont allées à un spécialiste
(`a-analyste`, `b-redacteur`, `c-metteur`) plutôt qu'à Hermès. Donne le nombre,
et recopie la liste des tâches avec leur assignataire.

**2. Le journal du lanceur**, si l'icône n'apparaît pas. Un de ces deux
fichiers, en entier :

```
Documents\Hermes-<prénom>\Hermes-Hub\lanceur.log
%TEMP%\hermes-hub-lanceur.log
```

**3. Le repêchage.** As-tu vu passer la ligne
`<fichier> ecrit hors du pole - range dans <nom du pole>` ? Où le fichier a-t-il
fini ?

**4. Chaque endroit où tu t'es senti coincé sans issue.** Un bouton absent, un
message qui ne dit pas quoi faire, un écran dont on ne peut pas sortir. C'est
ce qui manque le plus, et aucun script ne peut le trouver.

**5. La sortie complète de l'installateur**, si quelque chose a échoué. Le nom
de l'étape (`[7/13]`, `[10 bis]`…) suffit à situer la panne.

### La forme du rapport

Pour chaque problème :

```
SECTION   : 6 - le laissez-passer
CE QUE J'AI FAIT : lancé le pôle, attendu la première écriture
ATTENDU   : une carte « ton accord ? » en rouge sur le nœud
OBTENU    : rien, l'agent a écrit sans rien demander
COPIE     : <le message exact, ou le contenu du journal>
```

Trois lignes précises valent mieux qu'une page d'interprétation. **Ne devine
pas la cause** — décris ce que tu as vu.

---

## Ce que tu ne dois pas faire

- **Ne corrige rien** dans le produit, même si la correction est évidente.
- **Ne relance pas** un test qui a échoué en espérant qu'il passe : note-le,
  puis continue.
- **N'installe rien d'autre** pour contourner un manque : c'est le manque qui
  nous intéresse.
- **Ne saute aucune section** parce qu'elle « a l'air de marcher ». Un test
  sauté est un test raté.
- **N'invente aucun résultat.** Si tu n'as pas pu faire une section, écris que
  tu n'as pas pu, et pourquoi. Un rapport honnête et incomplet vaut infiniment
  mieux qu'un rapport complet et supposé.

---

## Si tu ne peux vraiment pas continuer

Dis-le, en nommant ce qui bloque. Puis fais ce qui reste faisable — la plupart
des sections sont indépendantes les unes des autres. Une seule dépend
strictement d'une autre : il faut un pôle qui a tourné (§3, §6) avant de
pouvoir tester les compteurs (§7), la sortie d'impasse (§8) et la mise en
mémoire (§12).
