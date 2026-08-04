# La grammaire des panneaux et des gestes

> ⏱ **Achevé** le 4 août 2026 à **14:12** · **révisé** le 4 août 2026 à **23:45**
> détail : `git log --follow -- GRAMMAIRE-PANNEAUX.md`
> **Le document le plus récent l'emporte.** Compare cette ligne avant d'appliquer.
> *Sous la règle d'horodatage : il arbitre le vocabulaire d'interaction des trois
> écrans, donc une version périmée se propage partout.*

> 4 août 2026. Établi **depuis le code existant**, pas inventé : presque tout ce
> qui suit est déjà quelque part dans le Hub. Le problème n'est pas qu'il manque
> des gestes, c'est qu'aucun document ne dit lesquels existent — d'où le
> hamburger qui ne vit qu'en mobile, l'agrandissement qui ne vit que dans la
> fenêtre de simulation, et le repli qui existe à deux endroits sur dix.

---

## 1. Ce que le Hub sait déjà faire

| Le geste | L'icône | Où il vit aujourd'hui |
|---|---|---|
| Replier / développer un panneau | `PanelLeftClose` / `PanelLeftOpen` | barre latérale, avec l'état retenu d'une fois sur l'autre |
| Ouvrir le menu (petit écran) | `Menu` | en-tête de page, `lg:hidden` |
| Chercher partout | `Search` + **Ctrl K** | palette de commandes, et le bouton du menu qui **affiche son raccourci** |
| Chercher dans un écran | `Search` dans le champ | projets, annuaire des agents |
| Agrandir / réduire | `Maximize2` / `Minimize2` | fenêtre de simulation |
| Revenir | `ArrowLeft` | détail de projet, Studio |
| Fermer | `X` + `aria-label="Fermer"` | fenêtre modale, notifications, menu mobile |
| Déplier une section | `ChevronDown` + `rotate-180` | profils de mémoire, annuaire de la conversation |
| Enregistrer | **Ctrl S** | détail de projet |
| Valider un formulaire | **Ctrl Entrée** | brouillon de tâche du Studio |
| Ranger le graphe | `LayoutGrid` | Studio |
| Relancer une lecture | `RefreshCw` | configuration |

**Rien à inventer.** Ce qui suit ne fait que généraliser ça, et combler quatre
trous.

---

## 2. Les trois familles à ne jamais confondre

C'est la partie qui compte. La faute la plus commune dans une interface n'est pas
de manquer un bouton, c'est d'en employer un pour ce qu'il ne veut pas dire.

| Famille | Icône | Ce que ça promet | Comment ça revient |
|---|---|---|---|
| **Replier / développer** | `PanelLeftClose` · `PanelRightClose` et leurs jumeaux `...Open` | la chose reste, elle prend moins de place | **le même bouton, au même endroit** |
| **Fermer** | `X` | la chose s'en va | par le geste qui l'avait ouverte |
| **Agrandir** | `Maximize2` | la chose prend toute la place, le reste attend | `Minimize2`, à la place exacte du premier |

La règle qui départage, et elle suffit : **une chose permanente se replie, une
chose convoquée se ferme.** Le plan est permanent dans le Studio → il se replie.
Les réglages d'un nœud n'existent que parce qu'on a cliqué le nœud → ils se
ferment. Un `X` sur le plan serait un mensonge : il reviendrait tout seul au clic
suivant.

Trois règles de service qui vont avec :

- **un panneau replié garde son état** d'une session à l'autre — la barre
  latérale le fait déjà, les autres doivent le faire ;
- **une icône a un seul sens dans toute l'application.** Jamais un `X` pour
  replier, jamais un chevron pour fermer ;
- **l'icône montre la destination, pas l'état courant.** Le bouton de thème le
  fait déjà et le commentaire du code explique pourquoi : montrer l'état pendant
  que le clic mène ailleurs induit en erreur.

---

## 3. Le Studio, entièrement gréé

