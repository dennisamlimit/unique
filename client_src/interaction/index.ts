/// <reference path="../ragemp-client.d.ts" />
import { ClothingLib } from "@shared/clothing-lib";
import { getUiTheme, getUiThemeJson, hexToRgb, loadUiTheme } from "../ui-theme";

interface VehicleAimResult {
  distance: number;
  alignment: number;
  sideDistance: number;
  score: number;
}

interface InteractionAction {
  id: string;
  label: string;
  hint: string;
}

interface WardrobePoint {
  wardrobePointId: number;
  factionId: number;
  label: string;
  x: number;
  y: number;
  z: number;
  rotZ: number;
  dimension: number;
}

interface WardrobeOutfit {
  outfitId: number;
  factionId: number;
  category: string;
  name: string;
  clothingJson: string;
  createdAt: string;
}

interface WardrobeAppearanceSnapshot {
  components: Record<number, { drawableId: number; textureId: number }>;
}

interface InteractionState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  targetVehicle: Mp.Vehicle | null;
  targetWardrobe: WardrobePoint | null;
  wardrobePoints: WardrobePoint[];
  wardrobeOutfits: WardrobeOutfit[];
  lastScan: number;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
  overlayBatch: Mp.EntityOverlayBatch | null;
  overlaySupported: boolean | null;
  wardrobeCatalogJson: string | null;
  wardrobeUiReady: boolean;
  wardrobePendingActions: string[];
  wardrobeReadyProbe: ReturnType<typeof setInterval> | null;
  wardrobeOpenPointId: number | null;
  wardrobeDismissedPointId: number | null;
  wardrobeCommittedAppearance: WardrobeAppearanceSnapshot | null;
  wardrobePreviewActive: boolean;
  targetAtm: Mp.Object | null;
}

const state: InteractionState & { wardrobeBrowser: Mp.Browser | null, wardrobeVisible: boolean } = {
  browser: null,
  wardrobeBrowser: null,
  wardrobeVisible: false,
  isReady: false,
  isOpen: false,
  targetVehicle: null,
  targetWardrobe: null,
  wardrobePoints: [],
  wardrobeOutfits: [],
  lastScan: 0,
  pendingActions: [],
  readyProbe: null,
  overlayBatch: null,
  overlaySupported: null,
  wardrobeCatalogJson: null,
  wardrobeUiReady: false,
  wardrobePendingActions: [],
  wardrobeReadyProbe: null,
  wardrobeOpenPointId: null,
  wardrobeDismissedPointId: null,
  wardrobeCommittedAppearance: null,
  wardrobePreviewActive: false,
  targetAtm: null
};

const KEY_G = 0x47;
const INTERACTION_RANGE = 8.0;
const WARDROBE_RANGE = 3.75;
const ATM_RANGE = 1.2;
const MARKER_DRAW_DISTANCE = 35.0;
const SCAN_INTERVAL_MS = 100;
loadUiTheme();

let OUTLINE_COLOR: [number, number, number, number] = [217, 70, 239, 190];
let WARDROBE_COLOR: [number, number, number, number] = [168, 85, 247, 220];

// --- Wardrobe Browser Support ---
function ensureWardrobeBrowser(): void {
  if (state.wardrobeBrowser) return;
  state.wardrobeBrowser = mp.browsers.new("package://wardrobe/wardrobe.html");
  state.wardrobeBrowser.active = false;
  state.wardrobeUiReady = false;
  startWardrobeReadyProbe();
}

function executeWardrobe(js: string): void {
  if (!state.wardrobeBrowser || !state.wardrobeUiReady) {
    state.wardrobePendingActions.push(js);
    return;
  }

  state.wardrobeBrowser.execute(js);
}

function flushWardrobePending(): void {
  if (!state.wardrobeBrowser || !state.wardrobeUiReady) {
    return;
  }

  while (state.wardrobePendingActions.length > 0) {
    state.wardrobeBrowser.execute(state.wardrobePendingActions.shift()!);
  }
}

