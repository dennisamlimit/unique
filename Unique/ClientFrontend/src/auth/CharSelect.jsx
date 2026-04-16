import React from 'react';

const CharCard = ({ char, slot, onSelect, onCreate }) => {
  if (!char) {
    return (
      <div className="char-card empty group" onClick={onCreate}>
        <div className="char-slot-number">Slot {slot}</div>
        <div className="char-empty-icon">
          <i className="fas fa-plus"></i>
        </div>
        <div className="char-empty-text">Neuen Charakter erstellen</div>
        <button className="char-btn-create">Erstellen</button>
      </div>
    );
  }

  const isBanned = !!char.isBanned;

  return (
    <div className={`char-card ${isBanned ? 'banned' : 'active'} group`} onClick={() => !isBanned && onSelect(char.id)}>
      <div className="char-slot-number">Slot {slot}</div>
      <div className="char-level-badge">{char.level} <span className="text-[10px] opacity-70">Level</span></div>
      
      <div className="char-info-top">
        <h2 className="char-name">{char.firstName} {char.lastName}</h2>
        <p className="char-sub">Bürger von Los Santos</p>
      </div>

      <div className="char-stats">
        <div className="char-stat">
          <span className="char-stat-label">Bargeld</span>
          <span className="char-stat-value text-green-400">${char.cash.toLocaleString()}</span>
        </div>
        <div className="char-stat">
          <span className="char-stat-label">Bank</span>
          <span className="char-stat-value text-blue-400">${char.bank.toLocaleString()}</span>
        </div>
      </div>

      {isBanned ? (
        <div className="char-ban-overlay">
          <div className="char-ban-content">
            <i className="fas fa-gavel text-3xl mb-2"></i>
            <div className="font-bold text-lg uppercase tracking-wider">Gebannt</div>
            <div className="text-sm opacity-80 mt-1">{char.banReason || 'Kein Grund angegeben'}</div>
            <div className="text-xs color-red-400 mt-2 font-mono">
                {char.banExpiresAt ? `Bis: ${new Date(char.banExpiresAt).toLocaleString()}` : 'PERMANENT'}
            </div>
          </div>
        </div>
      ) : (
        <div className="char-actions">
          <button className="char-btn-select">Auswählen</button>
        </div>
      )}
    </div>
  );
};

const CharSelect = ({ characters = [], onSelect, onCreate, status }) => {
  // Always show 3 slots
  const slots = [1, 2, 3].map(slot => {
     const char = characters[slot - 1];
     return <CharCard key={slot} slot={slot} char={char} onSelect={onSelect} onCreate={onCreate} />;
  });

  return (
    <div className="char-select-container">
      <div className="char-select-header">
        <h1 className="char-select-title">Charakter Auswahl</h1>
        <p className="char-select-subtitle">Wähle eine Identität, um dein Leben in Los Santos zu beginnen.</p>
      </div>

      <div className="char-grid">
        {slots}
      </div>

      {status && status.message && (
        <div className={`char-status ${status.success ? 'success' : 'error'}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default CharSelect;
