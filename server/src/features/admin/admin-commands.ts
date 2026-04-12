import { AdminService } from "./admin-service.js";

export function registerAllAdminCommands(adminService: AdminService, deps: any) {
    const { 
        accounts, spawns, factions, 
        systemMessage, forEachPlayer, adminMessage, 
        getPlayerName, getHeading, getVar, setVar, 
        emitClient, findPlayerByAnyId, notifyAdmins,
        parseDurationToken, formatDuration, findOnlinePlayerByAccountId,
        jailPlayer, releasePlayerFromJail, setArmour, formatSpawn,
        spawnFactionVehicle, syncOnlineFactionMember, syncFactionMapBlips
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
            jailPlayer(target, durationMs, reason);
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
