/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import GameState from './gameState.js?v=2.0.6';
import Combat from './combat.js?v=2.0.6';
import Enemy from './enemyGeneration.js?v=2.0.6';
import { generateRandomItem } from './itemGeneration.js?v=2.0.6';
import PopupManager from './popupManager.js?v=2.0.6';
import { generateScenes } from './sceneGeneration.js?v=2.0.6';
import { CardsGame } from './cards.js?v=2.0.6';
import { roundToHalf, roundToFull, alertPopup } from '../main.js?v=2.0.6';
import { startingItems, startingEquipment } from "./gameData.js?v=2.0.6";

export default class Game {
    constructor() {
        const gameStateInstance = new GameState(generateScenes());
        this.gameState = gameStateInstance;

        if (!this.gameState.scenes || !this.gameState.scenes.start) {
            console.warn("Damaged game state detected, creating a new game state.");
            this.gameState = new GameState(generateScenes(), false);
        }

        this.popupManager = new PopupManager();
    }

    setGameUI(gameUI) {
        this.gameUI = gameUI;
    }

    async play() {
        if (this.gameState.player.health <= 0 || (this.gameState.currentScene === this.gameState.getLastSceneKey() && !this.gameState.getLastScene().enemy)) {
            this.gameUI.displayStartNewGameButton();
        }
        else {
            await this.gameUI.displayScene(this.gameState.currentScene, false);
        }

        await this.gameUI.updateCharacterInfo();
        this.loadLog();
    }

    async setPlayerName(playerName) {
        this.gameState.player.name = playerName;
        if (this.gameState.player.name && this.gameState.player.name.length > 0 && this.gameState.player.class.length > 0) {
            const startAdventureButton = document.getElementById("start-adventure-button");
            if (startAdventureButton) {
                startAdventureButton.disabled = false;
            }
        } else {
            const startAdventureButton = document.getElementById("start-adventure-button");
            if (startAdventureButton) {
                startAdventureButton.disabled = true;
            }
        }
        this.gameUI.updateCharacterInfo();
        await this.gameUI.appendToLog("It is time to start your adventure, " + this.gameState.player.name + "! The " + this.gameState.getLastScene().enemy.name + " is preparing to take over the world. You have to travel to the " + this.gameState.getLastScene().enemy.location + " of the " + this.gameState.getLastScene().enemy.name + ". Make sure that you are well equipped when arriving at the " + this.gameState.getLastScene().enemy.location + ".");
    }

    loadLog() {
        const logList = document.getElementById("logList");
        logList.innerHTML = '';
        this.gameState.log.forEach((message, index) => {
            if (index === 0 && this.gameState.currentScene !== "start") {
                return;
            }
            const logEntry = document.createElement("li");
            logEntry.textContent = message;
            logList.appendChild(logEntry);
        });
        logList.scrollTop = logList.scrollHeight;
    }

    resetGame(forceReset = true) {
        if (forceReset) {
            localStorage.removeItem("gameState");
            this.gameState = this.gameState.newGameState();
            setTimeout(() => {
                location.reload();
            }, 100);
        }
    }

