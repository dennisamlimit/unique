import { initializeDatabase } from "./infrastructure/database.js";
import { registerAuthEvents } from "./features/accounts/auth-events.js";
import { AccountService } from "./features/accounts/account-service.js";
import type { Account } from "./features/accounts/account.js";
import type { SavePlayerStateDto } from "./features/accounts/account-dtos.js";
import { parseSavePlayerStateDto } from "./features/accounts/account-dto-parsers.js";
import { SpawnService } from "./features/world/spawn-service.js";
import type { SpawnPointDto } from "./features/world/spawn-dtos.js";
import { FactionService } from "./features/factions/faction-service.js";
import { handleFactionAdminCommand } from "./features/factions/faction-events.js";
import {
  DEFAULT_SPAWN,
  HIDDEN_LOGIN_POSITION,
  clampMoney,
  emitClient,
  findPlayerById,
  forEachPlayer,
  getArmour,
  getHeading,
  getPlayerName,
  getVar,
  setArmour,
  setHeading,
  setVar,
  vector3
} from "./runtime/helpers.js";

const accounts = new AccountService();
const spawns = new SpawnService();
const factions = new FactionService();
const LOCAL_CHAT_RANGE = 20;
const ADMIN_JAIL_POSITION = { x: 1691.14, y: 2565.66, z: 45.56, rotZ: 180, dimension: 1 };
const ADMIN_JAIL_RELEASE_POSITION = { x: 1846.64, y: 2585.86, z: 45.67, rotZ: 90, dimension: 1 };
const adminJailTimers = new Map<number, NodeJS.Timeout>();

function logInfo(message: string) {
  if (mp.console?.logInfo) {
    mp.console.logInfo(`[unique] ${message}`);
    return;
  }

  console.log(`[unique] ${message}`);
}

function logError(message: string, error: unknown) {
  const formatted = `[unique] ${message}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`;
  if (mp.console?.logError) {
    mp.console.logError(formatted);
    return;
  }

  console.error(formatted);
}

function systemMessage(player: any, message: string) {
  emitClient(player, "client:chat:addMessage", "system", "", message);
}

function adminMessage(player: any, sender: string, message: string) {
  emitClient(player, "client:chat:addMessage", "admin", sender, message);
}

function rangeMessage(source: any, type: string, sender: string, message: string, range = LOCAL_CHAT_RANGE) {
  forEachPlayer((target) => {
    if (Number(target.dimension ?? 0) !== Number(source.dimension ?? 0)) {
      return;
    }

    const distance = source.dist ? source.dist(target.position) : Math.hypot(
      Number(source.position.x) - Number(target.position.x),
      Number(source.position.y) - Number(target.position.y),
      Number(source.position.z) - Number(target.position.z)
    );

    if (distance <= range) {
      emitClient(target, "client:chat:addMessage", type, sender, message);
    }
  });
}

function chatName(player: any) {
  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  return `${getPlayerName(player)}[${accountId > 0 ? accountId : player.id + 1}]`;
}

function formatSpawn(spawn: SpawnPointDto) {
  return `${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)} | RotZ ${spawn.rotZ.toFixed(2)} | Dimension ${spawn.dimension}`;
}

function isLoggedIn(player: any) {
  return Boolean(getVar(player, "LOGGED_IN", false));
}

function hasAdminLevel(player: any, level = 1) {
  return Number(getVar(player, "ADMIN_LEVEL", 0)) >= level;
}

function setPlayerMoney(player: any, key: "CASH" | "BANK_CASH", amount: number) {
  setVar(player, key, clampMoney(amount));
}

function findPlayerByAnyId(rawId: string | number) {
  const parsedId = Number(rawId);
  if (!Number.isInteger(parsedId)) {
    return null;
  }

  const exactTarget = findPlayerById(parsedId);
  if (exactTarget) {
    return exactTarget;
  }

  const plusOneTarget = findPlayerById(parsedId - 1);
  if (plusOneTarget) {
    return plusOneTarget;
  }

  let accountTarget: any = null;
  forEachPlayer((player) => {
    if (Number(getVar(player, "ACCOUNT_ID", 0)) === parsedId) {
      accountTarget = player;
    }
  });

  return accountTarget;
}

