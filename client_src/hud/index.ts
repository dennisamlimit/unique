/// <reference path="../ragemp-client.d.ts" />
import { getUiThemeJson, loadUiTheme } from "../ui-theme";
import {
  createBrowserState,
  ensureBrowserInitialized,
  executeInBrowser,
  markBrowserReady
} from "../shared/browser-manager.js";


const browserState = createBrowserState();
let isAuthenticated = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;
let speedoInterval: ReturnType<typeof setInterval> | null = null;

loadUiTheme();

function pushTheme() {
  executeInBrowser(browserState, `window.hudApp && window.hudApp.setTheme(${getUiThemeJson()});`);
}

function createHudBrowser(): void {
  if (browserState.browser) return;
  ensureBrowserInitialized(browserState, {
    htmlPath: "package://hud/hud.html",
    active: true,
    appName: "hud"
  });
}

function getHeadingLabel(heading: number): string {
  if (heading < 45 || heading >= 315) return "N";
  if (heading < 135) return "W";
  if (heading < 225) return "S";
  return "E";
}

function getOnlineCount(): number {
  try {
    return mp.players.length || 1;
  } catch (error) {
    return 1;
  }
}

function getAccountId(): number {
  try {
    const value = mp.players.local.getVariable("ACCOUNT_ID");
    return Number.isFinite(value) && (value as number) > 0 ? (value as number) : 1;
  } catch (error) {
    return 1;
  }
}

function getCashValue(): number {
  try {
    const value = mp.players.local.getVariable("CASH");
    return Number.isFinite(value) ? (value as number) : 0;
  } catch (error) {
    return 0;
  }
}

function getBankCashValue(): number {
  try {
    const value = mp.players.local.getVariable("BANK_CASH");
    return Number.isFinite(value) ? (value as number) : 0;
  } catch (error) {
    return 0;
  }
}

function hideNativeHudParts(): void {
  if (!isAuthenticated) {
    return;
  }

  // Radio Disable (Safe invocation to prevent "Audio Error" crashes)
  try {
      if (mp.game.audio) {
          mp.game.audio.setRadioToStationName("OFF");
          mp.game.audio.setUserRadioControlEnabled(false);
          mp.game.audio.setMobileRadioEnabledDuringExitedVehicles(false);
      }

      mp.game.invoke("0x4CA036C0F08B9364", "OFF");
      mp.game.invoke("0x19F21E63AE6EBB4D", false);
  } catch (e) { /* silent suppress audio error */ }

  mp.game.controls.disableControlAction(0, 37, true); // Hud Wheel
  mp.game.ui.hideHudComponentThisFrame(6);
  mp.game.ui.hideHudComponentThisFrame(7);
  mp.game.ui.hideHudComponentThisFrame(8);
  mp.game.ui.hideHudComponentThisFrame(9);
  mp.game.ui.hideHudComponentThisFrame(19);
  mp.game.ui.hideHudComponentThisFrame(20);
}

function getZoneName(position: Mp.Vector3): string {
  try {
    const zoneCode = mp.game.zone.getNameOfZone(position.x, position.y, position.z);
    return zoneCode ? (mp.game.ui.getLabelText(zoneCode) || "San Andreas") : "San Andreas";
  } catch (error) {
    return "San Andreas";
  }
}

function updateHud(): void {
  if (!isAuthenticated || !browserState.browser || !browserState.isReady) {
    return;
  }

  try {
    const position = mp.players.local.position;
    const zoneName = getZoneName(position);
    const heading = typeof mp.players.local.getHeading === "function"
      ? mp.players.local.getHeading()
      : 0;

    executeInBrowser(browserState, `window.hudApp && window.hudApp.updateLocation(${JSON.stringify(zoneName)}, ${JSON.stringify("")}, ${JSON.stringify("")}, ${JSON.stringify(getHeadingLabel(heading))});`);
    executeInBrowser(browserState, `window.hudApp && window.hudApp.updateStats(${JSON.stringify(getAccountId())}, ${JSON.stringify(getOnlineCount())}, ${JSON.stringify(getCashValue())}, ${JSON.stringify(getBankCashValue())});`);
  } catch (error) {
    // Prevent timer fatal error if any native call fails.
  }
}

