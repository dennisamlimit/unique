(() => {
  // client_src/shared/browser-manager.ts
  function createBrowserState() {
    return {
      browser: null,
      isReady: false,
      pendingActions: [],
      readyProbe: null
    };
  }
  function initBrowser(state2, options) {
    if (state2.browser) return;
    state2.browser = mp.browsers.new(options.htmlPath);
    state2.browser.active = options.active ?? false;
  }
  function ensureBrowserInitialized(state2, options) {
    initBrowser(state2, options);
    if (options.appName && options.readyProbe !== false) {
      startReadyProbe(state2, options.appName, options.readyProbe || void 0);
    }
    return state2.browser;
  }
  function stopReadyProbe(state2) {
    if (!state2.readyProbe) return;
    clearInterval(state2.readyProbe);
    state2.readyProbe = null;
  }
  function startReadyProbe(state2, appName, options) {
    stopReadyProbe(state2);
    const windowKey = (options == null ? void 0 : options.windowReadyKey) ?? `${appName}App`;
    state2.readyProbe = setInterval(() => {
      if (!state2.browser || state2.isReady) {
        stopReadyProbe(state2);
        return;
      }
      state2.browser.execute(`
      if (window.${windowKey} && !window.__${appName}ReadyNotified) {
        window.__${appName}ReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:${appName}:ready");
        }
      }
    `);
    }, 300);
  }
  function flushPending(state2) {
    if (!state2.browser || !state2.isReady) return;
    while (state2.pendingActions.length > 0) {
      state2.browser.execute(state2.pendingActions.shift());
    }
  }
  function markBrowserReady(state2) {
    if (state2.isReady) {
      return false;
    }
    state2.isReady = true;
    stopReadyProbe(state2);
    flushPending(state2);
    return true;
  }
  function executeInBrowser(state2, js) {
    if (!state2.browser || !state2.isReady) {
      state2.pendingActions.push(js);
      return;
    }
    state2.browser.execute(js);
  }

  // client_src/auth/index.ts
  var browserState = createBrowserState();
  var state = {
    currentCam: null,
    nextCam: null,
    authVisible: false,
    switchTimer: null,
    camState: 0,
    lastCharactersJson: null
  };
  var creatorState = {
    opened: false,
    cam: null,
    camStart: null
  };
  var FEMALE_FREEMODE_MODEL = mp.game.joaat("mp_f_freemode_01");
  var MALE_DEFAULT_CLOTHING = [[15, 0], [15, 0], [21, 0], [34, 0]];
  var FEMALE_DEFAULT_CLOTHING = [[15, 0], [15, 0], [19, 0], [35, 0]];
  var cinematicCams = [
    // Downtown LS skyline from the east
    {
      pos: new mp.Vector3(431.5, -833, 85),
      look: new mp.Vector3(-75, -818, 40),
      fov: 55
    },
    // Vinewood Hills overview
    {
      pos: new mp.Vector3(-378, 335, 175),
      look: new mp.Vector3(-250, 160, 70),
      fov: 48
    },
    // Del Perro Pier / Beach low angle
    {
      pos: new mp.Vector3(-1637, -953, 18),
      look: new mp.Vector3(-1420, -1080, 13),
      fov: 60
    },
    // Port of LS crane shot
    {
      pos: new mp.Vector3(534, -2850, 90),
      look: new mp.Vector3(260, -2650, 10),
      fov: 50
    },
    // Mirror Park lake reflection
    {
      pos: new mp.Vector3(1221, -1397, 42),
      look: new mp.Vector3(1100, -1260, 35),
      fov: 44
    },
    // LS City from north hills (epic cityscape)
    {
      pos: new mp.Vector3(-534, -1880, 125),
      look: new mp.Vector3(-188, -1020, 85),
      fov: 46
    },
    // Freeway traffic overhead
    {
      pos: new mp.Vector3(-183, -1250, 55),
      look: new mp.Vector3(-190, -1150, 30),
      fov: 65
    },
    // Rockford Hills low cruising shot
    {
      pos: new mp.Vector3(-670, -5, 58),
      look: new mp.Vector3(-500, -80, 42),
      fov: 52
    }
  ];
  function ensureBrowser() {
    if (browserState.browser) return;
    ensureBrowserInitialized(browserState, {
      htmlPath: "package://auth/auth.html",
      active: true,
      appName: "auth"
    });
  }
  function createCam(name, data) {
    const cam = mp.cameras.new(name, data.pos, new mp.Vector3(0, 0, 0), data.fov);
    cam.pointAtCoord(data.look.x, data.look.y, data.look.z);
    return cam;
  }
  function destroyCam(cam) {
    if (!cam) {
      return;
    }
    cam.setActive(false);
    cam.destroy(true);
  }
  function stopCinematicCam() {
    if (state.switchTimer) {
      clearInterval(state.switchTimer);
      state.switchTimer = null;
    }
    destroyCam(state.currentCam);
    destroyCam(state.nextCam);
    state.currentCam = null;
    state.nextCam = null;
    cleanupIntroNpcs();
    mp.game.cam.renderScriptCams(false, true, 1500, true, false);
  }
  var NPC_MODELS = [
    "a_m_y_business_01",
    "a_f_y_business_02",
    "a_m_m_business_01",
    "a_m_y_cyclist_01",
    "a_m_y_skater_01",
    "a_f_y_tourist_01",
    "a_m_y_hipster_01",
    "a_f_m_fatbath_01"
  ];
  var introNpcs = [];
  function cleanupIntroNpcs() {
    for (const ped of introNpcs) {
      try {
        ped.destroy();
      } catch (_) {
      }
    }
    introNpcs = [];
  }
  function spawnIntroNpcs(cam) {
    cleanupIntroNpcs();
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const model = NPC_MODELS[Math.floor(Math.random() * NPC_MODELS.length)];
      const ox = (Math.random() - 0.5) * 10;
      const oy = (Math.random() - 0.5) * 10;
      try {
        const pos = new mp.Vector3(cam.look.x + ox, cam.look.y + oy, cam.look.z);
        const ped = mp.peds.new(mp.game.joaat(model), pos, Math.random() * 360, 0);
        try {
          ped.taskWanderStandard(10, 10);
        } catch (_) {
        }
        introNpcs.push(ped);
      } catch (_) {
      }
    }
  }
  function startCinematicCam() {
    stopCinematicCam();
    try {
      mp.game.misc.setWeatherTypePersist("EXTRASUNNY");
      mp.game.clock.setDateTime(2024, 1, 1, 18, 30, 0);
    } catch (_) {
    }
    state.camState = Math.floor(Math.random() * cinematicCams.length);
    state.currentCam = createCam("authCam0", cinematicCams[state.camState]);
    state.currentCam.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 2500, true, false);
    spawnIntroNpcs(cinematicCams[state.camState]);
    state.switchTimer = setInterval(() => {
      if (!state.authVisible || !state.currentCam) {
        return;
      }
      const nextIndex = (state.camState + 1) % cinematicCams.length;
      state.nextCam = createCam(`authCam${nextIndex}`, cinematicCams[nextIndex]);
      state.nextCam.setActiveWithInterp(state.currentCam.handle, 6500, 1, 1);
      const previousCam = state.currentCam;
      state.currentCam = state.nextCam;
      state.nextCam = null;
      state.camState = nextIndex;
      setTimeout(() => {
        spawnIntroNpcs(cinematicCams[nextIndex]);
        destroyCam(previousCam);
      }, 3500);
    }, 11e3);
  }
  function ensureAuthCursor() {
    if (!state.authVisible) {
      return;
    }
    if (browserState.browser) {
      browserState.browser.active = true;
    }
    mp.gui.cursor.show(true, true);
  }
  function hideAuthCursor() {
    mp.gui.cursor.show(false, false);
  }
  function getCameraOffset(pos, angle, dist) {
    const radians = angle * 0.0174533;
    pos.y = pos.y + dist * Math.sin(radians);
    pos.x = pos.x + dist * Math.cos(radians);
    return pos;
  }
  function getDefaultCreatorClothingForModel(model) {
    return model === FEMALE_FREEMODE_MODEL ? FEMALE_DEFAULT_CLOTHING : MALE_DEFAULT_CLOTHING;
  }
  function applyDefaultCreatorClothing(player) {
    const defaults = getDefaultCreatorClothingForModel(Number(player.model));
    player.setComponentVariation(11, Number(defaults[0][0]), Number(defaults[0][1]), 0);
    player.setComponentVariation(3, 15, 0, 0);
    player.setComponentVariation(8, Number(defaults[1][0]), Number(defaults[1][1]), 0);
    player.setComponentVariation(4, Number(defaults[2][0]), Number(defaults[2][1]), 0);
    player.setComponentVariation(6, Number(defaults[3][0]), Number(defaults[3][1]), 0);
  }
  function setCreatorCamera(flag) {
    if (!creatorState.cam || !creatorState.camStart) {
      return;
    }
    let camValues = { angle: 0, dist: 2.6, height: 0.2 };
    if (flag === 1) camValues = { angle: 0, dist: 1, height: 0.55 };
    if (flag === 2) camValues = { angle: 0, dist: 0.62, height: 0.72 };
    const heading = typeof mp.players.local.getRotation === "function" ? mp.players.local.getRotation(2).z : 0;
    const camPos = getCameraOffset(
      new mp.Vector3(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + camValues.height),
      heading + 90 + camValues.angle,
      camValues.dist
    );
    creatorState.cam.setCoord(camPos.x, camPos.y, camPos.z);
    creatorState.cam.pointAtCoord(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + camValues.height);
  }
  function startCreatorCamera() {
    stopCinematicCam();
    stopCreatorCamera();
    const player = mp.players.local;
    creatorState.opened = true;
    creatorState.camStart = player.position;
    const heading = typeof player.getRotation === "function" ? player.getRotation(2).z : 0;
    const pos = getCameraOffset(
      new mp.Vector3(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + 0.2),
      heading + 90,
      2.6
    );
    creatorState.cam = mp.cameras.new("creatorCam", pos, new mp.Vector3(0, 0, 0), 50);
    creatorState.cam.pointAtCoord(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + 0.2);
    creatorState.cam.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 500, true, false);
    player.freezePosition(true);
    player.setAlpha(255);
    applyDefaultCreatorClothing(player);
  }
  function stopCreatorCamera() {
    creatorState.opened = false;
    if (creatorState.cam) {
      creatorState.cam.setActive(false);
      creatorState.cam.destroy(true);
    }
    creatorState.cam = null;
    creatorState.camStart = null;
    mp.game.cam.renderScriptCams(false, false, 700, true, false);
  }
  function resolveGroundForLocalPlayer() {
    const player = mp.players.local;
    const position = player.position;
    for (let probe = position.z + 80; probe >= position.z - 120; probe -= 10) {
      try {
        const result = mp.game.gameplay.getGroundZFor3dCoord(position.x, position.y, probe, 0, false);
        if (Array.isArray(result) && result[0]) {
          player.position = new mp.Vector3(position.x, position.y, result[1] + 1);
          return;
        }
        if (typeof result === "number" && Number.isFinite(result) && result !== 0) {
          player.position = new mp.Vector3(position.x, position.y, result + 1);
          return;
        }
      } catch (error) {
        return;
      }
    }
  }
  function previewCreator(type, rawData) {
    let data;
    try {
      data = JSON.parse(rawData);
    } catch (error) {
      return;
    }
    const player = mp.players.local;
    switch (type) {
      case "gender":
        player.model = Number(data) === 1 ? mp.game.joaat("mp_f_freemode_01") : mp.game.joaat("mp_m_freemode_01");
        setTimeout(startCreatorCamera, 100);
        break;
      case "blendData": {
        setCreatorCamera(1);
        const d = data;
        player.setHeadBlendData(Number(d[0]), Number(d[1]), 0, Number(d[2]), Number(d[3]), 0, Number(d[4]), Number(d[5]), 0, false);
        break;
      }
      case "hair": {
        setCreatorCamera(2);
        const d = data;
        player.setComponentVariation(2, Number(d[0]), 0, 0);
        player.setHairColor(Number(d[1]), Number(d[2]));
        break;
      }
      case "beard": {
        setCreatorCamera(2);
        const d = data;
        player.setHeadOverlay(1, Number(d[0]), 1, Number(d[1]), Number(d[1]));
        break;
      }
      case "faceFeatures": {
        setCreatorCamera(2);
        const d = data;
        player.setFaceFeature(Number(d[0]), Number(d[1]));
        break;
      }
      case "clothing": {
        setCreatorCamera(0);
        const d = data;
        player.setComponentVariation(11, Number(d[0][0]), Number(d[0][1]), 0);
        player.setComponentVariation(8, Number(d[1][0]), Number(d[1][1]), 0);
        player.setComponentVariation(4, Number(d[2][0]), Number(d[2][1]), 0);
        player.setComponentVariation(6, Number(d[3][0]), Number(d[3][1]), 0);
        break;
      }
      case "headOverlays": {
        setCreatorCamera(2);
        const d = data;
        [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((overlayId, index) => {
          player.setHeadOverlay(overlayId, Number(d[index]), 1, 0, 0);
        });
        break;
      }
    }
  }
  function applyCreatorData(characterJson) {
    let character;
    try {
      character = JSON.parse(characterJson);
    } catch (error) {
      return;
    }
    const player = mp.players.local;
    player.model = Number(character.gender) === 1 ? mp.game.joaat("mp_f_freemode_01") : mp.game.joaat("mp_m_freemode_01");
    setTimeout(() => {
      if (Array.isArray(character.blendData)) {
        const d = character.blendData;
        player.setHeadBlendData(Number(d[0]), Number(d[1]), 0, Number(d[2]), Number(d[3]), 0, Number(d[4]), Number(d[5]), 0, false);
      }
      if (Array.isArray(character.faceFeatures)) {
        character.faceFeatures.forEach((value, index) => player.setFaceFeature(index, Number(value)));
      }
      if (Array.isArray(character.hair)) {
        player.setComponentVariation(2, Number(character.hair[0]), 0, 0);
        player.setHairColor(Number(character.hair[1]), Number(character.hair[2]));
      }
      if (Array.isArray(character.beard)) {
        player.setHeadOverlay(1, Number(character.beard[0]), 1, Number(character.beard[1]), Number(character.beard[1]));
      }
      if (Array.isArray(character.clothing)) {
        player.setComponentVariation(11, Number(character.clothing[0][0]), Number(character.clothing[0][1]), 0);
        player.setComponentVariation(8, Number(character.clothing[1][0]), Number(character.clothing[1][1]), 0);
        player.setComponentVariation(4, Number(character.clothing[2][0]), Number(character.clothing[2][1]), 0);
        player.setComponentVariation(6, Number(character.clothing[3][0]), Number(character.clothing[3][1]), 0);
      } else {
        applyDefaultCreatorClothing(player);
      }
      if (Array.isArray(character.headOverlays)) {
        [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((overlayId, index) => {
          player.setHeadOverlay(overlayId, Number(character.headOverlays[index]), 1, 0, 0);
        });
      }
    }, 150);
  }
  mp.events.add("playerReady", () => {
    ensureBrowser();
    mp.gui.chat.show(false);
    mp.gui.chat.activate(false);
    setTimeout(() => {
      mp.events.callRemote("server:auth:ready");
    }, 250);
  });
  mp.events.add("cef:auth:ready", () => {
    markBrowserReady(browserState);
  });
  mp.events.add("client:auth:show", () => {
    ensureBrowser();
    state.authVisible = true;
    browserState.browser.active = true;
    mp.players.local.freezePosition(true);
    mp.players.local.setAlpha(0);
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    startCinematicCam();
    executeInBrowser(browserState, "window.authApp && window.authApp.show();");
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    ensureAuthCursor();
    setTimeout(ensureAuthCursor, 50);
    setTimeout(ensureAuthCursor, 250);
    setTimeout(ensureAuthCursor, 500);
  });
  mp.events.add("client:auth:hide", () => {
    state.authVisible = false;
    mp.players.local.freezePosition(false);
    mp.players.local.setAlpha(255);
    mp.game.ui.displayHud(true);
    mp.game.ui.displayRadar(true);
    stopCinematicCam();
    stopCreatorCamera();
    executeInBrowser(browserState, "window.authApp && window.authApp.hide();");
    mp.events.call("client:chat:authState", true);
    mp.events.call("client:hud:authState", true);
    hideAuthCursor();
  });
  mp.events.add("client:auth:showCreator", () => {
    ensureBrowser();
    state.authVisible = true;
    browserState.browser.active = true;
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.activate(false);
    startCreatorCamera();
    executeInBrowser(browserState, "window.authApp && window.authApp.showCreator();");
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    ensureAuthCursor();
  });
  mp.events.add("client:auth:result", (...args) => {
    const [success, message] = args;
    executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
  });
  mp.events.add("client:charselect:result", (...args) => {
    const [success, message] = args;
    executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
  });
  mp.events.add("client:charselect:show", (...args) => {
    const [charactersJson] = args;
    ensureBrowser();
    state.authVisible = true;
    browserState.browser.active = true;
    state.lastCharactersJson = charactersJson;
    stopCinematicCam();
    stopCreatorCamera();
    mp.players.local.freezePosition(true);
    mp.players.local.setAlpha(0);
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.activate(false);
    executeInBrowser(browserState, `window.authApp && window.authApp.showCharSelect(${JSON.stringify(charactersJson)});`);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    ensureAuthCursor();
  });
  mp.events.add("cef:auth:login", (...args) => {
    const [email, password] = args;
    ensureAuthCursor();
    mp.events.callRemote("server:auth:login", email, password);
  });
  mp.events.add("cef:auth:register", (...args) => {
    const [firstName, lastName, email, password, repeatPassword] = args;
    ensureAuthCursor();
    mp.events.callRemote("server:auth:register", firstName, lastName, email, password, repeatPassword);
  });
  mp.events.add("cef:charselect:select", (...args) => {
    const [characterId] = args;
    ensureAuthCursor();
    mp.events.callRemote("server:charselect:select", Number(characterId));
  });
  mp.events.add("cef:charselect:create", () => {
    ensureAuthCursor();
    mp.events.callRemote("server:charselect:create");
  });
  mp.events.add("cef:creator:preview", (...args) => {
    const [type, data] = args;
    previewCreator(type, data);
  });
  mp.events.add("cef:creator:notify", (...args) => {
    const [message] = args;
    executeInBrowser(browserState, `window.authApp && window.authApp.setResult(false, ${JSON.stringify(message)});`);
    ensureAuthCursor();
  });
  mp.events.add("cef:creator:finish", (...args) => {
    const [characterJson] = args;
    ensureAuthCursor();
    mp.events.callRemote("server:character:create", characterJson);
  });
  mp.events.add("client:creator:result", (...args) => {
    const [success, message] = args;
    executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
  });
  mp.events.add("client:creator:apply", (...args) => {
    const [characterJson] = args;
    applyCreatorData(characterJson);
  });
  mp.events.add("client:creator:show", () => {
    mp.events.call("client:auth:showCreator");
  });
  mp.events.add("client:auth:banned", (...args) => {
    const [rawBanData] = args;
    ensureBrowser();
    state.authVisible = true;
    browserState.browser.active = true;
    stopCinematicCam();
    stopCreatorCamera();
    mp.players.local.freezePosition(true);
    mp.players.local.setAlpha(0);
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.activate(false);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    let banData = {};
    try {
      banData = JSON.parse(rawBanData || "{}");
    } catch (error) {
      banData = { reason: "Kein Grund angegeben." };
    }
    executeInBrowser(browserState, `window.authApp && window.authApp.showBanned(${JSON.stringify(banData)});`);
    ensureAuthCursor();
    setTimeout(() => {
      mp.events.callRemote("server:auth:banDisconnect");
    }, 3e3);
  });
  mp.events.add("client:spawn:show", (...args) => {
    const [message] = args;
    ensureBrowser();
    state.authVisible = true;
    browserState.browser.active = true;
    stopCinematicCam();
    stopCreatorCamera();
    mp.players.local.freezePosition(true);
    mp.players.local.setAlpha(0);
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.activate(false);
    executeInBrowser(browserState, `window.authApp && window.authApp.showSpawn(${JSON.stringify(message || "")});`);
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    ensureAuthCursor();
  });
  mp.events.add("client:spawn:hide", () => {
    state.authVisible = false;
    mp.players.local.freezePosition(false);
    mp.players.local.setAlpha(255);
    mp.game.ui.displayHud(true);
    mp.game.ui.displayRadar(true);
    executeInBrowser(browserState, "window.authApp && window.authApp.hide();");
    hideAuthCursor();
  });
  mp.events.add("client:spawn:resolveGround", () => {
    setTimeout(resolveGroundForLocalPlayer, 250);
    setTimeout(resolveGroundForLocalPlayer, 900);
  });
  mp.events.add("client:spawn:result", (...args) => {
    const [success, message] = args;
    executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
  });
  mp.events.add("cef:spawn:select", (...args) => {
    const [spawnType] = args;
    ensureAuthCursor();
    mp.events.callRemote("server:spawn:select", spawnType);
  });
})();
