# Relevé technique — `hermes-webui`, pour l'étape 4

> ⏱ **Achevé** le 5 août 2026 à **19:05**
>
> Extraction de code, pas d'analyse. Le raisonnement stratégique est dans
> `CONFRONTATION-HERMES-WEBUI.md` ; ici, seulement des faits vérifiables et du
> verbatim. **Rien de ce document ne vient de leur documentation** — tout est lu
> dans le code, sauf mention explicite.
>
> Version lue : dépôt `master`, clone du 5 août 2026.

---

## 1. Le système de panneaux

### 1.1 La réponse courte, et elle est décevante

**Il n'y a pas de SDK, pas de registre, pas de manifeste, pas d'IIFE.** Un
panneau est **du HTML statique écrit à la main dans `index.html`**, plus une
branche `if` dans une fonction de 74 lignes.

Il existe bien un système de greffons à manifeste — mais c'est celui d'**Hermès**
(§1.5), pas celui du WebUI, et le WebUI ne s'en sert pas pour ses propres
panneaux.

### 1.2 Comment un panneau se déclare — les trois endroits

Un panneau existe si et seulement si on écrit ces trois choses. Aucune n'est
générée.

**(a) Le bouton dans le rail** — `static/index.html:157`, verbatim :

```html
<button class="rail-btn nav-tab has-tooltip" data-panel="kanban"
        onclick="switchPanel('kanban',{fromRailClick:true})"
        data-tooltip="Kanban" data-i18n-title="tab_kanban" aria-label="Kanban">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/>
    <path d="M16 4v16"/><path d="M3 10h18"/>
  </svg>
</button>
```

**Le SVG est inline dans le HTML, un par onglet.** Et il est écrit **deux fois** :
une fois dans `.rail` (bureau, ligne ~157) et une fois dans `.sidebar-nav`
(mobile, ligne ~176), avec des tailles différentes — `width="20"` contre
`width="18"`, `stroke-width="1.5"` contre `"2"`.

**(b) La vue** — `static/index.html:267`, le panneau Todo en entier :

```html
<!-- Todo panel -->
<div class="panel-view" id="panelTodos">
  <div class="panel-head">
    <span data-i18n="current_task_list">Current task list</span>
  </div>
  <div id="todoPanel" style="flex:1;overflow-y:auto;padding:8px 12px"></div>
</div>
```

**La convention d'identifiant est un calcul de chaîne**, pas une table :
`'panel' + nom.charAt(0).toUpperCase() + nom.slice(1)`. Donc `todos` →
`panelTodos`. Un panneau nommé `my-thing` serait introuvable.

**(c) Le chargement** — une ligne à ajouter dans `switchPanel` (§1.3).

### 1.3 `switchPanel` — le cœur, verbatim

`static/panels.js:367-441`. C'est tout le « routeur » de panneaux.

