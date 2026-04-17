# Backend Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Duplizierten Code entfernen, Error Handling ergänzen, faction-events.ts aufteilen und Debug-Logs bereinigen — ohne Architekturumbau.

**Architecture:** Chirurgischer Eingriff (Ansatz A): Neue shared Utilities, bestehende Repositories mit try-catch absichern, große Datei aufteilen, PlayerMp von `any` auf Interface migrieren.

**Tech Stack:** TypeScript, Node.js (RAGE:MP), PostgreSQL (pg Pool)

---

## Dateiübersicht

| Aktion | Datei |
|---|---|
| NEU | `server/src/shared/normalize.ts` |
| NEU | `server/src/shared/errors.ts` |
| NEU | `server/src/runtime/player-types.ts` |
| NEU | `server/src/features/factions/faction-admin-commands.ts` |
| NEU | `server/src/features/factions/faction-cef-events.ts` |
| LÖSCHEN | `server/src/features/accounts/api/account-dto-parsers.ts` |
| ÄNDERN | `server/src/features/accounts/account-dto-parsers.ts` |
| ÄNDERN | `server/src/features/accounts/account-service.ts` |
| ÄNDERN | `server/src/features/factions/api/faction-dto-parsers.ts` |
| ÄNDERN | `server/src/features/factions/faction-events.ts` |
| ÄNDERN | `server/src/features/accounts/account-repository.ts` |
| ÄNDERN | `server/src/features/accounts/character-repository.ts` |
| ÄNDERN | `server/src/features/factions/faction-repository.ts` |
| ÄNDERN | `server/src/runtime/helpers.ts` |
| ÄNDERN | `server/src/features/inventory/inventory-service.ts` |
| ÄNDERN | `server/src/index.ts` |

---

## Task 1: shared/normalize.ts erstellen

**Files:**
- Create: `server/src/shared/normalize.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
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
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler (neue Datei ist isoliert)

- [ ] **Step 3: Commit**

```bash
git add server/src/shared/normalize.ts
git commit -m "refactor: add shared normalize utility"
```

---

## Task 2: shared/errors.ts erstellen

**Files:**
- Create: `server/src/shared/errors.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
export class DatabaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DatabaseError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string | number) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add server/src/shared/errors.ts
git commit -m "refactor: add shared typed error classes"
```

---

## Task 3: runtime/player-types.ts erstellen und helpers.ts aktualisieren

**Files:**
- Create: `server/src/runtime/player-types.ts`
- Modify: `server/src/runtime/helpers.ts`

- [ ] **Step 1: player-types.ts erstellen**

```typescript
export interface VehicleMp {
  getVariable(key: string): unknown;
  setVariable(key: string, value: unknown): void;
  bodyHealth: number;
  engine: boolean;
  locked: boolean;
}

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
  outputChatBox(message: string): void;
}
```

- [ ] **Step 2: helpers.ts aktualisieren — `any` durch Import ersetzen**

Zeile 1 in `server/src/runtime/helpers.ts` ändern von:
```typescript
export type PlayerMp = any;
```
zu:
```typescript
export type { PlayerMp } from "./player-types.js";
```

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Möglicherweise Typ-Fehler wo Player-Properties noch nicht im Interface sind — diese mit `// @ts-expect-error RAGE:MP runtime` kommentieren oder das Interface erweitern bis keine Fehler mehr.

- [ ] **Step 4: Commit**

```bash
git add server/src/runtime/player-types.ts server/src/runtime/helpers.ts
git commit -m "refactor: replace PlayerMp any with typed interface"
```

---

## Task 4: account-dto-parsers.ts auf shared/normalize.ts umstellen

**Files:**
- Modify: `server/src/features/accounts/account-dto-parsers.ts`

- [ ] **Step 1: Lokale Funktionen entfernen, Import hinzufügen**

`server/src/features/accounts/account-dto-parsers.ts` — die lokalen Funktionen `normalizeString` und `normalizeOptionalString` (Zeilen 13–20) löschen und Import ergänzen:

```typescript
import type {
  CompleteCharacterDto,
  LoginAccountDto,
  RegisterAccountDto,
  SavePlayerStateDto
} from "./account-dtos.js";
import { normalizeString, normalizeOptionalString } from "../../shared/normalize.js";

type PlayerIdentitySource = {
  socialClubId: string | null;
  socialClubName: string | null;
};

// Rest der Datei bleibt unverändert
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add server/src/features/accounts/account-dto-parsers.ts
git commit -m "refactor(accounts): use shared normalize in account-dto-parsers"
```

---

## Task 5: api/account-dto-parsers.ts löschen und index.ts anpassen

