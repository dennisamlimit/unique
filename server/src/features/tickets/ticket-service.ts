import { TicketRepository } from "./ticket-repository.js";
import type { SupportTicket, TicketPriority, TicketStatus } from "./ticket.js";

const PLAYER_PREFIXES = [
  "allgemein",
  "bug",
  "regelverstoss",
  "entstuck",
  "fraktion",
  "shop",
  "charakter"
] as const;

function normalizePrefix(prefix: string) {
  const value = String(prefix ?? "").trim().toLowerCase();
  return PLAYER_PREFIXES.includes(value as (typeof PLAYER_PREFIXES)[number]) ? value : "allgemein";
}

function normalizeSubject(subject: string) {
  return String(subject ?? "").trim().slice(0, 80);
}

function normalizeMessage(message: string) {
  return String(message ?? "").trim().slice(0, 1200);
}

export class TicketService {
  private readonly repository = new TicketRepository();

  getAllowedPrefixes() {
    return [...PLAYER_PREFIXES];
  }

  async getPlayerDashboard(accountId: number) {
    const tickets = await this.repository.getTicketsByAccountId(accountId);
    return {
      allowedPrefixes: this.getAllowedPrefixes(),
      tickets
    };
  }

  async getAdminDashboard() {
    const tickets = await this.repository.getOpenTickets();
    const openCount = await this.repository.countOpenTickets();
    return {
      openCount,
      tickets
    };
  }

  async getPlayerHistory(accountId: number) {
    return this.repository.getTicketsByAccountId(accountId);
  }

  async getOpenTicketByAccountId(accountId: number) {
    return this.repository.getOpenTicketByAccountId(accountId);
  }

  async getTicketById(ticketId: number) {
    return this.repository.getTicketById(ticketId);
  }

  async createTicket(accountId: number, accountName: string, prefixRaw: string, subjectRaw: string, messageRaw: string) {
    const prefix = normalizePrefix(prefixRaw);
    const subject = normalizeSubject(subjectRaw);
    const message = normalizeMessage(messageRaw);

    if (subject.length < 3 || message.length < 10) {
      return { ok: false as const, reason: "invalid_content" };
    }

    const activeMute = await this.repository.getActiveMuteByAccountId(accountId);
    if (activeMute) {
      return {
        ok: false as const,
        reason: "muted",
        mute: activeMute
      };
    }

    const existing = await this.repository.getOpenTicketByAccountId(accountId);
    if (existing) {
      return { ok: false as const, reason: "existing_open", ticket: existing };
    }

    const ticket = await this.repository.createTicket(accountId, accountName, prefix, subject);
    await this.repository.addMessage(ticket.ticketId, "player", accountId, accountName, message, false);
    await this.repository.addMessage(ticket.ticketId, "system", null, "System", "Ticket erstellt und an das Admin-Team uebermittelt.", true);

    return {
      ok: true as const,
      ticket: await this.repository.getTicketById(ticket.ticketId)
    };
  }

  async replyAsPlayer(accountId: number, ticketId: number, accountName: string, messageRaw: string) {
    const message = normalizeMessage(messageRaw);
    if (message.length < 2) {
      return { ok: false as const, reason: "invalid_message" };
    }

    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.accountId !== accountId || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    await this.repository.addMessage(ticketId, "player", accountId, accountName, message, false);
    const nextStatus: TicketStatus = ticket.claimedByAccountId ? "waiting_admin" : "open";
    const updated = await this.repository.updateTicketStatus(ticketId, nextStatus, null, null);
    return { ok: true as const, ticket: updated };
  }

  async replyAsAdmin(ticketId: number, adminAccountId: number, adminName: string, messageRaw: string, forceForeignClaim = false) {
    const message = normalizeMessage(messageRaw);
    if (message.length < 2) {
      return { ok: false as const, reason: "invalid_message" };
    }

    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    if (ticket.claimedByAccountId && ticket.claimedByAccountId !== adminAccountId && !forceForeignClaim) {
      return {
        ok: false as const,
        reason: "claimed_by_other",
        ticket
      };
    }

    if (!ticket.claimedByAccountId) {
      await this.repository.updateTicketClaim(ticketId, adminAccountId, adminName, "claimed");
    }

    await this.repository.addParticipant(
      ticketId,
      adminAccountId,
      adminName,
      ticket.claimedByAccountId && ticket.claimedByAccountId !== adminAccountId ? "helper" : "owner",
      adminAccountId
    );
    await this.repository.addMessage(ticketId, "admin", adminAccountId, adminName, message, false);
    const updated = await this.repository.updateTicketStatus(ticketId, "waiting_player", null, null);
    return { ok: true as const, ticket: updated };
  }

  async claimTicket(ticketId: number, adminAccountId: number, adminName: string) {
    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    if (ticket.claimedByAccountId === adminAccountId && ticket.status === "claimed") {
      return { ok: true as const, ticket };
    }

    const updated = await this.repository.updateTicketClaim(ticketId, adminAccountId, adminName, "claimed");
    await this.repository.addParticipant(ticketId, adminAccountId, adminName, "owner", adminAccountId);
    await this.repository.addMessage(ticketId, "system", adminAccountId, adminName, `${adminName} hat das Ticket uebernommen.`, true);
    return { ok: true as const, ticket: updated };
  }

