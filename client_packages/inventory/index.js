(() => {
  // client_src/inventory/index.ts
  var inventoryOpen = false;
  var inventoryBrowser = null;
  var isInventoryReady = false;
  var pendingOpenData = null;
  var INVENTORY_URL = "package://inventory/inventory.html";
  mp.gui.chat.push("!{#EAB308}V1: Inventory Script geladen.");
  function toggleInventory() {
    const cursorVisible = mp.gui.cursor.visible;
    mp.gui.chat.push(`!{#EAB308}[DEBUG] toggleInventory: open=${inventoryOpen}, cursor=${cursorVisible}`);
    inventoryOpen = !inventoryOpen;
    mp.gui.chat.push(`!{#EAB308}[DEBUG] Neuer Status: ${inventoryOpen}`);
    if (inventoryOpen) {
      const charName = mp.players.local.getVariable("CHARACTER_NAME") || "Unknown Player";
      const health = mp.players.local.getHealth();
      mp.gui.chat.push(`!{#EAB308}[DEBUG] Char: ${charName}, Health: ${health}`);
      const openData = {
        name: charName,
        health,
        inventory: []
      };
      if (!inventoryBrowser) {
        mp.gui.chat.push("!{#EAB308}[DEBUG] Erstelle Browser...");
        mp.gui.chat.push(`!{#EAB308}[DEBUG] URL: ${INVENTORY_URL}`);
        inventoryBrowser = mp.browsers.new(INVENTORY_URL);
        if (!inventoryBrowser) {
          mp.gui.chat.push("!{#EF4444}[CRITICAL] Browser konnte NICHT erstellt werden!");
        } else {
          inventoryBrowser.active = true;
          inventoryBrowser.order = 255;
          mp.gui.chat.push("!{#22C55E}[DEBUG] Browser-Objekt erstellt (Active=true, Order=255)");
        }
        isInventoryReady = false;
        pendingOpenData = openData;
      } else if (!isInventoryReady) {
        mp.gui.chat.push("!{#EAB308}[DEBUG] Browser l\xE4dt noch, Daten geparkt.");
        pendingOpenData = openData;
      } else {
        mp.gui.chat.push("!{#EAB308}[DEBUG] Rufe .show im Browser auf.");
        inventoryBrowser.execute(`window.inventoryApp.show(${JSON.stringify(openData)})`);
      }
      mp.events.callRemote("server:inventory:requestUpdate");
      mp.gui.cursor.show(true, true);
      mp.game.ui.displayRadar(false);
    } else {
      if (inventoryBrowser && isInventoryReady) {
        inventoryBrowser.execute(`window.inventoryApp.hide()`);
      }
      mp.gui.cursor.show(false, false);
      mp.game.ui.displayRadar(true);
    }
  }
  mp.gui.chat.push("!{#EAB308}[DEBUG] Binde Taste 'I'.");
  mp.keys.bind(73, true, () => {
    mp.gui.chat.push("!{#EAB308}[DEBUG] Taste 'I' gedr\xFCckt.");
    toggleInventory();
  });
  mp.events.add("client:cmd:inv", () => {
    mp.gui.chat.push("!{#EAB308}[DEBUG] Kommando /inv aufgerufen.");
    toggleInventory();
  });
  mp.events.add("client:inventory:ready", () => {
    mp.gui.chat.push("!{#22C55E}[DEBUG] CEF Inventory Ready!");
    isInventoryReady = true;
    if (inventoryBrowser && pendingOpenData) {
      mp.gui.chat.push("!{#EAB308}[DEBUG] F\xFChre geparktes .show aus.");
      inventoryBrowser.execute(`window.inventoryApp.show(${JSON.stringify(pendingOpenData)})`);
      pendingOpenData = null;
    }
  });
  mp.events.add("client:inventory:close", () => {
    mp.gui.chat.push("!{#EAB308}[DEBUG] CEF Event: close");
    if (inventoryOpen) {
      inventoryOpen = false;
      mp.gui.cursor.show(false, false);
      mp.game.ui.displayRadar(true);
    }
  });
  mp.events.add("client:inventory:useItem", (uid) => {
    if (typeof uid !== "string" || uid.length === 0) {
      return;
    }
    mp.events.callRemote("server:inventory:useItem", uid);
  });
  mp.events.add("client:inventory:moveItem", (uid, targetSlot) => {
    if (typeof uid !== "string" || uid.length === 0 || !Number.isInteger(targetSlot)) {
      return;
    }
    mp.events.callRemote("server:inventory:moveItem", uid, targetSlot);
  });
  mp.events.add("client:inventory:update", (inventoryJson) => {
    if (inventoryBrowser && inventoryOpen) {
      inventoryBrowser.execute(`window.inventoryApp.updateInventory(${inventoryJson})`);
    }
  });
  mp.events.add("client:inventory:updateStatus", (health) => {
    if (inventoryBrowser && inventoryOpen) {
      inventoryBrowser.execute(`window.inventoryApp.updateStatus(${health})`);
    }
  });
  mp.events.add("client:inventory:updateEquipState", (uid, equipped) => {
    if (inventoryBrowser && inventoryOpen) {
      inventoryBrowser.execute(`window.inventoryApp.updateEquipState(${JSON.stringify(uid)}, ${JSON.stringify(equipped)})`);
    }
  });
})();
