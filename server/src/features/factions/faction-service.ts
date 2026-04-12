import { FactionRepository } from "./faction-repository.js";
import type {
  AssignFactionMemberDto,
  CreateFactionDto,
  CreateFactionOutfitDto,
  CreateFactionStoragePointDto,
  CreateFactionVehicleDto,
  CreateFactionWardrobePointDto,
  SetFactionRankNameDto,
  SetFactionRankPermissionDto
} from "./api/faction-dtos.js";
import type { FactionStorageType, FactionType } from "./faction.js";
import { ClothingLib } from "@shared/clothing-lib";

const DEFAULT_RANK_NAMES: Record<number, string> = {
  1: "Mitglied",
  2: "Erfahrenes Mitglied",
  3: "Veteran",
  4: "Offizier",
  5: "Vize-Chef",
  6: "Anfuehrer"
};

const BASE_RANK_PERMISSIONS: Record<number, string[]> = {
  1: [],
  2: ["event_access"],
  3: ["event_access", "storage_general", "weapon_pistol"],
  4: ["event_access", "storage_general", "storage_armory", "weapon_pistol", "weapon_smg"],
  5: ["event_access", "storage_general", "storage_armory", "manage_members", "manage_storage", "manage_vehicles", "weapon_pistol", "weapon_smg", "weapon_rifle"],
  6: [
    "event_access",
    "storage_general",
    "storage_armory",
    "storage_drugs",
    "manage_members",
    "manage_ranks",
    "manage_storage",
    "manage_vehicles",
    "weapon_pistol",
    "weapon_smg",
    "weapon_rifle"
  ]
};

const CRIME_STORAGE_TYPES: FactionStorageType[] = ["storage", "armory", "drugs"];
const STATE_STORAGE_TYPES: FactionStorageType[] = ["storage", "armory"];

function getDefaultRankPermissions(type: FactionType, rankLevel: number) {
  const permissions = [...(BASE_RANK_PERMISSIONS[rankLevel] ?? [])];

  if (type === "state") {
    if (rankLevel >= 3 && !permissions.includes("wardrobe_access")) {
      permissions.push("wardrobe_access");
    }

    if (rankLevel >= 5) {
      permissions.push("wardrobe_category_detective");
    }

    if (rankLevel >= 6) {
      permissions.push("wardrobe_category_sek", "wardrobe_category_tactical");
    }
  }

  return permissions;
}

function uniquePermissions(values: string[]) {
  return [...new Set(values)];
}

export class FactionService {
  private readonly repository = new FactionRepository();

  async getById(factionId: number) {
    return this.repository.getById(factionId);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async create(dto: CreateFactionDto) {
    const faction = await this.repository.create({
      name: dto.name.trim(),
      shortName: dto.shortName.toUpperCase(),
      type: dto.type,
      colorHex: dto.colorHex.toUpperCase(),
      mapIconId: dto.mapIconId
    });

    for (let level = 1; level <= 6; level++) {
      await this.repository.upsertRank(faction.factionId, level, DEFAULT_RANK_NAMES[level] ?? `Rang ${level}`);

      for (const permissionKey of getDefaultRankPermissions(faction.type, level)) {
        await this.repository.setRankPermission(faction.factionId, level, permissionKey, true);
      }
    }

    return faction;
  }

  async syncDefaultPermissions(factionId: number) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    const ranks = await this.repository.getRanksByFactionId(factionId);
    for (const rank of ranks) {
      for (const permissionKey of uniquePermissions(getDefaultRankPermissions(faction.type, rank.rankLevel))) {
        await this.repository.setRankPermission(factionId, rank.rankLevel, permissionKey, true);
      }
    }

    return { ok: true as const, faction };
  }

  async syncDefaultPermissionsForAll() {
    const factions = await this.repository.getAll();
    let synced = 0;

    for (const faction of factions) {
      const result = await this.syncDefaultPermissions(faction.factionId);
      if (result.ok) {
        synced += 1;
      }
    }

    return { synced };
  }

