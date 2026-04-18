import { inventoryScript, type InventoryEntry } from "./inventory-core.js";
import type { InventoryRepository } from "./inventory-repository.js";
import { ItemTemplateRepository, type ItemTemplate, ItemType } from "./item-template-repository.js";
import { getVar } from "../../runtime/helpers.js";

export class InventoryService {
    constructor(
        private repository: InventoryRepository,
        private templateRepository: ItemTemplateRepository
    ) {
        console.log("[unique][Inventory] SERVICE INITIALIZING (v2.2 Debug-Logs active)...");
        this.registerEvents();
        this.registerAdminCommands();
    }

    public async loadTemplates() {
        try {
            const templates = await this.templateRepository.getAll();
            for (const t of templates) {
                inventoryScript.registerTemplate(t);
            }
        } catch (error) {
            console.error("[InventoryService] Failed to load item templates:", error);
        }
    }

    private registerEvents() {
        mp.events.add("server:inventory:requestUpdate", (player: any) => {
            this.broadcastUpdate(player);
        });

        mp.events.add("server:inventory:useItem", (player: any, uid: string) => {
            if (typeof uid !== "string" || uid.length === 0) return;
            console.log(`[unique][Inventory] server:inventory:useItem from ${player.name} for UID: ${uid}`);

            const used = inventoryScript.useItem(player, uid);
            if (used) {
                console.log(`[unique][Inventory] Item ${uid} used (used=true), calling save...`);
                this.broadcastUpdate(player);
                void this.savePlayerInventory(player);
            } else {
                console.warn(`[unique][Inventory] Item ${uid} used (used=false) - item not found or onUse check failed.`);
            }
        });

        mp.events.add("server:inventory:moveItem", (player: any, uid: string, targetSlot: number) => {
            if (typeof uid !== "string" || uid.length === 0 || !Number.isInteger(targetSlot)) return;
            console.log(`[InventoryService] Event server:inventory:moveItem received from ${player.name} for item ${uid} to slot ${targetSlot}`);

            const moved = inventoryScript.moveItem(player, uid, targetSlot);
            if (moved) {
                console.log(`[InventoryService] Item ${uid} moved successfully, triggering save...`);
                this.broadcastUpdate(player);
                void this.savePlayerInventory(player);
            }
        });
    }

    private registerAdminCommands() {
        // Command to create a basic template
        // /item:template [key] [name] [weight] [type] [description]
        mp.events.addCommand("item:template", (player: any, fullText: string, key: string, name: string, weightStr: string, typeStr: string, ...descParts: string[]) => {
            const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
            if (adminLevel < 10) return player.outputChatBox("!{red}Zugriff verweigert (Admin Level 10 erforderlich).");

            if (!key || !name || !weightStr || !typeStr) {
                return player.outputChatBox("!{yellow}Benutzung: /item:template [key] [name] [weight] [type] [description]");
            }

            const template: ItemTemplate = {
                key,
                name,
                weight: parseFloat(weightStr),
                type: parseInt(typeStr) as ItemType,
                description: descParts.join(" ") || "",
                metadata: {}
            };

            void this.templateRepository.upsert(template).then(() => {
                inventoryScript.registerTemplate(template);
                player.outputChatBox(`!{green}Item Template '${key}' erfolgreich erstellt/aktualisiert.`);
            });
        });

        // Command to configure clothing metadata
        // /item:cloth [key] [component] [drawable] [texture] [torso]
        mp.events.addCommand("item:cloth", (player: any, fullText: string, key: string, compStr: string, drawStr: string, texStr: string, torsoStr: string) => {
            const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
            if (adminLevel < 10) return player.outputChatBox("!{red}Zugriff verweigert.");

            if (!key || !compStr || !drawStr || !texStr) {
                return player.outputChatBox("!{yellow}Benutzung: /item:cloth [key] [component] [drawable] [texture] [optional:torso]");
            }

            const templates = inventoryScript.getTemplates();
            const existing = templates.get(key);
            if (!existing) return player.outputChatBox("!{red}Item Template nicht gefunden.");

            existing.type = ItemType.CLOTHING;
            existing.metadata = {
                ...existing.metadata,
                component: parseInt(compStr),
                drawable: parseInt(drawStr),
                texture: parseInt(texStr),
                requiredTorso: torsoStr ? parseInt(torsoStr) : undefined
            };

            void this.templateRepository.upsert(existing).then(() => {
                inventoryScript.registerTemplate(existing);
                player.outputChatBox(`!{green}Kleidungs-Daten für '${key}' aktualisiert.`);
            });
        });

        // Test command to give item
        mp.events.addCommand("item:give", (player: any, _, targetId: string, key: string, amount: string) => {
            const adminLevel = Number(getVar(player, "ADMIN_LEVEL", 0));
            if (adminLevel < 10) return;

            const target = mp.players.at(parseInt(targetId));
            if (!target) return player.outputChatBox("Spieler nicht gefunden.");

            this.addItem(target, key, parseInt(amount) || 1);
            player.outputChatBox(`Item ${key} an ${target.name} gegeben.`);
        });
    }

