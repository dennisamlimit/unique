const state = {
    authBrowser: null,
    currentCam: null,
    nextCam: null,
    authVisible: false,
    switchTimer: null,
    camState: 0,
    isReady: false,
    pendingActions: [],
    readyProbe: null
};

const creatorState = {
    opened: false,
    cam: null,
    camStart: null
};

const cinematicCams = [
    {
        pos: new mp.Vector3(-534.0, -1880.0, 125.0),
        look: new mp.Vector3(-188.0, -1020.0, 85.0),
        fov: 46
    },
    {
        pos: new mp.Vector3(-1660.0, -1090.0, 210.0),
        look: new mp.Vector3(-730.0, -700.0, 110.0),
        fov: 48
    },
    {
        pos: new mp.Vector3(215.0, -925.0, 260.0),
        look: new mp.Vector3(-75.0, -818.0, 326.0),
        fov: 42
    }
];

function ensureBrowser() {
    if (state.authBrowser) {
        return;
    }

    state.authBrowser = mp.browsers.new("package://auth/auth.html");
    state.authBrowser.active = true;
    startReadyProbe();
}

function executeAuth(js) {
    if (!state.authBrowser || !state.isReady) {
        state.pendingActions.push(js);
        return;
    }

    state.authBrowser.execute(js);
}

function flushPending() {
    if (!state.authBrowser || !state.isReady) {
        return;
    }

    while (state.pendingActions.length > 0) {
        state.authBrowser.execute(state.pendingActions.shift());
    }
}

function stopReadyProbe() {
    if (!state.readyProbe) {
        return;
    }

    clearInterval(state.readyProbe);
    state.readyProbe = null;
}

function startReadyProbe() {
    stopReadyProbe();

    state.readyProbe = setInterval(() => {
        if (!state.authBrowser || state.isReady) {
            stopReadyProbe();
            return;
        }

        state.authBrowser.execute(`
            if (window.authApp && !window.__authReadyNotified) {
                window.__authReadyNotified = true;
                if (typeof mp !== "undefined") {
                    mp.trigger("cef:auth:ready");
                }
            }
        `);
    }, 300);
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

    mp.game.cam.renderScriptCams(false, true, 1500, true, false);
}

function startCinematicCam() {
    stopCinematicCam();

    state.camState = 0;
    state.currentCam = createCam("authCam0", cinematicCams[state.camState]);
    state.currentCam.setActive(true);
    mp.game.cam.renderScriptCams(true, true, 2500, true, false);

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
            destroyCam(previousCam);
        }, 7000);
    }, 11000);
}

