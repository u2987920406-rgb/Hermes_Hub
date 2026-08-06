# Le design du Hub - ou tirer les leviers

Ce fichier repond a une seule question : **je veux changer l'apparence de
quelque chose, ou est-ce que je touche ?**

Il est ecrit pour etre lu par quelqu'un qui ne connait pas le code - un humain
presse, ou une IA qui ouvre le projet pour la premiere fois.

---

## 0. Le protocole - quatre pas, dans l'ordre

> 1. **Trouve la ligne dans l'index** (section 1). Il est classe par ce que tu
>    vois a l'ecran, pas par arborescence de fichiers.
> 2. **Si une molette existe, tourne-la** dans la console de `src/index.css` -
>    et n'ouvre aucun `.tsx`. Une molette agit sur toute l'application d'un coup.
> 3. **Sinon, `grep` le nom de zone** (`data-zone="bulle-agent"`). Tu tombes
>    directement sur le composant, sans lire les 900 lignes du fichier.
> 4. **`npm run build`, puis REGARDE le rendu.** Pas seulement la compilation.

Le quatrieme pas n'est pas de la politesse. Une barre de defilement fantome et
un titre de conversation qui avalait la phrase de l'utilisateur ont tous les
deux compile sans une erreur, et ne se voyaient que sur l'ecran.

**Ce que l'index ne promet pas.** Certaines demandes ne sont pas des reglages :
deplacer l'historique dans le menu, replier une rangee par defaut, changer
l'ordre des ecrans. Aucune molette ne fera ca, et l'index le dit dans sa
derniere colonne plutot que de laisser chercher. Une molette inventee pour
l'occasion est pire qu'un composant modifie franchement.

---

## 1. L'index des zones

Chaque bloc visuel porte un nom stable dans le code :

```tsx
<div data-zone="bulle-agent" …>
```

Ce nom **vit dans le code**, donc il survit aux deplacements et aux refactos -
contrairement a un index en `fichier:ligne`, faux des le troisieme commit. Il
sert dans les deux sens : `grep` pour le trouver, et l'inspecteur du navigateur
pour le nommer quand on veut demander une modification.

### Le fil de conversation

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Une bulle d'agent qui parle | `bulle-agent` | `--agent-point`, `--agent-halo`, `--bulle-retrait` | `Conversation.tsx` |
| Ta propre bulle, a droite | `bulle-moi` | `--bulle-rayon`, `--bulle-largeur` | idem |
| « X confie le travail a Y » | `trace-delegation` | — | idem |
| « X voulait appeler Y, la limite est atteinte » | `trace-refus` | — | idem, composant `TraceRefus` |
| « X demande une autorisation », ses boutons et son compte a rebours | `carte-autorisation` | — | idem, composant `Autorisation`. Le compte a rebours n'est pas decoratif : Hermes referme la demande a l'echeance et repart **sans reponse**. Passe ce delai la carte reste, ses boutons partent, et elle dit pourquoi — voir `DELAI_AUTORISATION` dans `server/acp.js` |
| La carte de plan : qui, quoi, comment, resultat attendu, et ses trois boutons | `carte-plan` | — | `CartePlan.tsx`. Les boutons n'existent QUE parce qu'un plan existe — c'est la regle de kuchu du 4 aout, et elle n'a pas d'exception. La carte ne disparait dans aucun de ses etats : validee elle montre son scenario, refusee elle le dit (F8) |
| « Ca demande un vrai plan. Je bascule en Atelier ? » | `bascule-proposee` | — | idem — c'est ce que la carte devient en mode Discussion, ou valider reveillerait l'equipe. Le plan est deja calcule : basculer ne rappelle aucun modele |
| « Je regarde si ca merite un plan — 12 s / 90 s » | `attente-plan` | — | idem, composant `AttentePlan`. Le plafond est visible parce qu'aucune moyenne ne predit la duree : dix mesures du 6 aout vont de 8,5 s a 54,2 s. Voir `PLAFOND_PLAN` dans `server/plan.js` |
| « Tu appelles 12 agents » avant d'envoyer | `avertissement-convocation` | — | idem, seuil en dur : `mentionnes > 10` |
| La colonne qui defile | `fil-conversation` | — | largeur : `max-w-3xl` |
| La ligne au-dessus du fil : « En direct », Conversations, le retour | `ligne-contexte` | — | `LigneContexte.tsx` — absente au salut, et c'est voulu. Le retour **se nomme** : « Revenir a l'accueil » sur l'accueil, « Nouvelle » dans Orchestration, qui n'a pas de salut *(F4, C7)* |
| Le volet des conversations passees, a droite | `volet-historique` | — | `VoletHistorique.tsx` — convoque, donc il se ferme : `X` ou Echap. Il a demenage d'Orchestration le 6 aout : on relit la ou l'on ecrit. Son bouton vit dans `ligne-contexte`, et au salut dans `raccourcis-accueil` |
| Une conversation dans ce volet | `ligne-historique` | `--densite` | idem, tri : `ONGLETS` |
| La barre du bas | `barre-saisie` | — | idem |
| « Louise et Gabriel travaillent - 12 s » | `agents-au-travail` | `--agent-point-compact` | idem, composant `AuTravail` |
| Le trait de fin : « 5 agents ont repondu - 24,1 s » | `fin-du-tour` | — | idem, composant `FinDuTour` |
| La rangee de pastilles d'agents | `rangee-agents` | `--agent-point-compact` | repliee par defaut, voir `deplie` |
| Une pastille d'agent | `pastille-agent` | `--agent-point-compact` | idem |
| Qui recevra le message, **a droite du champ** | `destinataires` | — | idem — apres le message dans le sens de lecture, jamais devant |
| Discussion / Atelier, **au-dessus du champ** | `interrupteur-mode` | — | `InterrupteurMode.tsx` — la phrase de garantie n'est pas un libelle : elle change selon ce que le Hub a **constate**, voir plus bas |

