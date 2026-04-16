/// <reference path="../ragemp-client.d.ts" />
mp.gui.chat.push("!{#EAB308}[PHONE] Script geladen.");


interface PhoneState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  chatInputOpen: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const state: PhoneState = {
  browser: null,
  isReady: false,
  isOpen: false,
  chatInputOpen: false,
  pendingActions: [],
  readyProbe: null
};

const KEY_F7 = 0x76;

function flushPending() {
  if (!state.browser || !state.isReady) return;

  while (state.pendingActions.length > 0) {
    const action = state.pendingActions.shift();
    if (action) {
      state.browser.execute(action);
    }
  }
}

function executePhone(js: string) {
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

function resolveBrowserRequest(requestId: string, rawJson: string | null) {
  executePhone(`window.lbPhoneBridge && window.lbPhoneBridge.resolveRequest(${JSON.stringify(requestId)}, ${JSON.stringify(rawJson ?? "null")});`);
}

function emitBrowserEvent(eventName: string, rawJson: string | null) {
  executePhone(`window.lbPhoneBridge && window.lbPhoneBridge.pushEvent(${JSON.stringify(eventName)}, ${JSON.stringify(rawJson ?? "null")});`);
}

function closePhone() {
  if (!state.browser) return;

  state.isOpen = false;
  state.browser.active = false;
  executePhone("window.sendPhoneEvent && window.sendPhoneEvent('closePhone');");
  mp.gui.cursor.show(false, false);
  // mp.events.call("client:chat:authState", true);
  // mp.events.call("client:hud:authState", true);
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
  state.browser!.active = true;
  executePhone("window.sendPhoneEvent && window.sendPhoneEvent('openPhone');");
  mp.gui.cursor.show(true, true);
  // mp.events.call("client:chat:authState", false);
  // mp.events.call("client:hud:authState", false);
  syncPhoneState();
}

// Phone wird nach dem Spawn per require() geladen — playerReady ist bereits gefeuert.
// Browser direkt beim Modul-Load erstellen.
ensureBrowser();

mp.events.add("cef:phone:ready", () => {
  state.isReady = true;
  stopReadyProbe();
  flushPending();
  syncPhoneState();
});

mp.events.add("client:chat:inputOpen", (...args: unknown[]) => {
  state.chatInputOpen = !!args[0];
});

mp.events.add("client:phone:requestOpen", () => {
  openPhone();
});

mp.events.add("cef:phone:request", (requestId: string, eventName: string, payloadJson: string) => {
  mp.events.callRemote("server:phone:request", requestId, eventName, payloadJson);
});

mp.events.add("client:phone:response", (requestId: string, rawJson: string) => {
  resolveBrowserRequest(String(requestId), typeof rawJson === "string" ? rawJson : "null");
});

mp.events.add("client:phone:event", (eventName: string, rawJson: string) => {
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

mp.keys.bind(0x1B, true, () => {
  if (state.isOpen) closePhone();
});

export {};
