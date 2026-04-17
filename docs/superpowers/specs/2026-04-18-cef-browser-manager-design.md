# CEF Browser-State Refactoring — Design Spec

**Date:** 2026-04-18  
**Scope:** `client_src/` — 8 Module (admin, auth, chat, hud, usermenu, orga, phone, inventory)  
**Approach:** Ansatz A — Shared Utility-Funktionen in `client_src/shared/browser-manager.ts`

---

## Ziel

Das Browser-State-Management-Pattern (~30 Zeilen pro Modul, 8x identisch kopiert) in eine zentrale shared Datei extrahieren. Jedes Modul importiert die Funktionen und behält nur seine app-spezifische Logik lokal.

---

## 1. Neue Datei: client_src/shared/browser-manager.ts

### Typen

```typescript
export type BrowserState = {
  browser: Mp.Browser | null;
  isReady: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
};

export type BrowserInitOptions = {
  htmlPath: string;
  active?: boolean;  // default: false
};

export type ReadyProbeOptions = {
  windowReadyKey?: string;  // default: `${appName}App` — Phone nutzt "__lbPhoneReady"
};
```

### Funktionen

```typescript
export function createBrowserState(): BrowserState
// Gibt { browser: null, isReady: false, pendingActions: [], readyProbe: null } zurück

export function initBrowser(state: BrowserState, options: BrowserInitOptions): void
// Erstellt mp.browsers.new(options.htmlPath), setzt browser.active, ruft startReadyProbe NICHT auf
// (startReadyProbe wird separat vom Modul nach initBrowser aufgerufen)

export function stopReadyProbe(state: BrowserState): void
// clearInterval + null

export function startReadyProbe(state: BrowserState, appName: string, options?: ReadyProbeOptions): void
// 300ms Interval, prüft window[windowReadyKey || `${appName}App`]
// Bei Erfolg: mp.trigger(`cef:${appName}:ready`)

export function flushPending(state: BrowserState): void
// Leert pendingActions queue

export function executeInBrowser(state: BrowserState, js: string): void
// Sofort ausführen oder in pendingActions einreihen
```

### Window-Check Logik

Standardfall (admin, auth, chat, hud, usermenu, orga, inventory):
```javascript
if (window.adminApp && !window.__adminReadyNotified) {
  window.__adminReadyNotified = true;
  mp.trigger("cef:admin:ready");
}
```

Phone-Sonderfall (`windowReadyKey: "__lbPhoneReady"`):
```javascript
if (window.__lbPhoneReady && !window.__lbPhoneReadyNotified) {
  window.__lbPhoneReadyNotified = true;
  mp.trigger("cef:phone:ready");
}
```

---

## 2. Migration der 8 Module

### Muster pro Modul

**Entfernen aus jedem Modul:**
- Lokale `BrowserState`-Interface-Definition (4 Felder)
- `flushPending()` Funktion (~8 Zeilen)
- `execute[AppName]()` Funktion (~6 Zeilen)
- `stopReadyProbe()` Funktion (~5 Zeilen)
- `startReadyProbe()` Funktion (~12 Zeilen)

**Hinzufügen:**
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

**State-Objekt:** `BrowserState` ersetzt die lokale Interface-Definition. App-spezifische Felder (z.B. `isOpen`, `currentMode`) werden als separate lokale Variablen deklariert:

```typescript
// Vorher
const state: AdminState = { browser: null, isReady: false, pendingActions: [], readyProbe: null, isOpen: false };

// Nachher
const browserState = createBrowserState();
let isOpen = false;
```

**Alle Aufrufe umbenennen:**
- `executeAdmin(js)` → `executeInBrowser(browserState, js)`
- `executeChat(js)` → `executeInBrowser(browserState, js)`
- etc. — einheitlicher Name überall

### Modul-spezifische Besonderheiten

| Modul | Besonderheit |
|---|---|
| **admin** | Keine — Standardmigration |
| **auth** | State heißt `authBrowser` statt `browser` — umbenennen auf `browserState` |
| **chat** | Sofortige Browser-Erstellung bei Modulload (nicht auf playerReady warten) |
| **hud** | Keine — Standardmigration |
| **usermenu** | Keine — Standardmigration |
| **orga** | Keine — Standardmigration |
| **phone** | `windowReadyKey: "__lbPhoneReady"` in `startReadyProbe` übergeben |
| **inventory** | Von Grund auf migrieren: `inventoryBrowser` + `isInventoryReady` + `pendingOpenData` → `browserState` + lokale Variablen + readyProbe ergänzen |

### Inventory-Migration im Detail

`inventory/index.ts` hat aktuell kein `readyProbe` und kein `flushPending`. Nach der Migration:

```typescript
const browserState = createBrowserState();
let inventoryOpen = false;
let pendingOpenData: string | null = null;  // bleibt als lokale Variable

// Ready-Event (neu):
mp.events.add("client:inventory:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  if (pendingOpenData) {
    executeInBrowser(browserState, `window.inventoryApp && window.inventoryApp.open(${pendingOpenData})`);
    pendingOpenData = null;
  }
});
```

---

## 3. Nicht in Scope

- `interaction/index.ts` — zu komplex, separates Refactoring
- CEF-Frontend-Code (Vue/React in `Unique/ClientFrontend/src/`) — nicht berührt
- Build-Pipeline ändern — Vite-Config bleibt unverändert
- Modul-spezifische Logik (Keybinds, Events, State-Sync) — bleibt in den Modulen

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

## Erwartetes Ergebnis

- ~250 Zeilen duplizierten Code eliminiert
- Einheitlicher Funktionsname `executeInBrowser` überall statt 8 verschiedener Namen
- `inventory` folgt jetzt dem gleichen Pattern wie alle anderen Module
- `phone` nutzt `windowReadyKey` Option statt eigenem Code
