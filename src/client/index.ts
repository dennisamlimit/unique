let browser: RageMpBrowser | null = null;
let authCamera: RageMpCamera | null = null;
let pendingBootstrap: unknown = null;
let browserReady = false;
let appliedGender: string | null = null;
let noClipCamera: RageMpCamera | null = null;
let noClipEnabled = false;
let adminPanelOpen = false;
let chatInputOpen = false;
let mainMenuOpen = false;
let deathScreenOpen = false;
let inWorld = false;
let lastHudLocationUpdate = 0;
let lastHudLocationKey = "";
let vehicleOverlayBatch: RageMpEntityOverlayBatch | null = null;
let vehicleOverlaySupported: boolean | null = null;

const headOverlayIds = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const propIds = [0, 1, 2, 6, 7];
const keyCodes = {
  F3: 0x72,
  M: 0x4d,
  T: 0x54,
  X: 0x58,
  W: 0x57,
  A: 0x41,
  S: 0x53,
  D: 0x44,
  Ctrl: 0x11,
  Shift: 0x10,
  Space: 0x20,
  ArrowUp: 0x26,
  Q: 0x51,
  E: 0x45
};

mp.events.add("playerReady", () => {
  mp.events.callRemote("unique:server:clientReady");
});

mp.events.add("unique:client:startAuth", (payloadJson: string) => {
  pendingBootstrap = safeParse(payloadJson);
  showAuthExperience();
});

mp.events.add("unique:client:authError", (payloadJson: string) => {
  sendToUi("auth:error", safeParse(payloadJson));
});

mp.events.add("unique:client:characterError", (payloadJson: string) => {
  sendToUi("characters:error", safeParse(payloadJson));
});

mp.events.add("unique:client:characters", (payloadJson: string) => {
  sendToUi("characters:list", safeParse(payloadJson));
});

mp.events.add("unique:client:spawnOptions", (payloadJson: string) => {
  sendToUi("spawn:options", safeParse(payloadJson));
});

mp.events.add("unique:client:chatPush", (payloadJson: string) => {
  sendToUi("chat:push", safeParse(payloadJson));
});

mp.events.add("unique:client:hudData", (payloadJson: string) => {
  sendToUi("hud:data", safeParse(payloadJson));
});

mp.events.add("unique:client:deathHide", () => {
  deathScreenOpen = false;
  mp.players.local.freezePosition(false);
  mp.gui.cursor.show(adminPanelOpen || chatInputOpen || mainMenuOpen, adminPanelOpen || chatInputOpen || mainMenuOpen);
  sendToUi("death:hide", {});
});

mp.events.add("unique:client:deathShow", (payloadJson: string) => {
  deathScreenOpen = true;
  mp.players.local.freezePosition(true);
  mp.gui.cursor.show(true, true);
  sendToUi("death:show", safeParse(payloadJson));
});

mp.events.add("unique:client:openAdminPanel", () => {
  adminPanelOpen = true;
  mp.gui.cursor.show(true, true);
  sendToUi("admin:open", {});
});

mp.events.add("unique:client:adminPanelData", (payloadJson: string) => {
  sendToUi("admin:data", safeParse(payloadJson));
});

mp.events.add("unique:client:openMainMenu", () => {
  mainMenuOpen = true;
  mp.gui.cursor.show(true, true);
  sendToUi("menu:open", {});
});

mp.events.add("unique:client:toggleNoClip", () => {
  toggleNoClip();
});

mp.events.add("unique:client:stopNoClip", () => {
  if (noClipEnabled) {
    stopNoClip();
  }
});

mp.events.add("unique:client:creatorStarted", (payloadJson: string) => {
  const payload = safeParse(payloadJson);
  runSafely(() => {
    setTimeout(() => runSafely(setupCharacterPreviewCamera), 200);
  });
  sendToUi("creator:start", payload);
});

mp.events.add("unique:client:enterWorld", (payloadJson: string) => {
  const payload = safeParse(payloadJson);
  inWorld = true;
  sendToUi("world:enter", payload);
  closeAuthExperience(false);

  runSafely(() => {
    if (isObject(payload) && isObject(payload.character)) {
      applyAppearance(payload.character.appearance);
    }
  });
});

mp.events.add("unique:cef:ready", () => {
  browserReady = true;
  if (pendingBootstrap) {
    sendToUi("auth:bootstrap", pendingBootstrap);
  }
});

