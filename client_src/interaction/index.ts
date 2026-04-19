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

interface HouseGarageVehicle {
  garageVehicleId: number;
  displayName: string;
  numberPlate: string;
  storedAt: string;
  parkingType?: "garage" | "helipad";
}

interface HousePointPermissions {
  canBuy: boolean;
  canEnter: boolean;
  canToggleLock: boolean;
  canUseStorage: boolean;
  canUseWardrobe: boolean;
  canUseGarage: boolean;
  canUseHelipad: boolean;
  canExit: boolean;
}

interface HouseEntryData {
  houseId: number;
  displayName: string;
  streetName: string;
  stars: number;
  price: number;
  hasGarden: boolean;
  hasHelipad: boolean;
  ownerName: string | null;
  isOwned: boolean;
  isOwner: boolean;
  isLocked: boolean;
  tierLabel: string;
  interiorLabel: string;
  description: string;
  storageSlots: number;
  garageSlots: number;
  helipadSlots: number;
  entrance: { x: number; y: number; z: number; rotZ: number; dimension: number; };
  garage: { x: number; y: number; z: number; rotZ: number; dimension: number; parkedVehicles: HouseGarageVehicle[]; };
  helipad: null | { x: number; y: number; z: number; rotZ: number; dimension: number; parkedVehicles: HouseGarageVehicle[]; };
  permissions: HousePointPermissions;
  interior: null | {
    dimension: number;
    exitPoint: { x: number; y: number; z: number; rotZ: number; };
    storagePoint: { x: number; y: number; z: number; rotZ: number; };
    wardrobePoint: { x: number; y: number; z: number; rotZ: number; };
  };
}

type HouseBlipHandle = {
  destroy?: () => void;
  setColour?: (color: number) => void;
  setColor?: (color: number) => void;
  color?: number;
  dimension?: number;
  name?: string;
  shortRange?: boolean;
};

type HouseTargetPointType = "entrance" | "garage" | "helipad" | "exit" | "storage" | "wardrobe";

interface HouseTargetPoint {
  house: HouseEntryData;
  type: HouseTargetPointType;
  x: number;
  y: number;
  z: number;
  dimension: number;
}

interface HousePanelPayload {
  houseId: number;
  title: string;
  displayName: string;
  streetName: string;
  interiorLabel: string;
  tierLabel: string;
  description: string;
  stars: number;
  price: number;
  hasGarden: boolean;
  hasHelipad: boolean;
  hasGarage: boolean;
  garageSlots: number;
  helipadSlots: number;
  isOwned: boolean;
  isLocked: boolean;
  ownerName: string | null;
  previewUrl: string | null;
  actions: InteractionAction[];
}

interface HouseInteriorSpawnPayload {
  x: number;
  y: number;
  z: number;
}

interface HousePreviewCacheEntry {
  url: string;
  capturedAt: number;
}

interface InteractionState {
  browser: Mp.Browser | null;
  isReady: boolean;
  isOpen: boolean;
  targetVehicle: Mp.Vehicle | null;
  targetWardrobe: WardrobePoint | null;
  targetHousePoint: HouseTargetPoint | null;
  wardrobePoints: WardrobePoint[];
  wardrobeOutfits: WardrobeOutfit[];
  housingData: HouseEntryData[];
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
  wardrobeMode: "faction" | "house";
  housingUiReady: boolean;
  housingPendingActions: string[];
  housingReadyProbe: ReturnType<typeof setInterval> | null;
}

const state: InteractionState & {
  wardrobeBrowser: Mp.Browser | null,
  wardrobeVisible: boolean,
  housingBrowser: Mp.Browser | null,
  houseStorageVisible: boolean
} = {
  browser: null,
  wardrobeBrowser: null,
  housingBrowser: null,
  wardrobeVisible: false,
  houseStorageVisible: false,
  isReady: false,
  isOpen: false,
  targetVehicle: null,
  targetWardrobe: null,
  targetHousePoint: null,
  wardrobePoints: [],
  wardrobeOutfits: [],
  housingData: [],
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
  wardrobeMode: "faction",
  housingUiReady: false,
  housingPendingActions: [],
  housingReadyProbe: null
};

