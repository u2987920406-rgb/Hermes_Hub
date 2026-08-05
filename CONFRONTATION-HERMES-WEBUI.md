# Ce que le voisin sait — relevé sur `hermes-webui` et dans Hermès lui-même

> ⏱ **Achevé** le 5 août 2026 à **18:10**
>
> Document **entré par le protocole d'entrée** de `CLAUDE.md`. Il ne vient pas
> d'une séance de conception : il vient d'une lecture de code extérieur, faite
> parce que kuchu a demandé *« il a les mêmes fonctionnalités, est-ce que ça
> vaut le coup de galérer autant ? »*.
>
> **Il ne décide rien.** Il relève, il confronte, et il dit où la vérification
> s'arrête. Ce qui doit être tranché est remonté au §6 de `PLAN-DE-TRAVAIL.md`.

---

## 1. D'où ça vient, et ce qui a réellement été lu

Deux sources, et il faut les distinguer parce qu'elles n'ont pas le même poids.

| Source | Ce que c'est | Confiance |
|---|---|---|
| `github.com/nesquena/hermes-webui` | interface web tierce pour Hermès, MIT, 17 k étoiles, 326 contributeurs | code cloné et lu |
| `%LOCALAPPDATA%\hermes\hermes-agent\` | **Hermès lui-même, installé sur ce poste** | code lu à la source |

**La seconde est la plus importante, et c'était une surprise :** la moitié des
trouvailles utiles ne viennent pas du projet tiers, mais de pièces d'Hermès
qu'on n'avait jamais ouvertes — `tools/approval.py` (3 708 lignes) et
`plugins/kanban/dashboard/` (2 293 lignes de Python **et une interface
compilée de 4 280 lignes de JS**).

### Ce qui a été lu, exactement

- **en entier :** `api/route_approvals.py` (639), `api/kanban_bridge.py` (1 197),
  `BUGS.md` ;
- **en grande partie :** `ARCHITECTURE.md` du webui (≈830 lignes sur 1 274) ;
- **par sondage ciblé :** `tools/approval.py` (~150 lignes vues sur 3 708),
  `plugins/kanban/dashboard/plugin_api.py` (~80 sur 2 293).

**Non lu :** le reste, et c'est l'essentiel — `api/` du webui fait **90 082
lignes**, son JavaScript ~22 000, ses tests ~11 500, et il a **178 issues
ouvertes** qu'on n'a pas regardées.

### ⚠ Trois erreurs commises en chemin, gardées exprès

Elles disent toutes la même chose, et c'est la leçon du 5 août à 02:38 qui
revient : **on a lu un résumé comme un verdict.**

1. *« son kanban est une vue historique en lecture seule »* — **faux.** Ça
   venait d'un résumé automatique de son README. Le code dit l'inverse : CRUD
   complet, glisser-déposer, dépendances, multi-tableaux, déclenchement du
   dispatcher ;
2. *« il ne peut pas réparer son bug de concurrence, il dépend de l'amont »* —
   **trop fort.** Hermès a livré depuis un `contextvars.ContextVar` pour la clé
   de session ; son `ARCHITECTURE.md` est en retard sur Hermès ;
3. *« le Hub enfreint peut-être le contrat du claim »* — **faux, et c'est
   l'inverse.** Vérification au §4 ci-dessous.

**Un résumé n'est pas une source.** Les trois fois, la lecture du code a
contredit le document qui le décrivait.

---

## 2. La question qui a déclenché tout ça, et sa réponse

**Pourquoi le Hub galère-t-il là où lui semble ne pas galérer ?**

Parce qu'il ne pilote pas Hermès : **il est Hermès.** Son README :
*« WebUI runs the Hermes agent in-process, reading your `HERMES_HOME` config
directly. »* Il importe les modules de l'agent — y compris des symboles privés
(`_pending`, `_lock`, `_gateway_queues`) — et partage leur état par le cache
d'imports Python.

D'où : **aucun délai sur ses cartes d'autorisation** (`route_approvals.py` ne
contient ni `timeout`, ni `expire`, ni `deadline` ; l'attente est un
`threading.Event`). Notre journée du 5 août sur les 60 s n'existe pas chez lui.

**Ce qu'il paie en échange, écrit dans ses propres ADR :**

> **ADR-005** — *« Trade-off: **Breaks if ever moved to multi-process** or
> subprocess. Resolution: **Document the constraint**. »*
>
> **ADR-007** — *« Trade-off: Process-global. **Two concurrent chat requests
> clobber each other.** »*
>
> **ARCHITECTURE.md, ligne 165** — *« WARNING: These env vars are
> process-global. **This is safe only for single-user, single-concurrent-request
> use.** »*

Sur ses dix phases d'amélioration, **A, C, D, E, G, I sont COMPLETE. La phase B
— la seule marquée « Critical » — ne l'est pas.** C'est celle de l'isolation.

*Conclusion de la comparaison :* il a construit une très belle interface pour
**un agent, un utilisateur, une requête à la fois**. Les treize agents en
parallèle du Hub sont exactement ce que son architecture lui interdit, et notre
frontière ACP — celle qui coûte les 60 s — est ce qui nous les donne.

**Le prix qu'on paie achète la capacité qui est le produit.** Ce n'est pas une
consolation, c'est le résultat de la confrontation.

---

## 3. Les cinq trouvailles, confrontées

### 3.1 Le compte à rebours n'était pas une idée neuve — la grammaire l'exigeait déjà

**Confrontation à `GRAMMAIRE-PANNEAUX.md` §6 bis, « La conduite de l'attente ».**

Le document dit, pour la préparation d'un plan :

> | pendant | le compteur monte, **le plafond est visible**, le champ reste actif |

Et son principe de clôture : *« **On dessine pour le mauvais jour.** Une
interface qui ne tient que quand le modèle est rapide casse le jour où il ne
l'est pas. »*

**La carte d'autorisation était donc en infraction depuis toujours**, et
personne ne l'avait vu : elle faisait attendre sans montrer de plafond, sur une
échéance qui, elle, existait bel et bien (60,01 s, mesuré trois fois). Le
correctif du 5 août n'invente rien — **il étend à la carte une règle déjà
écrite pour le plan.**

*Conséquence :* quand la carte de plan arrivera dans le fil (chantier 3), elle
doit hériter du même dispositif, pas le redécouvrir.

### 3.2 `model_override` existe déjà dans le tableau — et on le lit sans s'en servir

**Confrontation au §7 de `PLAN-DE-TRAVAIL.md`, « Le cerveau de chaque agent ».**

`equipe.js:585` sélectionne `model_override` dans la table `tasks`. **La colonne
est là, la requête la lit, et rien n'en fait rien.**

Le §7 raisonne entièrement en « cerveau **par agent** », avec la difficulté
centrale : *« si le Hub réécrit tout le monde, il doit savoir qui ne pas
écraser »*. Or le kanban offre une seconde échelle — **par tâche** — qui ne
demande aucune réécriture de `config.yaml`, aucune boucle sur treize profils, et
aucun risque d'écraser un réglage posé exprès.

**Ça ne remplace pas le cerveau universel** (une tâche sans override doit bien
hériter de quelque chose), mais ça change probablement le dessin du chantier 5 :
deux échelles au lieu d'une, et la plus fine est déjà outillée.

*⚠ Non vérifié :* qui écrit `model_override` aujourd'hui, et si le dispatcher
d'Hermès l'honore. **À mesurer avant d'en faire un plan.**

### 3.3 `HERMES_YOLO_MODE` — la réponse au volume, et elle nous va mieux qu'à lui

**Confrontation au §7, « le laissez-passer reste aveugle au shell en Atelier »,
et à sa question ouverte sur le volume d'escalade.**

Le §7 cherche une réponse au volume qui ne soit *« ni dix cartes par tour, ni un
"pour la session" qui rende au rouge le "toujours" qu'on lui a retiré »*.

Hermès en a une, `tools/approval.py:32` :

```python
# Freeze YOLO mode at module import time. Reading os.environ on every call
# would allow any skill running inside the process to set this variable and
# instantly bypass all approval checks — a prompt-injection escalation path.
_YOLO_MODE_FROZEN: bool = is_truthy_value(os.getenv("HERMES_YOLO_MODE", ""))
```

**Gelé à l'import.** Le webui, lui, ne peut pas s'en servir ainsi — un seul
processus pour tout le monde — donc il maintient un `set` mutable en mémoire
(`enable_session_yolo`).

**Le Hub lance un processus par agent.** Il tient donc l'environnement au
`spawn`, et peut décider agent par agent, au démarrage, avec une garantie que
lui n'a pas : **rien ne peut le retourner en cours de route**, ce qui est
exactement la propriété que le commentaire décrit.

*Ce que ça ne résout pas :* le YOLO **désarme** les cartes, il ne règle pas le
volume de celles qu'on veut garder. C'est une réponse au cas « je fais confiance
sur cette tâche », pas au cas « dix cartes par tour ».

### 3.4 Deux gardes d'Hermès qu'on ignorait

- **La liste dure** (`tools/approval.py` ~334) — des commandes que *rien* ne
  débloque, *« regardless of `--yolo`, `/yolo`, `approvals.mode=off` »*. Un
  plancher sous le yolo : *« opting into yolo is the user trusting the agent
  with their files, not trusting it to wipe the disk »* ;
- **Le disjoncteur de refus** (~2074) — `approvals.denial_breaker_threshold`,
  défaut 3. Après trois refus consécutifs, le message renvoyé au modèle passe en
  arrêt ferme, pour qu'il cesse de retenter des variantes.

**Et la phrase qui vise directement notre §7** (ligne 262), dans le code
d'Hermès :

> *« Pair the write_file/patch deny with terminal-side coverage […] —
> **otherwise the deny is unpaired theater**. »*

Notre §7 assume que *« le laissez-passer reste aveugle au shell en Atelier »*.
Hermès a un mot pour ça, et ce n'est pas un mot tendre. **Ça durcit l'argument
de faire sonner le heurtoir en Atelier aussi**, sans le trancher.

### 3.5 `task_events` — une détection de changement gratuite qu'on n'utilise pas

Le kanban tient un journal `task_events` à identifiants monotones. Le webui s'en
sert pour deux choses qu'on fait moins bien :

- **un curseur** : `?since=N` rend `{"changed": false, "latest_event_id": N}`
  sans rien charger. On relit tout, à chaque fois ;
- **un flux SSE qui reprend** : il émet `id: <n>` sur chaque trame, donc
  `EventSource` renvoie `Last-Event-ID` à la reconnexion et le serveur repart de
  là, **sans rejouer le backlog**. Sondage 0,3 s, battement 15 s, lot plafonné à
  200.

**Et le journal porte des événements qu'on ne voit pas** — `plugin_api.py:237` :

> `completion_blocked_hallucination` : *« kernel rejected created_cards with
> phantom ids; task stays in prior state »*
> `suspected_hallucinated_references` : *« prose scan found `t_<hex>` in summary
> that doesn't resolve »*

**Hermès détecte déjà qu'un agent invente des identifiants de tâches en se
déclarant fini.** C'est le cousin exact de `livrablesManquants` dans
`execution.js`. On lit déjà cette base ; ces événements sont gratuits.

---

## 4. Le contrat du claim — vérifié, et le Hub le respecte

Une alerte a été levée en séance puis **retirée après vérification**. Elle est
gardée ici pour qu'on ne la relève pas dans six mois.

Trois surfaces officielles écrivent sur le même `kanban.db` : la CLI, le tableau
de bord d'Hermès (`plugins/kanban/dashboard/`), et le webui. Elles partagent un
contrat explicite — le webui écrit *« Mirrors the agent dashboard plugin's
`_set_status_direct` so first-party clients see identical behaviour from either
surface »*. **Le Hub est la quatrième surface.**

| Le contrat | webui / tableau d'Hermès | Le Hub |
|---|---|---|
| Entrer en `running` | écriture directe **refusée**, HTTP 400 | ✅ `hermes claim --ttl` — `execution.js:945` |
| Sortir de `running` | annuler `claim_lock`/`claim_expires`/`worker_pid`, clore le run en `reclaimed` | ✅ `hermes reclaim --reason` — 1106, 1248 |
| Connexion SQLite | `connect_closing` obligatoire, sinon fuite de FD et WAL épinglé | ✅ `readOnly: true`, fermée en `finally` — `equipe.js:630` |
| Écritures | SQL brut dans la base partagée | ✅ **aucune** — tout passe par la CLI |

**Le Hub est le plus conservateur des quatre.** Le webui écrit du SQL brut dans
une base que trois autres processus partagent ; le Hub lit en lecture seule et
délègue chaque écriture. Le danger que le webui décrit lui-même — *« starves
SQLite checkpoints for every process »* — le Hub ne le crée pas.

**Le seul écart réel :** `worker_pid` reste vide, parce que le Hub n'est pas un
worker lancé par le dispatcher. La détection de plantage d'Hermès ne voit donc
pas nos tâches. C'était **déjà écrit** dans `execution.js` (« et le Hub n'en pose
aucun ») et **déjà compensé** — `baux.json`, `relacherOrphelines`, `reclaim` au
redémarrage. Ce n'est pas un trou, c'est un mécanisme parallèle assumé.

*La seule question qui reste :* le TTL du bail est-il plus court que le seuil de
péremption d'Hermès ? **Non vérifié.**

---

## 5. Où la vérification s'arrête

C'est le pas qu'aucune machine ne tiendra, et il compte double ici parce que ce
document a déjà été faux trois fois.

**Ce qui est solide** — lu dans le code, à la source :

- l'absence de délai chez le webui, et le modèle in-process ;
- les trois ADR et le WARNING de la ligne 165 ;
- le contrat du claim et le respect qu'en fait le Hub (§4) ;
- l'existence de `model_override`, de `_YOLO_MODE_FROZEN`, de `task_events` et
  des deux événements d'hallucination.

**Ce qui ne l'est pas :**

- **qui écrit `model_override`**, et si le dispatcher l'honore. Toute la §3.2
  en dépend ;
- **si le Hub peut réellement poser `HERMES_YOLO_MODE` au `spawn`** — le
  raisonnement tient, il n'a **pas été joué** ;
- **le seuil de péremption d'un claim** côté Hermès, comparé à `BAIL_SECONDES` ;
- **le Studio.** On affirme qu'il n'existe nulle part ailleurs, mais son
  JavaScript (~22 000 lignes) n'a pas été ouvert. C'est la seule affirmation de
  ce document qui repose encore sur un README ;
- **les 178 issues ouvertes** du webui, jamais regardées. Sa dette réelle vit
  là, pas dans son `BUGS.md` qui annonce *« No open bugs at this time »*.

**Ce document ne périme rien** dans `PLAN-DE-TRAVAIL.md`,
`maquette-parcours.html`, `GRAMMAIRE-PANNEAUX.md` ni `FRICTIONS-PARCOURS.md`. Il
en **renforce** trois points (§6 bis de la grammaire, F8 et F12 des frictions,
§7 du plan) et en **ouvre** deux, remontés au §6 du plan.
