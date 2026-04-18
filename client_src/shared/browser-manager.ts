/// <reference path="../ragemp-client.d.ts" />

export type BrowserState = {
  browser: Mp.Browser | null;
  isReady: boolean;
  pendingActions: string[];
  readyProbe: ReturnType<typeof setInterval> | null;
};

export type BrowserInitOptions = {
  htmlPath: string;
  active?: boolean;
};

export type ReadyProbeOptions = {
  windowReadyKey?: string;
};

export type ManagedBrowserOptions = BrowserInitOptions & {
  appName?: string;
  readyProbe?: ReadyProbeOptions | false;
};

export function createBrowserState(): BrowserState {
  return {
    browser: null,
    isReady: false,
    pendingActions: [],
    readyProbe: null
  };
}

export function initBrowser(state: BrowserState, options: BrowserInitOptions): void {
  if (state.browser) return;
  state.browser = mp.browsers.new(options.htmlPath);
  state.browser.active = options.active ?? false;
}

export function ensureBrowserInitialized(state: BrowserState, options: ManagedBrowserOptions): Mp.Browser {
  initBrowser(state, options);

  if (options.appName && options.readyProbe !== false) {
    startReadyProbe(state, options.appName, options.readyProbe || undefined);
  }

  return state.browser!;
}

export function stopReadyProbe(state: BrowserState): void {
  if (!state.readyProbe) return;
  clearInterval(state.readyProbe);
  state.readyProbe = null;
}

export function startReadyProbe(
  state: BrowserState,
  appName: string,
  options?: ReadyProbeOptions
): void {
  stopReadyProbe(state);
  const windowKey = options?.windowReadyKey ?? `${appName}App`;

  state.readyProbe = setInterval(() => {
    if (!state.browser || state.isReady) {
      stopReadyProbe(state);
      return;
    }
    state.browser.execute(`
      if (window.${windowKey} && !window.__${appName}ReadyNotified) {
        window.__${appName}ReadyNotified = true;
        if (typeof mp !== "undefined") {
          mp.trigger("cef:${appName}:ready");
        }
      }
    `);
  }, 300);
}

export function flushPending(state: BrowserState): void {
  if (!state.browser || !state.isReady) return;
  while (state.pendingActions.length > 0) {
    state.browser.execute(state.pendingActions.shift()!);
  }
}

export function markBrowserReady(state: BrowserState): boolean {
  if (state.isReady) {
    return false;
  }

  state.isReady = true;
  stopReadyProbe(state);
  flushPending(state);
  return true;
}

export function executeInBrowser(state: BrowserState, js: string): void {
  if (!state.browser || !state.isReady) {
    state.pendingActions.push(js);
    return;
  }
  state.browser.execute(js);
}
