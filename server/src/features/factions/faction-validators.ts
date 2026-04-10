import type { CreateFactionDto, SetFactionRankNameDto } from "./faction-dtos.js";
import type { FactionType } from "./faction.js";

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const VALID_TYPES: FactionType[] = ["mafia", "gang", "state"];

export function validateCreateFactionDto(dto: CreateFactionDto): ValidationResult {
  if (!VALID_TYPES.includes(dto.type)) {
    return { ok: false, message: "Fraktionstyp muss mafia, gang oder state sein." };
  }

  if (dto.shortName.length < 2 || dto.shortName.length > 8) {
    return { ok: false, message: "Kurzname muss 2 bis 8 Zeichen haben." };
  }

  if (dto.name.length < 3 || dto.name.length > 48) {
    return { ok: false, message: "Fraktionsname muss 3 bis 48 Zeichen haben." };
  }

  if (!/^#[0-9A-F]{6}$/.test(dto.colorHex)) {
    return { ok: false, message: "Farbe muss als Hexwert wie #AA1122 angegeben werden." };
  }

  return { ok: true };
}

export function validateSetFactionRankNameDto(dto: SetFactionRankNameDto): ValidationResult {
  if (dto.rankLevel < 1 || dto.rankLevel > 6) {
    return { ok: false, message: "Rang muss zwischen 1 und 6 liegen." };
  }

  if (dto.rankName.length < 2 || dto.rankName.length > 32) {
    return { ok: false, message: "Rangname muss 2 bis 32 Zeichen haben." };
  }

  return { ok: true };
}
