import { FactionService } from "./faction-service.js";
import {
  parseAssignFactionMemberDto,
  parseCreateFactionDto,
  parseCreateFactionOutfitDto,
  parseCreateFactionStoragePointDto,
  parseCreateFactionVehicleDto,
  parseCreateFactionWardrobePointDto,
  parseSetFactionLeaderDto,
  parseSetFactionRankNameDto,
  parseSetFactionRankPermissionDto,
  parseSetFactionSpawnDto
} from "./api/faction-dto-parsers.js";
import {
  validateCreateFactionDto,
  validateCreateFactionOutfitDto,
  validateCreateFactionStoragePointDto,
  validateCreateFactionVehicleDto,
  validateCreateFactionWardrobePointDto,
  validateSetFactionRankNameDto,
  validateSetFactionRankPermissionDto
} from "./faction-validators.js";
import type { PlayerMp } from "../../runtime/helpers.js";

export type FactionEventDeps = {
  factions: FactionService;
  logError: (message: string, error: unknown) => void;
  systemMessage: (player: PlayerMp, message: string) => void;
  hasAdminLevel: (player: PlayerMp, level: number) => boolean;
  getVar: (player: PlayerMp, key: string, fallback: unknown) => unknown;
  spawnFactionVehicle?: (factionVehicleId: number) => Promise<void>;
  despawnFactionVehicle?: (factionVehicleId: number) => void;
  syncOnlineFactionMember?: (accountId: number) => Promise<void>;
  syncFactionMapBlips?: () => Promise<void>;
};

