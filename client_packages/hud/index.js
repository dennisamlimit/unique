const state = {
    browser: null,
    isAuthenticated: false,
    isReady: false,
    pendingActions: [],
    readyProbe: null,
    tickInterval: null
};

function flushPending() {
    if (!state.browser || !state.isReady) {
        return;
    }

    while (state.pendingActions.length > 0) {
        state.browser.execute(state.pendingActions.shift());
    }
}

function executeHud(js) {
    if (!state.browser || !state.isReady) {
        state.pendingActions.push(js);
        return;
    }

    state.browser.execute(js);
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
        if (!state.browser || state.isReady) {
            stopReadyProbe();
            return;
        }

        state.browser.execute(`
            if (window.hudApp && !window.__hudReadyNotified) {
                window.__hudReadyNotified = true;
                if (typeof mp !== "undefined") {
                    mp.trigger("cef:hud:ready");
                }
            }
        `);
    }, 300);
}

function createHudBrowser() {
    if (state.browser) {
        return;
    }

    state.browser = mp.browsers.new("package://hud/hud.html");
    state.browser.active = true;
    startReadyProbe();
}

function getHeadingLabel(heading) {
    if (heading < 45 || heading >= 315) return "N";
    if (heading < 135) return "W";
    if (heading < 225) return "S";
    return "E";
}

function getOnlineCount() {
    try {
        return mp.players.length || 1;
    } catch (error) {
        return 1;
    }
}

function getAccountId() {
    try {
        const value = mp.players.local.getVariable("ACCOUNT_ID");
        return Number.isFinite(value) && value > 0 ? value : 1;
    } catch (error) {
        return 1;
    }
}

function getCashValue() {
    try {
        const value = mp.players.local.getVariable("CASH");
        return Number.isFinite(value) ? value : 0;
    } catch (error) {
        return 0;
    }
}

function getBankCashValue() {
    try {
        const value = mp.players.local.getVariable("BANK_CASH");
        return Number.isFinite(value) ? value : 0;
    } catch (error) {
        return 0;
    }
}

function hideNativeHudParts() {
    if (!state.isAuthenticated) {
        return;
    }

    mp.game.controls.disableControlAction(0, 37, true);
    mp.game.ui.hideHudComponentThisFrame(6);
    mp.game.ui.hideHudComponentThisFrame(7);
    mp.game.ui.hideHudComponentThisFrame(8);
    mp.game.ui.hideHudComponentThisFrame(9);
    mp.game.ui.hideHudComponentThisFrame(19);
    mp.game.ui.hideHudComponentThisFrame(20);
}

function updateHud() {
    if (!state.isAuthenticated || !state.browser || !state.isReady) {
        return;
    }

    const position = mp.players.local.position;
    const streetHashes = mp.game.pathfind.getStreetNameAtCoord(position.x, position.y, position.z, 0, 0);
    const streetName = streetHashes && streetHashes.streetName
        ? mp.game.ui.getStreetNameFromHashKey(streetHashes.streetName)
        : "Unbekannt";
    const crossingName = streetHashes && streetHashes.crossingRoad
        ? mp.game.ui.getStreetNameFromHashKey(streetHashes.crossingRoad)
        : "";
    const zoneCode = mp.game.zone.getNameOfZone(position.x, position.y, position.z);
    const zoneName = zoneCode ? mp.game.ui.getLabelText(zoneCode) : "San Andreas";
    const heading = typeof mp.players.local.getHeading === "function"
        ? mp.players.local.getHeading()
        : 0;

    executeHud(`window.hudApp && window.hudApp.updateLocation(${JSON.stringify(zoneName)}, ${JSON.stringify(streetName)}, ${JSON.stringify(crossingName)}, ${JSON.stringify(getHeadingLabel(heading))});`);
    executeHud(`window.hudApp && window.hudApp.updateStats(${JSON.stringify(getAccountId())}, ${JSON.stringify(getOnlineCount())}, ${JSON.stringify(getCashValue())}, ${JSON.stringify(getBankCashValue())});`);
}

function startHudTick() {
    if (state.tickInterval) {
        return;
    }

    state.tickInterval = setInterval(updateHud, 350);
}

function stopHudTick() {
    if (!state.tickInterval) {
        return;
    }

    clearInterval(state.tickInterval);
    state.tickInterval = null;
}

mp.events.add("playerReady", () => {
    createHudBrowser();
});

mp.events.add("render", () => {
    hideNativeHudParts();
});

mp.events.add("cef:hud:ready", () => {
    if (state.isReady) {
        return;
    }

    state.isReady = true;
    stopReadyProbe();
    flushPending();
    executeHud(`window.hudApp && window.hudApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);
    updateHud();
});

mp.events.add("client:hud:authState", (authState) => {
    state.isAuthenticated = !!authState;
    executeHud(`window.hudApp && window.hudApp.setVisible(${JSON.stringify(state.isAuthenticated)});`);

    if (state.isAuthenticated) {
        startHudTick();
        updateHud();
    } else {
        stopHudTick();
    }
});
