using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using SQLitePCL;

namespace Unique.Accounts.Repositories
{
    public sealed class AccountRepository
    {
        private static readonly string DataDirectory = Path.GetDirectoryName(typeof(AccountRepository).Assembly.Location)
            ?? AppDomain.CurrentDomain.BaseDirectory;

        private static readonly string DatabasePath = Path.Combine(DataDirectory, "unique.db");
        private static readonly string LegacyJsonPath = Path.Combine(DataDirectory, "accounts.json");
        private static readonly string ConnectionString = $"Data Source={DatabasePath}";

        static AccountRepository()
        {
            EnsureNativeSqliteLoaded();
        }

        public void Load()
        {
            EnsureDatabase();
            ImportLegacyJsonIfNeeded();
        }

        public bool EmailExists(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1 FROM accounts WHERE lower(email) = lower($email) LIMIT 1;";
            command.Parameters.AddWithValue("$email", email.Trim());
            return command.ExecuteScalar() != null;
        }

        public bool SocialClubExists(string socialClubId)
        {
            if (string.IsNullOrWhiteSpace(socialClubId))
                return false;

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1 FROM accounts WHERE lower(social_club_id) = lower($socialClubId) LIMIT 1;";
            command.Parameters.AddWithValue("$socialClubId", socialClubId.Trim());
            return command.ExecuteScalar() != null;
        }

        public Account GetById(int accountId)
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM accounts WHERE account_id = $accountId LIMIT 1;";
            command.Parameters.AddWithValue("$accountId", accountId);
            using var reader = command.ExecuteReader();
            return reader.Read() ? MapAccount(reader) : null;
        }