**Files:**
- Delete: `server/src/features/accounts/api/account-dto-parsers.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: index.ts Import-Pfad anpassen**

In `server/src/index.ts` Zeile 6 ändern von:
```typescript
import { parseSavePlayerStateDto } from "./features/accounts/api/account-dto-parsers.js";
```
zu:
```typescript
import { parseSavePlayerStateDto } from "./features/accounts/account-dto-parsers.js";
```

- [ ] **Step 2: Duplikat-Datei löschen**

```bash
rm "server/src/features/accounts/api/account-dto-parsers.ts"
```

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler — `parseSavePlayerStateDto` ist in beiden Dateien identisch implementiert

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(accounts): delete duplicate api/account-dto-parsers.ts"
```

---

## Task 6: account-service.ts auf shared/normalize.ts umstellen

**Files:**
- Modify: `server/src/features/accounts/account-service.ts`

- [ ] **Step 1: Lokale Funktionen ersetzen**

In `server/src/features/accounts/account-service.ts` die Funktionen `normalizeName` (Zeile 8–11) und `normalizeOptional` (Zeile 13–15) löschen und Import ergänzen:

```typescript
import { normalizeOptionalString, normalizeName } from "../../shared/normalize.js";
```

Alle Aufrufe von `normalizeOptional(...)` durch `normalizeOptionalString(...)` ersetzen (3 Stellen: Zeilen 101, 102, 146, 169).

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add server/src/features/accounts/account-service.ts
git commit -m "refactor(accounts): use shared normalize in account-service"
```

---

## Task 7: faction-dto-parsers.ts auf shared/normalize.ts umstellen

**Files:**
- Modify: `server/src/features/factions/api/faction-dto-parsers.ts`

- [ ] **Step 1: Lokale Funktion ersetzen**

In `server/src/features/factions/api/faction-dto-parsers.ts` die lokale Funktion `normalizeString` (Zeilen 15–17) löschen und Import ergänzen:

```typescript
import { normalizeString } from "../../../shared/normalize.js";
```

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add server/src/features/factions/api/faction-dto-parsers.ts
git commit -m "refactor(factions): use shared normalize in faction-dto-parsers"
```

---

## Task 8: AccountRepository mit Error Handling absichern

**Files:**
- Modify: `server/src/features/accounts/account-repository.ts`

- [ ] **Step 1: DatabaseError-Import hinzufügen**

Am Anfang der Datei ergänzen:
```typescript
import { DatabaseError } from "../../shared/errors.js";
```

- [ ] **Step 2: Alle Methoden mit try-catch wrappen**

Jede `async`-Methode bekommt try-catch. Beispiel für `emailExists`:

```typescript
async emailExists(email: string) {
  try {
    const result = await getPool().query("SELECT 1 FROM accounts WHERE email = $1 LIMIT 1", [email]);
    return (result.rowCount ?? 0) > 0;
  } catch (cause) {
    throw new DatabaseError("emailExists failed", cause);
  }
}
```

Gleiches Muster für alle 13 Methoden: `emailExists`, `socialClubExists`, `getById`, `getByEmail`, `getBySocialClubId`, `create`, `updateSocialClub`, `updateBanState`, `updateCharacter`, `updateState`, `getByName`, `countPersonalOutfits`, `createPersonalOutfit`, `getPersonalOutfits`, `getPersonalOutfitById`, `deletePersonalOutfit`.

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 4: Commit**

```bash
git add server/src/features/accounts/account-repository.ts
git commit -m "refactor(accounts): add DatabaseError handling to AccountRepository"
```

---

## Task 9: CharacterRepository mit Error Handling absichern

**Files:**
- Modify: `server/src/features/accounts/character-repository.ts`

- [ ] **Step 1: DatabaseError-Import hinzufügen**

```typescript
import { DatabaseError } from "../../shared/errors.js";
```

- [ ] **Step 2: Alle 5 Methoden wrappen**

```typescript
async getByAccountId(accountId: number): Promise<Character[]> {
  try {
    const result = await getPool().query("SELECT * FROM characters WHERE account_id = $1 ORDER BY created_at ASC", [accountId]);
    return result.rows.map(mapRowToCharacter);
  } catch (cause) {
    throw new DatabaseError("getByAccountId failed", cause);
  }
}

async getById(characterId: number): Promise<Character | null> {
  try {
    const result = await getPool().query("SELECT * FROM characters WHERE character_id = $1 LIMIT 1", [characterId]);
    return result.rows.length > 0 ? mapRowToCharacter(result.rows[0]) : null;
  } catch (cause) {
    throw new DatabaseError("getById failed", cause);
  }
}

async create(character: Omit<Character, "characterId" | "createdAt">): Promise<Character> {
  try {
    const result = await getPool().query(
      `INSERT INTO characters (
        account_id, first_name, last_name, cash, bank_cash,
        admin_level, customization_json, phone_number,
        pos_x, pos_y, pos_z, rot_z, dimension, health, armor,
        is_banned, ban_reason, ban_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [
        character.accountId, character.firstName, character.lastName, character.cash, character.bankCash,
        character.adminLevel, character.customizationJson, character.phoneNumber,
        character.posX, character.posY, character.posZ, character.rotZ, character.dimension,
        character.health, character.armor, character.isBanned, character.banReason, character.banExpiresAt
      ]
    );
    return mapRowToCharacter(result.rows[0]);
  } catch (cause) {
    throw new DatabaseError("create character failed", cause);
  }
}

