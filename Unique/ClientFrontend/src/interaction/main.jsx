import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";

const defaultActions = [
  { id: "lock", label: "Abschliessen", hint: "Bald verfuegbar" },
  { id: "trunk", label: "Kofferraum", hint: "Bald verfuegbar" },
  { id: "info", label: "Fahrzeuginfo", hint: "Bald verfuegbar" },
  { id: "park", label: "Parken", hint: "Bald verfuegbar" }
];

const radius = 116;

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("de-DE")}`;
}

function HousePill({ children, accent = false, danger = false }) {
  const className = danger
    ? "border border-rose-400/[0.25] bg-rose-500/[0.12] text-rose-100"
    : accent
      ? "theme-primary-border theme-primary-soft theme-primary-text"
      : "border border-white/10 bg-white/[0.05] text-zinc-200";

  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${className}`}>
      {children}
    </div>
  );
}

function HouseMetric({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${emphasis ? "theme-primary-border theme-primary-soft" : "border-white/10 bg-black/[0.18]"}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-sm font-black uppercase ${emphasis ? "theme-primary-text" : "text-white"}`}>{value}</div>
    </div>
  );
}

function HouseFeatureTile({ active, label, hint }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 transition ${active ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-zinc-200"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-black ${active ? "bg-emerald-400/20 text-emerald-200" : "bg-white/[0.06] text-zinc-500"}`}>
          {active ? "+" : "-"}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black uppercase">{label}</div>
          <div className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{hint}</div>
        </div>
      </div>
    </div>
  );
}

function HouseStars({ stars }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`h-2.5 flex-1 rounded-full ${index < Number(stars || 0) ? "theme-primary-glow theme-primary-soft" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

function HousePreviewArt({ house }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [house?.houseId, house?.previewUrl]);

  const showImage = !!house?.previewUrl && !broken;

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0b121a] shadow-[0_24px_60px_rgba(0,0,0,0.36)]">
      <div className="aspect-[4/5]">
        {showImage ? (
          <img
            src={house.previewUrl}
            alt={house.title}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(165deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),linear-gradient(135deg,#1c2530,#0b1118)]">
            <div className="absolute inset-x-[12%] bottom-[14%] h-[48%] rounded-t-[28px] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]" />
            <div className="absolute bottom-[14%] left-[18%] h-[38%] w-[24%] rounded-t-[18px] border border-white/[0.12] bg-[#1b2631]" />
            <div className="absolute bottom-[14%] left-[46%] h-[22%] w-[14%] rounded-t-[12px] border border-white/[0.12] bg-[#121923]" />
            <div className="absolute bottom-[14%] right-[18%] h-[32%] w-[20%] rounded-t-[14px] border border-white/[0.12] bg-[#17212c]" />
            <div className="absolute inset-x-0 bottom-0 h-[18%] bg-[linear-gradient(180deg,transparent,rgba(5,8,12,0.9))]" />
            <div className="absolute left-5 right-5 top-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Live Exterior</div>
              <div className="mt-2 text-xl font-black uppercase text-white">{house.title}</div>
              <div className="mt-2 text-[11px] font-semibold leading-5 text-zinc-300">
                Sobald du vor dem Haus stehst, wird automatisch eine Vorschau aus deinem aktuellen Blickwinkel geladen.
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,transparent,rgba(4,7,10,0.94))]" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{house.streetName || "Unbekannte Lage"}</div>
            <div className="mt-2 truncate text-2xl font-black uppercase text-white">{house.title}</div>
            <div className="mt-2 truncate text-sm font-semibold text-zinc-300">{house.displayName}</div>
          </div>
          <HousePill accent>{house.tierLabel}</HousePill>
        </div>
      </div>
    </div>
  );
}

function HouseActionButton({ action, primary = false }) {
  return (
    <button
      type="button"
      onClick={() => trigger("cef:interaction:select", action.id)}
      className={`h-12 rounded-2xl px-5 text-[11px] font-black uppercase transition ${
        primary
          ? "theme-primary-border theme-primary-soft theme-primary-text theme-primary-glow hover:brightness-110"
          : "border border-white/10 bg-black/[0.24] text-zinc-100 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      {action.label}
    </button>
  );
}

function InteractionApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredUiTheme());
  const [mode, setMode] = useState("radial");
  const [position, setPosition] = useState({ x: 960, y: 540 });
  const [title, setTitle] = useState("Fahrzeug");
  const [items, setItems] = useState(defaultActions);
  const [house, setHouse] = useState(null);

  const close = useCallback(() => {
    setVisible(false);
    setMode("radial");
    setItems(defaultActions);
    setHouse(null);
    trigger("cef:interaction:close");
  }, []);

  useEffect(() => {
    window.interactionApp = {
      open: (x, y, label, nextActions) => {
        setPosition({ x: Number(x) || window.innerWidth / 2, y: Number(y) || window.innerHeight / 2 });
        setTitle(label || "Fahrzeug");
        setItems(Array.isArray(nextActions) && nextActions.length > 0 ? nextActions : defaultActions);
        setHouse(null);
        setMode("radial");
        setVisible(true);
      },
      openHouse: (payload) => {
        let parsed = payload;
        try {
          parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
        } catch (error) {
          parsed = null;
        }

        if (!parsed) {
          return;
        }

        setHouse(parsed);
        setMode("house");
        setVisible(true);
      },
      setHousePreview: (houseId, previewUrl) => {
        setHouse((current) => {
          if (!current || Number(current.houseId) !== Number(houseId)) {
            return current;
          }

          return {
            ...current,
            previewUrl
          };
        });
      },
      close: () => {
        setItems(defaultActions);
        setHouse(null);
        setMode("radial");
        setVisible(false);
      },
      setTheme: (raw) => {
        try {
          setTheme(persistUiTheme(normalizeUiTheme(typeof raw === "string" ? JSON.parse(raw) : raw)));
        } catch {
          setTheme(getStoredUiTheme());
        }
      }
    };

    trigger("cef:interaction:ready");

    return () => {
      delete window.interactionApp;
    };
  }, []);

  const themeVars = getThemeVars(theme);
  const primaryAction = house?.actions?.[0] || null;
  const secondaryActions = house?.actions?.slice(1) || [];
  const houseStatusText = useMemo(() => {
    if (!house) {
      return "";
    }

    if (!house.isOwned) {
      return "Zum Kauf verfuegbar";
    }

    return house.ownerName ? `Vergeben an ${house.ownerName}` : "Bereits vergeben";
  }, [house]);

  if (!visible) {
    return null;
  }

  return (
    <main className="unique-theme fixed inset-0 text-white" style={{ ...themeVars, background: "transparent" }}>
      <style>{THEME_CSS}</style>
      <button
        type="button"
        aria-label="Schliessen"
        className="absolute inset-0 cursor-default"
        style={{ background: "transparent" }}
        onClick={close}
      />

      {mode === "house" && house ? (
        <section className="pointer-events-none absolute inset-0 grid place-items-center px-4 py-8">
          <article className="pointer-events-auto relative w-full max-w-[980px] overflow-hidden rounded-[32px] border border-white/10 bg-[#05090e]/94 shadow-[0_28px_120px_rgba(0,0,0,0.62)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgb(var(--ui-primary-rgb)/0.16),transparent_28%),linear-gradient(135deg,rgb(var(--ui-surface-rgb)/0.96),rgba(4,8,12,0.97)_62%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="pointer-events-none absolute inset-y-0 left-[34%] hidden w-px bg-white/[0.06] lg:block" />

            <div className="relative grid gap-6 p-5 lg:grid-cols-[340px_1fr] lg:gap-8 lg:p-8">
              <div className="grid gap-4">
                <HousePreviewArt house={house} />

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <HouseMetric label={house.isOwned ? "Status" : "Preis"} value={house.isOwned ? "BELEGT" : formatMoney(house.price)} emphasis={!house.isOwned} />
                  <HouseMetric label="Interior" value={house.interiorLabel || house.tierLabel} />
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] px-4 py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Bewertung</div>
                    <div className="mt-3">
                      <HouseStars stars={house.stars} />
                    </div>
                    <div className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-300">{`${Number(house.stars || 0)}/5 Sterne`}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">{house.streetName || "Unbekannte Lage"}</div>
                    <div className="mt-2 text-4xl font-black uppercase tracking-tight text-white">{house.title}</div>
                    <div className="mt-2 text-sm font-semibold text-zinc-300">{house.displayName}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <HousePill accent>{house.tierLabel}</HousePill>
                    <HousePill danger={house.isOwned} accent={!house.isOwned}>{houseStatusText}</HousePill>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <HouseFeatureTile active={house.hasGarden} label={house.hasGarden ? "Garten" : "Kein Garten"} hint="Aussenbereich" />
                  <HouseFeatureTile active={house.hasGarage} label={house.hasGarage ? "Garage" : "Keine Garage"} hint={`${Number(house.garageSlots || 0)} Stellplaetze`} />
                  <HouseFeatureTile active={house.hasHelipad} label={house.hasHelipad ? "HeliPad" : "Kein HeliPad"} hint={`${Number(house.helipadSlots || 0)} Luft-Slot`} />
                  <HouseFeatureTile active={!house.isOwned} label={!house.isOwned ? "Kaufbar" : "Verkauft"} hint={house.isOwned ? "Nicht mehr verfuegbar" : "Sofort verfuegbar"} />
                  <HouseFeatureTile active={!house.isOwned || !house.isLocked} label={house.isLocked ? "Abgeschlossen" : "Offen"} hint="Zugangsstatus" />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[28px] border border-white/10 bg-black/[0.18] p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Objektprofil</div>
                    <div className="mt-4 text-sm font-semibold leading-7 text-zinc-300">
                      {house.description || "Dieses Haus kann gekauft, betreten und verwaltet werden. Lager, Kleiderschrank, Garage und optionales HeliPad richten sich nach der gewaelten Kategorie."}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-black/[0.18] p-5">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Details</div>
                    <div className="mt-4 grid gap-3">
                      <HouseMetric label="Garagenplaetze" value={Number(house.garageSlots || 0)} />
                      <HouseMetric label="HeliPad" value={house.hasHelipad ? `${Number(house.helipadSlots || 0)} Slot` : "Nein"} />
                      <HouseMetric label="Garten" value={house.hasGarden ? "Ja" : "Nein"} />
                      <HouseMetric label="Zugang" value={house.isLocked ? "Abgeschlossen" : "Offen"} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  {secondaryActions.map((action) => (
                    <HouseActionButton key={action.id} action={action} />
                  ))}
                  {primaryAction ? <HouseActionButton action={primaryAction} primary /> : null}
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section
          className="pointer-events-none absolute h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: position.x, top: position.y }}
        >
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-200/[0.22] bg-black/[0.72] theme-primary-glow-strong" />
          <div className="pointer-events-auto absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-fuchsia-200/[0.5] bg-black/[0.64] text-center theme-primary-glow">
            <div>
              <div className="font-display text-2xl leading-none">G</div>
              <div className="max-w-[58px] truncate text-[9px] font-black uppercase theme-primary-text">{title}</div>
            </div>
          </div>
          {items.map((action, index) => {
            const angle = (-90 + index * (360 / Math.max(items.length, 1))) * Math.PI / 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => trigger("cef:interaction:select", action.id)}
                className="pointer-events-auto absolute grid h-[76px] w-[118px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-violet-200/[0.16] bg-black/[0.64] px-2 text-center shadow-[0_12px_34px_rgba(0,0,0,0.44)] transition hover:border-fuchsia-200/[0.5] hover:bg-fuchsia-500/[0.2]"
                style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
              >
                <span className="text-[12px] font-black uppercase leading-tight">{action.label}</span>
                <span className="text-[9px] font-bold uppercase leading-tight text-zinc-500">{action.hint}</span>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<InteractionApp />);