```js
async function switchPanel(name, opts = {}) {
  const nextPanel = name || 'chat';
  const prevPanel = _currentPanel;
  // ── Desktop sidebar collapse toggle (rail-click only) ──
  if (opts.fromRailClick && typeof _isSidebarCollapsed === 'function'
      && typeof _isDesktopWidth === 'function' && _isDesktopWidth()) {
    if (_isSidebarCollapsed()) {
      expandSidebar();
    } else if (prevPanel === nextPanel) {
      toggleSidebar(true);
      return false;
    }
  }
  if (!opts.bypassSettingsGuard && !_beforePanelSwitch(nextPanel)) return false;
  if (prevPanel !== 'settings' && nextPanel === 'settings') _beginSettingsPanelSession();
  // Close any long-lived Kanban SSE stream when leaving the kanban panel
  if (prevPanel === 'kanban' && nextPanel !== 'kanban') {
    if (typeof _kanbanStopPolling === 'function') _kanbanStopPolling();
  }
  _currentPanel = nextPanel;
  // Update nav tabs (rail + mobile sidebar-nav share data-panel)
  document.querySelectorAll('[data-panel]').forEach(t => t.classList.toggle('active', t.dataset.panel === nextPanel));
  if (typeof _syncSidebarAria === 'function') _syncSidebarAria();
  // Update panel views
  document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
  const panelEl = $('panel' + nextPanel.charAt(0).toUpperCase() + nextPanel.slice(1));
  if (panelEl) panelEl.classList.add('active');
  // Update main content view. Each entry in MAIN_VIEW_PANELS gets a matching
  // showing-<name> class on <main>; no class means chat (the default).
  const mainEl = document.querySelector('main.main');
  if (mainEl) {
    MAIN_VIEW_PANELS.forEach(p => {
      mainEl.classList.toggle('showing-' + p, nextPanel === p);
    });
  }
  // Lazy-load panel data
  if (nextPanel === 'tasks') await loadCrons();
  if (nextPanel === 'kanban') await loadKanban();
  if (nextPanel === 'skills') await loadSkills();
  if (nextPanel === 'memory') await loadMemory();
  if (nextPanel === 'workspaces') await loadWorkspacesPanel();
  if (nextPanel === 'profiles') await loadProfilesPanel();
  if (nextPanel === 'todos') loadTodos();
  if (nextPanel === 'insights') await loadInsights();
  if (nextPanel === 'logs') await loadLogs();
  _syncLogsAutoRefresh();
  if (typeof _syncSystemHealthMonitorVisibility === 'function') _syncSystemHealthMonitorVisibility();
  if (nextPanel === 'settings') {
    switchSettingsSection(_currentSettingsSection);
    loadSettingsPanel();
  }
  if (opts.fromRailClick && typeof _isDesktopWidth === 'function' && !_isDesktopWidth()) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.remove('mobile-session-page');
      sidebar.classList.add('mobile-panel-drawer', 'mobile-open');
    }
  }
  _resyncChatSidebarAfterPanelSwitch();
  if (nextPanel === 'chat' && typeof syncTopbar === 'function') syncTopbar();
  else syncAppTitlebar();
  return true;
}
```

**Ce qu'il faut en retenir pour nous :**

- **neuf `if` en dur**, un par panneau. Ajouter un panneau = éditer cette
  fonction. Aucune indirection ;
- deux notions distinctes : `panel-view` (contenu **dans la barre latérale**) et
  `MAIN_VIEW_PANELS` (panneaux qui prennent **la zone principale**, via une
  classe `showing-<nom>` sur `<main>`). Le kanban est du second type ;
- **le nettoyage est manuel et par cas particulier** : `_kanbanStopPolling()`
  est appelé explicitement en quittant le kanban. Il n'existe aucun cycle de vie
  `onEnter`/`onLeave` — chaque panneau qui ouvre une ressource doit ajouter sa
  propre ligne ici, et rien ne le rappelle ;
- `_beforePanelSwitch(nextPanel)` est un garde-fou global qui peut **annuler**
  la bascule (`return false`) — utilisé pour les réglages non sauvegardés.

### 1.4 Comment un panneau reçoit son état, et comment il en pousse

**Il n'y a pas de contrat.** Un panneau lit une **globale**, `S`, et écrit dans
le DOM par `innerHTML`.

`loadTodos()` en entier — `static/panels.js:3790-3817`, verbatim :

```js
function loadTodos() {
  const panel = $('todoPanel');
  if (!panel) return;

  let todos;
  if (S.todoStateMeta) {
    todos = Array.isArray(S.todos) ? S.todos : [];
  } else {
    todos = _legacyTodosFromMessages();
  }

  if (!todos.length) {
    if (typeof _todosLastRenderedHash !== 'undefined' && _todosLastRenderedHash === '__empty__') return;
    panel.innerHTML = renderTodoEmptyState();
    if (typeof _todosLastRenderedHash !== 'undefined') _todosLastRenderedHash = '__empty__';
    return;
  }

  if (typeof _todosHash === 'function' && typeof _todosLastRenderedHash !== 'undefined') {
    const hash = _todosHash(todos);
    if (hash === _todosLastRenderedHash) return;
    _todosLastRenderedHash = hash;
  }

  // Single innerHTML join is the cheapest correct way to materialize
  // ~10–50 leaf nodes.  All user-controlled content goes through esc().
  panel.innerHTML = renderTodoRows(todos, {metadata:true});
}
```

Le contrat réel, tel qu'il se lit :

