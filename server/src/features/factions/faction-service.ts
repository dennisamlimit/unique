import { FactionRepository } from "./faction-repository.js";
import type { CreateFactionDto, AssignFactionMemberDto, SetFactionRankNameDto } from "./faction-dtos.js";

const DEFAULT_RANK_NAMES: Record<number, string> = {
  1: "Mitglied",
  2: "Erfahrenes Mitglied",
  3: "Veteran",
  4: "Offizier",
  5: "Vize-Chef",
  6: "Anführer"
};

export class FactionService {
  private readonly repository = new FactionRepository();

  async getById(factionId: number) {
    return this.repository.getById(factionId);
  }

  async getAll() {
    return this.repository.getAll();
  }

  async create(dto: CreateFactionDto) {
    const faction = await this.repository.create({
      name: dto.name.trim(),
      shortName: dto.shortName.toUpperCase(),
      type: dto.type,
      colorHex: dto.colorHex.toUpperCase()
    });

    for (let level = 1; level <= 6; level++) {
      await this.repository.upsertRank(faction.factionId, level, DEFAULT_RANK_NAMES[level] ?? `Rang ${level}`);
    }

    return faction;
  }

  async delete(factionId: number) {
    return this.repository.delete(factionId);
  }

  async setRankName(dto: SetFactionRankNameDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    return this.repository.upsertRank(dto.factionId, dto.rankLevel, dto.rankName.trim());
  }

  async getRanks(factionId: number) {
    return this.repository.getRanksByFactionId(factionId);
  }

  async getMembershipByAccountId(accountId: number) {
    return this.repository.getMembershipByAccountId(accountId);
  }

  async getMemberProfile(accountId: number) {
    return this.repository.getMemberProfile(accountId);
  }

  async getMembersByFactionId(factionId: number) {
    return this.repository.getMembersByFactionId(factionId);
  }

  async setFactionLeader(factionId: number, accountId: number) {
    const faction = await this.repository.getById(factionId);
    if (!faction) {
      return null;
    }

    const currentLeader = await this.repository.getLeaderMembership(factionId);
    if (currentLeader && currentLeader.accountId !== accountId) {
      await this.repository.assignMember(factionId, currentLeader.accountId, 5);
    }

    return this.repository.assignMember(factionId, accountId, 6);
  }

  async assignMember(dto: AssignFactionMemberDto) {
    const faction = await this.repository.getById(dto.factionId);
    if (!faction) {
      return null;
    }

    return this.repository.assignMember(dto.factionId, dto.accountId, dto.rankLevel);
  }

  async removeMember(accountId: number) {
    return this.repository.removeMember(accountId);
  }
}