function ensureAuthCursor() {
    if (!state.authVisible) {
        return;
    }

    if (state.authBrowser) {
        state.authBrowser.active = true;
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

function setCreatorCamera(flag) {
    if (!creatorState.cam || !creatorState.camStart) {
        return;
    }

    let camValues = { angle: 0, dist: 2.6, height: 0.2 };
    if (flag === 1) camValues = { angle: 0, dist: 1.0, height: 0.55 };
    if (flag === 2) camValues = { angle: 0, dist: 0.62, height: 0.72 };

    const heading = typeof mp.players.local.getRotation === "function" ? mp.players.local.getRotation(2).z : 0;
    const camPos = getCameraOffset(new mp.Vector3(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + camValues.height), heading + 90 + camValues.angle, camValues.dist);
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
    const pos = getCameraOffset(new mp.Vector3(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + 0.2), heading + 90, 2.6);
    creatorState.cam = mp.cameras.new("creatorCam", pos, new mp.Vector3(0, 0, 0), 50);
    creatorState.cam.pointAtCoord(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + 0.2);
    creatorState.cam.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 500, true, false);

    player.freezePosition(true);
    player.setAlpha(255);
    player.setComponentVariation(11, 15, 0, 0);
    player.setComponentVariation(3, 15, 0, 0);
    player.setComponentVariation(8, 15, 0, 0);
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
        case "blendData":
            setCreatorCamera(1);
            player.setHeadBlendData(Number(data[0]), Number(data[1]), 0, Number(data[2]), Number(data[3]), 0, Number(data[4]), Number(data[5]), 0, false);
            break;
        case "hair":
            setCreatorCamera(2);
            player.setComponentVariation(2, Number(data[0]), 0, 0);
            player.setHairColor(Number(data[1]), Number(data[2]));
            break;
        case "beard":
            setCreatorCamera(2);
            player.setHeadOverlay(1, Number(data[0]), 1.0, Number(data[1]), Number(data[1]));
            break;
        case "faceFeatures":
            setCreatorCamera(2);
            player.setFaceFeature(Number(data[0]), Number(data[1]));
            break;
        case "clothing":
            setCreatorCamera(0);
            player.setComponentVariation(11, Number(data[0][0]), Number(data[0][1]), 0);
            player.setComponentVariation(8, Number(data[1][0]), Number(data[1][1]), 0);
            player.setComponentVariation(4, Number(data[2][0]), Number(data[2][1]), 0);
            player.setComponentVariation(6, Number(data[3][0]), Number(data[3][1]), 0);
            break;
        case "headOverlays":
            setCreatorCamera(2);
            [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((overlayId, index) => {
                player.setHeadOverlay(overlayId, Number(data[index]), 1.0, 0, 0);
            });
            break;
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
            const data = character.blendData;
            player.setHeadBlendData(Number(data[0]), Number(data[1]), 0, Number(data[2]), Number(data[3]), 0, Number(data[4]), Number(data[5]), 0, false);
        }

        if (Array.isArray(character.faceFeatures)) {
            character.faceFeatures.forEach((value, index) => player.setFaceFeature(index, Number(value)));
        }

        if (Array.isArray(character.hair)) {
            player.setComponentVariation(2, Number(character.hair[0]), 0, 0);
            player.setHairColor(Number(character.hair[1]), Number(character.hair[2]));
        }

        if (Array.isArray(character.beard)) {
            player.setHeadOverlay(1, Number(character.beard[0]), 1.0, Number(character.beard[1]), Number(character.beard[1]));
        }

        if (Array.isArray(character.clothing)) {
            player.setComponentVariation(11, Number(character.clothing[0][0]), Number(character.clothing[0][1]), 0);
            player.setComponentVariation(8, Number(character.clothing[1][0]), Number(character.clothing[1][1]), 0);
            player.setComponentVariation(4, Number(character.clothing[2][0]), Number(character.clothing[2][1]), 0);
            player.setComponentVariation(6, Number(character.clothing[3][0]), Number(character.clothing[3][1]), 0);
        }

        if (Array.isArray(character.headOverlays)) {
            [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((overlayId, index) => {
                player.setHeadOverlay(overlayId, Number(character.headOverlays[index]), 1.0, 0, 0);
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
    if (state.isReady) {
        return;
    }

    state.isReady = true;
    stopReadyProbe();
    flushPending();
});

mp.events.add("client:auth:show", () => {
    ensureBrowser();
    state.authVisible = true;
    state.authBrowser.active = true;

    mp.players.local.freezePosition(true);
    mp.players.local.setAlpha(0);
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);

    startCinematicCam();

    executeAuth("window.authApp && window.authApp.show();");
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

    executeAuth("window.authApp && window.authApp.hide();");
    mp.events.call("client:chat:authState", true);
    mp.events.call("client:hud:authState", true);

    hideAuthCursor();
});

mp.events.add("client:auth:showCreator", () => {
    ensureBrowser();
    state.authVisible = true;
    state.authBrowser.active = true;
    mp.game.ui.displayHud(false);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.activate(false);
    startCreatorCamera();
    executeAuth("window.authApp && window.authApp.showCreator();");
    mp.events.call("client:chat:authState", false);
    mp.events.call("client:hud:authState", false);
    ensureAuthCursor();
});

mp.events.add("client:auth:result", (success, message) => {
    executeAuth(`window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
});

mp.events.add("cef:auth:login", (email, password) => {
    ensureAuthCursor();
    mp.events.callRemote("server:auth:login", email, password);
});

mp.events.add("cef:auth:register", (firstName, lastName, email, password, repeatPassword) => {
    ensureAuthCursor();
    mp.events.callRemote("server:auth:register", firstName, lastName, email, password, repeatPassword);
});

mp.events.add("cef:creator:preview", (type, data) => {
    previewCreator(type, data);
});

mp.events.add("cef:creator:notify", (message) => {
    executeAuth(`window.authApp && window.authApp.setResult(false, ${JSON.stringify(message)});`);
    ensureAuthCursor();
});

mp.events.add("cef:creator:finish", (characterJson) => {
    ensureAuthCursor();
    mp.events.callRemote("server:character:create", characterJson);
});

mp.events.add("client:creator:result", (success, message) => {
    executeAuth(`window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
    ensureAuthCursor();
});

mp.events.add("client:creator:apply", (characterJson) => {
    applyCreatorData(characterJson);
});