function startWardrobeReadyProbe(): void {
  if (state.wardrobeReadyProbe) {
    clearInterval(state.wardrobeReadyProbe);
  }

  state.wardrobeReadyProbe = setInterval(() => {
    if (!state.wardrobeBrowser || state.wardrobeUiReady) {
      clearInterval(state.wardrobeReadyProbe!);
      state.wardrobeReadyProbe = null;
      return;
    }

    state.wardrobeBrowser.execute(`
      if (window.wardrobeApp && !window.__wardrobeReadyNotified) {
        window.__wardrobeReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:wardrobe:ready");
        }
      }
    `);
  }, 300);
}

function openWardrobe(): void {
  if (state.wardrobeVisible || mp.gui.cursor.visible) return;
  
  const wardrobePoint = state.targetWardrobe || findNearbyWardrobe();
  if (!wardrobePoint) {
    return;
  }

  ensureWardrobeBrowser();
  state.targetWardrobe = wardrobePoint;
  state.wardrobeVisible = true;
  state.wardrobeOpenPointId = wardrobePoint.wardrobePointId;
  state.wardrobeDismissedPointId = null;
  state.wardrobeCommittedAppearance = captureWardrobeAppearance();
  state.wardrobePreviewActive = false;
  state.wardrobeBrowser!.active = true;
  mp.gui.cursor.show(true, true);
  
  // Request catalog from server
  mp.events.callRemote("server:wardrobe:requestCatalog");
  
  executeWardrobe("window.wardrobeApp && window.wardrobeApp.show();");
}

function closeWardrobe(): void {
  if (!state.wardrobeVisible) return;
  restoreWardrobePreview();
  state.wardrobeVisible = false;
  state.wardrobeDismissedPointId = state.wardrobeOpenPointId;
  state.wardrobeOpenPointId = null;
  if (state.wardrobeBrowser) state.wardrobeBrowser.active = false;
  mp.gui.cursor.show(false, false);
  executeWardrobe("window.wardrobeApp && window.wardrobeApp.hide();");
}

function scanTargets(): void {
  drawWardrobeMarkers();

  if (state.isOpen || state.wardrobeVisible || mp.gui.cursor.visible) {
    return;
  }

  const now = Date.now();
  if (now - state.lastScan >= SCAN_INTERVAL_MS) {
    state.lastScan = now;
    state.targetWardrobe = findNearbyWardrobe();

    if (!state.targetWardrobe) {
      state.wardrobeDismissedPointId = null;
    }
    
    // Auto-trigger wardrobe
    if (state.targetWardrobe) {
      const dist = getHorizontalDistance(mp.players.local.position, new mp.Vector3(state.targetWardrobe.x, state.targetWardrobe.y, state.targetWardrobe.z));
      if (state.wardrobeDismissedPointId !== state.targetWardrobe.wardrobePointId && dist <= WARDROBE_RANGE) {
        openWardrobe();
        return;
      }
    }

    state.targetAtm = state.targetWardrobe ? null : findNearbyAtm();
    state.targetVehicle = (state.targetWardrobe || state.targetAtm) ? null : findVehicleInView();
  }

  if (state.targetWardrobe) {
    drawWardrobeHint(state.targetWardrobe);
    return;
  }

  if (state.targetAtm) {
    drawAtmHint(state.targetAtm);
    return;
  }

  if (state.targetVehicle) {
    drawVehicleOutline(state.targetVehicle);
    drawVehicleHint(state.targetVehicle);
  }
}

function toOverlayColorHex(r: number, g: number, b: number, a: number): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

function getOutlineOverlayParams() {
  return {
    enableDepth: false,
    deleteWhenUnused: false,
    keepNonBlurred: true,
    processAttachments: false,
    fill: { enable: false, color: 0xFFFFFFFF },
    noise: { enable: false, size: 0.0, speed: 0.0, intensity: 0.0 },
    outline: { enable: true, color: toOverlayColorHex(OUTLINE_COLOR[0], OUTLINE_COLOR[1], OUTLINE_COLOR[2], 170), width: 2.0, blurRadius: 0.3, blurIntensity: 0.45 },
    wireframe: { enable: false }
  };
}

