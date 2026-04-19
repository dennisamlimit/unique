import { getPool } from "../../infrastructure/database.js";
import { DatabaseError } from "../../shared/errors.js";
import type { House, HouseGarageVehicle, HouseInteriorLayout, HouseParkingType, HouseStorageRecord } from "./housing.js";

function mapHouse(row: Record<string, unknown>): House {
  const ownerFirstName = row.owner_first_name ? String(row.owner_first_name) : "";
  const ownerLastName = row.owner_last_name ? String(row.owner_last_name) : "";
  const ownerName = ownerFirstName || ownerLastName ? `${ownerFirstName} ${ownerLastName}`.trim() : null;

  return {
    houseId: Number(row.house_id),
    displayName: String(row.display_name),
    streetName: String(row.street_name),
    interiorKey: String(row.interior_key),
    stars: Number(row.stars),
    price: Number(row.price),
    hasGarden: Boolean(row.has_garden),
    hasHelipad: Boolean(row.has_helipad),
    entranceX: Number(row.entrance_x),
    entranceY: Number(row.entrance_y),
    entranceZ: Number(row.entrance_z),
    entranceRotZ: Number(row.entrance_rot_z),
    entranceDimension: Number(row.entrance_dimension ?? 0),
    garageX: Number(row.garage_x),
    garageY: Number(row.garage_y),
    garageZ: Number(row.garage_z),
    garageRotZ: Number(row.garage_rot_z),
    garageDimension: Number(row.garage_dimension ?? 0),
    helipadX: row.helipad_x === null || row.helipad_x === undefined ? null : Number(row.helipad_x),
    helipadY: row.helipad_y === null || row.helipad_y === undefined ? null : Number(row.helipad_y),
    helipadZ: row.helipad_z === null || row.helipad_z === undefined ? null : Number(row.helipad_z),
    helipadRotZ: row.helipad_rot_z === null || row.helipad_rot_z === undefined ? null : Number(row.helipad_rot_z),
    helipadDimension: row.helipad_dimension === null || row.helipad_dimension === undefined ? null : Number(row.helipad_dimension),
    storageSlots: Number(row.storage_slots),
    garageSlots: Number(row.garage_slots),
    interiorEntryX: row.interior_entry_x === null || row.interior_entry_x === undefined ? null : Number(row.interior_entry_x),
    interiorEntryY: row.interior_entry_y === null || row.interior_entry_y === undefined ? null : Number(row.interior_entry_y),
    interiorEntryZ: row.interior_entry_z === null || row.interior_entry_z === undefined ? null : Number(row.interior_entry_z),
    interiorEntryRotZ: row.interior_entry_rot_z === null || row.interior_entry_rot_z === undefined ? null : Number(row.interior_entry_rot_z),
    interiorExitX: row.interior_exit_x === null || row.interior_exit_x === undefined ? null : Number(row.interior_exit_x),
    interiorExitY: row.interior_exit_y === null || row.interior_exit_y === undefined ? null : Number(row.interior_exit_y),
    interiorExitZ: row.interior_exit_z === null || row.interior_exit_z === undefined ? null : Number(row.interior_exit_z),
    interiorExitRotZ: row.interior_exit_rot_z === null || row.interior_exit_rot_z === undefined ? null : Number(row.interior_exit_rot_z),
    storageX: row.storage_x === null || row.storage_x === undefined ? null : Number(row.storage_x),
    storageY: row.storage_y === null || row.storage_y === undefined ? null : Number(row.storage_y),
    storageZ: row.storage_z === null || row.storage_z === undefined ? null : Number(row.storage_z),
    storageRotZ: row.storage_rot_z === null || row.storage_rot_z === undefined ? null : Number(row.storage_rot_z),
    wardrobeX: row.wardrobe_x === null || row.wardrobe_x === undefined ? null : Number(row.wardrobe_x),
    wardrobeY: row.wardrobe_y === null || row.wardrobe_y === undefined ? null : Number(row.wardrobe_y),
    wardrobeZ: row.wardrobe_z === null || row.wardrobe_z === undefined ? null : Number(row.wardrobe_z),
    wardrobeRotZ: row.wardrobe_rot_z === null || row.wardrobe_rot_z === undefined ? null : Number(row.wardrobe_rot_z),
    ownerAccountId: row.owner_account_id === null || row.owner_account_id === undefined ? null : Number(row.owner_account_id),
    ownerName,
    isLocked: Boolean(row.is_locked),
    createdByAccountId: row.created_by_account_id === null || row.created_by_account_id === undefined ? null : Number(row.created_by_account_id),
    createdAt: String(row.created_at)
  };
}

