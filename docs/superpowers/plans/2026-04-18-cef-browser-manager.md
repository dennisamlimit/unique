# CEF Browser-Manager Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das identisch kopierte Browser-State-Pattern (~30 Zeilen × 8 Module) in eine zentrale `client_src/shared/browser-manager.ts` extrahieren und alle 8 CEF-Module darauf umstellen.

**Architecture:** Shared Utility-Funktionen (Ansatz A): `createBrowserState`, `initBrowser`, `executeInBrowser`, `flushPending`, `startReadyProbe`, `stopReadyProbe` in einer Datei. Jedes Modul hält nur noch app-spezifische State-Felder als lokale Variablen. Phone nutzt `windowReadyKey`-Option für seinen abweichenden `__lbPhoneReady`-Check.

**Tech Stack:** TypeScript, RAGE:MP Client Runtime (Node 12/14), Vite (Build), `Mp.Browser` API

---

## Dateiübersicht

| Aktion | Datei |
|---|---|
| NEU | `client_src/shared/browser-manager.ts` |
| ÄNDERN | `client_src/admin/index.ts` |
| ÄNDERN | `client_src/auth/index.ts` |
| ÄNDERN | `client_src/chat/index.ts` |
| ÄNDERN | `client_src/hud/index.ts` |
| ÄNDERN | `client_src/usermenu/index.ts` |
| ÄNDERN | `client_src/orga/index.ts` |
| ÄNDERN | `client_src/phone/index.ts` |
| ÄNDERN | `client_src/inventory/index.ts` |

---

## Task 1: client_src/shared/browser-manager.ts erstellen

**Files:**
- Create: `client_src/shared/browser-manager.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
/// <reference path="../ragemp-client.d.ts" />

export type BrowserState = {
  browser: Mp.Browser | null;
  isReady: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
};

export type BrowserInitOptions = {
  htmlPath: string;
  active?: boolean;
};

export type ReadyProbeOptions = {
  windowReadyKey?: string;
};

export function createBrowserState(): BrowserState {
  return {
    browser: null,
    isReady: false,
    pendingActions: [],
    readyProbe: null
  };
}

export function initBrowser(state: BrowserState, options: BrowserInitOptions): void {
  if (state.browser) return;
  state.browser = mp.browsers.new(options.htmlPath);
  state.browser.active = options.active ?? false;
}

export function stopReadyProbe(state: BrowserState): void {
  if (!state.readyProbe) return;
  clearInterval(state.readyProbe);
  state.readyProbe = null;
}

export function startReadyProbe(
  state: BrowserState,
  appName: string,
  options?: ReadyProbeOptions
): void {
  stopReadyProbe(state);
  const windowKey = options?.windowReadyKey ?? `${appName}App`;
  const notifiedKey = options?.windowReadyKey
    ? `__${appName}ReadyNotified`
    : `__${appName}ReadyNotified`;

  state.readyProbe = setInterval(() => {
    if (!state.browser || state.isReady) {
      stopReadyProbe(state);
      return;
    }
    state.browser.execute(`
      if (window.${windowKey} && !window.__${appName}ReadyNotified) {
        window.__${appName}ReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:${appName}:ready");
        }
      }
    `);
  }, 300);
}

export function flushPending(state: BrowserState): void {
  if (!state.browser || !state.isReady) return;
  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

export function executeInBrowser(state: BrowserState, js: string): void {
  if (!state.browser || !state.isReady) {
    state.pendingActions.push(js);
    return;
  }
  state.browser.execute(js);
}
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

Expected: Keine neuen Fehler (die Datei ist isoliert)

- [ ] **Step 3: Commit**

```bash
git add client_src/shared/browser-manager.ts
git commit -m "refactor(cef): add shared browser-manager utility"
```

---

## Task 2: admin/index.ts migrieren

**Files:**
- Modify: `client_src/admin/index.ts`

- [ ] **Step 1: Import hinzufügen und lokale Interface + Funktionen entfernen**

Füge ganz oben (nach der reference-Zeile) hinzu:
```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche das `AdminState` Interface (Zeilen 14-20):
```typescript
// LÖSCHEN:
interface AdminState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}
```

Ersetze `const state: AdminState = { ... }` durch:
```typescript
const browserState = createBrowserState();
let isOpen = false;
```

- [ ] **Step 2: Lokale Funktionen löschen und Aufrufe ersetzen**

