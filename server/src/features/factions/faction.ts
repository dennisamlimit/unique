export type FactionType = "mafia" | "gang" | "state";

export type Faction = {
  factionId: number;
  name: string;
  shortName: string;
  type: FactionType;
  colorHex: string;
  createdAt: string;
};

export type FactionRank = {
  factionId: number;
  rankLevel: number;
  rankName: string;
};

export type FactionMembership = {
  factionId: number;
  accountId: number;
  rankLevel: number;
  joinedAt: string;
};

export type FactionMemberProfile = {
  accountId: number;
  factionId: number;
  factionName: string;
  factionShortName: string;
  factionType: FactionType;
  factionColorHex: string;
  rankLevel: number;
  rankName: string;
  joinedAt: string;
};
