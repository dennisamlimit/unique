/// <reference path="../ragemp-client.d.ts" />

import {
  createBrowserState,
  ensureBrowserInitialized,
  executeInBrowser,
  markBrowserReady
} from "../shared/browser-manager.js";

interface AuthState {
  currentCam: any | null;
  nextCam: any | null;
  authVisible: boolean;
  switchTimer: ReturnType<typeof setInterval> | null;
  camState: number;
  lastCharactersJson: string | null;
}

interface CreatorState {
  opened: boolean;
  cam: any | null;
  camStart: Mp.Vector3 | null;
}

interface CinematicCam {
  pos: Mp.Vector3;
  look: Mp.Vector3;
  fov: number;
}

const browserState = createBrowserState();
const state: AuthState = {
  currentCam: null,
  nextCam: null,
  authVisible: false,
  switchTimer: null,
  camState: 0,
  lastCharactersJson: null
};

const creatorState: CreatorState = {
  opened: false,
  cam: null,
  camStart: null
};

const FEMALE_FREEMODE_MODEL = mp.game.joaat("mp_f_freemode_01");
const MALE_DEFAULT_CLOTHING: number[][] = [[15, 0], [15, 0], [21, 0], [34, 0]];
const FEMALE_DEFAULT_CLOTHING: number[][] = [[15, 0], [15, 0], [19, 0], [35, 0]];

const cinematicCams: CinematicCam[] = [
  // Downtown LS skyline from the east
  {
    pos:  new mp.Vector3(431.5, -833.0, 85.0),
    look: new mp.Vector3(-75.0, -818.0, 40.0),
    fov: 55
  },
  // Vinewood Hills overview
  {
    pos:  new mp.Vector3(-378.0, 335.0, 175.0),
    look: new mp.Vector3(-250.0, 160.0, 70.0),
    fov: 48
  },
  // Del Perro Pier / Beach low angle
  {
    pos:  new mp.Vector3(-1637.0, -953.0, 18.0),
    look: new mp.Vector3(-1420.0, -1080.0, 13.0),
    fov: 60
  },
  // Port of LS crane shot
  {
    pos:  new mp.Vector3(534.0, -2850.0, 90.0),
    look: new mp.Vector3(260.0, -2650.0, 10.0),
    fov: 50
  },
  // Mirror Park lake reflection
  {
    pos:  new mp.Vector3(1221.0, -1397.0, 42.0),
    look: new mp.Vector3(1100.0, -1260.0, 35.0),
    fov: 44
  },
  // LS City from north hills (epic cityscape)
  {
    pos:  new mp.Vector3(-534.0, -1880.0, 125.0),
    look: new mp.Vector3(-188.0, -1020.0, 85.0),
    fov: 46
  },
  // Freeway traffic overhead
  {
    pos:  new mp.Vector3(-183.0, -1250.0, 55.0),
    look: new mp.Vector3(-190.0, -1150.0, 30.0),
    fov: 65
  },
  // Rockford Hills low cruising shot
  {
    pos:  new mp.Vector3(-670.0, -5.0, 58.0),
    look: new mp.Vector3(-500.0, -80.0, 42.0),
    fov: 52
  }
];

function ensureBrowser(): void {
  if (browserState.browser) return;
  ensureBrowserInitialized(browserState, {
    htmlPath: "package://auth/auth.html",
    active: true,
    appName: "auth"
  });
}

function createCam(name: string, data: CinematicCam): any {
  const cam = (mp.cameras as any).new(name, data.pos, new mp.Vector3(0, 0, 0), data.fov);
  cam.pointAtCoord(data.look.x, data.look.y, data.look.z);
  return cam;
}

function destroyCam(cam: any): void {
  if (!cam) {
    return;
  }

  cam.setActive(false);
  cam.destroy(true);
}

