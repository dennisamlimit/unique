import { pool } from "./pool";

export type SupportTicketCategory =
  | "stuck"
  | "bug"
  | "player"
  | "account"
  | "shop"
  | "faction"
  | "event"
  | "other";

export type SupportTicketPriority = "low" | "normal" | "high" | "critical";
export type SupportTicketStatus = "open" | "in_progress" | "closed";
export type SupportTicketAuthorRole = "player" | "admin" | "system";

export interface SupportTicketMessageRecord {
  id: number;
  ticketId: number;
  authorCharacterId: number | null;
  authorAccountId: number | null;
  authorName: string;
  authorRole: SupportTicketAuthorRole;
  message: string;
  createdAt: Date;
}

export interface SupportTicketRecord {
  id: number;
  characterId: number;
  accountId: number;
  characterName: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assignedAdminAccountId: number | null;
  assignedAdminName: string | null;
  escalatedToLevel: number | null;
  createdAt: Date;
  updatedAt: Date;
  messages: SupportTicketMessageRecord[];
}

export interface SupportTicketMuteRecord {
  id: number;
  characterId: number;
  accountId: number;
  mutedByAccountId: number | null;
  mutedByName: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

function mapSupportTicket(row: any, messages: SupportTicketMessageRecord[] = []): SupportTicketRecord {
  return {
    id: row.id,
    characterId: row.character_id,
    accountId: row.account_id,
    characterName: row.character_name ?? "Unbekannt",
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    priority: row.priority ?? "normal",
    assignedAdminAccountId: row.assigned_admin_account_id ?? null,
    assignedAdminName: row.assigned_admin_name ?? null,
    escalatedToLevel: row.escalated_to_level ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages
  };
}

function mapSupportMessage(row: any): SupportTicketMessageRecord {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorCharacterId: row.author_character_id ?? null,
    authorAccountId: row.author_account_id ?? null,
    authorName: row.author_name,
    authorRole: row.author_role,
    message: row.message,
    createdAt: row.created_at
  };
}

