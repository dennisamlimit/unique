/// <reference path="../ragemp-client.d.ts" />

interface OrgaState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
}

const state: OrgaState = {
  browser: null,
  isReady: false,
  isOpen: false,
  pendingActions: [],
  readyProbe: null
};

const KEY_F6 = 0x75;

function getFactionId() {
  try {
    return Number(mp.players.local.getVariable("FACTION_ID") ?? 0);
  } catch (error) {
    return 0;
  }
}

function flushPending() {
  if (!state.browser || !state.isReady) {
    return;
  }

  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

function executeOrga(js: string) {
  if (!state.browser || !state.isReady) {
    state.pendingActions.push(js);
    return;
  }

  state.browser.execute(js);
}

function stopReadyProbe() {
  if (!state.readyProbe) {
    return;
  }

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
      if (window.orgaApp && !window.__orgaReadyNotified) {
        window.__orgaReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:orga:ready");
        }
      }
    `);
  }, 300);
}

function ensureBrowser() {
  if (state.browser) {
    return;
  }

  state.browser = mp.browsers.new("package://orga/orga.html");
  state.browser.active = false;
  startReadyProbe();
}

function closeMenu() {
  if (!state.browser) {
    return;
  }

  state.isOpen = false;
  state.browser.active = false;
  mp.gui.cursor.show(false, false);
  mp.events.call("client:chat:authState", true);
  mp.events.call("client:hud:authState", true);
  executeOrga("window.orgaApp && window.orgaApp.close();");
}

function openMenu() {
  if (getFactionId() <= 0) {
    return;
  }

  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  mp.events.callRemote("server:orga:open");
}

mp.events.add("playerReady", () => {
  ensureBrowser();
});

mp.events.add("client:orga:requestOpen", () => {
  openMenu();
});

mp.events.add("cef:orga:ready", () => {
  state.isReady = true;
  stopReadyProbe();
  flushPending();
});

mp.events.add("client:orga:open", (...args: unknown[]) => {
  const [payload] = args as [string];
  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  executeOrga(`window.orgaApp && window.orgaApp.open(${JSON.stringify(payload || "{}")});`);
});

mp.events.add("cef:orga:close", () => {
  closeMenu();
});

mp.events.add("client:orga:setCatalog", (rawCatalog: string) => {
  executeOrga(`window.orgaApp && window.orgaApp.setCatalog(${JSON.stringify(rawCatalog)});`);
});

mp.events.add("client:orga:updateVehicles", (rawVehicles: string, newBalance: number) => {
  executeOrga(`window.orgaApp && window.orgaApp.updateVehicles(${JSON.stringify(rawVehicles)}, ${newBalance});`);
});

mp.events.add("client:orga:updateVehiclesOnly", (rawVehicles: string) => {
  executeOrga(`window.orgaApp && window.orgaApp.updateVehiclesOnly(${JSON.stringify(rawVehicles)});`);
});

mp.events.add("cef:orga:setRank", (...args: unknown[]) => {
  const [accountId, rankLevel] = args;
  mp.events.callRemote("server:orga:setMemberRank", accountId, rankLevel);
});

mp.events.add("cef:orga:setRankName", (...args: unknown[]) => {
  const [rankLevel, rankName] = args;
  mp.events.callRemote("server:orga:setRankName", rankLevel, rankName);
});

mp.events.add("cef:orga:setRankPermission", (...args: unknown[]) => {
  const [rankLevel, permissionKey, granted] = args;
  mp.events.callRemote("server:orga:setRankPermission", rankLevel, permissionKey, granted);
});

mp.events.add("cef:orga:parkVehicle", () => {
  mp.events.callRemote("server:orga:parkCurrentVehicle");
});

mp.events.add("cef:orga:setVehicleRank", (...args: unknown[]) => {
  const [factionVehicleId, minRankLevel] = args;
  mp.events.callRemote("server:orga:setVehicleRank", factionVehicleId, minRankLevel);
});

mp.events.add("cef:orga:createOutfit", (...args: unknown[]) => {
  const [category, name, clothingJson] = args;
  mp.events.callRemote("server:orga:createOutfit", category, name, clothingJson);
});

mp.events.add("cef:orga:deleteOutfit", (...args: unknown[]) => {
  const [outfitId] = args;
  mp.events.callRemote("server:orga:deleteOutfit", outfitId);
});

mp.events.add("cef:orga:createVehicle", (...args: unknown[]) => {
  const [minRankLevel, modelName, displayName] = args;
  mp.events.callRemote("server:orga:createVehicle", minRankLevel, modelName, displayName);
});

mp.events.add("cef:orga:deleteVehicle", (...args: unknown[]) => {
  const [factionVehicleId] = args;
  mp.events.callRemote("server:orga:deleteVehicle", factionVehicleId);
});

mp.events.add("server:orga:buyVehicle", (catalogId: number) => {
  mp.events.callRemote("server:orga:buyVehicle", catalogId);
});

mp.events.add("server:orga:spawnVehicle", (factionVehicleId: number) => {
  mp.events.callRemote("server:orga:spawnVehicle", factionVehicleId);
});

mp.events.add("server:orga:parkVehicle", (factionVehicleId: number) => {
  mp.events.callRemote("server:orga:parkVehicle", factionVehicleId);
});

mp.events.add("server:orga:getCatalog", () => {
  mp.events.callRemote("server:orga:getCatalog");
});

mp.keys.bind(KEY_F6, true, () => {
  if (state.isOpen) {
    closeMenu();
    return;
  }

  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (state.isOpen) {
    closeMenu();
  }
});

mp.events.add("render", () => {
  if (state.isOpen && getFactionId() <= 0) {
    closeMenu();
  }
});

export {};
