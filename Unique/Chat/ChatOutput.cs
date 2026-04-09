using GTANetworkAPI;

namespace Unique.Chat
{
    public static class ChatOutput
    {
        public static void SendSystem(Player player, string message)
        {
            if (player == null || string.IsNullOrWhiteSpace(message))
                return;

            player.TriggerEvent("client:chat:addMessage", "system", "System", message);
        }

        public static void SendAdmin(Player player, string sender, string message)
        {
            if (player == null || string.IsNullOrWhiteSpace(message))
                return;

            player.TriggerEvent("client:chat:addMessage", "admin", sender, message);
        }
    }
}
