import { EventEmitter } from "events";
import { randomBytes, randomUUID } from "crypto";

export interface InventoryEntry {
    uid: string;
    key: string;
    amount: number;
    slot: number;
    data: any;
}

export interface ItemDefinition {
    name: string;
    description: string;
    onUse?: (player: any, uid: string, key: string, data: any, amount: number) => any;
    nameFunc?: (data: any) => string;
    descFunc?: (data: any) => string;
}

const MAX_STACK_AMOUNT = 2147483647;
const INVALID_ITEM_NAME = "Invalid Item";
const MAX_UID_LENGTH = 128;
const MAX_DATA_DEPTH = 8;
const MAX_ARRAY_LENGTH = 128;
const MAX_OBJECT_KEYS = 128;
const MAX_STRING_LENGTH = 2048;
const MAX_SERIALIZED_DATA_SIZE = 16 * 1024;
const DEFAULT_MAX_INVENTORY_SLOTS = 64;

const INTERNAL_SET_INVENTORY = Symbol("inventory.internalSetInventory");
const INTERNAL_BYPASS_CAPACITY = Symbol("inventory.internalBypassCapacity");

const playerState = new WeakMap<any, any>();
const holderState = new WeakMap<any, any>();
const objectLockState = new WeakMap<any, any>();
const uidReservations = new Map<string, symbol | null>();
const objectIds = new WeakMap<any, number>();
let nextObjectId = 1;

const transactionContextStack: any[] = [];

// Helper functions ported from JS
function hasOwn(obj: any, key: string) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function isPlainObject(value: any) {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function deepEqual(a: any, b: any, visited = new WeakMap()): boolean {
    if (a === b) return true;
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    if (visited.has(a)) return visited.get(a) === b;
    visited.set(a, b);

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i], visited)) return false;
        }
        return true;
    }

    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }

    if (!isPlainObject(a) || !isPlainObject(b)) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
        if (!hasOwn(b, key)) return false;
        if (!deepEqual(a[key], b[key], visited)) return false;
    }

    return true;
}

function validateAndCloneData(value: any, path = "data", depth = 0): any {
    if (value === undefined) return undefined;
    if (value === null) return null;

    if (depth > MAX_DATA_DEPTH) throw new Error(`${path}: Maximum nesting depth exceeded.`);

    const valueType = typeof value;

    if (valueType === "string") {
        if (value.length > MAX_STRING_LENGTH) throw new Error(`${path}: String exceeds ${MAX_STRING_LENGTH} characters.`);
        return value;
    }

    if (valueType === "number") {
        if (!Number.isFinite(value)) throw new Error(`${path}: Number must be finite.`);
        return value;
    }

    if (valueType === "boolean") return value;

    if (valueType === "bigint" || valueType === "function" || valueType === "symbol") {
        throw new Error(`${path}: Unsupported data type (${valueType}).`);
    }

    if (Array.isArray(value)) {
        if (value.length > MAX_ARRAY_LENGTH) throw new Error(`${path}: Array exceeds ${MAX_ARRAY_LENGTH} entries.`);
        const result = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
            result[i] = validateAndCloneData(value[i], `${path}[${i}]`, depth + 1);
        }
        return result;
    }

    if (!isPlainObject(value)) throw new Error(`${path}: Only plain objects and arrays are allowed.`);

    const keys = Object.keys(value);
    if (keys.length > MAX_OBJECT_KEYS) throw new Error(`${path}: Object exceeds ${MAX_OBJECT_KEYS} keys.`);

    const result = Object.create(null);
    for (const key of keys) {
        if (!isSafeDataKey(key)) throw new Error(`${path}: Unsafe object key (${key}).`);
        result[key] = validateAndCloneData(value[key], `${path}.${key}`, depth + 1);
    }

    const serialized = JSON.stringify(result);
    if (serialized.length > MAX_SERIALIZED_DATA_SIZE) {
        throw new Error(`${path}: Serialized payload exceeds ${MAX_SERIALIZED_DATA_SIZE} bytes.`);
    }

    return JSON.parse(serialized);
}

