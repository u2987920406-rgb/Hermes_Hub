# Audit technique — `hermes-webui`

> ⏱ **Achevé** le 5 août 2026 à **19:05** · **révisé** le 5 août 2026 à **21:45**
>
> Audit de code d'un projet tiers. Dépôt `github.com/nesquena/hermes-webui`,
> clone `master` du 5 août 2026. Build annoncé dans leur documentation :
> `v0.51.792`.
>
> **Tout ce qui suit est lu dans le code**, sauf les rares lignes marquées
> ⚠ *non vérifié*. Là où leur documentation contredit leur code, c'est signalé —
> le cas se présente plusieurs fois.

---

## 1. Le système de panneaux

### 1.1 Il n'y a pas de SDK

Aucun registre, aucun manifeste, aucune IIFE, aucun contrat d'enregistrement.
**Un panneau est du HTML statique écrit à la main dans `index.html`, plus une
branche `if` dans une fonction de 74 lignes.**

Un système à manifeste existe dans l'écosystème, mais il appartient à **Hermès**
(§1.6), pas au WebUI, et le WebUI ne s'en sert pas pour ses propres panneaux.

### 1.2 Les trois endroits à éditer

**(a) Le bouton du rail** — `static/index.html:157` :

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

Le SVG est inline, et **écrit deux fois** : une fois dans `.rail` (bureau,
`width="20"`, `stroke-width="1.5"`) et une fois dans `.sidebar-nav` (mobile,
`width="18"`, `stroke-width="2"`). Aucune factorisation — `icons.js` existe
(93 lignes) mais ne couvre pas les onglets.

**(b) La vue** — `static/index.html:267`, le panneau Todo intégral :

```html
<!-- Todo panel -->
<div class="panel-view" id="panelTodos">
  <div class="panel-head">
    <span data-i18n="current_task_list">Current task list</span>
  </div>
  <div id="todoPanel" style="flex:1;overflow-y:auto;padding:8px 12px"></div>
</div>
```

L'identifiant de la vue est **calculé par concaténation**, pas résolu par une
table : `'panel' + nom.charAt(0).toUpperCase() + nom.slice(1)`. Donc `todos` →
`panelTodos`. Un nom contenant un tiret serait introuvable.

**(c) Une ligne dans `switchPanel`** — §1.3.

### 1.3 `switchPanel` — le routeur, intégral

`static/panels.js:367-441` :

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
  document.querySelectorAll('[data-panel]').forEach(t => t.classList.toggle('active', t.dataset.panel === nextPanel));
  if (typeof _syncSidebarAria === 'function') _syncSidebarAria();
  document.querySelectorAll('.panel-view').forEach(p => p.classList.remove('active'));
  const panelEl = $('panel' + nextPanel.charAt(0).toUpperCase() + nextPanel.slice(1));
  if (panelEl) panelEl.classList.add('active');
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

Observations :

- **neuf `if` en dur**, un par panneau ;
- deux catégories : `panel-view` (contenu dans la barre latérale) et
  `MAIN_VIEW_PANELS` (panneaux qui occupent la zone centrale via une classe
  `showing-<nom>` sur `<main>`) ;
- **aucun cycle de vie.** Pas d'`onEnter`/`onLeave`. Le nettoyage est un cas
  particulier : `_kanbanStopPolling()` est appelé nommément. Un panneau neuf qui
  ouvrirait une connexion devrait ajouter sa propre ligne, sans rappel ;
- `_beforePanelSwitch()` peut **annuler** la bascule (`return false`) — garde des
  réglages non enregistrés ;
- le clic sur le rail est surchargé : même panneau → replie la barre latérale.

### 1.4 Comment un panneau reçoit son état

Il lit une **globale**. `loadTodos()` intégral, `static/panels.js:3790-3817` :

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

| Question | Réponse observée |
|---|---|
| Source d'état | `S.todos` / `S.todoStateMeta`, champs d'un objet global |
| Notification de changement | Aucune. Un tiers appelle `loadTodos()` |
| Anti-redessin | Empreinte maintenue à la main, `_todosLastRenderedHash` |
| Poussée vers le serveur | Aucune ici. Les panneaux mutables appellent `api()` directement |
| Isolation | Aucune : `S`, `$`, `switchPanel`, `loadTodos` sont globaux |
| Échappement | Manuel, par `esc()`, garanti seulement par un commentaire |

Le repli hérité, `panels.js:3831`, montre le coût d'un état non modélisé — il
**parcourt l'historique des messages à l'envers** pour retrouver le dernier
payload `{"todos":[...]}` d'un message de rôle `tool` :

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

Leur commentaire le désigne comme une fenêtre de migration à supprimer en
« Phase 3 », et note qu'un test de régression nommé (`R-todo-survive-refresh`)
verrouille le nom de la variable `sourceMessages`.

### 1.5 Réordonnancement et masquage des onglets

Fait par un script inline dans `<head>`, sur le DOM déjà rendu, à partir de
`localStorage` (`hermes-webui-tab-order`, `hermes-webui-hidden-tabs`). Deux
onglets sont **non déplaçables et non masquables**, en dur : `chat` et
`settings` (`var fixed=new Set(['chat','settings'])`).

### 1.6 Le système à manifeste — celui d'Hermès

`plugins/kanban/dashboard/manifest.json`, intégral :

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

| Champ | Rôle |
|---|---|
| `tab.path` | route de l'onglet |
| `tab.position` | insertion **relative** — `after:skills` |
| `entry` | bundle JS **précompilé** (4 280 lignes) |
| `css` | feuille du greffon (1 482 lignes) |
| `api` | module Python back-end (2 293 lignes) |

Modèle : **un dossier = un manifeste + un front compilé + un back Python.**

### 1.7 Le chargeur de greffons d'Hermès — et c'est un vrai SDK versionné

Il ne vit ni dans le WebUI ni dans les greffons : il est dans **l'application
web propre d'Hermès**, `web/` — un projet **React + Vite + TypeScript**, distinct
du WebUI audité ici. Le chargeur tient en sept fichiers, `web/src/plugins/`,
573 lignes au total.

**Les deux globales exposées au greffon**, `web/src/plugins/sdk.d.ts:153` :

