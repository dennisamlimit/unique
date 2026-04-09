using System;
using System.Security.Cryptography;

namespace Unique.Accounts.Services
{
    public sealed class PasswordService
    {
        public string CreateSalt()
        {
            byte[] salt = new byte[16];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(salt);
            return Convert.ToBase64String(salt);
        }

        public string HashPassword(string password, string saltBase64)
        {
            byte[] salt = Convert.FromBase64String(saltBase64);
            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 100000, HashAlgorithmName.SHA256);
            return Convert.ToBase64String(pbkdf2.GetBytes(32));
        }

        public bool VerifyPassword(Account account, string password)
        {
            if (account == null)
                return false;

            string hash = HashPassword(password, account.PasswordSalt);
            return hash == account.PasswordHash;
        }
    }
}