function cloneData(value: any) {
    return validateAndCloneData(value);
}

function isSafeItemKey(key: any) {
    return typeof key === "string" && key.length > 0 && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}

function isSafeDataKey(key: any) {
    return typeof key === "string" && key.length > 0 && key.length <= 128 && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}

function isPositiveInt(value: any): value is number {
    return Number.isInteger(value) && value > 0;
}

function isValidUid(uid: any) {
    return typeof uid === "string" && uid.trim().length > 0 && uid.length <= MAX_UID_LENGTH && /^[A-Za-z0-9._:-]+$/.test(uid);
}

function generateUid() {
    return randomUUID ? randomUUID() : randomBytes(16).toString("hex");
}

function cloneInventoryEntry(item: InventoryEntry): InventoryEntry {
    return {
        uid: item.uid,
        key: item.key,
        amount: item.amount,
        slot: item.slot,
        data: cloneData(item.data)
    };
}

function cloneInventory(inventory: InventoryEntry[]): InventoryEntry[] {
    return Array.isArray(inventory) ? inventory.map(cloneInventoryEntry) : [];
}

function getObjectId(target: any) {
    if (!objectIds.has(target)) objectIds.set(target, nextObjectId++);
    return objectIds.get(target);
}

function getExclusiveLockState(target: any) {
    let state = objectLockState.get(target);
    if (!state) {
        state = { owner: null, count: 0 };
        objectLockState.set(target, state);
    }
    return state;
}

function getCurrentTransactionContext() {
    return transactionContextStack.length > 0 ? transactionContextStack[transactionContextStack.length - 1] : null;
}

function getCurrentTransactionToken() {
    const context = getCurrentTransactionContext();
    return context ? context.token : null;
}

function emitInventoryEvent(instance: InventoryScript, ...args: any[]) {
    const context = getCurrentTransactionContext();
    if (context) {
        context.pendingEvents.push(args);
        return true;
    }
    return instance.emit(args[0], ...args.slice(1));
}

function flushTransactionEvents(instance: InventoryScript, context: any) {
    if (!context || !Array.isArray(context.pendingEvents) || context.pendingEvents.length === 0) return;
    const pending = context.pendingEvents.slice();
    context.pendingEvents.length = 0;
    for (const args of pending) {
        try {
            instance.emit(args[0], ...args.slice(1));
        } catch (err) {
            console.error(`inventory event handler failed (${String(args[0])}):`, err);
        }
    }
}

function tryAcquireTransaction(targets: any | any[], token: symbol | null = null) {
    const uniqueTargets = [...new Set((Array.isArray(targets) ? targets : [targets]).filter(Boolean))];
    uniqueTargets.sort((a, b) => (getObjectId(a) || 0) - (getObjectId(b) || 0));

    const txToken = token || getCurrentTransactionToken() || Symbol("inventory.tx");
    const acquired = [];

    for (const target of uniqueTargets) {
        const state = getExclusiveLockState(target);
        if (state.owner !== null && state.owner !== txToken) {
            for (const prev of acquired) {
                const prevState = getExclusiveLockState(prev);
                prevState.count--;
                if (prevState.count <= 0) {
                    prevState.owner = null;
                    prevState.count = 0;
                }
            }
            return null;
        }
        state.owner = txToken;
        state.count++;
        acquired.push(target);
    }

    return {
        token: txToken,
        release() {
            for (const target of acquired) {
                const state = getExclusiveLockState(target);
                if (state.owner === txToken) {
                    state.count--;
                    if (state.count <= 0) {
                        state.owner = null;
                        state.count = 0;
                    }
                }
            }
        }
    };
}

function withTransaction(instance: InventoryScript, targets: any | any[], fn: (token: symbol) => any, token: symbol | null = null) {
    const guard = tryAcquireTransaction(targets, token);
    if (!guard) return false;

    const parentContext = getCurrentTransactionContext();
    const ownsContext = !parentContext || parentContext.token !== guard.token;
    const context = ownsContext ? { token: guard.token, pendingEvents: [] } : parentContext;

    if (ownsContext) transactionContextStack.push(context);

    try {
        return fn(guard.token);
    } finally {
        if (ownsContext) transactionContextStack.pop();
        guard.release();
        if (ownsContext) flushTransactionEvents(instance, context);
    }
}

