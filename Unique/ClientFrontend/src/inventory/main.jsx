import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";

const EMPTY_PAYLOAD = {
  version: 2,
  player: { name: "Spieler" },
  containers: [],
  items: [],
  meta: { interactionRange: 4.5 }
};

const wearableOrder = ["mask", "top", "undershirt", "pants", "shoes", "backpack"];

const iconMap = {
  box: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M10 16 24 8l14 8-14 8-14-8Z" />
      <path d="M10 16v16l14 8 14-8V16" />
      <path d="M24 24v16" />
    </svg>
  ),
  top: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M16 10h16l6 8-5 5-4-4v19H19V19l-4 4-5-5 6-8Z" />
    </svg>
  ),
  shirt: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M15 13h18v25H15z" />
      <path d="M19 13c1.2 3 2.9 5 5 5s3.8-2 5-5" />
    </svg>
  ),
  pants: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M15 10h18l-2 28h-6l-1-10-1 10h-6l-2-28Z" />
    </svg>
  ),
  shoes: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M11 28h12l6 4h8v6H11z" />
      <path d="M17 28V18" />
    </svg>
  ),
  backpack: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M15 16a9 9 0 0 1 18 0" />
      <rect x="12" y="16" width="24" height="22" rx="7" />
      <path d="M18 22h12M18 27h12" />
    </svg>
  ),
  mask: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M11 14h26l-2 16-11 8-11-8-2-16Z" />
      <path d="M18 22h.01M30 22h.01M20 30c1.6 1.3 5.1 1.3 6.8 0" />
    </svg>
  ),
  ground: (
    <svg viewBox="0 0 48 48" className="h-6 w-6 fill-none stroke-current stroke-[1.9]">
      <path d="M8 33c6-5 26-5 32 0" />
      <path d="M16 27c4-3 12-3 16 0" />
      <path d="M22 10h4v14h-4z" />
    </svg>
  )
};

function parsePayload(rawPayload) {
  try {
    const parsed = JSON.parse(rawPayload || "{}");
    return {
      ...EMPTY_PAYLOAD,
      ...parsed,
      player: { ...EMPTY_PAYLOAD.player, ...(parsed?.player || {}) },
      containers: Array.isArray(parsed?.containers) ? parsed.containers : [],
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      meta: { ...EMPTY_PAYLOAD.meta, ...(parsed?.meta || {}) }
    };
  } catch (error) {
    return EMPTY_PAYLOAD;
  }
}

function formatWeight(value) {
  return `${Number(value || 0).toFixed(1)} kg`;
}

function getContainerWeight(items, containerId) {
  return items
    .filter((item) => item.containerId === containerId)
    .reduce((sum, item) => sum + Number(item.weight || 0) * Number(item.quantity || 1), 0);
}

function rarityClass(rarity) {
  if (rarity === "epic") return "text-fuchsia-200";
  if (rarity === "rare") return "text-cyan-200";
  if (rarity === "uncommon") return "text-emerald-200";
  return "text-zinc-300";
}

function slotLabel(slotKey) {
  if (slotKey === "top") return "Oberteil";
  if (slotKey === "undershirt") return "Unterhemd";
  if (slotKey === "pants") return "Hose";
  if (slotKey === "shoes") return "Schuhe";
  if (slotKey === "backpack") return "Backpack";
  return "Maske";
}

