export const DEFAULT_CHARACTER_NAME = "UNKNOWN PLAYER";

export const DEFAULT_STATS = Object.freeze({
  health: 100,
  hunger: 85,
  thirst: 70,
});

export const DEFAULT_WEIGHT = Object.freeze({
  current: 0,
  max: 200,
});

export const QUICK_SLOT_NUMBERS = [1, 2, 3, 4, 5, 6];
export const QUICK_SLOT_OFFSET = 64;
export const POCKET_SLOTS = Array.from({ length: 15 }, (_, index) => index);
export const BACKPACK_SLOTS = Array.from({ length: 36 }, (_, index) => index + 15);
export const LOCKED_SLOTS = Array.from({ length: 6 }, (_, index) => index + 51);
export const INVENTORY_LOCKED_SLOT_SET = new Set(LOCKED_SLOTS);

export const EQUIPMENT_COLUMNS = Object.freeze({
  left: [
    { icon: "👒", label: "Hat", accepts: "hat" },
    { icon: "🕶️", label: "Glasses", accepts: "glasses" },
    { icon: "🧥", label: "Top", accepts: "top" },
    { icon: "⌚", label: "Watch", accepts: "watch" },
  ],
  right: [
    { icon: "🎭", label: "Mask", accepts: "mask" },
    { icon: "👔", label: "Undershirt", accepts: "undershirt" },
    { icon: "👖", label: "Legs", accepts: "legs" },
    { icon: "👟", label: "Shoes", accepts: "shoes" },
  ],
});

export const STAT_CONFIG = Object.freeze([
  { key: "hunger", icon: "🍔", label: "Hunger", colorClass: "glow-yellow" },
  { key: "thirst", icon: "🥤", label: "Thirst", colorClass: "glow-blue" },
  { key: "health", icon: "❤️", label: "Health", colorClass: "glow-red" },
]);
