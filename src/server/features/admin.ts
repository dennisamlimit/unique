import { getAdminCommandPermission, listAdminCommandPermissions, setAdminCommandPermission } from "../db/admin";
import { listAdminAccounts, setAccountAdminLevel, setAccountUniqueCoins } from "../db/accounts";
import { setCharacterBankBalance, setCharacterCash, setCharacterDead } from "../db/characters";
import { sendHudData } from "./hud";
import { findOnlineCharacter, getSession, listOnlinePlayers, listSessions, setSession } from "./session";

const adminCommands = [
  "admin",
  "heal",
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
  "veh"
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

  if (normalized === "heal") {
    return healCommand(player, rawArgs);
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
  }
  sendAdminFeedback(player, `Adminmodus ${adminMode ? "aktiviert" : "deaktiviert"}.`);
  return true;
}

function healCommand(player: RageMpPlayer, args: string[]) {
  const target = findTarget(args[0]) ?? player;
  target.health = 100;
  target.armour = 100;
  sendAdminFeedback(player, `${getDisplayName(target)} geheilt.`);
  if (target.id !== player.id) {
    sendAdminFeedback(target, `Du wurdest von ${getDisplayName(player)} geheilt.`, player);
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
    sendHudData(parsed.target);
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

    if (typeof player.putIntoVehicle === "function") {
      player.putIntoVehicle(vehicle, 0);
    }

    sendAdminFeedback(player, `Fahrzeug ${parsed.model} gespawnt (${parsed.plate}).`);
  } catch {
    sendAdminFeedback(player, `Fahrzeug konnte nicht gespawnt werden: ${parsed.model}.`);
  }

  return true;
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
