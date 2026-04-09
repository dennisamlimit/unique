import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { logoSrc } from "../lib/brand.js";
import { trigger } from "../lib/rage.js";

const initialForm = {
  loginEmail: "",
  loginPassword: "",
  registerEmail: "",
  registerPassword: "",
  repeatPassword: ""
};

const hairColors = [
  "#0c0c0c", "#1d1a17", "#281d18", "#3d1f15", "#682e19", "#954b29", "#a35234", "#9b5f3d",
  "#b57e54", "#c19167", "#af7f53", "#be9560", "#d0ac75", "#b37f43", "#dbac68", "#e4ba7e",
  "#bd895a", "#83422c", "#8e3a28", "#8a241c", "#962b20", "#a7271d", "#c4351f", "#d8421f",
  "#816755", "#917660", "#a88c74", "#d0b69e", "#513442", "#744557", "#a94663", "#cb1e8e",
  "#f63f78", "#ed9393", "#0b917e", "#248081", "#1b4d6b", "#578d4b", "#235433", "#155146",
  "#889e2e", "#71881b", "#468f21", "#ebb010", "#e76816", "#ec4d0e", "#6d0c0e", "#e6bb84"
];

const faceLabels = [
  "Nasenbreite", "Nasenhoehe", "Nasenlaenge", "Nasenbruecke", "Nasenspitze", "Brueckenversatz",
  "Augenbrauenhoehe", "Augenbrauenbreite", "Wangenknochenhoehe", "Wangenknochenbreite",
  "Wangenbreite", "Augen", "Lippen", "Kieferbreite", "Kieferhoehe", "Kinnlaenge",
  "Kinnposition", "Kinnbreite", "Kinnform", "Nackenbreite"
];

const overlayLabels = ["Makel", "Augenbrauen", "Alterung", "Make-up", "Rouge", "Teint", "Sonnenschaeden", "Lippenstift", "Sommersprossen", "Brusthaar"];

const creatorInitial = {
  firstname: "",
  lastname: "",
  birth: "",
  origin: "",
  gender: 0,
  blendData: [0, 0, 0, 0, 0, 0],
  headOverlays: [255, 0, 255, 255, 255, 255, 255, 255, 255, 255],
  hair: [0, 0, 0],
  beard: [255, 0],
  faceFeatures: Array(20).fill(0),
  clothing: [[0, 0], [0, 0], [0, 0], [0, 0]]
};

function Field({ id, label, type = "text", value, onChange, placeholder, maxLength, onEnter }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-normal text-violet-100/[0.85]">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onEnter?.();
          }
        }}
        className="h-10 w-full rounded-md border border-violet-300/[0.18] bg-black/[0.48] px-3 text-[14px] font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-fuchsia-300 focus:bg-black/[0.62] focus:shadow-[0_0_18px_rgba(168,85,247,0.24)]"
      />
    </label>
  );
}

function Slider({ label, min = 0, max = 100, step = 1, value, onChange }) {
  return (
    <label className="grid gap-2 rounded-md border border-violet-200/[0.12] bg-black/[0.26] p-3">
      <span className="text-xs font-black uppercase tracking-normal text-violet-100">{label}</span>
      <input className="accent-fuchsia-400" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="text-right text-xs font-bold text-zinc-400">{value}</span>
    </label>
  );
}

