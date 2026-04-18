/// <reference path="../ragemp-client.d.ts" />
import {
  createBrowserState,
  ensureBrowserInitialized,
  executeInBrowser,
  markBrowserReady
} from "../shared/browser-manager.js";

const browserState = createBrowserState();
let inventoryOpen = false;
let pendingOpenData: object | null = null;

const INVENTORY_URL = "package://inventory/inventory.html";

function ensureBrowser(): void {
  if (browserState.browser) return;
  ensureBrowserInitialized(browserState, {
    htmlPath: INVENTORY_URL,
    active: false,
    appName: "inventory"
  });
}

function toggleInventory(): void {
  const cursorVisible = mp.gui.cursor.visible;
  mp.gui.chat.push(`!{#F97316}[DEBUG] Inventory Toggle - Cursor: ${cursorVisible}, Open: ${inventoryOpen}`);
  
  if (cursorVisible && !inventoryOpen) {
    mp.gui.chat.push(`!{#F97316}[DEBUG] Toggle blocked: Cursor is visible elsewhere.`);
    return;
  }

  inventoryOpen = !inventoryOpen;

  if (inventoryOpen) {
    const charName = String(mp.players.local.getVariable("CHARACTER_NAME") ?? "Unknown Player");
    const health = mp.players.local.getHealth();
    const openData = { name: charName, health, inventory: [] as unknown[] };

    ensureBrowser();
    browserState.browser!.active = true;

    if (!browserState.isReady) {
      mp.gui.chat.push(`!{#F97316}[DEBUG] Browser not ready - queueing data.`);
      pendingOpenData = openData;
    } else {
      mp.gui.chat.push(`!{#F97316}[DEBUG] Executing browser show.`);
      executeInBrowser(browserState, `window.inventoryApp.show(${JSON.stringify(openData)})`);
    }

    mp.events.callRemote("server:inventory:requestUpdate");
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
  } else {
    executeInBrowser(browserState, `window.inventoryApp.hide()`);
    if (browserState.browser) {
      browserState.browser.active = false;
    }
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

function handleInventoryReady(): void {
  if (!markBrowserReady(browserState)) return;
  if (pendingOpenData) {
    executeInBrowser(browserState, `window.inventoryApp.show(${JSON.stringify(pendingOpenData)})`);
    pendingOpenData = null;
  }
}

mp.events.add("client:inventory:ready", handleInventoryReady);
mp.events.add("cef:inventory:ready", handleInventoryReady);

mp.events.add("client:inventory:close", () => {
  if (inventoryOpen) {
    inventoryOpen = false;
    if (browserState.browser) {
      browserState.browser.active = false;
    }
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
