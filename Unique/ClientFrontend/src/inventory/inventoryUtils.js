import {
  DEFAULT_CHARACTER_NAME,
  DEFAULT_STATS,
  DEFAULT_WEIGHT,
} from "./inventoryConfig";

export function clampPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numericValue));
}

export function mergeStatsPayload(currentStats, payload) {
  if (payload == null) {
    return currentStats;
  }

  if (typeof payload === "number") {
    return {
      ...currentStats,
      health: clampPercent(payload),
    };
  }

  if (typeof payload !== "object") {
    return currentStats;
  }

  return {
    ...currentStats,
    ...Object.fromEntries(
      Object.entries(payload)
        .filter(([, value]) => value != null)
        .map(([key, value]) => [key, clampPercent(value)])
    ),
  };
}

export function calculateWeight(inventory) {
  const current = Array.isArray(inventory)
    ? inventory.reduce((sum, item) => {
        const itemWeight = Number(item?.data?.weight ?? 0);
        const itemAmount = Number(item?.amount ?? 0);
        if (!Number.isFinite(itemWeight) || !Number.isFinite(itemAmount)) {
          return sum;
        }
        return sum + itemWeight * itemAmount;
      }, 0)
    : 0;

  return {
    current: Number(current.toFixed(1)),
    max: DEFAULT_WEIGHT.max,
  };
}

export function normalizeInventoryPayload(payload = {}) {
  const inventory = Array.isArray(payload.inventory) ? payload.inventory : [];
  const baseStats = mergeStatsPayload(DEFAULT_STATS, payload.stats);
  const stats = payload.health != null ? mergeStatsPayload(baseStats, payload.health) : baseStats;

  return {
    name: payload.name || DEFAULT_CHARACTER_NAME,
    inventory,
    stats,
    weight: calculateWeight(inventory),
  };
}

export function findItemBySlot(inventory, slot) {
  if (!Array.isArray(inventory)) {
    return null;
  }

  return inventory.find((item) => item?.slot === slot) ?? null;
}

export function getItemImageCandidates(item) {
  const candidates = [];

  if (item?.key) {
    candidates.push(`assets/items/${item.key}.png`);
  }

  if (item?.data?.categoryIcon) {
    candidates.push(`assets/items/${item.data.categoryIcon}`);
  }

  return candidates;
}

export function getItemIcon(item) {
  switch (item?.data?.uiIcon) {
    case "mask":
      return "🎭";
    case "legs":
      return "👖";
    case "shoes":
      return "👟";
    case "top":
      return "🧥";
    case "item":
      return "◈";
    default:
      return null;
  }
}

export function getItemLabel(item) {
  return item?.displayName || item?.key || "Unknown";
}

export function applyEquipState(inventory, uid, equipped) {
  if (!Array.isArray(inventory)) {
    return inventory;
  }

  return inventory.map((item) =>
    item?.uid === uid
      ? {
          ...item,
          data: {
            ...(item.data || {}),
            equipped,
          },
        }
      : item
  );
}

export function moveInventoryItem(inventory, uid, targetSlot) {
  if (!Array.isArray(inventory)) {
    return inventory;
  }

  const sourceIndex = inventory.findIndex((item) => item?.uid === uid);
  if (sourceIndex === -1) {
    return inventory;
  }

  const sourceItem = inventory[sourceIndex];
  if (!sourceItem || sourceItem.slot === targetSlot) {
    return inventory;
  }

  const targetIndex = inventory.findIndex((item) => item?.slot === targetSlot);
  const nextInventory = inventory.map((item) => ({ ...item, data: item?.data ? { ...item.data } : item?.data }));

  if (targetIndex === -1) {
    nextInventory[sourceIndex] = {
      ...nextInventory[sourceIndex],
      slot: targetSlot,
    };
    return nextInventory;
  }

  const originalSourceSlot = sourceItem.slot;
  nextInventory[sourceIndex] = {
    ...nextInventory[sourceIndex],
    slot: targetSlot,
  };
  nextInventory[targetIndex] = {
    ...nextInventory[targetIndex],
    slot: originalSourceSlot,
  };

  return nextInventory;
}
