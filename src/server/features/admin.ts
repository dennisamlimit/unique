import { config } from "../config";
import { createAdminLog, getAdminCommandPermission, listAdminCommandPermissions, listAdminLogs, setAdminCommandPermission } from "../db/admin";
import { setAccountUniqueCoins } from "../db/accounts";
import { clearChatMute, createChatMute } from "../db/chat";
import { findCharacterById, listAdminCharacters, setCharacterAdminLevel, setCharacterBankBalance, setCharacterCash, setCharacterDead } from "../db/characters";
import { countActiveWarns, createAdminPunishment, findActiveJail, liftActivePunishments, liftLatestActiveWarn } from "../db/punishments";
import { clearSupportTicketMute, createSupportTicketMute, listOpenSupportTicketsForAdmin } from "../db/support";
import { clearAdminJailStatus, kickAfterAdminScreen, movePlayerToJailCell, prisonReleasePosition, sendAdminScreen, sendJailStatusFromPunishment, sendPunishmentScreen } from "./adminScreens";
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
  "amsg",
  "ban",
  "iban",
  "uniban",
  "jail",
  "unjail",
  "warn",
  "unwarn",
  "unban",
  "tmute",
  "tunmute",
  "mute",
  "unmute"
];

const permissionKeys = [...adminCommands, "noclip", "permissions", "logs"];

export async function handleAdminCommand(player: RageMpPlayer, command: string, rawArgs: string[]) {
  const normalized = command.toLowerCase();
  if (!adminCommands.includes(normalized)) {
    return false;
  }

  if (!(await hasAdminPermission(player, normalized))) {
    sendAdminFeedback(player, "Keine Berechtigung fuer diesen Befehl.");
    await logAdminAction(player, normalized, rawArgs, "Keine Berechtigung", false);
    return true;
  }

  if (normalized === "admin") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => toggleAdminMode(player));
  }

  if (normalized === "setadmin") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => setAdminCommand(player, rawArgs));
  }

  if (!ensureAdminMode(player)) {
    await logAdminAction(player, normalized, rawArgs, "Adminmodus nicht aktiv", false);
    return true;
  }

  if (normalized === "heal") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => healCommand(player, rawArgs));
  }

  if (normalized === "armor") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => armorCommand(player, rawArgs));
  }

  if (normalized === "revive") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => reviveCommand(player, rawArgs));
  }

  if (normalized === "addcash" || normalized === "setcash") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => balanceCommand(player, rawArgs, "cash", normalized === "addcash" ? "add" : "set"));
  }

  if (normalized === "addbank" || normalized === "setbank") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => balanceCommand(player, rawArgs, "bank", normalized === "addbank" ? "add" : "set"));
  }

  if (normalized === "adduniquecoins" || normalized === "setuniquecoins") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => uniqueCoinsCommand(player, rawArgs, normalized === "adduniquecoins" ? "add" : "set"));
  }

  if (normalized === "dim") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => dimensionInfoCommand(player, rawArgs));
  }

  if (normalized === "setdim") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => setDimensionCommand(player, rawArgs));
  }

  if (normalized === "msg") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => adminMessageCommand(player, rawArgs));
  }

  if (normalized === "veh") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => vehicleCommand(player, rawArgs));
  }

  if (normalized === "dl") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => vehicleDebugCommand(player));
  }

  if (normalized === "delveh") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => deleteVehicleCommand(player, rawArgs));
  }

  if (normalized === "getveh") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => getVehicleCommand(player, rawArgs));
  }

  if (normalized === "amsg") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => adminDirectMessageCommand(player, rawArgs));
  }

  if (normalized === "ban") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => banCommand(player, rawArgs));
  }

  if (normalized === "iban") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => accountBanCommand(player, rawArgs));
  }

  if (normalized === "uniban") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => unAccountBanCommand(player, rawArgs));
  }

  if (normalized === "jail") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => jailCommand(player, rawArgs));
  }

  if (normalized === "unjail") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => unjailCommand(player, rawArgs));
  }

  if (normalized === "warn") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => warnCommand(player, rawArgs));
  }

  if (normalized === "unwarn") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => unwarnCommand(player, rawArgs));
  }

  if (normalized === "unban") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => unbanCommand(player, rawArgs));
  }

  if (normalized === "tmute") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => ticketMuteCommand(player, rawArgs));
  }

  if (normalized === "tunmute") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => ticketUnmuteCommand(player, rawArgs));
  }

  if (normalized === "mute") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => chatMuteCommand(player, rawArgs));
  }

  if (normalized === "unmute") {
    return runLoggedAdminCommand(player, normalized, rawArgs, () => chatUnmuteCommand(player, rawArgs));
  }

  return false;
}

