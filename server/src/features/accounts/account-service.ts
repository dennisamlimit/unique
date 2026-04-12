import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { clamp, clampMoney } from "../../runtime/helpers.js";
import type { Account } from "./account.js";
import { AccountRepository } from "./account-repository.js";
import { SpawnService } from "../world/spawn-service.js";
import type { CompleteCharacterDto, CreateAccountDto, SavePlayerStateDto } from "./api/account-dtos.js";

function normalizeName(input: string) {
  const value = input.trim().toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeOptional(input?: string | null) {
  return input && input.trim() ? input.trim() : null;
}

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

export class AccountService {
  private readonly repository = new AccountRepository();
  private readonly spawns = new SpawnService();

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
      socialClubName: normalizeOptional(dto.socialClubName),
      socialClubId: normalizeOptional(dto.socialClubId),
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
    const expected = Buffer.from(account.passwordHash, "hex");
    const actual = Buffer.from(hashPassword(password, account.passwordSalt), "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  isSocialClubMatch(account: Account, socialClubId: string | null) {
    if (!account.socialClubId) {
      return true;
    }

    return account.socialClubId.toLowerCase() === (socialClubId?.trim().toLowerCase() ?? "");
  }

  async bindSocialClub(account: Account, socialClubName: string | null, socialClubId: string) {
    account.socialClubId = socialClubId.trim();
    account.socialClubName = normalizeOptional(socialClubName);
    return this.repository.save(account);
  }

  async setAdminLevel(accountId: number, adminLevel: number) {
    if (adminLevel < 0 || adminLevel > 10) {
      return null;
    }

    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.adminLevel = adminLevel;
    return this.repository.save(account);
  }

  async setCash(accountId: number, cash: number) {
    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.cash = clampMoney(cash);
    return this.repository.save(account);
  }

  async setBankCash(accountId: number, bankCash: number) {
    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.bankCash = clampMoney(bankCash);
    return this.repository.save(account);
  }

  async setBanState(
    accountId: number,
    isBanned: boolean,
    reason?: string | null,
    adminName?: string | null,
    adminAccountId = 0,
    expiresAtUtc?: Date | null
  ) {
    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.isBanned = isBanned;
    account.banReason = isBanned ? normalizeOptional(reason) ?? "Kein Grund angegeben." : null;
    account.banDate = isBanned ? new Date().toISOString() : null;
    account.banExpiresAt = isBanned && expiresAtUtc ? expiresAtUtc.toISOString() : null;
    account.banAdminName = isBanned ? normalizeOptional(adminName) : null;
    account.banAdminAccountId = isBanned ? Math.max(0, Math.trunc(adminAccountId)) : 0;
    return this.repository.save(account);
  }

  async completeCharacter(accountId: number, dto: CompleteCharacterDto) {
    if (!this.isValidName(dto.firstName) || !this.isValidName(dto.lastName)) {
      return null;
    }

    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.firstName = normalizeName(dto.firstName);
    account.lastName = normalizeName(dto.lastName);
    account.birthDate = normalizeOptional(dto.birthDate);
    account.origin = normalizeOptional(dto.origin);
    account.customizationJson = normalizeOptional(dto.customizationJson);
    account.characterCreated = true;
    return this.repository.save(account);
  }

  async savePlayerState(accountId: number, dto: SavePlayerStateDto) {
    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    account.posX = dto.posX;
    account.posY = dto.posY;
    account.posZ = dto.posZ;
    account.rotZ = dto.rotZ;
    account.dimension = dto.dimension;
    account.health = clamp(dto.health, 0, 100);
    account.armor = clamp(dto.armor, 0, 100);
    account.cash = clampMoney(dto.cash);
    account.bankCash = clampMoney(dto.bankCash);
    return this.repository.save(account);
  }

  async setClothing(accountId: number, clothing: number[][]) {
    const account = await this.repository.getById(accountId);
    if (!account) {
      return null;
    }

    const customization = parseCustomizationJson(account.customizationJson);
    account.customizationJson = JSON.stringify({
      ...customization,
      clothing
    });

    return this.repository.save(account);
  }
}