Lösche die Funktionen `flushPending`, `executeAdmin`, `stopReadyProbe`, `startReadyProbe` (ca. Zeilen 99-145).

Ersetze in `ensureBrowser`:
```typescript
function ensureBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://admin/admin.html", active: false });
  startReadyProbe(browserState, "admin");
}
```

Ersetze alle Aufrufe von `executeAdmin(js)` durch `executeInBrowser(browserState, js)`.

Ersetze das `cef:admin:ready` Event:
```typescript
mp.events.add("cef:admin:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
});
```

Ersetze alle `state.browser` Referenzen durch `browserState.browser`, `state.isReady` durch `browserState.isReady`, `state.isOpen` durch `isOpen`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

Expected: Keine neuen Fehler

- [ ] **Step 4: Commit**

```bash
git add client_src/admin/index.ts
git commit -m "refactor(cef): migrate admin to shared browser-manager"
```

---

## Task 3: chat/index.ts migrieren

**Files:**
- Modify: `client_src/chat/index.ts`

- [ ] **Step 1: Import hinzufügen, Interface + Funktionen entfernen**

Füge nach der reference-Zeile hinzu:
```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche `ChatState` Interface und ersetze State:
```typescript
// statt: const state: ChatState = { browser: null, isReady: false, ... }
const browserState = createBrowserState();
let chatOpen = false;
let currentMode = "ic";
let isAuthenticated = false;
```

Lösche `flushPending`, `executeChat`, `stopReadyProbe`, `startReadyProbe` Funktionen.

- [ ] **Step 2: createChatBrowser und Events anpassen**

```typescript
function createChatBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://chat/chat.html", active: true });
  startReadyProbe(browserState, "chat");
}
```

`cef:chat:ready` Event:
```typescript
mp.events.add("cef:chat:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
  executeInBrowser(browserState, `window.chatApp && window.chatApp.setVisible(${JSON.stringify(isAuthenticated)});`);
});
```

Ersetze alle `state.browser` → `browserState.browser`, `state.isReady` → `browserState.isReady`, `state.chatOpen` → `chatOpen`, `state.currentMode` → `currentMode`, `state.isAuthenticated` → `isAuthenticated`.

Ersetze alle `executeChat(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

Expected: Keine neuen Fehler

- [ ] **Step 4: Commit**

```bash
git add client_src/chat/index.ts
git commit -m "refactor(cef): migrate chat to shared browser-manager"
```

---

## Task 4: hud/index.ts migrieren

**Files:**
- Modify: `client_src/hud/index.ts`

- [ ] **Step 1: Import + Interface ersetzen**

Füge Import hinzu (nach reference + ui-theme import):
```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche `HudState` Interface. Ersetze State:
```typescript
const browserState = createBrowserState();
let isAuthenticated = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let speedoInterval: ReturnType<typeof setInterval> | null = null;
```

- [ ] **Step 2: Funktionen und Events anpassen**

Lösche `flushPending`, `executeHud`, `stopReadyProbe`, `startReadyProbe`.

```typescript
function createHudBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://hud/hud.html", active: true });
  startReadyProbe(browserState, "hud");
}
```

`cef:hud:ready`:
```typescript
mp.events.add("cef:hud:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
  // bestehende init-Aufrufe bleiben erhalten
});
```

Ersetze alle `state.X` → lokale Variablen, alle `executeHud(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add client_src/hud/index.ts
git commit -m "refactor(cef): migrate hud to shared browser-manager"
```

---

## Task 5: usermenu/index.ts migrieren

**Files:**
- Modify: `client_src/usermenu/index.ts`

- [ ] **Step 1: Import + Interface ersetzen**

```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche `UsermenuState` Interface. Ersetze State:
```typescript
const browserState = createBrowserState();
let isOpen = false;
let chatInputOpen = false;
let cefInputFocused = false;
```

- [ ] **Step 2: Funktionen und Events anpassen**

Lösche `flushPending`, `executeMenu`, `stopReadyProbe`, `startReadyProbe`.

```typescript
function ensureBrowser() {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://usermenu/usermenu.html", active: false });
  startReadyProbe(browserState, "usermenu");
}
```

`cef:usermenu:ready`:
```typescript
mp.events.add("cef:usermenu:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
});
```

Ersetze alle `state.X` → lokale Variablen, alle `executeMenu(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add client_src/usermenu/index.ts
git commit -m "refactor(cef): migrate usermenu to shared browser-manager"
```

---

## Task 6: orga/index.ts migrieren

**Files:**
- Modify: `client_src/orga/index.ts`

- [ ] **Step 1: Import + Interface ersetzen**

```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche `OrgaState` Interface. Ersetze State:
```typescript
const browserState = createBrowserState();
let isOpen = false;
```

- [ ] **Step 2: Funktionen und Events anpassen**

Lösche `flushPending`, `executeOrga`, `stopReadyProbe`, `startReadyProbe`.

```typescript
function ensureBrowser() {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://orga/orga.html", active: false });
  startReadyProbe(browserState, "orga");
}
```

`cef:orga:ready`:
```typescript
mp.events.add("cef:orga:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
});
```

Ersetze alle `state.X` → lokale Variablen, alle `executeOrga(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add client_src/orga/index.ts
git commit -m "refactor(cef): migrate orga to shared browser-manager"
```

---

## Task 7: phone/index.ts migrieren

**Files:**
- Modify: `client_src/phone/index.ts`

- [ ] **Step 1: Import + Interface ersetzen**

```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Lösche `PhoneState` Interface. Ersetze State:
```typescript
const browserState = createBrowserState();
let isOpen = false;
let chatInputOpen = false;
```

- [ ] **Step 2: Funktionen und Events anpassen**

Lösche `flushPending`, `executePhone`, `stopReadyProbe`, `startReadyProbe`.

Phone nutzt `__lbPhoneReady` statt `phoneApp` — `windowReadyKey` Option verwenden:
```typescript
function ensureBrowser() {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://phone/index.html", active: false });
  startReadyProbe(browserState, "phone", { windowReadyKey: "__lbPhoneReady" });
}
```

`cef:phone:ready`:
```typescript
mp.events.add("cef:phone:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  // bestehende syncPhoneState() bleibt erhalten
});
```

Ersetze alle `state.X` → lokale Variablen, alle `executePhone(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add client_src/phone/index.ts
git commit -m "refactor(cef): migrate phone to shared browser-manager"
```

---

## Task 8: auth/index.ts migrieren

**Files:**
- Modify: `client_src/auth/index.ts`

- [ ] **Step 1: Import + Interface anpassen**

```typescript
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";
```

Auth hat `authBrowser` statt `browser` im State — und zusätzliche Felder. Ersetze:
```typescript
// Lösche aus AuthState: authBrowser, isReady, pendingActions, readyProbe
// Behalte: currentCam, nextCam, authVisible, switchTimer, camState, lastCharactersJson

interface AuthState {
  currentCam: any | null;
  nextCam: any | null;
  authVisible: boolean;
  switchTimer: ReturnType<typeof setInterval> | null;
  camState: number;
  lastCharactersJson: string | null;
}

const browserState = createBrowserState();
const state: AuthState = {
  currentCam: null,
  nextCam: null,
  authVisible: false,
  switchTimer: null,
  camState: 0,
  lastCharactersJson: null
};
```

- [ ] **Step 2: Funktionen anpassen**

Lösche `executeAuth`, `flushPending`, `stopReadyProbe`, `startReadyProbe`.

```typescript
function ensureBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://auth/auth.html", active: true });
  startReadyProbe(browserState, "auth");
}
```

`cef:auth:ready`:
```typescript
mp.events.add("cef:auth:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
});
```

Ersetze alle `state.authBrowser` → `browserState.browser`, `state.isReady` → `browserState.isReady`, alle `executeAuth(js)` → `executeInBrowser(browserState, js)`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add client_src/auth/index.ts
git commit -m "refactor(cef): migrate auth to shared browser-manager"
```

---

## Task 9: inventory/index.ts migrieren und Debug-Logs entfernen

**Files:**
- Modify: `client_src/inventory/index.ts`

- [ ] **Step 1: Komplette Neufassung der Datei**

Inventory hat kein readyProbe und viele Debug-Logs. Die Datei wird auf das Standard-Pattern umgestellt:

```typescript
/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson } from "../ui-theme.js";
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe
} from "../shared/browser-manager.js";