mp.events.add("unique:cef:login", (payloadJson: string) => {
  mp.events.callRemote("unique:server:login", payloadJson);
});

mp.events.add("unique:cef:register", (payloadJson: string) => {
  mp.events.callRemote("unique:server:register", payloadJson);
});

mp.events.add("unique:cef:beginCharacterCreation", (payloadJson: string) => {
  mp.events.callRemote("unique:server:beginCharacterCreation", payloadJson);
});

mp.events.add("unique:cef:createCharacter", (payloadJson: string) => {
  mp.events.callRemote("unique:server:createCharacter", payloadJson);
});

mp.events.add("unique:cef:cancelCharacterCreation", (payloadJson: string) => {
  mp.events.callRemote("unique:server:cancelCharacterCreation", payloadJson);
});

mp.events.add("unique:cef:selectCharacter", (payloadJson: string) => {
  mp.events.callRemote("unique:server:selectCharacter", payloadJson);
});

mp.events.add("unique:cef:chooseSpawn", (payloadJson: string) => {
  mp.events.callRemote("unique:server:chooseSpawn", payloadJson);
});

mp.events.add("unique:cef:deathRespawn", () => {
  deathScreenOpen = false;
  mp.events.callRemote("unique:server:deathRespawn");
});

mp.events.add("unique:cef:chatSubmit", (payloadJson: string) => {
  const payload = safeParse(payloadJson);
  chatInputOpen = false;
  mp.gui.cursor.show(adminPanelOpen || deathScreenOpen || mainMenuOpen, adminPanelOpen || deathScreenOpen || mainMenuOpen);

  if (isObject(payload) && typeof payload.text === "string" && payload.text.trim().startsWith("/")) {
    mp.events.callRemote("unique:server:chatCommand", JSON.stringify({ command: payload.text.trim() }));
    return;
  }

  mp.events.callRemote("unique:server:chatMessage", payloadJson);
});

mp.events.add("unique:cef:chatClose", () => {
  chatInputOpen = false;
  mp.gui.cursor.show(adminPanelOpen || deathScreenOpen || mainMenuOpen, adminPanelOpen || deathScreenOpen || mainMenuOpen);
});

mp.events.add("unique:cef:adminClose", () => {
  adminPanelOpen = false;
  mp.gui.cursor.show(chatInputOpen || deathScreenOpen || mainMenuOpen, chatInputOpen || deathScreenOpen || mainMenuOpen);
});

mp.events.add("unique:cef:mainMenuClose", () => {
  mainMenuOpen = false;
  mp.gui.cursor.show(chatInputOpen || deathScreenOpen || adminPanelOpen, chatInputOpen || deathScreenOpen || adminPanelOpen);
});

mp.events.add("unique:cef:setCommandPermission", (payloadJson: string) => {
  mp.events.callRemote("unique:server:setCommandPermission", payloadJson);
});

mp.events.add("unique:cef:previewAppearance", (payloadJson: string) => {
  runSafely(() => {
    setTimeout(() => runSafely(() => applyAppearance(safeParse(payloadJson))), 250);
  });
});

mp.events.add("unique:cef:focusCreatorCamera", (payloadJson: string) => {
  runSafely(setupCharacterPreviewCamera);
});

function showAuthExperience() {
  inWorld = false;
  if (!browser) {
    browser = mp.browsers.new("package://unique_cef/index.html");
    browserReady = false;
  }

  mp.players.local.freezePosition(true);
  mp.gui.cursor.show(true, true);
  mp.gui.chat.show(false);
  mp.game.ui.displayHud(false);
  mp.game.ui.displayRadar(false);
  setupLosSantosCamera();

  setTimeout(() => {
    if (pendingBootstrap) {
      sendToUi("auth:bootstrap", pendingBootstrap);
    }
  }, 750);
}

function closeAuthExperience(destroyBrowser = true) {
  if (browser && destroyBrowser) {
    browser.destroy();
    browser = null;
  }

  if (destroyBrowser) {
    browserReady = false;
    pendingBootstrap = null;
  }
  mp.gui.cursor.show(false, false);
  mp.gui.chat.show(true);
  mp.game.ui.displayHud(true);
  mp.game.ui.displayRadar(true);
  mp.players.local.freezePosition(false);

  if (authCamera) {
    mp.game.cam.renderScriptCams(false, true, 900, true, false);
    authCamera.setActive(false);
    authCamera.destroy();
    authCamera = null;
  }
}

