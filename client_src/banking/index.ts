/// <reference path="../ragemp-client.d.ts" />

interface BankingState {
    browser: Mp.Browser | null;
    isReady: boolean;
    isOpen: boolean;
    pendingData: string | null;
}

const state: BankingState = {
    browser: null,
    isReady: false,
    isOpen: false,
    pendingData: null
};

function ensureBrowser(): void {
    if (state.browser) return;
    state.browser = mp.browsers.new("package://banking/banking.html");
    state.browser.active = false;
}

function openBanking(): void {
    const cursor = mp.gui.cursor.visible;
    mp.gui.chat.push(`!{#F97316}[DEBUG] openBanking - Cursor: ${cursor}, isOpen: ${state.isOpen}`);
    if (state.isOpen || cursor) return;
    ensureBrowser();
    state.isOpen = true;
    state.browser!.active = true;
    mp.gui.cursor.show(true, true);
    
    // Request data from server
    mp.events.callRemote("server:banking:open");
    
    if (state.isReady) {
        mp.gui.chat.push(`!{#F97316}[DEBUG] Browser bereit, sende show-Event...`);
        state.browser!.execute("window.bankingApp && window.bankingApp.show();");
    } else {
        mp.gui.chat.push(`!{#F97316}[DEBUG] Browser noch nicht bereit, show-Event wird verzögert.`);
    }
}

function closeBanking(): void {
    if (!state.isOpen) return;
    state.isOpen = false;
    if (state.browser) state.browser.active = false;
    mp.gui.cursor.show(false, false);
}

mp.events.add("client:banking:open", () => {
    openBanking();
});

mp.events.add("client:banking:setData", (json: string) => {
    mp.gui.chat.push(`!{#F97316}[DEBUG] empfange Banking-Daten. Browser vorhanden: ${!!state.browser}, Ready: ${state.isReady}`);
    if (!state.browser || !state.isReady) {
        state.pendingData = json;
        return;
    }
    const escaped = json.replace(/'/g, "\\'");
    state.browser.execute(`window.bankingApp && window.bankingApp.setData('${escaped}');`);
});

mp.events.add("cef:banking:ready", () => {
    mp.gui.chat.push(`!{#F97316}[DEBUG] Banking-CEF ist bereit.`);
    state.isReady = true;
    
    if (state.isOpen && state.browser) {
        mp.gui.chat.push(`!{#F97316}[DEBUG] Banking war offen, sende verzögertes show-Event.`);
        state.browser.execute("window.bankingApp && window.bankingApp.show();");
    }

    if (state.pendingData && state.browser) {
        const escaped = state.pendingData.replace(/'/g, "\\'");
        state.browser.execute(`window.bankingApp && window.bankingApp.setData('${escaped}');`);
        state.pendingData = null;
    }
});

mp.events.add("cef:banking:close", () => {
    closeBanking();
});

// Close bank on Escape if it doesn't conflict with other menus
mp.keys.bind(0x1B, true, () => {
    if (state.isOpen) closeBanking();
});

export {};
