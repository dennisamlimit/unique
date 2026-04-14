import { getPool } from "../../infrastructure/database.js";
import type {
  Faction,
  FactionMembership,
  FactionMemberProfile,
  FactionRank,
  FactionRankPermission,
  FactionSpawnPoint,
  FactionStoragePoint,
  FactionStorageType,
  FactionVehicle,
  FactionWardrobePoint,
  FactionOutfit,
  FactionType,
  VehicleCatalogItem
} from "./faction.js";

function mapVehicleCatalogItem(row: Record<string, unknown>): VehicleCatalogItem {
  return {
    catalogId: Number(row.catalog_id),
    modelName: String(row.model_name),
    displayName: String(row.display_name),
    price: Number(row.price),
    fuelType: String(row.fuel_type ?? "petrol"),
    maxFuel: Number(row.max_fuel ?? 100),
    imageUrl: row.image_url ? String(row.image_url) : null,
    createdAt: String(row.created_at)
  };
}

function mapFaction(row: Record<string, unknown>): Faction {
  return {
    factionId: Number(row.faction_id),
    name: String(row.name),
    shortName: String(row.short_name),
    type: String(row.type) as FactionType,
    colorHex: String(row.color_hex),
    mapIconId: Number(row.map_icon_id ?? 0),
    balance: Number(row.balance ?? 0),
    createdAt: String(row.created_at)
  };
}

function mapRank(row: Record<string, unknown>): FactionRank {
  return {
    factionId: Number(row.faction_id),
    rankLevel: Number(row.rank_level),
    rankName: String(row.rank_name)
  };
}

function mapMembership(row: Record<string, unknown>): FactionMembership {
  return {
    accountId: Number(row.account_id),
    factionId: Number(row.faction_id),
    rankLevel: Number(row.rank_level),
    joinedAt: String(row.joined_at)
  };
}

function mapRankPermission(row: Record<string, unknown>): FactionRankPermission {
  return {
    factionId: Number(row.faction_id),
    rankLevel: Number(row.rank_level),
    permissionKey: String(row.permission_key)
  };
}

function mapMemberProfile(row: Record<string, unknown>): FactionMemberProfile {
  return {
    accountId: Number(row.account_id),
    factionId: Number(row.faction_id),
    factionName: String(row.faction_name),
    factionShortName: String(row.faction_short_name),
    factionType: String(row.faction_type) as FactionType,
    factionColorHex: String(row.faction_color_hex),
    rankLevel: Number(row.rank_level),
    rankName: String(row.rank_name),
    joinedAt: String(row.joined_at)
  };
}

function mapSpawn(row: Record<string, unknown>): FactionSpawnPoint {
  return {
    factionId: Number(row.faction_id),
    x: Number(row.pos_x),
    y: Number(row.pos_y),
    z: Number(row.pos_z),
    rotZ: Number(row.rot_z),
    dimension: Number(row.dimension)
  };
}

function mapStoragePoint(row: Record<string, unknown>): FactionStoragePoint {
  return {
    storagePointId: Number(row.storage_point_id),
    factionId: Number(row.faction_id),
    storageType: String(row.storage_type) as FactionStorageType,
    label: String(row.label),
    x: Number(row.pos_x),
    y: Number(row.pos_y),
    z: Number(row.pos_z),
    rotZ: Number(row.rot_z),
    dimension: Number(row.dimension)
  };
}

function mapWardrobePoint(row: Record<string, unknown>): FactionWardrobePoint {
  return {
    wardrobePointId: Number(row.wardrobe_point_id),
    factionId: Number(row.faction_id),
    label: String(row.label),
    x: Number(row.pos_x),
    y: Number(row.pos_y),
    z: Number(row.pos_z),
    rotZ: Number(row.rot_z),
    dimension: Number(row.dimension)
  };
}

function mapOutfit(row: Record<string, unknown>): FactionOutfit {
  return {
    outfitId: Number(row.outfit_id),
    factionId: Number(row.faction_id),
    category: String(row.category),
    name: String(row.name),
    clothingJson: String(row.clothing_json),
    createdAt: String(row.created_at)
  };
}