mp.keys.bind(keyCodes.T, true, () => {
  if (!browser || chatInputOpen || adminPanelOpen || mainMenuOpen) {
    return;
  }
  chatInputOpen = true;
  mp.gui.cursor.show(true, true);
  sendToUi("chat:open", { dead: deathScreenOpen });
  setTimeout(() => {
    browser?.execute("document.querySelector('[data-chat-input]')?.focus();");
  }, 50);
});

mp.keys.bind(keyCodes.F3, true, () => {
  if (!browser || chatInputOpen || deathScreenOpen || mainMenuOpen) {
    return;
  }
  mp.events.callRemote("unique:server:requestAdminPanel");
});

mp.keys.bind(keyCodes.M, true, () => {
  if (!browser || chatInputOpen || adminPanelOpen || deathScreenOpen) {
    return;
  }

  if (mainMenuOpen) {
    mainMenuOpen = false;
    mp.gui.cursor.show(false, false);
    sendToUi("menu:close", {});
    return;
  }

  mainMenuOpen = true;
  mp.gui.cursor.show(true, true);
  sendToUi("menu:open", {});
});

mp.keys.bind(keyCodes.X, true, () => {
  if (mp.keys.isDown(keyCodes.Ctrl) && noClipEnabled) {
    dropNoClipToGround();
    return;
  }

  if (!chatInputOpen && !adminPanelOpen && !deathScreenOpen && !mainMenuOpen) {
    mp.events.callRemote("unique:server:requestNoClip");
  }
});

mp.keys.bind(keyCodes.ArrowUp, true, () => {
  if (chatInputOpen || adminPanelOpen || deathScreenOpen || mainMenuOpen) {
    return;
  }

  const waypoint = getWaypointPosition();
  if (!waypoint) {
    mp.game.graphics.notify("Kein Kartenmarker gesetzt");
    return;
  }

  mp.events.callRemote("unique:server:teleportWaypoint", JSON.stringify(waypoint));
});

mp.events.add("render", () => {
  suppressDefaultHudControls();
  updateNoClip();
  updateHudLocation();
  updateVehicleFocusHint();
});

mp.events.add("playerDeath", () => {
  if (deathScreenOpen) {
    return;
  }
  if (noClipEnabled) {
    stopNoClip();
  }
  deathScreenOpen = true;
  mp.events.callRemote("unique:server:deathStarted");
  mp.players.local.freezePosition(true);
  mp.gui.cursor.show(true, true);
  sendToUi("death:show", { seconds: 150 });
});

function setupLosSantosCamera() {
  if (authCamera) {
    return;
  }

  const camera = mp.cameras.new(
    "default",
    new mp.Vector3(-72.4, -818.2, 326.2),
    new mp.Vector3(-12.0, 0.0, 158.0),
    52
  );
  camera.pointAtCoord(-265.0, -950.0, 150.0);
  camera.setActive(true);
  authCamera = camera;
  mp.game.cam.renderScriptCams(true, true, 1200, true, false);
}

