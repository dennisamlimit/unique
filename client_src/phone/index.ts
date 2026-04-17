/// <reference path="../ragemp-client.d.ts" />
mp.gui.chat.push("!{#EAB308}[PHONE] Script geladen.");

import {
  createBrowserState,
  initBrowser,
  executeInBrowser,
  flushPending,
  startReadyProbe,
  stopReadyProbe,
  type BrowserState
} from "../shared/browser-manager.js";

const browserState: BrowserState = createBrowserState();
let isOpen = false;
let chatInputOpen = false;

const KEY_F7 = 0x76;

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

function resolveBrowserRequest(requestId: string, rawJson: string | null) {
  executeInBrowser(browserState, `window.lbPhoneBridge && window.lbPhoneBridge.resolveRequest(${JSON.stringify(requestId)}, ${JSON.stringify(rawJson ?? "null")});`);
}

function emitBrowserEvent(eventName: string, rawJson: string | null) {
  executeInBrowser(browserState, `window.lbPhoneBridge && window.lbPhoneBridge.pushEvent(${JSON.stringify(eventName)}, ${JSON.stringify(rawJson ?? "null")});`);
}

function closePhone() {
  if (!browserState.browser) return;

  isOpen = false;
  browserState.browser.active = false;
  executeInBrowser(browserState, "window.sendPhoneEvent && window.sendPhoneEvent('closePhone');");
  mp.gui.cursor.show(false, false);
  // mp.events.call("client:chat:authState", true);
  // mp.events.call("client:hud:authState", true);
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
  browserState.browser!.active = true;
  executeInBrowser(browserState, "window.sendPhoneEvent && window.sendPhoneEvent('openPhone');");
  mp.gui.cursor.show(true, true);
  // mp.events.call("client:chat:authState", false);
  // mp.events.call("client:hud:authState", false);
  syncPhoneState();
}

// Phone wird nach dem Spawn per require() geladen — playerReady ist bereits gefeuert.
// Browser direkt beim Modul-Load erstellen.
ensureBrowser();

mp.events.add("cef:phone:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  syncPhoneState();
});

mp.events.add("client:chat:inputOpen", (...args: unknown[]) => {
  chatInputOpen = !!args[0];
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

mp.keys.bind(0x1B, true, () => {
  if (isOpen) closePhone();
});

export {};