### L'orchestration

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Le menu de gauche (Conversation, Agents, Scenarios) | `nav-orchestration` | — | l'ordre vient de `VOLETS`. **L'Historique n'y est plus** : il a rejoint l'accueil le 6 aout |
| Le formulaire « Un agent de plus » | `nouvel-agent` | — | `NouvelAgent.tsx` |
| Composer une equipe : cocher des agents, la nommer | `editeur-equipe` | — | `EditeurEquipe.tsx` — ouvrir une vignette d'equipe l'ouvre ici |
| Une fiche dans la liste des agents | `fiche-agent` | `--agent-lisere`, `--agent-point`, `--densite` | `OrchestrationView.tsx` |
| Les outils MCP, sous les agents | `outils-equipe` | — | `OutilsEquipe.tsx` |
| La ligne d'un outil, avec « qui l'a » | `ligne-outil` | `--densite` | idem — l'ambre signale un outil incomplet |
| Le cerveau de l'equipe, sous les outils | `cerveau-equipe` | — | `CerveauEquipe.tsx` — **meme grammaire que les outils** : toute l'equipe herite, on declare les exceptions. La liste des modeles vient des sessions ACP ouvertes, jamais d'une copie tenue ici — vide tant que personne n'est eveille, et il le dit |
| La ligne d'un choix de cerveau | `ligne-cerveau` | — | idem — le vide est une **valeur** (« comme toute l'equipe »), sinon une exception ne se retirerait jamais |
| Le formulaire « Brancher un outil » | `nouvel-outil` | — | idem |
| Une vignette de scenario | `vignette-scenario` | `--agent-lisere-vignette` | idem |
| Une vignette d'equipe | `vignette-equipe` | `--agent-lisere-vignette` | idem |
| Le champ « Decris ce que tu veux » | `boite-demande` | — | idem |
| Les autorisations en attente, en haut du scenario | `accords-orchestration` | — | idem |
| La fenetre de simulation | `fenetre-simulation` | — | `FenetreSimulation.tsx` |
| Le decompte pendant qu-Hermes decoupe | `decompte-decoupage` | — | idem, `PLAFOND_DECOUPAGE_S` |
| Le banc d'essai, en bas de la simulation | `banc-essai` | — | `BancEssai.tsx` |
| Une ligne du banc : un essai et sa mesure | `ligne-banc` | `--densite` | idem, c'est un `.rang` |

### L'accueil

L'accueil **est** la conversation : « Bonjour <prenom> », le champ dessous, et
au premier message tout s'efface pour laisser le fil seul. Ce n'est pas un
deuxieme chat - c'est celui d'Orchestration, meme composant et meme fil, ouvert
par les props `accueil` / `accueilDessous` de `Conversation.tsx`.

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Le salut « Bonjour X » et le champ au milieu | `accueil-conversation` | — | `Conversation.tsx`, condition `centre` — le contenu vient de `HomeView.tsx` |
| Projets, Coffre et Conversations, en petit sous le champ | `raccourcis-accueil` | — | `HomeView.tsx`. « Conversations » est le meme bouton que celui de `ligne-contexte` — c'est le moment qui change de place, pas le geste, et il s'absente quand il n'y a rien a retrouver |
| « Automatisations en cours », sous les raccourcis | `automatisations` | — | `Automatisations.tsx` |
| Le bandeau ambre « elles ne partiront pas » | — | — | idem : il ne parait QUE si des taches actives existent sans passerelle |
| Une ligne d'automatisation, suspendue ou non | — | — | idem, attribut `data-suspendue` |
| Le formulaire « Programmer une demande » | `nouvelle-automatisation` | — | `NouvelleAutomatisation.tsx` |

