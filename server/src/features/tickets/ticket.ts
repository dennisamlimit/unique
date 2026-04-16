export type TicketStatus = "open" | "claimed" | "waiting_player" | "waiting_admin" | "closed";
export type TicketPriority = "normal" | "high" | "critical";
export type TicketCategory = "support";

export interface TicketMessage {
  messageId: number;
  ticketId: number;
  senderType: "player" | "admin" | "system";
  senderAccountId: number | null;
  senderName: string;
  message: string;
  internalNote: boolean;
  createdAt: string;
}

export interface TicketParticipant {
  ticketId: number;
  adminAccountId: number;
  adminName: string;
  roleLabel: string;
  addedByAccountId: number | null;
  addedAt: string;
}

export interface SupportTicket {
  ticketId: number;
  accountId: number;
  accountName: string;
  category: TicketCategory;
  prefix: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  claimedByAccountId: number | null;
  claimedByName: string | null;
  closedByAccountId: number | null;
  closedByName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages: TicketMessage[];
  participants: TicketParticipant[];
}

export interface AccountWarning {
  warningId: number;
  accountId: number;
  adminAccountId: number | null;
  adminName: string | null;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface TicketMute {
  muteId: number;
  accountId: number;
  adminAccountId: number | null;
  adminName: string | null;
  reason: string;
  createdAt: string;
  expiresAt: string;
}
