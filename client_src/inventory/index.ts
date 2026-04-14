/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme } from "../ui-theme";

interface InventoryState {
  browser: Mp.Browser | null;
  ready: boolean;
  open: boolean;
  payloadJson: string;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const inventoryState: InventoryState = {
  browser: null,
  ready: false,
  open: false,
  payloadJson: "{\"containers\":[],\"items\":[]}",
  pendingActions: [],
  readyProbe: null
};
loadUiTheme();

function pushTheme(): void {
  executeInventory(`window.inventoryApp && window.inventoryApp.setTheme(${getUiThemeJson()});`);
}

const KEY_I = 0x49;

function ensureInventoryBrowser(): void {
  if (inventoryState.browser) {
    return;
  }

  inventoryState.browser = mp.browsers.new("package://inventory/inventory.html");
  inventoryState.browser.active = false;
  startInventoryReadyProbe();
}

function startInventoryReadyProbe(): void {
  if (inventoryState.readyProbe) {
    clearInterval(inventoryState.readyProbe);
  }

  inventoryState.readyProbe = setInterval(() => {
    if (!inventoryState.browser || inventoryState.ready) {
      clearInterval(inventoryState.readyProbe!);
      inventoryState.readyProbe = null;
      return;
    }

    inventoryState.browser.execute(`
      if (window.inventoryApp && !window.__inventoryReadyNotified) {
        window.__inventoryReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:inventory:ready");
        }
      }
    `);
  }, 300);
}

function executeInventory(js: string): void {
  if (!inventoryState.browser || !inventoryState.ready) {
    inventoryState.pendingActions.push(js);
    return;
  }

  inventoryState.browser.execute(js);
}

function flushInventoryPending(): void {
  if (!inventoryState.browser || !inventoryState.ready) {
    return;
  }

  while (inventoryState.pendingActions.length > 0) {
    inventoryState.browser.execute(inventoryState.pendingActions.shift()!);
  }
}

function showNotify(message: string): void {
  try {
    mp.game.graphics.notify(message);
  } catch (error) {
    // Optional sugar only.
  }
}

function isLoggedIn(): boolean {
  try {
    return !!mp.players.local.getVariable("LOGGED_IN");
  } catch (error) {
    return false;
  }
}

function isInventoryBlocked(): boolean {
  if (!isLoggedIn() || mp.gui.cursor.visible) {
    return true;
  }

  try {
    return !!mp.game.ui.isPauseMenuActive();
  } catch (error) {
    return false;
  }
}

function openInventory(): void {
  if (isInventoryBlocked()) {
    return;
  }

  ensureInventoryBrowser();
  inventoryState.open = true;
  inventoryState.browser!.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.callRemote("server:inventory:request");
  executeInventory(`window.inventoryApp && window.inventoryApp.open(${JSON.stringify(inventoryState.payloadJson)});`);
}

function closeInventory(): void {
  if (!inventoryState.browser) {
    return;
  }

  inventoryState.open = false;
  inventoryState.browser.active = false;
  mp.gui.cursor.show(false, false);
  executeInventory("window.inventoryApp && window.inventoryApp.close();");
}

function toggleInventory(): void {
  if (inventoryState.open) {
    closeInventory();
    return;
  }

  openInventory();
}

mp.events.add("cef:inventory:ready", () => {
  inventoryState.ready = true;
  flushInventoryPending();
  pushTheme();
});

mp.events.add("client:uiTheme:sync", () => {
  pushTheme();
});

mp.events.add("cef:inventory:close", () => {
  closeInventory();
});

mp.events.add("cef:inventory:action", (...args: unknown[]) => {
  const [payloadJson] = args as [string];
  mp.events.callRemote("server:inventory:action", String(payloadJson ?? "{}"));
});

mp.events.add("client:inventory:set", (...args: unknown[]) => {
  const [payloadJson] = args as [string];
  inventoryState.payloadJson = typeof payloadJson === "string" ? payloadJson : "{\"containers\":[],\"items\":[]}";
  executeInventory(`window.inventoryApp && window.inventoryApp.setState(${JSON.stringify(inventoryState.payloadJson)});`);
});

mp.events.add("client:inventory:notify", (...args: unknown[]) => {
  const [message] = args as [string];
  if (typeof message === "string" && message) {
    showNotify(message);
    executeInventory(`window.inventoryApp && window.inventoryApp.notify(${JSON.stringify(message)});`);
  }
});

mp.keys.bind(KEY_I, true, () => {
  toggleInventory();
});

mp.keys.bind(0x1B, true, () => {
  if (inventoryState.open) {
    closeInventory();
  }
});

export {};