function stopCinematicCam(): void {
  if (state.switchTimer) {
    clearInterval(state.switchTimer);
    state.switchTimer = null;
  }

  destroyCam(state.currentCam);
  destroyCam(state.nextCam);
  state.currentCam = null;
  state.nextCam = null;

  cleanupIntroNpcs();
  (mp.game.cam as any).renderScriptCams(false, true, 1500, true, false);
}

// Ambient NPC models for intro atmosphere
const NPC_MODELS = [
  "a_m_y_business_01", "a_f_y_business_02", "a_m_m_business_01",
  "a_m_y_cyclist_01", "a_m_y_skater_01", "a_f_y_tourist_01",
  "a_m_y_hipster_01", "a_f_m_fatbath_01"
];
let introNpcs: any[] = [];

function cleanupIntroNpcs(): void {
  for (const ped of introNpcs) {
    try { ped.destroy(); } catch (_) {}
  }
  introNpcs = [];
}

function spawnIntroNpcs(cam: CinematicCam): void {
  cleanupIntroNpcs();
  const count = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const model = NPC_MODELS[Math.floor(Math.random() * NPC_MODELS.length)];
    const ox = (Math.random() - 0.5) * 10;
    const oy = (Math.random() - 0.5) * 10;
    try {
      const pos = new mp.Vector3(cam.look.x + ox, cam.look.y + oy, cam.look.z);
      const ped = mp.peds.new(mp.game.joaat(model), pos, Math.random() * 360, 0);
      try { (ped as any).taskWanderStandard(10, 10); } catch (_) {}
      introNpcs.push(ped);
    } catch (_) {}
  }
}

function startCinematicCam(): void {
  stopCinematicCam();

  // Golden hour atmosphere
  try {
    mp.game.misc.setWeatherTypePersist("EXTRASUNNY");
    mp.game.clock.setDateTime(2024, 1, 1, 18, 30, 0);
  } catch (_) {}

  // Random start camera for variety each login
  state.camState = Math.floor(Math.random() * cinematicCams.length);
  state.currentCam = createCam("authCam0", cinematicCams[state.camState]);
  state.currentCam.setActive(true);
  (mp.game.cam as any).renderScriptCams(true, true, 2500, true, false);
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
  }, 11000);
}

function ensureAuthCursor(): void {
  if (!state.authVisible) {
    return;
  }

  if (browserState.browser) {
    browserState.browser.active = true;
  }

  mp.gui.cursor.show(true, true);
}

function hideAuthCursor(): void {
  mp.gui.cursor.show(false, false);
}

function getCameraOffset(pos: Mp.Vector3, angle: number, dist: number): Mp.Vector3 {
  const radians = angle * 0.0174533;
  pos.y = pos.y + dist * Math.sin(radians);
  pos.x = pos.x + dist * Math.cos(radians);
  return pos;
}

function getDefaultCreatorClothingForModel(model: number): number[][] {
  return model === FEMALE_FREEMODE_MODEL ? FEMALE_DEFAULT_CLOTHING : MALE_DEFAULT_CLOTHING;
}

function applyDefaultCreatorClothing(player: any): void {
  const defaults = getDefaultCreatorClothingForModel(Number(player.model));
  player.setComponentVariation(11, Number(defaults[0][0]), Number(defaults[0][1]), 0);
  player.setComponentVariation(3, 15, 0, 0);
  player.setComponentVariation(8, Number(defaults[1][0]), Number(defaults[1][1]), 0);
  player.setComponentVariation(4, Number(defaults[2][0]), Number(defaults[2][1]), 0);
  player.setComponentVariation(6, Number(defaults[3][0]), Number(defaults[3][1]), 0);
}

function setCreatorCamera(flag: number): void {
  if (!creatorState.cam || !creatorState.camStart) {
    return;
  }

  let camValues = { angle: 0, dist: 2.6, height: 0.2 };
  if (flag === 1) camValues = { angle: 0, dist: 1.0, height: 0.55 };
  if (flag === 2) camValues = { angle: 0, dist: 0.62, height: 0.72 };

  const heading = typeof (mp.players.local as any).getRotation === "function"
    ? (mp.players.local as any).getRotation(2).z
    : 0;
  const camPos = getCameraOffset(
    new mp.Vector3(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + camValues.height),
    heading + 90 + camValues.angle,
    camValues.dist
  );
  creatorState.cam.setCoord(camPos.x, camPos.y, camPos.z);
  creatorState.cam.pointAtCoord(creatorState.camStart.x, creatorState.camStart.y, creatorState.camStart.z + camValues.height);
}

