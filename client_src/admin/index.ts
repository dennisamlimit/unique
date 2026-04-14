/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme } from "../ui-theme";

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
loadUiTheme();

function pushTheme(): void {
  executeAdmin(`window.adminApp && window.adminApp.setTheme(${getUiThemeJson()});`);
}

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
  const accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0);
  if (level <= 0 || !isAdminModeEnabled()) {
    return;
  }
  openAdminMenuForced(level, accountId);
}

function openAdminMenuForced(level = getAdminLevel(), accountId = Number(mp.players.local.getVariable("ACCOUNT_ID") ?? 0)): void {
  if (level <= 0) {
    return;
  }

  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  mp.gui.cursor.show(true, true);
  executeAdmin(`window.adminApp && window.adminApp.open(${JSON.stringify(level)}, ${JSON.stringify(accountId)}, ${JSON.stringify(collectPlayers())});`);
  pushTheme();
  
  // Data requests
  mp.events.callRemote("server:admin:requestFactionData");
  mp.events.callRemote("server:admin:getCommandList");
  if (level >= 5) {
      mp.events.callRemote("server:admin:requestLogs");
  }
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
  pushTheme();
});

mp.events.add("client:uiTheme:sync", () => {
  pushTheme();
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

mp.events.add("client:admin:setFactions", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeAdmin(`window.adminApp && window.adminApp.setFactions(${JSON.stringify(payload || "[]")});`);
});

mp.events.add("client:admin:receiveCommands", (payload: string) => {
    executeAdmin(`window.adminApp && window.adminApp.setCommands(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:receiveLogs", (payload: string) => {
    executeAdmin(`window.adminApp && window.adminApp.setLogs(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:setTickets", (payload: string) => {
  executeAdmin(`window.adminApp && window.adminApp.setTickets(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:setTicketPlayerHistory", (payload: string) => {
  executeAdmin(`window.adminApp && window.adminApp.setTicketPlayerHistory(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:setTicketInsight", (payload: string) => {
  executeAdmin(`window.adminApp && window.adminApp.setTicketInsight(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:showTicketHistory", (accountId: number) => {
  openAdminMenuForced();
  executeAdmin(`window.adminApp && window.adminApp.showTicketHistory(${JSON.stringify(Number(accountId) || 0)});`);
});

mp.events.add("cef:admin:createFaction", (...args: unknown[]) => {
  const [type, shortName, name, colorHex, mapIconId] = args;
  mp.events.callRemote("server:admin:createFaction", type, shortName, name, colorHex, mapIconId);
});

mp.events.add("cef:admin:setFactionLeader", (...args: unknown[]) => {
  const [accountId, factionId] = args;
  mp.events.callRemote("server:admin:setFactionLeader", accountId, factionId);
});

mp.events.add("cef:admin:setFactionSpawn", (...args: unknown[]) => {
  const [factionId] = args;
  mp.events.callRemote("server:admin:setFactionSpawn", factionId);
});

mp.events.add("cef:admin:addFactionWardrobe", (...args: unknown[]) => {
  const [factionId, label] = args;
  mp.events.callRemote("server:admin:addFactionWardrobe", factionId, label);
});

mp.events.add("cef:admin:createFactionVehicle", (...args: unknown[]) => {
  const [factionId, minRankLevel, modelName, displayName] = args;
  mp.events.callRemote("server:admin:createFactionVehicle", factionId, minRankLevel, modelName, displayName);
});

mp.events.add("cef:admin:syncFactionDefaults", (...args: unknown[]) => {
  const [target] = args;
  mp.events.callRemote("server:admin:syncFactionDefaults", target);
});

mp.events.add("cef:admin:updateCommandLevel", (commandId: string, level: number) => {
    mp.events.callRemote("server:admin:updateCommandLevel", commandId, level);
});

mp.events.add("cef:admin:requestLogs", () => {
    mp.events.callRemote("server:admin:requestLogs");
});

mp.events.add("cef:admin:requestTickets", () => {
  mp.events.callRemote("server:admin:tickets:request");
});

mp.events.add("cef:admin:ticketClaim", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:claim", ticketId);
});

mp.events.add("cef:admin:ticketReply", (ticketId: number, message: string, forceReply: boolean) => {
  mp.events.callRemote("server:admin:tickets:reply", ticketId, message, !!forceReply);
});

mp.events.add("cef:admin:ticketStatus", (ticketId: number, status: string) => {
  mp.events.callRemote("server:admin:tickets:status", ticketId, status);
});

mp.events.add("cef:admin:ticketPriority", (ticketId: number, priority: string) => {
  mp.events.callRemote("server:admin:tickets:priority", ticketId, priority);
});

mp.events.add("cef:admin:ticketAddParticipant", (ticketId: number, accountId: number) => {
  mp.events.callRemote("server:admin:tickets:addParticipant", ticketId, accountId);
});

mp.events.add("cef:admin:ticketRequestAdvice", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:requestAdvice", ticketId);
});

mp.events.add("cef:admin:ticketGoto", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:goto", ticketId);
});

mp.events.add("cef:admin:ticketGetHere", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:gethere", ticketId);
});

mp.events.add("cef:admin:ticketCharacterInfo", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:characterInfo", ticketId);
});

mp.events.add("cef:admin:ticketWarnings", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:warnings", ticketId);
});

mp.events.add("cef:admin:ticketHistory", (accountId: number) => {
  mp.events.callRemote("server:admin:tickets:history", accountId);
});

export {};
