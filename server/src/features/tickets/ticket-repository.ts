import { getPool } from "../../infrastructure/database.js";
import type { AccountWarning, SupportTicket, TicketMessage, TicketMute, TicketParticipant, TicketPriority, TicketStatus } from "./ticket.js";

function mapTicketRow(row: Record<string, unknown>): Omit<SupportTicket, "messages" | "participants"> {
  return {
    ticketId: Number(row.ticket_id),
    accountId: Number(row.account_id),
    accountName: String(row.account_name ?? ""),
    category: "support",
    prefix: String(row.prefix ?? "allgemein"),
    subject: String(row.subject ?? ""),
    status: String(row.status ?? "open") as TicketStatus,
    priority: String(row.priority ?? "normal") as TicketPriority,
    claimedByAccountId: row.claimed_by_account_id === null || row.claimed_by_account_id === undefined ? null : Number(row.claimed_by_account_id),
    claimedByName: row.claimed_by_name ? String(row.claimed_by_name) : null,
    closedByAccountId: row.closed_by_account_id === null || row.closed_by_account_id === undefined ? null : Number(row.closed_by_account_id),
    closedByName: row.closed_by_name ? String(row.closed_by_name) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null
  };
}

function mapMessageRow(row: Record<string, unknown>): TicketMessage {
  return {
    messageId: Number(row.message_id),
    ticketId: Number(row.ticket_id),
    senderType: String(row.sender_type) as TicketMessage["senderType"],
    senderAccountId: row.sender_account_id === null || row.sender_account_id === undefined ? null : Number(row.sender_account_id),
    senderName: String(row.sender_name ?? ""),
    message: String(row.message ?? ""),
    internalNote: Boolean(row.internal_note),
    createdAt: String(row.created_at)
  };
}

function mapParticipantRow(row: Record<string, unknown>): TicketParticipant {
  return {
    ticketId: Number(row.ticket_id),
    adminAccountId: Number(row.admin_account_id),
    adminName: String(row.admin_name ?? ""),
    roleLabel: String(row.role_label ?? "observer"),
    addedByAccountId: row.added_by_account_id === null || row.added_by_account_id === undefined ? null : Number(row.added_by_account_id),
    addedAt: String(row.added_at)
  };
}

function mapWarningRow(row: Record<string, unknown>): AccountWarning {
  return {
    warningId: Number(row.warning_id),
    accountId: Number(row.account_id),
    adminAccountId: row.admin_account_id === null || row.admin_account_id === undefined ? null : Number(row.admin_account_id),
    adminName: row.admin_name ? String(row.admin_name) : null,
    reason: String(row.reason ?? ""),
    createdAt: String(row.created_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null
  };
}

function mapMuteRow(row: Record<string, unknown>): TicketMute {
  return {
    muteId: Number(row.mute_id),
    accountId: Number(row.account_id),
    adminAccountId: row.admin_account_id === null || row.admin_account_id === undefined ? null : Number(row.admin_account_id),
    adminName: row.admin_name ? String(row.admin_name) : null,
    reason: String(row.reason ?? ""),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at)
  };
}

export class TicketRepository {
  private async hydrateTickets(rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      return [] as SupportTicket[];
    }

    const ticketIds = rows.map((row) => Number(row.ticket_id));
    const [messagesResult, participantsResult] = await Promise.all([
      getPool().query(
        "SELECT * FROM support_ticket_messages WHERE ticket_id = ANY($1::int[]) ORDER BY created_at ASC, message_id ASC;",
        [ticketIds]
      ),
      getPool().query(
        "SELECT * FROM support_ticket_participants WHERE ticket_id = ANY($1::int[]) ORDER BY added_at ASC, admin_account_id ASC;",
        [ticketIds]
      )
    ]);

    const messagesByTicket = new Map<number, TicketMessage[]>();
    for (const row of messagesResult.rows) {
      const message = mapMessageRow(row);
      const list = messagesByTicket.get(message.ticketId) ?? [];
      list.push(message);
      messagesByTicket.set(message.ticketId, list);
    }

    const participantsByTicket = new Map<number, TicketParticipant[]>();
    for (const row of participantsResult.rows) {
      const participant = mapParticipantRow(row);
      const list = participantsByTicket.get(participant.ticketId) ?? [];
      list.push(participant);
      participantsByTicket.set(participant.ticketId, list);
    }

