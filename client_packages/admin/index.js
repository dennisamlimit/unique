(() => {
  // client_src/admin/index.ts
  var state = {
    browser: null,
    isReady: false,
    isOpen: false,
    pendingActions: [],
    readyProbe: null
  };
  var KEY_F3 = 114;
  function getAdminLevel() {
    try {
      const level = mp.players.local.getVariable("ADMIN_LEVEL");
      return Number.isFinite(level) ? level : 0;
    } catch (error) {
      return 0;
    }
  }
  function isAdminModeEnabled() {
    try {
      return !!mp.players.local.getVariable("ADMIN_MODE");
    } catch (error) {
      return false;
    }
  }
  function readPlayerVariable(player, key, fallback) {
    try {
      const value = player.getVariable(key);
      return value === void 0 || value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }
  function collectPlayers() {
    const players = [];
    try {
      if (typeof mp.players.forEach === "function") {
        mp.players.forEach((player) => {
          players.push(player);
        });
      }
    } catch (error) {
    }
    if (players.length === 0) {
      players.push(mp.players.local);
    }
    return players.map((player) => {
      const serverId = Number.isFinite(player.remoteId) ? player.remoteId : Number.isFinite(player.id) ? player.id : 0;
      const accountId = Number(readPlayerVariable(player, "ACCOUNT_ID", 0)) || 0;
      const adminLevel = Number(readPlayerVariable(player, "ADMIN_LEVEL", 0)) || 0;
      return {
        name: player.name || String(readPlayerVariable(player, "DISPLAY_NAME", "Unbekannt")),
        serverId,
        playerId: serverId + 1,
        accountId,
        adminLevel,
        adminMode: !!readPlayerVariable(player, "ADMIN_MODE", false)
      };
    });
  }
  function flushPending() {
    if (!state.browser || !state.isReady) {
      return;
    }
    while (state.pendingActions.length > 0) {
      state.browser.execute(state.pendingActions.shift());
    }
  }
  function executeAdmin(js) {
    if (!state.browser || !state.isReady) {
      state.pendingActions.push(js);
      return;
    }
    state.browser.execute(js);
  }
  function stopReadyProbe() {
    if (!state.readyProbe) {
      return;
    }
    clearInterval(state.readyProbe);
    state.readyProbe = null;
  }
  function startReadyProbe() {
    stopReadyProbe();
    state.readyProbe = setInterval(() => {
      if (!state.browser || state.isReady) {
        stopReadyProbe();
        return;
      }
      state.browser.execute(`
      if (window.adminApp && !window.__adminReadyNotified) {
        window.__adminReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:admin:ready");
        }
      }
    `);
    }, 300);
  }
  function ensureBrowser() {
    if (state.browser) {
      return;
    }
    state.browser = mp.browsers.new("package://admin/admin.html");
    state.browser.active = false;
    startReadyProbe();
  }
  function closeAdminMenu() {
    if (!state.browser) {
      return;
    }
    state.isOpen = false;
    state.browser.active = false;
    mp.gui.cursor.show(false, false);
    mp.events.call("client:chat:authState", true);
    mp.events.call("client:hud:authState", true);
    executeAdmin("window.adminApp && window.adminApp.close();");
  }
  function openAdminMenu() {
    const level = getAdminLevel();
    if (level <= 0 || !isAdminModeEnabled()) {
      return;
    }
    ensureBrowser();
    state.isOpen = true;
    state.browser.active = true;
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    mp.gui.cursor.show(true, true);
    executeAdmin(`window.adminApp && window.adminApp.open(${JSON.stringify(level)}, ${JSON.stringify(collectPlayers())});`);
    mp.events.callRemote("server:admin:requestFactionData");
    mp.events.callRemote("server:admin:getCommandList");
    if (level >= 5) {
      mp.events.callRemote("server:admin:requestLogs");
    }
  }
  function toggleAdminMenu() {
    if (state.isOpen) {
      closeAdminMenu();
      return;
    }
    openAdminMenu();
  }
  mp.events.add("playerReady", () => {
    ensureBrowser();
  });
  mp.events.add("cef:admin:ready", () => {
    if (state.isReady) {
      return;
    }
    state.isReady = true;
    stopReadyProbe();
    flushPending();
  });
  mp.keys.bind(KEY_F3, true, () => {
    toggleAdminMenu();
  });
  mp.events.add("cef:admin:close", () => {
    closeAdminMenu();
  });
  mp.events.add("render", () => {
    if (state.isOpen && (!isAdminModeEnabled() || getAdminLevel() <= 0)) {
      closeAdminMenu();
    }
  });
  mp.events.add("client:admin:setFactions", (...args) => {
    const [payload] = args;
    executeAdmin(`window.adminApp && window.adminApp.setFactions(${JSON.stringify(payload || "[]")});`);
  });
  mp.events.add("client:admin:receiveCommands", (payload) => {
    executeAdmin(`window.adminApp && window.adminApp.setCommands(${JSON.stringify(payload)});`);
  });
  mp.events.add("client:admin:receiveLogs", (payload) => {
    executeAdmin(`window.adminApp && window.adminApp.setLogs(${JSON.stringify(payload)});`);
  });
  mp.events.add("cef:admin:createFaction", (...args) => {
    const [type, shortName, name, colorHex, mapIconId] = args;
    mp.events.callRemote("server:admin:createFaction", type, shortName, name, colorHex, mapIconId);
  });
  mp.events.add("cef:admin:setFactionLeader", (...args) => {
    const [accountId, factionId] = args;
    mp.events.callRemote("server:admin:setFactionLeader", accountId, factionId);
  });
  mp.events.add("cef:admin:setFactionSpawn", (...args) => {
    const [factionId] = args;
    mp.events.callRemote("server:admin:setFactionSpawn", factionId);
  });
  mp.events.add("cef:admin:addFactionWardrobe", (...args) => {
    const [factionId, label] = args;
    mp.events.callRemote("server:admin:addFactionWardrobe", factionId, label);
  });
  mp.events.add("cef:admin:createFactionVehicle", (...args) => {
    const [factionId, minRankLevel, modelName, displayName] = args;
    mp.events.callRemote("server:admin:createFactionVehicle", factionId, minRankLevel, modelName, displayName);
  });
  mp.events.add("cef:admin:syncFactionDefaults", (...args) => {
    const [target] = args;
    mp.events.callRemote("server:admin:syncFactionDefaults", target);
  });
  mp.events.add("cef:admin:updateCommandLevel", (commandId, level) => {
    mp.events.callRemote("server:admin:updateCommandLevel", commandId, level);
  });
  mp.events.add("cef:admin:requestLogs", () => {
    mp.events.callRemote("server:admin:requestLogs");
  });
})();