function findOnlinePlayerByAccountId(accountId: number) {
  let found: any = null;
  forEachPlayer((player) => {
    if (Number(getVar(player, "ACCOUNT_ID", 0)) === accountId) {
      found = player;
    }
  });
  return found;
}

function parseDurationToken(token?: string | null) {
  const value = String(token ?? "").trim().toLowerCase();
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const unitMs = unit === "s" ? 1000 : unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return amount > 0 ? amount * unitMs : null;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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

function buildJailPayload(reason: string, releaseAt: number) {
  return JSON.stringify({
    reason,
    releaseAt: new Date(releaseAt).toISOString()
  });
}

function notifyAdmins(message: string) {
  forEachPlayer((player) => {
    if (hasAdminLevel(player, 1)) {
      adminMessage(player, "ADMIN", message);
    }
  });
}

function clearAdminJailTimer(playerId: number) {
  const timer = adminJailTimers.get(playerId);
  if (!timer) {
    return;
  }

  clearTimeout(timer);
  adminJailTimers.delete(playerId);
}

function releasePlayerFromJail(target: any, message: string) {
  clearAdminJailTimer(target.id);
  setVar(target, "ADMIN_JAILED", false);
  setVar(target, "ADMIN_JAIL_RELEASE_AT", 0);
  target.dimension = ADMIN_JAIL_RELEASE_POSITION.dimension;
  target.position = vector3(ADMIN_JAIL_RELEASE_POSITION.x, ADMIN_JAIL_RELEASE_POSITION.y, ADMIN_JAIL_RELEASE_POSITION.z);
  setHeading(target, ADMIN_JAIL_RELEASE_POSITION.rotZ);
  emitClient(target, "client:adminJail:hide", message);
  systemMessage(target, message);
}

function jailPlayer(target: any, durationMs: number, reason: string) {
  clearAdminJailTimer(target.id);

  const releaseAt = Date.now() + durationMs;
  setVar(target, "ADMIN_JAILED", true);
  setVar(target, "ADMIN_JAIL_RELEASE_AT", releaseAt);
  target.dimension = ADMIN_JAIL_POSITION.dimension;
  target.position = vector3(ADMIN_JAIL_POSITION.x, ADMIN_JAIL_POSITION.y, ADMIN_JAIL_POSITION.z);
  setHeading(target, ADMIN_JAIL_POSITION.rotZ);
  emitClient(target, "client:adminJail:show", buildJailPayload(reason, releaseAt));
  systemMessage(target, `Du wurdest fuer ${formatDuration(durationMs)} eingesperrt. Grund: ${reason}`);

  adminJailTimers.set(target.id, setTimeout(() => {
    releasePlayerFromJail(target, "Du wurdest aus dem Admin-Knast entlassen.");
  }, durationMs));
}

async function savePlayerPosition(player: any) {
  if (!player || !isLoggedIn(player)) {
    return;
  }

  if (Boolean(getVar(player, "PENDING_SPAWN_SELECTION", false)) || Boolean(getVar(player, "ADMIN_JAILED", false))) {
    return;
  }

  const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
  if (accountId <= 0) {
    return;
  }

  const dto: SavePlayerStateDto = parseSavePlayerStateDto({
    posX: player.position.x,
    posY: player.position.y,
    posZ: player.position.z,
    rotZ: getHeading(player),
    dimension: player.dimension ?? 0,
    health: player.health ?? 100,
    armor: getArmour(player),
    cash: getVar(player, "CASH", 0),
    bankCash: getVar(player, "BANK_CASH", 0)
  });

  await accounts.savePlayerState(accountId, dto);
}

async function handleAdminCommand(player: any, command: string, parts: string[], args: string) {
  if (!hasAdminLevel(player, 1)) {
    return true;
  }

  const ensureLevel = (level: number) => {
    if (!hasAdminLevel(player, level)) {
      systemMessage(player, `Dafuer benoetigst du Admin-Level ${level}.`);
      return false;
    }

    return true;
  };

  const findTarget = (usage: string) => {
    const target = findPlayerByAnyId(parts[1]);
    if (!target) {
      systemMessage(player, Number.isInteger(Number(parts[1])) ? "Spieler nicht gefunden." : `Nutze: ${usage}`);
      return null;
    }

    return target;
  };

  switch (command) {
    case "admin":
      setVar(player, "ADMIN_MODE", !Boolean(getVar(player, "ADMIN_MODE", false)));
      systemMessage(player, `Admin-Modus: ${getVar(player, "ADMIN_MODE", false) ? "aktiv" : "inaktiv"}`);
      return true;

    case "myadmin":
      systemMessage(player, `Admin-Level: ${getVar(player, "ADMIN_LEVEL", 0)} | Modus: ${getVar(player, "ADMIN_MODE", false) ? "aktiv" : "inaktiv"}`);
      return true;

    case "msg":
      if (!ensureLevel(2)) {
        return true;
      }

      if (!args.trim()) {
        systemMessage(player, "Nutze: /msg [nachricht]");
        return true;
      }

      forEachPlayer((target) => adminMessage(target, getPlayerName(player), args.trim()));
      return true;

    case "dl":
      if (!ensureLevel(2)) {
        return true;
      }

      emitClient(player, "client:dl:toggle");
      return true;

    case "veh": {
      if (!ensureLevel(1)) {
        return true;
      }

      const model = parts[1] ?? "adder";
      const hash = mp.joaat(model);
      if (!hash) {
        systemMessage(player, "Ungueltiges Fahrzeugmodell.");
        return true;
      }

      const vehicle = mp.vehicles.new(hash, vector3(player.position.x + 2, player.position.y, player.position.z), {
        heading: getHeading(player),
        color: [111, 111],
        numberPlate: "ADMIN"
      });

      if (vehicle) {
        player.putIntoVehicle?.(vehicle, -1);
        systemMessage(player, `Fahrzeug gespawnt: ${model}`);
      }

      return true;
    }

    case "setadmin": {
      const accountId = Number(parts[1]);
      const adminLevel = Number(parts[2]);
      if (!Number.isInteger(accountId) || !Number.isInteger(adminLevel)) {
        systemMessage(player, "Nutze: /setadmin [accountId] [level]");
        return true;
      }

      const account = await accounts.setAdminLevel(accountId, adminLevel);
      if (!account) {
        systemMessage(player, "Admin-Level konnte nicht gesetzt werden.");
        return true;
      }

      systemMessage(player, `Admin-Level gesetzt: ${account.firstName} ${account.lastName} (${account.email}) -> ${adminLevel}`);
      return true;
    }

    case "findaccountsc": {
      if (!ensureLevel(2)) {
        return true;
      }

      const account = await accounts.getBySocialClubId(args.trim());
      if (!account) {
        systemMessage(player, "Kein Account mit dieser Social-Club-ID gefunden.");
        return true;
      }

      systemMessage(player, `Gefunden: ID ${account.accountId} | ${account.firstName} ${account.lastName} | ${account.email} | Admin ${account.adminLevel}`);
      return true;
    }

    case "goto": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/goto [spielerId]");
      if (!target) {
        return true;
      }

      player.dimension = target.dimension;
      player.position = vector3(target.position.x + 1.5, target.position.y, target.position.z);
      systemMessage(player, `Teleportiert zu ${getPlayerName(target)}`);
      return true;
    }

    case "gethere": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/gethere [spielerId]");
      if (!target) {
        return true;
      }

      target.dimension = player.dimension;
      target.position = vector3(player.position.x + 1.5, player.position.y, player.position.z);
      systemMessage(player, `Spieler geholt: ${getPlayerName(target)}`);
      systemMessage(target, "Du wurdest von einem Admin teleportiert.");
      return true;
    }

    case "aheal":
    case "revive": {
      const target = parts[1] ? findTarget(`/${command} [spielerId]`) : player;
      if (!target) {
        return true;
      }

      target.health = 100;
      setArmour(target, command === "aheal" ? 100 : 0);
      systemMessage(player, target === player ? (command === "aheal" ? "Du hast dich voll geheilt." : "Du hast dich revived.") : `Spieler aktualisiert: ${getPlayerName(target)}`);
      if (target !== player) {
        systemMessage(target, command === "aheal" ? "Du wurdest von einem Admin geheilt." : "Du wurdest von einem Admin revived.");
      }
      return true;
    }

    case "apos": {
      if (parts.length === 5) {
        player.position = vector3(Number(parts[1]), Number(parts[2]), Number(parts[3]));
        setHeading(player, Number(parts[4]));
        systemMessage(player, "Position gesetzt.");
        return true;
      }

      systemMessage(player, `Pos: ${Number(player.position.x).toFixed(2)}, ${Number(player.position.y).toFixed(2)}, ${Number(player.position.z).toFixed(2)} | RotZ: ${getHeading(player).toFixed(2)}`);
      return true;
    }

    case "setserverspawn": {
      if (!ensureLevel(10)) {
        return true;
      }

      const spawn = await spawns.saveFromPlayer(player);
      systemMessage(player, `Server-Spawn gesetzt: ${formatSpawn(spawn)}`);
      return true;
    }

    case "serverspawn":
      systemMessage(player, `Server-Spawn: ${formatSpawn(await spawns.getSpawn())}`);
      return true;

    case "gotospawn":
      if (!ensureLevel(2)) {
        return true;
      }

      await spawns.apply(player);
      systemMessage(player, "Zum Server-Spawn teleportiert.");
      return true;

    case "setmoney":
    case "setbank":
    case "addmoney":
    case "addbank": {
      if (!ensureLevel(3)) {
        return true;
      }

      const bank = command.includes("bank");
      const target = findTarget(`/${command} [spielerId] [betrag]`);
      if (!target) {
        return true;
      }

      const accountId = Number(getVar(target, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        systemMessage(player, "Zielspieler ist nicht eingeloggt.");
        return true;
      }

      const delta = Number(parts[2]);
      if (!Number.isFinite(delta)) {
        systemMessage(player, `Nutze: /${command} [spielerId] [betrag]`);
        return true;
      }

      const current = Number(getVar(target, bank ? "BANK_CASH" : "CASH", 0));
      const next = command.startsWith("add") ? current + delta : delta;
      const saved = bank
        ? await accounts.setBankCash(accountId, next)
        : await accounts.setCash(accountId, next);

      if (!saved) {
        systemMessage(player, "Geld konnte nicht gespeichert werden.");
        return true;
      }

      setPlayerMoney(target, bank ? "BANK_CASH" : "CASH", bank ? saved.bankCash : saved.cash);
      systemMessage(player, `${bank ? "Bankgeld" : "Bargeld"} gesetzt: ${getPlayerName(target)} -> $${(bank ? saved.bankCash : saved.cash).toLocaleString("en-US")}`);
      systemMessage(target, `${bank ? "Bankgeld" : "Bargeld"} aktualisiert.`);
      return true;
    }

    case "kick": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/kick [spielerId] [grund]");
      if (!target) {
        return true;
      }

      const reason = args.replace(parts[1] ?? "", "").trim() || "Kein Grund angegeben.";
      systemMessage(player, `Spieler gekickt: ${getPlayerName(target)} | ${reason}`);
      target.kick?.(reason);
      return true;
    }

    case "jail": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/jail [spielerId] [dauer:30s/10m/1h] [grund]");
      if (!target) {
        return true;
      }

      const durationMs = parseDurationToken(parts[2]);
      if (!durationMs) {
        systemMessage(player, "Nutze: /jail [spielerId] [dauer:30s/10m/1h] [grund]");
        return true;
      }

      const reason = parts.slice(3).join(" ").trim() || "Kein Grund angegeben.";
      jailPlayer(target, durationMs, reason);
      notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} fuer ${formatDuration(durationMs)} eingesperrt. Grund: ${reason}`);
      return true;
    }

    case "unjail": {
      if (!ensureLevel(2)) {
        return true;
      }

      const target = findTarget("/unjail [spielerId]");
      if (!target) {
        return true;
      }

      if (!Boolean(getVar(target, "ADMIN_JAILED", false))) {
        systemMessage(player, "Spieler ist nicht im Admin-Knast.");
        return true;
      }

      releasePlayerFromJail(target, "Du wurdest von einem Admin aus dem Knast entlassen.");
      notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} aus dem Admin-Knast entlassen.`);
      return true;
    }

    case "ban": {
      if (!ensureLevel(4)) {
        return true;
      }

      const target = findTarget("/ban [spielerId] [dauer?] [grund]");
      if (!target) {
        return true;
      }

      const accountId = Number(getVar(target, "ACCOUNT_ID", 0));
      if (accountId <= 0) {
        systemMessage(player, "Zielspieler ist nicht eingeloggt.");
        return true;
      }

      const durationMs = parseDurationToken(parts[2]);
      const reason = (durationMs ? parts.slice(3) : parts.slice(2)).join(" ").trim() || "Kein Grund angegeben.";
      const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
      const adminAccountId = Number(getVar(player, "ACCOUNT_ID", 0));
      const saved = await accounts.setBanState(accountId, true, reason, getPlayerName(player), adminAccountId, expiresAt);
      if (!saved) {
        systemMessage(player, "Ban konnte nicht gespeichert werden.");
        return true;
      }

      const publicMessage = durationMs
        ? `${getPlayerName(target)} wurde fuer ${formatDuration(durationMs)} gebannt. Grund: ${reason}`
        : `${getPlayerName(target)} wurde permanent gebannt. Grund: ${reason}`;

      notifyAdmins(`${getPlayerName(player)} hat ${publicMessage}`);
      systemMessage(player, `Ban gesetzt: ${publicMessage}`);
      setVar(target, "BANNED_SCREEN_ACTIVE", true);
      emitClient(target, "client:auth:banned", buildBanPayload(saved));
      return true;
    }

    case "unban": {
      const accountId = Number(parts[1]);
      if (!Number.isInteger(accountId)) {
        systemMessage(player, "Nutze: /unban [accountId]");
        return true;
      }

      const account = await accounts.getById(accountId);
      if (!account || !account.isBanned) {
        systemMessage(player, "Account nicht gefunden oder nicht gebannt.");
        return true;
      }

      const requiresLevel = account.banExpiresAt ? 4 : 7;
      if (!ensureLevel(requiresLevel)) {
        return true;
      }

      const saved = await accounts.setBanState(accountId, false, null);
      if (!saved) {
        systemMessage(player, "Unban konnte nicht gespeichert werden.");
        return true;
      }

      const onlineTarget = findOnlinePlayerByAccountId(accountId);
      if (onlineTarget) {
        setVar(onlineTarget, "BANNED_SCREEN_ACTIVE", false);
      }

      notifyAdmins(`${getPlayerName(player)} hat Account ${accountId} entbannt.`);
      systemMessage(player, `Account entbannt: ${accountId}`);
      return true;
    }

    default:
      return handleFactionAdminCommand(player, command, parts, args, {
        factions,
        logError,
        systemMessage,
        hasAdminLevel,
        getVar
      });
  }
}

