import { SpawnService } from "../world/spawn-service.js";
import { parseCompleteCharacterDto, parseLoginAccountDto, parseRegisterAccountDto } from "./api/account-dto-parsers.js";
import { validateCompleteCharacterDto, validateLoginAccountDto, validateRegisterAccountDto } from "./account-validators.js";
import { AccountService } from "./account-service.js";
import { HIDDEN_LOGIN_POSITION, emitClient, getSocialClubId, getSocialClubName, getVar, setArmour, setHeading, setVar, vector3 } from "../../runtime/helpers.js";
import type { Account } from "./account.js";
import { FactionService } from "../factions/faction-service.js";
import { PhoneService } from "../phone/phone-service.js";
import { InventoryService } from "../inventory/inventory-service.js";

import { CharacterRepository } from "./character-repository.js";
import type { Character } from "./character.js";

type PlayerMp = any;

type AuthEventDeps = {
  accounts: AccountService;
  characterRepository: CharacterRepository;
  spawns: SpawnService;
  factions: FactionService;
  logError: (message: string, error: unknown) => void;
  systemMessage: (player: PlayerMp, message: string) => void;
  syncFactionMapBlips?: (player: PlayerMp) => Promise<void>;
  phoneService: PhoneService;
  inventory: InventoryService;
};

function buildSpawnPayload(message: string, canUseFactionSpawn: boolean, factionName?: string | null) {
  return JSON.stringify({
    message,
    options: [
      {
        id: "last",
        title: "Letzter Spawn",
        subtitle: "Dein gespeicherter Standort",
        icon: "tab-face",
        disabled: false
      },
      {
        id: "hotel",
        title: "Hotel",
        subtitle: "Server-Spawn",
        icon: "tab-identity",
        disabled: false
      },
      {
        id: "faction",
        title: "Fraktion",
        subtitle: canUseFactionSpawn ? `${factionName ?? "Fraktion"} Spawn` : "Nicht verfuegbar",
        icon: "tab-style",
        disabled: !canUseFactionSpawn
      }
    ]
  });
}

function canUseWardrobeCategory(permissionKeys: string[], category: string) {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  if (!permissionKeys.includes("wardrobe_access")) {
    return false;
  }

  if (!normalizedCategory || normalizedCategory === "dienst") {
    return true;
  }

  return permissionKeys.includes(`wardrobe_category_${normalizedCategory}`);
}

async function finishLogin(player: PlayerMp, account: Account, isNew: boolean, deps: AuthEventDeps) {
  setVar(player, "ACCOUNT_ID", account.accountId);
  setVar(player, "EMAIL", account.email);
  setVar(player, "ADMIN_LEVEL", 0);

  const characters = await deps.characterRepository.getByAccountId(account.accountId);
  
  // Explicitly mapping for transparency and type safety
  const charData = (characters || []).map(c => ({
    id: c.characterId,
    firstName: c.firstName,
    lastName: c.lastName,
    cash: Number(c.cash || 0),
    bank: Number(c.bankCash || 0),
    level: Number(c.adminLevel || 1),
    isBanned: !!c.isBanned,
    banReason: c.banReason || null,
    banExpiresAt: c.banExpiresAt || null
  }));

  const charPayload = JSON.stringify(charData || []);
  console.log(`[AUTH-DEBUG] Sending charList (${charData.length} chars) to player ${player.name}`);
  emitClient(player, "client:charselect:show", charPayload);
}

