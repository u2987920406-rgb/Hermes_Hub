# Publier une version

Deux natures de mise a jour, et le client ne fait pas le meme geste.

| | Ce qui change | Cote client |
|---|---|---|
| **Hub seul** | `dist/`, `server/`, `launcher/` : interface, corbeille, themes, reglages | Bouton **Verifier les mises a jour** dans Configuration > A propos |
| **Complete** | structure du workspace, etapes d'installation, profil Hermes, logiciels | Retelecharger et relancer `installer.bat` |

Le Hub decide lequel proposer en lisant `version.json` a la racine du depot.
Une version marquee `hub_seul: false`, ou qui exige un `min_installer` plus
recent, n'est jamais appliquee depuis le Hub : elle toucherait des fichiers
hors de son perimetre. Le Hub affiche alors le lien de telechargement.

## Les deux lignes

```
main    ●──────●─────────────────●────────────▶  la ligne LIVREE (v1.x)
         \      \  hotfix        ▲          ▲
          \      ●──● tag v1.0.3 │          │ merge + tag v2.0.0
           \          \          │          │
            \          ╰─ reflux ┤          │
             ▼                   ▼          │
v2          ●───●───●───●────────●──────────●    la ligne EN CONSTRUCTION
```

- `main` ne recoit que du livrable, et chaque livraison porte un tag.
- La V2 s'integre sur `v2`.
- **Tout correctif fait sur `main` doit refluer dans `v2`.** C'est l'etape
  qu'on oublie, et la V2 sort alors en regressant sur un bug deja corrige.

## Les canaux

Un canal, c'est la branche ou le Hub installe va lire son manifeste :

| Canal | Manifeste lu | Pour qui |
|---|---|---|
| `stable` (defaut) | `main/version.json` | tout le monde |
| `beta` | `v2/version.json` | les postes qui ont choisi le canal de test |

Meme nom de fichier, branche differente : **publier une beta ne demande jamais
de toucher a `main`**, donc ne met jamais la ligne stable en danger. Le canal
se change dans Configuration > A propos, et vaut `stable` tant que personne
ne l'a bouge.

Un poste ne peut recevoir une beta que s'il fait deja tourner un Hub qui
connait les canaux : le v1.0.2 livre lit `main` et rien d'autre. Le premier
testeur doit donc etre bascule a la main une fois.

## Procedure

1. **Construire** l'interface, sinon le depot livre l'ancienne :

   ```
   cd Hermes-Hub
   npm run build
   ```

2. **Monter le numero de version aux trois endroits** :

   - `version.json` (racine) : `version`, `tag`, `notes`, `telechargement`
   - `Hermes-Hub/server/index.js` : la constante `VERSION`
   - `Hermes-Hub/package.json` : `"version"`

   Le client ne recoit que `dist/` et `server/`, d'ou la constante dans le
   serveur plutot qu'une lecture de `package.json`.

3. **Regenerer le PDF** si `GUIDE-INSTALLATION.md` a change :

   ```
   uv run --with reportlab python generate_guide_pdf.py
   ```

4. **Auditer** avant de publier : voir `AUDIT.md`, ou la skill
   `audit-livraison` depuis une session Hermes.

5. **Commit, tag, push** :

   ```
   git commit -am "v1.1.0 : ..."
   git tag -a v1.1.0 -m "..."
   git push && git push origin v1.1.0
   ```

   Le bouton du Hub telecharge l'archive du tag
   (`codeload.github.com/<depot>/zip/refs/tags/<tag>`). Sans tag pousse, il n'a
   rien a telecharger.

6. **Verifier depuis un poste client** : Configuration > A propos > Verifier
   les mises a jour.

## Publier une beta

Meme geste, sur `v2` au lieu de `main`, avec un numero de pre-version :

```
npm run build          # dans Hermes-Hub
# version.json, la constante VERSION et package.json -> 2.0.0-beta.1
git commit -am "2.0.0-beta.1 : ..."
git tag -a v2.0.0-beta.1 -m "..."
git push && git push origin v2.0.0-beta.1
```

`2.0.0-beta.1` est plus ancienne que `2.0.0` pour le Hub : un testeur passe
donc de la derniere beta a la version finale sans geste manuel.

**Le tag doit etre pousse avant le manifeste**, ou au meme moment. Un
`version.json` qui annonce une version sans tag correspondant fait voir une
mise a jour au testeur, puis echoue au telechargement.

## Le controle automatique

`.github/workflows/ci.yml` tourne sur chaque `push` vers `main` et `v2` :
types, construction, et surtout **verification que `dist/` commite correspond
aux sources**. Le depot versionne l'interface construite, si bien qu'une
modification de `src/` commitee sans `npm run build` livre l'ancienne
interface sans que rien ne le signale. C'est l'erreur la plus facile a
commettre ici, et elle est desormais bloquee avant la livraison.

## Ce que la mise a jour ne touche jamais

`Projets/`, `Vault/`, `.hub/`, la memoire et la personnalite d'Hermes. Elle ne
remplace que `dist/`, `server/` et les deux fichiers du lanceur - meme
frontiere que `maj-hub.bat`.

Avant de remplacer, l'archive est verifiee (`dist/index.html` et
`server/index.js` doivent y etre) et la version en place est copiee dans
`Hermes-Hub/.maj-precedente`. Une archive incomplete ne remplace rien.

## Si le depot passe en prive

Le bouton fonctionne aujourd'hui parce que le depot est public : ni jeton, ni
authentification. En prive, il faudra soit embarquer un jeton a portee lecture
dans le Hub - ce qui le distribue a tous les clients -, soit publier depuis un
depot de distribution separe ne contenant que les fichiers livres. La seconde
option est la plus saine.
