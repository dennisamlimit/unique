import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import CharSelect from './CharSelect';
import CreatorFlow from './CreatorFlow';

const VERSION = "1.3.0-RADICAL-ISOLATION";

const trigger = (name, ...args) => {
  console.log(`[AUTH-RES-DEBUG] Triggering ${name}`, args);
  if (window.mp) {
    window.mp.trigger(name, ...args);
  } else {
    console.warn(`[AUTH-RES-DEBUG] mp.trigger for "${name}" ignored: window.mp is undefined.`);
  }
};

const FEMALE_CREATOR_CLOTHING = [[15, 0], [15, 0], [19, 0], [35, 0]];
const MALE_CREATOR_CLOTHING = [[15, 0], [15, 0], [21, 0], [34, 0]];

function getDefaultCreatorClothing(gender) {
  return Number(gender) === 1 ? FEMALE_CREATOR_CLOTHING : MALE_CREATOR_CLOTHING;
}

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBox({ status }) {
  if (!status || !status.message) return null;
  return (
    <div className={`auth-status ${status.success ? 'success' : 'error'}`}>
      {status.message}
    </div>
  );
}

const VersionBadge = () => (
  <div style={{ position: 'fixed', bottom: 10, right: 10, fontSize: 10, color: '#475569', opacity: 0.5, pointerEvents: 'none', zIndex: 9999 }}>
    {VERSION}
  </div>
);

function SpawnScreen({ payload, onSelect, status }) {
  const options = Array.isArray(payload?.options) ? payload.options : [];

  return (
    <div className="auth-panel-shell">
      <div className="auth-panel-card">
        <div className="auth-form-title">Spawn-Auswahl</div>
        <div className="auth-form-subtitle">{payload?.message || 'Waehle deinen Startpunkt.'}</div>
        <div className="spawn-list">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`spawn-option ${option.disabled ? 'is-disabled' : ''}`}
              disabled={!!option.disabled}
              onClick={() => onSelect(option.id)}
            >
              <div className="spawn-option-title">{option.title}</div>
              <div className="spawn-option-subtitle">{option.subtitle}</div>
            </button>
          ))}
        </div>
        <StatusBox status={status} />
      </div>
    </div>
  );
}

function BannedScreen({ banData }) {
  return (
    <div className="auth-panel-shell">
      <div className="auth-panel-card banned">
        <div className="auth-form-title">Account Gesperrt</div>
        <div className="auth-form-subtitle">
          {banData?.reason || 'Kein Grund angegeben.'}
        </div>
        <div className="ban-meta">
          <div>Seit: {banData?.banDate || 'Unbekannt'}</div>
          <div>Bis: {banData?.expiresAt || 'Permanent'}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onLogin, onSwitch, status }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLoginClick = (e) => {
    e.preventDefault();
    console.log("[AUTH-NUCLEAR] Login button pressed");
    // Immediate diagnostic trigger
    if (window.mp) window.mp.trigger('cef:auth:clickTrack');
    onLogin(email.trim(), password);
  };
  
  return (
    <form onSubmit={handleLoginClick}>
      <div className="auth-input-group">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrapper">
          <input className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
      </div>
      <div className="auth-input-group">
        <label className="auth-label">Passwort</label>
        <div className="auth-input-wrapper">
          <input className="auth-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
      </div>
      <button type="submit" className="auth-btn-primary">Anmelden</button>
      <StatusBox status={status} />
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
        Noch keinen Account? <button type="button" className="auth-link" onClick={onSwitch}>Registrieren</button>
      </div>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onRegister, onSwitch, status }) {
  const [form, setForm] = useState({ email: '', password: '', repeat: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); onRegister(form.email.trim(), form.password, form.repeat); }}>
      <div className="auth-input-group">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrapper"><input className="auth-input" type="email" value={form.email} onChange={set('email')} required /></div>
      </div>
      <div className="auth-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="auth-input-group">
          <label className="auth-label">Passwort</label>
          <div className="auth-input-wrapper"><input className="auth-input" type="password" value={form.password} onChange={set('password')} required /></div>
        </div>
        <div className="auth-input-group">
          <label className="auth-label">Wiederholen</label>
          <div className="auth-input-wrapper"><input className="auth-input" type="password" value={form.repeat} onChange={set('repeat')} required /></div>
        </div>
      </div>
      <button type="submit" className="auth-btn-primary">Konto erstellen</button>
      <StatusBox status={status} />
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
        Schon dabei? <button type="button" className="auth-link" onClick={onSwitch}>Zum Login</button>
      </div>
    </form>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

