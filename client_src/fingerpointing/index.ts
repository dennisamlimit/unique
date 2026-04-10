/// <reference path="../ragemp-client.d.ts" />

const KEY_B = 0x42;
const SYNC_INTERVAL_MS = 100;

const pointing = {
  active: false,
  lastSync: 0,
  gameplayCam: (mp.cameras as any).new("gameplay")
};

function getPlayerByRemoteId(remoteId: number): Mp.Player | null {
  try {
    const player = mp.players.atRemoteId(Number(remoteId));
    return player || null;
  } catch (error) {
    return null;
  }
}

function loadPointingAnim(): void {
  mp.game.streaming.requestAnimDict("anim@mp_point");

  while (!mp.game.streaming.hasAnimDictLoaded("anim@mp_point")) {
    mp.game.wait(0);
  }
}

function stopPointingForPlayer(player: Mp.Player | null): void {
  if (!player) {
    return;
  }

  try {
    mp.game.invoke("0xd01015c7316ae176", player.handle, "Stop");
  } catch (error) {
    // Native can fail while an entity streams out.
  }

  try {
    if (!(player as any).isInAnyVehicle(true)) {
      mp.game.invoke("0x0725a4ccfded9a70", player.handle, 1, 1, 1, 1);
    }
  } catch (error) {
    // Ignore streamed-out entities.
  }

  try {
    (player as any).setConfigFlag(36, false);
  } catch (error) {
    // Ignore streamed-out entities.
  }
}

function startPointingForPlayer(player: Mp.Player | null): void {
  if (!player) {
    return;
  }

  loadPointingAnim();
  mp.game.invoke("0x0725a4ccfded9a70", player.handle, 0, 1, 1, 1);
  (player as any).setConfigFlag(36, true);
  (player as any).taskMoveNetwork("task_mp_pointing", 0.5, false, "anim@mp_point", 24);
  mp.game.streaming.removeAnimDict("anim@mp_point");
}

function startLocalPointing(): void {
  if (
    pointing.active ||
    mp.gui.cursor.visible ||
    (mp.players.local as any).isInAnyVehicle(true) ||
    (mp.players.local as any).isInjured()
  ) {
    return;
  }

  pointing.active = true;
  startPointingForPlayer(mp.players.local);
}

function stopLocalPointing(): void {
  if (!pointing.active) {
    return;
  }

  pointing.active = false;
  stopPointingForPlayer(mp.players.local);

  try {
    (mp.players.local as any).clearSecondaryTask();
  } catch (error) {
    // Local task may already be cleared.
  }
}

function getRelativePitch(): number {
  const cameraRotation = pointing.gameplayCam.getRot(2);
  return cameraRotation.x - (mp.players.local as any).getPitch();
}

function processLocalPointing(): void {
  if (!pointing.active) {
    return;
  }

  if (
    mp.gui.cursor.visible ||
    (mp.players.local as any).isInAnyVehicle(true) ||
    (mp.players.local as any).isInjured()
  ) {
    stopLocalPointing();
    return;
  }

  mp.game.invoke("0x921ce12c489c4c41", mp.players.local.handle);

  let cameraPitch = getRelativePitch();
  if (cameraPitch < -70.0) {
    cameraPitch = -70.0;
  } else if (cameraPitch > 42.0) {
    cameraPitch = 42.0;
  }
  cameraPitch = (cameraPitch + 70.0) / 112.0;

  let cameraHeading = mp.game.cam.getGameplayCamRelativeHeading();
  const cosCameraHeading = mp.game.system.cos(cameraHeading);
  const sinCameraHeading = mp.game.system.sin(cameraHeading);

  if (cameraHeading < -180.0) {
    cameraHeading = -180.0;
  } else if (cameraHeading > 180.0) {
    cameraHeading = 180.0;
  }
  cameraHeading = (cameraHeading + 180.0) / 360.0;

  const coords = (mp.players.local as any).getOffsetFromGivenWorldCoords(
    (cosCameraHeading * -0.2) - (sinCameraHeading * (0.4 * cameraHeading + 0.3)),
    (sinCameraHeading * -0.2) + (cosCameraHeading * (0.4 * cameraHeading + 0.3)),
    0.6
  );
  const blocked = typeof mp.raycasting.testPointToPoint(
    [coords.x, coords.y, coords.z - 0.2],
    [coords.x, coords.y, coords.z + 0.2],
    mp.players.local.handle,
    7
  ) !== "undefined";

  mp.game.invoke("0xd5bb4025ae449a4e", mp.players.local.handle, "Pitch", cameraPitch);
  mp.game.invoke("0xd5bb4025ae449a4e", mp.players.local.handle, "Heading", cameraHeading * -1.0 + 1.0);
  mp.game.invoke("0xb0a6cfd2c69c1088", mp.players.local.handle, "isBlocked", blocked);
  mp.game.invoke(
    "0xb0a6cfd2c69c1088",
    mp.players.local.handle,
    "isFirstPerson",
    mp.game.invoke("0xee778f8c7e1142e2", mp.game.invoke("0x19cafa3c87f7c2ff")) === 4
  );

  if (Date.now() - pointing.lastSync > SYNC_INTERVAL_MS) {
    pointing.lastSync = Date.now();
    mp.events.callRemote("fpsync.update", cameraPitch, cameraHeading);
  }
}

function processRemotePointing(...args: unknown[]): void {
  const [remoteId, cameraPitch, cameraHeading] = args as [number, number, number];
  const player = getPlayerByRemoteId(remoteId) as any;
  if (!player || player === mp.players.local) {
    return;
  }

  player.lastReceivedPointing = Date.now();

  if (!player.pointingInterval) {
    player.pointingInterval = setInterval(() => {
      if (Date.now() - player.lastReceivedPointing <= 1000) {
        return;
      }

      clearInterval(player.pointingInterval);
      player.lastReceivedPointing = undefined;
      player.pointingInterval = undefined;
      stopPointingForPlayer(player);
    }, 500);

    startPointingForPlayer(player);
  }

  mp.game.invoke("0xd5bb4025ae449a4e", player.handle, "Pitch", cameraPitch);
  mp.game.invoke("0xd5bb4025ae449a4e", player.handle, "Heading", cameraHeading * -1.0 + 1.0);
  mp.game.invoke("0xb0a6cfd2c69c1088", player.handle, "isBlocked", 0);
  mp.game.invoke("0xb0a6cfd2c69c1088", player.handle, "isFirstPerson", 0);
}

mp.keys.bind(KEY_B, true, startLocalPointing);
mp.keys.bind(KEY_B, false, stopLocalPointing);

mp.events.add("render", () => {
  processLocalPointing();
});

mp.events.add("fpsync.update", processRemotePointing);
mp.events.add("playerQuit", () => {
  stopLocalPointing();
});

export {};
