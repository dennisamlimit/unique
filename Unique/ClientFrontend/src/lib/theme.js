export const DEFAULT_UI_THEME = {
  primary: "#d946ef",
  secondary: "#a855f7",
  chat: "#d946ef",
  money: "#d946ef",
  surface: "#0f0a17",
  surfaceAlt: "#171020",
  border: "#c084fc",
  text: "#ffffff",
  muted: "#a1a1aa",
  danger: "#fb7185",
  success: "#34d399",
  warning: "#fbbf24"
};

function normalizeHex(value, fallback) {
  const input = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(input)) {
    return input.toUpperCase();
  }
  return fallback;
}

function hexToRgb(value) {
  const safe = normalizeHex(value, "#FFFFFF").slice(1);
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16)
  };
}

export function getHexRgb(value, fallback = "#FFFFFF") {
  return hexToRgb(normalizeHex(value, fallback));
}

export function normalizeUiTheme(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    primary: normalizeHex(source.primary, DEFAULT_UI_THEME.primary),
    secondary: normalizeHex(source.secondary, DEFAULT_UI_THEME.secondary),
    chat: normalizeHex(source.chat, DEFAULT_UI_THEME.chat),
    money: normalizeHex(source.money, DEFAULT_UI_THEME.money),
    surface: normalizeHex(source.surface, DEFAULT_UI_THEME.surface),
    surfaceAlt: normalizeHex(source.surfaceAlt, DEFAULT_UI_THEME.surfaceAlt),
    border: normalizeHex(source.border, DEFAULT_UI_THEME.border),
    text: normalizeHex(source.text, DEFAULT_UI_THEME.text),
    muted: normalizeHex(source.muted, DEFAULT_UI_THEME.muted),
    danger: normalizeHex(source.danger, DEFAULT_UI_THEME.danger),
    success: normalizeHex(source.success, DEFAULT_UI_THEME.success),
    warning: normalizeHex(source.warning, DEFAULT_UI_THEME.warning)
  };
}