async updateState(characterId: number, update: Partial<Character>): Promise<Character | null> {
  try {
    const result = await getPool().query(
      `UPDATE characters SET
        cash = COALESCE($1, cash), bank_cash = COALESCE($2, bank_cash),
        health = COALESCE($3, health), armor = COALESCE($4, armor),
        dimension = COALESCE($5, dimension),
        pos_x = COALESCE($6, pos_x), pos_y = COALESCE($7, pos_y),
        pos_z = COALESCE($8, pos_z), rot_z = COALESCE($9, rot_z),
        customization_json = COALESCE($10, customization_json)
      WHERE character_id = $11 RETURNING *`,
      [
        update.cash, update.bankCash, update.health, update.armor, update.dimension,
        update.posX, update.posY, update.posZ, update.rotZ,
        update.customizationJson ? (typeof update.customizationJson === "string" ? update.customizationJson : JSON.stringify(update.customizationJson)) : null,
        characterId
      ]
    );
    return result.rows.length > 0 ? mapRowToCharacter(result.rows[0]) : null;
  } catch (cause) {
    throw new DatabaseError("updateState character failed", cause);
  }
}

async getStarterMoney(): Promise<number> {
  try {
    const result = await getPool().query("SELECT setting_value FROM server_settings WHERE setting_key = 'starter_money'");
    return result.rows.length > 0 ? parseInt(result.rows[0].setting_value) : 100;
  } catch (cause) {
    throw new DatabaseError("getStarterMoney failed", cause);
  }
}
```

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 4: Commit**

```bash
git add server/src/features/accounts/character-repository.ts
git commit -m "refactor(accounts): add DatabaseError handling to CharacterRepository"
```

---

## Task 10: FactionRepository — kritische Methoden absichern

**Files:**
- Modify: `server/src/features/factions/faction-repository.ts`

- [ ] **Step 1: DatabaseError-Import hinzufügen**

```typescript
import { DatabaseError } from "../../shared/errors.js";
```

- [ ] **Step 2: Kritische Methoden create, delete, assignMember wrappen**

Methode `create` (Fraktion erstellen):
```typescript
async create(dto: CreateFactionDto): Promise<Faction> {
  try {
    // bestehender Inhalt
  } catch (cause) {
    throw new DatabaseError("faction create failed", cause);
  }
}
```

Methode `delete` (Fraktion löschen):
```typescript
async delete(factionId: number): Promise<boolean> {
  try {
    // bestehender Inhalt
  } catch (cause) {
    throw new DatabaseError("faction delete failed", cause);
  }
}
```

Methode `assignMember` (Mitglied zuweisen):
```typescript
async assignMember(dto: AssignFactionMemberDto): Promise<FactionMembership | null> {
  try {
    // bestehender Inhalt
  } catch (cause) {
    throw new DatabaseError("faction assignMember failed", cause);
  }
}
```

- [ ] **Step 3: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 4: Commit**

```bash
git add server/src/features/factions/faction-repository.ts
git commit -m "refactor(factions): add DatabaseError to critical FactionRepository methods"
```

---

## Task 11: faction-events.ts aufteilen

**Files:**
- Create: `server/src/features/factions/faction-admin-commands.ts`
- Create: `server/src/features/factions/faction-cef-events.ts`
- Modify: `server/src/features/factions/faction-events.ts`

- [ ] **Step 1: faction-admin-commands.ts erstellen**

Enthält den kompletten Inhalt von `faction-events.ts` Zeilen 1–909 (alles bis Ende von `handleFactionAdminCommand`), inklusive aller Imports, `FactionEventDeps` type, Hilfsfunktionen `formatPoint` und `getWardrobeCategoryPermission`:

```typescript
import { FactionService } from "./faction-service.js";
import {
  parseAssignFactionMemberDto,
  parseCreateFactionDto,
  parseCreateFactionOutfitDto,
  parseCreateFactionStoragePointDto,
  parseCreateFactionVehicleDto,
  parseCreateFactionWardrobePointDto,
  parseSetFactionLeaderDto,
  parseSetFactionRankNameDto,
  parseSetFactionRankPermissionDto,
  parseSetFactionSpawnDto
} from "./api/faction-dto-parsers.js";
import {
  validateCreateFactionDto,
  validateCreateFactionOutfitDto,
  validateCreateFactionStoragePointDto,
  validateCreateFactionVehicleDto,
  validateCreateFactionWardrobePointDto,
  validateSetFactionRankNameDto,
  validateSetFactionRankPermissionDto
} from "./faction-validators.js";
import type { PlayerMp } from "../../runtime/helpers.js";

