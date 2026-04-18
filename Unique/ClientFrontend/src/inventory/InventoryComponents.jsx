import React, { useMemo, useState } from "react";
import {
  BACKPACK_SLOTS,
  LOCKED_SLOTS,
  POCKET_SLOTS,
  QUICK_SLOT_NUMBERS,
  QUICK_SLOT_OFFSET,
  STAT_CONFIG,
} from "./inventoryConfig";
import {
  clampPercent,
  getItemIcon,
  getItemImageCandidates,
  getItemLabel,
} from "./inventoryUtils";
import { useInventoryDrag } from "./useInventoryDrag";

const SIDEBAR_TOOLS = [
  { icon: "BP", label: "Inventory", active: true },
  { icon: "CH", label: "Character" },
  { icon: "VH", label: "Vehicle" },
  { icon: "ST", label: "Settings" },
];

const EQUIPMENT_TILES = [
  { label: "Maske", icon: "MK", accepts: "mask" },
  { label: "Brille", icon: "GL", accepts: "glasses" },
  { label: "Kopfbedeckung", icon: "HT", accepts: "hat" },
  { label: "Ohrringe", icon: "OR" },
  { label: "Hemd", icon: "TP", accepts: "top" },
  { label: "Koerperruestung", icon: "AR" },
  { label: "Accessoires", icon: "AC" },
  { label: "Uhr", icon: "WT", accepts: "watch" },
  { label: "Waffe", icon: "WF" },
  { label: "Munition", icon: "AM" },
  { label: "Hose", icon: "LG", accepts: "legs" },
  { label: "Handschuhe", icon: "HG" },
  { label: "Rucksack", icon: "BP" },
  { label: "Schuhe", icon: "SH", accepts: "shoes" },
  { label: "Telefon", icon: "PH" },
];

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
    <div className="inventory-drag-ghost" style={{ left: x, top: y }}>
      <div className="inventory-drag-ghost-card">
        <ItemImage item={item} />
        <div className="inventory-drag-ghost-copy">
          <strong>{getItemLabel(item)}</strong>
          <span>x{item.amount ?? 1}</span>
        </div>
      </div>
    </div>
  );
}

function QuickSlot({ number, item }) {
  return (
    <div className="inventory-quick-slot">
      <button type="button" className="inventory-quick-slot-shell">
        {item ? <ItemImage item={item} /> : <span className="inventory-quick-slot-plus">+</span>}
      </button>
      <span className="inventory-quick-slot-index">{number}</span>
    </div>
  );
}

function SidebarToolButton({ icon, label, active }) {
  return (
    <button type="button" className={`inventory-tool-button ${active ? "active" : ""}`.trim()} title={label}>
      <span>{icon}</span>
    </button>
  );
}

function InventorySlot({
  slot,
  item,
  locked = false,
  dragState,
  onHoverTarget,
  onPickupItem,
  slotLabel,
}) {
  const equipped = !!item?.data?.equipped;
  const dragActive = dragState?.item?.uid === item?.uid;
  const canReceiveDrop = !!dragState?.active && !locked;

  return (
    <button
      type="button"
      className={`inventory-slot ${locked ? "locked" : ""} ${equipped ? "equipped" : ""} ${dragActive ? "dragging" : ""} ${canReceiveDrop ? "drop-ready" : ""}`.trim()}
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
      {slotLabel ? <span className="inventory-slot-index">{slotLabel}</span> : null}
      {item ? (
        <>
          <div className="inventory-slot-amount">x{item.amount}</div>
          <ItemImage item={item} />
          <div className="inventory-slot-label">{getItemLabel(item)}</div>
        </>
      ) : (
        <span className="inventory-slot-empty">{locked ? "LOCK" : "+"}</span>
      )}
    </button>
  );
}

