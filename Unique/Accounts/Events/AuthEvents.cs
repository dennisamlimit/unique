using System.Text.Json;
using GTANetworkAPI;
using Unique.Admin.Services;
using Unique.Chat;
using Unique.World;

namespace Unique.Accounts.Events
{
    public class AuthEvents : Script
    {
        private static readonly Vector3 HiddenLoginPos = new Vector3(402.87, -997.81, -99.00);
        private static readonly Vector3 HiddenLoginRot = new Vector3(0, 0, 180f);

        public AuthEvents()
        {
            AccountManager.Load();
        }

        [ServerEvent(Event.PlayerConnected)]
        public void OnPlayerConnected(Player player)
        {
            if (player == null)
                return;

            player.Dimension = 1000u + (uint)player.Id;
            player.Position = HiddenLoginPos;
            player.Rotation = HiddenLoginRot;
            player.Transparency = 0;
            player.SetData("LOGGED_IN", false);
            player.SetData("ACCOUNT_ID", 0);
            player.SetData("ADMIN_LEVEL", 0);
            player.SetData("ADMIN_MODE", false);
            player.SetData("PENDING_SPAWN_SELECTION", false);
        }

        [RemoteEvent("server:auth:ready")]
        public void OnAuthReady(Player player)
        {
            if (player == null)
                return;

            player.TriggerEvent("client:auth:show");
        }

        [ServerEvent(Event.PlayerDisconnected)]
        public void OnPlayerDisconnected(Player player, DisconnectionType type, string reason)
        {
            SavePlayerPosition(player);
        }

        [RemoteEvent("server:auth:register")]
        public void OnRegister(Player player, string firstName, string lastName, string email, string password, string repeatPassword)
        {
            if (player == null)
                return;

            string socialClubId = NAPI.Player.GetPlayerSocialClubId(player).ToString();
            string socialClubName = NAPI.Player.GetPlayerSocialClubName(player)?.Trim();

            firstName = firstName?.Trim();
            lastName = lastName?.Trim();
            email = email?.Trim();
            password = password?.Trim();
            repeatPassword = repeatPassword?.Trim();

            if (!AccountManager.IsValidEmail(email))
            {
                player.TriggerEvent("client:auth:result", false, "E-Mail ist ungueltig.");
                return;
            }

            if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
            {
                player.TriggerEvent("client:auth:result", false, "Passwort muss mindestens 6 Zeichen haben.");
                return;
            }

            if (password != repeatPassword)
            {
                player.TriggerEvent("client:auth:result", false, "Passwoerter stimmen nicht ueberein.");
                return;
            }

            if (AccountManager.EmailExists(email))
            {
                player.TriggerEvent("client:auth:result", false, "Zu dieser E-Mail existiert bereits ein Account.");
                return;
            }

            if (AccountManager.SocialClubExists(socialClubId))
            {
                player.TriggerEvent("client:auth:result", false, "Zu diesem Social Club existiert bereits ein Account.");
                return;
            }

            var account = AccountManager.Create(firstName, lastName, email, password, socialClubName, socialClubId);
            if (account == null)
            {
                player.TriggerEvent("client:auth:result", false, "Account konnte nicht erstellt werden.");
                return;
            }

            BeginCharacterCreation(player, account);
        }

        [RemoteEvent("server:auth:login")]
        public void OnLogin(Player player, string email, string password)
        {
            if (player == null)
                return;

            string socialClubId = NAPI.Player.GetPlayerSocialClubId(player).ToString();
            string socialClubName = NAPI.Player.GetPlayerSocialClubName(player)?.Trim();

            email = email?.Trim();
            password = password?.Trim();

            if (!AccountManager.IsValidEmail(email) || string.IsNullOrWhiteSpace(password))
            {
                player.TriggerEvent("client:auth:result", false, "Bitte gueltige Login-Daten eingeben.");
                return;
            }

            var account = AccountManager.GetByEmail(email);
            if (account == null || !AccountManager.VerifyPassword(account, password))
            {
                player.TriggerEvent("client:auth:result", false, "Falsche E-Mail oder falsches Passwort.");
                return;
            }

            if (account.IsBanned)
            {
                if (IsBanExpired(account))
                {
                    AccountManager.SetBanState(account.AccountId, false, null);
                    account = AccountManager.GetById(account.AccountId);
                }
                else
                {
                    player.SetData("BANNED_SCREEN_ACTIVE", true);
                    player.TriggerEvent("client:auth:banned", BuildBanPayload(account));
                    return;
                }
            }

            if (account == null)
            {
                player.TriggerEvent("client:auth:result", false, "Account wurde nicht gefunden.");
                return;
            }

            if (!AccountManager.IsSocialClubMatch(account, socialClubId))
            {
                player.TriggerEvent("client:auth:result", false, "Dieser Account ist an einen anderen Social Club gebunden.");
                return;
            }

            if (string.IsNullOrWhiteSpace(account.SocialClubId) && !string.IsNullOrWhiteSpace(socialClubId))
                AccountManager.BindSocialClub(account, socialClubName, socialClubId);

            if (!account.CharacterCreated)
            {
                BeginCharacterCreation(player, account);
                return;
            }

            FinishLogin(player, account, false);
        }

