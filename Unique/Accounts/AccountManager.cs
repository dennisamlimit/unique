using Unique.Accounts.Services;

namespace Unique.Accounts
{
    public static class AccountManager
    {
        private static readonly AccountService Service = new AccountService();

        public static void Load() => Service.Load();

        public static bool IsValidName(string input) => Service.IsValidName(input);

        public static bool IsValidEmail(string input) => Service.IsValidEmail(input);

        public static bool EmailExists(string email) => Service.EmailExists(email);

        public static bool SocialClubExists(string socialClubId) => Service.SocialClubExists(socialClubId);

        public static Account GetById(int accountId) => Service.GetById(accountId);

        public static Account GetByEmail(string email) => Service.GetByEmail(email);

        public static Account GetBySocialClubId(string socialClubId) => Service.GetBySocialClubId(socialClubId);

        public static Account Create(string firstName, string lastName, string email, string password, string socialClubName, string socialClubId)
            => Service.Create(firstName, lastName, email, password, socialClubName, socialClubId);

        public static bool VerifyPassword(Account account, string password) => Service.VerifyPassword(account, password);

        public static bool IsSocialClubMatch(Account account, string socialClubId) => Service.IsSocialClubMatch(account, socialClubId);

        public static void BindSocialClub(Account account, string socialClubName, string socialClubId)
            => Service.BindSocialClub(account, socialClubName, socialClubId);

        public static bool SetAdminLevel(int accountId, int adminLevel) => Service.SetAdminLevel(accountId, adminLevel);

        public static bool SetCash(int accountId, int cash) => Service.SetCash(accountId, cash);

        public static bool SetBankCash(int accountId, int bankCash) => Service.SetBankCash(accountId, bankCash);

        public static bool SetBanState(int accountId, bool isBanned, string reason) => Service.SetBanState(accountId, isBanned, reason);

        public static bool CompleteCharacter(int accountId, string firstName, string lastName, string birthDate, string origin, string customizationJson)
            => Service.CompleteCharacter(accountId, firstName, lastName, birthDate, origin, customizationJson);

        public static bool SavePosition(int accountId, float posX, float posY, float posZ, float rotZ)
            => Service.SavePosition(accountId, posX, posY, posZ, rotZ);

        public static bool SavePlayerState(int accountId, float posX, float posY, float posZ, float rotZ, uint dimension, int health, int armor, int cash, int bankCash)
            => Service.SavePlayerState(accountId, posX, posY, posZ, rotZ, dimension, health, armor, cash, bankCash);
    }
}
