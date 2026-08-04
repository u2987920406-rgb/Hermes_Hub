# Le parcours joué avec un œil neuf — points de friction

> ⏱ **Achevé** le 4 août 2026 à **11:13** · révisions : `git log --follow -- FRICTIONS-PARCOURS.md`
> **Le document le plus récent l'emporte.** Compare cette date avant d'appliquer.
> *Constat, pas arbitrage : ce document n'est pas sous la règle d'horodatage.*

> 4 août 2026. Je suis un client qui vient d'installer Hermès Hub. Je n'ai lu
> aucun plan, je ne connais pas le vocabulaire, et je veux juste faire faire
> quelque chose. Les frictions sont numérotées pour qu'on puisse en discuter une
> par une.
>
> Le parcours est joué sur l'application **telle qu'elle sera après la refonte**
> — décisions du 4 août intégrées : une seule porte par le chat, le script en
> panneau à gauche, l'accueil signale et Orchestration gère, le Studio dans le
> cadre commun avec un bouton pour grandir.

---

## Moment 1 — J'ouvre le Hub pour la première fois

Une fenêtre s'ouvre par-dessus l'écran et m'explique la mémoire. Derrière, je
devine « Bonjour raf » et un champ de saisie.

**F1 — Deux choses me demandent quelque chose en même temps.** L'écran dit
« écris-moi », la fenêtre dit « configure-moi ». Avant, l'accueil était un
tableau de bord passif : une fenêtre par-dessus ne concurrençait rien. Maintenant
elle recouvre une invitation à agir. *Gravité : moyenne.* La fenêtre reste
justifiée — c'est la configuration que tout le monde saute — mais son moment
n'est plus le bon.

---

## Moment 2 — Je tape mon premier message

Le champ dit : « Écris à ton équipe. @nom pour appeler quelqu'un. »

**F2 — « ton équipe » désigne des gens que je n'ai jamais vus.** Un poste neuf
reçoit trois rôles génériques. Je ne connais ni leur existence, ni leurs noms,
et `@nom` suppose que je les connaisse. *Gravité : moyenne.* Le placeholder
promet une capacité que je n'ai pas encore.

Je tape « bonjour » pour voir. **Tout disparaît.**

**F3 — Le premier message efface le seul endroit qui expliquait quelque chose.**
Les raccourcis, les automatisations, le salut : partis. C'est voulu, et c'est
bien — mais pour quelqu'un qui essayait juste l'outil, c'est une porte qui claque.

**F4 — Le retour ne dit pas qu'il est un retour.** Le seul chemin vers l'accueil
s'appelle **« Nouvelle »**, en haut à droite, et promet une conversation neuve —
pas un retour. Je ne peux pas deviner que c'est là que je retrouve mes
raccourcis. *Gravité : haute.* C'est le genre de friction dont on ne se plaint
jamais : on ne dit pas « je n'ai pas trouvé », on croit que ça n'existe pas.

---

## Moment 3 — Je demande vraiment quelque chose

« cherche les nouveautés IA du moment, fais-moi un tableau et un PDF ».

**F5 — Vingt-trois secondes de silence dans un chat, c'est une panne.** Le
décomposeur met ~23 s, mesuré. Dans une conversation, on attend une réponse : le
silence ne se lit pas comme « je réfléchis à un plan », il se lit comme « c'est
cassé ». *Gravité : haute.* Le plan V2 note déjà qu'il faut un indicateur ; le
passage au chat le rend indispensable, et il doit **dire ce qu'il fait**, pas
seulement tourner.

Puis une carte apparaît : « Je propose un **pôle** Veille IA avec cinq agents. »

**F6 — « pôle » est un mot du dedans.** Je ne sais pas ce que c'est, ce que ça
engage, ni si c'est réversible. Je vois trois boutons — Valider, Modifier,
Refuser — sans savoir ce que je valide. *Gravité : haute pour un client.* Le mot
est juste dans le code ; à l'écran il demande une traduction, ou une phrase qui
le définit à sa première apparition.

