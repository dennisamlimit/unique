# Backend Refactoring — Design Spec

**Date:** 2026-04-17  
**Scope:** Server-side only (CEF/Client folgt separat)  
**Approach:** Chirurgisch (Ansatz A) — bestehende Dateistruktur bleibt, keine Architekturumbauten

---

## Ziel

Duplizierten Code entfernen, fehlende Error Handling ergänzen, `faction-events.ts` aufteilen und Debug-Ausgaben entfernen — ohne die bestehende Architektur umzubauen.

---

## 1. Shared Normalize Utility

**Problem:** `normalizeString` / `normalizeOptionalString` / `normalizeName` sind in 4 Dateien dupliziert:
- `server/src/features/accounts/account-dto-parsers.ts` (lokal)
- `server/src/features/accounts/api/account-dto-parsers.ts` (identisches Duplikat der obigen)
- `server/src/features/accounts/account-service.ts` (leicht abweichende Variante)
- `server/src/features/factions/api/faction-dto-parsers.ts` (lokal)

**Lösung:**
- Neue Datei `server/src/shared/normalize.ts` mit den drei Funktionen
- `api/account-dto-parsers.ts` wird **gelöscht** (ist 1:1-Klon von `account-dto-parsers.ts`)
- Alle 3 verbleibenden Dateien importieren aus `../../shared/normalize.js`
- `index.ts` importiert `parseSavePlayerStateDto` bereits aus `api/account-dto-parsers.ts` — muss auf `account-dto-parsers.ts` umgeleitet werden (gleiche Exports)

**Funktionen in `normalize.ts`:**
```typescript
export function normalizeString(value: unknown): string
export function normalizeOptionalString(value: unknown): string | null
export function normalizeName(input: string): string  // capitalize first letter
```

---

## 2. faction-events.ts aufteilen

**Problem:** 1006 Zeilen, zwei klar trennbare Verantwortlichkeiten:
1. `handleFactionAdminCommand` — Admin-Konsolenbefehle (Zeilen 49–909)
2. `registerFactionCefEvents` — CEF-Browser-Events (Zeilen 911–1006)

**Lösung:** 3 Dateien:

| Datei | Inhalt | Zeilen (ca.) |
|---|---|---|
| `faction-admin-commands.ts` | `handleFactionAdminCommand` + alle switch-cases | ~860 |
| `faction-cef-events.ts` | `registerFactionCefEvents` + CEF mp.events | ~100 |
| `faction-events.ts` | Nur Re-Exporte + `FactionEventDeps` type | ~15 |

`faction-events.ts` bleibt als Einstiegspunkt erhalten, damit `index.ts` keine Import-Änderung braucht:
```typescript
export type { FactionEventDeps } from "./faction-admin-commands.js";
export { handleFactionAdminCommand } from "./faction-admin-commands.js";
export { registerFactionCefEvents } from "./faction-cef-events.js";
```

Hilfsfunktionen `formatPoint` und `getWardrobeCategoryPermission` wandern in `faction-admin-commands.ts`.

---

## 3. Typed Exceptions

**Problem:** Keine einheitliche Exception-Strategie. Services und Repositories haben kein Error Handling.

**Lösung:** Neue Datei `server/src/shared/errors.ts` mit 3 Klassen:

```typescript
export class NotFoundError extends Error { constructor(entity: string, id: string | number) }
export class ValidationError extends Error { constructor(message: string) }
export class DatabaseError extends Error { constructor(message: string, cause?: unknown) }
```

Repositories wrappen alle DB-Queries in try-catch und werfen `DatabaseError`.  
Services können `NotFoundError` und `ValidationError` werfen wenn nötig.

---

## 4. Repository Error Handling

**Problem:** `AccountRepository`, `CharacterRepository`, `FactionRepository` haben kein try-catch — DB-Fehler propagieren unkontrolliert.

**Lösung:** Alle `async`-Methoden in `AccountRepository` (13 Methoden) und `CharacterRepository` (4 Methoden) bekommen try-catch:
```typescript
async getById(accountId: number) {
  try {
    const result = await getPool().query("SELECT ...", [accountId]);
    return result.rows[0] ? mapRowToAccount(result.rows[0]) : null;
  } catch (cause) {
    throw new DatabaseError(`getById(${accountId}) failed`, cause);
  }
}
```

`FactionRepository` ist mit 668 Zeilen groß — nur die kritischsten Methoden (create, delete, assignMember) bekommen Error Handling im ersten Schritt.

---

## 5. PlayerMp Typing

**Problem:** `export type PlayerMp = any` in `helpers.ts` deaktiviert TypeScript für alle Player-Interaktionen.

**Lösung:** Interface in `server/src/runtime/player-types.ts`:
```typescript
export interface PlayerMp {
  id: number;
  name: string;
  rgscId?: string;
  socialClubId?: string;
  socialClubName?: string;
  position: { x: number; y: number; z: number };
  heading?: number;
  rotation?: { x: number; y: number; z: number };
  health: number;
  armour?: number;
  armor?: number;
  vehicle?: VehicleMp | null;
  call(event: string, args?: unknown[]): void;
  setVariable(key: string, value: unknown): void;
  getVariable(key: string): unknown;
}
```

`helpers.ts` importiert und re-exportiert `PlayerMp` aus `player-types.ts`. Alle anderen Dateien die `type PlayerMp = any` lokal deklarieren (z.B. `faction-events.ts`) werden auf den Import umgestellt.

---

## 6. Debug Logs entfernen

**Problem:** `console.log("[DEBUG]")` und `chat.push("[DEBUG]")` in Server-Code, besonders in `inventory-service.ts`.

**Lösung:**
- Alle `console.log` mit `[DEBUG]`-Prefix entfernen
- Legitime Server-Logs (Errors, Start-Meldungen) bleiben erhalten
- `console.error` für Fehlerausgaben ist OK

---

## Nicht in Scope

- `database.ts` Migration-Aufspaltung (Ansatz B)
- `BaseRepository` Abstraktion
- `FactionRepository` vollständiges Error Handling (nur kritische Methoden)
- CEF/Client Refactoring (folgt separat)
- Passwort-Policy Verbesserung
- Email-Validierung Verbesserung

---

## Dateien-Übersicht

| Aktion | Datei |
|---|---|
| **NEU** | `server/src/shared/normalize.ts` |
| **NEU** | `server/src/shared/errors.ts` |
| **NEU** | `server/src/runtime/player-types.ts` |
| **NEU** | `server/src/features/factions/faction-admin-commands.ts` |
| **NEU** | `server/src/features/factions/faction-cef-events.ts` |
| **LÖSCHEN** | `server/src/features/accounts/api/account-dto-parsers.ts` |
| **ÄNDERN** | `server/src/shared/normalize.ts` importieren in 3 Dateien |
| **ÄNDERN** | `server/src/features/factions/faction-events.ts` → Re-Export-Datei |
| **ÄNDERN** | `server/src/features/accounts/account-repository.ts` — try-catch |
| **ÄNDERN** | `server/src/features/accounts/character-repository.ts` — try-catch |
| **ÄNDERN** | `server/src/features/factions/faction-repository.ts` — kritische Methoden |
| **ÄNDERN** | `server/src/runtime/helpers.ts` — PlayerMp importieren statt `any` |
| **ÄNDERN** | `server/src/features/inventory/inventory-service.ts` — Debug logs entfernen |
