import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US")}`;
}

function formatMoneyDelta(value) {
  const amount = Math.abs(Number(value || 0)).toLocaleString("de-DE");
  return `${value > 0 ? "+" : "-"}${amount}`;
}

function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const rest = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function parseOverlayPayload(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }
  return raw;
}

function ticketLabel(status) {
  const labels = {
    open: "Offen",
    claimed: "Geclaimt",
    waiting_player: "Wartet auf dich",
    waiting_admin: "Wartet auf Admin",
    closed: "Geschlossen"
  };
  return labels[status] || status || "Offen";
}

function useClock(active) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return {
    time: now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    date: now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  };
}

function Icon({ children, className = "" }) {
  return <span className={`grid h-7 w-7 place-items-center rounded theme-primary-text ${className}`}>{children}</span>;
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1.5" />
      <path d="M4 8h14.5A1.5 1.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="16.5" cy="13.5" r="1" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 5l9 4.5" />
      <path d="M5 10.5h14" />
      <path d="M6.5 10.5V18M10.5 10.5V18M14.5 10.5V18M18.5 10.5V18" />
      <path d="M4 19h16" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M3 19c1-3.2 3.8-5 6-5 2.3 0 5.1 1.8 6.1 5" />
      <path d="M13 18c.8-2.4 2.8-3.8 4.5-3.8 1.2 0 4.2.8 5.2 4.2" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}

