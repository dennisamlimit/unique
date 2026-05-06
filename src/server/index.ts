import { config } from "./config";
import { findActiveChatMute } from "./db/chat";
import { assertDatabaseConnection } from "./db/pool";
import { canUseNoClip, handleAdminCommand, sendAdminPanelData, teleportAdminToWaypoint, updateAdminCommandPermission } from "./features/admin";
import { loginAccount, registerAccount, saveUiTheme, sendAuthBootstrap } from "./features/auth";
import {
  beginRoleplayCharacterCreation,
  cancelRoleplayCharacterCreation,
  createRoleplayCharacter,
  deleteDraftCharacters,
  chooseRoleplaySpawn,
  markRoleplayCharacterDead,
  rememberRoleplayCharacterPosition,
  respawnRoleplayCharacter,
  selectRoleplayCharacter
} from "./features/characters";
import { broadcastHudData } from "./features/hud";
import { clearSession, getSession, listOnlinePlayers, registerOnlinePlayer } from "./features/session";
import { closeSupportTicketsForDisconnect, handleAdminSupportTicketAction, handlePlayerSupportTicketAction, handleSupportTicketCreate, sendSupportTickets } from "./features/support";

assertDatabaseConnection()
  .then(() => console.log("[Unique] Database connection ready."))
  .catch((error) => console.error("[Unique] Database connection failed:", error));

mp.events.add("playerJoin", (player: RageMpPlayer) => {
  registerOnlinePlayer(player);
  player.dimension = config.authDimensionOffset + player.id;
  player.spawn(new mp.Vector3(config.spawn.x, config.spawn.y, config.spawn.z));
});

mp.events.add("unique:server:clientReady", async (player: RageMpPlayer) => {
  try {
    await sendAuthBootstrap(player);
  } catch (error) {
    console.error("[Unique] Auth bootstrap failed:", error);
    player.kick("Datenbank nicht erreichbar. Bitte spaeter erneut verbinden.");
  }
});

mp.events.add("unique:server:register", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => registerAccount(player, payloadJson));
});

mp.events.add("unique:server:login", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => loginAccount(player, payloadJson));
});

mp.events.add("unique:server:beginCharacterCreation", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => beginRoleplayCharacterCreation(player, payloadJson));
});

mp.events.add("unique:server:createCharacter", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => createRoleplayCharacter(player, payloadJson));
});

mp.events.add("unique:server:cancelCharacterCreation", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => cancelRoleplayCharacterCreation(player, payloadJson));
});

mp.events.add("unique:server:selectCharacter", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => selectRoleplayCharacter(player, payloadJson));
});

mp.events.add("unique:server:chooseSpawn", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => chooseRoleplaySpawn(player, payloadJson));
});

mp.events.add("unique:server:chatCommand", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, async () => {
    const payload = parsePayload(payloadJson);
    const raw = String(payload.command ?? "").trim().replace(/^\//, "");
    const [command, ...args] = raw.split(/\s+/).filter(Boolean);
    if (!command) {
      return;
    }

    if (handleRoleplayChatCommand(player, command, args)) {
      return;
    }

    const handled = await handleAdminCommand(player, command, args);
    if (!handled) {
      player.call("unique:client:chatPush", [JSON.stringify({ tone: "error", author: "SYSTEM", text: `Unbekannter Befehl: /${command}` })]);
    }
  });
});

mp.events.add("unique:server:chatMessage", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, async () => {
    const payload = parsePayload(payloadJson);
    const message = String(payload.message ?? payload.text ?? "").trim();
    if (!message) {
      return;
    }

    const mode = normalizeChatMode(payload.mode);
    const session = getSession(player);
    if (session?.character) {
      const mute = await findActiveChatMute(session.character.id);
      if (mute) {
        sendSystemChat(player, `Du bist vom Chat ausgeschlossen. Grund: ${mute.reason}`);
        return;
      }
    }
    if (session?.isDead && mode !== "ooc") {
      sendSystemChat(player, "Bewusstlos kannst du nur OOC schreiben.");
      return;
    }

    sendRoleplayMessage(player, mode, message);
  });
});

