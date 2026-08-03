# Tester les fonctions — après l'installation, à la souris

> `VERIFIER-INSTALLATION.md` prouve que **c'est bien installé**.
> Ce fichier-ci prouve que **ça marche**. Les deux sont nécessaires : un
> vérificateur au vert ne dit rien de ce qu'on ressent en s'en servant.

Compte **une heure**, dont vingt minutes d'attente pendant qu'un pôle tourne.
Coche au fur et à mesure — un test sauté est un test raté.

Chaque section dit **ce qu'on fait**, **ce qui doit se produire**, et
**ce que ça vaut** si ça rate.

---

## 0. Avant de commencer

- [ ] `python verif/verifier-installation.py` sort en **0**.

Si non, arrête-toi là : les fonctions ne peuvent pas marcher sur une
installation incomplète, et tu chercherais la panne au mauvais endroit.

- [ ] Note ici le prénom donné à l'installation : `Documents\Hermes-________`

---

## 1. L'icône de la zone de notification

C'est la panne qui t'a fait revenir dessus : sur certains postes elle
n'apparaissait pas, et fermer la fenêtre perdait le Hub.

- [ ] Double-clic sur **Hermes Hub** au Bureau.
- [ ] Une bulle apparaît près de l'horloge, avec « clique le chevron si tu ne
      la vois pas ».
- [ ] **Clique le chevron `^`** de la barre des tâches. L'icône Hermes y est.
- [ ] Ferme l'onglet du navigateur. Double-clic sur l'icône → le Hub rouvre.
- [ ] Clic droit sur l'icône → **Arrêter le Hub**. L'icône disparaît.

**Si l'icône n'apparaît pas**, elle ne meurt plus en silence. Une boîte de
dialogue te dit quoi, et le détail est dans :

```
Documents\Hermes-<prénom>\Hermes-Hub\lanceur.log
%TEMP%\hermes-hub-lanceur.log        (si le premier n'est pas inscriptible)
```

**Envoie-moi ce fichier** : c'est précisément ce qui manquait pour comprendre.

- [ ] Relance le Hub, on en a besoin pour la suite.

---

## 2. L'équipe de départ

Un poste neuf montrait **un seul agent**. C'est ce qu'on répare.

- [ ] Menu **Orchestration**. Quatre agents :

| Nom affiché | Métier | Prêt |
|---|---|---|
| Hermes | Orchestration | oui |
| A (Alphonse) | Analyse | oui |
| B (Béatrice) | Rédaction | oui |
| C (Camille) | Mise en page | oui |

- [ ] Les trois couleurs sont **différentes**.
- [ ] Aucun n'affiche « sans credential ».

**Si un métier est vide**, sa description n'a pas été écrite — et c'est elle,
et rien d'autre, que le décomposeur lit pour router une tâche.

**Le nom se change**, et c'est le but de la parenthèse :

```
hermes profile rename b-redacteur mon-redacteur
```

---

## 3. La demande devient un graphe

- [ ] Dans Orchestration, écris une demande à toi, qui **lit, rédige et met en
      forme**. Par exemple :

> À partir du fichier ventes.csv, produis une note de synthèse chiffrée sur le
> trimestre, puis un document PDF présentable pour la direction.

- [ ] Compte **20 à 90 secondes**. C'est le seul appel modèle de cette phase.
- [ ] Un pôle apparaît, avec **3 tâches** en plus de la demande.
- [ ] Chaque tâche est confiée à **un spécialiste**, pas à Hermes :

```
a-analyste   -> analyser le fichier, extraire les chiffres
b-redacteur  -> rédiger la note
c-metteur    -> mettre en page et générer le PDF
```

**Si tout retombe sur Hermes**, c'est le routage qui échoue — mesuré, c'est ce
qui arrive quand les identifiants ne veulent rien dire. Note-le et dis-le moi :
c'est la mesure la plus utile que tu puisses me rapporter.

---

## 4. Le Studio : construire à la souris

