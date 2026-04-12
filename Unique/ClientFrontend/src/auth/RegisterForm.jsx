import React, { useState } from 'react';

const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      // Basic validation
      return;
    }
    onRegister(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-right duration-500">
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="auth-label">Vorname</label>
          <div className="auth-input-wrapper">
            <input 
              name="firstName"
              type="text" 
              className="auth-input" 
              placeholder="Max"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="auth-label">Nachname</label>
          <div className="auth-input-wrapper">
            <input 
              name="lastName"
              type="text" 
              className="auth-input" 
              placeholder="Mustermann"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Email Adresse</label>
        <div className="auth-input-wrapper">
          <input 
            name="email"
            type="email" 
            className="auth-input" 
            placeholder="deine@email.de"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Passwort festlegen</label>
        <div className="auth-input-wrapper">
          <input 
            name="password"
            type="password" 
            className="auth-input" 
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="auth-input-group">
        <label className="auth-label">Passwort bestätigen</label>
        <div className="auth-input-wrapper">
          <input 
            name="passwordConfirm"
            type="password" 
            className="auth-input" 
            placeholder="••••••••"
            value={formData.passwordConfirm}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <button type="submit" className="auth-btn-primary mt-4">
        Account erstellen
      </button>

      <div className="mt-8 text-center text-sm text-slate-500">
        Durch das Erstellen eines Accounts akzeptierst du unsere <br/>
        <a href="#" className="auth-link">Nutzungsbedingungen</a> und <a href="#" className="auth-link">Datenschutzrichtlinien</a>.
      </div>

      <div className="mt-8 text-center border-t border-white/5 pt-8">
        <span className="text-slate-500 text-sm">Bereits registriert? </span>
        <button 
          type="button" 
          onClick={onSwitchToLogin}
          className="auth-link"
        >
          Zum Login
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