  async delete(factionId: number) {
    return this.repository.delete(factionId);
  }

  async setMapIcon(factionId: number, mapIconId: number) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return null;
    }

    return this.repository.updateMapIcon(factionId, mapIconId);
  }

  async setRankName(dto: SetFactionRankNameDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    return this.repository.upsertRank(dto.factionId, dto.rankLevel, dto.rankName.trim());
  }

  async deleteRank(factionId: number, rankLevel: number) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    const membersAtRank = await this.repository.countMembersAtRank(factionId, rankLevel);
    if (membersAtRank > 0) {
      return { ok: false as const, reason: "rank_in_use" };
    }

    return { ok: await this.repository.deleteRank(factionId, rankLevel) };
  }

  async getRanks(factionId: number) {
    return this.repository.getRanksByFactionId(factionId);
  }

  async getRankPermissions(factionId: number, rankLevel: number) {
    return this.repository.getPermissionsByFactionRank(factionId, rankLevel);
  }

  async getAccountPermissions(accountId: number) {
    return this.repository.getPermissionsForAccount(accountId);
  }

  async setRankPermission(dto: SetFactionRankPermissionDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    const ranks = await this.repository.getRanksByFactionId(dto.factionId);
    if (!ranks.some((rank) => rank.rankLevel === dto.rankLevel)) {
      return null;
    }

    return this.repository.setRankPermission(dto.factionId, dto.rankLevel, dto.permissionKey.trim().toLowerCase(), dto.granted);
  }

  async getMembershipByAccountId(accountId: number) {
    return this.repository.getMembershipByAccountId(accountId);
  }

  async getMemberProfile(accountId: number) {
    return this.repository.getMemberProfile(accountId);
  }

  async getMembersByFactionId(factionId: number) {
    return this.repository.getMembersByFactionId(factionId);
  }

  async setFactionLeader(factionId: number, accountId: number) {
    if (!Number.isInteger(factionId) || !Number.isInteger(accountId) || factionId <= 0 || accountId <= 0) {
      return null;
    }

    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return null;
    }

    const ranks = await this.repository.getRanksByFactionId(factionId);
    const leaderRankLevel = ranks.length > 0 ? Math.max(...ranks.map((rank) => rank.rankLevel)) : 1;

    const currentLeader = await this.repository.getLeaderMembership(factionId);
    if (currentLeader && currentLeader.accountId !== accountId) {
      await this.repository.assignMember(factionId, currentLeader.accountId, Math.max(1, leaderRankLevel - 1));
    }

    return this.repository.assignMember(factionId, accountId, leaderRankLevel);
  }

  async assignMember(dto: AssignFactionMemberDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    const ranks = await this.repository.getRanksByFactionId(dto.factionId);
    if (!ranks.some((rank) => rank.rankLevel === dto.rankLevel)) {
      return null;
    }

    return this.repository.assignMember(dto.factionId, dto.accountId, dto.rankLevel);
  }

  async removeMember(accountId: number) {
    return this.repository.removeMember(accountId);
  }

  async getFactionSpawn(factionId: number) {
    return this.repository.getSpawnByFactionId(factionId);
  }

  async saveFactionSpawnFromPlayer(factionId: number, player: any) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return null;
    }

    return this.repository.saveSpawn(factionId, {
      x: Number(player.position.x),
      y: Number(player.position.y),
      z: Number(player.position.z),
      rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
      dimension: Number(player.dimension ?? 0)
    });
  }

  async getStoragePoints(factionId: number) {
    return this.repository.getStoragePointsByFactionId(factionId);
  }

  async createStoragePointFromPlayer(dto: CreateFactionStoragePointDto, player: any) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    const allowedTypes = faction.type === "state" ? STATE_STORAGE_TYPES : CRIME_STORAGE_TYPES;
    if (!allowedTypes.includes(dto.storageType as FactionStorageType)) {
      return { ok: false as const, reason: "storage_type_not_allowed" };
    }

    return {
      ok: true as const,
      point: await this.repository.createStoragePoint({
        factionId: dto.factionId,
        storageType: dto.storageType as FactionStorageType,
        label: dto.label.trim(),
        x: Number(player.position.x),
        y: Number(player.position.y),
        z: Number(player.position.z),
        rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
        dimension: Number(player.dimension ?? 0)
      })
    };
  }

  async deleteStoragePoint(storagePointId: number) {
    return this.repository.deleteStoragePoint(storagePointId);
  }

  async getWardrobePoints(factionId: number) {
    return this.repository.getWardrobePointsByFactionId(factionId);
  }

  async createWardrobePointFromPlayer(dto: CreateFactionWardrobePointDto, player: any) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    if (faction.type !== "state") {
      return { ok: false as const, reason: "wardrobe_state_only" };
    }

    return {
      ok: true as const,
      point: await this.repository.createWardrobePoint({
        factionId: dto.factionId,
        label: dto.label.trim(),
        x: Number(player.position.x),
        y: Number(player.position.y),
        z: Number(player.position.z),
        rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
        dimension: Number(player.dimension ?? 0)
      })
    };
  }

  async deleteWardrobePoint(wardrobePointId: number) {
    return this.repository.deleteWardrobePoint(wardrobePointId);
  }

  async getOutfits(factionId: number) {
    return this.repository.getOutfitsByFactionId(factionId);
  }

  async getOutfitById(outfitId: number) {
    return this.repository.getOutfitById(outfitId);
  }

  async createOutfit(dto: CreateFactionOutfitDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    if (faction.type !== "state") {
      return { ok: false as const, reason: "wardrobe_state_only" };
    }

    return {
      ok: true as const,
      outfit: await this.repository.createOutfit(dto.factionId, dto.category.trim().toLowerCase(), dto.name.trim(), JSON.stringify(dto.clothing))
    };
  }

  async deleteOutfit(outfitId: number) {
    return this.repository.deleteOutfit(outfitId);
  }

  async getFactionVehicles(factionId: number) {
    return this.repository.getFactionVehiclesByFactionId(factionId);
  }

  async getAllFactionVehicles() {
    return this.repository.getAllFactionVehicles();
  }

  async getFactionVehicleById(factionVehicleId: number) {
    return this.repository.getFactionVehicleById(factionVehicleId);
  }

  async createFactionVehicleFromPlayer(dto: CreateFactionVehicleDto, player: any) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    const normalizedShort = faction.shortName.replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ORG";
    return this.repository.createFactionVehicle({
      factionId: dto.factionId,
      modelName: dto.modelName.trim().toLowerCase(),
      displayName: dto.displayName.trim(),
      minRankLevel: dto.minRankLevel,
      posX: Number(player.position.x + 2),
      posY: Number(player.position.y),
      posZ: Number(player.position.z),
      rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
      dimension: Number(player.dimension ?? 0),
      numberPlate: normalizedShort,
      colorPrimary: 0,
      colorSecondary: 0
    });
  }

  async parkFactionVehicleFromPlayer(factionVehicleId: number, player: any) {
    return this.repository.updateFactionVehicleParking(factionVehicleId, {
      posX: Number(player.position.x),
      posY: Number(player.position.y),
      posZ: Number(player.position.z),
      rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
      dimension: Number(player.dimension ?? 0)
    });
  }

  async updateFactionVehicleMinRank(factionVehicleId: number, minRankLevel: number) {
    return this.repository.updateFactionVehicleMinRank(factionVehicleId, minRankLevel);
  }

  async deleteFactionVehicle(factionVehicleId: number) {
    return this.repository.deleteFactionVehicle(factionVehicleId);
  }

  async getVehicleCatalog() {
    return this.repository.getVehicleCatalog();
  }

  async addCatalogItem(item: { modelName: string; displayName: string; price: number; imageUrl: string | null }) {
    return this.repository.addCatalogItem(item);
  }

  async deleteCatalogItem(catalogId: number) {
    return this.repository.deleteCatalogItem(catalogId);
  }

  async setVehicleSpawnedStatus(factionVehicleId: number, isSpawned: boolean) {
    return this.repository.setFactionVehicleSpawned(factionVehicleId, isSpawned);
  }

  async buyVehicle(factionId: number, catalogId: number, player: any) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return { ok: false as const, reason: "faction_not_found" };
    }

    const catalog = await this.repository.getVehicleCatalog();
    const item = catalog.find((entry) => entry.catalogId === catalogId);
    if (!item) {
      return { ok: false as const, reason: "vehicle_not_found" };
    }

    if (faction.balance < item.price) {
      return { ok: false as const, reason: "insufficient_funds" };
    }

    // Deduct balance
    await this.repository.updateBalance(factionId, -item.price);

    // Create vehicle
    const normalizedShort = faction.shortName.replace(/[^A-Z0-9]/g, "").slice(0, 6) || "ORG";
    const vehicle = await this.repository.createFactionVehicle({
      factionId,
      modelName: item.modelName,
      displayName: item.displayName,
      minRankLevel: 1,
      posX: Number(player.position.x),
      posY: Number(player.position.y),
      posZ: Number(player.position.z),
      rotZ: Number(player.heading ?? player.rotation?.z ?? 0),
      dimension: Number(player.dimension ?? 0),
      numberPlate: normalizedShort,
      colorPrimary: 0,
      colorSecondary: 0,
      isSpawned: false
    });

    return { ok: true as const, vehicle, newBalance: faction.balance - item.price };
  }

  async updateVehicleState(factionVehicleId: number, fuelLevel: number, health: number, isLocked: boolean) {
    return this.repository.updateVehicleState(factionVehicleId, fuelLevel, health, isLocked);
  }

  async getClothingCatalog(factionId: number, rankLevel: number, sex: number) {
    const items = await this.repository.getClothingItemsByFactionId(factionId);
    const filtered = items.filter((item) => item.minRank <= rankLevel);
    
    // Enrich with names
    return Promise.all(filtered.map(async (item) => {
      const name = await ClothingLib.getClothingName(sex, item.componentId, item.drawableId);
      return {
        ...item,
        label: name || item.label || `Gegenstand ${item.drawableId}`
      };
    }));
  }

  async toggleFactionService(player: PlayerMp, isEnding: boolean, deps: { accounts: any }) {
    if (isEnding) {
      const civilianCustom = player.getVariable("CIVILIAN_CUSTOMIZATION") as string;
      if (civilianCustom) {
        player.setVariable("IN_FACTION_SERVICE", false);
        player.setVariable("CIVILIAN_CUSTOMIZATION", null);
        return { ok: true as const, message: "Dienst beendet. Zivilkleidung wiederhergestellt.", civilianCustom };
      }
      return { ok: false as const, message: "Du bist nicht im Dienst.", civilianCustom: null };
    } else {
      const accountId = player.getVariable("ACCOUNT_ID");
      const account = await deps.accounts.getById(accountId);
      if (!account) return { ok: false as const, message: "Account nicht gefunden." };

      // Save current as civilian if not already saved
      if (!player.getVariable("CIVILIAN_CUSTOMIZATION")) {
        player.setVariable("CIVILIAN_CUSTOMIZATION", account.customizationJson);
      }
      
      player.setVariable("IN_FACTION_SERVICE", true);
      return { ok: true as const };
    }
  }

  async applyClothingItem(player: PlayerMp, itemId: number) {
    const item = await this.repository.getClothingItemById(itemId);
    if (!item) return { ok: false as const, message: "Gegenstand nicht gefunden.", item: null };

    return { ok: true as const, item };
  }
}