function pushInteractionTheme(): void {
  const theme = getUiTheme();
  const primary = hexToRgb(theme.primary, theme.primary);
  const secondary = hexToRgb(theme.secondary, theme.secondary);
  OUTLINE_COLOR = [primary.r, primary.g, primary.b, 190];
  WARDROBE_COLOR = [secondary.r, secondary.g, secondary.b, 220];

  if (state.overlayBatch) {
    try {
      state.overlayBatch.update(getOutlineOverlayParams());
    } catch (error) {}
  }

  executeInteraction(`window.interactionApp && window.interactionApp.setTheme(${getUiThemeJson()});`);
}

const VEHICLE_ACTIONS: InteractionAction[] = [
  { id: "lock", label: "Abschliessen", hint: "Bald verfuegbar" },
  { id: "trunk", label: "Kofferraum", hint: "Bald verfuegbar" },
  { id: "info", label: "Fahrzeuginfo", hint: "Bald verfuegbar" },
  { id: "park", label: "Parken", hint: "Bald verfuegbar" }
];

function getWardrobeActions(point: WardrobePoint): InteractionAction[] {
  return state.wardrobeOutfits.map((outfit) => ({
    id: `wardrobe:${point.wardrobePointId}:${outfit.outfitId}`,
    label: outfit.name,
    hint: outfit.category || "dienst"
  }));
}

function sendSystemMessage(message: string): void {
  try {
    mp.events.call("client:chat:addMessage", "system", "System", message);
  } catch (error) {}

  try {
    mp.game.graphics.notify(message);
  } catch (error) {}
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
  if (state.isOpen || state.wardrobeVisible || mp.gui.cursor.visible) {
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

  return normalizeVector(new mp.Vector3(-Math.sin(yaw) * cosPitch, Math.cos(yaw) * cosPitch, Math.sin(pitch)));
}

function getCameraOrigin(): Mp.Vector3 {
  try {
    if (mp.game.cam && typeof mp.game.cam.getGameplayCamCoord === "function") {
      return mp.game.cam.getGameplayCamCoord();
    }
  } catch (error) {}

  const position = mp.players.local.position;
  return new mp.Vector3(position.x, position.y, position.z + 0.9);
}

function getDistance(a: Mp.Vector3, b: Mp.Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getHorizontalDistance(a: Mp.Vector3, b: Mp.Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
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
  } catch (error) {}

  try {
    if (vehicles.length === 0 && mp.vehicles && typeof mp.vehicles.forEach === "function") {
      mp.vehicles.forEach((vehicle) => collectVehicle(vehicle, vehicles));
    }
  } catch (error) {}

  try {
    if (vehicles.length === 0 && mp.vehicles && typeof mp.vehicles.toArray === "function") {
      mp.vehicles.toArray().forEach((vehicle) => collectVehicle(vehicle, vehicles));
    }
  } catch (error) {}

  return vehicles;
}

function isVehicleInAim(vehicle: Mp.Vehicle, origin: Mp.Vector3, direction: Mp.Vector3): VehicleAimResult | null {
  const vehiclePosition = new mp.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z + 0.65);
  const distance = getDistance(origin, vehiclePosition);
  if (distance > INTERACTION_RANGE) {
    return null;
  }

  const toVehicle = normalizeVector(new mp.Vector3(vehiclePosition.x - origin.x, vehiclePosition.y - origin.y, vehiclePosition.z - origin.z));
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

  return { distance, alignment, sideDistance, score: alignment * 2.0 - sideDistance * 0.32 - distance * 0.035 };
}

function findVehicleInView(): Mp.Vehicle | null {
  const origin = getCameraOrigin();
  const direction = getCameraDirection();
  let bestVehicle: Mp.Vehicle | null = null;
  let bestScore = -999;

  getStreamedVehicles().forEach((vehicle) => {
    const aim = isVehicleInAim(vehicle, origin, direction);
    if (aim && aim.score > bestScore) {
      bestScore = aim.score;
      bestVehicle = vehicle;
    }
  });

  return bestVehicle;
}

