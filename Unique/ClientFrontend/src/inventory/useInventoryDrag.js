import { useEffect, useMemo, useState } from "react";
import { EQUIPMENT_COLUMNS } from "./inventoryConfig";

const DRAG_THRESHOLD = 6;

export function useInventoryDrag({ visible, onUseItem, onMoveItem }) {
  const [dragState, setDragState] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  useEffect(() => {
    if (!visible || !dragState) return undefined;

    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const distance = Math.hypot(deltaX, deltaY);

      setDragState((current) => {
        if (!current) return current;
        return {
          ...current,
          x: event.clientX,
          y: event.clientY,
          active: current.active || distance > DRAG_THRESHOLD,
        };
      });
    };

    const handleMouseUp = () => {
      if (!dragState) return;

      if (!dragState.active) {
        onUseItem(dragState.item);
      } else if (hoverTarget?.type === "slot") {
        onMoveItem(dragState.item.uid, hoverTarget.slot);
      } else if (hoverTarget?.type === "equip" && dragState.item?.data?.uiIcon === hoverTarget.accepts) {
        onUseItem(dragState.item);
      }

      setDragState(null);
      setHoverTarget(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, hoverTarget, onMoveItem, onUseItem, visible]);

  const activeDropLabel = useMemo(() => {
    if (!dragState?.item?.data?.uiIcon) {
      return null;
    }

    return (
      [...EQUIPMENT_COLUMNS.left, ...EQUIPMENT_COLUMNS.right].find(
        (slot) => slot.accepts === dragState.item.data.uiIcon
      )?.label ?? null
    );
  }, [dragState]);

  const pickupItem = (item, event) => {
    setDragState({
      item,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
    });
    setHoverTarget(null);
  };

  return {
    activeDropLabel,
    dragState,
    hoverTarget,
    pickupItem,
    setHoverTarget,
  };
}
