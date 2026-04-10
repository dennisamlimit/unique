using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
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
        private static readonly Dictionary<int, CancellationTokenSource> JailTimers = new Dictionary<int, CancellationTokenSource>();
        private static readonly object JailTimersSync = new object();

        private static readonly Vector3 AdminJailPosition = new Vector3(1691.14f, 2565.66f, 45.56f);
        private static readonly Vector3 AdminJailRotation = new Vector3(0f, 0f, 180f);
        private static readonly Vector3 AdminJailReleasePosition = new Vector3(1846.64f, 2585.86f, 45.67f);
        private static readonly Vector3 AdminJailReleaseRotation = new Vector3(0f, 0f, 90f);
        private const uint AdminJailDimension = 1;

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
            "dl",
            "setmoney",
            "addmoney",
            "setbank",
            "addbank",
            "kick",
            "ban",
            "unban",
            "jail",
            "unjail"
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

                case "dl":
                    CmdDl(player);
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

                case "jail":
                    CmdJail(player, parts, args);
                    return true;

                case "unjail":
                    CmdUnjail(player, parts);
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

        private static void CmdDl(Player player)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            player.TriggerEvent("client:dl:toggle");
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

            Player target = GetTargetPlayer(player, parts, "/ban [spielerId] [dauer optional: 30m/2h/7d] [grund]");
            if (target == null)
                return;

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            string reason = GetBanReason(args, parts, out DateTime? expiresAtUtc);
            string adminName = GetPlayerName(player);
            int adminAccountId = TryGetAccountId(player, out int sourceAccountId) ? sourceAccountId : 0;
            if (!AccountManager.SetBanState(accountId, true, reason, adminName, adminAccountId, expiresAtUtc))
            {
                ChatOutput.SendSystem(player, "Ban konnte nicht gespeichert werden.");
                return;
            }

            Account bannedAccount = AccountManager.GetById(accountId);
            BroadcastBanMessages(player, target, bannedAccount, reason, expiresAtUtc);
            target.SetData("BANNED_SCREEN_ACTIVE", true);
            target.TriggerEvent("client:auth:banned", BuildBanPayload(bannedAccount));
        }

        private static void CmdUnban(Player player, string[] parts)
        {
            if (parts.Length < 2 || !int.TryParse(parts[1], out int accountId))
            {
                ChatOutput.SendSystem(player, "Nutze: /unban [accountId]");
                return;
            }

            Account account = AccountManager.GetById(accountId);
            if (account == null)
            {
                ChatOutput.SendSystem(player, "Account nicht gefunden.");
                return;
            }

            if (!account.IsBanned)
            {
                ChatOutput.SendSystem(player, "Dieser Account ist nicht gebannt.");
                return;
            }

            bool permanentBan = string.IsNullOrWhiteSpace(account.BanExpiresAt);
            int requiredLevel = permanentBan ? 7 : 4;
            if (!AdminAuthorizationService.EnsureLevel(player, requiredLevel))
                return;

            if (!AccountManager.SetBanState(accountId, false, null))
            {
                ChatOutput.SendSystem(player, "Account nicht gefunden oder Unban konnte nicht gespeichert werden.");
                return;
            }

            BroadcastUnbanMessage(player, account, permanentBan);
        }

        private static void CmdJail(Player player, string[] parts, string args)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Player target = GetTargetPlayer(player, parts, "/jail [spielerId] [dauer: 30s/10m/1h] [grund]");
            if (target == null)
                return;

            if (parts.Length < 3 || !TryParseDuration(parts[2], out TimeSpan duration))
            {
                ChatOutput.SendSystem(player, "Nutze: /jail [spielerId] [dauer: 30s/10m/1h] [grund]");
                return;
            }

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            string reason = GetTimedReason(args, parts);
            string adminName = GetPlayerName(player);
            DateTime releaseAtUtc = DateTime.UtcNow.Add(duration);

            target.SetData("ADMIN_JAILED", true);
            target.SetData("ADMIN_JAIL_RELEASE_AT", releaseAtUtc.ToString("o"));
            target.Dimension = AdminJailDimension;
            target.Position = AdminJailPosition;
            target.Rotation = AdminJailRotation;
            target.TriggerEvent("client:adminJail:show", BuildJailPayload(adminName, reason, releaseAtUtc));

            StartJailTimer(accountId, duration);

            string targetName = GetPlayerName(target);
            foreach (Player onlinePlayer in NAPI.Pools.GetAllPlayers())
            {
                if (onlinePlayer == null)
                    continue;

                if (AdminAuthorizationService.HasAnyAdminLevel(onlinePlayer))
                    ChatOutput.SendAdmin(onlinePlayer, "Admin", $"{adminName} hat {targetName} fuer {FormatDuration(duration)} ins Admin-Jail gesetzt. Grund: {reason}");
                else
                    ChatOutput.SendSystem(onlinePlayer, $"Administrator {adminName} hat {targetName} ins Admin-Jail gesetzt. Grund: {reason}");
            }
        }

        private static void CmdUnjail(Player player, string[] parts)
        {
            if (!AdminAuthorizationService.EnsureLevel(player, 2))
                return;

            Player target = GetTargetPlayer(player, parts, "/unjail [spielerId]");
            if (target == null)
                return;

            if (!TryGetAccountId(target, out int accountId))
            {
                ChatOutput.SendSystem(player, "Zielspieler ist nicht eingeloggt.");
                return;
            }

            CancelJailTimer(accountId);
            ReleaseJailedPlayer(target, "Du wurdest aus dem Admin-Jail entlassen.");
            ChatOutput.SendSystem(player, $"Spieler aus Admin-Jail entlassen: {GetPlayerName(target)}");
        }

        private static Player GetTargetPlayer(Player player, string[] parts, string usage)
        {
            if (parts.Length < 2 || !int.TryParse(parts[1], out int targetId))
            {
                ChatOutput.SendSystem(player, $"Nutze: {usage}");
                return null;
            }

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target != null && target.Id == targetId)
                    return target;
            }

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target != null && target.Id + 1 == targetId)
                    return target;
            }

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null)
                    continue;

                object accountIdValue = NAPI.Data.GetEntityData(target, "ACCOUNT_ID");
                if (accountIdValue is int accountId && accountId == targetId)
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

        private static string GetBanReason(string args, string[] parts, out DateTime? expiresAtUtc)
        {
            expiresAtUtc = null;
            string reason = GetReason(args, parts.Length > 1 ? parts[1] : string.Empty);

            if (parts.Length < 3)
                return reason;

            if (!TryParseBanDuration(parts[2], out TimeSpan duration))
                return reason;

            expiresAtUtc = DateTime.UtcNow.Add(duration);
            if (reason.StartsWith(parts[2], StringComparison.OrdinalIgnoreCase))
                reason = reason.Substring(parts[2].Length).Trim();

            return string.IsNullOrWhiteSpace(reason) ? "Kein Grund angegeben." : reason;
        }

        private static bool TryParseBanDuration(string input, out TimeSpan duration)
        {
            duration = TimeSpan.Zero;
            if (string.IsNullOrWhiteSpace(input) || input.Length < 2)
                return false;

            char unit = char.ToLowerInvariant(input[input.Length - 1]);
            string numberText = input.Substring(0, input.Length - 1);
            if (!int.TryParse(numberText, out int amount) || amount <= 0)
                return false;

            switch (unit)
            {
                case 'm':
                    duration = TimeSpan.FromMinutes(amount);
                    return true;

                case 'h':
                    duration = TimeSpan.FromHours(amount);
                    return true;

                case 'd':
                    duration = TimeSpan.FromDays(amount);
                    return true;

                default:
                    return false;
            }
        }

        private static bool TryParseDuration(string input, out TimeSpan duration)
        {
            duration = TimeSpan.Zero;
            if (string.IsNullOrWhiteSpace(input) || input.Length < 2)
                return false;

            char unit = char.ToLowerInvariant(input[input.Length - 1]);
            string numberText = input.Substring(0, input.Length - 1);
            if (!int.TryParse(numberText, out int amount) || amount <= 0)
                return false;

            switch (unit)
            {
                case 's':
                    duration = TimeSpan.FromSeconds(amount);
                    return true;

                case 'm':
                    duration = TimeSpan.FromMinutes(amount);
                    return true;

                case 'h':
                    duration = TimeSpan.FromHours(amount);
                    return true;

                case 'd':
                    duration = TimeSpan.FromDays(amount);
                    return true;

                default:
                    return false;
            }
        }

        private static string GetTimedReason(string args, string[] parts)
        {
            string reason = GetReason(args, parts.Length > 1 ? parts[1] : string.Empty);
            if (parts.Length > 2 && reason.StartsWith(parts[2], StringComparison.OrdinalIgnoreCase))
                reason = reason.Substring(parts[2].Length).Trim();

            return string.IsNullOrWhiteSpace(reason) ? "Kein Grund angegeben." : reason;
        }

        private static string FormatDuration(TimeSpan duration)
        {
            if (duration.TotalDays >= 1)
                return $"{Math.Ceiling(duration.TotalDays)} Tag(e)";

            if (duration.TotalHours >= 1)
                return $"{Math.Ceiling(duration.TotalHours)} Stunde(n)";

            if (duration.TotalMinutes >= 1)
                return $"{Math.Ceiling(duration.TotalMinutes)} Minute(n)";

            return $"{Math.Max(1, Math.Ceiling(duration.TotalSeconds))} Sekunde(n)";
        }

        private static void StartJailTimer(int accountId, TimeSpan duration)
        {
            CancellationTokenSource cancellation = new CancellationTokenSource();
            lock (JailTimersSync)
            {
                if (JailTimers.TryGetValue(accountId, out CancellationTokenSource existing))
                    existing.Cancel();

                JailTimers[accountId] = cancellation;
            }

            Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(duration, cancellation.Token);
                }
                catch (TaskCanceledException)
                {
                    return;
                }

                NAPI.Task.Run(() =>
                {
                    Player target = FindPlayerByAccountId(accountId);
                    if (target != null)
                        ReleaseJailedPlayer(target, "Deine Admin-Jail-Zeit ist abgelaufen.");

                    CancelJailTimer(accountId);
                });
            });
        }

        private static void CancelJailTimer(int accountId)
        {
            lock (JailTimersSync)
            {
                if (!JailTimers.TryGetValue(accountId, out CancellationTokenSource cancellation))
                    return;

                cancellation.Cancel();
                cancellation.Dispose();
                JailTimers.Remove(accountId);
            }
        }

        private static Player FindPlayerByAccountId(int accountId)
        {
            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null)
                    continue;

                object accountIdValue = NAPI.Data.GetEntityData(target, "ACCOUNT_ID");
                if (accountIdValue is int onlineAccountId && onlineAccountId == accountId)
                    return target;
            }

            return null;
        }

        private static void ReleaseJailedPlayer(Player target, string message)
        {
            target.SetData("ADMIN_JAILED", false);
            target.SetData("ADMIN_JAIL_RELEASE_AT", string.Empty);
            target.Dimension = 0;
            target.Position = AdminJailReleasePosition;
            target.Rotation = AdminJailReleaseRotation;
            target.TriggerEvent("client:adminJail:hide", message);
            ChatOutput.SendSystem(target, message);
        }

        private static string BuildJailPayload(string adminName, string reason, DateTime releaseAtUtc)
        {
            return "{" +
                $"\"admin\":\"{EscapeJson(adminName)}\"," +
                $"\"reason\":\"{EscapeJson(reason)}\"," +
                $"\"releaseAt\":\"{EscapeJson(releaseAtUtc.ToString("o"))}\"" +
                "}";
        }

        private static void BroadcastBanMessages(Player admin, Player target, Account bannedAccount, string reason, DateTime? expiresAtUtc)
        {
            string adminName = GetPlayerName(admin);
            string targetName = bannedAccount?.DisplayName ?? GetPlayerName(target);
            string publicMessage = expiresAtUtc.HasValue
                ? $"Administrator {adminName} hat {targetName} gebannt. Grund: {reason}"
                : $"Administrator {adminName} hat {targetName} permanent gebannt. Grund: {reason}";

            string adminMessage = expiresAtUtc.HasValue
                ? $"{adminName} hat {targetName} gebannt. Dauer: {FormatDurationUntil(expiresAtUtc.Value)} | Ablauf: {FormatDateTime(expiresAtUtc.Value)} | Grund: {reason}"
                : $"{adminName} hat {targetName} permanent gebannt. Grund: {reason}";

            foreach (Player onlinePlayer in NAPI.Pools.GetAllPlayers())
            {
                if (onlinePlayer == null)
                    continue;

                if (AdminAuthorizationService.HasAnyAdminLevel(onlinePlayer))
                    ChatOutput.SendAdmin(onlinePlayer, "Admin", adminMessage);
                else
                    ChatOutput.SendSystem(onlinePlayer, publicMessage);
            }
        }

        private static void BroadcastUnbanMessage(Player admin, Account account, bool wasPermanentBan)
        {
            string adminName = GetPlayerName(admin);
            string banType = wasPermanentBan ? "permanenten Ban" : "temporaeren Ban";
            string message = $"{adminName} hat den {banType} von {account.DisplayName} (Account {account.AccountId}) aufgehoben.";

            foreach (Player onlinePlayer in NAPI.Pools.GetAllPlayers())
            {
                if (onlinePlayer != null && AdminAuthorizationService.HasAnyAdminLevel(onlinePlayer))
                    ChatOutput.SendAdmin(onlinePlayer, "Admin", message);
            }
        }

        private static string FormatDurationUntil(DateTime expiresAtUtc)
        {
            TimeSpan duration = expiresAtUtc - DateTime.UtcNow;
            if (duration.TotalSeconds < 0)
                duration = TimeSpan.Zero;

            if (duration.TotalDays >= 1)
                return $"{Math.Ceiling(duration.TotalDays)} Tag(e)";

            if (duration.TotalHours >= 1)
                return $"{Math.Ceiling(duration.TotalHours)} Stunde(n)";

            return $"{Math.Max(1, Math.Ceiling(duration.TotalMinutes))} Minute(n)";
        }

        private static string FormatDateTime(DateTime utcDateTime)
        {
            return utcDateTime.ToLocalTime().ToString("dd.MM.yyyy HH:mm", CultureInfo.InvariantCulture);
        }

        private static string BuildBanPayload(Account account)
        {
            if (account == null)
                return "{}";

            string accountName = account.DisplayName;
            string reason = account.BanReason ?? "Kein Grund angegeben.";
            string banDate = account.BanDate ?? DateTime.UtcNow.ToString("o");
            string expiresAt = account.BanExpiresAt ?? string.Empty;
            string adminName = account.BanAdminName ?? "Unbekannt";
            string payload =
                "{" +
                $"\"reason\":\"{EscapeJson(reason)}\"," +
                $"\"banDate\":\"{EscapeJson(banDate)}\"," +
                $"\"expiresAt\":\"{EscapeJson(expiresAt)}\"," +
                $"\"admin\":\"{EscapeJson(adminName)}\"," +
                $"\"accountName\":\"{EscapeJson(accountName)}\"," +
                $"\"accountId\":{account.AccountId}" +
                "}";

            return payload;
        }

        private static string EscapeJson(string value)
        {
            return (value ?? string.Empty)
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n");
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
