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

const hairStyleOptions = [
  { label: "Kurz", hint: "Clean", icon: "hair-short", value: 0 },
  { label: "Fade", hint: "Street", icon: "hair-fade", value: 3 },
  { label: "Lang", hint: "Locker", icon: "hair-long", value: 15 }
];

const beardOptions = [
  { label: "Glatt", hint: "Ohne Bart", icon: "beard-none", value: 255 },
  { label: "Stoppel", hint: "Dezent", icon: "beard-light", value: 1 },
  { label: "Vollbart", hint: "Markant", icon: "beard-full", value: 10 }
];

const clothingSlots = [
  {
    label: "Oberteil",
    index: 0,
    icon: "top",
    options: [
      { label: "Basic", hint: "Shirt", value: [15, 0] },
      { label: "Street", hint: "Hoodie", value: [23, 0] },
      { label: "Jacke", hint: "Layer", value: [14, 0] }
    ]
  },
  {
    label: "Unterhemd",
    index: 1,
    icon: "undershirt",
    options: [
      { label: "Keins", hint: "Clean", value: [15, 0] },
      { label: "Weiss", hint: "Basic", value: [0, 0] },
      { label: "Dunkel", hint: "Neutral", value: [1, 0] }
    ]
  },
  {
    label: "Hose",
    index: 2,
    icon: "pants",
    options: [
      { label: "Jeans", hint: "Alltag", value: [4, 0] },
      { label: "Cargo", hint: "Robust", value: [10, 0] },
      { label: "Kurz", hint: "Sommer", value: [14, 0] }
    ]
  },
  {
    label: "Schuhe",
    index: 3,
    icon: "shoes",
    options: [
      { label: "Sneaker", hint: "Weiss", value: [1, 0] },
      { label: "Boots", hint: "Schwer", value: [7, 0] },
      { label: "Sport", hint: "Leicht", value: [12, 0] }
    ]
  }
];

const overlayOptions = [
  { label: "Aus", hint: "None", icon: "clean", value: 255 },
  { label: "Leicht", hint: "Soft", icon: "detail-light", value: 1 },
  { label: "Stark", hint: "Bold", icon: "detail-strong", value: 5 }
];

