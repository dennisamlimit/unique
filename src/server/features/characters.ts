import { config } from "../config";
import {
  createCharacter,
  defaultAppearance,
  deleteDraftCharacter,
  deleteDraftCharacters,
  findLastCharacterSpawn,
  findCharacter,
  logCharacterSpawn,
  listCharacters,
  setCharacterDead,
  updateCharacterPosition,
  type CharacterRecord,
  type CharacterAppearance
} from "../db/characters";
import { broadcastHudData } from "./hud";
import { getSession, setSession } from "./session";

const namePattern = /^[A-Za-z][A-Za-z-]{1,15}$/;

export async function beginRoleplayCharacterCreation(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session) {
    return sendCharacterError(player, "Bitte logge dich zuerst ein.");
  }

  const payload = parsePayload(payloadJson);
  const requestedSlot = Number(payload.slot);

  if (![1, 2, 3].includes(requestedSlot)) {
    return sendCharacterError(player, "Ungueltiger Charakter-Slot.");
  }

  const existing = await listCharacters(session.account.id);
  if (existing.some((character) => character.slot === requestedSlot)) {
    return sendCharacterError(player, "Dieser Charakter-Slot ist bereits belegt.");
  }

  if (requestedSlot === 3 && session.account.uniqueCoins < config.thirdCharacterPrice) {
    return sendCharacterError(player, `Der dritte Charakter kostet ${config.thirdCharacterPrice} Unique Coins.`);
  }

  player.dimension = config.authDimensionOffset + player.id;
  player.spawn(new mp.Vector3(config.creator.x, config.creator.y, config.creator.z));
  player.heading = config.creator.heading;
  player.call("unique:client:creatorStarted", [
    JSON.stringify({
      slot: requestedSlot,
      appearance: defaultAppearance
    })
  ]);
}

export async function createRoleplayCharacter(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session) {
    return sendCharacterError(player, "Bitte logge dich zuerst ein.");
  }

  const payload = parsePayload(payloadJson);
  const firstName = normalizeName(String(payload.firstName ?? ""));
  const lastName = normalizeName(String(payload.lastName ?? ""));
  const requestedSlot = Number(payload.slot);
  const appearance = normalizeAppearance(payload.appearance);

  if (!namePattern.test(firstName) || !namePattern.test(lastName)) {
    return sendCharacterError(player, "Vorname und Nachname duerfen 2-16 Buchstaben oder Bindestriche enthalten.");
  }

  if (requestedSlot === 3 && session.account.uniqueCoins < config.thirdCharacterPrice) {
    return sendCharacterError(player, `Der dritte Charakter kostet ${config.thirdCharacterPrice} Unique Coins.`);
  }

  if (![1, 2, 3].includes(requestedSlot)) {
    return sendCharacterError(player, "Ungueltiger Charakter-Slot.");
  }

  const existing = await listCharacters(session.account.id);
  if (existing.some((character) => character.slot === requestedSlot)) {
    return sendCharacterError(player, "Dieser Charakter-Slot ist bereits belegt.");
  }

  await createCharacter({
    accountId: session.account.id,
    slot: requestedSlot,
    firstName,
    lastName,
    appearance
  });

  const characters = await listCharacters(session.account.id);
  player.call("unique:client:characters", [JSON.stringify({ characters, uniqueCoins: session.account.uniqueCoins })]);
}

export async function cancelRoleplayCharacterCreation(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session) {
    return;
  }

  const payload = parsePayload(payloadJson);
  const characterId = Number(payload.characterId);

  if (Number.isFinite(characterId)) {
    await deleteDraftCharacter(session.account.id, characterId);
  }

  player.dimension = config.authDimensionOffset + player.id;
  player.spawn(new mp.Vector3(config.spawn.x, config.spawn.y, config.spawn.z));
  const characters = await listCharacters(session.account.id);
  player.call("unique:client:characters", [JSON.stringify({ characters, uniqueCoins: session.account.uniqueCoins })]);
}