    async loadPlayerInventory(player: any, characterId: number) {
        try {
            console.log(`[unique][Inventory] Loading inventory for Character ${characterId}...`);
            const data = await this.repository.getByCharacterId(characterId);
            inventoryScript.loadPlayerInventory(player, data);
            
            const equippedCount = data.filter(i => i.data && i.data.equipped).length;
            console.log(`[unique][Inventory] SUCCESS: Loaded ${data.length} items for Char ${characterId} (${equippedCount} equipped).`);
        } catch (error) {
            console.error(`[unique][Inventory] EXCEPTION Loading inventory for Char ${characterId}:`, error);
        }
    }

    async savePlayerInventory(player: any) {
        const charIdRaw = getVar(player, "CHARACTER_ID", 0);
        const charId = Number(charIdRaw);
        
        if (charId <= 0) {
            console.warn(`[unique][Inventory] SKIPPING SAVE: Invalid CHARACTER_ID for ${player.name}.`);
            return;
        }

        try {
            const data = inventoryScript.savePlayerInventory(player);
            console.log(`[unique][Inventory] Saving to DB for Character ${charId} (${data.length} items)...`);
            await this.repository.upsert(charId, data);
            
            const equippedCount = data.filter(i => i.data && i.data.equipped).length;
            console.log(`[unique][Inventory] PERSISTED: Character ${charId}: ${data.length} used, ${equippedCount} equipped.`);
        } catch (error) {
            console.error(`[unique][Inventory] EXCEPTION saving Character ${charId}:`, error);
        }
    }

    reapplyEquippedItems(player: any) {
        inventoryScript.reapplyEquippedItems(player);
    }

    async addItem(player: any, itemKey: string, amount = 1, data: any = {}) {
        const res = inventoryScript.giveItem(player, itemKey, amount, data);
        if (res) this.broadcastUpdate(player);
        return res;
    }

    private serializeInventoryForClient(inventory: InventoryEntry[]) {
        const templates = inventoryScript.getTemplates();

        return inventory.map((item) => {
            const template = templates.get(item.key);
            const templateMeta = template?.metadata && typeof template.metadata === "object" ? template.metadata : {};
            const itemData = item.data && typeof item.data === "object" ? item.data : {};

            return {
                ...item,
                displayName: template?.name || item.key,
                description: template?.description || "",
                data: {
                    ...templateMeta,
                    ...itemData,
                    categoryIcon: itemData.categoryIcon || templateMeta.categoryIcon,
                    weight: Number(itemData.weight ?? template?.weight ?? 0),
                    uiIcon: itemData.uiIcon || this.getUiIcon(templateMeta)
                }
            };
        });
    }

    private getUiIcon(metadata: any) {
        const component = Number(metadata?.component ?? -1);
        switch (component) {
            case 1:
                return "mask";
            case 4:
                return "legs";
            case 6:
                return "shoes";
            case 11:
                return "top";
            default:
                return "item";
        }
    }

    broadcastUpdate(player: any) {
        const inventory = this.serializeInventoryForClient(inventoryScript.savePlayerInventory(player));
        player.call("client:inventory:update", [JSON.stringify({ 
            inventory,
            name: `${player.name}`,
        })]);
    }

    cleanupPlayer(player: any) {
        inventoryScript.unregisterOwnerUids(player);
    }
}