mp.events.add("unique:server:requestAdminPanel", async (player: RageMpPlayer) => {
  await safe(player, async () => {
    if (await sendAdminPanelData(player)) {
      player.call("unique:client:openAdminPanel");
    }
  });
});

mp.events.add("unique:server:setCommandPermission", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => updateAdminCommandPermission(player, payloadJson));
});

mp.events.add("unique:server:requestNoClip", async (player: RageMpPlayer) => {
  await safe(player, async () => {
    if (await canUseNoClip(player)) {
      player.call("unique:client:toggleNoClip");
    } else {
      player.call("unique:client:chatPush", [JSON.stringify({ tone: "error", author: "SYSTEM", text: "NoClip nicht verfuegbar." })]);
    }
  });
});

mp.events.add("unique:server:teleportWaypoint", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, async () => teleportAdminToWaypoint(player, payloadJson));
});

mp.events.add("unique:server:createSupportTicket", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => handleSupportTicketCreate(player, payloadJson));
});

mp.events.add("unique:server:requestSupportTickets", async (player: RageMpPlayer) => {
  await safe(player, () => sendSupportTickets(player));
});

mp.events.add("unique:server:updateSupportTicket", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => handleAdminSupportTicketAction(player, payloadJson));
});

mp.events.add("unique:server:replySupportTicket", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => handlePlayerSupportTicketAction(player, payloadJson));
});

mp.events.add("unique:server:saveUiTheme", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, () => saveUiTheme(player, payloadJson));
});

mp.events.add("unique:server:inventoryGive", async (player: RageMpPlayer, payloadJson: string) => {
  await safe(player, async () => handleInventoryGive(player, payloadJson));
});

mp.events.add("unique:server:deathStarted", async (player: RageMpPlayer) => {
  await safe(player, () => markRoleplayCharacterDead(player));
});

mp.events.add("unique:server:deathRespawn", async (player: RageMpPlayer) => {
  await safe(player, () => respawnRoleplayCharacter(player));
});

mp.events.add("playerQuit", (player: RageMpPlayer) => {
  const session = getSession(player);
  if (session) {
    rememberRoleplayCharacterPosition(player).catch((error) => {
      console.error("[Unique] Last position save failed:", error);
    });
    deleteDraftCharacters(session.account.id).catch((error) => {
      console.error("[Unique] Draft cleanup failed:", error);
    });
    closeSupportTicketsForDisconnect(player).catch((error) => {
      console.error("[Unique] Ticket disconnect cleanup failed:", error);
    });
  }
  clearSession(player);
  void broadcastHudData();
});

setInterval(() => {
  void broadcastHudData();
}, 30000);