function setupCharacterPreviewCamera() {
  const player = mp.players.local;
  player.freezePosition(true);

  const cameraPosition = new mp.Vector3(-1036.18, -2735.43, 20.9);
  const lookAtPosition = new mp.Vector3(-1037.71, -2737.89, 20.25);

  if (!authCamera) {
    authCamera = mp.cameras.new("creatorCamera", cameraPosition, new mp.Vector3(0, 0, 0), 45);
    authCamera.setActive(true);
  } else {
    authCamera.setCoord(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    authCamera.setFov?.(45);
  }

  authCamera.pointAtCoord(lookAtPosition.x, lookAtPosition.y, lookAtPosition.z);
  mp.game.cam.renderScriptCams(true, false, 0, true, false);
}

function applyAppearance(value: unknown) {
  if (!isObject(value)) {
    return;
  }

  const player = mp.players.local;
  const gender = value.gender === "female" ? "female" : "male";
  const blendData = readNumberArray(value.blendData, [0, 0, 0, 0, 0.5, 0.5]);
  const hair = readNumberArray(value.hair, [0, 0, 0]);
  const beard = readNumberArray(value.beard, [255, 0]);
  const faceFeatures = readNumberArray(value.faceFeatures, Array.from({ length: 20 }, () => 0));
  const headOverlays = readNumberArray(value.headOverlays, Array.from({ length: 12 }, () => -1));
  const headOverlayColors = readNumberArray(value.headOverlayColors, Array.from({ length: 12 }, () => 0));
  const headOverlayOpacities = readNumberArray(value.headOverlayOpacities, Array.from({ length: 12 }, () => 1));
  const clothing = readNumberArray(value.clothing, [0, 0, 0, 15, 0, 0, 1, 0, 15, 0, 0, 15]);
  const clothingTextures = readNumberArray(value.clothingTextures, Array.from({ length: 12 }, () => 0));
  const props = readNumberArray(value.props, Array.from({ length: 5 }, () => -1));
  const propTextures = readNumberArray(value.propTextures, Array.from({ length: 5 }, () => 0));

  if (appliedGender !== gender) {
    setFreemodeModel(gender);
    appliedGender = gender;
  }

  player.setHeadBlendData(
    Math.trunc(blendData[0]),
    Math.trunc(blendData[1]),
    0,
    Math.trunc(blendData[2] ?? blendData[0]),
    Math.trunc(blendData[3] ?? blendData[1]),
    0,
    Number(blendData[4] ?? 0.5),
    Number(blendData[5] ?? 0.5),
    0,
    true
  );
  player.setEyeColor(Math.trunc(readNumber(value.eyeColor, 0)));
  player.setComponentVariation(2, Math.trunc(hair[0]), 0, 0);
  player.setHairColor(Math.trunc(hair[1]), Math.trunc(hair[2] ?? hair[1]));
  player.setHeadOverlay(1, Math.trunc(beard[0]), beard[0] === 255 ? 0 : 1, Math.trunc(beard[1]), Math.trunc(beard[1]));

  headOverlayIds.forEach((overlayId, index) => {
    const overlayValue = Math.trunc(headOverlays[index]);
    const color = Math.trunc(headOverlayColors[index]);
    const opacity = Number(headOverlayOpacities[index]);
    player.setHeadOverlay(overlayId, overlayValue, overlayValue < 0 ? 0 : opacity, color, color);
  });

  faceFeatures.forEach((feature, index) => {
    player.setFaceFeature(index, Number(feature));
  });

  clothing.forEach((drawable, componentId) => {
    if (componentId === 0 || componentId === 2) {
      return;
    }
    player.setComponentVariation(componentId, Math.trunc(drawable), Math.trunc(clothingTextures[componentId] ?? 0), 0);
  });

  propIds.forEach((propId, index) => {
    const drawable = Math.trunc(props[index]);
    if (drawable < 0) {
      player.clearProp(propId);
      return;
    }

    player.setPropIndex(propId, drawable, Math.trunc(propTextures[index] ?? 0), true);
  });
}

function setFreemodeModel(gender: string) {
  const modelName = gender === "female" ? "mp_f_freemode_01" : "mp_m_freemode_01";
  const game = mp.game as unknown as {
    joaat?: (modelName: string) => number;
  };
  const modelHash = game.joaat?.(modelName) ?? (gender === "female" ? -1667301416 : 1885233650);
  mp.players.local.model = modelHash;
}

function suppressDefaultHudControls() {
  mp.gui.chat.show(false);
  mp.game.ui.displayHud(false);
  mp.game.controls.disableControlAction(0, 12, true);
  mp.game.controls.disableControlAction(0, 13, true);
  mp.game.controls.disableControlAction(0, 14, true);
  mp.game.controls.disableControlAction(0, 15, true);
  mp.game.controls.disableControlAction(0, 16, true);
  mp.game.controls.disableControlAction(0, 17, true);
  mp.game.controls.disableControlAction(0, 36, true);
  mp.game.controls.disableControlAction(0, 37, true);
  mp.game.controls.disableControlAction(0, 157, true);
  mp.game.controls.disableControlAction(0, 158, true);
  mp.game.controls.disableControlAction(0, 159, true);
  mp.game.controls.disableControlAction(0, 160, true);
  mp.game.controls.disableControlAction(0, 161, true);
  mp.game.controls.disableControlAction(0, 162, true);
  mp.game.controls.disableControlAction(0, 163, true);
  mp.game.controls.disableControlAction(0, 164, true);
  mp.game.controls.disableControlAction(0, 165, true);
}

function toggleNoClip() {
  if (noClipEnabled) {
    stopNoClip();
    return;
  }

  startNoClip();
}

function startNoClip() {
  const player = mp.players.local;
  const position = player.position;
  noClipCamera = mp.cameras.new("noclipCamera", new mp.Vector3(position.x, position.y, position.z + 0.6), player.getRotation(2), 45);
  noClipCamera.setActive(true);
  mp.game.cam.renderScriptCams(true, false, 0, true, false);
  player.freezePosition(true);
  player.setInvincible?.(true);
  player.setVisible?.(false, false);
  player.setCollision?.(false, false);
  noClipEnabled = true;
  mp.game.graphics.notify("NoClip aktiviert");
}

function stopNoClip(positionOverride?: RageMpVector3) {
  const player = mp.players.local;
  const cameraPosition = positionOverride ?? noClipCamera?.getCoord?.();
  const cameraRotation = noClipCamera?.getRot?.(2);

  if (cameraPosition) {
    player.position = cameraPosition;
  }
  if (cameraRotation) {
    player.setHeading?.(cameraRotation.z);
  }
  if (noClipCamera) {
    noClipCamera.destroy();
    noClipCamera = null;
  }
  mp.game.cam.renderScriptCams(false, false, 0, true, false);
  player.freezePosition(false);
  player.setInvincible?.(false);
  player.setVisible?.(true, false);
  player.setCollision?.(true, false);
  noClipEnabled = false;
  mp.game.graphics.notify("NoClip deaktiviert");
}

function dropNoClipToGround() {
  const cameraPosition = noClipCamera?.getCoord?.();
  if (!cameraPosition) {
    stopNoClip();
    return;
  }

  const ground = findGroundZ(cameraPosition);
  stopNoClip(new mp.Vector3(cameraPosition.x, cameraPosition.y, ground + 1.0));
}

function findGroundZ(position: RageMpVector3) {
  const gameplay = mp.game.gameplay as unknown as {
    getGroundZFor3dCoord?: (x: number, y: number, z: number, groundZ: number, ignoreWater: boolean) => number;
  } | undefined;

  if (gameplay?.getGroundZFor3dCoord) {
    for (let z = Math.max(position.z + 50, 1000); z > position.z - 300; z -= 10) {
      const ground = gameplay.getGroundZFor3dCoord(position.x, position.y, z, 0, false);
      if (Number.isFinite(ground) && ground !== 0) {
        return ground;
      }
    }
  }

  return Math.max(0, position.z - 1);
}

function getWaypointPosition() {
  const ui = mp.game.ui as unknown as {
    getFirstBlipInfoId?: (blipSprite: number) => number;
    doesBlipExist?: (blip: number) => boolean;
    getBlipInfoIdCoord?: (blip: number) => RageMpVector3;
  };
  const waypointBlip = ui.getFirstBlipInfoId?.(8) ?? 0;
  if (!waypointBlip || ui.doesBlipExist?.(waypointBlip) === false) {
    return null;
  }

  const coord = ui.getBlipInfoIdCoord?.(waypointBlip);
  if (!coord) {
    return null;
  }

  const groundZ = findGroundZ(new mp.Vector3(coord.x, coord.y, 0));
  return {
    x: coord.x,
    y: coord.y,
    z: groundZ + 1.0
  };
}

function updateHudLocation() {
  if (!inWorld || !browser || !browserReady) {
    return;
  }

  const now = Date.now();
  if (now - lastHudLocationUpdate < 900) {
    return;
  }
  lastHudLocationUpdate = now;

  const position = mp.players.local.position;
  if (!position) {
    return;
  }

  const location = getLocationName(position);
  const key = `${location.street}|${location.crossing}|${location.area}`;
  if (key === lastHudLocationKey) {
    return;
  }

  lastHudLocationKey = key;
  sendToUi("hud:location", location);
}

function getLocationName(position: RageMpVector3) {
  const ui = mp.game.ui;
  const streetHashes = mp.game.pathfind?.getStreetNameAtCoord?.(position.x, position.y, position.z, 0, 0);
  const street = streetHashes?.streetName && ui.getStreetNameFromHashKey
    ? ui.getStreetNameFromHashKey(streetHashes.streetName)
    : "";
  const crossing = streetHashes?.crossingRoad && ui.getStreetNameFromHashKey
    ? ui.getStreetNameFromHashKey(streetHashes.crossingRoad)
    : "";
  const zoneKey = mp.game.zone?.getNameOfZone?.(position.x, position.y, position.z) ?? "";
  const zoneLabel = zoneKey && ui.getLabelText ? ui.getLabelText(zoneKey) : "";

  return {
    street: sanitizeGameLabel(street) || "Unbekannte Strasse",
    crossing: sanitizeGameLabel(crossing),
    area: sanitizeGameLabel(zoneLabel) || sanitizeGameLabel(zoneKey) || "Los Santos"
  };
}

function sanitizeGameLabel(value: unknown) {
  const text = String(value ?? "").trim();
  return text && text !== "NULL" ? text : "";
}

function updateVehicleFocusHint() {
  if (!inWorld || chatInputOpen || adminPanelOpen || deathScreenOpen || mainMenuOpen || mp.players.local.vehicle) {
    return;
  }

  const vehicle = findVehicleInView();
  if (!vehicle) {
    return;
  }

  drawVehicleOutline(vehicle);
  drawVehicleArrow(vehicle);
}

function findVehicleInView() {
  const origin = getCameraOrigin();
  const direction = getCameraDirection();
  let bestVehicle: RageMpVehicle | null = null;
  let bestScore = -999;

  getStreamedVehicles().forEach((vehicle) => {
    const aim = getVehicleAimScore(vehicle, origin, direction);
    if (aim > bestScore) {
      bestScore = aim;
      bestVehicle = vehicle;
    }
  });

  return bestVehicle;
}

function getStreamedVehicles() {
  const vehicles: RageMpVehicle[] = [];
  const collect = (vehicle: RageMpVehicle) => {
    if (vehicle?.position) {
      vehicles.push(vehicle);
    }
  };

  try {
    mp.vehicles?.forEachInStreamRange?.(collect);
  } catch {}

  try {
    if (vehicles.length === 0) {
      mp.vehicles?.forEach?.(collect);
    }
  } catch {}

  try {
    if (vehicles.length === 0) {
      mp.vehicles?.toArray?.().forEach(collect);
    }
  } catch {}

  return vehicles;
}

function getVehicleAimScore(vehicle: RageMpVehicle, origin: RageMpVector3, direction: RageMpVector3) {
  const target = new mp.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z + 0.65);
  const distance = getDistance(origin, target);
  if (distance > 8.0) {
    return -999;
  }

  const toVehicle = normalizeVector(new mp.Vector3(target.x - origin.x, target.y - origin.y, target.z - origin.z));
  const alignment = direction.x * toVehicle.x + direction.y * toVehicle.y + direction.z * toVehicle.z;
  if (alignment < 0.72) {
    return -999;
  }

  const forwardDistance = distance * alignment;
  const sideDistance = Math.sqrt(Math.max(0, distance * distance - forwardDistance * forwardDistance));
  if (sideDistance > 1.4 + distance * 0.09) {
    return -999;
  }

  return alignment * 2.0 - sideDistance * 0.32 - distance * 0.035;
}