    downloadSave() {
        const gameStateJSON = JSON.stringify(this.gameState);
        const blob = new Blob([gameStateJSON], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "TimelessTales-" + this.gameState.player.name + ".save";
        link.click();
        URL.revokeObjectURL(url);
    }

    uploadSave() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".save";
        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedGameState = JSON.parse(event.target.result);
                    const gameStateInstance = new GameState();
                    this.gameState = gameStateInstance.mergeGameState(loadedGameState);
                    localStorage.setItem("gameState", JSON.stringify(this.gameState));
                    this.play();
                    alertPopup("Save game loaded successfully!");
                } catch (error) {
                    alertPopup("Invalid save game file: " + error);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async handleChoice(choice) {
        if (this.gameState.currentScene === this.gameState.getLastSceneKey() && choice.action === "flee") {
            await this.gameUI.appendToLog("You cannot flee from this battle! If you don't stop the " + this.gameState.getLastScene().enemy.name + " now, he will take over the world.");
            return;
        }

        if (choice.action === 'changeScene') {
            if (this.gameState.player.name) {
                this.gameState.currentScene = choice.targetScene;
                await this.handleCompanion();
                await this.gameUI.displayScene(choice.targetScene);
            } else {
                alertPopup("Please enter your character's name before starting the adventure.");
                return;
            }
        }
        else if (choice.action === 'setName') {
            const nameInput = document.getElementById('playerNameInput');
            if (this.gameState.player.name != '' && nameInput) {
                nameInput.value = this.gameState.player.name;
            }
            this.popupManager.openPopup("playerNameModal");
        }
        else if (choice.action === 'recoverHealth') {
            const oldHealth = this.gameState.player.health;
            this.gameState.player.health += 10;
            if (this.gameState.player.health > 100) {
                this.gameState.player.health = 100;
            }
            await this.gameUI.appendToLog(`You rest and recover ${this.gameState.player.health - oldHealth} health.`);
            this.gameUI.updateCharacterInfo();

            if (!this.gameState.banditAttackedLocation[this.gameState.currentScene]) {
                const equipmentValue = this.gameState.player.inventory.reduce((total, item) => {
                    return total + item.value;
                }, 0);
                const recoveryCount = this.gameState.recoveries[this.gameState.currentScene] || 0;
                const baseChance = 0;
                let chanceIncrease = equipmentValue / 10000 + recoveryCount * 0.1;
                const banditChance = baseChance + chanceIncrease;
                chanceIncrease *= 10;
                if (banditChance > 0.3) {
                    await this.gameUI.appendToLog(`A bandit attack seems to be really likely.`);
                }
                if (Math.random() < banditChance) {
                    //await this.gameUI.appendToLog("A bandit appears and is threatening you.")
                    const bandits = new Enemy("Bandit", roundToHalf(5 * chanceIncrease), roundToHalf(3 * chanceIncrease), roundToHalf(2 * chanceIncrease), roundToHalf(80 + chanceIncrease));
                    getCurrentScene(this.gameState).enemy = bandits;
                    this.gameState.banditAttackedLocation[this.gameState.currentScene] = true;
                    await this.gameUI.displayScene(this.gameState.currentScene);
                }
                this.gameState.recoveries[this.gameState.currentScene] = recoveryCount + 1;
            }
        }
        else if (choice.action === 'searchItems') {
            if (!this.gameState.searchedForItem[this.gameState.currentScene]) {
                if (getCurrentScene(this.gameState).item) {
                    await this.gameUI.appendToLog(`Found ${getCurrentScene(this.gameState).item.name} while searching.`);
                    const item = getCurrentScene(this.gameState).item;
                    delete getCurrentScene(this.gameState).item;
                    this.gameState.player.inventory.push(item);
                    this.gameUI.updateInventory();
                } else {
                    await this.gameUI.appendToLog("You didn't find anything.");
                }
                this.gameState.searchedForItem[this.gameState.currentScene] = true;
            } else {
                await this.gameUI.appendToLog("You've already searched here.");
            }
        }
        else if (choice.action === 'trade') {
            this.trade();
        }
        else if (choice.action === 'tenCards') {
            this.cardsGame = new CardsGame(getCurrentScene(this.gameState).cardDifficulty, this);
            window.cardsGame = this.cardsGame;
        }
        else if (choice.action === 'forgeLegendary') {
            this.popupManager.openPopup("inventoryPopup");
            this.gameUI.updateInventoryPopup("forgeLegendary");
        }
        else if (choice.action === 'hireCompanion') {
            this.gameUI.openCompanionPopup();
        }
        else if (choice.action === 'attackEnemy') {
            this.attackEnemy();
        }
        else if (choice.action === 'flee') {
            this.flee();
        }
        await this.gameState.save();
    }

    trade() {
        this.gameUI.updateTradePopup();
        this.popupManager.openPopup("tradePopup");
    }

    buyItem(item, price) {
        if (this.gameState.player.gold >= price) {
            this.gameState.player.gold -= price;
            this.gameState.player.inventory.push(item);

            const currentScene = getCurrentScene(this.gameState);
            const itemIndex = currentScene.items.indexOf(item);
            if (itemIndex > -1) {
                currentScene.items.splice(itemIndex, 1);
            }

            this.gameUI.updateTradePopup();
            this.gameUI.updateInventory();
            this.gameUI.updatePlayerStats();
        }
    }

    sellItem(item, price) {
        this.gameState.player.gold += price;

        const itemIndex = this.gameState.player.inventory.indexOf(item);
        if (itemIndex > -1) {
            this.gameState.player.inventory.splice(itemIndex, 1);
        }

        const currentScene = getCurrentScene(this.gameState);
        if (currentScene.items) {
            currentScene.items.push(item);
        } else {
            currentScene.items = [item];
        }

        this.gameUI.updateTradePopup();
        this.gameUI.updateInventory();
        this.gameUI.updatePlayerStats();
    }

    makeLegendary(item) {
        if (this.gameState.player.gold > 1000) {
            if (item.name === "Lunalia of Ewunia") {
                item.name = "Enlightened Lunalia of Ewunia"
            }
            else if (item.slot === "Companion") {
                item.name = "Experienced " + item.name;
            }
            else {
                item.name += " of " + this.gameState.player.name;
            }
            item.attack = roundToFull(item.attack * 1.5);
            item.defense = roundToFull(item.defense * 1.5);
            item.value = roundToFull(item.value * 1.5);
            item.rarity = "legendary";
            this.gameState.player.gold -= 1000;
        }
        this.gameUI.updateCharacterInfo();
        this.gameUI.updateInventoryPopup("forgeLegendary");
    }

    async attackEnemy() {
        const combat = new Combat(this.gameState.player, getCurrentScene(this.gameState).enemy, await this.gameUI.appendToLog.bind(this.gameUI));

        let enemyAttackedFirst = false;
        if (this.gameState.getWeight() > combat.enemy.weight) {
            enemyAttackedFirst = true;
            await this.gameUI.appendToLog(`The ${combat.enemy.name} is faster than you and strikes first.`);
            await this.enemyAttack(combat);
            while (this.gameUI.processingQueue) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            //this.gameUI.updateCharacterInfo();
        }

        if (combat.isPlayerDead() === false) {
            const playerDamage = await combat.playerAttack();
            while (this.gameUI.processingQueue) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await this.gameUI.appendToLog(`You dealt ${playerDamage} damage to the enemy.`);
            while (this.gameUI.processingQueue) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.gameUI.updateEnemyInfo(combat.enemy);

            if (combat.isEnemyDead()) {
                await this.handleEnemyDefeat(combat);
            } else {
                if (!enemyAttackedFirst) {
                    await this.enemyAttack(combat);
                }
            }

            this.gameState.save();
        }

        //this.gameUI.updateCharacterInfo();
    }

    async playerDies(combat) {
        await this.gameUI.appendToLog(`You have been defeated by the ${combat.enemy.name}.`);
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.endGame(this.gameState.getLastScene().enemy.name);
    }

    async enemyAttack(combat) {
        const enemyDamage = await combat.enemyAttack();
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (enemyDamage > 0) {
            await this.gameUI.appendToLog(`The enemy dealt ${enemyDamage} damage to you.`);
        }
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.gameUI.updateCharacterInfo();
        //this.gameUI.updateEnemyInfo(combat.enemy);

        if (combat.isPlayerDead()) {
            this.playerDies(combat);
        }
    }

    async handleEnemyDefeat(combat) {
        await this.gameUI.appendToLog(`You defeated the ${combat.enemy.name}!`);
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const currentScene = getCurrentScene(this.gameState);
        const itemDropChance = Math.random();
        let item = null;
        let dropText = '';
        if (combat.enemy.drop) {
            item = combat.enemy.drop;
            dropText = `The ${combat.enemy.name} dropped the legendary ${item.name}.`;
        } else if (itemDropChance < 0.64) {
            item = generateRandomItem();
            dropText = `The ${combat.enemy.name} dropped ${item.name}.`;
        }
        if (item) {
            this.gameState.player.inventory.push(item);
            this.gameUI.updateInventory();
            await this.gameUI.appendToLog(dropText);
        }
        if (currentScene.worthMultiplier > 0) {
            const goldValue = currentScene.worthMultiplier * combat.enemy.attack;
            const gold = roundToHalf(goldValue);
            await this.gameUI.appendToLog("The people thank you for defeating the " + combat.enemy.name + " and hand you over " + gold + " Gold as a reward.");
            while (this.gameUI.processingQueue) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.gameState.player.gold += gold;
            this.gameUI.updatePlayerStats();
        }

        const enemyName = currentScene.enemy.name;

        currentScene.enemy = null;
        this.gameUI.updateEnemyInfo(null);
        this.gameUI.displayScene(this.gameState.currentScene, false);

        if (this.gameState.currentScene === this.gameState.getLastSceneKey()) {
            await this.winGame(enemyName);
        }

    }

    async flee() {
        this.gameState.currentScene = this.gameState.getNextSceneKey();
        await this.gameUI.appendToLog(`You fled!`);
        this.gameUI.displayScene(this.gameState.currentScene);
    }

    async endGame(enemyName) {
        await this.gameUI.appendToLog("Game Over.");
        await this.gameUI.appendToLog("As you fall in battle, the world's last hope is extinguished. The shadow of despair spreads across the land, and the sinister " + enemyName + " seizes control. Your name lives on as a memory of a hero who fought bravely but ultimately succumbed to the overwhelming forces of darkness.");
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.gameUI.choiceContainer.innerHTML = '';
        await this.gameUI.displayStartNewGameButton();
        await this.gameState.save();
    }

    async winGame(enemyName) {
        await this.gameUI.appendToLog("You have vanquished the fearsome " + enemyName + ", bringing an end to the reign of terror. As the last vestiges of darkness are swept away, the world basks in a newfound light, heralding an era of peace and prosperity. The songs of your heroic deeds echo through the ages, inspiring countless generations to come. Your name is etched into the annals of history, forever remembered as the champion who restored balance to the realm.");
        this.gameUI.choiceContainer.innerHTML = '';
        while (this.gameUI.processingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        alertPopup("You won! Congratulations, " + this.gameState.player.name + "!");
        await this.gameUI.displayStartNewGameButton();
        await this.gameState.save();
    }

    regenerateGame() {
        const currentPlayer = this.gameState.player;

        currentPlayer.inventory = currentPlayer.inventory.filter(item => item.rarity === "legendary");

        for (const slot in currentPlayer.equipment) {
            if (currentPlayer.equipment[slot] && currentPlayer.equipment[slot].rarity !== "legendary") {
                currentPlayer.equipment[slot] = null;
            }
        }

        const generatedScenes = generateScenes(currentPlayer);

        this.gameState = new GameState(generatedScenes, false);
        this.gameState.player.name = currentPlayer.name;
        this.gameState.player.class = currentPlayer.class;
        this.gameState.player.equipment = currentPlayer.equipment;
        this.gameState.player.inventory = currentPlayer.inventory;


        for (const item of startingItems) {
            this.gameState.player.inventory.push(item);
        }

        for (const slot in startingEquipment) {
            if (this.gameState.player.equipment[slot]) {
                this.gameState.player.inventory.push(startingEquipment[slot]);
            } else {
                this.gameState.player.equipment[slot] = startingEquipment[slot];
            }
        }

        this.gameState.save();

        this.play();
    }

    async hireCompanion(scene) {
        const price = scene.companion.value;
        if (this.gameState.player.gold >= price) {
            this.gameState.player.gold -= price;
            this.equipThisItem(scene.companion);
            scene.companion = 0;
            this.popupManager.closePopup('hireCompanionPopup');
            await this.gameUI.displayScene(this.gameState.currentScene, false);
        }
        else {
            alertPopup('You are missing ' + (price - this.gameState.player.gold) + ' Gold to hire this companion');
        }
    }

    async handleCompanion() {
        const companion = this.gameState.player.equipment["Companion"];
        if (companion) {
            if (companion.rarity != 'legendary') {
                const price = Math.round(companion.value * 0.01);
                if (this.gameState.player.gold >= price) {
                    this.gameState.player.gold -= price;
                    await this.gameUI.appendToLog(`Used ${price} Gold to keep your companion.`);
                    this.gameUI.updateCharacterInfo();
                }
                else {
                    await this.gameUI.appendToLog(`You don't have enough Gold to provide for your companion.`);
                    this.unequipItem(companion.slot);
                }
            }
        }
    }

    async equipItem(index) {
        const item = this.gameState.player.inventory[index];
        this.gameState.player.inventory.splice(index, 1);
        this.gameUI.updateInventory();
        this.equipThisItem(item);
    }

    async equipThisItem(item) {
        if (item.slot === 'Consumable') {
            this.gameState.player.health += item.value;
            if (this.gameState.player.health > 100) {
                this.gameState.player.health = 100;
            }
            await this.gameUI.appendToLog(`You consumed ${item.name} and recovered ${item.value} health.`);
        } else {
            const currentEquipment = this.gameState.player.equipment[item.slot];

            if (currentEquipment) {
                if (currentEquipment.slot === 'Companion') {
                    await this.gameUI.appendToLog(`Bidding farewell to ${currentEquipment.name}. May our paths cross again!`);
                }
                else {
                    this.gameState.player.inventory.push(currentEquipment);
                    await this.gameUI.appendToLog(`You unequipped the ${currentEquipment.name}.`);
                }
            }

            this.gameState.player.equipment[item.slot] = item;
            this.gameUI.updateInventory();
            this.gameUI.updateEquipment();
            this.gameState.save();
        }

        this.gameUI.updatePlayerStats();
    }

    async unequipItem(slot) {
        const item = this.gameState.player.equipment[slot];
        if (item) {
            this.gameState.player.equipment[slot] = null;
            if (item.slot === 'Companion') {
                await this.gameUI.appendToLog(`Bidding farewell to ${item.name}. May our paths cross again!`);
            }
            else {
                this.gameState.player.inventory.push(item);
            }
            this.gameUI.updateEquipment();
            this.gameUI.updateInventory();
            this.gameUI.updatePlayerStats();
            this.gameState.save();
        }
    }
}

export function getCurrentScene(gameState) {
    return gameState.scenes[gameState.currentScene];
}