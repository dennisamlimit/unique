import { useEffect } from "react";
import {
  DEFAULT_CHARACTER_NAME,
  DEFAULT_STATS,
  DEFAULT_WEIGHT,
} from "./inventoryConfig";
import {
  applyEquipState,
  calculateWeight,
  mergeStatsPayload,
  normalizeInventoryPayload,
} from "./inventoryUtils";

export function useInventoryBridge({
  visible,
  setVisible,
  setCharName,
  setStats,
  setInventory,
  setWeight,
}) {
  useEffect(() => {
    window.inventoryApp = {
      show: (payload) => {
        const normalized = normalizeInventoryPayload(payload);
        setCharName(normalized.name || DEFAULT_CHARACTER_NAME);
        setInventory(normalized.inventory);
        setStats(normalized.stats || DEFAULT_STATS);
        setWeight(normalized.weight || DEFAULT_WEIGHT);
        setVisible(true);
      },
      hide: () => setVisible(false),
      updateStats: (payload) => setStats((current) => mergeStatsPayload(current, payload)),
      updateStatus: (payload) => setStats((current) => mergeStatsPayload(current, payload)),
      updateInventory: (payload) => {
        const normalized = normalizeInventoryPayload(payload);
        setInventory(normalized.inventory);
        setWeight(normalized.weight);

        if (payload?.name) {
          setCharName(normalized.name);
        }

        if (payload?.stats != null || payload?.health != null) {
          setStats(normalized.stats);
        }
      },
      updateEquipState: (uid, equipped) => {
        setInventory((current) => {
          const nextInventory = applyEquipState(current, uid, equipped);
          setWeight(calculateWeight(nextInventory));
          return nextInventory;
        });
      },
    };

    if (window.mp) {
      window.mp.trigger("client:inventory:ready");
    }

    return () => {
      delete window.inventoryApp;
    };
  }, [setCharName, setInventory, setStats, setVisible, setWeight]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && visible) {
        setVisible(false);
        if (window.mp) {
          window.mp.trigger("client:inventory:close");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, setVisible]);
}