- [ ] Clique la vignette du pôle → le **Studio** s'ouvre en plein écran.
- [ ] Les nœuds sont rangés par vagues, de gauche à droite.
- [ ] **Tire une prise** d'un nœud vers le vide → une fiche s'ouvre, une tâche
      se crée là où tu as lâché.
- [ ] **Tire une prise** vers un autre nœud → une dépendance se pose.
- [ ] Clique un lien, touche **Suppr** → il disparaît.
- [ ] **Ranger** replace tout ; déplace un nœud à la main, il reste où tu l'as
      mis.
- [ ] **Double-clic** sur un nœud → son panneau s'ouvre à droite.

**Essaie de fermer une boucle** — relie une tâche à l'une de ses ancêtres. Le
refus doit être lisible : *« Ce lien fermerait une boucle : chacune des deux
tâches attendrait l'autre. »* Un message d'identifiants serait un échec.

---

## 5. La simulation, et la porte

Gratuite : elle ne rejoue que ce qui est déjà sur le disque, **aucun modèle
appelé**.

- [ ] Bouton **Simuler**. La fenêtre s'ouvre en moins d'une seconde.
- [ ] Elle montre : les vagues, qui reçoit quoi, **les fichiers qui seraient
      touchés** (lecture / écriture), les autorisations prévues, le risque
      global.
- [ ] **Sans valider**, ferme et clique **Lancer**. Il doit **refuser** :
      « Ce pôle n'a pas été validé. »
- [ ] Rouvre, **valide**, puis relance : ça part.

Puis le point qui compte :

- [ ] Arrête le pôle. **Modifie le graphe** (ajoute un lien).
- [ ] Clique **Lancer** sans re-simuler → il doit **refuser à nouveau**.

Un graphe changé n'est plus le graphe validé. Si le lancement passe, la porte
ne sert à rien.

---

## 6. Le laissez-passer — ce qui passe seul, ce qui te demande

**La fonction la plus délicate de la nuit** : le Hub répond OUI à ta place sur
les actions qui ne font que lire.

- [ ] Lance le pôle. Regarde les nœuds s'allumer.
- [ ] **Une lecture ne t'interrompt pas.** Aucune carte pour « lire un
      fichier ».
- [ ] **Une écriture t'interroge.** Une carte apparaît sur le nœud concerné,
      avec deux boutons.
- [ ] Sur une demande **rouge** (écrire, effacer, lancer une commande), la carte
      dit **« ton accord ? »** en rouge, pas « autorise ? » en orange.
- [ ] Réponds. L'agent repart, **la carte disparaît** et ne revient pas.

Ce dernier point a déjà cassé : la carte restait affichée après un accord donné,
et invitait à recliquer sur une action déjà faite.

**Pour tout couper** si le classement te gêne :

```
curl -X POST -H "Content-Type: application/json" -d "{\"actif\":false}" ^
     http://127.0.0.1:4317/api/chat/laissez-passer
```

---

## 7. Les compteurs

- [ ] Laisse le pôle aller au bout.
- [ ] Sur chaque nœud terminé, en bas à droite : **une durée**.
- [ ] Une tâche qui a été reprise affiche en plus **« N appels »**. Une tâche
      normale n'affiche que sa durée — c'est voulu, sinon l'anomalie se noierait.
- [ ] L'en-tête du Studio affiche le cumul : « N s de travail sur N tâches ».

C'est du **temps d'agent cumulé**, pas la durée du pôle : les tâches d'une même
vague tournent ensemble, leur somme dépasse l'horloge.

---

## 8. La sortie de l'impasse

**Nouveau, et c'était le manque le plus grave.**

- [ ] Provoque un blocage. Le plus simple : crée une tâche dont l'énoncé promet
      un fichier — « Écris rapport_test.md » — et laisse-la échouer.
- [ ] Le nœud passe en rouge, état **Bloquée**.
- [ ] Double-clic dessus → un encart ambre : *« Elle ne repartira pas
      d'elle-même. »*