function mapStorage(row: Record<string, unknown>): HouseStorageRecord {
  return {
    houseId: Number(row.house_id),
    inventoryData: Array.isArray(row.inventory_data) ? row.inventory_data : [],
    updatedAt: String(row.updated_at)
  };
}

function mapGarageVehicle(row: Record<string, unknown>): HouseGarageVehicle {
  return {
    garageVehicleId: Number(row.garage_vehicle_id),
    houseId: Number(row.house_id),
    parkingType: String(row.parking_type ?? "garage") === "helipad" ? "helipad" : "garage",
    modelHash: Number(row.model_hash),
    displayName: String(row.display_name ?? "Fahrzeug"),
    numberPlate: String(row.number_plate ?? ""),
    colorPrimary: Number(row.color_primary ?? 0),
    colorSecondary: Number(row.color_secondary ?? 0),
    fuelLevel: Number(row.fuel_level ?? 100),
    health: Number(row.health ?? 1000),
    isLocked: Boolean(row.is_locked),
    storedAt: String(row.stored_at)
  };
}

function mapInteriorLayout(row: Record<string, unknown>): HouseInteriorLayout {
  return {
    interiorKey: String(row.interior_key),
    entryX: row.entry_x === null || row.entry_x === undefined ? null : Number(row.entry_x),
    entryY: row.entry_y === null || row.entry_y === undefined ? null : Number(row.entry_y),
    entryZ: row.entry_z === null || row.entry_z === undefined ? null : Number(row.entry_z),
    entryRotZ: row.entry_rot_z === null || row.entry_rot_z === undefined ? null : Number(row.entry_rot_z),
    exitX: row.exit_x === null || row.exit_x === undefined ? null : Number(row.exit_x),
    exitY: row.exit_y === null || row.exit_y === undefined ? null : Number(row.exit_y),
    exitZ: row.exit_z === null || row.exit_z === undefined ? null : Number(row.exit_z),
    exitRotZ: row.exit_rot_z === null || row.exit_rot_z === undefined ? null : Number(row.exit_rot_z),
    storageX: row.storage_x === null || row.storage_x === undefined ? null : Number(row.storage_x),
    storageY: row.storage_y === null || row.storage_y === undefined ? null : Number(row.storage_y),
    storageZ: row.storage_z === null || row.storage_z === undefined ? null : Number(row.storage_z),
    storageRotZ: row.storage_rot_z === null || row.storage_rot_z === undefined ? null : Number(row.storage_rot_z),
    wardrobeX: row.wardrobe_x === null || row.wardrobe_x === undefined ? null : Number(row.wardrobe_x),
    wardrobeY: row.wardrobe_y === null || row.wardrobe_y === undefined ? null : Number(row.wardrobe_y),
    wardrobeZ: row.wardrobe_z === null || row.wardrobe_z === undefined ? null : Number(row.wardrobe_z),
    wardrobeRotZ: row.wardrobe_rot_z === null || row.wardrobe_rot_z === undefined ? null : Number(row.wardrobe_rot_z),
    updatedAt: String(row.updated_at)
  };
}