function startCreatorCamera(): void {
  stopCinematicCam();
  stopCreatorCamera();

  const player = mp.players.local as any;
  creatorState.opened = true;
  creatorState.camStart = player.position;
  const heading = typeof player.getRotation === "function" ? player.getRotation(2).z : 0;
  const pos = getCameraOffset(
    new mp.Vector3(creatorState.camStart!.x, creatorState.camStart!.y, creatorState.camStart!.z + 0.2),
    heading + 90,
    2.6
  );
  creatorState.cam = (mp.cameras as any).new("creatorCam", pos, new mp.Vector3(0, 0, 0), 50);
  creatorState.cam.pointAtCoord(creatorState.camStart!.x, creatorState.camStart!.y, creatorState.camStart!.z + 0.2);
  creatorState.cam.setActive(true);
  (mp.game.cam as any).renderScriptCams(true, false, 500, true, false);

  player.freezePosition(true);
  player.setAlpha(255);
  applyDefaultCreatorClothing(player);
}

function stopCreatorCamera(): void {
  creatorState.opened = false;
  if (creatorState.cam) {
    creatorState.cam.setActive(false);
    creatorState.cam.destroy(true);
  }

  creatorState.cam = null;
  creatorState.camStart = null;
  (mp.game.cam as any).renderScriptCams(false, false, 700, true, false);
}

function resolveGroundForLocalPlayer(): void {
  const player = mp.players.local as any;
  const position = player.position;

  for (let probe = position.z + 80.0; probe >= position.z - 120.0; probe -= 10.0) {
    try {
      const result = (mp.game as any).gameplay.getGroundZFor3dCoord(position.x, position.y, probe, 0.0, false);

      if (Array.isArray(result) && result[0]) {
        player.position = new mp.Vector3(position.x, position.y, (result as number[])[1] + 1.0);
        return;
      }

      if (typeof result === "number" && Number.isFinite(result) && result !== 0) {
        player.position = new mp.Vector3(position.x, position.y, result + 1.0);
        return;
      }
    } catch (error) {
      return;
    }
  }
}