export async function sendAdminPanelData(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session || getSessionAdminLevel(session) <= 0) {
    return false;
  }
  if (!session.adminMode) {
    sendAdminFeedback(player, "Aktiviere zuerst den Adminmodus mit /admin.");
    return false;
  }

  const permissions = await listAdminCommandPermissions();
  const canManagePermissions = await hasAdminPermission(player, "permissions");
  const canViewLogs = await hasAdminPermission(player, "logs");
  const logs = canViewLogs ? await listAdminLogs(120) : [];
  const tickets = await listOpenSupportTicketsForAdmin(getSessionAdminLevel(session));
  const onlineSessions = listSessions();
  const onlineCharacterIds = new Set(onlineSessions.map(({ session: onlineSession }) => onlineSession.character?.id).filter((id): id is number => Number.isFinite(id)));
  const adminCharacters = await listAdminCharacters();
  const admins = adminCharacters.map(({ character, socialClubName }) => {
    const online = onlineSessions.find(({ session: onlineSession }) => onlineSession.character?.id === character.id);
    return {
      accountId: character.accountId,
      characterId: character.id,
      name: `${character.firstName} ${character.lastName}`,
      level: character.adminLevel,
      online: onlineCharacterIds.has(character.id),
      socialClubName
    };
  });

  const players = onlineSessions
    .filter(({ session: onlineSession }) => onlineSession.character)
    .map(({ session: onlineSession }) => ({
      id: onlineSession.character?.id ?? 0,
      name: `${onlineSession.character?.firstName} ${onlineSession.character?.lastName}`,
      adminLevel: onlineSession.character?.adminLevel ?? 0,
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
      logs: logs.map((entry) => ({
        id: entry.id,
        adminAccountId: entry.adminAccountId,
        adminCharacterId: entry.adminCharacterId,
        adminName: entry.adminName,
        command: entry.command,
        rawArgs: entry.rawArgs,
        details: entry.details,
        success: entry.success,
        createdAt: entry.createdAt.toISOString()
      })),
      currentAdminLevel: getSessionAdminLevel(session),
      adminMode: Boolean(session.adminMode),
      canManagePermissions,
      canViewLogs
    })
  ]);
  return true;
}

export async function updateAdminCommandPermission(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session || !(await hasAdminPermission(player, "permissions"))) {
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
  await logAdminAction(player, "permissions", [`${command}`, String(minLevel)], `${command} ab Admin Level ${minLevel}`, true);
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
  if (!session || getSessionAdminLevel(session) <= 0 || !session.adminMode) {
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
  if (!session || getSessionAdminLevel(session) <= 0) {
    return false;
  }

  const permission = await getAdminCommandPermission(command);
  return getSessionAdminLevel(session) >= (permission?.minLevel ?? 1);
}

async function runLoggedAdminCommand(player: RageMpPlayer, command: string, args: string[], action: () => boolean | Promise<boolean>) {
  try {
    const handled = await action();
    if (handled) {
      await logAdminAction(player, command, args, null, true);
    }
    return handled;
  } catch (error) {
    await logAdminAction(player, command, args, String(error), false);
    throw error;
  }
}

async function logAdminAction(player: RageMpPlayer, command: string, args: string[], details: string | null, success: boolean) {
  const session = getSession(player);
  await createAdminLog({
    adminAccountId: session?.account.id ?? null,
    adminCharacterId: session?.character?.id ?? null,
    adminName: getDisplayName(player),
    command,
    rawArgs: args.join(" ").slice(0, 600),
    details,
    success
  });
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
  if (!session?.character) {
    sendAdminFeedback(player, "Zielspieler hat keinen aktiven Charakter.");
    return true;
  }

  const updated = await setCharacterAdminLevel(session.character.id, level);
  if (updated) {
    setSession(target, { ...session, character: updated, adminMode: level > 0 ? session.adminMode : false });
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
  try {
    (vehicle as RageMpVehicle & { setHeading?: (heading: number) => void }).setHeading?.(heading);
  } catch {}

  sendAdminFeedback(player, `Fahrzeug ID ${vehicleId} zu dir teleportiert.`);
  return true;
}

async function adminDirectMessageCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]);
  const message = args.slice(1).join(" ").trim();
  if (!target || message.length < 2) {
    sendAdminFeedback(player, "Nutzung: /amsg <charId> <nachricht>");
    return true;
  }

  const adminSession = getSession(player);
  sendAdminScreen(target, {
    type: "amsg",
    title: "Nachricht vom Administrator",
    administrator: getDisplayName(player),
    administratorId: adminSession?.character?.id ?? null,
    targetName: getDisplayName(target),
    message: message.slice(0, 1200),
    createdAt: new Date().toISOString()
  });
  sendAdminFeedback(player, `Admin-Nachricht an ${getDisplayName(target)} gesendet.`);
  return true;
}

