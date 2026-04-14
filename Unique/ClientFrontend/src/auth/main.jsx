import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const trigger = (name, ...args) => {
  if (window.mp) {
    window.mp.trigger(name, ...args);
  }
};

const AUTH_CSS = `
.auth-root {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(390px, 520px);
  background:
    radial-gradient(circle at 18% 18%, rgba(217,70,239,0.1), transparent 24%),
    linear-gradient(135deg, rgba(7,7,12,0.98), rgba(16,10,24,0.96) 44%, rgba(9,9,14,0.98));
  color: #fff;
  font-family: Inter, Arial, sans-serif;
  overflow: hidden;
}

.auth-root::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.5)),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: auto, 40px 40px, 40px 40px;
  opacity: 0.4;
  pointer-events: none;
}

.auth-left,
.auth-right {
  position: relative;
  z-index: 1;
}

.auth-left {
  display: flex;
  align-items: flex-end;
  padding: 40px 44px;
}

.auth-skyline {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(6,7,10,0.04), rgba(6,7,10,0.46)),
    radial-gradient(circle at 22% 20%, rgba(255,170,120,0.12), transparent 18%),
    linear-gradient(180deg, rgba(45,29,66,0.18), transparent 48%),
    linear-gradient(0deg,
      rgba(18,17,24,0.96) 0 19%,
      transparent 19% 100%),
    linear-gradient(90deg,
      transparent 0 6%,
      rgba(22,20,30,0.98) 6% 9%,
      transparent 9% 14%,
      rgba(20,18,28,0.96) 14% 18%,
      transparent 18% 23%,
      rgba(24,22,34,0.98) 23% 28%,
      transparent 28% 34%,
      rgba(18,16,26,0.95) 34% 38%,
      transparent 38% 44%,
      rgba(26,24,36,0.98) 44% 49%,
      transparent 49% 55%,
      rgba(17,15,24,0.94) 55% 59%,
      transparent 59% 66%,
      rgba(24,22,34,0.98) 66% 72%,
      transparent 72% 79%,
      rgba(19,17,28,0.96) 79% 84%,
      transparent 84% 100%);
  opacity: 0.5;
}

.auth-left-copy {
  position: relative;
  max-width: 560px;
  padding-right: 20px;
}

.auth-left-copy::before {
  content: "";
  position: absolute;
  left: 0;
  top: -18px;
  width: 90px;
  height: 3px;
  background: linear-gradient(90deg, #d946ef, transparent);
}

.auth-kicker {
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.34em;
  text-transform: uppercase;
}

.auth-left-title {
  margin-top: 14px;
  font-family: "ChaletComprime-CologneSixty", Inter, Arial, sans-serif;
  font-size: clamp(54px, 8vw, 120px);
  line-height: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-shadow: 0 18px 42px rgba(0,0,0,0.42);
}

.auth-left-subtitle {
  margin-top: 14px;
  max-width: 480px;
  color: #d4d4d8;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.8;
}

.auth-left-meta {
  margin-top: 26px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.auth-chip {
  border: 1px solid rgba(192,132,252,0.2);
  border-radius: 999px;
  background: rgba(12,10,18,0.5);
  padding: 9px 14px;
  color: #e4e4e7;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.auth-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 34px 28px 0;
}

.auth-panel {
  position: relative;
  width: min(100%, 460px);
  border: 1px solid rgba(192,132,252,0.16);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(18,12,26,0.96), rgba(10,10,16,0.98)),
    linear-gradient(135deg, rgba(217,70,239,0.08), transparent 48%);
  box-shadow: 0 28px 90px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.05);
  padding: 30px;
  display: grid;
  gap: 20px;
}

.auth-panel::before,
.auth-form-card::before,
.auth-spawn-card::before,
.auth-ban-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 72px;
  height: 3px;
  background: linear-gradient(90deg, #d946ef, transparent);
}

.auth-title {
  font-family: "ChaletComprime-CologneSixty", Inter, Arial, sans-serif;
  font-size: 42px;
  line-height: 0.94;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.auth-subtitle {
  margin-top: 10px;
  color: #a1a1aa;
  font-size: 14px;
  line-height: 1.75;
}

.auth-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.auth-tab {
  border: 1px solid rgba(192,132,252,0.14);
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  color: #a1a1aa;
  padding: 13px 14px;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.22em;
  cursor: pointer;
  transition: 0.2s ease;
}

.auth-tab.active {
  color: #fff;
  border-color: rgba(217,70,239,0.34);
  background: linear-gradient(180deg, rgba(217,70,239,0.16), rgba(255,255,255,0.03));
  box-shadow: 0 0 24px rgba(217,70,239,0.16);
}

.auth-form-card,
.auth-spawn-card,
.auth-ban-card {
  position: relative;
  border: 1px solid rgba(192,132,252,0.12);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(21,15,30,0.9), rgba(10,10,16,0.84)),
    linear-gradient(135deg, rgba(168,85,247,0.06), transparent 46%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.auth-form-card {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.auth-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.auth-field {
  display: grid;
  gap: 8px;
}

.auth-label {
  color: #a1a1aa;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.auth-input-wrap {
  border: 1px solid rgba(192,132,252,0.16);
  border-radius: 14px;
  background: rgba(9,9,14,0.72);
  transition: 0.2s ease;
}

.auth-input-wrap:focus-within {
  border-color: rgba(217,70,239,0.38);
  box-shadow: 0 0 0 4px rgba(217,70,239,0.1);
}

.auth-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  padding: 14px 15px;
}

.auth-input::placeholder {
  color: #71717a;
}

.auth-btn {
  border: none;
  border-radius: 14px;
  padding: 15px 16px;
  background: linear-gradient(135deg, #d946ef, #a855f7);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 14px 34px rgba(217,70,239,0.2);
}

.auth-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 40px rgba(217,70,239,0.26);
}

.auth-switch {
  color: #a1a1aa;
  font-size: 13px;
  text-align: center;
}

.auth-switch button {
  border: none;
  background: transparent;
  color: #d946ef;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
}

.auth-status {
  border-radius: 14px;
  padding: 13px 14px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
}

.auth-status.success {
  border: 1px solid rgba(52,211,153,0.25);
  background: rgba(52,211,153,0.08);
  color: #bbf7d0;
}

.auth-status.error {
  border: 1px solid rgba(251,113,133,0.25);
  background: rgba(251,113,133,0.08);
  color: #fecdd3;
}

.auth-footer {
  color: #71717a;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  text-align: center;
}

.auth-spawn-list,
.auth-ban-grid {
  display: grid;
  gap: 14px;
}

.auth-spawn-card {
  padding: 18px;
  text-align: left;
  color: #fff;
  cursor: pointer;
  transition: 0.2s ease;
}

.auth-spawn-card.selected {
  border-color: rgba(217,70,239,0.3);
  box-shadow: 0 0 24px rgba(217,70,239,0.14);
}

.auth-spawn-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-spawn-title {
  font-size: 17px;
  font-weight: 900;
  text-transform: uppercase;
}

.auth-spawn-subtitle {
  margin-top: 7px;
  color: #a1a1aa;
  font-size: 13px;
  line-height: 1.6;
}

.auth-spawn-line {
  margin-top: 14px;
  height: 3px;
  width: 84px;
  border-radius: 999px;
  background: linear-gradient(90deg, #d946ef, #a855f7);
}

.auth-ban-wrap {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(251,113,133,0.12), transparent 30%),
    linear-gradient(135deg, rgba(11,7,10,0.98), rgba(22,9,13,0.98));
  color: #fff;
  font-family: Inter, Arial, sans-serif;
}

.auth-ban-panel {
  width: min(100%, 700px);
  border: 1px solid rgba(251,113,133,0.2);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(27,10,16,0.96), rgba(11,11,18,0.98));
  box-shadow: 0 24px 80px rgba(0,0,0,0.52);
  padding: 28px;
  text-align: center;
  display: grid;
  gap: 16px;
}

.auth-ban-title {
  font-family: "ChaletComprime-CologneSixty", Inter, Arial, sans-serif;
  font-size: 64px;
  line-height: 0.92;
  text-transform: uppercase;
  color: #fb7185;
}

.auth-ban-card {
  padding: 18px;
  text-align: left;
}

@media (max-width: 1100px) {
  .auth-root {
    grid-template-columns: 1fr;
  }

  .auth-left {
    min-height: 34vh;
    padding: 26px 24px 0;
    align-items: flex-end;
  }

  .auth-right {
    padding: 0 24px 24px;
  }
}

@media (max-width: 760px) {
  .auth-left {
    min-height: 28vh;
    padding: 18px 18px 0;
  }

  .auth-right {
    padding: 0 18px 18px;
  }

  .auth-panel,
  .auth-ban-panel {
    border-radius: 20px;
    padding: 22px;
  }

  .auth-row,
  .auth-ban-grid {
    grid-template-columns: 1fr;
  }

  .auth-title {
    font-size: 36px;
  }

  .auth-left-title {
    font-size: 56px;
  }

  .auth-ban-title {
    font-size: 46px;
  }
}
`;

