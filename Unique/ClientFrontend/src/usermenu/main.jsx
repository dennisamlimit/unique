import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";
import { DEFAULT_UI_THEME, THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";

function parsePayload(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const THEME_FIELDS = [
  { key: "chat", label: "Chat" },
  { key: "money", label: "Geld" },
  { key: "primary", label: "Prim├ñr" },
  { key: "secondary", label: "Sekund├ñr" },
  { key: "surface", label: "Hintergrund" },
  { key: "surfaceAlt", label: "Panel" },
  { key: "border", label: "Rahmen" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Mute Text" },
  { key: "danger", label: "Danger" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" }
];

const COLOR_SWATCHES = [
  "#D946EF", "#A855F7", "#7C3AED", "#2563EB", "#0891B2",
  "#0F766E", "#16A34A", "#65A30D", "#CA8A04", "#EA580C",
  "#DC2626", "#E11D48", "#BE123C", "#6D28D9", "#1F2937",
  "#334155", "#475569", "#64748B", "#94A3B8", "#F8FAFC"
];

const THEME_PRESETS = [
  {
    name: "Ocean",
    theme: { primary: "#38BDF8", secondary: "#0EA5E9", chat: "#38BDF8", money: "#38BDF8", border: "#7DD3FC", surface: "#07131D", surfaceAlt: "#0C1B28" }
  },
  {
    name: "Ember",
    theme: { primary: "#F97316", secondary: "#EA580C", chat: "#F97316", money: "#F97316", border: "#FDBA74", surface: "#160B07", surfaceAlt: "#25130C" }
  },
  {
    name: "Neon",
    theme: { primary: "#22C55E", secondary: "#14B8A6", chat: "#22C55E", money: "#22C55E", border: "#6EE7B7", surface: "#07140D", surfaceAlt: "#112419" }
  },
  {
    name: "Royal",
    theme: { primary: "#8B5CF6", secondary: "#6366F1", chat: "#8B5CF6", money: "#8B5CF6", border: "#C4B5FD", surface: "#0D0A18", surfaceAlt: "#17122A" }
  }
];

function clampColorChannel(value) {
  return Math.min(255, Math.max(0, Number(value) || 0));
}

function parseHexColor(value, fallback = "#FFFFFF") {
  const input = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(input) ? input.toUpperCase() : fallback;
}

function hexToChannels(value) {
  const safe = parseHexColor(value).slice(1);
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16)
  };
}

function channelsToHex(r, g, b) {
  return `#${[r, g, b].map((channel) => clampColorChannel(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function formatMoney(amount) {
  if (typeof amount !== "number") return "N/A";
  return "$" + amount.toLocaleString("de-DE");
}

function formatPlayTime(minutes) {
  if (typeof minutes !== "number") return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatDate(value) {
  if (!value) return "Unbekannt";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unbekannt" : date.toLocaleString("de-DE");
}

function setTicketInputFocus(state) {
  trigger("cef:usermenu:inputFocus", !!state);
}

function statusLabel(status) {
  const map = {
    open: "Offen",
    claimed: "Geclaimt",
    waiting_player: "Wartet auf Spieler",
    waiting_admin: "Wartet auf Admin",
    closed: "Closed"
  };
  return map[status] || status;
}

function statusClasses(status) {
  if (status === "closed") return "border-zinc-700 bg-zinc-900/60 text-zinc-300";
  if (status === "claimed") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (status === "waiting_player") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  if (status === "waiting_admin") return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function priorityClasses(priority) {
  if (priority === "critical") return "text-rose-400";
  if (priority === "high") return "text-amber-300";
  return "text-zinc-500";
}

function IconMoney() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  );
}

function IconBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="3" y1="22" x2="21" y2="22"/>
      <line x1="6" y1="18" x2="6" y2="11"/>
      <line x1="10" y1="18" x2="10" y2="11"/>
      <line x1="14" y1="18" x2="14" y2="11"/>
      <line x1="18" y1="18" x2="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </svg>
  );
}

function IconDirty() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function PortalPopover({ open, anchorRef, onClose, width = "anchor", className = "", children }) {
  const panelRef = useRef(null);
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open) {
      setStyle(null);
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!(anchor instanceof HTMLElement)) return;

      const rect = anchor.getBoundingClientRect();
      const computedWidth = width === "anchor" ? rect.width : width;
      const maxWidth = Math.max(240, Math.min(Number(computedWidth) || rect.width, window.innerWidth - 24));
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - maxWidth - 12));
      const top = Math.min(rect.bottom + 10, Math.max(12, window.innerHeight - 12));

      setStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${maxWidth}px`,
        zIndex: 9999
      });
    }

    function onPointerDown(event) {
      const target = event.target;
      if (
        (panelRef.current instanceof HTMLElement && panelRef.current.contains(target)) ||
        (anchorRef.current instanceof HTMLElement && anchorRef.current.contains(target))
      ) {
        return;
      }
      onClose();
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [anchorRef, onClose, open, width]);

  if (!open || !style) return null;

  return createPortal(
    <div ref={panelRef} style={style} className={className}>
      {children}
    </div>,
    document.body
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="theme-tile flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:border-violet-200/[0.24] hover:bg-white/[0.05]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded theme-primary-soft theme-primary-text">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="truncate text-sm font-bold leading-tight text-white">{value}</div>
      </div>
    </div>
  );
}

function NavTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`theme-nav-tile relative flex cursor-pointer items-center gap-2 rounded-md px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-colors focus-visible:outline-none ${
        active ? "theme-primary-border theme-primary-soft text-white theme-primary-glow" : "text-zinc-500 hover:border-violet-300/[0.25] hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PrefixCombobox({ options, value, labels, onChange }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const activeLabel = labels[value] || value;

  useEffect(() => {
    if (!open) {
      setTicketInputFocus(false);
      return;
    }

    setTicketInputFocus(true);

    function onPointerDown(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest("[data-prefix-combobox]")) {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="relative isolate" data-prefix-combobox>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="theme-input theme-nav-tile flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-sm font-semibold text-white transition hover:border-violet-200/[0.26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
      >
        <span className="truncate">{activeLabel}</span>
        <span className={`shrink-0 theme-secondary-text transition ${open ? "rotate-180" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>
      <PortalPopover
        open={open}
        anchorRef={buttonRef}
        onClose={() => setOpen(false)}
        className="theme-popover grid gap-1 rounded-md p-2"
      >
          {options.map((entry) => {
            const active = entry === value;
            return (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  onChange(entry);
                  setOpen(false);
                }}
                className={`theme-nav-tile rounded-md px-3 py-2 text-left text-[11px] font-black uppercase transition ${
                  active
                    ? "theme-primary-border theme-primary-soft text-white"
                    : "border-transparent bg-black/20 text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {labels[entry] || entry}
              </button>
            );
          })}
      </PortalPopover>
    </div>
  );
}

function UpdatesPanel() {
  return (
    <div className="theme-tile theme-tile-soft relative overflow-hidden rounded-md">
      <div className="p-4">
        <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-fuchsia-300">Updates</div>
        <div className="space-y-2 pr-16">
          {[
            "Server-Update 1.0 - Fraktionssystem live",
            "Neue Fraktionen werden hinzugefuegt",
            "Performance-Verbesserungen am Fahrzeugsystem"
          ].map((text, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-zinc-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fuchsia-400" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-16 bg-gradient-to-l from-fuchsia-950/40 to-transparent" />
    </div>
  );
}

function EventsPanel() {
  return (
    <div className="theme-tile theme-tile-soft relative min-h-0 flex-1 overflow-hidden rounded-md">
      <div className="flex h-full flex-col p-4">
        <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-fuchsia-300">Events</div>
        <div className="flex flex-1 items-center justify-center rounded-md border border-violet-200/[0.08] bg-black/20">
          <div className="text-center">
            <div className="text-xs font-black uppercase text-zinc-700">Kein aktives Event</div>
            <div className="mt-1 text-[10px] text-zinc-700">Events werden hier angezeigt</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromoPanel() {
  const [code, setCode] = useState("");
  return (
    <div className="theme-tile theme-tile-soft relative overflow-hidden rounded-md">
      <div className="p-4 pr-20">
        <label htmlFor="promo-code" className="mb-3 block text-[9px] font-black uppercase tracking-wider text-fuchsia-300">
          Promo Code eingeben
        </label>
        <div className="flex gap-2">
          <input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code eingeben..."
            className="h-9 flex-1 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white placeholder-zinc-600 transition-colors focus:border-fuchsia-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
          />
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md bg-fuchsia-500 px-4 text-[10px] font-black uppercase text-white transition-colors hover:bg-fuchsia-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
          >
            Apply
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-20 bg-gradient-to-l from-fuchsia-950/50 to-transparent" />
    </div>
  );
}

function ThemeColorField({ label, value, onChange }) {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const channels = hexToChannels(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  function updateChannel(channel, nextValue) {
    const next = { ...channels, [channel]: clampColorChannel(nextValue) };
    onChange(channelsToHex(next.r, next.g, next.b));
  }

  return (
    <div className="theme-tile grid gap-2 rounded-md p-3">
      <span className="text-[10px] font-black uppercase tracking-normal text-zinc-400">{label}</span>
      <div className="flex items-center gap-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="theme-nav-tile flex h-11 w-[70px] items-center justify-center rounded-md p-1.5 transition hover:border-fuchsia-300/[0.4]"
        >
          <span className="theme-swatch h-full w-full rounded" style={{ backgroundColor: parseHexColor(value, "#FFFFFF") }} />
        </button>
        <input
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value.toUpperCase();
            setInputValue(nextValue);
            if (/^#[0-9A-F]{6}$/.test(nextValue)) {
              onChange(nextValue);
            }
          }}
          onBlur={() => {
            const normalized = parseHexColor(inputValue, value);
            setInputValue(normalized);
            onChange(normalized);
          }}
          className="theme-input h-11 flex-1 rounded-md px-3 text-sm font-semibold uppercase outline-none"
        />
      </div>
      <PortalPopover
        open={open}
        anchorRef={buttonRef}
        onClose={() => setOpen(false)}
        width={320}
        className="theme-popover rounded-md p-4"
      >
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-100">{label}</div>
              <div className="text-xs font-semibold text-zinc-400">Sichtbarer In-Game Picker statt nativer Browser-Palette.</div>
            </div>
            <div className="theme-swatch h-10 w-10 rounded-md" style={{ backgroundColor: parseHexColor(value, "#FFFFFF") }} />
          </div>

          <div className="grid gap-2">
            {[
              ["R", "r"],
              ["G", "g"],
              ["B", "b"]
            ].map(([title, key]) => (
              <label key={key} className="grid gap-1">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400">
                  <span>{title}</span>
                  <span>{channels[key]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={channels[key]}
                  onChange={(event) => updateChannel(key, event.target.value)}
                  className="theme-accent-range"
                />
              </label>
            ))}
          </div>

          <div className="rounded-md border border-violet-200/[0.12] bg-black/[0.28] p-2">
            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-zinc-400">Direktauswahl</div>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onChange(swatch)}
                  className={`theme-swatch h-10 rounded-md transition hover:scale-105 ${parseHexColor(value, "#FFFFFF") === swatch ? "ring-2 ring-fuchsia-400/70" : ""}`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>
      </PortalPopover>
    </div>
  );
}

function ProfileTab({ payload }) {
  const p = payload || {};
  const stats = [
    { icon: <IconMoney />, label: "Bargeld", value: formatMoney(p.money) },
    { icon: <IconClock />, label: "Spielzeit", value: formatPlayTime(p.playTime) },
    { icon: <IconBank />, label: "Bankkonto", value: formatMoney(p.bankMoney) },
    { icon: <IconBriefcase />, label: "Job", value: p.job || "Arbeitslos" },
    { icon: <IconDirty />, label: "Schmutzgeld", value: formatMoney(p.dirtyMoney) },
    { icon: <IconPhone />, label: "Handy", value: p.phoneNumber || "Nicht vergeben" },
    { icon: <IconAlert />, label: "Vorstrafen", value: String(p.generalRecord ?? 0) }
  ];

  return (
    <div className="grid h-full grid-cols-[220px_1fr_260px] gap-4">
      <div className="theme-tile theme-tile-hero relative flex flex-col items-center overflow-hidden rounded-md pb-4 pt-6">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 55%, rgb(var(--ui-primary-rgb) / 0.2), transparent 65%)" }} />
        <div className="relative z-10 flex w-full flex-col items-center gap-3 px-4">
          <div className="relative">
            <div className="theme-primary-glow flex h-28 w-28 items-center justify-center overflow-hidden rounded-full theme-primary-border bg-zinc-900">
              <svg className="h-18 w-18 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full border border-black/60 theme-button-primary px-2 py-0.5 text-[9px] font-black">
              ID {p.accountId || "?"}
            </div>
          </div>

          <div className="text-center">
            <div className="font-display text-xl uppercase leading-none tracking-wide text-white">
              {p.playerName || "Spieler"}
            </div>
            {p.factionName ? (
              <div className="mt-1 text-[10px] font-bold uppercase theme-primary-text">
                {p.factionName} | {p.factionRankName}
              </div>
            ) : (
              <div className="mt-1 text-[10px] font-bold uppercase text-zinc-600">Keine Fraktion</div>
            )}
          </div>

            {p.adminLevel > 0 && (
              <div className="rounded border border-fuchsia-400/30 theme-primary-soft px-2 py-0.5 text-[9px] font-black uppercase theme-secondary-text">
                Admin Level {p.adminLevel}
              </div>
            )}

            <div className="w-full border-t border-white/[0.06]" />

            {p.factionName && (
              <button
                type="button"
                onClick={() => trigger("cef:usermenu:openOrga")}
                className="w-full cursor-pointer rounded-md border border-violet-200/[0.18] bg-white/[0.04] py-2 text-[10px] font-black uppercase text-white transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
              >
                Fraktionsmenue (F6)
              </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <div>
          <div className="mb-2 text-[9px] font-black uppercase tracking-wider text-zinc-600">Spieler-Info</div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
        <EventsPanel />
      </div>

      <div className="flex min-h-0 flex-col gap-3">
        <UpdatesPanel />
        <PromoPanel />
      </div>
    </div>
  );
}

function PlaceholderTab({ label }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-black uppercase text-zinc-700">{label}</div>
        <div className="mt-2 text-sm font-semibold text-zinc-500">Noch nicht verfuegbar</div>
      </div>
    </div>
  );
}

function SupportTab({ ticketState }) {
  const tickets = Array.isArray(ticketState?.tickets) ? ticketState.tickets : [];
  const allowedPrefixes = Array.isArray(ticketState?.allowedPrefixes) && ticketState.allowedPrefixes.length > 0
    ? ticketState.allowedPrefixes
    : ["allgemein", "bug", "regelverstoss", "entstuck", "fraktion", "shop", "charakter"];
  const prefixLabels = {
    allgemein: "Allgemein",
    bug: "Bug",
    regelverstoss: "Regelverstoss",
    entstuck: "Entstuck",
    fraktion: "Fraktion",
    shop: "Shop",
    charakter: "Charakter"
  };
  const [selectedTicketId, setSelectedTicketId] = useState(0);
  const [prefix, setPrefix] = useState(allowedPrefixes[0] || "allgemein");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [ticketCreateNotice, setTicketCreateNotice] = useState("");

  useEffect(() => {
    if (!allowedPrefixes.includes(prefix)) {
      setPrefix(allowedPrefixes[0] || "allgemein");
    }
  }, [allowedPrefixes, prefix]);

  useEffect(() => {
    if (!tickets.some((ticket) => ticket.ticketId === selectedTicketId)) {
      setSelectedTicketId(tickets[0]?.ticketId ?? 0);
    }
  }, [selectedTicketId, tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.ticketId === selectedTicketId) || tickets[0] || null,
    [selectedTicketId, tickets]
  );

  const openTicket = tickets.find((ticket) => ticket.status !== "closed") || null;
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((left, right) => {
      const leftOpen = left.status !== "closed" ? 1 : 0;
      const rightOpen = right.status !== "closed" ? 1 : 0;
      if (leftOpen !== rightOpen) {
        return rightOpen - leftOpen;
      }
      return new Date(right.updatedAt || right.createdAt).getTime() - new Date(left.updatedAt || left.createdAt).getTime();
    });
  }, [tickets]);

  useEffect(() => {
    return () => setTicketInputFocus(false);
  }, []);

  useEffect(() => {
    if (!ticketCreateNotice) return undefined;
    const timer = setTimeout(() => setTicketCreateNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [ticketCreateNotice]);

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <section className="grid gap-4">
        <div className="theme-tile grid gap-4 rounded-md p-5">
          <div className="flex items-center gap-3">
            <div className="theme-dot theme-primary-glow h-1 w-10 rounded" />
            <div>
              <div className="text-xs font-black uppercase tracking-normal text-violet-100">Support Ticket</div>
              <div className="mt-1 text-sm font-semibold text-zinc-400">Prefix auswaehlen, Betreff angeben und das Anliegen direkt an das Team senden.</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-md border border-violet-200/[0.12] bg-black/[0.24] px-3 py-3">
              <div className="text-[10px] font-black uppercase tracking-normal text-violet-100">Kategorie</div>
              <div className="mt-1 text-sm font-black uppercase text-white">Support</div>
            </div>
            <div className="grid gap-2">
              <div className="text-[10px] font-black uppercase tracking-normal text-violet-100">Prefix</div>
              <PrefixCombobox options={allowedPrefixes} value={prefix} labels={prefixLabels} onChange={setPrefix} />
            </div>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setTicketInputFocus(true)}
              onBlur={() => setTicketInputFocus(false)}
              placeholder="Kurz zusammenfassen, worum es geht"
              className="h-10 rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-sm font-semibold text-white placeholder-zinc-600 focus:border-fuchsia-400/50 focus:outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setTicketInputFocus(true)}
              onBlur={() => setTicketInputFocus(false)}
              placeholder="Beschreibe dein Anliegen so genau wie moeglich"
              className="h-32 resize-none rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 py-3 text-sm font-semibold text-white placeholder-zinc-600 focus:border-fuchsia-400/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                trigger("cef:usermenu:createTicket", prefix, subject, message);
                setTicketInputFocus(false);
                setSubject("");
                setMessage("");
                setTicketCreateNotice("Ticket wurde an das Support-Team uebermittelt.");
              }}
              className="h-10 cursor-pointer rounded-md theme-button-primary text-[10px] font-black uppercase transition-opacity hover:opacity-90"
            >
              Ticket absenden
            </button>
            {ticketCreateNotice && (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100">
                {ticketCreateNotice}
              </div>
            )}
            {openTicket && (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
                Offenes Ticket vorhanden: #{openTicket.ticketId} - {openTicket.subject}
              </div>
            )}
          </div>
        </div>

        <div className="theme-tile grid gap-3 rounded-md p-5">
          <div className="text-xs font-black uppercase tracking-normal text-violet-100">Verlauf</div>
          <div className="grid max-h-[520px] auto-rows-max content-start items-start gap-2 overflow-y-auto pr-1">
            {sortedTickets.length === 0 && (
              <div className="rounded-md border border-violet-200/[0.08] bg-black/20 px-3 py-4 text-sm font-semibold text-zinc-500">
                Noch keine Tickets vorhanden.
              </div>
            )}
            {sortedTickets.map((ticket) => (
              <button
                key={ticket.ticketId}
                type="button"
                onClick={() => setSelectedTicketId(ticket.ticketId)}
                className={`grid self-start gap-2 rounded-md border px-3 py-3 text-left transition-colors ${
                  selectedTicket?.ticketId === ticket.ticketId
                    ? "border-fuchsia-300/[0.35] bg-fuchsia-500/[0.1]"
                    : "border-violet-200/[0.08] bg-black/20 hover:border-violet-200/[0.18] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="break-all text-sm font-black uppercase leading-5 text-white">
                      #{ticket.ticketId} {ticket.subject}
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      {ticket.prefix} | {formatDate(ticket.createdAt)}
                    </div>
                  </div>
                  <div className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${statusClasses(ticket.status)}`}>
                    {statusLabel(ticket.status)}
                  </div>
                </div>
                <div className={`text-[11px] font-bold uppercase ${priorityClasses(ticket.priority)}`}>
                  Prioritaet: {ticket.priority}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="theme-tile overflow-hidden rounded-md p-5">
        {!selectedTicket ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="text-3xl font-black uppercase text-zinc-700">Support</div>
              <div className="mt-2 text-sm font-semibold text-zinc-600">Waehle links ein Ticket aus, um den Verlauf zu sehen.</div>
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
            <div className="theme-tile rounded-md p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-black uppercase text-white">#{selectedTicket.ticketId}</span>
                <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${statusClasses(selectedTicket.status)}`}>
                  {statusLabel(selectedTicket.status)}
                </span>
                <span className={`text-[10px] font-black uppercase ${priorityClasses(selectedTicket.priority)}`}>
                  {selectedTicket.priority}
                </span>
              </div>
              <div className="mt-2 break-all text-xl font-black uppercase leading-7 text-white">{selectedTicket.subject}</div>
              <div className="mt-1 text-[11px] font-bold uppercase text-zinc-500">
                Prefix {selectedTicket.prefix} | Erstellt {formatDate(selectedTicket.createdAt)}
              </div>
              {selectedTicket.claimedByName && (
                <div className="mt-2 text-[11px] font-semibold text-amber-300">
                  Geclaimt von {selectedTicket.claimedByName}
                </div>
              )}
            </div>

            <div className="theme-tile unique-scrollbar min-h-[420px] max-h-[62vh] overflow-y-auto rounded-md p-4">
              <div className="grid gap-3">
                {selectedTicket.messages.map((entry) => (
                  <article
                    key={entry.messageId}
                    className={`rounded-md border px-3 py-3 ${
                      entry.senderType === "admin"
                        ? "border-fuchsia-300/[0.18] bg-fuchsia-500/[0.08]"
                        : entry.senderType === "system"
                          ? "border-cyan-500/20 bg-cyan-500/8"
                          : "border-violet-200/[0.08] bg-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        {entry.senderName} | {entry.senderType}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-zinc-500">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/90">
                      {entry.message}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onFocus={() => setTicketInputFocus(true)}
                onBlur={() => setTicketInputFocus(false)}
                placeholder={selectedTicket.status === "closed" ? "Dieses Ticket ist geschlossen." : "Zusatznachricht zum Ticket"}
                disabled={selectedTicket.status === "closed"}
                className="h-24 resize-none rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 py-2 text-sm font-semibold text-white placeholder-zinc-600 focus:border-fuchsia-400/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                disabled={selectedTicket.status === "closed"}
                onClick={() => {
                  trigger("cef:usermenu:replyTicket", selectedTicket.ticketId, reply);
                  setTicketInputFocus(false);
                  setReply("");
                }}
                className="h-10 cursor-pointer rounded-md bg-fuchsia-500 text-[10px] font-black uppercase text-white transition-colors hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nachricht senden
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ThemeSettingsTab({ theme, onSave }) {
  const [draft, setDraft] = useState(theme);

  useEffect(() => {
    setDraft(theme);
  }, [theme]);

  const previewVars = getThemeVars(draft);

  return (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="theme-panel theme-tile rounded-md p-5">
        <div className="flex items-center gap-3">
          <div className="h-1 w-10 rounded" style={{ backgroundColor: "var(--ui-primary)", boxShadow: "0 0 18px rgba(var(--ui-primary-rgb),0.7)" }} />
          <div>
            <div className="text-xs font-black uppercase tracking-normal text-violet-100">Design</div>
            <div className="mt-1 text-sm font-semibold text-zinc-400">Ein Theme f├╝r HUD, M-Men├╝ und Admin-Men├╝. Erst beim Speichern wird alles ├╝bernommen.</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-normal text-zinc-400">Schnellstile</div>
              <div className="mt-1 text-xs font-semibold text-zinc-500">Preset waehlen und danach einzelne Farben feinjustieren.</div>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, ...preset.theme }))}
                className="theme-nav-tile grid gap-3 rounded-md p-3 text-left transition hover:border-fuchsia-300/[0.35] hover:bg-white/[0.05]"
              >
                <div className="grid grid-cols-4 gap-2">
                  {[preset.theme.primary, preset.theme.secondary, preset.theme.border, preset.theme.surfaceAlt].map((swatch) => (
                    <span key={swatch} className="theme-swatch h-8 rounded-md" style={{ backgroundColor: swatch }} />
                  ))}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wide text-white">{preset.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {THEME_FIELDS.map((field) => (
            <ThemeColorField
              key={field.key}
              label={field.label}
              value={draft[field.key]}
              onChange={(nextValue) => setDraft((current) => ({ ...current, [field.key]: parseHexColor(nextValue, current[field.key]) }))}
            />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => onSave(draft)} className="theme-button-primary h-10 rounded-md px-4 text-[10px] font-black uppercase">
            Speichern
          </button>
          <button type="button" onClick={() => setDraft(theme)} className="theme-button-secondary h-10 rounded-md px-4 text-[10px] font-black uppercase">
            Zur├╝cksetzen auf Aktuell
          </button>
          <button type="button" onClick={() => setDraft(DEFAULT_UI_THEME)} className="theme-button-secondary h-10 rounded-md px-4 text-[10px] font-black uppercase">
            Standardfarben
          </button>
        </div>
      </div>

      <div className="theme-shell theme-overlay unique-theme rounded-md p-5" style={previewVars}>
        <style>{THEME_CSS}</style>
        <div className="flex items-center gap-3">
          <div className="h-1 w-10 rounded" style={{ backgroundColor: "var(--ui-primary)", boxShadow: "0 0 18px rgba(var(--ui-primary-rgb),0.7)" }} />
          <div className="text-xs font-black uppercase tracking-normal text-violet-100">Vorschau</div>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="theme-panel theme-tile rounded-md p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black uppercase text-white">Unique UI</div>
                <div className="text-xs font-semibold text-zinc-400">So sehen Panels und Buttons mit deinem Theme aus.</div>
              </div>
              <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase" style={{ backgroundColor: "rgb(var(--ui-primary-rgb) / 0.14)", color: "var(--ui-primary)" }}>
                Live
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="theme-panel theme-tile rounded-md p-4">
              <div className="text-[10px] font-black uppercase text-zinc-400">Primary</div>
              <div className="mt-2 h-10 rounded-md" style={{ background: "linear-gradient(135deg,var(--ui-primary),var(--ui-secondary))" }} />
            </div>
            <div className="theme-panel theme-tile rounded-md p-4">
              <div className="text-[10px] font-black uppercase text-zinc-400">Status</div>
              <div className="mt-2 flex gap-2">
                <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase" style={{ color: "var(--ui-success)", border: "1px solid rgb(var(--ui-success-rgb) / 0.3)" }}>OK</span>
                <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase" style={{ color: "var(--ui-warning)", border: "1px solid rgb(var(--ui-warning-rgb) / 0.3)" }}>Warn</span>
                <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase" style={{ color: "var(--ui-danger)", border: "1px solid rgb(var(--ui-danger-rgb) / 0.3)" }}>Error</span>
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <input className="theme-input h-10 rounded-md px-3 text-sm font-semibold outline-none" placeholder="Input-Vorschau" />
            <div className="flex gap-3">
              <button type="button" className="theme-button-primary h-10 rounded-md px-4 text-[10px] font-black uppercase">Primary Button</button>
              <button type="button" className="theme-button-secondary h-10 rounded-md px-4 text-[10px] font-black uppercase">Secondary</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

let CACHED_THEME = getStoredUiTheme();

function UsermenuApp() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);
  const [ticketState, setTicketState] = useState({ allowedPrefixes: [], tickets: [] });
  const [activeTab, setActiveTab] = useState("profile");
  const [theme, setTheme] = useState(CACHED_THEME);

  useEffect(() => {
    window.usermenuApp = {
      open: (rawPayload) => {
        setPayload(parsePayload(rawPayload));
        setActiveTab("profile");
        setVisible(true);
        trigger("cef:usermenu:requestTickets");
      },
      close: () => {
        setTicketInputFocus(false);
        setVisible(false);
      },
      setTickets: (rawPayload) => {
        const parsed = parsePayload(rawPayload) || { allowedPrefixes: [], tickets: [] };
        setTicketState({
          allowedPrefixes: Array.isArray(parsed.allowedPrefixes) ? parsed.allowedPrefixes : [],
          tickets: Array.isArray(parsed.tickets) ? parsed.tickets : []
        });
      },
      setTheme: (rawPayload) => {
        try {
          const parsed = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
          const normalized = normalizeUiTheme(parsed);
          CACHED_THEME = normalized;
          setTheme(normalized);
        } catch {
          // ignore
        }
      }
    };

    function onKeyDown(e) {
      if (e.key === "Escape") trigger("cef:usermenu:close");
    }

    window.addEventListener("keydown", onKeyDown);
    trigger("cef:usermenu:ready");

    return () => {
      delete window.usermenuApp;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!visible) return null;

  const themeVars = getThemeVars(theme);

  const tabs = [
    { id: "profile", label: "Profil" },
    { id: "cart", label: "Warenkorb" },
    { id: "rewards", label: "Belohnungen" },
    { id: "support", label: "Support" },
    { id: "shop", label: "Shop" },
    { id: "settings", label: "Einstellungen" }
  ];

  return (
    <main className="unique-theme fixed inset-0 flex flex-col bg-black/80 text-white backdrop-blur-md" style={themeVars}>
      <style>{THEME_CSS}</style>
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(8,8,12,0.96), rgb(var(--ui-surface-rgb) / 0.94) 42%, rgba(10,10,16,0.97))" }} />
      <div className="pointer-events-none absolute inset-x-[8%] top-[14%] h-[58%] rounded-full blur-3xl" style={{ backgroundColor: "rgb(var(--ui-primary-rgb) / 0.08)" }} />

      <div className="theme-shell theme-overlay relative mx-5 my-5 flex h-[calc(100vh-40px)] flex-col overflow-hidden rounded-md shadow-[0_18px_60px_rgba(0,0,0,0.52)]">
        <header className="flex items-center justify-between border-b border-violet-200/[0.12] px-8 py-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Unique" className="h-6 w-6 rounded object-contain opacity-80" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">ESC - Schliessen</div>
              <div className="font-display flex items-center gap-2 text-lg leading-none text-white">
                PLAYER MENU
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] font-black opacity-40">B1.2.7-THEME-FIX</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-zinc-500">Spieler</div>
              <div className="text-sm font-black uppercase text-white">{payload?.playerName || "-"}</div>
            </div>
            <button
              type="button"
              onClick={() => trigger("cef:usermenu:close")}
              className="h-8 cursor-pointer rounded-md border border-violet-200/[0.18] bg-white/[0.04] px-3 text-[10px] font-black uppercase text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
            >
              Exit
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap items-center gap-2 border-b border-violet-200/[0.12] px-6 py-3">
          {tabs.map((tab) => (
            <NavTab key={tab.id} active={activeTab === tab.id} onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "support") {
                trigger("cef:usermenu:requestTickets");
              }
            }}>
              {tab.label}
            </NavTab>
          ))}
        </nav>

        <div className="unique-scrollbar flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && <ProfileTab payload={payload} />}
          {activeTab === "cart" && <PlaceholderTab label="Warenkorb" />}
          {activeTab === "rewards" && <PlaceholderTab label="Taegl. Belohnungen" />}
          {activeTab === "support" && <SupportTab ticketState={ticketState} />}
          {activeTab === "shop" && <PlaceholderTab label="Shop" />}
          {activeTab === "settings" && (
            <ThemeSettingsTab
              theme={theme}
              onSave={(nextTheme) => {
                const normalized = persistUiTheme(normalizeUiTheme(nextTheme));
                setTheme(normalized);
                trigger("cef:usermenu:updateTheme", JSON.stringify(normalized));
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<UsermenuApp />);