const browserState = createBrowserState();
let inventoryOpen = false;
let pendingOpenData: object | null = null;

const INVENTORY_URL = "package://inventory/inventory.html";

function ensureBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: INVENTORY_URL, active: false });
  startReadyProbe(browserState, "inventory");
}

function toggleInventory(): void {
  const cursorVisible = mp.gui.cursor.visible;
  if (cursorVisible && !inventoryOpen) return;

  inventoryOpen = !inventoryOpen;

  if (inventoryOpen) {
    const charName = String(mp.players.local.getVariable("CHARACTER_NAME") ?? "Unknown Player");
    const health = mp.players.local.getHealth();
    const openData = { name: charName, health, inventory: [] };

    ensureBrowser();

    if (!browserState.isReady) {
      pendingOpenData = openData;
    } else {
      executeInBrowser(browserState, `window.inventoryApp.show(${JSON.stringify(openData)})`);
    }

    mp.events.callRemote("server:inventory:requestUpdate");
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
  } else {
    executeInBrowser(browserState, `window.inventoryApp.hide()`);
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(true);
  }
}

mp.keys.bind(0x49, true, () => {
  toggleInventory();
});

mp.events.add("client:cmd:inv", () => {
  toggleInventory();
});

mp.events.add("client:inventory:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  if (pendingOpenData) {
    executeInBrowser(browserState, `window.inventoryApp.show(${JSON.stringify(pendingOpenData)})`);
    pendingOpenData = null;
  }
});

