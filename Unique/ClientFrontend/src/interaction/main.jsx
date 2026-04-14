import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";

const actions = [
  { id: "lock", label: "Abschliessen", hint: "Bald verfuegbar" },
  { id: "trunk", label: "Kofferraum", hint: "Bald verfuegbar" },
  { id: "info", label: "Fahrzeuginfo", hint: "Bald verfuegbar" },
  { id: "park", label: "Parken", hint: "Bald verfuegbar" }
];

const radius = 116;

function InteractionApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredUiTheme());
  const [position, setPosition] = useState({ x: 960, y: 540 });
  const [title, setTitle] = useState("Fahrzeug");
  const [items, setItems] = useState(actions);

  const close = useCallback(() => {
    setVisible(false);
    trigger("cef:interaction:close");
  }, []);

  useEffect(() => {
    window.interactionApp = {
      open: (x, y, label, nextActions) => {
        setPosition({ x: Number(x) || window.innerWidth / 2, y: Number(y) || window.innerHeight / 2 });
        setTitle(label || "Fahrzeug");
        setItems(Array.isArray(nextActions) && nextActions.length > 0 ? nextActions : actions);
        setVisible(true);
      },
      close: () => {
        setItems(actions);
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

  if (!visible) {
    return null;
  }

  const themeVars = getThemeVars(theme);

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
    </main>
  );
}

createRoot(document.getElementById("root")).render(<InteractionApp />);