async function finalizeCharacterSpawn(player: PlayerMp, character: Character, deps: AuthEventDeps) {
  const accountId = character.accountId;
  setVar(player, "CHARACTER_ID", character.characterId);
  setVar(player, "LOGGED_IN", true);
  setVar(player, "ADMIN_LEVEL", character.adminLevel);
  setVar(player, "CASH", character.cash);
  setVar(player, "BANK_CASH", character.bankCash);
  
  player.name = `${character.firstName} ${character.lastName}`;
  player.setVariable?.("ACCOUNT_ID", accountId);
  player.setVariable?.("CHARACTER_ID", character.characterId);
  player.setVariable?.("ADMIN_LEVEL", character.adminLevel);
  player.setVariable?.("CASH", character.cash);
  player.setVariable?.("BANK_CASH", character.bankCash);
  player.setVariable?.("LOGGED_IN", true);
  
  await deps.inventory.loadPlayerInventory(player, character.characterId);

  const profile = await deps.factions.getMemberProfile(accountId);
  const permissionKeys = (await deps.factions.getAccountPermissions(accountId)).map((permission) => permission.permissionKey);

  setVar(player, "FACTION_ID", profile?.factionId ?? 0);
  setVar(player, "FACTION_NAME", profile?.factionName ?? "");
  setVar(player, "FACTION_SHORT_NAME", profile?.factionShortName ?? "");
  setVar(player, "FACTION_TYPE", profile?.factionType ?? "");
  setVar(player, "FACTION_RANK", profile?.rankLevel ?? 0);
  setVar(player, "FACTION_RANK_NAME", profile?.rankName ?? "");
  setVar(player, "FACTION_PERMISSIONS", JSON.stringify(permissionKeys));

  player.setVariable?.("FACTION_ID", profile?.factionId ?? 0);
  player.setVariable?.("FACTION_NAME", profile?.factionName ?? "");
  player.setVariable?.("FACTION_RANK", profile?.rankLevel ?? 0);

  player.dimension = 0;
  player.position = HIDDEN_LOGIN_POSITION;
  player.alpha = 0;

  emitClient(player, "client:charselect:hide");
  emitClient(player, "client:spawn:show", buildSpawnPayload("Wo möchtest du starten?", !!profile, profile?.factionName));
  setVar(player, "PENDING_SPAWN_SELECTION", true);
}

// --- UTILITIES KEPT FOR REUSE ---
async function syncFactionState(player: PlayerMp, accountId: number, deps: AuthEventDeps) {
  const profile = await deps.factions.getMemberProfile(accountId);
  const permissions = await deps.factions.getAccountPermissions(accountId);
  const permissionKeys = permissions.map((permission) => permission.permissionKey);

  setVar(player, "FACTION_ID", profile?.factionId ?? 0);
  setVar(player, "FACTION_NAME", profile?.factionName ?? "");
  setVar(player, "FACTION_SHORT_NAME", profile?.factionShortName ?? "");
  setVar(player, "FACTION_TYPE", profile?.factionType ?? "");
  setVar(player, "FACTION_RANK", profile?.rankLevel ?? 0);
  setVar(player, "FACTION_RANK_NAME", profile?.rankName ?? "");
  setVar(player, "FACTION_PERMISSIONS", JSON.stringify(permissionKeys));

  return { profile, permissionKeys };
}

async function syncFactionWardrobeData(player: PlayerMp, accountId: number, permissionKeys: string[], deps: AuthEventDeps) {
  const profile = await deps.factions.getMemberProfile(accountId);
  const wardrobePoints = profile ? await deps.factions.getWardrobePoints(profile.factionId) : [];
  const outfits = profile
    ? (await deps.factions.getOutfits(profile.factionId)).filter((outfit) => canUseWardrobeCategory(permissionKeys, outfit.category))
    : [];
  emitClient(player, "client:factionWardrobe:setData", JSON.stringify({ points: wardrobePoints, outfits }));
}

