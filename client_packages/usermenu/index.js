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
  function saveUiTheme(raw) {
    currentTheme = normalizeUiTheme(raw);
    try {
      mp.storage.data.uniqueUiTheme = currentTheme;
      if (typeof mp.storage.flush === "function") {
        mp.storage.flush();
      }
    } catch {
    }
    return currentTheme;
  }
  function getUiThemeJson() {
    loadUiTheme();
    return JSON.stringify(currentTheme);
  }

  // client_src/usermenu/index.ts
  var state = {
    browser: null,
    isReady: false,
    isOpen: false,
    chatInputOpen: false,
    cefInputFocused: false,
    pendingActions: [],
    readyProbe: null
  };
  var KEY_M = 77;
  loadUiTheme();
  function pushTheme() {
    executeMenu(`window.usermenuApp && window.usermenuApp.setTheme(${getUiThemeJson()});`);
  }
  function flushPending() {
    if (!state.browser || !state.isReady) return;
    while (state.pendingActions.length > 0) {
      state.browser.execute(state.pendingActions.shift());
    }
  }
  function executeMenu(js) {
    if (!state.browser || !state.isReady) {
      state.pendingActions.push(js);
      return;
    }
    state.browser.execute(js);
  }
  function stopReadyProbe() {
    if (!state.readyProbe) return;
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
      if (window.usermenuApp && !window.__usermenuReadyNotified) {
        window.__usermenuReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:usermenu:ready");
        }
      }
    `);
    }, 300);
  }
  function ensureBrowser() {
    if (state.browser) return;
    state.browser = mp.browsers.new("package://usermenu/usermenu.html");
    state.browser.active = false;
    startReadyProbe();
  }
  function closeMenu() {
    if (!state.browser) return;
    state.isOpen = false;
    state.browser.active = false;
    mp.gui.cursor.show(false, false);
    mp.events.call("client:chat:authState", true);
    mp.events.call("client:hud:authState", true);
    executeMenu("window.usermenuApp && window.usermenuApp.close();");
  }
  function openMenu() {
    const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
    if (accountId <= 0) return;
    ensureBrowser();
    state.isOpen = true;
    state.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    mp.events.callRemote("server:usermenu:open");
    pushTheme();
  }
  mp.events.add("playerReady", () => {
    ensureBrowser();
  });
  mp.events.add("cef:usermenu:ready", () => {
    state.isReady = true;
    stopReadyProbe();
    flushPending();
    pushTheme();
  });
  mp.events.add("client:chat:inputOpen", (...args) => {
    state.chatInputOpen = !!args[0];
  });
  mp.events.add("client:usermenu:open", (...args) => {
    const [payload] = args;
    ensureBrowser();
    state.isOpen = true;
    state.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    executeMenu(`window.usermenuApp && window.usermenuApp.open(${payload || "{}"});`);
    pushTheme();
  });
  mp.events.add("cef:usermenu:close", () => {
    closeMenu();
  });
  mp.events.add("cef:usermenu:openOrga", () => {
    closeMenu();
    setTimeout(() => {
      mp.events.call("client:orga:requestOpen");
    }, 80);
  });
  mp.events.add("client:usermenu:setTickets", (...args) => {
    const [payload] = args;
    executeMenu(`window.usermenuApp && window.usermenuApp.setTickets(${JSON.stringify(payload || '{"allowedPrefixes":[],"tickets":[]}')});`);
  });
  mp.events.add("cef:usermenu:requestTickets", () => {
    mp.events.callRemote("server:tickets:requestMine");
  });
  mp.events.add("cef:usermenu:createTicket", (...args) => {
    const [prefix, subject, message] = args;
    mp.events.callRemote("server:tickets:create", prefix, subject, message);
  });
  mp.events.add("cef:usermenu:replyTicket", (...args) => {
    const [ticketId, message] = args;
    mp.events.callRemote("server:tickets:reply", ticketId, message);
  });
  mp.events.add("cef:usermenu:inputFocus", (...args) => {
    state.cefInputFocused = !!args[0];
  });
  mp.events.add("cef:usermenu:updateTheme", (...args) => {
    const [payload] = args;
    let parsed = {};
    try {
      parsed = JSON.parse(String(payload || "{}"));
    } catch {
      parsed = {};
    }
    saveUiTheme(parsed);
    mp.events.call("client:uiTheme:sync");
  });
  mp.events.add("client:uiTheme:sync", () => {
    pushTheme();
  });
  mp.keys.bind(KEY_M, true, () => {
    if (state.chatInputOpen || state.cefInputFocused) return;
    if (mp.gui.cursor.visible && !state.isOpen) return;
    if (state.isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });
  mp.keys.bind(27, true, () => {
    if (state.isOpen) closeMenu();
  });
})();
