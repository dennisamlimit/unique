import type { PlayerMp } from "./player-types.js";
export type { PlayerMp } from "./player-types.js";

export const HIDDEN_LOGIN_POSITION = { x: 402.87, y: -997.81, z: -99.0 };
export const DEFAULT_SPAWN = { x: -75.24, y: -818.95, z: 326.18, rotZ: 160, dimension: 0 };

export function vector3(x: number, y: number, z: number) {
  return new mp.Vector3(x, y, z);
}

export function emitClient(player: PlayerMp, eventName: string, ...args: unknown[]) {
  player.call?.(eventName, args);
}

export function setVar(player: PlayerMp, key: string, value: unknown) {
  player.setVariable?.(key, value);
}

export function getVar<T>(player: PlayerMp, key: string, fallback: T): T {
  const value = player.getVariable?.(key);
  return value === undefined || value === null ? fallback : (value as T);
}

export function forEachPlayer(callback: (player: PlayerMp) => void) {
  mp.players.forEach((player: PlayerMp) => {
    if (player) {
      callback(player);
    }
  });
}

export function findPlayerById(playerId: number) {
  let found: PlayerMp | null = null;
  forEachPlayer((player) => {
    if (player.id === playerId) {
      found = player;
    }
  });
  return found;
}

export function getSocialClubId(player: PlayerMp) {
  return String(player.rgscId ?? player.socialClubId ?? player.socialClub ?? player.serial ?? "").trim();
}

export function getSocialClubName(player: PlayerMp) {
  return String(player.socialClubName ?? player.name ?? "").trim();
}

export function getPlayerName(player: PlayerMp) {
  return String(player.name ?? `Spieler_${player.id ?? 0}`).replace(/_/g, " ");
}

export function getHeading(player: PlayerMp) {
  return Number(player.heading ?? player.rotation?.z ?? 0);
}

export function setHeading(player: PlayerMp, rotZ: number) {
  if (typeof player.heading === "number") {
    player.heading = rotZ;
    return;
  }

  player.rotation = vector3(0, 0, rotZ) as { x: number; y: number; z: number };
}

export function getArmour(player: PlayerMp) {
  return Number(player.armour ?? player.armor ?? 0);
}

export function setArmour(player: PlayerMp, value: number) {
  if ("armour" in player) {
    player.armour = value;
    return;
  }

  player.armor = value;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampMoney(value: number) {
  return Math.max(0, Number.isFinite(value) ? Math.trunc(value) : 0);
}