| Question | Réponse |
|---|---|
| Comment reçoit-il son état ? | Il lit `S.todos` / `S.todoStateMeta`, deux champs d'un objet global |
| Comment sait-il qu'il doit se redessiner ? | **Il ne le sait pas.** Quelqu'un d'autre appelle `loadTodos()` |
| Comment évite-t-il de redessiner pour rien ? | Une empreinte à la main, `_todosLastRenderedHash`, comparée à chaque appel |
| Comment pousse-t-il un changement ? | Il ne pousse rien. Les panneaux en écriture appellent `api()` directement |
| Isolation ? | Aucune. Tout est dans la portée globale : `S`, `$`, `switchPanel`, `loadTodos` |

**Le repli hérité vaut d'être lu** — il montre le prix d'un état non modélisé
(`panels.js:3831`) :

```js
function _legacyTodosFromMessages() {
  const sourceMessages = (S.session && Array.isArray(S.session.messages) && S.session.messages.length) ? S.session.messages : S.messages;
  if (!Array.isArray(sourceMessages)) return [];
  for (let i = sourceMessages.length - 1; i >= 0; i--) {
    const m = sourceMessages[i];
    if (!m || m.role !== 'tool') continue;
    let content = m.content;
    if (typeof content !== 'string') {
      try { content = JSON.stringify(content); } catch (_) { continue; }
    }
    if (!content || content.indexOf('"todos"') < 0) continue;
    try {
      const d = JSON.parse(content);
      if (d && Array.isArray(d.todos)) return d.todos;
    } catch (_) {}
  }
  return [];
}
```

Il **remonte l'historique des messages à l'envers** pour retrouver le dernier
payload `{"todos":[...]}` d'un message de rôle `tool`. Leur propre commentaire
dit que c'est une fenêtre de migration à supprimer en « Phase 3 ».

### 1.5 Le vrai système à manifeste — celui d'Hermès, pas du WebUI

C'est probablement ce qu'on cherchait. Il vit dans le home d'Hermès, **installé
sur ce poste**, à `plugins/kanban/dashboard/`.

`manifest.json`, **en entier** :

```json
{
  "name": "kanban",
  "label": "Kanban",
  "description": "Multi-agent collaboration board — drag-drop cards across columns, read comment threads, see which profile is running what",
  "icon": "Package",
  "version": "1.0.0",
  "tab": {
    "path": "/kanban",
    "position": "after:skills"
  },
  "entry": "dist/index.js",
  "css": "dist/style.css",
  "api": "plugin_api.py"
}
```

| Champ | Ce qu'il déclare |
|---|---|
| `tab.path` | la route de l'onglet |
| `tab.position` | **l'insertion relative** — `after:skills` |
| `entry` | le bundle JS **déjà construit** (4 280 lignes) |
| `css` | la feuille de style du greffon (1 482 lignes) |
| `api` | le module Python qui sert son back-end (2 293 lignes) |

**Un greffon Hermès = front compilé + back Python + manifeste, en un dossier.**
C'est le modèle le plus proche de ce qu'on veut pour le Studio, et il est déjà
sur la machine.

⚠ **Non vérifié :** qui lit ce manifeste côté Hermès, comment `entry` est chargé
et injecté, et quel objet global il reçoit. Le côté WebUI a **son propre**
système d'extensions (`api/extensions.py`, `window.HermesExtensionSettings`)
que je n'ai pas lu non plus.

---

## 2. Arborescence et dépendances

### 2.1 Étape de build : **NON**

Réponse binaire, vérifiée dans `index.html` : **aucun bundler, aucun module ES,
aucune compilation.** Tous les scripts de l'application sont des balises
classiques avec `defer`, dans l'ordre de dépendance :

```html
<script src="static/i18n.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/icons.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/assistant_turn_anchors.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/ui.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/workspace.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/terminal.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/sessions.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/commands.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/messages.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/extension_settings.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/panels.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/onboarding.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/boot.js?v=__WEBUI_VERSION__" defer></script>
<script src="static/outline.js?v=__WEBUI_VERSION__" defer></script>
```

