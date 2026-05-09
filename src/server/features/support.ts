import {
  addSupportTicketMessage,
  closeOpenSupportTicketsForCharacter,
  createSupportTicket,
  findActiveSupportTicketMute,
  findOpenSupportTicketForCharacter,
  findSupportTicket,
  listOpenSupportTicketsForAdmin,
  listOpenSupportTicketsForCharacter,
  updateSupportTicket,
  type SupportTicketCategory,
  type SupportTicketPriority,
  type SupportTicketRecord
} from "../db/support";
import { sendAdminPanelData } from "./admin";
import { broadcastHudData } from "./hud";
import { findOnlineCharacter, getSession, listSessions, listOnlinePlayers } from "./session";

const supportCategories: SupportTicketCategory[] = ["stuck", "bug", "player", "account", "shop", "faction", "event", "other"];
const supportPriorities: SupportTicketPriority[] = ["low", "normal", "high", "critical"];
const supportCategoryLabels: Record<SupportTicketCategory, string> = {
  stuck: "Stuck",
  bug: "Bug",
  player: "Spieler",
  account: "Account",
  shop: "Shop",
  faction: "Fraktion",
  event: "Event",
  other: "Sonstiges"
};
const supportPriorityLabels: Record<SupportTicketPriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  critical: "Kritisch"
};

export async function handleSupportTicketCreate(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session?.character) {
    return sendSupportTicketResult(player, false, "Du musst eingeloggt sein.");
  }

  const payload = parsePayload(payloadJson);
  const category = normalizeSupportCategory(payload.category);
  const message = String(payload.message ?? "").trim().slice(0, 1200);
  const mute = await findActiveSupportTicketMute(session.character.id);
  if (mute) {
    return sendSupportTicketResult(player, false, `Du bist vom Support ausgeschlossen. Grund: ${mute.reason}`);
  }

  if (!message || message.length < 10) {
    return sendSupportTicketResult(player, false, "Bitte beschreibe dein Anliegen etwas genauer.");
  }

  const existingTicket = await findOpenSupportTicketForCharacter(session.character.id);
  if (existingTicket) {
    await sendSupportTickets(player);
    return sendSupportTicketResult(player, false, `Du hast bereits ein offenes Ticket #${existingTicket.id}.`);
  }

  const characterName = `${session.character.firstName} ${session.character.lastName}`;
  const ticket = await createSupportTicket({
    characterId: session.character.id,
    accountId: session.account.id,
    characterName,
    category,
    subject: `${supportCategoryLabels[category]} Supportfall`,
    message
  });

  sendSupportTicketResult(player, true, `Ticket #${ticket.id} wurde erstellt.`);
  await sendSupportTickets(player);
  player.call("unique:client:chatPush", [JSON.stringify({ tone: "info", author: "SUPPORT", text: `Ticket #${ticket.id} wurde erstellt.` })]);

  const author = `${characterName} [${session.character.id}]`;
  forEachOnlineAdmin((target) => {
    target.call("unique:client:chatPush", [
      JSON.stringify({
        tone: "admin",
        author: "SUPPORT",
        text: `Neues Ticket #${ticket.id} (${supportCategoryLabels[category]}) von ${author}`
      })
    ]);
  });

  await refreshAdminPanels();
  await broadcastHudData();
}

export async function sendSupportTickets(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  const tickets = await listOpenSupportTicketsForCharacter(session.character.id);
  player.call("unique:client:supportTickets", [JSON.stringify({ tickets: tickets.map(serializeTicket) })]);
}

export async function handlePlayerSupportTicketAction(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session?.character) {
    return sendSupportTicketResult(player, false, "Du musst eingeloggt sein.");
  }

  const payload = parsePayload(payloadJson);
  const ticketId = Math.trunc(Number(payload.ticketId));
  const message = String(payload.message ?? "").trim().slice(0, 1200);
  const mute = await findActiveSupportTicketMute(session.character.id);
  if (mute) {
    return sendSupportTicketResult(player, false, `Du bist vom Support ausgeschlossen. Grund: ${mute.reason}`);
  }
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return sendSupportTicketResult(player, false, "Ungueltiges Ticket.");
  }
  if (message.length < 2) {
    return sendSupportTicketResult(player, false, "Antwort ist zu kurz.");
  }

  const ticket = await findSupportTicket(ticketId);
  if (!ticket || ticket.status === "closed" || ticket.characterId !== session.character.id) {
    return sendSupportTicketResult(player, false, "Ticket nicht gefunden oder bereits geschlossen.");
  }

  const characterName = `${session.character.firstName} ${session.character.lastName}`;
  await addSupportTicketMessage({
    ticketId,
    authorCharacterId: session.character.id,
    authorAccountId: session.account.id,
    authorName: characterName,
    authorRole: "player",
    message
  });

  sendSupportTicketResult(player, true, "Antwort gesendet.");
  await sendSupportTickets(player);
  await refreshAdminPanels();
  await broadcastHudData();
}

