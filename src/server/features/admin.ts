import { getAdminCommandPermission, listAdminCommandPermissions, setAdminCommandPermission } from "../db/admin";
import { listAdminAccounts, setAccountAdminLevel, setAccountUniqueCoins } from "../db/accounts";
import { clearChatMute, createChatMute } from "../db/chat";
import { setCharacterBankBalance, setCharacterCash, setCharacterDead } from "../db/characters";
import { clearSupportTicketMute, createSupportTicketMute, listOpenSupportTicketsForAdmin } from "../db/support";
import { sendHudData } from "./hud";
import { findOnlineCharacter, getSession, listOnlinePlayers, listSessions, setSession } from "./session";

const adminCommands = [
  "admin",
  "heal",
  "armor",
  "revive",
  "setadmin",
  "addcash",
  "setcash",
  "addbank",
  "setbank",
  "adduniquecoins",
  "setuniquecoins",
  "dim",
  "setdim",
  "msg",
  "veh",
  "dl",
  "delveh",
  "getveh",
  "tmute",
  "tunmute",
  "mute",
  "unmute"
];

const permissionKeys = [...adminCommands, "noclip"];

export async function handleAdminCommand(player: RageMpPlayer, command: string, rawArgs: string[]) {
  const normalized = command.toLowerCase();
  if (!adminCommands.includes(normalized)) {
    return false;
  }

  if (!(await hasAdminPermission(player, normalized))) {
    sendAdminFeedback(player, "Keine Berechtigung fuer diesen Befehl.");
    return true;
  }

  if (normalized === "admin") {
    return toggleAdminMode(player);
  }

  if (!ensureAdminMode(player)) {
    return true;
  }

  if (normalized === "heal") {
    return healCommand(player, rawArgs);
  }

  if (normalized === "armor") {
    return armorCommand(player, rawArgs);
  }

  if (normalized === "revive") {
    return reviveCommand(player, rawArgs);
  }

  if (normalized === "setadmin") {
    return setAdminCommand(player, rawArgs);
  }

  if (normalized === "addcash" || normalized === "setcash") {
    return balanceCommand(player, rawArgs, "cash", normalized === "addcash" ? "add" : "set");
  }

  if (normalized === "addbank" || normalized === "setbank") {
    return balanceCommand(player, rawArgs, "bank", normalized === "addbank" ? "add" : "set");
  }

  if (normalized === "adduniquecoins" || normalized === "setuniquecoins") {
    return uniqueCoinsCommand(player, rawArgs, normalized === "adduniquecoins" ? "add" : "set");
  }

  if (normalized === "dim") {
    return dimensionInfoCommand(player, rawArgs);
  }

  if (normalized === "setdim") {
    return setDimensionCommand(player, rawArgs);
  }

  if (normalized === "msg") {
    return adminMessageCommand(player, rawArgs);
  }

  if (normalized === "veh") {
    return vehicleCommand(player, rawArgs);
  }

  if (normalized === "dl") {
    return vehicleDebugCommand(player);
  }

  if (normalized === "delveh") {
    return deleteVehicleCommand(player, rawArgs);
  }

  if (normalized === "getveh") {
    return getVehicleCommand(player, rawArgs);
  }

  if (normalized === "tmute") {
    return ticketMuteCommand(player, rawArgs);
  }

  if (normalized === "tunmute") {
    return ticketUnmuteCommand(player, rawArgs);
  }

  if (normalized === "mute") {
    return chatMuteCommand(player, rawArgs);
  }

  if (normalized === "unmute") {
    return chatUnmuteCommand(player, rawArgs);
  }

  return false;
}

