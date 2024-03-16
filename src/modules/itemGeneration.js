import { sampleItems, startingEquipment, startingItems, endbosses, companions } from './gameData.js?v=2.0.6';
import { roundToHalf, roundToFull } from '../main.js?v=2.0.6';

const commonVerbs = ["Old", "Used", "Shabby", "Tattered"];
const verbs = ["Sturdy", "Shiny", "Mighty", "Enchanted", "Cursed", "Ancient", "Mystical", "Elegant", "Rugged", "Exquisite", "Durable", "Delicate", "Adorned", "Simple", "Intricate", "Robust"];
const modifiers = ["of Power", "of Agility", "of Wisdom", "of Strength", "of Vitality", "of Fortitude", "of the Underworld", "of Dexterity", "of Intelligence", "of Endurance", "of Speed", "of the Bear", "of the Dragon", "of the Owl", "of the Wolf", "of the Eagle", "of the Serpent"];

export function generateRandomItem(itemType) {
    const itemsToChooseFrom = itemType
        ? sampleItems.filter((item) => item.slot === itemType)
        : sampleItems;

    const randomIndex = Math.floor(Math.random() * itemsToChooseFrom.length);
    const baseItem = itemsToChooseFrom[randomIndex];
    const newItem = JSON.parse(JSON.stringify(baseItem));


    switch (newItem.rarity) {
        case "legendary":
            newItem.name = "Legendary " + newItem.name;
            break;
        default:
            if (newItem.rarity == "common" && Math.random() < 0.5) {
                let randomVerb = commonVerbs[Math.floor(Math.random() * commonVerbs.length)];
                if (newItem.slot != "Consumable" && Math.random() < 0.05) {
                    randomVerb = "Collectible";
                    newItem.value = roundToFull(newItem.value * 10);
                    newItem.attack = 0;
                    newItem.defense = 0;
                    newItem.rarity = "legendary"
                }
                else {
                    newItem.value = Math.ceil(newItem.value / 2);
                    newItem.attack = roundToFull(newItem.attack * Math.random());
                    newItem.defense = roundToFull(newItem.defense * Math.random());
                }

                newItem.name = randomVerb + " " + newItem.name;
            }
            else if (Math.random() < 0.6) {
                const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
                let randomModifier = "";
                let modifierValue = 2;
                if (Math.random() < 0.24 && newItem.slot != 'Consumable') {
                    randomModifier = " " + modifiers[Math.floor(Math.random() * modifiers.length)];
                    modifierValue = 4;
                }
                newItem.name = randomVerb + " " + newItem.name + randomModifier;
                newItem.value = roundToFull(newItem.value * 2);
                newItem.attack = roundToFull(newItem.attack * modifierValue * Math.random());
                newItem.defense = roundToFull(newItem.defense * modifierValue * Math.random());
            }
            break;
    }

    return newItem;
}

export function calculateItemVariations() {
    const numBaseItems = sampleItems.length + Object.keys(startingEquipment).length + startingItems.length;
    const numEndbossDrops = endbosses.length * 7;
    const numCompanions = companions.length;
    let totalVariations = 0;

    sampleItems.forEach(item => {
        let variations = 1; // Count the item itself

        if (item.rarity === "common") {
            // Add variations for common items
            variations += commonVerbs.length;
            // Chance of becoming a collectible
            variations += 1;
        } else if (item.rarity !== "legendary") {
            // Add variations for verbs and modifiers
            variations += verbs.length * (modifiers.length + 1); // +1 for no modifier
        }
        if (item.rarity === "legendary") {
            // Legendary might have a fixed prefix but could still have verb and modifier variations
            variations += verbs.length * (modifiers.length + 1); // +1 for no modifier
        }

        totalVariations += variations;
    });

    return {
        numBaseItems: numBaseItems,
        totalVariations: totalVariations,
        numEndbossDrops: numEndbossDrops,
        numCompanions: numCompanions
    };
}
