/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import { getCookie, alertPopup } from "../main.js?v=2.0.6";
import { startingItems, startingEquipment } from "./gameData.js?v=2.0.6";

let saveAlertShown = false;

export default class GameState {
    constructor(generatedScenes, shouldLoad = true) {
        if (shouldLoad) {
            const loadedGameState = this.load(generatedScenes);
            Object.assign(this, loadedGameState);
        } else {
            Object.assign(this, this.newGameState(generatedScenes));
        }

        if (!this.currentScene) {
            this.currentScene = 'start';
        }
    }

    load(generatedScenes) {
        console.log("Loading gameState");
        const gameStateData = localStorage.getItem("gameState");
        if (gameStateData) {
            console.log("Found gameState");
            try {
                const gameState = JSON.parse(gameStateData);
                if (gameState.player.name.length > 0) {
                    return gameState;
                } else {
                    console.log("Empty player name, creating a new gameState");
                }
            } catch (error) {
                console.log("Invalid gameState data or no gameState found: " + error + " | Creating a new gameState");
            }
        }
        else {
            console.log("No gameState found");
        }
        if (generatedScenes) {
            return this.newGameState(generatedScenes);
        } else {
            return this.newGameState({});
        }
    }

    newGameState(generatedScenes) {
        console.log("New gameState");
        const scenes = {
            start: {
                story: "Welcome to your text adventure! Name your character to begin your journey.",
                choices: [
                    { text: "Enter your character's name", action: "setName", buttonId: "enter-name-button" },
                    { text: "Start your Adventure", action: "changeScene", targetScene: "scene1", buttonId: "start-adventure-button", disabled: true },
                ],
            },
            ...generatedScenes,
        };

        return {
            player: {
                name: '',
                class: '',
                health: 100,
                gold: 10,
                inventory: [...startingItems],
                equipment: { Weapon: null, ...startingEquipment },
            },
            scenes,
            currentScene: 'start',
            completedScenes: [],
            log: [],
            foundItems: {},
            searchedForItem: {},
            recoveries: {},
            banditAttackedLocation: {},
        };
    }

    save() {
        const gameStateData = JSON.stringify(this);
        const storageAcknowledgementPopup = document.getElementById("storageAcknowledgementPopup");
        const popupDisplayStyle = window.getComputedStyle(storageAcknowledgementPopup).display;

        if (getCookie("storageAcknowledgementTimelessTales") === 'true') {
            localStorage.setItem("gameState", gameStateData);
        }
        else if (popupDisplayStyle !== 'block' && !saveAlertShown) {
            alertPopup("Warning: Please allow Timeless Tales to save the game progress in local storage and the settings via cookies. Grant permission or continue without saving.");
            saveAlertShown = true;
        }
    }

    mergeGameState(loadedGameState) {
        const defaultGameState = this.load();
        const mergedGameState = {
            ...defaultGameState,
            ...loadedGameState,
            player: {
                ...defaultGameState.player,
                ...loadedGameState.player,
                equipment: {
                    ...defaultGameState.player.equipment,
                    ...loadedGameState.player.equipment,
                },
            },
        };
        const gameStateInstance = new GameState();
        Object.assign(gameStateInstance, mergedGameState);
        gameStateInstance.save();
        return gameStateInstance;
    }

    getWeight() {
        let weight = 74;
        for (const slot in this.player.equipment) {
            const item = this.player.equipment[slot];
            if (item) {
                weight += item.weight || 0;
            }
        }
        return weight;
    }

    getEquipmentValue() {
        let equipmentValue = 0;
        for (const slot in this.player.equipment) {
            const item = this.player.equipment[slot];
            if (item) {
                equipmentValue += item.value || 0;
            }
        }
        return equipmentValue;
    }

    getNextScene() {
        const currentSceneNumber = parseInt(this.currentScene.replace("scene", ""));
        const nextSceneNumber = currentSceneNumber + 1;
        const nextSceneKey = "scene" + nextSceneNumber;
        if (nextSceneKey in this.scenes) {
            return this.scenes[nextSceneKey];
        } else {
            return null;
        }
    }

    getNextSceneKey() {
        const currentSceneNumber = parseInt(this.currentScene.replace("scene", ""));
        const nextSceneNumber = currentSceneNumber + 1;
        const nextSceneKey = "scene" + nextSceneNumber;
        if (nextSceneKey in this.scenes) {
            return nextSceneKey;
        } else {
            return null;
        }
    }

    getLastScene() {
        let lastSceneNumber = 0;
        let lastScene = null;
        for (const sceneKey in this.scenes) {
            const sceneNumber = parseInt(sceneKey.replace("scene", ""));
            if (sceneNumber > lastSceneNumber) {
                lastSceneNumber = sceneNumber;
                lastScene = this.scenes[sceneKey];
            }
        }
        return lastScene;
    }

    getLastSceneKey() {
        let lastSceneNumber = 0;
        let lastSceneKey = null;
        for (const sceneKey in this.scenes) {
            const sceneNumber = parseInt(sceneKey.replace("scene", ""));
            if (sceneNumber > lastSceneNumber) {
                lastSceneNumber = sceneNumber;
                lastSceneKey = sceneKey;
            }
        }
        return lastSceneKey;
    }
}
