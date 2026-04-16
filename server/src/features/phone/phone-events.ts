import { PhoneService } from "./phone-service.js";

export function registerPhoneEvents(phoneService: PhoneService) {
    console.log("[phone] Initialisierung der Phone-Events gestartet...");
  // Catch the redirected NUI bridge requests from the client shim
  mp.events.add("phone:nuiRequest", async (player: Player, endpoint: string, bodyJson: string, requestId: number) => {
    let body: any = {};
    try {
      body = JSON.parse(bodyJson);
    } catch (e) {
      console.error(`[phone-events] Fehler beim Parsen von bodyJson für ${endpoint}`);
    }

    const phoneNumber = player.getVariable("PHONE_NUMBER") as string;
    if (!phoneNumber) {
      console.warn(`[phone-events] Player ${player.name} hat keine Telefonnummer.`);
      return player.call("phone:nuiResponse", [requestId, JSON.stringify({ error: "No phone number" })]);
    }

    const action = body.action;
    let response: any = {};

    try {
      // Nutze den neuen strukturierten Dispatcher in PhoneService
      response = await phoneService.handleRequest(player, endpoint, action, body);
    } catch (error: any) {
      console.error(`[phone-events] Fehler bei handleRequest ${endpoint} (${action}):`, error);
      response = { error: error.message };
    }

    // Antwort an den Client senden
    player.call("phone:nuiResponse", [requestId, JSON.stringify(response || {})]);
  });


  mp.events.add("phone:clientLog", (player: Player, msg: string) => {
    console.log(`[phone:CEF] ${player.name}: ${msg}`);
  });
}