const KEY_G = 0x47;
const INTERACTION_RANGE = 8.0;
const WARDROBE_RANGE = 3.75;
const MARKER_DRAW_DISTANCE = 35.0;
const SCAN_INTERVAL_MS = 100;
const HOUSE_BLIP_SPRITE = 40;
const HOUSE_BLIP_COLOR_AVAILABLE = 2;
const HOUSE_BLIP_COLOR_OWNED = 1;
const HOUSE_PREVIEW_CAPTURE_DELAY_MS = 140;
const HOUSE_PREVIEW_CAPTURE_SETTLE_MS = 320;
const HOUSE_PREVIEW_CAPTURE_TTL_MS = 15_000;
loadUiTheme();

const houseBlips = new Map<number, HouseBlipHandle>();
const housePreviewCache = new Map<number, HousePreviewCacheEntry>();
const HOUSE_INTERIOR_PRELOADS = [
  { iplName: "apa_v_mp_h_03_c", points: [{ x: -786.9584, y: 315.7974, z: 187.9135 }] }
] as const;
const HELICOPTER_MODEL_NAMES = [
  "akula",
  "annihilator",
  "annihilator2",
  "buzzard",
  "buzzard2",
  "cargobob",
  "cargobob2",
  "cargobob3",
  "cargobob4",
  "conada",
  "frogger",
  "frogger2",
  "havok",
  "hunter",
  "maverick",
  "savage",
  "seasparrow",
  "seasparrow2",
  "seasparrow3",
  "skylift",
  "supervolito",
  "supervolito2",
  "swift",
  "swift2",
  "valkyrie",
  "valkyrie2",
  "volatus"
] as const;
const HELICOPTER_MODEL_HASHES = new Set<number>(HELICOPTER_MODEL_NAMES.map((modelName) => mp.game.joaat(modelName)));
let houseInteriorPreloaded = false;
let houseInteriorSpawnProbe: ReturnType<typeof setInterval> | null = null;
let houseInteriorSpawnRelease: ReturnType<typeof setTimeout> | null = null;
let housePreviewCaptureTimer: ReturnType<typeof setTimeout> | null = null;
let housePreviewPendingHouseId: number | null = null;
let housePreviewVisualSuppressedUntil = 0;

let OUTLINE_COLOR: [number, number, number, number] = [217, 70, 239, 190];
let WARDROBE_COLOR: [number, number, number, number] = [168, 85, 247, 220];
let HOUSING_ENTRANCE_COLOR: [number, number, number, number] = [251, 191, 36, 220];
let HOUSING_INSIDE_COLOR: [number, number, number, number] = [34, 197, 94, 220];

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

function configureWardrobe(mode: "faction" | "house", title?: string): void {
  if (mode === "house") {
    executeWardrobe(`window.wardrobeApp && window.wardrobeApp.configure(${JSON.stringify({
      title: title || "Kleiderschrank",
      showEndService: false,
      enabledTabs: ["builder"],
      defaultTab: "builder"
    })});`);
    executeWardrobe(`window.wardrobeApp && window.wardrobeApp.setCatalog(${JSON.stringify({ items: [], outfits: [] })});`);
    return;
  }

  executeWardrobe(`window.wardrobeApp && window.wardrobeApp.configure(${JSON.stringify({
    title: "Kleidungskammer",
    showEndService: true,
    enabledTabs: null,
    defaultTab: "tops"
  })});`);
}

function openWardrobe(mode: "faction" | "house" = "faction", title?: string): void {
  if (state.wardrobeVisible || state.houseStorageVisible || mp.gui.cursor.visible) return;

  const wardrobePoint = mode === "faction" ? (state.targetWardrobe || findNearbyWardrobe()) : null;
  if (mode === "faction" && !wardrobePoint) {
    return;
  }

  ensureWardrobeBrowser();
  state.wardrobeMode = mode;
  state.targetWardrobe = wardrobePoint;
  state.wardrobeVisible = true;
  state.wardrobeOpenPointId = wardrobePoint?.wardrobePointId ?? null;
  state.wardrobeDismissedPointId = mode === "faction" ? null : state.wardrobeDismissedPointId;
  state.wardrobeCommittedAppearance = captureWardrobeAppearance();
  state.wardrobePreviewActive = false;
  state.wardrobeBrowser!.active = true;
  mp.gui.cursor.show(true, true);
  configureWardrobe(mode, title);

  if (mode === "faction") {
    mp.events.callRemote("server:wardrobe:requestCatalog");
  }

  executeWardrobe("window.wardrobeApp && window.wardrobeApp.show();");
}

