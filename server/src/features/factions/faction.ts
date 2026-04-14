export type FactionType = "mafia" | "gang" | "state";

export type Faction = {
  factionId: number;
  name: string;
  shortName: string;
  type: FactionType;
  colorHex: string;
  mapIconId: number;
  balance: number;
  createdAt: string;
};

export type FactionRank = {
  factionId: number;
  rankLevel: number;
  rankName: string;
};

export type FactionRankPermission = {
  factionId: number;
  rankLevel: number;
  permissionKey: string;
};

export type FactionMembership = {
  factionId: number;
  accountId: number;
  rankLevel: number;
  joinedAt: string;
};

export type FactionMemberProfile = {
  accountId: number;
  factionId: number;
  factionName: string;
  factionShortName: string;
  factionType: FactionType;
  factionColorHex: string;
  rankLevel: number;
  rankName: string;
  joinedAt: string;
};

export type FactionSpawnPoint = {
  factionId: number;
  x: number;
  y: number;
  z: number;
  rotZ: number;
  dimension: number;
};

export type FactionStorageType = "storage" | "armory" | "drugs";

export type FactionStoragePoint = {
  storagePointId: number;
  factionId: number;
  storageType: FactionStorageType;
  label: string;
  x: number;
  y: number;
  z: number;
  rotZ: number;
  dimension: number;
};

export type FactionWardrobePoint = {
  wardrobePointId: number;
  factionId: number;
  label: string;
  x: number;
  y: number;
  z: number;
  rotZ: number;
  dimension: number;
};

export type FactionOutfit = {
  outfitId: number;
  factionId: number;
  category: string;
  name: string;
  clothingJson: string;
  createdAt: string;
};

export type FactionVehicle = {
  factionVehicleId: number;
  factionId: number;
  modelName: string;
  displayName: string;
  minRankLevel: number;
  posX: number;
  posY: number;
  posZ: number;
  rotZ: number;
  dimension: number;
  numberPlate: string;
  colorPrimary: number;
  colorSecondary: number;
  isSpawned: boolean;
  fuelLevel: number;
  fuelType: string;
  health: number;
  isLocked: boolean;
  createdAt: string;
};

export interface VehicleCatalogItem {
  catalogId: number;
  modelName: string;
  displayName: string;
  price: number;
  fuelType: string;
  maxFuel: number;
  imageUrl?: string;
  createdAt: string;
}

export type FactionClothingItem = {
  itemId: number;
  factionId: number;
  minRank: number;
  componentId: number;
  drawableId: number;
  texture_id: number;
  label: string;
  category: string;
};