const creatorInitial = {
  firstname: "",
  lastname: "",
  birth: "",
  origin: "",
  gender: 0,
  blendData: [0, 0, 0, 0, 0, 0],
  headOverlays: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
  hair: [0, 0, 0],
  beard: [255, 0],
  faceFeatures: Array(20).fill(0),
  clothing: [[15, 0], [15, 0], [4, 0], [1, 0]]
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

function IconGlyph({ type }) {
  const common = "fill-none stroke-current stroke-[1.8] stroke-linecap-round stroke-linejoin-round";

  if (type === "tab-identity") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path className={common} d="M16 39h16M14 34c1-7 6-11 10-11s9 4 10 11" />
        <path className={common} d="M18 15c0-4 3-7 6-7s6 3 6 7-3 7-6 7-6-3-6-7Z" />
      </svg>
    );
  }

  if (type === "tab-genetics") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path className={common} d="M17 8c9 6 15 13 15 24 0 4-2 7-5 8M31 8c-9 6-15 13-15 24 0 4 2 7 5 8" />
        <path className={common} d="M18 15h12M16 23h16M18 31h12" />
      </svg>
    );
  }

  if (type === "tab-face") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path className={common} d="M15 21c0-8 4-13 9-13s9 5 9 13c0 10-4 18-9 18s-9-8-9-18Z" />
        <path className={common} d="M19 22h2M27 22h2M24 24v5l-2 2M20 34c3 2 5 2 8 0" />
      </svg>
    );
  }

  if (type === "tab-style") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path className={common} d="M16 12l8-4 8 4 7 7-6 5-3-3v19H18V21l-3 3-6-5 7-7Z" />
        <path className={common} d="M20 10c1 5 7 5 8 0" />
      </svg>
    );
  }

  if (type === "tab-finish") {
    return (
      <svg viewBox="0 0 48 48" className="h-5 w-5">
        <path className={common} d="M11 25l8 8 18-19" />
        <path className={common} d="M24 6l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8Z" />
      </svg>
    );
  }

  if (type === "pants") {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M17 8h14l3 32h-8l-2-19-2 19h-8l3-32Z" />
        <path className={common} d="M18 14h12M24 9v12" />
      </svg>
    );
  }

  if (type === "shoes") {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M8 31c6 1 10-1 13-5l5 5h11c2 0 3 1 3 3v2H9c-2 0-3-1-3-3v-2h2Z" />
        <path className={common} d="M23 29l3-3M27 31l3-3" />
      </svg>
    );
  }

  if (type === "undershirt") {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M18 8h12l2 8-3 24H19l-3-24 2-8Z" />
        <path className={common} d="M20 8c1 4 7 4 8 0" />
      </svg>
    );
  }

  if (type?.startsWith("hair")) {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M14 25c0-10 6-16 15-14 6 1 8 6 7 13" />
        <path className={common} d={type === "hair-long" ? "M16 23c-4 8-1 14 5 17M35 22c4 8 1 14-5 18" : "M15 24c4-4 10-7 20-7"} />
        <path className={common} d="M18 27c1 8 11 10 15 2" />
      </svg>
    );
  }

  if (type?.startsWith("beard")) {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M17 17c2-4 12-4 14 0M17 25c1 9 13 12 15 0" />
        {type !== "beard-none" && <path className={common} d={type === "beard-full" ? "M15 26c2 12 16 13 19 0" : "M18 30c4 4 9 4 13 0"} />}
      </svg>
    );
  }

  if (type?.startsWith("detail") || type === "clean") {
    return (
      <svg viewBox="0 0 48 48" className="h-9 w-9">
        <path className={common} d="M15 22c4-5 14-5 18 0M18 29c4 3 8 3 12 0" />
        {type !== "clean" && <path className={common} d={type === "detail-strong" ? "M13 14l5 2M35 14l-5 2M24 34v4" : "M16 15l3 1M32 15l-3 1"} />}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9">
      <path className={common} d="M16 12l8-4 8 4 7 7-6 5-3-3v19H18V21l-3 3-6-5 7-7Z" />
      <path className={common} d="M20 10c1 5 7 5 8 0" />
    </svg>
  );
}