function isBanExpired(account: Account) {
  if (!account.isBanned || !account.banExpiresAt) {
    return false;
  }
  const expiresAt = Date.parse(account.banExpiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export function registerAuthEvents(deps: AuthEventDeps) {
  mp.events.add("server:auth:ready", (player: PlayerMp) => {
    emitClient(player, "client:auth:show");
  });

  mp.events.add("server:auth:register", (player: PlayerMp, _firstName: string, _lastName: string, email: string, password: string, repeatPassword: string) => {
    void (async () => {
      try {
        const dto = parseRegisterAccountDto(
          { email, password, repeatPassword },
          {
            socialClubId: getSocialClubId(player) || null,
            socialClubName: getSocialClubName(player) || null
          }
        );

        const validation = validateRegisterAccountDto(dto, deps.accounts);
        if (validation.ok === false) {
          emitClient(player, "client:auth:result", false, validation.message);
          return;
        }

        if (await deps.accounts.emailExists(dto.email)) {
          emitClient(player, "client:auth:result", false, "Zu dieser E-Mail existiert bereits ein Account.");
          return;
        }

        if (dto.socialClubId && await deps.accounts.socialClubExists(dto.socialClubId)) {
          emitClient(player, "client:auth:result", false, "Zu diesem Social Club existiert bereits ein Account.");
          return;
        }

        const account = await deps.accounts.create({
          email: dto.email,
          password: dto.password.trim(),
          socialClubName: dto.socialClubName,
          socialClubId: dto.socialClubId
        });

        await finishLogin(player, account, true, deps);
      } catch (error) {
        deps.logError("register failed", error);
        emitClient(player, "client:auth:result", false, "Account konnte nicht erstellt werden.");
      }
    })();
  });

  mp.events.add("server:auth:login", (player: PlayerMp, email: string, password: string) => {
    void (async () => {
      try {
        if (!email || !password) return;
        
        console.log(`[AUTH-DEBUG] Login attempt: ${email.trim()}`);
        const dto = parseLoginAccountDto(
          { email: email.trim(), password },
          {
            socialClubId: getSocialClubId(player) || null,
            socialClubName: getSocialClubName(player) || null
          }
        );

        const validation = validateLoginAccountDto(dto, deps.accounts);
        if (validation.ok === false) {
          emitClient(player, "client:auth:result", false, validation.message);
          return;
        }

        const account = await deps.accounts.getByEmail(dto.email);
        if (!account || !deps.accounts.verifyPassword(account, dto.password)) {
          emitClient(player, "client:auth:result", false, "E-Mail oder Passwort ungültig.");
          return;
        }

        if (account.isBanned) {
          if (isBanExpired(account)) {
            await deps.accounts.setBanState(account.accountId, false, null);
            account.isBanned = false;
          } else {
            setVar(player, "BANNED_SCREEN_ACTIVE", true);
            emitClient(player, "client:auth:banned", JSON.stringify({
               reason: account.banReason,
               banDate: account.banDate,
               expiresAt: account.banExpiresAt
            }));
            return;
          }
        }

        if (!deps.accounts.isSocialClubMatch(account, dto.socialClubId)) {
          emitClient(player, "client:auth:result", false, "Account an anderen Social Club gebunden.");
          return;
        }

        const boundAccount = !account.socialClubId && dto.socialClubId
          ? await deps.accounts.bindSocialClub(account, dto.socialClubName, dto.socialClubId)
          : account;

        console.log(`[AUTH-DEBUG] Login success for ${email.trim()}. Proceeding to charselect.`);
        await finishLogin(player, boundAccount, false, deps);
      } catch (error) {
        deps.logError("login failed", error);
        emitClient(player, "client:auth:result", false, "Login-Dienst vorübergehend nicht erreichbar.");
      }
    })();
  });

  mp.events.add("server:character:create", (player: PlayerMp, characterJson: string) => {
    void (async () => {
      try {
        const accountId = Number(player.getVariable?.("ACCOUNT_ID") ?? 0);
        if (accountId <= 0) {
          emitClient(player, "client:creator:result", false, "Account wurde nicht gefunden.");
          return;
        }

        const dto = parseCompleteCharacterDto(characterJson);
        const validation = validateCompleteCharacterDto(dto, deps.accounts);
        if (validation.ok === false) {
          emitClient(player, "client:creator:result", false, validation.message);
          return;
        }

        const saved = await deps.accounts.completeCharacter(accountId, dto);
        if (!saved) {
          emitClient(player, "client:creator:result", false, "Charakter konnte nicht gespeichert werden.");
          return;
        }

        await finishLogin(player, saved, true, deps);
      } catch (error) {
        deps.logError("character create failed", error);
        emitClient(player, "client:creator:result", false, "Charakterdaten sind ungueltig.");
      }
    })();
  });

  mp.events.add("server:spawn:select", (player: PlayerMp, spawnType: string) => {
    void (async () => {
      try {
        console.log(`[AUTH-DEBUG] Spawn select requested by ${player.name}: ${String(spawnType)}`);
        if (!Boolean(player.getVariable?.("PENDING_SPAWN_SELECTION"))) {
          emitClient(player, "client:spawn:result", false, "Kein Spawn waehlen verfuegbar.");
          return;
        }

        const accountId = Number(player.getVariable?.("ACCOUNT_ID") ?? 0);
        if (accountId <= 0) {
          emitClient(player, "client:spawn:result", false, "Account wurde nicht gefunden.");
          return;
        }

        const account = await deps.accounts.getById(accountId);
        if (!account) {
          emitClient(player, "client:spawn:result", false, "Account wurde nicht gefunden.");
          return;
        }

        const charId = Number(getVar(player, "CHARACTER_ID", 0));
        const character = charId > 0 ? await deps.characterRepository.getById(charId) : null;

        const normalizedSpawn = String(spawnType ?? "").trim().toLowerCase();
        if (normalizedSpawn === "hotel") {
          await deps.spawns.apply(player);
        } else if (normalizedSpawn === "faction") {
          const factionProfile = await deps.factions.getMemberProfile(accountId);
          if (!factionProfile) {
            emitClient(player, "client:spawn:result", false, "Du bist in keiner Fraktion.");
            return;
          }

          const factionSpawn = await deps.factions.getFactionSpawn(factionProfile.factionId);
          if (!factionSpawn) {
            emitClient(player, "client:spawn:result", false, "Deine Fraktion hat keinen Spawnpunkt gesetzt.");
            return;
          }

          player.dimension = factionSpawn.dimension;
          player.position = vector3(factionSpawn.x, factionSpawn.y, factionSpawn.z);
          setHeading(player, factionSpawn.rotZ);
        } else {
          const spawnSrc = character ?? account;
          player.dimension = spawnSrc.dimension;
          player.position = vector3(spawnSrc.posX, spawnSrc.posY, spawnSrc.posZ);
          setHeading(player, spawnSrc.rotZ);
        }

        const healthSrc = character ?? account;
        player.health = healthSrc.health > 0 ? healthSrc.health : 100;
        setArmour(player, healthSrc.armor);
        player.alpha = 255;
        setVar(player, "PENDING_SPAWN_SELECTION", false);

        emitClient(player, "client:spawn:hide");
        emitClient(player, "client:manager:initAll");
        const permissionKeys = (await deps.factions.getAccountPermissions(accountId)).map((permission) => permission.permissionKey);
        await syncFactionWardrobeData(player, accountId, permissionKeys, deps);
        await deps.syncFactionMapBlips?.(player);
        emitClient(player, "client:spawn:resolveGround");
        const customizationJson = character?.customizationJson ?? account.customizationJson;
        if (customizationJson) {
           emitClient(player, "client:creator:apply", customizationJson);
        }
        emitClient(player, "client:chat:authState", true);
        emitClient(player, "client:hud:authState", true);
        deps.systemMessage(
          player,
          normalizedSpawn === "hotel"
            ? "Du bist am Hotel gespawnt."
            : normalizedSpawn === "faction"
              ? "Du bist bei deiner Fraktion gespawnt."
              : "Du bist an deinem letzten Standort gespawnt."
        );

        // --- PHONE INITIALIZATION (POST-SPAWN ONLY) ---
        void (async () => {
          try {
            const phoneNumber = await deps.phoneService.ensurePhoneEntry(accountId, String(player.socialId || accountId));

            setVar(player, "PHONE_NUMBER", phoneNumber);
            setVar(player, "firstName", character?.firstName || account.firstName);
            setVar(player, "lastName", character?.lastName || account.lastName);
            
            deps.logError(`Phone initialized for Account ${accountId} / Character ${charId}`, "INFO");
          } catch (phoneError) {
            deps.logError("Phone initialization failed during spawn", phoneError);
          }
        })();
        // --- END PHONE INITIALIZATION ---
        console.log(`[AUTH-DEBUG] Spawn select completed for ${player.name}: ${normalizedSpawn}`);
      } catch (error) {
        deps.logError("spawn select failed", error);
        emitClient(player, "client:spawn:result", false, "Spawn konnte nicht gesetzt werden.");
      }
    })();
  });

  mp.events.add("server:charselect:select", (player: PlayerMp, characterId: number) => {
    void (async () => {
      try {
        console.log(`[AUTH-DEBUG] Character select requested by ${player.name}: ${Number(characterId)}`);
        const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
        if (accountId <= 0) {
          emitClient(player, "client:charselect:result", false, "Account wurde nicht gefunden.");
          return;
        }

        const char = await deps.characterRepository.getById(characterId);
        if (!char || char.accountId !== accountId) {
          emitClient(player, "client:charselect:result", false, "Charakter nicht gefunden.");
          return;
        }

        if (char.isBanned) {
          emitClient(player, "client:charselect:result", false, `Dieser Charakter ist gebannt. Grund: ${char.banReason}`);
          return;
        }

        await finalizeCharacterSpawn(player, char, deps);
        console.log(`[AUTH-DEBUG] Character select completed for ${player.name}: ${char.characterId}`);
      } catch (error) {
        deps.logError("character select failed", error);
        emitClient(player, "client:charselect:result", false, "Charakterauswahl fehlgeschlagen.");
      }
    })();
  });

  mp.events.add("server:charselect:create", (player: PlayerMp) => {
    const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
    if (accountId <= 0) return;

    emitClient(player, "client:charselect:hide");
    emitClient(player, "client:creator:show");
  });

  mp.events.add("server:auth:banDisconnect", (player: PlayerMp) => {
    if (!Boolean(player.getVariable?.("BANNED_SCREEN_ACTIVE"))) {
      return;
    }

    player.kick?.("Account gesperrt.");
  });
}