**F7 — « Modifier » ne promet rien de précis.** Il me renvoie au chat ? Dans le
Studio ? Un bouton dont on ne sait pas où il mène ne se clique pas.

### La règle qui range tout ça *(ajoutée par kuchu, 4 août)*

> Tant qu'Hermès n'a pas proposé de plan, il répond, et c'est tout : aucun
> bouton de validation, aucun Studio. **Les boutons n'apparaissent que
> lorsqu'un plan existe** — parce qu'alors il y a quelque chose à valider.

C'est la règle qui manquait, et elle range trois choses d'un coup. Le chat reste
un chat par défaut. Le Studio cesse d'être un endroit où l'on peut tomber sans
comprendre pourquoi. Et un bouton « Valider » ne s'affiche jamais devant quelque
chose qui n'est pas validable — ce qui est la définition même d'un bouton qui
inquiète.

**Un plan a donc une forme obligatoire, et quatre parts :**

| La part | Ce qu'elle dit | Ce qu'elle évite |
|---|---|---|
| **QUI** | les agents mobilisés, nommés | on ne valide pas une équipe qu'on ne voit pas |
| **QUOI** | les tâches, une phrase chacune | « cinq agents » ne dit pas ce qu'ils font |
| **COMMENT** | l'ordre, les dépendances, les outils employés | ce qui va être touché, et dans quel sens |
| **RÉSULTAT ATTENDU** | les livrables annoncés : quels fichiers, quel format | **la seule part qui permette de juger après coup** |

**Le résultat attendu n'existe nulle part aujourd'hui, et c'est un manque.** Le
décomposeur rend des tâches — il ne déclare pas ce que le pôle est censé
produire. Sans cette ligne, la fin d'un run n'est comparable à rien : on regarde
des fichiers et on décide au jugé s'ils font l'affaire. Avec elle, la boucle se
ferme toute seule (voir C8).

---

## Moment 4 — Je valide, le Studio s'ouvre

**F8 — Je quitte le fil, et le fil n'en dit rien.** Si je reviens à l'accueil, la
carte est-elle toujours « en attente » ? Est-ce que je peux re-valider et créer
un deuxième pôle ? **Le fil doit porter l'état de ce qu'il a proposé** — sinon il
raconte une histoire fausse dès le lendemain. *Gravité : haute, et c'est un
couplage, pas un détail.*

Le Studio s'ouvre : un graphe de cases que je n'ai pas faites, et un panneau à
gauche plein de texte.

**F9 — Rien ne me dit ce que je peux toucher.** Cinq cases, des flèches, des
couleurs. Je n'ose rien. *Gravité : moyenne.* L'atelier suppose qu'on sait qu'on
est dans un atelier.

**F10 — Deux nouveautés en même temps.** Le graphe et le script arrivent
ensemble, et je ne sais pas lequel regarder. Le couplage prévu — survoler une
ligne surligne un nœud — est précisément ce qui l'enseignera **si le premier
mouvement se fait tout seul.**

---

## Moment 5 — Le point le plus illogique du parcours

Pour faire faire une chose, j'ai validé **trois fois** : la proposition dans le
chat, puis la simulation, puis Lancer.

**F11 — Deux validations pour un seul acte.** Et depuis que le script est un
panneau **permanent** plutôt qu'une fenêtre qu'on ouvre, « valider la
simulation » n'a plus de porte à garder : le script est sous mes yeux, le
regarder EST l'ouvrir. Le bouton qui certifie que je l'ai vu ne certifie plus
rien. *Gravité : haute — c'est une incohérence, pas une gêne.*

**Tranché.** Deux gestes, pas trois : **je valide le plan** dans le chat, **je
lance** dans le Studio. Le panneau de gauche ne porte qu'un bouton — Lancer — et
ce geste vaut accord. La règle qui compte est conservée entière : rien ne part
sans un clic explicite, après avoir eu la forme du travail sous les yeux. Celle
qui ne protégeait plus rien disparaît.