        [RemoteEvent("server:character:create")]
        public void OnCreateCharacter(Player player, string characterJson)
        {
            if (player == null || string.IsNullOrWhiteSpace(characterJson))
                return;

            object accountIdValue = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");
            if (!(accountIdValue is int accountId) || accountId <= 0)
            {
                player.TriggerEvent("client:creator:result", false, "Account wurde nicht gefunden.");
                return;
            }

            string firstName;
            string lastName;
            string birthDate;
            string origin;

            try
            {
                using JsonDocument document = JsonDocument.Parse(characterJson);
                JsonElement root = document.RootElement;
                firstName = root.GetProperty("firstname").GetString()?.Trim();
                lastName = root.GetProperty("lastname").GetString()?.Trim();
                birthDate = root.TryGetProperty("birth", out JsonElement birth) ? birth.GetString()?.Trim() : null;
                origin = root.TryGetProperty("origin", out JsonElement originValue) ? originValue.GetString()?.Trim() : null;
            }
            catch
            {
                player.TriggerEvent("client:creator:result", false, "Charakterdaten sind ungueltig.");
                return;
            }

            if (!AccountManager.CompleteCharacter(accountId, firstName, lastName, birthDate, origin, characterJson))
            {
                player.TriggerEvent("client:creator:result", false, "Charakter konnte nicht gespeichert werden.");
                return;
            }

            Account account = AccountManager.GetById(accountId);
            if (account == null)
            {
                player.TriggerEvent("client:creator:result", false, "Account wurde nicht gefunden.");
                return;
            }

            FinishLogin(player, account, true);
        }

        [RemoteEvent("server:spawn:select")]
        public void OnSpawnSelect(Player player, string spawnType)
        {
            if (player == null)
                return;

            object pendingSpawnValue = NAPI.Data.GetEntityData(player, "PENDING_SPAWN_SELECTION");
            if (!(pendingSpawnValue is bool pendingSpawn) || !pendingSpawn)
                return;

            object accountIdValue = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");
            if (!(accountIdValue is int accountId) || accountId <= 0)
                return;

            Account account = AccountManager.GetById(accountId);
            if (account == null)
            {
                player.TriggerEvent("client:spawn:result", false, "Account wurde nicht gefunden.");
                return;
            }

            if (string.Equals(spawnType, "hotel", System.StringComparison.OrdinalIgnoreCase))
            {
                ServerSpawnService.Apply(player);
            }
            else
            {
                player.Dimension = account.Dimension;
                player.Position = new Vector3(account.PosX, account.PosY, account.PosZ);
                player.Rotation = new Vector3(0, 0, account.RotZ);
            }

            player.Health = account.Health <= 0 ? 100 : account.Health;
            player.Armor = account.Armor;
            player.Transparency = 255;
            player.SetData("PENDING_SPAWN_SELECTION", false);

            player.TriggerEvent("client:spawn:hide");
            player.TriggerEvent("client:spawn:resolveGround");
            player.TriggerEvent("client:chat:authState", true);
            player.TriggerEvent("client:hud:authState", true);

            ChatOutput.SendSystem(player, string.Equals(spawnType, "hotel", System.StringComparison.OrdinalIgnoreCase)
                ? "Du bist am Hotel gespawnt."
                : "Du bist an deinem letzten Standort gespawnt.");
        }

        [RemoteEvent("server:auth:banDisconnect")]
        public void OnBanDisconnect(Player player)
        {
            if (player == null)
                return;

            object bannedValue = NAPI.Data.GetEntityData(player, "BANNED_SCREEN_ACTIVE");
            if (bannedValue is bool banned && banned)
                player.Kick("Account gesperrt.");
        }

        private void BeginCharacterCreation(Player player, Account account)
        {
            player.SetData("ACCOUNT_ID", account.AccountId);
            player.SetData("PENDING_CHARACTER_CREATION", true);
            player.Dimension = 2000u + (uint)player.Id;
            ServerSpawnService.Apply(player);
            player.Dimension = 2000u + (uint)player.Id;
            player.Transparency = 255;
            player.Health = 100;
            player.Armor = 0;
            player.TriggerEvent("client:auth:showCreator");
            player.TriggerEvent("client:auth:result", true, "Account erstellt. Erstelle jetzt deinen Charakter.");
        }

