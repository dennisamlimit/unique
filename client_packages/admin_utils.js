const state = {
    active: false,
    camera: null
};

const KEY_X = 0x58;
const KEY_SPACE = 0x20;
const KEY_SHIFT = 0x10;
const KEY_CTRL = 0x11;
const KEY_ARROW_UP = 0x26;
const WAYPOINT_BLIP_ID = 8;

function hasRequiredAdminLevel() {
    try {
        const level = mp.players.local.getVariable("ADMIN_LEVEL");
        return Number.isFinite(level) && level >= 2;
    } catch (error) {
        return false;
    }
}

function isAdminModeEnabled() {
    try {
        return !!mp.players.local.getVariable("ADMIN_MODE");
    } catch (error) {
        return false;
    }
}

function isGameplayInputAllowed() {
    if (mp.gui.cursor.visible) {
        return false;
    }

    try {
        return !mp.game.ui.isPauseMenuActive();
    } catch (error) {
        return true;
    }
}

function normalize(vector) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (!length) {
        return new mp.Vector3(0, 0, 0);
    }

    return new mp.Vector3(vector.x / length, vector.y / length, vector.z / length);
}

function cross(v1, v2) {
    return new mp.Vector3(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    );
}

function resolveGroundPosition(position) {
    let bestZ = position.z;

    for (let probe = position.z + 50.0; probe >= -50.0; probe -= 10.0) {
        try {
            const result = mp.game.gameplay.getGroundZFor3dCoord(position.x, position.y, probe, 0.0, false);

            if (Array.isArray(result) && result[0]) {
                return new mp.Vector3(position.x, position.y, result[1] + 1.0);
            }

            if (typeof result === "number" && Number.isFinite(result) && result !== 0) {
                bestZ = result + 1.0;
                break;
            }
        } catch (error) {
            break;
        }
    }

    return new mp.Vector3(position.x, position.y, bestZ);
}

function sendSystemMessage(message) {
    mp.events.call("client:chat:addMessage", "system", "System", message);
}

function getWaypointPosition() {
    try {
        if (mp.game.ui && typeof mp.game.ui.getFirstBlipInfoId === "function") {
            const blip = mp.game.ui.getFirstBlipInfoId(WAYPOINT_BLIP_ID);
            if (blip && (!mp.game.ui.doesBlipExist || mp.game.ui.doesBlipExist(blip))) {
                const coord = mp.game.ui.getBlipInfoIdCoord(blip);
                if (coord) {
                    return new mp.Vector3(coord.x, coord.y, coord.z || 0.0);
                }
            }
        }

        const blip = mp.game.invoke("0x1BEDE233E6CD2A1F", WAYPOINT_BLIP_ID);
        if (blip && mp.game.invoke("0xA6DB27D19ECBB7DA", blip)) {
            const coord = mp.game.invoke("0xFA7C7F0AADF25D09", blip);
            return new mp.Vector3(coord.x, coord.y, coord.z || 0.0);
        }
    } catch (error) {
        return null;
    }

    return null;
}

function resolveWaypointGround(position) {
    for (let z = 1000.0; z >= -80.0; z -= 25.0) {
        try {
            mp.game.streaming.requestCollisionAtCoord(position.x, position.y, z);
            const result = mp.game.gameplay.getGroundZFor3dCoord(position.x, position.y, z, 0.0, false);

            if (Array.isArray(result) && result[0]) {
                return new mp.Vector3(position.x, position.y, result[1] + 1.0);
            }

            if (typeof result === "number" && Number.isFinite(result) && result !== 0) {
                return new mp.Vector3(position.x, position.y, result + 1.0);
            }
        } catch (error) {
            break;
        }
    }

    return new mp.Vector3(position.x, position.y, 80.0);
}

function teleportToWaypoint() {
    if (!hasRequiredAdminLevel() || !isAdminModeEnabled() || !isGameplayInputAllowed() || state.active) {
        return;
    }

    const waypoint = getWaypointPosition();
    if (!waypoint) {
        sendSystemMessage("Kein Wegpunkt auf der Karte gesetzt.");
        return;
    }

    const target = resolveWaypointGround(waypoint);
    const player = mp.players.local;
    player.position = target;
    player.dimension = 0;
    sendSystemMessage("Zum Wegpunkt teleportiert.");
}