async function banCommand(player: RageMpPlayer, args: string[]) {
  const duration = parsePunishmentDuration(args[1], "d");
  const subject = await findPunishmentSubject(args[0]);
  if (!subject || !duration) {
    sendAdminFeedback(player, "Nutzung: /ban <charId> <dauer> <grund>");
    return true;
  }

  const reason = args.slice(2).join(" ").trim() || "Kein Grund angegeben";
  const punishment = await createPunishmentFromSubject(player, subject, "ban", duration.seconds, reason);
  if (subject.player) {
    sendPunishmentScreen(subject.player, punishment);
    kickAfterAdminScreen(subject.player, "Charakter gebannt.");
  }
  broadcastAdminAction(player, subject.name, "gebannt", reason);
  sendAdminFeedback(player, `${subject.name} wurde bis ${formatTicketMuteDate(punishment.expiresAt)} gebannt.`);
  return true;
}

async function accountBanCommand(player: RageMpPlayer, args: string[]) {
  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /iban <charId> <grund>");
    return true;
  }

  const reason = args.slice(1).join(" ").trim() || "Kein Grund angegeben";
  const durationSeconds = 9999 * 24 * 60 * 60;
  const punishment = await createPunishmentFromSubject(player, subject, "iban", durationSeconds, reason);
  if (subject.player) {
    sendPunishmentScreen(subject.player, punishment);
    kickAfterAdminScreen(subject.player, "Account gebannt.");
  }
  broadcastAdminAction(player, subject.name, "account-gebannt", reason);
  sendAdminFeedback(player, `${subject.name} wurde permanent vom Account ausgeschlossen.`);
  return true;
}

async function jailCommand(player: RageMpPlayer, args: string[]) {
  const duration = parsePunishmentDuration(args[1], "m");
  const subject = await findPunishmentSubject(args[0]);
  if (!subject || !duration) {
    sendAdminFeedback(player, "Nutzung: /jail <charId> <dauer> <grund>");
    return true;
  }

  const reason = args.slice(2).join(" ").trim() || "Kein Grund angegeben";
  const punishment = await createPunishmentFromSubject(player, subject, "jail", duration.seconds, reason);
  if (subject.player) {
    movePlayerToJailCell(subject.player);
    sendPunishmentScreen(subject.player, punishment);
    sendJailStatusFromPunishment(subject.player, punishment);
    scheduleJailRelease(subject.player, subject.characterId, punishment.expiresAt);
  }
  broadcastAdminAction(player, subject.name, "gejailt", reason);
  sendAdminFeedback(player, `${subject.name} wurde inhaftiert bis ${formatTicketMuteDate(punishment.expiresAt)}.`);
  return true;
}

async function unjailCommand(player: RageMpPlayer, args: string[]) {
  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /unjail <charId>");
    return true;
  }

  const lifted = await liftActivePunishments({
    type: "jail",
    accountId: subject.accountId,
    characterId: subject.characterId,
    liftedByAccountId: getSession(player)?.account.id ?? null,
    liftedByName: getDisplayName(player)
  });
  if (subject.player) {
    subject.player.dimension = 0;
    subject.player.spawn(new mp.Vector3(prisonReleasePosition.x, prisonReleasePosition.y, prisonReleasePosition.z));
    subject.player.heading = prisonReleasePosition.heading;
    clearAdminJailStatus(subject.player);
  }
  if (lifted.length) {
    broadcastAdminAction(player, subject.name, "entjailt", "Strafe aufgehoben");
  }
  sendAdminFeedback(player, lifted.length ? `${subject.name} wurde aus dem Jail entlassen.` : "Keine aktive Jail-Strafe gefunden.");
  return true;
}