export async function handleAdminSupportTicketAction(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session?.character || session.character.adminLevel <= 0 || !session.adminMode) {
    return sendSupportTicketResult(player, false, "Aktiviere zuerst den Adminmodus.");
  }

  const payload = parsePayload(payloadJson);
  const ticketId = Math.trunc(Number(payload.ticketId));
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return sendSupportTicketResult(player, false, "Ungueltiges Ticket.");
  }

  const ticket = await findSupportTicket(ticketId);
  if (!ticket || ticket.status === "closed") {
    return sendSupportTicketResult(player, false, "Ticket nicht gefunden oder bereits geschlossen.");
  }

  const action = String(payload.action ?? "").toLowerCase();
  const adminName = `${session.character.firstName} ${session.character.lastName}`;

  if (action === "claim") {
    await updateSupportTicket({
      ticketId,
      status: "in_progress",
      assignedAdminAccountId: session.account.id,
      assignedAdminName: adminName
    });
    await addSystemTicketMessage(ticketId, `${adminName} hat das Ticket uebernommen.`);
  } else if (action === "reply") {
    const message = String(payload.message ?? "").trim().slice(0, 1200);
    if (message.length < 2) {
      return sendSupportTicketResult(player, false, "Antwort ist zu kurz.");
    }
    await updateSupportTicket({
      ticketId,
      status: "in_progress",
      assignedAdminAccountId: ticket.assignedAdminAccountId ?? session.account.id,
      assignedAdminName: ticket.assignedAdminName ?? adminName
    });
    await addSupportTicketMessage({
      ticketId,
      authorCharacterId: session.character.id,
      authorAccountId: session.account.id,
      authorName: adminName,
      authorRole: "admin",
      message
    });
    notifyTicketOwner(ticket.characterId, `Administrator ${adminName} hat auf Ticket #${ticketId} geantwortet.`);
  } else if (action === "classify") {
    const category = normalizeSupportCategory(payload.category);
    const priority = normalizeSupportPriority(payload.priority);
    await updateSupportTicket({ ticketId, category, priority });
    await addSystemTicketMessage(ticketId, `Ticket wurde als ${supportCategoryLabels[category]} / ${supportPriorityLabels[priority]} kategorisiert.`);
  } else if (action === "request_help") {
    const currentLevel = session.character.adminLevel;
    const targetLevel = Math.min(10, Math.max(currentLevel + 1, Math.trunc(Number(payload.level) || currentLevel + 1)));
    await updateSupportTicket({ ticketId, priority: "high", escalatedToLevel: targetLevel });
    await addSystemTicketMessage(ticketId, `${adminName} bittet Admins ab Level ${targetLevel} um Hilfe.`);
    forEachOnlineAdmin((target, targetSession) => {
      if ((targetSession.character?.adminLevel ?? 0) >= targetLevel) {
        target.call("unique:client:chatPush", [JSON.stringify({ tone: "admin", author: "SUPPORT", text: `Hilfe angefragt fuer Ticket #${ticketId} ab Level ${targetLevel}.` })]);
      }
    });
  } else if (action === "close") {
    const message = String(payload.message ?? "").trim().slice(0, 1200);
    if (message) {
      await addSupportTicketMessage({
        ticketId,
        authorCharacterId: session.character.id,
        authorAccountId: session.account.id,
        authorName: adminName,
        authorRole: "admin",
        message
      });
      notifyTicketOwner(ticket.characterId, `Administrator ${adminName} hat auf Ticket #${ticketId} geantwortet.`);
    }
    await updateSupportTicket({ ticketId, status: "closed" });
    await addSystemTicketMessage(ticketId, `${adminName} hat das Ticket geschlossen.`);
  } else if (action === "goto_player") {
    const target = findOnlineCharacter(ticket.characterId);
    if (!target?.position) {
      return sendSupportTicketResult(player, false, "Spieler ist nicht online.");
    }
    teleportPlayerNear(player, target);
    player.call("unique:client:closeAdminPanel");
    sendSupportTicketResult(player, true, `Zu ${ticket.characterName} teleportiert.`);
    return;
  } else if (action === "bring_player") {
    const target = findOnlineCharacter(ticket.characterId);
    if (!target || !player.position) {
      return sendSupportTicketResult(player, false, "Spieler ist nicht online.");
    }
    teleportPlayerNear(target, player);
    player.call("unique:client:closeAdminPanel");
    sendSupportTicketResult(player, true, `${ticket.characterName} zu dir teleportiert.`);
    return;
  } else if (action === "spectate_player") {
    const target = findOnlineCharacter(ticket.characterId);
    if (!target) {
      return sendSupportTicketResult(player, false, "Spieler ist nicht online.");
    }
    teleportPlayerNear(player, target);
    player.call("unique:client:closeAdminPanel");
    player.call("unique:client:spectatePlayer", [JSON.stringify({ remoteId: target.id, name: ticket.characterName })]);
    sendSupportTicketResult(player, true, `Spectate fuer ${ticket.characterName} umgeschaltet.`);
    return;
  } else {
    return sendSupportTicketResult(player, false, "Unbekannte Ticket-Aktion.");
  }

  sendSupportTicketResult(player, true, "Ticket aktualisiert.");
  await refreshTicketOwner(ticketId);
  await refreshAdminPanels();
  await broadcastHudData();
}

