import type {
  CreateFactionDto,
  CreateFactionOutfitDto,
  CreateFactionStoragePointDto,
  CreateFactionVehicleDto,
  CreateFactionWardrobePointDto,
  SetFactionRankNameDto,
  SetFactionRankPermissionDto
} from "./api/faction-dtos.js";
import type { FactionStorageType, FactionType } from "./faction.js";

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

const VALID_TYPES: FactionType[] = ["mafia", "gang", "state"];
const VALID_STORAGE_TYPES: FactionStorageType[] = ["storage", "armory", "drugs"];

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

  if (!Number.isInteger(dto.mapIconId) || dto.mapIconId < 0 || dto.mapIconId > 999) {
    return { ok: false, message: "Map-Icon muss 0 oder eine gueltige GTA-Blip-ID zwischen 1 und 999 sein." };
  }

  return { ok: true };
}

export function validateSetFactionRankNameDto(dto: SetFactionRankNameDto): ValidationResult {
  if (dto.rankLevel < 1 || dto.rankLevel > 20) {
    return { ok: false, message: "Rang muss zwischen 1 und 20 liegen." };
  }

  if (dto.rankName.length < 2 || dto.rankName.length > 32) {
    return { ok: false, message: "Rangname muss 2 bis 32 Zeichen haben." };
  }

  return { ok: true };
}

export function validateSetFactionRankPermissionDto(dto: SetFactionRankPermissionDto): ValidationResult {
  if (dto.rankLevel < 1 || dto.rankLevel > 20) {
    return { ok: false, message: "Rang muss zwischen 1 und 20 liegen." };
  }

  if (!/^[a-z0-9_]{3,32}$/.test(dto.permissionKey)) {
    return { ok: false, message: "Recht muss 3 bis 32 Zeichen haben und nur Kleinbuchstaben, Zahlen oder _ enthalten." };
  }

  return { ok: true };
}

export function validateCreateFactionStoragePointDto(dto: CreateFactionStoragePointDto): ValidationResult {
  if (!VALID_STORAGE_TYPES.includes(dto.storageType as FactionStorageType)) {
    return { ok: false, message: "Lagertyp muss storage, armory oder drugs sein." };
  }

  if (dto.label.length < 2 || dto.label.length > 32) {
    return { ok: false, message: "Lagername muss 2 bis 32 Zeichen haben." };
  }

  return { ok: true };
}

export function validateCreateFactionWardrobePointDto(dto: CreateFactionWardrobePointDto): ValidationResult {
  if (dto.label.length < 2 || dto.label.length > 32) {
    return { ok: false, message: "Kammername muss 2 bis 32 Zeichen haben." };
  }

  return { ok: true };
}

export function validateCreateFactionOutfitDto(dto: CreateFactionOutfitDto): ValidationResult {
  if (!/^[a-z0-9_-]{2,24}$/.test(dto.category)) {
    return { ok: false, message: "Kategorie muss 2 bis 24 Zeichen haben und nur Kleinbuchstaben, Zahlen, - oder _ enthalten." };
  }

  if (dto.name.length < 2 || dto.name.length > 32) {
    return { ok: false, message: "Outfitname muss 2 bis 32 Zeichen haben." };
  }

  if (!Array.isArray(dto.clothing) || dto.clothing.length !== 4) {
    return { ok: false, message: "Outfit muss 4 Kleidungs-Slots enthalten." };
  }

  if (dto.clothing.some((slot) => !Array.isArray(slot) || slot.length !== 2 || slot.some((value) => !Number.isInteger(value) || value < 0))) {
    return { ok: false, message: "Kleidungswerte muessen gueltige Ganzzahlen sein." };
  }

  return { ok: true };
}

export function validateCreateFactionVehicleDto(dto: CreateFactionVehicleDto): ValidationResult {
  if (dto.minRankLevel < 1 || dto.minRankLevel > 20) {
    return { ok: false, message: "Fahrzeug-Rang muss zwischen 1 und 20 liegen." };
  }

  if (!/^[a-z0-9_]{2,32}$/.test(dto.modelName)) {
    return { ok: false, message: "Fahrzeugmodell ist ungueltig." };
  }

  if (dto.displayName.length < 2 || dto.displayName.length > 32) {
    return { ok: false, message: "Fahrzeugname muss 2 bis 32 Zeichen haben." };
  }

  return { ok: true };
}
