import bestTorsoMale from './data/best-torso/male.json';
import bestTorsoFemale from './data/best-torso/female.json';

// Import clothing name JSONs (Partial list or all?)
// To keep the library functional, I'll provide a lookup based on sex and component.
// We can lazy load or just bundle them. For now, let's bundle the essentials.

const torsoMappings: Record<number, any> = {
    0: bestTorsoFemale, // sex 0 = female in RAGE? No, usually 1=male, 0=female or vice versa.
    1: bestTorsoMale    // GTA: Male = 1885233650 (mp_m_freemode_01), Female = -1667301413 (mp_f_freemode_01)
};

export class ClothingLib {
    /**
     * Get the best torso (drawable ID) for a given top (drawable ID)
     * @param sex 0 for female, 1 for male
     * @param topDrawable The drawable ID of the top (Component 11)
     */
    static getBestTorso(sex: number, topDrawable: number): number {
        const mapping = torsoMappings[sex];
        if (!mapping) return 0;
        
        // The JSON keys are strings of the top drawable ID
        const bestTorso = mapping[String(topDrawable)];
        return bestTorso !== undefined ? Number(bestTorso) : 15; // 15 is standard empty torso?
    }

    /**
     * Get the human-readable name of a clothing item
     * Note: This requires the corresponding JSON to be loaded.
     * I will implement a dynamic lookup system here.
     */
    static async getClothingName(sex: number, componentId: number, drawableId: number): Promise<string> {
        // sex: 0=female, 1=male
        // componentId mapping:
        // 1: masks, 3: torsos, 4: legs, 6: shoes, 7: accessories, 8: undershirts, 11: tops...
        
        const typePrefix = sex === 0 ? 'female' : 'male';
        let fileName = '';
        
        switch (componentId) {
            case 1: fileName = 'masks'; break;
            case 4: fileName = `${typePrefix}_legs`; break;
            case 6: fileName = `${typePrefix}_shoes`; break;
            case 11: fileName = `${typePrefix}_tops`; break;
            case 8: fileName = `${typePrefix}_undershirts`; break;
            case 7: fileName = `${typePrefix}_accessories`; break;
            case 3: fileName = `${typePrefix}_torsos`; break;
            default: return `Item #${drawableId}`;
        }

        try {
            // Dynamic import for the specific category
            const data = await import(`./data/clothing/${fileName}.json`);
            return data.default[String(drawableId)] || `Item #${drawableId}`;
        } catch (error) {
            return `Item #${drawableId}`;
        }
    }
}