export class HousingRepository {
  async getAll() {
    try {
      const result = await getPool().query(
        `
          SELECT
            h.*,
            owner.first_name AS owner_first_name,
            owner.last_name AS owner_last_name
          FROM houses h
          LEFT JOIN accounts owner ON owner.account_id = h.owner_account_id
          ORDER BY h.stars ASC, h.price ASC, h.house_id ASC;
        `
      );
      return result.rows.map(mapHouse);
    } catch (cause) {
      throw new DatabaseError("housing getAll failed", cause);
    }
  }

  async getById(houseId: number) {
    try {
      const result = await getPool().query(
        `
          SELECT
            h.*,
            owner.first_name AS owner_first_name,
            owner.last_name AS owner_last_name
          FROM houses h
          LEFT JOIN accounts owner ON owner.account_id = h.owner_account_id
          WHERE h.house_id = $1
          LIMIT 1;
        `,
        [houseId]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing getById failed", cause);
    }
  }

  async create(input: {
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
    createdByAccountId: number | null;
  }) {
    try {
      const result = await getPool().query(
        `
          INSERT INTO houses (
            display_name,
            street_name,
            interior_key,
            stars,
            price,
            has_garden,
            has_helipad,
            entrance_x,
            entrance_y,
            entrance_z,
            entrance_rot_z,
            entrance_dimension,
            garage_x,
            garage_y,
            garage_z,
            garage_rot_z,
            garage_dimension,
            helipad_x,
            helipad_y,
            helipad_z,
            helipad_rot_z,
            helipad_dimension,
            storage_slots,
            garage_slots,
            interior_entry_x,
            interior_entry_y,
            interior_entry_z,
            interior_entry_rot_z,
            interior_exit_x,
            interior_exit_y,
            interior_exit_z,
            interior_exit_rot_z,
            storage_x,
            storage_y,
            storage_z,
            storage_rot_z,
            wardrobe_x,
            wardrobe_y,
            wardrobe_z,
            wardrobe_rot_z,
            created_by_account_id
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41
          )
          RETURNING *;
        `,
        [
          input.displayName,
          input.streetName,
          input.interiorKey,
          input.stars,
          input.price,
          input.hasGarden,
          input.hasHelipad,
          input.entranceX,
          input.entranceY,
          input.entranceZ,
          input.entranceRotZ,
          input.entranceDimension,
          input.garageX,
          input.garageY,
          input.garageZ,
          input.garageRotZ,
          input.garageDimension,
          input.helipadX,
          input.helipadY,
          input.helipadZ,
          input.helipadRotZ,
          input.helipadDimension,
          input.storageSlots,
          input.garageSlots,
          input.interiorEntryX,
          input.interiorEntryY,
          input.interiorEntryZ,
          input.interiorEntryRotZ,
          input.interiorExitX,
          input.interiorExitY,
          input.interiorExitZ,
          input.interiorExitRotZ,
          input.storageX,
          input.storageY,
          input.storageZ,
          input.storageRotZ,
          input.wardrobeX,
          input.wardrobeY,
          input.wardrobeZ,
          input.wardrobeRotZ,
          input.createdByAccountId
        ]
      );
      return mapHouse(result.rows[0]);
    } catch (cause) {
      throw new DatabaseError("housing create failed", cause);
    }
  }

  async delete(houseId: number) {
    try {
      const result = await getPool().query("DELETE FROM houses WHERE house_id = $1 RETURNING *;", [houseId]);
      return (result.rowCount ?? 0) > 0;
    } catch (cause) {
      throw new DatabaseError("housing delete failed", cause);
    }
  }

  async setOwner(houseId: number, ownerAccountId: number | null) {
    try {
      const result = await getPool().query(
        `
          UPDATE houses
          SET owner_account_id = $2
          WHERE house_id = $1
          RETURNING *;
        `,
        [houseId, ownerAccountId]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing setOwner failed", cause);
    }
  }

  async setLockState(houseId: number, isLocked: boolean) {
    try {
      const result = await getPool().query(
        "UPDATE houses SET is_locked = $2 WHERE house_id = $1 RETURNING *;",
        [houseId, isLocked]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing setLockState failed", cause);
    }
  }

  async updateGaragePoint(
    houseId: number,
    point: { x: number; y: number; z: number; rotZ: number; dimension: number }
  ) {
    try {
      const result = await getPool().query(
        `
          UPDATE houses
          SET garage_x = $2, garage_y = $3, garage_z = $4, garage_rot_z = $5, garage_dimension = $6
          WHERE house_id = $1
          RETURNING *;
        `,
        [houseId, point.x, point.y, point.z, point.rotZ, point.dimension]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing updateGaragePoint failed", cause);
    }
  }

  async updateHelipadPoint(
    houseId: number,
    point: { x: number; y: number; z: number; rotZ: number; dimension: number }
  ) {
    try {
      const result = await getPool().query(
        `
          UPDATE houses
          SET
            has_helipad = TRUE,
            helipad_x = $2,
            helipad_y = $3,
            helipad_z = $4,
            helipad_rot_z = $5,
            helipad_dimension = $6
          WHERE house_id = $1
          RETURNING *;
        `,
        [houseId, point.x, point.y, point.z, point.rotZ, point.dimension]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing updateHelipadPoint failed", cause);
    }
  }

  async updateInteriorPoint(
    houseId: number,
    pointType: "entry" | "exit" | "storage" | "wardrobe",
    point: { x: number; y: number; z: number; rotZ: number }
  ) {
    const columnPrefixMap = {
      entry: "interior_entry",
      exit: "interior_exit",
      storage: "storage",
      wardrobe: "wardrobe"
    } as const;

    const prefix = columnPrefixMap[pointType];
    try {
      const result = await getPool().query(
        `
          UPDATE houses
          SET ${prefix}_x = $2, ${prefix}_y = $3, ${prefix}_z = $4, ${prefix}_rot_z = $5
          WHERE house_id = $1
          RETURNING *;
        `,
        [houseId, point.x, point.y, point.z, point.rotZ]
      );
      return result.rows[0] ? mapHouse(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError(`housing updateInteriorPoint(${pointType}) failed`, cause);
    }
  }

  async getInteriorLayout(interiorKey: string) {
    try {
      const result = await getPool().query(
        "SELECT * FROM house_interior_layouts WHERE interior_key = $1 LIMIT 1;",
        [interiorKey]
      );
      return result.rows[0] ? mapInteriorLayout(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing getInteriorLayout failed", cause);
    }
  }

  async upsertInteriorLayoutPoint(
    interiorKey: string,
    pointType: "entry" | "exit" | "storage" | "wardrobe",
    point: { x: number; y: number; z: number; rotZ: number }
  ) {
    const columnPrefixMap = {
      entry: "entry",
      exit: "exit",
      storage: "storage",
      wardrobe: "wardrobe"
    } as const;

    const prefix = columnPrefixMap[pointType];
    try {
      const result = await getPool().query(
        `
          INSERT INTO house_interior_layouts (
            interior_key,
            ${prefix}_x,
            ${prefix}_y,
            ${prefix}_z,
            ${prefix}_rot_z,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (interior_key)
          DO UPDATE
          SET
            ${prefix}_x = EXCLUDED.${prefix}_x,
            ${prefix}_y = EXCLUDED.${prefix}_y,
            ${prefix}_z = EXCLUDED.${prefix}_z,
            ${prefix}_rot_z = EXCLUDED.${prefix}_rot_z,
            updated_at = NOW()
          RETURNING *;
        `,
        [interiorKey, point.x, point.y, point.z, point.rotZ]
      );
      return mapInteriorLayout(result.rows[0]);
    } catch (cause) {
      throw new DatabaseError(`housing upsertInteriorLayoutPoint(${pointType}) failed`, cause);
    }
  }

  async updateInteriorPointByInteriorKey(
    interiorKey: string,
    pointType: "entry" | "exit" | "storage" | "wardrobe",
    point: { x: number; y: number; z: number; rotZ: number }
  ) {
    const columnPrefixMap = {
      entry: "interior_entry",
      exit: "interior_exit",
      storage: "storage",
      wardrobe: "wardrobe"
    } as const;

    const prefix = columnPrefixMap[pointType];
    try {
      const result = await getPool().query(
        `
          UPDATE houses
          SET ${prefix}_x = $2, ${prefix}_y = $3, ${prefix}_z = $4, ${prefix}_rot_z = $5
          WHERE interior_key = $1;
        `,
        [interiorKey, point.x, point.y, point.z, point.rotZ]
      );
      return Number(result.rowCount ?? 0);
    } catch (cause) {
      throw new DatabaseError(`housing updateInteriorPointByInteriorKey(${pointType}) failed`, cause);
    }
  }

  async getStorage(houseId: number) {
    try {
      const result = await getPool().query(
        "SELECT * FROM house_storage WHERE house_id = $1 LIMIT 1;",
        [houseId]
      );
      return result.rows[0] ? mapStorage(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing getStorage failed", cause);
    }
  }

  async upsertStorage(houseId: number, inventoryData: any[]) {
    try {
      const result = await getPool().query(
        `
          INSERT INTO house_storage (house_id, inventory_data, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (house_id)
          DO UPDATE SET inventory_data = EXCLUDED.inventory_data, updated_at = NOW()
          RETURNING *;
        `,
        [houseId, JSON.stringify(inventoryData)]
      );
      return mapStorage(result.rows[0]);
    } catch (cause) {
      throw new DatabaseError("housing upsertStorage failed", cause);
    }
  }

  async getGarageVehicles(houseId: number, parkingType: HouseParkingType | null = "garage") {
    try {
      const result = parkingType === null
        ? await getPool().query(
            "SELECT * FROM house_garage_vehicles WHERE house_id = $1 ORDER BY stored_at ASC, garage_vehicle_id ASC;",
            [houseId]
          )
        : await getPool().query(
            "SELECT * FROM house_garage_vehicles WHERE house_id = $1 AND parking_type = $2 ORDER BY stored_at ASC, garage_vehicle_id ASC;",
            [houseId, parkingType]
          );
      return result.rows.map(mapGarageVehicle);
    } catch (cause) {
      throw new DatabaseError("housing getGarageVehicles failed", cause);
    }
  }

  async getGarageVehicleById(garageVehicleId: number) {
    try {
      const result = await getPool().query(
        "SELECT * FROM house_garage_vehicles WHERE garage_vehicle_id = $1 LIMIT 1;",
        [garageVehicleId]
      );
      return result.rows[0] ? mapGarageVehicle(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing getGarageVehicleById failed", cause);
    }
  }

  async createGarageVehicle(input: {
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
  }) {
    try {
      const result = await getPool().query(
        `
          INSERT INTO house_garage_vehicles (
            house_id,
            parking_type,
            model_hash,
            display_name,
            number_plate,
            color_primary,
            color_secondary,
            fuel_level,
            health,
            is_locked
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *;
        `,
        [
          input.houseId,
          input.parkingType,
          input.modelHash,
          input.displayName,
          input.numberPlate,
          input.colorPrimary,
          input.colorSecondary,
          input.fuelLevel,
          input.health,
          input.isLocked
        ]
      );
      return mapGarageVehicle(result.rows[0]);
    } catch (cause) {
      throw new DatabaseError("housing createGarageVehicle failed", cause);
    }
  }

  async deleteGarageVehicle(garageVehicleId: number) {
    try {
      const result = await getPool().query(
        "DELETE FROM house_garage_vehicles WHERE garage_vehicle_id = $1 RETURNING *;",
        [garageVehicleId]
      );
      return result.rows[0] ? mapGarageVehicle(result.rows[0]) : null;
    } catch (cause) {
      throw new DatabaseError("housing deleteGarageVehicle failed", cause);
    }
  }
}