function findNearbyWardrobe(): WardrobePoint | null {
  const player = mp.players.local;
  const dimension = Number((player as any).dimension ?? 0);
  let nearest: WardrobePoint | null = null;
  let nearestDistance = WARDROBE_RANGE;

  state.wardrobePoints.forEach((point) => {
    if (Number(point.dimension) !== dimension) {
      return;
    }

    const pointPosition = new mp.Vector3(point.x, point.y, point.z);
    const heightDelta = Math.abs(player.position.z - pointPosition.z);
    if (heightDelta > 2.5) {
      return;
    }

    const distance = getHorizontalDistance(player.position, pointPosition);
    if (distance <= nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  });

  return nearest;
}

const ATM_MODELS = [
  "prop_atm_01",
  "prop_atm_02",
  "prop_atm_03",
  "prop_fleeca_atm"
];

function findNearbyAtm(): Mp.Object | null {
  const player = mp.players.local;
  const pos = player.position;

  for (const modelName of ATM_MODELS) {
    const hash = mp.game.joaat(modelName);
    const handle = mp.game.object.getClosestObjectOfType(pos.x, pos.y, pos.z, ATM_RANGE, hash, false, false, false);
    
    if (handle !== 0) {
      // Return a temporary object-like interface if RAGE doesn't automatically wrap the handle
      // In RAGE:MP, if it's a world object, we might just need the handle or a proxy
      return { 
        handle, 
        position: mp.game.entity.getCoords(handle, true),
        model: hash 
      } as any;
    }
  }

  return null;
}

function ensureOverlayBatch(): Mp.EntityOverlayBatch | null {
  if (state.overlaySupported === false) {
    return null;
  }

  if (state.overlayBatch) {
    try {
      if (typeof state.overlayBatch.update === "function") {
        state.overlayBatch.update(getOutlineOverlayParams());
      }
    } catch (error) {}

    return state.overlayBatch;
  }

  try {
    if (mp.game.graphics && typeof mp.game.graphics.setEntityOverlayPassEnabled === "function" && typeof mp.game.graphics.createEntityOverlayBatch === "function") {
      mp.game.graphics.setEntityOverlayPassEnabled(true);
      state.overlayBatch = mp.game.graphics.createEntityOverlayBatch(getOutlineOverlayParams());
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
  } catch (error) {
    state.overlaySupported = false;
  }
}

function drawVehicleHint(vehicle: Mp.Vehicle | null): void {
  if (!vehicle?.position) {
    return;
  }

  try {
    mp.game.graphics.drawMarker(2, vehicle.position.x, vehicle.position.y, vehicle.position.z + 1.55, 0, 0, 0, 0, 180, 0, 0.28, 0.28, 0.28, OUTLINE_COLOR[0], OUTLINE_COLOR[1], OUTLINE_COLOR[2], 200, false, true, 2, false, null, null, false);
    mp.game.graphics.drawText("G  Interagieren", [0.5, 0.58], { font: 4, color: [236, 218, 255, 230], scale: [0.34, 0.34], outline: true });
  } catch (error) {}
}

function drawWardrobeMarkers(): void {
  const player = mp.players.local;
  const dimension = Number((player as any).dimension ?? 0);

  state.wardrobePoints.forEach((point) => {
    if (Number(point.dimension) !== dimension) {
      return;
    }

    const distance = getDistance(player.position, new mp.Vector3(point.x, point.y, point.z));
    if (distance > MARKER_DRAW_DISTANCE) {
      return;
    }

    const scale = distance <= WARDROBE_RANGE ? 0.42 : 0.28;
    try {
      mp.game.graphics.drawMarker(1, point.x, point.y, point.z - 1.0, 0, 0, 0, 0, 0, 0, scale, scale, 0.4, WARDROBE_COLOR[0], WARDROBE_COLOR[1], WARDROBE_COLOR[2], WARDROBE_COLOR[3], false, false, 2, false, null, null, false);
    } catch (error) {}
  });
}

function drawWardrobeHint(point: WardrobePoint | null): void {
  if (!point) {
    return;
  }

  try {
    mp.game.graphics.drawText(`G  ${point.label} (Kleidungskammer)`, [0.5, 0.62], { font: 4, color: [235, 245, 255, 235], scale: [0.34, 0.34], outline: true });
  } catch (error) {}
}

function drawAtmHint(obj: Mp.Object): void {
  try {
    mp.game.graphics.drawText("G  Geldautomat (Fleeca Bank)", [0.5, 0.62], { font: 4, color: [235, 245, 255, 235], scale: [0.34, 0.34], outline: true });
  } catch (error) {}
}

function getPlayerComponentVariation(componentId: number): { drawableId: number; textureId: number } {
  const player = mp.players.local as any;

  try {
    return {
      drawableId: Number(player.getDrawableVariation(componentId) ?? 0),
      textureId: Number(player.getTextureVariation(componentId) ?? 0)
    };
  } catch (error) {
    return { drawableId: 0, textureId: 0 };
  }
}

function captureWardrobeAppearance(): WardrobeAppearanceSnapshot {
  const trackedComponents = [3, 4, 6, 8, 9, 11];
  const components: WardrobeAppearanceSnapshot["components"] = {};

  trackedComponents.forEach((componentId) => {
    components[componentId] = getPlayerComponentVariation(componentId);
  });

  return { components };
}

function applyWardrobeAppearanceSnapshot(snapshot: WardrobeAppearanceSnapshot | null): void {
  if (!snapshot) {
    return;
  }

  const player = mp.players.local;
  Object.entries(snapshot.components).forEach(([componentId, values]) => {
    const resolvedComponentId = Number(componentId);
    const resolvedDrawableId = Number(values.drawableId ?? 0);
    const resolvedTextureId = Number(values.textureId ?? 0);
    if (!Number.isInteger(resolvedComponentId) || !Number.isInteger(resolvedDrawableId) || !Number.isInteger(resolvedTextureId)) {
      return;
    }

    player.setComponentVariation(resolvedComponentId, resolvedDrawableId, resolvedTextureId, 0);
  });
}

function setCommittedWardrobeAppearanceFromPlayer(): void {
  state.wardrobeCommittedAppearance = captureWardrobeAppearance();
}

function restoreWardrobePreview(): void {
  if (!state.wardrobePreviewActive) {
    return;
  }

  applyWardrobeAppearanceSnapshot(state.wardrobeCommittedAppearance);
  state.wardrobePreviewActive = false;
}

function applyPreviewClothingItem(componentId: number, drawableId: number, textureId: number): void {
  const resolvedComponentId = Number(componentId);
  const resolvedDrawableId = Number(drawableId);
  const resolvedTextureId = Number(textureId);
  if (!Number.isInteger(resolvedComponentId) || !Number.isInteger(resolvedDrawableId) || !Number.isInteger(resolvedTextureId)) {
    return;
  }

  const player = mp.players.local;
  player.setComponentVariation(resolvedComponentId, resolvedDrawableId, resolvedTextureId, 0);

  if (resolvedComponentId === 11) {
    const isMale = player.model === mp.game.joaat("mp_m_freemode_01");
    const sex = isMale ? 1 : 2;
    const bestTorso = Number(ClothingLib.getBestTorso(sex, resolvedDrawableId));
    if (Number.isInteger(bestTorso) && bestTorso !== -1) {
      player.setComponentVariation(3, bestTorso, 0, 0);
    }
  }
}

function applyPreviewOutfit(clothing: number[][]): void {
  if (!Array.isArray(clothing) || clothing.length < 4) {
    return;
  }

  applyPreviewClothingItem(11, Number(clothing[0]?.[0] ?? 15), Number(clothing[0]?.[1] ?? 0));
  applyPreviewClothingItem(8, Number(clothing[1]?.[0] ?? 15), Number(clothing[1]?.[1] ?? 0));
  applyPreviewClothingItem(4, Number(clothing[2]?.[0] ?? 4), Number(clothing[2]?.[1] ?? 0));
  applyPreviewClothingItem(6, Number(clothing[3]?.[0] ?? 1), Number(clothing[3]?.[1] ?? 0));
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
    return vehicle.getNumberPlateText?.() || "Fahrzeug";
  } catch (error) {
    return "Fahrzeug";
  }
}

function getMenuPosition() {
  let x = 960;
  let y = 540;
  try {
    const resolution = mp.game.graphics.getScreenResolution(0, 0);
    if (resolution && Number.isFinite(resolution.x) && Number.isFinite(resolution.y)) {
      x = Math.round(resolution.x / 2);
      y = Math.round(resolution.y / 2);
    }
  } catch (error) {}
  return { x, y };
}

function openMenu(): void {
  if (!isGameplayInputAllowed()) {
    return;
  }

  state.targetWardrobe = findNearbyWardrobe();
  if (state.targetWardrobe) {
    openWardrobe();
    return;
  }

  if (state.targetAtm) {
    mp.gui.chat.push(`!{#F97316}[DEBUG] G-Taste am ATM gedrückt. Sende Event...`);
    mp.events.call("client:banking:open");
    return;
  }

  const target = state.targetVehicle || findVehicleInView();
  if (!target) {
    return;
  }

  ensureBrowser();
  state.isOpen = true;
  state.browser!.active = true;
  mp.gui.cursor.show(true, true);

  const { x, y } = getMenuPosition();
  executeInteraction(`window.interactionApp && window.interactionApp.open(${x}, ${y}, ${JSON.stringify(getVehicleLabel(target))}, ${JSON.stringify(VEHICLE_ACTIONS)});`);
}

mp.events.add("cef:interaction:ready", () => {
  state.isReady = true;
  flushPending();
  pushInteractionTheme();
});

mp.events.add("client:uiTheme:sync", () => {
  pushInteractionTheme();
});

mp.events.add("cef:interaction:close", () => {
  closeMenu();
});

mp.events.add("client:factionWardrobe:setData", (...args: unknown[]) => {
  const [rawPayload] = args as [string];
  try {
    const parsed = JSON.parse(rawPayload || "{}");
    state.wardrobePoints = Array.isArray(parsed.points) ? parsed.points : [];
    state.wardrobeOutfits = Array.isArray(parsed.outfits) ? parsed.outfits : [];
  } catch (error) {
    state.wardrobePoints = [];
    state.wardrobeOutfits = [];
  }

  state.targetWardrobe = null;
});

mp.events.add("cef:interaction:select", (...args: unknown[]) => {
  const [action] = args as [string];
  if (!action) {
    return;
  }

  sendSystemMessage(`Interaktion ${action} ist bald verfuegbar.`);
  closeMenu();
});

mp.keys.bind(KEY_G, true, () => {
  if (mp.gui.cursor.visible && !state.isOpen && !state.wardrobeVisible) {
    return;
  }

  if (state.isOpen || state.wardrobeVisible) {
    closeMenu();
    closeWardrobe();
    return;
  }

  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (state.isOpen) closeMenu();
  if (state.wardrobeVisible) closeWardrobe();
});

mp.events.add("render", () => {
  scanTargets();
});

mp.events.add("client:wardrobe:setCatalog", (dataJson: string) => {
  state.wardrobeCatalogJson = dataJson;
  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.setCatalog(${dataJson});`);
});

mp.events.add("client:wardrobe:applyCustomization", (customJson: string) => {
  mp.events.call("client:creator:apply", customJson);
});

mp.events.add("client:wardrobe:applyItem", (componentId: number, drawableId: number, textureId: number) => {
  const player = mp.players.local;
  player.setComponentVariation(componentId, drawableId, textureId, 0);

  // If Top (11) is applied, auto-calculate Best Torso (3)
  if (componentId === 11) {
    const isMale = player.model === mp.game.joaat("mp_m_freemode_01");
    const sex = isMale ? 1 : 2;
    const bestTorso = ClothingLib.getBestTorso(sex, drawableId);
    if (bestTorso !== -1) {
      player.setComponentVariation(3, bestTorso, 0, 0);
    }
  }

  setCommittedWardrobeAppearanceFromPlayer();
  state.wardrobePreviewActive = false;
});

mp.events.add("cef:wardrobe:ready", () => {
  state.wardrobeUiReady = true;
  if (state.wardrobeReadyProbe) {
    clearInterval(state.wardrobeReadyProbe);
    state.wardrobeReadyProbe = null;
  }

  if (state.wardrobeVisible) {
    executeWardrobe("window.wardrobeApp && window.wardrobeApp.show();");
  }

  if (state.wardrobeCatalogJson) {
    executeWardrobe(`window.wardrobeApp && window.wardrobeApp.setCatalog(${state.wardrobeCatalogJson});`);
  }

  flushWardrobePending();
});

mp.events.add("cef:wardrobe:close", () => {
  closeWardrobe();
});

mp.events.add("cef:wardrobe:applyItem", (itemId: number) => {
  restoreWardrobePreview();
  mp.events.callRemote("server:wardrobe:applyItem", itemId);
});

mp.events.add("cef:wardrobe:previewItem", (rawItemJson: string) => {
  let item: { componentId?: number; drawableId?: number; textureId?: number } = {};
  try {
    item = JSON.parse(rawItemJson || "{}");
  } catch (error) {
    item = {};
  }

  if (!Number.isInteger(item.componentId) || !Number.isInteger(item.drawableId) || !Number.isInteger(item.textureId)) {
    return;
  }

  applyWardrobeAppearanceSnapshot(state.wardrobeCommittedAppearance);
  applyPreviewClothingItem(Number(item.componentId), Number(item.drawableId), Number(item.textureId));
  state.wardrobePreviewActive = true;
});

mp.events.add("cef:wardrobe:previewOutfit", (rawOutfitJson: string) => {
  let payload: { clothing?: number[][] } = {};
  try {
    payload = JSON.parse(rawOutfitJson || "{}");
  } catch (error) {
    payload = {};
  }

  if (!Array.isArray(payload.clothing)) {
    return;
  }

  applyWardrobeAppearanceSnapshot(state.wardrobeCommittedAppearance);
  applyPreviewOutfit(payload.clothing);
  state.wardrobePreviewActive = true;
});

mp.events.add("cef:wardrobe:clearPreview", () => {
  restoreWardrobePreview();
});

mp.events.add("cef:wardrobe:applyOutfit", (outfitId: number) => {
  restoreWardrobePreview();

  const wardrobePointId = Number(state.wardrobeOpenPointId ?? 0);
  if (!Number.isInteger(outfitId) || outfitId <= 0 || !Number.isInteger(wardrobePointId) || wardrobePointId <= 0) {
    return;
  }

  mp.events.callRemote("server:factionWardrobe:apply", outfitId, wardrobePointId);
});

mp.events.add("cef:wardrobe:endService", () => {
  restoreWardrobePreview();
  mp.events.callRemote("server:wardrobe:endService");
  closeWardrobe();
});

mp.events.add("client:wardrobe:applyOutfit", (clothingJson: string) => {
  let clothing: number[][] = [];
  try {
    const parsed = JSON.parse(clothingJson || "[]");
    clothing = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    clothing = [];
  }

  applyPreviewOutfit(clothing);
  setCommittedWardrobeAppearanceFromPlayer();
  state.wardrobePreviewActive = false;
});

// ÔöÇÔöÇÔöÇ Personal Outfit Builder ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
// Kein Zugriff auf getNumberOfPedDrawableVariations in alter RAGE:MP Runtime.
// Stattdessen: Wert setzen und zur├╝cklesen ÔÇö GTA begrenzt ung├╝ltige IDs automatisch.

function cycleDrawable(componentId: number, direction: number): number {
  const player = mp.players.local;
  const current = Number((player as any).getDrawableVariation(componentId) ?? 0);

  if (direction > 0) {
    player.setComponentVariation(componentId, current + 1, 0, 0);
    const next = Number((player as any).getDrawableVariation(componentId) ?? 0);
    if (next === current) {
      // Am Maximum angekommen ÔåÆ zur├╝ck zu 0
      player.setComponentVariation(componentId, 0, 0, 0);
      return 0;
    }
    return next;
  } else {
    if (current <= 0) {
      // Bei 0 r├╝ckw├ñrts ÔåÆ Maximum suchen (GTA begrenzt 9999 auf echtes Max)
      player.setComponentVariation(componentId, 9999, 0, 0);
      return Number((player as any).getDrawableVariation(componentId) ?? 0);
    }
    player.setComponentVariation(componentId, current - 1, 0, 0);
    return current - 1;
  }
}

function cycleTexture(componentId: number, direction: number): number {
  const player = mp.players.local;
  const drawable = Number((player as any).getDrawableVariation(componentId) ?? 0);
  const current = Number((player as any).getTextureVariation(componentId) ?? 0);

  if (direction > 0) {
    player.setComponentVariation(componentId, drawable, current + 1, 0);
    const next = Number((player as any).getTextureVariation(componentId) ?? 0);
    if (next === current) {
      player.setComponentVariation(componentId, drawable, 0, 0);
      return 0;
    }
    return next;
  } else {
    if (current <= 0) {
      player.setComponentVariation(componentId, drawable, 9999, 0);
      return Number((player as any).getTextureVariation(componentId) ?? 0);
    }
    player.setComponentVariation(componentId, drawable, current - 1, 0);
    return current - 1;
  }
}

mp.events.add("cef:myOutfit:initComponent", (...args: unknown[]) => {
  const [rawComponentId] = args as [unknown];
  const componentId = Number(rawComponentId);
  if (!Number.isInteger(componentId)) return;

  const player = mp.players.local;
  const drawable = Number((player as any).getDrawableVariation(componentId) ?? 0);
  const texture = Number((player as any).getTextureVariation(componentId) ?? 0);

  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.updateComponentState(${componentId}, ${drawable}, ${texture});`);
});

