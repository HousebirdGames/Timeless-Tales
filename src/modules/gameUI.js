/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/
import { getCurrentScene } from "./game.js?v=2.0.6";
import { alertPopup } from "../main.js?v=2.0.6";
import { enemiesModificators, enemiesRank } from "./gameData.js?v=2.0.6";

export default class GameUI {
    constructor(game) {
        this.game = game;
        this.maxLogLength = 50;

        this.choiceContainer = document.getElementById("choiceContainer");
        this.characterName = document.getElementById("characterName");
        this.characterClass = document.getElementById("characterClass");
        this.characterHealth = document.getElementById("characterHealth");
        this.characterAttack = document.getElementById("characterAttack");
        this.characterDefense = document.getElementById("characterDefense");
        this.characterWeight = document.getElementById("characterWeight");
        this.characterGold = document.getElementById("characterGold");
        this.goldTexts = document.querySelectorAll("p#gold");
        this.characterEquipmentValue = document.getElementById("characterEquipmentValue");

        this.equipment = document.getElementById("equipment");
        this.resetButton = document.getElementById("resetButton");
        this.downloadSaveButton = document.getElementById("downloadSaveButton");
        this.uploadSaveButton = document.getElementById("uploadSaveButton");

        this.resetButton.addEventListener("click", () => this.game.resetGame());
        this.downloadSaveButton.addEventListener("click", () => this.game.downloadSave());
        this.uploadSaveButton.addEventListener("click", () => this.game.uploadSave());

        this.knightButton = document.getElementById('knightButton');
        this.archerButton = document.getElementById('archerButton');
        this.warriorButton = document.getElementById('warriorButton');
        this.wizardButton = document.getElementById('wizardButton');
        this.rogueButton = document.getElementById('rogueButton');

        this.knightButton.addEventListener('click', () => this.handleClassSelection('Knight'));
        this.archerButton.addEventListener('click', () => this.handleClassSelection('Archer'));
        this.warriorButton.addEventListener('click', () => this.handleClassSelection('Warrior'));
        this.wizardButton.addEventListener('click', () => this.handleClassSelection('Wizard'));
        this.rogueButton.addEventListener('click', () => this.handleClassSelection('Rogue'));

        this.currentEnemyImage = '';
        this.currentEnemyHealth = 0;
        this.currentPlayerHealth = this.game.gameState.player.health;

        this.logQueue = [];
        this.processingQueue = false;

        const center = document.getElementById("logHeading");
        let duration = 34;
        center.addEventListener("click", () => {
            if (duration === 34) {
                duration = 1;
                center.textContent += " >>";
            } else {
                duration = 34;
                center.textContent = center.textContent.slice(0, -3);
            }
        });
        this.fadeInCharacters = (element) => {
            return new Promise(async (resolve) => {
                const characters = element.querySelectorAll("span");
                for (const char of characters) {
                    char.style.opacity = 0;
                }

                for (const char of characters) {
                    char.style.opacity = 1;
                    char.classList.add("fade-in");
                    char.classList.add("afterglow");
                    await new Promise((r) => setTimeout(r, duration));
                }
                resolve();
            });
        };
    }

    handleClassSelection(selectedClass) {
        this.game.gameState.player.class = selectedClass;
        this.updatePlayerStats();
        this.game.popupManager.closePopup("playerClassPopup");
        this.game.gameState.save();
    }

