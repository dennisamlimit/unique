/// <reference path="../ragemp-client.d.ts" />

interface ChatState {
  browser: Mp.Browser | null;
  chatOpen: boolean;
  currentMode: string;
  isAuthenticated: boolean;
  isReady: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const state: ChatState = {
  browser: null,
  chatOpen: false,
  currentMode: "ic",
  isAuthenticated: false,
  isReady: false,
  pendingActions: [],
  readyProbe: null
};

function flushPending(): void {
  if (!state.browser || !state.isReady) {
    return;
  }

  while (state.pendingActions.length > 0) {
    const action = state.pendingActions.shift()!;
    state.browser.execute(action);
  }
}

function executeChat(js: string): void {
  if (!state.browser || !state.isReady) {
    state.pendingActions.push(js);
    return;
  }

  state.browser.execute(js);
}

function stopReadyProbe(): void {
  if (!state.readyProbe) {
    return;
  }

  clearInterval(state.readyProbe);
  state.readyProbe = null;
}

function startReadyProbe(): void {
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

function createChatBrowser(): void {
  if (state.browser) {
    return;
  }

  state.browser = mp.browsers.new("package://chat/chat.html");
  state.browser.active = true;
  startReadyProbe();
}

function openChat(): void {
  if (!state.browser || state.chatOpen || !state.isAuthenticated) {
    return;
  }

  state.chatOpen = true;
  state.browser.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:inputOpen", true);

  executeChat(`window.chatApp && window.chatApp.openInput(${JSON.stringify(state.currentMode)});`);
}

function closeChat(): void {
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

mp.events.add("playerReady", () => {
  createChatBrowser();
});

mp.events.add("cef:chat:ready", () => {
  if (state.isReady) {
    return;
  }

  state.isReady = true;
  stopReadyProbe();
  flushPending();
  executeChat(`window.chatApp && window.chatApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
});

mp.events.add("client:chat:authState", (...args: unknown[]) => {
  const [stateValue] = args;
  state.isAuthenticated = !!stateValue;

  if (!state.isAuthenticated) {
    closeChat();
  }

  executeChat(`window.chatApp && window.chatApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
});

mp.keys.bind(0x54, true, () => {
  openChat();
});

mp.keys.bind(0x1B, true, () => {
  if (!state.chatOpen) {
    return;
  }

  closeChat();
});

mp.events.add("client:chat:addMessage", (...args: unknown[]) => {
  const [type, sender, message] = args;
  executeChat(`window.chatApp && window.chatApp.addMessage(${JSON.stringify(type)}, ${JSON.stringify(sender)}, ${JSON.stringify(message)});`);
});

mp.events.add("cef:chat:setMode", (...args: unknown[]) => {
  const [mode] = args as [string];
  state.currentMode = mode;
});

mp.events.add("cef:chat:submit", (...args: unknown[]) => {
  const [mode, text] = args as [string, string];
  if (!text || !text.trim()) {
    closeChat();
    return;
  }

  mp.events.callRemote("server:chat:send", mode, text.trim());
  closeChat();
});

mp.events.add("cef:chat:close", () => {
  closeChat();
});

export {};
