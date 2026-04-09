using System;
using System.Globalization;
using GTANetworkAPI;
using Unique.Accounts;
using Unique.Admin.Services;
using Unique.Chat;
using Unique.Vehicles;
using Unique.World;

namespace Unique.Admin.Commands
{
    public class AdminCommands : Script
    {
        private static readonly VehicleSpawnService VehicleSpawnService = new VehicleSpawnService();

        private static readonly string[] AdminOnlyCommands =
        {
            "admin",
            "myadmin",
            "veh",
            "msg",
            "setadmin",
            "findaccountsc",
            "goto",
            "gethere",
            "aheal",
            "revive",
            "apos",
            "setserverspawn",
            "serverspawn",
            "gotospawn",
            "setmoney",
            "addmoney",
            "setbank",
            "addbank",
            "kick",
            "ban",
            "unban"
        };

        public static bool TryHandleChatCommand(Player player, string command, string[] parts, string args)
        {
            if (IsAdminOnlyCommand(command) && !AdminAuthorizationService.HasAnyAdminLevel(player))
                return true;

            switch (command)
            {
                case "admin":
                    AdminAuthorizationService.ToggleAdminMode(player);
                    return true;

                case "myadmin":
                    CmdMyAdmin(player);
                    return true;

                case "veh":
                    CmdVeh(player, parts);
                    return true;

                case "msg":
                    CmdAdminBroadcast(player, args);
                    return true;

                case "setadmin":
                    CmdSetAdmin(player, parts);
                    return true;

                case "findaccountsc":
                    CmdFindAccountBySocialClub(player, args);
                    return true;

                case "goto":
                    CmdGoto(player, parts);
                    return true;

                case "gethere":
                    CmdGetHere(player, parts);
                    return true;

                case "aheal":
                    CmdHeal(player, parts);
                    return true;

                case "revive":
                    CmdRevive(player, parts);
                    return true;

                case "apos":
                    CmdPosition(player, parts);
                    return true;

                case "setserverspawn":
                    CmdSetServerSpawn(player);
                    return true;

                case "serverspawn":
                    CmdServerSpawn(player);
                    return true;

                case "gotospawn":
                    CmdGotoSpawn(player);
                    return true;

                case "setmoney":
                    CmdSetMoney(player, parts, false);
                    return true;

                case "addmoney":
                    CmdAddMoney(player, parts, false);
                    return true;

                case "setbank":
                    CmdSetMoney(player, parts, true);
                    return true;

                case "addbank":
                    CmdAddMoney(player, parts, true);
                    return true;

                case "kick":
                    CmdKick(player, parts, args);
                    return true;

                case "ban":
                    CmdBan(player, parts, args);
                    return true;

                case "unban":
                    CmdUnban(player, parts);
                    return true;

                default:
                    return false;
            }
        }

        private static void CmdVeh(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 1))
                return;

            string model = parts.Length > 1 ? parts[1] : "adder";
            string arg1 = parts.Length > 2 ? parts[2] : null;
            string arg2 = parts.Length > 3 ? parts[3] : null;
            string arg3 = parts.Length > 4 ? parts[4] : null;

            int color1 = 111;
            int color2 = 111;
            string plate = "ADMIN";

            bool arg1IsInt = int.TryParse(arg1, out int c1);
            bool arg2IsInt = int.TryParse(arg2, out int c2);

            if (!string.IsNullOrWhiteSpace(arg1))
            {
                if (arg1IsInt && arg2IsInt)
                {
                    color1 = c1;
                    color2 = c2;

                    if (!string.IsNullOrWhiteSpace(arg3))
                        plate = arg3;
                }
                else
                {
                    plate = arg1;
                }
            }

            Vehicle vehicle = VehicleSpawnService.CreateForPlayer(player, model, color1, color2);
            if (vehicle == null)
            {
                ChatOutput.SendSystem(player, "Ungueltiges Fahrzeugmodell oder Fahrzeug konnte nicht erstellt werden.");
                return;
            }

