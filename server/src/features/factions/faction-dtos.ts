import type { FactionType } from "./faction.js";

export type CreateFactionDto = {
  type: FactionType;
  name: string;
  shortName: string;
  colorHex: string;
};

export type SetFactionLeaderDto = {
  accountId: number;
  factionId: number;
};

export type SetFactionRankNameDto = {
  factionId: number;
  rankLevel: number;
  rankName: string;
};

export type InviteToFactionDto = {
  factionId: number;
  invitedByAccountId: number;
  targetAccountId: number;
};

export type AssignFactionMemberDto = {
  factionId: number;
  accountId: number;
  rankLevel: number;
};
