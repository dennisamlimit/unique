using GTANetworkAPI;

namespace Unique.Players.Events
{
    public class FingerPointingEvents : Script
    {
        [RemoteEvent("fpsync.update")]
        public void OnFingerPointingUpdate(Player player, double cameraPitch, double cameraHeading)
        {
            if (player == null)
                return;

            foreach (Player target in NAPI.Pools.GetAllPlayers())
            {
                if (target == null || target == player)
                    continue;

                target.TriggerEvent("fpsync.update", player.Id, cameraPitch, cameraHeading);
            }
        }
    }
}
