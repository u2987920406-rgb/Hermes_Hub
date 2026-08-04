# Hermes Hub — le Studio et l'Orchestration

> **État : proposition, partiellement arbitrée.** Dernière mise à jour :
> 2 août 2026.
> Ce document ne contient que ce qui concerne **l'application**. La méthode de
> travail vit dans `Bureau\Methodes\`, les procédures machine dans
> `Bureau\Hermes\Maintenance\` — **chemins corrigés le 4 août**, le Bureau a été
> réorganisé et les deux anciens n'existent plus.
>
> **Ce fichier a rejoint le dépôt le 4 août 2026.** Il vivait sur le Bureau,
> dans un dossier nommé `Formation dev` : des décisions de produit rangées dans
> un dossier d'apprentissage, que personne n'aurait songé à ouvrir. Il est ici
> parce qu'il commande le chantier 4, à côté de `PLAN-ORCHESTRATION-STUDIO.md`.
>
> **Il ne déclare aucun état du dépôt** — pas un fichier de reprise. Le point
> de reprise du code reste la ligne `Ensuite :` du dernier commit
> (`git log -1`), comme l'impose `CLAUDE.md`.

---

## L'étude dessinée

**→ https://claude.ai/code/artifact/c21b26af-5c69-4ba8-8f90-51de3cbc112e**

Dix sections : le constat, le parcours, le menu avant/après, le Suivi vide, le
Suivi vivant, le Studio complet, le journal des livraisons, l'avis de
l'orchestrateur, le coût de construction, ce qui reste ouvert.

---

## Le déplacement de fond

**Le Studio cesse d'être un spectateur pour devenir l'atelier central, et la
Conversation est rétrogradée en accueil.** Aujourd'hui c'est l'inverse : la
conversation décide de tout et le Studio regarde tourner. C'est un vrai
déplacement du centre de gravité, pas un ajustement.

### La cause, trouvée dans le code

« Orchestration » n'est pas une surface, **c'en est quatre empilées sous une
seule entrée de menu** (`VOLETS` dans `OrchestrationView.tsx`) :

| Volet | Verbe |
|---|---|
| Historique | retrouver |
| Conversation | décrire |
| Agents | consulter |
| Pôles / Équipes | surveiller |
| *+ barre « Décris ce que tu veux »* | **doublon de décrire** |

Le doublon n'est pas la maladie, c'est le symptôme : la barre est apparue dans
Pôles **parce que Conversation était à deux clics**. La retirer sans déplier le
reste ne réglerait rien.

### Le parcours qui en découle

```
Accueil → CONVERSATION → STUDIO → SUIVI → PROJETS / COFFRE
           décrire        construire  surveiller  récupérer
                          éprouver        │
                          lancer          │
                             ▲            │
                             └────────────┘
                          rouvrir, corriger, relancer
