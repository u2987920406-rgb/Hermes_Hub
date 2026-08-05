# Le plan du plan — Hermès Hub, refonte Orchestration / Studio

> ⏱ **Achevé** le 4 août 2026 à **16:20** · **révisé** le 5 août 2026 à **18:15**
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
**Le changement fait trois lignes** — il est prêt, et il attend le chantier 4
pour ne pas se mélanger au commit de l'accueil.

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
- la **carte de plan** dans le fil : qui, quoi, comment, **résultat attendu**
  (dépend de **V1**) ;
- les boutons **Valider / Modifier / Refuser**, qui n'existent que parce qu'un
  plan existe ;
- la **bascule proposée** quand une demande en Discussion mérite un plan ;
- l'**indicateur d'attente** qui dit ce qu'il fait pendant les ~23 s *(F5)* ;
- l'**historique** déménage à l'accueil, et le **retour au salut se nomme**
  *(F4, C7)*.

**Porte :** depuis le chat, une demande devient un scénario écrit sur le disque,
en attente, sans qu'aucun agent ait été réveillé.

---

### Chantier 4 — Le Studio et son plan

- le **panneau plan à gauche**, ses trois moments : prévu, en cours, passé ;
- le **couplage** ligne ↔ nœud, dans les deux sens *(C3)* ;
- le Studio **dans le cadre commun**, avec `Maximize2` pour grandir ;
- l'**alerte dans la barre du scénario** en plein écran *(F13)* ;
- **un seul bouton Lancer** — la validation de simulation disparaît *(F11)* ;
- la **confrontation annoncé / rendu** en fin de run *(C8)* ;
- le plan dit **quand une tâche tombe sur l'agent par défaut**, et mène à la
  création d'un spécialiste *(F17, C4)*.

La **découpe des fichiers** de `ARCHITECTURE.md` se fait ici, en écrivant — pas
après.

**Porte :** le parcours entier de la maquette se joue à la souris, du chat au
livrable.

---

### Chantier 5 — Orchestration

**Et pas avant** : voir l'avertissement du §5.

- retirer le volet **Conversation** ;
- retirer la **boîte « Décris ce que tu veux »** — le chat l'a remplacée ;
- trois volets : **Agents et équipes**, **Scénarios**, **Automatisations** ;
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
| F4 | Le retour au salut ne dit pas qu'il ramène | 3 |
| F5 | 23 s de silence dans un chat | 3 |
| F6 | « pôle » est un mot du dedans | 2 — devient « scénario ». **Un titre était passé au travers (« 12 pôles »), corrigé le 5 août en franchissant la porte** |
| F7 | « Modifier » ne promet rien de précis | 3 |
| F8 | On quitte le fil et le fil n'en dit rien | 3 *(= C1)* |
| F9 | Rien ne dit ce qu'on peut toucher dans le graphe | 4 |
| F10 | Graphe et plan arrivent ensemble | 4 *(réglé par C3)* |
| F11 | Deux validations pour un acte | 4 — **tranché : un seul Lancer** |
| F12 | L'autorisation n'arrive pas là où l'on regarde | 2 *(= C2)* |
| F13 | Plein écran = plus de pastille d'alerte | 4 |
| F14 | Rien ne dit qu'un scénario a fini | 2 *(= C5)* |
| F15 | Organigramme et graphe se ressemblent trop | 5 — réglé par la carte des compétences |
| F16 | Le mot « Orchestration » | *reporté* |
| F17 | Personne ne dit que l'équipe ne sait pas faire | 4 *(= C4)* |
| F18 | « le tableau » est un mot du dedans, dans le jalon d'attente | 3 |
| F19 | Rien ne dit qu'on peut écrire pendant qu'un plan se prépare | 3 |
| F20 | Le message de dépassement décrit le chemin sans l'offrir | 3 |
| C1 | La carte de plan porte son état dans le fil, et cite la demande | 3 |
| C2 | L'autorisation apparaît là où l'on est | 2 |
| C3 | Ligne du plan ↔ nœud du graphe | 4 |
| C4 | Le plan mène à « créer un spécialiste » | 4 |
| C5 | Un scénario fini laisse une trace persistante | 2 |
| C6 | Planifier ici, gérer là — avec passerelle | 5 |
| C7 | Le retour au salut se nomme et se voit | 3 |
| C8 | Annoncé confronté au rendu | 4 |

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

### Deux orphelins remontés de `CONFRONTATION-HERMES-WEBUI.md`, le 5 août à 18:10

Ils viennent d'une lecture du code d'`hermes-webui` **et d'Hermès lui-même**.
Ni vrais ni faux : **rien ne les porte aujourd'hui**, et ils touchent tous les
deux le chantier 5. Le raisonnement complet est dans le document ; ici, la
question seule.

5. **Le cerveau se choisit-il par agent, ou aussi par tâche ?** La table `tasks`
   du kanban porte une colonne `model_override`, et `equipe.js:585` **la lit
   déjà** sans rien en faire. Le §7 ne raisonne qu'en « par agent » — donc en
   réécriture des treize `config.yaml`, avec toute la difficulté du « qui ne pas
   écraser ». Une échelle par tâche n'a aucun de ces coûts.
   *À trancher au chantier 5 — mais **mesurer d'abord** qui écrit cette colonne
   et si le dispatcher l'honore. Sans ça, c'est une hypothèse, pas une piste.*
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

3. **Le mode réflexion du Studio** — « le graphe montre où ça a bloqué, le
   journal où ça a dérapé, fermé par défaut ». Il n'apparaît **nulle part** dans
   la maquette, la grammaire ni les frictions. Et son argument reposait sur la
   paire graphe / journal : le journal n'ayant plus de surface, la moitié tombe.
   *À trancher au chantier 4 : garde-t-on un mode diagnostic, et sur quoi ?*
4. **La relecture par l'orchestrateur** — « il propose, il ne modifie jamais,
   chaque remarque est un bouton à accepter ». Le principe reste juste ; son
   bouton a disparu avec la décision « un seul Lancer » *(F11)*.
   *À trancher au chantier 4 : une relecture revient-elle, et par quelle porte ?*

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