```ts
declare global {
  interface Window {
    __HERMES_PLUGIN_SDK__?: HermesPluginSDK;
    __HERMES_PLUGINS__?: PluginRegistry;
  }
}
```

**Le contrat d'enregistrement**, intégral :

```ts
export interface PluginRegistry {
  /** Register the plugin's main tab component by manifest name. */
  register(name: string, component: ComponentType<Record<string, never>>): void;
  /** Register a component into a named host slot. */
  registerSlot(slot: string, name: string, component: ComponentType): void;
}
```

**Ce que l'hôte fournit**, `web/src/plugins/registry.ts:104` — pour que le
greffon n'embarque ni React ni le design system :

```ts
export const SDK_CONTRACT_VERSION = "1.1.0";

export function exposePluginSDK() {
  window.__HERMES_PLUGINS__ = {
    register: registerPlugin,
    registerSlot,
  };

  window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: SDK_CONTRACT_VERSION,
    React,
    hooks: { useState, useEffect, useCallback, useMemo, useRef, useContext, createContext },
    api,
    fetchJSON,
    authedFetch,
    buildWsUrl,
    buildWsAuthParam,
    components: {
      Card, CardHeader, CardTitle, CardContent, Badge, Button, Checkbox,
      Input, Label, Select, SelectOption, Separator, Tabs, TabsList,
      TabsTrigger, PluginSlot,
    },
    utils: { cn, timeAgo, isoTimeAgo },
    useI18n,
  };
}
```

Le type est **écrit à la main plutôt que dérivé du runtime**, et le fichier dit
pourquoi :

> *« A hand-authored contract is the **versioned API boundary** — changing it is
> a deliberate act, visible in review, not an accidental consequence of
> refactoring an internal helper. »*

Trois helpers d'authentification sont imposés au greffon — `fetchJSON`,
`authedFetch`, `buildWsUrl` — avec une consigne explicite : *« Plugins MUST use
this […] instead of calling `fetch` with a hand-read
`window.__HERMES_SESSION_TOKEN__` »*. Ils gèrent les deux modes (jeton de
session en loopback, cookie en mode protégé) et la redirection 401.

**L'injection**, `web/src/plugins/usePlugins.ts` — quatre étapes, et **rien
n'est scanné côté front** :

```
1. GET /api/dashboard/plugins            → la liste des manifestes
2. <link rel=stylesheet>                 → /dashboard-plugins/<name>/<css>
3. <script async data-hermes-plugin>     → /dashboard-plugins/<name>/<entry>
4. attente de l'appel à register()
```

Le manifeste peut déclarer une empreinte SRI, honorée à l'injection :

```ts
// SRI integrity verification — defense against compromised plugin
// delivery. […] Without this, a man-in-the-middle or compromised plugin
// server can substitute the JS bundle silently. Opt-in: when no integrity
// is declared in the manifest, behavior is unchanged.
if (manifest.integrity && typeof manifest.integrity === "string") {
  script.integrity = manifest.integrity;
  script.crossOrigin = "anonymous";
}
```

**Deux échecs nommés**, distingués — c'est le détail qui rend le système
diagnosticable :

| Code | Cause |
|---|---|
| `LOAD_FAILED` | `script.onerror` — le bundle n'a pas chargé |
| `NO_REGISTER` | le bundle a chargé mais n'a **rien enregistré**, constaté par un `queueMicrotask` après `onload` |

Plafond de 2 s avant de quitter l'état « chargement ». En développement, l'URL
est cache-bustée (`?hermes_dv=<timestamp>`) pour que le HMR de Vite puisse
réexécuter un bundle déjà chargé.

### 1.8 Les emplacements — un greffon n'est pas obligé de prendre un onglet

`web/src/plugins/slots.ts`. Deux mécanismes coexistent : `register()` donne un
**onglet entier** (une route) ; `registerSlot()` **greffe sur une page
existante**. L'en-tête du fichier écrit l'intention du second :

> *« use these to inject widgets, cards, or toolbars into existing pages
> **without overriding the whole route** »*

**Trente emplacements** sont câblés par la coque :

| Portée | Noms |
|---|---|
| Coque | `backdrop` · `header-left` · `header-right` · `header-banner` · `sidebar` · `pre-main` · `post-main` · `footer-left` · `footer-right` · `overlay` |
| Par page | `<page>:top` et `<page>:bottom` pour `sessions`, `analytics`, `logs`, `cron`, `skills`, `plugins`, `config`, `env`, `docs`, `chat` |

Le registre, intégral :

```ts
export function registerSlot(
  plugin: string,
  slot: string,
  component: React.ComponentType,
): void {
  const existing = _slotRegistry.get(slot) ?? [];
  const filtered = existing.filter((e) => e.plugin !== plugin);
  filtered.push({ plugin, component });
  _slotRegistry.set(slot, filtered);
  _notifySlots();
}
```

Quatre propriétés qui en découlent :

- **plusieurs greffons peuvent occuper le même emplacement** — ils s'empilent
  dans l'ordre d'enregistrement ;
- **la liste est une convention, pas une barrière** : *« The registry accepts
  any string so plugin ecosystems can define their own slots; the shell only
  renders `<PluginSlot name="..." />` for the slots it knows about »* ;
- réenregistrer la même paire `(greffon, emplacement)` **remplace** au lieu
  d'empiler, *« this matches how React HMR expects plugin re-mounts to
  behave »* ;
- `PluginSlot` porte un `fallback` — *« Optional content rendered when no
  plugins have claimed the slot. Useful for **built-in defaults the plugin
  would replace** »*. Un greffon peut donc **se substituer** à un contenu natif,
  pas seulement s'ajouter à côté. Le composant se réabonne au registre, donc un
  greffon arrivé tard paraît sans rechargement.

**Deux points relevés au passage :**

- le manifeste admet un champ **`slots`** en plus de `tab` — *« Plugins
  declaring any of these in their manifest's `slots` field get wired in
  automatically »*. Le `manifest.json` du kanban (§1.6) ne l'utilise pas ;
- l'emplacement `sidebar` est décrit comme *« the cockpit sidebar rail (only
  rendered when `layoutVariant === "cockpit"`) »*. L'application web d'Hermès
  porte donc une **variante de mise en page « cockpit »**, avec un rail latéral
  que les greffons peuvent alimenter. ⚠ *Non vérifié* : ce que `layoutVariant`
  recouvre, où il se règle, et ce qui change entre les variantes.

