import { type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { emitToClient } from "../lib/ragemp";

const SLOT = "h-[104px] w-[104px]";
const quickSlots = Array.from({ length: 5 });
const pocketSlots = Array.from({ length: 6 });
const backpackSlots = Array.from({ length: 30 });

const equipmentSlots = [
  { label: "Maske", icon: "MSK", className: "left-[118px] top-[0px]" },
  { label: "Hut", icon: "HAT", className: "left-[118px] top-[118px]" },
  { label: "Brille", icon: "GLS", className: "left-[0px] top-[118px]" },
  { label: "Ohrringe", icon: "EAR", className: "left-[236px] top-[118px]" },
  { label: "Shirt", icon: "TEE", className: "left-[118px] top-[236px]" },
  { label: "Hemd", icon: "SHR", className: "left-[0px] top-[236px]" },
  { label: "Weste", icon: "VST", className: "left-[236px] top-[236px]" },
  { label: "Handschuhe", icon: "GLV", className: "left-[236px] top-[354px]" },
  { label: "Uhr", icon: "CLK", className: "left-[0px] top-[472px]" },
  { label: "Rucksack", icon: "BAG", className: "left-[0px] top-[590px]" },
  { label: "Waffe", icon: "GUN", className: "left-[0px] top-[354px]" },
  { label: "Munition", icon: "AMM", className: "left-[118px] top-[354px]" },
  { label: "Hose", icon: "PNT", className: "left-[118px] top-[472px]" },
  { label: "Schuhe", icon: "SHO", className: "left-[118px] top-[590px]" },
  { label: "Telefon", icon: "PHN", className: "left-[236px] top-[590px]" }
];

type Rarity = "common" | "rare" | "epic" | "legendary";

interface InventoryItem {
  id: string;
  name: string;
  icon: ReactNode;
  amount?: number;
  rarity?: Rarity;
  weight?: string;
  desc?: string;
}

type ItemsState = Record<string, InventoryItem | undefined>;

interface ItemMenuState {
  slotId: string;
  item: InventoryItem;
  x: number;
  y: number;
}

interface SplitDialogState {
  slotId: string;
  item: InventoryItem;
  amount: number;
}

export interface NearbyInventoryPlayer {
  remoteId: number;
  name: string;
  distance: number;
}

interface GiveTargetState {
  slotId: string;
  item: InventoryItem;
}

interface SlotProps {
  slotId: string;
  item: InventoryItem | undefined;
  dragSlot: string | null;
  setDragSlot: (slotId: string | null) => void;
  onDrop: (slotId: string) => void;
  onItemClick: (event: MouseEvent, slotId: string, item: InventoryItem) => void;
}

const initialItems: ItemsState = {
  quick_0: { id: "water", name: "Wasser", icon: "H2O", amount: 1, rarity: "common", weight: "0.3 kg", desc: "Eine kleine Wasserflasche." },
  quick_1: { id: "medkit", name: "Medkit", icon: "+", amount: 1, rarity: "rare", weight: "1.2 kg", desc: "Kann zur schnellen Erstversorgung genutzt werden." },
  pocket_0: { id: "shirt", name: "T-Shirt", icon: "TEE", amount: 1, rarity: "common", weight: "0.2 kg", desc: "Ein normales Kleidungsstueck." },
  pocket_1: { id: "idcard", name: "Ausweis", icon: "ID", amount: 1, rarity: "common", weight: "0.1 kg", desc: "Persoenliches Dokument." },
  pocket_2: { id: "wallet", name: "Geldboerse", icon: "$", amount: 1, rarity: "common", weight: "0.4 kg", desc: "Enthaelt persoenliche Gegenstaende." },
  backpack_2: { id: "water", name: "Wasser", icon: "H2O", amount: 3, rarity: "common", weight: "0.9 kg", desc: "Stillt deinen Durst." },
  backpack_5: { id: "bandage", name: "Verband", icon: "+", amount: 2, rarity: "rare", weight: "0.4 kg", desc: "Ein medizinischer Verband." },
  backpack_11: { id: "cash", name: "Bargeld", icon: "$", amount: 1, rarity: "legendary", weight: "0.0 kg", desc: "Bargeld in deiner Tasche." },
  backpack_19: { id: "key", name: "Schluessel", icon: "KEY", amount: 1, rarity: "epic", weight: "0.1 kg", desc: "Ein Schluessel fuer ein Fahrzeug oder Objekt." },
  equip_1: { id: "mask", name: "Maske", icon: "MSK", amount: 1, rarity: "rare", weight: "0.2 kg", desc: "Eine ausgeruestete Maske." },
  equip_2: { id: "glasses", name: "Brille", icon: "GLS", amount: 1, rarity: "common", weight: "0.1 kg", desc: "Eine ausgeruestete Brille." },
  equip_4: { id: "shirt_equip", name: "Hemd", icon: "SHR", amount: 1, rarity: "common", weight: "0.5 kg", desc: "Dein aktuelles Oberteil." },
  equip_5: { id: "undershirt", name: "Shirt", icon: "TEE", amount: 1, rarity: "common", weight: "0.2 kg", desc: "Dein aktuelles Shirt." },
  equip_12: { id: "pants", name: "Hose", icon: "PNT", amount: 1, rarity: "common", weight: "0.6 kg", desc: "Deine aktuelle Hose." },
  equip_13: { id: "shoes", name: "Schuhe", icon: "SHO", amount: 1, rarity: "common", weight: "0.8 kg", desc: "Deine aktuellen Schuhe." }
};

const rarityStyle: Record<Rarity, { label: string; color: string; dot: string }> = {
  common: { label: "Gewoehnlich", color: "text-white/45", dot: "bg-white/40" },
  rare: { label: "Selten", color: "text-unique-teal", dot: "bg-unique-teal" },
  epic: { label: "Episch", color: "text-unique-gold/80", dot: "bg-unique-gold/80" },
  legendary: { label: "Legendaer", color: "text-unique-gold", dot: "bg-unique-gold" }
};

function combineItems(a: InventoryItem | undefined, b: InventoryItem | undefined) {
  if (!a || !b || a.id !== b.id) {
    return null;
  }
  return { ...a, amount: (a.amount || 1) + (b.amount || 1) };
}

function moveItem(items: ItemsState, fromSlot: string | null, toSlot: string) {
  if (!fromSlot || !toSlot || fromSlot === toSlot || !items[fromSlot]) {
    return items;
  }

  const next = { ...items };
  const fromItem = next[fromSlot];
  const toItem = next[toSlot];
  const combined = combineItems(fromItem, toItem);

  if (combined) {
    next[toSlot] = combined;
    delete next[fromSlot];
    return next;
  }

  next[toSlot] = fromItem;
  if (toItem) {
    next[fromSlot] = toItem;
  } else {
    delete next[fromSlot];
  }
  return next;
}

function dropItem(items: ItemsState, slotId: string) {
  if (!slotId || !items[slotId]) {
    return items;
  }
  const next = { ...items };
  delete next[slotId];
  return next;
}

function getFreeSplitSlots(items: ItemsState) {
  return [
    ...quickSlots.map((_, index) => `quick_${index}`),
    ...pocketSlots.map((_, index) => `pocket_${index}`),
    ...backpackSlots.map((_, index) => `backpack_${index}`)
  ].filter((id) => !items[id]);
}

function splitItem(items: ItemsState, slotId: string, splitAmountOverride?: number) {
  const item = items[slotId];
  if (!item || !item.amount || item.amount <= 1) {
    return items;
  }

  const freeSlot = getFreeSplitSlots(items)[0];
  if (!freeSlot) {
    return items;
  }

  const maxSplit = item.amount - 1;
  const requested = splitAmountOverride ?? Math.floor(item.amount / 2);
  const splitAmount = Math.max(1, Math.min(maxSplit, Number(requested) || 1));
  const remaining = item.amount - splitAmount;

  return {
    ...items,
    [slotId]: { ...item, amount: remaining },
    [freeSlot]: { ...item, id: `${item.id}_${freeSlot}`, amount: splitAmount }
  };
}

export function InventoryUI({ nearbyPlayers = [] }: { nearbyPlayers?: NearbyInventoryPlayer[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<ItemsState>(initialItems);
  const [dragSlot, setDragSlot] = useState<string | null>(null);
  const [menu, setMenu] = useState<ItemMenuState | null>(null);
  const [splitDialog, setSplitDialog] = useState<SplitDialogState | null>(null);
  const [giveTarget, setGiveTarget] = useState<GiveTargetState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!nearbyPlayers.length) {
      setSelectedPlayerId(null);
      return;
    }

    setSelectedPlayerId((current) => nearbyPlayers.some((player) => player.remoteId === current) ? current : nearbyPlayers[0].remoteId);
  }, [nearbyPlayers]);

  function handleDrop(toSlot: string) {
    setItems((current) => moveItem(current, dragSlot, toSlot));
    setDragSlot(null);
    setMenu(null);
  }

  function handleGiveDrop() {
    if (!dragSlot || !items[dragSlot]) {
      return;
    }

    setGiveTarget({ slotId: dragSlot, item: items[dragSlot] });
    setSelectedPlayerId((current) => current ?? nearbyPlayers[0]?.remoteId ?? null);
    setDragSlot(null);
    setMenu(null);
  }

  function openItemMenu(event: MouseEvent, slotId: string, item: InventoryItem) {
    event.stopPropagation();

    const menuWidth = 420;
    const menuHeight = 300;
    const x = Math.min(event.clientX + 12, window.innerWidth - menuWidth - 16);
    const y = Math.min(event.clientY + 12, window.innerHeight - menuHeight - 16);
    setMenu({ slotId, item, x, y });
  }

  function handleAction(action: "use" | "split" | "drop" | "craft") {
    if (!menu) {
      return;
    }

    if (action === "drop") {
      setItems((current) => dropItem(current, menu.slotId));
    }

    if (action === "split") {
      if ((menu.item.amount || 1) > 2) {
        setSplitDialog({ slotId: menu.slotId, item: menu.item, amount: Math.floor((menu.item.amount || 2) / 2) });
        setMenu(null);
        return;
      }
      setItems((current) => splitItem(current, menu.slotId, 1));
    }

    if (action === "use" || action === "craft") {
      setItems((current) => current);
    }
    setMenu(null);
  }

  function confirmSplit() {
    if (!splitDialog) {
      return;
    }
    setItems((current) => splitItem(current, splitDialog.slotId, splitDialog.amount));
    setSplitDialog(null);
  }

  function confirmGive() {
    if (!giveTarget || selectedPlayerId === null) {
      return;
    }

    emitToClient("unique:cef:inventoryGive", {
      slotId: giveTarget.slotId,
      itemId: giveTarget.item.id,
      itemName: giveTarget.item.name,
      amount: giveTarget.item.amount || 1,
      targetRemoteId: selectedPlayerId
    });
    setGiveTarget(null);
  }

  function closeInventory() {
    setMenu(null);
    setSplitDialog(null);
    emitToClient("unique:cef:inventoryClose", {});
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (splitDialog) {
      setSplitDialog(null);
      return;
    }
    closeInventory();
  }

  return (
    <div
      data-inventory-ui
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-[720] overflow-hidden bg-black/82 font-sans text-white outline-none backdrop-blur-[4px]"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        background:
          "linear-gradient(135deg, rgb(0 0 0 / 0.78), rgb(var(--unique-bg-rgb) / 0.86) 46%, rgb(0 0 0 / 0.84))",
        WebkitBackdropFilter: "blur(4px)",
        backdropFilter: "blur(4px)"
      } as CSSProperties}
      onClick={() => setMenu(null)}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => event.detail > 1 && event.preventDefault()}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 24% 18%, rgb(var(--unique-teal-rgb) / 0.13), transparent 34%), radial-gradient(circle at 82% 14%, rgb(var(--unique-gold-rgb) / 0.08), transparent 30%), linear-gradient(135deg, rgba(0,0,0,0.28), rgba(0,0,0,0.82))"
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:48px_48px] opacity-28" />

      <main className="relative h-full px-8 py-6">
        <TopBar />

        <section className="absolute left-8 top-[170px]">
          <QuickSlots items={items} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={handleDrop} onItemClick={openItemMenu} />
        </section>

        <section className="absolute left-[250px] top-[105px]">
          <SectionTitle title="Taschen" value="6 Slots" />
          <div className="grid grid-cols-6 gap-3">
            {pocketSlots.map((_, index) => {
              const slotId = `pocket_${index}`;
              return <Slot key={slotId} slotId={slotId} item={items[slotId]} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={handleDrop} onItemClick={openItemMenu} />;
            })}
          </div>
        </section>

        <section className="absolute left-[250px] top-[250px]">
          <SectionTitle title="Rucksack" value="30 Slots" />
          <div className="grid grid-cols-6 gap-3">
            {backpackSlots.map((_, index) => {
              const slotId = `backpack_${index}`;
              return <Slot key={slotId} slotId={slotId} item={items[slotId]} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={handleDrop} onItemClick={openItemMenu} />;
            })}
          </div>
        </section>

        <section className="absolute right-[32px] top-[130px] h-[730px] w-[610px]">
          <CharacterArea items={items} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={handleDrop} onItemClick={openItemMenu} />
        </section>

        <GiveDropArea
          dragActive={Boolean(dragSlot)}
          target={giveTarget}
          nearbyPlayers={nearbyPlayers}
          selectedPlayerId={selectedPlayerId}
          onDrop={handleGiveDrop}
          onSelectPlayer={setSelectedPlayerId}
          onGive={confirmGive}
          onClear={() => setGiveTarget(null)}
        />
      </main>

      {menu ? <ItemMenu menu={menu} onAction={handleAction} /> : null}
      {splitDialog ? <SplitDialog splitDialog={splitDialog} setSplitDialog={setSplitDialog} onConfirm={confirmSplit} /> : null}
    </div>
  );
}