La section entiere s'efface quand il n'y a rien a dire - ni tache programmee,
ni alerte. Un accueil ne porte pas de rubrique vide.

**L'interrupteur de mode n'est pas un reglage d'apparence, et aucune molette ne
le concerne.** Sa phrase de garantie change selon un fichier qui n'appartient
pas a ce depot : le `config.yaml` d'Hermes, ou le Hub va constater qu'un greffon
`pre_tool_call` est declare **et** pose sur le disque. Piece absente, Discussion
promet une moitie de moins et un bandeau dit laquelle. Retoucher ces phrases
sans lire `server/mode-conversation.js` fait ecrire une promesse que le produit
ne tient pas - c'est la seule zone de l'index dont le libelle est **une
affirmation verifiable**, pas une etiquette.

Le champ ne se recopie pas pour changer de place : `barre-saisie` reste ou elle
est ecrite, et ce sont les deux espaces qui l'encadrent qui la poussent au
milieu. La bascule se fait a l'ENVOI, pas au retour du serveur - sinon le salut
vacillerait pendant l'aller-retour au lieu de s'effacer net.

**Ce que l'accueil ne porte PLUS, et ou c'est parti.** Deux grandes cartes y
vivaient - terminal Hermes et Clean Agent - et chacune est partie pour sa propre
raison :

| Ce qui est parti | Ou c'est maintenant | Pourquoi |
|---|---|---|
| Terminal Hermes | barre de menu, au-dessus de la Corbeille (`menu-lateral`) | Ce n'est pas une destination, c'est un GESTE - et un geste qu'on veut depuis n'importe quel ecran. Sur l'accueil il devenait inatteignable des qu'on avait commence a parler, c'est-a-dire au moment ou une ligne de commande sert. |
| Clean Agent | `Configuration > Developpement` | C'est un banc d'essai - eprouver Hermes hors contexte, reproduire un bug. Une carte a egalite avec la conversation lui donnait un rang qu'il n'a pas dans l'usage courant. |

Le bouton du terminal est **volontairement plus discret** que les entrees de
navigation au-dessus : pas de liseré de selection, pas d'etat actif, texte plus
petit. Il n'y a pas d'ecran ou l'on « est ». Meme traitement que le bouton
Rechercher, qui n'est pas une navigation non plus.

**Rien ne traverse plus l'effacement, et c'est un progres.** Une automatisation
tombee le traversait par une bande posee au-dessus du fil : elle doit se voir en
ouvrant le Hub, pas se chercher. C'est desormais le role de `ligne-alerte`, qui
le fait sur les trois ecrans au lieu de celui-ci seul - voir « Les gestes
partages ». Le reste revient en repartant d'une conversation neuve
(« Nouvelle »).

### Le premier lancement, et la memoire

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| La fenetre volante du tout premier lancement | `premiere-fois` | — | `PremiereFois.tsx`, tableau `ECARTS` |
| Le bandeau rouge « Hermes ne sait pas qui tu es » | `bandeau-profil` | — | idem — **sans croix**, il ne part qu'en choisissant un profil |
| Le bandeau rouge « La session … a expire » | `bandeau-session` | — | `BandeauSession.tsx` — **meme emplacement que `bandeau-profil`, et il passe devant** : un profil non choisi fait repondre Hermes a cote, une session expiree fait qu'il ne repond pas. Son bouton ouvre un terminal sur `hermes model`, la commande qu'Hermes recommande lui-meme |
| L'encart et la bulle, dans Configuration > Memoire | `profils-memoire` | — | `ProfilsMemoire.tsx`, tableau `LECON` |
| Une ligne de la bulle : un profil et son poids | `ligne-profil` | `--densite` | idem |
| Les sept questions, quand `USER.md` est choisi | `questions-user` | — | `QuestionsUser.tsx`, tableau `CHAMPS` |
| « 14 agents sur 15 ont une autre version », sous le fichier | `memoire-equipe` | — | `MemoireEquipe.tsx` — l'ambre signale un ecart, jamais une panne |
| L'onglet Sauvegarde de la Configuration | `sauvegardes` | — | `Sauvegardes.tsx` |
| L'onglet Developpement, qui mene a Clean Agent | `developpement` | — | `ConfigView.tsx`, liste `SECTIONS` |
| Une sauvegarde dans la liste | `ligne-sauvegarde` | `--densite` | idem — l'ambre signale une archive **incomplete** |

Deux drapeaux, et leur separation EST le dispositif : la case « ne plus
afficher » eteint `fenetreVue`, donc la fenetre. Seul un profil choisi pose
`profilValide`, donc eteint le bandeau. Une case qui eteindrait les deux
annulerait l'objectif - ceux qui la cochent sont ceux qu'on veut atteindre.

