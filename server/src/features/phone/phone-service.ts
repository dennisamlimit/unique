import { getPool } from "../../infrastructure/database.js";
import type { Account } from "../accounts/account.js";

export class PhoneService {
  /**
   * Generiert eine zufällige 6-stellige Telefonnummer.
   */
  async generateUniqueNumber(): Promise<string> {
    const pool = getPool();
    let exists = true;
    let number = "";

    while (exists) {
      number = Math.floor(100000 + Math.random() * 900000).toString();
      const result = await pool.query("SELECT 1 FROM phone_phones WHERE phone_number = $1", [number]);
      exists = (result.rowCount ?? 0) > 0;
    }

    return number;
  }

  /**
   * Erstellt einen neuen Phone-Datensatz für einen Account.
   */
  async ensurePhoneEntry(accountId: number, identifier: string): Promise<string> {
    const pool = getPool();
    
    // Prüfen ob bereits eine Nummer im Account steht
    const accountRes = await pool.query("SELECT phone_number FROM accounts WHERE account_id = $1", [accountId]);
    let phoneNumber = accountRes.rows[0]?.phone_number;

    if (!phoneNumber) {
      phoneNumber = await this.generateUniqueNumber();
      await pool.query("UPDATE accounts SET phone_number = $1 WHERE account_id = $2", [phoneNumber, accountId]);
    }

    // Prüfen ob der phone_phones Eintrag existiert
    const phoneRes = await pool.query("SELECT 1 FROM phone_phones WHERE phone_number = $1", [phoneNumber]);
    if ((phoneRes.rowCount ?? 0) === 0) {
      await pool.query(
        "INSERT INTO phone_phones (id, owner_id, phone_number, settings, is_setup) VALUES ($1, $2, $3, $4, $5)",
        [identifier, identifier, phoneNumber, JSON.stringify({}), false]
      );
    }

    return phoneNumber;
  }

  async getSettings(phoneNumber: string) {
    const res = await getPool().query("SELECT settings, is_setup, name, battery FROM phone_phones WHERE phone_number = $1", [phoneNumber]);
    return res.rows[0] || null;
  }

  async saveSettings(phoneNumber: string, settings: any) {
    await getPool().query("UPDATE phone_phones SET settings = $1 WHERE phone_number = $2", [JSON.stringify(settings), phoneNumber]);
  }

  async setSetupFinished(phoneNumber: string, settings: any) {
    await getPool().query("UPDATE phone_phones SET is_setup = true, settings = $1 WHERE phone_number = $2", [JSON.stringify(settings), phoneNumber]);
  }

  async getContacts(phoneNumber: string) {
    const res = await getPool().query("SELECT * FROM phone_contacts WHERE phone_number = $1", [phoneNumber]);
    return res.rows;
  }

  async addContact(phoneNumber: string, contactData: any) {
    await getPool().query(
      "INSERT INTO phone_contacts (phone_number, contact_phone_number, firstname, lastname, profile_image, email) VALUES ($1, $2, $3, $4, $5, $6)",
      [phoneNumber, contactData.number, contactData.firstname || '', contactData.lastname || '', contactData.profile_image || '', contactData.email || '']
    );
  }

  /**
   * Hilfsmethode: Wartet kurz auf die Zuweisung der Telefonnummer (Race Condition Fix).
   */
  private async waitForPhoneNumber(player: PlayerMp, timeoutMs = 3000): Promise<string | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const num = player.getVariable("PHONE_NUMBER");
      if (num) return num;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return null;
  }

  /**
   * Zentraler Handler für alle App-Anfragen vom Handy (NUI).
   * Ersetzt die generische Bridge durch strukturierte Logik.
   */
  async handleRequest(player: PlayerMp, endpoint: string, action: string, data: any): Promise<any> {
    let phoneNumber = player.getVariable("PHONE_NUMBER");

    // Falls Nummer noch nicht da (Login-Prozess läuft noch), kurz warten
    if (!phoneNumber) {
        phoneNumber = await this.waitForPhoneNumber(player);
    }

    if (!phoneNumber) {
        console.warn(`[PhoneService] Request abgelehnt: Player ${player.name} hat NOCH keine Nummer. (${endpoint} -> ${action})`);
        return null;
    }

    // Debugging
    console.log(`[PhoneService] Request: ${endpoint} -> ${action}`, data);

    // Baseline: Handshakes & Identity
    if (endpoint === "GetSettings") {
        const settings = await this.getSettings(phoneNumber);
        return {
            phone_number: phoneNumber,
            theme: "dark",
            language: "de",
            flight_mode: false,
            ...settings
        };
    }

    if (endpoint === "GetPlayerPhone") {
        return {
            phone_number: phoneNumber,
            phone_name: player.name
        };
    }

    if (endpoint === "voice:getConfig") {
        return {
            useMumble: false,
            useSalty: false,
            useToko: false
        };
    }

    if (endpoint === "setOnScreen") {
        return { status: "ok" };
    }

    // Social Apps: isLoggedIn Check (Immer true für den Anfang)
    if (action === "isLoggedIn") {
        return true; 
    }

    // Twitter / Birdy Integration
    if (endpoint === "Twitter") {
        if (action === "getPosts") {
            return [
                {
                    user: { name: "Dennis", username: "dennis", profile_picture: "https://ui-avatars.com/api/?name=Dennis&background=0D8ABC&color=fff", verified: true },
                    tweet: { id: 1, content: "Willkommen auf Unique Roleplay! Das Handy-Rework ist live. 📱", date_created: Date.now(), likes: 10, retweets: 5 }
                },
                {
                    user: { name: "Server", username: "uniquerp", profile_picture: "https://ui-avatars.com/api/?name=Server&background=random", verified: true },
                    tweet: { id: 2, content: "Benutze F7 zum Öffnen/Schließen des Handys.", date_created: Date.now() - 50000, likes: 42, retweets: 12 }
                }
            ];
        }
    }

    // Fallback für noch nicht implementierte Logik
    return null;
  }

  /**
   * Sendet eine Push-Benachrichtigung an das Handy eines Spielers.
   */
  sendNotification(player: PlayerMp, notification: { title: string, content?: string, icon?: string, app?: string, duration?: number }) {
      const payload = {
          title: notification.title,
          content: notification.content || notification.title,
          icon: notification.icon || "fas fa-info-circle",
          app: notification.app || "System",
          duration: notification.duration || 5000
      };

      player.call("phone:triggerEvent", ["sendNotification", JSON.stringify(payload)]);
  }
}
