export type HousePoint = {
  x: number;
  y: number;
  z: number;
  rotZ: number;
};

export type HouseParkingType = "garage" | "helipad";

export type HouseInteriorTemplate = {
  key: string;
  label: string;
  locationName: string;
  iplName: string | null;
  tierLabel: string;
  stars: number;
  description: string;
  basePrice: number;
  storageSlots: number;
  garageSlots: number;
  entryPoint: HousePoint;
  exitPoint: HousePoint;
  storagePoint: HousePoint;
  wardrobePoint: HousePoint;
};

export type House = {
  houseId: number;
  displayName: string;
  streetName: string;
  interiorKey: string;
  stars: number;
  price: number;
  hasGarden: boolean;
  hasHelipad: boolean;
  entranceX: number;
  entranceY: number;
  entranceZ: number;
  entranceRotZ: number;
  entranceDimension: number;
  garageX: number;
  garageY: number;
  garageZ: number;
  garageRotZ: number;
  garageDimension: number;
  helipadX: number | null;
  helipadY: number | null;
  helipadZ: number | null;
  helipadRotZ: number | null;
  helipadDimension: number | null;
  storageSlots: number;
  garageSlots: number;
  interiorEntryX: number | null;
  interiorEntryY: number | null;
  interiorEntryZ: number | null;
  interiorEntryRotZ: number | null;
  interiorExitX: number | null;
  interiorExitY: number | null;
  interiorExitZ: number | null;
  interiorExitRotZ: number | null;
  storageX: number | null;
  storageY: number | null;
  storageZ: number | null;
  storageRotZ: number | null;
  wardrobeX: number | null;
  wardrobeY: number | null;
  wardrobeZ: number | null;
  wardrobeRotZ: number | null;
  ownerAccountId: number | null;
  ownerName: string | null;
  isLocked: boolean;
  createdByAccountId: number | null;
  createdAt: string;
};

export type HouseStorageRecord = {
  houseId: number;
  inventoryData: any[];
  updatedAt: string;
};

export type HouseInteriorLayout = {
  interiorKey: string;
  entryX: number | null;
  entryY: number | null;
  entryZ: number | null;
  entryRotZ: number | null;
  exitX: number | null;
  exitY: number | null;
  exitZ: number | null;
  exitRotZ: number | null;
  storageX: number | null;
  storageY: number | null;
  storageZ: number | null;
  storageRotZ: number | null;
  wardrobeX: number | null;
  wardrobeY: number | null;
  wardrobeZ: number | null;
  wardrobeRotZ: number | null;
  updatedAt: string;
};

export type HouseGarageVehicle = {
  garageVehicleId: number;
  houseId: number;
  parkingType: HouseParkingType;
  modelHash: number;
  displayName: string;
  numberPlate: string;
  colorPrimary: number;
  colorSecondary: number;
  fuelLevel: number;
  health: number;
  isLocked: boolean;
  storedAt: string;
};

export const HOUSE_HELIPAD_SLOTS = 1;

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

const helicopterModelHashes = typeof mp === "undefined"
  ? new Set<number>()
  : new Set<number>(HELICOPTER_MODEL_NAMES.map((modelName) => mp.joaat(modelName)));