    return rows.map((row) => {
      const ticket = mapTicketRow(row);
      return {
        ...ticket,
        messages: messagesByTicket.get(ticket.ticketId) ?? [],
        participants: participantsByTicket.get(ticket.ticketId) ?? []
      };
    });
  }

  async createTicket(accountId: number, accountName: string, prefix: string, subject: string) {
    const result = await getPool().query(
      `
        INSERT INTO support_tickets (account_id, account_name, category, prefix, subject)
        VALUES ($1, $2, 'support', $3, $4)
        RETURNING *;
      `,
      [accountId, accountName, prefix, subject]
    );

    return mapTicketRow(result.rows[0]);
  }

  async addMessage(
    ticketId: number,
    senderType: TicketMessage["senderType"],
    senderAccountId: number | null,
    senderName: string,
    message: string,
    internalNote = false
  ) {
    const result = await getPool().query(
      `
        INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_account_id, sender_name, message, internal_note)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `,
      [ticketId, senderType, senderAccountId, senderName, message, internalNote]
    );

    await getPool().query(
      "UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = $1;",
      [ticketId]
    );

    return mapMessageRow(result.rows[0]);
  }

  async addParticipant(ticketId: number, adminAccountId: number, adminName: string, roleLabel: string, addedByAccountId: number | null) {
    const result = await getPool().query(
      `
        INSERT INTO support_ticket_participants (ticket_id, admin_account_id, admin_name, role_label, added_by_account_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ticket_id, admin_account_id)
        DO UPDATE SET admin_name = EXCLUDED.admin_name, role_label = EXCLUDED.role_label
        RETURNING *;
      `,
      [ticketId, adminAccountId, adminName, roleLabel, addedByAccountId]
    );

    return mapParticipantRow(result.rows[0]);
  }

  async getTicketById(ticketId: number) {
    const result = await getPool().query(
      "SELECT * FROM support_tickets WHERE ticket_id = $1 LIMIT 1;",
      [ticketId]
    );
    const tickets = await this.hydrateTickets(result.rows);
    return tickets[0] ?? null;
  }

  async getOpenTicketByAccountId(accountId: number) {
    const result = await getPool().query(
      "SELECT * FROM support_tickets WHERE account_id = $1 AND status <> 'closed' ORDER BY created_at DESC LIMIT 1;",
      [accountId]
    );
    const tickets = await this.hydrateTickets(result.rows);
    return tickets[0] ?? null;
  }

  async getTicketsByAccountId(accountId: number) {
    const result = await getPool().query(
      "SELECT * FROM support_tickets WHERE account_id = $1 ORDER BY created_at DESC, ticket_id DESC;",
      [accountId]
    );
    return this.hydrateTickets(result.rows);
  }

  async getOpenTickets() {
    const result = await getPool().query(
      "SELECT * FROM support_tickets WHERE status <> 'closed' ORDER BY created_at ASC, ticket_id ASC;"
    );
    return this.hydrateTickets(result.rows);
  }

  async getClaimedTicketsByAdminAccountId(adminAccountId: number) {
    const result = await getPool().query(
      "SELECT * FROM support_tickets WHERE claimed_by_account_id = $1 AND status <> 'closed' ORDER BY updated_at ASC, ticket_id ASC;",
      [adminAccountId]
    );
    return this.hydrateTickets(result.rows);
  }

  async getStaleClaimedTickets(waitMinutes: number) {
    const result = await getPool().query(
      `
        SELECT *
        FROM support_tickets
        WHERE claimed_by_account_id IS NOT NULL
          AND status = 'waiting_admin'
          AND updated_at <= NOW() - ($1::text || ' minutes')::interval
        ORDER BY updated_at ASC, ticket_id ASC;
      `,
      [Math.max(1, Math.floor(waitMinutes))]
    );
    return this.hydrateTickets(result.rows);
  }

  async getExpiredOpenTickets(waitMinutes: number) {
    const result = await getPool().query(
      `
        SELECT *
        FROM support_tickets
        WHERE status <> 'closed'
          AND created_at <= NOW() - ($1::text || ' minutes')::interval
        ORDER BY created_at ASC, ticket_id ASC;
      `,
      [Math.max(1, Math.floor(waitMinutes))]
    );
    return this.hydrateTickets(result.rows);
  }

  async countOpenTickets() {
    const result = await getPool().query(
      "SELECT COUNT(*) FROM support_tickets WHERE status <> 'closed';"
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async updateTicketClaim(ticketId: number, claimedByAccountId: number | null, claimedByName: string | null, status: TicketStatus) {
    const result = await getPool().query(
      `
        UPDATE support_tickets
        SET claimed_by_account_id = $2,
            claimed_by_name = $3,
            status = $4,
            updated_at = NOW()
        WHERE ticket_id = $1
        RETURNING *;
      `,
      [ticketId, claimedByAccountId, claimedByName, status]
    );
    const tickets = await this.hydrateTickets(result.rows);
    return tickets[0] ?? null;
  }

  async updateTicketStatus(ticketId: number, status: TicketStatus, closedByAccountId: number | null, closedByName: string | null) {
    const result = await getPool().query(
      `
        UPDATE support_tickets
        SET status = $2,
            closed_by_account_id = $3,
            closed_by_name = $4,
            closed_at = CASE WHEN $2 = 'closed' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE ticket_id = $1
        RETURNING *;
      `,
      [ticketId, status, status === "closed" ? closedByAccountId : null, status === "closed" ? closedByName : null]
    );
    const tickets = await this.hydrateTickets(result.rows);
    return tickets[0] ?? null;
  }

  async updateTicketPriority(ticketId: number, priority: TicketPriority) {
    const result = await getPool().query(
      `
        UPDATE support_tickets
        SET priority = $2,
            updated_at = NOW()
        WHERE ticket_id = $1
        RETURNING *;
      `,
      [ticketId, priority]
    );
    const tickets = await this.hydrateTickets(result.rows);
    return tickets[0] ?? null;
  }

  async getWarningsByAccountId(accountId: number) {
    const result = await getPool().query(
      `
        SELECT w.*, a.first_name, a.last_name
        FROM account_warnings w
        LEFT JOIN accounts a ON a.account_id = w.admin_account_id
        WHERE w.account_id = $1
        ORDER BY w.created_at DESC, w.warning_id DESC;
      `,
      [accountId]
    );

    return result.rows.map((row) =>
      mapWarningRow({
        ...row,
        admin_name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : null
      })
    );
  }

  async getActiveMuteByAccountId(accountId: number) {
    const result = await getPool().query(
      `
        SELECT m.*, a.first_name, a.last_name
        FROM support_ticket_mutes m
        LEFT JOIN accounts a ON a.account_id = m.admin_account_id
        WHERE m.account_id = $1
          AND m.expires_at > NOW()
        ORDER BY m.expires_at DESC, m.mute_id DESC
        LIMIT 1;
      `,
      [accountId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return mapMuteRow({
      ...result.rows[0],
      admin_name: result.rows[0].first_name && result.rows[0].last_name ? `${result.rows[0].first_name} ${result.rows[0].last_name}` : null
    });
  }

  async deleteActiveMutesByAccountId(accountId: number) {
    const result = await getPool().query(
      `
        DELETE FROM support_ticket_mutes
        WHERE account_id = $1
          AND expires_at > NOW()
        RETURNING *;
      `,
      [accountId]
    );

    return result.rows.length;
  }

  async createMute(accountId: number, adminAccountId: number | null, reason: string, expiresAtIso: string) {
    const result = await getPool().query(
      `
        INSERT INTO support_ticket_mutes (account_id, admin_account_id, reason, expires_at)
        VALUES ($1, $2, $3, $4::timestamptz)
        RETURNING *;
      `,
      [accountId, adminAccountId, reason, expiresAtIso]
    );

    const row = result.rows[0];
    let adminName: string | null = null;
    if (row?.admin_account_id) {
      const adminResult = await getPool().query(
        "SELECT first_name, last_name FROM accounts WHERE account_id = $1 LIMIT 1;",
        [row.admin_account_id]
      );
      if ((adminResult.rowCount ?? 0) > 0) {
        adminName = `${adminResult.rows[0].first_name} ${adminResult.rows[0].last_name}`;
      }
    }

    return mapMuteRow({
      ...row,
      admin_name: adminName
    });
  }
}