function ColorGrid({ colors, value, onChange }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {colors.map((color, index) => (
        <button
          key={`${color}-${index}`}
          type="button"
          aria-label={`Farbe ${index}`}
          onClick={() => onChange(index)}
          className={`h-6 rounded border transition ${value === index ? "border-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,0.72)]" : "border-white/[0.14]"}`}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function CharacterCreator({ result }) {
  const [active, setActive] = useState("identity");
  const [character, setCharacter] = useState(creatorInitial);

  const setValue = useCallback((field, value) => {
    setCharacter((current) => ({ ...current, [field]: value }));
  }, []);

  const preview = useCallback((type, value) => {
    trigger("cef:creator:preview", type, JSON.stringify(value));
  }, []);

  const setArrayValue = useCallback((field, index, value) => {
    setCharacter((current) => {
      const next = { ...current, [field]: [...current[field]] };
      next[field][index] = value;
      preview(field, field === "faceFeatures" ? [index, value] : next[field]);
      return next;
    });
  }, [preview]);

  const setClothing = useCallback((index, part, value) => {
    setCharacter((current) => {
      const clothing = current.clothing.map((item) => [...item]);
      clothing[index][part] = value;
      preview("clothing", clothing);
      return { ...current, clothing };
    });
  }, [preview]);

  const setGender = useCallback((gender) => {
    setCharacter((current) => ({ ...current, gender }));
    preview("gender", gender);
  }, [preview]);

  const finish = useCallback(() => {
    if (!character.firstname.trim() || !character.lastname.trim() || !character.birth || !character.origin.trim()) {
      trigger("cef:creator:notify", "Bitte fuelle Identitaet, Geburtsdatum und Herkunft aus.");
      return;
    }

    trigger("cef:creator:finish", JSON.stringify(character));
  }, [character]);

  const tabs = [
    ["identity", "Identitaet"],
    ["genetics", "Genetik"],
    ["face", "Gesicht"],
    ["style", "Style"],
    ["finish", "Abschluss"]
  ];

  return (
    <main className="relative flex h-screen w-screen items-center justify-start overflow-hidden px-5 py-6 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,4,8,0.96),rgba(22,8,34,0.86)_44%,rgba(70,18,100,0.44)_72%,rgba(5,5,8,0.9))]" />
      <div className="absolute left-[8vw] top-[12vh] h-[70vh] w-[46vw] -skew-x-12 border-y border-violet-300/[0.1] bg-violet-400/[0.04]" />

      <section className="relative grid h-[min(860px,92vh)] w-[min(560px,94vw)] grid-cols-[70px_1fr] overflow-hidden rounded-md border border-violet-200/[0.16] bg-black/[0.44] shadow-[0_18px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl">
        <nav className="grid content-center gap-2 border-r border-violet-200/[0.12] bg-black/[0.28] p-2">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActive(id)} className={`h-12 rounded text-[10px] font-black uppercase tracking-normal transition ${active === id ? "bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.42)]" : "text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}>
              {label.slice(0, 3)}
            </button>
          ))}
        </nav>

        <div className="grid min-h-0 grid-rows-[auto_1fr_auto]">
          <header className="border-b border-violet-200/[0.12] p-5">
            <div className="flex items-center gap-3">
              <img className="h-9 w-9 rounded object-contain" src={logoSrc} alt="Unique Roleplay" />
              <div>
                <div className="font-display text-5xl leading-none">Charakter</div>
                <div className="text-xs font-black uppercase text-fuchsia-200">Unique Roleplay</div>
              </div>
            </div>
          </header>

          <div className="min-h-0 overflow-y-auto p-5 [scrollbar-width:thin]">
            {active === "identity" && (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="creatorFirstName" label="Vorname" value={character.firstname} onChange={(value) => setValue("firstname", value)} placeholder="Max" maxLength={24} />
                  <Field id="creatorLastName" label="Nachname" value={character.lastname} onChange={(value) => setValue("lastname", value)} placeholder="Mustermann" maxLength={24} />
                </div>
                <Field id="creatorBirth" label="Geburtsdatum" type="date" value={character.birth} onChange={(value) => setValue("birth", value)} />
                <Field id="creatorOrigin" label="Herkunft" value={character.origin} onChange={(value) => setValue("origin", value)} placeholder="Los Santos" maxLength={48} />
                <div className="grid grid-cols-2 gap-2">
                  {["Maennlich", "Weiblich"].map((label, index) => (
                    <button key={label} type="button" onClick={() => setGender(index)} className={`h-11 rounded-md text-xs font-black uppercase ${character.gender === index ? "bg-fuchsia-500 text-white" : "bg-white/[0.08] text-zinc-300"}`}>{label}</button>
                  ))}
                </div>
              </div>
            )}

            {active === "genetics" && (
              <div className="grid gap-4">
                {["Gesicht Mutter", "Gesicht Vater", "Haut Mutter", "Haut Vater", "Form-Mix", "Haut-Mix"].map((label, index) => (
                  <Slider key={label} label={label} min={index < 4 ? 0 : -1} max={index < 4 ? 45 : 1} step={index < 4 ? 1 : 0.1} value={character.blendData[index]} onChange={(value) => setArrayValue("blendData", index, value)} />
                ))}
              </div>
            )}

            {active === "face" && (
              <div className="grid gap-3">
                {faceLabels.map((label, index) => (
                  <Slider key={label} label={label} min={-1} max={1} step={0.1} value={character.faceFeatures[index]} onChange={(value) => setArrayValue("faceFeatures", index, value)} />
                ))}
              </div>
            )}

            {active === "style" && (
              <div className="grid gap-5">
                <Slider label="Haarschnitt" min={0} max={75} value={character.hair[0]} onChange={(value) => setArrayValue("hair", 0, value)} />
                <ColorGrid colors={hairColors} value={character.hair[1]} onChange={(value) => setArrayValue("hair", 1, value)} />
                <Slider label="Bart" min={0} max={28} value={character.beard[0] === 255 ? 0 : character.beard[0]} onChange={(value) => setArrayValue("beard", 0, value)} />
                <ColorGrid colors={hairColors} value={character.beard[1]} onChange={(value) => setArrayValue("beard", 1, value)} />
                {["Oberteil", "Unterhemd", "Hose", "Schuhe"].map((label, index) => (
                  <div key={label} className="grid gap-2 rounded-md border border-violet-200/[0.12] bg-black/[0.26] p-3">
                    <Slider label={`${label} Modell`} min={0} max={index === 0 ? 360 : 140} value={character.clothing[index][0]} onChange={(value) => setClothing(index, 0, value)} />
                    <Slider label={`${label} Textur`} min={0} max={20} value={character.clothing[index][1]} onChange={(value) => setClothing(index, 1, value)} />
                  </div>
                ))}
                {overlayLabels.map((label, index) => (
                  <Slider key={label} label={label} min={0} max={12} value={character.headOverlays[index] === 255 ? 0 : character.headOverlays[index]} onChange={(value) => setArrayValue("headOverlays", index, value)} />
                ))}
              </div>
            )}

            {active === "finish" && (
              <div className="grid h-full content-center gap-5 text-center">
                <div className="font-display text-6xl leading-none">{character.firstname || "Dein"} {character.lastname || "Charakter"}</div>
                <p className="text-sm font-semibold text-zinc-300">Wenn alles passt, wird dein Charakter gespeichert und du spawnst in Los Santos.</p>
                <button type="button" onClick={finish} className="h-12 rounded-md bg-fuchsia-500 text-xs font-black uppercase tracking-normal text-white shadow-[0_0_24px_rgba(217,70,239,0.4)] hover:bg-fuchsia-400">Charakter erstellen</button>
              </div>
            )}
          </div>

          <div className={`min-h-10 border-t border-violet-200/[0.12] px-5 py-3 text-sm font-semibold ${result.message ? "text-violet-100" : "text-zinc-500"}`}>{result.message || "A/D drehen deinen Charakter. Die Vorschau wird direkt am Spieler angezeigt."}</div>
        </div>
      </section>
    </main>
  );
}

function AuthApp() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState("auth");
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState({ success: false, message: "" });

  const setField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const clearSensitive = useCallback(() => {
    setForm((current) => ({
      ...current,
      loginPassword: "",
      registerPassword: "",
      repeatPassword: ""
    }));
  }, []);

  const clearResult = useCallback(() => setResult({ success: false, message: "" }), []);

  const show = useCallback(() => {
    clearSensitive();
    clearResult();
    setMode("login");
    setScreen("auth");
    setVisible(true);
  }, [clearResult, clearSensitive]);

  const hide = useCallback(() => {
    clearSensitive();
    clearResult();
    setVisible(false);
  }, [clearResult, clearSensitive]);

  const submitLogin = useCallback(() => {
    trigger("cef:auth:login", form.loginEmail.trim(), form.loginPassword);
  }, [form.loginEmail, form.loginPassword]);

  const submitRegister = useCallback(() => {
    trigger(
      "cef:auth:register",
      "",
      "",
      form.registerEmail.trim(),
      form.registerPassword,
      form.repeatPassword
    );
  }, [form]);

  useEffect(() => {
    window.authApp = {
      show,
      hide,
      showCreator: () => {
        clearSensitive();
        clearResult();
        setScreen("creator");
        setVisible(true);
      },
      setResult: (success, message) => setResult({ success: !!success, message: message || "" })
    };

    trigger("cef:auth:ready");

    return () => {
      if (window.authApp?.show === show) {
        delete window.authApp;
      }
    };
  }, [hide, show]);

  const resultClass = useMemo(() => {
    if (!result.message) {
      return "hidden";
    }

    return result.success
      ? "border-violet-300/[0.35] bg-violet-500/[0.16] text-violet-50"
      : "border-rose-300/[0.35] bg-rose-500/[0.14] text-rose-100";
  }, [result]);

  if (!visible) {
    return null;
  }

  if (screen === "creator") {
    return <CharacterCreator result={result} />;
  }

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4 py-5 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,4,8,0.98),rgba(16,8,24,0.94)_42%,rgba(57,18,82,0.62)_74%,rgba(8,8,12,0.96))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.28),rgba(0,0,0,0.82))]" />
      <div className="absolute inset-x-[10vw] top-[18vh] h-[48vh] -skew-x-12 border-y border-violet-300/[0.08] bg-violet-400/[0.04]" />

      <section className="relative grid w-full max-w-[820px] gap-4 rounded-md border border-violet-200/[0.16] bg-black/[0.42] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:p-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex min-h-[210px] flex-col justify-between gap-8 rounded-md border border-violet-200/[0.12] bg-black/[0.26] p-5">
          <div className="flex items-center gap-3">
            <img className="h-9 w-9 rounded object-contain" src={logoSrc} alt="Unique Roleplay" />
            <div>
              <div className="font-display text-4xl leading-none text-white sm:text-5xl">Unique</div>
              <div className="text-xs font-black uppercase tracking-normal text-fuchsia-200">Roleplay</div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="h-1 w-16 rounded bg-fuchsia-400 shadow-[0_0_22px_rgba(217,70,239,0.7)]" />
            <p className="max-w-[30ch] text-sm font-semibold leading-6 text-zinc-300">
              Willkommen zurueck in Los Santos. Melde dich an oder erstelle deinen Charakter.
            </p>
          </div>
        </div>

        <div className="grid content-center gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-violet-200/[0.12] bg-black/[0.34] p-1">
            {["login", "register"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  clearResult();
                }}
                className={`h-9 rounded text-xs font-black uppercase tracking-normal transition ${
                  mode === item ? "bg-fuchsia-400 text-white shadow-[0_0_22px_rgba(217,70,239,0.42)]" : "text-zinc-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item === "login" ? "Login" : "Registrieren"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <div className="grid gap-4">
              <Field id="loginEmail" label="E-Mail" type="email" value={form.loginEmail} onChange={(value) => setField("loginEmail", value)} placeholder="name@example.com" maxLength={64} onEnter={submitLogin} />
              <Field id="loginPassword" label="Passwort" type="password" value={form.loginPassword} onChange={(value) => setField("loginPassword", value)} placeholder="Passwort" maxLength={32} onEnter={submitLogin} />
              <button type="button" onClick={submitLogin} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase tracking-normal text-white shadow-[0_0_22px_rgba(217,70,239,0.34)] transition hover:bg-fuchsia-400 active:bg-fuchsia-700">
                Einloggen
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              <Field id="registerEmail" label="E-Mail" type="email" value={form.registerEmail} onChange={(value) => setField("registerEmail", value)} placeholder="name@example.com" maxLength={64} onEnter={submitRegister} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="registerPassword" label="Passwort" type="password" value={form.registerPassword} onChange={(value) => setField("registerPassword", value)} placeholder="Passwort" maxLength={32} onEnter={submitRegister} />
                <Field id="repeatPassword" label="Wiederholen" type="password" value={form.repeatPassword} onChange={(value) => setField("repeatPassword", value)} placeholder="Passwort" maxLength={32} onEnter={submitRegister} />
              </div>
              <button type="button" onClick={submitRegister} className="h-10 rounded-md bg-fuchsia-500 text-xs font-black uppercase tracking-normal text-white shadow-[0_0_22px_rgba(217,70,239,0.34)] transition hover:bg-fuchsia-400 active:bg-fuchsia-700">
                Registrieren
              </button>
            </div>
          )}

          <div className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold ${resultClass}`}>{result.message}</div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<AuthApp />);