  async setStatus(ticketId: number, adminAccountId: number, adminName: string, status: TicketStatus) {
    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket) {
      return { ok: false as const, reason: "not_found" };
    }

    if (ticket.status === status) {
      return { ok: true as const, ticket };
    }

    const updated = await this.repository.updateTicketStatus(ticketId, status, adminAccountId, adminName);
    await this.repository.addMessage(
      ticketId,
      "system",
      adminAccountId,
      adminName,
      status === "closed" ? `${adminName} hat das Ticket geschlossen.` : `${adminName} hat den Status auf ${status} gesetzt.`,
      true
    );
    return { ok: true as const, ticket: updated };
  }

  async setPriority(ticketId: number, adminAccountId: number, adminName: string, priority: TicketPriority) {
    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    if (ticket.priority === priority) {
      return { ok: true as const, ticket };
    }

    const updated = await this.repository.updateTicketPriority(ticketId, priority);
    await this.repository.addMessage(ticketId, "system", adminAccountId, adminName, `${adminName} hat die Prioritaet auf ${priority} gesetzt.`, true);
    return { ok: true as const, ticket: updated };
  }

  async addParticipant(ticketId: number, targetAdminAccountId: number, targetAdminName: string, addedByAccountId: number, addedByName: string) {
    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    await this.repository.addParticipant(ticketId, targetAdminAccountId, targetAdminName, "helper", addedByAccountId);
    await this.repository.addMessage(ticketId, "system", addedByAccountId, addedByName, `${addedByName} hat ${targetAdminName} zum Ticket hinzugefuegt.`, true);
    return { ok: true as const, ticket: await this.repository.getTicketById(ticketId) };
  }

  async requestAdvice(ticketId: number, adminAccountId: number, adminName: string) {
    const ticket = await this.repository.getTicketById(ticketId);
    if (!ticket || ticket.status === "closed") {
      return { ok: false as const, reason: "not_found" };
    }

    await this.repository.addMessage(ticketId, "system", adminAccountId, adminName, `${adminName} bittet ein hoeheres Admin-Level um Unterstuetzung.`, true);
    return { ok: true as const, ticket: await this.repository.getTicketById(ticketId) };
  }

  async getWarningsByAccountId(accountId: number) {
    return this.repository.getWarningsByAccountId(accountId);
  }

  async muteAccount(accountId: number, adminAccountId: number | null, reasonRaw: string, durationMs: number) {
    const reason = normalizeMessage(reasonRaw) || "Kein Grund angegeben.";
    const expiresAt = new Date(Date.now() + Math.max(1, durationMs)).toISOString();
    return this.repository.createMute(accountId, adminAccountId, reason, expiresAt);
  }

  async unmuteAccount(accountId: number) {
    const removed = await this.repository.deleteActiveMutesByAccountId(accountId);
    return {
      ok: removed > 0,
      removed
    };
  }

  async releaseClaimsForAdmin(adminAccountId: number, adminName: string) {
    const claimedTickets = await this.repository.getClaimedTicketsByAdminAccountId(adminAccountId);
    const released: SupportTicket[] = [];

    for (const ticket of claimedTickets) {
      const updated = await this.repository.updateTicketClaim(ticket.ticketId, null, null, "open");
      await this.repository.addMessage(ticket.ticketId, "system", adminAccountId, "System", `${adminName} ist offline gegangen. Claim wurde freigegeben.`, true);
      if (updated) {
        released.push(updated);
      }
    }

    return released;
  }

  async releaseInactiveClaims(waitMinutes: number) {
    const staleTickets = await this.repository.getStaleClaimedTickets(waitMinutes);
    const released: SupportTicket[] = [];

    for (const ticket of staleTickets) {
      const updated = await this.repository.updateTicketClaim(ticket.ticketId, null, null, "open");
      await this.repository.addMessage(ticket.ticketId, "system", null, "System", `Claim wurde nach ${waitMinutes} Minuten ohne Admin-Antwort freigegeben.`, true);
      if (updated) {
        released.push(updated);
      }
    }

    return released;
  }

  async autoCloseExpiredTickets(waitMinutes: number) {
    const expiredTickets = await this.repository.getExpiredOpenTickets(waitMinutes);
    const closed: SupportTicket[] = [];

    for (const ticket of expiredTickets) {
      const updated = await this.repository.updateTicketStatus(ticket.ticketId, "closed", null, "System");
      await this.repository.addMessage(
        ticket.ticketId,
        "system",
        null,
        "System",
        `Ticket wurde nach ${waitMinutes} Minuten automatisch geschlossen.`,
        true
      );
      if (updated) {
        closed.push(updated);
      }
    }

    return closed;
  }

  async hydrateTicket(ticket: Omit<SupportTicket, "messages" | "participants"> | SupportTicket | null) {
    if (!ticket) {
      return null;
    }

    return this.repository.getTicketById(ticket.ticketId);
  }
}
