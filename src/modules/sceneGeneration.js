/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import { generateEnemy } from './enemyGeneration.js?v=2.0.6';
import { generateRandomItem } from './itemGeneration.js?v=2.0.6';
import { locations, endbosses, weathers, companions } from './gameData.js?v=2.0.6';
import { roundToFull, roundToHalf } from '../main.js?v=2.0.6';

export function generateScenes(currentPlayer = null) {
    let currentCompanion = null;
    const enemyDifficulty = calculateDifficulty(currentPlayer);
    console.log('Enemy Difficulty: ' + enemyDifficulty);
    const count = getRandomNumber(25, 35);

    const scenes = {};

    const difficulties = ["easy", "medium", "hard"];

    let companionsSet = new Set(companions);
    if (currentCompanion) {
        companionsSet.delete(currentCompanion);
    }

    for (let i = 1; i <= count; i++) {
        const location = locations[Math.floor(Math.random() * locations.length)];
        const worthMultiplier = location.worthMultiplier;
        const itemChance = location.itemChance;
        const enemyChance = location.enemyChance;
        let items = [];
        let sceneCompanion = null;
        const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

        let storyAddition = '';

        if (worthMultiplier > 0) {
            items = generateLocationItems(location.maxItemCount, 1);
        }
        const item = Math.random() * 100 <= itemChance ? generateRandomItem() : null;
        const enemy = Math.random() * 100 <= enemyChance ? generateEnemy(enemyDifficulty) : null;

        storyAddition += "The weather is " + weathers[Math.floor(Math.random() * weathers.length)] + ". ";

        const choices = [
            { text: "Continue your Journey", action: "changeScene", targetScene: `scene${i + 1}` },
            { text: "Search for Items", action: "searchItems" },
            { text: "Rest and Recover", action: "recoverHealth" },
        ];
        if (worthMultiplier > 0) {
            choices.push({ text: "Trade", action: "trade" });

            if (worthMultiplier > 0 && Math.random() < 0.5) {
                choices.push({ text: "Play Ten Cards (" + difficulty + ")", action: "tenCards" });
            }

            if (Math.random() < 0.3 && companionsSet.size > 0) {
                const randomCompanionIndex = Math.floor(Math.random() * Array.from(companionsSet).length);
                sceneCompanion = Array.from(companionsSet)[randomCompanionIndex];

                companionsSet.delete(sceneCompanion);
            }
        }

        const cardGoldPool = roundToFull(Math.random() * (200 / worthMultiplier));

        scenes[`scene${i}`] = {
            story: `You find yourself in ${location.name}. ${storyAddition}`,
            locationName: `${location.name}`,
            choices: choices,
            worthMultiplier: worthMultiplier,
            items: items,
            item: item,
            enemy: enemy,
            cardDifficulty: difficulty,
            goldPool: cardGoldPool,
            companion: sceneCompanion,
        };
    }

    const endboss = endbosses[Math.floor(Math.random() * endbosses.length)];

    scenes[`scene1`] = createFirstScene(endboss, count);
    scenes[`scene${count - 1}`] = createForgeScene(endboss, count);
    scenes[`scene${count}`] = createFinalScene(endboss, enemyDifficulty);
    return scenes;
}

function calculateDifficulty(currentPlayer = null, minimumDifficulty = 1.4) {
    if (currentPlayer) {
        let highestAttack = 0;
        let highestDefense = 0;

        const updateValues = (item) => {
            if (item.attack && item.attack > highestAttack) {
                highestAttack = item.attack;
            }
            if (item.defense && item.defense > highestDefense) {
                highestDefense = item.defense;
            }
        };

        if (currentPlayer.equipment) {
            for (const slot in currentPlayer.equipment) {
                const item = currentPlayer.equipment[slot];
                if (item) {
                    updateValues(item);
                }
            }
        }

        if (currentPlayer.inventory) {
            currentPlayer.inventory.forEach(item => {
                updateValues(item);
            });
        }

        let difficulty = (highestAttack + highestDefense) / 50;
        console.log(`Highest atk: ${highestAttack}`);
        console.log(`Highest def: ${highestDefense}`);
        if (difficulty < minimumDifficulty) {
            difficulty = minimumDifficulty;
        }
        return difficulty;
    } else {
        return minimumDifficulty;
    }
}

function createFinalScene(endboss, difficultyModificator) {
    if (difficultyModificator > 1.4) {
        endboss.health = roundToHalf(endboss.health * difficultyModificator);
        endboss.attack = roundToHalf(endboss.attack * difficultyModificator);
        endboss.defense = roundToHalf(endboss.defense * difficultyModificator);
    }

    return {
        story: `You find yourself in the ${endboss.location}... An epic battle awaits you!`,
        locationName: `${endboss.location}`,
        enemy: endboss,
        choices: [
        ],
    };
}

function createForgeScene(endboss, finalSceneCount) {
    return {
        story: `You find yourself in the Forge of Legends. This is your last halt before facing the ${endboss.name}. Make sure to prepare yourself for the final fight.`,
        locationName: `Forge of Legends`,
        enemy: null,
        worthMultiplier: 1,
        items: generateLocationItems(6, 3),
        item: null,
        cardDifficulty: "medium",
        goldPool: roundToFull(Math.random() * (500)),
        choices: [
            { text: `Travel to the ${endboss.location}`, action: "changeScene", targetScene: `scene${finalSceneCount}` },
            { text: "Rest and Recover", action: "recoverHealth" },
            { text: "Forge", action: "forgeLegendary" },
            { text: "Trade", action: "trade" },
            { text: "Play Ten Cards (medium)", action: "tenCards" },
        ],
    };
}

function createFirstScene(endboss, finalSceneCount) {
    return {
        story: `You find yourself in your village. Soon you will leave to go on your adventure and fight evil.`,
        locationName: `Peaceful Village`,
        enemy: null,
        worthMultiplier: 1,
        items: generateLocationItems(2, 0),
        item: null,
        cardDifficulty: "easy",
        goldPool: 15,
        choices: [
            { text: "Leave your Village", action: "changeScene", targetScene: `scene2` },
            { text: `Travel to the ${endboss.location} directly`, action: "changeScene", targetScene: `scene${finalSceneCount}` },
            { text: "Trade", action: "trade" },
            { text: "Play Ten Cards (easy)", action: "tenCards" },
        ],
    };
}

function generateLocationItems(maxItemCount, minConsumablesCount) {
    let itemCount = Math.floor(Math.random() * (maxItemCount - 3 + 1) + 3);
    let items = [];

    for (let i = 0; i < minConsumablesCount; i++) {
        const consumableItem = generateRandomItem("Consumable");
        items.push(consumableItem);
        itemCount--;
    }

    for (let j = 1; j < itemCount; j++) {
        const item = generateRandomItem();
        items.push(item);
    }

    return items;
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}