function getCameraDirection() {
  const rotation = mp.game.cam.getGameplayCamRot?.(2) ?? new mp.Vector3(0, 0, mp.players.local.heading ?? 0);
  const pitch = rotation.x * Math.PI / 180;
  const yaw = rotation.z * Math.PI / 180;
  const cosPitch = Math.cos(pitch);
  return normalizeVector(new mp.Vector3(-Math.sin(yaw) * cosPitch, Math.cos(yaw) * cosPitch, Math.sin(pitch)));
}

function getCameraOrigin() {
  try {
    const cameraPosition = mp.game.cam.getGameplayCamCoord?.();
    if (cameraPosition) {
      return cameraPosition;
    }
  } catch {}

  const position = mp.players.local.position;
  return new mp.Vector3(position.x, position.y, position.z + 0.9);
}

function ensureVehicleOverlayBatch() {
  if (vehicleOverlaySupported === false) {
    return null;
  }

  if (vehicleOverlayBatch) {
    try {
      vehicleOverlayBatch.update?.(getVehicleOutlineParams());
    } catch {}
    return vehicleOverlayBatch;
  }

  try {
    if (mp.game.graphics.setEntityOverlayPassEnabled && mp.game.graphics.createEntityOverlayBatch) {
      mp.game.graphics.setEntityOverlayPassEnabled(true);
      vehicleOverlayBatch = mp.game.graphics.createEntityOverlayBatch(getVehicleOutlineParams());
      vehicleOverlaySupported = Boolean(vehicleOverlayBatch);
      return vehicleOverlayBatch;
    }
  } catch {
    vehicleOverlaySupported = false;
    return null;
  }

  vehicleOverlaySupported = false;
  return null;
}

