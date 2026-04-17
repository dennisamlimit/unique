/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme, saveUiTheme } from "../ui-theme";
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
let cefInputFocused = false;

const KEY_M = 0x4D;
loadUiTheme();

function pushTheme() {
  executeInBrowser(browserState, `window.usermenuApp && window.usermenuApp.setTheme(${getUiThemeJson()});`);
}

function ensureBrowser() {
  if (browserState.browser) return;
  initBrowser(browserState, { htmlPath: "package://usermenu/usermenu.html", active: false });
  startReadyProbe(browserState, "usermenu");
}

function closeMenu() {
  if (!browserState.browser) return;
  isOpen = false;
  browserState.browser.active = false;
  mp.gui.cursor.show(false, false);
  mp.events.call("client:chat:authState", true);
  mp.events.call("client:hud:authState", true);
  executeInBrowser(browserState, "window.usermenuApp && window.usermenuApp.close();");
}

function openMenu() {
  const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
  if (accountId <= 0) return;

  ensureBrowser();
  isOpen = true;
  browserState.browser!.active = true;
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
  if (browserState.isReady) return;
  browserState.isReady = true;
  stopReadyProbe(browserState);
  flushPending(browserState);
  pushTheme();
});

mp.events.add("client:chat:inputOpen", (...args: unknown[]) => {
  chatInputOpen = !!args[0];
});

mp.events.add("client:usermenu:open", (...args: unknown[]) => {
  const [payload] = args as [string];
  ensureBrowser();
  isOpen = true;
  browserState.browser!.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  executeInBrowser(browserState, `window.usermenuApp && window.usermenuApp.open(${payload || "{}"});`);
  pushTheme();
});

mp.events.add("cef:usermenu:close", () => {
  closeMenu();
});

mp.events.add("cef:usermenu:openOrga", () => {
  closeMenu();
  // Kurze Verzoegerung damit das Usermenu sauber schliesst
  setTimeout(() => {
    mp.events.call("client:orga:requestOpen");
  }, 80);
});

mp.events.add("client:usermenu:setTickets", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.usermenuApp && window.usermenuApp.setTickets(${JSON.stringify(payload || "{\"allowedPrefixes\":[],\"tickets\":[]}")});`);
});

mp.events.add("cef:usermenu:requestTickets", () => {
  mp.events.callRemote("server:tickets:requestMine");
});

mp.events.add("cef:usermenu:createTicket", (...args: unknown[]) => {
  const [prefix, subject, message] = args;
  mp.events.callRemote("server:tickets:create", prefix, subject, message);
});

mp.events.add("cef:usermenu:replyTicket", (...args: unknown[]) => {
  const [ticketId, message] = args;
  mp.events.callRemote("server:tickets:reply", ticketId, message);
});

mp.events.add("cef:usermenu:inputFocus", (...args: unknown[]) => {
  cefInputFocused = !!args[0];
});

mp.events.add("cef:usermenu:updateTheme", (...args: unknown[]) => {
  const [payload] = args as [string];
  let parsed: unknown = {};
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
  if (chatInputOpen || cefInputFocused) return;
  if (mp.gui.cursor.visible && !isOpen) return;
  if (isOpen) {
    closeMenu();
    return;
  }
  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (isOpen) closeMenu();
});

export {};