function TopBar() {
  return (
    <div className="flex items-start justify-between border-b border-white/10 pb-4">
      <div className="flex items-center gap-5">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">Rucksackgewicht</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-lg font-black text-white">11.9</span>
            <span className="pb-1 text-[10px] text-white/35">/ 80 kg</span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-unique-gold">
          <Icon name="bag" size={18} />
        </div>
      </div>

      <div className="flex gap-4">
        <TopButton icon="mouse" label="Info & Interaktion" muted />
        <TopButton icon="camouflage" label="Waffentarnung" badge="Neu" />
        <TopButton icon="craft" label="Crafting Items" />
      </div>
    </div>
  );
}

function TopButton({ icon, label, badge, muted = false }: { icon: string; label: string; badge?: string; muted?: boolean }) {
  return (
    <div className="flex h-11 min-w-[190px] items-center justify-center gap-3 rounded-full border border-white/14 bg-black/18 px-5 text-[11px] font-black uppercase tracking-[0.11em] text-white/62">
      <Icon name={icon} size={17} />
      <span className={muted ? "text-white/35" : ""}>{label}</span>
      {badge ? <span className="text-[9px] text-unique-gold">{badge}</span> : null}
    </div>
  );
}

function QuickSlots(props: {
  items: ItemsState;
  dragSlot: string | null;
  setDragSlot: (slotId: string | null) => void;
  onDrop: (slotId: string) => void;
  onItemClick: (event: MouseEvent, slotId: string, item: InventoryItem) => void;
}) {
  return (
    <div className="relative flex flex-col gap-3">
      <div className="absolute left-[96px] top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
        Schnellzugriff
      </div>

      {quickSlots.map((_, index) => {
        const slotId = `quick_${index}`;
        return (
          <div key={slotId} className="relative">
            <Slot slotId={slotId} item={props.items[slotId]} dragSlot={props.dragSlot} setDragSlot={props.setDragSlot} onDrop={props.onDrop} onItemClick={props.onItemClick} />
            <div className="absolute -right-6 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center border border-white/14 bg-black/45 text-[10px] font-bold text-white/55">
              {index + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ title, value }: { title: string; value?: string }) {
  return (
    <div className="mb-3 flex items-end gap-3">
      <span className="text-[12px] font-black uppercase tracking-[0.16em] text-white/55">{title}</span>
      {value ? <span className="pb-[1px] text-[9px] font-bold uppercase tracking-[0.14em] text-white/25">{value}</span> : null}
    </div>
  );
}

function CharacterArea({ items, dragSlot, setDragSlot, onDrop, onItemClick }: {
  items: ItemsState;
  dragSlot: string | null;
  setDragSlot: (slotId: string | null) => void;
  onDrop: (slotId: string) => void;
  onItemClick: (event: MouseEvent, slotId: string, item: InventoryItem) => void;
}) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-[45px] top-[118px] text-white/38">
        <MaleBodyIcon />
      </div>

      {equipmentSlots.map((slot, index) => {
        const slotId = `equip_${index}`;
        return (
          <div key={slotId} className={`absolute ${slot.className}`}>
            <EquipmentSlot slot={slot} slotId={slotId} item={items[slotId]} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={onDrop} onItemClick={onItemClick} />
          </div>
        );
      })}
    </div>
  );
}

function Slot({ slotId, item, dragSlot, setDragSlot, onDrop, onItemClick }: SlotProps) {
  const isDragging = dragSlot === slotId;

  return (
    <div
      className={[
        SLOT,
        "group relative flex items-center justify-center border bg-black/18 transition duration-150 hover:-translate-y-[1px] hover:border-unique-gold/55 hover:bg-unique-gold/[0.055] hover:shadow-[0_0_22px_rgb(var(--unique-gold-rgb)/0.12)]",
        dragSlot ? "border-unique-gold/38" : "border-white/12",
        isDragging ? "opacity-35" : "opacity-100"
      ].join(" ")}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(slotId);
      }}
    >
      {item ? (
        <div
          data-inventory-draggable
          draggable
          onClick={(event) => onItemClick(event, slotId, item)}
          onDragStart={(event: DragEvent) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", slotId);
            setDragSlot(slotId);
          }}
          onDragEnd={() => setDragSlot(null)}
          className="absolute inset-0 flex cursor-grab flex-col items-center justify-center transition duration-150 group-hover:scale-[1.06] active:cursor-grabbing"
          style={{ userSelect: "none", WebkitUserSelect: "none", WebkitUserDrag: "element" } as CSSProperties & { WebkitUserDrag: string }}
        >
          <span className="absolute left-1.5 top-1 text-[10px] font-bold text-white/62">{item.amount}</span>
          <div className="text-[24px] leading-none drop-shadow-lg">{item.icon}</div>
          {item.name ? <div className="mt-1 max-w-[82%] truncate text-center text-[9px] font-semibold leading-none text-white/40">{item.name}</div> : null}
          {item.weight ? <div className="absolute bottom-1 right-1.5 text-[8px] text-white/25">{item.weight}</div> : null}
          <div className="absolute bottom-0 left-1/2 h-[3px] w-7 -translate-x-1/2 bg-unique-teal transition-all duration-150 group-hover:w-10 group-hover:bg-unique-gold" />
        </div>
      ) : null}
    </div>
  );
}