mp.events.addCommand("pos", (player: RageMpPlayer) => {
  const position = player.position;
  if (!position) {
    return;
  }
  player.outputChatBox(`Position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
});

["admin", "heal", "armor", "revive", "setadmin", "addcash", "setcash", "addbank", "setbank", "adduniquecoins", "setuniquecoins", "dim", "setdim", "msg", "veh", "dl", "delveh", "getveh", "amsg", "ban", "iban", "uniban", "jail", "unjail", "warn", "unwarn", "unban", "tmute", "tunmute", "mute", "unmute"].forEach((command) => {
  mp.events.addCommand(command, (player: RageMpPlayer, ...args: string[]) => {
    safe(player, async () => {
      await handleAdminCommand(player, command, args);
    });
  });
});

async function safe(player: RageMpPlayer, action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    console.error("[Unique] Event failed:", error);
    player.call("unique:client:authError", [JSON.stringify({ message: "Ein Serverfehler ist aufgetreten." })]);
  }
}

function parsePayload(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function handleRoleplayChatCommand(player: RageMpPlayer, command: string, args: string[]) {
  const normalized = command.toLowerCase();
  const text = args.join(" ").trim();

  if (normalized === "b") {
    if (!text) {
      sendSystemChat(player, "Nutze: /b [text]");
      return true;
    }
    sendRoleplayMessage(player, "ooc", text);
    return true;
  }

  if (normalized === "me" || normalized === "do" || normalized === "try") {
    if (!text) {
      sendSystemChat(player, `Nutze: /${normalized} [text]`);
      return true;
    }
    sendRoleplayMessage(player, normalized, text);
    return true;
  }

  if (normalized === "id") {
    const characterId = getSession(player)?.character?.id ?? 0;
    sendSystemChat(player, `Deine Charakter-ID ist ${characterId}.`);
    return true;
  }

  return false;
}

function sendRoleplayMessage(player: RageMpPlayer, mode: "ic" | "ooc" | "me" | "do" | "try", rawMessage: string) {
  const message = rawMessage.trim().slice(0, 180);
  if (!message) {
    return;
  }

  const author = getChatAuthor(player);
  if (mode === "ooc") {
    emitChatRange(player, "ooc", author, `(( ${message} ))`);
    return;
  }

  if (mode === "me") {
    emitChatRange(player, "me", "*", `${author} ${message}`);
    return;
  }

  if (mode === "do") {
    emitChatRange(player, "do", "*", `${message} (${author})`);
    return;
  }

  if (mode === "try") {
    const suffix = Math.random() >= 0.5 ? "(Erfolg)" : "(Fehlschlag)";
    emitChatRange(player, "try", "*", `${author} ${message} ${suffix}`);
    return;
  }

  emitChatRange(player, "say", author, message);
}

function emitChatRange(source: RageMpPlayer, tone: "say" | "ooc" | "me" | "do" | "try", author: string, text: string) {
  const sourcePosition = source.position;
  listOnlinePlayers().forEach((target) => {
    if (target.dimension !== source.dimension) {
      return;
    }
    if (sourcePosition && target.position && getDistance(sourcePosition, target.position) > 20) {
      return;
    }
    target.call("unique:client:chatPush", [JSON.stringify({ tone, author, text })]);
  });
}

function getChatAuthor(player: RageMpPlayer) {
  const session = getSession(player);
  return session?.character
    ? `${session.character.firstName} ${session.character.lastName} [${session.character.id}]`
    : `${player.name} [0]`;
}

function normalizeChatMode(value: unknown): "ic" | "ooc" | "me" | "do" | "try" {
  const mode = String(value ?? "ic").toLowerCase();
  return mode === "ooc" || mode === "me" || mode === "do" || mode === "try" ? mode : "ic";
}

function sendSystemChat(player: RageMpPlayer, text: string) {
  player.call("unique:client:chatPush", [JSON.stringify({ tone: "info", author: "SYSTEM", text })]);
}

async function handleInventoryGive(player: RageMpPlayer, payloadJson: string) {
  const payload = parsePayload(payloadJson);
  const targetRemoteId = Math.trunc(Number(payload.targetRemoteId));
  const itemName = String(payload.itemName ?? "Item").trim().slice(0, 48) || "Item";
  const target = listOnlinePlayers().find((onlinePlayer) => onlinePlayer.id === targetRemoteId);

  if (!target || target === player) {
    sendSystemChat(player, "Dieser Spieler ist nicht mehr in deiner Naehe.");
    return;
  }

  if (target.dimension !== player.dimension || !target.position || !player.position || getDistance(player.position, target.position) > 4.0) {
    sendSystemChat(player, "Dieser Spieler ist nicht mehr in deiner Naehe.");
    return;
  }

  sendSystemChat(player, `${itemName} wurde fuer ${getChatAuthor(target)} ausgewaehlt.`);
  sendSystemChat(target, `${getChatAuthor(player)} moechte dir ${itemName} geben.`);
}

function getDistance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
