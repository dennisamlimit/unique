import type { Pool } from "pg";
import type { InventoryEntry } from "./inventory-core.js";

export class InventoryRepository {
    constructor(private pool: Pool) {}

    async getByCharacterId(characterId: number): Promise<InventoryEntry[]> {
        const result = await this.pool.query(
            "SELECT inventory_data FROM character_inventories WHERE character_id = $1",
            [characterId]
        );

        if (result.rowCount === 0) {
            return [];
        }

        return result.rows[0].inventory_data || [];
    }

    async upsert(characterId: number, inventoryData: InventoryEntry[]): Promise<void> {
        await this.pool.query(
            `INSERT INTO character_inventories (character_id, inventory_data, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (character_id)
             DO UPDATE SET inventory_data = EXCLUDED.inventory_data, updated_at = NOW()`,
            [characterId, JSON.stringify(inventoryData)]
        );
    }

    async delete(characterId: number): Promise<void> {
        await this.pool.query("DELETE FROM character_inventories WHERE character_id = $1", [characterId]);
    }
}
