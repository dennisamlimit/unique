import type { Pool } from "pg";

export enum ItemType {
    NORMAL = 0,
    FOOD = 1,
    WEAPON = 2,
    CLOTHING = 3
}

export interface ItemTemplate {
    key: string;
    name: string;
    description: string;
    weight: number;
    type: ItemType;
    metadata: any;
}

export class ItemTemplateRepository {
    constructor(private pool: Pool) {}

    async getAll(): Promise<ItemTemplate[]> {
        const result = await this.pool.query(
            "SELECT key, name, description, weight, type, metadata FROM item_templates"
        );
        return result.rows.map(row => ({
            key: row.key,
            name: row.name,
            description: row.description,
            weight: Number(row.weight),
            type: Number(row.type),
            metadata: row.metadata
        }));
    }

    async upsert(template: ItemTemplate): Promise<void> {
        await this.pool.query(
            `INSERT INTO item_templates (key, name, description, weight, type, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (key)
             DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, 
                           weight = EXCLUDED.weight, type = EXCLUDED.type, 
                           metadata = EXCLUDED.metadata, created_at = NOW()`,
            [template.key, template.name, template.description, template.weight, template.type, JSON.stringify(template.metadata)]
        );
    }

    async delete(key: string): Promise<void> {
        await this.pool.query("DELETE FROM item_templates WHERE key = $1", [key]);
    }
}