function closeWardrobe(): void {
  if (!state.wardrobeVisible) return;
  restoreWardrobePreview();
  state.wardrobeVisible = false;
  if (state.wardrobeMode === "faction") {
    state.wardrobeDismissedPointId = state.wardrobeOpenPointId;
  }
  state.wardrobeOpenPointId = null;
  if (state.wardrobeBrowser) state.wardrobeBrowser.active = false;
  mp.gui.cursor.show(false, false);
  state.wardrobeMode = "faction";
  executeWardrobe("window.wardrobeApp && window.wardrobeApp.hide();");
}

function ensureHousingBrowser(): void {
  if (state.housingBrowser) return;
  state.housingBrowser = mp.browsers.new("package://housing/housing.html");
  state.housingBrowser.active = false;
  state.housingUiReady = false;
  startHousingReadyProbe();
}

function executeHousing(js: string): void {
  if (!state.housingBrowser || !state.housingUiReady) {
    state.housingPendingActions.push(js);
    return;
  }

  state.housingBrowser.execute(js);
}

function flushHousingPending(): void {
  if (!state.housingBrowser || !state.housingUiReady) {
    return;
  }

  while (state.housingPendingActions.length > 0) {
    state.housingBrowser.execute(state.housingPendingActions.shift()!);
  }
}

function startHousingReadyProbe(): void {
  if (state.housingReadyProbe) {
    clearInterval(state.housingReadyProbe);
  }

  state.housingReadyProbe = setInterval(() => {
    if (!state.housingBrowser || state.housingUiReady) {
      clearInterval(state.housingReadyProbe!);
      state.housingReadyProbe = null;
      return;
    }

    state.housingBrowser.execute(`
      if (window.houseStorageApp && !window.__housingStorageReadyNotified) {
        window.__housingStorageReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:housingStorage:ready");
        }
      }
    `);
  }, 300);
}

function openHousingStorage(payloadJson: string): void {
  if (state.houseStorageVisible) {
    executeHousing(`window.houseStorageApp && window.houseStorageApp.setState(${payloadJson});`);
    return;
  }

  ensureHousingBrowser();
  state.houseStorageVisible = true;
  state.housingBrowser!.active = true;
  mp.gui.cursor.show(true, true);
  executeHousing(`window.houseStorageApp && window.houseStorageApp.show(${payloadJson});`);
}

function closeHousingStorage(notifyServer = true): void {
  if (!state.houseStorageVisible) {
    return;
  }

  state.houseStorageVisible = false;
  if (state.housingBrowser) {
    state.housingBrowser.active = false;
  }
  mp.gui.cursor.show(false, false);
  executeHousing("window.houseStorageApp && window.houseStorageApp.hide();");
  if (notifyServer) {
    mp.events.callRemote("server:housing:storage:close");
  }
}

