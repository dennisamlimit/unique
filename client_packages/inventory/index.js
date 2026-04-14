(() => {
  const inventoryState = {
    browser: null,
    ready: false,
    open: false,
    payloadJson: '{"containers":[],"items":[]}',
    pendingActions: [],
    readyProbe: null
  };
  const KEY_I = 73;
  function ensureInventoryBrowser() {
    if (inventoryState.browser) {
      return;
    }
    inventoryState.browser = mp.browsers.new("package://inventory/inventory.html");
    inventoryState.browser.active = false;
    startInventoryReadyProbe();
  }
  function startInventoryReadyProbe() {
    if (inventoryState.readyProbe) {
      clearInterval(inventoryState.readyProbe);
    }
    inventoryState.readyProbe = setInterval(() => {
      if (!inventoryState.browser || inventoryState.ready) {
        clearInterval(inventoryState.readyProbe);
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
  function executeInventory(js) {
    if (!inventoryState.browser || !inventoryState.ready) {
      inventoryState.pendingActions.push(js);
      return;
    }
    inventoryState.browser.execute(js);
  }
  function flushInventoryPending() {
    if (!inventoryState.browser || !inventoryState.ready) {
      return;
    }
    while (inventoryState.pendingActions.length > 0) {
      inventoryState.browser.execute(inventoryState.pendingActions.shift());
    }
  }
  function showNotify(message) {
    try {
      mp.game.graphics.notify(message);
    } catch (error) {
    }
  }
  function isLoggedIn() {
    try {
      return !!mp.players.local.getVariable("LOGGED_IN");
    } catch (error) {
      return false;
    }
  }
  function isInventoryBlocked() {
    if (!isLoggedIn() || mp.gui.cursor.visible) {
      return true;
    }
    try {
      return !!mp.game.ui.isPauseMenuActive();
    } catch (error) {
      return false;
    }
  }
  function openInventory() {
    if (isInventoryBlocked()) {
      return;
    }
    ensureInventoryBrowser();
    inventoryState.open = true;
    inventoryState.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.callRemote("server:inventory:request");
    executeInventory(`window.inventoryApp && window.inventoryApp.open(${JSON.stringify(inventoryState.payloadJson)});`);
  }
  function closeInventory() {
    if (!inventoryState.browser) {
      return;
    }
    inventoryState.open = false;
    inventoryState.browser.active = false;
    mp.gui.cursor.show(false, false);
    executeInventory("window.inventoryApp && window.inventoryApp.close();");
  }
  function toggleInventory() {
    if (inventoryState.open) {
      closeInventory();
      return;
    }
    openInventory();
  }
  mp.events.add("cef:inventory:ready", () => {
    inventoryState.ready = true;
    flushInventoryPending();
  });
  mp.events.add("cef:inventory:close", () => {
    closeInventory();
  });
  mp.events.add("cef:inventory:action", (...args) => {
    const [payloadJson] = args;
    mp.events.callRemote("server:inventory:action", String(payloadJson ?? "{}"));
  });
  mp.events.add("client:inventory:set", (...args) => {
    const [payloadJson] = args;
    inventoryState.payloadJson = typeof payloadJson === "string" ? payloadJson : '{"containers":[],"items":[]}';
    executeInventory(`window.inventoryApp && window.inventoryApp.setState(${JSON.stringify(inventoryState.payloadJson)});`);
  });
  mp.events.add("client:inventory:notify", (...args) => {
    const [message] = args;
    if (typeof message === "string" && message) {
      showNotify(message);
      executeInventory(`window.inventoryApp && window.inventoryApp.notify(${JSON.stringify(message)});`);
    }
  });
  mp.keys.bind(KEY_I, true, () => {
    toggleInventory();
  });
  mp.keys.bind(27, true, () => {
    if (inventoryState.open) {
      closeInventory();
    }
  });
})();