async function warnCommand(player: RageMpPlayer, args: string[]) {
  const duration = parsePunishmentDuration(args[1], "m");
  const subject = await findPunishmentSubject(args[0]);
  if (!subject || !duration) {
    sendAdminFeedback(player, "Nutzung: /warn <charId> <jaildauer> <grund>");
    return true;
  }

  const reason = args.slice(2).join(" ").trim() || "Kein Grund angegeben";
  const warnDurationSeconds = 7 * 24 * 60 * 60;
  const warning = await createPunishmentFromSubject(player, subject, "warn", warnDurationSeconds, reason);
  const jail = await createPunishmentFromSubject(player, subject, "jail", duration.seconds, `Warn: ${reason}`);
  if (subject.player) {
    movePlayerToJailCell(subject.player);
    sendPunishmentScreen(subject.player, warning, "Verwarnung mit Jail");
    sendJailStatusFromPunishment(subject.player, jail, "warn");
    scheduleJailRelease(subject.player, subject.characterId, jail.expiresAt);
  }

  const activeWarns = await countActiveWarns(subject.characterId);
  if (activeWarns >= 3) {
    const ban = await createPunishmentFromSubject(player, subject, "ban", 7 * 24 * 60 * 60, "3 aktive Warns");
    if (subject.player) {
      sendPunishmentScreen(subject.player, ban);
      kickAfterAdminScreen(subject.player, "Zu viele Verwarnungen.");
    }
    sendAdminFeedback(player, `${subject.name} hat ${activeWarns} aktive Warns und wurde 7 Tage gebannt.`);
    return true;
  }

  broadcastAdminAction(player, subject.name, "verwarnt", reason);
  sendAdminFeedback(player, `${subject.name} verwarnt (${activeWarns}/3) und bis ${formatTicketMuteDate(jail.expiresAt)} gejailed.`);
  return true;
}

async function unwarnCommand(player: RageMpPlayer, args: string[]) {
  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /unwarn <charId>");
    return true;
  }

  const lifted = await liftLatestActiveWarn({
    characterId: subject.characterId,
    liftedByAccountId: getSession(player)?.account.id ?? null,
    liftedByName: getDisplayName(player)
  });
  if (lifted) {
    broadcastAdminAction(player, subject.name, "entwarnt", "Warn aufgehoben");
  }
  sendAdminFeedback(player, lifted ? `Letzter aktiver Warn von ${subject.name} wurde entfernt.` : "Kein aktiver Warn gefunden.");
  return true;
}

async function unbanCommand(player: RageMpPlayer, args: string[]) {
  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /unban <charId>");
    return true;
  }

  const lifted = await liftActivePunishments({
    type: "ban",
    accountId: subject.accountId,
    characterId: subject.characterId,
    liftedByAccountId: getSession(player)?.account.id ?? null,
    liftedByName: getDisplayName(player)
  });
  if (lifted.length) {
    broadcastAdminAction(player, subject.name, "entbannt", "Ban aufgehoben");
  }
  sendAdminFeedback(player, lifted.length ? `${subject.name} wurde entbannt.` : "Kein aktiver Charakter-Bann gefunden.");
  return true;
}

async function unAccountBanCommand(player: RageMpPlayer, args: string[]) {
  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /uniban <charId>");
    return true;
  }

  const lifted = await liftActivePunishments({
    type: "iban",
    accountId: subject.accountId,
    characterId: subject.characterId,
    liftedByAccountId: getSession(player)?.account.id ?? null,
    liftedByName: getDisplayName(player)
  });
  if (lifted.length) {
    broadcastAdminAction(player, subject.name, "account-entbannt", "Account-Ban aufgehoben");
  }
  sendAdminFeedback(player, lifted.length ? `Permanenter Account-Bann von ${subject.name} wurde entfernt.` : "Kein aktiver permanenter Account-Bann gefunden.");
  return true;
}

function scheduleJailRelease(player: RageMpPlayer, characterId: number, expiresAt: Date) {
  const delay = expiresAt.getTime() - Date.now();
  if (delay <= 0 || delay > 2_147_483_647) {
    return;
  }

  setTimeout(async () => {
    const session = getSession(player);
    if (session?.character?.id !== characterId) {
      return;
    }

    const activeJail = await findActiveJail(characterId);
    if (activeJail) {
      return;
    }

    player.dimension = 0;
    player.spawn(new mp.Vector3(prisonReleasePosition.x, prisonReleasePosition.y, prisonReleasePosition.z));
    player.heading = prisonReleasePosition.heading;
    clearAdminJailStatus(player);
    sendAdminFeedback(player, "Deine Jail-Zeit ist abgelaufen.");
  }, delay);
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

  broadcastAdminAction(player, getDisplayName(target), "vom Support ausgeschlossen", reason);
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
  broadcastAdminAction(player, getDisplayName(target), "fuer den Support freigegeben", "Support-Mute aufgehoben");
  return true;
}