function OptionCard({ option, selected, icon, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid min-h-[92px] content-between rounded-md border p-3 text-left transition ${
        selected
          ? "border-fuchsia-200 bg-fuchsia-500/[0.18] text-white shadow-[0_0_20px_rgba(217,70,239,0.3)]"
          : "border-violet-200/[0.12] bg-black/[0.26] text-zinc-300 hover:border-violet-200/[0.34] hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-normal">{option.label}</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase text-zinc-500">{option.hint}</div>
        </div>
        <div className={selected ? "text-fuchsia-100" : "text-violet-200/[0.68]"}>
          <IconGlyph type={option.icon || icon} />
        </div>
      </div>
      <div className={`mt-3 h-1 rounded-full ${selected ? "bg-fuchsia-300" : "bg-white/[0.08]"}`} />
    </button>
  );
}

function OptionSection({ title, children }) {
  return (
    <section className="grid gap-3 rounded-md border border-violet-200/[0.12] bg-black/[0.2] p-3">
      <div className="text-[11px] font-black uppercase tracking-normal text-violet-100">{title}</div>
      {children}
    </section>
  );
}

function samePair(left, right) {
  return Array.isArray(left) && Array.isArray(right) && Number(left[0]) === Number(right[0]) && Number(left[1]) === Number(right[1]);
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

  const setHairStyle = useCallback((drawable) => {
    setCharacter((current) => {
      const hair = [drawable, current.hair[1], current.hair[2]];
      preview("hair", hair);
      return { ...current, hair };
    });
  }, [preview]);

  const setBeardStyle = useCallback((drawable) => {
    setCharacter((current) => {
      const beard = [drawable, current.beard[1]];
      preview("beard", beard);
      return { ...current, beard };
    });
  }, [preview]);

  const setClothingPreset = useCallback((index, value) => {
    setCharacter((current) => {
      const clothing = current.clothing.map((item) => [...item]);
      clothing[index] = [...value];
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
    { id: "identity", label: "Identitaet", short: "ID", icon: "tab-identity" },
    { id: "genetics", label: "Genetik", short: "DNA", icon: "tab-genetics" },
    { id: "face", label: "Gesicht", short: "Face", icon: "tab-face" },
    { id: "style", label: "Style", short: "Fit", icon: "tab-style" },
    { id: "finish", label: "Abschluss", short: "OK", icon: "tab-finish" }
  ];

  return (
    <main className="relative flex h-screen w-screen items-center justify-start overflow-hidden px-5 py-6 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,4,8,0.96),rgba(22,8,34,0.86)_44%,rgba(70,18,100,0.44)_72%,rgba(5,5,8,0.9))]" />
      <div className="absolute left-[8vw] top-[12vh] h-[70vh] w-[46vw] -skew-x-12 border-y border-violet-300/[0.1] bg-violet-400/[0.04]" />

      <section className="relative grid h-[min(860px,92vh)] w-[min(560px,94vw)] grid-cols-[70px_1fr] overflow-hidden rounded-md border border-violet-200/[0.16] bg-black/[0.44] shadow-[0_18px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl">
        <nav className="grid content-center gap-2 border-r border-violet-200/[0.12] bg-black/[0.28] p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              onClick={() => setActive(tab.id)}
              className={`group relative grid h-14 place-items-center rounded-md border text-[9px] font-black uppercase tracking-normal transition ${
                active === tab.id
                  ? "border-fuchsia-200/[0.55] bg-fuchsia-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.42)]"
                  : "border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:border-violet-200/[0.3] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <span className={active === tab.id ? "text-white" : "text-violet-200/[0.7] group-hover:text-violet-100"}>
                <IconGlyph type={tab.icon} />
              </span>
              <span className="mt-1 leading-none">{tab.short}</span>
              {active === tab.id && <span className="absolute -right-2 h-5 w-1 rounded-full bg-fuchsia-200 shadow-[0_0_12px_rgba(250,232,255,0.85)]" />}
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
                <OptionSection title="Haarschnitt">
                  <div className="grid grid-cols-3 gap-2">
                    {hairStyleOptions.map((option) => (
                      <OptionCard
                        key={option.label}
                        option={option}
                        selected={Number(character.hair[0]) === option.value}
                        onSelect={() => setHairStyle(option.value)}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <div className="text-[10px] font-black uppercase text-zinc-500">Haarfarbe</div>
                    <ColorGrid colors={hairColors} value={character.hair[1]} onChange={(value) => setArrayValue("hair", 1, value)} />
                  </div>
                </OptionSection>

                <OptionSection title="Bart">
                  <div className="grid grid-cols-3 gap-2">
                    {beardOptions.map((option) => (
                      <OptionCard
                        key={option.label}
                        option={option}
                        selected={Number(character.beard[0]) === option.value}
                        onSelect={() => setBeardStyle(option.value)}
                      />
                    ))}
                  </div>
                  <div className="grid gap-2">
                    <div className="text-[10px] font-black uppercase text-zinc-500">Bartfarbe</div>
                    <ColorGrid colors={hairColors} value={character.beard[1]} onChange={(value) => setArrayValue("beard", 1, value)} />
                  </div>
                </OptionSection>

                {clothingSlots.map((slot) => (
                  <OptionSection key={slot.label} title={slot.label}>
                    <div className="grid grid-cols-3 gap-2">
                      {slot.options.map((option) => (
                        <OptionCard
                          key={option.label}
                          option={{ ...option, icon: slot.icon }}
                          selected={samePair(character.clothing[slot.index], option.value)}
                          onSelect={() => setClothingPreset(slot.index, option.value)}
                        />
                      ))}
                    </div>
                  </OptionSection>
                ))}

                <OptionSection title="Details">
                  <div className="grid gap-3">
                    {overlayLabels.map((label, index) => (
                      <div key={label} className="grid gap-2">
                        <div className="text-[10px] font-black uppercase text-zinc-500">{label}</div>
                        <div className="grid grid-cols-3 gap-2">
                          {overlayOptions.map((option) => (
                            <OptionCard
                              key={`${label}-${option.label}`}
                              option={option}
                              selected={Number(character.headOverlays[index]) === option.value}
                              onSelect={() => setArrayValue("headOverlays", index, option.value)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </OptionSection>
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

function SpawnCard({ title, subtitle, icon, disabled, selected, onSelect }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`group grid min-h-[230px] content-between rounded-md border p-5 text-left transition ${
        disabled
          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.03] text-zinc-600"
          : selected
            ? "border-fuchsia-200 bg-fuchsia-500/[0.18] text-white shadow-[0_0_28px_rgba(217,70,239,0.34)]"
            : "border-violet-200/[0.14] bg-black/[0.3] text-zinc-300 hover:border-violet-200/[0.38] hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-5xl leading-none">{title}</div>
          <div className="mt-2 text-xs font-black uppercase tracking-normal text-violet-100/[0.72]">{subtitle}</div>
        </div>
        <div className={disabled ? "text-zinc-700" : selected ? "text-fuchsia-100" : "text-violet-200/[0.75] group-hover:text-violet-100"}>
          <IconGlyph type={icon} />
        </div>
      </div>
      <div className={`h-1 rounded-full ${disabled ? "bg-white/[0.04]" : selected ? "bg-fuchsia-300" : "bg-white/[0.08]"}`} />
    </button>
  );
}

function SpawnSelection({ message, result }) {
  const [selected, setSelected] = useState("last");

  const selectSpawn = useCallback((spawnType) => {
    setSelected(spawnType);
    trigger("cef:spawn:select", spawnType);
  }, []);

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4 py-5 text-white sm:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,4,8,0.98),rgba(18,8,30,0.92)_48%,rgba(69,20,95,0.54)_76%,rgba(5,5,8,0.96))]" />
      <div className="absolute inset-x-[9vw] top-[18vh] h-[50vh] -skew-x-12 border-y border-violet-300/[0.08] bg-violet-400/[0.04]" />

      <section className="relative grid w-full max-w-[1320px] gap-5 rounded-md border border-violet-200/[0.16] bg-black/[0.46] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.62)] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-4 border-b border-violet-200/[0.12] pb-4">
          <div className="flex items-center gap-3">
            <img className="h-10 w-10 rounded object-contain" src={logoSrc} alt="Unique Roleplay" />
            <div>
              <div className="font-display text-5xl leading-none">Spawn</div>
              <div className="text-xs font-black uppercase text-fuchsia-200">Waehle deinen Einstieg</div>
            </div>
          </div>
          <div className="hidden rounded-md border border-violet-200/[0.12] bg-black/[0.28] px-3 py-2 text-right text-xs font-bold text-zinc-300 sm:block">
            Keine Weltfreigabe ohne Auswahl
          </div>
        </header>

        <p className="text-sm font-semibold leading-6 text-zinc-300">{message || "Dein Login ist bereit. Waehle jetzt, wo du in Los Santos starten willst."}</p>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SpawnCard title="Letzter Spawn" subtitle="Dein gespeicherter Standort" icon="tab-face" selected={selected === "last"} onSelect={() => selectSpawn("last")} />
          <SpawnCard title="Hotel" subtitle="Server-Spawn" icon="tab-identity" selected={selected === "hotel"} onSelect={() => selectSpawn("hotel")} />
          <SpawnCard title="Fraktion" subtitle="Bald verfuegbar" icon="tab-style" disabled />
          <SpawnCard title="Apartment" subtitle="Bald verfuegbar" icon="tab-finish" disabled />
        </div>

        <div className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold ${result.message ? "border-violet-300/[0.22] bg-violet-500/[0.1] text-violet-100" : "border-violet-200/[0.1] bg-black/[0.2] text-zinc-500"}`}>
          {result.message || "Fraktion und Apartment sind vorbereitet, aber noch gesperrt."}
        </div>
      </section>
    </main>
  );
}

function formatBanDate(value) {
  if (!value) {
    return "Unbekannt";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function BannedScreen({ ban }) {
  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden px-4 py-5 text-white sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(244,63,94,0.26),transparent_32%),linear-gradient(120deg,rgba(5,5,8,0.98),rgba(30,8,18,0.94)_48%,rgba(86,12,28,0.58)_76%,rgba(5,5,8,0.96))]" />
      <div className="absolute inset-x-[10vw] top-[18vh] h-[52vh] -skew-x-12 border-y border-rose-300/[0.12] bg-rose-500/[0.05]" />

      <section className="relative grid w-full max-w-[880px] gap-5 rounded-md border border-rose-200/[0.18] bg-black/[0.56] p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,0.72)] backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-md border border-rose-200/[0.22] bg-rose-500/[0.14] text-rose-100 shadow-[0_0_32px_rgba(244,63,94,0.28)]">
          <svg viewBox="0 0 48 48" className="h-9 w-9 fill-none stroke-current stroke-[2]">
            <path d="M24 6 39 13v11c0 10-6 16-15 20C15 40 9 34 9 24V13l15-7Z" />
            <path d="M17 17 31 31M31 17 17 31" />
          </svg>
        </div>

        <div>
          <div className="font-display text-7xl leading-none text-white">ACCOUNT GESPERRT</div>
          <p className="mt-2 text-sm font-black uppercase tracking-normal text-rose-200">Die Verbindung wird in 3 Sekunden getrennt.</p>
        </div>

        <div className="grid gap-3 text-left sm:grid-cols-2">
          <div className="rounded-md border border-rose-200/[0.12] bg-black/[0.28] p-4 sm:col-span-2">
            <div className="text-[10px] font-black uppercase text-rose-200">Bann-Grund</div>
            <div className="mt-1 text-lg font-black text-white">{ban.reason || "Kein Grund angegeben."}</div>
          </div>

          <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
            <div className="text-[10px] font-black uppercase text-zinc-500">Bann Datum</div>
            <div className="mt-1 text-sm font-bold text-zinc-100">{formatBanDate(ban.banDate)}</div>
          </div>

          <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
            <div className="text-[10px] font-black uppercase text-zinc-500">Ablauf</div>
            <div className="mt-1 text-sm font-bold text-zinc-100">{ban.expiresAt ? formatBanDate(ban.expiresAt) : "Permanent"}</div>
          </div>

          <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
            <div className="text-[10px] font-black uppercase text-zinc-500">Admin</div>
            <div className="mt-1 text-sm font-bold text-zinc-100">{ban.admin || "Unbekannt"}</div>
          </div>

          <div className="rounded-md border border-violet-200/[0.1] bg-black/[0.24] p-4">
            <div className="text-[10px] font-black uppercase text-zinc-500">Account</div>
            <div className="mt-1 text-sm font-bold text-zinc-100">{ban.accountName || "Unbekannt"} #{ban.accountId || "-"}</div>
          </div>
        </div>

        <p className="text-sm font-semibold leading-6 text-zinc-400">
          Wenn du denkst, dass das ein Fehler ist, melde dich mit deiner Account-ID beim Support.
        </p>
      </section>
    </main>
  );
}

function AuthApp() {
  const [visible, setVisible] = useState(false);
  const [screen, setScreen] = useState("auth");
  const [spawnMessage, setSpawnMessage] = useState("");
  const [banInfo, setBanInfo] = useState({});
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
      showSpawn: (message) => {
        clearSensitive();
        clearResult();
        setSpawnMessage(message || "");
        setScreen("spawn");
        setVisible(true);
      },
      showBanned: (banData) => {
        clearSensitive();
        clearResult();
        setBanInfo(banData || {});
        setScreen("banned");
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

  if (screen === "spawn") {
    return <SpawnSelection message={spawnMessage} result={result} />;
  }

  if (screen === "banned") {
    return <BannedScreen ban={banInfo} />;
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
