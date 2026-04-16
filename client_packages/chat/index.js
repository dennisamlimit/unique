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

  // client_src/chat/index.ts
  var state = {
    browser: null,
    chatOpen: false,
    currentMode: "ic",
    isAuthenticated: false,
    isReady: false,
    pendingActions: [],
    readyProbe: null
  };
  loadUiTheme();
  function pushTheme() {
    executeChat(`window.chatApp && window.chatApp.setTheme(${getUiThemeJson()});`);
  }
  function flushPending() {
    if (!state.browser || !state.isReady) {
      return;
    }
    while (state.pendingActions.length > 0) {
      const action = state.pendingActions.shift();
      state.browser.execute(action);
    }
  }
  function executeChat(js) {
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
      if (window.chatApp && !window.__chatReadyNotified) {
        window.__chatReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:chat:ready");
        }
      }
    `);
    }, 300);
  }
  function createChatBrowser() {
    if (state.browser) {
      return;
    }
    state.browser = mp.browsers.new("package://chat/chat.html");
    state.browser.active = true;
    startReadyProbe();
  }
  function openChat() {
    if (!state.browser || state.chatOpen || !state.isAuthenticated) {
      return;
    }
    state.chatOpen = true;
    state.browser.active = true;
    mp.gui.cursor.show(true, true);
    mp.events.call("client:chat:inputOpen", true);
    executeChat(`window.chatApp && window.chatApp.openInput(${JSON.stringify(state.currentMode)});`);
  }
  function closeChat() {
    if (!state.browser) {
      return;
    }
    const wasOpen = state.chatOpen;
    state.chatOpen = false;
    state.browser.active = true;
    if (wasOpen) {
      mp.gui.cursor.show(false, false);
    }
    mp.events.call("client:chat:inputOpen", false);
    executeChat("window.chatApp && window.chatApp.closeInput();");
  }
  createChatBrowser();
  mp.events.add("cef:chat:ready", () => {
    if (state.isReady) {
      return;
    }
    state.isReady = true;
    stopReadyProbe();
    flushPending();
    pushTheme();
    executeChat(`window.chatApp && window.chatApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
  });
  mp.events.add("client:chat:authState", (...args) => {
    const [stateValue] = args;
    state.isAuthenticated = !!stateValue;
    if (!state.isAuthenticated) {
      closeChat();
    }
    executeChat(`window.chatApp && window.chatApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
  });
  mp.keys.bind(84, true, () => {
    openChat();
  });
  mp.keys.bind(27, true, () => {
    if (!state.chatOpen) {
      return;
    }
    closeChat();
  });
  mp.events.add("client:chat:addMessage", (...args) => {
    const [type, sender, message] = args;
    executeChat(`window.chatApp && window.chatApp.addMessage(${JSON.stringify(type)}, ${JSON.stringify(sender)}, ${JSON.stringify(message)});`);
  });
  mp.events.add("cef:chat:setMode", (...args) => {
    const [mode] = args;
    state.currentMode = mode;
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