function getHolderState(holder: any) {
    let state = holderState.get(holder);
    if (!state) {
        state = {
            inventory: [],
            uidToIndex: new Map(),
            keyToIndexes: new Map(),
            inventoryCapacity: null,
            initialized: false
        };
        holderState.set(holder, state);
    }
    return state;
}

function rebuildHolderIndexes(holder: any) {
    const state = getHolderState(holder);
    const inventory = Array.isArray(state.inventory) ? state.inventory : [];
    const uidToIndex = new Map();
    const keyToIndexes = new Map();

    for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        uidToIndex.set(item.uid, i);
        if (!keyToIndexes.has(item.key)) keyToIndexes.set(item.key, []);
        keyToIndexes.get(item.key).push(i);
    }

    state.uidToIndex = uidToIndex;
    state.keyToIndexes = keyToIndexes;
}

function getPlayerState(player: any) {
    let state = playerState.get(player);
    if (!state) {
        state = {
            inventory: [],
            uidToIndex: new Map(),
            keyToIndexes: new Map(),
            activeUseUids: new Set(),
            inventoryAccessorInstalled: false,
            internalWriteDepth: 0,
            inventoryCapacity: DEFAULT_MAX_INVENTORY_SLOTS,
            bypassCapacity: false
        };
        playerState.set(player, state);
    }
    return state;
}

function rebuildPlayerIndexes(player: any) {
    const state = getPlayerState(player);
    const inventory = Array.isArray(state.inventory) ? state.inventory : [];
    const uidToIndex = new Map();
    const keyToIndexes = new Map();

    for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        uidToIndex.set(item.uid, i);
        if (!keyToIndexes.has(item.key)) keyToIndexes.set(item.key, []);
        keyToIndexes.get(item.key).push(i);
    }

    state.uidToIndex = uidToIndex;
    state.keyToIndexes = keyToIndexes;
}

function findMergeTargetIndex(inventory: InventoryEntry[], itemKey: string, data: any) {
    for (let i = 0; i < inventory.length; i++) {
        const entry = inventory[i];
        if (entry.key === itemKey && deepEqual(entry.data, data)) return i;
    }
    return -1;
}

function canAddAmountToStack(stack: InventoryEntry, amount: number) {
    return !!stack && isPositiveInt(amount) && stack.amount <= MAX_STACK_AMOUNT - amount;
}

function isValidSlotIndex(slot: any) {
    return Number.isInteger(slot) && slot >= 0 && slot < DEFAULT_MAX_INVENTORY_SLOTS;
}

export class InventoryScript extends EventEmitter {
    _items: Record<string, ItemDefinition> = Object.create(null);
    _globalUids: Map<string, any> = new Map();

    addItem(key: string, name: string, description: string, onUse?: ItemDefinition["onUse"], nameFunc?: ItemDefinition["nameFunc"], descFunc?: ItemDefinition["descFunc"]) {
        if (!isSafeItemKey(key)) return null;
        if (typeof name !== "string" || name.length < 1) return null;
        if (typeof description !== "string") return null;
        if (hasOwn(this._items, key)) return null;

        this._items[key] = Object.freeze({ name, description, onUse, nameFunc, descFunc });
        this.emit("itemDefined", key, name, description);
        return this.getItem(key);
    }

    // Template Management
    registerTemplate(template: any) {
        const itemKey = template.key;
        this._items[itemKey] = Object.freeze({
            name: template.name,
            description: template.description,
            weight: template.weight,
            type: template.type,
            metadata: template.metadata,
            onUse: (player: any, uid: string, key: string, data: any) => {
                if (template.type === 3) { // ItemType.CLOTHING
                    this.toggleEquip(player, uid, key, data);
                }
            }
        });
        this.emit("itemDefined", itemKey, template.name, template.description);
    }