function EquipmentSlot({ slot, slotId, item, dragSlot, setDragSlot, onDrop, onItemClick }: SlotProps & { slot: typeof equipmentSlots[number] }) {
  return (
    <div className="relative">
      <Slot slotId={slotId} item={item} dragSlot={dragSlot} setDragSlot={setDragSlot} onDrop={onDrop} onItemClick={onItemClick} />
      {!item ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
          <div className="text-lg opacity-35">{slot.icon}</div>
          <div className="mt-1 max-w-[90%] truncate text-[8px] font-black uppercase tracking-[0.08em] text-white/25">{slot.label}</div>
        </div>
      ) : null}
    </div>
  );
}

function GiveDropArea({
  dragActive,
  target,
  nearbyPlayers,
  selectedPlayerId,
  onDrop,
  onSelectPlayer,
  onGive,
  onClear
}: {
  dragActive: boolean;
  target: GiveTargetState | null;
  nearbyPlayers: NearbyInventoryPlayer[];
  selectedPlayerId: number | null;
  onDrop: () => void;
  onSelectPlayer: (remoteId: number) => void;
  onGive: () => void;
  onClear: () => void;
}) {
  const selectedPlayer = nearbyPlayers.find((player) => player.remoteId === selectedPlayerId) ?? null;

  return (
    <section
      className={[
        "absolute bottom-6 left-1/2 z-[735] flex min-h-[82px] w-[760px] -translate-x-1/2 items-center gap-4 border px-5 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur-md transition",
        dragActive ? "border-unique-gold/55 bg-unique-gold/[0.08]" : target ? "border-unique-teal/45 bg-black/50" : "border-white/10 bg-black/35"
      ].join(" ")}
      onClick={(event) => event.stopPropagation()}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/12 bg-black/32 text-white/65">
        <MenuIcon name="give" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">Item geben</span>
          {target ? <span className="truncate text-sm font-black text-white">{target.item.name}</span> : null}
        </div>
        <div className="mt-2 flex min-h-8 items-center gap-2">
          {nearbyPlayers.length ? (
            nearbyPlayers.map((player) => (
              <button
                key={player.remoteId}
                type="button"
                className={[
                  "h-8 max-w-[170px] truncate border px-3 text-left text-[11px] font-black uppercase tracking-[0.08em] transition",
                  player.remoteId === selectedPlayerId
                    ? "border-unique-gold bg-unique-gold text-unique-ink"
                    : "border-white/10 bg-white/[0.035] text-white/55 hover:border-unique-teal/55 hover:text-white"
                ].join(" ")}
                onClick={() => onSelectPlayer(player.remoteId)}
              >
                {player.name} / {player.distance.toFixed(1)} m
              </button>
            ))
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/30">Kein Spieler in der Naehe</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {target ? (
          <button
            type="button"
            className="h-10 border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:border-white/25 hover:text-white"
            onClick={onClear}
          >
            Leeren
          </button>
        ) : null}
        <button
          type="button"
          disabled={!target || !selectedPlayer}
          className="h-10 min-w-[118px] border border-unique-teal/45 bg-unique-teal/15 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-unique-teal transition hover:bg-unique-teal hover:text-unique-ink disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.035] disabled:text-white/22"
          onClick={onGive}
        >
          Geben
        </button>
      </div>
    </section>
  );
}

