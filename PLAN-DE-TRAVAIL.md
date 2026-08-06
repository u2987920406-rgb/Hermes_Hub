# Le plan du plan — Hermès Hub, refonte Orchestration / Studio

> ⏱ **Achevé** le 4 août 2026 à **16:20** · **révisé** le 6 août 2026 à **18:20**
> détail : `git log --follow -- PLAN-DE-TRAVAIL.md`
> **C'est le document le plus récent de la refonte : il l'emporte sur tous les
> autres**, `VISION-STUDIO.md` (2 août) en premier.

> 4 août 2026. Consolidation de toute la séance : ce qui est fait, ce qui est
> décidé, ce qui reste à vérifier, et dans quel ordre attaquer. Ce document
> remplace la mémoire de la conversation — il doit suffire à reprendre seul.
>
> Les décisions elles-mêmes vivent dans `PLAN-ORCHESTRATION-STUDIO.md`, les
> frictions dans `FRICTIONS-PARCOURS.md`, la grammaire dans
> `GRAMMAIRE-PANNEAUX.md`, la découpe dans `ARCHITECTURE.md`. Ici, seulement
> **l'ordre et l'état**.

---

## 1. Où on en est, exactement

### Fait — construit, commité, poussé

La refonte de l'accueil. Commit `393123a` (« L'accueil devient la
conversation ») contient le build (`dist/`) et est poussé sur `origin/v2`.
**Ce paragraphe annonçait encore « ni construit ni commité » : c'était vrai au
moment où il a été écrit, plus au moment où on l'a relu — les deux gestes qui
manquaient ont eu lieu le même jour.**

| Fichier | Ce qui a changé |
|---|---|
| `pages/HomeView.tsx` | l'accueil est devenu la conversation |
| `components/Conversation.tsx` | props `accueil`, `accueilDessous`, `onFilVide` |
| `components/Automatisations.tsx` | variante `alertesSeules` |
| `components/Sidebar.tsx` | le terminal Hermès, en geste discret |
| `pages/ConfigView.tsx` + `App.tsx` | onglet Développement, Clean Agent |
| `DESIGN.md`, `ADM.md` | index et décisions à jour |

### Joué pour de vrai le 4 août, en sandbox (`dev-v2.ps1`), vraie équipe

Le point 1 de l'« Ensuite » du commit. Constats :

- **La bascule salut → conversation marche sans accroc** — envoi net, salut
  effacé, message affiché, passage en « En direct », retour au salut par
  « + Nouvelle ».
- **La garantie V2 tient en vrai** — un message sans `@nom` ne réveille que
  Hermès ; aucun autre agent ne démarre.
- **Écart entre ce que l'accueil affiche et ce qu'Hermès sait déjà.** Le
  bandeau dit *« Hermes ne sait pas qui tu es »* et le salut affiche
  « Bonjour workspace » (le nom vient de `path.basename(WORKSPACE)`,
  `server/index.js:196` — un repli technique, pas un profil). Mais Hermès,
  dans la même session, a répondu *« Reçu, Raf »* : il lit son propre
  `USER.md` partagé (`AppData\Local\hermes\memories`), une source que
  l'accueil ne consulte jamais. Les deux systèmes d'identité — le nom affiché
  par le Hub et la mémoire que relit Hermès — ne se parlent pas. Non tranché,
  pas bloquant, à reprendre si l'identité de l'accueil est retouchée.
  **Reconfirmé par un autre chemin le 4 août :** l'expérience V1, passée en CLI
  sans aucun contexte de Hub, a écrit *« L'utilisateur (Raf) »* de lui-même.
  **Et la moitié du problème était déjà connue depuis le 31 juillet :**
  `USER.md` ne contient que `raf` / `fr` / `concis` — métier, niveau technique,
  projets et objectifs sont vierges. Un tri de la mémoire d'Hermès l'avait noté
  et reporté (fiche `tri-memoire-hermes.md`, carnet de maintenance). Le jour où
  l'identité de l'accueil se retouche, les deux se traitent ensemble : un nom
  affiché juste ne sert à rien si le profil derrière est vide.
- **Formulaire « Sept questions, une fois pour toutes »** (Configuration >
  Mémoire) affiche « 5 sur 6 » alors que le texte annonce sept questions —
  incohérence d'affichage mineure, non vérifiée plus loin.
- **F1 est tranché** — voir §6.

### Chantier 2 — ✅ **clos le 5 août, porte franchie à l'écran**

Les quatre blocs sont écrits, `npm run build` passe, `npm run design` est vert.
~~**Ce qui manque est la seule chose qui compte : personne ne l'a encore vu
tourner.**~~ **La porte a été franchie le 5 août à 11h50** : fausse
autorisation posée depuis *Configuration > Développement*, ligne d'alerte
retrouvée au même endroit sur Configuration, l'Accueil et Orchestration ; le
volet « Ce qui t'attend » s'ouvre, se nomme, dit d'où vient la demande, et
Échap le ferme ; **et dans le Studio — l'écran sans barre latérale — l'alerte
est bien dans la barre du scénario, une pastille qui ouvre le même volet.
F13 tient.**

**Et la porte a servi : elle a trouvé ce que trois vérifications vertes
n'avaient pas vu.** L'écran Scénarios titrait *« 12 pôles »*, juste au-dessus
d'une phrase qui commence par « Un scénario » — **F6 était déclaré réglé et ne
l'était pas.** Une chaîne, une seule, dans `OrchestrationView.tsx:685`.
Corrigée et revérifiée à l'écran. Le reste du dépôt ne porte « pole » que dans
du code, des chemins d'API et des commentaires, ce que la convention autorise.

*La leçon, et c'est la troisième de la journée :* **le mot du dedans ne se voit
que rendu.** `tsc`, 134 tests et `npm run design` étaient verts tous les trois.

| Le bloc | Ce qui a été fait |
|---|---|
| **Les gardes** | cliquet des tailles (`design/tailles.json`) et détecteur d'exports morts (`design/exports-morts.json`), branchés sur `npm run design` |
| **La grammaire** | `useEchap` partout, `BoutonRepli` + `useRepli` (les deux côtés), `ChampRecherche`, **Ctrl B**, `menuToujours` sur l'en-tête |
| **La ligne d'alerte** | une ligne, un volet, sur les trois écrans **et** dans la barre du Studio *(F12, C2, C5, F13)* |
| **Le vocabulaire** | « scénario » à l'écran, `pole` dans le code ; le Studio n'est plus « l'atelier » *(F6)* |

**Trois choses que le chantier a apprises, et qui ne se devinaient pas :**

1. **Le cliquet a mordu cinq fois sur le chantier qui l'introduisait.** Deux
   fois il avait raison : `useHubStore.ts` a rendu ses traces de scénarios
   (`store/alertes.ts`) et `ConfigView.tsx` son bloc d'essai
   (`AlerteEssai.tsx`). Trois fois la croissance était de la prose, et les
   marques ont été relevées à la main.
2. **Le détecteur d'exports a attrapé trois exports nés le jour même** —
   `NatureAlerte`, `useAlertes`, `ScenarioFini`, exportés « au cas où » et
   importés nulle part. Retirés. C'est exactement ce qu'on lui demandait.
3. **Deux surfaces disaient déjà la même chose.** La bande « automatisation
   tombée » de l'accueil faisait le travail de la ligne d'alerte, sur un seul
   écran. Elle est partie, avec la variante `alertesSeules` — la grammaire est
   formelle, *une seule ligne, jamais deux*.

