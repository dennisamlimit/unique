import { SpawnService } from "../world/spawn-service.js";
import { parseCompleteCharacterDto, parseLoginAccountDto, parseRegisterAccountDto } from "./api/account-dto-parsers.js";
import { validateCompleteCharacterDto, validateLoginAccountDto, validateRegisterAccountDto } from "./account-validators.js";
import { AccountService } from "./account-service.js";
import { HIDDEN_LOGIN_POSITION, emitClient, getSocialClubId, getSocialClubName, setArmour, setHeading, setVar, vector3 } from "../../runtime/helpers.js";
import type { Account } from "./account.js";
import { FactionService } from "../factions/faction-service.js";

type PlayerMp = any;

type AuthEventDeps = {
  accounts: AccountService;
  spawns: SpawnService;
  factions: FactionService;
  logError: (message: string, error: unknown) => void;
  systemMessage: (player: PlayerMp, message: string) => void;
  syncFactionMapBlips?: (player: PlayerMp) => Promise<void>;
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

  return {
    profile,
    permissionKeys
  };
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

function buildBanPayload(account: Account) {
  return JSON.stringify({
    reason: account.banReason ?? "Kein Grund angegeben.",
    bannedAt: account.banDate,
    expiresAt: account.banExpiresAt,
    adminName: account.banAdminName,
    adminAccountId: account.banAdminAccountId
  });
}

async function finishLogin(
  player: PlayerMp,
  account: Awaited<ReturnType<AccountService["getById"]>>,
  created: boolean,
  deps: AuthEventDeps
) {
  if (!account) {
    return;
  }

  player.name = `${account.firstName}_${account.lastName}`;
  setVar(player, "DISPLAY_NAME", `${account.firstName} ${account.lastName}`);
  setVar(player, "ACCOUNT_ID", account.accountId);
  setVar(player, "CHARACTER_NAME", `${account.firstName}_${account.lastName}`);
  setVar(player, "ADMIN_LEVEL", account.adminLevel);
  setVar(player, "ADMIN_MODE", false);
  setVar(player, "PENDING_SPAWN_SELECTION", true);
  setVar(player, "BANNED_SCREEN_ACTIVE", false);
  setVar(player, "CASH", account.cash);
  setVar(player, "BANK_CASH", account.bankCash);
  setVar(player, "LOGGED_IN", true);

  player.dimension = 3000 + player.id;
  player.position = vector3(HIDDEN_LOGIN_POSITION.x, HIDDEN_LOGIN_POSITION.y, HIDDEN_LOGIN_POSITION.z);
  setHeading(player, 180);
  player.health = account.health > 0 ? account.health : 100;
  setArmour(player, account.armor);
  player.alpha = 0;

  const factionState = await syncFactionState(player, account.accountId, deps);

  if (account.customizationJson) {
    emitClient(player, "client:creator:apply", account.customizationJson);
  }

  const socialInfo = account.socialClubName
    ? `Social Club: ${account.socialClubName} (${account.socialClubId})`
    : "Kein Social Club gespeichert.";

  deps.systemMessage(
    player,
    created
      ? `Account erstellt. Deine Account-ID ist ${account.accountId}. ${socialInfo}`
      : `Erfolgreich eingeloggt. Deine Account-ID ist ${account.accountId}. ${socialInfo}`
  );

  const factionSpawn = factionState.profile ? await deps.factions.getFactionSpawn(factionState.profile.factionId) : null;
  emitClient(
    player,
    "client:spawn:show",
    buildSpawnPayload(
      created ? "Waehle deinen Spawnpunkt." : "Login erfolgreich. Waehle deinen Spawnpunkt.",
      Boolean(factionState.profile && factionSpawn),
      factionState.profile?.factionName
    )
  );
  await deps.syncFactionMapBlips?.(player);
}

async function beginCharacterCreation(
  player: PlayerMp,
  account: Awaited<ReturnType<AccountService["create"]>>,
  deps: AuthEventDeps
) {
  if (!account) {
    return;
  }

  setVar(player, "ACCOUNT_ID", account.accountId);
  setVar(player, "PENDING_CHARACTER_CREATION", true);
  setVar(player, "PENDING_SPAWN_SELECTION", false);
  await deps.spawns.apply(player);
  player.dimension = 2000 + player.id;
  player.health = 100;
  setArmour(player, 0);
  player.alpha = 255;
  emitClient(player, "client:auth:showCreator");
  emitClient(player, "client:auth:result", true, "Account erstellt. Erstelle jetzt deinen Charakter.");
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

        await beginCharacterCreation(player, account, deps);
      } catch (error) {
        deps.logError("register failed", error);
        emitClient(player, "client:auth:result", false, "Account konnte nicht erstellt werden.");
      }
    })();
  });

  mp.events.add("server:auth:login", (player: PlayerMp, email: string, password: string) => {
    void (async () => {
      try {
        const dto = parseLoginAccountDto(
          { email, password },
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
        if (!account || !deps.accounts.verifyPassword(account, dto.password.trim())) {
          emitClient(player, "client:auth:result", false, "Falsche E-Mail oder falsches Passwort.");
          return;
        }

        if (account.isBanned) {
          if (isBanExpired(account)) {
            const unbannedAccount = await deps.accounts.setBanState(account.accountId, false, null);
            if (!unbannedAccount) {
              emitClient(player, "client:auth:result", false, "Account konnte nicht geladen werden.");
              return;
            }

            account.isBanned = false;
            account.banReason = null;
            account.banDate = null;
            account.banExpiresAt = null;
            account.banAdminName = null;
            account.banAdminAccountId = 0;
          } else {
            setVar(player, "BANNED_SCREEN_ACTIVE", true);
            emitClient(player, "client:auth:banned", buildBanPayload(account));
            return;
          }
        }

        if (!deps.accounts.isSocialClubMatch(account, dto.socialClubId)) {
          emitClient(player, "client:auth:result", false, "Dieser Account ist an einen anderen Social Club gebunden.");
          return;
        }

        const boundAccount = !account.socialClubId && dto.socialClubId
          ? await deps.accounts.bindSocialClub(account, dto.socialClubName, dto.socialClubId)
          : account;

        if (!boundAccount.characterCreated) {
          await beginCharacterCreation(player, boundAccount, deps);
          return;
        }

        await finishLogin(player, boundAccount, false, deps);
      } catch (error) {
        deps.logError("login failed", error);
        emitClient(player, "client:auth:result", false, "Login fehlgeschlagen.");
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
          player.dimension = account.dimension;
          player.position = vector3(account.posX, account.posY, account.posZ);
          setHeading(player, account.rotZ);
        }

        player.health = account.health > 0 ? account.health : 100;
        setArmour(player, account.armor);
        player.alpha = 255;
        setVar(player, "PENDING_SPAWN_SELECTION", false);

        emitClient(player, "client:spawn:hide");
        const permissionKeys = (await deps.factions.getAccountPermissions(accountId)).map((permission) => permission.permissionKey);
        await syncFactionWardrobeData(player, accountId, permissionKeys, deps);
        emitClient(player, "client:spawn:resolveGround");
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
      } catch (error) {
        deps.logError("spawn select failed", error);
        emitClient(player, "client:spawn:result", false, "Spawn konnte nicht gesetzt werden.");
      }
    })();
  });

  mp.events.add("server:auth:banDisconnect", (player: PlayerMp) => {
    if (!Boolean(player.getVariable?.("BANNED_SCREEN_ACTIVE"))) {
      return;
    }

    player.kick?.("Account gesperrt.");
  });
}