function mapFactionVehicle(row: Record<string, unknown>): FactionVehicle {
  return {
    factionVehicleId: Number(row.faction_vehicle_id),
    factionId: Number(row.faction_id),
    modelName: String(row.model_name),
    displayName: String(row.display_name),
    minRankLevel: Number(row.min_rank_level),
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    posZ: Number(row.pos_z),
    rotZ: Number(row.rot_z),
    dimension: Number(row.dimension),
    numberPlate: String(row.number_plate),
    colorPrimary: Number(row.color_primary),
    colorSecondary: Number(row.color_secondary),
    isSpawned: !!row.is_spawned,
    fuelLevel: Number(row.fuel_level ?? 100),
    fuelType: String(row.fuel_type ?? "petrol"),
    health: Number(row.health ?? 1000),
    isLocked: !!row.is_locked,
    createdAt: String(row.created_at)
  };
}

function mapClothingItem(row: Record<string, unknown>): FactionClothingItem {
  return {
    itemId: Number(row.item_id),
    factionId: Number(row.faction_id),
    minRank: Number(row.min_rank),
    componentId: Number(row.component_id),
    drawableId: Number(row.drawable_id),
    textureId: Number(row.texture_id),
    label: String(row.label),
    category: String(row.category)
  };
}

export class FactionRepository {
  async getClothingItemsByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_clothing_items WHERE faction_id = $1 ORDER BY min_rank, category, label;",
      [factionId]
    );
    return result.rows.map(mapClothingItem);
  }

  async deleteClothingItem(itemId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_clothing_items WHERE item_id = $1 RETURNING *;",
      [itemId]
    );
    return result.rowCount > 0;
  }
  async getClothingItemById(itemId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_clothing_items WHERE item_id = $1 LIMIT 1;",
      [itemId]
    );
    return result.rows[0] ? mapClothingItem(result.rows[0]) : null;
  }

  async getById(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM factions WHERE faction_id = $1 LIMIT 1;",
      [factionId]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }

  async getByName(name: string) {
    const result = await getPool().query(
      "SELECT * FROM factions WHERE LOWER(name) = LOWER($1) LIMIT 1;",
      [name.trim()]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }

  async getAll() {
    const result = await getPool().query("SELECT * FROM factions ORDER BY name;");
    return result.rows.map(mapFaction);
  }

  async create(faction: Omit<Faction, "factionId" | "createdAt">) {
    const result = await getPool().query(
      `
        INSERT INTO factions (name, short_name, type, color_hex, map_icon_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `,
      [faction.name, faction.shortName, faction.type, faction.colorHex, faction.mapIconId]
    );
    return mapFaction(result.rows[0]);
  }

  async delete(factionId: number) {
    const result = await getPool().query(
      "DELETE FROM factions WHERE faction_id = $1 RETURNING *;",
      [factionId]
    );
    return result.rowCount > 0;
  }

  async getRanksByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_ranks WHERE faction_id = $1 ORDER BY rank_level;",
      [factionId]
    );
    return result.rows.map(mapRank);
  }

  async upsertRank(factionId: number, rankLevel: number, rankName: string) {
    const result = await getPool().query(
      `
        INSERT INTO faction_ranks (faction_id, rank_level, rank_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (faction_id, rank_level) DO UPDATE SET rank_name = EXCLUDED.rank_name
        RETURNING *;
      `,
      [factionId, rankLevel, rankName]
    );
    return mapRank(result.rows[0]);
  }

  async updateMapIcon(factionId: number, mapIconId: number) {
    const result = await getPool().query(
      `
        UPDATE factions
        SET map_icon_id = $2
        WHERE faction_id = $1
        RETURNING *;
      `,
      [factionId, mapIconId]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }
 
  async updateBalance(factionId: number, delta: number) {
    const result = await getPool().query(
      `
        UPDATE factions
        SET balance = balance + $2
        WHERE faction_id = $1
        RETURNING *;
      `,
      [factionId, delta]
    );
    return result.rows[0] ? mapFaction(result.rows[0]) : null;
  }

  async deleteRank(factionId: number, rankLevel: number) {
    const result = await getPool().query(
      "DELETE FROM faction_ranks WHERE faction_id = $1 AND rank_level = $2 RETURNING *;",
      [factionId, rankLevel]
    );
    return result.rowCount > 0;
  }

  async getPermissionsByFactionRank(factionId: number, rankLevel: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_rank_permissions WHERE faction_id = $1 AND rank_level = $2 ORDER BY permission_key;",
      [factionId, rankLevel]
    );
    return result.rows.map(mapRankPermission);
  }

  async getPermissionsForAccount(accountId: number) {
    const result = await getPool().query(
      `
        SELECT frp.*
        FROM faction_memberships fm
        JOIN faction_rank_permissions frp
          ON frp.faction_id = fm.faction_id
         AND frp.rank_level = fm.rank_level
        WHERE fm.account_id = $1
        ORDER BY frp.permission_key;
      `,
      [accountId]
    );
    return result.rows.map(mapRankPermission);
  }

  async setRankPermission(factionId: number, rankLevel: number, permissionKey: string, granted: boolean) {
    if (!granted) {
      await getPool().query(
        "DELETE FROM faction_rank_permissions WHERE faction_id = $1 AND rank_level = $2 AND permission_key = $3;",
        [factionId, rankLevel, permissionKey]
      );
      return null;
    }

    const result = await getPool().query(
      `
        INSERT INTO faction_rank_permissions (faction_id, rank_level, permission_key)
        VALUES ($1, $2, $3)
        ON CONFLICT (faction_id, rank_level, permission_key) DO UPDATE SET permission_key = EXCLUDED.permission_key
        RETURNING *;
      `,
      [factionId, rankLevel, permissionKey]
    );
    return mapRankPermission(result.rows[0]);
  }

  async getMembershipByAccountId(accountId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE account_id = $1 LIMIT 1;",
      [accountId]
    );
    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async getMembersByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE faction_id = $1 ORDER BY rank_level DESC;",
      [factionId]
    );
    return result.rows.map(mapMembership);
  }

  async getLeaderMembership(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_memberships WHERE faction_id = $1 ORDER BY rank_level DESC LIMIT 1;",
      [factionId]
    );
    return result.rows[0] ? mapMembership(result.rows[0]) : null;
  }

  async assignMember(factionId: number, accountId: number, rankLevel: number) {
    const result = await getPool().query(
      `
        INSERT INTO faction_memberships (account_id, faction_id, rank_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id) DO UPDATE SET faction_id = EXCLUDED.faction_id, rank_level = EXCLUDED.rank_level, joined_at = NOW()
        RETURNING *;
      `,
      [accountId, factionId, rankLevel]
    );
    return mapMembership(result.rows[0]);
  }

  async removeMember(accountId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_memberships WHERE account_id = $1 RETURNING *;",
      [accountId]
    );
    return result.rowCount > 0;
  }

  async getMemberProfile(accountId: number): Promise<FactionMemberProfile | null> {
    const result = await getPool().query(
      `
        SELECT
          fm.account_id,
          fm.faction_id,
          f.name AS faction_name,
          f.short_name AS faction_short_name,
          f.type AS faction_type,
          f.color_hex AS faction_color_hex,
          fm.rank_level,
          COALESCE(fr.rank_name, 'Rang ' || fm.rank_level) AS rank_name,
          fm.joined_at
        FROM faction_memberships fm
        JOIN factions f ON f.faction_id = fm.faction_id
        LEFT JOIN faction_ranks fr ON fr.faction_id = fm.faction_id AND fr.rank_level = fm.rank_level
        WHERE fm.account_id = $1
        LIMIT 1;
      `,
      [accountId]
    );
    return result.rows[0] ? mapMemberProfile(result.rows[0]) : null;
  }

  async countMembersAtRank(factionId: number, rankLevel: number) {
    const result = await getPool().query(
      "SELECT COUNT(*)::INTEGER AS count FROM faction_memberships WHERE faction_id = $1 AND rank_level = $2;",
      [factionId, rankLevel]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async getSpawnByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_spawn_points WHERE faction_id = $1 LIMIT 1;",
      [factionId]
    );
    return result.rows[0] ? mapSpawn(result.rows[0]) : null;
  }

  async saveSpawn(factionId: number, spawn: Omit<FactionSpawnPoint, "factionId">) {
    const result = await getPool().query(
      `
        INSERT INTO faction_spawn_points (faction_id, pos_x, pos_y, pos_z, rot_z, dimension)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (faction_id)
        DO UPDATE SET pos_x = EXCLUDED.pos_x, pos_y = EXCLUDED.pos_y, pos_z = EXCLUDED.pos_z, rot_z = EXCLUDED.rot_z, dimension = EXCLUDED.dimension
        RETURNING *;
      `,
      [factionId, spawn.x, spawn.y, spawn.z, spawn.rotZ, spawn.dimension]
    );
    return mapSpawn(result.rows[0]);
  }

  async getStoragePointsByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_storage_points WHERE faction_id = $1 ORDER BY storage_type, label, storage_point_id;",
      [factionId]
    );
    return result.rows.map(mapStoragePoint);
  }

  async createStoragePoint(point: Omit<FactionStoragePoint, "storagePointId">) {
    const result = await getPool().query(
      `
        INSERT INTO faction_storage_points (faction_id, storage_type, label, pos_x, pos_y, pos_z, rot_z, dimension)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `,
      [point.factionId, point.storageType, point.label, point.x, point.y, point.z, point.rotZ, point.dimension]
    );
    return mapStoragePoint(result.rows[0]);
  }

  async deleteStoragePoint(storagePointId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_storage_points WHERE storage_point_id = $1 RETURNING *;",
      [storagePointId]
    );
    return result.rowCount > 0;
  }

  async getWardrobePointsByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_wardrobe_points WHERE faction_id = $1 ORDER BY label, wardrobe_point_id;",
      [factionId]
    );
    return result.rows.map(mapWardrobePoint);
  }

  async createWardrobePoint(point: Omit<FactionWardrobePoint, "wardrobePointId">) {
    const result = await getPool().query(
      `
        INSERT INTO faction_wardrobe_points (faction_id, label, pos_x, pos_y, pos_z, rot_z, dimension)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
      [point.factionId, point.label, point.x, point.y, point.z, point.rotZ, point.dimension]
    );
    return mapWardrobePoint(result.rows[0]);
  }

  async deleteWardrobePoint(wardrobePointId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_wardrobe_points WHERE wardrobe_point_id = $1 RETURNING *;",
      [wardrobePointId]
    );
    return result.rowCount > 0;
  }

  async getOutfitsByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_outfits WHERE faction_id = $1 ORDER BY name, outfit_id;",
      [factionId]
    );
    return result.rows.map(mapOutfit);
  }

  async getOutfitById(outfitId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_outfits WHERE outfit_id = $1 LIMIT 1;",
      [outfitId]
    );
    return result.rows[0] ? mapOutfit(result.rows[0]) : null;
  }

  async createOutfit(factionId: number, category: string, name: string, clothingJson: string) {
    const result = await getPool().query(
      `
        INSERT INTO faction_outfits (faction_id, category, name, clothing_json)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `,
      [factionId, category, name, clothingJson]
    );
    return mapOutfit(result.rows[0]);
  }

  async deleteOutfit(outfitId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_outfits WHERE outfit_id = $1 RETURNING *;",
      [outfitId]
    );
    return result.rowCount > 0;
  }

  async getFactionVehiclesByFactionId(factionId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_vehicles WHERE faction_id = $1 ORDER BY min_rank_level, display_name, faction_vehicle_id;",
      [factionId]
    );
    return result.rows.map(mapFactionVehicle);
  }

  async getAllFactionVehicles() {
    const result = await getPool().query("SELECT * FROM faction_vehicles ORDER BY faction_id, min_rank_level, faction_vehicle_id;");
    return result.rows.map(mapFactionVehicle);
  }

  async getFactionVehicleById(factionVehicleId: number) {
    const result = await getPool().query(
      "SELECT * FROM faction_vehicles WHERE faction_vehicle_id = $1 LIMIT 1;",
      [factionVehicleId]
    );
    return result.rows[0] ? mapFactionVehicle(result.rows[0]) : null;
  }

  async createFactionVehicle(vehicle: Omit<FactionVehicle, "factionVehicleId" | "createdAt">) {
    const result = await getPool().query(
      `
        INSERT INTO faction_vehicles (
          faction_id, model_name, display_name, min_rank_level,
          pos_x, pos_y, pos_z, rot_z, dimension, number_plate, color_primary, color_secondary,
          fuel_level, fuel_type, health, is_locked
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `,
      [
        vehicle.factionId,
        vehicle.modelName,
        vehicle.displayName,
        vehicle.minRankLevel,
        vehicle.posX,
        vehicle.posY,
        vehicle.posZ,
        vehicle.rotZ,
        vehicle.dimension,
        vehicle.numberPlate,
        vehicle.colorPrimary,
        vehicle.colorSecondary,
        100.0,
        "petrol",
        1000.0,
        false
      ]
    );
    return mapFactionVehicle(result.rows[0]);
  }

  async setFactionVehicleSpawned(factionVehicleId: number, isSpawned: boolean) {
    const result = await getPool().query(
      `
        UPDATE faction_vehicles
        SET is_spawned = $2
        WHERE faction_vehicle_id = $1
        RETURNING *;
      `,
      [factionVehicleId, isSpawned]
    );
    return result.rows[0] ? mapFactionVehicle(result.rows[0]) : null;
  }

  async setVehicleSpawnedStatus(factionVehicleId: number, isSpawned: boolean): Promise<void> {
    await getPool().query("UPDATE faction_vehicles SET is_spawned = $1 WHERE faction_vehicle_id = $2", [isSpawned, factionVehicleId]);
  }

  async updateVehicleState(factionVehicleId: number, fuelLevel: number, health: number, isLocked: boolean): Promise<void> {
    await getPool().query(
      "UPDATE faction_vehicles SET fuel_level = $1, health = $2, is_locked = $3 WHERE faction_vehicle_id = $4",
      [fuelLevel, health, isLocked, factionVehicleId]
    );
  }

  async getVehicleCatalog() {
    const result = await getPool().query("SELECT * FROM vehicle_catalog ORDER BY price, display_name;");
    return result.rows.map(mapVehicleCatalogItem);
  }

  async addCatalogItem(item: Omit<VehicleCatalogItem, "catalogId" | "createdAt">) {
    const result = await getPool().query(
      `
        INSERT INTO vehicle_catalog (model_name, display_name, price, image_url, fuel_type, max_fuel)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      [item.modelName, item.displayName, item.price, item.imageUrl, item.fuelType, item.maxFuel]
    );
    return mapVehicleCatalogItem(result.rows[0]);
  }

  async addVehicleToCatalog(modelName: string, displayName: string, price: number, imageUrl?: string, fuelType: string = "petrol", maxFuel: number = 100): Promise<void> {
    await getPool().query(
      "INSERT INTO vehicle_catalog (model_name, display_name, price, image_url, fuel_type, max_fuel) VALUES ($1, $2, $3, $4, $5, $6)",
      [modelName, displayName, price, imageUrl, fuelType, maxFuel]
    );
  }

  async deleteCatalogItem(catalogId: number) {
    const result = await getPool().query(
      "DELETE FROM vehicle_catalog WHERE catalog_id = $1 RETURNING *;",
      [catalogId]
    );
    return result.rowCount > 0;
  }

  async updateFactionVehicleParking(factionVehicleId: number, parking: Pick<FactionVehicle, "posX" | "posY" | "posZ" | "rotZ" | "dimension">) {
    const result = await getPool().query(
      `
        UPDATE faction_vehicles
        SET pos_x = $2, pos_y = $3, pos_z = $4, rot_z = $5, dimension = $6
        WHERE faction_vehicle_id = $1
        RETURNING *;
      `,
      [factionVehicleId, parking.posX, parking.posY, parking.posZ, parking.rotZ, parking.dimension]
    );
    return result.rows[0] ? mapFactionVehicle(result.rows[0]) : null;
  }

  async updateFactionVehicleMinRank(factionVehicleId: number, minRankLevel: number) {
    const result = await getPool().query(
      `
        UPDATE faction_vehicles
        SET min_rank_level = $2
        WHERE faction_vehicle_id = $1
        RETURNING *;
      `,
      [factionVehicleId, minRankLevel]
    );
    return result.rows[0] ? mapFactionVehicle(result.rows[0]) : null;
  }

  async deleteFactionVehicle(factionVehicleId: number) {
    const result = await getPool().query(
      "DELETE FROM faction_vehicles WHERE faction_vehicle_id = $1 RETURNING *;",
      [factionVehicleId]
    );
    return result.rowCount > 0;
  }
}