export type FactionEventDeps = {
  factions: FactionService;
  logError: (message: string, error: unknown) => void;
  systemMessage: (player: PlayerMp, message: string) => void;
  hasAdminLevel: (player: PlayerMp, level: number) => boolean;
  getVar: (player: PlayerMp, key: string, fallback: unknown) => unknown;
  spawnFactionVehicle?: (factionVehicleId: number) => Promise<void>;
  despawnFactionVehicle?: (factionVehicleId: number) => void;
  syncOnlineFactionMember?: (accountId: number) => Promise<void>;
  syncFactionMapBlips?: () => Promise<void>;
};

function formatPoint(x: number, y: number, z: number, rotZ: number, dimension: number) {
  return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)} | RotZ ${rotZ.toFixed(2)} | Dimension ${dimension}`;
}

function getWardrobeCategoryPermission(category: string) {
  const normalizedCategory = String(category ?? "").trim().toLowerCase();
  return !normalizedCategory || normalizedCategory === "dienst"
    ? "wardrobe_access"
    : `wardrobe_category_${normalizedCategory}`;
}

export async function handleFactionAdminCommand(
  player: PlayerMp,
  command: string,
  parts: string[],
  args: string,
  deps: FactionEventDeps
): Promise<boolean> {
  // gesamter Inhalt der Funktion aus faction-events.ts Zeilen 55–909 kopieren
}
```

- [ ] **Step 2: faction-cef-events.ts erstellen**

Enthält `registerFactionCefEvents` aus `faction-events.ts` Zeilen 911–1006:

```typescript
import type { FactionEventDeps } from "./faction-admin-commands.js";
import type { PlayerMp } from "../../runtime/helpers.js";

export function registerFactionCefEvents(deps: FactionEventDeps) {
  // gesamter Inhalt der Funktion aus faction-events.ts Zeilen 912–1006 kopieren
}
```

- [ ] **Step 3: faction-events.ts zu reinem Re-Export machen**

Kompletten Inhalt der Datei ersetzen mit:

```typescript
export type { FactionEventDeps } from "./faction-admin-commands.js";
export { handleFactionAdminCommand } from "./faction-admin-commands.js";
export { registerFactionCefEvents } from "./faction-cef-events.js";
```

- [ ] **Step 4: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler — `index.ts` importiert weiterhin aus `faction-events.js` ohne Änderung

- [ ] **Step 5: Commit**

```bash
git add server/src/features/factions/faction-admin-commands.ts server/src/features/factions/faction-cef-events.ts server/src/features/factions/faction-events.ts
git commit -m "refactor(factions): split faction-events.ts into admin-commands and cef-events"
```

---

## Task 12: Debug Logs in inventory-service.ts bereinigen

**Files:**
- Modify: `server/src/features/inventory/inventory-service.ts`

- [ ] **Step 1: Debug-console.log Zeilen entfernen**

Folgende `console.log` Zeilen aus `inventory-service.ts` entfernen:
- Zeile 11: `console.log("[InventoryService] Initializing...");`
- Zeile 22: `console.log(\`[InventoryService] Loaded ${templates.length} item templates from DB.\`);`
- Zeile 124: `console.log(\`[InventoryService] Loaded inventory for Character ${characterId} / Player ${player.name}\`);`
- Zeile 137: `console.log(\`[InventoryService] Saved inventory for Character ${charId}\`);`

`console.error` Zeilen (Zeilen 25, 127, 139) bleiben erhalten — das sind legitime Fehlerausgaben.

- [ ] **Step 2: TypeScript-Kompilierung prüfen**

```bash
cd server && npx tsc --noEmit
```

Expected: Keine Fehler

- [ ] **Step 3: Commit**

```bash
git add server/src/features/inventory/inventory-service.ts
git commit -m "refactor(inventory): remove debug console.log from InventoryService"
```

---

## Task 13: Abschluss — Gesamtkompilierung und Docker-Build prüfen

- [ ] **Step 1: Vollständige TypeScript-Prüfung**

```bash
cd server && npx tsc --noEmit
```

Expected: 0 Errors, 0 Warnings

- [ ] **Step 2: Docker-Build ausführen**

```bash
docker compose build
```

Expected: Build erfolgreich ohne Fehler

- [ ] **Step 3: Abschluss-Commit wenn nötig**

```bash
git status
# Falls noch unstaged Dateien: git add <files> && git commit -m "refactor: finalize backend cleanup"
```