async function chatMuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const subject = await findPunishmentSubject(args[0]);
  const adminSession = getSession(player);
  if (!subject?.accountId) {
    sendAdminFeedback(player, "Nutzung: /mute <charId> <dauer> <grund>");
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
    characterId: subject.characterId,
    accountId: subject.accountId,
    mutedByAccountId: adminSession?.account.id ?? null,
    mutedByName: getDisplayName(player),
    reason,
    expiresAt
  });

  broadcastAdminAction(player, subject.name, "gemutet", reason);
  if (subject.player) {
    sendAdminScreen(subject.player, {
      type: "mute",
      title: "Chat-Mute",
      administrator: getDisplayName(player),
      administratorId: adminSession?.character?.id ?? null,
      targetName: subject.name,
      reason,
      duration: formatPunishmentDurationForAdminScreen(duration.ms / 1000),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
    });
  }
  return true;
}

async function chatUnmuteCommand(player: RageMpPlayer, args: string[]) {
  if (!ensureAdminMode(player)) {
    return true;
  }

  const subject = await findPunishmentSubject(args[0]);
  if (!subject) {
    sendAdminFeedback(player, "Nutzung: /unmute <charId>");
    return true;
  }

  await clearChatMute(subject.characterId);
  broadcastAdminAction(player, subject.name, "entmutet", "Chat-Mute aufgehoben");
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

function getSessionAdminLevel(session: { character?: { adminLevel?: number } }) {
  return session.character?.adminLevel ?? 0;
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

function parsePunishmentDuration(value: string | undefined, defaultUnit: "s" | "m" | "h" | "d") {
  const match = String(value ?? "").trim().toLowerCase().match(/^(\d+)([smhd])?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = (match[2] ?? defaultUnit) as "s" | "m" | "h" | "d";
  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 60 * 60 : 24 * 60 * 60;
  return { seconds: Math.trunc(amount) * multiplier };
}

function formatTicketMuteDate(date: Date) {
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPunishmentDurationForAdminScreen(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (days > 0) {
    return `${days} Tag${days === 1 ? "" : "e"}${hours ? ` ${hours} Std.` : ""}`;
  }
  if (hours > 0) {
    return `${hours} Std.${minutes ? ` ${minutes} Min.` : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} Min.${seconds ? ` ${seconds} Sek.` : ""}`;
  }
  return `${seconds} Sek.`;
}

async function findPunishmentSubject(value?: string) {
  const characterId = Number(value);
  if (!Number.isInteger(characterId) || characterId <= 0) {
    return null;
  }

  const player = findOnlineCharacter(characterId);
  const onlineSession = player ? getSession(player) : null;
  if (player && onlineSession?.character) {
    return {
      player,
      characterId: onlineSession.character.id,
      accountId: onlineSession.account.id,
      name: `${onlineSession.character.firstName} ${onlineSession.character.lastName} [${onlineSession.character.id}]`
    };
  }

  const character = await findCharacterById(characterId);
  if (!character) {
    return null;
  }

  return {
    player: null,
    characterId: character.id,
    accountId: character.accountId,
    name: `${character.firstName} ${character.lastName} [${character.id}]`
  };
}

async function createPunishmentFromSubject(
  admin: RageMpPlayer,
  subject: { characterId: number; accountId: number | null; name: string },
  type: "ban" | "iban" | "jail" | "warn",
  durationSeconds: number,
  reason: string
) {
  const adminSession = getSession(admin);
  return createAdminPunishment({
    type,
    accountId: subject.accountId,
    characterId: subject.characterId,
    targetName: subject.name,
    adminAccountId: adminSession?.account.id ?? null,
    adminCharacterId: adminSession?.character?.id ?? null,
    adminName: getDisplayName(admin),
    reason,
    durationSeconds,
    expiresAt: new Date(Date.now() + durationSeconds * 1000)
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

function broadcastAdminAction(admin: RageMpPlayer, targetName: string, action: string, reason: string) {
  const text = `Administrator ${getDisplayName(admin)} hat ${targetName} ${action} Grund: ${reason || "Kein Grund angegeben"}`;
  listOnlinePlayers().forEach((target) => {
    target.call("unique:client:chatPush", [JSON.stringify({ tone: "admin", author: "", text })]);
  });
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