            vehicle.NumberPlate = plate;
            NAPI.Player.SetPlayerIntoVehicle(player, vehicle, -1);
            ChatOutput.SendSystem(player, $"Fahrzeug gespawnt: {model}");
        }

        private static void CmdMyAdmin(Player player)
        {
            if (player == null)
                return;

            int adminLevel = AdminAuthorizationService.GetPlayerAdminLevel(player);
            bool adminMode = AdminAuthorizationService.IsAdminMode(player);
            ChatOutput.SendSystem(player, $"Admin-Level: {adminLevel} | Modus: {(adminMode ? "aktiv" : "inaktiv")}");
        }

        private static void CmdSetAdmin(Player player, string[] parts)
        {
            if (parts.Length < 3 || !int.TryParse(parts[1], out int accountId) || !int.TryParse(parts[2], out int adminLevel))
            {
                ChatOutput.SendSystem(player, "Nutze: /setadmin [accountId] [level]");
                return;
            }

            if (!AdminAuthorizationService.TrySetAdminLevel(player, accountId, adminLevel))
                return;

            Account account = AccountManager.GetById(accountId);
            string accountName = account == null ? $"Account {accountId}" : $"{account.DisplayName} ({account.Email})";
            ChatOutput.SendSystem(player, $"Admin-Level gesetzt: {accountName} -> {adminLevel}");
        }

        private static void CmdFindAccountBySocialClub(Player player, string socialClubId)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Account account = AccountManager.GetBySocialClubId(socialClubId?.Trim());
            if (account == null)
            {
                ChatOutput.SendSystem(player, "Kein Account mit dieser Social-Club-ID gefunden.");
                return;
            }

            ChatOutput.SendSystem(player, $"Gefunden: ID {account.AccountId} | {account.DisplayName} | {account.Email} | Admin {account.AdminLevel}");
        }

        private static void CmdAdminBroadcast(Player player, string message)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            if (string.IsNullOrWhiteSpace(message))
            {
                ChatOutput.SendSystem(player, "Nutze: /msg [nachricht]");
                return;
            }

            string sender = GetPlayerName(player);
            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null)
                    continue;

                ChatOutput.SendAdmin(target, sender, message.Trim());
            }
        }

        private static void CmdGoto(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Player target = GetTargetPlayer(player, parts, "/goto [spielerId]");
            if (target == null)
                return;

            player.Position = target.Position + new Vector3(1.5f, 0f, 0f);
            player.Dimension = target.Dimension;
            ChatOutput.SendSystem(player, $"Teleportiert zu {GetPlayerName(target)}");
        }

        private static void CmdGetHere(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Player target = GetTargetPlayer(player, parts, "/gethere [spielerId]");
            if (target == null)
                return;

            target.Position = player.Position + new Vector3(1.5f, 0f, 0f);
            target.Dimension = player.Dimension;
            ChatOutput.SendSystem(player, $"Spieler geholt: {GetPlayerName(target)}");
            ChatOutput.SendSystem(target, "Du wurdest von einem Admin teleportiert.");
        }

        private static void CmdHeal(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 1))
                return;

            Player target = parts.Length > 1
                ? GetTargetPlayer(player, parts, "/aheal [spielerId]")
                : player;

            if (target == null)
                return;

            target.Health = 100;
            target.Armor = 100;

            if (target == player)
            {
                ChatOutput.SendSystem(player, "Du hast dich voll geheilt.");
                return;
            }

            ChatOutput.SendSystem(player, $"Spieler geheilt: {GetPlayerName(target)}");
            ChatOutput.SendSystem(target, "Du wurdest von einem Admin geheilt.");
        }

        private static void CmdRevive(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 1))
                return;

            Player target = parts.Length > 1
                ? GetTargetPlayer(player, parts, "/revive [spielerId]")
                : player;

            if (target == null)
                return;

            target.Health = 100;
            target.Armor = 0;
            ChatOutput.SendSystem(player, target == player ? "Du hast dich revived." : $"Spieler revived: {GetPlayerName(target)}");

            if (target != player)
                ChatOutput.SendSystem(target, "Du wurdest von einem Admin revived.");
        }

        private static void CmdPosition(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 1))
                return;

            if (parts.Length == 5 &&
                float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float x) &&
                float.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out float y) &&
                float.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out float z) &&
                float.TryParse(parts[4], NumberStyles.Float, CultureInfo.InvariantCulture, out float rot))
            {
                player.Position = new Vector3(x, y, z);
                player.Rotation = new Vector3(0f, 0f, rot);
                ChatOutput.SendSystem(player, "Position gesetzt.");
                return;
            }

            ChatOutput.SendSystem(player, $"Pos: {player.Position.X:F2}, {player.Position.Y:F2}, {player.Position.Z:F2} | RotZ: {player.Rotation.Z:F2}");
        }

        private static void CmdSetServerSpawn(Player player)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 10))
                return;

            SpawnPoint spawn = ServerSpawnService.SaveFromPlayer(player);
            if (spawn == null)
            {
                ChatOutput.SendSystem(player, "Server-Spawn konnte nicht gespeichert werden.");
                return;
            }

            ChatOutput.SendSystem(player, $"Server-Spawn gesetzt: {FormatSpawn(spawn)}");
        }

        private static void CmdServerSpawn(Player player)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 1))
                return;

            ChatOutput.SendSystem(player, $"Server-Spawn: {FormatSpawn(ServerSpawnService.GetSpawn())}");
        }

        private static void CmdGotoSpawn(Player player)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            ServerSpawnService.Apply(player);
            ChatOutput.SendSystem(player, "Zum Server-Spawn teleportiert.");
        }

        private static void CmdSetMoney(Player player, string[] parts, bool bank)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 3))
                return;

            if (parts.Length < 3 || !int.TryParse(parts[2], out int amount) || amount < 0)
            {
                ChatOutput.SendSystem(player, $"Nutze: /{(bank ? "setbank" : "setmoney")} [spielerId] [betrag]");
                return;
            }

            Player target = GetTargetPlayer(player, parts, $"/{(bank ? "setbank" : "setmoney")} [spielerId] [betrag]");
            if (target == null)
                return;

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            if (!SaveMoney(accountId, amount, bank))
            {
                ChatOutput.SendSystem(player, "Geld konnte nicht gespeichert werden.");
                return;
            }

            ApplyMoney(target, amount, bank);
            ChatOutput.SendSystem(player, $"{(bank ? "Bankgeld" : "Bargeld")} gesetzt: {GetPlayerName(target)} -> ${amount:N0}");
            ChatOutput.SendSystem(target, $"{(bank ? "Bankgeld" : "Bargeld")} wurde auf ${amount:N0} gesetzt.");
        }

        private static void CmdAddMoney(Player player, string[] parts, bool bank)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 3))
                return;

            if (parts.Length < 3 || !int.TryParse(parts[2], out int amount))
            {
                ChatOutput.SendSystem(player, $"Nutze: /{(bank ? "addbank" : "addmoney")} [spielerId] [betrag]");
                return;
            }

            Player target = GetTargetPlayer(player, parts, $"/{(bank ? "addbank" : "addmoney")} [spielerId] [betrag]");
            if (target == null)
                return;

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            int current = GetIntData(target, bank ? "BANK_CASH" : "CASH");
            int next = current + amount;
            if (next < 0)
                next = 0;

            if (!SaveMoney(accountId, next, bank))
            {
                ChatOutput.SendSystem(player, "Geld konnte nicht gespeichert werden.");
                return;
            }

            ApplyMoney(target, next, bank);
            ChatOutput.SendSystem(player, $"{(bank ? "Bankgeld" : "Bargeld")} geaendert: {GetPlayerName(target)} -> ${next:N0}");
            ChatOutput.SendSystem(target, $"{(bank ? "Bankgeld" : "Bargeld")} geaendert: ${next:N0}");
        }

        private static void CmdKick(Player player, string[] parts, string args)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Player target = GetTargetPlayer(player, parts, "/kick [spielerId] [grund]");
            if (target == null)
                return;

            string reason = GetReason(args, parts.Length > 1 ? parts[1] : string.Empty);
            ChatOutput.SendSystem(player, $"Spieler gekickt: {GetPlayerName(target)} | {reason}");
            target.Kick(reason);
        }

        private static void CmdBan(Player player, string[] parts, string args)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 4))
                return;

            Player target = GetTargetPlayer(player, parts, "/ban [spielerId] [grund]");
            if (target == null)
                return;

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            string reason = GetReason(args, parts.Length > 1 ? parts[1] : string.Empty);
            if (!AccountManager.SetBanState(accountId, true, reason))
            {
                ChatOutput.SendSystem(player, "Ban konnte nicht gespeichert werden.");
                return;
            }

            ChatOutput.SendSystem(player, $"Account gebannt: {GetPlayerName(target)} | {reason}");
            target.Kick($"Account gesperrt: {reason}");
        }

        private static void CmdUnban(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 4))
                return;

            if (parts.Length < 2 || !int.TryParse(parts[1], out int accountId))
            {
                ChatOutput.SendSystem(player, "Nutze: /unban [accountId]");
                return;
            }

            if (!AccountManager.SetBanState(accountId, false, null))
            {
                ChatOutput.SendSystem(player, "Account nicht gefunden oder Unban konnte nicht gespeichert werden.");
                return;
            }

            ChatOutput.SendSystem(player, $"Account entbannt: {accountId}");
        }

        private static Player GetTargetPlayer(Player player, string[] parts, string usage)
        {
            if (parts.Length < 2 || !int.TryParse(parts[1], out int playerId))
            {
                ChatOutput.SendSystem(player, $"Nutze: {usage}");
                return null;
            }

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target != null && target.Id == playerId)
                    return target;
            }

            ChatOutput.SendSystem(player, "Spieler nicht gefunden.");
            return null;
        }

        private static string GetPlayerName(Player player)
        {
            string raw = player?.Name ?? $"Spieler_{player?.Id ?? 0}";
            return raw.Replace("_", " ");
        }

        private static bool TryGetAccountId(Player player, out int accountId)
        {
            accountId = 0;
            if (player == null)
                return false;

            object value = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");
            if (value is int id && id > 0)
            {
                accountId = id;
                return true;
            }

            return false;
        }

        private static int GetIntData(Player player, string key)
        {
            object value = NAPI.Data.GetEntityData(player, key);
            return value is int number ? number : 0;
        }

        private static bool SaveMoney(int accountId, int amount, bool bank)
        {
            return bank
                ? AccountManager.SetBankCash(accountId, amount)
                : AccountManager.SetCash(accountId, amount);
        }

        private static void ApplyMoney(Player player, int amount, bool bank)
        {
            string key = bank ? "BANK_CASH" : "CASH";
            player.SetData(key, amount);
            player.SetSharedData(key, amount);
        }

        private static string FormatSpawn(SpawnPoint spawn)
        {
            return $"{spawn.X.ToString("F2", CultureInfo.InvariantCulture)}, {spawn.Y.ToString("F2", CultureInfo.InvariantCulture)}, {spawn.Z.ToString("F2", CultureInfo.InvariantCulture)} | RotZ {spawn.RotZ.ToString("F2", CultureInfo.InvariantCulture)} | Dimension {spawn.Dimension}";
        }

        private static string GetReason(string args, string firstArgument)
        {
            if (string.IsNullOrWhiteSpace(args))
                return "Kein Grund angegeben.";

            string reason = args.Trim();
            if (!string.IsNullOrWhiteSpace(firstArgument) && reason.StartsWith(firstArgument, StringComparison.Ordinal))
                reason = reason.Substring(firstArgument.Length).Trim();

            return string.IsNullOrWhiteSpace(reason) ? "Kein Grund angegeben." : reason;
        }

        private static bool IsAdminOnlyCommand(string command)
        {
            foreach (string adminCommand in AdminOnlyCommands)
            {
                if (string.Equals(adminCommand, command, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
    }
}