Le profil **par defaut** ne figure pas dans la bulle : il EST le fichier
installe, et le bouton « Version d'origine » le rend deja. L'y mettre en double
obligerait le Hub a connaitre un texte que l'installateur possede.

### Le Studio

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| L'ecran entier, sans barre laterale | `studio` | — | `StudioView.tsx` |
| Le plan, a gauche du graphe | `panneau-plan` | — | `PanneauPlan.tsx` — **permanent, donc il se REPLIE** (`BoutonRepli`, etat retenu). Survoler une ligne allume son noeud, cliquer une ligne y amene : c'est C3, et c'est ce qui fait un instrument de deux affichages. Il porte deux blocs en bas, `trou-competence` et `bilan-rendu`, qui ne paraissent jamais ensemble — l'un avant le lancement, l'autre apres |
| « Personne n'est designe pour 2 etapes », en bas du plan | `trou-competence` | — | `TrouCompetence.tsx` — C4/F17, **avant le lancement seulement**. Il porte son propre remede : la fiche de creation d'agent, avec le libelle « Creer un specialiste ». La demande en tete de pole ne compte pas — elle revient a Hermes par nature |
| « Annonce / rendu », tout en bas du plan | `bilan-rendu` | — | `BilanRendu.tsx` — C8, **apres le lancement seulement**. Le meme bloc dit « Resultat attendu » avant, et confronte apres. Un fichier rendu sous un autre nom part dans « en plus » : on ne rapproche jamais deux noms au plus ressemblant |
| Une case du canevas | `noeud-studio` | `--agent-lisere-noeud`, `--agent-point` | `NoeudStudio.tsx` |
| Le noeud allume parce que sa ligne est survolee | — | — | classe `.noeud-vif` dans `index.css` : elle souleve et cerne, elle ne change ni la couleur ni l'etat |
| Les reglages d'un noeud, a droite | `panneau-noeud` | `--agent-point` | `PanneauNoeud.tsx` — **convoque, donc il se FERME.** Le couple avec `panneau-plan` est le meilleur exemple de la regle |
| La fiche « une tache de plus » | `brouillon-tache` | — | `StudioView.tsx` |
| « 5 fichiers produits », a droite du canevas | `livrable-scenario` | — | `LivrableScenario.tsx` — absent tant que le scenario n'a jamais tourne |
| Les traits entre les cases | — | — | pas de molette : la couleur vient de l'agent amont |

### L'organigramme

| Ce que tu vois | Zone a grep | Molettes | Sinon |
|---|---|---|---|
| Le graphe entier | `organigramme` | `REGLAGES` (en JS, voir plus bas) | `Organigramme.tsx` |
| Une case | `noeud-organigramme` | `--agent-lisere-noeud`, `--agent-point` | idem |
| Une equipe qui deborde du bloc | — | baisser `REGLAGES.L` | la mise a l'echelle est automatique |

### Les gestes partages

Ajoutes au chantier 2. **Ils ne sont a personne et ils sont partout** : c'est
tout leur interet, et c'est aussi ce qui les rend dangereux a retoucher - une
valeur tournee ici se voit sur les trois ecrans a la fois.

| Ce que tu vois | Zone a grep | Sinon |
|---|---|---|
| La ligne d'alerte, sous le bandeau de serveur | `ligne-alerte` | `LigneAlerte.tsx` — absente quand il n'y a rien a dire, et c'est voulu |
| Le volet qui glisse a droite au clic sur la ligne | `volet-alertes` | `VoletAlertes.tsx` — convoque, donc il se ferme : `X` ou Echap |
| Le bouton qui replie un panneau permanent | `bouton-repli` | `BoutonRepli.tsx` — jamais un `X` : une chose permanente se replie |
| Un champ « chercher dans ce contenu » | `champ-recherche` | `ChampRecherche.tsx` — a ne pas confondre avec **Ctrl K**, qui cherche dans l'application |
| Le bouton « poser une alerte d'essai » | `alerte-essai` | `AlerteEssai.tsx` — Configuration > Developpement, uniquement |

La grammaire complete de ces gestes - qui se replie, qui se ferme, qui
s'agrandit, et ou chacun doit apparaitre - est dans `GRAMMAIRE-PANNEAUX.md`,
racine du depot. **Ce tableau dit ou c'est ; ce document-la dit pourquoi.**

### Le reste de l'application

