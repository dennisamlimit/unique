(() => {
  // client_src/dl/index.ts
  var dlEnabled = false;
  var REQUIRED_ADMIN_LEVEL = 2;
  var UNIQUE_PURPLE = [217, 70, 239, 220];
  var TEXT_WHITE = [255, 255, 255, 190];
  function getAdminLevel() {
    try {
      return Number(mp.players.local.getVariable("ADMIN_LEVEL")) || 0;
    } catch (error) {
      return 0;
    }
  }
  function isAdminModeEnabled() {
    try {
      return !!mp.players.local.getVariable("ADMIN_MODE");
    } catch (error) {
      return false;
    }
  }
  function isAllowedToUseDl(showMessage) {
    const level = getAdminLevel();
    if (level < REQUIRED_ADMIN_LEVEL) {
      if (showMessage) {
        mp.events.call("client:chat:addMessage", "system", "System", `DL benoetigt Admin-Level ${REQUIRED_ADMIN_LEVEL}.`);
      }
      return false;
    }
    if (!isAdminModeEnabled()) {
      if (showMessage) {
        mp.events.call("client:chat:addMessage", "system", "System", "Aktiviere zuerst deinen Admin-Modus mit /admin.");
      }
      return false;
    }
    return true;
  }
  function getStreamedVehicles(callback) {
    try {
      if (mp.vehicles && typeof mp.vehicles.forEachInStreamRange === "function") {
        mp.vehicles.forEachInStreamRange(callback);
        return;
      }
    } catch (error) {
    }
    try {
      if (mp.vehicles && typeof mp.vehicles.forEach === "function") {
        mp.vehicles.forEach(callback);
        return;
      }
    } catch (error) {
    }
    try {
      if (mp.vehicles && typeof mp.vehicles.toArray === "function") {
        mp.vehicles.toArray().forEach(callback);
      }
    } catch (error) {
    }
  }
  function getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  function getVehicleName(vehicle) {
    try {
      const displayName = mp.game.vehicle.getDisplayNameFromVehicleModel(vehicle.model);
      const label = mp.game.ui.getLabelText(displayName);
      return label && label !== "NULL" ? label : displayName;
    } catch (error) {
      return "Unknown";
    }
  }
  function worldToScreen(position) {
    try {
      if (mp.game.graphics && typeof mp.game.graphics.world3dToScreen2d === "function") {
        const screen = mp.game.graphics.world3dToScreen2d(position.x, position.y, position.z);
        if (screen && Number.isFinite(screen.x) && Number.isFinite(screen.y)) {
          return screen;
        }
      }
    } catch (error) {
    }
    try {
      if (mp.game.graphics && typeof mp.game.graphics.getScreenCoordFromWorldCoord === "function") {
        const screen = mp.game.graphics.getScreenCoordFromWorldCoord(position.x, position.y, position.z);
        if (screen && Number.isFinite(screen.x) && Number.isFinite(screen.y)) {
          return screen;
        }
      }
    } catch (error) {
    }
    return null;
  }
  function drawDlText(text, position, yOffset, color) {
    const screen = worldToScreen({ x: position.x, y: position.y, z: position.z + 0.45 + yOffset });
    if (!screen) {
      return;
    }
    try {
      mp.game.graphics.drawText(text, [screen.x, screen.y], {
        font: 0,
        color,
        scale: [0.25, 0.25],
        outline: true,
        centre: false
      });
    } catch (error) {
    }
  }
  function drawVehicleInfo(vehicle) {
    try {
      if (!vehicle || !vehicle.position) {
        return;
      }
      const playerPosition = mp.players.local.position;
      if (getDistance(playerPosition, vehicle.position) > 10) {
        return;
      }
      const position = vehicle.position;
      const remoteId = Number.isFinite(vehicle.remoteId) ? vehicle.remoteId : "-";
      const heading = typeof vehicle.getHeading === "function" ? vehicle.getHeading().toFixed(2) : "-";
      const health = typeof vehicle.getHealth === "function" ? vehicle.getHealth() : "-";
      drawDlText("DL", position, 0, UNIQUE_PURPLE);
      drawDlText(`Id: ${remoteId}`, position, -0.18, TEXT_WHITE);
      drawDlText(`Model: ${getVehicleName(vehicle)}`, position, -0.36, TEXT_WHITE);
      drawDlText(`Pos: ${Number(position.x).toFixed(2)}, ${Number(position.y).toFixed(2)}, ${Number(position.z).toFixed(2)}`, position, -0.54, TEXT_WHITE);
      drawDlText(`Heading: ${heading}`, position, -0.72, TEXT_WHITE);
      drawDlText(`Health: ${health}`, position, -0.9, TEXT_WHITE);
    } catch (error) {
    }
  }
  function toggleDl() {
    if (!isAllowedToUseDl(true)) {
      dlEnabled = false;
      return;
    }
    dlEnabled = !dlEnabled;
    const stateText = dlEnabled ? "aktiviert" : "deaktiviert";
    mp.events.call("client:chat:addMessage", "admin", "DL", `Fahrzeug-DL ${stateText}.`);
  }
  mp.events.add("playerCommand", (...args) => {
    const [command] = args;
    const parts = String(command || "").trim().split(/\s+/);
    const name = (parts[0] || "").toLowerCase();
    if (name !== "dl") {
      return;
    }
    toggleDl();
  });
  mp.events.add("client:dl:toggle", () => {
    toggleDl();
  });
  mp.events.add("render", () => {
    if (!dlEnabled) {
      return;
    }
    if (!isAllowedToUseDl(false)) {
      dlEnabled = false;
      return;
    }
    try {
      getStreamedVehicles(drawVehicleInfo);
    } catch (error) {
      dlEnabled = false;
      try {
        mp.events.call("client:chat:addMessage", "system", "DL", "DL wurde wegen eines Client-Fehlers deaktiviert.");
      } catch (chatError) {
      }
    }
  });
})();