**Nuance importante :** `__WEBUI_VERSION__` est un **jeton substitué par le
serveur** au moment de servir la page, pas par un build. Idem
`__MAX_UPLOAD_BYTES__` et `__CSRF_TOKEN_JSON__` :

```html
<script>window.__HERMES_CONFIG__={maxUploadBytes:__MAX_UPLOAD_BYTES__,csrfToken:__CSRF_TOKEN_JSON__};</script>
<script>window.__HERMES_WEBUI_BUNDLE_VERSION__='__WEBUI_VERSION__';</script>
```

*Donc : pas de build, mais `index.html` **n'est pas servi tel quel** — il passe
par un gabarit côté serveur.*

**L'exception :** les greffons Hermès (§1.5) livrent un `dist/index.js` **déjà
compilé**. Le build existe chez eux, en amont, hors de ce dépôt.

### 2.2 Dépendances JS réellement chargées

| Source | Ce que c'est | Chargement |
|---|---|---|
| `cdn.jsdelivr.net` — `prismjs@1.29.0` (core + autoloader) | coloration syntaxique | CDN, `defer`, avec `integrity` SHA-384 |
| `cdn.jsdelivr.net` — `xterm@5.3.0` + `xterm-addon-fit@0.8.0` + `xterm-addon-web-links@0.9.0` | terminal dans le composeur | CDN, `defer`, `integrity` |
| `cdn.jsdelivr.net` — `prism-tomorrow.min.css` | thème Prism | CDN |
| `static/vendor/katex/0.16.22/katex.min.css` | formules | **local** |
| Mermaid | diagrammes | via un `<script type="module">` non lu |

**Cinq scripts tiers, tous par CDN.** Notre Hub, lui, n'a aucune dépendance
externe au chargement — Vite empaquette tout.

*Conséquence à noter :* **leur interface ne fonctionne pas hors ligne au premier
chargement**, malgré le service worker.

### 2.3 Tailles réelles — et leur documentation est périmée

Relevé sur le clone, `static/` :

| Fichier | Lignes réelles | Ce que leur `ARCHITECTURE.md` annonce |
|---|---|---|
| `i18n.js` | **26 032** | non mentionné |
| `ui.js` | **20 249** | ~7 216 |
| `panels.js` | **12 495** | ~6 480 |
| `sessions.js` | 8 983 | ~3 517 |
| `messages.js` | 8 584 | ~2 301 |
| `style.css` | 7 109 | ~3 767 |
| `boot.js` | 3 688 | ~1 607 |
| `commands.js` | 2 106 | ~1 302 |
| `index.html` | 1 900 | — |
| `workspace.js` | 1 442 | ~369 |

**Leur propre documentation sous-estime la réalité d'un facteur ~2 à 3.** Ne pas
citer leurs chiffres.

Côté serveur : `api/` = **66 fichiers, 90 082 lignes**.

### 2.4 Racine du dépôt

```
hermes-webui/
├── server.py                    point d'entrée + Handler HTTP + auth
├── bootstrap.py                 lanceur : install agent, deps, attente /health
├── mcp_server.py
├── start.sh · start.ps1 · ctl.sh
├── api/                         66 fichiers, 90 082 lignes
│   ├── routes.py                ~9 772 lignes — tous les handlers
│   ├── config.py · streaming.py · models.py · workspace.py
│   ├── route_approvals.py       639 — état des approbations
│   ├── kanban_bridge.py         1 197 — pont kanban
│   ├── extensions.py · plugins.py · plugin_providers.py
│   └── auth.py · auth_oidc.py · oauth.py · passkeys.py
├── static/                      voir 2.3
│   └── vendor/katex/
├── tests/                       ~1 150 fichiers, ~11 500 tests
├── docs/ · nix/ · scripts/
├── Dockerfile · docker-compose{,.two-container,.three-container}.yml
├── flake.nix · flake.lock
├── pyproject.toml · requirements.txt · package.json
└── ARCHITECTURE.md · ROADMAP.md · SPRINTS.md · TESTING.md · BUGS.md · THEMES.md
```

*Note : `package.json` existe mais aucun bundler n'est invoqué au service — il
sert à l'outillage de lint (`eslint.runtime-guard.config.mjs`).*

---

## 6. Grammaire visuelle