function AuthApp() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState('auth');
  const [tab, setTab] = useState('login');
  const [status, setStatus] = useState({ success: true, message: '' });
  const [charList, setCharList] = useState([]);
  const [spawnPayload, setSpawnPayload] = useState({ message: '', options: [] });
  const [banData, setBanData] = useState({});

  const buildCreatorPayload = (data) => JSON.stringify({
    firstname: data.firstName || '',
    lastname: data.lastName || '',
    birth: '',
    origin: 'Los Santos',
    gender: Number(data.gender || 0),
    blendData: [0, 0, 0, 0, 0.5, 0.5],
    hair: [0, 0, 0],
    beard: [0, 0],
    clothing: getDefaultCreatorClothing(data.gender),
    headOverlays: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    faceFeatures: Array(20).fill(0)
  });

  useEffect(() => {
    console.log(`[AUTH-RES-DEBUG] AuthApp mounted. Version: ${VERSION}`);
    
    window.authApp = {
      show: () => { 
        console.log("[AUTH-RES-DEBUG] window.authApp.show() called");
        setScreen('auth'); 
        setVisible(true); 
      },
      showCharSelect: (chars) => {
        console.log("[AUTH-RES-DEBUG] window.authApp.showCharSelect() called with:", chars);
        try {
          // Robust parsing - handles objects and strings
          const data = typeof chars === 'string' ? JSON.parse(chars) : chars;
          setCharList(Array.isArray(data) ? data : []);
          setScreen('charselect');
          setStatus({ success: true, message: '' });
          setVisible(true);
          console.log("[AUTH-RES-DEBUG] Character list updated, switching to charselect");
        } catch (e) {
          console.error("[AUTH-RES-DEBUG] Failed to parse character list:", e);
          setStatus({ success: false, message: "Fehler beim Laden der Charakterdaten." });
        }
      },
      showCreator: () => {
        setScreen('creator');
        setStatus({ success: true, message: '' });
        setVisible(true);
      },
      showSpawn: (payload) => {
        try {
          const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
          setSpawnPayload(data && typeof data === 'object' ? data : { message: '', options: [] });
          setScreen('spawn');
          setStatus({ success: true, message: '' });
          setVisible(true);
        } catch (e) {
          console.error("[AUTH-RES-DEBUG] Failed to parse spawn payload:", e);
          setStatus({ success: false, message: 'Spawn-Auswahl konnte nicht geladen werden.' });
        }
      },
      showBanned: (payload) => {
        try {
          const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
          setBanData(data && typeof data === 'object' ? data : {});
        } catch (e) {
          setBanData({ reason: 'Kein Grund angegeben.' });
        }
        setScreen('banned');
        setVisible(true);
      },
      setResult: (success, msg) => {
        console.log("[AUTH-RES-DEBUG] window.authApp.setResult()", success, msg);
        setStatus({ success: !!success, message: msg || '' });
      },
      hide: () => setVisible(false)
    };

    trigger('cef:auth:ready');

    return () => { delete window.authApp; };
  }, []);

  if (!visible) return null;

  return (
    <div className="auth-container">
      <VersionBadge />
      <div className="auth-grid" />
      <div className="auth-topo" />

      {screen === 'charselect' ? (
        <div style={{ width: '100%' }}>
          <div style={{ position: 'fixed', top: 5, left: 5, fontSize: 10, color: 'lime', zIndex: 99999 }}>[STATE: CHARSELECT]</div>
          <CharSelect 
            characters={charList} 
            onSelect={(id) => trigger('cef:charselect:select', id)}
            onCreate={() => trigger('cef:charselect:create')}
            status={status}
          />
        </div>
      ) : screen === 'creator' ? (
        <div className="auth-panel-shell">
          <div className="auth-panel-card">
            <div className="auth-form-title">Charakter Erstellung</div>
            <div className="auth-form-subtitle">Erstelle deine Identitaet fuer Los Santos.</div>
            <CreatorFlow onFinish={(data) => trigger('cef:creator:finish', buildCreatorPayload(data))} />
            <StatusBox status={status} />
          </div>
        </div>
      ) : screen === 'spawn' ? (
        <SpawnScreen payload={spawnPayload} onSelect={(id) => trigger('cef:spawn:select', id)} status={status} />
      ) : screen === 'banned' ? (
        <BannedScreen banData={banData} />
      ) : (
        <>
          <div className="auth-split-left">
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em' }}>UNIQUE</div>
              <div style={{ marginTop: 4, letterSpacing: '0.2em', fontSize: 12, opacity: 0.6, fontWeight: 800 }}>ROLEPLAY NETWORK</div>
            </div>
          </div>

          <div className="auth-split-right" style={{ zIndex: 999999 }}>
            <div>
              <div className="auth-form-title">Willkommen</div>
              <div className="auth-form-subtitle">{tab === 'login' ? 'Melde dich an.' : 'Erstelle ein Konto.'}</div>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['login', 'register'].map(t => (
                <button 
                  key={t} type="button" onClick={() => setTab(t)}
                  style={{ 
                    padding: '12px 0', fontSize: 13, fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer',
                    color: tab === t ? '#A855F7' : '#64748B', borderBottom: tab === t ? '2px solid #A855F7' : 'none' 
                  }}
                >{t.toUpperCase()}</button>
              ))}
            </div>

            <div style={{ flex: 1 }}>
              {tab === 'login' ? (
                <LoginForm onLogin={(e, p) => trigger('cef:auth:login', e, p)} onSwitch={() => setTab('register')} status={status} />
              ) : (
                <RegisterForm onRegister={(e, p, r) => trigger('cef:auth:register', '', '', e, p, r)} onSwitch={() => setTab('login')} status={status} />
              )}
            </div>
            <div className="auth-footer">© 2024 Unique Network</div>
          </div>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<AuthApp />);