export async function sendAdminPanelData(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session || session.account.adminLevel <= 0) {
    return false;
  }
  if (!session.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return false;
  }

  const permissions = await listAdminCommandPermissions();
  const tickets = await listOpenSupportTicketsForAdmin(session.account.adminLevel);
  const onlineSessions = listSessions();
  const onlineAccountIds = new Set(onlineSessions.map(({ session: onlineSession }) => onlineSession.account.id));
  const adminAccounts = await listAdminAccounts();
  const admins = adminAccounts.map((account) => {
    const online = onlineSessions.find(({ session: onlineSession }) => onlineSession.account.id === account.id);
    const character = online?.session.character;
    return {
      accountId: account.id,
      characterId: character?.id ?? null,
      name: character ? `${character.firstName} ${character.lastName}` : account.socialClubName,
      level: account.adminLevel,
      online: onlineAccountIds.has(account.id)
    };
  });

  const players = onlineSessions
    .filter(({ session: onlineSession }) => onlineSession.character)
    .map(({ session: onlineSession }) => ({
      id: onlineSession.character?.id ?? 0,
      name: `${onlineSession.character?.firstName} ${onlineSession.character?.lastName}`,
      adminLevel: onlineSession.account.adminLevel,
      level: onlineSession.character?.level ?? 1,
      cash: onlineSession.character?.cash ?? 0,
      bankBalance: onlineSession.character?.bankBalance ?? 0,
      uniqueCoins: onlineSession.account.uniqueCoins
    }));

  player.call("unique:client:adminPanelData", [
    JSON.stringify({
      admins,
      players,
      commands: permissions.filter((permission) => permissionKeys.includes(permission.command)),
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        characterId: ticket.characterId,
        accountId: ticket.accountId,
        characterName: ticket.characterName,
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority,
        assignedAdminAccountId: ticket.assignedAdminAccountId,
        assignedAdminName: ticket.assignedAdminName,
        escalatedToLevel: ticket.escalatedToLevel,
        ownerOnline: Boolean(findOnlineCharacter(ticket.characterId)),
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        messages: ticket.messages.map((message) => ({
          id: message.id,
          ticketId: message.ticketId,
          authorCharacterId: message.authorCharacterId,
          authorAccountId: message.authorAccountId,
          authorName: message.authorName,
          authorRole: message.authorRole,
          message: message.message,
          createdAt: message.createdAt.toISOString()
        }))
      })),
      currentAdminLevel: session.account.adminLevel,
      adminMode: Boolean(session.adminMode),
      canManagePermissions: session.account.adminLevel >= 10
    })
  ]);
  return true;
}

export async function updateAdminCommandPermission(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session || session.account.adminLevel < 10) {
    return;
  }
  if (!session.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return;
  }

  const payload = parsePayload(payloadJson);
  const command = String(payload.command ?? "").toLowerCase();
  const minLevel = clampInt(payload.minLevel, 1, 10, 1);

  if (!permissionKeys.includes(command)) {
    return sendAdminFeedback(player, "Unbekannte Berechtigung.");
  }

  await setAdminCommandPermission(command, minLevel);
  sendAdminFeedback(player, `${command} ist jetzt ab Admin Level ${minLevel} erlaubt.`);
  await sendAdminPanelData(player);
}

export async function canUseNoClip(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return false;
  }

  return hasAdminPermission(player, "noclip");
}

export function teleportAdminToWaypoint(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session || session.account.adminLevel <= 0 || !session.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return;
  }

  const payload = parsePayload(payloadJson);
  const x = Number(payload.x);
  const y = Number(payload.y);
  const z = Number(payload.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    sendAdminFeedback(player, "Kein gueltiger Kartenmarker gefunden.");
    return;
  }

  player.spawn(new mp.Vector3(x, y, z));
  sendAdminFeedback(player, `Teleportiert zu ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}.`);
}

async function hasAdminPermission(player: RageMpPlayer, command: string) {
  const session = getSession(player);
  if (!session || session.account.adminLevel <= 0) {
    return false;
  }

  const permission = await getAdminCommandPermission(command);
  return session.account.adminLevel >= (permission?.minLevel ?? 1);
}

function toggleAdminMode(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session) {
    return true;
  }

  const adminMode = !session.adminMode;
  setSession(player, { ...session, adminMode });
  if (!adminMode) {
    player.call("unique:client:stopNoClip");
    player.call("unique:client:setVehicleDebug", [false]);
  }
  void sendHudData(player);
  sendAdminFeedback(player, `Adminmodus ${adminMode ? "aktiviert" : "deaktiviert"}.`);
  return true;
}

function healCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]) ?? player;
  target.health = 100;
  sendAdminFeedback(player, `${getDisplayName(target)} geheilt.`);
  if (target.id !== player.id) {
    sendAdminFeedback(target, `Du wurdest von ${getDisplayName(player)} geheilt.`, player);
  }
  return true;
}

function armorCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]) ?? player;
  target.armour = 100;
  sendAdminFeedback(player, `${getDisplayName(target)} hat Armor erhalten.`);
  if (target.id !== player.id) {
    sendAdminFeedback(target, `Du hast von ${getDisplayName(player)} Armor erhalten.`, player);
  }
  return true;
}

async function reviveCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]) ?? player;
  const position = target.position ?? player.position;
  if (position) {
    target.spawn(new mp.Vector3(position.x, position.y, position.z));
  }
  target.health = 100;
  target.armour = 0;
  const session = getSession(target);
  if (session?.character) {
    const updatedCharacter = await setCharacterDead(session.character.id, false);
    setSession(target, {
      ...session,
      character: updatedCharacter ?? { ...session.character, isDead: false },
      isDead: false
    });
    target.call("unique:client:deathHide");
  }
  sendAdminFeedback(player, `${getDisplayName(target)} revived.`);
  if (target.id !== player.id) {
    sendAdminFeedback(target, `Du wurdest von ${getDisplayName(player)} revived.`, player);
  }
  return true;
}

async function balanceCommand(player: RageMpPlayer, args: string[], wallet: "cash" | "bank", mode: "add" | "set") {
  const parsed = parseTargetAmount(player, args);
  if (!parsed) {
    sendAdminFeedback(player, `Nutzung: /${mode}${wallet} [charId] <betrag>`);
    return true;
  }

  const session = getSession(parsed.target);
  if (!session?.character) {
    sendAdminFeedback(player, "Zielspieler hat keinen aktiven Charakter.");
    return true;
  }

  const current = wallet === "cash" ? session.character.cash : session.character.bankBalance;
  const nextAmount = mode === "add" ? current + parsed.amount : parsed.amount;
  const updated = wallet === "cash"
    ? await setCharacterCash(session.character.id, nextAmount)
    : await setCharacterBankBalance(session.character.id, nextAmount);

  if (updated) {
    setSession(parsed.target, { ...session, character: updated });
    void sendHudData(parsed.target);
  }

  sendAdminFeedback(player, `${wallet === "cash" ? "Bargeld" : "Bank"} fuer ${getDisplayName(parsed.target)}: ${nextAmount}.`);
  sendAdminFeedback(parsed.target, `${wallet === "cash" ? "Bargeld" : "Bank"} wurde ${mode === "add" ? "erhoeht" : "gesetzt"}: ${nextAmount}.`, player);
  return true;
}

async function uniqueCoinsCommand(player: RageMpPlayer, args: string[], mode: "add" | "set") {
  const parsed = parseTargetAmount(player, args);
  if (!parsed) {
    sendAdminFeedback(player, `Nutzung: /${mode}uniquecoins [charId] <betrag>`);
    return true;
  }

  const session = getSession(parsed.target);
  if (!session) {
    sendAdminFeedback(player, "Zielspieler ist nicht eingeloggt.");
    return true;
  }

  const nextAmount = mode === "add" ? session.account.uniqueCoins + parsed.amount : parsed.amount;
  const updated = await setAccountUniqueCoins(session.account.id, nextAmount);
  if (updated) {
    setSession(parsed.target, { ...session, account: updated });
  }

  sendAdminFeedback(player, `Unique Coins fuer ${getDisplayName(parsed.target)}: ${nextAmount}.`);
  sendAdminFeedback(parsed.target, `Deine Unique Coins wurden ${mode === "add" ? "erhoeht" : "gesetzt"}: ${nextAmount}.`, player);
  return true;
}

async function setAdminCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]);
  const level = clampInt(args[1], 0, 10, -1);
  if (!target || level < 0) {
    sendAdminFeedback(player, "Nutzung: /setadmin <charId> <0-10>");
    return true;
  }

  const session = getSession(target);
  if (!session) {
    sendAdminFeedback(player, "Zielspieler ist nicht eingeloggt.");
    return true;
  }

  const updated = await setAccountAdminLevel(session.account.id, level);
  if (updated) {
    setSession(target, { ...session, account: updated, adminMode: level > 0 ? session.adminMode : false });
    if (level <= 0) {
      target.call("unique:client:stopNoClip");
      target.call("unique:client:setVehicleDebug", [false]);
    }
    void sendHudData(target);
  }

  sendAdminFeedback(player, `Adminlevel fuer ${getDisplayName(target)} auf ${level} gesetzt.`);
  sendAdminFeedback(target, `Dein Adminlevel wurde auf ${level} gesetzt.`, player);
  return true;
}

