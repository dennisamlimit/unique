import { getHeading, isPlayerVehicleDriver } from "../../runtime/helpers.js";
import { HousingRepository } from "./housing-repository.js";
import {
  HOUSE_HELIPAD_SLOTS,
  HOUSE_INTERIOR_TEMPLATES,
  getHouseInteriorDimension,
  getHouseInteriorTemplate,
  isHelicopterModelHash,
  type House,
  type HouseGarageVehicle
} from "./housing.js";

function clampHouseName(value: string, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, 48) : fallback;
}

function computeForwardPoint(position: { x: number; y: number; z: number }, rotZ: number, distance: number) {
  const radians = (rotZ * Math.PI) / 180;
  return {
    x: Number(position.x) + Math.sin(-radians) * distance,
    y: Number(position.y) + Math.cos(radians) * distance,
    z: Number(position.z)
  };
}

function resolveVehiclePoint(player: any) {
  return {
    x: Number(player.vehicle.position?.x ?? player.position?.x ?? 0),
    y: Number(player.vehicle.position?.y ?? player.position?.y ?? 0),
    z: Number(player.vehicle.position?.z ?? player.position?.z ?? 0),
    rotZ: Number(player.vehicle.rotation?.z ?? player.vehicle.heading ?? getHeading(player))
  };
}

function buildStreetName(player: any) {
  const street = clampHouseName(String(player.getVariable?.("CURRENT_STREET_NAME") ?? ""), "");
  const crossing = clampHouseName(String(player.getVariable?.("CURRENT_CROSSING_NAME") ?? ""), "");
  const zone = clampHouseName(String(player.getVariable?.("CURRENT_ZONE_NAME") ?? ""), "");

  if (street && crossing && crossing.toLowerCase() !== street.toLowerCase()) {
    return clampHouseName(`${street} / ${crossing}`, "Unbekannte Lage");
  }

  return street || zone || "Unbekannte Lage";
}

function resolvePoint(
  point: { x: number; y: number; z: number; rotZ: number },
  override: { x: number | null; y: number | null; z: number | null; rotZ: number | null }
) {
  if (
    override.x === null || override.y === null || override.z === null || override.rotZ === null
  ) {
    return { ...point };
  }

  return {
    x: override.x,
    y: override.y,
    z: override.z,
    rotZ: override.rotZ
  };
}

export class HousingService {
  private readonly repository = new HousingRepository();

  getInteriorTemplates() {
    return HOUSE_INTERIOR_TEMPLATES.map((template) => ({ ...template }));
  }

  async getAll() {
    return this.repository.getAll();
  }

  async getById(houseId: number) {
    return this.repository.getById(houseId);
  }

  async getGarageVehicles(houseId: number) {
    return this.repository.getGarageVehicles(houseId, "garage");
  }

  async getHelipadVehicles(houseId: number) {
    return this.repository.getGarageVehicles(houseId, "helipad");
  }

  async getStoredVehicles(houseId: number) {
    return this.repository.getGarageVehicles(houseId, null);
  }

  async getGarageVehicleById(garageVehicleId: number) {
    return this.repository.getGarageVehicleById(garageVehicleId);
  }

  async getStorage(houseId: number) {
    const storage = await this.repository.getStorage(houseId);
    if (storage) {
      return storage;
    }
    return this.repository.upsertStorage(houseId, []);
  }

  async saveStorage(houseId: number, inventoryData: any[]) {
    return this.repository.upsertStorage(houseId, inventoryData);
  }

  private async getTemplateWithInteriorLayout(interiorKey: string) {
    const template = getHouseInteriorTemplate(interiorKey);
    if (!template) {
      return null;
    }

    const layout = await this.repository.getInteriorLayout(interiorKey);
    if (!layout) {
      return template;
    }

    return {
      ...template,
      entryPoint: resolvePoint(template.entryPoint, {
        x: layout.entryX,
        y: layout.entryY,
        z: layout.entryZ,
        rotZ: layout.entryRotZ
      }),
      exitPoint: resolvePoint(template.exitPoint, {
        x: layout.exitX,
        y: layout.exitY,
        z: layout.exitZ,
        rotZ: layout.exitRotZ
      }),
      storagePoint: resolvePoint(template.storagePoint, {
        x: layout.storageX,
        y: layout.storageY,
        z: layout.storageZ,
        rotZ: layout.storageRotZ
      }),
      wardrobePoint: resolvePoint(template.wardrobePoint, {
        x: layout.wardrobeX,
        y: layout.wardrobeY,
        z: layout.wardrobeZ,
        rotZ: layout.wardrobeRotZ
      })
    };
  }