export function getStoredUiTheme() {
  try {
    const raw = window.localStorage.getItem("unique-ui-theme");
    if (!raw) return DEFAULT_UI_THEME;
    return normalizeUiTheme(JSON.parse(raw));
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function persistUiTheme(theme) {
  const normalized = normalizeUiTheme(theme);
  try {
    window.localStorage.setItem("unique-ui-theme", JSON.stringify(normalized));
  } catch {
    // Ignore localStorage failures in embedded browsers.
  }
  return normalized;
}

export function getThemeVars(theme) {
  const normalized = normalizeUiTheme(theme);
  const primary = hexToRgb(normalized.primary);
  const secondary = hexToRgb(normalized.secondary);
  const chat = hexToRgb(normalized.chat);
  const money = hexToRgb(normalized.money);
  const surface = hexToRgb(normalized.surface);
  const surfaceAlt = hexToRgb(normalized.surfaceAlt);
  const border = hexToRgb(normalized.border);
  const text = hexToRgb(normalized.text);
  const muted = hexToRgb(normalized.muted);
  const danger = hexToRgb(normalized.danger);
  const success = hexToRgb(normalized.success);
  const warning = hexToRgb(normalized.warning);

  return {
    "--ui-primary": normalized.primary,
    "--ui-secondary": normalized.secondary,
    "--ui-chat": normalized.chat,
    "--ui-money": normalized.money,
    "--ui-surface": normalized.surface,
    "--ui-surface-alt": normalized.surfaceAlt,
    "--ui-border": normalized.border,
    "--ui-text": normalized.text,
    "--ui-muted": normalized.muted,
    "--ui-danger": normalized.danger,
    "--ui-success": normalized.success,
    "--ui-warning": normalized.warning,
    "--ui-primary-rgb": `${primary.r} ${primary.g} ${primary.b}`,
    "--ui-secondary-rgb": `${secondary.r} ${secondary.g} ${secondary.b}`,
    "--ui-chat-rgb": `${chat.r} ${chat.g} ${chat.b}`,
    "--ui-money-rgb": `${money.r} ${money.g} ${money.b}`,
    "--ui-surface-rgb": `${surface.r} ${surface.g} ${surface.b}`,
    "--ui-surface-alt-rgb": `${surfaceAlt.r} ${surfaceAlt.g} ${surfaceAlt.b}`,
    "--ui-border-rgb": `${border.r} ${border.g} ${border.b}`,
    "--ui-text-rgb": `${text.r} ${text.g} ${text.b}`,
    "--ui-muted-rgb": `${muted.r} ${muted.g} ${muted.b}`,
    "--ui-danger-rgb": `${danger.r} ${danger.g} ${danger.b}`,
    "--ui-success-rgb": `${success.r} ${success.g} ${success.b}`,
    "--ui-warning-rgb": `${warning.r} ${warning.g} ${warning.b}`
  };
}

export const THEME_CSS = `
.unique-theme {
  color: var(--ui-text);
}

.unique-theme [class*="bg-fuchsia-500"] { background-color: var(--ui-primary) !important; }
.unique-theme [class*="hover:bg-fuchsia-400"]:hover,
.unique-theme [class*="hover:bg-fuchsia-500"]:hover { background-color: var(--ui-secondary) !important; }
.unique-theme [class*="text-fuchsia-100"],
.unique-theme [class*="text-fuchsia-200"],
.unique-theme [class*="text-fuchsia-300"],
.unique-theme [class*="text-fuchsia-400"] { color: var(--ui-primary) !important; }
.unique-theme [class*="bg-fuchsia-500/"],
.unique-theme [class*="bg-fuchsia-400/"] { background-color: rgb(var(--ui-primary-rgb) / 0.14) !important; }
.unique-theme [class*="border-fuchsia-300"],
.unique-theme [class*="border-fuchsia-400"],
.unique-theme [class*="border-fuchsia-500"] { border-color: rgb(var(--ui-primary-rgb) / 0.35) !important; }

.unique-theme [class*="border-violet-200"],
.unique-theme [class*="border-violet-300"],
.unique-theme [class*="border-violet-400"] { border-color: rgb(var(--ui-border-rgb) / 0.18) !important; }
.unique-theme [class*="bg-violet-400/"],
.unique-theme [class*="bg-violet-500/"] { background-color: rgb(var(--ui-secondary-rgb) / 0.14) !important; }
.unique-theme [class*="text-violet-100"],
.unique-theme [class*="text-violet-200"] { color: rgb(var(--ui-text-rgb) / 0.92) !important; }

.unique-theme [class*="bg-black/[0.24]"],
.unique-theme [class*="bg-black/[0.26]"],
.unique-theme [class*="bg-black/[0.28]"],
.unique-theme [class*="bg-black/[0.42]"],
.unique-theme [class*="bg-black/[0.48]"],
.unique-theme [class*="bg-black/20"],
.unique-theme [class*="bg-black/40"],
.unique-theme [class*="bg-black/60"] { background-color: rgb(var(--ui-surface-alt-rgb) / 0.82) !important; }

.unique-theme [class*="bg-white/[0.04]"],
.unique-theme [class*="bg-white/[0.05]"],
.unique-theme [class*="bg-white/[0.06]"],
.unique-theme [class*="bg-white/[0.08]"] { background-color: rgb(var(--ui-text-rgb) / 0.06) !important; }

.unique-theme [class*="text-zinc-300"] { color: rgb(var(--ui-text-rgb) / 0.8) !important; }
.unique-theme [class*="text-zinc-400"],
.unique-theme [class*="text-zinc-500"],
.unique-theme [class*="text-zinc-600"] { color: var(--ui-muted) !important; }
.unique-theme [class*="text-white"] { color: var(--ui-text) !important; }

.unique-theme [class*="border-rose-"],
.unique-theme [class*="text-rose-"],
.unique-theme [class*="bg-rose-"] { color: var(--ui-danger); border-color: rgb(var(--ui-danger-rgb) / 0.3) !important; }
.unique-theme [class*="bg-emerald-"],
.unique-theme [class*="text-emerald-"] { color: var(--ui-success); border-color: rgb(var(--ui-success-rgb) / 0.3) !important; }
.unique-theme [class*="bg-amber-"],
.unique-theme [class*="text-amber-"] { color: var(--ui-warning); border-color: rgb(var(--ui-warning-rgb) / 0.3) !important; }

.unique-theme .theme-shell {
  border-color: rgb(var(--ui-border-rgb) / 0.18) !important;
  background: linear-gradient(180deg, rgb(var(--ui-surface-rgb) / 0.96), rgb(var(--ui-surface-alt-rgb) / 0.98));
}

.unique-theme .theme-overlay {
  position: relative;
  isolation: isolate;
  border: 1px solid rgb(var(--ui-border-rgb) / 0.18);
  background:
    linear-gradient(180deg, rgb(var(--ui-surface-rgb) / 0.94), rgb(var(--ui-surface-alt-rgb) / 0.98)),
    linear-gradient(135deg, rgb(var(--ui-primary-rgb) / 0.04), transparent 42%);
  box-shadow:
    0 20px 70px rgb(0 0 0 / 0.58),
    inset 0 1px 0 rgb(var(--ui-text-rgb) / 0.04);
}

.unique-theme .theme-overlay::before,
.unique-theme .theme-tile::before,
.unique-theme .theme-nav-tile::before,
.unique-theme .theme-popover::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 64px;
  height: 3px;
  background: linear-gradient(90deg, var(--ui-primary), transparent);
  pointer-events: none;
}

.unique-theme .theme-panel {
  border: 1px solid rgb(var(--ui-border-rgb) / 0.14);
  background: rgb(var(--ui-surface-alt-rgb) / 0.82);
}

.unique-theme .theme-tile {
  position: relative;
  isolation: isolate;
  border: 1px solid rgb(var(--ui-border-rgb) / 0.14);
  background:
    linear-gradient(180deg, rgb(var(--ui-surface-alt-rgb) / 0.88), rgb(var(--ui-surface-rgb) / 0.84)),
    linear-gradient(135deg, rgb(var(--ui-secondary-rgb) / 0.06), transparent 44%);
  box-shadow: inset 0 1px 0 rgb(var(--ui-text-rgb) / 0.04);
}

.unique-theme .theme-tile-soft {
  background: rgb(var(--ui-surface-alt-rgb) / 0.72);
}

.unique-theme .theme-tile-hero {
  background:
    linear-gradient(180deg, rgb(var(--ui-surface-alt-rgb) / 0.96), rgb(var(--ui-surface-rgb) / 0.94)),
    radial-gradient(circle at top right, rgb(var(--ui-primary-rgb) / 0.16), transparent 42%);
}

.unique-theme .theme-rail {
  background:
    linear-gradient(180deg, rgb(var(--ui-surface-alt-rgb) / 0.9), rgb(var(--ui-surface-rgb) / 0.92)),
    linear-gradient(180deg, rgb(var(--ui-primary-rgb) / 0.05), transparent);
}

.unique-theme .theme-nav-tile {
  position: relative;
  isolation: isolate;
  border: 1px solid rgb(var(--ui-border-rgb) / 0.12);
  background: linear-gradient(180deg, rgb(var(--ui-surface-alt-rgb) / 0.82), rgb(var(--ui-surface-rgb) / 0.86));
}

.unique-theme .theme-popover {
  position: relative;
  isolation: isolate;
  border: 1px solid rgb(var(--ui-border-rgb) / 0.22);
  background:
    linear-gradient(180deg, rgb(var(--ui-surface-rgb) / 1), rgb(var(--ui-surface-alt-rgb) / 1)),
    linear-gradient(135deg, rgb(var(--ui-primary-rgb) / 0.12), transparent 42%);
  box-shadow:
    0 28px 72px rgb(0 0 0 / 0.76),
    0 0 0 1px rgb(var(--ui-primary-rgb) / 0.12);
}

.unique-theme .theme-swatch {
  border: 1px solid rgb(var(--ui-border-rgb) / 0.18);
  box-shadow: inset 0 1px 0 rgb(var(--ui-text-rgb) / 0.08);
}

.unique-theme .theme-primary-text {
  color: var(--ui-primary) !important;
}

.unique-theme .theme-secondary-text {
  color: rgb(var(--ui-text-rgb) / 0.92) !important;
}

.unique-theme .theme-primary-border {
  border-color: rgb(var(--ui-primary-rgb) / 0.35) !important;
}

.unique-theme .theme-primary-soft {
  background-color: rgb(var(--ui-primary-rgb) / 0.14) !important;
}

.unique-theme .theme-primary-glow {
  box-shadow: 0 0 18px rgb(var(--ui-primary-rgb) / 0.42) !important;
}

.unique-theme .theme-primary-glow-strong {
  box-shadow: 0 0 28px rgb(var(--ui-primary-rgb) / 0.28) !important;
}

.unique-theme .theme-primary-drop {
  filter: drop-shadow(0 0 10px rgb(var(--ui-primary-rgb) / 0.42));
}

.unique-theme .theme-panel-gradient {
  background:
    linear-gradient(115deg, rgb(var(--ui-surface-rgb) / 0.92), rgb(var(--ui-surface-alt-rgb) / 0.88) 48%, rgb(var(--ui-primary-rgb) / 0.26) 78%, rgb(var(--ui-surface-rgb) / 0.92));
}

.unique-theme .theme-hero-gradient {
  background:
    linear-gradient(115deg, rgb(var(--ui-surface-rgb) / 0.98), rgb(var(--ui-surface-alt-rgb) / 0.94) 42%, rgb(var(--ui-primary-rgb) / 0.32) 74%, rgb(var(--ui-surface-rgb) / 0.96));
}

.unique-theme .theme-sheen-line {
  background: linear-gradient(90deg, transparent, var(--ui-primary), transparent);
}

.unique-theme .theme-dot {
  background-color: var(--ui-primary) !important;
}

.unique-theme .theme-chat-text {
  color: var(--ui-chat) !important;
}

.unique-theme .theme-chat-tag {
  color: rgb(var(--ui-chat-rgb) / 0.92) !important;
}

.unique-theme .theme-chat-soft {
  background-color: rgb(var(--ui-chat-rgb) / 0.14) !important;
}

.unique-theme .theme-chat-glow {
  box-shadow: 0 0 18px rgb(var(--ui-chat-rgb) / 0.34) !important;
}

.unique-theme .theme-money-text {
  color: var(--ui-money) !important;
}

.unique-theme .theme-money-soft {
  background-color: rgb(var(--ui-money-rgb) / 0.14) !important;
}

.unique-theme .theme-money-glow {
  filter: drop-shadow(0 0 10px rgb(var(--ui-money-rgb) / 0.36));
}

.unique-theme .theme-accent-range {
  accent-color: var(--ui-primary);
}

.unique-theme .theme-button-primary {
  background: linear-gradient(135deg, var(--ui-primary), var(--ui-secondary));
  color: var(--ui-text);
}

.unique-theme .theme-button-secondary {
  border: 1px solid rgb(var(--ui-border-rgb) / 0.18);
  background: rgb(var(--ui-text-rgb) / 0.05);
  color: var(--ui-text);
}

.unique-theme .theme-input {
  border: 1px solid rgb(var(--ui-border-rgb) / 0.18);
  background: rgb(var(--ui-surface-rgb) / 0.62);
  color: var(--ui-text);
}

.unique-theme .theme-input::placeholder {
  color: var(--ui-muted);
}
`;
