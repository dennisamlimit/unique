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
  function ensureBrowserInitialized(state, options) {
    initBrowser(state, options);
    if (options.appName && options.readyProbe !== false) {
      startReadyProbe(state, options.appName, options.readyProbe || void 0);
    }
    return state.browser;
  }
  function stopReadyProbe(state) {
    if (!state.readyProbe) return;
    clearInterval(state.readyProbe);
    state.readyProbe = null;
  }
  function startReadyProbe(state, appName, options) {
    stopReadyProbe(state);
    const windowKey = (options == null ? void 0 : options.windowReadyKey) ?? `${appName}App`;
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
  function flushPending(state) {
    if (!state.browser || !state.isReady) return;
    while (state.pendingActions.length > 0) {
      state.browser.execute(state.pendingActions.shift());
    }
  }
  function markBrowserReady(state) {
    if (state.isReady) {
      return false;
    }
    state.isReady = true;
    stopReadyProbe(state);
    flushPending(state);
    return true;
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
    ensureBrowserInitialized(browserState, {
      htmlPath: INVENTORY_URL,
      active: false,
      appName: "inventory"
    });
  }
  function toggleInventory() {
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
      const openData = { name: charName, health, inventory: [] };
      ensureBrowser();
      browserState.browser.active = true;
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
  mp.keys.bind(73, true, () => {
    toggleInventory();
  });
  mp.events.add("client:cmd:inv", () => {
    toggleInventory();
  });
  function handleInventoryReady() {
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