function drawVehicleOutline(vehicle: RageMpVehicle) {
  const batch = ensureVehicleOverlayBatch();
  if (!batch) {
    return;
  }

  try {
    batch.addThisFrame(vehicle);
  } catch {
    vehicleOverlaySupported = false;
  }
}

function drawVehicleArrow(vehicle: RageMpVehicle) {
  const position = vehicle.position;
  try {
    mp.game.graphics.drawMarker(
      2,
      position.x,
      position.y,
      position.z + 1.85,
      0,
      0,
      0,
      0,
      180,
      0,
      0.34,
      0.34,
      0.34,
      255,
      255,
      255,
      235,
      false,
      true,
      2,
      false,
      null,
      null,
      false
    );
  } catch {}
}

function getVehicleOutlineParams() {
  return {
    enableDepth: false,
    deleteWhenUnused: false,
    keepNonBlurred: true,
    processAttachments: false,
    fill: { enable: false, color: 0xffffffff },
    noise: { enable: false, size: 0, speed: 0, intensity: 0 },
    outline: { enable: true, color: toOverlayColorHex(255, 255, 255, 190), width: 2.0, blurRadius: 0.35, blurIntensity: 0.42 },
    wireframe: { enable: false }
  };
}

function toOverlayColorHex(r: number, g: number, b: number, a: number) {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

function normalizeVector(vector: RageMpVector3) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) || 1;
  return new mp.Vector3(vector.x / length, vector.y / length, vector.z / length);
}

