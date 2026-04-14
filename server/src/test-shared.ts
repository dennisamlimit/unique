import { WeaponLib } from '@shared/weapon-lib';
import { ClothingLib } from '@shared/clothing-lib';

async function test() {
    console.log("--- Shared Lib Test ---");
    
    // Test Weapon
    const pistol = WeaponLib.getWeapon('453432606'); // Pistol
    console.log(`Weapon: ${pistol?.Name || 'Not found'}`);
    
    // Test Torso
    const bestTorso = ClothingLib.getBestTorso(1, 1); // Male, Top 1
    console.log(`Best Torso for Top 1: ${bestTorso}`);
    
    // Test Name
    const name = await ClothingLib.getClothingName(1, 11, 1); // Male, Top 1
    console.log(`Clothing Name (Male Top 1): ${name}`);
}

test();