function InventoryGrid({
  slots,
  itemsBySlot,
  dragState,
  onHoverTarget,
  onPickupItem,
  locked = false,
  className,
  showSlotNumbers = false,
  slotOffset = 0,
}) {
  return (
    <div className={`inventory-grid ${className || ""}`.trim()}>
      {slots.map((slot, index) => (
        <InventorySlot
          key={slot}
          slot={slot}
          item={itemsBySlot.get(slot) ?? null}
          locked={locked}
          dragState={dragState}
          onHoverTarget={onHoverTarget}
          onPickupItem={onPickupItem}
          slotLabel={showSlotNumbers ? String(index + 1 + slotOffset) : null}
        />
      ))}
    </div>
  );
}

function EquipmentTile({ tile, item, dragState, onHoverTarget }) {
  const acceptsDrop = !!tile.accepts && !!dragState?.item && dragState.item?.data?.uiIcon === tile.accepts;
  const hasDrag = !!dragState?.active;

  return (
    <div
      className={`inventory-equip-tile ${item ? "filled" : ""} ${acceptsDrop ? "active" : ""} ${hasDrag && !acceptsDrop ? "inactive" : ""}`.trim()}
      title={item ? getItemLabel(item) : tile.label}
      onMouseEnter={() => {
        if (!acceptsDrop) return;
        onHoverTarget({ type: "equip", accepts: tile.accepts });
      }}
      onMouseLeave={() => {
        if (!dragState?.active) return;
        onHoverTarget(null);
      }}
    >
      <div className="inventory-equip-icon-wrap">
        {item ? <ItemImage item={item} /> : <span className="inventory-equip-icon">{tile.icon}</span>}
      </div>
      <span className="inventory-equip-label">{item ? getItemLabel(item) : tile.label}</span>
    </div>
  );
}

function SectionHeader({ title, badge, count }) {
  return (
    <div className="inventory-section-header">
      <div className="inventory-section-title-wrap">
        <h3>{title}</h3>
        {badge ? <span className="inventory-section-badge">{badge}</span> : null}
      </div>
      {count ? <span className="inventory-section-count">{count}</span> : null}
    </div>
  );
}

function WeightBar({ current, max }) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, (current / safeMax) * 100));

  return (
    <div className="inventory-weight-bar">
      <div className="inventory-weight-icon">WG</div>
      <div className="inventory-weight-copy">
        <span>Rucksack-Gewicht</span>
        <div className="inventory-weight-track">
          <div className="inventory-weight-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="inventory-weight-values">
        <strong>{current.toFixed(1)}</strong>
        <span>/ {max.toFixed(1)} KG</span>
      </div>
    </div>
  );
}

function HelperHint() {
  return (
    <div className="inventory-helper-hint">
      <div className="inventory-helper-mouse">MS</div>
      <div>
        <strong>Ziehe einen Gegenstand hierher,</strong>
        <span>um ihn zu verschieben</span>
      </div>
    </div>
  );
}