function previewCreator(type: string, rawData: string): void {
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch (error) {
    return;
  }

  const player = mp.players.local as any;
  switch (type) {
    case "gender":
      player.model = Number(data) === 1
        ? (mp.game as any).joaat("mp_f_freemode_01")
        : (mp.game as any).joaat("mp_m_freemode_01");
      setTimeout(startCreatorCamera, 100);
      break;
    case "blendData": {
      setCreatorCamera(1);
      const d = data as number[];
      player.setHeadBlendData(Number(d[0]), Number(d[1]), 0, Number(d[2]), Number(d[3]), 0, Number(d[4]), Number(d[5]), 0, false);
      break;
    }
    case "hair": {
      setCreatorCamera(2);
      const d = data as number[];
      player.setComponentVariation(2, Number(d[0]), 0, 0);
      player.setHairColor(Number(d[1]), Number(d[2]));
      break;
    }
    case "beard": {
      setCreatorCamera(2);
      const d = data as number[];
      player.setHeadOverlay(1, Number(d[0]), 1.0, Number(d[1]), Number(d[1]));
      break;
    }
    case "faceFeatures": {
      setCreatorCamera(2);
      const d = data as number[];
      player.setFaceFeature(Number(d[0]), Number(d[1]));
      break;
    }
    case "clothing": {
      setCreatorCamera(0);
      const d = data as number[][];
      player.setComponentVariation(11, Number(d[0][0]), Number(d[0][1]), 0);
      player.setComponentVariation(8, Number(d[1][0]), Number(d[1][1]), 0);
      player.setComponentVariation(4, Number(d[2][0]), Number(d[2][1]), 0);
      player.setComponentVariation(6, Number(d[3][0]), Number(d[3][1]), 0);
      break;
    }
    case "headOverlays": {
      setCreatorCamera(2);
      const d = data as number[];
      [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((overlayId, index) => {
        player.setHeadOverlay(overlayId, Number(d[index]), 1.0, 0, 0);
      });
      break;
    }
  }
}

function applyCreatorData(characterJson: string): void {
  let character: any;
  try {
    character = JSON.parse(characterJson);
  } catch (error) {
    return;
  }

  const player = mp.players.local as any;
  player.model = Number(character.gender) === 1
    ? (mp.game as any).joaat("mp_f_freemode_01")
    : (mp.game as any).joaat("mp_m_freemode_01");

  setTimeout(() => {
    if (Array.isArray(character.blendData)) {
      const d: number[] = character.blendData;
      player.setHeadBlendData(Number(d[0]), Number(d[1]), 0, Number(d[2]), Number(d[3]), 0, Number(d[4]), Number(d[5]), 0, false);
    }

    if (Array.isArray(character.faceFeatures)) {
      (character.faceFeatures as number[]).forEach((value, index) => player.setFaceFeature(index, Number(value)));
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
    } else {
      applyDefaultCreatorClothing(player);
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
  (mp.gui as any).chat.show(false);
  (mp.gui as any).chat.activate(false);

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
  browserState.browser!.active = true;

  (mp.players.local as any).freezePosition(true);
  (mp.players.local as any).setAlpha(0);
  (mp.game.ui as any).displayHud(false);
  (mp.game.ui as any).displayRadar(false);

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

  (mp.players.local as any).freezePosition(false);
  (mp.players.local as any).setAlpha(255);
  (mp.game.ui as any).displayHud(true);
  (mp.game.ui as any).displayRadar(true);

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
  browserState.browser!.active = true;
  (mp.game.ui as any).displayHud(false);
  (mp.game.ui as any).displayRadar(false);
  (mp.gui as any).chat.activate(false);
  startCreatorCamera();
  executeInBrowser(browserState, "window.authApp && window.authApp.showCreator();");
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  ensureAuthCursor();
});

mp.events.add("client:auth:result", (...args: unknown[]) => {
  const [success, message] = args;
  executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
  ensureAuthCursor();
});

mp.events.add("client:charselect:result", (...args: unknown[]) => {
  const [success, message] = args;
  executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
  ensureAuthCursor();
});

mp.events.add("client:charselect:show", (...args: unknown[]) => {
  const [charactersJson] = args as [string];
  ensureBrowser();
  state.authVisible = true;
  browserState.browser!.active = true;
  state.lastCharactersJson = charactersJson;

  stopCinematicCam();
  stopCreatorCamera();

  (mp.players.local as any).freezePosition(true);
  (mp.players.local as any).setAlpha(0);
  (mp.game.ui as any).displayHud(false);
  (mp.game.ui as any).displayRadar(false);
  (mp.gui as any).chat.activate(false);

  executeInBrowser(browserState, `window.authApp && window.authApp.showCharSelect(${JSON.stringify(charactersJson)});`);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  ensureAuthCursor();
});

mp.events.add("cef:auth:login", (...args: unknown[]) => {
  const [email, password] = args;
  ensureAuthCursor();
  mp.events.callRemote("server:auth:login", email, password);
});

mp.events.add("cef:auth:register", (...args: unknown[]) => {
  const [firstName, lastName, email, password, repeatPassword] = args;
  ensureAuthCursor();
  mp.events.callRemote("server:auth:register", firstName, lastName, email, password, repeatPassword);
});

mp.events.add("cef:charselect:select", (...args: unknown[]) => {
  const [characterId] = args;
  ensureAuthCursor();
  mp.events.callRemote("server:charselect:select", Number(characterId));
});

mp.events.add("cef:charselect:create", () => {
  ensureAuthCursor();
  mp.events.callRemote("server:charselect:create");
});

mp.events.add("cef:creator:preview", (...args: unknown[]) => {
  const [type, data] = args as [string, string];
  previewCreator(type, data);
});

mp.events.add("cef:creator:notify", (...args: unknown[]) => {
  const [message] = args;
  executeInBrowser(browserState, `window.authApp && window.authApp.setResult(false, ${JSON.stringify(message)});`);
  ensureAuthCursor();
});

mp.events.add("cef:creator:finish", (...args: unknown[]) => {
  const [characterJson] = args;
  ensureAuthCursor();
  mp.events.callRemote("server:character:create", characterJson);
});

mp.events.add("client:creator:result", (...args: unknown[]) => {
  const [success, message] = args;
  executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
  ensureAuthCursor();
});

mp.events.add("client:creator:apply", (...args: unknown[]) => {
  const [characterJson] = args as [string];
  applyCreatorData(characterJson);
});

mp.events.add("client:creator:show", () => {
  mp.events.call("client:auth:showCreator");
});

mp.events.add("client:auth:banned", (...args: unknown[]) => {
  const [rawBanData] = args as [string];
  ensureBrowser();
  state.authVisible = true;
  browserState.browser!.active = true;

  stopCinematicCam();
  stopCreatorCamera();

  (mp.players.local as any).freezePosition(true);
  (mp.players.local as any).setAlpha(0);
  (mp.game.ui as any).displayHud(false);
  (mp.game.ui as any).displayRadar(false);
  (mp.gui as any).chat.activate(false);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);

  let banData: Record<string, unknown> = {};
  try {
    banData = JSON.parse(rawBanData || "{}");
  } catch (error) {
    banData = { reason: "Kein Grund angegeben." };
  }

  executeInBrowser(browserState, `window.authApp && window.authApp.showBanned(${JSON.stringify(banData)});`);
  ensureAuthCursor();

  setTimeout(() => {
    mp.events.callRemote("server:auth:banDisconnect");
  }, 3000);
});

mp.events.add("client:spawn:show", (...args: unknown[]) => {
  const [message] = args;
  ensureBrowser();
  state.authVisible = true;
  browserState.browser!.active = true;

  stopCinematicCam();
  stopCreatorCamera();

  (mp.players.local as any).freezePosition(true);
  (mp.players.local as any).setAlpha(0);
  (mp.game.ui as any).displayHud(false);
  (mp.game.ui as any).displayRadar(false);
  (mp.gui as any).chat.activate(false);

  executeInBrowser(browserState, `window.authApp && window.authApp.showSpawn(${JSON.stringify(message || "")});`);
  mp.events.call("client:chat:authState", false);
  mp.events.call("client:hud:authState", false);
  ensureAuthCursor();
});

mp.events.add("client:spawn:hide", () => {
  state.authVisible = false;

  (mp.players.local as any).freezePosition(false);
  (mp.players.local as any).setAlpha(255);
  (mp.game.ui as any).displayHud(true);
  (mp.game.ui as any).displayRadar(true);

  executeInBrowser(browserState, "window.authApp && window.authApp.hide();");
  hideAuthCursor();
});

mp.events.add("client:spawn:resolveGround", () => {
  setTimeout(resolveGroundForLocalPlayer, 250);
  setTimeout(resolveGroundForLocalPlayer, 900);
});

mp.events.add("client:spawn:result", (...args: unknown[]) => {
  const [success, message] = args;
  executeInBrowser(browserState, `window.authApp && window.authApp.setResult(${JSON.stringify(success)}, ${JSON.stringify(message)});`);
  ensureAuthCursor();
});

mp.events.add("cef:spawn:select", (...args: unknown[]) => {
  const [spawnType] = args;
  ensureAuthCursor();
  mp.events.callRemote("server:spawn:select", spawnType);
});

export {};