function updateSpeedometer(): void {
  if (!isAuthenticated || !browserState.browser || !browserState.isReady) {
    return;
  }

  const player = mp.players.local;
  const vehicle = player.vehicle;

  if (!vehicle) {
    executeInBrowser(browserState, "window.hudApp && window.hudApp.updateSpeedometer(null);");
    return;
  }

  try {
    const speed = Math.floor(vehicle.getSpeed() * 3.6); // km/h
    const rpm = vehicle.rpm || 0;
    const gear = vehicle.gear || 0;
    const engineOn = typeof vehicle.getIsEngineRunning === "function" ? !!vehicle.getIsEngineRunning() : !!vehicle.engine;
    const locked = !!vehicle.getVariable("IS_LOCKED");

    // Fuel & Health from variables (synced by server)
    const fuel = Number(vehicle.getVariable("FUEL") ?? 100);
    const maxFuel = Number(vehicle.getVariable("MAX_FUEL") ?? 100);
    const fuelType = String(vehicle.getVariable("FUEL_TYPE") ?? "petrol");
    const healthPercent = Number(vehicle.getVariable("HEALTH_PERCENT") ?? 100);

    // Light states
    let headlightsOn = false;
    try {
        const lights = mp.game.vehicle.getLightsState(vehicle.handle);
        headlightsOn = !!(lights && (lights.lightsOn || lights.highbeamsOn));
    } catch (e) { /* ignore lights error */ }

    const data = {
      speed,
      rpm,
      gear,
      engineOn,
      locked,
      fuel,
      maxFuel,
      fuelType,
      healthPercent,
      headlightsOn
    };

    executeInBrowser(browserState, `window.hudApp && window.hudApp.updateSpeedometer(${JSON.stringify(data)});`);
  } catch (error) {
    // Log once or occasionally to CEF console to avoid flood but still alert developers
    executeInBrowser(browserState, `console.error("HUD Speedo Update Error: ${error instanceof Error ? error.message : String(error)}");`);
  }
}

function startHudTick(): void {
  if (tickInterval) {
    return;
  }

  tickInterval = setInterval(updateHud, 700);
  speedoInterval = setInterval(updateSpeedometer, 100);
}

function stopHudTick(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (speedoInterval) {
    clearInterval(speedoInterval);
    speedoInterval = null;
  }
}

mp.events.add("playerReady", () => {
  createHudBrowser();
});
createHudBrowser();

mp.events.add("render", () => {
  hideNativeHudParts();
});

mp.events.add("cef:hud:ready", () => {
  if (!markBrowserReady(browserState)) {
    return;
  }
  pushTheme();
  executeInBrowser(browserState, `window.hudApp && window.hudApp.setVisible(${JSON.stringify(isAuthenticated)});`);
  updateHud();
});

mp.events.add("client:hud:authState", (...args: unknown[]) => {
  const [authState] = args;
  isAuthenticated = !!authState;
  executeInBrowser(browserState, `window.hudApp && window.hudApp.setVisible(${JSON.stringify(isAuthenticated)});`);

  if (isAuthenticated) {
    startHudTick();
    updateHud();
  } else {
    stopHudTick();
  }
});

mp.events.add("client:hud:notify", (...args: unknown[]) => {
  const [type, title, message] = args as [string, string, string];
  executeInBrowser(browserState, `window.hudApp && window.hudApp.addNotification(${JSON.stringify(type)}, ${JSON.stringify(title)}, ${JSON.stringify(message)});`);
});

mp.events.add("client:adminJail:show", (...args: unknown[]) => {
  const [rawData] = args as [string];
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawData || "{}");
  } catch (error) {
    data = {};
  }

  executeInBrowser(browserState, `window.hudApp && window.hudApp.showJail(${JSON.stringify(data)});`);
});

mp.events.add("client:adminJail:hide", () => {
  executeInBrowser(browserState, "window.hudApp && window.hudApp.hideJail();");
});

mp.events.add("client:tickets:hudData", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.hudApp && window.hudApp.setAdminTickets(${JSON.stringify(payload || "{\"visible\":false,\"openCount\":0,\"tickets\":[]}")});`);
});

mp.events.add("client:tickets:playerHudData", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.hudApp && window.hudApp.setPlayerTicket(${JSON.stringify(payload || "{\"visible\":false,\"ticket\":null}")});`);
});

mp.events.add("client:tickets:mute", (...args: unknown[]) => {
  const [payload] = args as [string];
  executeInBrowser(browserState, `window.hudApp && window.hudApp.showTicketMute(${JSON.stringify(payload || "{}")});`);
});

mp.events.add("client:tickets:muteClear", () => {
  executeInBrowser(browserState, "window.hudApp && window.hudApp.hideTicketMute();");
});

mp.events.add("client:uiTheme:sync", () => {
  pushTheme();
});

// Keybinds for Vehicle
mp.keys.bind(0x11, true, () => {
    // CTRL
    if (!mp.gui.cursor.visible && mp.players.local.vehicle) {
        mp.events.callRemote("server:vehicle:toggleEngine");
    }
});

mp.keys.bind(0x4C, true, () => {
    // L
    if (!mp.gui.cursor.visible) {
        mp.events.callRemote("server:vehicle:toggleLock");
    }
});

export {};
