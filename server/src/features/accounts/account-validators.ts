import type { CompleteCharacterDto, LoginAccountDto, RegisterAccountDto } from "./api/account-dtos.js";
import { AccountService } from "./account-service.js";

export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateRegisterAccountDto(
  dto: RegisterAccountDto,
  accountService: AccountService
): ValidationResult {
  if (!accountService.isValidEmail(dto.email)) {
    return { ok: false, message: "E-Mail ist ungueltig." };
  }

  if (!dto.password || dto.password.length < 6) {
    return { ok: false, message: "Passwort muss mindestens 6 Zeichen haben." };
  }

  if (dto.password !== dto.repeatPassword) {
    return { ok: false, message: "Passwoerter stimmen nicht ueberein." };
  }

  return { ok: true };
}

export function validateLoginAccountDto(
  dto: LoginAccountDto,
  accountService: AccountService
): ValidationResult {
  if (!accountService.isValidEmail(dto.email) || !dto.password) {
    return { ok: false, message: "Bitte gueltige Login-Daten eingeben." };
  }

  return { ok: true };
}

export function validateCompleteCharacterDto(
  dto: CompleteCharacterDto,
  accountService: AccountService
): ValidationResult {
  if (!accountService.isValidName(dto.firstName) || !accountService.isValidName(dto.lastName)) {
    return { ok: false, message: "Charakter konnte nicht gespeichert werden." };
  }

  return { ok: true };
}
