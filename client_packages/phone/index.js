(() => {
  // client_src/phone/index.ts
  mp.gui.chat.push("!{#EAB308}[PHONE] Script geladen.");
  var state = {
    browser: null,
    isReady: false,
    isOpen: false,
    chatInputOpen: false,
    pendingActions: [],
    readyProbe: null
  };
  var KEY_F7 = 118;
  function flushPending() {
    if (!state.browser || !state.isReady) return;
    while (state.pendingActions.length > 0) {
      const action = state.pendingActions.shift();
      if (action) {
        state.browser.execute(action);
      }
    }
  }
  function executePhone(js) {
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
      if (window.__lbPhoneReady && !window.__lbPhoneReadyNotified) {
        window.__lbPhoneReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:phone:ready");
        }
      }
    `);
    }, 300);
  }
  function ensureBrowser() {
    if (state.browser) return;
    state.browser = mp.browsers.new("package://phone/index.html");
    state.browser.active = false;
    startReadyProbe();
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
    executePhone(`window.lbPhoneBridge && window.lbPhoneBridge.setState(${JSON.stringify(getPhoneStatePayload())});`);
  }
  function resolveBrowserRequest(requestId, rawJson) {
    executePhone(`window.lbPhoneBridge && window.lbPhoneBridge.resolveRequest(${JSON.stringify(requestId)}, ${JSON.stringify(rawJson ?? "null")});`);
  }
  function emitBrowserEvent(eventName, rawJson) {
    executePhone(`window.lbPhoneBridge && window.lbPhoneBridge.pushEvent(${JSON.stringify(eventName)}, ${JSON.stringify(rawJson ?? "null")});`);
  }
  function closePhone() {
    if (!state.browser) return;
    state.isOpen = false;
    state.browser.active = false;
    executePhone("window.sendPhoneEvent && window.sendPhoneEvent('closePhone');");
    mp.gui.cursor.show(false, false);
  }
  function openPhone() {
    const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
    const cursorVisible = mp.gui.cursor.visible;
    mp.gui.chat.push(`!{#EAB308}[PHONE] openPhone called - ID: ${accountId}, isOpen: ${state.isOpen}, cursor: ${cursorVisible}`);
    if (accountId <= 0) {
      mp.gui.chat.push("!{#EF4444}[PHONE] Abbruch: Keine ACCOUNT_ID vorhanden.");
      return;
    }
    if (state.isOpen) return;
    if (cursorVisible) {
      mp.gui.chat.push("!{#EF4444}[PHONE] Abbruch: Cursor ist bereits sichtbar (UI offen?).");
      return;
    }
    ensureBrowser();
    state.isOpen = true;
    state.browser.active = true;
    executePhone("window.sendPhoneEvent && window.sendPhoneEvent('openPhone');");
    mp.gui.cursor.show(true, true);
    syncPhoneState();
  }
  ensureBrowser();
  mp.events.add("cef:phone:ready", () => {
    state.isReady = true;
    stopReadyProbe();
    flushPending();
    syncPhoneState();
  });
  mp.events.add("client:chat:inputOpen", (...args) => {
    state.chatInputOpen = !!args[0];
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
    if (String(eventName) === "incomingCall" && !state.isOpen) {
      openPhone();
    }
    emitBrowserEvent(String(eventName), typeof rawJson === "string" ? rawJson : "null");
  });
  mp.events.add("cef:phone:close", () => {
    closePhone();
  });
  mp.keys.bind(KEY_F7, true, () => {
    mp.gui.chat.push(`!{#EAB308}[PHONE] F7 pressed. ChatInputOpen: ${state.chatInputOpen}`);
    if (state.chatInputOpen) return;
    if (state.isOpen) {
      closePhone();
      return;
    }
    openPhone();
  });
  mp.keys.bind(27, true, () => {
    if (state.isOpen) closePhone();
  });
})();
