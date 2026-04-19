import { initializeDatabase, getPool } from "./infrastructure/database.js";
import { registerAuthEvents } from "./features/accounts/auth-events.js";
import { AccountService } from "./features/accounts/account-service.js";
import type { Account } from "./features/accounts/account.js";
import type { SavePlayerStateDto } from "./features/accounts/api/account-dtos.js";
import { parseSavePlayerStateDto } from "./features/accounts/account-dto-parsers.js";
import { SpawnService } from "./features/world/spawn-service.js";
import type { SpawnPointDto } from "./features/world/api/spawn-dtos.js";
import { FactionService } from "./features/factions/faction-service.js";
import { handleFactionAdminCommand, registerFactionCefEvents } from "./features/factions/faction-events.js";
import { AdminService } from "./features/admin/admin-service.js";
import { registerAllAdminCommands } from "./features/admin/admin-commands.js";
import { TicketService } from "./features/tickets/ticket-service.js";
import { PhoneService } from "./features/phone/phone-service.js";
import { registerPhoneEvents } from "./features/phone/phone-events.js";
import { CharacterRepository } from "./features/accounts/character-repository.js";
import { InventoryRepository } from "./features/inventory/inventory-repository.js";
import { ItemTemplateRepository } from "./features/inventory/item-template-repository.js";
import { InventoryService } from "./features/inventory/inventory-service.js";
import { HousingService } from "./features/housing/housing-service.js";
import { HOUSE_HELIPAD_SLOTS, getHouseInteriorDimension, isHelicopterModelHash } from "./features/housing/housing.js";


// Vehicle Consumption & State Sync
setInterval(async () => {
    const allVehicles = mp.vehicles.toArray() as VehicleMp[];
    for (const veh of allVehicles) {
        if (!veh || !mp.vehicles.exists(veh)) continue;

        // Fuel Consumption
        if (veh.engine) {
            let fuel = Number(veh.getVariable("FUEL") ?? 100);
            const fuelType = veh.getVariable("FUEL_TYPE") ?? "petrol";
            
            // Basic consumption: 0.05% per tick for petrol/diesel, 0.03% for electric
            const consumption = fuelType === "electric" ? 0.005 : 0.01;
            fuel = Math.max(0, fuel - consumption);
            veh.setVariable("FUEL", fuel);

            if (fuel <= 0) {
                veh.engine = false;
            }
        }

        // Health Sync
        const currentHealth = veh.bodyHealth || 1000;
        veh.setVariable("HEALTH_PERCENT", currentHealth / 10);

        // Persistent Sync for Faction Vehicles
        const fvId = getFactionVehicleEntityId(veh);
        if (fvId > 0) {
            const fuel = Number(veh.getVariable("FUEL") ?? 100);
            const isLocked = !!veh.locked;
            await factions.updateVehicleState(fvId, fuel, currentHealth, isLocked);
        }
    }
}, 5000); // Sync/Consume every 5 seconds

// General Vehicle Initialization (for non-faction/spawned vehicles)
mp.events.add("entityCreated", (entity: any) => {
    if (entity.type === "vehicle") {
        const veh = entity as VehicleMp;
        if (!veh.getVariable("FUEL_TYPE")) {
            veh.setVariable("FUEL", 100);
            veh.setVariable("FUEL_TYPE", "petrol");
            veh.setVariable("MAX_FUEL", 100);
            veh.setVariable("HEALTH_PERCENT", 100);
            veh.setVariable("IS_LOCKED", false);
            veh.engine = false; // Always OFF on spawn
        }
    }
});

// Engine & Lock Handlers
mp.events.add("server:vehicle:toggleEngine", (player: PlayerMp) => {
    const veh = player.vehicle;
    if (!veh) return;

    const fuel = Number(veh.getVariable("FUEL") ?? 100);
    const health = veh.bodyHealth || 1000;

    if (fuel <= 0 || health <= 0) {
        player.call("client:hud:notify", ["error", "Motor", "Fahrzeug kann nicht gestartet werden (Tank leer oder Motorschaden)!"]);
        veh.engine = false;
        return;
    }

    veh.engine = !veh.engine;
    // Notifications for start/stop removed as requested (silent toggle)
});

mp.events.add("server:vehicle:toggleLock", (player: PlayerMp, vehicleId?: number) => {
    let veh: VehicleMp | null = player.vehicle;
    
    if (!veh && vehicleId) {
        veh = mp.vehicles.at(vehicleId) as VehicleMp;
    } else if (!veh) {
        // Find closest vehicle
        const allVehicles = mp.vehicles.toArray() as VehicleMp[];
        let closest = null;
        let minDist = 5.0;
        for (const v of allVehicles) {
            const d = player.dist(v.position);
            if (d < minDist) {
                minDist = d;
                closest = v;
            }
        }
        veh = closest;
    }

    if (!veh) return;

    // Check permission (Basic Orga check or Owner)
    const fvId = getFactionVehicleEntityId(veh);
    const playerFactionId = player.getVariable("FACTION_ID");

    if (fvId > 0) {
        const vehFactionId = veh.getVariable("FACTION_ID");
        if (vehFactionId !== playerFactionId) {
            player.notify("~r~Du hast keinen Schlüssel für dieses Fraktionsfahrzeug!");
            return;
        }
    }

    veh.locked = !veh.locked;
    veh.setVariable("IS_LOCKED", veh.locked);
    player.notify(veh.locked ? "~w~Fahrzeug ~r~abgeschlossen." : "~w~Fahrzeug ~g~aufgeschlossen.");
    
    // Play sound/animation
    player.playAnimation("anim@mp_player_intmenu@key_fob@", "fob_click", 3, 49);
});

import {
  DEFAULT_SPAWN,
  HIDDEN_LOGIN_POSITION,
  clampMoney,
  emitClient,
  findPlayerById,
  forEachPlayer,
  getArmour,
  getHeading,
  getPlayerName,
  isPlayerVehicleDriver,
  getVar,
  setArmour,
  setHeading,
  setVar,
  vector3
} from "./runtime/helpers.js";

const accounts = new AccountService();
const characterRepository = new CharacterRepository();
const spawns = new SpawnService();
const factions = new FactionService();
const tickets = new TicketService(getPool());
const adminService = new AdminService(getPool());
const phone = new PhoneService();
const pool = getPool();
const inventoryRepo = new InventoryRepository(pool);
const itemTemplateRepo = new ItemTemplateRepository(pool);
export const inventoryService = new InventoryService(inventoryRepo, itemTemplateRepo);
const housing = new HousingService();
const LOCAL_CHAT_RANGE = 20;
const ADMIN_JAIL_POSITION = { x: 1691.14, y: 2565.66, z: 45.56, rotZ: 180, dimension: 1 };
const ADMIN_JAIL_RELEASE_POSITION = { x: 1846.64, y: 2585.86, z: 45.67, rotZ: 90, dimension: 1 };
const adminJailTimers = new Map<number, NodeJS.Timeout>();
const factionVehicleEntities = new Map<number, any>();
const vehicleFactionLookup = new WeakMap<object, number>();
const houseGarageVehicleEntities = new Map<number, any>();
const vehicleHouseGarageLookup = new WeakMap<object, number>();
const KNOWN_FACTION_PERMISSION_KEYS = [
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
  "weapon_rifle",
  "wardrobe_access",
  "wardrobe_category_detective",
  "wardrobe_category_sek",
  "wardrobe_category_tactical"
];

function logInfo(message: string) {
  if (mp.console?.logInfo) {
    mp.console.logInfo(`[unique] ${message}`);
    return;
  }

  console.log(`[unique] ${message}`);
}

function logError(message: string, error: unknown) {
  const formatted = `[unique] ${message}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`;
  if (mp.console?.logError) {
    mp.console.logError(formatted);
    return;
  }

  console.error(formatted);
}

function systemMessage(player: any, message: string) {
  emitClient(player, "client:chat:addMessage", "system", "", message);
}

function adminMessage(player: any, sender: string, message: string) {
  emitClient(player, "client:chat:addMessage", "admin", sender, message);
}

function adminRoleLabel(level: number) {
  return level >= 2 ? "Administrator" : "Assistant";
}

function hasAdminAccess(player: any) {
  return Number(getVar(player, "ADMIN_LEVEL", 0)) >= 1;
}

function isAdminModeEnabled(player: any) {
  return Boolean(getVar(player, "ADMIN_MODE", false));
}

function buildHudTicketPayload(ticketsForHud: Awaited<ReturnType<TicketService["getAdminDashboard"]>>) {
  return JSON.stringify({
    visible: true,
    openCount: ticketsForHud.openCount,
    overflowCount: Math.max(0, ticketsForHud.tickets.length - 5),
    tickets: ticketsForHud.tickets.slice(0, 5).map((ticket) => ({
      ticketId: ticket.ticketId,
      accountId: ticket.accountId,
      accountName: ticket.accountName,
      prefix: ticket.prefix,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      claimedByName: ticket.claimedByName,
      claimReleaseAt:
        ticket.claimedByAccountId
          ? new Date(new Date(ticket.updatedAt || ticket.createdAt).getTime() + 15 * 60 * 1000).toISOString()
          : null,
      lastMessage: ticket.messages[ticket.messages.length - 1]?.message ?? ""
    }))
  });
}

function buildPlayerHudTicketPayload(ticket: Awaited<ReturnType<TicketService["getOpenTicketByAccountId"]>>) {
  if (!ticket) return JSON.stringify({ visible: false, ticket: null });
  return JSON.stringify({ visible: true, ticket });
}

function buildTicketMutePayload(reason: string, expiresAt: string, admin = "Support-Team") {
  return JSON.stringify({
    reason,
    admin,
    expiresAt
  });
}

async function sendPlayerTicketData(player: any) {
  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  if (accountId <= 0) {
    emitClient(player, "client:usermenu:setTickets", JSON.stringify({ allowedPrefixes: tickets.getAllowedPrefixes(), tickets: [] }));
    emitClient(player, "client:tickets:playerHudData", JSON.stringify({ visible: false, ticket: null }));
    return;
  }

  const [dashboard, openTicket] = await Promise.all([
    tickets.getPlayerDashboard(accountId),
    tickets.getOpenTicketByAccountId(accountId)
  ]);

  emitClient(player, "client:usermenu:setTickets", JSON.stringify(dashboard));
  emitClient(player, "client:tickets:playerHudData", buildPlayerHudTicketPayload(openTicket));
}

async function sendAdminTicketData(player: any) {
  if (!hasAdminAccess(player)) {
    emitClient(player, "client:tickets:hudData", JSON.stringify({ visible: false, openCount: 0, tickets: [] }));
    return;
  }

  const dashboard = await tickets.getAdminDashboard();
  emitClient(player, "client:admin:setTickets", JSON.stringify(dashboard));
  emitClient(
    player,
    "client:tickets:hudData",
    isAdminModeEnabled(player) ? buildHudTicketPayload(dashboard) : JSON.stringify({ visible: false, openCount: 0, tickets: [], overflowCount: 0 })
  );
}

function pushTicketPlayerHistory(player: any, accountId: number, history: Awaited<ReturnType<TicketService["getPlayerHistory"]>>) {
  emitClient(player, "client:admin:setTicketPlayerHistory", JSON.stringify({ accountId, tickets: history }));
}

async function pushTicketInsight(player: any, accountId: number) {
  const account = await accounts.getById(accountId);
  const warnings = await tickets.getWarningsByAccountId(accountId);
  emitClient(player, "client:admin:setTicketInsight", JSON.stringify({
    accountId,
    account: account ? {
      accountId: account.accountId,
      name: `${account.firstName} ${account.lastName}`,
      email: account.email,
      adminLevel: account.adminLevel,
      cash: account.cash,
      bankCash: account.bankCash,
      health: account.health,
      armor: account.armor,
      dimension: account.dimension,
      isBanned: account.isBanned,
      banReason: account.banReason,
      banExpiresAt: account.banExpiresAt
    } : null,
    warnings
  }));
}

async function syncTicketState(targetAccountId = 0) {
  const jobs: Promise<unknown>[] = [];

  forEachPlayer((player) => {
    if (hasAdminAccess(player)) {
      jobs.push(sendAdminTicketData(player));
    }

    const playerAccountId = Number(getVar(player, "ACCOUNT_ID", 0));
    if (playerAccountId <= 0) {
      return;
    }

    if (targetAccountId <= 0 || playerAccountId === targetAccountId) {
      jobs.push(sendPlayerTicketData(player));
    }
  });

  await Promise.all(jobs);
}

function rangeMessage(source: any, type: string, sender: string, message: string, range = LOCAL_CHAT_RANGE) {
  forEachPlayer((target) => {
    if (Number(target.dimension ?? 0) !== Number(source.dimension ?? 0)) {
      return;
    }

    const distance = source.dist ? source.dist(target.position) : Math.hypot(
      Number(source.position.x) - Number(target.position.x),
      Number(source.position.y) - Number(target.position.y),
      Number(source.position.z) - Number(target.position.z)
    );

    if (distance <= range) {
      emitClient(target, "client:chat:addMessage", type, sender, message);
    }
  });
}

function chatName(player: any) {
  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  return `${getPlayerName(player)}[${accountId > 0 ? accountId : player.id + 1}]`;
}

function formatSpawn(spawn: SpawnPointDto) {
  return `${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)} | RotZ ${spawn.rotZ.toFixed(2)} | Dimension ${spawn.dimension}`;
}

function isLoggedIn(player: any) {
  return Boolean(getVar(player, "LOGGED_IN", false));
}

function getFactionPermissions(player: any) {
  try {
    const raw = String(getVar(player, "FACTION_PERMISSIONS", "[]"));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  } catch (error) {
    return [];
  }
}

function hasFactionPermission(player: any, permissionKey: string) {
  return getFactionPermissions(player).includes(permissionKey);
}

function getFactionStoragePermission(storageType: string) {
  if (storageType === "armory") {
    return "storage_armory";
  }

  if (storageType === "drugs") {
    return "storage_drugs";
  }

  return "storage_general";
}

function applyClothingToPlayer(player: any, clothing: number[][]) {
  if (!Array.isArray(clothing) || clothing.length < 4) {
    return;
  }

  player.setComponentVariation?.(11, Number(clothing[0]?.[0] ?? 15), Number(clothing[0]?.[1] ?? 0), 0);
  player.setComponentVariation?.(8, Number(clothing[1]?.[0] ?? 15), Number(clothing[1]?.[1] ?? 0), 0);
  player.setComponentVariation?.(4, Number(clothing[2]?.[0] ?? 4), Number(clothing[2]?.[1] ?? 0), 0);
  player.setComponentVariation?.(6, Number(clothing[3]?.[0] ?? 1), Number(clothing[3]?.[1] ?? 0), 0);
}

