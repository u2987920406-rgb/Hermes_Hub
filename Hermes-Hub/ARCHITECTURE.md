# La découpe du code — où vit quoi, et pourquoi

> 4 août 2026, avant la refonte Orchestration / Studio. Écrit **depuis des
> mesures**, pas depuis un goût. Le serveur a déjà sa règle et elle est
> respectée ; c'est le front qui n'en a jamais eu.

---

## 1. Ce que la mesure dit

```
13 182 lignes de front, dont :
  OrchestrationView.tsx   1 501
  Conversation.tsx        1 414
  StudioView.tsx          1 060
  ConfigView.tsx            911
  types/index.ts            913
```

**La refonte touche les trois premiers.** Soit près de 4 000 lignes, 30 % du
front, dans trois fichiers.

Et le paquet livré pèse **573 Ko de JavaScript** (171 Ko compressé), au-dessus du
seuil d'alerte de Vite. `@xyflow/react` — le graphe — est le poids lourd, et
**seul le Studio s'en sert**.

---

## 2. Pourquoi ces fichiers ont grossi

Pas par négligence. **Rien ne disait quand découper.** `DESIGN.md` dit où
trouver une chose à l'écran, la règle du serveur dit ce qu'on a le droit
d'importer — mais aucun texte ne dit à quel moment un morceau mérite son propre
fichier. En l'absence de règle, on ajoute là où on est. C'est ce qui se passe
partout et ça n'a rien de honteux : ça se corrige avec une phrase, pas avec un
procès.

---

## 3. La règle, en une phrase

> **Un fichier répond à une seule question. Au-delà d'environ 400 lignes, il en
> contient une deuxième — va la chercher.**

Quatre cents lignes n'est pas une limite, c'est un **signal**. Un fichier de
420 lignes qui fait une seule chose est parfaitement sain. Un fichier de 300
lignes qui en fait trois ne l'est pas.

### Ce qui mérite son propre fichier

| Critère | Pourquoi |
|---|---|
| Il porte **son propre état** (`useState`, `useEffect`, un flux) | Un état partagé de force est la première cause de fichier qui enfle |
| Il est **employé à deux endroits** | Sinon il sera recopié, et les deux copies divergeront |
| C'est une **logique pure** (transformer, calculer, valider) | Elle devient lisible seule, et testable le jour où l'on veut la tester |
| C'est un **panneau, un volet, un écran** | Une surface visible est une responsabilité |

### Ce qui n'en mérite pas

Une feuille purement présentationnelle de vingt lignes — une bulle, une pastille,
une ligne de liste. Elles se groupent par **famille** dans un fichier commun
(`bulles.tsx`), et `DESIGN.md` dit déjà où les trouver par leur nom de zone. Un
fichier par bulle ne rend rien plus clair : il rend le dossier illisible.

---

## 4. L'index du design et l'arborescence sont la même carte

C'est le principe qui rend le dossier agréable à rouvrir. Une surface visible
porte un nom de zone ; **ce nom devrait être son fichier.**

```
data-zone="plan"              →  components/PanneauPlan.tsx
data-zone="raccourcis-accueil" →  pages/HomeView.tsx        (feuille, reste inline)
data-zone="organigramme"       →  components/Organigramme.tsx
```

On ne cherche plus jamais où est quelque chose : on lit le nom à l'écran, on
ouvre le fichier qui porte ce nom. Et `npm run design` vérifie déjà que l'index
ne ment pas.

---

## 5. La découpe visée, fichier par fichier

**On ne refactorise pas en plus : on découpe en écrivant.** Ces trois fichiers
vont être largement réécrits par la refonte — les couper à ce moment-là ne coûte
presque rien, alors que les couper après coûterait une séance entière.

### `Conversation.tsx` — 1 414 lignes, cinq responsabilités

| Ce qui sort | Ce qu'il tient |
|---|---|
| `Conversation.tsx` | l'état, le flux SSE, l'assemblage — **~250 lignes** |
| `BarreSaisie.tsx` | le champ, les destinataires, l'interrupteur Discussion / Atelier |
| `AnnuaireAgents.tsx` | la recherche, le filtre d'équipe, la rangée de pastilles |
| `bulles.tsx` | les feuilles du fil : moi, agent, délégation, refus, fin de tour |
| `construireFil.ts` | **logique pure** — rejouer des événements en tours |

`construireFil` est le morceau le plus précieux à sortir : c'est la seule partie
qu'on peut éprouver sans navigateur, et c'est celle où une erreur passerait
inaperçue le plus longtemps.

### `OrchestrationView.tsx` — 1 501 lignes, quatre volets dans un fichier

| Ce qui sort | Ce qu'il tient |
|---|---|
| `OrchestrationView.tsx` | la navigation entre volets, le chargement — **~200 lignes** |
| `VoletAgents.tsx` | fiches, création, équipes, outils |
| `VoletScenarios.tsx` | les vignettes et leur état |
| `VoletAutomatisations.tsx` | programmer, suspendre, modifier, retirer |
| `OrganigrammeCompetences.tsx` | la carte des compétences (neuf) |

### `StudioView.tsx` — 1 060 lignes

| Ce qui sort | Ce qu'il tient |
|---|---|
| `StudioView.tsx` | le canevas, la sélection, l'assemblage — **~250 lignes** |
| `BarreScenario.tsx` | retour, titre éditable, état, Lancer, agrandir |
| `PanneauPlan.tsx` | le plan à gauche, ses trois moments |
| `PanneauNoeud.tsx` | les réglages à droite |

---

## 6. La légèreté — une mesure, un levier

