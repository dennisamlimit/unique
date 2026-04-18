/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme } from "../ui-theme";
import {
  createBrowserState,
  ensureBrowserInitialized,
  executeInBrowser,
  markBrowserReady
} from "../shared/browser-manager.js";


interface PlayerInfo {
  name: string;
  serverId: number;
  playerId: number;
  accountId: number;
  adminLevel: number;
  adminMode: boolean;
}

const browserState = createBrowserState();
let isOpen = false;

loadUiTheme();

function pushTheme() {
  executeInBrowser(browserState, `window.adminApp && window.adminApp.setTheme(${getUiThemeJson()});`);
}

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

function ensureBrowser(): void {
  if (browserState.browser) return;
  ensureBrowserInitialized(browserState, {
    htmlPath: "package://admin/admin.html",
    active: false,
    appName: "admin"
  });
}

function closeAdminMenu(): void {
  if (!browserState.browser) {
    return;
  }

  isOpen = false;
  browserState.browser.active = false;
  mp.gui.cursor.show(false, false);
  mp.events.call("client:chat:authState", true);
  mp.events.call("client:hud:authState", true);
  executeInBrowser(browserState, "window.adminApp && window.adminApp.close();");
}

function openAdminMenu(): void {
  const level = getAdminLevel();
  if (level <= 0 || !isAdminModeEnabled()) {
    return;
  }

  ensureBrowser();
  isOpen = true;
  browserState.browser!.active = true;
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  mp.gui.cursor.show(true, true);
  executeInBrowser(browserState, `window.adminApp && window.adminApp.open(${JSON.stringify(level)}, ${JSON.stringify(collectPlayers())});`);

  // Data requests
  mp.events.callRemote("server:admin:requestFactionData");
  mp.events.callRemote("server:admin:getCommandList");
  if (level >= 5) {
      mp.events.callRemote("server:admin:requestLogs");
  }
  mp.events.callRemote("server:admin:tickets:request");
}

function toggleAdminMenu(): void {
  if (isOpen) {
    closeAdminMenu();
    return;
  }

  openAdminMenu();
}

mp.events.add("playerReady", () => {
  ensureBrowser();
});

mp.events.add("cef:admin:ready", () => {
  if (!markBrowserReady(browserState)) return;
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
  if (isOpen && (!isAdminModeEnabled() || getAdminLevel() <= 0)) {
    closeAdminMenu();
  }
});

mp.events.add("client:admin:setFactions", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.adminApp && window.adminApp.setFactions(${JSON.stringify(payload || "[]")});`);
});

mp.events.add("client:admin:receiveCommands", (payload: string) => {
    executeInBrowser(browserState, `window.adminApp && window.adminApp.setCommands(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:receiveLogs", (payload: string) => {
    executeInBrowser(browserState, `window.adminApp && window.adminApp.setLogs(${JSON.stringify(payload)});`);
});

mp.events.add("client:admin:setTickets", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.adminApp && window.adminApp.setTickets(${JSON.stringify(payload || "[]")});`);
});

mp.events.add("client:admin:setTicketInsight", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.adminApp && window.adminApp.setTicketInsight(${JSON.stringify(payload || "{}")});`);
});

mp.events.add("client:admin:setTicketPlayerHistory", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.adminApp && window.adminApp.setTicketPlayerHistory(${JSON.stringify(payload || "{}")});`);
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

mp.events.add("cef:admin:ticketClaim", (ticketId: number) => {
  mp.events.callRemote("server:admin:tickets:claim", ticketId);
});

mp.events.add("cef:admin:ticketReply", (ticketId: number, message: string, force: boolean) => {
  mp.events.callRemote("server:admin:tickets:reply", ticketId, message, force);
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
