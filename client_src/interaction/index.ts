/// <reference path="../ragemp-client.d.ts" />

interface VehicleAimResult {
  distance: number;
  alignment: number;
  sideDistance: number;
  score: number;
}

interface InteractionState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  targetVehicle: Mp.Vehicle | null;
  lastScan: number;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
  overlayBatch: Mp.EntityOverlayBatch | null;
  overlaySupported: boolean | null;
}

const state: InteractionState = {
  browser: null,
  isReady: false,
  isOpen: false,
  targetVehicle: null,
  lastScan: 0,
  pendingActions: [],
  readyProbe: null,
  overlayBatch: null,
  overlaySupported: null
};

const KEY_G = 0x47;
const INTERACTION_RANGE = 8.0;
const SCAN_INTERVAL_MS = 90;
const OUTLINE_COLOR: [number, number, number, number] = [85, 20, 128, 190];
const OUTLINE_OVERLAY_PARAMS = {
  enableDepth: false,
  deleteWhenUnused: false,
  keepNonBlurred: true,
  processAttachments: false,
  fill: { enable: false, color: 0xFFFFFFFF },
  noise: { enable: false, size: 0.0, speed: 0.0, intensity: 0.0 },
  outline: { enable: true, color: 0xAA3B0B5F, width: 2.0, blurRadius: 0.3, blurIntensity: 0.45 },
  wireframe: { enable: false }
};

function sendSystemMessage(message: string): void {
  try {
    mp.events.call("client:chat:addMessage", "system", "System", message);
  } catch (error) {
    // Chat might not be ready yet.
  }

  try {
    mp.game.graphics.notify(message);
  } catch (error) {
    // Notification is only diagnostic sugar.
  }
}

