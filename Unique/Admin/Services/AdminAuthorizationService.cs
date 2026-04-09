using GTANetworkAPI;
using Unique.Accounts;
using Unique.Chat;

namespace Unique.Admin.Services
{
    public static class AdminAuthorizationService
    {
        public const int MaxAdminLevel = 10;
        private const string AdminModeKey = "ADMIN_MODE";

        public static bool EnsureLevel(Player player, int requiredLevel, bool requireAdminMode = true)
        {
            if (player == null)
                return false;

            if (!IsLoggedIn(player))
            {
                ChatOutput.SendSystem(player, "Du musst eingeloggt sein.");
                return false;
            }

            if (requiredLevel < 1 || requiredLevel > MaxAdminLevel)
            {
                ChatOutput.SendSystem(player, "Ungueltiges Admin-Level fuer diesen Command.");
                return false;
            }

            int currentLevel = GetPlayerAdminLevel(player);
            if (currentLevel < requiredLevel)
            {
                ChatOutput.SendSystem(player, $"Du benoetigst Admin-Level {requiredLevel}. Dein Level: {currentLevel}.");
                return false;
            }

            if (!requireAdminMode)
                return true;

            if (IsAdminMode(player))
                return true;

            ChatOutput.SendSystem(player, "Aktiviere zuerst deinen Admin-Modus mit /admin.");
            return false;
        }

        public static int GetPlayerAdminLevel(Player player)
        {
            if (player == null)
                return 0;

            object value = NAPI.Data.GetEntityData(player, "ADMIN_LEVEL");
            return value is int level ? level : 0;
        }

        public static bool HasAnyAdminLevel(Player player)
        {
            return GetPlayerAdminLevel(player) > 0;
        }

        public static void RefreshPlayerAdminData(Player player, Account account)
        {
            if (player == null || account == null)
                return;

            player.SetData("ADMIN_LEVEL", account.AdminLevel);
            player.SetSharedData("ADMIN_LEVEL", account.AdminLevel);
            player.SetData(AdminModeKey, false);
            player.SetSharedData("ADMIN_MODE", false);
        }

        public static bool TrySetAdminLevel(Player source, int accountId, int newLevel)
        {
            if (!EnsureLevel(source, MaxAdminLevel))
                return false;

            if (newLevel < 0 || newLevel > MaxAdminLevel)
            {
                ChatOutput.SendSystem(source, $"Admin-Level muss zwischen 0 und {MaxAdminLevel} liegen.");
                return false;
            }

            if (!AccountManager.SetAdminLevel(accountId, newLevel))
            {
                ChatOutput.SendSystem(source, "Account nicht gefunden oder Admin-Level konnte nicht gespeichert werden.");
                return false;
            }

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null)
                    continue;

                object accountIdValue = NAPI.Data.GetEntityData(target, "ACCOUNT_ID");
                if (accountIdValue is int onlineAccountId && onlineAccountId == accountId)
                {
                    var account = AccountManager.GetById(accountId);
                    RefreshPlayerAdminData(target, account);
                    ChatOutput.SendSystem(target, $"Dein Admin-Level wurde auf {newLevel} gesetzt.");
                }
            }

            return true;
        }

        public static bool ToggleAdminMode(Player player)
        {
            if (player == null)
                return false;

            if (!IsLoggedIn(player))
            {
                ChatOutput.SendSystem(player, "Du musst eingeloggt sein.");
                return false;
            }

            if (GetPlayerAdminLevel(player) <= 0)
            {
                ChatOutput.SendSystem(player, "Du besitzt keine Admin-Rechte.");
                return false;
            }

            bool nextValue = !IsAdminMode(player);
            player.SetData(AdminModeKey, nextValue);
            player.SetSharedData("ADMIN_MODE", nextValue);

            string stateText = nextValue ? "Admin-Modus aktiviert." : "Admin-Modus deaktiviert.";
            ChatOutput.SendSystem(player, stateText);
            return nextValue;
        }

        public static bool IsAdminMode(Player player)
        {
            if (player == null)
                return false;

            object value = NAPI.Data.GetEntityData(player, AdminModeKey);
            return value is bool enabled && enabled;
        }

        public static void DisableAdminMode(Player player)
        {
            if (player == null)
                return;

            player.SetData(AdminModeKey, false);
            player.SetSharedData("ADMIN_MODE", false);
        }

        private static bool IsLoggedIn(Player player)
        {
            object value = NAPI.Data.GetEntityData(player, "LOGGED_IN");
            return value is bool loggedIn && loggedIn;
        }
    }
}
