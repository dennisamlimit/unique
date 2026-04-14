(() => {
  // client_src/ui-theme.ts
  var DEFAULT_UI_THEME = {
    primary: "#D946EF",
    secondary: "#A855F7",
    surface: "#0F0A17",
    surfaceAlt: "#171020",
    border: "#C084FC",
    text: "#FFFFFF",
    muted: "#A1A1AA",
    danger: "#FB7185",
    success: "#34D399",
    warning: "#FBBF24"
  };
  function normalizeHex(value, fallback) {
    const input = String(value ?? "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(input) ? input.toUpperCase() : fallback;
  }
  function normalizeUiTheme(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      primary: normalizeHex(source.primary, DEFAULT_UI_THEME.primary),
      secondary: normalizeHex(source.secondary, DEFAULT_UI_THEME.secondary),
      surface: normalizeHex(source.surface, DEFAULT_UI_THEME.surface),
      surfaceAlt: normalizeHex(source.surfaceAlt, DEFAULT_UI_THEME.surfaceAlt),
      border: normalizeHex(source.border, DEFAULT_UI_THEME.border),
      text: normalizeHex(source.text, DEFAULT_UI_THEME.text),
      muted: normalizeHex(source.muted, DEFAULT_UI_THEME.muted),
      danger: normalizeHex(source.danger, DEFAULT_UI_THEME.danger),
      success: normalizeHex(source.success, DEFAULT_UI_THEME.success),
      warning: normalizeHex(source.warning, DEFAULT_UI_THEME.warning)
    };
  }
  var currentTheme = DEFAULT_UI_THEME;
  function loadUiTheme() {
    var _a;
    try {
      const stored = (_a = mp.storage.data) == null ? void 0 : _a.uniqueUiTheme;
      currentTheme = normalizeUiTheme(stored);
    } catch {
      currentTheme = DEFAULT_UI_THEME;
    }
    return currentTheme;
  }
  function getUiThemeJson() {
    return JSON.stringify(currentTheme);
  }

  // client_src/admin/index.ts
  var state = {
    browser: null,
    isReady: false,
    isOpen: false,
    pendingActions: [],
    readyProbe: null
  };
  var KEY_F3 = 114;
  loadUiTheme();
  function pushTheme() {
    executeAdmin(`window.adminApp && window.adminApp.setTheme(${getUiThemeJson()});`);
  }
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
    const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
    if (level <= 0 || !isAdminModeEnabled()) {
      return;
    }
    openAdminMenuForced(level, accountId);
  }
  function openAdminMenuForced(level = getAdminLevel(), accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0)) {
    if (level <= 0) {
      return;
    }
    ensureBrowser();
    state.isOpen = true;
    state.browser.active = true;
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    mp.gui.cursor.show(true, true);
    executeAdmin(`window.adminApp && window.adminApp.open(${JSON.stringify(level)}, ${JSON.stringify(accountId)}, ${JSON.stringify(collectPlayers())});`);
    pushTheme();
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
    pushTheme();
  });
  mp.events.add("client:uiTheme:sync", () => {
    pushTheme();
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
  mp.events.add("client:admin:setTickets", (payload) => {
    executeAdmin(`window.adminApp && window.adminApp.setTickets(${JSON.stringify(payload)});`);
  });
  mp.events.add("client:admin:setTicketPlayerHistory", (payload) => {
    executeAdmin(`window.adminApp && window.adminApp.setTicketPlayerHistory(${JSON.stringify(payload)});`);
  });
  mp.events.add("client:admin:setTicketInsight", (payload) => {
    executeAdmin(`window.adminApp && window.adminApp.setTicketInsight(${JSON.stringify(payload)});`);
  });
  mp.events.add("client:admin:showTicketHistory", (accountId) => {
    openAdminMenuForced();
    executeAdmin(`window.adminApp && window.adminApp.showTicketHistory(${JSON.stringify(Number(accountId) || 0)});`);
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
  mp.events.add("cef:admin:requestTickets", () => {
    mp.events.callRemote("server:admin:tickets:request");
  });
  mp.events.add("cef:admin:ticketClaim", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:claim", ticketId);
  });
  mp.events.add("cef:admin:ticketReply", (ticketId, message, forceReply) => {
    mp.events.callRemote("server:admin:tickets:reply", ticketId, message, !!forceReply);
  });
  mp.events.add("cef:admin:ticketStatus", (ticketId, status) => {
    mp.events.callRemote("server:admin:tickets:status", ticketId, status);
  });
  mp.events.add("cef:admin:ticketPriority", (ticketId, priority) => {
    mp.events.callRemote("server:admin:tickets:priority", ticketId, priority);
  });
  mp.events.add("cef:admin:ticketAddParticipant", (ticketId, accountId) => {
    mp.events.callRemote("server:admin:tickets:addParticipant", ticketId, accountId);
  });
  mp.events.add("cef:admin:ticketRequestAdvice", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:requestAdvice", ticketId);
  });
  mp.events.add("cef:admin:ticketGoto", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:goto", ticketId);
  });
  mp.events.add("cef:admin:ticketGetHere", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:gethere", ticketId);
  });
  mp.events.add("cef:admin:ticketCharacterInfo", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:characterInfo", ticketId);
  });
  mp.events.add("cef:admin:ticketWarnings", (ticketId) => {
    mp.events.callRemote("server:admin:tickets:warnings", ticketId);
  });
  mp.events.add("cef:admin:ticketHistory", (accountId) => {
    mp.events.callRemote("server:admin:tickets:history", accountId);
  });
})();