  async createHouseFromPlayer(
    player: any,
    input: {
      displayName: string;
      interiorKey: string;
      price?: number;
      hasGarden?: boolean;
      hasHelipad?: boolean;
      createdByAccountId?: number | null;
    }
  ) {
    const template = await this.getTemplateWithInteriorLayout(input.interiorKey);
    if (!template) {
      return { ok: false as const, reason: "interior_not_found" };
    }

    const entrance = {
      x: Number(player.position?.x ?? 0),
      y: Number(player.position?.y ?? 0),
      z: Number(player.position?.z ?? 0),
      rotZ: Number(getHeading(player) ?? 0),
      dimension: Number(player.dimension ?? 0)
    };

    const vehicle = player.vehicle;
    const isDriver = isPlayerVehicleDriver(player, vehicle);
    const garageSource = isDriver
      ? resolveVehiclePoint(player)
      : {
          ...computeForwardPoint(entrance, entrance.rotZ, 6.5),
          rotZ: entrance.rotZ
        };
    const helipadSource = input.hasHelipad
      ? isDriver && isHelicopterModelHash(Number(vehicle?.model ?? 0))
        ? resolveVehiclePoint(player)
        : {
            ...computeForwardPoint(entrance, entrance.rotZ, 15),
            rotZ: entrance.rotZ
          }
      : null;

    const created = await this.repository.create({
      displayName: clampHouseName(input.displayName, template.label),
      streetName: buildStreetName(player),
      interiorKey: template.key,
      stars: template.stars,
      price: Math.max(0, Number.isFinite(Number(input.price)) && Number(input.price) > 0 ? Math.trunc(Number(input.price)) : template.basePrice),
      hasGarden: Boolean(input.hasGarden),
      hasHelipad: Boolean(input.hasHelipad),
      entranceX: entrance.x,
      entranceY: entrance.y,
      entranceZ: entrance.z,
      entranceRotZ: entrance.rotZ,
      entranceDimension: entrance.dimension,
      garageX: garageSource.x,
      garageY: garageSource.y,
      garageZ: garageSource.z,
      garageRotZ: garageSource.rotZ,
      garageDimension: entrance.dimension,
      helipadX: helipadSource?.x ?? null,
      helipadY: helipadSource?.y ?? null,
      helipadZ: helipadSource?.z ?? null,
      helipadRotZ: helipadSource?.rotZ ?? null,
      helipadDimension: helipadSource ? entrance.dimension : null,
      storageSlots: template.storageSlots,
      garageSlots: template.garageSlots,
      interiorEntryX: template.entryPoint.x,
      interiorEntryY: template.entryPoint.y,
      interiorEntryZ: template.entryPoint.z,
      interiorEntryRotZ: template.entryPoint.rotZ,
      interiorExitX: template.exitPoint.x,
      interiorExitY: template.exitPoint.y,
      interiorExitZ: template.exitPoint.z,
      interiorExitRotZ: template.exitPoint.rotZ,
      storageX: template.storagePoint.x,
      storageY: template.storagePoint.y,
      storageZ: template.storagePoint.z,
      storageRotZ: template.storagePoint.rotZ,
      wardrobeX: template.wardrobePoint.x,
      wardrobeY: template.wardrobePoint.y,
      wardrobeZ: template.wardrobePoint.z,
      wardrobeRotZ: template.wardrobePoint.rotZ,
      createdByAccountId: input.createdByAccountId ?? null
    });

    await this.repository.upsertStorage(created.houseId, []);

    return { ok: true as const, house: created, template };
  }

  async deleteHouse(houseId: number) {
    return this.repository.delete(houseId);
  }

  async buyHouse(houseId: number, ownerAccountId: number) {
    const house = await this.repository.getById(houseId);
    if (!house) {
      return { ok: false as const, reason: "not_found" };
    }

    if (house.ownerAccountId) {
      return { ok: false as const, reason: "owned", house };
    }

    const updated = await this.repository.setOwner(houseId, ownerAccountId);
    if (!updated) {
      return { ok: false as const, reason: "update_failed", house };
    }

    return { ok: true as const, house: updated };
  }

