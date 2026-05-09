export function emitToClient(eventName: string, payload?: unknown) {
  const serialized = payload === undefined ? "{}" : JSON.stringify(payload);

  if (window.mp?.trigger) {
    window.mp.trigger(eventName, serialized);
    return;
  }

  console.info(`[CEF mock] ${eventName}`, payload);
}

export function notifyReady() {
  if (window.mp?.trigger) {
    window.mp.trigger("unique:cef:ready");
  }
}