// Interior anchors are based on the RAGE:MP wiki "Interiors and Locations" page.
export const HOUSE_INTERIOR_TEMPLATES: HouseInteriorTemplate[] = [
  {
    key: "starter_studio",
    label: "Starter Studio",
    locationName: "Low End Apartment",
    iplName: null,
    tierLabel: "1 Stern",
    stars: 1,
    description: "Kompakt, guenstig und perfekt fuer den ersten Einstieg.",
    basePrice: 35000,
    storageSlots: 24,
    garageSlots: 1,
    entryPoint: { x: 261.4586, y: -998.8196, z: -99.00863, rotZ: 270 },
    exitPoint: { x: 261.4586, y: -998.8196, z: -99.00863, rotZ: 270 },
    storagePoint: { x: 262.84, y: -1003.34, z: -99.01, rotZ: 88 },
    wardrobePoint: { x: 259.72, y: -1003.95, z: -99.01, rotZ: 269 }
  },
  {
    key: "metro_suite",
    label: "Metro Suite",
    locationName: "Medium End Apartment",
    iplName: null,
    tierLabel: "2 Sterne",
    stars: 2,
    description: "Moderner Innenstadt-Standard mit mehr Platz und Stauraum.",
    basePrice: 85000,
    storageSlots: 36,
    garageSlots: 2,
    entryPoint: { x: 347.2686, y: -999.2955, z: -99.19622, rotZ: 270 },
    exitPoint: { x: 347.2686, y: -999.2955, z: -99.19622, rotZ: 270 },
    storagePoint: { x: 351.89, y: -998.44, z: -99.2, rotZ: 181 },
    wardrobePoint: { x: 350.15, y: -993.62, z: -99.2, rotZ: 271 }
  },
  {
    key: "eclipse_residence",
    label: "Eclipse Residence",
    locationName: "Vibrant 2 Apartment",
    iplName: "apa_v_mp_h_03_c",
    tierLabel: "3 Sterne",
    stars: 3,
    description: "Gehobenes Apartment mit modernem Farbkonzept und spuerbar mehr Klasse.",
    basePrice: 165000,
    storageSlots: 48,
    garageSlots: 3,
    entryPoint: { x: -786.9584, y: 315.7974, z: 187.9135, rotZ: 270 },
    exitPoint: { x: -786.9584, y: 315.7974, z: 187.9135, rotZ: 270 },
    storagePoint: { x: -795.95, y: 326.36, z: 187.31, rotZ: 180 },
    wardrobePoint: { x: -797.92, y: 327.87, z: 187.31, rotZ: 270 }
  },
  {
    key: "richman_penthouse",
    label: "Richman Penthouse",
    locationName: "Tinsel Towers, Apt 42",
    iplName: null,
    tierLabel: "4 Sterne",
    stars: 4,
    description: "Luxus-Apartment mit Skyline-Feeling, deutlich hochwertiger als die mittleren Kategorien.",
    basePrice: 310000,
    storageSlots: 64,
    garageSlots: 4,
    entryPoint: { x: -614.86, y: 40.6783, z: 97.60007, rotZ: 180 },
    exitPoint: { x: -614.86, y: 40.6783, z: 97.60007, rotZ: 180 },
    storagePoint: { x: -612.9, y: 39.85, z: 97.60007, rotZ: 180 },
    wardrobePoint: { x: -616.95, y: 39.95, z: 97.60007, rotZ: 180 }
  },
  {
    key: "skyline_prestige",
    label: "Skyline Prestige",
    locationName: "2677 Whispymound Drive",
    iplName: null,
    tierLabel: "5 Sterne",
    stars: 5,
    description: "Topklasse-Villa in den Hills, maximaler Luxus fuer die hoechste Housing-Kategorie.",
    basePrice: 575000,
    storageSlots: 84,
    garageSlots: 6,
    entryPoint: { x: 120.5, y: 549.952, z: 184.097, rotZ: 180 },
    exitPoint: { x: 120.5, y: 549.952, z: 184.097, rotZ: 180 },
    storagePoint: { x: 122.15, y: 548.95, z: 184.097, rotZ: 180 },
    wardrobePoint: { x: 118.75, y: 548.95, z: 184.097, rotZ: 180 }
  }
];

const templateMap = new Map(HOUSE_INTERIOR_TEMPLATES.map((template) => [template.key, template]));

export function getHouseInteriorTemplate(interiorKey: string) {
  return templateMap.get(interiorKey) ?? null;
}

export function getHouseInteriorDimension(houseId: number) {
  return 50000 + Number(houseId || 0);
}

export function isHelicopterModelHash(modelHash: number) {
  return helicopterModelHashes.has(Number(modelHash));
}