function AuthBackdrop({ title, subtitle, chips }) {
  return (
    <div className="auth-left">
      <div className="auth-skyline" />
      <div className="auth-left-copy">
        <div className="auth-kicker">Los Santos Roleplay</div>
        <div className="auth-left-title">{title}</div>
        <div className="auth-left-subtitle">{subtitle}</div>
        <div className="auth-left-meta">
          {chips.map((chip) => (
            <span key={chip} className="auth-chip">{chip}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = () => onLogin(email.trim(), password);

  return (
    <div className="auth-form-card">
      <div className="auth-field">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrap">
          <input
            className="auth-input"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      </div>
      <div className="auth-field">
        <label className="auth-label">Passwort</label>
        <div className="auth-input-wrap">
          <input
            className="auth-input"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      </div>
      <button className="auth-btn" onClick={submit}>Anmelden</button>
      <div className="auth-switch">
        Noch kein Account? <button onClick={onSwitch}>Jetzt registrieren</button>
      </div>
    </div>
  );
}

function RegisterForm({ onRegister, onSwitch }) {
  const [form, setForm] = useState({ email: "", password: "", repeat: "" });
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const submit = () => onRegister(form.email.trim(), form.password, form.repeat);

  return (
    <div className="auth-form-card">
      <div className="auth-field">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrap">
          <input className="auth-input" type="email" placeholder="name@example.com" value={form.email} onChange={set("email")} />
        </div>
      </div>
      <div className="auth-row">
        <div className="auth-field">
          <label className="auth-label">Passwort</label>
          <div className="auth-input-wrap">
            <input className="auth-input" type="password" placeholder="********" value={form.password} onChange={set("password")} />
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Wiederholen</label>
          <div className="auth-input-wrap">
            <input
              className="auth-input"
              type="password"
              placeholder="********"
              value={form.repeat}
              onChange={set("repeat")}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
        </div>
      </div>
      <button className="auth-btn" onClick={submit}>Account erstellen</button>
      <div className="auth-switch">
        Bereits registriert? <button onClick={onSwitch}>Zum Login</button>
      </div>
    </div>
  );
}

function AuthScreen({ status }) {
  const [tab, setTab] = useState("login");

  return (
    <div className="auth-root">
      <style>{AUTH_CSS}</style>
      <AuthBackdrop
        title="Unique Roleplay"
        subtitle="Links die Skyline, rechts dein Login. Genau so ruhig und klar soll der Einstieg wieder wirken."
        chips={["Unique Look", "Los Santos", "Roleplay First"]}
      />

      <div className="auth-right">
        <div className="auth-panel">
          <div>
            <div className="auth-title">Unique Roleplay</div>
            <div className="auth-subtitle">
              {tab === "login"
                ? "Willkommen zurueck. Melde dich an, um dein Abenteuer fortzusetzen."
                : "Erstelle deinen Account und starte in Los Santos."}
            </div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Login</button>
            <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Registrieren</button>
          </div>

          {tab === "login"
            ? <LoginForm onLogin={(e, p) => trigger("cef:auth:login", e, p)} onSwitch={() => setTab("register")} />
            : <RegisterForm onRegister={(e, p, r) => trigger("cef:auth:register", "", "", e, p, r)} onSwitch={() => setTab("login")} />}

          {status.message && (
            <div className={`auth-status ${status.success ? "success" : "error"}`}>
              {status.message}
            </div>
          )}

          <div className="auth-footer">© 2024 Unique Network. All Rights Reserved.</div>
        </div>
      </div>
    </div>
  );
}

const defaultSpawnOptions = [
  { id: "last", title: "Letzter Standort", subtitle: "Dort weitermachen, wo du aufgehoert hast.", disabled: false },
  { id: "hotel", title: "Einsteiger Hotel", subtitle: "Neu in Los Santos? Starte hier.", disabled: false }
];

function SpawnCard({ title, subtitle, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`auth-spawn-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}`}
    >
      <div className="auth-spawn-title">{title}</div>
      <div className="auth-spawn-subtitle">{subtitle}</div>
      {selected && <div className="auth-spawn-line" />}
    </button>
  );
}

function SpawnScreen({ payload, status }) {
  let options = defaultSpawnOptions;
  try {
    const parsed = JSON.parse(payload || "{}");
    if (Array.isArray(parsed.options) && parsed.options.length > 0) options = parsed.options;
  } catch {}

  const firstAvail = options.find((o) => !o.disabled)?.id || options[0]?.id;
  const [selected, setSelected] = useState(firstAvail);

  const select = (id) => {
    setSelected(id);
    trigger("cef:spawn:select", id);
  };

  return (
    <div className="auth-root">
      <style>{AUTH_CSS}</style>
      <AuthBackdrop
        title="Spawn Auswahl"
        subtitle="Waehle entspannt deinen Einstiegspunkt. Die linke Seite bleibt bewusst nur die leichte Kulisse von Los Santos."
        chips={["Letzter Standort", "Hotel", "Direkter Einstieg"]}
      />

      <div className="auth-right">
        <div className="auth-panel">
          <div className="auth-title">Spawn Auswahl</div>
          <div className="auth-subtitle">Wo moechtest du in Los Santos starten?</div>

          <div className="auth-spawn-list">
            {options.map((opt) => (
              <SpawnCard
                key={opt.id}
                title={opt.title}
                subtitle={opt.subtitle}
                disabled={opt.disabled}
                selected={selected === opt.id}
                onSelect={() => !opt.disabled && select(opt.id)}
              />
            ))}
          </div>

          {status.message && (
            <div className={`auth-status ${status.success ? "success" : "error"}`}>
              {status.message}
            </div>
          )}

          <div className="auth-footer">Dein Charakter wird am gewaehlten Ort gespawnt.</div>
        </div>
      </div>
    </div>
  );
}

function BannedScreen({ ban }) {
  const fmt = (value) => {
    if (!value) return "Unbekannt";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("de-DE");
  };

  const entries = [
    ["Bann Datum", fmt(ban.banDate)],
    ["Laeuft ab", ban.expiresAt ? fmt(ban.expiresAt) : "Permanent"],
    ["Admin", ban.admin || "Unbekannt"],
    ["Account", `#${ban.accountId || "?"}`]
  ];

  return (
    <div className="auth-ban-wrap">
      <style>{AUTH_CSS}</style>
      <div className="auth-ban-panel">
        <div className="auth-ban-title">Gesperrt</div>
        <div className="auth-subtitle">Dein Account wurde gesperrt. Verbindung wird getrennt.</div>
        <div className="auth-ban-card">
          <div className="auth-kicker">Grund</div>
          <div className="auth-spawn-title">{ban.reason || "Kein Grund angegeben."}</div>
        </div>
        <div className="auth-ban-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {entries.map(([key, value]) => (
            <div key={key} className="auth-ban-card">
              <div className="auth-kicker">{key}</div>
              <div className="auth-subtitle" style={{ marginTop: 8, color: "#fff", fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthApp() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState("auth");
  const [status, setStatus] = useState({ success: true, message: "" });
  const [spawnPayload, setSpawnPayload] = useState("");
  const [banInfo, setBanInfo] = useState({});

  useEffect(() => {
    window.authApp = {
      show: () => { setScreen("auth"); setStatus({ success: true, message: "" }); setVisible(true); },
      hide: () => setVisible(false),
      showCreator: () => { setScreen("creator"); setVisible(true); },
      showSpawn: (msg) => { setSpawnPayload(msg || ""); setScreen("spawn"); setVisible(true); },
      showBanned: (data) => { setBanInfo(data || {}); setScreen("banned"); setVisible(true); },
      setResult: (success, message) => setStatus({ success: !!success, message: message || "" })
    };

    trigger("cef:auth:ready");
    return () => { delete window.authApp; };
  }, []);

  if (!visible) return null;
  if (screen === "banned") return <BannedScreen ban={banInfo} />;
  if (screen === "spawn") return <SpawnScreen payload={spawnPayload} status={status} />;

  if (screen === "creator") {
    return (
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        {status.message && (
          <div
            style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15,15,27,0.9)",
              border: "1px solid rgba(168,85,247,0.4)",
              borderRadius: 10,
              padding: "12px 24px",
              color: "#d8b4fe",
              fontFamily: "Inter,Arial,sans-serif",
              fontSize: 14,
              fontWeight: 600,
              pointerEvents: "auto"
            }}
          >
            {status.message}
          </div>
        )}
      </div>
    );
  }

  return <AuthScreen status={status} />;
}

createRoot(document.getElementById("root")).render(<AuthApp />);
