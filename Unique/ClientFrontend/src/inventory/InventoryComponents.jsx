import React, { useEffect, useMemo, useState } from "react";
import {
  BACKPACK_SLOTS,
  EQUIPMENT_COLUMNS,
  LOCKED_SLOTS,
  POCKET_SLOTS,
  QUICK_SLOT_NUMBERS,
  QUICK_SLOT_OFFSET,
  STAT_CONFIG,
} from "./inventoryConfig";
import {
  clampPercent,
  findItemBySlot,
  getItemIcon,
  getItemImageCandidates,
  getItemLabel,
} from "./inventoryUtils";

const DRAG_THRESHOLD = 6;

function ItemImage({ item }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const imageCandidates = useMemo(() => getItemImageCandidates(item), [item]);
  const activeSource = imageCandidates[candidateIndex] || null;
  const itemIcon = getItemIcon(item);

  if (!activeSource || showFallback) {
    return (
      <div className="inv-item-fallback">
        <span className="inv-item-fallback-icon">{itemIcon || item?.key?.slice(0, 2)?.toUpperCase() || "?"}</span>
      </div>
    );
  }

  return (
    <img
      src={activeSource}
      alt=""
      className="inv-item-img"
      onError={() => {
        setCandidateIndex((currentIndex) => {
          if (currentIndex < imageCandidates.length - 1) {
            return currentIndex + 1;
          }

          setShowFallback(true);
          return currentIndex;
        });
      }}
    />
  );
}

function DragGhost({ item, x, y }) {
  if (!item) return null;

  return (
    <div
      className="inventory-drag-ghost"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="inventory-drag-ghost-card">
        <ItemImage item={item} />
        <div className="inventory-drag-ghost-label">{getItemLabel(item)}</div>
      </div>
    </div>
  );
}

function InventorySlot({
  slot,
  inventory,
  locked = false,
  dragState,
  onHoverTarget,
  onPickupItem,
}) {
  const item = findItemBySlot(inventory, slot);
  const equipped = !!item?.data?.equipped;
  const dragActive = dragState?.item?.uid === item?.uid;
  const canReceiveDrop = !!dragState?.active && !locked;

  return (
    <button
      type="button"
      className={`inv-slot ${locked ? "locked" : ""} ${equipped ? "equipped" : ""} ${dragActive ? "dragging" : ""} ${canReceiveDrop ? "drop-ready" : ""}`}
      title={item ? getItemLabel(item) : undefined}
      onMouseDown={(event) => {
        if (!item || locked || event.button !== 0) return;
        event.preventDefault();
        onPickupItem(item, event);
      }}
      onMouseEnter={() => {
        if (!canReceiveDrop) return;
        onHoverTarget({ type: "slot", slot });
      }}
      onMouseLeave={() => {
        if (!dragState?.active) return;
        onHoverTarget(null);
      }}
    >
      {item && (
        <>
          <div className="inv-slot-amount">x{item.amount}</div>
          <ItemImage item={item} />
          <div className="inv-slot-label">{getItemLabel(item)}</div>
        </>
      )}
      {locked && <div className="slot-lock-icon">🔒</div>}
    </button>
  );
}

function SlotGrid({
  slots,
  inventory,
  dragState,
  onHoverTarget,
  onPickupItem,
  locked = false,
  className,
}) {
  return (
    <div className={`grid-slots ${className || ""}`.trim()}>
      {slots.map((slot) => (
        <InventorySlot
          key={slot}
          slot={slot}
          inventory={inventory}
          locked={locked}
          dragState={dragState}
          onHoverTarget={onHoverTarget}
          onPickupItem={onPickupItem}
        />
      ))}
    </div>
  );
}

function WeightBadge({ icon, current, max }) {
  return (
    <div className="weight-badge">
      <span className="weight-icon">{icon}</span>
      <span className="weight-value">{current.toFixed(1)}</span>
      <span className="weight-max">/ {max.toFixed(1)} KG.</span>
    </div>
  );
}