Le WebUI possède par ailleurs son propre système d'extensions
(`api/extensions.py`, manifestes plafonnés à 64 Ko, `window.HermesExtensionSettings`
exposé par `static/extension_settings.js`, 304 lignes). ⚠ *Non lu.*

---

## 2. Arborescence et dépendances

### 2.1 Étape de build : **non — pour `hermes-webui`**

⚠ **La portée de cette réponse compte.** Elle vaut pour le dépôt audité ici.
**L'application web d'Hermès (`web/`) est, elle, un projet Vite + React +
TypeScript avec `node_modules` et compilation** — et les greffons livrent un
`dist/` compilé contre son SDK (§1.7). Deux interfaces web coexistent dans
l'écosystème, avec deux philosophies opposées.

Pour `hermes-webui` : aucun bundler, aucun module ES, aucune compilation.
Balises classiques avec `defer`, dans l'ordre de dépendance :

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

**Nuance :** `index.html` n'est pas servi tel quel. Trois jetons sont substitués
côté serveur :

```html
<script>window.__HERMES_CONFIG__={maxUploadBytes:__MAX_UPLOAD_BYTES__,csrfToken:__CSRF_TOKEN_JSON__};</script>
<script>window.__HERMES_WEBUI_BUNDLE_VERSION__='__WEBUI_VERSION__';</script>
```

`package.json` existe mais ne sert qu'au lint
(`eslint.runtime-guard.config.mjs`). Les greffons Hermès, eux, livrent un
`dist/` précompilé — le build existe en amont, hors de ce dépôt.

### 2.2 Dépendances JS chargées

| Origine | Bibliothèque | Mode |
|---|---|---|
| `cdn.jsdelivr.net` | `prismjs@1.29.0` core + autoloader | CDN, `defer`, `integrity` SHA-384 |
| `cdn.jsdelivr.net` | `prism-tomorrow.min.css` | CDN |
| `cdn.jsdelivr.net` | `xterm@5.3.0` + CSS | CDN, `integrity` |
| `cdn.jsdelivr.net` | `xterm-addon-fit@0.8.0` | CDN, `integrity` |
| `cdn.jsdelivr.net` | `xterm-addon-web-links@0.9.0` | CDN, `integrity` |
| local | `static/vendor/katex/0.16.22/katex.min.css` | disque |
| ⚠ non tracé | Mermaid | via un `<script type="module">` non lu |

Cinq ressources tierces par CDN. **Conséquence : le premier chargement exige un
accès réseau sortant**, malgré le service worker (`static/sw.js`, 193 lignes).

### 2.3 Tailles réelles — la documentation est périmée

