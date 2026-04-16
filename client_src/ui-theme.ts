/// <reference path="./ragemp-client.d.ts" />

export interface UiTheme {
  primary: string;
  secondary: string;
  chat: string;
  money: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  danger: string;
  success: string;
  warning: string;
}

export const DEFAULT_UI_THEME: UiTheme = {
  primary: "#D946EF",
  secondary: "#A855F7",
  chat: "#D946EF",
  money: "#D946EF",
  surface: "#0F0A17",
  surfaceAlt: "#171020",
  border: "#C084FC",
  text: "#FFFFFF",
  muted: "#A1A1AA",
  danger: "#FB7185",
  success: "#34D399",
  warning: "#FBBF24"
};

function normalizeHex(value: unknown, fallback: string): string {
  const input = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(input) ? input.toUpperCase() : fallback;
}

export function hexToRgb(value: unknown, fallback = "#FFFFFF"): { r: number; g: number; b: number } {
  const normalized = normalizeHex(value, fallback).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

export function normalizeUiTheme(raw: unknown): UiTheme {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
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

let currentTheme: UiTheme = DEFAULT_UI_THEME;

export function loadUiTheme(): UiTheme {
  try {
    const stored = (mp.storage.data as Record<string, unknown> | undefined)?.uniqueUiTheme;
    currentTheme = normalizeUiTheme(stored);
  } catch {
    currentTheme = DEFAULT_UI_THEME;
  }
  return currentTheme;
}

export function getUiTheme(): UiTheme {
  return currentTheme;
}

export function saveUiTheme(raw: unknown): UiTheme {
  currentTheme = normalizeUiTheme(raw);
  try {
    (mp.storage.data as Record<string, unknown>).uniqueUiTheme = currentTheme;
    if (typeof mp.storage.flush === "function") {
      mp.storage.flush();
    }
  } catch {
    // Ignore storage errors.
  }
  return currentTheme;
}

export function getUiThemeJson(): string {
  loadUiTheme();
  return JSON.stringify(currentTheme);
}
