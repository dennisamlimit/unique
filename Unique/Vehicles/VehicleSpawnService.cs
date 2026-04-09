using GTANetworkAPI;

namespace Unique.Vehicles
{
    public sealed class VehicleSpawnService
    {
        public Vehicle CreateForPlayer(Player player, string model, int color1 = 111, int color2 = 111)
        {
            if (player == null || string.IsNullOrWhiteSpace(model))
                return null;

            uint hash = NAPI.Util.GetHashKey(model);
            if (hash == 0)
                return null;

            return NAPI.Vehicle.CreateVehicle(
                hash,
                player.Position + new Vector3(2f, 0f, 0f),
                player.Heading,
                color1,
                color2
            );
        }
    }
}
