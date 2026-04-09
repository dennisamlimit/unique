using System;
using System.IO;
using System.Text.Json;
using GTANetworkAPI;

namespace Unique.World
{
    public static class ServerSpawnService
    {
        private static readonly object SyncRoot = new object();
        private static readonly string DataDirectory = Path.GetDirectoryName(typeof(ServerSpawnService).Assembly.Location)
            ?? AppDomain.CurrentDomain.BaseDirectory;

        private static readonly string SpawnPath = Path.Combine(DataDirectory, "server_spawn.json");
        private static SpawnPoint cachedSpawn;

        public static SpawnPoint GetSpawn()
        {
            lock (SyncRoot)
            {
                if (cachedSpawn != null)
                    return Clone(cachedSpawn);

                cachedSpawn = Load();
                return Clone(cachedSpawn);
            }
        }

        public static SpawnPoint SaveFromPlayer(Player player)
        {
            if (player == null)
                return null;

            var spawn = new SpawnPoint
            {
                X = player.Position.X,
                Y = player.Position.Y,
                Z = player.Position.Z,
                RotZ = player.Rotation.Z,
                Dimension = player.Dimension
            };

            lock (SyncRoot)
            {
                cachedSpawn = Clone(spawn);
                EnsureDirectory();
                string json = JsonSerializer.Serialize(cachedSpawn, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(SpawnPath, json);
            }

            return spawn;
        }

        public static void Apply(Player player)
        {
            if (player == null)
                return;

            SpawnPoint spawn = GetSpawn();
            player.Dimension = spawn.Dimension;
            player.Position = new Vector3(spawn.X, spawn.Y, spawn.Z);
            player.Rotation = new Vector3(0f, 0f, spawn.RotZ);
        }

        private static SpawnPoint Load()
        {
            try
            {
                if (!File.Exists(SpawnPath))
                    return new SpawnPoint();

                string json = File.ReadAllText(SpawnPath);
                if (string.IsNullOrWhiteSpace(json))
                    return new SpawnPoint();

                return JsonSerializer.Deserialize<SpawnPoint>(json) ?? new SpawnPoint();
            }
            catch
            {
                return new SpawnPoint();
            }
        }

        private static SpawnPoint Clone(SpawnPoint spawn)
        {
            return new SpawnPoint
            {
                X = spawn.X,
                Y = spawn.Y,
                Z = spawn.Z,
                RotZ = spawn.RotZ,
                Dimension = spawn.Dimension
            };
        }

        private static void EnsureDirectory()
        {
            if (!Directory.Exists(DataDirectory))
                Directory.CreateDirectory(DataDirectory);
        }
    }
}