  async toggleLock(houseId: number, nextState?: boolean) {
    const house = await this.repository.getById(houseId);
    if (!house) {
      return null;
    }

    return this.repository.setLockState(houseId, typeof nextState === "boolean" ? nextState : !house.isLocked);
  }

  async createGarageVehicle(input: {
    houseId: number;
    parkingType: "garage" | "helipad";
    modelHash: number;
    displayName: string;
    numberPlate: string;
    colorPrimary: number;
    colorSecondary: number;
    fuelLevel: number;
    health: number;
    isLocked: boolean;
  }) {
    return this.repository.createGarageVehicle(input);
  }

  async deleteGarageVehicle(garageVehicleId: number) {
    return this.repository.deleteGarageVehicle(garageVehicleId);
  }

  private async updateExteriorParkingPointFromPlayer(
    houseId: number,
    player: any,
    parkingType: "garage" | "helipad"
  ) {
    const house = await this.repository.getById(houseId);
    if (!house) {
      return null;
    }

    const basePosition = isPlayerVehicleDriver(player, player.vehicle)
      ? resolveVehiclePoint(player)
      : {
          x: Number(player.position?.x ?? 0),
          y: Number(player.position?.y ?? 0),
          z: Number(player.position?.z ?? 0),
          rotZ: Number(getHeading(player) ?? 0)
        };

    const point = {
      ...basePosition,
      // Exterior parking points should always live in the same dimension as the house entrance.
      dimension: Number(house.entranceDimension ?? 0)
    };

    return parkingType === "helipad"
      ? this.repository.updateHelipadPoint(houseId, point)
      : this.repository.updateGaragePoint(houseId, point);
  }

  async updateGaragePointFromPlayer(houseId: number, player: any) {
    return this.updateExteriorParkingPointFromPlayer(houseId, player, "garage");
  }

  async updateHelipadPointFromPlayer(houseId: number, player: any) {
    return this.updateExteriorParkingPointFromPlayer(houseId, player, "helipad");
  }

  async updateInteriorPointFromPlayer(
    houseId: number,
    pointType: "entry" | "exit" | "storage" | "wardrobe",
    player: any
  ) {
    const house = await this.repository.getById(houseId);
    if (!house) {
      return null;
    }

    const point = {
      x: Number(player.position?.x ?? 0),
      y: Number(player.position?.y ?? 0),
      z: Number(player.position?.z ?? 0),
      rotZ: Number(getHeading(player) ?? 0)
    };

    const syncPointTypes = pointType === "entry"
      ? ["entry", "exit"] as const
      : [pointType] as const;

    let syncedHouseCount = 0;
    for (const syncPointType of syncPointTypes) {
      await this.repository.upsertInteriorLayoutPoint(house.interiorKey, syncPointType, point);
      const updatedCount = await this.repository.updateInteriorPointByInteriorKey(house.interiorKey, syncPointType, point);
      syncedHouseCount = Math.max(syncedHouseCount, updatedCount);
    }

    const updatedHouse = await this.repository.getById(houseId);
    if (!updatedHouse) {
      return null;
    }

    return {
      house: updatedHouse,
      point,
      syncedInteriorKeys: [house.interiorKey],
      syncedHouseCount,
      syncedPointTypes: [...syncPointTypes]
    };
  }

  getInterior(house: House | null) {
    if (!house) {
      return null;
    }

    const template = getHouseInteriorTemplate(house.interiorKey);
    if (!template) {
      return null;
    }

    return {
      ...template,
      dimension: getHouseInteriorDimension(house.houseId),
      entryPoint: resolvePoint(template.entryPoint, {
        x: house.interiorEntryX,
        y: house.interiorEntryY,
        z: house.interiorEntryZ,
        rotZ: house.interiorEntryRotZ
      }),
      exitPoint: resolvePoint(template.exitPoint, {
        x: house.interiorExitX,
        y: house.interiorExitY,
        z: house.interiorExitZ,
        rotZ: house.interiorExitRotZ
      }),
      storagePoint: resolvePoint(template.storagePoint, {
        x: house.storageX,
        y: house.storageY,
        z: house.storageZ,
        rotZ: house.storageRotZ
      }),
      wardrobePoint: resolvePoint(template.wardrobePoint, {
        x: house.wardrobeX,
        y: house.wardrobeY,
        z: house.wardrobeZ,
        rotZ: house.wardrobeRotZ
      })
    };
  }

