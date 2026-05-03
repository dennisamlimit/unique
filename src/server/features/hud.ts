import { getSession, listOnlinePlayers } from "./session";

export function sendHudData(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  player.call("unique:client:hudData", [
    JSON.stringify({
      characterId: session.character.id,
      playerCount: listOnlinePlayers().length,
      cash: session.character.cash,
      bankBalance: session.character.bankBalance,
      uniqueCoins: session.account.uniqueCoins,
      onlineSeconds: session.onlineSince ? Math.floor((Date.now() - session.onlineSince) / 1000) : 0
    })
  ]);
}

export function broadcastHudData() {
  listOnlinePlayers().forEach((player) => sendHudData(player));
}