function EquipmentColumn({ items, className, inventory, dragState, onHoverTarget }) {
  return (
    <div className={className}>
      {items.map((item) => {
        const matchingItem = inventory.find(
          (entry) => entry?.data?.uiIcon === item.accepts && entry?.data?.equipped
        );
        const canAcceptDraggedItem = !!dragState?.item && dragState.item?.data?.uiIcon === item.accepts;
        const dragInProgress = !!dragState?.active;

        return (
          <div
            key={item.label}
            className={`equip-slot ${canAcceptDraggedItem ? "equip-slot-active" : ""} ${matchingItem ? "equip-slot-filled" : ""} ${dragInProgress && !canAcceptDraggedItem ? "equip-slot-inactive" : ""}`}
            title={matchingItem ? getItemLabel(matchingItem) : item.label}
            onMouseEnter={() => {
              if (!canAcceptDraggedItem) return;
              onHoverTarget({ type: "equip", accepts: item.accepts });
            }}
            onMouseLeave={() => {
              if (!dragState?.active) return;
              onHoverTarget(null);
            }}
          >
            <div className="equip-slot-icon">{item.icon}</div>
            <div className="equip-slot-label">{matchingItem ? getItemLabel(matchingItem) : item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatCircle({ value, colorClass, icon, label }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - clampPercent(value) / 100);

  return (
    <div className={`stat-circle-group ${colorClass}`} title={`${label}: ${clampPercent(value)}%`}>
      <svg className="circle-progress-svg" width="60" height="60">
        <circle cx="30" cy="30" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="stat-icon-inner">{icon}</div>
    </div>
  );
}

export function InventoryLayout({
  visible,
  charName,
  stats,
  inventory,
  weight,
  onClose,
  onUseItem,
  onMoveItem,
}) {
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

  const activeDropLabel = dragState?.item?.data?.uiIcon
    ? [...EQUIPMENT_COLUMNS.left, ...EQUIPMENT_COLUMNS.right].find((slot) => slot.accepts === dragState.item.data.uiIcon)?.label ?? null
    : null;

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

  return (
    <div className="inventory-overlay" style={{ display: visible ? "flex" : "none" }}>
      <div className="paradox-branding">
        <div className="paradox-logo">PARADOX</div>
        <div className="paradox-sub">DESIGN BY</div>
      </div>

      <div className="inv-controls-hint">
        <div className="control-item">
          <span>Drag items to slots or outfit</span>
          <div className="control-key">🖱️</div>
        </div>
        <button type="button" className="control-item control-button" onClick={onClose}>
          <span>Close inventory</span>
          <div className="control-key">ESC</div>
        </button>
      </div>

      {dragState?.active && activeDropLabel && (
        <div className="drag-hint-banner">
          Drop on <strong>{activeDropLabel}</strong>
        </div>
      )}

      {dragState?.active && (
        <DragGhost item={dragState.item} x={dragState.x} y={dragState.y} />
      )}

      <div className="inventory-container">
        <div className="inv-quick-access">
          {QUICK_SLOT_NUMBERS.map((number) => (
            <div key={number} className="quick-slot">
              <div className="inv-slot quick-slot-shell">
                <div className="quick-slot-dummy" />
              </div>
              <div className="quick-slot-index">{number}</div>
            </div>
          ))}
          <div className="quick-slot-label">QUICK ACCESS</div>
        </div>

        <div className="inv-main-grids">
          <section className="inv-panel">
            <div className="inv-section-title">
              <span>POCKETS</span>
              <WeightBadge icon="📦" current={Math.min(weight.current, 5)} max={5} />
            </div>
            <SlotGrid
              slots={POCKET_SLOTS}
              inventory={inventory}
              dragState={dragState}
              onHoverTarget={setHoverTarget}
              onPickupItem={pickupItem}
              className="slot-grid-pockets"
            />
          </section>

          <section className="inv-panel">
            <div className="inv-section-title">
              <span>BACKPACK</span>
              <WeightBadge icon="🎒" current={weight.current} max={weight.max} />
            </div>
            <div className="backpack-grid-stack">
              <SlotGrid
                slots={BACKPACK_SLOTS}
                inventory={inventory}
                dragState={dragState}
                onHoverTarget={setHoverTarget}
                onPickupItem={pickupItem}
                className="slot-grid-backpack"
              />
              <SlotGrid
                slots={LOCKED_SLOTS}
                inventory={inventory}
                dragState={dragState}
                onHoverTarget={setHoverTarget}
                onPickupItem={pickupItem}
                locked
                className="slot-grid-backpack"
              />
            </div>
          </section>
        </div>

        <div className="inv-character-section">
          <svg className="silhouette-clean" viewBox="0 0 300 700" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M150 50C165 50 175 60 175 80C175 100 165 110 150 110C135 110 125 100 125 80C125 60 135 50 150 50ZM150 120C175 120 200 140 210 170V280L190 650H110L90 280V170C100 140 125 120 150 120Z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>

          <div className="equip-slots-container">
            <EquipmentColumn
              items={EQUIPMENT_COLUMNS.left}
              className="equip-grid-left"
              inventory={inventory}
              dragState={dragState}
              onHoverTarget={setHoverTarget}
            />
            <EquipmentColumn
              items={EQUIPMENT_COLUMNS.right}
              className="equip-grid-right"
              inventory={inventory}
              dragState={dragState}
              onHoverTarget={setHoverTarget}
            />
          </div>

          <div className="char-info-vertical">
            <div className="char-label-v">YOUR CHARACTER</div>
            <div className="char-name-v">{charName}</div>
          </div>
        </div>

        <div className="inv-status-col">
          {STAT_CONFIG.map((stat) => (
            <StatCircle
              key={stat.key}
              value={stats[stat.key]}
              colorClass={stat.colorClass}
              icon={stat.icon}
              label={stat.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