function Speedometer({ data }) {
  if (!data) return null;

  const { speed = 0, fuel = 100, maxFuel = 100, healthPercent = 100, engineOn = false, locked = false, headlightsOn = false } = data || {};
  const safeMaxFuel = Math.max(1, maxFuel || 0);
  const fuelPercent = Math.min(100, Math.max(0, (fuel / safeMaxFuel) * 100)) || 0;
  const safeHealthPercent = Math.min(100, Math.max(0, healthPercent || 0)) || 0;
  
  // SVG Arc helper
  const describeArc = (x, y, radius, startAngle, endAngle) => {
    if (isNaN(startAngle) || isNaN(endAngle)) return "";
    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = ((angleInDegrees || 0) - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", start.x || 0, start.y || 0, "A", radius, radius, 0, largeArcFlag, 0, end.x || 0, end.y || 0].join(" ");
  };

  return (
    <div className="absolute bottom-[4vh] right-[clamp(180px,10vw,240px)] flex flex-col items-center select-none">
      <div className="relative h-48 w-48">
        {/* Glow backdrop */}
        <div className="absolute inset-0 rounded-full blur-[40px]" style={{ backgroundColor: "rgb(var(--ui-primary-rgb) / 0.08)" }} />
        
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 drop-shadow-[0_0_12px_rgba(0,0,0,0.4)]">
          {/* Background Arcs (Minimal) */}
          <path d={describeArc(50, 50, 44, -120, 120)} fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
          
          {/* Fuel Arc */}
          <path d={describeArc(50, 50, 44, -120, -120 + (fuelPercent * 1.1))} fill="none" stroke="var(--ui-primary)" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500" strokeOpacity="0.82" />
          <path d={describeArc(50, 50, 44, -120, -120 + (fuelPercent * 1.1))} fill="none" stroke="var(--ui-primary)" strokeWidth="4" strokeLinecap="round" className="transition-all duration-500 blur-[2px]" strokeOpacity="0.22" />
          
          {/* Health Arc (Right) - Amber Glow */}
          <path d={describeArc(50, 50, 44, 120 - (safeHealthPercent * 1.1), 120)} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500" strokeOpacity="0.8" />
          <path d={describeArc(50, 50, 44, 120 - (safeHealthPercent * 1.1), 120)} fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" className="transition-all duration-500 blur-[2px]" strokeOpacity="0.2" />
        </svg>

        {/* Central Speed Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-[-2px]">
          <div className="font-display text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] select-none">
            {Math.floor(speed)}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 -mt-1 ml-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">KM/H</div>
        </div>
      </div>

      {/* Elegant Floating Icons (No backdrop-blur to avoid CEF black box artifacts) */}
      <div className="flex items-center gap-7 mt-[-15px] px-6 py-3 rounded-2xl bg-zinc-900/40 border border-white/5 shadow-lg">
        {/* Lights */}
        <div className={`transition-all duration-300 ${headlightsOn ? "theme-primary-text scale-110" : "text-white/10"}`} style={headlightsOn ? { filter: "drop-shadow(0 0 8px rgb(var(--ui-primary-rgb) / 0.55))" } : undefined}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 18V6l-7 6 7 6zM15 8h4M16 12h4M15 16h4" />
          </svg>
        </div>
        
        {/* Engine */}
        <div className={`transition-all duration-300 ${engineOn ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110" : "text-white/10"}`}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 8V4h-4v4l-4 3v6h12v-6l-4-3zM7 14h10M12 4v2" />
          </svg>
        </div>

        {/* Lock */}
        <div className={`transition-all duration-300 ${locked ? "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)] scale-110" : "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"}`}>
          {locked ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          )}
        </div>

        {/* Fuel Indicator (Subtle blinking if low) */}
        <div className={`transition-all duration-300 ${fuelPercent < 15 ? "text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "text-white/20"}`}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 18V6c0-1.1.9-2 2-2h9l3 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM14 4h3M14 18h3M18 7v10M9 9h0M9 13h0" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Notification({ id, type, title, message, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const timer = useRef(null);

  const colors = {
    success: {
      bg: "border-emerald-500/30 bg-emerald-500/[0.05]",
      icon: "text-emerald-400",
      accent: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
      svg: <path d="M20 6L9 17l-5-5" />
    },
    error: {
      bg: "border-rose-500/30 bg-rose-500/[0.05]",
      icon: "text-rose-400",
      accent: "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
      svg: <path d="M18 6L6 18M6 6l12 12" />
    },
    warning: {
      bg: "border-amber-500/30 bg-amber-500/[0.05]",
      icon: "text-amber-400",
      accent: "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
      svg: <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    }
  };

  const style = colors[type] || colors.success;

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(id), 400);
  }, [id, onRemove]);

  useEffect(() => {
    timer.current = setTimeout(handleRemove, 5000);
    return () => clearTimeout(timer.current);
  }, [handleRemove]);

  return (
    <div 
      className={`relative w-80 overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-400 ${style.bg} ${isExiting ? "translate-x-full opacity-0 scale-95" : "translate-x-0 opacity-100 scale-100"}`}
      style={{ animation: isExiting ? "none" : "uniqueNotifyIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />
      <div className="flex items-start gap-4 p-4">
        <div className={`mt-0.5 rounded-lg p-1.5 bg-black/20 ${style.icon}`}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {style.svg}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {title && <div className="mb-0.5 text-sm font-black text-white/90">{title}</div>}
          <div className="text-xs font-bold leading-relaxed text-white/60">{message}</div>
        </div>
        <button onClick={handleRemove} className="text-white/20 hover:text-white/40 transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function HudApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredUiTheme());
  const [location, setLocation] = useState({ zone: "San Andreas", street: "Unbekannt", crossing: "", direction: "N" });
  const [stats, setStats] = useState({ id: 1, online: 1, cash: 0, bank: 0 });
  const [adminTickets, setAdminTickets] = useState({ visible: false, openCount: 0, overflowCount: 0, tickets: [] });
  const [playerTicket, setPlayerTicket] = useState({ visible: false, ticket: null });
  const [ticketMute, setTicketMute] = useState({ active: false, admin: "", reason: "", expiresAt: "", remaining: 0 });
  const [moneyDeltas, setMoneyDeltas] = useState([]);
  const [jail, setJail] = useState({ active: false, notice: false, admin: "", reason: "", releaseAt: "", remaining: 0 });
  const [vehicleStats, setVehicleStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const previousMoneyRef = useRef(null);
  const jailNoticeTimer = useRef(null);
  const ticketMuteTimer = useRef(null);
  const clock = useClock(visible);

  const updateLocation = useCallback((zone, street, crossing, direction) => {
    setLocation({
      zone: zone || "San Andreas",
      street: street || "Unbekannt",
      crossing: crossing || "",
      direction: direction || "N"
    });
  }, []);

  const addNotification = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateStats = useCallback((id, online, cash, bank) => {
    const nextCash = cash ?? 0;
    const nextBank = bank ?? 0;

    if (previousMoneyRef.current) {
      const deltas = [];
      const cashDelta = nextCash - previousMoneyRef.current.cash;
      const bankDelta = nextBank - previousMoneyRef.current.bank;

      if (cashDelta !== 0) {
        deltas.push({ id: `cash-${Date.now()}-${Math.random()}`, type: "cash", amount: cashDelta });
      }

      if (bankDelta !== 0) {
        deltas.push({ id: `bank-${Date.now()}-${Math.random()}`, type: "bank", amount: bankDelta });
      }

      if (deltas.length > 0) {
        setMoneyDeltas((current) => [...current, ...deltas].slice(-6));
        setTimeout(() => {
          setMoneyDeltas((current) => current.filter((delta) => !deltas.some((created) => created.id === delta.id)));
        }, 1900);
      }
    }

    previousMoneyRef.current = { cash: nextCash, bank: nextBank };

    setStats({
      id: id ?? 1,
      online: online ?? 1,
       cash: nextCash,
      bank: nextBank
    });
  }, []);

  const showJail = useCallback((data) => {
    const parsed = parseOverlayPayload(data);
    const releaseAt = parsed?.releaseAt || "";
    const releaseTime = new Date(releaseAt).getTime();
    const remaining = Number.isNaN(releaseTime) ? 0 : Math.max(0, Math.ceil((releaseTime - Date.now()) / 1000));

    if (jailNoticeTimer.current) {
      clearTimeout(jailNoticeTimer.current);
    }

    setJail({
      active: true,
      notice: true,
      admin: parsed?.admin || "Unbekannt",
      reason: parsed?.reason || "Kein Grund angegeben.",
      releaseAt,
      remaining
    });

    jailNoticeTimer.current = setTimeout(() => {
      setJail((current) => ({ ...current, notice: false }));
      jailNoticeTimer.current = null;
    }, 3000);
  }, []);

  const hideJail = useCallback(() => {
    if (jailNoticeTimer.current) {
      clearTimeout(jailNoticeTimer.current);
      jailNoticeTimer.current = null;
    }

    setJail({ active: false, notice: false, admin: "", reason: "", releaseAt: "", remaining: 0 });
  }, []);

  const showTicketMute = useCallback((data) => {
    const parsed = parseOverlayPayload(data);
    const expiresAt = parsed?.expiresAt || "";
    const releaseTime = new Date(expiresAt).getTime();
    const remaining = Number.isNaN(releaseTime) ? 0 : Math.max(0, Math.ceil((releaseTime - Date.now()) / 1000));

    if (ticketMuteTimer.current) {
      clearTimeout(ticketMuteTimer.current);
    }

    setTicketMute({
      active: true,
      admin: parsed?.admin || "Support-Team",
      reason: parsed?.reason || "Kein Grund angegeben.",
      expiresAt,
      remaining
    });

    ticketMuteTimer.current = setTimeout(() => {
      setTicketMute((current) => ({ ...current, active: false }));
      ticketMuteTimer.current = null;
    }, 4500);
  }, []);

  const hideTicketMute = useCallback(() => {
    if (ticketMuteTimer.current) {
      clearTimeout(ticketMuteTimer.current);
      ticketMuteTimer.current = null;
    }
    setTicketMute({ active: false, admin: "", reason: "", expiresAt: "", remaining: 0 });
  }, []);

  useEffect(() => {
    if (!jail.active || !jail.releaseAt) {
      return undefined;
    }

    const timer = setInterval(() => {
      const releaseTime = new Date(jail.releaseAt).getTime();
      const remaining = Number.isNaN(releaseTime) ? 0 : Math.max(0, Math.ceil((releaseTime - Date.now()) / 1000));
      setJail((current) => ({ ...current, remaining }));
    }, 1000);

    return () => clearInterval(timer);
  }, [jail.active, jail.releaseAt]);

  useEffect(() => {
    if (!ticketMute.active || !ticketMute.expiresAt) {
      return undefined;
    }

    const timer = setInterval(() => {
      const releaseTime = new Date(ticketMute.expiresAt).getTime();
      const remaining = Number.isNaN(releaseTime) ? 0 : Math.max(0, Math.ceil((releaseTime - Date.now()) / 1000));
      setTicketMute((current) => ({ ...current, remaining }));
    }, 1000);

    return () => clearInterval(timer);
  }, [ticketMute.active, ticketMute.expiresAt]);

  useEffect(() => {
    window.hudApp = {
      setVisible: (state) => setVisible(!!state),
      setTheme: (raw) => {
        try {
          setTheme(persistUiTheme(normalizeUiTheme(typeof raw === "string" ? JSON.parse(raw) : raw)));
        } catch {
          setTheme(getStoredUiTheme());
        }
      },
      updateLocation,
      updateStats,
      showJail,
      hideJail,
      showTicketMute,
      hideTicketMute,
      addNotification,
      updateSpeedometer: (data) => setVehicleStats(data),
      setAdminTickets: (rawPayload) => {
        let parsed = rawPayload;
        if (typeof rawPayload === "string") {
          try {
            parsed = JSON.parse(rawPayload);
          } catch (error) {
            parsed = { visible: false, openCount: 0, overflowCount: 0, tickets: [] };
          }
        }

        setAdminTickets({
          visible: !!parsed?.visible,
          openCount: Number(parsed?.openCount || 0),
          overflowCount: Number(parsed?.overflowCount || 0),
          tickets: Array.isArray(parsed?.tickets) ? parsed.tickets : []
        });
      },
      setPlayerTicket: (rawPayload) => {
        let parsed = rawPayload;
        if (typeof rawPayload === "string") {
          try {
            parsed = JSON.parse(rawPayload);
          } catch (error) {
            parsed = { visible: false, ticket: null };
          }
        }

        setPlayerTicket({
          visible: !!parsed?.visible,
          ticket: parsed?.ticket || null
        });
      }
    };

    trigger("cef:hud:ready");

    return () => {
      delete window.hudApp;
    };
  }, [hideJail, showJail, showTicketMute, hideTicketMute, updateLocation, updateStats, addNotification]);

  if (!visible) {
    return null;
  }

  const cashDeltas = moneyDeltas.filter((delta) => delta.type === "cash");
  const bankDeltas = moneyDeltas.filter((delta) => delta.type === "bank");
  const themeVars = getThemeVars(theme);

  return (
    <main className="unique-theme fixed inset-0 pointer-events-none text-white" style={themeVars}>
      <style>{`
        ${THEME_CSS}
        @keyframes uniqueMoneyDelta {
          0% { opacity: 0; transform: translateY(-4px) scale(0.96); }
          16% { opacity: 1; transform: translateY(0) scale(1); }
          72% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(10px) scale(0.98); }
        }
        @keyframes uniqueJailNotice {
          0% { opacity: 0; transform: translateY(18px) scale(0.98); }
          14% { opacity: 1; transform: translateY(0) scale(1); }
          78% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.99); }
        }
        @keyframes uniqueNotifyIn {
          from { opacity: 0; transform: translateX(30px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
      
      {/* Dynamic Notifications */}
      <div className="absolute top-[clamp(16px,2vh,32px)] right-[clamp(16px,2vw,32px)] flex flex-col gap-3 z-[9999]">
        {notifications.map((n) => (
          <Notification key={n.id} {...n} onRemove={removeNotification} />
        ))}
      </div>

      {adminTickets.visible && (
        <>
          <section className="absolute left-[clamp(16px,2vw,28px)] top-[clamp(270px,33vh,360px)] z-[20] grid w-[350px] gap-2">
            {adminTickets.tickets.map((ticket) => (
              <article key={ticket.ticketId} className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black uppercase text-white">
                      #{ticket.ticketId} {ticket.subject}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      {ticket.accountName} | {ticket.prefix}
                    </div>
                  </div>
                  <div className={`rounded border px-2 py-1 text-[9px] font-black uppercase ${
                    ticket.claimedByName
                      ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
                      : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                  }`}>
                    {ticket.claimedByName ? "claimed" : "open"}
                  </div>
                </div>
                {ticket.lastMessage && (
                  <div className="mt-2 truncate text-[11px] font-semibold text-white/70">
                    {ticket.lastMessage}
                  </div>
                )}
                {ticket.claimReleaseAt && (
                  <div className="mt-2 text-[10px] font-black uppercase text-fuchsia-200">
                    Frei um {new Date(ticket.claimReleaseAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </article>
            ))}
            {adminTickets.overflowCount > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-zinc-300 backdrop-blur-md">
                +{adminTickets.overflowCount} weitere Tickets
              </div>
            )}
          </section>

          <section className="absolute bottom-[clamp(18px,2.8vh,30px)] left-1/2 z-[20] -translate-x-1/2">
            <div className={`min-w-[88px] rounded-2xl border px-3 py-2 text-center backdrop-blur-md ${
              adminTickets.openCount >= 5
                ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                : "border-white/15 bg-black/40 text-white"
            }`}>
              <div className="text-xl font-black leading-none">{adminTickets.openCount}</div>
              <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.24em] opacity-80">Tickets</div>
            </div>
          </section>
        </>
      )}
      {ticketMute.active && !jail.active && (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.28),rgba(0,0,0,0.82))]" style={{ animation: "uniqueJailNotice 4.5s ease-out forwards" }}>
          <section className="relative grid w-[min(860px,88vw)] gap-5 overflow-hidden rounded-md border border-rose-200/[0.16] bg-black/[0.42] p-7 text-center shadow-[0_18px_60px_rgba(0,0,0,0.52)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(4,4,8,0.98),rgba(30,8,12,0.94)_42%,rgba(120,18,35,0.54)_74%,rgba(8,8,12,0.96))]" />
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-md border border-rose-200/[0.18] bg-rose-500/[0.14] text-rose-100 shadow-[0_0_28px_rgba(244,63,94,0.24)]">
              <svg viewBox="0 0 48 48" className="h-9 w-9 fill-none stroke-current stroke-[2]">
                <path d="M13 19h22" />
                <path d="M24 10v18" />
                <circle cx="24" cy="24" r="16" />
              </svg>
            </div>
            <div className="relative">
              <div className="font-display text-7xl leading-none text-white">TICKET MUTE</div>
              <div className="mt-2 text-sm font-black uppercase tracking-normal text-rose-200">Ticket-System voruebergehend gesperrt</div>
            </div>
            <div className="relative grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-md border border-rose-200/[0.12] bg-black/[0.28] p-4 sm:col-span-2">
                <div className="text-[10px] font-black uppercase text-rose-200">Grund</div>
                <div className="mt-1 text-lg font-black text-white">{ticketMute.reason}</div>
              </div>
              <div className="rounded-md border border-rose-200/[0.1] bg-black/[0.24] p-4">
                <div className="text-[10px] font-black uppercase text-zinc-500">Vergeben von</div>
                <div className="mt-1 text-sm font-bold text-zinc-100">{ticketMute.admin}</div>
              </div>
              <div className="rounded-md border border-rose-200/[0.1] bg-black/[0.24] p-4">
                <div className="text-[10px] font-black uppercase text-zinc-500">Restzeit</div>
                <div className="mt-1 text-sm font-bold text-zinc-100">{formatCountdown(ticketMute.remaining)}</div>
              </div>
            </div>
          </section>
        </div>
      )}
      <style>{`
        @keyframes uniqueMoneyDelta {
          0% { opacity: 0; transform: translateY(-4px) scale(0.96); }
          16% { opacity: 1; transform: translateY(0) scale(1); }
          72% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(10px) scale(0.98); }
        }
        @keyframes uniqueJailNotice {
          0% { opacity: 0; transform: translateY(18px) scale(0.98); }
          14% { opacity: 1; transform: translateY(0) scale(1); }
          78% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.99); }
        }
      `}</style>
      {jail.active && (
        <section className="theme-panel-gradient absolute left-1/2 top-5 w-[min(620px,80vw)] -translate-x-1/2 overflow-hidden rounded-md border border-violet-200/[0.18] px-4 py-3 text-center shadow-[0_10px_34px_rgba(0,0,0,0.5)]">
          <div className="theme-sheen-line pointer-events-none absolute inset-x-8 top-0 h-px" />
          <div className="theme-dot theme-primary-glow mx-auto mb-2 h-1 w-20 rounded" />
          <div className="flex items-center justify-center gap-3">
            <span className="rounded bg-fuchsia-500/[0.18] px-2 py-1 text-[10px] font-black uppercase tracking-normal text-fuchsia-100">Admin Jail</span>
            <span className="text-2xl font-black leading-none text-white">{formatCountdown(jail.remaining)}</span>
          </div>
          <div className="mt-2 truncate text-xs font-bold text-zinc-300">
            Administrator {jail.admin} | {jail.reason}
          </div>
        </section>
      )}

      {jail.active && jail.notice && (
        <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.28),rgba(0,0,0,0.82))]" style={{ animation: "uniqueJailNotice 3s ease-out forwards" }}>
          <section className="relative grid w-[min(860px,88vw)] gap-5 overflow-hidden rounded-md border border-violet-200/[0.16] bg-black/[0.42] p-7 text-center shadow-[0_18px_60px_rgba(0,0,0,0.52)]">
            <div className="theme-hero-gradient pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute inset-x-[8%] top-[18%] h-[48%] -skew-x-12 border-y border-violet-300/[0.08]" style={{ backgroundColor: "rgb(var(--ui-primary-rgb) / 0.05)" }} />
            <div className="theme-primary-glow-strong relative mx-auto grid h-16 w-16 place-items-center rounded-md border border-violet-200/[0.18] bg-fuchsia-500/[0.14] text-fuchsia-100">
              <svg viewBox="0 0 48 48" className="h-9 w-9 fill-none stroke-current stroke-[2]">
                <path d="M15 21V14c0-5 4-9 9-9s9 4 9 9v7" />
                <path d="M12 21h24v19H12z" />
                <path d="M24 28v6" />
              </svg>
            </div>
            <div className="relative">
              <div className="font-display text-7xl leading-none text-white">ADMIN JAIL</div>
              <div className="mt-2 text-sm font-black uppercase tracking-normal text-fuchsia-200">Du wurdest inhaftiert</div>
            </div>
            <div className="relative grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-md border border-violet-200/[0.12] bg-black/[0.28] p-4 sm:col-span-2">
                <div className="text-[10px] font-black uppercase text-fuchsia-200">Grund</div>
                <div className="mt-1 text-lg font-black text-white">{jail.reason}</div>
              </div>
              <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
                <div className="text-[10px] font-black uppercase text-zinc-500">Administrator</div>
                <div className="mt-1 text-sm font-bold text-zinc-100">{jail.admin}</div>
              </div>
              <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
                <div className="text-[10px] font-black uppercase text-zinc-500">Restzeit</div>
                <div className="mt-1 text-sm font-bold text-zinc-100">{formatCountdown(jail.remaining)}</div>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="absolute right-[clamp(18px,2vw,34px)] top-[clamp(16px,2.2vh,28px)] grid justify-items-end gap-1.5 text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-end gap-2">
          <div className="font-display text-[clamp(28px,2.4vw,42px)] leading-none text-white">Unique<span className="theme-primary-text"> RP</span></div>
          <img className="h-8 w-8 rounded object-contain" src={logoSrc} alt="Unique Roleplay" />
        </div>

        <div className="flex items-center justify-end gap-3 text-[13px] font-black text-violet-100">
          <span>ID: <span className="text-white">{stats.id}</span></span>
          <span className="flex items-center gap-1">
            <PeopleIcon />
            <span>{stats.online}</span>
          </span>
        </div>

        <div className="mt-6 grid justify-items-end gap-1.5">
          <div className="grid justify-items-end gap-0.5">
            <div className="flex items-center justify-end gap-2">
              <WalletIcon />
              <span className="theme-money-text theme-money-glow text-[clamp(22px,2vw,34px)] font-black leading-none">{formatMoney(stats.cash)}</span>
            </div>
            <div className="grid min-h-[18px] justify-items-end gap-0.5">
              {cashDeltas.map((delta) => (
                <span
                  key={delta.id}
                  className={`text-[13px] font-black leading-none ${delta.amount > 0 ? "text-emerald-300" : "text-rose-300"}`}
                  style={{ animation: "uniqueMoneyDelta 1.9s ease-out forwards" }}
                >
                  {formatMoneyDelta(delta.amount)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid justify-items-end gap-0.5">
            <div className="flex items-center justify-end gap-2">
              <BankIcon />
              <span className="theme-money-text text-[clamp(14px,1.15vw,19px)] font-black leading-none" style={{ opacity: 0.92 }}>{formatMoney(stats.bank)}</span>
            </div>
            <div className="grid min-h-[16px] justify-items-end gap-0.5">
              {bankDeltas.map((delta) => (
                <span
                  key={delta.id}
                  className={`text-[12px] font-black leading-none ${delta.amount > 0 ? "text-emerald-300" : "text-rose-300"}`}
                  style={{ animation: "uniqueMoneyDelta 1.9s ease-out forwards" }}
                >
                  {formatMoneyDelta(delta.amount)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Speedometer data={vehicleStats} />

      <section className="absolute bottom-[clamp(20px,3.2vh,36px)] left-[clamp(220px,17.8vw,360px)] flex w-[min(420px,48vw)] items-center gap-3 drop-shadow-[0_2px_5px_rgba(0,0,0,0.86)] max-[760px]:left-[132px] max-[760px]:w-[calc(100vw-150px)]">
        <div className="theme-primary-glow grid h-8 w-8 shrink-0 place-items-center rounded-md bg-fuchsia-500 text-sm font-black">{location.direction}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[clamp(17px,1.55vw,24px)] font-black leading-tight text-white"><LocationIcon /> <span className="truncate">{location.street}</span></div>
          <div className="truncate text-[clamp(12px,1.1vw,15px)] font-black text-violet-100">
            {location.zone}
            {location.crossing ? ` / ${location.crossing}` : ""}
          </div>
        </div>
      </section>

      <section className="absolute bottom-[clamp(18px,2.8vh,32px)] right-[clamp(18px,2vw,36px)] grid justify-items-end gap-0.5 text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.78)]">
        <div className="flex items-center justify-end gap-2">
          <Icon className="h-6 w-6 text-violet-100">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4.5l3 1.5" />
            </svg>
          </Icon>
          <strong className="text-[clamp(18px,1.6vw,26px)] leading-none">{clock.time}</strong>
        </div>
        <div className="text-[12px] font-bold text-violet-100">{clock.date}</div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<HudApp />);
