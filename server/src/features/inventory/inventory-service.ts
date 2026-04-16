import { inventoryScript } from "./inventory-core.js";
import type { InventoryRepository } from "./inventory-repository.js";
import { getVar } from "../../runtime/helpers.js";

export class InventoryService {
    private characterToInventory = new Map<number, any>();

    constructor(private repository: InventoryRepository) {
        console.log("[InventoryService] Initialized.");
        this.registerDefaultItems();
    }

    private registerDefaultItems() {
        // Starter items for verification
        inventoryScript.addItem("burger", "Burger", "Ein saftiger Cheeseburger.");
        inventoryScript.addItem("water", "Wasser", "0.5L Mineralwasser.");
        inventoryScript.addItem("phone", "Smartphone", "Ein modernes Smartphone.");
        
        console.log("[InventoryService] Default items registered.");
    }

    async loadPlayerInventory(player: any, characterId: number) {
        try {
            const data = await this.repository.getByCharacterId(characterId);
            inventoryScript.loadPlayerInventory(player, data);
            console.log(`[InventoryService] Loaded inventory for Character ${characterId} / Player ${player.name}`);
        } catch (error) {
            console.error(`[InventoryService] Failed to load inventory for Character ${characterId}:`, error);
        }
    }

    async savePlayerInventory(player: any) {
        const charId = Number(getVar(player, "CHARACTER_ID", 0));
        if (charId <= 0) return;

        try {
            const data = inventoryScript.savePlayerInventory(player);
            await this.repository.upsert(charId, data);
            console.log(`[InventoryService] Saved inventory for Character ${charId}`);
        } catch (error) {
            console.error(`[InventoryService] Failed to save inventory for Character ${charId}:`, error);
        }
    }

    async addItem(player: any, itemKey: string, amount = 1, data: any = {}) {
        return inventoryScript.giveItem(player, itemKey, amount, data);
    }

    // Unregister UIDs on disconnect to prevent memory leaks
    cleanupPlayer(player: any) {
        inventoryScript.unregisterOwnerUids(player);
    }
}