function mapSupportMute(row: any): SupportTicketMuteRecord {
  return {
    id: row.id,
    characterId: row.character_id,
    accountId: row.account_id,
    mutedByAccountId: row.muted_by_account_id ?? null,
    mutedByName: row.muted_by_name,
    reason: row.reason,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

export async function createSupportTicket(input: {
  characterId: number;
  accountId: number;
  characterName: string;
  category: SupportTicketCategory;
  subject: string;
  message: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ticketResult = await client.query(
      `
        INSERT INTO support_tickets (character_id, account_id, category, subject, message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [input.characterId, input.accountId, input.category, input.subject, input.message]
    );
    const ticket = ticketResult.rows[0];
    const messageResult = await client.query(
      `
        INSERT INTO support_ticket_messages (ticket_id, author_character_id, author_account_id, author_name, author_role, message)
        VALUES ($1, $2, $3, $4, 'player', $5)
        RETURNING *
      `,
      [ticket.id, input.characterId, input.accountId, input.characterName, input.message]
    );
    await client.query("COMMIT");
    return mapSupportTicket({ ...ticket, character_name: input.characterName }, [mapSupportMessage(messageResult.rows[0])]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findOpenSupportTicketForCharacter(characterId: number) {
  const tickets = await listOpenSupportTicketsForCharacter(characterId);
  return tickets[0] ?? null;
}

export async function listOpenSupportTicketsForCharacter(characterId: number) {
  const result = await pool.query(
    `
      SELECT t.*, CONCAT(c.first_name, ' ', c.last_name) AS character_name
      FROM support_tickets t
      JOIN characters c ON c.id = t.character_id
      WHERE t.character_id = $1 AND t.status <> 'closed'
      ORDER BY t.updated_at DESC, t.created_at DESC
    `,
    [characterId]
  );
  return withMessages(result.rows);
}

export async function listOpenSupportTicketsForAdmin(_adminLevel: number) {
  const result = await pool.query(
    `
      SELECT t.*, CONCAT(c.first_name, ' ', c.last_name) AS character_name
      FROM support_tickets t
      JOIN characters c ON c.id = t.character_id
      WHERE t.status <> 'closed'
      ORDER BY
        CASE t.priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          ELSE 3
        END,
        t.updated_at DESC,
        t.created_at DESC
    `,
    []
  );
  return withMessages(result.rows);
}

export async function closeOpenSupportTicketsForCharacter(characterId: number, systemMessage?: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `
        UPDATE support_tickets
        SET status = 'closed', updated_at = NOW()
        WHERE character_id = $1 AND status <> 'closed'
        RETURNING id
      `,
      [characterId]
    );
    const ticketIds = result.rows.map((row) => Number(row.id)).filter(Number.isInteger);
    if (systemMessage && ticketIds.length) {
      await client.query(
        `
          INSERT INTO support_ticket_messages (ticket_id, author_character_id, author_account_id, author_name, author_role, message)
          SELECT unnest($1::int[]), NULL, NULL, 'System', 'system', $2
        `,
        [ticketIds, systemMessage]
      );
    }
    await client.query("COMMIT");
    return ticketIds;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addSupportTicketMessage(input: {
  ticketId: number;
  authorCharacterId: number | null;
  authorAccountId: number | null;
  authorName: string;
  authorRole: SupportTicketAuthorRole;
  message: string;
}) {
  const result = await pool.query(
    `
      INSERT INTO support_ticket_messages (ticket_id, author_character_id, author_account_id, author_name, author_role, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [input.ticketId, input.authorCharacterId, input.authorAccountId, input.authorName, input.authorRole, input.message]
  );
  await pool.query("UPDATE support_tickets SET updated_at = NOW() WHERE id = $1", [input.ticketId]);
  return mapSupportMessage(result.rows[0]);
}

export async function updateSupportTicket(input: {
  ticketId: number;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  status?: SupportTicketStatus;
  assignedAdminAccountId?: number | null;
  assignedAdminName?: string | null;
  escalatedToLevel?: number | null;
}) {
  const result = await pool.query(
    `
      UPDATE support_tickets
      SET
        category = COALESCE($2, category),
        priority = COALESCE($3, priority),
        status = COALESCE($4, status),
        assigned_admin_account_id = CASE WHEN $5::boolean THEN $6 ELSE assigned_admin_account_id END,
        assigned_admin_name = CASE WHEN $5::boolean THEN $7 ELSE assigned_admin_name END,
        escalated_to_level = CASE WHEN $8::boolean THEN $9 ELSE escalated_to_level END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      input.ticketId,
      input.category ?? null,
      input.priority ?? null,
      input.status ?? null,
      Object.prototype.hasOwnProperty.call(input, "assignedAdminAccountId"),
      input.assignedAdminAccountId ?? null,
      input.assignedAdminName ?? null,
      Object.prototype.hasOwnProperty.call(input, "escalatedToLevel"),
      input.escalatedToLevel ?? null
    ]
  );
  return result.rows[0] ? mapSupportTicket(result.rows[0]) : null;
}

export async function findSupportTicket(ticketId: number) {
  const result = await pool.query(
    `
      SELECT t.*, CONCAT(c.first_name, ' ', c.last_name) AS character_name
      FROM support_tickets t
      JOIN characters c ON c.id = t.character_id
      WHERE t.id = $1
      LIMIT 1
    `,
    [ticketId]
  );
  if (!result.rows[0]) {
    return null;
  }
  const messages = await listSupportTicketMessages(ticketId);
  return mapSupportTicket(result.rows[0], messages);
}

export async function countOpenSupportTickets() {
  const result = await pool.query("SELECT COUNT(*)::int AS count FROM support_tickets WHERE status <> 'closed'");
  return Number(result.rows[0]?.count ?? 0);
}

export async function createSupportTicketMute(input: {
  characterId: number;
  accountId: number;
  mutedByAccountId: number | null;
  mutedByName: string;
  reason: string;
  expiresAt: Date;
}) {
  await pool.query("UPDATE support_ticket_mutes SET lifted_at = NOW() WHERE character_id = $1 AND lifted_at IS NULL", [input.characterId]);
  const result = await pool.query(
    `
      INSERT INTO support_ticket_mutes (character_id, account_id, muted_by_account_id, muted_by_name, reason, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [input.characterId, input.accountId, input.mutedByAccountId, input.mutedByName, input.reason, input.expiresAt]
  );
  return mapSupportMute(result.rows[0]);
}

export async function clearSupportTicketMute(characterId: number) {
  const result = await pool.query(
    `
      UPDATE support_ticket_mutes
      SET lifted_at = NOW()
      WHERE character_id = $1 AND lifted_at IS NULL AND expires_at > NOW()
      RETURNING *
    `,
    [characterId]
  );
  return result.rows.map(mapSupportMute);
}

export async function findActiveSupportTicketMute(characterId: number) {
  const result = await pool.query(
    `
      SELECT *
      FROM support_ticket_mutes
      WHERE character_id = $1 AND lifted_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [characterId]
  );
  return result.rows[0] ? mapSupportMute(result.rows[0]) : null;
}

async function withMessages(rows: any[]) {
  const tickets = rows.map((row) => mapSupportTicket(row));
  if (!tickets.length) {
    return tickets;
  }
  const messages = await listSupportTicketMessages(tickets.map((ticket) => ticket.id));
  return tickets.map((ticket) => ({
    ...ticket,
    messages: messages.filter((message) => message.ticketId === ticket.id)
  }));
}

async function listSupportTicketMessages(ticketIds: number | number[]) {
  const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
  if (!ids.length) {
    return [];
  }
  const result = await pool.query(
    `
      SELECT *
      FROM support_ticket_messages
      WHERE ticket_id = ANY($1::int[])
      ORDER BY created_at ASC, id ASC
    `,
    [ids]
  );
  return result.rows.map(mapSupportMessage);
}