### 6.1 Les variables — le bloc `:root` en entier

`static/style.css:1-21`, **verbatim** :

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
/* ── Light mode (default) — warm gold-tinted palette from Hermes brand ── */
:root {
  --bg:#FEFCF7;--sidebar:#FAF7F0;--border:#E0D8C8;--border2:rgba(0,0,0,0.15);
  --text:#1A1610;--muted:#5C5344;--accent:#B8860B;--blue:#0288A8;--gold:#8B6508;--code-bg:#F5F0E5;
  --surface:#F3EEE3;--topbar-bg:rgba(250,247,240,.98);--main-bg:rgba(254,252,247,0.5);
  --focus-ring:rgba(184,134,11,.35);--focus-glow:rgba(184,134,11,.1);
  --input-bg:rgba(0,0,0,.03);--hover-bg:rgba(0,0,0,.05);
  --strong:#0F0D08;--em:#5C5344;--code-text:#8b4513;--code-inline-bg:rgba(0,0,0,.06);--pre-text:#1A1610;
  --accent-hover:#996F08;--accent-bg:rgba(184,134,11,0.08);--accent-bg-strong:rgba(184,134,11,0.15);--accent-text:#8B6508;
  --error:#C62828;--success:#3D8B40;--warning:#E68A00;--info:#0288A8;
  --radius-sm:4px;--radius-md:8px;--radius-card:8px;--radius-lg:12px;--radius-pill:999px;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;
  --font-size-xs:11px;--font-size-sm:12px;--font-size-md:14px;
  --message-body-font-size:14px;--message-body-line-height:1.75;--message-code-font-size:12.5px;--message-pre-code-font-size:13px;--message-table-font-size:12px;
  --file-tree-toggle-width:10px;
  --font-ui:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;
  --surface-subtle:rgba(0,0,0,.025);--surface-subtle-hover:rgba(0,0,0,.045);
  --border-subtle:rgba(0,0,0,.08);--border-muted:rgba(0,0,0,.12);
  font-family:var(--font-ui);font-size:14px;line-height:1.6;
}
```

**Points structurants :**

- **la palette est or/chaud, pas grise** — `--accent:#B8860B` (dark goldenrod)
  sur un fond `#FEFCF7`. Leur commentaire dit *« warm gold-tinted palette from
  Hermes brand »* ;
- **quatre rayons nommés** (`sm/md/card/lg`) plus `pill:999px` ;
- **échelle d'espacement à quatre crans**, 4/8/12/16 ;
- **la taille du texte des messages est une variable à part** de la taille UI —
  `--message-body-font-size` avec sa propre `line-height:1.75` ;
- **aucune police téléchargée** : pile système uniquement.

### 6.2 Thèmes et habillages — le mécanisme

Trois axes indépendants, tous portés par `documentElement` et persistés en
`localStorage` :

| Axe | Attribut / classe | Clé `localStorage` | Valeurs |
|---|---|---|---|
| Thème | `.dark` sur `<html>` | `hermes-theme` | `light`, `dark`, `system` |
| Habillage | `data-skin` | `hermes-skin` | 21 : `codex`, `terracotta`, `ares`, `mono`, `graphite`, `github`, `slate`, `poseidon`, `sisyphus`, `charizard`, `sienna`, `catppuccin`, `hepburn`, `nous`, `geist-contrast`, `neon`, `neon-soft`, `neon-paint`, `zeus`, `verdigris`, `default` |
| Taille | `data-font-size` | `hermes-font-size` | défaut 14px, `small` 12, `large` 16, `xlarge` 18 |

**Un habillage redéfinit les variables, y compris les rayons et la police.**
Exemple mesuré : le skin « mono » (`style.css:813`) impose
`--radius-sm:1px;--radius-md:2px;--radius-card:2px;--radius-lg:4px;` et
`--font-ui:"SF Mono","Roboto Mono","Courier New",monospace;`.

**Et tout est appliqué avant le premier octet de CSS**, par un script inline
bloquant dans le `<head>` — c'est ce qui évite le flash de thème :