Trois zones, et chacune porte ses commandes à sa propre bordure — jamais dans
une barre d'outils centrale qui commanderait tout.

```
┌──────────────────────────────────────────────────────────────────┐
│ ←   Veille IA ✎        ● prêt      [ Lancer ]     ⌕    ⛶         │  barre du scénario
├───────────────────┬──────────────────────────────┬───────────────┤
│ Plan          ⌕ ⇤ │                              │ Nœud       ✕  │
│                   │                              │               │
│ 1 ● Leo           │          le graphe           │  titre        │
│ 2 ○ Iris          │                              │  agent        │
│ 3 ○ Nour          │      ⊞ ranger   ⊕ ⊖ ⤢       │  risque       │
│                   │                       ▭ mini │               │
│ Résultat attendu  │                              │               │
│ · tableau.md      │                              │               │
│ · veille.pdf      │                              │               │
└───────────────────┴──────────────────────────────┴───────────────┘
```

| Zone | Commandes | Sens |
|---|---|---|
| **Barre du scénario** | `ArrowLeft` retour · titre **éditable au crayon** · état · **Lancer** · `Search` · `Maximize2` | Le seul endroit où l'on agit sur le scénario entier — et donc où l'on le renomme, selon la règle « on modifie une chose là où on la regarde » |
| **Plan** (gauche) | `Search` chercher dans le plan · `PanelLeftClose` replier | Permanent, donc il se replie. La recherche sert dès qu'un scénario dépasse dix étapes |
| **Graphe** (centre) | zoom, `LayoutGrid` ranger, plein cadre, minicarte | Déjà en place |
| **Nœud** (droite) | `X` fermer | Convoqué par la sélection d'un nœud, donc il se ferme |

**Le bouton agrandir est celui que tu as demandé** : le Studio vit dans le cadre
commun, `Maximize2` le fait passer plein écran pour l'édition confortable,
`Minimize2` le ramène. Même icône, même sens que dans la fenêtre de simulation
d'aujourd'hui.

### Le trou que l'agrandissement ouvre, et son bouchon

En plein écran, la barre latérale disparaît — **et avec elle la ligne d'alerte et
le compteur d'autorisations.** C'est F13, et c'est la seule chose que
l'agrandissement casse.

Deux ajouts obligatoires en plein écran, et deux seulement : le `Menu` hamburger,
qui cesse d'être un geste de petit écran pour devenir le geste de « pas de barre
latérale » ; et **la ligne d'alerte, qui se pose dans la barre du scénario.**
Une autorisation qui attend doit se voir dans les deux modes, sans quoi
agrandir revient à s'aveugler au moment où l'on regarde le plus attentivement.

---

## 4. La ligne d'alerte et son volet

Arrêté avec kuchu : la ligne est le signal, le volet est le détail.

**La ligne** — une seule, jamais deux. Une icône par nature, la chose la plus
urgente en clair, et un compte pour le reste.

| Nature | Icône | Exemple |
|---|---|---|
| Une autorisation attend | `ShieldAlert` | « Pablo demande à écrire un fichier » |
| Un scénario a fini | `CheckCircle2` | « Veille IA a rendu 2 fichiers » |
| Une automatisation est tombée | `AlarmClock` barré | « Veille du lundi : dernière exécution en échec » |

**Le volet** — il glisse depuis la droite au clic, liste tout, chaque entrée
menant à son endroit, et se ferme par `X` ou par Échap. Convoqué, donc fermé :
la famille est cohérente. Et comme il ne s'ouvre qu'à la demande, il ne se
dispute la place avec rien — ni avec les réglages du nœud dans le Studio, ni avec
le fil sur l'accueil.

Une même ligne, un même volet, sur les trois écrans **et en plein écran.** C'est
ce qui permet de le reconnaître sans le lire.

---

## 5. Les quatre trous à combler

1. **`PanelRightClose` / `PanelRightOpen` n'est employé nulle part**, alors que le
   Studio aura deux panneaux latéraux. À ajouter, par symétrie exacte avec la
   barre latérale.
