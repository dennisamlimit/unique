/// <reference path="../ragemp-client.d.ts" />

interface HudState {
  browser: Mp.Browser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
  tickInterval: ReturnType<typeof setInterval> | null;
}

const state: HudState = {
  browser: null,
  isAuthenticated: false,
  isReady: false,
  pendingActions: [],
  readyProbe: null,
  tickInterval: null
};

function flushPending(): void {
  if (!state.browser || !state.isReady) {
    return;
  }

  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

function executeHud(js: string): void {
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
      if (window.hudApp && !window.__hudReadyNotified) {
        window.__hudReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:hud:ready");
        }
      }
    `);
  }, 300);
}

function createHudBrowser(): void {
  if (state.browser) {
    return;
  }

  state.browser = mp.browsers.new("package://hud/hud.html");
  state.browser.active = true;
  startReadyProbe();
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
  if (!state.isAuthenticated) {
    return;
  }

  mp.game.controls.disableControlAction(0, 37, true);
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
  if (!state.isAuthenticated || !state.browser || !state.isReady) {
    return;
  }

  try {
    const position = mp.players.local.position;
    const zoneName = getZoneName(position);
    const heading = typeof mp.players.local.getHeading === "function"
      ? mp.players.local.getHeading()
      : 0;

    executeHud(`window.hudApp && window.hudApp.updateLocation(${JSON.stringify(zoneName)}, ${JSON.stringify("")}, ${JSON.stringify("")}, ${JSON.stringify(getHeadingLabel(heading))});`);
    executeHud(`window.hudApp && window.hudApp.updateStats(${JSON.stringify(getAccountId())}, ${JSON.stringify(getOnlineCount())}, ${JSON.stringify(getCashValue())}, ${JSON.stringify(getBankCashValue())});`);
  } catch (error) {
    // Prevent timer fatal error if any native call fails.
  }
}

function startHudTick(): void {
  if (state.tickInterval) {
    return;
  }

  state.tickInterval = setInterval(updateHud, 700);
}

function stopHudTick(): void {
  if (!state.tickInterval) {
    return;
  }

  clearInterval(state.tickInterval);
  state.tickInterval = null;
}

mp.events.add("playerReady", () => {
  createHudBrowser();
});

mp.events.add("render", () => {
  hideNativeHudParts();
});

mp.events.add("cef:hud:ready", () => {
  if (state.isReady) {
    return;
  }

  state.isReady = true;
  stopReadyProbe();
  flushPending();
  executeHud(`window.hudApp && window.hudApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
  updateHud();
});

mp.events.add("client:hud:authState", (...args: unknown[]) => {
  const [authState] = args;
  state.isAuthenticated = !!authState;
  executeHud(`window.hudApp && window.hudApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);

  if (state.isAuthenticated) {
    startHudTick();
    updateHud();
  } else {
    stopHudTick();
  }
});

mp.events.add("client:adminJail:show", (...args: unknown[]) => {
  const [rawData] = args as [string];
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawData || "{}");
  } catch (error) {
    data = {};
  }

  executeHud(`window.hudApp && window.hudApp.showJail(${JSON.stringify(data)});`);
});

mp.events.add("client:adminJail:hide", () => {
  executeHud("window.hudApp && window.hudApp.hideJail();");
});

export {};