function scanTargets(): void {
  drawHouseMarkers();
  drawWardrobeMarkers();

  if (state.isOpen || state.wardrobeVisible || state.houseStorageVisible || mp.gui.cursor.visible) {
    return;
  }

  const now = Date.now();
  if (now - state.lastScan >= SCAN_INTERVAL_MS) {
    state.lastScan = now;
    state.targetHousePoint = findNearbyHousePoint();
    state.targetWardrobe = state.targetHousePoint ? null : findNearbyWardrobe();

    if (!state.targetWardrobe) {
      state.wardrobeDismissedPointId = null;
    }

    state.targetVehicle = state.targetHousePoint || state.targetWardrobe ? null : findVehicleInView();
  }

  scheduleHousePreviewCapture(state.targetHousePoint);

  if (state.targetHousePoint) {
    drawHouseHint(state.targetHousePoint);
    return;
  }

  if (state.targetWardrobe) {
    drawWardrobeHint(state.targetWardrobe);
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
  executeHousing(`window.houseStorageApp && window.houseStorageApp.setTheme(${getUiThemeJson()});`);
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

function getHousePointRange(type: HouseTargetPointType): number {
  if (type === "helipad") {
    return 6.75;
  }

  if (type === "garage") {
    return 4.75;
  }

  if (type === "entrance") {
    return 3.25;
  }

  return 2.8;
}

function collectHousePoints(): HouseTargetPoint[] {
  const points: HouseTargetPoint[] = [];

  state.housingData.forEach((house) => {
    points.push({
      house,
      type: "entrance",
      x: house.entrance.x,
      y: house.entrance.y,
      z: house.entrance.z,
      dimension: Number(house.entrance.dimension ?? 0)
    });

    points.push({
      house,
      type: "garage",
      x: house.garage.x,
      y: house.garage.y,
      z: house.garage.z,
      dimension: Number(house.garage.dimension ?? 0)
    });

    if (house.helipad) {
      points.push({
        house,
        type: "helipad",
        x: house.helipad.x,
        y: house.helipad.y,
        z: house.helipad.z,
        dimension: Number(house.helipad.dimension ?? 0)
      });
    }

    if (house.interior) {
      points.push({
        house,
        type: "exit",
        x: house.interior.exitPoint.x,
        y: house.interior.exitPoint.y,
        z: house.interior.exitPoint.z,
        dimension: Number(house.interior.dimension ?? 0)
      });
      points.push({
        house,
        type: "storage",
        x: house.interior.storagePoint.x,
        y: house.interior.storagePoint.y,
        z: house.interior.storagePoint.z,
        dimension: Number(house.interior.dimension ?? 0)
      });
      points.push({
        house,
        type: "wardrobe",
        x: house.interior.wardrobePoint.x,
        y: house.interior.wardrobePoint.y,
        z: house.interior.wardrobePoint.z,
        dimension: Number(house.interior.dimension ?? 0)
      });
    }
  });

  return points;
}

function findNearbyHousePoint(): HouseTargetPoint | null {
  const player = mp.players.local;
  const dimension = Number((player as any).dimension ?? 0);
  let nearest: HouseTargetPoint | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  collectHousePoints().forEach((point) => {
    if (Number(point.dimension) !== dimension) {
      return;
    }

    const pointPosition = new mp.Vector3(point.x, point.y, point.z);
    const distance = getDistance(player.position, pointPosition);
    if (distance > getHousePointRange(point.type)) {
      return;
    }

    const typeWeight =
      point.type === "storage" ? 0 :
      point.type === "wardrobe" ? 0.1 :
      point.type === "exit" ? 0.2 :
      point.type === "entrance" ? 0.35 :
      point.type === "garage" ? 0.45 :
      0.5;
    const score = distance + typeWeight;
    if (score < bestScore) {
      bestScore = score;
      nearest = point;
    }
  });

  return nearest;
}

function getHousePointColor(type: HouseTargetPointType): [number, number, number, number] {
  if (type === "entrance" || type === "garage" || type === "helipad") {
    return HOUSING_ENTRANCE_COLOR;
  }

  return HOUSING_INSIDE_COLOR;
}

function drawHouseMarkers(): void {
  if (Date.now() < housePreviewVisualSuppressedUntil) {
    return;
  }

  const player = mp.players.local;
  const dimension = Number((player as any).dimension ?? 0);

  collectHousePoints().forEach((point) => {
    if (Number(point.dimension) !== dimension) {
      return;
    }

    const distance = getDistance(player.position, new mp.Vector3(point.x, point.y, point.z));
    if (distance > MARKER_DRAW_DISTANCE) {
      return;
    }

    const color = getHousePointColor(point.type);
    const scale = distance <= getHousePointRange(point.type) ? 0.42 : 0.28;
    const markerType = point.type === "garage" || point.type === "helipad" ? 36 : 1;
    try {
      mp.game.graphics.drawMarker(markerType, point.x, point.y, point.z - 1.0, 0, 0, 0, 0, 0, 0, scale, scale, 0.42, color[0], color[1], color[2], color[3], false, false, 2, false, null, null, false);
    } catch (error) {}
  });
}

function drawHouseHint(point: HouseTargetPoint | null): void {
  if (!point) {
    return;
  }

  if (Date.now() < housePreviewVisualSuppressedUntil) {
    return;
  }

  const house = point.house;
  const baseText =
    point.type === "entrance"
      ? `Haus #${house.houseId} | ${house.isOwned ? (house.ownerName || "Verkauft") : `$${Number(house.price || 0).toLocaleString("de-DE")}`}`
      : point.type === "garage"
        ? `${house.displayName} Garage | ${house.garage.parkedVehicles.length}/${house.garageSlots}`
        : point.type === "helipad"
          ? `${house.displayName} HeliPad | ${(house.helipad?.parkedVehicles.length ?? 0)}/${house.helipadSlots}`
        : point.type === "storage"
          ? `${house.displayName} Lager`
          : point.type === "wardrobe"
            ? `${house.displayName} Kleiderschrank`
            : `${house.displayName} Verlassen`;

  try {
    mp.game.graphics.drawText(`G  ${baseText}`, [0.5, 0.62], { font: 4, color: [244, 244, 250, 235], scale: [0.34, 0.34], outline: true });
  } catch (error) {}
}

function clearHouseBlips(): void {
  for (const blip of houseBlips.values()) {
    blip.destroy?.();
  }

  houseBlips.clear();
}

function buildHousePreviewUrl(houseId: number): string {
  return `http://screenshots/house-preview-${houseId}.jpg?ts=${Date.now()}`;
}

function finalizeHousePreviewCapture(houseId: number): void {
  const nextUrl = buildHousePreviewUrl(houseId);
  housePreviewCache.set(houseId, {
    url: nextUrl,
    capturedAt: Date.now()
  });
  housePreviewPendingHouseId = null;

  if (state.isOpen) {
    executeInteraction(`window.interactionApp && window.interactionApp.setHousePreview(${houseId}, ${JSON.stringify(nextUrl)});`);
  }
}

function captureHousePreview(target: HouseTargetPoint, delayMs = HOUSE_PREVIEW_CAPTURE_DELAY_MS): void {
  if (target.type !== "entrance") {
    return;
  }

  const houseId = Number(target.house.houseId || 0);
  if (houseId <= 0) {
    return;
  }

  if (housePreviewCaptureTimer) {
    clearTimeout(housePreviewCaptureTimer);
    housePreviewCaptureTimer = null;
  }

  housePreviewPendingHouseId = houseId;
  housePreviewVisualSuppressedUntil = Date.now() + delayMs + HOUSE_PREVIEW_CAPTURE_SETTLE_MS + 120;

  housePreviewCaptureTimer = setTimeout(() => {
    housePreviewCaptureTimer = null;

    try {
      const takeScreenshot = (mp.gui as any).takeScreenshot;
      if (typeof takeScreenshot === "function") {
        takeScreenshot(`house-preview-${houseId}.jpg`, 0, 82, 70);
      }
    } catch (error) {}

    setTimeout(() => {
      finalizeHousePreviewCapture(houseId);
    }, HOUSE_PREVIEW_CAPTURE_SETTLE_MS);
  }, Math.max(0, delayMs));
}

function scheduleHousePreviewCapture(target: HouseTargetPoint | null): void {
  if (!target || target.type !== "entrance") {
    if (housePreviewCaptureTimer) {
      clearTimeout(housePreviewCaptureTimer);
      housePreviewCaptureTimer = null;
    }
    housePreviewPendingHouseId = null;
    return;
  }

  const houseId = Number(target.house.houseId || 0);
  const cached = housePreviewCache.get(houseId);
  if (cached && Date.now() - cached.capturedAt < HOUSE_PREVIEW_CAPTURE_TTL_MS) {
    return;
  }

  if (housePreviewPendingHouseId === houseId) {
    return;
  }

  captureHousePreview(target);
}

function preloadHouseInteriors(): void {
  if (houseInteriorPreloaded) {
    return;
  }

  HOUSE_INTERIOR_PRELOADS.forEach((entry) => {
    try {
      mp.game.streaming.requestIpl(entry.iplName);
    } catch (error) {}

    entry.points.forEach((point) => {
      try {
        mp.game.streaming.requestCollisionAtCoord(point.x, point.y, point.z);
      } catch (error) {}

      try {
        mp.game.streaming.requestAdditionalCollisionAtCoord(point.x, point.y, point.z);
      } catch (error) {}
    });
  });

  houseInteriorPreloaded = true;
}

function stopHouseInteriorSceneLoad(): void {
  try {
    const streaming = mp.game.streaming as any;
    if (typeof streaming.isNewLoadSceneActive === "function" && streaming.isNewLoadSceneActive()) {
      streaming.newLoadSceneStop?.();
    }
  } catch (error) {}
}

function releaseHouseInteriorSpawnLock(): void {
  const player = mp.players.local as any;

  if (houseInteriorSpawnProbe) {
    clearInterval(houseInteriorSpawnProbe);
    houseInteriorSpawnProbe = null;
  }

  if (houseInteriorSpawnRelease) {
    clearTimeout(houseInteriorSpawnRelease);
    houseInteriorSpawnRelease = null;
  }

  stopHouseInteriorSceneLoad();

  try {
    player.setCollision?.(true, false);
  } catch (error) {}

  try {
    player.freezePosition?.(false);
  } catch (error) {}
}

function hasLocalPlayerCollisionLoaded(): boolean {
  const player = mp.players.local as any;

  try {
    if (typeof player.hasCollisionLoadedAround === "function") {
      return Boolean(player.hasCollisionLoadedAround());
    }
  } catch (error) {}

  try {
    const entityApi = mp.game.entity as any;
    if (typeof entityApi?.hasCollisionLoadedAround === "function") {
      return Boolean(entityApi.hasCollisionLoadedAround(player.handle));
    }
  } catch (error) {}

  return false;
}

function requestHouseInteriorCollision(point: HouseInteriorSpawnPayload): void {
  const streaming = mp.game.streaming as any;

  try {
    streaming.requestCollisionAtCoord(point.x, point.y, point.z);
  } catch (error) {}

  try {
    streaming.requestAdditionalCollisionAtCoord(point.x, point.y, point.z);
  } catch (error) {}

  try {
    streaming.loadScene?.(point.x, point.y, point.z);
  } catch (error) {}

  try {
    streaming.newLoadSceneStartSphere?.(point.x, point.y, point.z, 28, 0);
  } catch (error) {}
}

function stabilizeHouseInteriorSpawn(point: HouseInteriorSpawnPayload): void {
  const player = mp.players.local as any;

  releaseHouseInteriorSpawnLock();
  preloadHouseInteriors();

  try {
    player.freezePosition?.(true);
  } catch (error) {}

  try {
    player.setCollision?.(false, false);
  } catch (error) {}

  requestHouseInteriorCollision(point);

  houseInteriorSpawnProbe = setInterval(() => {
    requestHouseInteriorCollision(point);

    if (hasLocalPlayerCollisionLoaded()) {
      releaseHouseInteriorSpawnLock();
    }
  }, 100);

  houseInteriorSpawnRelease = setTimeout(() => {
    releaseHouseInteriorSpawnLock();
  }, 4000);
}

function syncHouseBlips(): void {
  preloadHouseInteriors();
  clearHouseBlips();

  state.housingData.forEach((house) => {
    const color = house.isOwned ? HOUSE_BLIP_COLOR_OWNED : HOUSE_BLIP_COLOR_AVAILABLE;
    const name = `Haus #${house.houseId}`;
    const entrance = house.entrance;

    const blip = (mp as any).blips?.new?.(HOUSE_BLIP_SPRITE, new mp.Vector3(entrance.x, entrance.y, entrance.z), {
      name,
      color,
      shortRange: false,
      dimension: Number(entrance.dimension ?? 0),
      scale: 0.85
    }) as HouseBlipHandle | undefined;

    if (!blip) {
      return;
    }

    blip.setColour?.(color);
    blip.setColor?.(color);
    blip.color = color;
    blip.dimension = Number(entrance.dimension ?? 0);
    blip.name = name;
    houseBlips.set(house.houseId, blip);
  });
}

function isHelicopterVehicle(vehicle: Mp.Vehicle | null): boolean {
  if (!vehicle) {
    return false;
  }

  return HELICOPTER_MODEL_HASHES.has(Number(vehicle.model ?? 0));
}

function isLocalPlayerVehicleDriver(vehicle: Mp.Vehicle | null = (mp.players.local as any).vehicle ?? null): boolean {
  const localPlayer = mp.players.local as any;
  if (!localPlayer || !vehicle) {
    return false;
  }

  const seatIndex = typeof localPlayer.seat === "number" ? Number(localPlayer.seat) : null;
  const driverSeat = vehicle.getOccupant?.(-1);
  const fallbackFrontSeat = vehicle.getOccupant?.(0);

  return seatIndex === -1
    || seatIndex === 0
    || driverSeat === localPlayer
    || fallbackFrontSeat === localPlayer;
}

function buildHouseParkingActions(house: HouseEntryData, parkingType: "garage" | "helipad"): InteractionAction[] {
  const parking = parkingType === "helipad" ? house.helipad : house.garage;
  const canUse = parkingType === "helipad" ? house.permissions.canUseHelipad : house.permissions.canUseGarage;
  if (!canUse || !parking) {
    return [];
  }

  const localPlayer = mp.players.local as any;
  const vehicle = (localPlayer?.vehicle ?? null) as Mp.Vehicle | null;
  const inVehicleAsDriver = isLocalPlayerVehicleDriver(vehicle);
  const parkedVehicleCount = parking.parkedVehicles.length;
  const capacity = parkingType === "helipad" ? house.helipadSlots : house.garageSlots;

  if (inVehicleAsDriver) {
    if (parkingType === "helipad" && !isHelicopterVehicle(vehicle)) {
      return [];
    }

    return [{
      id: `house:${parkingType}:${house.houseId}:park`,
      label: parkingType === "helipad" ? "Helikopter einparken" : "Einparken",
      hint: `${parkedVehicleCount}/${capacity}`
    }];
  }

  return parking.parkedVehicles.map((parkedVehicle) => ({
    id: `house:${parkingType}:${house.houseId}:spawn:${parkedVehicle.garageVehicleId}`,
    label: parkedVehicle.displayName || parkedVehicle.numberPlate || `${parkingType === "helipad" ? "Helikopter" : "Fahrzeug"} ${parkedVehicle.garageVehicleId}`,
    hint: parkedVehicle.numberPlate || (parkingType === "helipad" ? "HeliPad" : "Garage")
  }));
}

function buildHouseActions(target: HouseTargetPoint): InteractionAction[] {
  const house = target.house;

  if (target.type === "entrance") {
    const actions: InteractionAction[] = [];
    if (house.permissions.canBuy && !house.isOwned) {
      actions.push({ id: `house:buy:${house.houseId}`, label: "Kaufen", hint: `$${Number(house.price || 0).toLocaleString("de-DE")}` });
    }
    if (house.permissions.canEnter) {
      actions.push({ id: `house:enter:${house.houseId}`, label: "Betreten", hint: house.interiorLabel || "Interior" });
    }
    if (house.permissions.canToggleLock && house.isOwned) {
      actions.push({ id: `house:lock:${house.houseId}`, label: house.isLocked ? "Aufschliessen" : "Abschliessen", hint: house.ownerName || "Eigentuemer" });
    }
    return actions;
  }

  if (target.type === "exit" && house.permissions.canExit) {
    return [{ id: `house:exit:${house.houseId}`, label: "Verlassen", hint: house.streetName || "Aussenwelt" }];
  }

  if (target.type === "storage" && house.permissions.canUseStorage) {
    return [{ id: `house:storage:${house.houseId}`, label: "Lager", hint: `${house.storageSlots} Slots` }];
  }

  if (target.type === "wardrobe" && house.permissions.canUseWardrobe) {
    return [{ id: `house:wardrobe:${house.houseId}`, label: "Kleiderschrank", hint: "Outfits & Builder" }];
  }

  if (target.type === "garage") {
    return buildHouseParkingActions(house, "garage");
  }

  if (target.type === "helipad") {
    return buildHouseParkingActions(house, "helipad");
  }

  return [];
}

function buildHousePanelPayload(target: HouseTargetPoint): HousePanelPayload | null {
  if (target.type !== "entrance") {
    return null;
  }

  const actions = buildHouseActions(target);
  if (actions.length === 0) {
    return null;
  }

  const house = target.house;
  return {
    houseId: house.houseId,
    title: `Haus #${house.houseId}`,
    displayName: house.displayName,
    streetName: house.streetName,
    interiorLabel: house.interiorLabel,
    tierLabel: house.tierLabel,
    description: house.description,
    stars: Number(house.stars || 0),
    price: Number(house.price || 0),
    hasGarden: Boolean(house.hasGarden),
    hasHelipad: Boolean(house.hasHelipad),
    hasGarage: Number(house.garageSlots || 0) > 0,
    garageSlots: Number(house.garageSlots || 0),
    helipadSlots: Number(house.helipadSlots || 0),
    isOwned: Boolean(house.isOwned),
    isLocked: Boolean(house.isLocked),
    ownerName: house.ownerName,
    previewUrl: housePreviewCache.get(house.houseId)?.url ?? null,
    actions
  };
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

  state.targetHousePoint = findNearbyHousePoint();
  if (state.targetHousePoint) {
    if (state.targetHousePoint.type === "entrance") {
      if (!housePreviewCache.has(state.targetHousePoint.house.houseId)) {
        captureHousePreview(state.targetHousePoint, 0);
      }

      const payload = buildHousePanelPayload(state.targetHousePoint);
      if (!payload) {
        sendSystemMessage("Hier ist aktuell keine passende Hausaktion verfuegbar.");
        return;
      }

      ensureBrowser();
      state.isOpen = true;
      state.browser!.active = true;
      mp.gui.cursor.show(true, true);
      executeInteraction(`window.interactionApp && window.interactionApp.openHouse(${JSON.stringify(payload)});`);
      return;
    }

    const actions = buildHouseActions(state.targetHousePoint);
    if (actions.length === 0) {
      sendSystemMessage("Hier ist aktuell keine passende Hausaktion verfuegbar.");
      return;
    }

    ensureBrowser();
    state.isOpen = true;
    state.browser!.active = true;
    mp.gui.cursor.show(true, true);

    const { x, y } = getMenuPosition();
    executeInteraction(`window.interactionApp && window.interactionApp.open(${x}, ${y}, ${JSON.stringify(state.targetHousePoint.house.displayName)}, ${JSON.stringify(actions)});`);
    return;
  }

  state.targetWardrobe = findNearbyWardrobe();
  const target = state.targetVehicle || findVehicleInView();
  if (!target && !state.targetWardrobe) {
    return;
  }

  if (state.targetWardrobe) {
    openWardrobe("faction");
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

mp.events.add("playerReady", () => {
  preloadHouseInteriors();
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

mp.events.add("client:housing:setData", (...args: unknown[]) => {
  const [rawPayload] = args as [string];
  try {
    const parsed = JSON.parse(rawPayload || "{\"houses\":[]}");
    state.housingData = Array.isArray(parsed.houses) ? parsed.houses : [];
  } catch (error) {
    state.housingData = [];
  }

  state.targetHousePoint = null;
  syncHouseBlips();
});

mp.events.add("client:housing:stabilizeInteriorSpawn", (...args: unknown[]) => {
  const [rawPayload] = args as [string | undefined];
  let payload: Partial<HouseInteriorSpawnPayload> = {};

  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      payload = {};
    }
  }

  const player = mp.players.local;
  const x = Number(payload.x ?? player.position.x);
  const y = Number(payload.y ?? player.position.y);
  const z = Number(payload.z ?? player.position.z);

  if (![x, y, z].every((value) => Number.isFinite(value))) {
    return;
  }

  setTimeout(() => {
    stabilizeHouseInteriorSpawn({ x, y, z });
  }, 75);
});

mp.events.add("client:housing:openWardrobe", (...args: unknown[]) => {
  const [rawPayload] = args as [string];
  let payload: { title?: string } = {};
  try {
    payload = JSON.parse(rawPayload || "{}");
  } catch (error) {
    payload = {};
  }

  openWardrobe("house", payload.title || "Kleiderschrank");
});

mp.events.add("client:housing:forceCloseWardrobe", () => {
  closeWardrobe();
});

mp.events.add("client:housingStorage:show", (...args: unknown[]) => {
  const [payloadJson] = args as [string];
  openHousingStorage(payloadJson);
});

mp.events.add("client:housingStorage:update", (...args: unknown[]) => {
  const [payloadJson] = args as [string];
  if (!state.houseStorageVisible) {
    openHousingStorage(payloadJson);
    return;
  }
  executeHousing(`window.houseStorageApp && window.houseStorageApp.setState(${payloadJson});`);
});

mp.events.add("client:housingStorage:hide", () => {
  closeHousingStorage(false);
});

mp.events.add("cef:interaction:select", (...args: unknown[]) => {
  const [action] = args as [string];
  if (!action) {
    return;
  }

  mp.events.callRemote("server:interaction:select", action);
  closeMenu();
});

mp.keys.bind(KEY_G, true, () => {
  if (mp.gui.cursor.visible && !state.isOpen && !state.wardrobeVisible && !state.houseStorageVisible) {
    return;
  }

  if (state.isOpen || state.wardrobeVisible || state.houseStorageVisible) {
    closeMenu();
    closeWardrobe();
    closeHousingStorage();
    return;
  }

  openMenu();
});

mp.keys.bind(0x1B, true, () => {
  if (state.isOpen) closeMenu();
  if (state.wardrobeVisible) closeWardrobe();
  if (state.houseStorageVisible) closeHousingStorage();
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

mp.events.add("cef:housingStorage:ready", () => {
  state.housingUiReady = true;
  if (state.housingReadyProbe) {
    clearInterval(state.housingReadyProbe);
    state.housingReadyProbe = null;
  }

  flushHousingPending();
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
  if (state.wardrobeMode === "faction") {
    mp.events.callRemote("server:wardrobe:endService");
  }
  closeWardrobe();
});

mp.events.add("cef:housingStorage:deposit", (...args: unknown[]) => {
  const [uid] = args as [string];
  if (!uid) return;
  mp.events.callRemote("server:housing:storage:deposit", uid);
});

mp.events.add("cef:housingStorage:withdraw", (...args: unknown[]) => {
  const [uid] = args as [string];
  if (!uid) return;
  mp.events.callRemote("server:housing:storage:withdraw", uid);
});

mp.events.add("cef:housingStorage:close", () => {
  closeHousingStorage();
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
