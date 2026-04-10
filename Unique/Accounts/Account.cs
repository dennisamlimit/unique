namespace Unique.Accounts
{
    public class Account
    {
        public int AccountId { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public string SocialClubName { get; set; }
        public string SocialClubId { get; set; }
        public string PasswordHash { get; set; }
        public string PasswordSalt { get; set; }
        public bool CharacterCreated { get; set; } = true;
        public string BirthDate { get; set; }
        public string Origin { get; set; }
        public string CustomizationJson { get; set; }
        public int AdminLevel { get; set; }
        public int Cash { get; set; }
        public int BankCash { get; set; }
        public int Health { get; set; } = 100;
        public int Armor { get; set; } = 0;
        public uint Dimension { get; set; } = 0;
        public float PosX { get; set; } = -75.24f;
        public float PosY { get; set; } = -818.95f;
        public float PosZ { get; set; } = 326.18f;
        public float RotZ { get; set; } = 160.0f;
        public bool IsBanned { get; set; }
        public string BanReason { get; set; }
        public string BanDate { get; set; }
        public string BanExpiresAt { get; set; }
        public string BanAdminName { get; set; }
        public int BanAdminAccountId { get; set; }

        public string CharacterNameUnderscore => $"{FirstName}_{LastName}";
        public string DisplayName => $"{FirstName} {LastName}";
    }
}
