using Unique.Accounts.Repositories;
using Unique.World;

namespace Unique.Accounts.Services
{
    public sealed class AccountService
    {
        private readonly AccountRepository repository = new AccountRepository();
        private readonly PasswordService passwordService = new PasswordService();
        private readonly AccountValidationService validationService = new AccountValidationService();

        public void Load()
        {
            repository.Load();
        }

        public bool IsValidName(string input) => validationService.IsValidName(input);

        public bool IsValidEmail(string input) => validationService.IsValidEmail(input);

        public bool EmailExists(string email) => repository.EmailExists(email);

        public bool SocialClubExists(string socialClubId) => repository.SocialClubExists(socialClubId);

        public Account GetById(int accountId) => repository.GetById(accountId);

        public Account GetByEmail(string email) => repository.GetByEmail(email);

        public Account GetBySocialClubId(string socialClubId) => repository.GetBySocialClubId(socialClubId);

        public bool VerifyPassword(Account account, string password) => passwordService.VerifyPassword(account, password);

        public Account Create(string firstName, string lastName, string email, string password, string socialClubName, string socialClubId)
        {
            if (repository.EmailExists(email))
                return null;

            if (repository.SocialClubExists(socialClubId))
                return null;

            string salt = passwordService.CreateSalt();
            string hash = passwordService.HashPassword(password, salt);

            SpawnPoint spawn = ServerSpawnService.GetSpawn();

            var account = new Account
            {
                FirstName = string.IsNullOrWhiteSpace(firstName) ? "Charakter" : NormalizeName(firstName),
                LastName = string.IsNullOrWhiteSpace(lastName) ? "Erstellen" : NormalizeName(lastName),
                Email = email.Trim(),
                SocialClubName = NormalizeOptional(socialClubName),
                SocialClubId = NormalizeOptional(socialClubId),
                PasswordSalt = salt,
                PasswordHash = hash,
                CharacterCreated = false,
                AdminLevel = 0,
                Health = 100,
                Armor = 0,
                Dimension = spawn.Dimension,
                PosX = spawn.X,
                PosY = spawn.Y,
                PosZ = spawn.Z,
                RotZ = spawn.RotZ
            };

            repository.Add(account);
            return account;
        }

        public bool IsSocialClubMatch(Account account, string socialClubId)
        {
            if (account == null)
                return false;

            if (string.IsNullOrWhiteSpace(account.SocialClubId))
                return true;

            return string.Equals(account.SocialClubId, socialClubId?.Trim(), System.StringComparison.OrdinalIgnoreCase);
        }

        public void BindSocialClub(Account account, string socialClubName, string socialClubId)
        {
            if (account == null || string.IsNullOrWhiteSpace(socialClubId))
                return;

            account.SocialClubId = socialClubId.Trim();
            account.SocialClubName = NormalizeOptional(socialClubName);
            repository.SaveChanges(account);
        }

        public bool SetAdminLevel(int accountId, int adminLevel)
        {
            if (adminLevel < 0 || adminLevel > 10)
                return false;

            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.AdminLevel = adminLevel;
            repository.SaveChanges(account);
            return true;
        }

        public bool SavePosition(int accountId, float posX, float posY, float posZ, float rotZ)
        {
            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.PosX = posX;
            account.PosY = posY;
            account.PosZ = posZ;
            account.RotZ = rotZ;
            repository.SaveChanges(account);
            return true;
        }

        public bool SavePlayerState(int accountId, float posX, float posY, float posZ, float rotZ, uint dimension, int health, int armor, int cash, int bankCash)
        {
            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.PosX = posX;
            account.PosY = posY;
            account.PosZ = posZ;
            account.RotZ = rotZ;
            account.Dimension = dimension;
            account.Health = Clamp(health, 0, 100);
            account.Armor = Clamp(armor, 0, 100);
            account.Cash = ClampMoney(cash);
            account.BankCash = ClampMoney(bankCash);
            repository.SaveChanges(account);
            return true;
        }

        public bool SetCash(int accountId, int cash)
        {
            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.Cash = ClampMoney(cash);
            repository.SaveChanges(account);
            return true;
        }

        public bool SetBankCash(int accountId, int bankCash)
        {
            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.BankCash = ClampMoney(bankCash);
            repository.SaveChanges(account);
            return true;
        }

        public bool SetBanState(int accountId, bool isBanned, string reason)
        {
            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.IsBanned = isBanned;
            account.BanReason = isBanned ? NormalizeOptional(reason) ?? "Kein Grund angegeben." : null;
            repository.SaveChanges(account);
            return true;
        }

        public bool CompleteCharacter(int accountId, string firstName, string lastName, string birthDate, string origin, string customizationJson)
        {
            if (!validationService.IsValidName(firstName) || !validationService.IsValidName(lastName))
                return false;

            Account account = repository.GetById(accountId);
            if (account == null)
                return false;

            account.FirstName = NormalizeName(firstName);
            account.LastName = NormalizeName(lastName);
            account.BirthDate = NormalizeOptional(birthDate);
            account.Origin = NormalizeOptional(origin);
            account.CustomizationJson = NormalizeOptional(customizationJson);
            account.CharacterCreated = true;
            repository.SaveChanges(account);
            return true;
        }

        private static string NormalizeName(string input)
        {
            string value = input.Trim().ToLower();
            return char.ToUpper(value[0]) + value.Substring(1);
        }

        private static string NormalizeOptional(string input)
        {
            return string.IsNullOrWhiteSpace(input) ? null : input.Trim();
        }

        private static int Clamp(int value, int min, int max)
        {
            if (value < min)
                return min;

            return value > max ? max : value;
        }

        private static int ClampMoney(int value)
        {
            return value < 0 ? 0 : value;
        }
    }
}