2. **Le hamburger n'existe qu'en petit écran** (`lg:hidden`). Il doit apparaître
   dès qu'il n'y a pas de barre latérale — donc aussi en plein écran.
3. **Il n'y a pas de recherche dans un contenu long.** La palette cherche dans
   l'application, les champs cherchent dans une liste, mais rien ne cherche dans
   un plan de trente étapes ni dans une conversation.
4. **Échap ne ferme pas partout.** Il devrait fermer, toujours : le volet, une
   fenêtre modale, un panneau convoqué.

---

## 6. Les raccourcis

Trois existent, deux sont à ajouter, et aucun n'est à inventer — ce sont les
conventions que tout le monde a déjà dans les doigts.

| Raccourci | Ce qu'il fait | État |
|---|---|---|
| **Ctrl K** | chercher partout | existe |
| **Ctrl S** | enregistrer | existe (détail de projet) — à généraliser à tout formulaire |
| **Ctrl Entrée** | valider le formulaire ouvert | existe (brouillon de tâche) |
| **Échap** | fermer ce qui est convoqué | à généraliser |
| **Ctrl B** | replier la barre latérale | à ajouter — convention universelle |

Et une règle d'affichage, que la barre latérale applique déjà : **un raccourci
qui ne s'affiche pas n'existe pas.** Le bouton Rechercher montre `Ctrl K` à côté
de son libellé ; tout raccourci ajouté doit se montrer quelque part, sur le
bouton ou dans son infobulle.

---

## 6 bis. La conduite de l'attente

Une opération peut durer de vingt secondes à quatre minutes et demie — c'est
mesuré, sur la même phrase et le même cerveau. **Le problème n'est pas la durée,
c'est le vide.** Quatre minutes pendant lesquelles il se passe visiblement
quelque chose sont supportables ; vingt secondes de néant ne le sont pas.

### Ce qu'on transpose, et d'où ça vient

Ces règles ne sont pas déduites : elles décrivent un dispositif qui fonctionne —
celui de la fenêtre où cette refonte a été conçue.

| La règle | Ce qu'elle évite |
|---|---|
| **Rien n'est jamais silencieux.** Le texte s'écrit à mesure, chaque étape apparaît quand elle commence | L'écran vide, seule chose qu'on ne peut pas interpréter |
| **Les étapes portent des noms d'humain**, jamais des identifiants techniques | Un journal qu'on regarde sans le lire |
| **On peut écrire pendant.** Le champ reste vivant | Une pensée perdue parce qu'il fallait attendre pour la dire |
| **On peut interrompre**, et ce qui a été fait reste | La peur d'arrêter, qui fait attendre pour rien |
| **Ce qui est produit apparaît au fil de l'eau**, pas seulement à la fin | Le doute sur ce qui a réellement abouti |
| **Une erreur se dit**, elle ne s'avale pas | « Le bouton ne marche pas » |

### La chronologie d'une préparation de plan

| Moment | Ce qui s'affiche |
|---|---|
| à l'envoi | « Je prépare un plan » et un compteur qui part **— tout de suite, pas après une seconde** |
| ~1 s | « Ta demande est enregistrée, elle ne se perdra pas » — jalon réel : la tâche est créée avant d'être découpée |
| pendant | le compteur monte, **le plafond est visible**, le champ reste actif, un bouton permet d'arrêter |
| à l'arrivée | la carte de plan, **qui rappelle à quoi elle répond** |
| au dépassement | ce qui existe déjà, plus le geste : un bouton qui ouvre la demande dans le Studio |

### Ce que le parcours cognitif y a trouvé

Trois frictions, en jouant ces cinq moments en novice.

**F18 — « le tableau » est un mot du dedans.** Le jalon « ta demande est posée sur
le tableau » ne veut rien dire pour qui n'a jamais ouvert le tableau kanban
d'Hermès. Ce qu'il faut lui dire, c'est **ce qui le rassure** : *ta demande est
enregistrée, elle ne se perdra pas.* Même famille que « pôle ».

