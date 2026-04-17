import type { FactionEventDeps } from "./faction-admin-commands.js";
import type { PlayerMp } from "../../runtime/helpers.js";

export function registerFactionCefEvents(deps: FactionEventDeps) {
  const { factions, logError, systemMessage, getVar, spawnFactionVehicle, despawnFactionVehicle } = deps;

  mp.events.add("server:orga:getCatalog", async (player: PlayerMp) => {
    try {
      const catalog = await factions.getVehicleCatalog();
      player.call("client:orga:setCatalog", [JSON.stringify(catalog)]);
    } catch (error) {
      logError("getCatalog failed", error);
    }
  });

  mp.events.add("server:orga:buyVehicle", async (player: PlayerMp, catalogId: number) => {
    const accountId = Number(getVar(player, "ACCOUNT_ID", 0));
    const factionId = Number(getVar(player, "FACTION_ID", 0));

    if (accountId <= 0 || factionId <= 0) return;

    // Check permission
    const permissions = await factions.getAccountPermissions(accountId);
    if (!permissions.some((p) => p.permissionKey === "manage_vehicles")) {
      systemMessage(player, "Du hast keine Berechtigung, Fahrzeuge zu kaufen.");
      return;
    }

    try {
      const result = await factions.buyVehicle(factionId, catalogId, player);
      if (!result.ok) {
        systemMessage(player, result.reason === "insufficient_funds" ? "Die Organisation hat nicht genug Geld." : "Kauf fehlgeschlagen.");
        return;
      }

      systemMessage(player, `Fahrzeug ${result.vehicle.displayName} gekauft.`);

      // Update CEF with new balance and vehicles
      const vehicles = await factions.getFactionVehicles(factionId);
      player.call("client:orga:updateVehicles", [JSON.stringify(vehicles), result.newBalance]);
    } catch (error) {
      logError("buyVehicle failed", error);
    }
  });

  mp.events.add("server:orga:spawnVehicle", async (player: PlayerMp, factionVehicleId: number) => {
    const factionId = Number(getVar(player, "FACTION_ID", 0));
    if (factionId <= 0) return;

    try {
      const vehicle = await factions.getFactionVehicleById(factionVehicleId);
      if (!vehicle || vehicle.factionId !== factionId) return;

      if (vehicle.isSpawned) {
        systemMessage(player, "Dieses Fahrzeug ist bereits in der Welt.");
        return;
      }

      await factions.setVehicleSpawnedStatus(factionVehicleId, true);
      await spawnFactionVehicle?.(factionVehicleId);

      systemMessage(player, `Fahrzeug ${vehicle.displayName} wurde an seiner Parkposition bereitgestellt.`);

      const vehicles = await factions.getFactionVehicles(factionId);
      player.call("client:orga:updateVehiclesOnly", [JSON.stringify(vehicles)]);
    } catch (error) {
      logError("spawnVehicle failed", error);
    }
  });

  mp.events.add("server:orga:parkVehicle", async (player: PlayerMp, factionVehicleId: number) => {
    const factionId = Number(getVar(player, "FACTION_ID", 0));
    if (factionId <= 0) return;

    try {
      const vehicle = await factions.getFactionVehicleById(factionVehicleId);
      if (!vehicle || vehicle.factionId !== factionId) return;

      const playerVeh = player.vehicle;
      if (playerVeh && Number(playerVeh.getVariable("FACTION_VEHICLE_ID")) === factionVehicleId) {
        await factions.parkFactionVehicleFromPlayer(factionVehicleId, player);
        systemMessage(player, "Fahrzeug wurde hier geparkt.");

        const vehicles = await factions.getFactionVehicles(factionId);
        player.call("client:orga:updateVehiclesOnly", [JSON.stringify(vehicles)]);
      } else {
        despawnFactionVehicle?.(factionVehicleId);
        await factions.setVehicleSpawnedStatus(factionVehicleId, false);
        systemMessage(player, "Fahrzeug wurde eingeparkt (despawned).");

        const vehicles = await factions.getFactionVehicles(factionId);
        player.call("client:orga:updateVehiclesOnly", [JSON.stringify(vehicles)]);
      }
    } catch (error) {
      logError("parkVehicle failed", error);
    }
  });

}
