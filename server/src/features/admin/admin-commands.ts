import { AdminService } from "./admin-service.js";
import { isPlayerVehicleDriver, setHeading, vector3 } from "../../runtime/helpers.js";

function formatMoney(value: number) {
    return `$${Number(value || 0).toLocaleString("de-DE")}`;
}

function parseHouseCreateArgs(parts: string[]) {
    if (parts.length < 3) {
        return null;
    }

    const maybePrice = Number(parts[parts.length - 1]);
    const hasExplicitPrice = Number.isFinite(maybePrice);
    const interiorKeyIndex = hasExplicitPrice ? parts.length - 2 : parts.length - 1;
    const displayName = parts.slice(1, interiorKeyIndex).join(" ").trim();
    const interiorKey = parts[interiorKeyIndex] ?? "";

    if (!displayName || !interiorKey) {
        return null;
    }

    return {
        displayName,
        interiorKey,
        price: hasExplicitPrice ? maybePrice : undefined
    };
}

function parseNumericArg(value: string | undefined) {
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized.length) {
        return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatPointForChat(point: { x: number; y: number; z: number; rotZ?: number; dimension?: number | null }) {
    const segments = [
        `x: ${Number(point.x ?? 0).toFixed(4)}`,
        `y: ${Number(point.y ?? 0).toFixed(4)}`,
        `z: ${Number(point.z ?? 0).toFixed(4)}`
    ];

    if (point.rotZ !== undefined) {
        segments.push(`rotZ: ${Number(point.rotZ ?? 0).toFixed(4)}`);
    }

    if (point.dimension !== undefined && point.dimension !== null) {
        segments.push(`dimension: ${Number(point.dimension ?? 0)}`);
    }

    return segments.join(", ");
}

function teleportPlayerOrVehicle(
    player: any,
    target: { x: number; y: number; z: number; rotZ?: number; dimension: number }
) {
    if (isPlayerVehicleDriver(player, player.vehicle) && player.vehicle) {
        player.vehicle.dimension = target.dimension;
        player.vehicle.position = vector3(target.x, target.y, target.z);
        if (typeof target.rotZ === "number") {
            if (typeof player.vehicle.heading === "number") {
                player.vehicle.heading = target.rotZ;
            } else {
                player.vehicle.rotation = vector3(0, 0, target.rotZ);
            }
            setHeading(player, target.rotZ);
        }
        player.dimension = target.dimension;
        return;
    }

    player.dimension = target.dimension;
    player.position = vector3(target.x, target.y, target.z);
    if (typeof target.rotZ === "number") {
        setHeading(player, target.rotZ);
    }
}

export function registerAllAdminCommands(adminService: AdminService, deps: any) {
    const {
        accounts, spawns, factions, housing,
        systemMessage, forEachPlayer, adminMessage,
        getPlayerName, getHeading, getVar, setVar,
        emitClient, findPlayerByAnyId, notifyAdmins,
        parseDurationToken, formatDuration, findOnlinePlayerByAccountId,
        jailPlayer, releasePlayerFromJail, setArmour, formatSpawn,
        spawnFactionVehicle, syncOnlineFactionMember, syncFactionMapBlips,
        tickets, syncTicketState, pushTicketPlayerHistory,
        syncHousingDataForAll, refreshAdminHousingDataForAllAdmins, despawnHouseGarageVehicle
    } = deps;

    const findTarget = (player: any, id: string, usage: string) => {
        const target = findPlayerByAnyId(id);
        if (!target) {
            systemMessage(player, Number.isInteger(Number(id)) ? "Spieler nicht gefunden." : `Nutze: ${usage}`);
            return null;
        }
        return target;
    };

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

    adminService.register({
        commandId: "veh",
        usage: "/veh [modell]",
        description: "Admin-Fahrzeug spawnen.",
        category: "Fahrzeug",
        defaultLevel: 1,
        handler: async (player, parts) => {
            const model = parts[1] ?? "adder";
            const hash = mp.joaat(model);
            if (!hash) {
                return systemMessage(player, "Ungueltiges Modell.");
            }

            const vehicle = mp.vehicles.new(hash, vector3(player.position.x + 2, player.position.y, player.position.z), {
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

    adminService.register({
        commandId: "msg",
        usage: "/msg [nachricht]",
        description: "Nachricht an alle Admins/Spieler senden.",
        category: "Moderation",
        defaultLevel: 2,
        handler: async (player, _parts, args) => {
            if (!args) {
                return systemMessage(player, "Nutze: /msg [nachricht]");
            }
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
            return true;
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
            if (!durationMs) {
                return systemMessage(player, "Ungueltige Dauer.");
            }
            const reason = parts.slice(3).join(" ") || "Kein Grund.";
            jailPlayer(target, durationMs, reason, getPlayerName(player));
            notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} fuer ${formatDuration(durationMs)} im Jail. Grund: ${reason}`);
            return true;
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
            if (!getVar(target, "ADMIN_JAILED", false)) {
                return systemMessage(player, "Nicht im Jail.");
            }
            releasePlayerFromJail(target, "Von Admin entlassen.");
            notifyAdmins(`${getPlayerName(player)} hat ${getPlayerName(target)} entlassen.`);
            return true;
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
            player.position = vector3(target.position.x + 1.5, target.position.y, target.position.z);
            systemMessage(player, `Teleportiert zu ${getPlayerName(target)}`);
            return true;
        }
    });

    adminService.register({
        commandId: "dim",
        usage: "/dim",
        description: "Aktuelle Dimension anzeigen.",
        category: "Moderation",
        defaultLevel: 1,
        aliases: ["dim"],
        handler: async (player) => {
            systemMessage(player, `Aktuelle Dimension: ${Number(player.dimension ?? 0)}`);
            return true;
        }
    });

    adminService.register({
        commandId: "setdim",
        usage: "/setdim [dimension]",
        description: "Eigene Dimension setzen.",
        category: "Moderation",
        defaultLevel: 2,
        aliases: ["setdim"],
        handler: async (player, parts) => {
            const dimension = Number(parts[1]);
            if (!Number.isInteger(dimension) || dimension < 0) {
                systemMessage(player, "Nutze: /setdim [dimension]");
                return true;
            }

            teleportPlayerOrVehicle(player, {
                x: Number(player.position?.x ?? 0),
                y: Number(player.position?.y ?? 0),
                z: Number(player.position?.z ?? 0),
                rotZ: Number(getHeading(player) ?? 0),
                dimension
            });
            systemMessage(player, `Dimension gesetzt: ${dimension}`);
            return true;
        }
    });

    adminService.register({
        commandId: "tpcor",
        usage: "/tpcor [x] [y] [z] (dimension)",
        description: "Zu Koordinaten teleportieren. Optional mit Dimension.",
        category: "Moderation",
        defaultLevel: 2,
        aliases: ["tpcor"],
        handler: async (player, parts) => {
            const x = parseNumericArg(parts[1]);
            const y = parseNumericArg(parts[2]);
            const z = parseNumericArg(parts[3]);
            const dimension = parts[4] === undefined ? Number(player.dimension ?? 0) : Number(parts[4]);
            if (x === null || y === null || z === null || !Number.isInteger(dimension) || dimension < 0) {
                systemMessage(player, "Nutze: /tpcor [x] [y] [z] (dimension)");
                return true;
            }

            teleportPlayerOrVehicle(player, {
                x,
                y,
                z,
                rotZ: Number(getHeading(player) ?? 0),
                dimension
            });
            systemMessage(player, `Teleportiert: ${formatPointForChat({ x, y, z, dimension })}`);
            return true;
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
            target.position = vector3(player.position.x + 1.5, player.position.y, player.position.z);
            systemMessage(player, `Geholt: ${getPlayerName(target)}`);
            return true;
        }
    });

    adminService.register({
        commandId: "findaccountsc",
        usage: "/findaccountsc [socialClubId]",
        description: "Account per Social-Club-ID finden.",
        category: "Account",
        defaultLevel: 2,
        handler: async (player, _parts, args) => {
            const acc = await accounts.getBySocialClubId(args.trim());
            if (!acc) {
                return systemMessage(player, "Nichts gefunden.");
            }
            systemMessage(player, `Gefunden: ID ${acc.accountId} | ${acc.firstName} ${acc.lastName} | Admin ${acc.adminLevel}`);
            return true;
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
            if (!Number.isInteger(accId) || !Number.isInteger(level)) {
                systemMessage(player, "Nutze: /setadmin [accountId] [level]");
                return true;
            }

            const acc = await accounts.setAdminLevel(accId, level);
            if (!acc) {
                systemMessage(player, "Admin-Level konnte nicht gespeichert werden.");
                return true;
            }

            const onlineTarget = findOnlinePlayerByAccountId?.(accId);
            if (onlineTarget) {
                setVar(onlineTarget, "ADMIN_LEVEL", acc.adminLevel);
            }

            systemMessage(player, `Level gesetzt: ${acc.firstName} ${acc.lastName} -> ${acc.adminLevel}`);
            return true;
        }
    });

    adminService.register({
        commandId: "money_base",
        usage: "/setmoney [spielerId] [betrag]",
        description: "Bargeld oder Bankgeld setzen/hinzufuegen.",
        category: "Finanzen",
        defaultLevel: 3,
        aliases: ["setmoney", "setcash", "setbank", "addmoney", "addcash", "addbank"],
        handler: async (player, parts) => {
            const cmd = parts[0].toLowerCase();
            const isBank = cmd.includes("bank");
            const isAdd = cmd.startsWith("add");
            const target = findTarget(player, parts[1], `/${cmd} [id] [betrag]`);
            if (!target) return;

            const accId = Number(getVar(target, isBank ? "ACCOUNT_ID" : "ACCOUNT_ID", 0));
            if (accId <= 0) {
                systemMessage(player, "Spieler ist nicht eingeloggt.");
                return true;
            }

            const amount = Number(parts[2]);
            if (!Number.isFinite(amount)) {
                systemMessage(player, `Nutze: /${cmd} [id] [betrag]`);
                return true;
            }

            const current = Number(getVar(target, isBank ? "BANK_CASH" : "CASH", 0));
            const next = isAdd ? current + amount : amount;
            const saved = isBank ? await accounts.setBankCash(accId, next) : await accounts.setCash(accId, next);
            if (!saved) {
                systemMessage(player, "Geld konnte nicht gespeichert werden.");
                return true;
            }

            const final = isBank ? saved.bankCash : saved.cash;
            setVar(target, isBank ? "BANK_CASH" : "CASH", final);
            emitClient(target, "client:hud:updateMoney", isBank ? "bank" : "cash", final);
            systemMessage(player, `${isBank ? "Bank" : "Cash"} gesetzt: ${getPlayerName(target)} -> ${formatMoney(final)}`);
            return true;
        }
    });

    adminService.register({
        commandId: "housecreate",
        usage: "/housecreate [name] [interiorKey] [price]",
        description: "Haus an deiner Position erstellen. Streetname wird automatisch erkannt.",
        category: "Housing",
        defaultLevel: 5,
        aliases: ["housecreate"],
        handler: async (player, parts) => {
            const parsed = parseHouseCreateArgs(parts);
            if (!parsed) {
                systemMessage(player, "Nutze: /housecreate [name] [interiorKey] [price]");
                return true;
            }

            const result = await housing.createHouseFromPlayer(player, {
                displayName: parsed.displayName,
                interiorKey: parsed.interiorKey,
                price: parsed.price,
                createdByAccountId: Number(getVar(player, "ACCOUNT_ID", 0)) || null
            });

            if (!result.ok) {
                systemMessage(player, "Interior-Vorlage wurde nicht gefunden.");
                return true;
            }

            systemMessage(player, `Haus erstellt: #${result.house.houseId} ${result.house.displayName} | ${result.template.tierLabel} | ${formatMoney(result.house.price)} | ${result.house.streetName}`);
            await syncHousingDataForAll?.();
            await refreshAdminHousingDataForAllAdmins?.();
            return true;
        }
    });

    adminService.register({
        commandId: "housedelete",
        usage: "/housedelete [id]",
        description: "Ein Haus vollstaendig entfernen.",
        category: "Housing",
        defaultLevel: 10,
        aliases: ["housedelete"],
        handler: async (player, parts) => {
            const houseId = Number(parts[1]);
            if (!Number.isInteger(houseId) || houseId <= 0) {
                systemMessage(player, "Nutze: /housedelete [id]");
                return true;
            }

            const houseRecord = await housing.getById(houseId);
            if (!houseRecord) {
                systemMessage(player, "Haus nicht gefunden.");
                return true;
            }

            const parkedVehicles = await housing.getStoredVehicles(houseId);
            for (const parkedVehicle of parkedVehicles) {
                despawnHouseGarageVehicle?.(parkedVehicle.garageVehicleId);
            }

            const activeHouseVehicles = ((mp as any).vehicles?.toArray?.() ?? []) as any[];
            activeHouseVehicles.forEach((vehicle: any) => {
                if (Number(vehicle.getVariable?.("HOUSE_ORIGIN_HOUSE_ID") ?? 0) === houseId) {
                    vehicle.destroy?.();
                }
            });

            const deleted = await housing.deleteHouse(houseId);
            if (!deleted) {
                systemMessage(player, "Haus konnte nicht geloescht werden.");
                return true;
            }

            forEachPlayer((target: any) => {
                if (Number(getVar(target, "CURRENT_HOUSE_ID", 0)) !== houseId) {
                    return;
                }

                target.dimension = houseRecord.entranceDimension;
                target.position = vector3(houseRecord.entranceX, houseRecord.entranceY, houseRecord.entranceZ);
                setHeading(target, houseRecord.entranceRotZ);
                setVar(target, "CURRENT_HOUSE_ID", 0);
                setVar(target, "HOUSE_STORAGE_OPEN", false);
                setVar(target, "OPEN_HOUSE_STORAGE_ID", 0);
                emitClient(target, "client:housingStorage:hide");
                emitClient(target, "client:housing:forceCloseWardrobe");
                systemMessage(target, "Dein aktuelles Haus wurde entfernt. Du wurdest nach draussen gesetzt.");
            });

            systemMessage(player, `Haus #${houseId} wurde geloescht.`);
            await syncHousingDataForAll?.();
            await refreshAdminHousingDataForAllAdmins?.();
            return true;
        }
    });

    adminService.register({
        commandId: "houselist",
        usage: "/houselist",
        description: "Alle Haeuser mit Grunddaten auflisten.",
        category: "Housing",
        defaultLevel: 5,
        aliases: ["houselist"],
        handler: async (player) => {
            const houses = await housing.getAll();
            if (houses.length === 0) {
                systemMessage(player, "Es sind aktuell keine Haeuser vorhanden.");
                return true;
            }

            systemMessage(player, `Housing: ${houses.length} Haus/Haeuser gefunden.`);
            houses.slice(0, 20).forEach((house: any) => {
                systemMessage(player, `#${house.houseId} | ${house.displayName} | ${house.streetName} | ${house.interiorKey} | ${formatMoney(house.price)} | ${house.ownerName || "Frei"} | HeliPad ${house.hasHelipad ? "Ja" : "Nein"}`);
            });

            if (houses.length > 20) {
                systemMessage(player, `Es werden nur die ersten 20 angezeigt. Insgesamt: ${houses.length}`);
            }
            return true;
        }
    });

    adminService.register({
        commandId: "housegoto",
        usage: "/housegoto [id]",
        description: "Zum Hauseingang teleportieren.",
        category: "Housing",
        defaultLevel: 5,
        aliases: ["housegoto"],
        handler: async (player, parts) => {
            const houseId = Number(parts[1]);
            if (!Number.isInteger(houseId) || houseId <= 0) {
                systemMessage(player, "Nutze: /housegoto [id]");
                return true;
            }

            const house = await housing.getById(houseId);
            if (!house) {
                systemMessage(player, "Haus nicht gefunden.");
                return true;
            }

            player.dimension = house.entranceDimension;
            player.position = vector3(house.entranceX, house.entranceY, house.entranceZ);
            setHeading(player, house.entranceRotZ);
            systemMessage(player, `Teleportiert zu Haus #${house.houseId} ${house.displayName}.`);
            return true;
        }
    });

    for (const parkingType of ["garage", "helipad"] as const) {
        const config = parkingType === "helipad"
            ? {
                commandId: "househelipad",
                usage: "/househelipad [id]",
                description: "HeliPad des Hauses auf deine aktuelle Position setzen und aktivieren.",
                label: "HeliPad",
                updater: housing.updateHelipadPointFromPlayer.bind(housing),
                point: (house: any) => ({
                    x: Number(house.helipadX ?? 0),
                    y: Number(house.helipadY ?? 0),
                    z: Number(house.helipadZ ?? 0),
                    rotZ: Number(house.helipadRotZ ?? 0),
                    dimension: Number(house.entranceDimension ?? 0)
                }),
                successMessage: (houseId: number) => `HeliPad von Haus #${houseId} wurde individuell gesetzt und aktiviert.`
            }
            : {
                commandId: "housegarage",
                usage: "/housegarage [id]",
                description: "Garage des Hauses auf deine aktuelle Position setzen.",
                label: "Garage",
                updater: housing.updateGaragePointFromPlayer.bind(housing),
                point: (house: any) => ({
                    x: Number(house.garageX ?? 0),
                    y: Number(house.garageY ?? 0),
                    z: Number(house.garageZ ?? 0),
                    rotZ: Number(house.garageRotZ ?? 0),
                    dimension: Number(house.entranceDimension ?? 0)
                }),
                successMessage: (houseId: number) => `Garage von Haus #${houseId} wurde individuell gesetzt.`
            };

        adminService.register({
            commandId: config.commandId,
            usage: config.usage,
            description: config.description,
            category: "Housing",
            defaultLevel: 5,
            aliases: [config.commandId],
            handler: async (player, parts) => {
                const houseId = Number(parts[1]);
                if (!Number.isInteger(houseId) || houseId <= 0) {
                    systemMessage(player, `Nutze: ${config.usage}`);
                    return true;
                }

                const house = await housing.getById(houseId);
                if (!house) {
                    systemMessage(player, "Haus nicht gefunden.");
                    return true;
                }

                if (Number(player.dimension ?? 0) !== Number(house.entranceDimension ?? 0)) {
                    systemMessage(player, `${config.label} kann nur in der Exterior-Dimension des Hauses gesetzt werden (${house.entranceDimension}).`);
                    return true;
                }

                const updated = await config.updater(houseId, player);
                if (!updated) {
                    systemMessage(player, `${config.label} konnte nicht aktualisiert werden.`);
                    return true;
                }

                systemMessage(player, config.successMessage(houseId));
                systemMessage(player, `${config.label}-Koordinaten: ${formatPointForChat(config.point(updated))}`);
                await syncHousingDataForAll?.();
                await refreshAdminHousingDataForAllAdmins?.();
                return true;
            }
        });
    }

    for (const pointType of ["entry", "exit", "storage", "wardrobe"] as const) {
        const usageMap = {
            entry: "/houseentry [id]",
            exit: "/houseexit [id]",
            storage: "/housestorage [id]",
            wardrobe: "/housewardrobe [id]"
        } as const;
        const labelMap = {
            entry: "Spawnpunkt im Interior",
            exit: "Interior-Ausgang",
            storage: "Lagerpunkt",
            wardrobe: "Kleiderschrankpunkt"
        } as const;

        adminService.register({
            commandId: `house_${pointType}`,
            usage: usageMap[pointType],
            description: `${labelMap[pointType]} auf deine aktuelle Position setzen.`,
            category: "Housing",
            defaultLevel: 5,
            aliases: [usageMap[pointType].slice(1).split(" ")[0]],
            handler: async (player, parts) => {
                const houseId = Number(parts[1]);
                if (!Number.isInteger(houseId) || houseId <= 0) {
                    systemMessage(player, `Nutze: ${usageMap[pointType]}`);
                    return true;
                }

                const house = await housing.getById(houseId);
                const interior = housing.getInterior(house);
                if (!house || !interior) {
                    systemMessage(player, "Haus oder Interior nicht gefunden.");
                    return true;
                }

                if (Number(player.dimension ?? 0) !== Number(interior.dimension ?? 0)) {
                    systemMessage(player, `Nutze ${usageMap[pointType]} innerhalb des Haus-Interiors (Dimension ${interior.dimension}).`);
                    return true;
                }

                const updated = await housing.updateInteriorPointFromPlayer(houseId, pointType, player);
                if (!updated) {
                    systemMessage(player, `${labelMap[pointType]} konnte nicht aktualisiert werden.`);
                    return true;
                }

                const syncedTemplateLabel = `${interior.label} (${house.interiorKey})`;
                if (pointType === "entry") {
                    systemMessage(
                        player,
                        `Spawnpunkt fuer ${syncedTemplateLabel} wurde gespeichert und auf ${updated.syncedHouseCount} Haus/Haeuser synchronisiert.`
                    );
                    systemMessage(player, `Interior-Ausgang wurde dabei ebenfalls fuer dieses Interior mit angepasst.`);
                    systemMessage(player, `${labelMap[pointType]} Koordinaten: ${formatPointForChat(updated.point)}`);
                } else if (pointType === "storage" || pointType === "wardrobe" || pointType === "exit") {
                    systemMessage(
                        player,
                        `${labelMap[pointType]} fuer ${syncedTemplateLabel} wurde gespeichert und auf ${updated.syncedHouseCount} Haus/Haeuser synchronisiert.`
                    );
                    systemMessage(player, `${labelMap[pointType]} Koordinaten: ${formatPointForChat(updated.point)}`);
                } else {
                    systemMessage(player, `${labelMap[pointType]} fuer ${syncedTemplateLabel} wurde aktualisiert.`);
                }
                await syncHousingDataForAll?.();
                await refreshAdminHousingDataForAllAdmins?.();
                return true;
            }
        });
    }

    adminService.register({
        commandId: "createfaction",
        usage: "/createfaction [typ] [kurz] [iconId] [name] [farbe]",
        description: "Neue Fraktion erstellen.",
        category: "Fraktion",
        defaultLevel: 10,
        handler: async (player, parts) => {
            const result = await factions.create({
                type: (parts[1] || "").toLowerCase() as any,
                shortName: (parts[2] || "").toUpperCase(),
                name: parts[4] || "Neue Fraktion",
                colorHex: parts[5] || "#FFFFFF",
                mapIconId: Number(parts[3] || 0)
            });
            if (result) {
                systemMessage(player, `Erstellt: ${result.name}`);
            }
            return true;
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
                return true;
            }

            const res = await factions.setFactionLeader(factionId, accId);
            if (!res) {
                systemMessage(player, "Fraktion nicht gefunden.");
                return true;
            }

            systemMessage(player, `Leader gesetzt: Acc ${accId} -> Faction ${factionId}`);
            if (syncOnlineFactionMember) {
                await syncOnlineFactionMember(accId);
            }
            return true;
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
            if (res) {
                systemMessage(player, `Rang gesetzt: Acc ${accId} -> Rang ${rank}`);
            }
            if (syncOnlineFactionMember) {
                await syncOnlineFactionMember(accId);
            }
            return true;
        }
    });
}