export async function listAdminSupportTicketsForPlayer(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character || session.character.adminLevel <= 0 || !session.adminMode) {
    return [];
  }

  return (await listOpenSupportTicketsForAdmin(session.character.adminLevel)).map(serializeTicket);
}

export async function closeSupportTicketsForDisconnect(player: RageMpPlayer) {
  const session = getSession(player);
  if (!session?.character) {
    return;
  }

  const characterId = session.character.id;
  const characterName = `${session.character.firstName} ${session.character.lastName}`;
  const closedTicketIds = await closeOpenSupportTicketsForCharacter(characterId, "Ticket automatisch geschlossen, weil der Spieler offline gegangen ist.");
  if (!closedTicketIds.length) {
    return;
  }

  forEachOnlineAdmin((target) => {
    target.call("unique:client:chatPush", [
      JSON.stringify({
        tone: "admin",
        author: "SUPPORT",
        text: `${characterName} ist offline gegangen. Offene Tickets wurden geschlossen.`
      })
    ]);
  });
  await refreshAdminPanels();
  await broadcastHudData();
}

function serializeTicket(ticket: SupportTicketRecord) {
  return {
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
  };
}

async function addSystemTicketMessage(ticketId: number, message: string) {
  await addSupportTicketMessage({
    ticketId,
    authorCharacterId: null,
    authorAccountId: null,
    authorName: "System",
    authorRole: "system",
    message
  });
}

async function refreshTicketOwner(ticketId: number) {
  const ticket = await findSupportTicket(ticketId);
  if (!ticket) {
    return;
  }
  const target = findOnlineCharacter(ticket.characterId);
  if (target) {
    await sendSupportTickets(target);
  }
}

async function refreshAdminPanels() {
  const admins = listSessions().filter(({ session }) => (session.character?.adminLevel ?? 0) > 0 && session.adminMode);
  await Promise.all(admins.map(async ({ playerId }) => {
    const player = listOnlinePlayers().find((onlinePlayer) => onlinePlayer.id === playerId);
    if (player) {
      await sendAdminPanelData(player);
    }
  }));
}

function forEachOnlineAdmin(action: (player: RageMpPlayer, session: NonNullable<ReturnType<typeof getSession>>) => void) {
  listSessions()
    .filter(({ session }) => (session.character?.adminLevel ?? 0) > 0 && session.adminMode)
    .forEach(({ playerId, session }) => {
      const target = listOnlinePlayers().find((onlinePlayer) => onlinePlayer.id === playerId);
      if (target) {
        action(target, session);
      }
    });
}

function sendSupportTicketResult(player: RageMpPlayer, ok: boolean, message: string) {
  player.call("unique:client:supportTicketResult", [JSON.stringify({ ok, message })]);
}

function notifyTicketOwner(characterId: number, text: string) {
  const target = findOnlineCharacter(characterId);
  target?.call("unique:client:chatPush", [JSON.stringify({ tone: "info", author: "SUPPORT", text })]);
}

function teleportPlayerNear(player: RageMpPlayer, target: RageMpPlayer) {
  const position = target.position;
  if (!position) {
    return;
  }

  const heading = Number.isFinite(target.heading) ? Number(target.heading) : 0;
  const radians = heading * Math.PI / 180;
  player.dimension = target.dimension;
  player.spawn(new mp.Vector3(
    position.x - Math.sin(radians) * 1.6,
    position.y + Math.cos(radians) * 1.6,
    position.z + 0.2
  ));
  player.heading = heading;
}

function normalizeSupportCategory(value: unknown): SupportTicketCategory {
  const category = String(value ?? "").toLowerCase();
  return supportCategories.includes(category as SupportTicketCategory) ? category as SupportTicketCategory : "other";
}

function normalizeSupportPriority(value: unknown): SupportTicketPriority {
  const priority = String(value ?? "").toLowerCase();
  return supportPriorities.includes(priority as SupportTicketPriority) ? priority as SupportTicketPriority : "normal";
}

function parsePayload(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}
