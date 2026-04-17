/**
 * Main Client Entry Point - Isolation Architecture
 */

require("auth/index.js");

let resourcesLoaded = false;

mp.events.add("client:manager:initAll", () => {
    if (resourcesLoaded) return;
    resourcesLoaded = true;

    mp.gui.chat.show(true); // Ensure chat is visible for debug
    mp.gui.chat.push("!{#F97316}[TRACE] Initialisiere Spiel-Systeme...");

    require("admin/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Admin Geladen");
    require("chat/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Chat Geladen");
    require("hud/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] HUD Geladen");
    require("phone/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Phone Geladen");
    require("faction_map/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] FactionMap Geladen");
    require("interaction/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Interaction Geladen");
    require("orga/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Orga Geladen");
    require("usermenu/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] UserMenu Geladen");
    require("dl/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] DL Geladen");
    require("fingerpointing/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Finger Geladen");
    require("inventory/index.js"); mp.gui.chat.push("!{#F97316}[TRACE] Inventory Geladen");
    require("admin_utils.js"); mp.gui.chat.push("!{#F97316}[TRACE] AdminUtils Geladen");

    mp.gui.chat.push("!{#F97316}[TRACE] Alle Systeme erfolgreich geladen.");
});