Le Studio est le **seul** consommateur de `@xyflow/react`. Le charger
paresseusement (`React.lazy` sur la route `#/studio`) sort le graphe du paquet
initial : l'accueil, les projets et le coffre cessent de payer une bibliothèque
qu'ils n'emploient pas.

**À mesurer avant / après**, et à écrire ici. Un gain supposé n'est pas un gain.

Deux règles qui restent en vigueur, sans changement :

- **le serveur n'a aucune dépendance npm** et doit le rester : `http`, `fs`,
  `child_process`, `node:sqlite`. Un serveur sans dépendance ne casse pas à
  l'installation chez un client et n'a pas de faille à suivre ;
- **une dépendance front s'ajoute en disant ce qu'elle remplace.** Vite
  l'empaquette, donc elle est invisible au client — mais elle pèse, et le
  paquet est déjà au-dessus du seuil.

---

## 7. Ce qu'on ne fait pas

**Pas de grande refonte des fichiers qu'on ne touche pas.** `ConfigView.tsx`
fait 911 lignes et pourrait être coupé ; il attendra le jour où on y travaille.
Découper du code qu'on ne modifie pas, c'est prendre le risque d'une régression
sans la contrepartie d'une fonctionnalité.

La règle qui en découle, et c'est celle qu'on applique à partir de maintenant :
**on laisse un fichier un peu plus propre qu'on ne l'a trouvé, jamais beaucoup
plus.** Un nettoyage qui déborde du travail du jour devient un chantier qu'on
n'a pas décidé d'ouvrir.

---

## 8. Est-ce que ça tient dans le temps ?

Audit de ce document par lui-même. Trois propriétés tiennent, trois ne tiennent
pas — et la plus faible des trois est une faiblesse de ce texte, pas du code.

### Ce qui tient

**Ajouter ne demande la permission de personne.** Une surface nouvelle porte un
nom de zone, donc un fichier ; `npm run design` régénère l'index tout seul. Il
n'y a **aucun registre à tenir à la main**, donc rien qui puisse se désynchroniser
en silence. C'est la propriété la plus précieuse du dispositif existant.

**Le Hub ne possède presque aucun état.** Il lit le disque, il écrit par la ligne
de commande d'Hermès. Conséquence énorme pour l'évolution : **aucun schéma à
migrer, aucun cache à invalider.** Une fonctionnalité de plus lit un fichier de
plus et appelle une commande de plus. C'est ce qui a permis d'ajouter les
équipes, les outils MCP et les sauvegardes en quelques séances.

**La portée d'une erreur est bornée à l'écran.** Supprimer un composant ne peut
pas abîmer des données — elles ne sont pas ici. Le pire cas d'une refonte de
front, c'est un écran cassé, jamais un client qui perd son travail.

### Ce qui ne tient pas

**`types/index.ts` — 913 lignes, et tout passe par là.** Ce fichier n'a ni zone
ni responsabilité unique : c'est un carrefour. Chaque fonctionnalité l'édite,
donc deux chantiers en parallèle s'y télescopent, et plus il grossit moins on ose
y toucher. **La règle du §3 ne le couvre pas** — c'est le trou de ce document.

*Correction, au fil de l'eau :* le découper par domaine — `types/agents.ts`,
`types/scenario.ts`, `types/chat.ts` — avec un `types/index.ts` qui ne fait plus
que ré-exporter. Aucun import existant ne casse, et on découpe un domaine le jour
où on le touche.

**`lib/api.ts` — 491 lignes, un objet plat.** Même carrefour, même remède : un
fichier par domaine, un `api` composé à la fin. Là encore, aucun appelant ne
change.

**Supprimer n'est prévu nulle part.** Ce document parle d'ajouter et de découper ;
il ne dit rien de retirer. Et le dépôt en porte déjà la trace : `ecrireEquipes`
est resté inutilisé depuis le premier jour, `modifierAgent` est du code mort
aujourd'hui. **Ce n'est pas de la négligence : rien ne signalait leur mort.**

### Trois mécanismes pour que ça tienne quand même

Une règle sans vérification est un vœu. `DESIGN.md` tient depuis des mois **parce
qu'un script le vérifie** ; ce document n'a rien de tel, et il pourrira
exactement comme la règle absente qui a laissé trois fichiers atteindre 1 500
lignes.

**1. Le cliquet des tailles.** Un fichier `design/tailles.json` enregistre la
taille actuelle de chaque fichier. La vérification échoue si un fichier
**dépasse sa propre marque** ; elle ne dit rien de ceux qui sont déjà gros. On
n'exige donc aucun grand rangement — on interdit seulement d'empirer, et chaque
fois qu'on allège un fichier, on abaisse sa marque. Le code ne peut plus
qu'aller dans le bon sens, sans qu'on ait jamais à décider d'un chantier.

**2. La détection des exports morts.** Un export que personne n'importe est
signalé. Une vingtaine de lignes, aucune dépendance, et ça aurait attrapé
`ecrireEquipes` et `modifierAgent` — l'un le premier jour, l'autre avant qu'on
ait à le découvrir en cherchant pourquoi un bouton n'existait pas.

**3. La suppression a sa liste.** Retirer une fonctionnalité, c'est retirer sa
zone, sa route, sa fonction d'API, ses types et sa ligne de `DESIGN.md`. Les deux
vérifications ci-dessus disent ce qu'on a oublié : l'index signale une zone
citée qui n'existe plus, et le détecteur signale ce qui n'est plus appelé.

**Les trois vivent dans `design/`, sans dépendance**, et se lancent avec
`npm run design`. La règle devient alors ce que `DESIGN.md` est déjà : quelque
chose qui ne peut pas mentir.
