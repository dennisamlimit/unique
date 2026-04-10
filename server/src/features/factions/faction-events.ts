import { FactionService } from "./faction-service.js";
import {
  parseCreateFactionDto,
  parseSetFactionLeaderDto,
  parseSetFactionRankNameDto,
  parseAssignFactionMemberDto
} from "./faction-dto-parsers.js";
import { validateCreateFactionDto, validateSetFactionRankNameDto } from "./faction-validators.js";

type PlayerMp = any;

type FactionEventDeps = {
  factions: FactionService;
  logError: (message: string, error: unknown) => void;
  systemMessage: (player: PlayerMp, message: string) => void;
  hasAdminLevel: (player: PlayerMp, level: number) => boolean;
  getVar: (player: PlayerMp, key: string, fallback: unknown) => unknown;
};

export async function handleFactionAdminCommand(
  player: PlayerMp,
  command: string,
  parts: string[],
  args: string,
  deps: FactionEventDeps
): Promise<boolean> {
  const { factions, logError, systemMessage, hasAdminLevel } = deps;

  const ensureLevel = (level: number) => {
    if (!hasAdminLevel(player, level)) {
      systemMessage(player, `Dafuer benoetigst du Admin-Level ${level}.`);
      return false;
    }
    return true;
  };

  switch (command) {
    case "createfaction": {
      if (!ensureLevel(10)) return true;

      const dto = parseCreateFactionDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /createfaction [mafia|gang|state] [KUERZEL] [Name] [#RRGGBB]");
        return true;
      }

      const validation = validateCreateFactionDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const faction = await factions.create(dto);
        systemMessage(player, `Fraktion erstellt: [${faction.shortName}] ${faction.name} (ID ${faction.factionId})`);
      } catch (error) {
        logError("createfaction failed", error);
        systemMessage(player, "Fraktion konnte nicht erstellt werden. Name oder Kuerzel bereits vergeben.");
      }

      return true;
    }

    case "deletefaction": {
      if (!ensureLevel(10)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /deletefaction [fraktionId]");
        return true;
      }

      try {
        const faction = await factions.getById(factionId);
        if (!faction) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        await factions.delete(factionId);
        systemMessage(player, `Fraktion geloescht: [${faction.shortName}] ${faction.name}`);
      } catch (error) {
        logError("deletefaction failed", error);
        systemMessage(player, "Fraktion konnte nicht geloescht werden.");
      }

      return true;
    }

    case "factions": {
      if (!ensureLevel(1)) return true;

      try {
        const all = await factions.getAll();
        if (all.length === 0) {
          systemMessage(player, "Keine Fraktionen vorhanden.");
          return true;
        }

        systemMessage(player, `Fraktionen (${all.length}):`);
        for (const f of all) {
          systemMessage(player, `  ID ${f.factionId} | [${f.shortName}] ${f.name} | ${f.type} | ${f.colorHex}`);
        }
      } catch (error) {
        logError("factions list failed", error);
        systemMessage(player, "Fraktionsliste konnte nicht geladen werden.");
      }

      return true;
    }

    case "setfactionleader": {
      if (!ensureLevel(10)) return true;

      const dto = parseSetFactionLeaderDto(parts);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionleader [accountId] [fraktionId]");
        return true;
      }

      try {
        const membership = await factions.setFactionLeader(dto.factionId, dto.accountId);
        if (!membership) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Account ${dto.accountId} ist jetzt Anfuehrer von Fraktion ${dto.factionId}.`);
      } catch (error) {
        logError("setfactionleader failed", error);
        systemMessage(player, "Anfuehrer konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "setfactionrankname": {
      if (!ensureLevel(10)) return true;

      const dto = parseSetFactionRankNameDto(parts, args);
      if (!dto) {
        systemMessage(player, "Nutze: /setfactionrankname [fraktionId] [rang 1-6] [name]");
        return true;
      }

      const validation = validateSetFactionRankNameDto(dto);
      if (!validation.ok) {
        systemMessage(player, (validation as { ok: false; message: string }).message);
        return true;
      }

      try {
        const rank = await factions.setRankName(dto);
        if (!rank) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Rang ${dto.rankLevel} in Fraktion ${dto.factionId} heisst jetzt: ${dto.rankName}`);
      } catch (error) {
        logError("setfactionrankname failed", error);
        systemMessage(player, "Rangname konnte nicht gesetzt werden.");
      }

      return true;
    }

    case "setfactionmember": {
      if (!ensureLevel(5)) return true;

      const factionId = Number(parts[1]);
      const accountId = Number(parts[2]);
      const rankLevel = Number(parts[3] ?? 1);

      if (!Number.isInteger(factionId) || !Number.isInteger(accountId) || !Number.isInteger(rankLevel)) {
        systemMessage(player, "Nutze: /setfactionmember [fraktionId] [accountId] [rang 1-5]");
        return true;
      }

      const clampedRank = Math.min(5, Math.max(1, rankLevel));

      try {
        const dto = parseAssignFactionMemberDto(factionId, accountId, clampedRank);
        const membership = await factions.assignMember(dto);
        if (!membership) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        systemMessage(player, `Account ${accountId} wurde Fraktion ${factionId} mit Rang ${clampedRank} zugewiesen.`);
      } catch (error) {
        logError("setfactionmember failed", error);
        systemMessage(player, "Mitglied konnte nicht zugewiesen werden.");
      }

      return true;
    }

    case "removefactionmember": {
      if (!ensureLevel(5)) return true;

      const accountId = Number(parts[1]);
      if (!Number.isInteger(accountId)) {
        systemMessage(player, "Nutze: /removefactionmember [accountId]");
        return true;
      }

      try {
        const removed = await factions.removeMember(accountId);
        if (!removed) {
          systemMessage(player, "Account ist kein Fraktionsmitglied.");
          return true;
        }

        systemMessage(player, `Account ${accountId} wurde aus seiner Fraktion entfernt.`);
      } catch (error) {
        logError("removefactionmember failed", error);
        systemMessage(player, "Mitglied konnte nicht entfernt werden.");
      }

      return true;
    }

    case "factioninfo": {
      if (!ensureLevel(1)) return true;

      const factionId = Number(parts[1]);
      if (!Number.isInteger(factionId)) {
        systemMessage(player, "Nutze: /factioninfo [fraktionId]");
        return true;
      }

      try {
        const faction = await factions.getById(factionId);
        if (!faction) {
          systemMessage(player, "Fraktion nicht gefunden.");
          return true;
        }

        const ranks = await factions.getRanks(factionId);
        const members = await factions.getMembersByFactionId(factionId);

        systemMessage(player, `[${faction.shortName}] ${faction.name} | ${faction.type} | ${faction.colorHex}`);
        systemMessage(player, `Mitglieder: ${members.length}`);

        if (ranks.length > 0) {
          const rankList = ranks.map((r) => `${r.rankLevel}: ${r.rankName}`).join(" | ");
          systemMessage(player, `Raenge: ${rankList}`);
        }
      } catch (error) {
        logError("factioninfo failed", error);
        systemMessage(player, "Fraktionsinfo konnte nicht geladen werden.");
      }

      return true;
    }

    default:
      return false;
  }
}