function InventorySlot({
  item,
  selected,
  onSelect,
  onDropItem,
  onDragStart,
  draggedItemId,
  containerKind,
  label
}) {
  const isDragging = draggedItemId === item?.id;

  return (
    <button
      type="button"
      draggable={Boolean(item)}
      onDragStart={() => item && onDragStart(item.id)}
      onDragEnd={() => onDragStart(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropItem();
      }}
      onClick={onSelect}
      className={`group relative grid min-h-[78px] content-between rounded-[22px] border p-3 text-left transition ${
        selected
          ? "border-fuchsia-300/60 bg-fuchsia-500/18 shadow-[0_0_28px_rgba(226,70,186,0.22)]"
          : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]"
      } ${isDragging ? "opacity-35" : ""}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <span className={selected ? "text-fuchsia-100" : "text-violet-100/85"}>
          {item ? iconMap[item.icon] || iconMap.box : containerKind === "ground" ? iconMap.ground : iconMap.box}
        </span>
        <span className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">
          {label}
        </span>
      </div>

      {item ? (
        <div className="relative">
          <div className="truncate text-[12px] font-black uppercase tracking-[0.18em] text-white">{item.name}</div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            <span>{item.quantity > 1 ? `x${item.quantity}` : item.category}</span>
            <span>{formatWeight(Number(item.weight || 0) * Number(item.quantity || 1))}</span>
          </div>
        </div>
      ) : (
        <div className="relative text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
          Leer
        </div>
      )}
    </button>
  );
}

function InventoryApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredUiTheme());
  const [payload, setPayload] = useState(EMPTY_PAYLOAD);
  const [selectedId, setSelectedId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const applyPayload = (rawPayload) => {
      const parsed = parsePayload(rawPayload);
      setPayload(parsed);
      setSelectedId((current) => current && parsed.items.some((item) => item.id === current) ? current : parsed.items[0]?.id ?? null);
    };

    let noticeTimeout = null;
    window.inventoryApp = {
      open: (rawPayload) => {
        applyPayload(rawPayload);
        setVisible(true);
      },
      close: () => setVisible(false),
      setState: (rawPayload) => applyPayload(rawPayload),
      setTheme: (raw) => {
        try {
          setTheme(persistUiTheme(normalizeUiTheme(typeof raw === "string" ? JSON.parse(raw) : raw)));
        } catch {
          setTheme(getStoredUiTheme());
        }
      },
      notify: (message) => {
        setNotice(String(message || ""));
        if (noticeTimeout) {
          window.clearTimeout(noticeTimeout);
        }
        noticeTimeout = window.setTimeout(() => setNotice(""), 2400);
      }
    };

    trigger("cef:inventory:ready");

    return () => {
      if (noticeTimeout) {
        window.clearTimeout(noticeTimeout);
      }
      delete window.inventoryApp;
    };
  }, []);

  const selectedItem = useMemo(() => payload.items.find((item) => item.id === selectedId) ?? payload.items[0] ?? null, [payload.items, selectedId]);
  const wearableItems = useMemo(() => {
    const lookup = new Map(payload.items.filter((item) => item.wearableSlot).map((item) => [item.wearableSlot, item]));
    return wearableOrder.map((slot) => [slot, lookup.get(slot) ?? null]);
  }, [payload.items]);
  const visibleContainers = useMemo(() => payload.containers.filter((container) => container.kind !== "ground"), [payload.containers]);
  const groundContainer = useMemo(() => payload.containers.find((container) => container.kind === "ground") ?? null, [payload.containers]);
  const groundItems = useMemo(() => payload.items.filter((item) => item.containerId === "ground"), [payload.items]);

  if (!visible) {
    return null;
  }

  const themeVars = getThemeVars(theme);

  return (
    <main className="unique-theme fixed inset-0 overflow-hidden bg-[#09070d]/90 text-white" style={themeVars}>
      <style>{THEME_CSS}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_bottom,rgba(202,72,165,0.24),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(105,74,255,0.18),transparent_24%),linear-gradient(140deg,rgba(9,7,13,0.98),rgba(16,14,24,0.94)_35%,rgba(25,23,41,0.96)_100%)]" />
      <div className="pointer-events-none absolute inset-y-[8%] left-[7%] w-[22vw] min-w-[200px] rounded-full bg-[radial-gradient(circle,rgba(194,52,146,0.18),transparent_65%)] blur-3xl" />

      {notice ? (
        <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full border border-fuchsia-300/25 bg-black/45 px-5 py-3 text-[11px] font-black uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          {notice}
        </div>
      ) : null}

      <section className="relative z-10 mx-auto grid h-full w-full max-w-[1500px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1.05fr_1.32fr_0.88fr] lg:px-6 lg:py-6">
        <aside className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-4 rounded-[30px] border border-white/10 bg-black/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 object-contain p-2" src={logoSrc} alt="Unique" />
              <div>
                <div className="font-display text-4xl uppercase leading-none tracking-[0.12em] text-white">Inventory</div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-[0.32em] text-fuchsia-200">Your Gear</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => trigger("cef:inventory:close")}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-200 transition hover:bg-white/10"
            >
              ESC
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Charakter</div>
              <div className="mt-2 text-lg font-black uppercase tracking-[0.14em] text-white">{payload.player.name}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Spieler-Last</div>
              <div className="mt-2 text-lg font-black text-white">
                {formatWeight(getContainerWeight(payload.items, "player"))}
                <span className="text-sm text-zinc-500"> / {formatWeight(visibleContainers.find((entry) => entry.id === "player")?.maxWeight)}</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Boden-Reichweite</div>
              <div className="mt-2 text-lg font-black text-white">{payload.meta.interactionRange}m</div>
            </div>
          </div>

          <div className="grid min-h-0 gap-4">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">Kleidung</div>
                  <div className="mt-1 text-sm font-black uppercase tracking-[0.18em] text-white">An- und Ausziehen direkt im Inventar</div>
                </div>
                <div className="rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-100">
                  Live
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {wearableItems.map(([slotKey, item]) => (
                  <button
                    key={slotKey}
                    type="button"
                    draggable={Boolean(item)}
                    onDragStart={() => item && setDraggedItemId(item.id)}
                    onDragEnd={() => setDraggedItemId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedItemId) {
                        trigger("cef:inventory:action", JSON.stringify({
                          type: "move",
                          itemId: draggedItemId,
                          toContainerId: "player",
                          toSlot: item?.slot ?? 0
                        }));
                        setDraggedItemId(null);
                      }
                    }}
                    onClick={() => item && setSelectedId(item.id)}
                    className={`grid min-h-[120px] content-between rounded-[24px] border p-4 text-left transition ${
                      selectedItem?.id === item?.id
                        ? "border-fuchsia-300/55 bg-fuchsia-500/16"
                        : "border-white/8 bg-black/20 hover:border-white/18 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={item?.equipped ? "text-fuchsia-100" : "text-zinc-300"}>{iconMap[item?.icon] || iconMap[slotKey] || iconMap.box}</span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${item?.equipped ? "bg-fuchsia-500/20 text-fuchsia-100" : "bg-white/5 text-zinc-500"}`}>
                        {item?.equipped ? "an" : "aus"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{slotLabel(slotKey)}</div>
                      <div className="mt-1 truncate text-sm font-black uppercase tracking-[0.14em] text-white">{item?.name || "Leer"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-[28px] border border-dashed border-fuchsia-300/20 bg-fuchsia-500/5 p-4"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedItemId) {
                  trigger("cef:inventory:action", JSON.stringify({
                    type: "move",
                    itemId: draggedItemId,
                    toContainerId: "ground",
                    toSlot: 0
                  }));
                  setDraggedItemId(null);
                }
              }}
            >
              <div className="flex items-center gap-3 text-fuchsia-100">
                {iconMap.ground}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-fuchsia-200/80">Drop Zone</div>
                  <div className="text-sm font-black uppercase tracking-[0.16em]">Items auf den Boden ziehen</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Ziehe Items hier hinein, um sie vor dir auf den Boden zu legen. Nahe Spieler sehen dieselbe Bodenzone in Reichweite.
              </p>
            </div>
          </div>
        </aside>

        <section className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-4 rounded-[30px] border border-white/10 bg-black/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-500">Stauraum</div>
              <div className="mt-1 text-xl font-black uppercase tracking-[0.16em] text-white">Taschen, Backpack und Boden</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">
              Drag & Drop aktiv
            </div>
          </div>

          <div className="grid min-h-0 gap-4 overflow-y-auto pr-1">
            {visibleContainers.map((container) => {
              const containerItems = payload.items.filter((item) => item.containerId === container.id);
              return (
                <div key={container.id} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">{container.kind}</div>
                      <div className="mt-1 text-base font-black uppercase tracking-[0.16em] text-white">{container.title}</div>
                      <div className="mt-1 text-sm text-zinc-400">{container.subtitle}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-300">
                      {formatWeight(getContainerWeight(payload.items, container.id))} / {formatWeight(container.maxWeight)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: container.capacity }).map((_, slotIndex) => {
                      const item = containerItems.find((entry) => entry.slot === slotIndex) ?? null;
                      return (
                        <InventorySlot
                          key={`${container.id}-${slotIndex}`}
                          item={item}
                          selected={selectedItem?.id === item?.id}
                          draggedItemId={draggedItemId}
                          label={`S${slotIndex + 1}`}
                          containerKind={container.kind}
                          onSelect={() => item && setSelectedId(item.id)}
                          onDragStart={setDraggedItemId}
                          onDropItem={() => {
                            if (!draggedItemId) {
                              return;
                            }

                            trigger("cef:inventory:action", JSON.stringify({
                              type: "move",
                              itemId: draggedItemId,
                              toContainerId: container.id,
                              toSlot: slotIndex
                            }));
                            setDraggedItemId(null);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {groundContainer ? (
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(87,28,67,0.22),rgba(16,12,24,0.32))] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Nearby Loot</div>
                  <div className="mt-1 text-base font-black uppercase tracking-[0.16em] text-white">{groundContainer.title}</div>
                  <div className="mt-1 text-sm text-zinc-400">{groundContainer.subtitle}</div>
                </div>
                <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-zinc-300">
                  Aufheben per Drag & Drop
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: groundContainer.capacity }).map((_, slotIndex) => {
                  const item = groundItems.find((entry) => entry.slot === slotIndex) ?? groundItems[slotIndex] ?? null;
                  return (
                    <InventorySlot
                      key={`ground-${slotIndex}`}
                      item={item}
                      selected={selectedItem?.id === item?.id}
                      draggedItemId={draggedItemId}
                      label={`G${slotIndex + 1}`}
                      containerKind="ground"
                      onSelect={() => item && setSelectedId(item.id)}
                      onDragStart={setDraggedItemId}
                      onDropItem={() => {}}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-4 rounded-[30px] border border-white/10 bg-black/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Ausgewählt</div>
            <div className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white">{selectedItem?.name || "Kein Item"}</div>
            <div className={`mt-2 text-[11px] font-black uppercase tracking-[0.28em] ${rarityClass(selectedItem?.rarity)}`}>
              {selectedItem?.rarity || "common"} {selectedItem?.equipped ? "• ausgerüstet" : ""}
            </div>
          </div>

          <div className="grid content-start gap-4 overflow-y-auto pr-1">
            <div className="grid place-items-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%),linear-gradient(180deg,rgba(35,24,50,0.9),rgba(10,8,18,0.9))] p-8 text-fuchsia-100">
              {selectedItem ? iconMap[selectedItem.icon] || iconMap.box : iconMap.box}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Beschreibung</div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {selectedItem?.description || "Wähle links ein Item aus, ziehe es in einen anderen Container oder lege es direkt auf den Boden."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Menge</div>
                <div className="mt-2 text-lg font-black text-white">{selectedItem?.quantity ?? 0}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Gewicht</div>
                <div className="mt-2 text-lg font-black text-white">{selectedItem ? formatWeight(Number(selectedItem.weight || 0) * Number(selectedItem.quantity || 1)) : "-"}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Typ</div>
                <div className="mt-2 text-lg font-black text-white">{selectedItem?.category || "-"}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Container</div>
                <div className="mt-2 text-lg font-black text-white">{payload.containers.find((entry) => entry.id === selectedItem?.containerId)?.title || "Boden"}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              disabled={!selectedItem}
              onClick={() => selectedItem && trigger("cef:inventory:action", JSON.stringify({ type: "use", itemId: selectedItem.id }))}
              className="rounded-[20px] border border-fuchsia-300/30 bg-fuchsia-500/14 px-4 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-fuchsia-100 transition hover:bg-fuchsia-500/24 disabled:cursor-default disabled:opacity-40"
            >
              {selectedItem?.kind === "clothing"
                ? (selectedItem?.equipped ? "Ausziehen" : "Anziehen")
                : selectedItem?.kind === "backpack"
                  ? (selectedItem?.equipped ? "Backpack ablegen" : "Backpack anlegen")
                  : "Benutzen"}
            </button>
            <button
              type="button"
              disabled={!selectedItem || selectedItem.containerId === "ground"}
              onClick={() => selectedItem && trigger("cef:inventory:action", JSON.stringify({
                type: "move",
                itemId: selectedItem.id,
                toContainerId: "ground",
                toSlot: 0
              }))}
              className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-zinc-200 transition hover:bg-white/[0.09] disabled:cursor-default disabled:opacity-40"
            >
              Auf den Boden legen
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<InventoryApp />);
