import React, { useState, useCallback } from 'react';
import './auth.css';

// --- Icons (from Figma/Original) ---
const Icon = ({ type, className = "w-6 h-6" }) => {
  const common = "fill-none stroke-current stroke-[1.8] stroke-linecap-round stroke-linejoin-round";
  if (type === 'identity') return <svg className={className} viewBox="0 0 48 48"><path className={common} d="M16 39h16M14 34c1-7 6-11 10-11s9 4 10 11M18 15c0-4 3-7 6-7s6 3 6 7-3 7-6 7-6-3-6-7Z"/></svg>;
  if (type === 'genetics') return <svg className={className} viewBox="0 0 48 48"><path className={common} d="M17 8c9 6 15 13 15 24 0 4-2 7-5 8M31 8c-9 6-15 13-15 24 0 4 2 7 5 8M18 15h12M16 23h16M18 31h12"/></svg>;
  if (type === 'style') return <svg className={className} viewBox="0 0 48 48"><path className={common} d="M16 12l8-4 8 4 7 7-6 5-3-3v19H18V21l-3 3-6-5 7-7ZM20 10c1 5 7 5 8 0"/></svg>;
  return null;
};

const CreatorFlow = ({ onFinish }) => {
  const [step, setStep] = useState('identity'); // identity, genetics, style
  const [data, setData] = useState({
    firstName: '',
    lastName: '',
    gender: 0, // 0: Male, 1: Female
    parents: { mother: 0, father: 0, skinMother: 0, skinFather: 0, shapeMix: 0.5, skinMix: 0.5 },
    clothing: {
      top: 0,
      legs: 0,
      feet: 0
    }
  });

  const triggerPreview = (type, value) => {
    if (window.mp) {
      window.mp.trigger('cef:creator:preview', type, JSON.stringify(value));
    }
  };

  const setGender = (val) => {
    setData({ ...data, gender: val });
    triggerPreview('gender', val);
  };

  const handleFinish = () => {
    if (!data.firstName || !data.lastName) return;
    onFinish(data);
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 h-full flex flex-col">
      <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl">
        {['identity', 'genetics', 'style'].map(s => (
          <button 
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${step === s ? 'bg-purple-600 shadow-lg text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Icon type={s} className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{s}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {step === 'identity' && (
          <div className="space-y-6">
            <div className="auth-input-group">
              <label className="auth-label">Dein Vorname</label>
              <div className="auth-input-wrapper">
                <input 
                  className="auth-input" 
                  value={data.firstName}
                  onChange={e => setData({...data, firstName: e.target.value})}
                  placeholder="Max"
                />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-label">Dein Nachname</label>
              <div className="auth-input-wrapper">
                <input 
                  className="auth-input" 
                  value={data.lastName}
                  onChange={e => setData({...data, lastName: e.target.value})}
                  placeholder="Mustermann"
                />
              </div>
            </div>
            <div className="auth-input-group">
              <label className="auth-label">Geschlecht</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setGender(0)}
                  className={`flex-1 p-4 rounded-xl border font-bold uppercase transition-all ${data.gender === 0 ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 text-slate-500'}`}
                >
                  Männlich
                </button>
                <button 
                  onClick={() => setGender(1)}
                  className={`flex-1 p-4 rounded-xl border font-bold uppercase transition-all ${data.gender === 1 ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 text-slate-500'}`}
                >
                  Weiblich
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'genetics' && (
          <div className="space-y-4">
             {/* Simplified Slider for Demo */}
             <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <label className="auth-label mb-2">Gesicht Mix (Eltern)</label>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  className="w-full accent-purple-500" 
                  value={data.parents.shapeMix}
                  onChange={e => {
                    const mix = parseFloat(e.target.value);
                    setData({...data, parents: {...data.parents, shapeMix: mix}});
                    triggerPreview('blendData', [data.parents.mother, data.parents.father, 0, 0, mix, 0.5]);
                  }}
                />
             </div>
             {/* More sliders would go here in a full implementation */}
          </div>
        )}

        {step === 'style' && (
          <div className="space-y-6 text-center py-10">
            <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl opacity-50">
              <p className="text-slate-400 italic">Style-Details werden direkt am Charakter in Echtzeit gerendert.</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
        <button 
          onClick={handleFinish}
          className="auth-btn-primary"
        >
          Charakter speichern
        </button>
      </div>
    </div>
  );
};

export default CreatorFlow;
