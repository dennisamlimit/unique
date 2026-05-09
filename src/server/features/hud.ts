import { config } from "../config";
import { countOpenSupportTickets } from "../db/support";
import { getSession, listOnlinePlayers } from "./session";

export async function sendHudData(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  const tickets = session.character.adminLevel > 0 && session.adminMode ? await countOpenSupportTickets() : 0;

  player.call("unique:client:hudData", [
    JSON.stringify({
      characterId: session.character.id,
      playerCount: listOnlinePlayers().length,
      maxPlayers: config.maxPlayers,
      cash: session.character.cash,
      bankBalance: session.character.bankBalance,
      uniqueCoins: session.account.uniqueCoins,
      onlineSeconds: session.onlineSince ? Math.floor((Date.now() - session.onlineSince) / 1000) : 0,
      adminMode: Boolean(session.adminMode),
      tickets
    })
  ]);
}

export async function broadcastHudData() {
  await Promise.all(listOnlinePlayers().map((player) => sendHudData(player)));
}
