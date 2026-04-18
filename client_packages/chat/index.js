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

  // client_src/chat/index.ts
  var browserState = createBrowserState();
  var chatOpen = false;
  var currentMode = "ic";
  var isAuthenticated = false;
  loadUiTheme();
  function pushTheme() {
    executeInBrowser(browserState, `window.chatApp && window.chatApp.setTheme(${getUiThemeJson()});`);
  }
  function createChatBrowser() {
    if (browserState.browser) return;
    ensureBrowserInitialized(browserState, {
      htmlPath: "package://chat/chat.html",
      active: true,
      appName: "chat"
    });
  }
  function openChat() {
    if (!browserState.browser || chatOpen || !isAuthenticated) {
      return;
    }
    chatOpen = true;
    browserState.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:inputOpen", true);
    executeInBrowser(browserState, `window.chatApp && window.chatApp.openInput(${JSON.stringify(currentMode)});`);
  }
  function closeChat() {
    if (!browserState.browser) {
      return;
    }
    const wasOpen = chatOpen;
    chatOpen = false;
    browserState.browser.active = true;
    if (wasOpen) {
      mp.gui.cursor.show(false, false);
    }
    mp.events.call("client:chat:inputOpen", false);
    executeInBrowser(browserState, "window.chatApp && window.chatApp.closeInput();");
  }
  createChatBrowser();
  mp.events.add("cef:chat:ready", () => {
    if (!markBrowserReady(browserState)) return;
    pushTheme();
    executeInBrowser(browserState, `window.chatApp && window.chatApp.setVisible(${JSON.stringify(isAuthenticated)});`);
  });
  mp.events.add("client:chat:authState", (...args) => {
    const [stateValue] = args;
    isAuthenticated = !!stateValue;
    if (!isAuthenticated) {
      closeChat();
    }
    executeInBrowser(browserState, `window.chatApp && window.chatApp.setVisible(${JSON.stringify(isAuthenticated)});`);
  });
  mp.keys.bind(84, true, () => {
    openChat();
  });
  mp.keys.bind(27, true, () => {
    if (!chatOpen) {
      return;
    }
    closeChat();
  });
  mp.events.add("client:chat:addMessage", (...args) => {
    const [type, sender, message] = args;
    executeInBrowser(browserState, `window.chatApp && window.chatApp.addMessage(${JSON.stringify(type)}, ${JSON.stringify(sender)}, ${JSON.stringify(message)});`);
  });
  mp.events.add("cef:chat:setMode", (...args) => {
    const [mode] = args;
    currentMode = mode;
  });
  mp.events.add("cef:chat:submit", (...args) => {
    const [mode, text] = args;
    if (!text || !text.trim()) {
      closeChat();
      return;
    }
    mp.events.callRemote("server:chat:submit", mode, text.trim());
    closeChat();
  });
  mp.events.add("client:uiTheme:sync", () => {
    pushTheme();
  });
  mp.events.add("cef:chat:close", () => {
    closeChat();
  });
})();
