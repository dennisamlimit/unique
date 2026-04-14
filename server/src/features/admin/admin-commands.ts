import { AdminService } from "./admin-service.js";

export function registerAllAdminCommands(adminService: AdminService, deps: any) {
    const { 
        accounts, spawns, factions, 
        systemMessage, forEachPlayer, adminMessage, 
        getPlayerName, getHeading, getVar, setVar, 
        emitClient, findPlayerByAnyId, notifyAdmins,
        parseDurationToken, formatDuration, findOnlinePlayerByAccountId,
        jailPlayer, releasePlayerFromJail, setArmour, formatSpawn,
        spawnFactionVehicle, syncOnlineFactionMember, syncFactionMapBlips,
        tickets, syncTicketState, pushTicketPlayerHistory
    } = deps;

    // Helper for finding targets
    const findTarget = (player: any, id: string, usage: string) => {
        const target = findPlayerByAnyId(id);
        if (!target) {
            systemMessage(player, Number.isInteger(Number(id)) ? "Spieler nicht gefunden." : `Nutze: ${usage}`);
            return null;
        }
        return target;
    };

    // --- ALLGEMEIN ---
    adminService.register({
        commandId: "admin_mode",
        usage: "/admin",
        description: "Admin-Modus ein- oder ausschalten.",
        category: "Allgemein",
        defaultLevel: 1,
        aliases: ["admin"],
        handler: async (player) => {
            const current = Boolean(getVar(player, "ADMIN_MODE", false));
            setVar(player, "ADMIN_MODE", !current);
            systemMessage(player, `Admin-Modus: ${!current ? "aktiv" : "inaktiv"}`);
            if (syncTicketState) {
                await syncTicketState();
            }
            return true;
        }
    });

    adminService.register({
        commandId: "myadmin",
        usage: "/myadmin",
        description: "Dein Admin-Level und Status anzeigen.",
        category: "Allgemein",
        defaultLevel: 1,
        handler: async (player) => {
            systemMessage(player, `Admin-Level: ${getVar(player, "ADMIN_LEVEL", 0)} | Modus: ${getVar(player, "ADMIN_MODE", false) ? "aktiv" : "inaktiv"}`);
            return true;
        }
    });

    // --- FAHRZEUG ---
    adminService.register({
        commandId: "veh",
        usage: "/veh [modell]",
        description: "Admin-Fahrzeug spawnen.",
        category: "Fahrzeug",
        defaultLevel: 1,
        handler: async (player, parts) => {
            const model = parts[1] ?? "adder";
            const hash = mp.joaat(model);
            if (!hash) return systemMessage(player, "Ungueltiges Modell.");
            
            const vehicle = mp.vehicles.new(hash, mp.vector3(player.position.x + 2, player.position.y, player.position.z), {
                heading: getHeading(player),
                color: [111, 111],
                numberPlate: "ADMIN"
            });

            if (vehicle) {
                player.putIntoVehicle?.(vehicle, -1);
                systemMessage(player, `Fahrzeug gespawnt: ${model}`);
            }
            return true;
        }
    });

    adminService.register({
        commandId: "dl",
        usage: "/dl",
        description: "Fahrzeug-Labels umschalten.",
        category: "Fahrzeug",
        defaultLevel: 2,
        handler: async (player) => {
            emitClient(player, "client:dl:toggle");
            return true;
        }
    });

    // --- MODERATION ---
    adminService.register({
        commandId: "msg",
        usage: "/msg [nachricht]",
        description: "Nachricht an alle Admins/Spieler senden.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts, args) => {
            if (!args) return systemMessage(player, "Nutze: /msg [nachricht]");
            forEachPlayer((target: any) => adminMessage(target, getPlayerName(player), args.trim()));
            return true;
        }
    });

    adminService.register({
        commandId: "tmute",
        usage: "/tmute [spielerId] [dauer] [grund]",
        description: "Spieler fuer Support-Tickets stummschalten.",
        category: "Support",
        defaultLevel: 2,
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/tmute [spielerId] [dauer] [grund]");
            if (!target) return;

            const durationMs = parseDurationToken(parts[2]);
            if (!durationMs) {
                systemMessage(player, "Ungueltige Dauer. Beispiel: 30m, 2h oder 1d");
                return true;
            }

            const targetAccountId = Number(getVar(target, "ACCOUNT_ID", 0));
            if (targetAccountId <= 0) {
                systemMessage(player, "Spieler hat keinen gueltigen Account.");
                return true;
            }

            const reason = parts.slice(3).join(" ").trim() || "Missbrauch des Ticket-Systems";
            const mute = await tickets.muteAccount(targetAccountId, Number(getVar(player, "ACCOUNT_ID", 0)), reason, durationMs);
            systemMessage(player, `${getPlayerName(target)} ist fuer ${formatDuration(durationMs)} von Tickets ausgeschlossen.`);
            emitClient(target, "client:tickets:mute", JSON.stringify({ reason, admin: getPlayerName(player), expiresAt: mute.expiresAt }));
            if (syncTicketState) {
                await syncTicketState(targetAccountId);
            }
            return true;
        }
    });

    adminService.register({
        commandId: "tunmute",
        usage: "/unmute [spielerId]",
        description: "Aktive Ticket-Sperre eines Spielers entfernen.",
        category: "Support",
        defaultLevel: 2,
        aliases: ["unmute"],
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/unmute [spielerId]");
            if (!target) return;

            const targetAccountId = Number(getVar(target, "ACCOUNT_ID", 0));
            if (targetAccountId <= 0) {
                systemMessage(player, "Spieler hat keinen gueltigen Account.");
                return true;
            }

            const result = await tickets.unmuteAccount(targetAccountId);
            if (!result.ok) {
                systemMessage(player, `${getPlayerName(target)} hat aktuell keine aktive Ticket-Sperre.`);
                return true;
            }

            systemMessage(player, `${getPlayerName(target)} kann wieder Tickets erstellen.`);
            emitClient(target, "client:tickets:muteClear");
            if (syncTicketState) {
                await syncTicketState(targetAccountId);
            }
            return true;
        }
    });

    adminService.register({
        commandId: "ans",
        usage: "/ans [ticketId] [text]",
        description: "Direkt auf ein Support-Ticket antworten.",
        category: "Support",
        defaultLevel: 1,
        handler: async (player, parts) => {
            const ticketId = Number(parts[1]);
            const message = parts.slice(2).join(" ").trim();
            if (!Number.isInteger(ticketId) || !message) {
                systemMessage(player, "Nutze: /ans [ticketId] [text]");
                return true;
            }

            const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
            const result = await tickets.replyAsAdmin(ticketId, accountId, getPlayerName(player), message);
            if (!result.ok) {
                if (result.reason === "claimed_by_other") {
                    systemMessage(player, `Ticket gehoert aktuell ${result.ticket.claimedByName || "einem anderen Admin"}. Nutze das F3-Menue zum bestaetigten Antworten.`);
                } else {
                    systemMessage(player, "Ticket konnte nicht beantwortet werden.");
                }
                return true;
            }

            systemMessage(player, `Antwort an Ticket #${ticketId} gesendet.`);
            if (syncTicketState) {
                await syncTicketState(result.ticket?.accountId ?? 0);
            }
            return true;
        }
    });

    adminService.register({
        commandId: "lp",
        usage: "/lp [accountId]",
        description: "Komplette Ticket-Historie eines Spielers laden.",
        category: "Support",
        defaultLevel: 1,
        handler: async (player, parts) => {
            const accountId = Number(parts[1]);
            if (!Number.isInteger(accountId) || accountId <= 0) {
                systemMessage(player, "Nutze: /lp [accountId]");
                return true;
            }

            const history = await tickets.getPlayerHistory(accountId);
            if (history.length === 0) {
                systemMessage(player, `Keine Ticket-Historie fuer Account ${accountId} gefunden.`);
                return true;
            }

            if (pushTicketPlayerHistory) {
                pushTicketPlayerHistory(player, accountId, history);
            }
            emitClient(player, "client:admin:showTicketHistory", accountId);

            return true;
        }
    });

    adminService.register({
        commandId: "kick",
        usage: "/kick [spielerId] [grund]",
        description: "Spieler vom Server kicken.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts, args) => {
            const target = findTarget(player, parts[1], "/kick [spielerId] [grund]");
            if (!target) return;
            const reason = args.replace(parts[1] ?? "", "").trim() || "Kein Grund.";
            systemMessage(player, `Gekickt: ${getPlayerName(target)} | ${reason}`);
            target.kick?.(reason);
        }
    });

    adminService.register({
        commandId: "jail",
        usage: "/jail [spielerId] [dauer] [grund]",
        description: "Spieler ins Admin-Jail setzen.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/jail [spielerId] [dauer] [grund]");
            if (!target) return;
            const durationMs = parseDurationToken(parts[2]);
            if (!durationMs) return systemMessage(player, "Ungueltige Dauer.");
            const reason = parts.slice(3).join(" ") || "Kein Grund.";
            jailPlayer(target, durationMs, reason, getPlayerName(player));
            notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} fuer ${formatDuration(durationMs)} im Jail. Grund: ${reason}`);
        }
    });

    adminService.register({
        commandId: "unjail",
        usage: "/unjail [spielerId]",
        description: "Spieler aus dem Jail entlassen.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/unjail [spielerId]");
            if (!target) return;
            if (!getVar(target, "ADMIN_JAILED", false)) return systemMessage(player, "Nicht im Jail.");
            releasePlayerFromJail(target, "Von Admin entlassen.");
            notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} entlassen.`);
        }
    });

    adminService.register({
        commandId: "goto",
        usage: "/goto [spielerId]",
        description: "Zu einem Spieler teleportieren.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/goto [spielerId]");
            if (!target) return;
            player.dimension = target.dimension;
            player.position = mp.vector3(target.position.x + 1.5, target.position.y, target.position.z);
            systemMessage(player, `Teleportiert zu ${getPlayerName(target)}`);
        }
    });

    adminService.register({
        commandId: "gethere",
        usage: "/gethere [spielerId]",
        description: "Spieler zu dir holen.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, parts) => {
            const target = findTarget(player, parts[1], "/gethere [spielerId]");
            if (!target) return;
            target.dimension = player.dimension;
            target.position = mp.vector3(player.position.x + 1.5, player.position.y, player.position.z);
            systemMessage(player, `Geholt: ${getPlayerName(target)}`);
        }
    });

    // --- ACCOUNT ---
    adminService.register({
        commandId: "findaccountsc",
        usage: "/findaccountsc [socialClubId]",
        description: "Account per Social-Club-ID finden.",
        category: "Account",
        defaultLevel: 2,
        handler: async (player, parts, args) => {
            const acc = await accounts.getBySocialClubId(args.trim());
            if (!acc) return systemMessage(player, "Nichts gefunden.");
            systemMessage(player, `Gefunden: ID ${acc.accountId} | ${acc.firstName} ${acc.lastName} | Admin ${acc.adminLevel}`);
        }
    });

    adminService.register({
        commandId: "setadmin",
        usage: "/setadmin [accountId] [level]",
        description: "Admin-Level eines Accounts setzen.",
        category: "Account",
        defaultLevel: 10,
        handler: async (player, parts) => {
            const accId = Number(parts[1]);
            const level = Number(parts[2]);
            if (!Number.isInteger(accId) || !Number.isInteger(level)) return;
            const acc = await accounts.setAdminLevel(accId, level);
            if (acc) systemMessage(player, `Level gesetzt: ${acc.firstName} ${acc.lastName} -> ${level}`);
        }
    });

    // --- GELD ---
    adminService.register({
        commandId: "money_base",
        usage: "/setmoney [spielerId] [betrag]",
        description: "Bargeld oder Bankgeld setzen/hinzufuegen.",
        category: "Finanzen",
        defaultLevel: 3,
        aliases: ["setmoney", "setbank", "addmoney", "addbank"],
        handler: async (player, parts) => {
            const cmd = parts[0].toLowerCase();
            const isBank = cmd.includes("bank");
            const isAdd = cmd.startsWith("add");
            const target = findTarget(player, parts[1], `/${cmd} [id] [betrag]`);
            if (!target) return;
            const accId = Number(getVar(target, "ACCOUNT_ID", 0));
            if (accId <= 0) return;
            const amount = Number(parts[2]);
            if (!Number.isFinite(amount)) return;

            const current = Number(getVar(target, isBank ? "BANK_CASH" : "CASH", 0));
            const next = isAdd ? current + amount : amount;
            const saved = isBank ? await accounts.setBankCash(accId, next) : await accounts.setCash(accId, next);
            if (saved) {
                const final = isBank ? saved.bankCash : saved.cash;
                setVar(target, isBank ? "BANK_CASH" : "CASH", final);
                emitClient(target, "client:hud:updateMoney", isBank ? "bank" : "cash", final);
                systemMessage(player, `${isBank ? "Bank" : "Cash"} gesetzt: ${getPlayerName(target)} -> ${final}`);
            }
        }
    });

    // --- FRAKTION ---
    adminService.register({
        commandId: "createfaction",
        usage: "/createfaction [typ] [kurz] [iconId] [name] [farbe]",
        description: "Neue Fraktion erstellen.",
        category: "Fraktion",
        defaultLevel: 10,
        handler: async (player, parts, args) => {
            const result = await factions.create({
                type: (parts[1] || "").toLowerCase() as any,
                shortName: (parts[2] || "").toUpperCase(),
                name: parts[4] || "Neue Fraktion",
                colorHex: parts[5] || "#FFFFFF",
                mapIconId: Number(parts[3] || 0)
            });
            if (result) systemMessage(player, `Erstellt: ${result.name}`);
        }
    });

    adminService.register({
        commandId: "setfactionleader",
        usage: "/setfactionleader [accountId] [fraktionId]",
        description: "Leader einer Fraktion setzen.",
        category: "Fraktion",
        defaultLevel: 10,
        aliases: ["factionsetleader"],
        handler: async (player, parts) => {
            const accId = Number(parts[1]);
            const factionId = Number(parts[2]);
            if (!Number.isInteger(accId) || !Number.isInteger(factionId) || accId <= 0 || factionId <= 0) {
                systemMessage(player, "Nutze: /setfactionleader [accountId] [fraktionId]");
                return;
            }

            const res = await factions.setFactionLeader(factionId, accId);
            if (!res) {
                systemMessage(player, "Fraktion nicht gefunden.");
                return;
            }

            systemMessage(player, `Leader gesetzt: Acc ${accId} -> Faction ${factionId}`);
            if (syncOnlineFactionMember) await syncOnlineFactionMember(accId);
        }
    });

    adminService.register({
        commandId: "setfactionrank",
        usage: "/setfactionrank [fId] [accId] [rang]",
        description: "Fraktionsrang setzen.",
        category: "Fraktion",
        defaultLevel: 5,
        aliases: ["setfactionmember"],
        handler: async (player, parts) => {
            const fId = Number(parts[1]);
            const accId = Number(parts[2]);
            const rank = Number(parts[3] || 1);
            const res = await factions.assignMember({ factionId: fId, accountId: accId, rankLevel: rank });
            if (res) systemMessage(player, `Rang gesetzt: Acc ${accId} -> Rang ${rank}`);
            if (syncOnlineFactionMember) await syncOnlineFactionMember(accId);
        }
    });
}