async function onChatSend(player: any, mode: string, text: string) {
  if (!player || !isLoggedIn(player) || !text?.trim()) {
    return;
  }

  if (Boolean(getVar(player, "PENDING_SPAWN_SELECTION", false))) {
    systemMessage(player, "Waehle erst einen Spawnpunkt.");
    return;
  }

  const trimmed = text.trim();
  const chatMode = (mode ?? "ic").trim().toLowerCase();

  if (trimmed.startsWith("/")) {
    const parts = trimmed.slice(1).split(/\s+/).filter(Boolean);
    const command = parts[0]?.toLowerCase() ?? "";
    const args = parts.length > 1 ? parts.slice(1).join(" ") : "";

    if (await handleAdminCommand(player, command, parts, args)) {
      return;
    }

    switch (command) {
      case "b":
        if (!args) {
          systemMessage(player, "Nutze: /b [text]");
          return;
        }
        rangeMessage(player, "ooc", chatName(player), args);
        return;
      case "me":
      case "do":
        if (!args) {
          systemMessage(player, `Nutze: /${command} [text]`);
          return;
        }
        rangeMessage(player, command, chatName(player), args);
        return;
      case "try":
        if (!args) {
          systemMessage(player, "Nutze: /try [aktion]");
          return;
        }
        rangeMessage(player, "try", chatName(player), `${args} ${Math.random() < 0.5 ? "(Erfolg)" : "(Fehlschlag)"}`);
        return;
      case "id":
        systemMessage(player, `Spieler-ID: ${player.id} | Server-ID: ${player.id + 1} | Account-ID: ${getVar(player, "ACCOUNT_ID", 0)}`);
        return;
      default:
        systemMessage(player, `Unbekannter Befehl: /${command}`);
        return;
    }
  }

  rangeMessage(player, chatMode === "ic" ? "ic" : chatMode, chatName(player), trimmed);
}

