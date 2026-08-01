# Hermes Hub - a lire avant de toucher au code

Interface web locale qui pilote une equipe d'agents IA via la ligne de commande
`hermes`. Serveur Node sans dependance, interface React construite par Vite.

---

## Avant de modifier l'interface : lis `DESIGN.md`

**C'est la seule regle qui n'a pas d'exception.** `DESIGN.md` contient un index
classe par ce qu'on voit a l'ecran, et une console de reglages : la plupart des
demandes de retouche se resolvent en tournant une valeur, sans ouvrir un seul
composant.

Le protocole tient en quatre pas :

1. Trouve la ligne dans l'index de `DESIGN.md` (section 1).
2. Si une molette existe, tourne-la dans `src/index.css` - n'ouvre aucun `.tsx`.
3. Sinon, `grep` le nom de zone : `data-zone="bulle-agent"`.
4. `npm run build`, puis **regarde le rendu**, pas seulement la compilation.

Chercher a l'aveugle dans `Conversation.tsx` (900 lignes) ou
`OrchestrationView.tsx` (980 lignes) fait perdre dix minutes pour une valeur
qui tient dans la console.

### Parle de l'atelier - il ne le demandera pas

Quand kuchu dit qu'une chose est trop petite, trop serree, mal coloree :
**ne le laisse pas decrire ce qu'il peut montrer.** Un atelier existe, et il
n'y pensera pas.

La pastille en bas a droite de l'interface ouvre des curseurs branches sur les
molettes. Il les tourne lui-meme, l'ecran suit en direct, puis « Copier mes
reglages » lui donne exactement ce qui a change - a coller ici, a inscrire dans
`index.css`. Le viseur nomme la zone survolee, pour designer sans decrire.

L'atelier n'apparait que sous `HUB_ATELIER=1`, pose par `dev-v2.ps1`. Si la
pastille manque, c'est que le Hub n'a pas ete lance par ce script.

---

## Les regles du depot

- **Aucune commande git sans accord explicite.** Ni `add`, ni `commit`, ni
  `push`. Le depot versionne `dist/` : un commit automatique embarquerait une
  interface construite dans ce qui est livre aux clients.
- **`git` n'est pas dans le PATH** : `& "C:\Program Files\Git\cmd\git.exe"`.
- **La V2 vit sur la branche `v2`.** `main` reste figee sur la version livree,
  et `version.json` est l'interrupteur cote clients.
- **Ne pas lancer `maj-hub.bat` sans accord** : il remplace le Hub installe
  dans `Documents\Hermes-raf`.

## Construire

```
npm run build          # obligatoire apres toute modification de src/
```

Le serveur sert `dist/`, pas `src/`. Une modification non construite ne se voit
nulle part - et c'est la premiere cause de « j'ai change mais rien ne bouge ».

## Le serveur

`server/` n'a **aucune dependance npm** et doit le rester : `http`, `fs`,
`child_process`, `node:sqlite`. Les dependances de l'interface sont libres,
Vite les empaquette.

Le point de passage unique des evenements est `diffuser()` dans
`server/index.js` : tout ce qui part vers l'interface passe par la, y compris
l'enregistrement dans l'historique.
