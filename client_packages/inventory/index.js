(() => {
  // client_src/shared/browser-manager.ts
  function createBrowserState() {
    return {
      browser: null,
      isReady: false,
      pendingActions: [],
      readyProbe: null
    };
  }
  function initBrowser(state, options) {
    if (state.browser) return;
    state.browser = mp.browsers.new(options.htmlPath);
    state.browser.active = options.active ?? false;
  }
  function executeInBrowser(state, js) {
    if (!state.browser || !state.isReady) {
      state.pendingActions.push(js);
      return;
    }
    state.browser.execute(js);
  }

  // client_src/inventory/index.ts
  var browserState = createBrowserState();
  var inventoryOpen = false;
  var pendingOpenData = null;
  var INVENTORY_URL = "package://inventory/inventory.html";
  function ensureBrowser() {
    if (browserState.browser) return;
    initBrowser(browserState, { htmlPath: INVENTORY_URL, active: false });
  }
  function toggleInventory() {
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
  mp.keys.bind(73, true, () => {
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
  mp.events.add("client:inventory:useItem", (uid) => {
    if (typeof uid !== "string" || uid.length === 0) return;
    mp.events.callRemote("server:inventory:useItem", uid);
  });
  mp.events.add("client:inventory:moveItem", (uid, targetSlot) => {
    if (typeof uid !== "string" || uid.length === 0 || !Number.isInteger(targetSlot)) return;
    mp.events.callRemote("server:inventory:moveItem", uid, targetSlot);
  });
  mp.events.add("client:inventory:update", (inventoryJson) => {
    if (inventoryOpen) {
      executeInBrowser(browserState, `window.inventoryApp.updateInventory(${inventoryJson})`);
    }
  });
  mp.events.add("client:inventory:updateStatus", (health) => {
    if (inventoryOpen) {
      executeInBrowser(browserState, `window.inventoryApp.updateStatus(${health})`);
    }
  });
  mp.events.add("client:inventory:updateEquipState", (uid, equipped) => {
    if (inventoryOpen) {
      executeInBrowser(browserState, `window.inventoryApp.updateEquipState(${JSON.stringify(uid)}, ${JSON.stringify(equipped)})`);
    }
  });
})();