mp.events.add("client:inventory:close", () => {
  if (inventoryOpen) {
    inventoryOpen = false;
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(true);
  }
});

mp.events.add("client:inventory:useItem", (uid: string) => {
  if (typeof uid !== "string" || uid.length === 0) return;
  mp.events.callRemote("server:inventory:useItem", uid);
});

mp.events.add("client:inventory:moveItem", (uid: string, targetSlot: number) => {
  if (typeof uid !== "string" || uid.length === 0 || !Number.isInteger(targetSlot)) return;
  mp.events.callRemote("server:inventory:moveItem", uid, targetSlot);
});

mp.events.add("client:inventory:update", (inventoryJson: string) => {
  if (inventoryOpen) {
    executeInBrowser(browserState, `window.inventoryApp.updateInventory(${inventoryJson})`);
  }
});

mp.events.add("client:inventory:updateStatus", (health: number) => {
  if (inventoryOpen) {
    executeInBrowser(browserState, `window.inventoryApp.updateStatus(${health})`);
  }
});

mp.events.add("client:inventory:updateEquipState", (uid: string, equipped: boolean) => {
  if (inventoryOpen) {
    executeInBrowser(browserState, `window.inventoryApp.updateEquipState(${JSON.stringify(uid)}, ${JSON.stringify(equipped)})`);
  }
});
```

**Wichtig:** `client:inventory:ready` bleibt als Event-Name (bestehender Server-Code sendet diesen Event). `startReadyProbe` mit `"inventory"` triggert `cef:inventory:ready` — das ist ein ANDERER Event-Name. Das Inventory-CEF sendet `client:inventory:ready` direkt per `mp.trigger`, nicht über das readyProbe-System. Daher: `startReadyProbe` NICHT aufrufen für inventory — stattdessen den `client:inventory:ready` handler wie oben nutzen (ohne readyProbe).

Korrigierte `ensureBrowser` für inventory:
```typescript
function ensureBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: INVENTORY_URL, active: false });
  // Kein startReadyProbe — inventory CEF triggert client:inventory:ready direkt
}
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -30
```

Expected: Keine neuen Fehler

- [ ] **Step 3: Commit**

```bash
git add client_src/inventory/index.ts
git commit -m "refactor(cef): migrate inventory to shared browser-manager, remove debug logs"
```

---

## Task 10: Abschluss — Build-Check aller Module

- [ ] **Step 1: Vollständige TypeScript-Prüfung**

```bash
cd "d:/Rage KI Project/unique/client_src" && npx tsc --noEmit 2>&1 | head -50
```

Expected: Keine neuen Fehler gegenüber Baseline

- [ ] **Step 2: Vite-Build für alle Module prüfen**

```bash
cd "d:/Rage KI Project/unique" && node client_src/build.mjs 2>&1 | tail -30
```

Expected: Alle Module erfolgreich gebaut (admin, auth, chat, hud, usermenu, orga, phone, inventory)

- [ ] **Step 3: Abschluss-Commit wenn nötig**

```bash
git status
# Falls noch unstaged: git add <files> && git commit -m "refactor(cef): finalize browser-manager migration"
```
