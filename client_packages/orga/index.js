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

  // client_src/orga/index.ts
  var browserState = createBrowserState();
  var isOpen = false;
  var KEY_F6 = 117;
  function getFactionId() {
    try {
      return Number(mp.players.local.getVariable("FACTION_ID") ?? 0);
    } catch (error) {
      return 0;
    }
  }
  function ensureBrowser() {
    if (browserState.browser) return;
    ensureBrowserInitialized(browserState, {
      htmlPath: "package://orga/orga.html",
      active: false,
      appName: "orga"
    });
  }
  function closeMenu() {
    if (!browserState.browser) {
      return;
    }
    isOpen = false;
    browserState.browser.active = false;
    mp.gui.cursor.show(false, false);
    mp.events.call("client:chat:authState", true);
    mp.events.call("client:hud:authState", true);
    executeInBrowser(browserState, "window.orgaApp && window.orgaApp.close();");
  }
  function openMenu() {
    if (getFactionId() <= 0) {
      return;
    }
    ensureBrowser();
    isOpen = true;
    browserState.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    mp.events.callRemote("server:orga:open");
  }
  mp.events.add("playerReady", () => {
    ensureBrowser();
  });
  mp.events.add("client:orga:requestOpen", () => {
    openMenu();
  });
  mp.events.add("cef:orga:ready", () => {
    markBrowserReady(browserState);
  });
  mp.events.add("client:orga:open", (...args) => {
    const [payload] = args;
    ensureBrowser();
    isOpen = true;
    browserState.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    executeInBrowser(browserState, `window.orgaApp && window.orgaApp.open(${JSON.stringify(payload || "{}")});`);
  });
  mp.events.add("cef:orga:close", () => {
    closeMenu();
  });
  mp.events.add("client:orga:setCatalog", (rawCatalog) => {
    executeInBrowser(browserState, `window.orgaApp && window.orgaApp.setCatalog(${JSON.stringify(rawCatalog)});`);
  });
  mp.events.add("client:orga:updateVehicles", (rawVehicles, newBalance) => {
    executeInBrowser(browserState, `window.orgaApp && window.orgaApp.updateVehicles(${JSON.stringify(rawVehicles)}, ${newBalance});`);
  });
  mp.events.add("client:orga:updateVehiclesOnly", (rawVehicles) => {
    executeInBrowser(browserState, `window.orgaApp && window.orgaApp.updateVehiclesOnly(${JSON.stringify(rawVehicles)});`);
  });
  mp.events.add("cef:orga:setRank", (...args) => {
    const [accountId, rankLevel] = args;
    mp.events.callRemote("server:orga:setMemberRank", accountId, rankLevel);
  });
  mp.events.add("cef:orga:setRankName", (...args) => {
    const [rankLevel, rankName] = args;
    mp.events.callRemote("server:orga:setRankName", rankLevel, rankName);
  });
  mp.events.add("cef:orga:setRankPermission", (...args) => {
    const [rankLevel, permissionKey, granted] = args;
    mp.events.callRemote("server:orga:setRankPermission", rankLevel, permissionKey, granted);
  });
  mp.events.add("cef:orga:parkVehicle", () => {
    mp.events.callRemote("server:orga:parkCurrentVehicle");
  });
  mp.events.add("cef:orga:setVehicleRank", (...args) => {
    const [factionVehicleId, minRankLevel] = args;
    mp.events.callRemote("server:orga:setVehicleRank", factionVehicleId, minRankLevel);
  });
  mp.events.add("cef:orga:createOutfit", (...args) => {
    const [category, name, clothingJson] = args;
    mp.events.callRemote("server:orga:createOutfit", category, name, clothingJson);
  });
  mp.events.add("cef:orga:deleteOutfit", (...args) => {
    const [outfitId] = args;
    mp.events.callRemote("server:orga:deleteOutfit", outfitId);
  });
  mp.events.add("cef:orga:createVehicle", (...args) => {
    const [minRankLevel, modelName, displayName] = args;
    mp.events.callRemote("server:orga:createVehicle", minRankLevel, modelName, displayName);
  });
  mp.events.add("cef:orga:deleteVehicle", (...args) => {
    const [factionVehicleId] = args;
    mp.events.callRemote("server:orga:deleteVehicle", factionVehicleId);
  });
  mp.events.add("server:orga:buyVehicle", (catalogId) => {
    mp.events.callRemote("server:orga:buyVehicle", catalogId);
  });
  mp.events.add("server:orga:spawnVehicle", (factionVehicleId) => {
    mp.events.callRemote("server:orga:spawnVehicle", factionVehicleId);
  });
  mp.events.add("server:orga:parkVehicle", (factionVehicleId) => {
    mp.events.callRemote("server:orga:parkVehicle", factionVehicleId);
  });
  mp.events.add("server:orga:getCatalog", () => {
    mp.events.callRemote("server:orga:getCatalog");
  });
  mp.keys.bind(KEY_F6, true, () => {
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });
  mp.keys.bind(27, true, () => {
    if (isOpen) {
      closeMenu();
    }
  });
  mp.events.add("render", () => {
    if (isOpen && getFactionId() <= 0) {
      closeMenu();
    }
  });
})();