function ItemMenu({ menu, onAction }: { menu: ItemMenuState; onAction: (action: "use" | "split" | "drop" | "craft") => void }) {
  const rarity = rarityStyle[menu.item.rarity || "common"];

  return (
    <div
      className="absolute z-[760] w-[420px] overflow-hidden rounded-xl border border-white/10 bg-unique-deep/95 shadow-[0_25px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="relative min-h-[168px] border-b border-white/10 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgb(var(--unique-gold-rgb)/0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_45%)]" />
        <div className="absolute right-8 top-8 text-[56px] font-black text-unique-gold opacity-25 blur-[0.2px]">{menu.item.icon}</div>

        <div className="relative">
          <h3 className="max-w-[280px] text-[24px] font-black uppercase tracking-wide text-white">{menu.item.name || "Item"}</h3>
          <div className="mt-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
            <span className={`h-3 w-3 rounded-full ${rarity.dot}`} />
            <span className={rarity.color}>{rarity.label}</span>
          </div>
          <div className="mt-4 text-sm font-bold text-white/72">{menu.item.amount || 1} units / {menu.item.weight || "1.0 kg"}</div>
          <p className="mt-4 max-w-[300px] text-sm leading-5 text-white/45">{menu.item.desc || "Dieses Item kann im Inventar genutzt, aufgeteilt oder fallen gelassen werden."}</p>
        </div>
      </div>

      <div className="grid h-[96px] grid-cols-3 divide-x divide-white/10 text-center">
        <ActionTile icon="hand" label="Benutzen" onClick={() => onAction("use")} />
        <ActionTile icon="split" label="Splitten" onClick={() => onAction("split")} disabled={!menu.item.amount || menu.item.amount <= 1} />
        <ActionTile icon="drop" label="Droppen" onClick={() => onAction("drop")} danger />
      </div>
    </div>
  );
}