        public Account GetByEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM accounts WHERE lower(email) = lower($email) LIMIT 1;";
            command.Parameters.AddWithValue("$email", email.Trim());
            using var reader = command.ExecuteReader();
            return reader.Read() ? MapAccount(reader) : null;
        }

        public Account GetBySocialClubId(string socialClubId)
        {
            if (string.IsNullOrWhiteSpace(socialClubId))
                return null;

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM accounts WHERE lower(social_club_id) = lower($socialClubId) LIMIT 1;";
            command.Parameters.AddWithValue("$socialClubId", socialClubId.Trim());
            using var reader = command.ExecuteReader();
            return reader.Read() ? MapAccount(reader) : null;
        }

        public void Add(Account account)
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText =
                @"INSERT INTO accounts
                    (first_name, last_name, email, social_club_name, social_club_id, password_hash, password_salt, character_created, birth_date, origin, customization_json, admin_level, cash, bank_cash, health, armor, dimension, pos_x, pos_y, pos_z, rot_z, is_banned, ban_reason)
                  VALUES
                    ($firstName, $lastName, $email, $socialClubName, $socialClubId, $passwordHash, $passwordSalt, $characterCreated, $birthDate, $origin, $customizationJson, $adminLevel, $cash, $bankCash, $health, $armor, $dimension, $posX, $posY, $posZ, $rotZ, $isBanned, $banReason);
                  SELECT last_insert_rowid();";

            BindAccountParameters(command, account, includeId: false);
            account.AccountId = Convert.ToInt32((long)command.ExecuteScalar());
        }

        public void SaveChanges(Account account)
        {
            if (account == null || account.AccountId <= 0)
                return;

            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText =
                @"UPDATE accounts SET
                    first_name = $firstName,
                    last_name = $lastName,
                    email = $email,
                    social_club_name = $socialClubName,
                    social_club_id = $socialClubId,
                    password_hash = $passwordHash,
                    password_salt = $passwordSalt,
                    character_created = $characterCreated,
                    birth_date = $birthDate,
                    origin = $origin,
                    customization_json = $customizationJson,
                    admin_level = $adminLevel,
                    cash = $cash,
                    bank_cash = $bankCash,
                    health = $health,
                    armor = $armor,
                    dimension = $dimension,
                    pos_x = $posX,
                    pos_y = $posY,
                    pos_z = $posZ,
                    rot_z = $rotZ,
                    is_banned = $isBanned,
                    ban_reason = $banReason
                  WHERE account_id = $accountId;";

            BindAccountParameters(command, account, includeId: true);
            command.ExecuteNonQuery();
        }

        private static void BindAccountParameters(SqliteCommand command, Account account, bool includeId)
        {
            if (includeId)
                command.Parameters.AddWithValue("$accountId", account.AccountId);

            command.Parameters.AddWithValue("$firstName", account.FirstName ?? string.Empty);
            command.Parameters.AddWithValue("$lastName", account.LastName ?? string.Empty);
            command.Parameters.AddWithValue("$email", account.Email ?? string.Empty);
            command.Parameters.AddWithValue("$socialClubName", (object)account.SocialClubName ?? DBNull.Value);
            command.Parameters.AddWithValue("$socialClubId", (object)account.SocialClubId ?? DBNull.Value);
            command.Parameters.AddWithValue("$passwordHash", account.PasswordHash ?? string.Empty);
            command.Parameters.AddWithValue("$passwordSalt", account.PasswordSalt ?? string.Empty);
            command.Parameters.AddWithValue("$characterCreated", account.CharacterCreated ? 1 : 0);
            command.Parameters.AddWithValue("$birthDate", (object)account.BirthDate ?? DBNull.Value);
            command.Parameters.AddWithValue("$origin", (object)account.Origin ?? DBNull.Value);
            command.Parameters.AddWithValue("$customizationJson", (object)account.CustomizationJson ?? DBNull.Value);
            command.Parameters.AddWithValue("$adminLevel", account.AdminLevel);
            command.Parameters.AddWithValue("$cash", account.Cash);
            command.Parameters.AddWithValue("$bankCash", account.BankCash);
            command.Parameters.AddWithValue("$health", account.Health);
            command.Parameters.AddWithValue("$armor", account.Armor);
            command.Parameters.AddWithValue("$dimension", account.Dimension);
            command.Parameters.AddWithValue("$posX", account.PosX);
            command.Parameters.AddWithValue("$posY", account.PosY);
            command.Parameters.AddWithValue("$posZ", account.PosZ);
            command.Parameters.AddWithValue("$rotZ", account.RotZ);
            command.Parameters.AddWithValue("$isBanned", account.IsBanned ? 1 : 0);
            command.Parameters.AddWithValue("$banReason", (object)account.BanReason ?? DBNull.Value);
        }

        private static Account MapAccount(SqliteDataReader reader)
        {
            return new Account
            {
                AccountId = reader.GetInt32(reader.GetOrdinal("account_id")),
                FirstName = reader.GetString(reader.GetOrdinal("first_name")),
                LastName = reader.GetString(reader.GetOrdinal("last_name")),
                Email = reader.GetString(reader.GetOrdinal("email")),
                SocialClubName = GetNullableString(reader, "social_club_name"),
                SocialClubId = GetNullableString(reader, "social_club_id"),
                PasswordHash = reader.GetString(reader.GetOrdinal("password_hash")),
                PasswordSalt = reader.GetString(reader.GetOrdinal("password_salt")),
                CharacterCreated = reader.GetInt32(reader.GetOrdinal("character_created")) == 1,
                BirthDate = GetNullableString(reader, "birth_date"),
                Origin = GetNullableString(reader, "origin"),
                CustomizationJson = GetNullableString(reader, "customization_json"),
                AdminLevel = reader.GetInt32(reader.GetOrdinal("admin_level")),
                Cash = reader.GetInt32(reader.GetOrdinal("cash")),
                BankCash = reader.GetInt32(reader.GetOrdinal("bank_cash")),
                Health = reader.GetInt32(reader.GetOrdinal("health")),
                Armor = reader.GetInt32(reader.GetOrdinal("armor")),
                Dimension = Convert.ToUInt32(reader.GetInt64(reader.GetOrdinal("dimension"))),
                PosX = reader.GetFloat(reader.GetOrdinal("pos_x")),
                PosY = reader.GetFloat(reader.GetOrdinal("pos_y")),
                PosZ = reader.GetFloat(reader.GetOrdinal("pos_z")),
                RotZ = reader.GetFloat(reader.GetOrdinal("rot_z")),
                IsBanned = reader.GetInt32(reader.GetOrdinal("is_banned")) == 1,
                BanReason = GetNullableString(reader, "ban_reason")
            };
        }

        private static string GetNullableString(SqliteDataReader reader, string column)
        {
            int ordinal = reader.GetOrdinal(column);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }

        private static SqliteConnection OpenConnection()
        {
            EnsureDirectory();
            var connection = new SqliteConnection(ConnectionString);
            connection.Open();
            return connection;
        }

        private static void EnsureDatabase()
        {
            using var connection = OpenConnection();
            using var command = connection.CreateCommand();
            command.CommandText =
                @"CREATE TABLE IF NOT EXISTS accounts (
                    account_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    social_club_name TEXT NULL,
                    social_club_id TEXT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    password_salt TEXT NOT NULL,
                    character_created INTEGER NOT NULL DEFAULT 1,
                    birth_date TEXT NULL,
                    origin TEXT NULL,
                    customization_json TEXT NULL,
                    admin_level INTEGER NOT NULL DEFAULT 0,
                    cash INTEGER NOT NULL DEFAULT 0,
                    bank_cash INTEGER NOT NULL DEFAULT 0,
                    health INTEGER NOT NULL DEFAULT 100,
                    armor INTEGER NOT NULL DEFAULT 0,
                    dimension INTEGER NOT NULL DEFAULT 0,
                    pos_x REAL NOT NULL DEFAULT -75.24,
                    pos_y REAL NOT NULL DEFAULT -818.95,
                    pos_z REAL NOT NULL DEFAULT 326.18,
                    rot_z REAL NOT NULL DEFAULT 160.0,
                    is_banned INTEGER NOT NULL DEFAULT 0,
                    ban_reason TEXT NULL
                );";
            command.ExecuteNonQuery();

            EnsureColumn(connection, "health", "INTEGER NOT NULL DEFAULT 100");
            EnsureColumn(connection, "armor", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(connection, "dimension", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(connection, "is_banned", "INTEGER NOT NULL DEFAULT 0");
            EnsureColumn(connection, "ban_reason", "TEXT NULL");
            EnsureColumn(connection, "character_created", "INTEGER NOT NULL DEFAULT 1");
            EnsureColumn(connection, "birth_date", "TEXT NULL");
            EnsureColumn(connection, "origin", "TEXT NULL");
            EnsureColumn(connection, "customization_json", "TEXT NULL");
        }

        private static void EnsureColumn(SqliteConnection connection, string columnName, string definition)
        {
            using (var pragma = connection.CreateCommand())
            {
                pragma.CommandText = "PRAGMA table_info(accounts);";
                using var reader = pragma.ExecuteReader();
                while (reader.Read())
                {
                    if (string.Equals(reader.GetString(reader.GetOrdinal("name")), columnName, StringComparison.OrdinalIgnoreCase))
                        return;
                }
            }

            using var alter = connection.CreateCommand();
            alter.CommandText = $"ALTER TABLE accounts ADD COLUMN {columnName} {definition};";
            alter.ExecuteNonQuery();
        }

        private static void ImportLegacyJsonIfNeeded()
        {
            if (!File.Exists(LegacyJsonPath))
                return;

            using var connection = OpenConnection();
            using var countCommand = connection.CreateCommand();
            countCommand.CommandText = "SELECT COUNT(*) FROM accounts;";
            long existingCount = (long)countCommand.ExecuteScalar();
            if (existingCount > 0)
                return;

            string json = File.ReadAllText(LegacyJsonPath);
            if (string.IsNullOrWhiteSpace(json))
                return;

            var accounts = JsonSerializer.Deserialize<List<Account>>(json);
            if (accounts == null || accounts.Count == 0)
                return;

            using var transaction = connection.BeginTransaction();
            foreach (Account account in accounts)
            {
                using var insert = connection.CreateCommand();
                insert.Transaction = transaction;
                insert.CommandText =
                    @"INSERT INTO accounts
                        (account_id, first_name, last_name, email, social_club_name, social_club_id, password_hash, password_salt, character_created, birth_date, origin, customization_json, admin_level, cash, bank_cash, health, armor, dimension, pos_x, pos_y, pos_z, rot_z, is_banned, ban_reason)
                      VALUES
                        ($accountId, $firstName, $lastName, $email, $socialClubName, $socialClubId, $passwordHash, $passwordSalt, $characterCreated, $birthDate, $origin, $customizationJson, $adminLevel, $cash, $bankCash, $health, $armor, $dimension, $posX, $posY, $posZ, $rotZ, $isBanned, $banReason);";

                BindAccountParameters(insert, account, includeId: true);
                insert.ExecuteNonQuery();
            }

            using var sequence = connection.CreateCommand();
            sequence.Transaction = transaction;
            sequence.CommandText = "UPDATE sqlite_sequence SET seq = (SELECT MAX(account_id) FROM accounts) WHERE name = 'accounts';";
            sequence.ExecuteNonQuery();

            transaction.Commit();
        }

        private static void EnsureDirectory()
        {
            if (!Directory.Exists(DataDirectory))
                Directory.CreateDirectory(DataDirectory);
        }

        private static void EnsureNativeSqliteLoaded()
        {
            string rootDllPath = Path.Combine(DataDirectory, "e_sqlite3.dll");
            string runtimeDllPath = Path.Combine(DataDirectory, "runtimes", GetRuntimeFolder(), "native", GetNativeLibraryName());

            if (!File.Exists(rootDllPath) && File.Exists(runtimeDllPath))
                File.Copy(runtimeDllPath, rootDllPath, true);

            string dllPathToLoad = File.Exists(rootDllPath) ? rootDllPath : runtimeDllPath;
            if (!File.Exists(dllPathToLoad))
                return;

            try
            {
                NativeLibrary.Load(dllPathToLoad);
            }
            catch
            {
                // If the native library is already loaded or the host resolves it itself, initialization below can still succeed.
            }

            Batteries_V2.Init();
        }

        private static string GetRuntimeFolder()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return Environment.Is64BitProcess ? "win-x64" : "win-x86";

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                return Environment.Is64BitProcess ? "linux-x64" : "linux-x86";

            return "osx-x64";
        }

        private static string GetNativeLibraryName()
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                return "e_sqlite3.dll";

            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                return "libe_sqlite3.so";

            return "libe_sqlite3.dylib";
        }
    }
}