| Ce que tu vois | Zone a grep |
|---|---|
| Le menu bleu nuit de gauche | `menu-lateral` |
| Le bandeau de titre d'un ecran | `entete-page` |
| Une carte de projet | `carte-projet` |
| Les notifications volantes | `notifications` |
| Le rouage dans un bouton qui travaille, et son compteur | `attente-bouton` |
| Une fenetre modale | `fenetre-modale` |
| Le formulaire de creation d'un projet | `formulaire-nouveau-projet` |
| La palette de commandes | `palette-commandes` |
| Les ecrans complets | `ecran-accueil`, `ecran-projets`, `ecran-detail-projet`, `ecran-configuration`, `ecran-coffre`, `ecran-corbeille`, `ecran-clean` |

Ces derniers portent **le nom seul, pas de molettes** : ce sont les ecrans
livres aux clients. On peut les trouver en une seconde, mais on ne les
retouche pas pour la symetrie - voir section 9.

### Ou vit chaque zone

Ce tableau n'est pas ecrit a la main : `npm run design` le regenere depuis le
code. **Il ne peut donc pas mentir**, contrairement aux libelles ci-dessus, qui
sont de la prose - et que la meme commande verifie sans les reecrire.

<!-- ZONES:DEBUT -->
| Zone | Fichier |
|---|---|
| `accords-orchestration` | `src/pages/OrchestrationView.tsx` |
| `accueil-conversation` | `src/components/Conversation.tsx` |
| `agents-au-travail` | `src/components/Conversation.tsx` |
| `alerte-essai` | `src/components/AlerteEssai.tsx` |
| `attente-bouton` | `src/components/Attente.tsx` |
| `attente-plan` | `src/components/AttentePlan.tsx` |
| `automatisations` | `src/components/Automatisations.tsx` |
| `avertissement-convocation` | `src/components/Conversation.tsx` |
| `banc-essai` | `src/components/BancEssai.tsx` |
| `bandeau-profil` | `src/components/PremiereFois.tsx` |
| `bandeau-session` | `src/components/BandeauSession.tsx` |
| `barre-saisie` | `src/components/Conversation.tsx` |
| `bascule-proposee` | `src/components/CartePlan.tsx` |
| `bilan-rendu` | `src/components/BilanRendu.tsx` |
| `boite-demande` | `src/pages/OrchestrationView.tsx` |
| `bouton-repli` | `src/components/BoutonRepli.tsx` |
| `brouillon-tache` | `src/pages/StudioView.tsx` |
| `bulle-agent` | `src/components/Conversation.tsx` |
| `bulle-moi` | `src/components/Conversation.tsx` |
| `carte-autorisation` | `src/components/Conversation.tsx` |
| `carte-plan` | `src/components/CartePlan.tsx` |
| `carte-projet` | `src/components/ProjectCard.tsx` |
| `cerveau-equipe` | `src/components/CerveauEquipe.tsx` |
| `champ-recherche` | `src/components/ChampRecherche.tsx` |
| `decompte-decoupage` | `src/components/DecompteDecoupage.tsx` |
| `destinataires` | `src/components/Conversation.tsx` |
| `developpement` | `src/pages/ConfigView.tsx` |
| `ecran-accueil` | `src/pages/HomeView.tsx` |
| `ecran-clean` | `src/pages/CleanView.tsx` |
| `ecran-coffre` | `src/pages/VaultView.tsx` |
| `ecran-configuration` | `src/pages/ConfigView.tsx` |
| `ecran-corbeille` | `src/pages/TrashView.tsx` |
| `ecran-detail-projet` | `src/pages/ProjectDetail.tsx` |
| `ecran-projets` | `src/pages/ProjectsView.tsx` |
| `editeur-equipe` | `src/components/EditeurEquipe.tsx` |
| `entete-page` | `src/components/PageHeader.tsx` |
| `fenetre-modale` | `src/components/Modal.tsx` |
| `fenetre-simulation` | `src/components/FenetreSimulation.tsx` |
| `fiche-agent` | `src/pages/OrchestrationView.tsx` |
| `fil-conversation` | `src/components/Conversation.tsx` |
| `fin-du-tour` | `src/components/Conversation.tsx` |
| `formulaire-nouveau-projet` | `src/components/NewProjectModal.tsx` |
| `interrupteur-mode` | `src/components/InterrupteurMode.tsx` |
| `ligne-alerte` | `src/components/LigneAlerte.tsx` |
| `ligne-banc` | `src/components/BancEssai.tsx` |
| `ligne-cerveau` | `src/components/CerveauEquipe.tsx` |
| `ligne-contexte` | `src/components/LigneContexte.tsx` |
| `ligne-historique` | `src/components/VoletHistorique.tsx` |
| `ligne-outil` | `src/components/OutilsEquipe.tsx` |
| `ligne-profil` | `src/components/ProfilsMemoire.tsx` |
| `ligne-sauvegarde` | `src/components/Sauvegardes.tsx` |
| `livrable-scenario` | `src/components/LivrableScenario.tsx` |
| `memoire-equipe` | `src/components/MemoireEquipe.tsx` |
| `menu-lateral` | `src/components/Sidebar.tsx` |
| `nav-orchestration` | `src/pages/OrchestrationView.tsx` |
| `noeud-organigramme` | `src/components/Organigramme.tsx` |
| `noeud-studio` | `src/components/NoeudStudio.tsx` |
| `notifications` | `src/components/Toasts.tsx` |
| `nouvel-agent` | `src/components/NouvelAgent.tsx` |
| `nouvel-outil` | `src/components/OutilsEquipe.tsx` |
| `nouvelle-automatisation` | `src/components/NouvelleAutomatisation.tsx` |
| `organigramme` | `src/components/Organigramme.tsx` |
| `outils-equipe` | `src/components/OutilsEquipe.tsx` |
| `palette-commandes` | `src/components/CommandPalette.tsx` |
| `panneau-noeud` | `src/components/PanneauNoeud.tsx` |
| `panneau-plan` | `src/components/PanneauPlan.tsx` |
| `pastille-agent` | `src/components/Conversation.tsx` |
| `premiere-fois` | `src/components/PremiereFois.tsx` |
| `profils-memoire` | `src/components/ProfilsMemoire.tsx` |
| `questions-user` | `src/components/QuestionsUser.tsx` |
| `raccourcis-accueil` | `src/pages/HomeView.tsx` |
| `rangee-agents` | `src/components/Conversation.tsx` |
| `sauvegardes` | `src/components/Sauvegardes.tsx` |
| `studio` | `src/pages/StudioView.tsx` |
| `trace-delegation` | `src/components/Conversation.tsx` |
| `trace-refus` | `src/components/Conversation.tsx` |
| `trou-competence` | `src/components/TrouCompetence.tsx` |
| `vignette-equipe` | `src/pages/OrchestrationView.tsx` |
| `vignette-scenario` | `src/pages/OrchestrationView.tsx` |
| `volet-alertes` | `src/components/VoletAlertes.tsx` |
| `volet-historique` | `src/components/VoletHistorique.tsx` |
<!-- ZONES:FIN -->