mp.events.add("cef:myOutfit:cycleDrawable", (...args: unknown[]) => {
  const [rawComponentId, rawDirection] = args as [unknown, unknown];
  const componentId = Number(rawComponentId);
  const direction = Number(rawDirection);
  if (!Number.isInteger(componentId) || !Number.isFinite(direction)) return;

  const drawable = cycleDrawable(componentId, direction);
  state.wardrobePreviewActive = true;

  if (componentId === 11) {
    const player = mp.players.local;
    const isMale = player.model === mp.game.joaat("mp_m_freemode_01");
    const sex = isMale ? 1 : 2;
    const bestTorso = Number(ClothingLib.getBestTorso(sex, drawable));
    if (Number.isInteger(bestTorso) && bestTorso !== -1) {
      player.setComponentVariation(3, bestTorso, 0, 0);
    }
  }

  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.updateComponentState(${componentId}, ${drawable}, 0);`);
});

mp.events.add("cef:myOutfit:cycleTexture", (...args: unknown[]) => {
  const [rawComponentId, rawDirection] = args as [unknown, unknown];
  const componentId = Number(rawComponentId);
  const direction = Number(rawDirection);
  if (!Number.isInteger(componentId) || !Number.isFinite(direction)) return;

  const player = mp.players.local;
  const drawable = Number((player as any).getDrawableVariation(componentId) ?? 0);
  const texture = cycleTexture(componentId, direction);
  state.wardrobePreviewActive = true;

  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.updateComponentState(${componentId}, ${drawable}, ${texture});`);
});