function getDistance(a: RageMpVector3, b: RageMpVector3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function updateNoClip() {
  if (!noClipEnabled || !noClipCamera || chatInputOpen || adminPanelOpen) {
    return;
  }

  const cameraPosition = noClipCamera.getCoord?.();
  const cameraRotation = noClipCamera.getRot?.(2);
  const direction = noClipCamera.getDirection?.();
  if (!cameraPosition || !cameraRotation || !direction) {
    return;
  }

  const speed = mp.keys.isDown(keyCodes.Shift) ? 1.75 : mp.keys.isDown(keyCodes.Ctrl) ? 0.14 : 0.55;
  const lookX = mp.game.controls.getDisabledControlNormal(0, 220);
  const lookY = mp.game.controls.getDisabledControlNormal(0, 221);
  const moveX = (mp.keys.isDown(keyCodes.D) ? 1 : 0) - (mp.keys.isDown(keyCodes.A) ? 1 : 0);
  const moveY = (mp.keys.isDown(keyCodes.W) ? 1 : 0) - (mp.keys.isDown(keyCodes.S) ? 1 : 0);
  const right = getRightVector(direction);
  const up = (mp.keys.isDown(keyCodes.Q) || mp.keys.isDown(keyCodes.Space) ? speed : 0) - (mp.keys.isDown(keyCodes.E) ? speed : 0);

  const next = new mp.Vector3(
    cameraPosition.x + direction.x * moveY * speed + right.x * moveX * speed,
    cameraPosition.y + direction.y * moveY * speed + right.y * moveX * speed,
    cameraPosition.z + direction.z * moveY * speed + up
  );

  noClipCamera.setCoord(next.x, next.y, next.z);
  noClipCamera.setRot?.(
    cameraRotation.x + lookY * -5,
    0,
    cameraRotation.z + lookX * -5,
    2
  );
  mp.players.local.position = next;
}

function getRightVector(direction: RageMpVector3) {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z) || 1;
  return {
    x: direction.y / length,
    y: -direction.x / length,
    z: 0
  };
}

function sendToUi(type: string, payload: unknown) {
  if (!browser || !browserReady) {
    return;
  }

  browser.execute(`window.uniqueBridge?.receive(${JSON.stringify({ type, payload })});`);
}

function runSafely(action: () => void) {
  try {
    action();
  } catch (error) {
    mp.gui.chat.push(`[Unique] Clientfehler: ${String(error)}`);
  }
}

function safeParse(payloadJson: string) {
  try {
    return JSON.parse(payloadJson);
  } catch {
    return {};
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readNumberArray(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return fallback.map((fallbackValue, index) => readNumber(value[index], fallbackValue));
}

function readNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