        private void FinishLogin(Player player, Account account, bool created)
        {
            player.Name = account.CharacterNameUnderscore;
            player.SetSharedData("DISPLAY_NAME", account.DisplayName);
            player.SetSharedData("ACCOUNT_ID", account.AccountId);
            player.SetSharedData("CHARACTER_NAME", account.CharacterNameUnderscore);
            player.SetSharedData("ADMIN_LEVEL", account.AdminLevel);
            player.SetSharedData("CASH", account.Cash);
            player.SetSharedData("BANK_CASH", account.BankCash);
            player.SetSharedData("HEALTH", account.Health);
            player.SetSharedData("ARMOR", account.Armor);
            player.SetSharedData("SOCIAL_CLUB_ID", account.SocialClubId ?? string.Empty);
            player.SetSharedData("SOCIAL_CLUB_NAME", account.SocialClubName ?? string.Empty);

            player.SetData("LOGGED_IN", true);
            player.SetData("ACCOUNT_ID", account.AccountId);
            player.SetData("ADMIN_LEVEL", account.AdminLevel);
            player.SetData("ADMIN_MODE", false);
            player.SetData("CASH", account.Cash);
            player.SetData("BANK_CASH", account.BankCash);
            player.SetData("PENDING_CHARACTER_CREATION", false);
            player.SetData("PENDING_SPAWN_SELECTION", true);

            player.Dimension = 3000u + (uint)player.Id;
            player.Position = HiddenLoginPos;
            player.Rotation = HiddenLoginRot;
            player.Health = account.Health <= 0 ? 100 : account.Health;
            player.Armor = account.Armor;
            player.Transparency = 0;

            if (!string.IsNullOrWhiteSpace(account.CustomizationJson))
                player.TriggerEvent("client:creator:apply", account.CustomizationJson);

            string socialClubInfo = string.IsNullOrWhiteSpace(account.SocialClubName)
                ? "Kein Social Club gespeichert."
                : $"Social Club: {account.SocialClubName} ({account.SocialClubId})";

            string msg = created
                ? $"Account erstellt. Deine Account-ID ist {account.AccountId}. {socialClubInfo}"
                : $"Erfolgreich eingeloggt. Deine Account-ID ist {account.AccountId}. {socialClubInfo}";

            player.TriggerEvent("client:spawn:show", msg);
            AdminAuthorizationService.RefreshPlayerAdminData(player, account);
        }

        private void SavePlayerPosition(Player player)
        {
            if (player == null)
                return;

            object loggedInValue = NAPI.Data.GetEntityData(player, "LOGGED_IN");
            if (!(loggedInValue is bool loggedIn) || !loggedIn)
                return;

            object pendingSpawnValue = NAPI.Data.GetEntityData(player, "PENDING_SPAWN_SELECTION");
            if (pendingSpawnValue is bool pendingSpawn && pendingSpawn)
                return;

            object adminJailedValue = NAPI.Data.GetEntityData(player, "ADMIN_JAILED");
            if (adminJailedValue is bool adminJailed && adminJailed)
                return;

            object accountIdValue = NAPI.Data.GetEntityData(player, "ACCOUNT_ID");
            if (!(accountIdValue is int accountId) || accountId <= 0)
                return;

            Vector3 position = player.Position;
            float rotZ = player.Rotation.Z;
            int cash = GetIntData(player, "CASH");
            int bankCash = GetIntData(player, "BANK_CASH");
            AccountManager.SavePlayerState(accountId, position.X, position.Y, position.Z, rotZ, player.Dimension, player.Health, player.Armor, cash, bankCash);
        }

        private static int GetIntData(Player player, string key)
        {
            object value = NAPI.Data.GetEntityData(player, key);
            return value is int number ? number : 0;
        }

        private static bool IsBanExpired(Account account)
        {
            if (account == null || string.IsNullOrWhiteSpace(account.BanExpiresAt))
                return false;

            if (!System.DateTime.TryParse(account.BanExpiresAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out System.DateTime expiresAt))
                return false;

            return expiresAt <= System.DateTime.UtcNow;
        }

        private static string BuildBanPayload(Account account)
        {
            if (account == null)
                return "{}";

            string payload =
                "{" +
                $"\"reason\":\"{EscapeJson(account.BanReason ?? "Kein Grund angegeben.")}\"," +
                $"\"banDate\":\"{EscapeJson(account.BanDate ?? System.DateTime.UtcNow.ToString("o"))}\"," +
                $"\"expiresAt\":\"{EscapeJson(account.BanExpiresAt ?? string.Empty)}\"," +
                $"\"admin\":\"{EscapeJson(account.BanAdminName ?? "Unbekannt")}\"," +
                $"\"accountName\":\"{EscapeJson(account.DisplayName)}\"," +
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
    }
}
