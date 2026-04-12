import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

const trigger = (name, ...args) => {
  if (window.mp) {
    window.mp.trigger(name, ...args);
  }
};

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => onLogin(email.trim(), password);

  return (
    <>
      <div className="auth-field">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrap">
          <input className="auth-input" type="email" placeholder="name@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
      </div>
      <div className="auth-field">
        <label className="auth-label">Passwort</label>
        <div className="auth-input-wrap">
          <input className="auth-input" type="password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
      </div>
      <button className="auth-btn" onClick={submit}>Anmelden</button>
      <div className="auth-switch">
        Noch kein Account?{' '}
        <button onClick={onSwitch}>Jetzt registrieren</button>
      </div>
    </>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onRegister, onSwitch }) {
  const [form, setForm] = useState({ email: '', password: '', repeat: '' });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const submit = () => onRegister(form.email.trim(), form.password, form.repeat);

  return (
    <>
      <div className="auth-field">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrap">
          <input className="auth-input" type="email" placeholder="name@example.com"
            value={form.email} onChange={set('email')} />
        </div>
      </div>
      <div className="auth-row">
        <div className="auth-field">
          <label className="auth-label">Passwort</label>
          <div className="auth-input-wrap">
            <input className="auth-input" type="password" placeholder="••••••••"
              value={form.password} onChange={set('password')} />
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Wiederholen</label>
          <div className="auth-input-wrap">
            <input className="auth-input" type="password" placeholder="••••••••"
              value={form.repeat} onChange={set('repeat')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
        </div>
      </div>
      <button className="auth-btn" onClick={submit}>Account erstellen</button>
      <div className="auth-switch">
        Bereits registriert?{' '}
        <button onClick={onSwitch}>Zum Login</button>
      </div>
    </>
  );
}

// ─── Auth Screen (Login/Register Panel) ───────────────────────────────────────
function AuthScreen({ status }) {
  const [tab, setTab] = useState('login');

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-left-overlay">
          <div className="auth-left-brand">UNIQUE ROLEPLAY</div>
          <div className="auth-left-sub">Los Santos • Roleplay Server</div>
        </div>
      </div>

      <div className="auth-right">
        <div>
          <div className="auth-title">Unique Roleplay</div>
          <div className="auth-subtitle">
            {tab === 'login'
              ? 'Willkommen zurück. Melde dich an, um dein Abenteuer fortzusetzen.'
              : 'Erstelle deinen Account und starte in Los Santos.'}
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Login</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Registrieren</button>
        </div>

        {tab === 'login'
          ? <LoginForm onLogin={(e, p) => trigger('cef:auth:login', e, p)} onSwitch={() => setTab('register')} />
          : <RegisterForm onRegister={(e, p, r) => trigger('cef:auth:register', '', '', e, p, r)} onSwitch={() => setTab('login')} />
        }

        {status.message && (
          <div className={`auth-status ${status.success ? 'success' : 'error'}`}>
            {status.message}
          </div>
        )}

        <div className="auth-footer">© 2024 Unique Network. All Rights Reserved.</div>
      </div>
    </div>
  );
}

// ─── Spawn Selection ──────────────────────────────────────────────────────────
const defaultSpawnOptions = [
  { id: "last",  title: "Letzter Standort", subtitle: "Dort weitermachen, wo du aufgehört hast.", disabled: false },
  { id: "hotel", title: "Einsteiger Hotel",  subtitle: "Neu in Los Santos? Starte hier.", disabled: false }
];

