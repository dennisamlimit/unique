import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("en-US")}`;
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
    setStats({
      id: id ?? 1,
      online: online ?? 1,
      cash: cash ?? 0,
      bank: bank ?? 0
    });
  }, []);

  useEffect(() => {
    window.hudApp = {
      setVisible: (state) => setVisible(!!state),
      updateLocation,
      updateStats
    };

    trigger("cef:hud:ready");

    return () => {
      delete window.hudApp;
    };
  }, [updateLocation, updateStats]);

  if (!visible) {
    return null;
  }

  return (
    <main className="fixed inset-0 pointer-events-none text-white">
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
          <div className="flex items-center justify-end gap-2">
            <WalletIcon />
            <span className="text-[clamp(22px,2vw,34px)] font-black leading-none text-fuchsia-200">{formatMoney(stats.cash)}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <BankIcon />
            <span className="text-[clamp(14px,1.15vw,19px)] font-black leading-none text-violet-100">{formatMoney(stats.bank)}</span>
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
