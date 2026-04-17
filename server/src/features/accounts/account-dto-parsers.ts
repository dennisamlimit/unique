import type {
  CompleteCharacterDto,
  LoginAccountDto,
  RegisterAccountDto,
  SavePlayerStateDto
} from "./account-dtos.js";
import { normalizeString, normalizeOptionalString } from "../../shared/normalize.js";

type PlayerIdentitySource = {
  socialClubId: string | null;
  socialClubName: string | null;
};

export function parseRegisterAccountDto(
  raw: { email: unknown; password: unknown; repeatPassword: unknown },
  playerIdentity: PlayerIdentitySource
): RegisterAccountDto {
  return {
    email: normalizeString(raw.email),
    password: normalizeString(raw.password),
    repeatPassword: normalizeString(raw.repeatPassword),
    socialClubId: playerIdentity.socialClubId,
    socialClubName: playerIdentity.socialClubName
  };
}

export function parseLoginAccountDto(
  raw: { email: unknown; password: unknown },
  playerIdentity: PlayerIdentitySource
): LoginAccountDto {
  return {
    email: normalizeString(raw.email),
    password: normalizeString(raw.password),
    socialClubId: playerIdentity.socialClubId,
    socialClubName: playerIdentity.socialClubName
  };
}

export function parseCompleteCharacterDto(characterJson: string): CompleteCharacterDto {
  const character = JSON.parse(characterJson);

  return {
    firstName: normalizeString(character.firstname),
    lastName: normalizeString(character.lastname),
    birthDate: normalizeOptionalString(character.birth),
    origin: normalizeOptionalString(character.origin),
    customizationJson: characterJson
  };
}

export function parseSavePlayerStateDto(raw: {
  posX: unknown;
  posY: unknown;
  posZ: unknown;
  rotZ: unknown;
  dimension: unknown;
  health: unknown;
  armor: unknown;
  cash: unknown;
  bankCash: unknown;
}): SavePlayerStateDto {
  return {
    posX: Number(raw.posX),
    posY: Number(raw.posY),
    posZ: Number(raw.posZ),
    rotZ: Number(raw.rotZ),
    dimension: Number(raw.dimension),
    health: Number(raw.health),
    armor: Number(raw.armor),
    cash: Number(raw.cash),
    bankCash: Number(raw.bankCash)
  };
}