function formatPoint(x: number, y: number, z: number, rotZ: number, dimension: number) {
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)} | RotZ ${rotZ.toFixed(2)} | Dimension ${dimension}`;
}

function getWardrobeCategoryPermission(category: string) {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  return !normalizedCategory || normalizedCategory === "dienst"
    ? "wardrobe_access"
    : `wardrobe_category_${normalizedCategory}`;
}

export async function handleFactionAdminCommand(
  player: PlayerMp,
  command: string,
  parts: string[],
  args: string,
  deps: FactionEventDeps
): Promise<boolean> {
  const { factions, logError, systemMessage, hasAdminLevel } = deps;

  const ensureLevel = (level: number) => {
    if (!hasAdminLevel(player, level)) {
      systemMessage(player, `Dafuer benoetigst du Admin-Level ${level}.`);
      return false;
    }
    return true;
  };

  switch (command) {
    case "createfaction": {
      if (!ensureLevel(10)) return true;

      const dto = parseCreateFactionDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /createfaction [mafia|gang|state] [KUERZEL] [iconId optional] [Name] [#RRGGBB]");
        return true;
      }

      const validation = validateCreateFactionDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const faction = await factions.create(dto);
        systemMessage(player, `Fraktion erstellt: [${faction.shortName}] ${faction.name} (ID ${faction.factionId})`);
        await deps.syncFactionMapBlips?.();
      } catch (error) {
        logError("createfaction failed", error);
        systemMessage(player, "Fraktion konnte nicht erstellt werden. Name oder Kuerzel bereits vergeben.");
      }

      return true;
    }

    case "deletefaction": {
      if (!ensureLevel(10)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /deletefaction [fraktionId]");
        return true;
      }

      try {
        const faction = await factions.getById(factionId);
        if (!faction) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        await factions.delete(factionId);
        systemMessage(player, `Fraktion geloescht: [${faction.shortName}] ${faction.name}`);
        await deps.syncFactionMapBlips?.();
      } catch (error) {
        logError("deletefaction failed", error);
        systemMessage(player, "Fraktion konnte nicht geloescht werden.");
      }

      return true;
    }

    case "factions": {
      if (!ensureLevel(1)) return true;

      try {
        const all = await factions.getAll();
        if (all.length === 0) {
          systemMessage(player, "Keine Fraktionen vorhanden.");
          return true;
        }

        systemMessage(player, `Fraktionen (${all.length}):`);
        for (const faction of all) {
          systemMessage(player, `ID ${faction.factionId} | [${faction.shortName}] ${faction.name} | ${faction.type} | ${faction.colorHex} | Icon ${faction.mapIconId}`);
        }
      } catch (error) {
        logError("factions list failed", error);
        systemMessage(player, "Fraktionsliste konnte nicht geladen werden.");
      }

      return true;
    }

    case "setfactionleader":
    case "factionsetleader": {
      if (!ensureLevel(10)) return true;

      const dto = parseSetFactionLeaderDto(parts);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionleader [accountId] [fraktionId]");
        return true;
      }

      try {
        const membership = await factions.setFactionLeader(dto.factionId, dto.accountId);
        if (!membership) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        await deps.syncOnlineFactionMember?.(dto.accountId);
        systemMessage(player, `Account ${dto.accountId} ist jetzt Anfuehrer von Fraktion ${dto.factionId}.`);
      } catch (error) {
        logError("setfactionleader failed", error);
        systemMessage(player, "Anfuehrer konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "setfactionicon": {
      if (!ensureLevel(10)) return true;

      const factionId = Number(parts[1]);
      const mapIconId = Number(parts[2] ?? 0);
      if (!Number.isInteger(factionId) || !Number.isInteger(mapIconId) || mapIconId < 0 || mapIconId > 999) {
        systemMessage(player, "Nutze: /setfactionicon [fraktionId] [iconId|0]");
        return true;
      }

      try {
        const faction = await factions.setMapIcon(factionId, mapIconId);
        if (!faction) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        await deps.syncFactionMapBlips?.();
        systemMessage(player, mapIconId > 0
          ? `Fraktionsicon fuer [${faction.shortName}] auf ${mapIconId} gesetzt.`
          : `Fraktionsicon fuer [${faction.shortName}] entfernt.`);
      } catch (error) {
        logError("setfactionicon failed", error);
        systemMessage(player, "Fraktionsicon konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "setfactionrankname": {
      if (!ensureLevel(10)) return true;

      const dto = parseSetFactionRankNameDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionrankname [fraktionId] [rang 1-20] [name]");
        return true;
      }

      const validation = validateSetFactionRankNameDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const rank = await factions.setRankName(dto);
        if (!rank) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Rang ${dto.rankLevel} in Fraktion ${dto.factionId} heisst jetzt: ${dto.rankName}`);
      } catch (error) {
        logError("setfactionrankname failed", error);
        systemMessage(player, "Rangname konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "deletefactionrank": {
      if (!ensureLevel(10)) return true;

      const factionId = Number(parts[1]);
      const rankLevel = Number(parts[2]);
      if (!Number.isInteger(factionId) || !Number.isInteger(rankLevel)) {
        systemMessage(player, "Nutze: /deletefactionrank [fraktionId] [rang]");
        return true;
      }

      try {
        const deleted = await factions.deleteRank(factionId, rankLevel);
        if (!deleted.ok) {
          systemMessage(player, deleted.reason === "rank_in_use" ? "Auf diesem Rang sind noch Mitglieder." : "Fraktion oder Rang nicht gefunden.");
          return true;
        }

        systemMessage(player, `Rang ${rankLevel} aus Fraktion ${factionId} geloescht.`);
      } catch (error) {
        logError("deletefactionrank failed", error);
        systemMessage(player, "Rang konnte nicht geloescht werden.");
      }

      return true;
    }

    case "setfactionrankperm": {
      if (!ensureLevel(10)) return true;

      const dto = parseSetFactionRankPermissionDto(parts);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionrankperm [fraktionId] [rang] [recht] [1|0]");
        return true;
      }

      const validation = validateSetFactionRankPermissionDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const saved = await factions.setRankPermission(dto);
        if (dto.granted && !saved) {
          systemMessage(player, "Fraktion oder Rang nicht gefunden.");
          return true;
        }

        systemMessage(player, `Recht ${dto.permissionKey} fuer Fraktion ${dto.factionId} Rang ${dto.rankLevel}: ${dto.granted ? "aktiv" : "entfernt"}`);
      } catch (error) {
        logError("setfactionrankperm failed", error);
        systemMessage(player, "Recht konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "factionrankperms": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      const rankLevel = Number(parts[2]);
      if (!Number.isInteger(factionId) || !Number.isInteger(rankLevel)) {
        systemMessage(player, "Nutze: /factionrankperms [fraktionId] [rang]");
        return true;
      }

      try {
        const permissions = await factions.getRankPermissions(factionId, rankLevel);
        systemMessage(
          player,
          permissions.length > 0
            ? `Rechte Rang ${rankLevel}: ${permissions.map((permission) => permission.permissionKey).join(", ")}`
            : `Rang ${rankLevel} hat keine Rechte gesetzt.`
        );
      } catch (error) {
        logError("factionrankperms failed", error);
        systemMessage(player, "Rechte konnten nicht geladen werden.");
      }

      return true;
    }

    case "setfactionmember":
    case "setfactionrank": {
      if (!ensureLevel(5)) return true;

      const factionId = Number(parts[1]);
      const accountId = Number(parts[2]);
      const rankLevel = Number(parts[3] ?? 1);

      if (!Number.isInteger(factionId) || !Number.isInteger(accountId) || !Number.isInteger(rankLevel)) {
        systemMessage(player, "Nutze: /setfactionmember [fraktionId] [accountId] [rang]");
        return true;
      }

      try {
        const dto = parseAssignFactionMemberDto(factionId, accountId, Math.max(1, rankLevel));
        const membership = await factions.assignMember(dto);
        if (!membership) {
          systemMessage(player, "Fraktion oder Rang nicht gefunden.");
          return true;
        }

        await deps.syncOnlineFactionMember?.(accountId);
        systemMessage(player, `Account ${accountId} wurde Fraktion ${factionId} mit Rang ${membership.rankLevel} zugewiesen.`);
      } catch (error) {
        logError("setfactionmember failed", error);
        systemMessage(player, "Mitglied konnte nicht zugewiesen werden.");
      }

      return true;
    }

    case "removefactionmember": {
      if (!ensureLevel(5)) return true;

      const accountId = Number(parts[1]);
      if (!Number.isInteger(accountId)) {
        systemMessage(player, "Nutze: /removefactionmember [accountId]");
        return true;
      }

      try {
        const removed = await factions.removeMember(accountId);
        if (!removed) {
          systemMessage(player, "Account ist kein Fraktionsmitglied.");
          return true;
        }

        await deps.syncOnlineFactionMember?.(accountId);
        systemMessage(player, `Account ${accountId} wurde aus seiner Fraktion entfernt.`);
      } catch (error) {
        logError("removefactionmember failed", error);
        systemMessage(player, "Mitglied konnte nicht entfernt werden.");
      }

      return true;
    }

    case "setfactionspawn": {
      if (!ensureLevel(5)) return true;

      const dto = parseSetFactionSpawnDto(parts);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionspawn [fraktionId]");
        return true;
      }

      try {
        const spawn = await factions.saveFactionSpawnFromPlayer(dto.factionId, player);
        if (!spawn) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Fraktionsspawn gesetzt: ${formatPoint(spawn.x, spawn.y, spawn.z, spawn.rotZ, spawn.dimension)}`);
        await deps.syncFactionMapBlips?.();
      } catch (error) {
        logError("setfactionspawn failed", error);
        systemMessage(player, "Fraktionsspawn konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "factionspawn": {
      if (!ensureLevel(1)) return true;

      const dto = parseSetFactionSpawnDto(parts);
      if (!dto) {
        systemMessage(player, "Nutze: /factionspawn [fraktionId]");
        return true;
      }

      try {
        const spawn = await factions.getFactionSpawn(dto.factionId);
        if (!spawn) {
          systemMessage(player, "Kein Fraktionsspawn vorhanden.");
          return true;
        }

        systemMessage(player, `Fraktionsspawn: ${formatPoint(spawn.x, spawn.y, spawn.z, spawn.rotZ, spawn.dimension)}`);
      } catch (error) {
        logError("factionspawn failed", error);
        systemMessage(player, "Fraktionsspawn konnte nicht geladen werden.");
      }

      return true;
    }

    case "addfactionstorage": {
      systemMessage(player, "Lagersystem ist vorerst deaktiviert.");
      return true;
    }

    case "removefactionstorage": {
      if (!ensureLevel(5)) return true;

      const storagePointId = Number(parts[1]);
      if (!Number.isInteger(storagePointId)) {
        systemMessage(player, "Nutze: /removefactionstorage [storagePointId]");
        return true;
      }

      try {
        const deleted = await factions.deleteStoragePoint(storagePointId);
        if (!deleted) {
          systemMessage(player, "Lagerpunkt nicht gefunden.");
          return true;
        }

        systemMessage(player, `Lagerpunkt ${storagePointId} geloescht.`);
      } catch (error) {
        logError("removefactionstorage failed", error);
        systemMessage(player, "Lagerpunkt konnte nicht geloescht werden.");
      }

      return true;
    }

    case "factionstorages": {
      systemMessage(player, "Lagersystem ist vorerst deaktiviert.");
      return true;
    }

    case "addfactionwardrobe": {
      if (!ensureLevel(5)) return true;

      const dto = parseCreateFactionWardrobePointDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /addfactionwardrobe [fraktionId] [name]");
        return true;
      }

      const validation = validateCreateFactionWardrobePointDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const created = await factions.createWardrobePointFromPlayer(dto, player);
        if (!created.ok) {
          systemMessage(player, created.reason === "wardrobe_state_only" ? "Kleidungskammern sind nur fuer state-Fraktionen erlaubt." : "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Kleidungskammer erstellt: ID ${created.point.wardrobePointId} | ${created.point.label}`);
      } catch (error) {
        logError("addfactionwardrobe failed", error);
        systemMessage(player, "Kleidungskammer konnte nicht erstellt werden.");
      }

      return true;
    }

    case "removefactionwardrobe": {
      if (!ensureLevel(5)) return true;

      const wardrobePointId = Number(parts[1]);
      if (!Number.isInteger(wardrobePointId)) {
        systemMessage(player, "Nutze: /removefactionwardrobe [wardrobePointId]");
        return true;
      }

      try {
        const deleted = await factions.deleteWardrobePoint(wardrobePointId);
        if (!deleted) {
          systemMessage(player, "Kleidungskammer nicht gefunden.");
          return true;
        }

        systemMessage(player, `Kleidungskammer ${wardrobePointId} geloescht.`);
      } catch (error) {
        logError("removefactionwardrobe failed", error);
        systemMessage(player, "Kleidungskammer konnte nicht geloescht werden.");
      }

      return true;
    }

    case "factionwardrobes": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /factionwardrobes [fraktionId]");
        return true;
      }

      try {
        const wardrobes = await factions.getWardrobePoints(factionId);
        if (wardrobes.length === 0) {
          systemMessage(player, "Keine Kleidungskammern vorhanden.");
          return true;
        }

        systemMessage(player, `Kleidungskammern (${wardrobes.length}):`);
        for (const wardrobe of wardrobes) {
          systemMessage(player, `ID ${wardrobe.wardrobePointId} | ${wardrobe.label} | ${formatPoint(wardrobe.x, wardrobe.y, wardrobe.z, wardrobe.rotZ, wardrobe.dimension)}`);
        }
      } catch (error) {
        logError("factionwardrobes failed", error);
        systemMessage(player, "Kleidungskammern konnten nicht geladen werden.");
      }

      return true;
    }

    case "addfactionoutfit": {
      if (!ensureLevel(5)) return true;

      const dto = parseCreateFactionOutfitDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /addfactionoutfit [fraktionId] [category] [name] [topD] [topT] [underD] [underT] [pantsD] [pantsT] [shoesD] [shoesT]");
        return true;
      }

      const validation = validateCreateFactionOutfitDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const created = await factions.createOutfit(dto);
        if (!created.ok) {
          systemMessage(player, created.reason === "wardrobe_state_only" ? "Fraktionsoutfits sind nur fuer state-Fraktionen erlaubt." : "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Outfit erstellt: ID ${created.outfit.outfitId} | ${created.outfit.category} | ${created.outfit.name}`);
      } catch (error) {
        logError("addfactionoutfit failed", error);
        systemMessage(player, "Outfit konnte nicht erstellt werden.");
      }

      return true;
    }

    case "removefactionoutfit": {
      if (!ensureLevel(5)) return true;

      const outfitId = Number(parts[1]);
      if (!Number.isInteger(outfitId)) {
        systemMessage(player, "Nutze: /removefactionoutfit [outfitId]");
        return true;
      }

      try {
        const deleted = await factions.deleteOutfit(outfitId);
        if (!deleted) {
          systemMessage(player, "Outfit nicht gefunden.");
          return true;
        }

        systemMessage(player, `Outfit ${outfitId} geloescht.`);
      } catch (error) {
        logError("removefactionoutfit failed", error);
        systemMessage(player, "Outfit konnte nicht geloescht werden.");
      }

      return true;
    }

    case "factionoutfits": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /factionoutfits [fraktionId]");
        return true;
      }

      try {
        const outfits = await factions.getOutfits(factionId);
        if (outfits.length === 0) {
          systemMessage(player, "Keine Outfits vorhanden.");
          return true;
        }

        systemMessage(player, `Outfits (${outfits.length}):`);
        for (const outfit of outfits) {
          systemMessage(player, `ID ${outfit.outfitId} | ${outfit.category} | ${outfit.name} | Recht: ${getWardrobeCategoryPermission(outfit.category)}`);
        }
      } catch (error) {
        logError("factionoutfits failed", error);
        systemMessage(player, "Outfits konnten nicht geladen werden.");
      }

      return true;
    }

    case "createfactionvehicle": {
      if (!ensureLevel(5)) return true;

      const dto = parseCreateFactionVehicleDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /createfactionvehicle [fraktionId] [minRang] [modell] [name]");
        return true;
      }

      const validation = validateCreateFactionVehicleDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const vehicle = await factions.createFactionVehicleFromPlayer(dto, player);
        if (!vehicle) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        await deps.spawnFactionVehicle?.(vehicle.factionVehicleId);

        systemMessage(player, `Fraktionsfahrzeug erstellt: ID ${vehicle.factionVehicleId} | ${vehicle.displayName} | Rang ${vehicle.minRankLevel}+`);
      } catch (error) {
        logError("createfactionvehicle failed", error);
        systemMessage(player, "Fraktionsfahrzeug konnte nicht erstellt werden.");
      }

      return true;
    }

    case "factionvehicles": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /factionvehicles [fraktionId]");
        return true;
      }

      try {
        const vehicles = await factions.getFactionVehicles(factionId);
        if (vehicles.length === 0) {
          systemMessage(player, "Keine Fraktionsfahrzeuge vorhanden.");
          return true;
        }

        systemMessage(player, `Fraktionsfahrzeuge (${vehicles.length}):`);
        for (const vehicle of vehicles) {
          systemMessage(player, `ID ${vehicle.factionVehicleId} | ${vehicle.displayName} | Model ${vehicle.modelName} | Rang ${vehicle.minRankLevel}+`);
        }
      } catch (error) {
        logError("factionvehicles failed", error);
        systemMessage(player, "Fraktionsfahrzeuge konnten nicht geladen werden.");
      }

      return true;
    }

    case "setfactionvehiclerank": {
      if (!ensureLevel(5)) return true;

      const factionVehicleId = Number(parts[1]);
      const minRankLevel = Number(parts[2]);
      if (!Number.isInteger(factionVehicleId) || !Number.isInteger(minRankLevel)) {
        systemMessage(player, "Nutze: /setfactionvehiclerank [vehicleId] [rang]");
        return true;
      }

      try {
        const vehicle = await factions.updateFactionVehicleMinRank(factionVehicleId, minRankLevel);
        if (!vehicle) {
          systemMessage(player, "Fraktionsfahrzeug nicht gefunden.");
          return true;
        }

        systemMessage(player, `Fraktionsfahrzeug ${vehicle.factionVehicleId} hat jetzt Ranglimit ${vehicle.minRankLevel}+.`);
      } catch (error) {
        logError("setfactionvehiclerank failed", error);
        systemMessage(player, "Fahrzeugrang konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "deletefactionvehicle": {
      if (!ensureLevel(5)) return true;

      const factionVehicleId = Number(parts[1]);
      if (!Number.isInteger(factionVehicleId)) {
        systemMessage(player, "Nutze: /deletefactionvehicle [vehicleId]");
        return true;
      }

      try {
        const deleted = await factions.deleteFactionVehicle(factionVehicleId);
        if (!deleted) {
          systemMessage(player, "Fraktionsfahrzeug nicht gefunden.");
          return true;
        }

        deps.despawnFactionVehicle?.(factionVehicleId);

        systemMessage(player, `Fraktionsfahrzeug ${factionVehicleId} geloescht.`);
      } catch (error) {
        logError("deletefactionvehicle failed", error);
        systemMessage(player, "Fraktionsfahrzeug konnte nicht geloescht werden.");
      }

      return true;
    }

    case "syncfactiondefaults": {
      if (!ensureLevel(10)) return true;

      const rawTarget = String(parts[1] ?? "all").trim().toLowerCase();
      try {
        if (!rawTarget || rawTarget === "all") {
          const result = await factions.syncDefaultPermissionsForAll();
          systemMessage(player, `Default-Rechte auf ${result.synced} Fraktionen angewendet.`);
          return true;
        }

        const factionId = Number(rawTarget);
        if (!Number.isInteger(factionId)) {
          systemMessage(player, "Nutze: /syncfactiondefaults [fraktionId|all]");
          return true;
        }

        const result = await factions.syncDefaultPermissions(factionId);
        if (!result.ok) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Default-Rechte auf Fraktion ${result.faction.factionId} [${result.faction.shortName}] angewendet.`);
      } catch (error) {
        logError("syncfactiondefaults failed", error);
        systemMessage(player, "Default-Rechte konnten nicht angewendet werden.");
      }

      return true;
    }

    case "myfaction": {
      const accountId = Number(deps.getVar(player, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        systemMessage(player, "Kein Account gefunden.");
        return true;
      }

      try {
        const profile = await factions.getMemberProfile(accountId);
        if (!profile) {
          systemMessage(player, "Du bist in keiner Fraktion.");
          return true;
        }

        const permissions = await factions.getAccountPermissions(accountId);
        systemMessage(player, `[${profile.factionShortName}] ${profile.factionName} | Rang ${profile.rankLevel}: ${profile.rankName}`);
        systemMessage(player, permissions.length > 0 ? `Rechte: ${permissions.map((permission) => permission.permissionKey).join(", ")}` : "Rechte: keine");
      } catch (error) {
        logError("myfaction failed", error);
        systemMessage(player, "Fraktionsdaten konnten nicht geladen werden.");
      }

      return true;
    }

    case "addcatalogvehicle": {
      if (!ensureLevel(10)) return true;

      const model = parts[1];
      const price = Number(parts[2]);
      const displayName = args.split(" ").slice(2).join(" ").split("|")[0]?.trim();
      const imageUrl = args.split("|")[1]?.trim() || null;

      if (!model || !Number.isInteger(price) || !displayName) {
        systemMessage(player, "Nutze: /addcatalogvehicle [modell] [preis] [name] | [bildUrl optional]");
        return true;
      }

      try {
        const item = await factions.addCatalogItem({ modelName: model, displayName, price, imageUrl });
        systemMessage(player, `Katalog-Fahrzeug hinzugefuegt: ID ${item.catalogId} | ${item.displayName} | $${item.price.toLocaleString()}`);
      } catch (error) {
        logError("addcatalogvehicle failed", error);
        systemMessage(player, "Katalog-Fahrzeug konnte nicht hinzugefuegt werden.");
      }

      return true;
    }

    case "removecatalogvehicle": {
      if (!ensureLevel(10)) return true;

      const catalogId = Number(parts[1]);
      if (!Number.isInteger(catalogId)) {
        systemMessage(player, "Nutze: /removecatalogvehicle [catalogId]");
        return true;
      }

      try {
        const deleted = await factions.deleteCatalogItem(catalogId);
        if (!deleted) {
          systemMessage(player, "Katalog-Fahrzeug nicht gefunden.");
          return true;
        }

        systemMessage(player, `Katalog-Fahrzeug ${catalogId} geloescht.`);
      } catch (error) {
        logError("removecatalogvehicle failed", error);
        systemMessage(player, "Katalog-Fahrzeug konnte nicht geloescht werden.");
      }

      return true;
    }

    case "catalogvehicles": {
      if (!ensureLevel(1)) return true;

      try {
        const catalog = await factions.getVehicleCatalog();
        if (catalog.length === 0) {
          systemMessage(player, "Fahrzeugkatalog ist leer.");
          return true;
        }

        systemMessage(player, `Fahrzeugkatalog (${catalog.length}):`);
        for (const item of catalog) {
          systemMessage(player, `ID ${item.catalogId} | ${item.displayName} (${item.modelName}) | $${item.price.toLocaleString()}`);
        }
      } catch (error) {
        logError("catalogvehicles failed", error);
        systemMessage(player, "Fahrzeugkatalog konnte nicht geladen werden.");
      }

      return true;
    }

    case "factioninfo": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /factioninfo [fraktionId]");
        return true;
      }

      try {
        const faction = await factions.getById(factionId);
        if (!faction) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        const ranks = await factions.getRanks(factionId);
        const members = await factions.getMembersByFactionId(factionId);
        const spawn = await factions.getFactionSpawn(factionId);
        const wardrobes = await factions.getWardrobePoints(factionId);
        const outfits = await factions.getOutfits(factionId);

        systemMessage(player, `[${faction.shortName}] ${faction.name} | ${faction.type} | ${faction.colorHex} | Icon ${faction.mapIconId}`);
        systemMessage(player, `Mitglieder: ${members.length} | Kleidungskammern: ${wardrobes.length} | Outfits: ${outfits.length} | Spawn: ${spawn ? "gesetzt" : "nicht gesetzt"}`);

        for (const rank of ranks) {
          const permissions = await factions.getRankPermissions(factionId, rank.rankLevel);
          systemMessage(
            player,
            `Rang ${rank.rankLevel}: ${rank.rankName} | Rechte: ${permissions.length > 0 ? permissions.map((permission) => permission.permissionKey).join(", ") : "keine"}`
          );
        }
      } catch (error) {
        logError("factioninfo failed", error);
        systemMessage(player, "Fraktionsinfo konnte nicht geladen werden.");
      }

      return true;
    }

    default:
      return false;
  }
}
