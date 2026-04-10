using GTANetworkAPI;
using Unique.Admin.Commands;
using Unique.Vehicles;

namespace Unique.Chat.Events
{
    public class ChatEvents : Script
    {
        private const float LocalChatRange = 20.0f;
        private static readonly System.Random Random = new System.Random();
        private static readonly VehicleSpawnService VehicleSpawnService = new VehicleSpawnService();

        [RemoteEvent("server:chat:send")]
        public void OnPlayerChat(Player player, string mode, string text)
        {
            if (player == null || string.IsNullOrWhiteSpace(text))
                return;

            object loggedInValue = NAPI.Data.GetEntityData(player, "LOGGED_IN");
            if (!(loggedInValue is bool loggedIn) || !loggedIn)
                return;

            object pendingSpawnValue = NAPI.Data.GetEntityData(player, "PENDING_SPAWN_SELECTION");
            if (pendingSpawnValue is bool pendingSpawn && pendingSpawn)
                return;

            text = text.Trim();
            mode = mode?.Trim().ToLower() ?? "ic";

            if (text.StartsWith("/"))
            {
                HandleSlashCommand(player, text);
                return;
            }

            switch (mode)
            {
                case "ooc":
                    SendRange(player, "ooc", GetChatName(player), text, LocalChatRange);
                    break;

                case "me":
                    SendRange(player, "me", GetChatName(player), text, LocalChatRange);
                    break;

                case "do":
                    SendRange(player, "do", GetChatName(player), text, LocalChatRange);
                    break;

                case "try":
                    SendRange(player, "try", GetChatName(player), BuildTryText(text), LocalChatRange);
                    break;

                default:
                    SendRange(player, "ic", GetChatName(player), text, LocalChatRange);
                    break;
            }
        }

        private void HandleSlashCommand(Player player, string text)
        {
            string[] parts = text.Substring(1).Split(' ', System.StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
                return;

            string cmd = parts[0].ToLower();
            string args = parts.Length > 1
                ? string.Join(" ", parts, 1, parts.Length - 1)
                : string.Empty;

            switch (cmd)
            {
                case "admin":
                case "myadmin":
                case "veh":
                case "msg":
                case "setadmin":
                case "findaccountsc":
                case "goto":
                case "gethere":
                case "aheal":
                case "revive":
                case "apos":
                case "setserverspawn":
                case "serverspawn":
                case "gotospawn":
                case "dl":
                case "setmoney":
                case "addmoney":
                case "setbank":
                case "addbank":
                case "kick":
                case "ban":
                case "unban":
                case "jail":
                case "unjail":
                    if (AdminCommands.TryHandleChatCommand(player, cmd, parts, args))
                        return;
                    break;

                case "b":
                    if (string.IsNullOrWhiteSpace(args))
                    {
                        SendSystem(player, "Nutze: /b [text]");
                        return;
                    }

                    SendRange(player, "ooc", GetChatName(player), args, LocalChatRange);
                    return;

                case "me":
                    if (string.IsNullOrWhiteSpace(args))
                    {
                        SendSystem(player, "Nutze: /me [aktion]");
                        return;
                    }

                    SendRange(player, "me", GetChatName(player), args, LocalChatRange);
                    return;

                case "do":
                    if (string.IsNullOrWhiteSpace(args))
                    {
                        SendSystem(player, "Nutze: /do [beschreibung]");
                        return;
                    }

                    SendRange(player, "do", GetChatName(player), args, LocalChatRange);
                    return;

                case "try":
                    if (string.IsNullOrWhiteSpace(args))
                    {
                        SendSystem(player, "Nutze: /try [aktion]");
                        return;
                    }

                    SendRange(player, "try", GetChatName(player), BuildTryText(args), LocalChatRange);
                    return;

                case "id":
                    object accountIdValue = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");
                    int accountId = accountIdValue is int id && id > 0 ? id : 0;
                    SendSystem(player, $"Deine Spieler-ID ist {player.Id + 1}. Server-ID: {player.Id}. Account-ID: {accountId}.");
                    return;

                default:
                    SendSystem(player, $"Unbekannter Befehl: /{cmd}");
                    return;
            }
        }

        private void HandleVehCommand(Player player, string args)
        {
            if (string.IsNullOrWhiteSpace(args))
            {
                SendSystem(player, "Nutze: /veh [modell]");
                return;
            }

            var vehicle = VehicleSpawnService.CreateForPlayer(player, args);

            if (vehicle == null)
            {
                SendSystem(player, "Ungueltiges Fahrzeugmodell oder Fahrzeug konnte nicht erstellt werden.");
                return;
            }

            NAPI.Player.SetPlayerIntoVehicle(player, vehicle, -1);
            SendSystem(player, $"Fahrzeug gespawnt: {args}");
        }

        private void SendRange(Player source, string type, string sender, string message, float range)
        {
            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null)
                    continue;

                if (target.Dimension != source.Dimension)
                    continue;

                if (source.Position.DistanceTo(target.Position) <= range)
                    target.TriggerEvent("client:chat:addMessage", type, sender, message);
            }
        }

        private void SendSystem(Player player, string message)
        {
            player.TriggerEvent("client:chat:addMessage", "system", string.Empty, message);
        }

        private string GetChatName(Player player)
        {
            string raw = player.Name ?? $"Spieler_{player.Id}";
            string name = raw.Replace("_", " ");
            object accountIdValue = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");

            if (accountIdValue is int accountId && accountId > 0)
                return $"{name}[{accountId}]";

            return $"{name}[{player.Id + 1}]";
        }

        private string BuildTryText(string text)
        {
            bool success = Random.Next(0, 2) == 0;
            string suffix = success ? "(Erfolg)" : "(Fehlschlag)";
            return $"{text} {suffix}";
        }
    }
}