    async displayScene(sceneName, appendStory = true) {
        const scene = this.game.gameState.scenes[sceneName];

        if (!scene) {
            console.error(`Scene ${sceneName} does not exist.`);
            alert("Something went wrong! Sorry... We will have to start over.")
            this.game.resetGame(true);
            return;
        }

        this.updateEnemyInfo(null);

        this.choiceContainer.innerHTML = '';

        for (const choice of scene.choices) {
            if ((choice.action === "changeScene" || choice.action === "recoverHealth" || choice.action === "searchItems" || choice.action === "trade" || choice.action === "tenCards") && scene.enemy) {
                continue;
            }
            const choiceButton = document.createElement("button");
            choiceButton.textContent = choice.text;

            if (choice.action === 'changeScene') {
                choiceButton.setAttribute("data-target-scene", choice.targetScene);
            }

            if (choice.buttonId != null) {
                choiceButton.id = choice.buttonId;
            }

            choiceButton.addEventListener("click", () => this.game.handleChoice(choice));

            this.choiceContainer.appendChild(choiceButton);
        }

        if (scene.enemy) {
            const attackChoice = { text: ("Attack the " + scene.enemy.name), action: "attackEnemy" };
            const fleeChoice = { text: "Flee", action: "flee" };

            [attackChoice, fleeChoice].forEach((choice) => {
                const choiceButton = document.createElement("button");
                choiceButton.textContent = choice.text;
                choiceButton.addEventListener("click", () => this.game.handleChoice(choice));
                this.choiceContainer.appendChild(choiceButton);
            });
        }
        else if (scene.companion) {
            const companionChoice = { text: "Hire Companion", action: "hireCompanion" };
            const choiceButton = document.createElement("button");
            choiceButton.textContent = companionChoice.text;
            choiceButton.addEventListener("click", () => this.game.handleChoice(companionChoice));
            this.choiceContainer.appendChild(choiceButton);
        }

        /*if (this.isEnemyPresent()) {
            this.disableButtons();
        } else {
            this.enableButtons();
        }*/
        this.updateLocationImage(scene.locationName);

        if (typeof scene.story !== null && appendStory) {
            await this.appendToLog(scene.story);
            scene.story = null;
        }

        if (getCurrentScene(this.game.gameState).enemy && this.game.gameState.currentScene !== this.game.gameState.getLastSceneKey() && appendStory) {
            await this.appendToLog("A " + getCurrentScene(this.game.gameState).enemy.name + " is straight ahead.")
            while (this.processingQueue) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        this.updateEnemyInfo(scene.enemy);
        this.updateInventory();

        if (this.processingQueue) {
            this.disableButtons();
        }

        if (sceneName != 'start') {
            this.game.gameState.save();
        }
    }

    updateLocationImage(imageName) {
        if (!imageName) {
            imageName = '';
        }
        const logListContainer = document.getElementById("logListContainer");

        const fadeOutDuration = 1000;

        const fadeOutImage = (callback) => {
            logListContainer.classList.add('fade-out-image');
            setTimeout(callback, fadeOutDuration);
        };

        const fadeInImage = (imageUrl) => {
            logListContainer.classList.remove('fade-out-image');
            logListContainer.style.setProperty('--location-image', `url('${imageUrl}')`);
        };

        const setLocationImage = (imageUrl) => {
            fadeOutImage(() => {
                fadeInImage(imageUrl);
                logListContainer.onclick = (event) => {
                    if (!event.target.classList.contains('logHeading')) {
                        showPopupWithImage(imageUrl);
                    }
                };
            });
        };

        const showPopupWithImage = (imageUrl) => {
            alertPopup(`<div class="bigImageWrapper"><img src="${imageUrl}" alt="Location Image" class="bigImage"></div>`);
        };

        const cleanImageName = (name) => {
            return name.replace(/^(a |an |the )/i, '').replace(/'/g, '');
        };

        const checkImage = (imageName) => {
            const cleanedName = cleanImageName(imageName);
            //console.log('Location: ' + cleanedName);
            const img = new Image();
            img.onload = () => setLocationImage(`img/locations/${cleanedName}.jpg`);
            img.onerror = () => {
                fadeOutImage(() => {
                    logListContainer.style.setProperty('--location-image', 'none');
                    logListContainer.onclick = null;
                });
            };

            img.src = `img/locations/${cleanedName}.jpg`;
        };

        checkImage(imageName);
    }

    updateCharacterInfo() {
        this.updateInventory();
        this.updateEquipment();
        //this.updatePlayerStats();
        this.updateTradePopup();

        const enterNameButton = document.getElementById("enter-name-button");
        if (enterNameButton && this.game.gameState.player.name.length > 0) {
            enterNameButton.textContent = "Change Character Name & Class";
            enterNameButton.style.display = "";
        }
        if (this.game.gameState.player.class.length <= 0 && this.game.gameState.player.name.length > 0) {
            this.game.popupManager.openPopup("playerClassPopup");
        }
    }

    updateInventory() {
        this.updateInventoryPopup();
        return;
    }

    updateEquipment() {
        this.equipment.innerHTML = '<h2>Equipment</h2>';
        for (const slot in this.game.gameState.player.equipment) {
            const item = this.game.gameState.player.equipment[slot];
            const itemElement = document.createElement("div");
            itemElement.innerHTML = `${slot}: <strong>${item ? item.name : "None"}</strong>`;
            itemElement.classList.add("clickable-text");

            if (item) {
                if (item.slot != "Companion") {
                    itemElement.addEventListener("click", () => this.game.unequipItem(slot));
                }
                else {
                    itemElement.classList.remove("clickable-text");
                }
            } else {
                itemElement.classList.remove("clickable-text");
            }

            this.equipment.appendChild(itemElement);
        }
        this.updatePlayerStats();
    }

    updatePlayerStats() {
        let attack = 1;
        let defense = 0;

        for (const slot in this.game.gameState.player.equipment) {
            const item = this.game.gameState.player.equipment[slot];
            if (item) {
                if (this.game.gameState.player.class === item.class) {
                    attack += item.attack > 0 ? (item.attack * 2) : item.attack || 0;
                    defense += item.defense > 0 ? (item.defense * 2) : item.defense || 0;
                } else {
                    attack += item.attack || 0;
                    defense += item.defense || 0;
                }
            }
        }

        if (attack < 1) {
            attack = 1;
        }
        if (defense < 0) {
            defense = 0;
        }

        this.game.gameState.player.attack = attack;
        this.game.gameState.player.defense = defense;

        let healthClass = '';
        if (this.game.gameState.player.health != this.currentPlayerHealth) {
            this.currentPlayerHealth = this.game.gameState.player.health;
            healthClass = 'afterglow';
        }

        this.characterName.innerHTML = `Name: <strong>${this.game.gameState.player.name}</strong>`;
        this.characterClass.innerHTML = `Class: <strong>${this.game.gameState.player.class}</strong>`;
        this.characterHealth.innerHTML = `Health: <strong class="${healthClass}">${this.game.gameState.player.health}</strong>`;
        this.characterAttack.innerHTML = `Attack: <strong>${this.game.gameState.player.attack}</strong>`;
        this.characterDefense.innerHTML = `Defense: <strong>${this.game.gameState.player.defense}</strong>`;
        this.characterWeight.innerHTML = `Weight: <strong>${this.game.gameState.getWeight()}</strong>`;
        this.characterEquipmentValue.innerHTML = `Equipment Value: <strong>${this.game.gameState.getEquipmentValue()}</strong>`;
        this.characterGold.innerHTML = `Gold: <strong>${this.game.gameState.player.gold}</strong>`;
    }

    updateInventoryPopup(action) {
        this.goldTexts.forEach(text => {
            text.innerHTML = "You posses <strong>" + this.game.gameState.player.gold + " Gold</strong>";
            if (action === "forgeLegendary") {
                const inventoryHeading = document.getElementById("inventoryHeading");
                inventoryHeading.textContent = "Make an item or companion legendary for 1000 Gold";
            }
        });

        const canForge = this.game.gameState.player.gold > 1000;

        const equipmentItemsList = document.getElementById("equipmentItemsList").querySelector("tbody");
        equipmentItemsList.innerHTML = '';

        this.addTableHeaderListeners(document.getElementById("equipmentItemsList"));

        for (const slot in this.game.gameState.player.equipment) {
            const item = this.game.gameState.player.equipment[slot];
            if (item && !action) {
                const row = this.createItemRow(item, 0, 'Unequip');
                row.querySelector("button").addEventListener("click", () => this.game.unequipItem(item.slot));
                equipmentItemsList.appendChild(row);
            }
            else if (item && action === "forgeLegendary" && item.rarity != "legendary" && item.slot != "Consumable") {
                if (canForge) {
                    const row = this.createItemRow(item, 0, "Improve");
                    row.querySelector("button").addEventListener("click", () => this.game.makeLegendary(item));
                    equipmentItemsList.appendChild(row);
                }
                else {
                    const row = this.createItemRow(item, 0, "Not enough Gold");
                    equipmentItemsList.appendChild(row);
                }
            }
        }

        const playerInventoryList = document.getElementById("playerInventoryList").querySelector("tbody");

        playerInventoryList.innerHTML = '';
        for (let i = 0; i < this.game.gameState.player.inventory.length; i++) {
            const item = this.game.gameState.player.inventory[i];

            if (!action) {
                const row = this.createItemRow(item, 0, "Equip");
                row.querySelector("button").addEventListener("click", () => this.game.equipItem(i));
                playerInventoryList.appendChild(row);
            }
            else if (item && action === "forgeLegendary" && canForge && item.rarity != "legendary" && item.slot != "Consumable") {
                if (canForge) {
                    const row = this.createItemRow(item, 0, "Improve");
                    row.querySelector("button").addEventListener("click", () => this.game.makeLegendary(item));
                    playerInventoryList.appendChild(row);
                }
                else {
                    const row = this.createItemRow(item, 0, "Not enough Gold");
                    playerInventoryList.appendChild(row);
                }
            }
        }

        this.addTableHeaderListeners(document.getElementById("playerInventoryList"));

        this.sortTable(equipmentItemsList, 0, true);
        this.sortTable(playerInventoryList, 0, true);
    }

    updateTradePopup() {
        this.goldTexts.forEach(text => {
            text.innerHTML = "You posses <strong>" + this.game.gameState.player.gold + " Gold</strong>";
        });

        const sceneItemsList = document.getElementById("sceneItemsList").querySelector("tbody");

        sceneItemsList.innerHTML = '';

        const currentScene = this.game.gameState.scenes[this.game.gameState.currentScene];
        if (currentScene.items) {
            for (const item of currentScene.items) {
                const itemPrice = Math.round(item.value * currentScene.worthMultiplier);
                const row = this.createItemRow(item, currentScene.worthMultiplier, "Buy");
                row.querySelector("button").addEventListener("click", () => this.game.buyItem(item, itemPrice));
                sceneItemsList.appendChild(row);
            }
        }

        this.addTableHeaderListeners(document.getElementById("sceneItemsList"));

        const playerInventoryList = document.getElementById("playerInventoryTradeList").querySelector("tbody");
        playerInventoryList.innerHTML = '';

        playerInventoryList.innerHTML = '';
        for (const item of this.game.gameState.player.inventory) {
            const itemPrice = Math.round(item.value * currentScene.worthMultiplier);
            const row = this.createItemRow(item, currentScene.worthMultiplier, "Sell");
            row.querySelector("button").addEventListener("click", () => this.game.sellItem(item, itemPrice));
            playerInventoryList.appendChild(row);
        }

        this.addTableHeaderListeners(document.getElementById("playerInventoryTradeList"));

        this.sortTable(sceneItemsList, 0, true);
        this.sortTable(playerInventoryList, 0, true);
    }

    createItemRow(item, worthMultiplier, actionText) {
        const row = document.createElement("tr");

        const differences = this.compareItems(this.game.gameState.player.equipment[item.slot], item);

        const formatColumnValue = (value, difference) => {
            if (difference != 0 && item.slot != "Consumable") {
                if (difference === 0) return value;
                const sign = difference > 0 ? "+" : "";
                return `${value} (${sign}${difference})`;
            }
            else {
                return value;
            }
        };

        let columns = [
            item.name,
            item.slot,
            formatColumnValue(item.attack || 0, differences.attack) || 0,
            formatColumnValue(item.defense || 0, differences.defense) || 0,
            formatColumnValue(item.weight || 0, differences.weight) || 0,
            item.rarity || "common",
            item.class || "none",
            item.value || 0,
            actionText
        ];
        if (worthMultiplier > 0) {
            columns = [
                item.name,
                item.slot,
                formatColumnValue(item.attack || 0, differences.attack) || 0,
                formatColumnValue(item.defense || 0, differences.defense) || 0,
                formatColumnValue(item.weight || 0, differences.weight) || 0,
                item.rarity || "common",
                item.class || "none",
                item.value || 0,
                Math.round(item.value * worthMultiplier) || 0,
                actionText
            ];
        }

        for (const column of columns) {
            const td = document.createElement("td");
            if (typeof column === "string" && (column === "Buy" || column === "Sell" || column === "Equip" || column === "Unequip" || column === "Improve")) {
                let buttonText = column;
                if (item.slot === "Consumable" && column === "Equip") {
                    buttonText = "Use";
                }

                if (item.slot === "Companion") {
                    if (column === "Improve") {
                        buttonText = "Train";
                    }
                    else if (column === "Unequip") {
                        buttonText = "Farewell";
                    }
                }
                const button = document.createElement("button");
                button.textContent = buttonText;
                td.appendChild(button);
            }
            else {
                td.textContent = column;
            }
            row.appendChild(td);
        }

        return row;
    }

    compareItems(currentItem, newItem) {
        if (!currentItem) {
            return {
                attack: newItem.attack || 0,
                defense: newItem.defense || 0,
                weight: newItem.weight || 0
            };
        }

        const differences = {
            attack: (newItem.attack || 0) - (currentItem.attack || 0),
            defense: (newItem.defense || 0) - (currentItem.defense || 0),
            weight: (newItem.weight || 0) - (currentItem.weight || 0)
        };

        return differences;
    }

    addTableHeaderListeners(tableElement) {
        const tableHeaders = tableElement.querySelectorAll("th[data-sort]");
        tableHeaders.forEach(header => {
            header.addEventListener("click", () => {
                const columnIndex = parseInt(header.dataset.sort, 10);
                const descending = header.classList.contains("descending");
                header.classList.toggle("descending");
                const tableBody = tableElement.querySelector("tbody");
                this.sortTable(tableBody, columnIndex, descending);
            });
        });
    }

    sortTable(tableBody, columnIndex, descending) {
        const rows = Array.from(tableBody.querySelectorAll("tr"));
        rows.sort((a, b) => {
            const aValue = a.children[columnIndex].textContent;
            const bValue = b.children[columnIndex].textContent;
            const numAValue = parseFloat(aValue);
            const numBValue = parseFloat(bValue);

            if (!isNaN(numAValue) && !isNaN(numBValue)) {
                return descending ? numBValue - numAValue : numAValue - numBValue;
            } else {
                return descending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
        });

        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    }

    openCompanionPopup() {
        const currentScene = this.game.gameState.scenes[this.game.gameState.currentScene];
        if (currentScene.companion) {
            this.game.popupManager.openPopup("hireCompanionPopup");
            const companionName = document.getElementById("companionName");
            const companionDescription = document.getElementById("companionDescription");
            const companionCost = document.getElementById("companionCost");
            if (companionName && companionDescription && companionCost) {
                companionName.innerText = currentScene.companion.name;
                companionDescription.innerText = currentScene.companion.description;
                companionCost.innerText = 'Hire for ' + currentScene.companion.value + ' Gold | Upkeep: ' + Math.round(currentScene.companion.value * 0.01) + ' Gold';
                document.getElementById("hireCompanion").addEventListener("click", () => this.game.hireCompanion(currentScene));
            }
        }
    }

    updateEnemyInfo(enemy) {
        const enemyInfo = document.getElementById("enemyInfo");

        const fadeOutDuration = 1000;

        const fadeOutImage = (callback) => {
            enemyInfo.classList.add('fade-out-image');
            setTimeout(callback, fadeOutDuration);
        };

        const fadeInImage = (imageUrl) => {
            enemyInfo.style.setProperty('--enemy-image', `url('${imageUrl}')`);
            enemyInfo.classList.remove('fade-out-image');
        };

        const setEnemyImage = (imageUrl) => {
            fadeOutImage(() => {
                fadeInImage(imageUrl);
                enemyInfo.onclick = (event) => {
                    showPopupWithImage(imageUrl);
                };
            });
        };

        const removeModifiersAndRank = (name) => {
            const modifiers = enemiesModificators.map(modifier => modifier.verb);
            const ranks = enemiesRank.map(rank => rank.rank);
            const nameParts = name.split(' ');

            return nameParts.filter(part => !modifiers.includes(part) && !ranks.includes(part)).join(' ');
        };

        const showPopupWithImage = (imageUrl) => {
            alertPopup(`<div class="bigImageWrapper"><img src="${imageUrl}" alt="Enemy Image" class="bigImage"></div>`);
        };

        const checkImage = (imageName) => {
            if (imageName != this.currentEnemyImage) {
                this.currentEnemyImage = imageName;
                if (enemy) {
                    this.currentEnemyHealth = enemy.health;
                }

                const img = new Image();
                img.onload = () => setEnemyImage(`img/enemies/${imageName}.jpg`);
                img.onerror = () => {
                    enemyInfo.style.setProperty('--enemy-image', 'none');
                    enemyInfo.onclick = null;
                };

                img.src = `img/enemies/${imageName}.jpg`;
            }
        };

        if (enemy) {
            const imageName = removeModifiersAndRank(enemy.name).replace(/'/g, '');
            checkImage(imageName);

            let healthClass = '';
            if (enemy.health != this.currentEnemyHealth) {
                this.currentEnemyHealth = enemy.health;
                healthClass = 'afterglow';
            }

            enemyInfo.innerHTML = `<h2>Enemy Stats</h2>
            <div>Enemy: <strong>${enemy.name}</strong><br></div>
            <div>Health: <strong class="${healthClass}">${enemy.health}</strong><br></div>
            <div>Attack: <strong>${enemy.attack}</strong><br></div>
            <div>Defense: <strong>${enemy.defense}</strong><br></div>
            <div>Weight: <strong>${enemy.weight}</strong></div>`;
            enemyInfo.onclick = () => showPopupWithImage(`img/enemies/${imageName}.jpg`);
        } else {
            enemyInfo.innerHTML = 'No Enemy';
            enemyInfo.style.setProperty('--enemy-image', 'none');
            enemyInfo.onclick = null;
        }
    }

    isEnemyPresent() {
        const currentScene = this.game.gameState.currentScene;
        return this.game.gameState.scenes[currentScene].enemy !== null && this.game.gameState.scenes[currentScene].enemy !== undefined;
    }

    appendToLog(message) {
        if (typeof message === 'string' && message.length > 0) {
            this.logQueue.push(message);
            this.game.gameState.log.push(message);
            this.game.gameState.save();
            if (!this.processingQueue) {
                Promise.resolve().then(() => this.processQueue());
            }
        } else {
            console.error(`Invalid message passed to appendToLog: ${message} `);
        }
    }

    async processQueue() {
        this.processingQueue = true;
        this.disableButtons();

        while (this.logQueue.length > 0) {
            const message = this.logQueue.shift();
            const logList = document.getElementById("logList");
            const logEntry = document.createElement("li");

            for (const char of message) {
                const span = document.createElement("span");
                span.textContent = char;
                span.style.opacity = 0;
                logEntry.appendChild(span);
            }

            logList.appendChild(logEntry);

            const scrollDifference = logList.scrollHeight - logList.scrollTop;
            logList.scrollTop = logList.scrollHeight - scrollDifference;

            await new Promise(resolve => setTimeout(resolve, 500));

            if (this.game.gameState.log.length > this.maxLogLength) {
                this.game.gameState.log.shift();
                logList.removeChild(logList.firstChild);
            }

            this.game.gameState.save();
            await this.fadeInCharacters(logEntry);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.processingQueue = false;
        this.enableButtons();
    }

    disableButtons() {
        const buttons = this.choiceContainer.querySelectorAll("button");
        buttons.forEach((button) => {
            button.disabled = true;
        });
    }

    enableButtons() {
        if (!this.processingQueue) {
            const buttons = this.choiceContainer.querySelectorAll("button");
            buttons.forEach((button) => {
                if (button.id == "start-adventure-button" && this.game.gameState.player.name.length == 0 && this.game.gameState.player.class.length == 0) {
                    button.disabled = true;
                }
                else {
                    button.disabled = false;
                }
            });
        }
    }

    async showSavePrompt() {
        const savePrompt = document.getElementById("savePrompt");
        savePrompt.style.display = "block";

        const savePromptSpan = document.createElement("span");
        savePromptSpan.textContent = "Game saved!";
        savePromptSpan.style.opacity = 0;
        savePrompt.innerHTML = "";
        savePrompt.appendChild(savePromptSpan);

        await this.fadeInCharacters(savePrompt);

        await new Promise((resolve) => setTimeout(resolve, 4000));

        savePrompt.style.opacity = 0;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        savePrompt.style.display = "none";
        savePrompt.style.opacity = 1;
    }

    async displayStartNewGameButton() {

        this.choiceContainer.innerHTML = '';

        const startNewGameButton = document.createElement("button");
        startNewGameButton.textContent = "Start New Adventure (legendary Items remain)";
        startNewGameButton.disabled = false;
        startNewGameButton.onclick = () => {
            this.game.regenerateGame();
        };
        this.choiceContainer.appendChild(startNewGameButton);
    }

}