    getTemplates() {
        const map = new Map<string, any>();
        for (const key in this._items) {
            map.set(key, { ...this._items[key], key });
        }
        return map;
    }

    toggleEquip(player: any, uid: string, key: string, data: any) {
        const template = this._items[key];
        if (!template || !template.metadata) return;

        const isEquipped = !!data.equipped;
        data.equipped = !isEquipped;

        const { component, drawable, texture, requiredTorso } = template.metadata;

        if (data.equipped) {
            // Equip
            if (component !== undefined) {
                player.setClothes(component, drawable, texture, 0);
            }
            if (requiredTorso !== undefined) {
                player.setClothes(3, requiredTorso, 0, 0);
            }
            player.outputChatBox(`!{green}${template.name} angezogen.`);
        } else {
            // Unequip (Reset to defaults)
            if (component !== undefined) {
                // Default IDs: 15 for most tops/legs is "empty", but 0 is safe for many
                const resetDrawable = (component === 11 || component === 4) ? 15 : 0;
                player.setClothes(component, resetDrawable, 0, 0);
            }
            // Reset Torso to a basic arm ID (usually 15 for males/females)
            if (requiredTorso !== undefined) {
                player.setClothes(3, 15, 0, 0);
            }
            player.outputChatBox(`!{yellow}${template.name} ausgezogen.`);
        }

        // Trigger an inventory update to sync the 'equipped' state to the UI
        player.call("client:inventory:updateEquipState", [uid, data.equipped]);
    }

    useItem(player: any, uid: string) {
        const state = getPlayerState(player);
        const index = state.uidToIndex.get(uid);
        if (index === undefined) return false;

        const item = state.inventory[index];
        const definition = this._items[item.key];
        if (!definition || !definition.onUse) return false;

        definition.onUse(player, item.uid, item.key, item.data, item.amount);
        return true;
    }

    hasItem(key: string) {
        return isSafeItemKey(key) && hasOwn(this._items, key);
    }

    getItem(key: string) {
        return this.hasItem(key) ? this._items[key] : undefined;
    }

    getAllItems() {
        return Object.keys(this._items);
    }

    createItemEntry(itemKey: string, amount = 1, data = undefined, slot = -1): InventoryEntry {
        if (!this.hasItem(itemKey)) throw new Error(`createItemEntry: Unknown item key (${itemKey}).`);
        if (!isPositiveInt(amount) || amount > MAX_STACK_AMOUNT) throw new Error(`createItemEntry: Invalid amount for item (${itemKey}).`);
        return {
            uid: this.generateUniqueUid(),
            key: itemKey,
            amount,
            slot,
            data: cloneData(data)
        };
    }

    generateUniqueUid() {
        let uid;
        do { uid = generateUid(); } while (this._globalUids.has(uid));
        return uid;
    }

    sanitizeInventory(rawInventory: any[], owner: any = null, options: any = undefined) {
        if (!Array.isArray(rawInventory)) return { inventory: [], removed: [] };
        const sanitized: InventoryEntry[] = [];
        const removed: any[] = [];
        const seenUids = new Set<string>();

        for (const rawItem of rawInventory) {
            const result = this._sanitizeInventoryItem(rawItem, seenUids, owner);
            if (result.valid) sanitized.push(result.item);
            else removed.push({ reason: result.reason, item: rawItem });
        }
        return { inventory: sanitized, removed };
    }

    _sanitizeInventoryItem(rawItem: any, seenUids: Set<string>, owner: any = null) {
        if (!isPlainObject(rawItem)) return { valid: false, reason: "not-an-object" };
        const { uid, key, amount, data } = rawItem;

        if (!isValidUid(uid)) return { valid: false, reason: "missing-or-invalid-uid" };
        if (seenUids.has(uid)) return { valid: false, reason: "duplicate-uid-local" };
        if (this._globalUids.has(uid) && this._globalUids.get(uid) !== owner) return { valid: false, reason: "duplicate-uid-global" };
        if (!this.hasItem(key)) return { valid: false, reason: "unknown-item-key" };
        if (!isPositiveInt(amount) || amount > MAX_STACK_AMOUNT) return { valid: false, reason: "invalid-amount" };

        let sanitizedData;
        try { sanitizedData = cloneData(data); } catch (err: any) { return { valid: false, reason: `invalid-data:${err.message}` }; }

        seenUids.add(uid);
        return { valid: true, item: { uid, key, amount, slot: Number(rawItem.slot ?? -1), data: sanitizedData } };
    }

