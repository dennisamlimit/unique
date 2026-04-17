import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { clamp, clampMoney } from "../../runtime/helpers.js";
import type { Account } from "./account.js";
import { AccountRepository } from "./account-repository.js";
import { SpawnService } from "../world/spawn-service.js";
import type { CompleteCharacterDto, CreateAccountDto, SavePlayerStateDto } from "./api/account-dtos.js";
import { normalizeOptionalString, normalizeName } from "../../shared/normalize.js";

function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function parseCustomizationJson(raw: string | null) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

import { PhoneService } from "../phone/phone-service.js";

export class AccountService {
  private readonly repository = new AccountRepository();
  private readonly spawns = new SpawnService();
  private readonly phoneService?: PhoneService;

  constructor(phoneService?: PhoneService) {
      this.phoneService = phoneService;
  }

  isValidName(input?: string | null) {
    return /^[A-Za-z-]{2,24}$/.test(input?.trim() ?? "");
  }

  isValidEmail(input?: string | null) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input?.trim() ?? "");
  }

  async emailExists(email: string) {
    return this.repository.emailExists(email);
  }

  async socialClubExists(socialClubId: string) {
    return this.repository.socialClubExists(socialClubId);
  }

  async getById(accountId: number) {
    return this.repository.getById(accountId);
  }

  async getByEmail(email: string) {
    return this.repository.getByEmail(email);
  }

  async getBySocialClubId(socialClubId: string) {
    return this.repository.getBySocialClubId(socialClubId);
  }

  async getPersonalOutfits(accountId: number) {
    return this.repository.getPersonalOutfits(accountId);
  }

  async getPersonalOutfitById(outfitId: number, accountId: number) {
    return this.repository.getPersonalOutfitById(outfitId, accountId);
  }

  async createPersonalOutfit(accountId: number, name: string, clothingJson: string) {
    const count = await this.repository.countPersonalOutfits(accountId);
    if (count >= 20) return { ok: false as const, message: "Outfit-Limit (20) erreicht." };
    const outfit = await this.repository.createPersonalOutfit(accountId, name, clothingJson);
    return { ok: true as const, outfit };
  }

  async deletePersonalOutfit(outfitId: number, accountId: number) {
    return this.repository.deletePersonalOutfit(outfitId, accountId);
  }

  async create(dto: CreateAccountDto) {
    const spawn = await this.spawns.getSpawn();
    const salt = randomBytes(16).toString("hex");

    return this.repository.create({
      firstName: "Charakter",
      lastName: "Erstellen",
      email: dto.email.trim(),
      phoneNumber: null,
      socialClubName: normalizeOptionalString(dto.socialClubName),
      socialClubId: normalizeOptionalString(dto.socialClubId),
      passwordHash: hashPassword(dto.password, salt),
      passwordSalt: salt,
      characterCreated: false,
      birthDate: null,
      origin: null,
      customizationJson: null,
      adminLevel: 0,
      cash: 0,
      bankCash: 0,
      health: 100,
      armor: 0,
      dimension: spawn.dimension,
      posX: spawn.x,
      posY: spawn.y,
      posZ: spawn.z,
      rotZ: spawn.rotZ,
      isBanned: false,
      banReason: null,
      banDate: null,
      banExpiresAt: null,
      banAdminName: null,
      banAdminAccountId: 0
    });
  }

  verifyPassword(account: Account, password: string) {
    const incomingHash = hashPassword(password, account.passwordSalt);
    return timingSafeEqual(Buffer.from(incomingHash, "hex"), Buffer.from(account.passwordHash, "hex"));
  }

  isSocialClubMatch(account: Account, socialClubId?: string | null) {
    if (!account.socialClubId || !socialClubId) {
      return true;
    }

    return account.socialClubId === socialClubId;
  }

  async bindSocialClub(account: Account, name?: string | null, socialClubId?: string | null) {
    if (account.socialClubId || !socialClubId) {
      return account;
    }

    return this.repository.updateSocialClub(account.accountId, normalizeOptionalString(name), socialClubId);
  }

  async setBanState(accountId: number, banned: boolean, reason: string | null, expiresAt?: string | null, adminName?: string | null, adminAccountId?: number | null) {
    return this.repository.updateBanState(accountId, banned, reason, expiresAt, adminName, adminAccountId);
  }

  async completeCharacter(accountId: number, dto: CompleteCharacterDto) {
    return this.repository.updateCharacter(accountId, {
      firstName: normalizeName(dto.firstName),
      lastName: normalizeName(dto.lastName),
      characterCreated: true,
      birthDate: dto.birthDate,
      origin: dto.origin,
      customizationJson: dto.customizationJson
    });
  }

  async getByName(firstName: string, lastName: string) {
    return this.repository.getByName(firstName, lastName);
  }

  async savePlayerState(accountId: number, state: SavePlayerStateDto) {
    const customizationJson = normalizeOptionalString(state.customizationJson);
    const result = await this.repository.updateState(accountId, {
      cash: clampMoney(state.cash),
      bankCash: clampMoney(state.bankCash),
      health: clamp(state.health ?? 100, 0, 100),
      armor: clamp(state.armor ?? 0, 0, 100),
      dimension: state.dimension,
      posX: state.posX,
      posY: state.posY,
      posZ: state.posZ,
      rotZ: state.rotZ,
      customizationJson: state.customizationJson
    });

    // --- NOTIFICATION INTEGRATION ---
    if (this.phoneService && state.bankCash !== undefined) {
      const player = (mp.players as any).toArray().find((p: any) => Number(p.getVariable("ACCOUNT_ID")) === accountId);
      if (player) {
          const oldBank = Number(player.getVariable("BANK_CASH") ?? 0);
          if (state.bankCash !== oldBank) {
              const diff = state.bankCash - oldBank;
              this.phoneService.sendNotification(player, {
                  title: "Bank-Benachrichtigung",
                  content: `${diff > 0 ? '+' : ''}${diff}$ Gutschrift/Abbuchung. Neuer Kontostand: ${state.bankCash}$`,
                  icon: "fas fa-university",
                  app: "Wallet"
              });
          }
      }
    }
    // --- END NOTIFICATION INTEGRATION ---

    return result;
  }

  // Alias für Rückwärtskompatibilität während des Build-Übergangs
  async updateState(accountId: number, state: SavePlayerStateDto) {
    return this.savePlayerState(accountId, state);
  }
}
