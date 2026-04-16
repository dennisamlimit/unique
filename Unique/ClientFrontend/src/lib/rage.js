export function trigger(name, ...args) {
  if (typeof window === "undefined" || typeof window.mp === "undefined") {
    return;
  }

  window.mp.trigger(name, ...args);
}

export function isRageAvailable() {
  return typeof window !== "undefined" && typeof window.mp !== "undefined";
}
