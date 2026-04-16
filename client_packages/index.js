/**
 * Main Client Entry Point - Isolation Architecture
 */

require("auth/index.js");

let resourcesLoaded = false;

mp.events.add("client:manager:initAll", () => {
    if (resourcesLoaded) return;
    resourcesLoaded = true;

    mp.gui.chat.push("!{#A855F7}[SYSTEM] Initialisiere Spiel-Systeme...");

    require("admin/index.js");
    require("chat/index.js");
    require("hud/index.js");
    require("phone/index.js");
    require("faction_map/index.js");
    require("interaction/index.js");
    require("orga/index.js");
    require("usermenu/index.js");
    require("dl/index.js");
    require("fingerpointing/index.js");
    require("admin_utils.js");

    mp.gui.chat.push("!{#A855F7}[SYSTEM] Alle Systeme erfolgreich geladen.");
});
