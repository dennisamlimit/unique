export function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOptionalString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeName(input: string): string {
  const value = normalizeString(input).toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}
