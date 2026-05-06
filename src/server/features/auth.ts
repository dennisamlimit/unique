import bcrypt from "bcryptjs";
import { createAccount, findAccountByEmail, findAccountBySocialClubId, setAccountUiTheme } from "../db/accounts";
import { listCharacters } from "../db/characters";
import { findActiveAccountBan } from "../db/punishments";
import { kickAfterAdminScreen, sendPunishmentScreen } from "./adminScreens";
import { getSession, setSession } from "./session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getSocialIdentity(player: RageMpPlayer) {
  const socialClubName = player.socialClub || player.name || "Unknown";
  const socialClubId = player.rgscId || player.socialClub || player.name;
  return { socialClubName, socialClubId };
}

export async function sendAuthBootstrap(player: RageMpPlayer) {
  const identity = getSocialIdentity(player);
  const account = await findAccountBySocialClubId(identity.socialClubId);

  player.call("unique:client:startAuth", [
    JSON.stringify({
      socialClubName: identity.socialClubName,
      socialClubId: identity.socialClubId,
      knownEmail: account?.email ?? null,
      uiTheme: account?.uiTheme ?? null
    })
  ]);
}

export async function registerAccount(player: RageMpPlayer, payloadJson: string) {
  const payload = parsePayload(payloadJson);
  const identity = getSocialIdentity(player);
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");

  if (!emailPattern.test(email)) {
    return sendAuthError(player, "Bitte gib eine gueltige E-Mail-Adresse ein.");
  }

  if (password.length < 6) {
    return sendAuthError(player, "Dein Passwort muss mindestens 6 Zeichen lang sein.");
  }

  const existingSocial = await findAccountBySocialClubId(identity.socialClubId);
  if (existingSocial) {
    return sendAuthError(player, "Fuer diesen Social-Club-Account existiert bereits ein Unique Account.");
  }

  const existingEmail = await findAccountByEmail(email);
  if (existingEmail) {
    return sendAuthError(player, "Diese E-Mail-Adresse ist bereits vergeben.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await createAccount({
    socialClubId: identity.socialClubId,
    socialClubName: identity.socialClubName,
    email,
    passwordHash
  });

  setSession(player, { account });
  await sendCharacters(player, account.id);
}

export async function loginAccount(player: RageMpPlayer, payloadJson: string) {
  const payload = parsePayload(payloadJson);
  const identity = getSocialIdentity(player);
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");

  const account = await findAccountByEmail(email);
  if (!account) {
    return sendAuthError(player, "E-Mail oder Passwort ist falsch.");
  }

  if (account.socialClubId !== identity.socialClubId) {
    return sendAuthError(player, "Dieser Account gehoert zu einem anderen Social-Club-Account.");
  }

  const validPassword = await bcrypt.compare(password, account.passwordHash);
  if (!validPassword) {
    return sendAuthError(player, "E-Mail oder Passwort ist falsch.");
  }

  setSession(player, { account });
  await sendCharacters(player, account.id);
}

export async function sendCharacters(player: RageMpPlayer, accountId: number) {
  const session = getSession(player);
  if (session?.account) {
    const accountBan = await findActiveAccountBan(session.account.id);
    if (accountBan) {
      sendPunishmentScreen(player, accountBan);
      kickAfterAdminScreen(player, "Account gebannt.");
      return;
    }
  }

  const characters = await listCharacters(accountId);
  player.call("unique:client:characters", [JSON.stringify({ characters, uniqueCoins: session?.account.uniqueCoins ?? 0, uiTheme: session?.account.uiTheme ?? null })]);
}

export async function saveUiTheme(player: RageMpPlayer, payloadJson: string) {
  const session = getSession(player);
  if (!session) {
    return;
  }

  const payload = parsePayload(payloadJson);
  const uiTheme = JSON.stringify(payload).slice(0, 4000);
  const updated = await setAccountUiTheme(session.account.id, uiTheme);
  if (updated) {
    setSession(player, { ...session, account: updated });
  }
}

function sendAuthError(player: RageMpPlayer, message: string) {
  player.call("unique:client:authError", [JSON.stringify({ message })]);
}

function parsePayload(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}