function flushPending(): void {
  if (!state.browser || !state.isReady) {
    return;
  }

  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

function executeInteraction(js: string): void {
  if (!state.browser || !state.isReady) {
    state.pendingActions.push(js);
    return;
  }

  state.browser.execute(js);
}

function startReadyProbe(): void {
  if (state.readyProbe) {
    clearInterval(state.readyProbe);
  }

  state.readyProbe = setInterval(() => {
    if (!state.browser || state.isReady) {
      clearInterval(state.readyProbe!);
      state.readyProbe = null;
      return;
    }

    state.browser.execute(`
      if (window.interactionApp && !window.__interactionReadyNotified) {
        window.__interactionReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:interaction:ready");
        }
      }
    `);
  }, 300);
}

function ensureBrowser(): void {
  if (state.browser) {
    return;
  }

  state.browser = mp.browsers.new("package://interaction/interaction.html");
  state.browser.active = false;
  startReadyProbe();
}

function isGameplayInputAllowed(): boolean {
  if (state.isOpen || mp.gui.cursor.visible) {
    return false;
  }

  try {
    return !mp.game.ui.isPauseMenuActive();
  } catch (error) {
    return true;
  }
}

function getCameraDirection(): Mp.Vector3 {
  const rotation = mp.game.cam.getGameplayCamRot(2);
  const pitch = rotation.x * Math.PI / 180.0;
  const yaw = rotation.z * Math.PI / 180.0;
  const cosPitch = Math.cos(pitch);

  return normalizeVector(new mp.Vector3(
    -Math.sin(yaw) * cosPitch,
    Math.cos(yaw) * cosPitch,
    Math.sin(pitch)
  ));
}

function getCameraOrigin(): Mp.Vector3 {
  try {
    if (mp.game.cam && typeof mp.game.cam.getGameplayCamCoord === "function") {
      return mp.game.cam.getGameplayCamCoord();
    }
  } catch (error) {
    // Some client builds do not expose this wrapper.
  }

  const position = mp.players.local.position;
  return new mp.Vector3(position.x, position.y, position.z + 0.9);
}

function getDistance(a: Mp.Vector3, b: Mp.Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalizeVector(vector: Mp.Vector3): Mp.Vector3 {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  if (!length) {
    return new mp.Vector3(0, 0, 0);
  }

  return new mp.Vector3(vector.x / length, vector.y / length, vector.z / length);
}

function dotProduct(a: Mp.Vector3, b: Mp.Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function collectVehicle(vehicle: Mp.Vehicle, vehicles: Mp.Vehicle[]): void {
  if (!vehicle || !vehicle.position) {
    return;
  }

  if (vehicle === (mp.players.local as any).vehicle) {
    return;
  }

  vehicles.push(vehicle);
}

function getStreamedVehicles(): Mp.Vehicle[] {
  const vehicles: Mp.Vehicle[] = [];

  try {
    if (mp.vehicles && typeof mp.vehicles.forEachInStreamRange === "function") {
      mp.vehicles.forEachInStreamRange((vehicle) => collectVehicle(vehicle, vehicles));
    }
  } catch (error) {
    // Try the generic collection below.
  }

  try {
    if (vehicles.length === 0 && mp.vehicles && typeof mp.vehicles.forEach === "function") {
      mp.vehicles.forEach((vehicle) => collectVehicle(vehicle, vehicles));
    }
  } catch (error) {
    // Try array-style collection below.
  }

  try {
    if (vehicles.length === 0 && mp.vehicles && typeof mp.vehicles.toArray === "function") {
      mp.vehicles.toArray().forEach((vehicle) => collectVehicle(vehicle, vehicles));
    }
  } catch (error) {
    // No usable vehicle collection exposed.
  }

  return vehicles;
}

function isVehicleInAim(
  vehicle: Mp.Vehicle,
  origin: Mp.Vector3,
  direction: Mp.Vector3
): VehicleAimResult | null {
  const vehiclePosition = new mp.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z + 0.65);
  const distance = getDistance(origin, vehiclePosition);
  if (distance > INTERACTION_RANGE) {
    return null;
  }

  const toVehicle = normalizeVector(new mp.Vector3(
    vehiclePosition.x - origin.x,
    vehiclePosition.y - origin.y,
    vehiclePosition.z - origin.z
  ));
  const alignment = dotProduct(direction, toVehicle);

  if (alignment < 0.72) {
    return null;
  }

  const forwardDistance = distance * alignment;
  const sideDistance = Math.sqrt(Math.max(0, distance * distance - forwardDistance * forwardDistance));
  const maxSideDistance = 1.4 + distance * 0.09;

  if (sideDistance > maxSideDistance) {
    return null;
  }

  return {
    distance,
    alignment,
    sideDistance,
    score: alignment * 2.0 - sideDistance * 0.32 - distance * 0.035
  };
}

function findVehicleInView(): Mp.Vehicle | null {
  const origin = getCameraOrigin();
  const direction = getCameraDirection();
  const vehicles = getStreamedVehicles();
  let bestVehicle: Mp.Vehicle | null = null;
  let bestScore = -999;

  vehicles.forEach((vehicle) => {
    const aim = isVehicleInAim(vehicle, origin, direction);
    if (!aim) {
      return;
    }

    if (aim.score > bestScore) {
      bestScore = aim.score;
      bestVehicle = vehicle;
    }
  });

  return bestVehicle;
}

function ensureOverlayBatch(): Mp.EntityOverlayBatch | null {
  if (state.overlaySupported === false) {
    return null;
  }

  if (state.overlayBatch) {
    try {
      if (typeof state.overlayBatch.update === "function") {
        state.overlayBatch.update(OUTLINE_OVERLAY_PARAMS);
      }
    } catch (error) {
      // Reuse the existing batch if update is not accepted on this client.
    }

    return state.overlayBatch;
  }

  try {
    if (
      mp.game.graphics &&
      typeof mp.game.graphics.setEntityOverlayPassEnabled === "function" &&
      typeof mp.game.graphics.createEntityOverlayBatch === "function"
    ) {
      mp.game.graphics.setEntityOverlayPassEnabled(true);
      state.overlayBatch = mp.game.graphics.createEntityOverlayBatch(OUTLINE_OVERLAY_PARAMS);
      state.overlaySupported = !!state.overlayBatch;
      return state.overlayBatch;
    }
  } catch (error) {
    state.overlaySupported = false;
    return null;
  }

  state.overlaySupported = false;
  return null;
}

function drawVehicleOutline(vehicle: Mp.Vehicle | null): void {
  const batch = ensureOverlayBatch();
  if (!batch || !vehicle) {
    return;
  }

  try {
    batch.addThisFrame(vehicle);
    if (typeof batch.removeThisFrame === "function" && mp.players) {
      if (typeof mp.players.forEachInStreamRange === "function") {
        mp.players.forEachInStreamRange((player) => batch.removeThisFrame(player));
      } else if (typeof mp.players.forEach === "function") {
        mp.players.forEach((player) => batch.removeThisFrame(player));
      } else if (mp.players.local) {
        batch.removeThisFrame(mp.players.local);
      }
    }
  } catch (error) {
    state.overlaySupported = false;
  }
}

function drawInteractionHint(vehicle: Mp.Vehicle | null): void {
  if (!vehicle || !vehicle.position) {
    return;
  }

  try {
    mp.game.graphics.drawMarker(
      2,
      vehicle.position.x,
      vehicle.position.y,
      vehicle.position.z + 1.55,
      0, 0, 0,
      0, 180, 0,
      0.28, 0.28, 0.28,
      OUTLINE_COLOR[0], OUTLINE_COLOR[1], OUTLINE_COLOR[2], 200,
      false,
      true,
      2,
      false,
      null,
      null,
      false
    );
  } catch (error) {
    // Marker is just a helper.
  }

  try {
    mp.game.graphics.drawText("G  Interagieren", [0.5, 0.58], {
      font: 4,
      color: [236, 218, 255, 230],
      scale: [0.34, 0.34],
      outline: true
    });
  } catch (error) {
    // Text hint is optional.
  }
}

function scanVehicleTarget(): void {
  if (state.isOpen || mp.gui.cursor.visible) {
    return;
  }

  const now = Date.now();
  if (now - state.lastScan >= SCAN_INTERVAL_MS) {
    state.lastScan = now;
    state.targetVehicle = findVehicleInView();
  }

  if (state.targetVehicle) {
    drawVehicleOutline(state.targetVehicle);
    drawInteractionHint(state.targetVehicle);
  }
}

function closeMenu(): void {
  if (!state.browser) {
    return;
  }

  state.isOpen = false;
  state.browser.active = false;
  mp.gui.cursor.show(false, false);
  executeInteraction("window.interactionApp && window.interactionApp.close();");
}

function getVehicleLabel(vehicle: Mp.Vehicle): string {
  try {
    if (vehicle && typeof vehicle.getNumberPlateText === "function") {
      return vehicle.getNumberPlateText() || "Fahrzeug";
    }
  } catch (error) {
    // Use default below.
  }

  return "Fahrzeug";
}

function openMenu(): void {
  const target = state.targetVehicle || findVehicleInView();
  if (!target) {
    const streamedCount = getStreamedVehicles().length;
    sendSystemMessage(`Kein Fahrzeug im Blick. Gestreamte Fahrzeuge: ${streamedCount}`);
    return;
  }

  if (!isGameplayInputAllowed()) {
    return;
  }

  state.targetVehicle = target;
  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.gui.cursor.show(true, true);

  let x = 960;
  let y = 540;
  try {
    const resolution = mp.game.graphics.getScreenResolution(0, 0);
    if (resolution && Number.isFinite(resolution.x) && Number.isFinite(resolution.y)) {
      x = Math.round(resolution.x / 2);
      y = Math.round(resolution.y / 2);
    }
  } catch (error) {
    // Default center fallback is fine.
  }

  executeInteraction(`window.interactionApp && window.interactionApp.open(${x}, ${y}, ${JSON.stringify(getVehicleLabel(target))});`);
}

mp.events.add("cef:interaction:ready", () => {
  state.isReady = true;
  flushPending();
});

mp.events.add("cef:interaction:close", () => {
  closeMenu();
});

mp.events.add("cef:interaction:select", (...args: unknown[]) => {
  const [action] = args;
  sendSystemMessage(`Interaktion ${action} ist bald verfuegbar.`);
});

mp.keys.bind(KEY_G, true, () => {
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
  scanVehicleTarget();
});

export {};
