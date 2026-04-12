import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

function parsePayload(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.06]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-600/20 text-red-400">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-sm font-bold text-white truncate leading-tight">{value}</div>
      </div>
    </div>
  );
}

function NavTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-colors border-b-2 focus-visible:outline-none ${
        active
          ? "border-red-500 text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

function UpdatesPanel() {
  return (
    <div className="relative overflow-hidden rounded border border-white/[0.07] bg-white/[0.03]">
      <div className="p-4">
        <div className="text-[9px] font-black uppercase tracking-wider text-red-500 mb-2">Updates</div>
        <div className="space-y-2 pr-16">
          {[
            "Server-Update 1.0 — Fraktionssystem live",
            "Neue Fraktionen werden hinzugefuegt",
            "Performance-Verbesserungen am Fahrzeugsystem",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-zinc-400">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Dekorativer Charakter-Silhouette-Bereich rechts */}
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-16 bg-gradient-to-l from-red-950/40 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-1 top-0 flex items-end justify-center overflow-hidden w-14">
        <svg className="h-20 w-14 text-red-900/50" fill="currentColor" viewBox="0 0 24 32">
          <path d="M12 0C8.7 0 6 2.7 6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zM3 32v-4c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8v4H3z"/>
        </svg>
      </div>
    </div>
  );
}

function EventsPanel() {
  const hasEvent = false;
  const eventTitle = "CAR SHOW MEETING";
  const eventDate = "30. JULY 2023";
  const eventTime = "9PM";

  return (
    <div className="relative overflow-hidden rounded border border-white/[0.07] bg-white/[0.03] flex-1 min-h-0">
      <div className="p-4 h-full flex flex-col">
        <div className="text-[9px] font-black uppercase tracking-wider text-red-500 mb-2">Events</div>
        {hasEvent ? (
          <div className="relative flex-1 rounded border border-red-900/40 bg-red-950/20 p-3 overflow-hidden">
            <div className="relative z-10">
              <div className="text-xs font-black uppercase tracking-wide text-zinc-300">{eventTitle}</div>
              <div className="mt-3">
                <div className="text-2xl font-black uppercase text-white leading-none">{eventDate}</div>
                <div className="text-4xl font-black text-red-500 leading-none mt-0.5">{eventTime}</div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex items-center justify-end w-24">
              <div className="h-full w-full bg-gradient-to-l from-red-950/60 to-transparent" />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded border border-white/[0.05] bg-black/20">
            <div className="text-center">
              <div className="text-xs font-black uppercase text-zinc-700">Kein aktives Event</div>
              <div className="mt-1 text-[10px] text-zinc-700">Events werden hier angezeigt</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PromoPanel() {
  const [code, setCode] = useState("");
  return (
    <div className="relative overflow-hidden rounded border border-white/[0.07] bg-white/[0.03]">
      <div className="p-4 pr-20">
        <label htmlFor="promo-code" className="block text-[9px] font-black uppercase tracking-wider text-red-500 mb-3">
          Promo Code eingeben
        </label>
        <div className="flex gap-2">
          <input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code eingeben..."
            className="h-9 flex-1 rounded border border-white/[0.1] bg-black/40 px-3 text-sm font-semibold text-white placeholder-zinc-600 focus:border-red-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 transition-colors"
          />
          <button
            type="button"
            className="h-9 cursor-pointer rounded bg-red-600 px-4 text-[10px] font-black uppercase text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          >
            Apply
          </button>
        </div>
      </div>
      {/* Dekorativer Charakter-Bereich */}
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-20 bg-gradient-to-l from-red-950/50 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-1 flex items-end justify-center w-16">
        <svg className="h-16 w-14 text-red-900/50" fill="currentColor" viewBox="0 0 24 32">
          <path d="M12 0C8.7 0 6 2.7 6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zM3 32v-4c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8v4H3z"/>
        </svg>
      </div>
    </div>
  );
}

function ProfileTab({ payload }) {
  const p = payload || {};
  const stats = [
    { icon: <IconMoney />,     label: "Bargeld",     value: formatMoney(p.money) },
    { icon: <IconClock />,     label: "Spielzeit",   value: formatPlayTime(p.playTime) },
    { icon: <IconBank />,      label: "Bankkonto",   value: formatMoney(p.bankMoney) },
    { icon: <IconBriefcase />, label: "Job",         value: p.job || "Arbeitslos" },
    { icon: <IconDirty />,     label: "Schmutzgeld", value: formatMoney(p.dirtyMoney) },
    { icon: <IconPhone />,     label: "Handy",       value: p.phoneNumber || "Nicht vergeben" },
    { icon: <IconAlert />,     label: "Vorstrafen",  value: String(p.generalRecord ?? 0) },
  ];

  return (
    <div className="grid h-full grid-cols-[220px_1fr_260px] gap-4">
      {/* ─── Linke Spalte: Charakter ─── */}
      <div className="relative flex flex-col items-center overflow-hidden rounded border border-white/[0.07] bg-gradient-to-b from-red-950/50 to-zinc-950 pt-6 pb-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(153,27,27,0.3),transparent_65%)]" />
        <div className="relative z-10 flex flex-col items-center gap-3 w-full px-4">
          {/* Avatar */}
          <div className="relative">
            <div className="h-28 w-28 rounded-full border-2 border-red-500/40 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(220,38,38,0.18)]">
              <svg className="h-18 w-18 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full border border-black/60 bg-red-600 px-2 py-0.5 text-[9px] font-black text-white">
              ID {p.accountId || "?"}
            </div>
          </div>

          {/* Name */}
          <div className="text-center">
            <div className="font-display text-xl leading-none text-white uppercase tracking-wide">
              {p.playerName || "Spieler"}
            </div>
            {p.factionName ? (
              <div className="mt-1 text-[10px] font-bold uppercase text-red-400">
                {p.factionName} | {p.factionRankName}
              </div>
            ) : (
              <div className="mt-1 text-[10px] font-bold uppercase text-zinc-600">Keine Fraktion</div>
            )}
          </div>

          {/* Admin Badge */}
          {p.adminLevel > 0 && (
            <div className="rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-yellow-400">
              Admin Level {p.adminLevel}
            </div>
          )}

          {/* Divider */}
          <div className="w-full border-t border-white/[0.06]" />

          {/* Fraktion-Button */}
          {p.factionName && (
            <button
              type="button"
              onClick={() => trigger("cef:usermenu:openOrga")}
              className="w-full cursor-pointer rounded border border-red-500/30 bg-red-600/10 py-2 text-[10px] font-black uppercase text-red-400 transition-colors hover:bg-red-600/20 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              Fraktionsmenue (F6)
            </button>
          )}
        </div>

        {/* Charakter-Silhouette (dekorativ) */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden h-48 opacity-20">
          <svg className="h-full w-40 text-red-800" fill="currentColor" viewBox="0 0 80 120">
            <ellipse cx="40" cy="20" rx="16" ry="18"/>
            <path d="M18 55c0-12.2 9.8-22 22-22s22 9.8 22 22v10H18V55z"/>
            <path d="M16 65h12l-4 55H16V65zm36 0h12v55H52l-4-55z"/>
            <path d="M10 65h10l-6 40H8L10 65zm52 0h10l2 40h-6L62 65z"/>
          </svg>
        </div>
      </div>

      {/* ─── Mittlere Spalte: Stats + Events ─── */}
      <div className="flex flex-col gap-3 min-h-0">
        {/* Stats-Grid 2-spaltig */}
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-2">Spieler-Info</div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
            ))}
          </div>
        </div>

        {/* Events */}
        <EventsPanel />
      </div>

      {/* ─── Rechte Spalte: Updates + Promo ─── */}
      <div className="flex flex-col gap-3 min-h-0">
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
        <div className="text-4xl font-black uppercase text-zinc-800">{label}</div>
        <div className="mt-2 text-sm font-semibold text-zinc-600">Noch nicht verfuegbar</div>
      </div>
    </div>
  );
}

function UsermenuApp() {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    window.usermenuApp = {
      open: (rawPayload) => {
        setPayload(parsePayload(rawPayload));
        setActiveTab("profile");
        setVisible(true);
      },
      close: () => setVisible(false)
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

  const tabs = [
    { id: "profile",  label: "Profil" },
    { id: "cart",     label: "Warenkorb" },
    { id: "rewards",  label: "Belohnungen" },
    { id: "support",  label: "Support" },
    { id: "shop",     label: "Shop" },
    { id: "settings", label: "Einstellungen" },
  ];

  return (
    <main className="fixed inset-0 flex flex-col bg-black/80 text-white backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(5,0,0,0.97),rgba(20,5,5,0.92)_40%,rgba(8,8,12,0.95))]" />

      <div className="relative flex h-full flex-col border border-white/[0.07] bg-black/20">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between border-b border-white/[0.07] px-6 py-2.5">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Unique" className="h-6 w-6 rounded object-contain opacity-80" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600">ESC — Schliessen</div>
              <div className="font-display text-lg leading-none text-white">MENU</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-zinc-600">Spieler</div>
              <div className="text-sm font-black uppercase text-white">{payload?.playerName || "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => trigger("cef:usermenu:close")}
              className="h-7 cursor-pointer rounded border border-white/[0.1] bg-white/[0.05] px-3 text-[10px] font-black uppercase text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              Exit
            </button>
          </div>
        </header>

        {/* ─── Navigation ─── */}
        <nav className="flex items-center gap-0.5 border-b border-white/[0.07] px-4">
          {tabs.map((tab) => (
            <NavTab key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </NavTab>
          ))}
        </nav>

        {/* ─── Content ─── */}
        <div className="unique-scrollbar flex-1 overflow-y-auto p-4">
          {activeTab === "profile"  && <ProfileTab payload={payload} />}
          {activeTab === "cart"     && <PlaceholderTab label="Warenkorb" />}
          {activeTab === "rewards"  && <PlaceholderTab label="Taegl. Belohnungen" />}
          {activeTab === "support"  && <PlaceholderTab label="Support" />}
          {activeTab === "shop"     && <PlaceholderTab label="Shop" />}
          {activeTab === "settings" && <PlaceholderTab label="Einstellungen" />}
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<UsermenuApp />);
