/// <reference path="../ragemp-client.d.ts" />

interface PlayerInfo {
  name: string;
  serverId: number;
  playerId: number;
  accountId: number;
  adminLevel: number;
  adminMode: boolean;
}

interface AdminState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const state: AdminState = {
  browser: null,
  isReady: false,
  isOpen: false,
  pendingActions: [],
  readyProbe: null
};

const KEY_F3 = 0x72;

function getAdminLevel(): number {
  try {
    const level = mp.players.local.getVariable("ADMIN_LEVEL");
    return Number.isFinite(level) ? (level as number) : 0;
  } catch (error) {
    return 0;
  }
}

function isAdminModeEnabled(): boolean {
  try {
    return !!mp.players.local.getVariable("ADMIN_MODE");
  } catch (error) {
    return false;
  }
}

function readPlayerVariable(player: Mp.Player, key: string, fallback: unknown): unknown {
  try {
    const value = player.getVariable(key);
    return value === undefined || value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function collectPlayers(): PlayerInfo[] {
  const players: Mp.Player[] = [];

  try {
    if (typeof mp.players.forEach === "function") {
      mp.players.forEach((player) => {
        players.push(player);
      });
    }
  } catch (error) {
    // Fallback below.
  }

  if (players.length === 0) {
    players.push(mp.players.local);
  }

  return players.map((player) => {
    const serverId = Number.isFinite((player as any).remoteId)
      ? (player as any).remoteId
      : (Number.isFinite(player.id) ? player.id : 0);
    const accountId = Number(readPlayerVariable(player, "ACCOUNT_ID", 0)) || 0;
    const adminLevel = Number(readPlayerVariable(player, "ADMIN_LEVEL", 0)) || 0;

    return {
      name: player.name || String(readPlayerVariable(player, "DISPLAY_NAME", "Unbekannt")),
      serverId,
      playerId: serverId + 1,
      accountId,
      adminLevel,
      adminMode: !!readPlayerVariable(player, "ADMIN_MODE", false)
    };
  });
}

function flushPending(): void {
  if (!state.browser || !state.isReady) {
    return;
  }

  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

function executeAdmin(js: string): void {
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
      if (window.adminApp && !window.__adminReadyNotified) {
        window.__adminReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:admin:ready");
        }
      }
    `);
  }, 300);
}

function ensureBrowser(): void {
  if (state.browser) {
    return;
  }

  state.browser = mp.browsers.new("package://admin/admin.html");
  state.browser.active = false;
  startReadyProbe();
}

function closeAdminMenu(): void {
  if (!state.browser) {
    return;
  }

  state.isOpen = false;
  state.browser.active = false;
  mp.gui.cursor.show(false, false);
  mp.events.call("client:chat:authState", true);
  mp.events.call("client:hud:authState", true);
  executeAdmin("window.adminApp && window.adminApp.close();");
}

function openAdminMenu(): void {
  const level = getAdminLevel();
  if (level <= 0 || !isAdminModeEnabled()) {
    return;
  }

  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  mp.gui.cursor.show(true, true);
  executeAdmin(`window.adminApp && window.adminApp.open(${JSON.stringify(level)}, ${JSON.stringify(collectPlayers())});`);
}

function toggleAdminMenu(): void {
  if (state.isOpen) {
    closeAdminMenu();
    return;
  }

  openAdminMenu();
}

mp.events.add("playerReady", () => {
  ensureBrowser();
});

mp.events.add("cef:admin:ready", () => {
  if (state.isReady) {
    return;
  }

  state.isReady = true;
  stopReadyProbe();
  flushPending();
});

mp.keys.bind(KEY_F3, true, () => {
  toggleAdminMenu();
});

mp.events.add("cef:admin:close", () => {
  closeAdminMenu();
});

mp.events.add("render", () => {
  if (state.isOpen && (!isAdminModeEnabled() || getAdminLevel() <= 0)) {
    closeAdminMenu();
  }
});

export {};