function getFactionVehicleEntityId(vehicle: any) {
  if (!vehicle) {
    return 0;
  }

  const fromWeakMap = vehicleFactionLookup.get(vehicle);
  if (fromWeakMap) {
    return fromWeakMap;
  }

  return Number(vehicle.getVariable?.("FACTION_VEHICLE_ID") ?? 0);
}

async function spawnFactionVehicleEntity(factionVehicleId: number) {
  const record = await factions.getFactionVehicleById(factionVehicleId);
  if (!record) {
    return;
  }

  const existing = factionVehicleEntities.get(factionVehicleId);
  existing?.destroy?.();

  const hash = mp.joaat(record.modelName);
  if (!hash) {
    logError("spawn faction vehicle failed", `invalid model ${record.modelName}`);
    return;
  }

  const vehicle = mp.vehicles.new(hash, vector3(record.posX, record.posY, record.posZ), {
    heading: record.rotZ,
    color: [record.colorPrimary, record.colorSecondary],
    numberPlate: record.numberPlate,
    dimension: record.dimension
  });

  if (!vehicle) {
    return;
  }

  vehicle.dimension = record.dimension;
  vehicle.setVariable("FACTION_VEHICLE_ID", record.factionVehicleId);
  vehicle.setVariable("FACTION_ID", record.factionId);
  vehicle.setVariable("FACTION_VEHICLE_MIN_RANK", record.minRankLevel);
  vehicle.setVariable("FACTION_VEHICLE_NAME", record.displayName);
  vehicle.setVariable("FUEL", record.fuelLevel ?? 100);
  vehicle.setVariable("FUEL_TYPE", record.fuelType ?? "petrol");
  vehicle.setVariable("MAX_FUEL", 100);
  vehicle.setVariable("HEALTH_PERCENT", (record.health ?? 1000) / 10);
  vehicle.setVariable("IS_LOCKED", record.isLocked ?? false);
  
  vehicle.locked = !!record.isLocked;
  vehicle.engine = false;

  factionVehicleEntities.set(record.factionVehicleId, vehicle);
  vehicleFactionLookup.set(vehicle, record.factionVehicleId);
}

function despawnFactionVehicleEntity(factionVehicleId: number) {
  const vehicle = factionVehicleEntities.get(factionVehicleId);
  if (!vehicle) {
    return;
  }

  factionVehicleEntities.delete(factionVehicleId);
  vehicle.destroy?.();
}

async function respawnAllFactionVehicles() {
  const vehicles = await factions.getAllFactionVehicles();
  for (const vehicle of vehicles) {
    if (vehicle.isSpawned) {
      await spawnFactionVehicleEntity(vehicle.factionVehicleId);
    }
  }
}

function buildOrgMemberList(factionId: number, members: Awaited<ReturnType<FactionService["getMembersByFactionId"]>>, ranks: Awaited<ReturnType<FactionService["getRanks"]>>) {
  return members.map((member) => {
    let onlinePlayer: any = null;
    forEachPlayer((player) => {
      if (Number(getVar(player, "ACCOUNT_ID", 0)) === member.accountId) {
        onlinePlayer = player;
      }
    });

    const rank = ranks.find((entry) => entry.rankLevel === member.rankLevel);
    return {
      accountId: member.accountId,
      rankLevel: member.rankLevel,
      rankName: rank?.rankName ?? `Rang ${member.rankLevel}`,
      joinedAt: member.joinedAt,
      online: Boolean(onlinePlayer),
      playerName: onlinePlayer ? getPlayerName(onlinePlayer) : `Account ${member.accountId}`,
      serverId: onlinePlayer ? onlinePlayer.id + 1 : 0
    };
  });
}

async function openOrgMenu(player: any) {
  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  if (accountId <= 0) {
    return;
  }

  const profile = await factions.getMemberProfile(accountId);
  if (!profile) {
    systemMessage(player, "Du bist in keiner Organisation.");
    return;
  }

  const permissions = await factions.getAccountPermissions(accountId);
  const ranks = await factions.getRanks(profile.factionId);
  const members = await factions.getMembersByFactionId(profile.factionId);
  const vehicles = await factions.getFactionVehicles(profile.factionId);
  const outfits = await factions.getOutfits(profile.factionId);
  const faction = await factions.getById(profile.factionId);
  const wardrobePoints = await factions.getWardrobePoints(profile.factionId);
  const rankPermissionPairs = await Promise.all(
    ranks.map(async (rank) => [rank.rankLevel, (await factions.getRankPermissions(profile.factionId, rank.rankLevel)).map((entry) => entry.permissionKey)] as const)
  );
  const rankPermissions = Object.fromEntries(rankPermissionPairs);
  const dynamicPermissionKeys = [...new Set(Object.values(rankPermissions).flatMap((value) => value))].sort();

  emitClient(player, "client:orga:open", JSON.stringify({
    faction: profile,
    balance: faction?.balance ?? 0,
    permissions: permissions.map((entry) => entry.permissionKey),
    ranks,
    rankPermissions,
    availablePermissions: [...new Set([...KNOWN_FACTION_PERMISSION_KEYS, ...dynamicPermissionKeys])].sort(),
    members: buildOrgMemberList(profile.factionId, members, ranks),
    wardrobePoints,
    outfits: outfits.map((outfit) => ({
      outfitId: outfit.outfitId,
      category: outfit.category,
      name: outfit.name,
      clothing: (() => {
        try {
          const parsed = JSON.parse(outfit.clothingJson);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          return [];
        }
      })()
    })),
    vehicles: vehicles.map((vehicle) => ({
      factionVehicleId: vehicle.factionVehicleId,
      displayName: vehicle.displayName,
      modelName: vehicle.modelName,
      minRankLevel: vehicle.minRankLevel,
      numberPlate: vehicle.numberPlate,
      dimension: vehicle.dimension,
      isSpawned: vehicle.isSpawned
    }))
  }));
}

async function sendAdminFactionData(player: any) {
  const all = await factions.getAll();
  emitClient(player, "client:admin:setFactions", JSON.stringify(all));
}

async function buildFactionMapBlipPayload() {
  const all = await factions.getAll();
  const entries = await Promise.all(
    all.map(async (faction) => {
      const spawn = await factions.getFactionSpawn(faction.factionId);
      if (!spawn) {
        return null;
      }

      if (Number(faction.mapIconId ?? 0) <= 0) {
        return null;
      }

      return {
        factionId: faction.factionId,
        shortName: faction.shortName,
        name: faction.name,
        colorHex: faction.colorHex,
        mapIconId: faction.mapIconId,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        dimension: spawn.dimension
      };
    })
  );

  return JSON.stringify(entries.filter(Boolean));
}

async function syncFactionMapBlipsForPlayer(player: any) {
  emitClient(player, "client:factionMap:setData", await buildFactionMapBlipPayload());
}

async function syncFactionMapBlipsForAll() {
  const payload = await buildFactionMapBlipPayload();
  forEachPlayer((player) => {
    if (isLoggedIn(player)) {
      emitClient(player, "client:factionMap:setData", payload);
    }
  });
}

function canUseWardrobeCategory(player: any, category: string) {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  if (!hasFactionPermission(player, "wardrobe_access")) {
    return false;
  }

  if (!normalizedCategory || normalizedCategory === "dienst") {
    return true;
  }

  return hasFactionPermission(player, `wardrobe_category_${normalizedCategory}`);
}

function canUseWardrobeCategoryByPermissions(permissionKeys: string[], category: string) {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  if (!permissionKeys.includes("wardrobe_access")) {
    return false;
  }

  if (!normalizedCategory || normalizedCategory === "dienst") {
    return true;
  }

  return permissionKeys.includes(`wardrobe_category_${normalizedCategory}`);
}

async function syncWardrobeDataForPlayer(player: any) {
  const factionId = Number(getVar(player, "FACTION_ID", 0));
  if (factionId <= 0) {
    emitClient(player, "client:factionWardrobe:setData", JSON.stringify({ points: [], outfits: [] }));
    return;
  }

  const permissionKeys = getFactionPermissions(player);
  const points = await factions.getWardrobePoints(factionId);
  const outfits = (await factions.getOutfits(factionId)).filter((outfit) => canUseWardrobeCategoryByPermissions(permissionKeys, outfit.category));
  emitClient(player, "client:factionWardrobe:setData", JSON.stringify({ points, outfits }));
}

async function syncHousingDataForPlayer(player: any) {
  if (!player || !isLoggedIn(player)) {
    emitClient(player, "client:housing:setData", JSON.stringify({ houses: [] }));
    return;
  }

  emitClient(player, "client:housing:setData", JSON.stringify(await housing.buildPlayerPayload(player)));
}

async function syncHousingDataForAll() {
  forEachPlayer((player) => {
    if (!isLoggedIn(player)) {
      return;
    }

    void syncHousingDataForPlayer(player).catch((error) => logError("sync housing player failed", error));
  });
}

async function sendAdminHousingData(player: any) {
  emitClient(player, "client:admin:setHousing", JSON.stringify(await housing.buildAdminPayload()));
}

async function refreshAdminHousingDataForAllAdmins() {
  const refreshes: Promise<void>[] = [];
  forEachPlayer((player) => {
    if (!isLoggedIn(player) || !hasAdminLevel(player, 1)) {
      return;
    }

    refreshes.push(sendAdminHousingData(player).catch((error) => logError("refresh admin housing data failed", error)));
  });
  await Promise.all(refreshes);
}