C'est cohérent avec la règle de kuchu ci-dessus : le premier bouton naît avec le
plan, le second exécute le plan. Deux moments, deux objets, un bouton chacun.

Conséquence à assumer : la règle « simulation validée **+** au moins un run réel »
qui gouverne la mise en mémoire devient « plan validé + un run réel ». Le compte
y est toujours — deux preuves, pas une.

---

## Moment 6 — Ça tourne, et ça s'arrête

Une autorisation rouge : Pablo veut écrire un fichier.

**F12 — L'autorisation arrive-t-elle là où je regarde ?** Le plan V2 dit « une
carte dans le fil ». Mais je suis dans le Studio. Si elle n'apparaît que dans le
chat de l'accueil, mon graphe se fige et **rien ne me dit pourquoi** — je conclus
que c'est planté. *Gravité : la plus haute du document.* C'est mot pour mot le
piège que l'ADM raconte déjà : « il ne se passait RIEN — ni action, ni message,
ni trace. Il n'y a qu'une lecture possible pour qui regarde l'écran. »

**F13 — Et si j'ai agrandi le Studio, la pastille disparaît avec la barre
latérale.** Le compteur d'autorisations vit dans le menu de gauche. En plein
écran, il n'y a plus de menu — donc plus d'alerte. La décision « le Studio peut
grandir » crée ce trou, il faut le boucher en même temps.

---

## Moment 7 — Je pars, je reviens

**F14 — Rien ne me dit qu'un pôle a fini pendant mon absence.** Une notification
volante dure trois secondes. Si j'étais parti, elle n'a existé pour personne.
L'accueil est maintenant un chat : il ne porte aucune trace persistante de « ton
pôle a rendu trois fichiers ». *Gravité : haute.* C'est exactement le raisonnement
qui a fait garder l'alerte d'automatisation sur l'accueil — il vaut aussi pour
les pôles finis.

---

## Moment 8 — Je découvre Orchestration

**F15 — L'organigramme et le graphe du Studio se ressemblent trop.** Même
grammaire visuelle, voulue par le plan. Pour moi qui découvre, c'est le même
écran deux fois, et je ne comprends pas pourquoi il y en a deux. *Gravité :
moyenne, mais c'est un principe :* l'ADM interdit « deux écrans qui montrent la
même chose autrement ». Il faut une différence lisible en une seconde — pas une
explication, une différence.

**F16 — Le mot « Orchestration ».** Il ne me dit pas qu'il y a mon équipe et mes
chantiers derrière. *Gravité : faible.* À noter, pas à traiter tout de suite.

---

## Moment 9 — La friction qu'on ne voit qu'en vrai

Je demande quelque chose que mon équipe ne sait pas faire. Le décomposeur route
les tâches sur Hermès faute de profil correspondant — le plan V2 appelle ça « le
risque réel ».

**F17 — Rien ne me le dit.** Le pôle se crée, tourne, et rend un résultat tiède,
sans que je sache que trois tâches sur quatre sont tombées sur l'agent par
défaut. *Gravité : haute.* Le script est l'endroit qui peut le dire — il a la
liste sous les yeux — et il doit pointer vers le geste qui répare : créer un
spécialiste.

---

## Les couplages qui manquent

Ils ne sont pas de la finition : ce sont eux qui font que les trois écrans sont
un seul outil.