function SplitDialog({ splitDialog, setSplitDialog, onConfirm }: {
  splitDialog: SplitDialogState;
  setSplitDialog: (value: SplitDialogState | null | ((current: SplitDialogState | null) => SplitDialogState | null)) => void;
  onConfirm: () => void;
}) {
  const max = Math.max(1, (splitDialog.item.amount || 1) - 1);
  const amount = Math.max(1, Math.min(max, splitDialog.amount));
  const remaining = (splitDialog.item.amount || 1) - amount;

  return (
    <div className="absolute inset-0 z-[780] flex items-center justify-center bg-black/35 backdrop-blur-[1px]" onClick={() => setSplitDialog(null)}>
      <div className="w-[390px] overflow-hidden rounded-2xl border border-white/12 bg-unique-deep/96 shadow-[0_25px_90px_rgba(0,0,0,0.85)]" onClick={(event) => event.stopPropagation()}>
        <div className="relative border-b border-white/10 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgb(var(--unique-gold-rgb)/0.16),transparent_34%)]" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-2xl font-black text-unique-gold">{splitDialog.item.icon}</div>
            <div>
              <div className="text-lg font-black uppercase tracking-wide text-white">Stack splitten</div>
              <div className="mt-1 text-xs text-white/45">{splitDialog.item.name} / Menge {splitDialog.item.amount}</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-white/45">Abtrennen</span>
            <span className="text-2xl font-black text-unique-gold">{amount}</span>
          </div>
          <input
            type="range"
            min="1"
            max={max}
            value={amount}
            onChange={(event) => setSplitDialog((current) => (current ? { ...current, amount: Number(event.target.value) } : current))}
            className="w-full accent-unique-gold"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className="text-white/35">Bleibt im Slot</div>
              <div className="mt-1 text-lg font-black text-white/85">{remaining}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <div className="text-white/35">Neuer Stack</div>
              <div className="mt-1 text-lg font-black text-unique-gold">{amount}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/10">
          <button className="pointer-events-auto px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white/45 transition hover:bg-white/[0.05] hover:text-white" onClick={() => setSplitDialog(null)}>Abbrechen</button>
          <button className="pointer-events-auto px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-unique-gold transition hover:bg-unique-gold/10" onClick={onConfirm}>Splitten</button>
        </div>
      </div>
    </div>
  );
}