function startNoclip() {
    const localPlayer = mp.players.local;
    const position = localPlayer.position;
    const rotation = mp.game.cam.getGameplayCamRot(2);

    state.camera = mp.cameras.new("adminNoclip", position, rotation, 45);
    state.camera.setActive(true);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);

    localPlayer.freezePosition(true);
    localPlayer.setInvincible(true);
    localPlayer.setVisible(false, false);
    localPlayer.setCollision(false, false);

    state.active = true;
}

function stopNoclip(snapToGround) {
    const localPlayer = mp.players.local;

    if (state.camera) {
        let targetPosition = state.camera.getCoord();

        if (snapToGround) {
            targetPosition = resolveGroundPosition(targetPosition);
        }

        localPlayer.position = targetPosition;
        localPlayer.setHeading(state.camera.getRot(2).z);
        state.camera.destroy(true);
        state.camera = null;
    }

    mp.game.cam.renderScriptCams(false, false, 0, true, false);
    localPlayer.freezePosition(false);
    localPlayer.setInvincible(false);
    localPlayer.setVisible(true, false);
    localPlayer.setCollision(true, false);

    state.active = false;
}

function toggleNoclip() {
    if (!hasRequiredAdminLevel() || !isAdminModeEnabled() || !isGameplayInputAllowed()) {
        return;
    }

    if (state.active) {
        stopNoclip(mp.keys.isDown(KEY_SPACE));
        return;
    }

    startNoclip();
}

mp.keys.bind(KEY_X, true, () => {
    toggleNoclip();
});

mp.keys.bind(KEY_ARROW_UP, true, () => {
    teleportToWaypoint();
});

mp.events.add("render", () => {
    if (!state.active || !state.camera) {
        return;
    }

    if (!hasRequiredAdminLevel() || !isAdminModeEnabled()) {
        stopNoclip(false);
        return;
    }

    if (mp.gui.cursor.visible) {
        return;
    }

    const fastMultiplier = mp.keys.isDown(KEY_SHIFT) ? 3.0 : 1.0;
    const slowMultiplier = mp.keys.isDown(KEY_CTRL) ? 0.35 : 1.0;
    const moveMultiplier = fastMultiplier * slowMultiplier;

    const rotation = state.camera.getRot(2);
    const cameraDirection = state.camera.getDirection();
    const position = state.camera.getCoord();

    const rightAxisX = mp.game.controls.getDisabledControlNormal(0, 220);
    const rightAxisY = mp.game.controls.getDisabledControlNormal(0, 221);
    const leftAxisX = mp.game.controls.getDisabledControlNormal(0, 218);
    const leftAxisY = mp.game.controls.getDisabledControlNormal(0, 219);

    const forward = new mp.Vector3(
        cameraDirection.x * leftAxisY * moveMultiplier,
        cameraDirection.y * leftAxisY * moveMultiplier,
        cameraDirection.z * leftAxisY * moveMultiplier
    );

    const right = cross(normalize(cameraDirection), new mp.Vector3(0, 0, 1));
    right.x *= leftAxisX * 0.6;
    right.y *= leftAxisX * 0.6;
    right.z *= leftAxisX * 0.6;

    const upMovement = mp.keys.isDown(KEY_SPACE) ? 0.55 : 0.0;
    const downMovement = mp.keys.isDown(KEY_CTRL) ? 0.55 : 0.0;

    state.camera.setCoord(
        position.x - forward.x + right.x,
        position.y - forward.y + right.y,
        position.z - forward.z + right.z + upMovement - downMovement
    );

    state.camera.setRot(
        rotation.x + rightAxisY * -5.0,
        0.0,
        rotation.z + rightAxisX * -5.0,
        2
    );

    const cameraPosition = state.camera.getCoord();
    mp.players.local.position = new mp.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    mp.players.local.heading = state.camera.getRot(2).z;
});

mp.events.add("playerQuit", () => {
    if (state.active) {
        stopNoclip(false);
    }
});
