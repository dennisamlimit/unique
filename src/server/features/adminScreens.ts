import type { AdminPunishmentRecord } from "../db/punishments";

export const jailCellPosition = {
  x: 1690.24,
  y: 2593.48,
  z: 45.56,
  heading: 178.0
};

export const prisonReleasePosition = {
  x: 1846.72,
  y: 2585.86,
  z: 45.67,
  heading: 92.0
};

export interface AdminScreenPayload {
  type: "amsg" | "ban" | "iban" | "jail" | "warn" | "mute";
  title: string;
  administrator: string;
  administratorId: number | null;
  targetName?: string;
  reason?: string;
  message?: string;
  duration?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface AdminJailStatusPayload {
  active: boolean;
  type?: "jail" | "warn";
  administrator?: string;
  reason?: string;
  expiresAt?: string;
  durationSeconds?: number;
}

export function sendAdminScreen(player: RageMpPlayer, payload: AdminScreenPayload) {
  player.call("unique:client:adminScreen", [JSON.stringify(payload)]);
}

export function sendAdminJailStatus(player: RageMpPlayer, payload: AdminJailStatusPayload) {
  player.call("unique:client:adminJailStatus", [JSON.stringify(payload)]);
}

export function clearAdminJailStatus(player: RageMpPlayer) {
  sendAdminJailStatus(player, { active: false });
}

export function sendPunishmentScreen(player: RageMpPlayer, punishment: AdminPunishmentRecord, title?: string) {
  sendAdminScreen(player, {
    type: punishment.type === "iban" ? "iban" : punishment.type,
    title: title ?? getPunishmentTitle(punishment.type),
    administrator: punishment.adminName,
    administratorId: punishment.adminCharacterId,
    targetName: punishment.targetName,
    reason: punishment.reason,
    duration: formatDurationSeconds(punishment.durationSeconds),
    expiresAt: punishment.expiresAt.toISOString(),
    createdAt: punishment.createdAt.toISOString()
  });
}

export function sendJailStatusFromPunishment(player: RageMpPlayer, punishment: AdminPunishmentRecord, type: "jail" | "warn" = "jail") {
  sendAdminJailStatus(player, {
    active: true,
    type,
    administrator: punishment.adminName,
    reason: punishment.reason,
    expiresAt: punishment.expiresAt.toISOString(),
    durationSeconds: punishment.durationSeconds
  });
}

export function movePlayerToJailCell(player: RageMpPlayer) {
  player.dimension = 1;
  player.spawn(new mp.Vector3(jailCellPosition.x, jailCellPosition.y, jailCellPosition.z));
  player.heading = jailCellPosition.heading;
}

export function kickAfterAdminScreen(player: RageMpPlayer, reason: string) {
  setTimeout(() => {
    try {
      player.kick(reason);
    } catch {}
  }, 5800);
}

function getPunishmentTitle(type: AdminPunishmentRecord["type"]) {
  if (type === "iban") {
    return "Account-Bann";
  }
  if (type === "ban") {
    return "Charakter-Bann";
  }
  if (type === "jail") {
    return "Jail-Strafe";
  }
  return "Verwarnung";
}

function formatDurationSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.trunc(totalSeconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (days > 0) {
    return `${days} Tag${days === 1 ? "" : "e"}${hours ? ` ${hours} Std.` : ""}`;
  }
  if (hours > 0) {
    return `${hours} Std.${minutes ? ` ${minutes} Min.` : ""}`;
  }
  if (minutes > 0) {
    return `${minutes} Min.${seconds ? ` ${seconds} Sek.` : ""}`;
  }
  return `${seconds} Sek.`;
}