**Ce qui a été porté par la grammaire mais n'a pas encore de surface :** le
`cote="droite"` de `BoutonRepli` et la recherche dans un contenu long. Les deux
pièces existent et sont branchées à un appelant réel (la barre latérale,
l'annuaire de la conversation) ; le panneau plan et le fil, qui en sont les
vrais consommateurs, arrivent aux chantiers 3 et 4. **Dire où la vérification
s'arrête :** rien de tout ceci n'a été joué à l'écran — seulement compilé,
construit et vérifié par les gardes.

### Chantier 3 — commencé le 5 août : l'interrupteur est posé et éprouvé

Deux commits, `d774e02` et `7dc6019`. **La première pièce du chantier 3 est
debout, et c'est la seule qui pouvait s'écrire sans les surfaces des chantiers
suivants.**

| Ce qui existe | Où |
|---|---|
| Le constat du greffon — `enabled` **et** le dossier sur le disque | `server/mode-conversation.js`, 7 tests |
| L'interrupteur, sa phrase de garantie, son bandeau | `InterrupteurMode.tsx` |
| Le mode partagé par trois surfaces | `useHubStore` |
| L'invite du champ qui suit le mode *(F2)* | `Conversation.tsx` |
| L'annuaire qui disparaît en Discussion | idem |

**Le bouton ne promet que ce qu'il a constaté** : sans le greffon `heurtoir`,
la phrase perd sa moitié et un bandeau dit *« Hermès peut encore modifier des
fichiers par le terminal. »* Éprouvé à l'écran dans les deux sens, le mode
survit au rechargement.

**Un écran blanc en chemin, et il vaut d'être gardé.** La route était adressée
sous `/config/` au lieu de `/chat/` : la requête **n'a pas échoué**, elle est
tombée dans le bloc voisin, qui a répondu un objet valide sans `greffon`. Le
`catch` attendait une panne, il a reçu une réponse. `tsc` était vert et 133
tests passaient. *`request<T>` n'est pas une vérification, c'est une
affirmation sur ce que le serveur rendra.*

### Décidé, écrit, **pas commencé**

Le reste du chantier 3 — la carte de plan, Valider / Modifier / Refuser, la
bascule proposée, l'indicateur d'attente *(F5)*, l'historique à l'accueil — puis
les chantiers 4, 5 et 6. Voir §4.

### Validé visuellement

La maquette `maquette-parcours.html` — sept étapes, validée par kuchu. **Elle
fait foi en cas de doute pendant l'exécution.**

---

## 2. Ce qu'il faut vérifier avant d'écrire une ligne

Étape 5 de la méthode. Quatre inconnues commandent le plan, et trois d'entre
elles peuvent le changer. Chacune se lève en une expérience courte et jetable.

| # | L'inconnue | Ce qui change si la réponse est non |
|---|---|---|
| **V1** | Le décomposeur peut-il produire un **résultat attendu** — les livrables nommés d'avance ? | Toute la confrontation annoncé / rendu tombe, et le plan perd sa quatrième part. **La plus lourde des quatre.** |
| **V2** | Peut-on **couper les outils par tour** côté ACP, pour que le mode Discussion soit une vraie garantie ? | L'interrupteur devient un décor. Il faudrait alors le dire autrement — ou y renoncer |
| **V3** | Que rend `server/competences.js` ? Assez pour dessiner la carte des compétences **depuis les vraies données** ? | La carte devrait être tenue à la main, donc elle mentirait. Mieux vaudrait ne pas la faire |
| **V4** | Le chargement paresseux du Studio : combien gagne-t-on vraiment sur les 573 Ko ? | Rien de cassé — mais on saura si ça vaut le détour |

**V1 et V2 sont bloquantes** pour les chantiers 3 et 4. *(V2 a été rouverte le
5 août à 02:05, puis **refermée le même soir à 02:38, éprouvée à l'écran** — voir
son paragraphe. Le chantier 3 n'est plus amputé : l'interrupteur Discussion a une
garantie réelle.)* V3 l'est pour le chantier 5. V4 ne bloque rien.

### Résultats — chantier 1, fait le 4 août

**V1 — le résultat attendu. Faisable, mais pas là où on le cherchait.**
`hermes kanban decompose --json` rend `{ok, reason, fanout, child_ids}` : **aucun
champ pour un livrable attendu, et rien pour l'y mettre.** Mais il n'a pas à le
produire. La carte de plan est écrite par **Hermès** dans le fil, pas par le Hub
depuis le JSON du décomposeur : il lit le graphe et rédige la carte, et il peut
nommer les livrables dans le même souffle. Le format commun existe déjà et n'est
jamais montré à l'écran — c'est exactement son emploi. **Aucun appel modèle
supplémentaire.**
**Éprouvé sur la machine de kuchu le 4 août, et c'est net.** `hermes -z` sur un
scénario de trois tâches, cerveau `tencent/hy3:free` : tableau JSON valide du
premier coup, les quatre champs remplis, **sans aucun outil ni appel
supplémentaire**. Il distingue même de lui-même ce qui revient à l'agent de ce
qui revient à l'humain — `"qui": "L'utilisateur (Raf) avec validation de
l'agent"`. La confrontation annoncé / rendu du chantier 4 tient debout.
*Mesure au passage :* **23,5 s**, le bas de la fourchette ci-dessous, pas les
270 s. F5 reste à traiter, mais l'ordre de grandeur nominal est confirmé.

**⚠ Découverte en chemin, et elle aggrave F5.** Le décompte n'est pas de ~23 s.
Le code note quatre essais du 02/08 sur la même phrase, avec le même cerveau :
**19,7 s · 26,4 s · 95,8 s · 270 s.** Quatre minutes et demie de silence dans une
conversation, ce n'est plus « on dirait une panne », c'est un abandon.
*Conséquence :* le décompte doit montrer **où est le plafond** — le Hub le fait
déjà ailleurs avec `PLAFOND_DECOUPAGE_S` — et il faut se demander si la
préparation d'un plan ne devrait pas être **asynchrone**, c'est-à-dire qu'on
puisse continuer d'écrire pendant. *À trancher au chantier 3.*

**V2 — couper les outils. ~~Non, mais la garantie s'obtient autrement.~~
~~⚠ NON, ET LA GARANTIE NE S'OBTIENT PAS — rouvert le 5 août à 02:05.~~
✅ Non — mais la garantie s'obtient, par le crochet `pre_tool_call`. Refermée le
5 août à 02:38, éprouvée à l'écran. Lire le paragraphe jusqu'au bout : les deux
conclusions précédentes sont barrées, pas effacées.**

La session ACP s'ouvre par `session/new { cwd, mcpServers: [] }` : **il n'existe
aucun paramètre de panoplie par tour.** En revanche l'agent demande, et le Hub
répond — `session/request_permission`.
~~La garantie du mode Discussion s'obtient donc **en refusant côté Hub toute
demande qui n'est pas une lecture.** Ce n'est pas une consigne dans un prompt,
c'est le Hub qui décide : la garantie tient.~~
~~*Nuance à écrire dans l'interface :* la promesse exacte est « rien ne s'écrit »,
pas « les outils n'existent pas ».~~

**Ce raisonnement supposait que toute action passe par `request_permission`.
Elle n'y passe pas.** Éprouvé sur la machine de kuchu, mode Discussion posé :
Hermès demande l'autorisation d'`edit`, le Hub refuse — puis Hermès écrit **le
même fichier par le terminal**, sans aucune demande. Zéro carte, `exit_code 0`,
et il conclut « Fait ». Le refus côté Hub est réel : il ne couvre que ce qui
frappe à la porte.

**La piste ACP est morte aussi.** Hermès n'annonce que trois modes —
`default` (« Ask before edits »), `accept_edits`, `dont_ask` — et **les trois
vont dans le sens permissif** : aucun mode lecture seule, aucun ne parle du
terminal. `session/set_mode` ne donnera pas la garantie. *(Mesuré par la route
`/api/chat/modes`, lecture pure, ajoutée pour ça.)*

*Ce qui reste vrai de V2 :* les mentions sont lues par le Hub (`lireMentions`),
donc **ne réveiller personne est entièrement sous notre contrôle**. C'est la
moitié qui tient, et le chantier 3 s'y appuie encore.

~~*Ce qui reste à chercher, et ce n'est plus du Hub :* une configuration côté
Hermès qui soumette le terminal à permission. Sans elle, l'interrupteur
Discussion ne peut rien promettre — et **mieux vaut pas d'interrupteur qu'un
interrupteur qui ment.** Le module `mode-conversation.js` reste au dépôt avec sa
mesure en tête : c'est une moitié de porte, et elle se présente comme telle.~~

**✅ CHERCHÉ, ET TROUVÉ — le 5 août à 02:38, éprouvé à l'écran. V2 se referme.**

La configuration n'existe pas, et c'était la bonne réponse à la mauvaise
question. `approvals.mode` (`smart` / `manual` / `off`) ne se déclenche que sur
les **47 motifs** de `DANGEROUS_PATTERNS` : `manual` promet « toujours demander
pour les commandes dangereuses », et `echo bonjour` n'en est pas une. **La garde
d'Hermès est bâtie sur le texte de la commande, pas sur l'outil** — c'est la
cause exacte de ce qui a été mesuré à 02:05, et ça la confirme.

Mais il existe un crochet qui, lui, porte sur l'outil : **`pre_tool_call`**. Un
greffon peut répondre `{"action": "approve"}`, et le code dit ce qu'on
cherchait : *« This lets a plugin require a human decision on **ANY tool**, not
just terminal command strings. »* Sur ACP, cette porte est déjà pontée vers
`session/request_permission`.

Le doute portait sur un seul point, que la lecture ne tranchait pas :
`acp_adapter/` n'appelle jamais `discover_and_load`. **Mesuré :** le journal
d'Hermès écrit `Plugin discovery complete: 55 found, 48 enabled` à la seconde où
le Hub lance le processus ACP. Les greffons sont chargés. Chaîne complète, jouée
sur la machine de kuchu avec un greffon jetable (`sonde-terminal`) :

```
Hermès veut lancer echo bonjour
  → pre_tool_call intercepte (session ACP, commande anodine)
  → « approve » → request_tool_approval → session/request_permission
  → le Hub arbitre : classer({kind:'execute'}) → ROUGE → carte posée
  → tu réponds — et ce que tu réponds décide
```

~~À l'écran : le bandeau porte la demande refusée **avec le nom de la commande**,
et Hermès répond *« La commande a été refusée par ton terminal (mode Discussion
actif) — tu as bloqué l'exécution de `echo bonjour`. Je ne l'ai donc pas
lancée. »* Il l'a lu comme une **décision**, pas comme une panne — ce que
`laissez-passer.js` cherchait à obtenir. Réponse en 71,7 s.~~

⚠ **Cette lecture était fausse, corrigée à 02:55 — et l'erreur mérite d'être
gardée.** Le Hub n'était pas en Discussion : il n'existe aucun
`mode-conversation.json` dans `.hub/`, donc `lireMode()` rendait `atelier`. La
phrase « le mode Discussion est actif » était **le texte du greffon d'essai**,
recopié par Hermès. Ce qui s'est réellement passé : `classer({kind:'execute'})`
rend **rouge**, `arbitrer()` a donc **posé une carte** — repliée derrière le
chevron du bandeau, que personne n'a ouverte. Au bout des **60 s** du pont ACP
(`make_approval_callback`, délai par défaut), la porte s'est fermée seule,
fail-closed, et Hermès a rapporté un refus. D'où les 71,7 s.

*La leçon vaut plus que la mesure :* **on a lu sa propre phrase comme un verdict
de la machine.** Le greffon d'essai portait un texte qui décrivait une hypothèse
non vérifiée, il est remonté à l'écran, et il en est redescendu comme un fait.
Un banc d'essai ne doit rien affirmer qu'il ne mesure.

**Les trois branches d'`arbitrer()` sont éprouvées à l'écran, la nuit du 5 août :**

| tour | mode du Hub | ce qui s'est passé | durée | résultat |
|---|---|---|---|---|
| 02:38 | atelier | carte posée, jamais ouverte | **71,7 s** | délai de 60 s → refus |
| 02:50 | atelier | carte ouverte, **Allow** | — | `bonjour`, `exit_code 0` |
| 03:02 | **discussion** | **aucune carte posée** | **11 s** | refus immédiat |

**Le chrono seul distingue les deux refus, et c'est ce qui les qualifie :**
71,7 s, c'est une porte qui se referme faute de réponse ; 11 s, c'est une
décision. Le tour de 03:02 s'ouvre à 03:02:14, la sonde frappe à 03:02:19 et le
refus revient à 03:02:25 — la branche `enDiscussion() && risque ≠ vert` a bien
parlé, celle qui n'avait jamais été jouée. Hermès répond *« Action bloquée : tu
as refusé l'exécution via le système de permission. Je ne relance pas. »* — une
décision, pas une panne.

Les trois tours ont eu lieu sur l'**ancienne** interface (`dist/` du 3 août) : la
carte se rend et se clique déjà, ce n'est pas un acquis du chantier 2.

**`mode-conversation.js` n'est plus une moitié de porte.** Il ne lui manquait pas
une réécriture : il lui manquait que le terminal vienne frapper. *(Son en-tête
a été corrigé le 5 août à 02:55, première ligne comprise.)*

*Dire où la vérification s'arrête.* **Plus rien n'est en attente de mesure** :
les trois branches sont jouées. Ce qui reste n'est plus de la vérification mais
du **dessin**, et rien n'en bloque le chantier 3 :

- ~~le **volume**. La sonde escalade *chaque* appel terminal, et un agent au
  travail en enchaîne des dizaines. Une carte par commande est intenable : il
  faudra soit s'appuyer sur « pour la session », soit n'escalader qu'en
  Discussion. **Non tranché, et ça touche le dessin du chantier 3**~~
  **✅ Tranché le 5 août à 07:30, sur maquette — le greffon ne renvoie l'appel
  vers le Hub qu'en Discussion.** Les trois règles ont été jouées sur une tâche
  ordinaire, douze appels dont huit par le terminal : 2 cartes / 3 cartes /
  10 cartes en Atelier, et **0 carte dans les trois en Discussion**. C'est ce
  dernier chiffre qui a décidé : le mode refuse d'office, donc le volume n'est
  pas un problème de l'interrupteur mais de l'**Atelier**, le seul mode que les
  clients utilisent. Le raisonnement complet est dans `ADM.md`, « Le heurtoir ne
  sonne qu'en Discussion ». *Prix assumé :* en Atelier le laissez-passer reste
  aveugle au shell — voir le ⚠ ci-dessous et le §7 ;
- ~~le **délai de 60 s**. `make_approval_callback` est construit sans timeout
  explicite, donc une carte non vue se referme en une minute. C'est court pour
  quelqu'un qui a quitté l'écran, et le refus qui s'ensuit ressemble à une
  panne. À confronter à `approvals.timeout` (300 s).~~
  **✅ CONFRONTÉ ET TRANCHÉ LE 5 AOÛT À 16:02, CHRONOMÉTRÉ DEUX FOIS — et la
  confrontation retourne la question. Lire le paragraphe qui suit.** ;

#### Le délai de 60 s — mesuré, et ce n'est pas le délai le problème *(5 août, 16:02)*

**Ce qui était prévu :** « porter le délai de 60 s à quelque chose de tenable ».
**Ce que la mesure dit :** le faire *seul* aggraverait les choses.

*La confrontation d'abord.* `approvals.timeout` vaut bien 300 s — mais
**le pont ACP ne le lit pas.** `acp_adapter/permissions.py` et
`acp_adapter/edit_approval.py` prennent chacun `timeout: float = 60.0`, et
`server.py` les appelle **sans passer de valeur** (lignes 1704 et 1708). Les
300 s vivent dans `hermes_cli/callbacks.py`, c'est-à-dire **en ligne de commande
seulement**. Le même produit accorde donc cinq minutes au terminal et une seule
au Hub — et aucun réglage côté client ne change ce chiffre. `approvals:`
n'existe même pas dans le `config.yaml` de kuchu.

*La mesure ensuite,* Maquettiste sur `glm-5.2:cloud`, en **Atelier**, jouée deux
fois avec le même résultat à la centiseconde :

```
16:02:48.449  la carte paraît (Approve edit: essai-delai.txt)
16:03:48      « Tool write_file returned error (60.01s) :
                Edit approval denied by ACP client; file was not modified »
16:03:51.991  le fichier est écrit QUAND MÊME — par le terminal, en 3 s
16:05:02.975  la carte quitte l'écran : parce qu'on a cliqué dessus
```

**Trois choses, et les deux dernières comptent plus que la première.**

1. **60,01 s**, non réglable, confirmé deux fois ;
2. **le refus par délai ne refuse rien.** L'agent contourne par le shell, et en
   Atelier le heurtoir ne sonne pas *(§7)*. Ce n'est pas une porte qui se ferme,
   c'est une porte qui **retarde de 60 s**. Porter le délai à 300 s ne
   protégerait donc personne de plus : ça allongerait l'attente avant le
   contournement. **La garantie qu'on croyait avoir n'a jamais existé sur ce
   chemin** ;
3. **la carte devient un fantôme, et c'est la panne à réparer.** Rien ne revient
   vers le Hub quand la porte se ferme — côté Python le `future` est annulé et
   la fonction rend « deny » sans émettre une seule trame. La carte est restée
   **74 secondes** après la mort de la demande, boutons intacts ; le clic
   « Allow edit » l'a fait disparaître **exactement comme un vrai accord**,
   alors qu'il n'allait nulle part et que le fichier était écrit depuis une
   minute. C'est la même famille que la panne de 15:45 : l'écran affirme.

**✅ Corrigé, et éprouvé à l'écran le 5 août à 16:16.** Le Hub ne peut pas
empêcher la porte de se fermer ; il peut savoir **quand**, puisqu'il connaît
l'heure à laquelle il a posé la carte. `DELAI_AUTORISATION` dans
`server/acp.js` recopie donc la constante d'Hermès, et trois choses en
découlent :

- **la carte porte son compte à rebours** — vu à l'écran, « 45 s » —, ce qui
  permet de savoir qu'il faut revenir maintenant. Une échéance qu'on ne
  découvre qu'une fois passée n'a jamais aidé personne ;
- **à l'échéance, la carte reste et perd ses boutons**, remplacés par ce qui
  s'est passé. On ne la retire pas : un écran redevenu propre laisse croire
  qu'on n'a rien manqué ;
- **la ligne d'alerte s'efface**, elle. Sa phrase — « il est arrêté tant que la
  réponse ne vient pas » — cesse d'être vraie à la seconde où l'agent repart
  sans réponse. Le compte et la liste ne valent donc plus la même chose, et
  `/api/accords` les sépare.

*Ce qui reste à faire, et ce n'est pas dans ce dépôt :* porter le 60 s à 300 s
demande une **rustine dans le pont ACP d'Hermès**, du même genre que
`rustine-acp.md` — donc effacée par chaque `hermes update`, donc à documenter
dans le carnet `hermes-maintenance`. **Elle est utile mais secondaire** : sans
le correctif ci-dessus, elle ne fait que déplacer le mensonge cinq minutes plus
loin. À décider avec kuchu ;

### ⚠ La carte disparaît du fil quand on change d'écran *(5 août, 15:45)*

**Trouvé en jouant le parcours, et c'est la panne la plus grave de la journée :
un agent s'est arrêté sans qu'aucun geste ne puisse le sauver.**

Déroulé exact. Le Maquettiste demande `Approve edit: essai-pdf.html`, la carte
paraît dans le fil. On change d'écran. Au retour, **le fil est vide** — plus de
carte, plus de conversation. La ligne d'alerte, elle, affiche toujours les deux
demandes et dit *« Il est arrêté tant que la réponse ne vient pas »*. Son bouton
**« Y aller » mène à une conversation vide.** Pendant qu'on cherche, le délai de
60 s s'écoule, la porte se referme, et l'agent meurt.

**Deux sources pour la même vérité, et elles divergent.** Le magasin tient
`demandes`, rempli par un appel HTTP (`api.accords()`) — c'est lui qui alimente
la ligne d'alerte et le volet, et il avait raison. La `Conversation`, elle, tient
son propre `autorisations` en état local, rempli par l'évènement SSE `reprise`.
Au remontage du composant, cet état repart vide.

*L'ironie est écrite dans le dépôt :* le commentaire de `demandes` dans
`useHubStore` dit déjà **« on garde une seule source, sinon le compte et la
liste finiraient par ne plus raconter la même chose »**. Il y en a une
troisième, et c'est elle qui ment.

**Le remède est une suppression, pas un ajout :** la `Conversation` doit lire
les demandes en attente dans le magasin, comme le volet. Le `reprise` n'a pas à
porter cet état.

*Chantier 3, et avant la carte de plan* — parce que la carte de plan vivra au
même endroit et héritera du même défaut. La porte : on pose une demande, on va
sur trois écrans, on revient, **la carte est toujours là et répond**.
- la **livraison chez un client** — le greffon vit dans le home d'Hermès, hors
  du dépôt du Hub. Le distribuer est une question à part entière, et le greffon
  d'essai n'est **pas** du code de production.

**⚠ Une conséquence qui déborde ce chantier, pour la version livrée.** Le
classement du laissez-passer — vert / orange / rouge, « exige ton accord »,
l'option « toujours » retirée sur le rouge — **est aveugle au shell.** Vérifié
en mode Atelier, celui des clients : `terminal: echo bonjour` s'exécute sans
qu'aucune carte n'apparaisse. Un agent qui écrit par `printf > fichier` ne
croise aucune des portes qu'on croyait poser. Ce n'est pas une régression du
chantier 3 : c'est l'état d'aujourd'hui, découvert en l'éprouvant.

**Et le crochet `pre_tool_call` le rend voyant — c'est la vraie portée de la
mesure de 02:38.** Ce n'est pas une rustine pour le mode Discussion : une fois
que le terminal frappe, la demande retombe sur `arbitrer()` comme n'importe
quelle autre, le vert passe seul, l'orange et le rouge font une carte. **Le
chaînon manquait au laissez-passer entier, pas au seul interrupteur.** À
instruire pour la version livrée, avec la question de la distribution du greffon.

**V3 — la carte des compétences. À moitié seulement.**
`lireCompetences()` existe et rend des fiches structurées — frontmatter, tags,
titre : ce sont les compétences **prouvées** par un run. Mais **les compétences
déclarées d'un profil ne sont lues nulle part** : `skills` n'apparaît dans le
serveur que dans des commentaires. Un poste neuf, qui n'a encore rien fait,
afficherait donc **une carte vide** — soit le pire message possible.
**Éprouvé sur la machine de kuchu le 4 août — et la réponse déplace la carte.**

`hermes profile show <nom>` rend `Skills: 71` : **un compte, pas une liste**, et
il n'existe pas de `--json`. La CLI n'est donc pas la source. En revanche le
disque l'est, et c'est mieux :
`%LOCALAPPDATA%\hermes\profiles\<nom>\skills\<catégorie>\<skill>\SKILL.md`,
chacun avec un frontmatter riche — `name`, `description`, `tags`, `category`.
Lisible sans CLI et sans appel modèle, exactement comme `competences.js` lit
déjà le Coffre.

**Mais ces skills ne sont pas des compétences de métier**, et c'est ce point qui
change le dessin :

| profil | skills |
|---|---|
| geographe | 74 |
| maquettiste | 71 |
| marc | 71 |
| clean | 70 |
| **default** | **0** |

Quasi identiques d'un agent à l'autre — c'est de l'outillage installé
(`apple-notes`, `findmy`, `github`, `mlops`), pas ce que l'agent sait faire. Une
carte bâtie là-dessus rendrait **tous les agents identiques** et annoncerait
`findmy` comme compétence d'un rédacteur. Et `default` à 0 confirme le pire cas
redouté : la carte vide existe pour de vrai, sur cette machine.

**Ce qui distingue réellement les agents, c'est `hermes profile describe`** —
une phrase de métier, déjà écrite, déjà utilisée par l'orchestrateur kanban pour
router : *« Redige et reformule. Transforme des notes, des listes ou un resultat
d'analyse en texte clair et court […]. Ne trie pas et n'analyse pas de gros
volumes. »*

*Conséquence pour le chantier 5 :* la carte se bâtit sur **`describe`** (le
déclaré) **+ `lireCompetences()`** du Coffre (le prouvé). Le dossier `skills/`
n'y entre pas — au mieux comme « outillage disponible », ailleurs et autrement
nommé.

**V4 — le chargement paresseux. Mesuré, et ça vaut le détour.**

| | Avant | Après | Gain |
|---|---|---|---|
| JavaScript initial | 573,6 ko | **368,2 ko** | −205,4 ko, **−36 %** |
| idem, compressé | 171,4 ko | **105,0 ko** | −66,4 ko, −39 % |
| CSS initial | 69,0 ko | 53,2 ko | −15,8 ko |
| Avertissement Vite « > 500 ko » | présent | **disparu** | |

Vérifié au navigateur : l'accueil ne charge que `index.js`, et le morceau
`StudioView.js` n'est demandé qu'en entrant dans le Studio. Aucune erreur.
~~**Le changement fait trois lignes** — il est prêt, et il attend le chantier 4
pour ne pas se mélanger au commit de l'accueil.~~
**✅ POSÉ LE 6 AOÛT, et remesuré sur le code du jour :** 593,6 → **387,8 ko**
(−34,7 %), 177,2 → **110,5 ko** compressé, CSS 70,7 → 54,9 ko. Revérifié au
navigateur, `performance.getEntriesByType('resource')` à l'appui : l'accueil ne
tire que `index-*.js` et `index-*.css` ; `StudioView-*.js` et
`StudioView-*.css` n'arrivent qu'en ouvrant le Studio.

---

## 3. L'ordre des chantiers

Chacun se termine par quelque chose qu'on peut ouvrir et juger — c'est la règle
de la tranche verticale. Et chacun finit par une ligne `Ensuite :` dans son
commit.

### Chantier 0 — Clore l'accueil *(court)*

Construire, regarder à l'écran, commiter, pousser. Rien à écrire.

**Porte :** le commit est poussé sur `v2`, et l'accueil se comporte comme la
maquette sur la vraie machine, avec les vrais agents.

---

### Chantier 1 — Lever les quatre inconnues *(court)*

Les quatre expériences du §2. Du code jetable, une réponse chiffrée par
inconnue, et une ligne écrite dans le plan pour chacune.

**Porte :** plus aucune étape des chantiers suivants ne repose sur un « ça
devrait marcher ».

---

### Chantier 2 — Les fondations partagées ✅ **clos, porte franchie le 5 août**

Ce qui sert aux **trois** écrans, et qu'il serait absurde d'écrire trois fois.

- les **gardes** d'abord : cliquet des tailles, détection des exports morts,
  branchés sur `npm run design`. Ils protègent tout ce qui suit ;
- la **grammaire complétée** : `PanelRightClose/Open`, le hamburger dès qu'il n'y
  a plus de barre latérale, Échap qui ferme partout, la recherche dans un
  contenu long ;
- la **ligne d'alerte et son volet** — une seule ligne, un volet qui glisse à
  droite, identiques sur les trois écrans et en plein écran ;
- le **vocabulaire à l'écran** : « scénario » remplace « pôle », `pole` reste
  dans le code. Et le Studio cesse d'être surnommé « l'atelier » dans les
  commentaires, puisque « Atelier » devient un mode.

**Pourquoi maintenant :** le vocabulaire coûte trois fois plus cher après. Et la
ligne d'alerte est réclamée par les chantiers 3, 4 et 5.

**Porte :** on peut déclencher une fausse autorisation et la voir apparaître au
même endroit sur les trois écrans, plein écran compris.

---

### Chantier 3 — Le chat qui propose un plan

Le cœur du parcours. À la fin de ce chantier, **on peut créer un scénario depuis
la conversation**.

- l'**interrupteur Discussion / Atelier**, avec sa garantie écrite dessous et
  appliquée côté serveur. **V2 refermée le 5 août, les trois branches jouées :**
  la garantie tient. Mais elle a **deux pièces**, et l'ordre compte :

  1. l'**arbitrage du Hub** — déjà écrit, éprouvé, rien à faire ;
  2. un greffon `pre_tool_call` **dans le home d'Hermès**, pour que le terminal
     vienne frapper. **Hors de ce dépôt, et non distribué.**

  *L'interrupteur peut s'écrire dès maintenant, il ne peut pas se livrer seul.*
  Sans la pièce 2, Discussion refuse ce qui demande — `edit`, `fetch` — et
  laisse passer le shell : c'est exactement l'interrupteur qui ment, celui qu'on
  a refusé d'écrire. **Le bouton doit donc constater la pièce 2 avant de
  promettre quoi que ce soit** : le Hub sait lire `plugins.enabled` dans le
  `config.yaml` d'Hermès (lecture pure), et dire la vérité quand elle manque.
  Poser le greffon à l'installation relève de l'installateur, pas de ce
  chantier : **c'est le premier point du §7, à trancher avant de livrer**.

  *Et le volume est tranché — c'est ce qui rend l'interrupteur écrivable
  maintenant :* **le greffon ne fait frapper le terminal qu'en Discussion.** En
  Atelier, rien ne change pour un client. En Discussion, tout ce qui n'est pas
  une lecture est refusé sans être posé, donc **aucune carte n'apparaît non
  plus** — la garantie ne coûte pas un clic. Voir §2, V2 ;
- la **carte de plan** dans le fil : qui, quoi, comment, **résultat attendu**.
  ✅ **Posée le 6 août, éprouvée à l'écran dans ses cinq états** ;
- les boutons **Valider / Modifier / Refuser**, qui n'existent que parce qu'un
  plan existe. ✅ **Faits.** *Modifier* est devenu **« Reformuler la demande »** :
  F7 reprochait à ce bouton de ne rien promettre de précis, alors il dit où il
  mène — le champ, avec la demande dedans. Rien n'ayant été écrit sur le disque
  à ce stade, il n'y a rien à défaire ;
- la **bascule proposée** quand une demande en Discussion mérite un plan.
  ✅ **Faite**, et elle ne coûte aucun appel modèle : le plan est déjà calculé,
  seule la carte reste fermée tant qu'on est en Discussion ;
- l'**indicateur d'attente** qui dit ce qu'il fait pendant les ~23 s *(F5)*.
  ✅ **Fait**, avec son plafond visible — voir la mesure ci-dessous ;
- l'**historique** déménage à l'accueil, et le **retour au salut se nomme**
  *(F4, C7)*. ✅ **Fait le 6 août, éprouvé à l'écran.** L'historique est un
  bouton **« Conversations »** — dans la ligne « En direct » une fois qu'on a
  parlé, rangé avec Projets et Coffre au salut. C'est la place que lui donnait
  `PLAN-ORCHESTRATION-STUDIO.md` : *on relit là où l'on écrit.* Il quitte
  Orchestration, il ne s'y double pas.
  Et le retour **dit où il mène** : « Revenir à l'accueil » sur l'accueil,
  « Nouvelle » dans le volet Conversation d'Orchestration, qui n'a pas de salut.
  Un libellé unique aurait menti d'un côté ou de l'autre.
  *Mesuré en franchissant la porte :* le compteur passe de 31 à 32 en revenant
  au salut — le fil fermé est bien dans l'historique, ce que le bouton promet.

#### Chantier 3 — ✅ **CLOS le 6 août 2026 à 04:20**

Tous ses points sont faits. Restent, au passage, **F18, F19 et F20** — les trois
frictions de l'attente, rattachées au chantier 3 au §4 et traitées le même
jour :

- **F18** — « le tableau » était un mot du dedans, dans deux messages :
  `server/index.js` (le décomposeur qui n'a pas découpé) et le décompte de la
  fenêtre de simulation. Les deux disent maintenant *ce qui rassure* plutôt que
  *où c'est rangé* : « ta demande est enregistrée, elle ne se perdra pas » ;
- **F19** — l'attente du plan dit désormais qu'on peut écrire pendant. Le champ
  l'a toujours permis, personne ne l'essayait. *Non joué à l'écran :* il faut
  qu'Hermès rende un plan, ce qui dépend du cerveau ;
- **F20** — le message d'échec **porte le geste** : un bouton « Ouvrir dans le
  Studio », à côté de la phrase. ✅ Éprouvé.
  **⚠ Et le bouton menait à un écran vide — trouvé en le cliquant.** Une demande
  qu'Hermès n'a pas découpée n'est pas un pôle : elle vit dans `isolees`, et le
  Studio répondait « Aucun scénario ouvert ». Il en fait maintenant un scénario
  d'une seule tâche, ce qu'elle est. *La leçon vaut la friction :* **un geste
  ajouté doit être suivi jusqu'à son arrivée** — offrir un chemin qui ne mène
  nulle part est pire que décrire un chemin qu'on laisse chercher.

**Porte :** depuis le chat, une demande devient un scénario écrit sur le disque,
en attente, sans qu'aucun agent ait été réveillé.
✅ **Franchie le 6 août 2026 à 01:35**, mesurée sur le bac à sable : quatre
tâches posées — `t_cbbf94cd` *ready*, `t_81ea56c0` *todo* (redacteur),
`t_3b6b82d6` *todo* (maquettiste), et la demande en tête de pôle — enchaînées,
**rien en `running`**.

#### Ce que la mesure a corrigé de V1 — 6 août 2026

V1 avait été éprouvée **une fois**, sur une demande, avec un cerveau distant.
Rejouée **dix fois** sur `glm-5.2:cloud` en local, elle a rendu trois choses
que l'échantillon unique ne pouvait pas voir :

- **« bonjour » recevait un plan** — un agent, une tâche, un livrable nommé
  `reponse-conversation.txt`. Sans un verdict `chantier: false` **avant** le
  gabarit, la règle du 4 août mourait à la première phrase tapée ;
- **un agent inventé** — `trioueur` là où `trieur` existe. Le Hub confronte les
  noms à l'annuaire et **ne rapproche pas au plus ressemblant** : rapprocher
  deux chaînes est une devinette, et une devinette qui se trompe donne le
  travail à quelqu'un d'autre sans que ça se voie ;
- **l'appel peut revenir vide** — deux essais sur la même phrase, le premier
  n'a rien rendu, le second a répondu en 14,7 s.

**Temps : 8,5 · 8,6 · 10,3 · 13,3 · 13,3 · 14,7 · 14,8 · 16,9 · 54,2 s.** Un
facteur six sur la même machine et le même modèle : **aucune moyenne n'est
annonçable**, d'où le décompte à plafond visible plutôt qu'une estimation.

**Et le graphe est posé sans second appel modèle.** C'est l'inverse du chemin
d'aujourd'hui : `/api/demande` appelle `kanban decompose`, donc un modèle, et
on valide ensuite un graphe qu'on n'a pas vu. Ici on lit le plan, on le valide,
et **le scénario posé est exactement celui qu'on a lu**.

#### Deux défauts trouvés à l'écran, et pas au test

- **Un mot pour deux sens.** L'événement de validation portait un champ `pole`.
  Dans tout le Hub, `pole` sur un événement veut dire « ceci appartient à un
  scénario qui tourne, donc ce n'est **pas** de la conversation » — le fil le
  jette, et `noter()` aussi. La carte validée gardait donc ses trois boutons, et
  l'état n'entrait pas dans l'historique. Rien n'échouait : l'événement partait
  bien, il était écarté à l'arrivée. Renommé `scenario`.
- **Une promesse écrite mais jamais tenue.** Le serveur diffusait
  `mode-conversation-reglage` depuis le début, avec en commentaire « deux
  onglets ouverts sur le même Hub ne peuvent pas afficher des garanties
  contraires ». **Personne ne l'écoutait** — le type n'existait même pas côté
  interface. Invisible tant que le seul moyen de changer de mode était de
  cliquer l'interrupteur, qui met son propre état à jour. La bascule d'une carte
  l'a révélé : Hub passé en Atelier, carte ouverte avec ses boutons, et
  l'interrupteur affichant toujours « Discussion · personne ne se réveille ».
  Deux affirmations contraires sur le même écran, dont une fausse.

**Et une leçon de méthode, payée une heure.** Le navigateur servait un
`index.html` en cache : tout ce qui a été « éprouvé » pendant une heure tournait
sur un bundle sans la carte. Le premier diagnostic — une délégation qui gardait
`eveilles` non nul — était plausible, et **faux faute d'avoir vérifié quel code
tournait**. Vérifier le rendu ne suffit pas : il faut vérifier qu'on regarde le
rendu de ce qu'on vient d'écrire.

---

### Chantier 4 — Le Studio et son plan *(commencé le 6 août)*

- le **chargement paresseux du Studio** *(V4)*. ✅ **Fait, et remesuré :**
  JavaScript initial **593,6 → 387,8 ko** (−34,7 %), compressé **177,2 →
  110,5 ko**, CSS initial 70,7 → 54,9 ko, avertissement Vite « > 500 ko »
  disparu. Vérifié au navigateur : l'accueil ne charge que `index.js`, et
  `StudioView-*.js` n'arrive qu'en entrant dans le Studio ;
- le **panneau plan à gauche**, ses trois moments : prévu, en cours, passé.
  ✅ **Fait, éprouvé à l'écran** — `PanneauPlan.tsx`. Permanent, donc il se
  replie (`BoutonRepli`, état retenu dans `localStorage`), avec une recherche
  au-delà de huit étapes. Il porte le **Résultat attendu**, lu dans le plan
  gardé à côté du scénario : c'est la seule source qui connaisse les livrables
  annoncés — ni le tableau d'Hermès ni le graphe ne les portent. La route
  `GET /api/orchestration/plan/<pole>` a été ouverte pour ça, et
  `lirePlanDuPole` cesse d'être un export mort ;
- le **couplage** ligne ↔ nœud, dans les deux sens *(C3)*. ✅ **Fait, éprouvé
  à l'écran dans les deux sens.**
  **⚠ Et le premier essai ne se voyait pas.** La classe était bien posée,
  `transform` valait bien `scale(1.04)` — mais une tâche qui attend son tour est
  `data-etat="endormi"`, donc à 55 % d'opacité et désaturée : le surlignage se
  battait contre le retrait et perdait. Il lève maintenant l'opacité et le
  filtre. *Un couplage qui ne sort pas le nœud de la pénombre ne couple rien* ;
- le Studio **dans le cadre commun**, avec `Maximize2` pour grandir. ✅ **Fait,
  éprouvé à l'écran dans les deux sens.** Il en sortait toujours ; c'était vrai
  de l'édition, faux du reste — on y passe aussi pour regarder tourner un
  scénario. Le plein écran devient un geste, non retenu d'une session à
  l'autre : un repli se retient, un agrandissement non ;
- l'**alerte dans la barre du scénario** en plein écran *(F13)*. ✅ Déjà posée
  au chantier 2 — elle est désormais **conditionnée au plein écran** : dans le
  cadre, `App` pose déjà la sienne, et la grammaire est formelle, *une seule
  ligne, jamais deux*. Le **hamburger** apparaît au même moment, et la barre
  latérale se change en tiroir : plein écran, il n'y a plus de colonne à lui
  donner ;
- **un seul bouton Lancer** — la validation de simulation disparaît *(F11)*.
  ✅ **Fait, éprouvé à l'écran.** Et **l'ordre comptait** : F11 ne tient que
  parce que le panneau plan existe — *« le script est sous mes yeux, le regarder
  EST l'ouvrir ; le bouton qui certifie que je l'ai vu ne certifie plus rien »*.
  Le refus côté serveur tombe avec lui : `lancer()` **date l'accord** au lieu de
  le réclamer. La trace reste écrite, c'est elle que `graphePerturbe` efface ;
- la **confrontation annoncé / rendu** en fin de run *(C8)*. ✅ **Faite,
  éprouvée à l'écran** — `BilanRendu.tsx`. **Un seul bloc, deux natures** : il
  annonce « Résultat attendu » avant, il constate « Annoncé / rendu » après.
  Trois conditions pour basculer, et chacune évite un mensonge : le scénario a
  tourné *(sinon un plan jamais lancé afficherait un bilan tout rouge)*, rien
  n'est en cours *(sinon on poserait « pas rendu » sur un fichier qui s'écrit)*,
  et quelque chose a été annoncé *(sinon il n'y a pas de moitié gauche)*.
  **Ce qui est rendu sans avoir été annoncé est montré, jamais apparié** — un
  `veille-2026-08-04.pdf` là où `veille.pdf` était promis part dans « en plus ».
  Rapprocher deux chaînes est une devinette, et le dépôt l'a déjà tranché sur
  les noms d'agents ; ici elle ferait passer un livrable manquant pour un
  livrable tenu, exactement ce que ce bilan existe pour empêcher ;
- le plan dit **quand une tâche tombe sur l'agent par défaut**, et mène à la
  création d'un spécialiste *(F17, C4)*. ✅ **Fait, éprouvé à l'écran dans ses
  deux branches** — `TrouCompetence.tsx`. Il porte son propre remède : la fiche
  de création d'agent de l'équipe, avec le libellé « Créer un spécialiste »,
  **pas une seconde fiche** — un agent se décrit de la même façon d'où qu'on
  parte. Avant le lancement seulement, et c'est la symétrie de C8 : avant, le
  trou — il reste quelque chose à faire ; après, le bilan — il reste à juger.
  **⚠ Et la demande en tête de pôle est exclue** : elle revient à Hermès par
  nature, la compter ferait crier au manque sur tous les scénarios, tout le
  temps — et une alerte permanente ne s'alerte plus. C'est ce que le contrôle
  négatif a vérifié : `t_c8f85f39`, dont seule la tête est sur Hermès, n'affiche
  aucun bloc ;
- les **deux orphelins du §6** rattachés à ce chantier, tranchés le 6 août :
  pas de **mode réflexion** *(un mode ne se replie ni ne se ferme, et le besoin
  est déjà servi par `data-etat` et par C8)*, et la **relecture par
  l'orchestrateur** revient par C4/F17, qui en est exactement la forme. Voir
  `ADM.md`.

La **découpe des fichiers** de `ARCHITECTURE.md` se fait ici, en écrivant — pas
après. Faite au fur et à mesure, à la demande du cliquet : `LigneContexte.tsx`,
`VoletHistorique.tsx`, `AttentePlan.tsx`, `DecompteDecoupage.tsx`,
`PanneauPlan.tsx`, `PanneauNoeud.tsx`, puis `BilanRendu.tsx` et
`TrouCompetence.tsx`. Le Studio a désormais quatre pièces nommées — barre du
scénario, plan, graphe, nœud — et le plan trois : ses lignes, le trou, le bilan.

*Le cliquet a mordu au bon endroit :* `PanneauPlan` est passé de 248 à **409
lignes** en recevant C8 et C4, ce qui est exactement le seuil d'`ARCHITECTURE.md`
— « un fichier répond à une seule question ». Il en portait trois. Découpé, il
retombe à 255.

**Une dette réglée au passage :** `api.validerPole` et la route
`POST /orchestration/validation` n'avaient plus d'appelant depuis F11. Les deux
sont retirées. `valider()` reste, côté serveur — c'est `lancer()` qui l'appelle
pour **dater** l'accord, et c'est cette trace que `graphePerturbe` efface. Le
type `Validation` cesse d'être exporté : le détecteur l'a signalé dans la même
passe, et il avait raison.

#### Ce que la vérification à l'écran a corrigé — 6 août 2026

**Le bilan se coupait en deux colonnes.** Premier essai fidèle à la maquette :
le libellé à gauche, le fichier poussé à droite. Les noms de la maquette
tenaient en douze caractères ; les vrais n'y tiennent pas. Dans les 256 px du
panneau, **les deux se coupaient** — « l analyse chiffre… » face à
« analyse_performan… ». Or c'est le **nom** qui identifie un livrable ; le
libellé ne fait que le décrire. Le nom est passé sur sa propre ligne, en
premier. *Ce qu'on ne peut pas lire en entier, on le met en dessous, pas à côté.*

**Et `F19` a enfin été joué** — c'était la dernière dette écrite mais non vue.
La carte dit, mot pour mot : *« Je regarde si ça mérite un plan… 0 s / 90 s —
tu peux continuer à écrire pendant ce temps. »*
⚠ **Il a fallu passer par le champ, et c'est une leçon de banc d'essai.** Poster
sur `/api/chat/message` ne déclenche jamais la carte : `mettreDeCote()` est
appelé **à l'envoi depuis l'interface**, et sans lui `usePlan` n'a rien à
proposer. Un raccourci qui saute la surface saute aussi ce que la surface fait.

**Porte :** le parcours entier de la maquette se joue à la souris, du chat au
livrable. ✅ **Franchie le 6 août 2026 à 14:20**, en une seule traite et sur le
bac à sable : une demande écrite dans le champ, Hermès qui **redemande une
précision** au lieu de planifier — puis la carte de plan, trois étapes, validée ;
le scénario posé sans qu'aucun agent ne se réveille ; le Studio qui montre le
plan, le **trou de compétence** sur l'étape 1 et le **résultat attendu** ;
« Lancer » ; trois agents qui travaillent 21 minutes ; et le bilan :

```
ANNONCE / RENDU                                     1 SUR 1
  ✓  note-velo-ville.pdf      Note de synthese finale en PDF
  4 fichiers en plus : note-velo-ville.html, note-velo-ville.md,
                       sources-velo-ville.md, test.txt
```

*Dire où la vérification s'arrête.* La branche **« pas rendu »** n'apparaît pas
ci-dessus — ce run a tenu sa promesse. Elle a été éprouvée séparément, sur un
plan **posé à la main** pour un scénario ancien : trois livrables annoncés dont
un absent et un annoncé avec un chemin, ce qui a donné « 2 sur 3 » et validé le
rapprochement par nom nu. Ce plan d'essai a été **retiré du bac à sable** une
fois vu : une fausse donnée rangée à côté des vraies finit par être relue comme
vraie.

### ⚠ Le Hub entier meurt d'un tube rompu *(6 août, trouvé en franchissant la porte)*

**Le serveur s'est arrêté net pendant le run**, emportant les trois agents avec
lui :

```
Error: write EPIPE ... Emitted 'error' event on Socket instance
```

`PontAcp` écrit les trames JSON-RPC dans `child.stdin`. **Ce tube n'avait aucun
écouteur `'error'`** — seul le *processus* en avait un, et il ne couvre que le
spawn. Quand le processus d'Hermès part, la première écriture suivante émet
`'error'` sur un flux que personne n'écoute, et Node tue le Hub.

**Le piège est que le code avait l'air protégé.** `#envoyer` vérifiait
`this.child` ; `#repondre` entourait l'appel d'un `try/catch`. Aucun des deux ne
sert : **`write()` sur un tube rompu ne lève pas** — il rend `false` et signale
la panne plus tard, en asynchrone. Un `catch` synchrone n'attrape rien
d'asynchrone.

*Corrigé*, en deux moitiés : un écouteur `'error'` sur `child.stdin`, et un test
`writable` dans `#envoyer` qui transforme la panne en refus rattrapable — d'où
une erreur propre au lieu d'un appel qui pend jusqu'au délai de dix minutes.
Deux tests neufs (`server/acp.test.js`), et le fichier dit lui-même ce qu'il
n'éprouve pas : l'écouteur est posé dans `demarrer()`, qui lance un vrai Hermès,
et *« un test qui passe par le verbe finit par toucher le poste »*.

**Ce n'est pas une régression de ce chantier** — c'est l'état d'aujourd'hui,
découvert en jouant pour de vrai. Chez un client, n'importe quel agent qui tombe
mal emportait le Hub.

---

### Chantier 5 — Orchestration

**Et pas avant** : voir l'avertissement du §5.

- retirer le volet **Conversation** ; ✅ **fait le 6 août** — il faisait deux
  champs de saisie pour un geste, et Orchestration ouvre désormais sur l'équipe ;
- retirer la **boîte « Décris ce que tu veux »** — le chat l'a remplacée.
  ✅ **Fait le 6 août**, et **pas avant** : c'était le seul avertissement du
  §5. Conséquences suivies jusqu'au bout — `preparer()` part avec elle, donc
  `api.demande`, donc la route `/api/demande` et `decomposer()` **n'ont plus
  d'appelant** *(à balayer, voir juste en dessous)* ; et l'état `eveilles`
  d'Orchestration disparaît, le serveur étant déjà seul à savoir qui est
  éveillé ;
- trois volets : **Agents et équipes**, **Scénarios**, **Automatisations**.
  ✅ **Faits, vus à l'écran.**
- l'**organigramme de compétences**, bâti depuis les vraies données : le
  **déclaré** vient de `hermes profile describe`, le **prouvé** de
  `lireCompetences()` (Coffre). **Pas** du dossier `skills/` d'un profil — voir
  §2, V3 ;
- les **portes de modification manquantes** : décrire un agent — la route existe,
  le geste manque —, et modifier une automatisation, qui n'a ni route ni geste ;
- les compétences d'un agent, à la création et après, avec un **enregistrement
  explicite**.

**Porte :** on compose une équipe, on corrige la description d'un agent, on
modifie une automatisation — sans jamais ouvrir de terminal.

---

### Chantier 6 — La recette

Le parcours joué en entier, à la souris, par quelqu'un qui n'a pas participé si
possible. Les frictions restantes repartent à l'étape 1 de la méthode.

**Porte :** l'annoncé correspond au rendu, et personne n'est resté coincé.

---

## 4. Rien ne doit se perdre — la table de rattachement

Chaque friction et chaque couplage a un chantier. Ce tableau est là pour qu'aucun
ne s'évapore dans l'exécution.

| Réf | Ce que c'est | Chantier |
|---|---|---|
| F1 | La fenêtre du premier lancement recouvre un écran qui invite à écrire | *tranché le 4 août : on garde la fenêtre modale, telle quelle — aucun code à écrire* |
| F2 | « ton équipe » désigne des inconnus | 3 — **✅ réglé le 5 août** : « Pose une question à Hermès. » en Discussion, et l'annuaire disparaît avec |
| F3 | Le premier message efface tout | *voulu* — aucun |
| F4 | Le retour au salut ne dit pas qu'il ramène | 3 — **✅ réglé le 6 août** : « Revenir à l'accueil », et l'historique juste à côté |
| F5 | 23 s de silence dans un chat | 3 — ✅ réglé |
| F6 | « pôle » est un mot du dedans | 2 — devient « scénario ». **Un titre était passé au travers (« 12 pôles »), corrigé le 5 août en franchissant la porte** |
| F7 | « Modifier » ne promet rien de précis | 3 — ✅ réglé, « Reformuler la demande » |
| F8 | On quitte le fil et le fil n'en dit rien | 3 *(= C1)* — ✅ réglé |
| F9 | Rien ne dit ce qu'on peut toucher dans le graphe | 4 |
| F10 | Graphe et plan arrivent ensemble | 4 — **✅ réglé le 6 août par C3** |
| F11 | Deux validations pour un acte | 4 — **✅ réglé le 6 août : un seul Lancer.** Le serveur date l'accord au clic |
| F12 | L'autorisation n'arrive pas là où l'on regarde | 2 *(= C2)* |
| F13 | Plein écran = plus de pastille d'alerte | 4 — **✅ réglé le 6 août**, avec le hamburger et la barre latérale en tiroir |
| F14 | Rien ne dit qu'un scénario a fini | 2 *(= C5)* |
| F15 | Organigramme et graphe se ressemblent trop | 5 — réglé par la carte des compétences |
| F16 | Le mot « Orchestration » | *reporté* |
| F17 | Personne ne dit que l'équipe ne sait pas faire | 4 *(= C4)* — **✅ réglé le 6 août** : le plan nomme les étapes qui reviennent à l'agent par défaut, la tête de pôle exclue |
| F18 | « le tableau » est un mot du dedans, dans le jalon d'attente | 3 — **✅ réglé le 6 août**, aux deux endroits où le mot sortait |
| F19 | Rien ne dit qu'on peut écrire pendant qu'un plan se prépare | 3 — **✅ réglé, et joué à l'écran le 6 août** : « 0 s / 90 s — tu peux continuer à écrire pendant ce temps » |
| F20 | Le message de dépassement décrit le chemin sans l'offrir | 3 — ~~✅ réglé le 6 août~~ ~~⚠ rouverte le 6 août au soir avec le retrait de la boîte~~ **✅ REFERMÉE le 6 août : « Reformuler la demande », qui remet la phrase dans le champ — décision de kuchu** |
| C1 | La carte de plan porte son état dans le fil, et cite la demande | 3 — ✅ réglé |
| C2 | L'autorisation apparaît là où l'on est | 2 — ✅ réglé |
| C3 | Ligne du plan ↔ nœud du graphe | 4 — **✅ réglé le 6 août, dans les deux sens** |
| C4 | Le plan mène à « créer un spécialiste » | 4 — **✅ réglé le 6 août** : le constat porte le geste, et c'est la fiche de l'équipe, pas une seconde |
| C5 | Un scénario fini laisse une trace persistante | 2 |
| C6 | Planifier ici, gérer là — avec passerelle | 5 |
| C7 | Le retour au salut se nomme et se voit | 3 — **✅ réglé le 6 août** |
| C8 | Annoncé confronté au rendu | 4 — **✅ réglé le 6 août** : un seul bloc, deux natures — il annonce avant, il confronte après, et ne rapproche jamais deux noms au plus ressemblant |

---

## 5. L'avertissement qui compte

**Ne pas retirer la boîte « Décris ce que tu veux » avant que le chat sache
proposer un plan.**

C'est aujourd'hui **le seul chemin** pour créer un scénario. La retirer au
chantier 5 alors que le chantier 3 n'est pas fini enlèverait au produit sa
fonction principale, et personne ne s'en apercevrait tant qu'on ne cherche pas à
créer un scénario.

C'est pour cette seule raison qu'Orchestration passe **après** le chat et le
Studio, alors que c'est le chantier le plus simple des trois.

---

## 6. Ce qui reste ouvert

Deux questions, aucune bloquante.

### ⚠ F20 est rouverte, et c'est le retrait de la boîte qui l'a rouverte *(6 août)*

**Trouvé en suivant le retrait jusqu'au bout, pas après coup.** Le bouton
« Ouvrir dans le Studio » d'un découpage raté n'a **jamais existé que sur le
chemin de la boîte** : `/api/demande` laissait une tâche orpheline sur le
tableau, `plan.pole` en gardait l'identifiant, et il y avait donc quelque chose à
ouvrir.

Le chat échoue autrement. Hermès répond sans étape, `plan.js` refuse — *« il n'y
aurait rien à valider, et le scénario posé serait vide »* — et **rien n'est
créé**. Sa phrase dit pourtant *« ou ouvre le Studio pour la construire à la
main »* : elle **décrit un chemin sans l'offrir**, ce qui est la définition
exacte de F20.

*Et le bouton évident ne marche pas :* ouvrir le Studio sans pôle mène à
« Aucun scénario ouvert » — l'écran vide corrigé le matin même. La question est
donc de dessin, pas de branchement : **que doit offrir le Hub quand Hermès rend
un plan sans étapes ?** Reformuler dans le champ ? Un Studio qui sait naître
vide ? Rien, et une phrase qui ne promet pas ?

**✅ TRANCHÉ PAR KUCHU LE 6 AOÛT : reformuler dans le champ.**

Le bandeau d'échec porte désormais « Reformuler la demande », qui remet la phrase
dans le champ et y met le curseur — **la même réponse que F7, pour la même
raison** : rien n'a été écrit sur le disque à ce stade, il n'y a donc rien à
défaire, seulement une phrase à reprendre. C'est aussi le geste le moins coûteux
des trois envisagés, et le seul qui mène quelque part qui existe.

*La demande devait survivre pour ça :* `usePlan` la rend maintenant avec le
message d'erreur. Sans ce second argument, le bandeau ne pouvait que décrire ce
qu'il aurait fallu refaire.

*Et le bouton ne paraît pas toujours* : poser un scénario qui échoue **après**
qu'un plan a été lu et validé ne rend pas la demande — à ce moment, ce qu'on
voudrait reprendre est le plan, pas la phrase. On ne propose pas un geste qui ne
répare rien.

*Dire où la vérification s'arrête :* **écrit, non joué à l'écran.** Il faut
qu'Hermès rende un plan sans aucune étape, ce qui ne se commande pas. Même
situation que F19 hier — qui, lui, a fini par être joué.

### Trois choses à balayer, nées du même retrait *(6 août)*

- ~~**`api.demande`, la route `/api/demande` et `decomposer()`** n'ont plus aucun
  appelant. C'est le **dernier chemin qui passe par `hermes kanban decompose`** :
  le supprimer retire une capacité du produit, même si plus personne ne peut
  l'atteindre. *Décision de kuchu, comme la distribution du greffon* ;~~
  **✅ TRANCHÉ PAR KUCHU LE 6 AOÛT : on garde la capacité, on lui ouvre une
  porte.** `decomposer()` a perdu sa première moitié — celle qui *créait* la
  tâche, pour la boîte — et garde la seconde, qui découpe. La route
  `/api/demande` est **remplacée** par `POST /api/orchestration/decouper`, qui
  prend une tâche existante. Le geste vit dans la barre du Studio,
  **« Laisse Hermès la découper »**, et n'apparaît que sur une demande seule —
  une tâche dont l'identifiant est celui du pôle, donc qui n'a rien sous elle.

  *Pourquoi ça valait mieux que supprimer :* `poserScenario` **enchaîne**,
  délibérément — le plan d'Hermès donne des étapes et une prose, sans aucune
  notion de dépendance, et on ne devine pas des parallèles depuis un paragraphe.
  `kanban decompose` produit un vrai **graphe**. Le jeter aurait rendu le
  séquentiel définitif, et un travail parallélisable prend alors autant de fois
  plus longtemps qu'il a de branches. **Une dette est devenue une fonction** ;

  **Mesuré sur les quinze scénarios du bac à sable, et ça nuance des deux
  côtés.** Les trois nés du chat sont des **chaînes**, sans exception —
  `fanout = 0`, comme le code l'annonce. Ceux nés du découpeur branchent
  vraiment : jusqu'à `fanout = 5` sur « Écris une chanson sur la pluie »
  (8 tâches, 14 liens), et **quatre d'entre eux ont une convergence hors tête**,
  c'est-à-dire une étape qui attend deux étapes différentes — du parallélisme,
  pas seulement un ramassage final.

  *⚠ Mais ce n'est pas automatique, et le run d'aujourd'hui le montre.* « Cherche
  sur les 5 sites » — l'exemple de la maquette, celui qui semblait le plus
  parallélisable — a rendu **une chaîne** : chercher, rédiger, mettre en page.
  Le découpeur suit ce que la demande impose, et cette demande-là est
  séquentielle malgré ses cinq sites. **Le graphe parallèle est une possibilité
  du découpeur, pas une propriété.** *Découpage en ~20 s, agents choisis seul.*

  *La question qui reste ouverte, et qui rendrait le découpeur superflu :* si on
  demandait à Hermès de **dire les dépendances** dans son plan au lieu de les
  décrire, `poserScenario` saurait poser le graphe lui-même. Une demi-journée de
  mesure, du même genre que celles du chantier 1 ;
- **`FenetreSimulation.onOuvrirEchouee`** est retiré côté appelant ; la prop
  optionnelle reste, sans personne pour la remplir ;
- **le détecteur d'exports morts ne voit rien de tout ça.** Il compare des noms
  dans les clauses d'`import`, et `api.demande` est une **propriété d'objet**.
  Quatrième cas en deux jours après `validerPole`, `competences` et
  `modifierAgent`. *La garde censée empêcher le code mort ne regarde pas là où il
  s'accumule* — à instruire séparément.

### ⚠ Les automatisations sont en double, et c'est écrit plutôt que subi *(6 août)*

Le volet d'Orchestration rend **le même composant que l'accueil**, titre compris.
C6 veut « planifier ici, gérer là » — deux surfaces pour deux questions — mais il
en manque la moitié : « planifier depuis le Studio » n'existe pas, et l'accueil
devrait alors ne garder que ce qui **échoue**. La règle du dépôt — *deux surfaces
qui disent la même chose finissent par se contredire* — est donc enfreinte ici en
connaissance de cause, le temps de trancher.

### Deux orphelins remontés de `CONFRONTATION-HERMES-WEBUI.md`, le 5 août à 18:10

Ils viennent d'une lecture du code d'`hermes-webui` **et d'Hermès lui-même**.
Ni vrais ni faux : **rien ne les porte aujourd'hui**, et ils touchent tous les
deux le chantier 5. Le raisonnement complet est dans le document ; ici, la
question seule.

5. ~~**Le cerveau se choisit-il par agent, ou aussi par tâche ?** La table
   `tasks` du kanban porte une colonne `model_override`, et `equipe.js:585` **la
   lit déjà** sans rien en faire. Le §7 ne raisonne qu'en « par agent » — donc en
   réécriture des treize `config.yaml`, avec toute la difficulté du « qui ne pas
   écraser ». Une échelle par tâche n'a aucun de ces coûts.
   *À trancher au chantier 5 — mais **mesurer d'abord** qui écrit cette colonne
   et si le dispatcher l'honore.*~~
   **✅ MESURÉ LE 6 AOÛT — et la réponse déplace la question. Voir juste en
   dessous : ce n'est ni par agent ni par tâche, c'est par session, et le Hub
   sait déjà le faire.**

#### La mesure de l'orphelin 5 — et elle retourne le §7 *(6 août 2026)*

**Trois choses mesurées, la troisième compte le plus.**

**1. `model_override` est réel, et honoré — mais pas par nous.** La colonne est
écrite par `hermes kanban set-model` et par `create --model` *(et par le tableau
de bord greffon d'Hermès)*. Le dispatcher d'Hermès l'honore vraiment :
`kanban_db.py:8933` ajoute `-m <modèle>` à la ligne de commande de l'ouvrier, et
`--provider` avec, quand `provider_override` est posé — une seconde colonne que
le Hub ne lit pas. **Mais le Hub ne dispatche pas par là.** Il ouvre ses propres
sessions ACP (`PontAcp`), et `execution.js` ne parle de modèle nulle part.
Écrire cette colonne depuis le Hub ne changerait donc **rien** aujourd'hui.

**2. ACP porte le choix du modèle, et le Hub le lit déjà.** La réponse à
`session/new` contient la liste des modèles *(`res.models.availableModels`)* et
le courant — `acp.js:540` les range depuis le premier jour. Mesuré sur le profil
par défaut : **session ouverte en 4,2 s, 36 modèles annoncés**, identifiants de
la forme `provider:modèle` — `nous:anthropic/claude-opus-5`,
`custom:glm-5.2:cloud`…

**3. Et `session/set_model` marche.** `PontAcp.choisirModele()` existe,
appelle `session/set_model`, et **il n'a qu'un seul appelant : la bascule
automatique en cas de panne.** Aucune route, aucun geste. Mesuré :
`custom:glm-5.2:cloud → nous:anthropic/claude-haiku-4.5`, **accepté en 2,4 s**,
modèle courant changé, **aucun `config.yaml` touché**.

*Ce que ça change au plan, et c'est net :* **la « vraie difficulté » du §7 —
savoir qui ne pas écraser — ne se pose pas pour le choix d'exécution.** Un choix
porté par la session n'écrase personne : il dure ce que dure la session, et le
fichier du profil n'est jamais ouvert. La boucle sur treize `config.yaml` n'a
plus lieu d'être ; ce qui reste à écrire est **une route, un sélecteur, et un
endroit à nous où garder le choix** — dans `.hub`, pas dans le profil.

*⚠ Deux réserves, et la première est un piège à éviter.* Les 36 modèles sont
l'**inventaire configuré**, pas une preuve de disponibilité : les `nous:` y
figuraient alors que la session Nous est révoquée. Le sélecteur ne doit donc
rien promettre — c'est exactement le rôle du bandeau posé le même jour. Et un
choix de session **ne survit pas au redémarrage** : le « cerveau universel »
demande un fichier à nous, ce qui est de toute façon préférable.

*Relevé au passage, et le §7 est périmé là-dessus :* le profil par défaut tourne
sur `custom:glm-5.2:cloud`, pas sur `tencent/hy3:free`. Le tableau du 5 août à
16:30 ne dit plus vrai — c'est pour ça qu'Hermès a répondu toute la journée du
6 malgré la session Nous révoquée.
6. **Le Hub peut-il poser `HERMES_YOLO_MODE` au lancement de chaque agent ?** La
   variable est **gelée à l'import** côté Hermès, et le Hub lance un processus
   par agent : il tiendrait donc un désarmement par agent qu'aucune injection ne
   peut retourner en cours de route — une garantie que le webui n'a pas, faute
   d'avoir plusieurs processus. *Non joué.* Ça ne répond qu'au cas « je fais
   confiance sur cette tâche », pas au volume de cartes qu'on veut **garder**.

*Et un renfort, qui n'ouvre rien mais durcit ce qui est déjà écrit :* le code
d'Hermès appelle **« unpaired theater »** un refus d'écriture qui n'est pas
doublé côté terminal. C'est mot pour mot l'état assumé au §7 — le laissez-passer
aveugle au shell en Atelier.

1. **L'interrupteur de rappel de mémoire** reste-t-il allumé d'une conversation
   à l'autre ? Penchant : oui, parce que le poids s'affiche à chaque usage.
2. **Le mot « Orchestration »** *(F16)* ne dit pas ce qu'il y a derrière. Mineur,
   reporté.

*F1 (la fenêtre du premier lancement) a été tranché le 4 août : on garde la
fenêtre modale telle quelle — voir §1, « Joué pour de vrai le 4 août ».*

### Deux orphelins remontés de `VISION-STUDIO.md`, le 4 août à 23:55

La confrontation complète de ce document aux quatre du 4 août a montré qu'**une
seule de ses onze décisions traverse intacte**. Deux ne sont pas contredites —
elles ont perdu ce qui les portait, et ce sont donc des décisions à **reprendre**,
pas des acquis :

3. ~~**Le mode réflexion du Studio** — « le graphe montre où ça a bloqué, le
   journal où ça a dérapé, fermé par défaut ». Il n'apparaît **nulle part** dans
   la maquette, la grammaire ni les frictions. Et son argument reposait sur la
   paire graphe / journal : le journal n'ayant plus de surface, la moitié tombe.
   *À trancher au chantier 4 : garde-t-on un mode diagnostic, et sur quoi ?*~~
   **✅ Tranché le 6 août : non, pas de mode.** Un mode est une seconde lecture
   du même écran, et la grammaire n'en a pas la place — il ne se replie ni ne se
   ferme, il se *retient*, et on oublie dans lequel on est. Le besoin est servi
   par deux pièces qui existent : `data-etat` sur les nœuds pour *où ça a
   bloqué*, et le bilan annoncé / rendu *(C8)* pour *ce qui manque*. Rien à
   écrire. Voir `ADM.md`, « Les deux orphelins de `VISION-STUDIO.md` ».
4. ~~**La relecture par l'orchestrateur** — « il propose, il ne modifie jamais,
   chaque remarque est un bouton à accepter ». Le principe reste juste ; son
   bouton a disparu avec la décision « un seul Lancer » *(F11)*.
   *À trancher au chantier 4 : une relecture revient-elle, et par quelle porte ?*~~
   **✅ Tranché le 6 août : elle revient, et sa porte est déjà au plan.**
   **C4 / F17 en est exactement la forme** — une remarque, un bouton, aucune
   modification d'office. Pas de pièce à part : deux endroits où l'orchestrateur
   parle feraient deux voix pour une.

Et un troisième point qui n'est pas ouvert mais **déplacé**, noté ici pour qu'on
ne le recrée pas au mauvais endroit : le **journal de livraisons** n'a plus de
colonne. Ce qui en reste est le bilan **« Annoncé / rendu »** dans le panneau
Plan en fin de scénario — c'est C8, et la maquette le montre déjà.

---

## 7. Hors périmètre — à rouvrir après

### ⚠ À TRANCHER AVANT DE LIVRER — la distribution du greffon *(5 août, 03:15)*

**Ce point n'est pas « à rouvrir après » comme les autres : il conditionne la
livraison.** Il est posé ici parce qu'il ne relève d'aucun des six chantiers, et
qu'il n'appartient à personne tant qu'on ne l'a pas nommé.

La garantie du mode Discussion tient par **deux pièces** (voir §2, V2, et le
chantier 3). La seconde — un greffon `pre_tool_call` qui oblige le terminal à
frapper — vit dans le **home d'Hermès**, pas dans ce dépôt, et **rien ne la pose
chez un client aujourd'hui**. Sans elle, l'interrupteur laisse passer le shell :
c'est l'interrupteur qui ment, celui qu'on a refusé d'écrire le 5 août à 02:05.

**Deux voies, à choisir en fin de projet — décision de kuchu, 5 août :**

1. **l'intégrer directement** — l'installateur pose le greffon et l'active dans
   le `config.yaml` d'Hermès, au même titre que le reste de l'installation ;
2. **une mise à jour juste après l'installation** — le Hub détecte l'absence, le
   propose, et pose la pièce lui-même.

*Ce qui décidera :* la première touche un fichier qui n'appartient pas au Hub
(`config.yaml` d'Hermès est aussi le fichier que le laissez-passer protège) ; la
seconde laisse une fenêtre où la garantie est fausse sans que rien ne le dise.
Aucune n'est gratuite.

**Tant que ce n'est pas fait, la garantie est vraie sur le poste de kuchu et
fausse partout ailleurs.** Le bouton du chantier 3 doit donc constater la pièce
avant de promettre — c'est écrit là-bas, et c'est ce qui rend l'attente tenable.

### Le laissez-passer reste aveugle au shell en Atelier *(5 août, 07:30)*

**Posé ici parce que c'est le prix de la décision de volume, et qu'un prix qu'on
assume sans l'écrire est un prix qu'on a oublié.** Le greffon ne fait frapper le
terminal qu'en Discussion — donc en **Atelier**, le mode des clients, un
`printf > fichier` continue de passer sans qu'aucune carte n'apparaisse, pendant
que la carte d'à côté annonce « exige ton accord » sur un `edit`. Le classement
vert / orange / rouge dit vrai des outils qui demandent, et seulement d'eux.

Ce n'est **pas** une régression du chantier 3 : c'est l'état d'aujourd'hui,
découvert en l'éprouvant le 5 août. Et le remède est déjà connu — c'est le même
crochet, laissé sonner en Atelier aussi. Ce qui manque n'est pas le moyen, c'est
une réponse au volume qui tienne une semaine : ni dix cartes par tour, ni un
« pour la session » qui rende au rouge le « toujours » qu'on lui a retiré. **À
instruire avec la distribution du greffon ci-dessus, pas séparément** : les deux
questions portent sur la même pièce, et les trancher à part ferait poser chez le
client une garantie dont personne n'aurait réglé le débit.

---

**La mémoire de contexte** — les trois étages, les quatre crans, l'archivage par
projet. Tout est décidé et écrit en section 8 de
`PLAN-ORCHESTRATION-STUDIO.md`, et **rien n'en dépend dans les six chantiers
ci-dessus.** C'est un projet en soi, qui touche le serveur, le Coffre et le
curateur. À reprendre quand la refonte sera livrée et éprouvée.

Deux autres, plus anciennes, qui n'ont pas bougé de la séance :

- la **sauvegarde depuis le Hub** — `hermes backup` existe, le Hub n'a aucun
  bouton. C'était noté « le plus urgent » de la phase 9 ;
- les **clés et modèles depuis le Hub** — un client dont la clé expire doit
  ouvrir un terminal. **Élargi le 5 août, et ce n'est plus une commodité :
  voir juste en dessous.**

### Le cerveau de chaque agent, choisi à la souris *(5 août, 15:10)*

**Demande de kuchu, née d'une panne totale du même jour.** Les treize agents
pointaient tous vers `tencent/hy3:free` ; OpenRouter a répondu *credit error* et
Nous *HTTP 401 — invalid, blocked or out of funds*. **Plus un seul agent capable
de penser, et aucun moyen de le réparer sans terminal.** Le Hub affichait
« Internal error ».

**L'architecture voulue, en deux étages — précisée par kuchu le 5 août :**

1. **un cerveau universel pour tout le Hub**, dont tous les agents héritent ;
2. **des exceptions déclarées** : un agent très spécialisé, sur une tâche
   étroite et agentique, tourne **en local**. Gratuit, hors ligne, insensible
   aux crédits. Mesuré le 5 août : `glm-5.2:cloud` répond en **1,9 s** avec
   outils et raisonnement ; ~~`qwen3.5:4b` est le vrai repli hors ligne, sans
   aucun compte.~~

**⚠ « LE VRAI REPLI HORS LIGNE » NE TIENT PAS SUR LE DÉCOMPOSEUR — mesuré le
5 août à 16:55.** L'expérience V1 du 4 août — trois tâches, quatre champs,
`hermes -z` — rejouée sur les quatre cerveaux locaux de cette machine. La
mesure de 15:10 portait sur un **temps de réponse en conversation** ; celle-ci
porte sur le **contrat structuré**, et les deux ne disent pas la même chose :

| cerveau | durée | bloc structuré |
|---|---|---|
| `glm-5.2:cloud` | **14,1 s** | 3 tâches, **3/3 aux quatre champs** ✅ |
| `qwen3:4b-thinking-2507` | **182,5 s** | 3/3 ✅ — mais **trois minutes** |
| `qwen3.5:4b` | 19,0 s | 2 tâches, **0/4 champs** ⚠ |
| `gemma3:4b` | 5,5 s | aucun tableau ❌ |

**`qwen3.5:4b` est inconstant, et c'est pire qu'un échec franc :** au passage
manuel juste avant, il avait rendu trois tâches aux quatre champs, proprement.
Un cerveau qui tient le contrat une fois sur deux fait un décomposeur qui
échoue sans motif — exactement la variance déjà notée à V1 (19,7 · 26,4 · 95,8
· 270 s sur la même phrase).

*Conséquence pour le dessin, et elle est nette :* **le cerveau universel et le
repli hors ligne ne peuvent pas être le même réglage.** `glm-5.2:cloud` est le
seul qui décompose vite et juste — mais il passe par Ollama **en nuage**, donc
il n'est pas à l'abri d'une coupure, ce qui est toute la raison de ce chantier.
Et les 4B locaux, eux, tiennent une conversation sans tenir le décompte.

**Ce qui doit donc apparaître dans le panneau :** le décomposeur — Hermès —
n'est pas un agent comme les autres. C'est celui qu'on veut le moins voir
tomber sur un 4B, et c'est justement celui que « tout le monde coché d'avance »
écraserait en premier.

*⚠ Ce qui n'est pas mesuré :* ces chiffres portent sur **un seul énoncé**, une
passe chacun. `qwen3.5:4b` a été vu dans les deux états ; les trois autres n'ont
pas été rejoués. Avant d'en faire un défaut livré, il faut plusieurs passes.

**⚠ ET CE N'EST PLUS UNE GÊNE, C'EST UN BLOCAGE — mesuré le 5 août à 16:30.**
La panne n'a pas été réparée depuis 15:10, et elle a **empêché de jouer le
scénario « Portrait de Lucas Ferrand » de bout en bout** ce jour-là. Relevé sur
disque, `profiles/*/config.yaml` :

| Agent | Cerveau | État |
|---|---|---|
| maquettiste | `glm-5.2:cloud` (Ollama, local) | ✅ répond |
| clean | `qwen2.5:0.5b` (local) | ✅ |
| **les onze autres** | `tencent/hy3:free` | ❌ |
| **Hermès lui-même** *(profil par défaut)* | `tencent/hy3:free` | ❌ |

Éprouvé, pas supposé : `hermes --profile geographe chat -q "Reponds juste : ok"`
rend en 5,7 s *« No access token found for Nous Portal login »*. **Le décomposeur
est mort avec les autres** — donc aucun scénario ne peut même être découpé, et
le chantier 5 n'est plus seulement une commodité : il conditionne toute épreuve
de bout en bout sur cette machine. *Le contournement du jour a été de tout jouer
sur le Maquettiste, seul agent capable de penser.*

**⚠ ET LA CAUSE N'EST PAS CELLE QU'ON CROYAIT — relevée le 5 août à 17:00 dans
`auth.json`, écrite par Hermès lui-même :**

```
provider : nous          code : invalid_grant
message  : « Refresh session has been revoked »
reason   : credential_pool_refresh_failure     relogin_required : True
at       : 2026-08-05T14:09:01Z   (16:09 heure locale, le jour même)
```

Le §7 parlait de *credit error* et de *HTTP 401 — out of funds*. **C'était vrai
d'OpenRouter, pas de Nous** : la session Nous a été **révoquée**, et
`credential_pool` est vide pour les trois fournisseurs. Ce n'est donc ni un
problème de modèle, ni un problème d'argent — c'est une **reconnexion**, et
elle ne coûte rien.

*Deux conséquences, et la seconde compte pour le produit :*

- **changer le cerveau des douze n'aurait rien réparé.** Ils sont déjà sur
  `tencent/hy3:free` ; le basculement était un geste sans effet. On a failli le
  faire ;
- **le Hub ne sait pas dire ça.** Il affichait « Internal error » le matin, et
  rien du tout l'après-midi. L'information exacte était sur le disque, en clair,
  dans un fichier qu'Hermès tient à jour — `relogin_required: True` est
  exactement le mot qui manquait à l'écran. **Le chantier 5 doit donc porter
  deux choses, pas une** : choisir un cerveau à la souris, *et* lire
  `auth.json` pour dire quand le cerveau ne répond pas parce qu'il faut se
  reconnecter. Le second est plus urgent que le premier : sans lui, un client
  dont la session expire voit treize agents muets et aucune raison.

  **✅ LE SECOND EST FAIT — 6 août 2026, éprouvé à l'écran sur la vraie panne.**
  La lecture existait depuis le 5 août (`lireSessionFournisseur`, sept tests) et
  `equipage.js` collait déjà la cause au message d'un agent qui tombe. **Ce qui
  manquait était le moment** : il fallait envoyer quelque chose, attendre, et
  échouer pour l'apprendre. Un bandeau le dit maintenant **avant** — il partage
  l'emplacement du bandeau de profil et passe devant lui, parce qu'un profil non
  choisi fait répondre Hermès *à côté* quand une session expirée fait qu'il *ne
  répond pas*. Son bouton **ouvre un terminal sur `hermes model`**, la commande
  qu'Hermès recommande lui-même — suivie jusqu'à son arrivée, terminal compris.
  Relu à chaque événement `panne` : une session ne meurt pas au chargement du
  Hub, elle meurt en cours de journée, le 5 août à 16:09 entre deux demandes.

  *Éprouvé sur le vrai cas, sans décor :* la session de ce poste est révoquée
  depuis le 5 août, et les deux conditions étaient vraies en même temps — ce qui
  a vérifié la priorité du même coup.

  *Reste du §7, et c'est le premier des deux :* **choisir le cerveau à la
  souris**, avec sa difficulté écrite plus bas — savoir qui ne pas écraser — et
  l'échelle par tâche à mesurer d'abord (orphelin 5 du §6).

**⚠ ET TOUT CE QUI SUIT EST À LIRE AVEC LA MESURE DU 6 AOÛT (§6, orphelin 5).**
La difficulté décrite ci-dessous — réécrire treize `config.yaml`, savoir qui ne
pas écraser — **ne concerne que la persistance**, pas le choix d'exécution :
ACP porte le modèle par session, le Hub sait déjà l'appeler, et rien n'est
écrasé. Les paragraphes restent, ils ne sont pas faux ; ils ne sont plus le
chemin.

**⚠ MESURÉ LE 5 AOÛT À 15:20 — LA CASCADE N'EXISTE PAS.** L'aide d'Hermès
décrit `config get` comme *« Print a **resolved** configuration value »*, ce qui
laissait espérer un héritage profil → racine. Éprouvé sur le géographe :
`config unset model.default -p geographe`, puis `config get` rend **`Config key
not set`**, et non la valeur de la racine. **Chaque profil est un îlot.**

*Conséquence directe :* le cerveau universel ne peut pas être une notion
d'Hermès, ce sera une notion **du Hub**. Le changer voudra dire réécrire les
treize `config.yaml` en boucle. Ce n'est pas cher — le Hub fait déjà cette
boucle pour afficher le modèle de chaque agent (`equipe.js`, `lireModele`).

**⚠ Et c'est là qu'est la vraie difficulté, pas dans l'écriture.** Si le Hub
réécrit tout le monde, **il doit savoir qui ne pas écraser** — sinon le
spécialiste en local se fait rattraper par le cerveau universel à la première
mise à jour, **en silence**. C'est la panne la plus vicieuse : celle qui défait
un réglage que quelqu'un avait posé exprès.

*Le dépôt a déjà résolu ce problème, ailleurs :* le panneau des outils MCP coche
**toute l'équipe d'avance** et laisse décocher les exceptions. Même grammaire,
rien à inventer — voir `OutilsEquipe.tsx` et la note « le défaut y est celui qui
marche ».

**⚠ ET IL EXISTE PEUT-ÊTRE UNE SECONDE ÉCHELLE, QU'ON LIT DÉJÀ SANS S'EN SERVIR
— relevé le 5 août à 18:10.** La table `tasks` du kanban porte une colonne
`model_override`, et `equipe.js:585` la sélectionne dans sa requête. **Un cerveau
par tâche ne demande aucune réécriture de `config.yaml`, aucune boucle sur treize
profils, et ne peut écraser aucun réglage posé exprès** — c'est-à-dire qu'il
esquive toute la difficulté décrite juste au-dessus. Ça ne remplace pas le
cerveau universel : une tâche sans override doit bien hériter de quelque chose.
Mais ça fait deux échelles au lieu d'une, et la plus fine est déjà outillée.
*Reste à mesurer qui écrit cette colonne et si le dispatcher l'honore* — c'est
l'orphelin 5 du §6, et tant que ce n'est pas mesuré, ce n'est qu'une hypothèse.

**Ce qui existe déjà et qu'il ne faut pas réécrire :** la bascule automatique de
`modeles.js` a parfaitement fonctionné ce jour-là — elle a vu le fournisseur
couper, enchaîné cinq modèles de repli, et **tout écrit en clair dans le fil**.
Ce qui manque n'est pas la détection, c'est que la liste de repli ne contient
aucun modèle local, et qu'aucun geste d'interface n'existe.

*Chantier 5.* La porte : on change le cerveau d'un agent, on le voit répondre,
sans jamais ouvrir de terminal.

#### ✅ **FAIT LE 6 AOÛT — les deux étages, éprouvés à l'écran**

`server/cerveau.js` porte le choix, six tests le tiennent. Deux étages, comme
kuchu les avait décrits : **un cerveau universel** dont toute l'équipe hérite, et
**des exceptions déclarées** par agent — la grammaire du panneau des outils MCP,
« le défaut est celui qui marche ».

**Rien n'est écrit chez Hermès, et c'est vérifié.** Le choix vit dans
`.hub/cerveau.json` ; ACP l'applique par session, à `ouvrirSession()` — le seul
endroit que *toute* session traverse, chat, délégation et exécution comprises.
*Mesuré :* un universel posé à `nous:anthropic/claude-haiku-4.5` a fait basculer
la session ouverte en direct, une exception sur Hermès l'a ramenée à
`custom:glm-5.2:cloud` — et `config.yaml` n'a pas bougé d'une seconde, son
`model.default` disant toujours autre chose. **La « vraie difficulté » — savoir
qui ne pas écraser — a disparu au lieu d'être résolue : ce qu'on n'écrit pas ne
peut écraser personne.**

**Trois refus assumés, chacun contre un mensonge possible :**

- **la liste ne vient jamais d'une copie tenue ici.** C'est l'inventaire annoncé
  par Hermès à `session/new` — le même que `hermes model`. Une liste recopiée
  serait vraie le jour où on l'écrit et fausse au premier fournisseur ajouté ;
- **le panneau ne réveille personne tout seul.** Lire l'inventaire demande une
  session, donc un processus — 4,2 s mesurées. Il propose, il ne fait pas ;
  tant que personne n'est éveillé la liste est vide, et il le dit ;
- **il ne promet pas qu'un modèle répond.** Les `nous:` figuraient dans la liste
  pendant que la session Nous était révoquée. Promettre referait l'interrupteur
  qui ment ; c'est le bandeau de session qui dit quand plus rien ne répond.

*⚠ Et un défaut trouvé à l'écran, pas à la relecture.* Le premier jet listait une
ligne par **session ouverte** : une ligne sur treize, et à côté de la question.
On vient ici parce qu'un agent **ne répond pas**, donc parce qu'il dort. La liste
vient maintenant de l'annuaire ; les sessions ouvertes n'ajoutent que « sur quoi
il tourne en ce moment ».

#### ✅ **LA PORTE EST FRANCHIE — 6 août 2026, après la reconnexion de kuchu**

Tour complet, sans terminal : exception posée sur le **géographe** — muet depuis
le 5 août —, agent réveillé, session ouverte **sur le cerveau imposé**, question
envoyée, réponse lue. *« Hokkaido est elle-même une préfecture, la plus
septentrionale du Japon. »*

*La reconnexion d'abord :* `last_auth_error` a entièrement disparu d'`auth.json`,
`/api/accueil` rend `session: null`, le bandeau s'efface de lui-même, et
`hermes --profile geographe chat` tient une session de 9 s là où il rendait
« No access token found » le 5 août.

#### ⚠ Et le premier essai a échoué — ce qui valide le refus le plus important

Le cerveau posé d'abord était `nous:anthropic/claude-haiku-4.5`. L'agent a
répondu : *« Model requires available credits. Your account balance is too low to
use paid models. »* **La session Nous est valide et le compte n'a pas de crédits
pour les modèles payants** — deux pannes différentes qu'on avait confondues le
5 août sous « credit error ». Cinq modèles gratuits figurent dans la liste
(`:free`), et l'un d'eux a répondu du premier coup.

*C'est exactement le cas prévu, et il est maintenant **mesuré** au lieu d'être
argumenté :* le panneau **ne promet pas qu'un modèle répond**, parce que la liste
est l'inventaire configuré et rien d'autre. Un sélecteur qui aurait promis aurait
menti ici, sur un modèle présent, authentifié, et hors de portée.

*Ce qui reste à instruire :* rien n'indique dans la liste qu'un modèle est
payant. Le distinguer demanderait de lire les tarifs — `build_models_payload`
sait le faire, il est appelé avec `pricing: false`. **À trancher : afficher le
prix, ou n'afficher que ce qui répond ?** Le second serait une promesse ; le
premier est une information.

Trois de plus, ouvertes le 4 août au soir en rangeant ce plan dans le dépôt :

- **`Fil-Rouge` n'est versionné nulle part.** Le kit de méthode et ses huit
  exemples vivent sur le Bureau, sur ce disque et nulle part ailleurs. C'est du
  travail réutilisable hors d'Hermès — il mériterait son propre petit dépôt.
  **Mais plus par un simple `git init` :** `design-universel/` a rejoint
  `Fil-Rouge/` le 4 août au soir, et c'est **déjà un dépôt** — celui-là même
  qu'Hermès a engendré, `design-universel-kit`. Versionner `Fil-Rouge` sans rien
  dire y enfermerait un dépôt dans un dépôt, exactement le piège du matin même,
  retourné. Il faut donc l'exclure par `.gitignore`, ou le déclarer en
  sous-module — et le choisir, pas le subir. Le `.zip` de séance (167 ko) reste
  dehors dans les deux cas ;
- **trois documents sont restés hors du dépôt** — `RAPPORT-BUG-ACP.md`,
  `ANNULER-RUSTINE-ACP.md`, `TRI-MEMOIRE-HERMES.md`. Ils ne relèvent pas de
  cette refonte, et les faire entrer aurait élargi un commit qui devait rester
  lisible. À décider séparément ;
- **une tension à trancher un jour :** `CLAUDE.md` dit « ne cherche aucun fichier
  de reprise, le dépôt est la mémoire », et ce document porte justement de
  l'état, écrit à la main. Ça tient tant qu'il est tenu à jour ; ça pourrit si
  une séance s'arrête mal — exactement le cas que la règle visait. Si l'état
  descendait entièrement dans les lignes `Ensuite :`, ce fichier n'aurait plus
  qu'à porter l'ordre des chantiers, qui lui ne périme pas.