```html
<script>(function(){try{ /* ...lecture localStorage... */
if(theme==='dark')document.documentElement.classList.add('dark');
if(skin!=='default')document.documentElement.dataset.skin=skin;
}catch(e){document.documentElement.classList.add('dark');}})()</script>
```

Le même motif est répété pour la taille de police, la couleur de la barre
système, l'état du panneau de droite et le repli de la barre latérale — **cinq
scripts inline avant tout rendu**, chacun avec son `try/catch` et son repli.

### 6.3 La structure du layout

Squelette de `index.html`, aux lignes réelles :

```
153  <div class="layout">
154    <nav class="rail" aria-label="Primary navigation">     ← barre d'icônes, toujours visible
169    <aside class="sidebar">                                ← contient TOUTES les panel-view
194      <div class="panel-view active" id="panelChat">
207      <div class="panel-view" id="panelTasks">
219      <div class="panel-view" id="panelKanban">
249      <div class="panel-view" id="panelSkills">
260      <div class="panel-view" id="panelMemory">
267      <div class="panel-view" id="panelTodos">
274      <div class="panel-view" id="panelInsights">
291      <div class="panel-view" id="panelWorkspaces">
302      <div class="panel-view" id="panelProfiles">
312      <div class="panel-view" id="panelLogs">
345      <div class="panel-view" id="panelSettings">
399    <main class="main">                                    ← zone centrale
483      <div class="composer-wrap" id="composerWrap">
484        <div class="composer-flyout">
542        <div class="composer-terminal-panel" id="composerTerminalPanel" hidden>
```

**La géométrie à retenir :**

- **trois colonnes** : `rail` (icônes) · `sidebar` (les panneaux) · `main`
  (conversation). Le panneau de droite (fichiers) est un quatrième élément géré
  par `data-workspacePanel` sur `<html>` ;
- **tous les panneaux vivent dans la barre latérale**, empilés, un seul avec
  `.active`. Ils ne sont jamais détruits ;
- **certains panneaux prennent aussi la zone principale** — `MAIN_VIEW_PANELS`
  pose `showing-<nom>` sur `<main>`. C'est le cas du kanban ;
- **le terminal est dans le composeur**, pas dans un panneau (`hidden` par
  défaut, redimensionnable) ;
- l'en-tête d'un panneau est toujours `<div class="panel-head">`, et le corps un
  conteneur libre en `flex:1;overflow-y:auto`.

### 6.4 Ce qu'il faut en tirer pour notre maquette

- **la palette or/chaud est la leur, pas la nôtre** — mais le *découpage* des
  variables (thème × habillage × taille, trois axes indépendants) est solide et
  transposable ;
- **le rail d'icônes séparé de la barre latérale** est le geste qui rend
  possible le repli : cliquer l'onglet actif replie, cliquer un autre déplie.
  C'est dans `switchPanel`, `opts.fromRailClick` ;
- **les panneaux ne sont jamais démontés**, donc leur état DOM survit — ce qui
  supprime chez eux le problème qu'on a eu le 5 août avec la carte
  d'autorisation au remontage.

---

## Ce que ce document ne couvre pas

Les sections **3 (routes + SSE + approbations)**, **4 (kanban_bridge, dispatcher,
delegate)** et **5 (config MCP / providers / onboarding)** ne sont **pas
traitées** — elles demandent de lire `routes.py` (9 772 lignes),
`streaming.py` (4 420) et `onboarding.py`, soit un travail du même ordre que
tout ce qui précède.

Ce qui est déjà relevé ailleurs et évite d'y revenir à froid :

- le contrat du kanban et le protocole de claim → `CONFRONTATION-HERMES-WEBUI.md`
  §4 (avec la vérification que notre `execution.js` le respecte) ;
- l'absence totale de délai sur leurs approbations, et le fait que leur état
  d'approbation soit importé depuis les globales privées d'Hermès
  (`tools.approval._pending`, `_lock`, `_gateway_queues`) → même document, §2.

**Non vérifié dans ce relevé :** le chargement des greffons à manifeste côté
Hermès (§1.5) — c'est la pièce la plus utile pour l'étape 4, et elle reste à
lire dans `plugins/kanban/dashboard/dist/index.js` et dans le code d'Hermès qui
monte les onglets de greffon.
