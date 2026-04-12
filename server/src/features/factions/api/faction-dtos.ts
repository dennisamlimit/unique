import type { FactionType } from "../faction.js";

export type CreateFactionDto = {
  type: FactionType;
  name: string;
  shortName: string;
  colorHex: string;
  mapIconId: number;
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

export type SetFactionRankPermissionDto = {
  factionId: number;
  rankLevel: number;
  permissionKey: string;
  granted: boolean;
};

export type SetFactionSpawnDto = {
  factionId: number;
};

export type CreateFactionStoragePointDto = {
  factionId: number;
  storageType: string;
  label: string;
};

export type CreateFactionWardrobePointDto = {
  factionId: number;
  label: string;
};

export type CreateFactionOutfitDto = {
  factionId: number;
  category: string;
  name: string;
  clothing: number[][];
};

export type CreateFactionVehicleDto = {
  factionId: number;
  minRankLevel: number;
  modelName: string;
  displayName: string;
};

export type UpdateFactionMemberRankDto = {
  factionId: number;
  accountId: number;
  rankLevel: number;
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