function SpawnCard({ title, subtitle, selected, disabled, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      style={{
        flex: 1,
        background: selected ? 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(126,34,206,0.15))' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? '#A855F7' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14,
        padding: '28px 24px',
        color: disabled ? '#334155' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        boxShadow: selected ? '0 0 24px rgba(168,85,247,0.3)' : 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ marginTop: 8, fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{subtitle}</div>
      {selected && <div style={{ marginTop: 16, height: 3, borderRadius: 99, background: 'linear-gradient(90deg,#A855F7,#7E22CE)' }} />}
    </button>
  );
}

function SpawnScreen({ payload, status }) {
  let options = defaultSpawnOptions;
  try {
    const parsed = JSON.parse(payload || '{}');
    if (Array.isArray(parsed.options) && parsed.options.length > 0) options = parsed.options;
  } catch (_) {}

  const firstAvail = options.find(o => !o.disabled)?.id || options[0]?.id;
  const [selected, setSelected] = useState(firstAvail);

  const select = id => {
    setSelected(id);
    trigger('cef:spawn:select', id);
  };

  return (
    <div className="auth-root">
      <div className="auth-left">
        <div className="auth-left-overlay">
          <div className="auth-left-brand">UNIQUE ROLEPLAY</div>
          <div className="auth-left-sub">Los Santos • Roleplay Server</div>
        </div>
      </div>

      <div className="auth-right" style={{ width: 560 }}>
        <div className="auth-title">Spawn Auswahl</div>
        <div className="auth-subtitle">Wo möchtest du in Los Santos starten?</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {options.map(opt => (
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
          <div className={`auth-status ${status.success ? 'success' : 'error'}`}>
            {status.message}
          </div>
        )}

        <div className="auth-footer">Dein Charakter wird an dem gewählten Ort gespawnt.</div>
      </div>
    </div>
  );
}

// ─── Banned Screen ────────────────────────────────────────────────────────────
function BannedScreen({ ban }) {
  const fmt = v => {
    if (!v) return 'Unbekannt';
    const d = new Date(v);
    return isNaN(d) ? v : d.toLocaleString('de-DE');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,5,15,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, Arial, sans-serif', color: '#fff'
    }}>
      <div style={{ maxWidth: 600, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
          Gesperrt
        </div>
        <div style={{ marginTop: 8, color: '#94A3B8', fontSize: 14 }}>Dein Account wurde gesperrt. Verbindung wird getrennt.</div>
        <div style={{ marginTop: 32, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '24px 28px', textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Grund</div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{ban.reason || 'Kein Grund angegeben.'}</div>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[['Bann Datum', fmt(ban.banDate)], ['Läuft ab', ban.expiresAt ? fmt(ban.expiresAt) : 'Permanent'], ['Admin', ban.admin || 'Unbekannt'], ['Account', `#${ban.accountId || '?'}`]].map(([k, v]) => (
            <div key={k} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>{k}</div>
              <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function AuthApp() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState('auth');
  const [status, setStatus] = useState({ success: true, message: '' });
  const [spawnPayload, setSpawnPayload] = useState('');
  const [banInfo, setBanInfo] = useState({});

  useEffect(() => {
    window.authApp = {
      show:        () => { setScreen('auth');    setStatus({ success: true, message: '' }); setVisible(true); },
      hide:        () => setVisible(false),
      showCreator: () => { setScreen('creator'); setVisible(true); },
      showSpawn:   (msg) => { setSpawnPayload(msg || ''); setScreen('spawn'); setVisible(true); },
      showBanned:  (data) => { setBanInfo(data || {}); setScreen('banned'); setVisible(true); },
      setResult:   (success, message) => setStatus({ success: !!success, message: message || '' }),
    };
    trigger('cef:auth:ready');
    return () => { delete window.authApp; };
  }, []);

  if (!visible) return null;

  if (screen === 'banned')  return <BannedScreen ban={banInfo} />;
  if (screen === 'spawn')   return <SpawnScreen payload={spawnPayload} status={status} />;

  // Creator: The existing CharacterCreator component handles itself via the old
  // main.jsx logic embedded. We just keep the browser open and let the server
  // trigger the creator camera on the client side.
  if (screen === 'creator') {
    // Show a minimal overlay — actual character editing is done via game camera
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {status.message && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,15,27,0.9)', border: '1px solid rgba(168,85,247,0.4)',
            borderRadius: 10, padding: '12px 24px', color: '#d8b4fe', fontFamily: 'Inter,Arial,sans-serif',
            fontSize: 14, fontWeight: 600, pointerEvents: 'auto'
          }}>
            {status.message}
          </div>
        )}
      </div>
    );
  }

  return <AuthScreen status={status} />;
}

createRoot(document.getElementById('root')).render(<AuthApp />);