---

## 2. La console de reglages

En tete de `src/index.css`, un bloc encadre. **Tourner une valeur la change
l'application entiere, sans ouvrir un composant.**

Ce tableau vient de `index.css` lui-meme - valeurs et commentaires compris.
`npm run design` le reecrit : il ne peut pas se desynchroniser du reglage reel.

<!-- MOLETTES:DEBUT -->
| Molette | Aujourd'hui | Ce qu'elle fait |
|---|---|---|
| `--agent-lisere` | `55%` | une fiche ou une ligne d'agent |
| `--agent-lisere-noeud` | `60%` | une case d'organigramme : petite, donc plus franche |
| `--agent-lisere-vignette` | `45%` | une vignette d'equipe ou de pole |
| `--agent-point` | `10px` | bulle du fil, case d'organigramme, ligne d'agent |
| `--agent-point-compact` | `8px` | rangee de pastilles sous le fil |
| `--agent-halo` | `20%` | — |
| `--agent-halo-taille` | `3px` | — |
| `--texte-echelle` | `1` | 0.9 = serre, 1.15 = confortable |
| `--texte-nom` | `calc(13px * var(--texte-echelle))` | le nom d'un agent, partout |
| `--texte-metier` | `calc(10.5px * var(--texte-echelle))` | sa ligne de metier, sous le nom |
| `--texte-corps` | `calc(13px * var(--texte-echelle))` | ce qu'un agent dit, une description |
| `--texte-detail` | `calc(10.5px * var(--texte-echelle))` | role, modele, mentions discretes |
| `--bulle-rayon` | `16px` | 4 = anguleux, 24 = tres rond |
| `--bulle-largeur` | `85%` | part de la colonne qu'une bulle peut occuper |
| `--bulle-retrait` | `18px` | decalage du corps sous le point, pour l'aligner |
| `--densite` | `1` | — |
<!-- MOLETTES:FIN -->

Quatre classes consomment ces molettes, et remplacent les inlines qu'on
recopiait de composant en composant :

```
.point-agent            le point d'identite (+ .point-agent-compact)
.lisere-agent           le contour colore (+ -noeud, + -vignette)
.rang / .rang-y         une ligne de liste : le seul endroit qui suit --densite
```

Elles attendent `--agent` posee sur un ancetre, ce que fait le composant :