export async function selectRoleplayCharacter(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session) {
    return sendCharacterError(player, "Bitte logge dich zuerst ein.");
  }

  const payload = parsePayload(payloadJson);
  const characterId = Number(payload.characterId);
  const character = await findCharacter(session.account.id, characterId);

  if (!character) {
    return sendCharacterError(player, "Dieser Charakter gehoert nicht zu deinem Account.");
  }

  setSession(player, { ...session, character, isDead: character.isDead });
  if (character.isDead) {
    return enterWorldDead(player, character);
  }

  const lastSpawn = await findLastCharacterSpawn(character.id);
  const lastPosition = lastSpawn?.position ?? character.position ?? null;

  player.call("unique:client:spawnOptions", [
    JSON.stringify({
      character,
      options: buildSpawnOptions(lastPosition)
    })
  ]);
}

export async function chooseRoleplaySpawn(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session?.character) {
    return sendCharacterError(player, "Bitte waehle zuerst einen Charakter.");
  }

  const payload = parsePayload(payloadJson);
  const spawnType = normalizeSpawnType(payload.spawnType);
  const lastSpawn = await findLastCharacterSpawn(session.character.id);
  const lastPosition = lastSpawn?.position ?? session.character.position ?? null;
  const spawn = resolveSpawnPosition(spawnType, lastPosition);
  if (!spawn) {
    return sendCharacterError(player, "Dieser Spawnpunkt ist noch nicht verfuegbar.");
  }

  const updatedCharacter = await updateCharacterPosition(session.character.id, spawn);
  const character = updatedCharacter ?? { ...session.character, position: spawn };
  const aliveCharacter = await setCharacterDead(character.id, false);
  const selectedCharacter = aliveCharacter ?? { ...character, isDead: false };
  setSession(player, { ...session, character: selectedCharacter, isDead: false, onlineSince: Date.now() });
  await logCharacterSpawn(character.id, spawnType, spawn);

  player.dimension = 0;
  player.spawn(new mp.Vector3(spawn.x, spawn.y, spawn.z));
  player.heading = spawn.heading;
  player.health = 100;
  player.armour = 0;
  player.call("unique:client:enterWorld", [
    JSON.stringify({
      character: selectedCharacter
    })
  ]);
  void broadcastHudData();
  player.call("unique:client:chatPush", [
    JSON.stringify({
      tone: "info",
      author: "SYSTEM",
      text: `Willkommen in Los Santos, ${selectedCharacter.firstName} ${selectedCharacter.lastName}.`
    })
  ]);
}

export async function rememberRoleplayCharacterPosition(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character || player.dimension !== 0) {
    return;
  }

  const position = readPlayerPosition(player, session.character.position.heading);
  if (!position) {
    return;
  }

  await updateCharacterPosition(session.character.id, position);
  await logCharacterSpawn(session.character.id, "logout", position);
}

export async function respawnRoleplayCharacter(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  const spawn = config.spawn;
  await updateCharacterPosition(session.character.id, spawn);
  const updatedCharacter = await setCharacterDead(session.character.id, false);
  const character = updatedCharacter ?? { ...session.character, position: spawn, isDead: false };
  setSession(player, { ...session, character, isDead: false });
  await logCharacterSpawn(character.id, "death", spawn);

  player.dimension = 0;
  player.spawn(new mp.Vector3(spawn.x, spawn.y, spawn.z));
  player.heading = spawn.heading;
  player.health = 100;
  player.armour = 0;
  player.call("unique:client:deathHide");
}

export async function markRoleplayCharacterDead(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  const updatedCharacter = await setCharacterDead(session.character.id, true);
  setSession(player, {
    ...session,
    character: updatedCharacter ?? { ...session.character, isDead: true },
    isDead: true
  });
}

async function enterWorldDead(player: RageMpPlayer, character: CharacterRecord) {
  const session = getSession(player);
  if (session) {
    setSession(player, { ...session, character, isDead: true, onlineSince: Date.now() });
  }

  const spawn = character.position ?? config.spawn;
  player.dimension = 0;
  player.spawn(new mp.Vector3(spawn.x, spawn.y, spawn.z));
  player.heading = spawn.heading;
  player.health = 1;
  player.armour = 0;
  player.call("unique:client:enterWorld", [JSON.stringify({ character })]);
  player.call("unique:client:deathShow", [JSON.stringify({ seconds: 150 })]);
  void broadcastHudData();
}

