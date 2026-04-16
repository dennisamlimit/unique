import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import CharSelect from './CharSelect';

const trigger = (name, ...args) => {
  if (window.mp) {
    window.mp.trigger(name, ...args);
  }
};

function CharSelectPage() {
  const [charList, setCharList] = useState([]);
  const [status, setStatus] = useState({ success: true, message: '' });

  useEffect(() => {
    console.log("[CHARSELECT-MPA] Page mounted.");
    
    window.authApp = {
      initData: (chars) => {
        console.log("[CHARSELECT-MPA] Received data:", chars);
        try {
          const data = typeof chars === 'string' ? JSON.parse(chars) : chars;
          setCharList(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error("[CHARSELECT-MPA] Parse error:", e);
        }
      },
      setResult: (success, msg) => {
        setStatus({ success: !!success, message: msg || '' });
      }
    };

    // Tell the bridge we are ready to receive the data
    trigger('cef:charselect:ready');

    return () => { delete window.authApp; };
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-grid" />
      <div className="auth-topo" />
      <div style={{ position: 'fixed', top: 5, left: 5, fontSize: 10, color: 'cyan', zIndex: 99999 }}>[MODE: MPA-CHARSELECT]</div>
      <CharSelect 
        characters={charList} 
        onSelect={(id) => trigger('cef:charselect:select', id)}
        onCreate={() => trigger('cef:charselect:create')}
        status={status}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<CharSelectPage />);
