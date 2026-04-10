import type {
  AssignFactionMemberDto,
  CreateFactionDto,
  SetFactionLeaderDto,
  SetFactionRankNameDto
} from "./faction-dtos.js";
import type { FactionType } from "./faction.js";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCreateFactionDto(parts: string[], args: string): CreateFactionDto | null {
  const type = normalizeString(parts[1]).toLowerCase() as FactionType;
  const shortName = normalizeString(parts[2]).toUpperCase();
  const remainder = args.replace(parts[1] ?? "", "").replace(parts[2] ?? "", "").trim();
  const colorMatch = remainder.match(/(#[0-9a-fA-F]{6})$/);
  const colorHex = colorMatch ? colorMatch[1].toUpperCase() : "";
  const name = colorMatch ? remainder.slice(0, remainder.length - colorHex.length).trim() : remainder;

  if (!type || !shortName || !name || !colorHex) {
    return null;
  }

  return { type, shortName, name, colorHex };
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

export function parseAssignFactionMemberDto(factionId: number, accountId: number, rankLevel: number): AssignFactionMemberDto {
  return { factionId, accountId, rankLevel };
}