**F19 — rien ne dit qu'on peut écrire pendant.** C'est la capacité la plus utile
du dispositif, et elle est invisible : personne n'essaie de taper dans un champ
pendant qu'une réponse se prépare. *Une possibilité qui ne se voit pas n'existe
pas.* Le champ doit rester actif **et le dire** — un mot sous lui suffit.

**F20 — le message de dépassement décrit le chemin au lieu de l'offrir.** Le code
dit déjà très bien ce qu'il faut faire : *« la demande est sur le tableau : ouvre-la
dans le Studio pour la découper à la main »*. Mais il n'y a pas de bouton. C'est
exactement la leçon déjà écrite dans `ADM.md` — **une consigne ne remplace pas un
chemin qui manque.** La phrase doit porter le geste.

Et un rappel qui devient une exigence : **une carte qui arrive en retard doit
citer la demande à laquelle elle répond.** Quatre minutes, c'est assez pour avoir
changé de sujet, et une proposition qui tombe au milieu d'autre chose ne se
rattache à rien *(renforce C1)*.

### Le principe qui commande tout ce paragraphe

**On dessine pour le mauvais jour.** Une interface qui ne tient que quand le
modèle est rapide casse le jour où il ne l'est pas — c'est-à-dire le jour où
l'utilisateur est déjà agacé. Un fournisseur payant supprimerait sans doute la
file d'attente ; le dispositif ne doit pas en dépendre.

---

## 7. Où chaque geste doit apparaître — la liste à cocher

Une grammaire qui n'est appliquée qu'aux endroits où l'on y a pensé n'est pas une
grammaire, c'est une habitude. Ce tableau est fait pour être **parcouru à la
recette** : chaque case pleine est une chose à trouver à l'écran, et chaque case
vide est une chose qui ne doit surtout pas s'y trouver.

| | Accueil, salut | Accueil, fil | Orchestration | Studio, cadre | Studio, plein écran | Volet |
|---|---|---|---|---|---|---|
| **Retour** `ArrowLeft` | — | — | — | ✔ vers Orchestration | ✔ | — |
| **Hamburger** `Menu` | petit écran | petit écran | petit écran | petit écran | **✔ toujours** | — |
| **Chercher partout** `Ctrl K` | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| **Chercher dedans** `Search` | ✔ un agent | ✔ dans le fil | ✔ un agent | ✔ dans le plan | ✔ | — |
| **Replier / développer** | — | — | — | ✔ le plan | ✔ le plan | — |
| **Agrandir / réduire** | — | — | — | ✔ | ✔ | — |
| **Fermer** `X` | — | — | ✔ fiches ouvertes | ✔ panneau du nœud | ✔ | ✔ |
| **Échap ferme** | — | — | ✔ | ✔ le panneau du nœud | ✔ | ✔ |
| **Ligne d'alerte** | ✔ | ✔ | ✔ | ✔ | **✔ dans la barre du scénario** | — |
| **Retour au salut** | — | ✔ nommé | — | — | — | — |

Trois lignes de ce tableau sont aujourd'hui fausses dans le code, et ce sont
exactement les trous du §5 : le hamburger n'apparaît jamais en plein écran, il
n'existe aucune recherche dans un contenu, et Échap ne ferme qu'à un endroit.

**La règle qui rend le tableau tenable :** un geste qui existe quelque part
existe partout où son cas se présente. Le jour où l'on ajoute un panneau, on ne
se demande pas s'il mérite un bouton de repli — on prend la ligne
correspondante et on l'applique.

---

## 8. Ce que cette grammaire garantit

Un utilisateur qui a compris un panneau les a tous compris. Il sait, sans essayer,
que le plan reviendra là où il l'a replié, que les réglages du nœud ne
reviendront pas tout seuls, qu'Échap ferme, et que ce qui l'attend est toujours
sur la même ligne. C'est peu de choses à retenir — et c'est exactement pour ça
qu'on peut le retenir.