| Fichier | Mesuré | Annoncé dans leur `ARCHITECTURE.md` |
|---|---|---|
| `static/i18n.js` | **26 032** | non mentionné |
| `static/ui.js` | **20 249** | ~7 216 |
| `static/panels.js` | **12 495** | ~6 480 |
| `static/sessions.js` | 8 983 | ~3 517 |
| `static/messages.js` | 8 584 | ~2 301 |
| `static/style.css` | 7 109 | ~3 767 |
| `static/boot.js` | 3 688 | ~1 607 |
| `static/commands.js` | 2 106 | ~1 302 |
| `static/index.html` | 1 900 | — |
| `static/workspace.js` | 1 442 | ~369 |
| `api/routes.py` | ~15 500 (dispatch jusqu'à L15478+) | ~9 772 |

**Facteur d'écart : 2 à 3.** Ne pas citer leurs chiffres.

Total serveur : `api/` = **66 fichiers, 90 082 lignes**.

### 2.4 Arborescence

```
hermes-webui/
├── server.py                     point d'entrée, Handler HTTP, auth, TLS, main()
├── bootstrap.py                  lanceur : install agent, deps, attente /health
├── mcp_server.py
├── start.sh · start.ps1 · ctl.sh
├── api/                          66 fichiers · 90 082 lignes
│   ├── routes.py                 dispatch if/elif de tous les handlers
│   ├── streaming.py              moteur SSE, run_agent, annulation
│   ├── config.py · models.py · helpers.py · workspace.py · upload.py
│   ├── route_approvals.py        639 — état des approbations
│   ├── kanban_bridge.py          1 197 — pont kanban
│   ├── auth.py · auth_oidc.py · oauth.py · passkeys.py
│   ├── extensions.py · plugins.py · plugin_providers.py
│   ├── onboarding.py · providers.py
│   ├── session_*.py              lifecycle, ops, recovery, events, discoverability
│   ├── gateway_*.py              chat, watcher, restart
│   └── compression_*.py · rollback.py · crash_visibility.py
├── static/                       voir 2.3
│   └── vendor/katex/
├── tests/                        ~1 150 fichiers · ~11 500 tests
├── docs/ · nix/ · scripts/
├── Dockerfile
├── docker-compose.yml · docker-compose.two-container.yml · docker-compose.three-container.yml
├── flake.nix · flake.lock
├── pyproject.toml · requirements.txt · requirements-dev.txt · package.json
└── ARCHITECTURE.md · ROADMAP.md · SPRINTS.md · TESTING.md · BUGS.md · THEMES.md · CHANGELOG.md
```

---

## 3. `server.py` + `api/`

### 3.1 Forme du routage

`server.py` est une coquille : classe `Handler`, en-têtes, journalisation JSON,
TLS, `main()`. Tout le routage est dans `api/routes.py`, en **chaîne `if/elif`
plate**, sans framework ni décorateur. Une règle d'ordre est documentée et
critique :

> *« The `/api/upload` check MUST appear BEFORE calling `read_body()`.
> `read_body()` calls `handler.rfile.read()` which consumes the HTTP body
> stream. […] If `read_body()` runs first on a multipart request, the upload
> handler receives an empty body and the upload silently fails. »*

### 3.2 Inventaire des routes

Relevé exhaustif des chemins littéraux du dispatch. **Authentification :** il
n'y a pas de garde par route — `server.py` applique un **middleware global**
activé seulement si `HERMES_WEBUI_PASSWORD` (ou OIDC/passkeys) est configuré ;
sinon **tout est ouvert** sur `127.0.0.1:8787`. La colonne ci-dessous indique
donc « globale » partout, sauf les exceptions explicites.

**GET — session et conversation**

| Chemin | Rôle |
|---|---|
| `/api/session` | charge une session complète |
| `/api/sessions` · `/api/sessions/search` | liste, recherche |
| `/api/session/status` · `/api/session/usage` | état, consommation |
| `/api/session/yolo` | état du bypass d'approbation |
| `/api/session/export` · `/api/session/lineage/report` | export, filiation |
| `/api/session/recovery/audit` · `/api/session/compress/status` | récupération, compression |
| `/api/session/worktree/status` | worktree git de la session |
| `/api/chat/stream` | **flux SSE principal** |
| `/api/chat/stream/status` · `/api/chat/cancel` | reprise, annulation |
| `/api/sessions/gateway/stream` · `/api/sessions/events` | flux annexes |
| `/api/session/stream` | flux d'événements de session |

**GET — approbations et clarifications**

| Chemin | Rôle |
|---|---|
| `/api/approval/pending` | tête de file (sondage de repli, 1 500 ms) |
| `/api/approval/stream` | flux SSE dédié aux approbations |
| `/api/approval/inject_test` | injection d'une fausse demande |
| `/api/clarify/pending` · `/api/clarify/stream` · `/api/clarify/inject_test` | idem pour les clarifications |

**GET — modèles, fournisseurs, greffons**

| Chemin | Rôle |
|---|---|
| `/api/models` · `/api/models/live` · `/api/model/auxiliary` | catalogue, découverte live |
| `/api/providers` · `/api/provider/quota` · `/api/provider/cost-history` | fournisseurs, quotas, coûts |
| `/api/plugins` · `/api/extensions/status` · `/api/extensions/registry` | greffons, extensions |
| `/api/mcp/servers` · `/api/mcp/tools` | serveurs et outils MCP |
| `/api/dashboard/status` · `/api/dashboard/config` | tableaux de bord de greffons |
| `/api/onboarding/status` · `/api/onboarding/oauth/poll` | première configuration |

**GET — espace de travail et fichiers**

| Chemin | Rôle |
|---|---|
| `/api/list` · `/api/file` · `/api/file/raw` · `/api/media` | arborescence, lecture, binaire |
| `/api/folder/download` | archive d'un dossier |
| `/api/escape/list` · `/api/escape/file/raw` · `/api/escape/file/read` | accès **hors** espace de travail |
| `/api/workspaces` · `/api/workspaces/suggest` | espaces enregistrés |
| `/api/git/status` · `/api/git/branches` · `/api/git/diff` · `/api/git-info` | git |

**GET — divers**

`/api/health/agent` · `/api/system/health` · `/api/logs` · `/api/insights` ·
`/api/settings` · `/api/profiles` · `/api/profile/active` · `/api/skills` ·
`/api/skills/usage` · `/api/skills/content` · `/api/memory` · `/api/crons` (+
`/output`, `/history`, `/run`, `/recent`, `/status`, `/delivery-options`) ·
`/api/personalities` · `/api/commands` (+ `/bundles`, `/moa/resolve`) ·
`/api/prompts` · `/api/projects` · `/api/notes/sources` · `/api/notes/search` ·
`/api/notes/item` · `/api/wiki/status` · `/api/wiki/browse` · `/api/wiki/page` ·
`/api/rollback/list` · `/api/rollback/diff` · `/api/updates/check` ·
`/api/transcribe/capability` · `/api/reasoning` · `/api/terminal/output` ·
`/api/background/status` · `/api/gateway/status` · `/api/project-os/dashboard`

**GET — authentification** *(non protégées par nature)*

`/api/auth/status` · `/api/auth/oidc/start` · `/api/auth/oidc/callback`

**POST — conversation**

| Chemin | Rôle |
|---|---|
| `/api/chat/start` | démarre un tour, rend `{stream_id}` |
| `/api/chat` | variante synchrone (bloquante) |
| `/api/chat/steer` | infléchit un tour en cours |
| `/api/approval/respond` | **réponse à une approbation** — §3.4 |
| `/api/session/new` · `/duplicate` · `/rename` · `/update` · `/delete` · `/clear` | CRUD de session |
| `/api/session/truncate` · `/branch` · `/retry` · `/undo` | manipulation d'historique |
| `/api/session/compress` · `/compress/start` · `/compression-recovery/start` | compression de contexte |
| `/api/session/yolo` | **bascule le bypass d'approbation** |
| `/api/session/toolsets` · `/draft` · `/anchor-scene` · `/handoff-summary` | réglages de session |
| `/api/session/title/regenerate` · `/conversation-rounds` | titres, tours |

**POST — fichiers, terminal, git**

`/api/upload` · `/api/upload/extract` · `/api/workspace/upload` ·
`/api/file/save` · `/create` · `/rename` · `/move` · `/delete` · `/create-dir` ·
`/reveal` · `/path` · `/open-vscode` · `/office-save` ·
`/api/terminal/start` · `/input` · `/resize` · `/close` ·
`/api/git/stage` · `/unstage` · `/discard` · `/commit` · `/commit-selected` ·
`/commit-message` · `/commit-message-selected` · `/fetch` · `/pull` · `/push` ·
`/checkout` · `/stash-checkout`

**POST — configuration et administration**

`/api/providers` · `/providers/delete` · `/providers/self-hosted` ·
`/api/models/refresh` · `/api/model/set` · `/api/default-model` ·
`/api/reasoning` · `/api/personality/set` · `/api/dashboard/config` ·
`/api/extensions/toggle` · `/install` · `/uninstall` · `/sidecar-proxy-consent` ·
`/api/crons/create` · `/update` · `/delete` · `/run` · `/pause` · `/resume` ·
`/api/workspaces/add` · `/remove` · `/rename` · `/reorder` ·
`/api/admin/reload` · `/api/shutdown` · `/api/health/restart` ·
`/api/sessions/cleanup` · `/cleanup_zero_message` ·
`/api/share/create` · `/api/share/revoke` ·
`/api/transcribe` · `/api/tts` · `/api/csp-report` · `/api/client-events/log` ·
`/api/escape/authorize` · `/api/btw` · `/api/background` · `/api/goal` ·
`/api/bg-task-complete-ack` · `/api/process-complete-ack` ·
`/api/session/recovery/repair-safe`

**Un point de sécurité notable :** la famille `/api/escape/*` (`list`,
`file/raw`, `file/read`, `authorize`) donne un accès **hors** de l'espace de
travail, derrière une autorisation explicite. Le reste du système de fichiers
est borné par `safe_resolve(root, requested)`, qui résout puis vérifie par
`.relative_to(root)`.

### 3.3 Le flux SSE — forme exacte des événements

Deux points d'entrée coopèrent : `POST /api/chat/start` crée une `queue.Queue`,
la range dans `STREAMS[stream_id]`, lance un thread démon et rend
`{stream_id}` immédiatement ; `GET /api/chat/stream` tient la connexion et
recopie la file vers le navigateur.

Événements émis, relevés dans `api/streaming.py` :

| Événement | Charge utile |
|---|---|
| `token` | `{'text': text}` |
| `tool` | `{'event_type': …, 'name': …, 'preview': …, 'args': args_snap}` |
| `tool_complete` | idem, à la fin de l'appel |
| `metering` | statistiques + `session_id` + `usage` |
| `approval` | l'entrée d'approbation complète, plus `pending_count` |
| `clarify` | équivalent pour les demandes de clarification |
| `done` | `{session: {champs compacts + messages}}` |
| `error` | `{message, trace}` |

Émission d'un outil, `streaming.py:8730` :

```python
put('tool', {
    'event_type': event_type or 'tool.started',
    'name': name,
    'preview': preview,
    'args': args_snap,
})
```

**L'approbation est poussée dans le même flux, immédiatement après l'outil**,
via un repli de sondage (`streaming.py:8740`) :

```python
# Fallback: poll for pending approval in case notify_cb wasn't
# registered (e.g. older approval module without gateway support).
try:
    from api.route_approvals import (
        _gateway_queues as _approval_gateway_queues,
        _lock as _approval_lock,
        _pending as _approval_pending,
        reconcile_gateway_pending_mirror_locked as _reconcile_gateway_pending_mirror_locked,
    )
    from tools.approval import has_blocking_approval as _has_blocking_approval
    if _has_blocking_approval(session_id):
        p = None
        with _approval_lock:
            p, pending_count, _changed = _reconcile_gateway_pending_mirror_locked(session_id)
            if p:
                p = {**p, "pending_count": pending_count}
        if p:
            put('approval', p)
except ImportError:
    pass
```

La boucle SSE bloque sur `queue.get(timeout=30)` et émet un commentaire de
battement (`: heartbeat`) à l'expiration, pour traverser proxys et pare-feux.
`BrokenPipeError` et `ConnectionResetError` sont avalés silencieusement.

Le flux SSE du kanban est distinct et **reprend proprement** — il émet
`id: <event_id>` sur chaque trame, donc `EventSource` renvoie `Last-Event-ID` à
la reconnexion (`kanban_bridge.py:1116`) :

```python
payload = json.dumps({"events": events, "cursor": cursor})
frame = (
    f"id: {cursor}\nevent: events\ndata: {payload}\n\n"
).encode("utf-8")
```

Constantes : sondage 0,3 s, battement 15 s, lot plafonné à 200 événements.

### 3.4 Le système d'approbation

**Où c'est intercepté.** Pas dans le WebUI : dans Hermès. `api/route_approvals.py`
importe l'état **privé** du module `tools.approval` de l'agent :

```python
try:
    from tools.approval import (
        submit_pending as _submit_pending_raw,
        approve_session,
        approve_permanent,
        save_permanent_allowlist,
        is_approved,
        _pending,
        _lock,
        _permanent_approved,
        _gateway_queues,
        resolve_gateway_approval,
        enable_session_yolo,
        disable_session_yolo,
        is_session_yolo_enabled,
    )
except ImportError:
    _submit_pending_raw = lambda *a, **k: None
    approve_session = lambda *a, **k: None
    approve_permanent = lambda *a, **k: None
    save_permanent_allowlist = lambda *a, **k: None
    is_approved = lambda *a, **k: True
    ...
```

⚠ **Le repli d'import rend `is_approved` toujours vrai** — si le module de
l'agent est absent, tout est approuvé.

Le partage d'état ne fonctionne que par le cache d'imports, et leur
`ARCHITECTURE.md` §4.5 le dit :

> *« Important: this only works because Python imports are cached (`sys.modules`).
> The same module object is used everywhere. If the approval module were ever
> imported in a subprocess or via `importlib.reload()`, this would break. »*

**Aucun délai.** Recherche exhaustive de `timeout`, `expire`, `deadline`, `ttl`
dans `route_approvals.py` : **zéro occurrence.** L'attente est un
`threading.Event` ; elle dure jusqu'à réponse.

**Les quatre choix**, `api/routes.py:23968` :

```python
if choice == "session":
    for k in all_keys:
        approve_session(sid, k)
elif choice == "always":
    for k in all_keys:
        approve_session(sid, k)
        approve_permanent(k)
    save_permanent_allowlist(_permanent_approved)
# choice == "once": no persistence — approval lasts this single call only.
# resolve_gateway_approval() below unblocks the parked agent thread for
# every choice, so "once" still lets the current tool run; we just must not
# call approve_session() here, or the next matching guarded call would find
# the pattern already session-approved and skip its approval card (#6017).
```

| Choix | Effet | Portée |
|---|---|---|
| `once` | débloque le thread, **n'enregistre rien** | l'appel courant |
| `session` | `approve_session(sid, k)` pour chaque motif | la session |
| `always` | `approve_session` + `approve_permanent` + écriture de la liste blanche | permanent, sur disque |
| `deny` | dépile sans rien approuver ; l'agent reçoit un refus | l'appel courant |

Les clés sont des **motifs** (`pattern_keys`), pas des commandes — l'approbation
porte sur une signature, pas sur un texte exact.

**Le payload envoyé au front** est l'entrée d'approbation enrichie de
`pending_count`. Le front en lit `command`, `description`, `pattern_keys` /
`pattern_key`, `approval_id`, `_session_id` (`messages.js:7216`) :

```js
function showApprovalCard(pending, pendingCount) {
  const sid = _rememberApprovalPending(pending, pendingCount);
  if (!_approvalPromptBelongsToActiveSession(sid)) return;
  if (pending && pending.approval_id && _isApprovalDismissed(sid, pending.approval_id)) return;
  const keys = pending.pattern_keys || (pending.pattern_key ? [pending.pattern_key] : []);
  const desc = (pending.description || "") + (keys.length ? " [" + keys.join(", ") + "]" : "");
  const cmd = pending.command || "";
```

**Comment le front répond** (`messages.js:7341`) :

```js
async function respondApproval(choice) {
  const sid = _approvalSessionId || (S.session && S.session.session_id);
  if (!sid) return;
  const approvalId = _approvalCurrentId;
  if (_approvalResponseMatches(sid, approvalId)) return;
  _unmarkApprovalDismissed(sid, approvalId);
  _approvalResponding = {sid, approvalId: approvalId || null, choice};
  _setApprovalControlsDisabled(choice, true);
  try {
    const result = await api("/api/approval/respond", {
      method: "POST",
      body: JSON.stringify({ session_id: sid, choice, approval_id: approvalId })
    });
    if (result && result.ok) {
      ...
      if (result.stale_cleared || (_approvalSessionId === sid && _approvalCurrentId === approvalId)) {
        _approvalSessionId = null;
        _approvalCurrentId = null;
        hideApprovalCard(true);
      }
```

Le drapeau `stale_cleared` mérite d'être noté : le serveur signale qu'il n'a
**rien trouvé en attente**, et le front efface alors la carte
inconditionnellement — un correctif contre une carte orpheline bloquée (#4948).

**Deux transports en parallèle** pour la même information : le flux SSE
(`/api/approval/stream`) **et** un sondage de repli toutes les 1 500 ms sur
`/api/approval/pending`. Les deux sont actifs simultanément.

**Un bypass existe** : `enable_session_yolo(session_key)` / `disable_...` /
`is_session_yolo_enabled`, exposés par `GET` et `POST /api/session/yolo`. L'état
est un `set` en mémoire dans le module de l'agent.

---

## 4. `kanban_bridge.py`, dispatcher, delegate

### 4.1 Comment le web l'appelle

**Import direct, en processus.** Pas d'endpoint intermédiaire, pas de
sous-processus, pas de CLI. Le pont importe paresseusement la bibliothèque de
l'agent :

```python
def _kb():
    """Lazily import hermes_cli.kanban_db to avoid circular imports at module load."""
    from hermes_cli import kanban_db as kb

    return kb
```

Et il **écrit du SQL directement** dans la base partagée. Le dispatch HTTP est
`handle_kanban_get(handler, parsed)`, à retour **tri-valué** :

```python
def handle_kanban_get(handler, parsed) -> bool | None:
    """Dispatch a Kanban GET. Three-valued return:

    - ``False`` — no Kanban path matched; caller should emit a 404
    - ``None`` — a path matched and the inner handler already sent a
      response via ``bad(...)`` / ``j(...)``
    - ``True`` — a path matched and the inner handler succeeded.
    """
```

### 4.2 Signatures publiques

| Fonction | Rôle |
|---|---|
| `handle_kanban_get(handler, parsed)` | dispatch GET |
| `_board_payload(parsed)` | tableau complet : colonnes, tâches, filtres, `latest_event_id` |
| `_create_task_payload(body, *, board)` | création |
| `_patch_task(conn, task_id, body)` · `_patch_task_payload(...)` | mise à jour partielle |
| `_bulk_tasks_payload(body, *, board)` | mutation groupée en une transaction |
| `_task_detail_payload(task_id, *, board)` | tâche + commentaires + événements + liens + runs |
| `_comment_payload(task_id, body, *, board)` | commentaire |
| `_link_tasks_payload(body, *, unlink, board)` | lien parent-enfant |
| `_task_action_payload(task_id, body, action, *, board)` | `block` / `unblock` |
| `_events_payload(parsed)` | journal paginé par curseur |
| `_handle_events_sse_stream(handler, parsed)` | flux SSE reprenable |
| `_stats_payload` · `_assignees_payload` · `_config_payload` · `_update_config_payload` | métadonnées |
| `_task_log_payload(parsed, task_id)` | log brut du worker |
| `_dispatch_payload(parsed)` | **déclenche un tour de dispatcher** |
| `_list_boards_payload` · `_create_board_payload` · `_update_board_payload` · `_delete_board_payload` · `_switch_board_payload` | multi-tableaux |

Colonnes : `["triage", "todo", "ready", "running", "blocked", "done"]` (+
`archived`).

### 4.3 Le dispatcher

```python
def _dispatch_payload(parsed):
    """Trigger a single-pass kanban dispatcher run and return the dispatch result."""
    board = _resolve_board(parsed)
    kb = _kb()
    dry_run = _bool_query(parsed, "dry_run", False)
    max_spawn = _int_query(parsed, "max", 8, minimum=1, maximum=100)
    if not hasattr(kb, "dispatch_once"):
        raise ValueError("dispatcher is unavailable")
    with _conn(board=board) as conn:
        result = kb.dispatch_once(conn, dry_run=dry_run, max_spawn=max_spawn)
```

Appel **direct** à `kb.dispatch_once()`. Un service systemd existe côté Hermès
pour le mode continu : `plugins/kanban/systemd/hermes-kanban-dispatcher.service`.

### 4.4 Le contrat de claim — le point le plus instructif du fichier

L'entrée en `running` par écriture directe est **refusée**, `kanban_bridge.py:418` :

```python
elif status == "running":
    # The 'running' state is owned by the kanban dispatcher / claim
    # protocol — entering it via raw UPDATE bypasses claim_lock,
    # claim_expires, started_at, and worker_pid, which leaves the task
    # in a state the dispatcher treats as "phantom claimed" and may
    # reclaim or hide. Match the agent dashboard plugin's contract
    # (plugins/kanban/dashboard/plugin_api.py update_task) by rejecting
    # this transition with HTTP 400. Workers enter 'running' via
    # kb.claim_task(); UI users should use the dispatcher nudge.
    raise ValueError(
        "Cannot set status to 'running' directly; use the dispatcher/claim path"
    )
```

Et la **sortie** de `running` a sa discipline, `_set_status_direct` :

```python
cur = conn.execute(
    "UPDATE tasks SET status = ?, "
    "  claim_lock = CASE WHEN ? = 'running' THEN claim_lock ELSE NULL END, "
    "  claim_expires = CASE WHEN ? = 'running' THEN claim_expires ELSE NULL END, "
    "  worker_pid = CASE WHEN ? = 'running' THEN worker_pid ELSE NULL END "
    "WHERE id = ?",
    (new_status, new_status, new_status, new_status, task_id),
)
...
if was_running and new_status != "running" and prev["current_run_id"]:
    run_id = kb._end_run(
        conn, task_id,
        outcome="reclaimed", status="reclaimed",
        summary=f"status changed to {new_status} (webui/direct)",
    )
```

Puis `kb.recompute_ready(conn)` sur `done` / `ready` pour débloquer les filles.

**Trois surfaces partagent ce contrat** — la CLI, le tableau de bord d'Hermès
(`plugins/kanban/dashboard/plugin_api.py`) et ce pont ; le fichier le dit six
fois (*« Mirrors the agent dashboard plugin's … so first-party clients see
identical behaviour from either surface »*). L'indicateur d'actif est un fichier
sur disque, `<root>/kanban/current`, partagé par tous.

### 4.5 Un piège SQLite documenté

```python
def _conn(board=None):
    """Initialize the kanban DB for the given board slug and return a context manager
    that yields a sqlite connection and CLOSES it on exit.

    Must be ``kb.connect_closing`` — a raw ``kb.connect()`` connection used as
    ``with _conn(...) as conn:`` only gets sqlite3's transaction-scope context
    manager, which never closes the file descriptor. In this long-lived server
    that leaks one FD per request and pins stale WAL snapshots (FDs to deleted
    ``-wal``/``-shm`` files), which starves SQLite checkpoints on the shared
    kanban DB and aggravates probe⇄checkpoint contention for every process.
    """
```

### 4.6 `delegate`

⚠ **Non trouvé sous ce nom** dans le pont. Leur documentation mentionne des
« subagent delegation cards » dans le fil de conversation ; le mécanisme n'a pas
été localisé dans le code lu. **Non vérifié.**

---

## 5. Configuration MCP / fournisseurs / greffons

### 5.1 Fichiers et variables

| Élément | Emplacement |
|---|---|
| Configuration d'Hermès | `~/.hermes/config.yaml` — `HERMES_CONFIG_PATH` |
| État du WebUI | `~/.hermes/webui/` — `HERMES_WEBUI_STATE_DIR` |
| Sessions | `~/.hermes/webui/sessions/{session_id}.json` + `_index.json` |
| Réglages | `~/.hermes/webui/settings.json` |
| Espaces, projets | `workspaces.json`, `last_workspace.txt`, `projects.json` |
| Serveurs MCP | bloc `mcp_servers:` du `config.yaml` du **profil actif** |
| Kanban | `dashboard.kanban.*` dans le `config.yaml` |
| Journaux | `~/.hermes/webui/bootstrap-8787.log`, `~/.hermes/webui.log` |

Variables notables : `HERMES_HOME`, `HERMES_WEBUI_HOST` / `PORT` (défaut
`127.0.0.1:8787`), `HERMES_WEBUI_DEFAULT_MODEL`, `HERMES_WEBUI_PASSWORD`,
`HERMES_WEBUI_SKIP_ONBOARDING`, `HERMES_WEBUI_MAX_UPLOAD_MB` (défaut 20 Mo),
`HERMES_WEBUI_EXTENSION_MANIFEST`.

Écriture du `config.yaml` : sous verrou (`config._cfg_lock`), lecture-
modification-écriture, puis `config.reload_config()`. Le cache de configuration
est **indexé sur la date de modification**, donc une écriture prend effet en
cours de session.

### 5.2 La sonde de fournisseur — ce qui est vérifié avant enregistrement

`api/onboarding.py:275`, intégral :

```python
# ── Provider endpoint probe (#1499) ─────────────────────────────────────────

# Probe error codes — stable strings the frontend can switch on for inline
# error rendering.  Add new codes only by extending this set; never reuse.
PROBE_ERROR_CODES = (
    "invalid_url",       # base_url failed urlparse / scheme / host check
    "dns",               # hostname did not resolve
    "connect_refused",   # TCP RST on connect (server not listening)
    "timeout",           # exceeded probe timeout
    "http_4xx",          # endpoint returned 4xx (auth required, wrong path, …)
    "http_5xx",          # endpoint returned 5xx (server-side fault)
    "parse",             # body not JSON or not the OpenAI /models shape
    "unreachable",       # other network / SSL / unknown error
)

PROBE_TIMEOUT_SECONDS = 5.0
# OpenAI /models response can list dozens of entries on Ollama / LM Studio.
# 256 KB is more than enough for any realistic catalog and bounds the worst
# case for a hostile / mis-pointed endpoint that streams forever.
PROBE_MAX_BYTES = 256 * 1024


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuse to follow HTTP redirects on the probe path.
```

**Ce qui est éprouvé :** l'URL de base est appelée sur le chemin `/models` de
l'API OpenAI, en 5 s maximum, corps borné à 256 Ko, **redirections refusées**.
La validation ne s'arrête pas au code HTTP : le corps doit être du JSON **à la
forme `/models` d'OpenAI**, sinon `parse`.

**Côté interface :** les huit codes sont des chaînes stables, explicitement
prévues pour que le front fasse un `switch` dessus et **rende l'erreur en
ligne** — un message par cause, pas un échec générique. Leur commentaire
interdit de réutiliser un code retiré.

⚠ *Non lu* : le rendu exact de ces huit états dans `static/onboarding.js`
(782 lignes).

### 5.3 Greffons et extensions

Deux systèmes distincts coexistent :

| | Greffons **Hermès** | Extensions **WebUI** |
|---|---|---|
| Déclaration | `manifest.json` (§1.6) | manifeste ≤ 64 Ko, `HERMES_WEBUI_EXTENSION_MANIFEST` |
| Back-end | `plugin_api.py` | `api/extensions.py`, `plugin_providers.py` |
| Front | `dist/index.js` précompilé | actifs injectés, `window.HermesExtensionSettings` |
| Routes | via le pont (`/api/kanban/*`) | `/api/extensions/{status,registry,toggle,install,uninstall}` |
| Sécurité | — | consentement explicite au proxy sidecar (`/sidecar-proxy-consent`) |

---

## 6. Grammaire visuelle

### 6.1 Le bloc `:root`, intégral

`static/style.css:1-21` :

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

Structure : palette chaude ancrée sur `--accent:#B8860B` ; **cinq rayons**
nommés dont un `pill:999px` ; **échelle d'espacement à quatre crans** 4/8/12/16 ;
**la typographie des messages est un jeu de variables séparé** de l'UI, avec sa
propre interlignes 1,75 ; **aucune police téléchargée**, piles système
uniquement.

### 6.2 Trois axes de thème indépendants

| Axe | Support | Clé `localStorage` | Valeurs |
|---|---|---|---|
| Thème | classe `.dark` sur `<html>` | `hermes-theme` | `light`, `dark`, `system` |
| Habillage | `data-skin` | `hermes-skin` | 21 : `codex`, `terracotta`, `ares`, `mono`, `graphite`, `github`, `slate`, `poseidon`, `sisyphus`, `charizard`, `sienna`, `catppuccin`, `hepburn`, `nous`, `geist-contrast`, `neon`, `neon-soft`, `neon-paint`, `zeus`, `verdigris`, `default` |
| Taille | `data-font-size` | `hermes-font-size` | défaut 14 px, `small` 12, `large` 16, `xlarge` 18 |

Un habillage **redéfinit les variables, rayons et police compris**. Exemple, le
skin `mono` (`style.css:813`) :

```css
--radius-sm:1px;--radius-md:2px;--radius-card:2px;--radius-lg:4px;
--font-ui:"SF Mono","Roboto Mono","Courier New",monospace;
```

Une table de compatibilité convertit les anciens noms :
`slate → [dark, slate]`, `solarized → [dark, poseidon]`,
`monokai → [dark, sisyphus]`, `nord → [dark, slate]`, `oled → [dark, default]`.

**Tout est appliqué avant le premier octet de CSS**, par cinq scripts inline
bloquants dans le `<head>` — thème/habillage, taille de police, couleur de la
barre système, état du panneau de droite, repli de la barre latérale. Chacun
avec son `try/catch` et son repli. C'est ce qui supprime le flash de thème :

```html
<script>(function(){try{ /* …lecture localStorage… */
if(theme==='dark')document.documentElement.classList.add('dark');
if(skin!=='default')document.documentElement.dataset.skin=skin;
}catch(e){document.documentElement.classList.add('dark');}})()</script>
```

### 6.3 Structure du layout

`static/index.html`, aux lignes réelles :

```
153  <div class="layout">
154    <nav class="rail" aria-label="Primary navigation">      ← colonne d'icônes
169    <aside class="sidebar">                                 ← contient TOUTES les panel-view
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
399    <main class="main">                                     ← zone centrale
483      <div class="composer-wrap" id="composerWrap">
484        <div class="composer-flyout">
542        <div class="composer-terminal-panel" id="composerTerminalPanel" hidden>
```

Un écran type — le panneau Mémoire, `index.html:260` :

```html
<div class="panel-view" id="panelMemory">
  <div class="panel-head">
    <span data-i18n="personal_memory">Personal memory</span>
  </div>
  <div class="side-menu" id="memoryPanel">
    <div style="padding:12px;color:var(--muted);font-size:12px" data-i18n="loading">Loading...</div>
  </div>
</div>
```

Géométrie retenue :

- **quatre zones** : `rail` (icônes) · `sidebar` (panneaux) · `main`
  (conversation) · panneau de droite (fichiers), ce dernier piloté par
  `data-workspacePanel` sur `<html>` et préchargé avant le CSS ;
- **les panneaux ne sont jamais démontés** : tous présents dans la barre
  latérale, un seul porte `.active`. Leur état DOM survit à la navigation ;
- certains panneaux prennent **aussi** la zone centrale (`MAIN_VIEW_PANELS` →
  `showing-<nom>` sur `<main>`) ;
- **le terminal est logé dans le composeur**, pas dans un panneau — `hidden` par
  défaut, redimensionnable par une poignée ;
- convention d'un panneau : en-tête `<div class="panel-head">`, corps en
  `flex:1;overflow-y:auto`, contenu injecté par `innerHTML` ;
- **le composeur** porte à gauche pièce jointe / micro / sélecteur de modèle, à
  droite la pastille de contexte et l'envoi.

Toutes les chaînes visibles portent `data-i18n` / `data-i18n-title`, résolues
par `i18n.js` (26 032 lignes).

---

## Portée de l'audit

**Lu intégralement :** `api/route_approvals.py` (639), `api/kanban_bridge.py`
(1 197), `BUGS.md`, `plugins/kanban/dashboard/manifest.json`, et — côté Hermès —
`web/src/plugins/sdk.d.ts` (161), `registry.ts` (169), `usePlugins.ts` (134),
`slots.ts` (201).

**Lu en grande partie :** `ARCHITECTURE.md` (~830 sur 1 274).

**Lu par extraction ciblée :** `api/routes.py` (dispatch complet des chemins,
plus le bloc d'approbation), `api/streaming.py` (émission SSE),
`static/panels.js` (`switchPanel`, `loadTodos`), `static/messages.js`
(`showApprovalCard`, `respondApproval`), `static/index.html`,
`static/style.css` (bloc `:root`, skins), `api/onboarding.py` (sonde),
`tools/approval.py` d'Hermès (~150 sur 3 708).

**Non lu :** le reste de `api/` — **90 082 lignes au total**, soit environ
**2 % couvert** ; l'ensemble du JavaScript hors extraits (~85 000 lignes) ; les
~11 500 tests ; les 178 issues ouvertes du dépôt ; `static/onboarding.js` ;
`api/extensions.py` au-delà de ses constantes ; le chargeur de greffons côté
Hermès.

**Points explicitement non vérifiés :** le mécanisme `delegate` (§4.6) ; le
rendu des huit codes d'erreur de sonde (§5.2) ; l'intégration Mermaid (§2.2) ;
`layoutVariant` et la variante « cockpit » (§1.8) ; et l'application web
d'Hermès dans son ensemble — seuls son chargeur de greffons et son registre
d'emplacements ont été lus, pas ses pages.
