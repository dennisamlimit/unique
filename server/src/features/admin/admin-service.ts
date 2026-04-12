import type { Pool } from "pg";

export interface CommandDefinition {
    commandId: string;
    usage: string;
    description: string;
    category: string;
    defaultLevel: number;
    aliases?: string[];
    handler: (player: any, parts: string[], args: string) => Promise<boolean | void>;
}

export interface DynamicCommand {
    commandId: string;
    requiredLevel: number;
    usage: string;
    description: string;
    category: string;
    aliases: string[];
}

export class AdminService {
    private commands: Map<string, CommandDefinition> = new Map();
    private aliasMap: Map<string, string> = new Map();
    private dynamicLevels: Map<string, number> = new Map();

    constructor(private db: Pool) {}

    register(def: CommandDefinition) {
        this.commands.set(def.commandId, def);
        this.aliasMap.set(def.commandId, def.commandId);
        if (def.aliases) {
            for (const alias of def.aliases) {
                this.aliasMap.set(alias.toLowerCase(), def.commandId);
            }
        }
    }

    async syncPermissions() {
        // Fetch all current levels from DB
        const result = await this.db.query("SELECT * FROM command_permissions");
        for (const row of result.rows) {
            this.dynamicLevels.set(row.command_id, row.required_level);
        }

        // Seed or update missing commands
        for (const [id, def] of this.commands) {
            if (!this.dynamicLevels.has(id)) {
                await this.db.query(
                    "INSERT INTO command_permissions (command_id, required_level, usage_label, description, category) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
                    [id, def.defaultLevel, def.usage, def.description, def.category]
                );
                this.dynamicLevels.set(id, def.defaultLevel);
            } else {
                // Update label/description in DB to match latest code
                await this.db.query(
                    "UPDATE command_permissions SET usage_label = $1, description = $2, category = $3 WHERE command_id = $4",
                    [def.usage, def.description, def.category, id]
                );
            }

            // Sync aliases
            await this.db.query("DELETE FROM command_aliases WHERE command_id = $1", [id]);
            if (def.aliases) {
                for (const alias of def.aliases) {
                    await this.db.query("INSERT INTO command_aliases (alias, command_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [alias.toLowerCase(), id]);
                }
            }
        }
    }

    async setCommandLevel(adminAccountId: number, commandId: string, level: number): Promise<boolean> {
        if (!this.commands.has(commandId)) return false;

        await this.db.query("UPDATE command_permissions SET required_level = $1 WHERE command_id = $2", [level, commandId]);
        this.dynamicLevels.set(commandId, level);

        // Log the change
        await this.logAction(adminAccountId, "SET_COMMAND_LEVEL", commandId, `Level fuer ${commandId} auf ${level} gesetzt.`);
        
        return true;
    }

    async logAction(adminAccountId: number, type: string, targetId: string | null, details: string) {
        await this.db.query(
            "INSERT INTO admin_logs (admin_account_id, action_type, target_id, details) VALUES ($1, $2, $3, $4)",
            [adminAccountId, type, targetId, details]
        );
    }

    async getAllCommands(): Promise<DynamicCommand[]> {
        const result = await this.db.query(`
            SELECT p.*, ARRAY_AGG(a.alias) FILTER (WHERE a.alias IS NOT NULL) as aliases
            FROM command_permissions p
            LEFT JOIN command_aliases a ON a.command_id = p.command_id
            GROUP BY p.command_id
        `);

        return result.rows.map(row => ({
            commandId: row.command_id,
            requiredLevel: row.required_level,
            usage: row.usage_label,
            description: row.description,
            category: row.category,
            aliases: row.aliases || []
        }));
    }

    async getCommandLogs(limit: number = 50) {
        const result = await this.db.query(`
            SELECT l.*, a.first_name, a.last_name
            FROM admin_logs l
            JOIN accounts a ON a.account_id = l.admin_account_id
            ORDER BY l.created_at DESC
            LIMIT $1
        `, [limit]);
        return result.rows;
    }

    async execute(player: any, chatText: string, adminLevel: number): Promise<boolean> {
        const parts = chatText.slice(1).split(/\s+/).filter(Boolean);
        const input = parts[0]?.toLowerCase() ?? "";
        
        const commandId = this.aliasMap.get(input);
        if (!commandId) return false;

        const def = this.commands.get(commandId);
        if (!def) return false;

        const reqLevel = this.dynamicLevels.get(commandId) ?? def.defaultLevel;
        if (adminLevel < reqLevel) {
            player.notify(`~r~Dafuer benoetigst du Admin-Level ${reqLevel}.`);
            return true; // Command matched but denied
        }

        const args = parts.length > 1 ? parts.slice(1).join(" ") : "";
        await def.handler(player, parts, args);
        return true;
    }
}