```tsx
<div style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

**Ou s'arrete `--densite`.** Elle agit sur les lignes de liste, et rien
d'autre. Rendre les boutons et les cartes elastiques aussi ferait bouger
l'ecran entier d'un cran a chaque reglage - c'est une console, pas un zoom.

**La console de geometrie.** Cinq nombres echappent au CSS : `REGLAGES` en tete
d'`Organigramme.tsx` (largeur et hauteur d'une case, les trois ecarts). Ils
servent a calculer des coordonnees SVG, et une chaine `"184px"` ne s'additionne
pas. C'est la seule exception, et elle est signalee ici pour qu'on ne la
cherche pas dans la feuille de style.

---

## 3. Les trois fichiers

| Fichier | Ce qu'il commande |
|---|---|
| `tailwind.config.ts` | les palettes maison (`navy`, `gold`), la police, les animations |
| `src/index.css` | la console, les classes de composants, les trois themes, les jetons |
| les `.tsx` | la structure, et quelques couleurs de surface (voir section 9) |

---

## 4. Les trois themes

Le Hub pose une classe a la racine du document : rien en clair, `.dark` en
sombre, `.antique` pour le lin. Les composants ne sont **jamais** au courant du
theme : ils utilisent des classes et des variables, qui changent de valeur sous
la racine.

Consequence pratique : **un nouveau theme ne demande de toucher aucun
composant.** On ajoute un bloc de plus dans `index.css`.

---

## 5. Changer les boutons

C'est le levier le plus demande, et c'est un seul endroit :
`src/index.css`, bloc `@layer components`.

```css
.btn          /* la forme commune : rayon, espacement, taille de texte */
.btn-primary  /* l'action principale */
.btn-gold     /* l'action « Hermes » */
.btn-ghost    /* l'action secondaire */
.btn-danger   /* l'action destructrice */
```

Tous les boutons de l'application passent par la. Rendre le primaire plus
colore, c'est modifier `.btn-primary` - la centaine de boutons de l'app suit.

Meme principe pour `.card` (toutes les boites), `.input` (tous les champs) et
`.muted` (tous les textes d'explication).

---

## 6. Le vocabulaire des etats

Une pastille porte **un sens**, jamais une couleur :

```tsx
<span className="puce sens-succes">termine</span>
<span className="puce puce-pleine sens-succes">en cours</span>
<span className="puce sens-alerte">sans cle</span>
```

et non `bg-emerald-100 text-emerald-700`, qui ne dit pas pourquoi c'est vert et
qu'il faudrait retrouver partout le jour ou ca change.

**Les cinq sens**, definis pour les trois themes dans `index.css` :

| Variable | Sert a |
|---|---|
| `--succes` | c'est fait, ca marche |
| `--alerte` | attention, il manque quelque chose |
| `--danger` | c'est casse, ou c'est destructeur |
| `--info` | selection, mise en avant neutre |
| `--neutre` | en attente, sans etat particulier |

**Les classes qui les consomment :**

| Classe | Effet |
|---|---|
| `.puce` | pastille teintee (fond a 16 %, texte colore) |
| `.puce-pleine` | modificateur : aplat plein, texte en contraste |
| `.bandeau` | message encadre (bordure a 45 %, fond a 7 %) |
| `.teinte-sens` | colore un texte ou une icone selon le sens ambiant |
| `.sens-succes` … | pose le sens ; se combine avec les quatre au-dessus |

Une regle de composition : **l'aplat est reserve a ce qui se passe
maintenant.** « En cours » est plein, « termine » est teinte. Si tout est plein,
plus rien ne ressort.

Pour changer la couleur de « termine » dans toute l'application, une ligne :

```css
:root { --succes: #0d9488; }   /* et le pendant dans .dark et .antique */
```

---

## 7. Les couleurs d'agent

Chaque agent porte un **jeton**. Le serveur l'attribue (`server/equipe.js`),
l'interface le traduit en variable :

```tsx
<div style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

A partir de la, **la bordure, le point d'identite, son halo, l'anneau
d'activite, l'ombre portee et le degrade des liaisons en decoulent tous.**
Recolorer un agent, c'est changer son jeton, une fois.

### Les memes couleurs dans les trois themes

C'est **l'exception assumee** a la regle du theme, et elle a une raison : un
fond suit l'ambiance, une identite non. Si Elena vire au brun terreux en passant
a l'antique, on ne la reconnait plus et le code couleur ne code plus rien.

Les seize jetons sont donc definis **une seule fois, dans `:root`**. `.dark` et
`.antique` n'en redefinissent qu'un : `--jeton-ardoise`, qui sert de gris - et
un gris doit se detacher de son fond.

`--sur-jeton` est ce qui se pose sur un aplat de couleur : blanc en clair,
lin en antique, bleu nuit en sombre.

### Fond transparent, couleur dans le lisere

Une fiche d'agent ne prend **jamais** d'aplat teinte en fond. Quinze cartes
lavees de quinze couleurs font une mosaique qu'on ne lit plus. L'identite passe
par deux choses seulement :

| Element | Reglage |
|---|---|
| le lisere | `color-mix(in srgb, var(--agent) 45-60%, transparent)` |
| le point | `background: var(--agent)` + halo `box-shadow` a 20 % |

Le pourcentage du lisere monte avec l'importance de la surface : 60 % sur un
noeud d'organigramme, 55 % sur une ligne d'agent, 45 % sur une vignette
d'equipe. Le fond, lui, reste celui de `.card`.

Pas d'initiales dans une pastille : trois lettres dans un carre colore font un
logo, et quinze logos font du bruit. Un point suffit a dire qui parle.

### Quinze teintes, sans doublon

`PALETTE` compte quinze teintes espacees d'environ 28 degres sur la roue, plus
l'ardoise reservee a Hermes et au bac a sable. `distribuerCouleurs()` part de la
couleur preferee de chaque agent - un hachage de son identifiant, donc stable
d'un demarrage a l'autre - et prend **la suivante libre** si elle est deja
prise.

Deux pieges qui ont chacun coute une correction :

1. Les couleurs de `CONNUS` sont **reservees avant** le premier tirage, sinon le
   distributeur redonne joyeusement le ciel du Trieur a quelqu'un d'autre.
2. Le parcours suit **l'ordre alphabetique** des identifiants, pas l'ordre de
   lecture du disque : sans ca l'organigramme change de couleurs au redemarrage.

---

## 8. Ajouter un agent, un sens, un theme

**Un jeton d'agent** : **une** ligne dans le bloc `:root` de `index.css` - pas
trois, les jetons ne se declinent pas par theme - puis le nom du jeton dans
`PALETTE` de `server/equipe.js`.

**Un sens** : trois lignes dans `index.css`, plus une classe `.sens-<nom>`.

**Un theme** : un bloc `.<nom>` reprenant les variables, et les surcharges de
surface sur le modele de `.antique`. Aucun composant a modifier.

---

## 9. Ce qui n'est pas centralise, et pourquoi

Environ 300 classes de couleur restent ecrites dans les `.tsx` :
`bg-slate-100`, `border-navy-800`, `text-slate-400`…

Ce sont des **surfaces de structure**, pas du vocabulaire : le fond d'un
survol, la teinte d'une separation. Elles sont deja rattrapees par le theme
antique, qui les surcharge en bloc plutot que de retoucher chaque composant.

Les ramener a des variables serait un refactor de tous les fichiers pour un
gain nul - un produit livre ne se refactorise pas pour la symetrie. Les
couleurs de **sens**, elles, valent le deplacement, parce que ce sont les
seules qu'on change vraiment : c'est pour ca qu'elles seules ont ete extraites.

**Etat de la migration** (verifie le 1er aout 2026). Les jetons de sens
existent et sont complets pour les trois themes. Les ecrans d'Orchestration ne
portent **aucune couleur de sens en dur** : ce qui y reste ecrit en Tailwind est
du bleu de selection et de survol, c'est-a-dire de la surface.

Les ecrans plus anciens en portent encore une centaine, concentres dans
`ConfigView` (34), `Toasts` (18), `HomeView` (14) et `ProjectDetail` (12). Ils
marchent, mais ils echapperont a un changement de `--alerte` ou de `--danger`.

La regle : **on les convertit au fil de l'eau**, quand on touche un ecran pour
une autre raison. Une passe dediee sur des ecrans livres et stables ferait
courir un risque de regression sans rien apporter tant que les couleurs ne
changent pas.

---

## 10. Les regles a tenir

1. **Un composant n'ecrit jamais une couleur de sens en dur.** `puce
   sens-alerte`, jamais `bg-amber-100`.
2. **Les couleurs de sens se declinent pour les trois themes**, y compris
   l'antique : un reglage calibre pour le sombre est invisible sur le lin. Les
   **jetons d'agent font l'inverse** et restent identiques partout (section 7).
3. **L'aplat se merite.** Il signale ce qui se passe maintenant.
4. **La couleur d'un agent est une variable**, pas une classe : elle doit
   pouvoir irriguer une bordure, une ombre et un degrade SVG a la fois.
5. **Le fond reste neutre, la couleur va dans le lisere et le point.** Une
   identite se signale, elle ne se peint pas.
6. **Un organigramme tient dans un bloc, quel que soit le pole.** On doit voir
   l'equipe entiere sans glisser l'image : c'est ce que la vue sert a montrer.
   D'ou la mesure au `ResizeObserver`, le repli des niveaux trop larges en
   vertical et la mise a l'echelle en horizontal.
7. **Tout doit s'atteindre a la souris.** Le clavier est un raccourci, jamais un
   passage oblige : chaque filtre a son menu, chaque tri son bouton.
8. **Les animations respectent `prefers-reduced-motion`.** Le mouvement porte
   du confort, jamais de l'information seule.