function getPointDistance(player: any, point: { x: number; y: number; z: number }, dimension: number) {
  if (Number(player.dimension ?? 0) !== Number(dimension ?? 0)) {
    return Number.POSITIVE_INFINITY;
  }

  const dx = Number(player.position?.x ?? 0) - Number(point.x ?? 0);
  const dy = Number(player.position?.y ?? 0) - Number(point.y ?? 0);
  const dz = Number(player.position?.z ?? 0) - Number(point.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

async function getHouseByCurrentInterior(player: any) {
  const currentHouseId = Number(getVar(player, "CURRENT_HOUSE_ID", 0));
  if (!Number.isInteger(currentHouseId) || currentHouseId <= 0) {
    return null;
  }

  return housing.getById(currentHouseId);
}

async function findNearbyExteriorHouse(player: any, houseId?: number) {
  const houses = houseId ? [await housing.getById(houseId)].filter(Boolean) : await housing.getAll();
  let nearest: any = null;
  let nearestDistance = 3.4;

  for (const house of houses) {
    if (!house) continue;
    const distance = getPointDistance(player, { x: house.entranceX, y: house.entranceY, z: house.entranceZ }, house.entranceDimension);
    if (distance <= nearestDistance) {
      nearest = house;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function getHouseParkingPoint(house: any, parkingType: "garage" | "helipad") {
  const prefix = parkingType === "helipad" ? "helipad" : "garage";
  const x = house?.[`${prefix}X`];
  const y = house?.[`${prefix}Y`];
  const z = house?.[`${prefix}Z`];
  const rotZ = house?.[`${prefix}RotZ`];

  if (x === null || y === null || z === null || rotZ === null || x === undefined || y === undefined || z === undefined || rotZ === undefined) {
    return null;
  }

  return {
    x: Number(x),
    y: Number(y),
    z: Number(z),
    rotZ: Number(rotZ),
    // Exterior parking should always live in the entrance dimension, even if
    // legacy DB rows still contain an outdated per-point dimension.
    dimension: Number(house?.entranceDimension ?? house?.[`${prefix}Dimension`] ?? 0)
  };
}

function getHouseParkingRange(parkingType: "garage" | "helipad") {
  return parkingType === "helipad" ? 6.75 : 4.75;
}

async function isNearHouseParking(player: any, house: any, parkingType: "garage" | "helipad") {
  const point = getHouseParkingPoint(house, parkingType);
  if (!point) {
    return false;
  }

  return getPointDistance(player, point, point.dimension) <= getHouseParkingRange(parkingType);
}

async function isNearHouseInteriorPoint(player: any, house: any, pointType: "exit" | "storage" | "wardrobe") {
  const interior = housing.getInterior(house);
  if (!interior) {
    return false;
  }

  const point = pointType === "exit"
    ? interior.exitPoint
    : pointType === "storage"
      ? interior.storagePoint
      : interior.wardrobePoint;

  return getPointDistance(player, point, getHouseInteriorDimension(house.houseId)) <= 2.8;
}

function getVehicleHouseGarageEntityId(vehicle: any) {
  if (!vehicle) {
    return 0;
  }

  const fromWeakMap = vehicleHouseGarageLookup.get(vehicle);
  if (fromWeakMap) {
    return fromWeakMap;
  }

  return Number(vehicle.getVariable?.("HOUSE_GARAGE_VEHICLE_ID") ?? 0);
}

async function spawnHouseGarageVehicleEntity(garageVehicleId: number, houseOverride?: any) {
  const record = await housing.getGarageVehicleById(garageVehicleId);
  if (!record) {
    return null;
  }

  const houseRecord = houseOverride ?? await housing.getById(record.houseId);
  if (!houseRecord) {
    return null;
  }

  const existing = houseGarageVehicleEntities.get(garageVehicleId);
  existing?.destroy?.();
  const parkingType = record.parkingType === "helipad" ? "helipad" : "garage";
  const spawnPoint = getHouseParkingPoint(houseRecord, parkingType);
  if (!spawnPoint) {
    return null;
  }

  const vehicle = mp.vehicles.new(Number(record.modelHash), vector3(spawnPoint.x, spawnPoint.y, spawnPoint.z), {
    heading: spawnPoint.rotZ,
    color: [record.colorPrimary, record.colorSecondary],
    numberPlate: record.numberPlate || `HOME${garageVehicleId}`,
    dimension: spawnPoint.dimension
  });

  if (!vehicle) {
    return null;
  }

  vehicle.dimension = spawnPoint.dimension;
  vehicle.locked = !!record.isLocked;
  vehicle.engine = false;
  vehicle.setVariable("HOUSE_GARAGE_VEHICLE_ID", record.garageVehicleId);
  vehicle.setVariable("HOUSE_ID", record.houseId);
  vehicle.setVariable("HOUSE_VEHICLE_STORAGE_TYPE", parkingType);
  vehicle.setVariable("IS_LOCKED", !!record.isLocked);
  vehicle.setVariable("FUEL", record.fuelLevel ?? 100);
  vehicle.setVariable("FUEL_TYPE", "petrol");
  vehicle.setVariable("MAX_FUEL", 100);
  vehicle.setVariable("HEALTH_PERCENT", (record.health ?? 1000) / 10);
  vehicle.setVariable("HOUSE_VEHICLE_NAME", record.displayName);

  houseGarageVehicleEntities.set(record.garageVehicleId, vehicle);
  vehicleHouseGarageLookup.set(vehicle, record.garageVehicleId);
  return vehicle;
}

function despawnHouseGarageVehicleEntity(garageVehicleId: number) {
  const vehicle = houseGarageVehicleEntities.get(garageVehicleId);
  if (!vehicle) {
    return;
  }

  houseGarageVehicleEntities.delete(garageVehicleId);
  vehicle.destroy?.();
}

type HouseParkingConfig = {
  accessEnabled: (house: any) => boolean;
  storedVehicles: (houseId: number) => Promise<any[]>;
  capacity: (house: any) => number;
  driverError: string;
  modelError: string | null;
  factionError: string;
  capacityError: string;
  displayName: (vehicle: any, houseId: number) => string;
  numberPlate: (vehicle: any, houseId: number) => string;
  spawnError: string;
  storeSuccess: (vehicleName: string, house: any) => string;
  spawnSuccess: (vehicleName: string) => string;
};

function getHouseParkingConfig(parkingType: "garage" | "helipad"): HouseParkingConfig {
  return parkingType === "helipad"
    ? {
        accessEnabled: (house: any) => !!house?.hasHelipad,
        storedVehicles: (houseId: number) => housing.getHelipadVehicles(houseId),
        capacity: (_house: any) => HOUSE_HELIPAD_SLOTS,
        driverError: "Du musst als Pilot in einem Helikopter sitzen.",
        modelError: "Auf dem HeliPad koennen nur Helikopter eingeparkt werden.",
        factionError: "Fraktionsfahrzeuge koennen nicht im HeliPad-System eingelagert werden.",
        capacityError: "Das HeliPad ist voll.",
        displayName: (vehicle: any, _houseId: number) => String(
          vehicle.getVariable?.("HOUSE_VEHICLE_NAME")
          ?? vehicle.getVariable?.("FACTION_VEHICLE_NAME")
          ?? vehicle.getNumberPlateText?.()
          ?? "Helikopter"
        ),
        numberPlate: (vehicle: any, houseId: number) => String(vehicle.getNumberPlateText?.() ?? `HELI${houseId}`),
        spawnError: "Helikopter konnte nicht auf dem HeliPad gespawnt werden.",
        storeSuccess: (vehicleName: string, house: any) => `${vehicleName} wurde auf dem HeliPad von ${house.displayName} eingeparkt.`,
        spawnSuccess: (vehicleName: string) => `${vehicleName} wurde auf dem HeliPad bereitgestellt.`
      }
    : {
        accessEnabled: (_house: any) => true,
        storedVehicles: (houseId: number) => housing.getGarageVehicles(houseId),
        capacity: (house: any) => Number(house?.garageSlots ?? 0),
        driverError: "Du musst als Fahrer in einem Fahrzeug sitzen.",
        modelError: null,
        factionError: "Fraktionsfahrzeuge koennen nicht im Hausgarage-System eingelagert werden.",
        capacityError: "Die Garage ist voll.",
        displayName: (vehicle: any, _houseId: number) => String(
          vehicle.getVariable?.("HOUSE_VEHICLE_NAME")
          ?? vehicle.getVariable?.("FACTION_VEHICLE_NAME")
          ?? vehicle.getNumberPlateText?.()
          ?? "Fahrzeug"
        ),
        numberPlate: (vehicle: any, houseId: number) => String(vehicle.getNumberPlateText?.() ?? `HOME${houseId}`),
        spawnError: "Garagefahrzeug konnte nicht ausgeparkt werden.",
        storeSuccess: (vehicleName: string, house: any) => `${vehicleName} wurde in ${house.displayName} eingeparkt.`,
        spawnSuccess: (vehicleName: string) => `${vehicleName} wurde ausgeparkt.`
      };
}

async function parkPlayerVehicleInHouseParking(
  player: any,
  houseId: number,
  accountId: number,
  adminLevel: number,
  parkingType: "garage" | "helipad"
) {
  const houseRecord = await housing.getById(houseId);
  const config = getHouseParkingConfig(parkingType);
  if (!houseRecord || !config.accessEnabled(houseRecord)) {
    return;
  }

  if (!housing.canManageHouse(houseRecord, accountId, adminLevel) || !(await isNearHouseParking(player, houseRecord, parkingType))) {
    return;
  }

  const vehicle = player.vehicle;
  if (!vehicle || !isPlayerVehicleDriver(player, vehicle)) {
    systemMessage(player, config.driverError);
    return;
  }

  if (parkingType === "helipad" && !isHelicopterModelHash(Number(vehicle.model ?? 0))) {
    systemMessage(player, config.modelError!);
    return;
  }

  if (getFactionVehicleEntityId(vehicle) > 0) {
    systemMessage(player, config.factionError);
    return;
  }

  const parkedVehicles = await config.storedVehicles(houseId);
  if (parkedVehicles.length >= config.capacity(houseRecord)) {
    systemMessage(player, config.capacityError);
    return;
  }

  const stored = await housing.createGarageVehicle({
    houseId,
    parkingType,
    modelHash: Number(vehicle.model ?? 0),
    displayName: config.displayName(vehicle, houseId),
    numberPlate: config.numberPlate(vehicle, houseId),
    colorPrimary: Number(vehicle.getColor?.(0) ?? 0),
    colorSecondary: Number(vehicle.getColor?.(1) ?? 0),
    fuelLevel: Number(vehicle.getVariable?.("FUEL") ?? 100),
    health: Number(vehicle.bodyHealth ?? 1000),
    isLocked: !!vehicle.locked
  });

  const transientGarageVehicleId = getVehicleHouseGarageEntityId(vehicle);
  if (transientGarageVehicleId > 0) {
    houseGarageVehicleEntities.delete(transientGarageVehicleId);
    vehicleHouseGarageLookup.delete(vehicle);
  }

  vehicle.destroy?.();
  systemMessage(player, config.storeSuccess(stored.displayName, houseRecord));
  await syncHousingDataForAll();
}

async function spawnStoredHouseParkingVehicle(
  player: any,
  houseId: number,
  garageVehicleId: number,
  accountId: number,
  adminLevel: number,
  parkingType: "garage" | "helipad"
) {
  const houseRecord = await housing.getById(houseId);
  const config = getHouseParkingConfig(parkingType);
  if (!houseRecord || !config.accessEnabled(houseRecord) || !Number.isInteger(garageVehicleId) || garageVehicleId <= 0) {
    return;
  }

  if (!housing.canManageHouse(houseRecord, accountId, adminLevel) || !(await isNearHouseParking(player, houseRecord, parkingType))) {
    return;
  }

  const garageVehicle = await housing.getGarageVehicleById(garageVehicleId);
  if (!garageVehicle || garageVehicle.houseId !== houseId || garageVehicle.parkingType !== parkingType) {
    return;
  }

  const spawned = await spawnHouseGarageVehicleEntity(garageVehicleId, houseRecord);
  if (!spawned) {
    systemMessage(player, config.spawnError);
    return;
  }

  spawned.setVariable("HOUSE_ORIGIN_HOUSE_ID", houseId);
  await housing.deleteGarageVehicle(garageVehicleId);
  systemMessage(player, config.spawnSuccess(garageVehicle.displayName));
  await syncHousingDataForAll();
}

function serializeStoragePayload(player: any, houseRecord: any, storageInventory: any[]) {
  const playerInventory = inventoryService.serializeInventoryForClientPayload(inventoryService.getInventorySnapshot(player));
  const stashInventory = inventoryService.serializeInventoryForClientPayload(storageInventory);

  return JSON.stringify({
    houseId: houseRecord.houseId,
    title: houseRecord.displayName,
    streetName: houseRecord.streetName,
    stars: houseRecord.stars,
    slots: {
      used: stashInventory.length,
      total: houseRecord.storageSlots
    },
    playerInventory,
    storageInventory: stashInventory
  });
}

function buildInventorySignature(item: any) {
  return JSON.stringify({
    key: String(item?.key ?? ""),
    data: item?.data ?? null
  });
}

function moveEntryBetweenInventories(source: any[], target: any[], uid: string, targetCapacity: number) {
  const sourceIndex = source.findIndex((entry) => String(entry?.uid ?? "") === String(uid));
  if (sourceIndex === -1) {
    return { ok: false as const, reason: "not_found" };
  }

  const [entry] = source.splice(sourceIndex, 1);
  const mergeTargetIndex = target.findIndex((candidate) => buildInventorySignature(candidate) === buildInventorySignature(entry));

  if (mergeTargetIndex >= 0) {
    target[mergeTargetIndex].amount = Number(target[mergeTargetIndex].amount ?? 0) + Number(entry.amount ?? 0);
    return { ok: true as const, merged: true };
  }

  if (target.length >= targetCapacity) {
    source.splice(sourceIndex, 0, entry);
    return { ok: false as const, reason: "capacity" };
  }

  target.push(entry);
  return { ok: true as const, merged: false };
}

function hasAdminLevel(player: any, level = 1) {
  return Number(getVar(player, "ADMIN_LEVEL", 0)) >= level;
}

function setPlayerMoney(player: any, key: "CASH" | "BANK_CASH", amount: number) {
  setVar(player, key, clampMoney(amount));
}

function findPlayerByAnyId(rawId: string | number) {
  const parsedId = Number(rawId);
  if (!Number.isInteger(parsedId)) {
    return null;
  }

  const exactTarget = findPlayerById(parsedId);
  if (exactTarget) {
    return exactTarget;
  }

  const plusOneTarget = findPlayerById(parsedId - 1);
  if (plusOneTarget) {
    return plusOneTarget;
  }

  let accountTarget: any = null;
  forEachPlayer((player) => {
    if (Number(getVar(player, "ACCOUNT_ID", 0)) === parsedId) {
      accountTarget = player;
    }
  });

  return accountTarget;
}

function findOnlinePlayerByAccountId(accountId: number) {
  let found: any = null;
  forEachPlayer((player) => {
    if (Number(getVar(player, "ACCOUNT_ID", 0)) === accountId) {
      found = player;
    }
  });
  return found;
}

function isKnownFactionPermissionKey(permissionKey: string) {
  return KNOWN_FACTION_PERMISSION_KEYS.includes(permissionKey) || permissionKey.startsWith("wardrobe_category_");
}

async function syncFactionStateForOnlineAccount(accountId: number) {
  const onlineTarget = findOnlinePlayerByAccountId(accountId);
  if (!onlineTarget) {
    return;
  }

  const profile = await factions.getMemberProfile(accountId);
  const permissionKeys = (await factions.getAccountPermissions(accountId)).map((permission) => permission.permissionKey);
  setVar(onlineTarget, "FACTION_ID", profile?.factionId ?? 0);
  setVar(onlineTarget, "FACTION_NAME", profile?.factionName ?? "");
  setVar(onlineTarget, "FACTION_SHORT_NAME", profile?.factionShortName ?? "");
  setVar(onlineTarget, "FACTION_TYPE", profile?.factionType ?? "");
  setVar(onlineTarget, "FACTION_RANK", profile?.rankLevel ?? 0);
  setVar(onlineTarget, "FACTION_RANK_NAME", profile?.rankName ?? "");
  setVar(onlineTarget, "FACTION_PERMISSIONS", JSON.stringify(permissionKeys));
  await syncWardrobeDataForPlayer(onlineTarget);
}

async function syncFactionStateForOnlineMembers(factionId: number) {
  const members = await factions.getMembersByFactionId(factionId);
  for (const member of members) {
    await syncFactionStateForOnlineAccount(member.accountId);
  }
}

function parseDurationToken(token?: string | null) {
  const value = String(token ?? "").trim().toLowerCase();
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return amount > 0 ? amount * unitMs : null;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function buildBanPayload(account: Account) {
  return JSON.stringify({
    reason: account.banReason ?? "Kein Grund angegeben.",
    bannedAt: account.banDate,
    expiresAt: account.banExpiresAt,
    adminName: account.banAdminName,
    adminAccountId: account.banAdminAccountId
  });
}

function buildJailPayload(reason: string, releaseAt: number) {
  return JSON.stringify({
    reason,
    releaseAt: new Date(releaseAt).toISOString()
  });
}

function notifyAdmins(message: string) {
  forEachPlayer((player) => {
    if (hasAdminLevel(player, 1)) {
      adminMessage(player, "ADMIN", message);
    }
  });
}

function clearAdminJailTimer(playerId: number) {
  const timer = adminJailTimers.get(playerId);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  adminJailTimers.delete(playerId);
}

function releasePlayerFromJail(target: any, message: string) {
  clearAdminJailTimer(target.id);
  setVar(target, "ADMIN_JAILED", false);
  setVar(target, "ADMIN_JAIL_RELEASE_AT", 0);
  target.dimension = ADMIN_JAIL_RELEASE_POSITION.dimension;
  target.position = vector3(ADMIN_JAIL_RELEASE_POSITION.x, ADMIN_JAIL_RELEASE_POSITION.y, ADMIN_JAIL_RELEASE_POSITION.z);
  setHeading(target, ADMIN_JAIL_RELEASE_POSITION.rotZ);
  emitClient(target, "client:adminJail:hide", message);
  systemMessage(target, message);
}

function jailPlayer(target: any, durationMs: number, reason: string) {
  clearAdminJailTimer(target.id);

  const releaseAt = Date.now() + durationMs;
  setVar(target, "ADMIN_JAILED", true);
  setVar(target, "ADMIN_JAIL_RELEASE_AT", releaseAt);
  target.dimension = ADMIN_JAIL_POSITION.dimension;
  target.position = vector3(ADMIN_JAIL_POSITION.x, ADMIN_JAIL_POSITION.y, ADMIN_JAIL_POSITION.z);
  setHeading(target, ADMIN_JAIL_POSITION.rotZ);
  emitClient(target, "client:adminJail:show", buildJailPayload(reason, releaseAt));
  systemMessage(target, `Du wurdest fuer ${formatDuration(durationMs)} eingesperrt. Grund: ${reason}`);

  adminJailTimers.set(target.id, setTimeout(() => {
    releasePlayerFromJail(target, "Du wurdest aus dem Admin-Knast entlassen.");
  }, durationMs));
}

async function savePlayerPosition(player: any) {
  if (!player || !isLoggedIn(player)) {
    return;
  }

  if (Boolean(getVar(player, "PENDING_SPAWN_SELECTION", false)) || Boolean(getVar(player, "ADMIN_JAILED", false))) {
    return;
  }

  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  if (accountId <= 0) {
    return;
  }

  const activeHouse = await getHouseByCurrentInterior(player);
  const positionSource = activeHouse
    ? {
        posX: activeHouse.entranceX,
        posY: activeHouse.entranceY,
        posZ: activeHouse.entranceZ,
        rotZ: activeHouse.entranceRotZ,
        dimension: activeHouse.entranceDimension
      }
    : {
        posX: player.position.x,
        posY: player.position.y,
        posZ: player.position.z,
        rotZ: getHeading(player),
        dimension: player.dimension ?? 0
      };

  const dto: SavePlayerStateDto = parseSavePlayerStateDto({
    posX: positionSource.posX,
    posY: positionSource.posY,
    posZ: positionSource.posZ,
    rotZ: positionSource.rotZ,
    dimension: positionSource.dimension,
    health: player.health ?? 100,
    armor: getArmour(player),
    cash: getVar(player, "CASH", 0),
    bankCash: getVar(player, "BANK_CASH", 0)
  });

  const characterId = Number(getVar(player, "CHARACTER_ID", 0));
  if (characterId > 0) {
    await characterRepository.updateState(characterId, dto as any);
  }
  await accounts.savePlayerState(accountId, dto);
}

async function handleAdminCommand(player: any, command: string, parts: string[], args: string) {
  if (!hasAdminLevel(player, 1)) {
    return true;
  }

  const ensureLevel = (level: number) => {
    if (!hasAdminLevel(player, level)) {
      systemMessage(player, `Dafuer benoetigst du Admin-Level ${level}.`);
      return false;
    }

    return true;
  };

  const findTarget = (usage: string) => {
    const target = findPlayerByAnyId(parts[1]);
    if (!target) {
      systemMessage(player, Number.isInteger(Number(parts[1])) ? "Spieler nicht gefunden." : `Nutze: ${usage}`);
      return null;
    }

    return target;
  };

  switch (command) {
    case "admin":
      setVar(player, "ADMIN_MODE", !Boolean(getVar(player, "ADMIN_MODE", false)));
      systemMessage(player, `Admin-Modus: ${getVar(player, "ADMIN_MODE", false) ? "aktiv" : "inaktiv"}`);
      return true;

    case "myadmin":
      systemMessage(player, `Admin-Level: ${getVar(player, "ADMIN_LEVEL", 0)} | Modus: ${getVar(player, "ADMIN_MODE", false) ? "aktiv" : "inaktiv"}`);
      return true;

    case "msg":
      if (!ensureLevel(2)) {
        return true;
      }

      if (!args.trim()) {
        systemMessage(player, "Nutze: /msg [nachricht]");
        return true;
      }

      forEachPlayer((target) => adminMessage(target, getPlayerName(player), args.trim()));
      return true;

    case "dl":
      if (!ensureLevel(2)) {
        return true;
      }

      emitClient(player, "client:dl:toggle");
      return true;

    case "veh": {
      if (!ensureLevel(1)) {
        return true;
      }

      const model = parts[1] ?? "adder";
      const hash = mp.joaat(model);
      if (!hash) {
        systemMessage(player, "Ungueltiges Fahrzeugmodell.");
        return true;
      }

      const vehicle = mp.vehicles.new(hash, vector3(player.position.x + 2, player.position.y, player.position.z), {
        heading: getHeading(player),
        color: [111, 111],
        numberPlate: "ADMIN"
      });

      if (vehicle) {
        player.putIntoVehicle?.(vehicle, -1);
        systemMessage(player, `Fahrzeug gespawnt: ${model}`);
      }

      return true;
    }

    case "setadmin": {
      const accountId = Number(parts[1]);
      const adminLevel = Number(parts[2]);
      if (!Number.isInteger(accountId) || !Number.isInteger(adminLevel)) {
        systemMessage(player, "Nutze: /setadmin [accountId] [level]");
        return true;
      }

      const account = await accounts.setAdminLevel(accountId, adminLevel);
      if (!account) {
        systemMessage(player, "Admin-Level konnte nicht gesetzt werden.");
        return true;
      }

      systemMessage(player, `Admin-Level gesetzt: ${account.firstName} ${account.lastName} (${account.email}) -> ${adminLevel}`);
      return true;
    }

    case "findaccountsc": {
      if (!ensureLevel(2)) {
        return true;
      }

      const account = await accounts.getBySocialClubId(args.trim());
      if (!account) {
        systemMessage(player, "Kein Account mit dieser Social-Club-ID gefunden.");
        return true;
      }

      systemMessage(player, `Gefunden: ID ${account.accountId} | ${account.firstName} ${account.lastName} | ${account.email} | Admin ${account.adminLevel}`);
      return true;
    }

    case "goto": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/goto [spielerId]");
      if (!target) {
        return true;
      }

      player.dimension = target.dimension;
      player.position = vector3(target.position.x + 1.5, target.position.y, target.position.z);
      systemMessage(player, `Teleportiert zu ${getPlayerName(target)}`);
      return true;
    }

    case "gethere": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/gethere [spielerId]");
      if (!target) {
        return true;
      }

      target.dimension = player.dimension;
      target.position = vector3(player.position.x + 1.5, player.position.y, player.position.z);
      systemMessage(player, `Spieler geholt: ${getPlayerName(target)}`);
      systemMessage(target, "Du wurdest von einem Admin teleportiert.");
      return true;
    }

    case "aheal":
    case "revive": {
      const target = parts[1] ? findTarget(`/${command} [spielerId]`) : player;
      if (!target) {
        return true;
      }

      target.health = 100;
      setArmour(target, command === "aheal" ? 100 : 0);
      systemMessage(player, target === player ? (command === "aheal" ? "Du hast dich voll geheilt." : "Du hast dich revived.") : `Spieler aktualisiert: ${getPlayerName(target)}`);
      if (target !== player) {
        systemMessage(target, command === "aheal" ? "Du wurdest von einem Admin geheilt." : "Du wurdest von einem Admin revived.");
      }
      return true;
    }

    case "apos": {
      if (parts.length === 5) {
        player.position = vector3(Number(parts[1]), Number(parts[2]), Number(parts[3]));
        setHeading(player, Number(parts[4]));
        systemMessage(player, "Position gesetzt.");
        return true;
      }

      systemMessage(player, `Pos: ${Number(player.position.x).toFixed(2)}, ${Number(player.position.y).toFixed(2)}, ${Number(player.position.z).toFixed(2)} | RotZ: ${getHeading(player).toFixed(2)}`);
      return true;
    }

    case "setserverspawn": {
      if (!ensureLevel(10)) {
        return true;
      }

      const spawn = await spawns.saveFromPlayer(player);
      systemMessage(player, `Server-Spawn gesetzt: ${formatSpawn(spawn)}`);
      return true;
    }

    case "serverspawn":
      systemMessage(player, `Server-Spawn: ${formatSpawn(await spawns.getSpawn())}`);
      return true;

    case "gotospawn":
      if (!ensureLevel(2)) {
        return true;
      }

      await spawns.apply(player);
      systemMessage(player, "Zum Server-Spawn teleportiert.");
      return true;

    case "setmoney":
    case "setbank":
    case "addmoney":
    case "addbank": {
      if (!ensureLevel(3)) {
        return true;
      }

      const bank = command.includes("bank");
      const target = findTarget(`/${command} [spielerId] [betrag]`);
      if (!target) {
        return true;
      }

      const accountId = Number(getVar(target, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        systemMessage(player, "Zielspieler ist nicht eingeloggt.");
        return true;
      }

      const delta = Number(parts[2]);
      if (!Number.isFinite(delta)) {
        systemMessage(player, `Nutze: /${command} [spielerId] [betrag]`);
        return true;
      }

      const current = Number(getVar(target, bank ? "BANK_CASH" : "CASH", 0));
      const next = command.startsWith("add") ? current + delta : delta;
      const saved = bank
        ? await accounts.setBankCash(accountId, next)
        : await accounts.setCash(accountId, next);

      if (!saved) {
        systemMessage(player, "Geld konnte nicht gespeichert werden.");
        return true;
      }

      setPlayerMoney(target, bank ? "BANK_CASH" : "CASH", bank ? saved.bankCash : saved.cash);
      systemMessage(player, `${bank ? "Bankgeld" : "Bargeld"} gesetzt: ${getPlayerName(target)} -> $${(bank ? saved.bankCash : saved.cash).toLocaleString("en-US")}`);
      systemMessage(target, `${bank ? "Bankgeld" : "Bargeld"} aktualisiert.`);
      return true;
    }

    case "kick": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/kick [spielerId] [grund]");
      if (!target) {
        return true;
      }

      const reason = args.replace(parts[1] ?? "", "").trim() || "Kein Grund angegeben.";
      systemMessage(player, `Spieler gekickt: ${getPlayerName(target)} | ${reason}`);
      target.kick?.(reason);
      return true;
    }

    case "jail": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/jail [spielerId] [dauer:30s/10m/1h] [grund]");
      if (!target) {
        return true;
      }

      const durationMs = parseDurationToken(parts[2]);
      if (!durationMs) {
        systemMessage(player, "Nutze: /jail [spielerId] [dauer:30s/10m/1h] [grund]");
        return true;
      }

      const reason = parts.slice(3).join(" ").trim() || "Kein Grund angegeben.";
      jailPlayer(target, durationMs, reason);
      notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} fuer ${formatDuration(durationMs)} eingesperrt. Grund: ${reason}`);
      return true;
    }

    case "unjail": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/unjail [spielerId]");
      if (!target) {
        return true;
      }

      if (!Boolean(getVar(target, "ADMIN_JAILED", false))) {
        systemMessage(player, "Spieler ist nicht im Admin-Knast.");
        return true;
      }

      releasePlayerFromJail(target, "Du wurdest von einem Admin aus dem Knast entlassen.");
      notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} aus dem Admin-Knast entlassen.`);
      return true;
    }

    case "ban": {
      if (!ensureLevel(4)) {
        return true;
      }

      const target = findTarget("/ban [spielerId] [dauer?] [grund]");
      if (!target) {
        return true;
      }

      const accountId = Number(getVar(target, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        systemMessage(player, "Zielspieler ist nicht eingeloggt.");
        return true;
      }

      const durationMs = parseDurationToken(parts[2]);
      const reason = (durationMs ? parts.slice(3) : parts.slice(2)).join(" ").trim() || "Kein Grund angegeben.";
      const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
      const adminAccountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const saved = await accounts.setBanState(accountId, true, reason, expiresAt?.toISOString?.() ?? null, getPlayerName(player), adminAccountId);
      if (!saved) {
        systemMessage(player, "Ban konnte nicht gespeichert werden.");
        return true;
      }

      const publicMessage = durationMs
        ? `${getPlayerName(target)} wurde fuer ${formatDuration(durationMs)} gebannt. Grund: ${reason}`
        : `${getPlayerName(target)} wurde permanent gebannt. Grund: ${reason}`;

      notifyAdmins(`${getPlayerName(player)} hat ${publicMessage}`);
      systemMessage(player, `Ban gesetzt: ${publicMessage}`);
      setVar(target, "BANNED_SCREEN_ACTIVE", true);
      emitClient(target, "client:auth:banned", buildBanPayload(saved));
      return true;
    }

    case "unban": {
      const accountId = Number(parts[1]);
      if (!Number.isInteger(accountId)) {
        systemMessage(player, "Nutze: /unban [accountId]");
        return true;
      }

      const account = await accounts.getById(accountId);
      if (!account || !account.isBanned) {
        systemMessage(player, "Account nicht gefunden oder nicht gebannt.");
        return true;
      }

      const requiresLevel = account.banExpiresAt ? 4 : 7;
      if (!ensureLevel(requiresLevel)) {
        return true;
      }

      const saved = await accounts.setBanState(accountId, false, null);
      if (!saved) {
        systemMessage(player, "Unban konnte nicht gespeichert werden.");
        return true;
      }

      const onlineTarget = findOnlinePlayerByAccountId(accountId);
      if (onlineTarget) {
        setVar(onlineTarget, "BANNED_SCREEN_ACTIVE", false);
      }

      notifyAdmins(`${getPlayerName(player)} hat Account ${accountId} entbannt.`);
      systemMessage(player, `Account entbannt: ${accountId}`);
      return true;
    }

    default:
      return handleFactionAdminCommand(player, command, parts, args, {
        factions,
        logError,
        systemMessage,
        hasAdminLevel,
        getVar,
        spawnFactionVehicle: spawnFactionVehicleEntity,
        despawnFactionVehicle: despawnFactionVehicleEntity,
        syncOnlineFactionMember: syncFactionStateForOnlineAccount,
        syncFactionMapBlips: syncFactionMapBlipsForAll
      });
  }
}

async function onChatSend(player: any, mode: string, text: string) {
  if (!player || !isLoggedIn(player) || !text?.trim()) {
    return;
  }

  if (Boolean(getVar(player, "PENDING_SPAWN_SELECTION", false))) {
    systemMessage(player, "Waehle erst einen Spawnpunkt.");
    return;
  }

  const trimmed = text.trim();
  const chatMode = (mode ?? "ic").trim().toLowerCase();
  const parts = trimmed.startsWith("/") ? trimmed.slice(1).split(/\s+/).filter(Boolean) : [];
  const command = parts[0]?.toLowerCase() ?? "";
  const args = parts.length > 1 ? parts.slice(1).join(" ") : "";

  if (trimmed.startsWith("/")) {
    const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
    if (await adminService.execute(player, trimmed, adminLevel)) {
      return;
    }

    switch (command) {
      case "b":
        if (!args) {
          systemMessage(player, "Nutze: /b [text]");
          return;
        }
        rangeMessage(player, "ooc", chatName(player), args);
        return;
      case "me":
      case "do":
        if (!args) {
          systemMessage(player, `Nutze: /${command} [text]`);
          return;
        }
        rangeMessage(player, command, chatName(player), args);
        return;
      case "try":
        if (!args) {
          systemMessage(player, "Nutze: /try [aktion]");
          return;
        }
        rangeMessage(player, "try", chatName(player), `${args} ${Math.random() < 0.5 ? "(Erfolg)" : "(Fehlschlag)"}`);
        return;
      case "id":
        systemMessage(player, `Spieler-ID: ${player.id} | Server-ID: ${player.id + 1} | Account-ID: ${getVar(player, "ACCOUNT_ID", 0)}`);
        return;
      default:
        systemMessage(player, `Unbekannter Befehl: /${command}`);
        return;
    }
  }

  rangeMessage(player, chatMode === "ic" ? "ic" : chatMode, chatName(player), trimmed);
}

async function bootstrap() {
  await initializeDatabase();
  await inventoryService.loadTemplates();
  
  // Initialize Admin System
  registerAllAdminCommands(adminService, {
    accounts, spawns, factions, housing,
    systemMessage, forEachPlayer, adminMessage,
    getPlayerName, getHeading, getVar, setVar,
    emitClient, findPlayerByAnyId, notifyAdmins,
    parseDurationToken, formatDuration, findOnlinePlayerByAccountId,
    jailPlayer, releasePlayerFromJail, setArmour, formatSpawn,
    spawnFactionVehicle: spawnFactionVehicleEntity,
    syncOnlineFactionMember: syncFactionStateForOnlineAccount,
    syncFactionMapBlips: syncFactionMapBlipsForAll,
    syncHousingDataForAll,
    refreshAdminHousingDataForAllAdmins,
    despawnHouseGarageVehicle: despawnHouseGarageVehicleEntity
  });
  await adminService.syncPermissions();

  mp.events.add("playerJoin", (player: any) => {
    player.dimension = 1000 + player.id;
    player.position = vector3(HIDDEN_LOGIN_POSITION.x, HIDDEN_LOGIN_POSITION.y, HIDDEN_LOGIN_POSITION.z);
    setHeading(player, 180);
    player.alpha = 0;
    setVar(player, "LOGGED_IN", false);
    setVar(player, "ACCOUNT_ID", 0);
    setVar(player, "ADMIN_LEVEL", 0);
    setVar(player, "ADMIN_MODE", false);
    setVar(player, "PENDING_SPAWN_SELECTION", false);
    setVar(player, "PENDING_CHARACTER_CREATION", false);
    setVar(player, "BANNED_SCREEN_ACTIVE", false);
    setVar(player, "ADMIN_JAILED", false);
    setVar(player, "ADMIN_JAIL_RELEASE_AT", 0);
    setVar(player, "CASH", 0);
    setVar(player, "BANK_CASH", 0);
    setVar(player, "PHONE_NUMBER", "");
    setVar(player, "FACTION_ID", 0);
    setVar(player, "FACTION_NAME", "");
    setVar(player, "FACTION_SHORT_NAME", "");
    setVar(player, "FACTION_TYPE", "");
    setVar(player, "FACTION_RANK", 0);
    setVar(player, "FACTION_RANK_NAME", "");
    setVar(player, "FACTION_PERMISSIONS", "[]");
    setVar(player, "CURRENT_HOUSE_ID", 0);
    setVar(player, "HOUSE_STORAGE_OPEN", false);
    setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
  });

  mp.events.add("playerQuit", (player: any) => {
    clearAdminJailTimer(player.id);
    void savePlayerPosition(player).catch((error) => logError("playerQuit save failed", error));
  });

  setInterval(() => {
    mp.players.forEach((player: any) => {
      void savePlayerPosition(player).catch((error) => logError("autosave position failed", error));
    });
  }, 3 * 60 * 1000);

  registerAuthEvents({
    accounts,
    characterRepository,
    spawns,
    factions,
    phoneService: phone,
    inventory: inventoryService,
    logError,
    systemMessage,
    syncFactionMapBlips: syncFactionMapBlipsForPlayer,
    syncHousing: syncHousingDataForPlayer
  });
  registerPhoneEvents(phone);
  registerFactionCefEvents({
    factions,
    logError,
    systemMessage,
    getVar,
    hasAdminLevel,
    spawnFactionVehicle: spawnFactionVehicleEntity,
    despawnFactionVehicle: despawnFactionVehicleEntity,
    syncOnlineFactionMember: syncFactionStateForOnlineAccount,
    syncFactionMapBlips: syncFactionMapBlipsForAll
  });

  mp.events.add("server:orga:open", (player: any) => {
    void openOrgMenu(player).catch((error) => logError("open org menu failed", error));
  });

  mp.events.add("server:usermenu:open", (player: any) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) return;

      const profile = await factions.getMemberProfile(accountId);

      emitClient(player, "client:usermenu:open", JSON.stringify({
        playerName: getPlayerName(player),
        accountId,
        adminLevel: Number(getVar(player, "ADMIN_LEVEL", 0)),
        factionName: profile?.factionName ?? null,
        factionRankName: profile?.rankName ?? null,
        // Platzhalter – noch nicht implementiert
        money: Number(getVar(player, "CASH", 0)),
        bankMoney: Number(getVar(player, "BANK_CASH", 0)),
        dirtyMoney: 0,
        phoneNumber: String(getVar(player, "PHONE_NUMBER", "")) || null,
        playTime: 0,
        job: null,
        generalRecord: 0
      }));
    })().catch((error) => logError("open usermenu failed", error));
  });

  mp.events.add("server:admin:requestFactionData", (player: any) => {
    void (async () => {
      if (!hasAdminLevel(player, 1)) {
        return;
      }

      await sendAdminFactionData(player);
    })().catch((error) => logError("admin request faction data failed", error));
  });

  mp.events.add("server:admin:requestHousingData", (player: any) => {
    void (async () => {
      if (!hasAdminLevel(player, 1)) {
        return;
      }

      await sendAdminHousingData(player);
    })().catch((error) => logError("admin request housing data failed", error));
  });

  mp.events.add("server:hud:updateLocation", (player: any, rawZoneName: unknown, rawStreetName: unknown, rawCrossingName: unknown) => {
    const normalizeLocationLabel = (value: unknown, fallback = "") => String(value ?? "").trim().slice(0, 64) || fallback;
    setVar(player, "CURRENT_ZONE_NAME", normalizeLocationLabel(rawZoneName, "San Andreas"));
    setVar(player, "CURRENT_STREET_NAME", normalizeLocationLabel(rawStreetName));
    setVar(player, "CURRENT_CROSSING_NAME", normalizeLocationLabel(rawCrossingName));
  });

  mp.events.add("server:admin:getCommandList", (player: any) => {
    void (async () => {
        const level = Number(getVar(player, "ADMIN_LEVEL", 0));
        if (level < 1) return;
        const commands = await adminService.getAllCommands();
        emitClient(player, "client:admin:receiveCommands", JSON.stringify(commands));
    })().catch(err => logError("getCommandList failed", err));
  });

  mp.events.add("server:admin:updateCommandLevel", (player: any, commandId: string, level: number) => {
    void (async () => {
        const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
        if (adminLevel < 10) return systemMessage(player, "Nur fuer Level 10 Admins.");
        
        const success = await adminService.setCommandLevel(Number(getVar(player, "ACCOUNT_ID", 0)), commandId, level);
        if (success) {
            systemMessage(player, `Befehl ${commandId} auf Level ${level} gesetzt.`);
            // Refresh for all admins might be overkill, let's just refresh for the requester
            const commands = await adminService.getAllCommands();
            emitClient(player, "client:admin:receiveCommands", JSON.stringify(commands));
        }
    })().catch(err => logError("updateCommandLevel failed", err));
  });

  mp.events.add("server:admin:requestLogs", (player: any) => {
    void (async () => {
        if (!hasAdminLevel(player, 5)) return;
        const logs = await adminService.getCommandLogs();
        emitClient(player, "client:admin:receiveLogs", JSON.stringify(logs));
    })().catch(err => logError("requestLogs failed", err));
  });

  mp.events.add("server:admin:createHouse", (
    player: any,
    rawDisplayName: unknown,
    rawInteriorOrStreet: unknown,
    rawInteriorKeyOrPrice: unknown,
    rawPriceOrHasGarden?: unknown,
    rawHasGardenOrHelipad?: unknown,
    rawHasHelipad?: unknown
  ) => {
    void (async () => {
      if (!hasAdminLevel(player, 5)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 5.");
        return;
      }

      let interiorKey = String(rawInteriorOrStreet ?? "").trim();
      let price = Number(rawInteriorKeyOrPrice);
      let hasGarden = false;
      let hasHelipad = false;

      if (rawHasHelipad !== undefined) {
        interiorKey = String(rawInteriorKeyOrPrice ?? "").trim();
        price = Number(rawPriceOrHasGarden);
        hasGarden = Boolean(rawHasGardenOrHelipad);
        hasHelipad = Boolean(rawHasHelipad);
      } else if (typeof rawHasGardenOrHelipad === "boolean") {
        interiorKey = String(rawInteriorOrStreet ?? "").trim();
        price = Number(rawInteriorKeyOrPrice);
        hasGarden = Boolean(rawPriceOrHasGarden);
        hasHelipad = rawHasGardenOrHelipad;
      } else if (typeof rawPriceOrHasGarden === "boolean") {
        interiorKey = String(rawInteriorOrStreet ?? "").trim();
        price = Number(rawInteriorKeyOrPrice);
        hasGarden = rawPriceOrHasGarden;
      } else if (rawHasGardenOrHelipad !== undefined) {
        interiorKey = String(rawInteriorKeyOrPrice ?? "").trim();
        price = Number(rawPriceOrHasGarden);
        hasGarden = Boolean(rawHasGardenOrHelipad);
      } else if (rawPriceOrHasGarden !== undefined) {
        interiorKey = String(rawInteriorKeyOrPrice ?? "").trim();
        price = Number(rawPriceOrHasGarden);
      }

      const result = await housing.createHouseFromPlayer(player, {
        displayName: String(rawDisplayName ?? "").trim(),
        interiorKey,
        price,
        hasGarden,
        hasHelipad,
        createdByAccountId: Number(getVar(player, "ACCOUNT_ID", 0)) || null
      });

      if (!result.ok) {
        systemMessage(player, "Interior-Vorlage wurde nicht gefunden.");
        return;
      }

      systemMessage(
        player,
        `Haus erstellt: #${result.house.houseId} ${result.house.displayName} (${result.template.tierLabel}, $${result.house.price.toLocaleString("de-DE")}, ${result.house.streetName})`
      );
      await refreshAdminHousingDataForAllAdmins();
      await syncHousingDataForAll();
    })().catch((error) => {
      logError("admin create house failed", error);
      systemMessage(player, "Haus konnte nicht erstellt werden.");
    });
  });

  mp.events.add("server:admin:deleteHouse", (player: any, rawHouseId: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 10)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 10.");
        return;
      }

      const houseId = Number(rawHouseId);
      if (!Number.isInteger(houseId) || houseId <= 0) {
        return;
      }

      const houseRecord = await housing.getById(houseId);
      if (!houseRecord) {
        systemMessage(player, "Haus nicht gefunden.");
        return;
      }

      const parkedVehicles = await housing.getStoredVehicles(houseId);
      for (const parkedVehicle of parkedVehicles) {
        despawnHouseGarageVehicleEntity(parkedVehicle.garageVehicleId);
      }
      const activeHouseVehicles = ((mp as any).vehicles?.toArray?.() ?? []) as any[];
      activeHouseVehicles.forEach((vehicle: any) => {
        if (Number(vehicle.getVariable?.("HOUSE_ORIGIN_HOUSE_ID") ?? 0) === houseId) {
          vehicle.destroy?.();
        }
      });

      const deleted = await housing.deleteHouse(houseId);
      if (!deleted) {
        systemMessage(player, "Haus konnte nicht geloescht werden.");
        return;
      }

      forEachPlayer((target) => {
        if (Number(getVar(target, "CURRENT_HOUSE_ID", 0)) !== houseId) {
          return;
        }

        target.dimension = houseRecord.entranceDimension;
        target.position = vector3(houseRecord.entranceX, houseRecord.entranceY, houseRecord.entranceZ);
        setHeading(target, houseRecord.entranceRotZ);
        setVar(target, "CURRENT_HOUSE_ID", 0);
        setVar(target, "HOUSE_STORAGE_OPEN", false);
        setVar(target, "OPEN_HOUSE_STORAGE_ID", 0);
        emitClient(target, "client:housingStorage:hide");
        emitClient(target, "client:housing:forceCloseWardrobe");
        systemMessage(target, "Dein aktuelles Haus wurde entfernt. Du wurdest nach draussen gesetzt.");
      });

      systemMessage(player, `Haus #${houseId} wurde geloescht.`);
      await refreshAdminHousingDataForAllAdmins();
      await syncHousingDataForAll();
    })().catch((error) => {
      logError("admin delete house failed", error);
      systemMessage(player, "Haus konnte nicht geloescht werden.");
    });
  });

  mp.events.add("server:admin:createFaction", (player: any, type: unknown, shortName: unknown, name: unknown, colorHex: unknown, mapIconId: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 10)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 10.");
        return;
      }

      const parsedMapIconId = Number(mapIconId);
      if (!Number.isInteger(parsedMapIconId) || parsedMapIconId < 0 || parsedMapIconId > 999) {
        systemMessage(player, "Map-Icon muss 0 oder zwischen 1 und 999 liegen.");
        return;
      }

      const faction = await factions.create({
        type: String(type ?? "").trim().toLowerCase() as any,
        shortName: String(shortName ?? "").trim().toUpperCase(),
        name: String(name ?? "").trim(),
        colorHex: String(colorHex ?? "").trim().toUpperCase(),
        mapIconId: parsedMapIconId
      });

      systemMessage(player, `Fraktion erstellt: [${faction.shortName}] ${faction.name} (ID ${faction.factionId})`);
      await sendAdminFactionData(player);
      await syncFactionMapBlipsForAll();
    })().catch((error) => {
      logError("admin create faction failed", error);
      systemMessage(player, "Fraktion konnte nicht erstellt werden.");
    });
  });

  mp.events.add("server:tickets:create", (player: any, rawPrefix: unknown, rawSubject: unknown, rawMessage: unknown) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        return;
      }

      const result = await tickets.createTicket(
        accountId,
        getPlayerName(player),
        String(rawPrefix ?? ""),
        String(rawSubject ?? ""),
        String(rawMessage ?? "")
      );

      if (!result.ok) {
        if (result.reason === "muted") {
          emitClient(player, "client:tickets:mute", buildTicketMutePayload(result.mute.reason, result.mute.expiresAt, result.mute.adminName || "Support-Team"));
        } else if (result.reason === "existing_open") {
          systemMessage(player, `Du hast bereits ein offenes Ticket (#${result.ticket.ticketId}).`);
        } else {
          systemMessage(player, "Ticket konnte nicht erstellt werden. Pruefe Betreff und Text.");
        }
        await sendPlayerTicketData(player);
        return;
      }

      systemMessage(player, `Ticket #${result.ticket?.ticketId ?? 0} wurde erstellt.`);
      notifyAdmins(`Neues Ticket #${result.ticket?.ticketId ?? 0} von ${getPlayerName(player)} (${result.ticket?.prefix}).`);
      await syncTicketState(accountId);
    })().catch((error) => logError("create ticket failed", error));
  });

  mp.events.add("server:tickets:reply", (player: any, rawTicketId: unknown, rawMessage: unknown) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const result = await tickets.replyAsPlayer(accountId, ticketId, getPlayerName(player), String(rawMessage ?? ""));
      if (!result.ok) {
        systemMessage(player, "Nachricht konnte nicht zum Ticket hinzugefuegt werden.");
        return;
      }

      await syncTicketState(accountId);
    })().catch((error) => logError("reply ticket failed", error));
  });

  mp.events.add("server:admin:tickets:request", (player: any) => {
    void sendAdminTicketData(player).catch((error) => logError("admin ticket request failed", error));
  });

  mp.events.add("server:admin:tickets:claim", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const result = await tickets.claimTicket(ticketId, accountId, getPlayerName(player));
      if (!result.ok) {
        systemMessage(player, "Ticket konnte nicht geclaimt werden.");
        return;
      }

      systemMessage(player, `Ticket #${ticketId} uebernommen.`);
      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("claim ticket failed", error));
  });

  mp.events.add("server:tickets:requestMine", (player: any) => {
    void sendPlayerTicketData(player).catch((error) => logError("request mine tickets failed", error));
  });

  mp.events.add("server:usermenu:open", (player: any) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) return;

      const profile = await factions.getMemberProfile(accountId);

      emitClient(player, "client:usermenu:open", JSON.stringify({
        playerName: getPlayerName(player),
        accountId,
        adminLevel: Number(getVar(player, "ADMIN_LEVEL", 0)),
        money: Number(getVar(player, "MONEY", 0)),
        bankMoney: Number(getVar(player, "BANK_MONEY", 0)),
        dirtyMoney: Number(getVar(player, "DIRTY_MONEY", 0)),
        playTime: Number(getVar(player, "PLAY_TIME", 0)),
        job: getVar(player, "JOB_NAME", "Arbeitslos"),
        phoneNumber: getVar(player, "PHONE_NUMBER", null),
        factionName: profile?.factionName || null,
        factionRankName: profile?.rankName || null,
        generalRecord: 0
      }));

      await sendPlayerTicketData(player);
    })().catch((error) => logError("usermenu open failed", error));
  });

  mp.events.add("server:chat:submit", (player: any, rawMode: unknown, rawMessage: unknown) => {
    void (async () => {
        const mode = String(rawMode || "ic").toLowerCase();
        const message = String(rawMessage || "").trim();
        if (!message) return;

        if (message.startsWith("/")) {
            const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
            if (await adminService.execute(player, message, adminLevel)) {
                return;
            }
        }

        const name = chatName(player);

    if (mode === "ooc") {
      rangeMessage(player, "ooc", `(( ${name} ))`, message, 25);
    } else if (mode === "me") {
      rangeMessage(player, "me", "*", `${name} ${message}`, 20);
    } else if (mode === "do") {
      rangeMessage(player, "do", "*", `${message} (( ${name} ))`, 20);
    } else if (mode === "try") {
      const outcome = Math.random() > 0.5;
      const outcomeText = outcome ? "~g~Erfolg~w~" : "~r~Fehlgeschlagen~w~";
      rangeMessage(player, "try", "*", `${name} versucht ${message}: ${outcomeText}`, 20);
    } else {
      // IC (Default)
      rangeMessage(player, "ic", name, message, 20);
    }
    })().catch((error) => logError("chat submission failed", error));
  });

  mp.events.add("server:interaction:select", (player: any, rawAction: unknown) => {
    void (async () => {
      const actionId = String(rawAction || "");
      if (!actionId) return;

      if (actionId === "lock") {
        mp.events.call("server:vehicle:toggleLock", player);
        return;
      }

      const parts = actionId.split(":");
      if (parts[0] !== "house") {
        systemMessage(player, `Aktion ${actionId} ist aktuell noch nicht verfuegbar.`);
        return;
      }

      const actionType = parts[1];
      const houseId = Number(parts[2]);
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));

      if (!Number.isInteger(houseId) || houseId <= 0) {
        return;
      }

      if (actionType === "buy") {
        const houseRecord = await findNearbyExteriorHouse(player, houseId);
        if (!houseRecord) {
          return;
        }

        const bankCash = Number(getVar(player, "BANK_CASH", 0));
        const cash = Number(getVar(player, "CASH", 0));
        if (bankCash + cash < houseRecord.price) {
          systemMessage(player, `Dir fehlen $${(houseRecord.price - (bankCash + cash)).toLocaleString("de-DE")} fuer den Kauf.`);
          return;
        }

        const result = await housing.buyHouse(houseId, accountId);
        if (!result.ok) {
          systemMessage(player, result.reason === "owned" ? "Dieses Haus wurde bereits verkauft." : "Haus konnte nicht gekauft werden.");
          return;
        }

        let remaining = houseRecord.price;
        const newBankCash = Math.max(0, bankCash - Math.min(bankCash, remaining));
        remaining -= Math.min(bankCash, remaining);
        const newCash = Math.max(0, cash - remaining);
        setPlayerMoney(player, "BANK_CASH", newBankCash);
        setPlayerMoney(player, "CASH", newCash);
        await savePlayerPosition(player);

        systemMessage(player, `Haus gekauft: ${houseRecord.displayName} fuer $${houseRecord.price.toLocaleString("de-DE")}.`);
        await syncHousingDataForAll();
        return;
      }

      if (actionType === "enter") {
        const houseRecord = await findNearbyExteriorHouse(player, houseId);
        if (!houseRecord) {
          return;
        }

        if (!housing.canManageHouse(houseRecord, accountId, adminLevel)) {
          systemMessage(player, "Du besitzt keinen Schluessel fuer dieses Haus.");
          return;
        }

        const interior = housing.getInterior(houseRecord);
        if (!interior) {
          systemMessage(player, "Interior konnte nicht geladen werden.");
          return;
        }

        player.dimension = interior.dimension;
        player.position = vector3(interior.entryPoint.x, interior.entryPoint.y, interior.entryPoint.z);
        setHeading(player, interior.entryPoint.rotZ);
        setVar(player, "CURRENT_HOUSE_ID", houseRecord.houseId);
        setVar(player, "HOUSE_STORAGE_OPEN", false);
        setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
        emitClient(player, "client:housing:stabilizeInteriorSpawn", JSON.stringify({
          x: interior.entryPoint.x,
          y: interior.entryPoint.y,
          z: interior.entryPoint.z
        }));
        systemMessage(player, `Du hast ${houseRecord.displayName} betreten.`);
        await syncHousingDataForPlayer(player);
        return;
      }

      if (actionType === "exit") {
        const houseRecord = await getHouseByCurrentInterior(player);
        if (!houseRecord || houseRecord.houseId !== houseId) {
          return;
        }

        if (!(await isNearHouseInteriorPoint(player, houseRecord, "exit"))) {
          return;
        }

        player.dimension = houseRecord.entranceDimension;
        player.position = vector3(houseRecord.entranceX, houseRecord.entranceY, houseRecord.entranceZ);
        setHeading(player, houseRecord.entranceRotZ);
        setVar(player, "CURRENT_HOUSE_ID", 0);
        setVar(player, "HOUSE_STORAGE_OPEN", false);
        setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
        emitClient(player, "client:housingStorage:hide");
        emitClient(player, "client:housing:forceCloseWardrobe");
        systemMessage(player, `Du hast ${houseRecord.displayName} verlassen.`);
        await syncHousingDataForPlayer(player);
        return;
      }

      if (actionType === "lock") {
        const houseRecord = await findNearbyExteriorHouse(player, houseId);
        if (!houseRecord) {
          return;
        }

        if (!housing.canManageHouse(houseRecord, accountId, adminLevel)) {
          systemMessage(player, "Du kannst diese Tuer nicht bedienen.");
          return;
        }

        const updated = await housing.toggleLock(houseId);
        if (!updated) {
          return;
        }

        systemMessage(player, updated.isLocked ? "Haustuer abgeschlossen." : "Haustuer aufgeschlossen.");
        await syncHousingDataForAll();
        return;
      }

      if (actionType === "storage") {
        const houseRecord = await getHouseByCurrentInterior(player);
        if (!houseRecord || houseRecord.houseId !== houseId) {
          return;
        }

        if (!housing.canManageHouse(houseRecord, accountId, adminLevel) || !(await isNearHouseInteriorPoint(player, houseRecord, "storage"))) {
          return;
        }

        const storageRecord = await housing.getStorage(houseId);
        setVar(player, "HOUSE_STORAGE_OPEN", true);
        setVar(player, "OPEN_HOUSE_STORAGE_ID", houseId);
        emitClient(player, "client:housingStorage:show", serializeStoragePayload(player, houseRecord, storageRecord.inventoryData));
        return;
      }

      if (actionType === "wardrobe") {
        const houseRecord = await getHouseByCurrentInterior(player);
        if (!houseRecord || houseRecord.houseId !== houseId) {
          return;
        }

        if (!housing.canManageHouse(houseRecord, accountId, adminLevel) || !(await isNearHouseInteriorPoint(player, houseRecord, "wardrobe"))) {
          return;
        }

        emitClient(player, "client:housing:openWardrobe", JSON.stringify({
          houseId: houseRecord.houseId,
          title: houseRecord.displayName
        }));
        return;
      }

      if ((actionType === "garage" || actionType === "helipad") && parts[3] === "park") {
        await parkPlayerVehicleInHouseParking(player, houseId, accountId, adminLevel, actionType);
        return;
      }

      if ((actionType === "garage" || actionType === "helipad") && parts[3] === "spawn") {
        await spawnStoredHouseParkingVehicle(player, houseId, Number(parts[4]), accountId, adminLevel, actionType);
        return;
      }

      systemMessage(player, `Aktion ${actionId} ist aktuell noch nicht verfuegbar.`);
    })().catch((error) => logError("interaction select failed", error));
  });

  mp.events.add("server:housing:storage:deposit", (player: any, rawUid: unknown) => {
    void (async () => {
      const houseId = Number(getVar(player, "OPEN_HOUSE_STORAGE_ID", 0));
      const uid = String(rawUid ?? "");
      if (!Boolean(getVar(player, "HOUSE_STORAGE_OPEN", false)) || !uid || houseId <= 0) {
        return;
      }

      const houseRecord = await getHouseByCurrentInterior(player);
      if (!houseRecord || houseRecord.houseId !== houseId || !(await isNearHouseInteriorPoint(player, houseRecord, "storage"))) {
        emitClient(player, "client:housingStorage:hide");
        setVar(player, "HOUSE_STORAGE_OPEN", false);
        setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
        return;
      }

      const storageRecord = await housing.getStorage(houseId);
      const playerInventory = inventoryService.getInventorySnapshot(player);
      const storageInventory = Array.isArray(storageRecord.inventoryData) ? [...storageRecord.inventoryData] : [];
      const transfer = moveEntryBetweenInventories(playerInventory, storageInventory, uid, houseRecord.storageSlots);
      if (!transfer.ok) {
        systemMessage(player, transfer.reason === "capacity" ? "Das Lager ist voll." : "Gegenstand wurde nicht gefunden.");
        return;
      }

      inventoryService.setInventorySnapshot(player, playerInventory as any);
      await housing.saveStorage(houseId, storageInventory);
      emitClient(player, "client:housingStorage:update", serializeStoragePayload(player, houseRecord, storageInventory));
    })().catch((error) => logError("housing storage deposit failed", error));
  });

  mp.events.add("server:housing:storage:withdraw", (player: any, rawUid: unknown) => {
    void (async () => {
      const houseId = Number(getVar(player, "OPEN_HOUSE_STORAGE_ID", 0));
      const uid = String(rawUid ?? "");
      if (!Boolean(getVar(player, "HOUSE_STORAGE_OPEN", false)) || !uid || houseId <= 0) {
        return;
      }

      const houseRecord = await getHouseByCurrentInterior(player);
      if (!houseRecord || houseRecord.houseId !== houseId || !(await isNearHouseInteriorPoint(player, houseRecord, "storage"))) {
        emitClient(player, "client:housingStorage:hide");
        setVar(player, "HOUSE_STORAGE_OPEN", false);
        setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
        return;
      }

      const storageRecord = await housing.getStorage(houseId);
      const playerInventory = inventoryService.getInventorySnapshot(player);
      const storageInventory = Array.isArray(storageRecord.inventoryData) ? [...storageRecord.inventoryData] : [];
      const transfer = moveEntryBetweenInventories(storageInventory, playerInventory, uid, 64);
      if (!transfer.ok) {
        systemMessage(player, transfer.reason === "capacity" ? "Dein Inventar ist voll." : "Gegenstand wurde nicht gefunden.");
        return;
      }

      inventoryService.setInventorySnapshot(player, playerInventory as any);
      await housing.saveStorage(houseId, storageInventory);
      emitClient(player, "client:housingStorage:update", serializeStoragePayload(player, houseRecord, storageInventory));
    })().catch((error) => logError("housing storage withdraw failed", error));
  });

  mp.events.add("server:housing:storage:close", (player: any) => {
    setVar(player, "HOUSE_STORAGE_OPEN", false);
    setVar(player, "OPEN_HOUSE_STORAGE_ID", 0);
  });

  mp.events.add("server:admin:tickets:reply", (player: any, rawTicketId: unknown, rawMessage: unknown, rawForce: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const result = await tickets.replyAsAdmin(ticketId, accountId, getPlayerName(player), String(rawMessage ?? ""), Boolean(rawForce));
      if (!result.ok) {
        if (result.reason === "claimed_by_other") {
          systemMessage(player, `Ticket ist aktuell von ${result.ticket.claimedByName || "einem anderen Admin"} geclaimt.`);
        } else {
          systemMessage(player, "Ticket konnte nicht beantwortet werden.");
        }
        return;
      }

      const targetPlayer = findOnlinePlayerByAccountId(result.ticket?.accountId ?? 0);
      if (targetPlayer) {
        adminMessage(targetPlayer, "Support", `Antwort auf dein Ticket #${ticketId} von ${getPlayerName(player)}.`);
      }
      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("admin reply ticket failed", error));
  });

  mp.events.add("server:admin:tickets:status", (player: any, rawTicketId: unknown, rawStatus: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const status = String(rawStatus ?? "") as any;
      const result = await tickets.setStatus(ticketId, Number(getVar(player, "ACCOUNT_ID", 0)), getPlayerName(player), status);
      if (!result.ok) {
        systemMessage(player, "Ticket-Status konnte nicht gesetzt werden.");
        return;
      }

      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("admin set ticket status failed", error));
  });

  mp.events.add("server:admin:tickets:priority", (player: any, rawTicketId: unknown, rawPriority: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const priority = String(rawPriority ?? "normal") as any;
      const result = await tickets.setPriority(ticketId, Number(getVar(player, "ACCOUNT_ID", 0)), getPlayerName(player), priority);
      if (!result.ok) {
        systemMessage(player, "Ticket-Prioritaet konnte nicht gesetzt werden.");
        return;
      }

      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("admin set ticket priority failed", error));
  });

  mp.events.add("server:admin:tickets:addParticipant", (player: any, rawTicketId: unknown, rawTargetAccountId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const targetAccountId = Number(rawTargetAccountId);
      if (!Number.isInteger(ticketId) || !Number.isInteger(targetAccountId) || targetAccountId <= 0) {
        return;
      }

      const targetAccount = await accounts.getById(targetAccountId);
      if (!targetAccount || targetAccount.adminLevel < 1) {
        systemMessage(player, "Admin-Account nicht gefunden.");
        return;
      }

      const targetAdminName = `${targetAccount.firstName} ${targetAccount.lastName}`;
      const result = await tickets.addParticipant(ticketId, targetAccountId, targetAdminName, Number(getVar(player, "ACCOUNT_ID", 0)), getPlayerName(player));
      if (!result.ok) {
        systemMessage(player, "Admin konnte nicht zum Ticket hinzugefuegt werden.");
        return;
      }

      notifyAdmins(`${getPlayerName(player)} hat ${targetAdminName} zu Ticket #${ticketId} hinzugezogen.`);
      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("add ticket participant failed", error));
  });

  mp.events.add("server:admin:tickets:requestAdvice", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticketId = Number(rawTicketId);
      const result = await tickets.requestAdvice(ticketId, Number(getVar(player, "ACCOUNT_ID", 0)), getPlayerName(player));
      if (!result.ok) {
        systemMessage(player, "Rat konnte nicht angefordert werden.");
        return;
      }

      const myLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
      forEachPlayer((target) => {
        const targetLevel = Number(getVar(target, "ADMIN_LEVEL", 0));
        if (targetLevel > myLevel) {
          adminMessage(target, "TICKET", `${adminRoleLabel(myLevel)} ${getPlayerName(player)} bittet bei Ticket #${ticketId} um Unterstuetzung.`);
        }
      });
      await syncTicketState(result.ticket?.accountId ?? 0);
    })().catch((error) => logError("request ticket advice failed", error));
  });

  mp.events.add("server:admin:tickets:goto", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticket = await tickets.getTicketById(Number(rawTicketId));
      const target = ticket ? findOnlinePlayerByAccountId(ticket.accountId) : null;
      if (!ticket || !target) {
        systemMessage(player, "Spieler zum Ticket ist nicht online.");
        return;
      }

      player.dimension = target.dimension;
      player.position = vector3(target.position.x + 1.5, target.position.y, target.position.z);
      systemMessage(player, `Teleportiert zu ${getPlayerName(target)}.`);
    })().catch((error) => logError("ticket goto failed", error));
  });

  mp.events.add("server:admin:tickets:gethere", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticket = await tickets.getTicketById(Number(rawTicketId));
      const target = ticket ? findOnlinePlayerByAccountId(ticket.accountId) : null;
      if (!ticket || !target) {
        systemMessage(player, "Spieler zum Ticket ist nicht online.");
        return;
      }

      target.dimension = player.dimension;
      target.position = vector3(player.position.x + 1.5, player.position.y, player.position.z);
      systemMessage(player, `${getPlayerName(target)} wurde zu dir teleportiert.`);
      systemMessage(target, "Ein Admin hat dich wegen deines Tickets zu sich teleportiert.");
    })().catch((error) => logError("ticket gethere failed", error));
  });

  mp.events.add("server:admin:tickets:characterInfo", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticket = await tickets.getTicketById(Number(rawTicketId));
      if (!ticket) {
        systemMessage(player, "Ticket nicht gefunden.");
        return;
      }

      await pushTicketInsight(player, ticket.accountId);
      systemMessage(player, `Charakter-Info fuer Account ${ticket.accountId} geladen.`);
    })().catch((error) => logError("ticket character info failed", error));
  });

  mp.events.add("server:admin:tickets:warnings", (player: any, rawTicketId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const ticket = await tickets.getTicketById(Number(rawTicketId));
      if (!ticket) {
        systemMessage(player, "Ticket nicht gefunden.");
        return;
      }

      await pushTicketInsight(player, ticket.accountId);
      systemMessage(player, `Warns fuer Account ${ticket.accountId} geladen.`);
    })().catch((error) => logError("ticket warnings failed", error));
  });

  mp.events.add("server:admin:tickets:history", (player: any, rawAccountId: unknown) => {
    void (async () => {
      if (!hasAdminAccess(player)) {
        return;
      }

      const accountId = Number(rawAccountId);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        return;
      }

      const history = await tickets.getPlayerHistory(accountId);
      pushTicketPlayerHistory(player, accountId, history);
      systemMessage(player, `Ticket-Historie fuer Account ${accountId} geladen.`);
    })().catch((error) => logError("ticket history failed", error));
  });

  mp.events.add("server:admin:setFactionLeader", (player: any, rawAccountId: unknown, rawFactionId: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 10)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 10.");
        return;
      }

      const accountId = Number(rawAccountId);
      const factionId = Number(rawFactionId);
      if (!Number.isInteger(accountId) || !Number.isInteger(factionId)) {
        return;
      }

      const membership = await factions.setFactionLeader(factionId, accountId);
      if (!membership) {
        systemMessage(player, "Fraktion nicht gefunden.");
        return;
      }

      await syncFactionStateForOnlineAccount(accountId);

      systemMessage(player, `Leader gesetzt: Account ${accountId} -> Fraktion ${factionId}`);
    })().catch((error) => {
      logError("admin set faction leader failed", error);
      systemMessage(player, "Leader konnte nicht gesetzt werden.");
    });
  });

  mp.events.add("server:admin:setFactionSpawn", (player: any, rawFactionId: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 5)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 5.");
        return;
      }

      const factionId = Number(rawFactionId);
      if (!Number.isInteger(factionId)) {
        return;
      }

      const spawn = await factions.saveFactionSpawnFromPlayer(factionId, player);
      if (!spawn) {
        systemMessage(player, "Fraktion nicht gefunden.");
        return;
      }

      systemMessage(player, `Fraktionsspawn gesetzt: ${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)}`);
      await syncFactionMapBlipsForAll();
    })().catch((error) => {
      logError("admin set faction spawn failed", error);
      systemMessage(player, "Fraktionsspawn konnte nicht gesetzt werden.");
    });
  });

  mp.events.add("server:admin:addFactionWardrobe", (player: any, rawFactionId: unknown, rawLabel: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 5)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 5.");
        return;
      }

      const factionId = Number(rawFactionId);
      const label = String(rawLabel ?? "").trim();
      if (!Number.isInteger(factionId) || !label) {
        return;
      }

      const created = await factions.createWardrobePointFromPlayer({ factionId, label }, player);
      if (!created.ok) {
        systemMessage(player, created.reason === "wardrobe_state_only" ? "Kleidungskammern sind nur fuer state erlaubt." : "Fraktion nicht gefunden.");
        return;
      }

      systemMessage(player, `Kleidungskammer erstellt: ${created.point.label}`);
    })().catch((error) => {
      logError("admin add wardrobe failed", error);
      systemMessage(player, "Kleidungskammer konnte nicht erstellt werden.");
    });
  });

  mp.events.add("server:admin:createFactionVehicle", (player: any, rawFactionId: unknown, rawMinRank: unknown, rawModel: unknown, rawName: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 5)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 5.");
        return;
      }

      const factionId = Number(rawFactionId);
      const minRankLevel = Number(rawMinRank);
      const modelName = String(rawModel ?? "").trim().toLowerCase();
      const displayName = String(rawName ?? "").trim();
      if (!Number.isInteger(factionId) || !Number.isInteger(minRankLevel) || !modelName || !displayName) {
        return;
      }

      const vehicle = await factions.createFactionVehicleFromPlayer({ factionId, minRankLevel, modelName, displayName }, player);
      if (!vehicle) {
        systemMessage(player, "Fraktion nicht gefunden.");
        return;
      }

      await spawnFactionVehicleEntity(vehicle.factionVehicleId);
      systemMessage(player, `Fraktionsfahrzeug erstellt: ${vehicle.displayName}`);
    })().catch((error) => {
      logError("admin create faction vehicle failed", error);
      systemMessage(player, "Fraktionsfahrzeug konnte nicht erstellt werden.");
    });
  });

  mp.events.add("server:admin:syncFactionDefaults", (player: any, rawTarget: unknown) => {
    void (async () => {
      if (!hasAdminLevel(player, 10)) {
        systemMessage(player, "Dafuer benoetigst du Admin-Level 10.");
        return;
      }

      const raw = String(rawTarget ?? "all").trim().toLowerCase();
      if (!raw || raw === "all") {
        const result = await factions.syncDefaultPermissionsForAll();
        systemMessage(player, `Default-Rechte auf ${result.synced} Fraktionen angewendet.`);
      } else {
        const factionId = Number(raw);
        if (!Number.isInteger(factionId)) {
          return;
        }

        const result = await factions.syncDefaultPermissions(factionId);
        if (!result.ok) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return;
        }

        systemMessage(player, `Default-Rechte auf [${result.faction.shortName}] angewendet.`);
      }

      await sendAdminFactionData(player);
    })().catch((error) => {
      logError("admin sync defaults failed", error);
      systemMessage(player, "Default-Rechte konnten nicht synchronisiert werden.");
    });
  });

  mp.events.add("server:orga:setMemberRank", (player: any, rawAccountId: unknown, rawRankLevel: unknown) => {
    void (async () => {
      try {
        const ownFactionId = Number(getVar(player, "FACTION_ID", 0));
        if (ownFactionId <= 0) {
          return;
        }

        if (!hasFactionPermission(player, "manage_members") && !hasFactionPermission(player, "manage_ranks")) {
          systemMessage(player, "Dir fehlen die noetigen Orga-Rechte.");
          return;
        }

        const accountId = Number(rawAccountId);
        const rankLevel = Number(rawRankLevel);
        if (!Number.isInteger(accountId) || !Number.isInteger(rankLevel)) {
          return;
        }

        const targetMembership = await factions.getMembershipByAccountId(accountId);
        if (!targetMembership || targetMembership.factionId !== ownFactionId) {
          systemMessage(player, "Mitglied nicht gefunden.");
          return;
        }

        const updated = await factions.assignMember({ factionId: ownFactionId, accountId, rankLevel });
        if (!updated) {
          systemMessage(player, "Rang konnte nicht gesetzt werden.");
          return;
        }

        await syncFactionStateForOnlineAccount(accountId);
        const onlineTarget = findOnlinePlayerByAccountId(accountId);
        if (onlineTarget) {
          const profile = await factions.getMemberProfile(accountId);
          systemMessage(onlineTarget, `Dein Organisationsrang ist jetzt ${profile?.rankName ?? `Rang ${rankLevel}`}.`);
        }

        systemMessage(player, `Rang von Account ${accountId} auf ${rankLevel} gesetzt.`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga set rank failed", error);
        systemMessage(player, "Rang konnte nicht gesetzt werden.");
      }
    })();
  });

  mp.events.add("server:orga:setRankName", (player: any, rawRankLevel: unknown, rawRankName: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || !hasFactionPermission(player, "manage_ranks")) {
          systemMessage(player, "Dir fehlt das Recht manage_ranks.");
          return;
        }

        const rankLevel = Number(rawRankLevel);
        const rankName = String(rawRankName ?? "").trim();
        if (!Number.isInteger(rankLevel) || rankLevel < 1 || rankLevel > 20 || rankName.length < 2) {
          systemMessage(player, "Ungueltiger Rangname.");
          return;
        }

        const updated = await factions.setRankName({ factionId, rankLevel, rankName });
        if (!updated) {
          systemMessage(player, "Rang konnte nicht aktualisiert werden.");
          return;
        }

        systemMessage(player, `Rang ${rankLevel} in ${rankName} umbenannt.`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga set rank name failed", error);
        systemMessage(player, "Rang konnte nicht umbenannt werden.");
      }
    })();
  });

  // --- Wardrobe Events ---
  mp.events.add("server:wardrobe:requestCatalog", (player: any) => {
    void (async () => {
      const factionId = Number(getVar(player, "FACTION_ID", 0));
      const rankLevel = Number(getVar(player, "FACTION_RANK", 0));
      if (factionId <= 0) return;

      const isMale = player.model === mp.joaat("mp_m_freemode_01");
      const sex = isMale ? 1 : 2;
      const catalog = await factions.getClothingCatalog(factionId, rankLevel, sex);
      const outfits = await factions.getOutfits(factionId);
      
      emitClient(player, "client:wardrobe:setCatalog", JSON.stringify({ items: catalog, outfits }));
    })().catch((error) => logError("wardrobe catalog request failed", error));
  });

  mp.events.add("server:wardrobe:applyItem", (player: any, rawItemId: unknown) => {
    void (async () => {
      const itemId = Number(rawItemId);
      if (!Number.isInteger(itemId)) return;

      // Ensure player is in service mode (saves civilian look)
      await factions.toggleFactionService(player, false, { accounts });

      const result = await factions.applyClothingItem(player, itemId);
      if (!result.ok) {
        systemMessage(player, result.message || "Gegenstand konnte nicht angewendet werden.");
        return;
      }

      const { item } = result;
      emitClient(player, "client:wardrobe:applyItem", item.componentId, item.drawableId, item.textureId);
    })().catch((error) => logError("wardrobe apply item failed", error));
  });

  mp.events.add("server:wardrobe:endService", (player: any) => {
    void (async () => {
      const result = await factions.toggleFactionService(player, true, { accounts });
      if (result.message) {
        systemMessage(player, result.message);
      }
      if (result.civilianCustom) {
        emitClient(player, "client:wardrobe:applyCustomization", result.civilianCustom);
      }
    })().catch((error) => logError("wardrobe end service failed", error));
  });

  mp.events.add("server:myOutfit:requestList", (player: any) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) return;
      const outfits = await accounts.getPersonalOutfits(accountId);
      emitClient(player, "client:myOutfit:setList", JSON.stringify(outfits));
    })().catch((error) => logError("myOutfit requestList failed", error));
  });

  mp.events.add("server:myOutfit:save", (player: any, rawName: unknown, rawClothingJson: unknown) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) return;
      const name = String(rawName ?? "").trim().slice(0, 32);
      const clothingJson = String(rawClothingJson ?? "[]");
      if (!name) return;
      const result = await accounts.createPersonalOutfit(accountId, name, clothingJson);
      if (!result.ok) {
        systemMessage(player, result.message);
        return;
      }
      const outfits = await accounts.getPersonalOutfits(accountId);
      emitClient(player, "client:myOutfit:setList", JSON.stringify(outfits));
    })().catch((error) => logError("myOutfit save failed", error));
  });

  mp.events.add("server:myOutfit:delete", (player: any, rawOutfitId: unknown) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const outfitId = Number(rawOutfitId);
      if (accountId <= 0 || !Number.isInteger(outfitId) || outfitId <= 0) return;
      await accounts.deletePersonalOutfit(outfitId, accountId);
      const outfits = await accounts.getPersonalOutfits(accountId);
      emitClient(player, "client:myOutfit:setList", JSON.stringify(outfits));
    })().catch((error) => logError("myOutfit delete failed", error));
  });

  mp.events.add("server:myOutfit:apply", (player: any, rawOutfitId: unknown) => {
    void (async () => {
      const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const outfitId = Number(rawOutfitId);
      if (accountId <= 0 || !Number.isInteger(outfitId) || outfitId <= 0) return;
      const outfit = await accounts.getPersonalOutfitById(outfitId, accountId);
      if (!outfit) return;
      emitClient(player, "client:wardrobe:applyOutfit", outfit.clothingJson);
    })().catch((error) => logError("myOutfit apply failed", error));
  });

  mp.events.add("server:orga:setRankPermission", (player: any, rawRankLevel: unknown, rawPermissionKey: unknown, rawGranted: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || !hasFactionPermission(player, "manage_ranks")) {
          systemMessage(player, "Dir fehlt das Recht manage_ranks.");
          return;
        }

        const rankLevel = Number(rawRankLevel);
        const permissionKey = String(rawPermissionKey ?? "").trim().toLowerCase();
        const granted = rawGranted === true || rawGranted === "true" || rawGranted === 1 || rawGranted === "1";
        if (!Number.isInteger(rankLevel) || rankLevel < 1 || rankLevel > 20 || !permissionKey || !isKnownFactionPermissionKey(permissionKey)) {
          systemMessage(player, "Ungueltiges Rangrecht.");
          return;
        }

        await factions.setRankPermission({ factionId, rankLevel, permissionKey, granted });
        await syncFactionStateForOnlineMembers(factionId);
        systemMessage(player, `Rang ${rankLevel}: ${permissionKey} ${granted ? "aktiviert" : "entfernt"}.`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga set rank permission failed", error);
        systemMessage(player, "Rangrecht konnte nicht gesetzt werden.");
      }
    })();
  });

  mp.events.add("server:orga:createOutfit", (player: any, rawCategory: unknown, rawName: unknown, rawClothing: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || (!hasFactionPermission(player, "manage_storage") && !hasFactionPermission(player, "manage_ranks"))) {
          systemMessage(player, "Dir fehlen die noetigen Orga-Rechte.");
          return;
        }

        let clothing = rawClothing as number[][];
        if (typeof rawClothing === "string") {
          clothing = JSON.parse(rawClothing);
        }

        const created = await factions.createOutfit({
          factionId,
          category: String(rawCategory ?? "").trim().toLowerCase(),
          name: String(rawName ?? "").trim(),
          clothing
        });

        if (!created.ok) {
          systemMessage(player, "Outfit konnte nicht erstellt werden.");
          return;
        }

        systemMessage(player, `Outfit erstellt: ${created.outfit.category} | ${created.outfit.name}`);
        await syncWardrobeDataForPlayer(player);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga create outfit failed", error);
        systemMessage(player, "Outfit konnte nicht erstellt werden.");
      }
    })();
  });

  mp.events.add("server:orga:deleteOutfit", (player: any, rawOutfitId: unknown) => {
    void (async () => {
      try {
        if (!hasFactionPermission(player, "manage_storage") && !hasFactionPermission(player, "manage_ranks")) {
          systemMessage(player, "Dir fehlen die noetigen Orga-Rechte.");
          return;
        }

        const outfitId = Number(rawOutfitId);
        if (!Number.isInteger(outfitId)) {
          return;
        }

        const outfit = await factions.getOutfitById(outfitId);
        if (!outfit || outfit.factionId !== Number(getVar(player, "FACTION_ID", 0))) {
          systemMessage(player, "Outfit nicht gefunden.");
          return;
        }

        await factions.deleteOutfit(outfitId);
        systemMessage(player, `Outfit geloescht: ${outfit.name}`);
        await syncWardrobeDataForPlayer(player);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga delete outfit failed", error);
        systemMessage(player, "Outfit konnte nicht geloescht werden.");
      }
    })();
  });

  mp.events.add("server:orga:createVehicle", (player: any, rawMinRankLevel: unknown, rawModelName: unknown, rawDisplayName: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || !hasFactionPermission(player, "manage_vehicles")) {
          systemMessage(player, "Dir fehlt das Recht manage_vehicles.");
          return;
        }

        const minRankLevel = Number(rawMinRankLevel);
        const modelName = String(rawModelName ?? "").trim().toLowerCase();
        const displayName = String(rawDisplayName ?? "").trim();
        if (!Number.isInteger(minRankLevel) || !modelName || !displayName) {
          return;
        }

        const vehicle = await factions.createFactionVehicleFromPlayer({ factionId, minRankLevel, modelName, displayName }, player);
        if (!vehicle) {
          systemMessage(player, "Fraktionsfahrzeug konnte nicht erstellt werden.");
          return;
        }

        await spawnFactionVehicleEntity(vehicle.factionVehicleId);
        systemMessage(player, `Fraktionsfahrzeug erstellt: ${vehicle.displayName}`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga create vehicle failed", error);
        systemMessage(player, "Fraktionsfahrzeug konnte nicht erstellt werden.");
      }
    })();
  });

  mp.events.add("server:orga:deleteVehicle", (player: any, rawFactionVehicleId: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || !hasFactionPermission(player, "manage_vehicles")) {
          systemMessage(player, "Dir fehlt das Recht manage_vehicles.");
          return;
        }

        const factionVehicleId = Number(rawFactionVehicleId);
        if (!Number.isInteger(factionVehicleId)) {
          return;
        }

        const vehicle = await factions.getFactionVehicleById(factionVehicleId);
        if (!vehicle || vehicle.factionId !== factionId) {
          systemMessage(player, "Fraktionsfahrzeug nicht gefunden.");
          return;
        }

        await factions.deleteFactionVehicle(factionVehicleId);
        despawnFactionVehicleEntity(factionVehicleId);
        systemMessage(player, `Fraktionsfahrzeug geloescht: ${vehicle.displayName}`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga delete vehicle failed", error);
        systemMessage(player, "Fraktionsfahrzeug konnte nicht geloescht werden.");
      }
    })();
  });

  mp.events.add("server:orga:parkCurrentVehicle", (player: any) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        const rankLevel = Number(getVar(player, "FACTION_RANK", 0));
        const vehicle = player.vehicle;
        const factionVehicleId = getFactionVehicleEntityId(vehicle);
        if (!factionId || !vehicle || !factionVehicleId) {
          systemMessage(player, "Du sitzt in keinem Fraktionsfahrzeug.");
          return;
        }

        const vehicleRecord = await factions.getFactionVehicleById(factionVehicleId);
        if (!vehicleRecord || vehicleRecord.factionId !== factionId) {
          systemMessage(player, "Fraktionsfahrzeug nicht gefunden.");
          return;
        }

        if (rankLevel < vehicleRecord.minRankLevel) {
          systemMessage(player, "Dein Rang reicht fuer dieses Fahrzeug nicht.");
          return;
        }

        if (!hasFactionPermission(player, "manage_vehicles")) {
          systemMessage(player, "Dir fehlt das Recht manage_vehicles.");
          return;
        }

        await factions.parkFactionVehicleFromPlayer(factionVehicleId, vehicle);
        await spawnFactionVehicleEntity(factionVehicleId);
        systemMessage(player, `${vehicleRecord.displayName} wurde umgeparkt.`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga park vehicle failed", error);
        systemMessage(player, "Fahrzeug konnte nicht umgeparkt werden.");
      }
    })();
  });

  mp.events.add("server:orga:setVehicleRank", (player: any, rawFactionVehicleId: unknown, rawMinRankLevel: unknown) => {
    void (async () => {
      try {
        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0 || !hasFactionPermission(player, "manage_vehicles")) {
          systemMessage(player, "Dir fehlt das Recht manage_vehicles.");
          return;
        }

        const factionVehicleId = Number(rawFactionVehicleId);
        const minRankLevel = Number(rawMinRankLevel);
        if (!Number.isInteger(factionVehicleId) || !Number.isInteger(minRankLevel) || minRankLevel < 1 || minRankLevel > 20) {
          return;
        }

        const vehicle = await factions.getFactionVehicleById(factionVehicleId);
        if (!vehicle || vehicle.factionId !== factionId) {
          systemMessage(player, "Fraktionsfahrzeug nicht gefunden.");
          return;
        }

        await factions.updateFactionVehicleMinRank(factionVehicleId, minRankLevel);
        const entity = factionVehicleEntities.get(factionVehicleId);
        entity?.setVariable?.("FACTION_VEHICLE_MIN_RANK", minRankLevel);
        systemMessage(player, `${vehicle.displayName} ist jetzt ab Rang ${minRankLevel} verfuegbar.`);
        await openOrgMenu(player);
      } catch (error) {
        logError("orga set vehicle rank failed", error);
        systemMessage(player, "Fahrzeugrang konnte nicht gesetzt werden.");
      }
    })();
  });

  mp.events.add("server:chat:send", (player: any, mode: string, text: string) => {
    void onChatSend(player, mode, text).catch((error) => logError("chat failed", error));
  });

  mp.events.add("server:factionWardrobe:apply", (player: any, rawOutfitId: unknown, rawWardrobePointId: unknown) => {
    void (async () => {
      try {
        if (!player || !isLoggedIn(player)) {
          return;
        }

        const outfitId = Number(rawOutfitId);
        const wardrobePointId = Number(rawWardrobePointId);
        if (!Number.isInteger(outfitId) || !Number.isInteger(wardrobePointId)) {
          systemMessage(player, "Ungueltige Kleidungskammer.");
          return;
        }

        const factionId = Number(getVar(player, "FACTION_ID", 0));
        if (factionId <= 0) {
          systemMessage(player, "Du bist in keiner Fraktion.");
          return;
        }

        const wardrobePoints = await factions.getWardrobePoints(factionId);
        const wardrobePoint = wardrobePoints.find((entry) => entry.wardrobePointId === wardrobePointId);
        if (!wardrobePoint) {
          systemMessage(player, "Kleidungskammer nicht gefunden.");
          return;
        }

        const distance = Math.hypot(
          Number(player.position.x) - wardrobePoint.x,
          Number(player.position.y) - wardrobePoint.y,
          Number(player.position.z) - wardrobePoint.z
        );

        if (Number(player.dimension ?? 0) !== wardrobePoint.dimension || distance > 3.0) {
          systemMessage(player, "Du bist nicht nah genug an der Kleidungskammer.");
          return;
        }

        const outfit = await factions.getOutfitById(outfitId);
        if (!outfit || outfit.factionId !== factionId) {
          systemMessage(player, "Outfit nicht gefunden.");
          return;
        }

        if (!canUseWardrobeCategory(player, outfit.category)) {
          const normalizedCategory = String(outfit.category ?? "").trim().toLowerCase();
          systemMessage(
            player,
            normalizedCategory && normalizedCategory !== "dienst"
              ? `Dir fehlt das Recht wardrobe_category_${normalizedCategory}.`
              : "Dir fehlt das Recht wardrobe_access."
          );
          return;
        }

        let clothing: number[][] = [];
        try {
          const parsed = JSON.parse(outfit.clothingJson);
          clothing = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          clothing = [];
        }

        if (!Array.isArray(clothing) || clothing.length !== 4) {
          systemMessage(player, "Outfitdaten sind ungueltig.");
          return;
        }

        await factions.toggleFactionService(player, false, { accounts });

        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        if (accountId > 0) {
          await accounts.setClothing(accountId, clothing);
        }

        applyClothingToPlayer(player, clothing);
        emitClient(player, "client:wardrobe:applyOutfit", JSON.stringify(clothing));
        systemMessage(player, `Outfit angelegt: ${outfit.name}`);
      } catch (error) {
        logError("factionWardrobe apply failed", error);
        systemMessage(player, "Outfit konnte nicht angelegt werden.");
      }
    })();
  });

  mp.events.add("playerEnterVehicle", (player: any, vehicle: any, _seat: number) => {
    void (async () => {
      const factionVehicleId = getFactionVehicleEntityId(vehicle);
      if (!factionVehicleId) {
        return;
      }

      const vehicleRecord = await factions.getFactionVehicleById(factionVehicleId);
      if (!vehicleRecord) {
        return;
      }

      const factionId = Number(getVar(player, "FACTION_ID", 0));
      const rankLevel = Number(getVar(player, "FACTION_RANK", 0));
      if (factionId !== vehicleRecord.factionId || rankLevel < vehicleRecord.minRankLevel) {
        player.removeFromVehicle?.();
        systemMessage(player, `Du darfst ${vehicleRecord.displayName} nicht fahren.`);
      }
    })().catch((error) => logError("playerEnterVehicle faction check failed", error));
  });

  mp.events.add("fpsync.update", (player: any, cameraPitch: number, cameraHeading: number) => {
    forEachPlayer((target) => {
      if (!target || target === player) {
        return;
      }

      emitClient(target, "fpsync.update", player.id, cameraPitch, cameraHeading);
    });
  });

  mp.events.addCommand("testinv", async (player: any) => {
    if (!hasAdminLevel(player, 1)) return;

    const charId = Number(getVar(player, "CHARACTER_ID", 0));
    if (charId <= 0) {
      systemMessage(player, "Du musst eingeloggt sein.");
      return;
    }

    try {
      await inventoryService.addItem(player, "burger", 2);
      await inventoryService.addItem(player, "water", 1);
      await inventoryService.addItem(player, "phone", 1);
      
      await inventoryService.savePlayerInventory(player);
      
      systemMessage(player, "Test-Items hinzugefuegt und Inventar gespeichert.");
      logInfo(`Admin ${player.name} used /testinv`);
    } catch (error) {
      logError("testinv failed", error);
      systemMessage(player, "Fehler beim Hinzufuegen der Items.");
    }
  });

  await respawnAllFactionVehicles();
  logInfo(`TypeScript resource ready. Default spawn ${formatSpawn(DEFAULT_SPAWN)}`);
}

process.on("unhandledRejection", (error) => {
  logError("unhandled rejection", error);
});

process.on("uncaughtException", (error) => {
  logError("uncaught exception", error);
});

async function saveAllPlayerPositions() {
  const saves: Promise<void>[] = [];
  mp.players.forEach((player: any) => {
    saves.push(savePlayerPosition(player).catch(() => {}));
  });
  await Promise.all(saves);
}

process.on("SIGTERM", () => {
  void saveAllPlayerPositions().finally(() => process.exit(0));
});

process.on("SIGINT", () => {
  void saveAllPlayerPositions().finally(() => process.exit(0));
});

void bootstrap().catch((error) => {
  logError("bootstrap failed", error);
});
mp.events.add("playerQuit", (player: PlayerMp) => {
    inventoryService.cleanupPlayer(player);
});
