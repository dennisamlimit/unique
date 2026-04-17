/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson } from "../ui-theme.js";
import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending
} from "../shared/browser-manager.js";

const browserState = createBrowserState();
let inventoryOpen = false;
let pendingOpenData: object | null = null;

const INVENTORY_URL = "package://inventory/inventory.html";

function ensureBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: INVENTORY_URL, active: false });
  // Kein startReadyProbe — inventory CEF triggert client:inventory:ready direkt
}

function toggleInventory(): void {
  const cursorVisible = mp.gui.cursor.visible;
  if (cursorVisible && !inventoryOpen) return;

  inventoryOpen = !inventoryOpen;

  if (inventoryOpen) {
    const charName = String(mp.players.local.getVariable("CHARACTER_NAME") ?? "Unknown Player");
    const health = mp.players.local.getHealth();
    const openData = { name: charName, health, inventory: [] as unknown[] };

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
