# Le design du Hub - ou tirer les leviers

Ce fichier repond a une seule question : **je veux changer l'apparence de
quelque chose, ou est-ce que je touche ?**

Tout tient dans trois fichiers.

| Fichier | Ce qu'il commande |
|---|---|
| `tailwind.config.ts` | les palettes maison (`navy`, `gold`), la police, les animations |
| `src/index.css` | les classes de composants, les trois themes, tous les jetons de couleur |
| les `.tsx` | la structure, et quelques couleurs de surface (voir la derniere section) |

---

## 1. Les trois themes

Le Hub pose une classe a la racine du document : rien en clair, `.dark` en
sombre, `.antique` pour le lin. Les composants ne sont **jamais** au courant du
theme : ils utilisent des classes et des variables, qui changent de valeur sous
la racine.

Consequence pratique : **un nouveau theme ne demande de toucher aucun
composant.** On ajoute un bloc de plus dans `index.css`.

---

## 2. Changer les boutons

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

## 3. Le vocabulaire des etats

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

## 4. Les couleurs d'agent

Chaque agent porte un **jeton** : `ciel`, `violet`, `emeraude`, `cyan`, `ambre`,
`rose`, `orange`, `ardoise`. Le serveur attribue le jeton (`server/equipe.js`,
tables `CONNUS` et `PALETTE`), l'interface le traduit en variable :

```tsx
<div style={{ '--agent': `var(--jeton-${agent.couleur})` }}>
```

A partir de la, **la bordure, le fond teinte, le badge d'icone, l'anneau
d'activite, l'ombre portee et le degrade des liaisons en decoulent tous.**
Recolorer un agent, c'est changer son jeton, une fois.

Les huit jetons sont declines pour les trois themes. Le critere de choix n'est
pas l'esthetique mais **le contraste sur les trois fonds** : l'ambre du theme
antique est nettement plus profond, sinon il se dissout dans le lin.

`--sur-jeton` est ce qui se pose sur un aplat de couleur : blanc en clair et en
antique, bleu nuit en sombre - parce qu'en sombre les jetons sont eclaircis pour
tenir sur le navy, et qu'un texte blanc dessus serait illisible.

---

## 5. Ajouter un agent, un sens, un theme

**Un jeton d'agent** : trois lignes dans `index.css` (une par theme), puis le
nom du jeton dans `PALETTE` de `server/equipe.js`.

**Un sens** : trois lignes dans `index.css`, plus une classe `.sens-<nom>`.

**Un theme** : un bloc `.<nom>` reprenant les variables, et les surcharges de
surface sur le modele de `.antique`. Aucun composant a modifier.

---

## 6. Ce qui n'est pas centralise, et pourquoi

Environ 280 classes de couleur restent ecrites dans les `.tsx` :
`bg-slate-100`, `border-navy-800`, `text-slate-400`…

Ce sont des **surfaces de structure**, pas du vocabulaire : le fond d'un
survol, la teinte d'une separation. Elles sont deja rattrapees par le theme
antique, qui les surcharge en bloc plutot que de retoucher chaque composant.

Les ramener a des variables serait un refactor de tous les fichiers pour un
gain nul - un produit livre ne se refactorise pas pour la symetrie. Les
couleurs de **sens**, elles, valent le deplacement, parce que ce sont les
seules qu'on change vraiment : c'est pour ca qu'elles seules ont ete extraites.

**Etat de la migration.** Les jetons de sens existent et sont complets pour les
trois themes. Les ecrans d'Orchestration les utilisent entierement - zero
couleur de sens en dur. Les ecrans plus anciens en portent encore **64**
(surtout de l'ambre et du rouge, dans Configuration et le detail de projet).
Ils marchent, mais ils echapperont a un changement de `--alerte` ou de
`--danger`.

La regle : **on les convertit au fil de l'eau**, quand on touche un ecran pour
une autre raison. Une passe dediee sur des ecrans livres et stables ferait
courir un risque de regression sans rien apporter tant que les couleurs ne
changent pas.

---

## 7. Les regles a tenir

1. **Un composant n'ecrit jamais une couleur de sens en dur.** `puce
   sens-alerte`, jamais `bg-amber-100`.
2. **Les nouvelles couleurs se declinent pour les trois themes**, y compris
   l'antique. Un reglage calibre pour le sombre est invisible sur le lin.
3. **L'aplat se merite.** Il signale ce qui se passe maintenant.
4. **La couleur d'un agent est une variable**, pas une classe : elle doit
   pouvoir irriguer une bordure, une ombre et un degrade SVG a la fois.
5. **Les animations respectent `prefers-reduced-motion`.** Le mouvement porte
   du confort, jamais de l'information seule.
