import React from 'react';
import './auth.css';

const AuthLayout = ({ children, title, subtitle, heroImage }) => {
  return (
    <div className="auth-container">
      <div className="auth-grid" />
      <div className="auth-topo" />
      
      <div className="auth-split-left">
        {heroImage && (
          <img 
            src={heroImage} 
            alt="Hero" 
            className="auth-hero-img"
          />
        )}
        <div className="absolute bottom-10 left-10 opacity-20 text-xs font-mono uppercase tracking-widest">
          UNIQUE NETWORK // SECURITY PROTOCOL ACTIVE
        </div>
      </div>

      <div className="auth-split-right">
        <div className="mb-12">
          <h1 className="auth-form-title">{title}</h1>
          <p className="auth-form-subtitle">{subtitle}</p>
        </div>

        <div className="flex-1">
          {children}
        </div>

        <div className="auth-footer">
          <p>&copy; 2024 Unique Network. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