  canManageHouse(house: House | null, accountId: number, adminLevel: number) {
    if (!house) {
      return false;
    }

    return adminLevel >= 5 || (accountId > 0 && house.ownerAccountId === accountId);
  }

  async buildPlayerPayload(player: any) {
    const accountId = Number(player.getVariable?.("ACCOUNT_ID") ?? 0);
    const adminLevel = Number(player.getVariable?.("ADMIN_LEVEL") ?? 0);
    const currentHouseId = Number(player.getVariable?.("CURRENT_HOUSE_ID") ?? 0);
    const houses = await this.repository.getAll();

    return {
      houses: await Promise.all(
        houses.map(async (house) => {
          const interior = this.getInterior(house);
          const canManage = this.canManageHouse(house, accountId, adminLevel);
          const isInsideCurrentHouse = currentHouseId > 0 && currentHouseId === house.houseId;
          const garageVehicles = canManage ? await this.repository.getGarageVehicles(house.houseId) : [];
          const hasHelipadPoint = house.hasHelipad
            && house.helipadX !== null
            && house.helipadY !== null
            && house.helipadZ !== null
            && house.helipadRotZ !== null;
          const helipadVehicles = canManage && hasHelipadPoint
            ? await this.repository.getGarageVehicles(house.houseId, "helipad")
            : [];

          return {
            houseId: house.houseId,
            displayName: house.displayName,
            streetName: house.streetName,
            stars: house.stars,
            price: house.price,
            hasGarden: house.hasGarden,
            hasHelipad: house.hasHelipad,
            ownerAccountId: house.ownerAccountId,
            ownerName: house.ownerName,
            isOwned: Boolean(house.ownerAccountId),
            isOwner: accountId > 0 && house.ownerAccountId === accountId,
            isLocked: house.isLocked,
            interiorKey: house.interiorKey,
            interiorLabel: interior?.label ?? house.interiorKey,
            tierLabel: interior?.tierLabel ?? `${house.stars} Sterne`,
            description: interior?.description ?? "",
            storageSlots: house.storageSlots,
            garageSlots: house.garageSlots,
            entrance: {
              x: house.entranceX,
              y: house.entranceY,
              z: house.entranceZ,
              rotZ: house.entranceRotZ,
              dimension: house.entranceDimension
            },
            garage: {
              x: house.garageX,
              y: house.garageY,
              z: house.garageZ,
              rotZ: house.garageRotZ,
              dimension: house.entranceDimension,
              parkedVehicles: garageVehicles
            },
            helipad: hasHelipadPoint
              ? {
                  x: Number(house.helipadX ?? 0),
                  y: Number(house.helipadY ?? 0),
                  z: Number(house.helipadZ ?? 0),
                  rotZ: Number(house.helipadRotZ ?? 0),
                  dimension: house.entranceDimension,
                  parkedVehicles: helipadVehicles
                }
              : null,
            helipadSlots: house.hasHelipad ? HOUSE_HELIPAD_SLOTS : 0,
            permissions: {
              canBuy: accountId > 0 && !house.ownerAccountId,
              canEnter: canManage,
              canToggleLock: canManage,
              canUseStorage: canManage,
              canUseWardrobe: canManage,
              canUseGarage: canManage,
              canUseHelipad: canManage && hasHelipadPoint,
              canExit: isInsideCurrentHouse
            },
            interior: canManage || isInsideCurrentHouse
              ? {
                  dimension: interior?.dimension ?? 0,
                  entryPoint: interior?.entryPoint ?? null,
                  exitPoint: interior?.exitPoint ?? null,
                  storagePoint: interior?.storagePoint ?? null,
                  wardrobePoint: interior?.wardrobePoint ?? null
                }
              : null
          };
        })
      )
    };
  }

  async buildAdminPayload() {
    const houses = await this.repository.getAll();
    return {
      templates: this.getInteriorTemplates(),
      houses
    };
  }
}