```

---

## VALIDÉ — ne plus rediscuter

1. **Le journal est un journal de LIVRAISONS**, pas un flux de paroles. Une
   ligne par livraison : heure, agent, ce qui est livré, qui ça débloque.
   ```
   14:02  Helena · Rédactrice   a livré  « couplet-1.md »
            └──▶ débloque  Marc · Compositeur
   ```
   **Conséquence :** tout est déjà sur le tableau (agent, résultat, liens).
   « Passé à Marc » **est** une flèche du graphe. Le journal se **reconstruit**
   depuis le tableau — il survit à la séance sans stockage nouveau, et la
   question de faisabilité ACP tombe.
2. **Latence acceptée.** Simultané si possible, un retard n'est pas grave.
3. **Le mode réflexion est un outil de diagnostic**, pas un gadget :
   **le graphe montre où ça a BLOQUÉ, le journal où ça a DÉRAPÉ.** Une tâche
   peut réussir en livrant n'importe quoi. **Fermé par défaut.**
4. **Trois boutons** : Simuler (gratuit, rejoue les vagues) → Faire relire par
   l'orchestrateur → Lancer pour de vrai.
5. **L'orchestrateur PROPOSE, il ne modifie jamais.** Chaque remarque est un
   bouton à accepter, et l'acceptation passe par les quatre verbes serveur.
6. **Le coût = temps, requêtes, RAM. Pas d'argent** (peut-être plus tard si des
   API payantes sont branchées).
7. **Un verbe par surface.** Conversation = décrire ; Studio = construire,
   simuler, relire, lancer, lire ; Orchestration = surveiller ; Projets et
   Coffre = récupérer.
8. **La barre « Décris ce que tu veux » disparaît** de l'écran Orchestration,
   remplacée par un bouton qui mène à la Conversation — une porte, pas un champ.
9. **« Passez au studio » découpe ET ouvre.** Le décomposeur crée le pôle, le
   Studio s'ouvre dessus, les erreurs se corrigent à la souris. **Aucun état
   intermédiaire**, aucun stockage nouveau.
10. **Le panneau du nœud et le journal sont la MÊME colonne.** Rien de
    sélectionné → journal complet. Un nœud sélectionné → réglages en haut, son
    fil en bas. Sinon quatre zones se disputent l'écran.
11. **Le renommage est repoussé.** kuchu n'aime pas « Chantiers / Atelier ».
    **Studio reste Studio.** Si on renomme « Orchestration » un jour, le mot
    générique retenu est **« Suivi »**. Une étiquette, non urgent.

---

## LE PROCHAIN BLOC — la barre de tchat

kuchu y tient et veut le développer avec moi, dans un tour de table dédié.

**La question d'ouverture, posée et sans réponse :**

> **Est-ce qu'elle COMMANDE (« ajoute un nœud après celle-ci ») ou est-ce
> qu'elle CONVERSE (« pourquoi Marc attend ? ») ?** Ce n'est pas le même outil.

Deux repères déjà posés :

- elle sait faire **deux familles de choses très différentes** — ranger
  (gratuit, instantané) et modifier le plan (~2 s, annule la validation).
  Elle devrait **dire laquelle elle vient de faire** ;
- **elle doit passer par les quatre verbes serveur existants** (`ajouterTache`,
  `relier`, `delier`, `supprimerTache` dans `server/graphe.js`) et leurs
  garde-fous. Une nouvelle façon de commander, oui ; une nouvelle façon
  d'écrire, jamais — sinon deux écrivains sur le graphe.

**À trancher :** pendant qu'un pôle tourne, le graphe est gelé. Proposition
faite : **le tchat répond mais ne modifie pas.**

---

## Les autres questions ouvertes

- **Plusieurs pôles peuvent-ils tourner en même temps ?** Les maquettes
  supposent que non. Si oui, la bande « en cours » devient une liste et la
  hiérarchie de l'écran change.
- Le nom définitif de l'écran de surveillance.
- Quand un agent ment sur ce qu'il a produit, qui le détecte ? (`livrablesManquants`
  existe déjà comme garde-fou, pas comme garantie.)

---

## Les risques connus, non résolus

1. **La rustine ACP** — hors dépôt, effacée par `hermes update`, symptôme = gel
   silencieux. **Seul risque qui touche les clients.** Deux issues : déposer le
   rapport de bogue (demande `hermes debug share`, décision de kuchu), ou faire
   reposer la rustine par `installer.bat` — celle-là ne dépend de personne.
2. **Pas de commande CLI pour modifier le titre ou le corps d'une tâche.**
   `kanban edit` ne fait que remplir `--result` sur une tâche déjà terminée.
   Contournement vérifié : `kanban comment` remonte bien dans `kanban context`,
   sous `## Comment thread` — donc on précise, on ne corrige pas.
3. **~2 s par geste** sur le graphe. La sortie n'est pas d'écrire en direct dans
   SQLite (`link` rétrograde la fille en `todo`, une écriture directe ne le
   ferait pas) mais de ne pas relire tout le tableau après chaque geste.
4. **La qualité d'exécution du 4B** — une tâche a déjà rendu `done` en mentant
   sur un PDF. Seul axe qui dépend d'un budget.

---

## Rappels d'exploitation

- Bac à sable : `.\dev-v2.ps1 -Port 4319` depuis `Hermes-Hub`, interface sur
  `http://127.0.0.1:4319/`. Isole le workspace et `kanban.db` ; **les profils et
  le `config.yaml` restent partagés** avec le poste réel.
- Après `npm run build`, le navigateur garde `index.html` en cache : **Ctrl+F5**.
- `git` n'est pas dans le PATH : `& "C:\Program Files\Git\cmd\git.exe"`.
- **Aucune commande git sans accord explicite de kuchu.**