mp.events.add("cef:myOutfit:save", (...args: unknown[]) => {
  const [rawName] = args as [unknown];
  const name = String(rawName ?? "").trim();
  if (!name) return;

  const player = mp.players.local;
  const clothing = [
    [Number((player as any).getDrawableVariation(11) ?? 0), Number((player as any).getTextureVariation(11) ?? 0)],
    [Number((player as any).getDrawableVariation(8) ?? 0), Number((player as any).getTextureVariation(8) ?? 0)],
    [Number((player as any).getDrawableVariation(4) ?? 0), Number((player as any).getTextureVariation(4) ?? 0)],
    [Number((player as any).getDrawableVariation(6) ?? 0), Number((player as any).getTextureVariation(6) ?? 0)]
  ];

  setCommittedWardrobeAppearanceFromPlayer();
  state.wardrobePreviewActive = false;
  mp.events.callRemote("server:myOutfit:save", name, JSON.stringify(clothing));
});

mp.events.add("cef:myOutfit:delete", (...args: unknown[]) => {
  const [rawOutfitId] = args as [unknown];
  const outfitId = Number(rawOutfitId);
  if (!Number.isInteger(outfitId) || outfitId <= 0) return;
  mp.events.callRemote("server:myOutfit:delete", outfitId);
});

mp.events.add("cef:myOutfit:apply", (...args: unknown[]) => {
  const [rawOutfitId] = args as [unknown];
  const outfitId = Number(rawOutfitId);
  if (!Number.isInteger(outfitId) || outfitId <= 0) return;
  restoreWardrobePreview();
  mp.events.callRemote("server:myOutfit:apply", outfitId);
});

mp.events.add("cef:myOutfit:requestList", () => {
  mp.events.callRemote("server:myOutfit:requestList");
});

mp.events.add("client:myOutfit:setList", (...args: unknown[]) => {
  const [outfitsJson] = args as [string];
  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.setMyOutfits(${outfitsJson});`);
});

export {};