- [ ] Bouton **Remettre en circulation** → la tâche repasse **Prête**.
- [ ] Vérifie qu'elle **n'a pas démarré toute seule** : on la rend au tableau,
      c'est lui qui décide de son tour.

Avant, il fallait `hermes kanban unblock` dans un terminal.

---

## 9. Le repêchage — le seul que je n'ai pas pu prouver en vrai

Quand un agent écrit son livrable **à côté** du pôle au lieu de dedans, le Hub
va le chercher. Testé unitairement, **jamais vu marcher sur un vrai run**.

- [ ] Dans le Studio, crée une tâche dont l'énoncé donne un **chemin absolu**
      vers un fichier à lire, posé à la racine de ton espace de travail, et qui
      demande d'écrire un `.md` à côté.
- [ ] Lance. Regarde le fil : tu dois voir passer

```
rapport_test.md ecrit hors du pole - range dans <nom du pole>
```

- [ ] Le fichier est dans `Poles\<nom>\`, **pas** à la racine.

**Si la ligne n'apparaît pas et que le fichier reste à la racine**, dis-le moi :
le filet ne s'ouvre pas, et c'est exactement ce qui s'est produit à son premier
essai.

---

## 10. La mémoire durable

- [ ] `Documents\Hermes-<prénom>\` contient `scripts\`, `memoire\`, `docs\`,
      `Resumes-Sessions\`, `PARAMETRES-DECLENCHEUR.md`.
- [ ] `Resumes-Sessions\done.json` contient exactement `{}`.
- [ ] Ouvre `%LOCALAPPDATA%\hermes\memories\MEMORY.md` → une section
      **MEMOIRE DURABLE** en bas, sans aucun accent circonflexe parasite.
- [ ] Depuis l'espace de travail :

```
python scripts\resume-sessions.py
```

Il écrit un `.md` par session dans `Resumes-Sessions\` plus un `INDEX.md`.

- [ ] Puis :

```
python scripts\nourrir-vault.py --tout
```

Sur un poste neuf sans projet, il doit dire *« Aucun dossier Projets […] : rien
à nourrir »* et sortir proprement. **Pas une trace Python** — c'était un bug.

---

## 11. Les automatisations

**Nouveau.** Le Hub ne tient aucune horloge : il montre celle d'Hermès, seule
capable de partir quand le Hub est fermé.

- [ ] L'accueil ne montre **rien** si tu n'as rien programmé. C'est voulu.
- [ ] Pose-en une depuis un terminal :

```
hermes cron create "0 9 * * *" "Résume les nouveautés du jour" --name essai
```

- [ ] Recharge l'accueil → une zone **Automatisations en cours** apparaît, avec
      son horaire et « dans N h ».
- [ ] Si tu as **refusé** le service à l'installation, un bandeau ambre dit
      *« Ces automatisations ne partiront pas »* et donne la commande.
      **Si tu l'as accepté, ce bandeau ne doit PAS apparaître.**
- [ ] Bouton **pause** → elle passe en « suspendue », et le bandeau disparaît
      s'il n'en reste aucune active.
- [ ] Bouton **corbeille** → elle disparaît.

C'est le piège que cette zone existe pour fermer : sans le service, `cron
create` réussit, la tâche s'affiche, son échéance est calculée — et rien ne
part jamais. Une automatisation qu'on croit posée est pire que pas
d'automatisation : on compte dessus.

---

## Ce que je veux savoir en retour

Par ordre d'utilité :

1. **Le routage (§3)** — combien de tâches sur combien sont allées à un
   spécialiste plutôt qu'à Hermes.
2. **L'icône (§1)** — et si elle manque, le `lanceur.log`.
3. **Le repêchage (§9)** — la seule fonction jamais vue marcher en vrai.
4. Tout endroit où tu t'es senti **coincé sans issue** : c'est ce qui reste de
   la phase 4, et je ne peux pas le trouver sans toi.
