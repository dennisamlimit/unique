(() => {
  // client_src/ui-theme.ts
  var DEFAULT_UI_THEME = {
    primary: "#D946EF",
    secondary: "#A855F7",
    chat: "#D946EF",
    money: "#D946EF",
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
      chat: normalizeHex(source.chat, DEFAULT_UI_THEME.chat),
      money: normalizeHex(source.money, DEFAULT_UI_THEME.money),
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
    loadUiTheme();
    return JSON.stringify(currentTheme);
  }

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

  // client_src/hud/index.ts
  var browserState = createBrowserState();
  var isAuthenticated = false;
  var tickInterval = null;
  var speedoInterval = null;
  loadUiTheme();
  function pushTheme() {
    executeInBrowser(browserState, `window.hudApp && window.hudApp.setTheme(${getUiThemeJson()});`);
  }
  function createHudBrowser() {
    if (browserState.browser) return;
    ensureBrowserInitialized(browserState, {
      htmlPath: "package://hud/hud.html",
      active: true,
      appName: "hud"
    });
  }
  function getHeadingLabel(heading) {
    if (heading < 45 || heading >= 315) return "N";
    if (heading < 135) return "W";
    if (heading < 225) return "S";
    return "E";
  }
  function getOnlineCount() {
    try {
      return mp.players.length || 1;
    } catch (error) {
      return 1;
    }
  }
  function getAccountId() {
    try {
      const value = mp.players.local.getVariable("ACCOUNT_ID");
      return Number.isFinite(value) && value > 0 ? value : 1;
    } catch (error) {
      return 1;
    }
  }
  function getCashValue() {
    try {
      const value = mp.players.local.getVariable("CASH");
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }
  function getBankCashValue() {
    try {
      const value = mp.players.local.getVariable("BANK_CASH");
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }
  function hideNativeHudParts() {
    if (!isAuthenticated) {
      return;
    }
    try {
      if (mp.game.audio) {
        mp.game.audio.setRadioToStationName("OFF");
        mp.game.audio.setUserRadioControlEnabled(false);
        mp.game.audio.setMobileRadioEnabledDuringExitedVehicles(false);
      }
      mp.game.invoke("0x4CA036C0F08B9364", "OFF");
      mp.game.invoke("0x19F21E63AE6EBB4D", false);
    } catch (e) {
    }
    mp.game.controls.disableControlAction(0, 37, true);
    mp.game.ui.hideHudComponentThisFrame(6);
    mp.game.ui.hideHudComponentThisFrame(7);
    mp.game.ui.hideHudComponentThisFrame(8);
    mp.game.ui.hideHudComponentThisFrame(9);
    mp.game.ui.hideHudComponentThisFrame(19);
    mp.game.ui.hideHudComponentThisFrame(20);
  }
  function getZoneName(position) {
    try {
      const zoneCode = mp.game.zone.getNameOfZone(position.x, position.y, position.z);
      return zoneCode ? mp.game.ui.getLabelText(zoneCode) || "San Andreas" : "San Andreas";
    } catch (error) {
      return "San Andreas";
    }
  }
  function updateHud() {
    if (!isAuthenticated || !browserState.browser || !browserState.isReady) {
      return;
    }
    try {
      const position = mp.players.local.position;
      const zoneName = getZoneName(position);
      const heading = typeof mp.players.local.getHeading === "function" ? mp.players.local.getHeading() : 0;
      executeInBrowser(browserState, `window.hudApp && window.hudApp.updateLocation(${JSON.stringify(zoneName)}, ${JSON.stringify("")}, ${JSON.stringify("")}, ${JSON.stringify(getHeadingLabel(heading))});`);
      executeInBrowser(browserState, `window.hudApp && window.hudApp.updateStats(${JSON.stringify(getAccountId())}, ${JSON.stringify(getOnlineCount())}, ${JSON.stringify(getCashValue())}, ${JSON.stringify(getBankCashValue())});`);
    } catch (error) {
    }
  }
  function updateSpeedometer() {
    if (!isAuthenticated || !browserState.browser || !browserState.isReady) {
      return;
    }
    const player = mp.players.local;
    const vehicle = player.vehicle;
    if (!vehicle) {
      executeInBrowser(browserState, "window.hudApp && window.hudApp.updateSpeedometer(null);");
      return;
    }
    try {
      const speed = Math.floor(vehicle.getSpeed() * 3.6);
      const rpm = vehicle.rpm || 0;
      const gear = vehicle.gear || 0;
      const engineOn = typeof vehicle.getIsEngineRunning === "function" ? !!vehicle.getIsEngineRunning() : !!vehicle.engine;
      const locked = !!vehicle.getVariable("IS_LOCKED");
      const fuel = Number(vehicle.getVariable("FUEL") ?? 100);
      const maxFuel = Number(vehicle.getVariable("MAX_FUEL") ?? 100);
      const fuelType = String(vehicle.getVariable("FUEL_TYPE") ?? "petrol");
      const healthPercent = Number(vehicle.getVariable("HEALTH_PERCENT") ?? 100);
      let headlightsOn = false;
      try {
        const lights = mp.game.vehicle.getLightsState(vehicle.handle);
        headlightsOn = !!(lights && (lights.lightsOn || lights.highbeamsOn));
      } catch (e) {
      }
      const data = {
        speed,
        rpm,
        gear,
        engineOn,
        locked,
        fuel,
        maxFuel,
        fuelType,
        healthPercent,
        headlightsOn
      };
      executeInBrowser(browserState, `window.hudApp && window.hudApp.updateSpeedometer(${JSON.stringify(data)});`);
    } catch (error) {
      executeInBrowser(browserState, `console.error("HUD Speedo Update Error: ${error instanceof Error ? error.message : String(error)}");`);
    }
  }
  function startHudTick() {
    if (tickInterval) {
      return;
    }
    tickInterval = setInterval(updateHud, 700);
    speedoInterval = setInterval(updateSpeedometer, 100);
  }
  function stopHudTick() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    if (speedoInterval) {
      clearInterval(speedoInterval);
      speedoInterval = null;
    }
  }
  mp.events.add("playerReady", () => {
    createHudBrowser();
  });
  createHudBrowser();
  mp.events.add("render", () => {
    hideNativeHudParts();
  });
  mp.events.add("cef:hud:ready", () => {
    if (!markBrowserReady(browserState)) {
      return;
    }
    pushTheme();
    executeInBrowser(browserState, `window.hudApp && window.hudApp.setVisible(${JSON.stringify(isAuthenticated)});`);
    updateHud();
  });
  mp.events.add("client:hud:authState", (...args) => {
    const [authState] = args;
    isAuthenticated = !!authState;
    executeInBrowser(browserState, `window.hudApp && window.hudApp.setVisible(${JSON.stringify(isAuthenticated)});`);
    if (isAuthenticated) {
      startHudTick();
      updateHud();
    } else {
      stopHudTick();
    }
  });
  mp.events.add("client:hud:notify", (...args) => {
    const [type, title, message] = args;
    executeInBrowser(browserState, `window.hudApp && window.hudApp.addNotification(${JSON.stringify(type)}, ${JSON.stringify(title)}, ${JSON.stringify(message)});`);
  });
  mp.events.add("client:adminJail:show", (...args) => {
    const [rawData] = args;
    let data = {};
    try {
      data = JSON.parse(rawData || "{}");
    } catch (error) {
      data = {};
    }
    executeInBrowser(browserState, `window.hudApp && window.hudApp.showJail(${JSON.stringify(data)});`);
  });
  mp.events.add("client:adminJail:hide", () => {
    executeInBrowser(browserState, "window.hudApp && window.hudApp.hideJail();");
  });
  mp.events.add("client:tickets:hudData", (...args) => {
    const [payload] = args;
    executeInBrowser(browserState, `window.hudApp && window.hudApp.setAdminTickets(${JSON.stringify(payload || '{"visible":false,"openCount":0,"tickets":[]}')});`);
  });
  mp.events.add("client:tickets:playerHudData", (...args) => {
    const [payload] = args;
    executeInBrowser(browserState, `window.hudApp && window.hudApp.setPlayerTicket(${JSON.stringify(payload || '{"visible":false,"ticket":null}')});`);
  });
  mp.events.add("client:tickets:mute", (...args) => {
    const [payload] = args;
    executeInBrowser(browserState, `window.hudApp && window.hudApp.showTicketMute(${JSON.stringify(payload || "{}")});`);
  });
  mp.events.add("client:tickets:muteClear", () => {
    executeInBrowser(browserState, "window.hudApp && window.hudApp.hideTicketMute();");
  });
  mp.events.add("client:uiTheme:sync", () => {
    pushTheme();
  });
  mp.keys.bind(17, true, () => {
    if (!mp.gui.cursor.visible && mp.players.local.vehicle) {
      mp.events.callRemote("server:vehicle:toggleEngine");
    }
  });
  mp.keys.bind(76, true, () => {
    if (!mp.gui.cursor.visible) {
      mp.events.callRemote("server:vehicle:toggleLock");
    }
  });
})();