    rebuildOwnerUidRegistry(owner: any, inventory: InventoryEntry[]) {
        this.unregisterOwnerUids(owner);
        for (const item of inventory) this._globalUids.set(item.uid, owner);
    }

    unregisterOwnerUids(owner: any) {
        for (const [uid, currentOwner] of this._globalUids.entries()) {
            if (currentOwner === owner) this._globalUids.delete(uid);
        }
    }

    // High Level API
    giveItem(player: any, itemKey: string, amount = 1, data: any = undefined) {
        if (!this.hasItem(itemKey) || !isPositiveInt(amount)) return false;
        return withTransaction(this, player, () => {
            const state = getPlayerState(player);
            const inventory = state.inventory;
            
            // For clothing, we usually don't want to stack, so we check if it's clothing
            const definition = this._items[itemKey];
            const isStackable = definition ? (definition as any).type !== 3 : true;

            const mergeIndex = isStackable ? findMergeTargetIndex(inventory, itemKey, data) : -1;
            
            if (mergeIndex !== -1 && canAddAmountToStack(inventory[mergeIndex], amount)) {
                inventory[mergeIndex].amount += amount;
                emitInventoryEvent(this, "itemAdded", player, itemKey, amount, cloneData(data), inventory[mergeIndex].uid);
                return inventory[mergeIndex].uid;
            }

            const entry = this.createItemEntry(itemKey, amount, data);
            inventory.push(entry);
            this._globalUids.set(entry.uid, player);
            rebuildPlayerIndexes(player);
            emitInventoryEvent(this, "itemAdded", player, itemKey, amount, cloneData(data), entry.uid);
            return entry.uid;
        });
    }

    moveItem(player: any, uid: string, targetSlot: number) {
        if (!isValidUid(uid) || !isValidSlotIndex(targetSlot)) return false;

        return withTransaction(this, player, () => {
            const state = getPlayerState(player);
            const sourceIndex = state.uidToIndex.get(uid);
            if (sourceIndex === undefined) return false;

            const sourceItem = state.inventory[sourceIndex];
            if (!sourceItem) return false;
            if (sourceItem.slot === targetSlot) return true;

            const targetIndex = state.inventory.findIndex((item) => item.slot === targetSlot);
            if (targetIndex === -1) {
                sourceItem.slot = targetSlot;
                return true;
            }

            const targetItem = state.inventory[targetIndex];
            if (!targetItem) return false;

            const sourceSlot = sourceItem.slot;
            sourceItem.slot = targetSlot;
            targetItem.slot = sourceSlot;
            return true;
        });
    }

    savePlayerInventory(player: any): InventoryEntry[] {
        return cloneInventory(getPlayerState(player).inventory);
    }

    loadPlayerInventory(player: any, inventory: any[]) {
        const { inventory: sanitized } = this.sanitizeInventory(inventory, player);
        const state = getPlayerState(player);
        state.inventory = sanitized;
        this.rebuildOwnerUidRegistry(player, sanitized);
        rebuildPlayerIndexes(player);
        
        // Re-apply visual state for equipped items
        for (const item of sanitized) {
            if (item.data && item.data.equipped) {
                const def = this._items[item.key] as any;
                if (def && def.type === 3 && def.metadata) {
                    const { component, drawable, texture, requiredTorso } = def.metadata;
                    if (component !== undefined) player.setClothes(component, drawable, texture, 0);
                    if (requiredTorso !== undefined) player.setClothes(3, requiredTorso, 0, 0);
                }
            }
        }
    }
}

export const inventoryScript = new InventoryScript();
