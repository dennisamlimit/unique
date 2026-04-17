/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme } from "../ui-theme";
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
let chatOpen = false;
let currentMode = "ic";
let isAuthenticated = false;

loadUiTheme();

function pushTheme() {
  executeInBrowser(browserState, `window.chatApp && window.chatApp.setTheme(${getUiThemeJson()});`);
}

function createChatBrowser(): void {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://chat/chat.html", active: true });
  startReadyProbe(browserState, "chat");
}

function openChat(): void {
  if (!browserState.browser || chatOpen || !isAuthenticated) {
    return;
  }

  chatOpen = true;
  browserState.browser.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:inputOpen", true);

  executeInBrowser(browserState, `window.chatApp && window.chatApp.openInput(${JSON.stringify(currentMode)});`);
}

function closeChat(): void {
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

// Chat wird nach dem Spawn per require() geladen — playerReady ist bereits gefeuert.
// Browser direkt beim Modul-Load erstellen.
createChatBrowser();

mp.events.add("cef:chat:ready", () => {
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
  executeInBrowser(browserState, `window.chatApp && window.chatApp.setVisible(${JSON.stringify(isAuthenticated)});`);
});

mp.events.add("client:chat:authState", (...args: unknown[]) => {
  const [stateValue] = args;
  isAuthenticated = !!stateValue;

  if (!isAuthenticated) {
    closeChat();
  }

  executeInBrowser(browserState, `window.chatApp && window.chatApp.setVisible(${JSON.stringify(isAuthenticated)});`);
});

mp.keys.bind(0x54, true, () => {
  openChat();
});

mp.keys.bind(0x1B, true, () => {
  if (!chatOpen) {
    return;
  }

  closeChat();
});

mp.events.add("client:chat:addMessage", (...args: unknown[]) => {
  const [type, sender, message] = args;
  executeInBrowser(browserState, `window.chatApp && window.chatApp.addMessage(${JSON.stringify(type)}, ${JSON.stringify(sender)}, ${JSON.stringify(message)});`);
});

mp.events.add("cef:chat:setMode", (...args: unknown[]) => {
  const [mode] = args as [string];
  currentMode = mode;
});

mp.events.add("cef:chat:submit", (...args: unknown[]) => {
  const [mode, text] = args as [string, string];
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

export {};