function dimensionInfoCommand(player: RageMpPlayer, args: string[]) {
  const target = args[0] ? findTarget(args[0]) : player;
  if (!target) {
    sendAdminFeedback(player, "Spieler nicht gefunden. Nutzung: /dim [charId]");
    return true;
  }

  sendAdminFeedback(player, `${getDisplayName(target)} ist in Dimension ${target.dimension}.`);
  return true;
}

function setDimensionCommand(player: RageMpPlayer, args: string[]) {
  const parsed = parseTargetDimension(player, args);
  if (!parsed) {
    sendAdminFeedback(player, "Nutzung: /setdim <dimension> oder /setdim <charId> <dimension>");
    return true;
  }

  parsed.target.dimension = parsed.dimension;
  sendAdminFeedback(player, `${getDisplayName(parsed.target)} wurde in Dimension ${parsed.dimension} gesetzt.`);
  if (parsed.target.id !== player.id) {
    sendAdminFeedback(parsed.target, `Deine Dimension wurde auf ${parsed.dimension} gesetzt.`, player);
  }
  return true;
}

function adminMessageCommand(player: RageMpPlayer, args: string[]) {
  const text = args.join(" ").trim();
  if (!text) {
    sendAdminFeedback(player, "Nutzung: /msg <nachricht>");
    return true;
  }

  const author = getAdminAuthor(player);
  listOnlinePlayers().forEach((target) => {
    target.call("unique:client:chatPush", [JSON.stringify({ tone: "admin", author, text: text.slice(0, 180) })]);
  });
  return true;
}

function vehicleCommand(player: RageMpPlayer, args: string[]) {
  const parsed = parseVehicleArgs(args);
  const position = player.position;
  if (!position) {
    sendAdminFeedback(player, "Deine Position konnte nicht gelesen werden.");
    return true;
  }

  const heading = Number.isFinite(player.heading) ? Number(player.heading) : 0;
  const radians = heading * Math.PI / 180;
  const spawnPosition = new mp.Vector3(
    position.x - Math.sin(radians) * 4.0,
    position.y + Math.cos(radians) * 4.0,
    position.z + 0.5
  );

  try {
    const vehicle = (mp as unknown as { vehicles: { new: (model: string, position: RageMpVector3, options?: Record<string, unknown>) => RageMpVehicle } }).vehicles.new(parsed.model, spawnPosition, {
      heading,
      numberPlate: parsed.plate,
      color: [parsed.color, parsed.color],
      locked: false,
      engine: true,
      dimension: player.dimension
    });
    vehicle.dimension = player.dimension;
    vehicle.setVariable?.("unique:vehicle:modelName", parsed.model);

    if (typeof player.putIntoVehicle === "function") {
      player.putIntoVehicle(vehicle, 0);
    }

    sendAdminFeedback(player, `Fahrzeug ${parsed.model} gespawnt: ID ${getVehicleId(vehicle)} (${parsed.plate}).`);
  } catch {
    sendAdminFeedback(player, `Fahrzeug konnte nicht gespawnt werden: ${parsed.model}.`);
  }

  return true;
}

function vehicleDebugCommand(player: RageMpPlayer) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  player.call("unique:client:toggleVehicleDebug");
  return true;
}

function deleteVehicleCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const vehicleId = Number(args[0]);
  if (!Number.isInteger(vehicleId) || vehicleId < 0) {
    sendAdminFeedback(player, "Nutzung: /delveh <fahrzeug-id>");
    return true;
  }

  const vehicle = (mp as unknown as { vehicles: { at?: (id: number) => RageMpVehicle | undefined } }).vehicles.at?.(vehicleId);
  if (!vehicle) {
    sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} nicht gefunden.`);
    return true;
  }

  try {
    vehicle.destroy?.();
    sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} geloescht.`);
  } catch {
    sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} konnte nicht geloescht werden.`);
  }

  return true;
}

function getVehicleCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const vehicleId = Number(args[0]);
  if (!Number.isInteger(vehicleId) || vehicleId < 0) {
    sendAdminFeedback(player, "Nutzung: /getveh <fahrzeug-id>");
    return true;
  }

  const vehicle = (mp as unknown as { vehicles: { at?: (id: number) => RageMpVehicle | undefined } }).vehicles.at?.(vehicleId);
  if (!vehicle) {
    sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} nicht gefunden.`);
    return true;
  }

  const position = player.position;
  if (!position) {
    sendAdminFeedback(player, "Deine Position konnte nicht gelesen werden.");
    return true;
  }

  const heading = Number.isFinite(player.heading) ? Number(player.heading) : 0;
  const radians = heading * Math.PI / 180;
  vehicle.position = new mp.Vector3(
    position.x - Math.sin(radians) * 4.0,
    position.y + Math.cos(radians) * 4.0,
    position.z + 0.5
  );
  vehicle.dimension = player.dimension;
  vehicle.heading = heading;

  sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} zu dir teleportiert.`);
  return true;
}

async function ticketMuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const target = findTarget(args[0]);
  const duration = parseTicketMuteDuration(args[1]);
  if (!target || !duration) {
    sendAdminFeedback(player, "Nutzung: /tmute <charId> <dauer> <grund>");
    return true;
  }

  const targetSession = getSession(target);
  const adminSession = getSession(player);
  if (!targetSession?.character || !targetSession.account) {
    sendAdminFeedback(player, "Zielspieler ist nicht eingeloggt.");
    return true;
  }

  const reason = args.slice(2).join(" ").trim() || "Kein Grund angegeben";
  const expiresAt = new Date(Date.now() + duration.ms);
  await createSupportTicketMute({
    characterId: targetSession.character.id,
    accountId: targetSession.account.id,
    mutedByAccountId: adminSession?.account.id ?? null,
    mutedByName: getDisplayName(player),
    reason,
    expiresAt
  });

  const message = `hat ${getDisplayName(target)} vom Support ausgeschlossen. Grund: ${reason}`;
  broadcastAdminChat(message, player);
  target.call("unique:client:supportMuteNotice", [
    JSON.stringify({
      administrator: getDisplayName(player),
      reason,
      expiresAt: expiresAt.toISOString()
    })
  ]);
  return true;
}

async function ticketUnmuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const target = findTarget(args[0]);
  if (!target) {
    sendAdminFeedback(player, "Nutzung: /tunmute <charId>");
    return true;
  }

  const targetSession = getSession(target);
  if (!targetSession?.character) {
    sendAdminFeedback(player, "Zielspieler ist nicht eingeloggt.");
    return true;
  }

  await clearSupportTicketMute(targetSession.character.id);
  const message = `hat ${getDisplayName(target)} wieder fuer den Support freigegeben.`;
  broadcastAdminChat(message, player);
  return true;
}

async function chatMuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const target = findTarget(args[0]);
  const targetSession = target ? getSession(target) : null;
  const adminSession = getSession(player);
  if (!target || !targetSession?.character || !targetSession.account) {
    sendAdminFeedback(player, "Nutzung: /mute <charId> <dauer> <grund> oder /mute <eigeneId> zum Entmuten als Admin");
    return true;
  }

  const isSelfUnmute = target.id === player.id && adminSession && adminSession.account.adminLevel > 0 && args.length === 1;
  if (isSelfUnmute) {
    await clearChatMute(targetSession.character.id);
    sendAdminFeedback(player, "Du hast deinen Chat-Mute aufgehoben.");
    return true;
  }

  const duration = parseTicketMuteDuration(args[1]);
  if (!duration) {
    sendAdminFeedback(player, "Nutzung: /mute <charId> <dauer> <grund>");
    return true;
  }

  const reason = args.slice(2).join(" ").trim() || "Kein Grund angegeben";
  const expiresAt = new Date(Date.now() + duration.ms);
  await createChatMute({
    characterId: targetSession.character.id,
    accountId: targetSession.account.id,
    mutedByAccountId: adminSession?.account.id ?? null,
    mutedByName: getDisplayName(player),
    reason,
    expiresAt
  });

  broadcastAdminChat(`hat ${getDisplayName(target)} vom Chat ausgeschlossen. Grund: ${reason}`, player);
  target.call("unique:client:chatMuteNotice", [
    JSON.stringify({
      administrator: getDisplayName(player),
      reason,
      expiresAt: expiresAt.toISOString()
    })
  ]);
  return true;
}

async function chatUnmuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const target = findTarget(args[0]);
  if (!target) {
    sendAdminFeedback(player, "Nutzung: /unmute <charId>");
    return true;
  }

  const targetSession = getSession(target);
  if (!targetSession?.character) {
    sendAdminFeedback(player, "Zielspieler ist nicht eingeloggt.");
    return true;
  }

  await clearChatMute(targetSession.character.id);
  broadcastAdminChat(`hat ${getDisplayName(target)} wieder fuer den Chat freigegeben.`, player);
  return true;
}

function ensureAdminMode(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return false;
  }

  return true;
}

function getVehicleId(vehicle: RageMpVehicle) {
  return Number.isInteger(vehicle.id) ? vehicle.id : "?";
}

function parseVehicleArgs(args: string[]) {
  const model = normalizeVehicleModel(args[0]);
  const rest = model === "adder" && args[0] && isNumericToken(args[0]) ? args : args.slice(model === "adder" && !args[0] ? 0 : 1);
  const colorNumbers: number[] = [];
  const plateParts: string[] = [];

  rest.forEach((part) => {
    if (colorNumbers.length < 3 && isNumericToken(part)) {
      colorNumbers.push(clampInt(part, 0, 255, 255));
      return;
    }
    plateParts.push(part);
  });

  while (colorNumbers.length < 3) {
    colorNumbers.push(255);
  }

  return {
    model,
    color: colorNumbers.slice(0, 3) as [number, number, number],
    plate: normalizePlate(plateParts.join(" "))
  };
}

function normalizeVehicleModel(value?: string) {
  if (!value || isNumericToken(value)) {
    return "adder";
  }

  return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "adder";
}

function normalizePlate(value: string) {
  const plate = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
  return plate || "UNIQUE";
}

function isNumericToken(value?: string) {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

function parseTicketMuteDuration(value?: string) {
  const match = String(value ?? "").trim().toLowerCase().match(/^(\d+)([smh])?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2] ?? "m";
  const multiplier = unit === "s" ? 1000 : unit === "h" ? 60 * 60 * 1000 : 60 * 1000;
  return { ms: Math.trunc(amount) * multiplier };
}

function formatTicketMuteDate(date: Date) {
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseTargetAmount(player: RageMpPlayer, args: string[]) {
  if (args.length === 1) {
    const amount = Number(args[0]);
    if (!Number.isFinite(amount)) {
      return null;
    }
    return { target: player, amount: Math.max(0, Math.trunc(amount)) };
  }

  if (args.length >= 2) {
    const target = findTarget(args[0]);
    const amount = Number(args[1]);
    if (!target || !Number.isFinite(amount)) {
      return null;
    }
    return { target, amount: Math.max(0, Math.trunc(amount)) };
  }

  return null;
}

function parseTargetDimension(player: RageMpPlayer, args: string[]) {
  if (args.length === 1) {
    const dimension = Number(args[0]);
    if (!Number.isInteger(dimension) || dimension < 0) {
      return null;
    }
    return { target: player, dimension };
  }

  if (args.length >= 2) {
    const target = findTarget(args[0]);
    const dimension = Number(args[1]);
    if (!target || !Number.isInteger(dimension) || dimension < 0) {
      return null;
    }
    return { target, dimension };
  }

  return null;
}

function findTarget(value?: string) {
  const id = Number(value);
  if (!Number.isFinite(id)) {
    return null;
  }
  return findOnlineCharacter(Math.trunc(id));
}

function getCharacterId(player: RageMpPlayer) {
  return getSession(player)?.character?.id ?? 0;
}

function getAdminAuthor(player: RageMpPlayer) {
  return getDisplayName(player);
}

function getDisplayName(player: RageMpPlayer) {
  const session = getSession(player);
  if (session?.character) {
    return `${session.character.firstName} ${session.character.lastName} [${session.character.id}]`;
  }
  return `${player.name} [0]`;
}

function sendAdminFeedback(target: RageMpPlayer, message: string, authorPlayer = target) {
  target.call("unique:client:chatPush", [JSON.stringify({ tone: "admin", author: getDisplayName(authorPlayer), text: message })]);
}

function broadcastAdminChat(message: string, authorPlayer: RageMpPlayer) {
  listOnlinePlayers().forEach((target) => sendAdminFeedback(target, message, authorPlayer));
}

function parsePayload(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(number)));
}
