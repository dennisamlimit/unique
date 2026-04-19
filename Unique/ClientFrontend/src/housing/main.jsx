import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, getThemeVars, normalizeUiTheme, persistUiTheme } from "../lib/theme.js";
import "./housing.css";

function HousingStorageApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(getStoredUiTheme());
  const [payload, setPayload] = useState({
    houseId: 0,
    title: "Lager",
    streetName: "",
    stars: 1,
    slots: { used: 0, total: 0 },
    playerInventory: [],
    storageInventory: []
  });
  const [selectedSide, setSelectedSide] = useState("storage");
  const [selectedUid, setSelectedUid] = useState("");

  const selectedItem = useMemo(() => {
    const source = selectedSide === "player" ? payload.playerInventory : payload.storageInventory;
    return source.find((entry) => entry.uid === selectedUid) || null;
  }, [payload.playerInventory, payload.storageInventory, selectedSide, selectedUid]);

  useEffect(() => {
    window.houseStorageApp = {
      show: (rawPayload) => {
        setPayload({
          houseId: Number(rawPayload?.houseId || 0),
          title: rawPayload?.title || "Lager",
          streetName: rawPayload?.streetName || "",
          stars: Number(rawPayload?.stars || 1),
          slots: rawPayload?.slots || { used: 0, total: 0 },
          playerInventory: Array.isArray(rawPayload?.playerInventory) ? rawPayload.playerInventory : [],
          storageInventory: Array.isArray(rawPayload?.storageInventory) ? rawPayload.storageInventory : []
        });
        setSelectedSide("storage");
        setSelectedUid("");
        setVisible(true);
      },
      hide: () => {
        setVisible(false);
        setSelectedUid("");
      },
      setState: (rawPayload) => {
        setPayload({
          houseId: Number(rawPayload?.houseId || 0),
          title: rawPayload?.title || "Lager",
          streetName: rawPayload?.streetName || "",
          stars: Number(rawPayload?.stars || 1),
          slots: rawPayload?.slots || { used: 0, total: 0 },
          playerInventory: Array.isArray(rawPayload?.playerInventory) ? rawPayload.playerInventory : [],
          storageInventory: Array.isArray(rawPayload?.storageInventory) ? rawPayload.storageInventory : []
        });
      },
      setTheme: (raw) => {
        try {
          setTheme(persistUiTheme(normalizeUiTheme(typeof raw === "string" ? JSON.parse(raw) : raw)));
        } catch {
          setTheme(getStoredUiTheme());
        }
      }
    };

    trigger("cef:housingStorage:ready");

    return () => {
      delete window.houseStorageApp;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && visible) {
        trigger("cef:housingStorage:close");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const themeVars = getThemeVars(theme);

  const renderItem = (item, side) => {
    const active = selectedUid === item.uid && selectedSide === side;
    return (
      <button
        key={item.uid}
        type="button"
        onClick={() => {
          setSelectedSide(side);
          setSelectedUid(item.uid);
        }}
        className={`housing-item ${active ? "active" : ""}`}
      >
        <div className="housing-item-top">
          <span className="housing-item-name">{item.displayName || item.key}</span>
          <span className="housing-item-amount">x{Number(item.amount || 0)}</span>
        </div>
        <div className="housing-item-meta">
          <span>{item.description || item.key}</span>
          <span>{item.data?.uiIcon || "item"}</span>
        </div>
      </button>
    );
  };

  return (
    <main className="unique-theme fixed inset-0 bg-black/[0.76] text-white backdrop-blur-md" style={themeVars}>
      <style>{THEME_CSS}</style>
      <section className="housing-shell">
        <header className="housing-header">
          <div>
            <div className="housing-kicker">House Storage</div>
            <h1>{payload.title}</h1>
            <p>{payload.streetName} | {"★".repeat(Math.max(1, Number(payload.stars || 1)))}</p>
          </div>
          <div className="housing-header-right">
            <div className="housing-slot-box">
              <span>Lager</span>
              <strong>{Number(payload.slots?.used || 0)} / {Number(payload.slots?.total || 0)} Slots</strong>
            </div>
            <button type="button" className="housing-close" onClick={() => trigger("cef:housingStorage:close")}>
              Schliessen
            </button>
          </div>
        </header>

        <div className="housing-grid">
          <section className="housing-column">
            <div className="housing-column-header">
              <div>
                <div className="housing-column-kicker">Haus-Lager</div>
                <div className="housing-column-title">Persistent, instanziert, sicher</div>
              </div>
              <button
                type="button"
                className="housing-action"
                disabled={selectedSide !== "storage" || !selectedItem}
                onClick={() => selectedItem && trigger("cef:housingStorage:withdraw", selectedItem.uid)}
              >
                Entnehmen
              </button>
            </div>
            <div className="housing-list">
              {payload.storageInventory.length > 0
                ? payload.storageInventory.map((item) => renderItem(item, "storage"))
                : <div className="housing-empty">Noch keine Gegenstaende im Lager.</div>}
            </div>
          </section>

          <section className="housing-column">
            <div className="housing-column-header">
              <div>
                <div className="housing-column-kicker">Inventar</div>
                <div className="housing-column-title">Dein Charakterinventar</div>
              </div>
              <button
                type="button"
                className="housing-action primary"
                disabled={selectedSide !== "player" || !selectedItem}
                onClick={() => selectedItem && trigger("cef:housingStorage:deposit", selectedItem.uid)}
              >
                Einlagern
              </button>
            </div>
            <div className="housing-list">
              {payload.playerInventory.length > 0
                ? payload.playerInventory.map((item) => renderItem(item, "player"))
                : <div className="housing-empty">Dein Inventar ist leer.</div>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<HousingStorageApp />);

