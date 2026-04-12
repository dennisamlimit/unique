import React, { useState } from 'react';

const LoginForm = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right duration-500">
      <div className="auth-input-group">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrapper">
          <input 
            type="email" 
            className="auth-input" 
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Passwort</label>
        <div className="auth-input-wrapper">
          <input 
            type="password" 
            className="auth-input" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <input type="checkbox" className="mr-2 accent-purple-500" id="remember" />
          <label htmlFor="remember" className="text-sm text-slate-400">Eingeloggt bleiben</label>
        </div>
        <a href="#" className="auth-link text-sm">Passwort vergessen?</a>
      </div>

      <button type="submit" className="auth-btn-primary">
        Anmelden
      </button>

      <div className="mt-8 text-center">
        <span className="text-slate-500 text-sm">Noch kein Account? </span>
        <button 
          type="button" 
          onClick={onSwitchToRegister}
          className="auth-link"
        >
          Jetzt registrieren
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