| # | Couplage | Ce que ça évite |
|---|---|---|
| **C1** | La carte de proposition porte son état dans le fil : proposée → validée → pôle créé, avec un lien vers le Studio | Un fil qui ment le lendemain (F8) |
| **C2** | Une autorisation en attente apparaît **là où l'on est** : dans le Studio, dans le fil, et dans la barre latérale — plein écran compris | Un pôle arrêté sans raison visible (F12, F13) |
| **C3** | Survoler une ligne du script surligne son nœud ; cliquer un nœud fait défiler le script | Deux affichages côte à côte au lieu d'un instrument (F10) |
| **C4** | Quand une tâche tombe sur l'agent par défaut, le script le dit et propose de créer un spécialiste | Un résultat tiède sans cause visible (F17) |
| **C5** | Un pôle qui finit laisse une trace **persistante** sur l'accueil, pas un toast | Un travail fini que personne ne voit (F14) |
| **C6** | Planifier depuis le Studio annonce « visible dans Orchestration », et un échec remonte à l'accueil | Programmer ici, gérer là, sans passerelle (décision 3) |
| **C7** | Le retour au salut se nomme et se voit | Des raccourcis qu'on croit disparus (F4) |
| **C8** | Le **résultat attendu** annoncé dans le plan est confronté aux livrables rendus, à la fin du run | Un pôle « terminé » dont personne ne sait s'il a fait ce qu'il annonçait |

**C8 mérite un mot de plus, parce que c'est le couplage qui ferme la boucle.**
Le plan déclare « un tableau et un PDF » ; à la fin, le script met en regard ce
qui a été produit : `veille.md`, `veille-2026-08-04.pdf`. Deux lignes côte à
côte, et le jugement est immédiat — y compris quand il est mauvais : *annoncé un
PDF, rien rendu.* Sans le résultat attendu, un pôle en échec partiel ressemble
exactement à un pôle réussi, et c'est le pire cas de tous : celui où l'on fait
confiance à tort.

C'est aussi ce qui rend « Valider et mettre en mémoire » honnête. Une compétence
prouvée devient : *ce plan a annoncé ceci, et il l'a rendu.*

---

## Les trois questions de fond

Au-delà des frictions, trois choses que le parcours pose et que le plan ne
tranche pas encore.

~~**1. Combien de gestes entre « je veux » et « ça part » ?**~~ **Tranché le
4 août : deux.** Valider le plan, puis lancer. Et les boutons n'existent qu'à
partir du moment où un plan existe. Voir F11.

**2. Où vit « ce qui s'est passé » ?** Il y aura l'historique des conversations
(côté accueil) et le script d'un pôle (côté Studio). Ce sont deux mémoires
différentes, et je chercherai le compte-rendu dans la mauvaise. À relier, ou à
nommer clairement.

**3. Qu'est-ce qu'un poste neuf sait faire ?** Trois rôles génériques, et le
routage dépend de leur description. Toute la qualité du parcours en dépend, et
c'est la partie qu'aucun écran ne montre aujourd'hui.

---

## Sur la maquette

**Oui, et avant d'écrire une ligne.** Trois raisons, dans l'ordre de leur poids.

**Les couplages ne se jugent pas sur le papier.** C1 à C7 sont des relations
entre écrans : leur seule preuve est le clic. Un document peut dire « le script
surligne le nœud » ; il ne peut pas dire si ça se remarque.

**Ce dépôt a déjà cette méthode, et elle a payé.** Le plan V2 archive une
maquette de validation comme référence des six états du nœud, et la règle du
dépôt est « npm run build, puis REGARDE le rendu ». Sur l'accueil, cette semaine,
deux défauts sur deux ont été trouvés à l'écran et zéro à la compilation.

**Le coût n'est pas comparable.** `OrchestrationView.tsx` fait 980 lignes,
`StudioView.tsx` autant. Se tromper de forme après les avoir refondus coûte des
jours ; se tromper dans une maquette coûte une heure.

**Ce que je propose comme maquette :** un seul fichier HTML autonome, cliquable,
aux vraies couleurs du Hub, qui joue le parcours des moments 2 à 7 — le salut,
la proposition dans le fil, le Studio avec son graphe et son script à gauche, le
lancement, l'autorisation rouge, la fin. Pas de vraie logique : des états qu'on
enchaîne. Les endroits encore à trancher y sont marqués comme tels, pour qu'on
en discute en les regardant plutôt qu'en les imaginant.