async function bootstrap() {
  await initializeDatabase();

  mp.events.add("playerJoin", (player: any) => {
    player.dimension = 1000 + player.id;
    player.position = vector3(HIDDEN_LOGIN_POSITION.x, HIDDEN_LOGIN_POSITION.y, HIDDEN_LOGIN_POSITION.z);
    setHeading(player, 180);
    player.alpha = 0;
    setVar(player, "LOGGED_IN", false);
    setVar(player, "ACCOUNT_ID", 0);
    setVar(player, "ADMIN_LEVEL", 0);
    setVar(player, "ADMIN_MODE", false);
    setVar(player, "PENDING_SPAWN_SELECTION", false);
    setVar(player, "PENDING_CHARACTER_CREATION", false);
    setVar(player, "BANNED_SCREEN_ACTIVE", false);
    setVar(player, "ADMIN_JAILED", false);
    setVar(player, "ADMIN_JAIL_RELEASE_AT", 0);
    setVar(player, "CASH", 0);
    setVar(player, "BANK_CASH", 0);
  });

  mp.events.add("playerQuit", (player: any) => {
    clearAdminJailTimer(player.id);
    void savePlayerPosition(player).catch((error) => logError("playerQuit save failed", error));
  });

  registerAuthEvents({ accounts, spawns, logError, systemMessage });

  mp.events.add("server:chat:send", (player: any, mode: string, text: string) => {
    void onChatSend(player, mode, text).catch((error) => logError("chat failed", error));
  });

  mp.events.add("fpsync.update", (player: any, cameraPitch: number, cameraHeading: number) => {
    forEachPlayer((target) => {
      if (!target || target === player) {
        return;
      }

      emitClient(target, "fpsync.update", player.id, cameraPitch, cameraHeading);
    });
  });

  logInfo(`TypeScript resource ready. Default spawn ${formatSpawn(DEFAULT_SPAWN)}`);
}

process.on("unhandledRejection", (error) => {
  logError("unhandled rejection", error);
});

process.on("uncaughtException", (error) => {
  logError("uncaught exception", error);
});

void bootstrap().catch((error) => {
  logError("bootstrap failed", error);
});