function ActionTile({ icon, label, onClick, disabled = false, danger = false }: { icon: string; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "pointer-events-auto flex flex-col items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.12em] transition",
        disabled ? "cursor-not-allowed text-white/18" : danger ? "text-white/70 hover:bg-unique-danger/12 hover:text-red-300" : "text-white/70 hover:bg-white/[0.06] hover:text-unique-gold"
      ].join(" ")}
    >
      <MenuIcon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function MaleBodyIcon() {
  return (
    <div className="relative flex h-[445px] w-[250px] items-center justify-center">
      <img
        src="/body.svg"
        alt=""
        className="h-full w-full object-contain opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]"
        draggable={false}
        onError={(e) => {
          console.error("body.svg not found in /public");
          e.currentTarget.style.opacity = "0.2";
        }}
        style={{
          userSelect: "none",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const icons: Record<string, ReactNode> = {
    bag: <svg {...common}><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>,
    mouse: <svg {...common}><rect x="7" y="2" width="10" height="20" rx="5" /><path d="M12 6v4" /></svg>,
    camouflage: <svg {...common}><circle cx="8" cy="8" r="3" /><circle cx="16" cy="9" r="2" /><circle cx="12" cy="16" r="4" /></svg>,
    craft: <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-7.9 7.9l-6.6 6.6a2 2 0 0 1-2.8-2.8l6.6-6.6a6 6 0 0 1 7.9-7.9l-3.3 2.9Z" /></svg>
  };
  return icons[name] || icons.bag;
}

function MenuIcon({ name }: { name: string }) {
  const common = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const icons: Record<string, ReactNode> = {
    hand: <svg {...common}><path d="M8 11V6a2 2 0 0 1 4 0v5" /><path d="M12 10V5a2 2 0 0 1 4 0v7" /><path d="M16 11V7a2 2 0 0 1 4 0v7c0 5-3 8-8 8h-1c-3 0-5-2-6-5l-1-4a2 2 0 0 1 4-1l1 3" /></svg>,
    split: <svg {...common}><path d="M4 12h6" /><path d="M14 6l6 6-6 6" /><path d="M10 6l4 6-4 6" /></svg>,
    drop: <svg {...common}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>,
    give: <svg {...common}><path d="M4 12h10" /><path d="m10 8 4 4-4 4" /><circle cx="18" cy="8" r="3" /><path d="M14 21a4 4 0 0 1 8 0" /></svg>
  };
  return icons[name] || icons.hand;
}
