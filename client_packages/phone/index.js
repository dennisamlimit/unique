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
  function executeInBrowser(state, js) {
    if (!state.browser || !state.isReady) {
      state.pendingActions.push(js);
      return;
    }
    state.browser.execute(js);
  }

  // client_src/phone/index.ts
  mp.gui.chat.push("!{#EAB308}[PHONE] Script geladen.");
  var browserState = createBrowserState();
  var isOpen = false;
  var chatInputOpen = false;
  var KEY_F7 = 118;
  function ensureBrowser() {
    if (browserState.browser) return;
    initBrowser(browserState, { htmlPath: "package://phone/index.html", active: false });
    startReadyProbe(browserState, "phone", { windowReadyKey: "__lbPhoneReady" });
  }
  function getPhoneStatePayload() {
    const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
    const phoneNumber = String(mp.players.local.getVariable("PHONE_NUMBER") ?? "555-0101");
    return {
      accountId,
      playerName: mp.players.local.name ?? "Spieler",
      phoneNumber
    };
  }
  function syncPhoneState() {
    executeInBrowser(browserState, `window.lbPhoneBridge && window.lbPhoneBridge.setState(${JSON.stringify(getPhoneStatePayload())});`);
  }
  function resolveBrowserRequest(requestId, rawJson) {
    executeInBrowser(browserState, `window.lbPhoneBridge && window.lbPhoneBridge.resolveRequest(${JSON.stringify(requestId)}, ${JSON.stringify(rawJson ?? "null")});`);
  }
  function emitBrowserEvent(eventName, rawJson) {
    executeInBrowser(browserState, `window.lbPhoneBridge && window.lbPhoneBridge.pushEvent(${JSON.stringify(eventName)}, ${JSON.stringify(rawJson ?? "null")});`);
  }
  function closePhone() {
    if (!browserState.browser) return;
    isOpen = false;
    browserState.browser.active = false;
    executeInBrowser(browserState, "window.sendPhoneEvent && window.sendPhoneEvent('closePhone');");
    mp.gui.cursor.show(false, false);
  }
  function openPhone() {
    const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
    const cursorVisible = mp.gui.cursor.visible;
    mp.gui.chat.push(`!{#EAB308}[PHONE] openPhone called - ID: ${accountId}, isOpen: ${isOpen}, cursor: ${cursorVisible}`);
    if (accountId <= 0) {
      mp.gui.chat.push("!{#EF4444}[PHONE] Abbruch: Keine ACCOUNT_ID vorhanden.");
      return;
    }
    if (isOpen) return;
    if (cursorVisible) {
      mp.gui.chat.push("!{#EF4444}[PHONE] Abbruch: Cursor ist bereits sichtbar (UI offen?).");
      return;
    }
    ensureBrowser();
    isOpen = true;
    browserState.browser.active = true;
    executeInBrowser(browserState, "window.sendPhoneEvent && window.sendPhoneEvent('openPhone');");
    mp.gui.cursor.show(true, true);
    syncPhoneState();
  }
  ensureBrowser();
  mp.events.add("cef:phone:ready", () => {
    if (browserState.isReady) return;
    browserState.isReady = true;
    stopReadyProbe(browserState);
    flushPending(browserState);
    syncPhoneState();
  });
  mp.events.add("client:chat:inputOpen", (...args) => {
    chatInputOpen = !!args[0];
  });
  mp.events.add("client:phone:requestOpen", () => {
    openPhone();
  });
  mp.events.add("cef:phone:request", (requestId, eventName, payloadJson) => {
    mp.events.callRemote("server:phone:request", requestId, eventName, payloadJson);
  });
  mp.events.add("client:phone:response", (requestId, rawJson) => {
    resolveBrowserRequest(String(requestId), typeof rawJson === "string" ? rawJson : "null");
  });
  mp.events.add("client:phone:event", (eventName, rawJson) => {
    if (String(eventName) === "incomingCall" && !isOpen) {
      openPhone();
    }
    emitBrowserEvent(String(eventName), typeof rawJson === "string" ? rawJson : "null");
  });
  mp.events.add("cef:phone:close", () => {
    closePhone();
  });
  mp.keys.bind(KEY_F7, true, () => {
    mp.gui.chat.push(`!{#EAB308}[PHONE] F7 pressed. ChatInputOpen: ${chatInputOpen}`);
    if (chatInputOpen) return;
    if (isOpen) {
      closePhone();
      return;
    }
    openPhone();
  });
  mp.keys.bind(27, true, () => {
    if (isOpen) closePhone();
  });
})();
