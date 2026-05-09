import type { AccountRecord } from "../db/accounts";
import type { CharacterRecord } from "../db/characters";

export interface PlayerSession {
  account: AccountRecord;
  character?: CharacterRecord;
  adminMode?: boolean;
  isDead?: boolean;
  onlineSince?: number;
}

const sessions = new Map<number, PlayerSession>();
const onlinePlayers = new Map<number, RageMpPlayer>();

export function registerOnlinePlayer(player: RageMpPlayer) {
  onlinePlayers.set(player.id, player);
}

export function getSession(player: RageMpPlayer) {
  return sessions.get(player.id);
}

export function setSession(player: RageMpPlayer, session: PlayerSession) {
  sessions.set(player.id, session);
}

export function clearSession(player: RageMpPlayer) {
  sessions.delete(player.id);
  onlinePlayers.delete(player.id);
}

export function listSessions() {
  return Array.from(sessions.entries()).map(([playerId, session]) => ({ playerId, session }));
}

export function listOnlinePlayers() {
  return Array.from(onlinePlayers.values());
}

export function findOnlinePlayer(playerId: number) {
  return onlinePlayers.get(playerId) ?? null;
}

export function findOnlineCharacter(characterId: number) {
  const match = listSessions().find(({ session }) => session.character?.id === characterId);
  return match ? findOnlinePlayer(match.playerId) : null;
}
