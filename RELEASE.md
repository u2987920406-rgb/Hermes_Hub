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
