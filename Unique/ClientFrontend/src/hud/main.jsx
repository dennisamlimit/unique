import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

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
  return <span className={`grid h-7 w-7 place-items-center rounded text-fuchsia-100 ${className}`}>{children}</span>;
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

function HudApp() {
  const [visible, setVisible] = useState(false);
  const [location, setLocation] = useState({ zone: "San Andreas", street: "Unbekannt", crossing: "", direction: "N" });
  const [stats, setStats] = useState({ id: 1, online: 1, cash: 0, bank: 0 });
  const [moneyDeltas, setMoneyDeltas] = useState([]);
  const [jail, setJail] = useState({ active: false, notice: false, admin: "", reason: "", releaseAt: "", remaining: 0 });
  const previousMoneyRef = useRef(null);
  const jailNoticeTimer = useRef(null);
  const clock = useClock(visible);

  const updateLocation = useCallback((zone, street, crossing, direction) => {
    setLocation({
      zone: zone || "San Andreas",
      street: street || "Unbekannt",
      crossing: crossing || "",
      direction: direction || "N"
    });
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
    const releaseAt = data?.releaseAt || "";
    const releaseTime = new Date(releaseAt).getTime();
    const remaining = Number.isNaN(releaseTime) ? 0 : Math.max(0, Math.ceil((releaseTime - Date.now()) / 1000));

    if (jailNoticeTimer.current) {
      clearTimeout(jailNoticeTimer.current);
    }

    setJail({
      active: true,
      notice: true,
      admin: data?.admin || "Unbekannt",
      reason: data?.reason || "Kein Grund angegeben.",
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
    window.hudApp = {
      setVisible: (state) => setVisible(!!state),
      updateLocation,
      updateStats,
      showJail,
      hideJail
    };

    trigger("cef:hud:ready");

    return () => {
      delete window.hudApp;
    };
  }, [hideJail, showJail, updateLocation, updateStats]);

  if (!visible) {
    return null;
  }

  const cashDeltas = moneyDeltas.filter((delta) => delta.type === "cash");
  const bankDeltas = moneyDeltas.filter((delta) => delta.type === "bank");

  return (
    <main className="fixed inset-0 pointer-events-none text-white">
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
        <section className="absolute left-1/2 top-5 w-[min(620px,80vw)] -translate-x-1/2 overflow-hidden rounded-md border border-violet-200/[0.18] bg-[linear-gradient(115deg,rgba(4,4,8,0.9),rgba(22,8,34,0.82)_48%,rgba(70,18,100,0.54)_78%,rgba(5,5,8,0.9))] px-4 py-3 text-center shadow-[0_10px_34px_rgba(0,0,0,0.5)]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-200 to-transparent" />
          <div className="mx-auto mb-2 h-1 w-20 rounded bg-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.62)]" />
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
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(4,4,8,0.98),rgba(16,8,24,0.94)_42%,rgba(57,18,82,0.62)_74%,rgba(8,8,12,0.96))]" />
            <div className="pointer-events-none absolute inset-x-[8%] top-[18%] h-[48%] -skew-x-12 border-y border-violet-300/[0.08] bg-violet-400/[0.04]" />
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-md border border-violet-200/[0.18] bg-fuchsia-500/[0.14] text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.24)]">
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
          <div className="font-display text-[clamp(28px,2.4vw,42px)] leading-none text-white">Unique<span className="text-fuchsia-300"> RP</span></div>
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
              <span className="text-[clamp(22px,2vw,34px)] font-black leading-none text-fuchsia-200">{formatMoney(stats.cash)}</span>
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
              <span className="text-[clamp(14px,1.15vw,19px)] font-black leading-none text-violet-100">{formatMoney(stats.bank)}</span>
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

      <section className="absolute bottom-[clamp(20px,3.2vh,36px)] left-[clamp(220px,17.8vw,360px)] flex w-[min(420px,48vw)] items-center gap-3 drop-shadow-[0_2px_5px_rgba(0,0,0,0.86)] max-[760px]:left-[132px] max-[760px]:w-[calc(100vw-150px)]">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-fuchsia-500 text-sm font-black shadow-[0_0_18px_rgba(217,70,239,0.48)]">{location.direction}</div>
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