function buildSpawnOptions(lastSpawn: { x: number; y: number; z: number; heading: number } | null) {
  return [
    {
      id: "server",
      title: "Server Spawn",
      description: "Flughafen Los Santos",
      enabled: true
    },
    {
      id: "last",
      title: "Letzter Spawn",
      description: lastSpawn ? "Gespeicherte letzte Position" : "Noch kein Spawn gespeichert",
      enabled: Boolean(lastSpawn)
    },
    {
      id: "faction",
      title: "Fraktion Spawn",
      description: "Noch keine Fraktion angebunden",
      enabled: false
    },
    {
      id: "house",
      title: "Haus Spawn",
      description: "Noch kein Haus-System angebunden",
      enabled: false
    }
  ];
}

function normalizeSpawnType(value: unknown) {
  const spawnType = String(value ?? "server").toLowerCase();
  return spawnType === "last" || spawnType === "faction" || spawnType === "house" ? spawnType : "server";
}

function resolveSpawnPosition(spawnType: string, lastSpawn: { x: number; y: number; z: number; heading: number } | null) {
  if (spawnType === "server") {
    return config.spawn;
  }
  if (spawnType === "last") {
    return lastSpawn;
  }
  return null;
}

function readPlayerPosition(player: RageMpPlayer, fallbackHeading: number) {
  const position = player.position;
  if (!position) {
    return null;
  }

  const heading = typeof player.heading === "number" && Number.isFinite(player.heading)
    ? player.heading
    : fallbackHeading;

  return {
    x: Number(position.x),
    y: Number(position.y),
    z: Number(position.z),
    heading
  };
}

function sendCharacterError(player: RageMpPlayer, message: string) {
  player.call("unique:client:characterError", [JSON.stringify({ message })]);
}

export { deleteDraftCharacters };

function normalizeName(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function parsePayload(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeAppearance(value: unknown): CharacterAppearance {
  if (!value || typeof value !== "object") {
    return defaultAppearance;
  }

  const input = value as Record<string, unknown>;
  const gender: CharacterAppearance["gender"] = input.gender === "female" ? "female" : "male";

  return {
    gender,
    blendData: normalizeBlendData(input.blendData),
    eyeColor: clampInt(input.eyeColor, 0, 31, defaultAppearance.eyeColor),
    hair: normalizeNumberArray(input.hair, defaultAppearance.hair, 0, 75),
    beard: normalizeNumberArray(input.beard, defaultAppearance.beard, 0, 255),
    faceFeatures: normalizeNumberArray(input.faceFeatures, defaultAppearance.faceFeatures, -1, 1),
    headOverlays: normalizeNumberArray(input.headOverlays, defaultAppearance.headOverlays, -1, 255),
    headOverlayColors: normalizeNumberArray(input.headOverlayColors, defaultAppearance.headOverlayColors, 0, 63),
    headOverlayOpacities: normalizeNumberArray(input.headOverlayOpacities, defaultAppearance.headOverlayOpacities, 0, 1),
    clothing: normalizeNumberArray(input.clothing, defaultAppearance.clothing, 0, 400),
    clothingTextures: normalizeNumberArray(input.clothingTextures, defaultAppearance.clothingTextures, 0, 25),
    props: normalizeNumberArray(input.props, defaultAppearance.props, -1, 200),
    propTextures: normalizeNumberArray(input.propTextures, defaultAppearance.propTextures, 0, 25)
  };
}

function normalizeNumberArray(value: unknown, fallback: number[], min: number, max: number) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return fallback.map((fallbackValue, index) => clampNumber(value[index], min, max, fallbackValue));
}

function normalizeBlendData(value: unknown) {
  if (!Array.isArray(value)) {
    return defaultAppearance.blendData;
  }

  return defaultAppearance.blendData.map((fallbackValue, index) => {
    const max = index >= 4 ? 1 : 45;
    return clampNumber(value[index], 0, max, fallbackValue);
  });
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}