function StatStack({ stats }) {
  return (
    <div className="inventory-stat-stack">
      {STAT_CONFIG.map((stat) => (
        <div key={stat.key} className={`inventory-stat-pill ${stat.colorClass}`}>
          <span className="inventory-stat-pill-icon">{stat.icon}</span>
          <div>
            <span className="inventory-stat-pill-label">{stat.label}</span>
            <strong className="inventory-stat-pill-value">{clampPercent(stats[stat.key])}%</strong>
          </div>
        </div>
      ))}
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
  const { activeDropLabel, dragState, pickupItem, setHoverTarget } = useInventoryDrag({
    visible,
    onUseItem,
    onMoveItem,
  });

  const itemsBySlot = useMemo(() => {
    const nextMap = new Map();

    inventory.forEach((item) => {
      if (item?.slot != null) {
        nextMap.set(item.slot, item);
      }
    });

    return nextMap;
  }, [inventory]);

  const equippedByIcon = useMemo(() => {
    const nextMap = new Map();

    inventory.forEach((item) => {
      if (item?.data?.equipped && item?.data?.uiIcon) {
        nextMap.set(item.data.uiIcon, item);
      }
    });

    return nextMap;
  }, [inventory]);

  return (
    <div className="inventory-overlay" style={{ display: visible ? "flex" : "none" }}>
      <div className="inventory-background-shade" />

      {dragState?.active && activeDropLabel ? (
        <div className="inventory-drag-banner">
          Drop on <strong>{activeDropLabel}</strong>
        </div>
      ) : null}

      {dragState?.active ? <DragGhost item={dragState.item} x={dragState.x} y={dragState.y} /> : null}

      <div className="inventory-shell">
        <aside className="inventory-sidebar">
          <div className="inventory-quick-panel">
            <div className="inventory-quick-head">Quick Slots</div>
            <div className="inventory-quick-list">
              {QUICK_SLOT_NUMBERS.map((number, index) => (
                <QuickSlot
                  key={number}
                  number={number}
                  item={itemsBySlot.get(QUICK_SLOT_OFFSET + index) ?? null}
                />
              ))}
            </div>
          </div>

          <div className="inventory-tool-rail">
            {SIDEBAR_TOOLS.map((tool) => (
              <SidebarToolButton key={tool.label} icon={tool.icon} label={tool.label} active={tool.active} />
            ))}
          </div>

          <StatStack stats={stats} />
        </aside>

        <main className="inventory-center">
          <div className="inventory-topbar">
            <WeightBar current={weight.current} max={weight.max} />
            <div className="inventory-topbar-actions">
              <button type="button" className="inventory-craft-button">
                Herstellung
                <span>Neu</span>
              </button>
              <button type="button" className="inventory-close-button" onClick={onClose}>
                Schliessen
              </button>
            </div>
          </div>

          <section className="inventory-board">
            <div className="inventory-board-head">
              <div>
                <p className="inventory-character-name">{charName}</p>
              </div>
            </div>

            <section className="inventory-section">
              <SectionHeader title="Taschen" count={`${POCKET_SLOTS.length} / ${POCKET_SLOTS.length}`} />
              <InventoryGrid
                slots={POCKET_SLOTS}
                itemsBySlot={itemsBySlot}
                dragState={dragState}
                onHoverTarget={setHoverTarget}
                onPickupItem={pickupItem}
                className="inventory-grid-pockets"
                showSlotNumbers
              />
            </section>

            <section className="inventory-section">
              <SectionHeader title="Rucksack" badge="Level 3" count={`${BACKPACK_SLOTS.length} / ${BACKPACK_SLOTS.length}`} />
              <InventoryGrid
                slots={BACKPACK_SLOTS}
                itemsBySlot={itemsBySlot}
                dragState={dragState}
                onHoverTarget={setHoverTarget}
                onPickupItem={pickupItem}
                className="inventory-grid-backpack"
              />
              <InventoryGrid
                slots={LOCKED_SLOTS}
                itemsBySlot={itemsBySlot}
                dragState={dragState}
                onHoverTarget={setHoverTarget}
                onPickupItem={pickupItem}
                locked
                className="inventory-grid-backpack inventory-grid-locked"
              />
            </section>
          </section>

          <HelperHint />
        </main>

        <section className="inventory-equipment-panel">
          <div className="inventory-equipment-head">
            <p>Ausrustung</p>
            <span>Outfit</span>
          </div>

          <div className="inventory-equipment-layout">
            <div className="inventory-equipment-grid">
              {EQUIPMENT_TILES.map((tile) => (
                <EquipmentTile
                  key={tile.label}
                  tile={tile}
                  item={tile.accepts ? equippedByIcon.get(tile.accepts) ?? null : null}
                  dragState={dragState}
                  onHoverTarget={setHoverTarget}
                />
              ))}
            </div>

            <div className="inventory-silhouette-panel">
              <div className="inventory-silhouette">
                <div className="silhouette-head" />
                <div className="silhouette-torso" />
                <div className="silhouette-arm left" />
                <div className="silhouette-arm right" />
                <div className="silhouette-leg left" />
                <div className="silhouette-leg right" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
