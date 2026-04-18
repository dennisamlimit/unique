/// <reference path="../ragemp-client.d.ts" />
import {
  createBrowserState,
  ensureBrowserInitialized,
  executeInBrowser,
  markBrowserReady
} from "../shared/browser-manager.js";

const browserState = createBrowserState();
let isOpen = false;

const KEY_F6 = 0x75;

function getFactionId() {
  try {
    return Number(mp.players.local.getVariable("FACTION_ID") ?? 0);
  } catch (error) {
    return 0;
  }
}

function ensureBrowser() {
  if (browserState.browser) return;
  ensureBrowserInitialized(browserState, {
    htmlPath: "package://orga/orga.html",
    active: false,
    appName: "orga"
  });
}

function closeMenu() {
  if (!browserState.browser) {
    return;
  }

  isOpen = false;
  browserState.browser.active = false;
  mp.gui.cursor.show(false, false);
  mp.events.call("client:chat:authState", true);
  mp.events.call("client:hud:authState", true);
  executeInBrowser(browserState, "window.orgaApp && window.orgaApp.close();");
}

function openMenu() {
  if (getFactionId() <= 0) {
    return;
  }

  ensureBrowser();
  isOpen = true;
  browserState.browser!.active = true;
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
  markBrowserReady(browserState);
});

mp.events.add("client:orga:open", (...args: unknown[]) => {
  const [payload] = args as [string];
  ensureBrowser();
  isOpen = true;
  browserState.browser!.active = true;
  mp.gui.cursor.show(true, true);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  executeInBrowser(browserState, `window.orgaApp && window.orgaApp.open(${JSON.stringify(payload || "{}")});`);
});

mp.events.add("cef:orga:close", () => {
  closeMenu();
});

mp.events.add("client:orga:setCatalog", (rawCatalog: string) => {
  executeInBrowser(browserState, `window.orgaApp && window.orgaApp.setCatalog(${JSON.stringify(rawCatalog)});`);
});

mp.events.add("client:orga:updateVehicles", (rawVehicles: string, newBalance: number) => {
  executeInBrowser(browserState, `window.orgaApp && window.orgaApp.updateVehicles(${JSON.stringify(rawVehicles)}, ${newBalance});`);
});

mp.events.add("client:orga:updateVehiclesOnly", (rawVehicles: string) => {
  executeInBrowser(browserState, `window.orgaApp && window.orgaApp.updateVehiclesOnly(${JSON.stringify(rawVehicles)});`);
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
  if (isOpen) {
    closeMenu();
    return;
  }

  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (isOpen) {
    closeMenu();
  }
});

mp.events.add("render", () => {
  if (isOpen && getFactionId() <= 0) {
    closeMenu();
  }
});

export {};
