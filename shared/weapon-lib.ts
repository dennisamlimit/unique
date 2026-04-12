import { WeaponData } from './weapon-types';
import weaponsJson from './data/weapons.json';

const weapons = weaponsJson as unknown as Record<string, WeaponData>;

export class WeaponLib {
    /**
     * Get weapon data by its hash (decimal or string)
     */
    static getWeapon(hash: number | string): WeaponData | undefined {
        return weapons[String(hash)];
    }

    /**
     * Get weapon data by its internal name (HashKey)
     */
    static getWeaponByKey(key: string): WeaponData | undefined {
        return Object.values(weapons).find(w => w.HashKey === key);
    }

    /**
     * Get all weapons in a specific group (e.g., GROUP_PISTOL)
     */
    static getGroupWeapons(group: string): WeaponData[] {
        return Object.values(weapons).filter(w => w.Group === group);
    }

    /**
     * Returns all weapons
     */
    static getAllWeapons(): WeaponData[] {
        return Object.values(weapons);
    }
}
