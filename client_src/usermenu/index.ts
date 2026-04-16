/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme, saveUiTheme } from "../ui-theme";

interface UsermenuState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  chatInputOpen: boolean;
  cefInputFocused: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const state: UsermenuState = {
  browser: null,
  isReady: false,
  isOpen: false,
  chatInputOpen: false,
  cefInputFocused: false,
  pendingActions: [],
  readyProbe: null
};

const KEY_M = 0x4D;
loadUiTheme();

function pushTheme() {
  executeMenu(`window.usermenuApp && window.usermenuApp.setTheme(${getUiThemeJson()});`);
}

function flushPending() {
  if (!state.browser || !state.isReady) return;
  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

function executeMenu(js: string) {
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
  state.browser!.active = true;
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

mp.events.add("client:chat:inputOpen", (...args: unknown[]) => {
  state.chatInputOpen = !!args[0];
});

mp.events.add("client:usermenu:open", (...args: unknown[]) => {
  const [payload] = args as [string];
  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
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
  // Kurze Verz├Âgerung damit das Usermenu sauber schliesst
  setTimeout(() => {
    mp.events.call("client:orga:requestOpen");
  }, 80);
});

mp.events.add("client:usermenu:setTickets", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeMenu(`window.usermenuApp && window.usermenuApp.setTickets(${JSON.stringify(payload || "{\"allowedPrefixes\":[],\"tickets\":[]}")});`);
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
  state.cefInputFocused = !!args[0];
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
  if (state.chatInputOpen || state.cefInputFocused) return;
  if (mp.gui.cursor.visible && !state.isOpen) return;
  if (state.isOpen) {
    closeMenu();
    return;
  }
  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (state.isOpen) closeMenu();
});

export {};
