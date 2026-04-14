import type {
  AssignFactionMemberDto,
  CreateFactionVehicleDto,
  CreateFactionOutfitDto,
  CreateFactionStoragePointDto,
  CreateFactionWardrobePointDto,
  CreateFactionDto,
  SetFactionRankPermissionDto,
  SetFactionLeaderDto,
  SetFactionRankNameDto,
  SetFactionSpawnDto
} from "./faction-dtos.js";
import type { FactionType } from "../faction.js";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCreateFactionDto(parts: string[], args: string): CreateFactionDto | null {
  const type = normalizeString(parts[1]).toLowerCase() as FactionType;
  const shortName = normalizeString(parts[2]).toUpperCase();
  const thirdToken = normalizeString(parts[3]);
  const hasIconToken = /^\d+$/.test(thirdToken);
  const mapIconId = hasIconToken ? Number(thirdToken) : 0;
  const remainder = hasIconToken
    ? args.replace(parts[1] ?? "", "").replace(parts[2] ?? "", "").replace(parts[3] ?? "", "").trim()
    : args.replace(parts[1] ?? "", "").replace(parts[2] ?? "", "").trim();
  const colorMatch = remainder.match(/(#[0-9a-fA-F]{6})$/);
  const colorHex = colorMatch ? colorMatch[1].toUpperCase() : "";
  const name = colorMatch ? remainder.slice(0, remainder.length - colorHex.length).trim() : remainder;

  if (!type || !shortName || !name || !colorHex || !Number.isInteger(mapIconId)) {
    return null;
  }

  return { type, shortName, name, colorHex, mapIconId };
}

export function parseSetFactionLeaderDto(parts: string[]): SetFactionLeaderDto | null {
  const accountId = Number(parts[1]);
  const factionId = Number(parts[2]);
  if (!Number.isInteger(accountId) || !Number.isInteger(factionId)) {
    return null;
  }

  return { accountId, factionId };
}

export function parseSetFactionRankNameDto(parts: string[], args: string): SetFactionRankNameDto | null {
  const factionId = Number(parts[1]);
  const rankLevel = Number(parts[2]);
  const rankName = args.replace(parts[1] ?? "", "").replace(parts[2] ?? "", "").trim();

  if (!Number.isInteger(factionId) || !Number.isInteger(rankLevel) || !rankName) {
    return null;
  }

  return { factionId, rankLevel, rankName };
}

export function parseSetFactionRankPermissionDto(parts: string[]): SetFactionRankPermissionDto | null {
  const factionId = Number(parts[1]);
  const rankLevel = Number(parts[2]);
  const permissionKey = normalizeString(parts[3]).toLowerCase();
  const grantedToken = normalizeString(parts[4]).toLowerCase();

  if (!Number.isInteger(factionId) || !Number.isInteger(rankLevel) || !permissionKey || !grantedToken) {
    return null;
  }

  const granted = grantedToken === "1" || grantedToken === "true" || grantedToken === "yes" || grantedToken === "on";
  const denied = grantedToken === "0" || grantedToken === "false" || grantedToken === "no" || grantedToken === "off";
  if (!granted && !denied) {
    return null;
  }

  return { factionId, rankLevel, permissionKey, granted };
}

export function parseSetFactionSpawnDto(parts: string[]): SetFactionSpawnDto | null {
  const factionId = Number(parts[1]);
  if (!Number.isInteger(factionId)) {
    return null;
  }

  return { factionId };
}

export function parseCreateFactionStoragePointDto(parts: string[], args: string): CreateFactionStoragePointDto | null {
  const factionId = Number(parts[1]);
  const storageType = normalizeString(parts[2]).toLowerCase();
  const label = args.replace(parts[1] ?? "", "").replace(parts[2] ?? "", "").trim();

  if (!Number.isInteger(factionId) || !storageType) {
    return null;
  }

  return {
    factionId,
    storageType,
    label: label || storageType
  };
}

export function parseCreateFactionWardrobePointDto(parts: string[], args: string): CreateFactionWardrobePointDto | null {
  const factionId = Number(parts[1]);
  const label = args.replace(parts[1] ?? "", "").trim();

  if (!Number.isInteger(factionId)) {
    return null;
  }

  return {
    factionId,
    label: label || "Kleidungskammer"
  };
}

export function parseCreateFactionOutfitDto(parts: string[], args: string): CreateFactionOutfitDto | null {
  const factionId = Number(parts[1]);
  const category = normalizeString(parts[2]).toLowerCase();
  if (!Number.isInteger(factionId) || !category || parts.length < 12) {
    return null;
  }

  const values = parts.slice(-8).map((value) => Number(value));
  if (values.some((value) => !Number.isInteger(value))) {
    return null;
  }

  const name = parts.slice(3, -8).join(" ").trim();
  if (!name) {
    return null;
  }

  return {
    factionId,
    category,
    name,
    clothing: [
      [values[0], values[1]],
      [values[2], values[3]],
      [values[4], values[5]],
      [values[6], values[7]]
    ]
  };
}

export function parseCreateFactionVehicleDto(parts: string[], args: string): CreateFactionVehicleDto | null {
  const factionId = Number(parts[1]);
  const minRankLevel = Number(parts[2]);
  const modelName = normalizeString(parts[3]).toLowerCase();
  const displayName = parts.slice(4).join(" ").trim();

  if (!Number.isInteger(factionId) || !Number.isInteger(minRankLevel) || !modelName || !displayName) {
    return null;
  }

  return {
    factionId,
    minRankLevel,
    modelName,
    displayName
  };
}

export function parseAssignFactionMemberDto(factionId: number, accountId: number, rankLevel: number): AssignFactionMemberDto {
  return { factionId, accountId, rankLevel };
}
