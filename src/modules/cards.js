/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

import PopupManager from "./popupManager.js?v=2.0.6";
import { getCurrentScene } from "./game.js?v=2.0.6";
import { assignMenuButton, resumeGlitch, pauseGlitch } from "../main.js?v=2.0.6";
import { roundToFull } from "../main.js?v=2.0.6";

export class CardsGame {
    constructor(aiDifficulty = null, game, standalone = false) {
        this.playerTurn = true;
        this.playerPoints = 0;
        this.opponentPoints = 0;
        this.playerCards = this.generateCards();
        this.animationPlaying = false;
        this.opponentCards = this.generateCards();
        this.playerFlipped = Array(5).fill(false);
        this.opponentFlipped = Array(5).fill(false);
        this.cardsGame = document.getElementById("cardsGame");
        this.standalone = standalone;
        this.game = game;
        this.betAmount = 0;

        if (aiDifficulty) {
            this.ai = new AI(aiDifficulty);
        } else {
            this.ai = null;
        }

        this.popupManager = new PopupManager();

        this.popupManager.openPopup('cardsPopup');

        this.difficultyMultiplier = 1;
        if (this.ai) {
            if (aiDifficulty === "easy") {
                this.difficultyMultiplier = 1;
            }
            else if (aiDifficulty === "medium") {
                this.difficultyMultiplier = 2;
            }
            else if (aiDifficulty === "hard") {
                this.difficultyMultiplier = 3;
            }
        }

        if (this.game) {
            this.showBetSelection();
        } else {
            this.render();
        }

        if (this.standalone) {
            this.checkIfAIStarts();
        }

        pauseGlitch();
    }

    checkIfAIStarts() {
        if (this.ai) {
            if (Math.random() < 0.5) {
                this.playerTurn = false;
                setTimeout(() => {
                    const { isPlayer, index } = this.ai.chooseCard(this.playerCards, this.playerFlipped, this.opponentCards, this.opponentFlipped);
                    this.flipCard(isPlayer, index);
                    this.addCardListeners();
                }, 600);
            }
        }
    }

    generateCards() {
        return Array.from({ length: 5 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    }

    flipCard(isPlayer, index) {
        if (this.animationPlaying) return;
        this.animationPlaying = true;

        if (this.playerTurn) {
            if (isPlayer) {
                this.playerPoints += this.playerCards[index];
            } else {
                this.playerPoints += this.opponentCards[index];
            }
        } else {
            if (isPlayer) {
                this.opponentPoints += this.playerCards[index];
            } else {
                this.opponentPoints += this.opponentCards[index];
            }
        }

        this.playerTurn = !this.playerTurn;

        const card = isPlayer
            ? document.querySelector(`.cards-row:nth-child(3) .card[data-index="${index}"]`)
            : document.querySelector(`.cards-row:nth-child(2) .card[data-index="${index}"]`);

        card.classList.add("flipped");

        if (isPlayer) {
            this.playerFlipped[index] = true;
        } else {
            this.opponentFlipped[index] = true;
        }

        setTimeout(() => {
            this.animationPlaying = false;
            if (this.playerFlipped.every(f => f) && this.opponentFlipped.every(f => f)) {
                this.render();
                this.endGame();
            } else {
                if (!this.playerTurn && this.ai) {
                    this.render();
                    setTimeout(() => {
                        const { isPlayer, index } = this.ai.chooseCard(this.playerCards, this.playerFlipped, this.opponentCards, this.opponentFlipped);
                        this.flipCard(isPlayer, index);
                        this.addCardListeners();
                    }, 600);
                }
            }
            this.render();
        }, 600);

        this.addCardListeners();
    }

    endGame() {
        setTimeout(() => {
            let result;
            if (this.playerPoints > this.opponentPoints) {
                if (this.ai) {
                    result = "You won!";
                    if (this.game && this.betAmount > 0) {
                        this.game.gameState.player.gold += this.betAmount * this.difficultyMultiplier + this.betAmount;
                        getCurrentScene(this.game.gameState).goldPool -= this.betAmount * this.difficultyMultiplier + this.betAmount;
                        this.game.gameUI.updatePlayerStats();
                        result = "You won " + this.betAmount * this.difficultyMultiplier + " Gold!";
                    }
                }
                else {
                    result = "Player One won!";
                }
            } else if (this.playerPoints < this.opponentPoints) {
                if (this.ai) {
                    result = "You lost!";
                    if (this.game && this.betAmount > 0) {
                        this.game.gameUI.updatePlayerStats();
                        result = "You lost " + this.betAmount + " Gold!";
                    }
                }
                else {
                    result = "Player Two won!";
                }
            } else {
                result = "It's a tie!";
                if (this.game && this.betAmount > 0) {
                    this.game.gameState.player.gold += this.betAmount;
                    getCurrentScene(this.game.gameState).goldPool -= this.betAmount;
                    this.game.gameUI.updatePlayerStats();
                }
            }

            if (this.standalone) {
                this.cardsGame.innerHTML = `
                <p>${result}</p>
                <br>
                <button class="restart-button menu noGlitch">Restart</button>
                <button id="menuButton" class="menu noGlitch">Menu</button>
            `;
                assignMenuButton();
            }
            else {
                this.cardsGame.innerHTML = `
                <p>${result}</p>
                <br>
                <button class="restart-button menu noGlitch">Restart</button>
                <button class="close-button menu noGlitch">Close</button>
            `;
            }

            const closeButton = document.querySelector('.close-button');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.popupManager.closePopup('cardsPopup');
                    resumeGlitch();
                });
            }

            this.addRestartListeners();
            if (this.game) {
                this.game.gameState.save();
            }
        }, 1000);
    }

    render() {
        const gameSelection = document.getElementById("gameSelection");
        if (gameSelection) {
            if (this.standalone) {
                if (this.ai) {
                    gameSelection.textContent = 'You are playing against ' + this.ai.difficulty + ' AI';
                }
                else {
                    gameSelection.textContent = 'Local Multiplayer';
                }
            }
        }

        if (this.ai) {
            this.cardsGame.innerHTML = `
            <p>Opponents Score: ${this.opponentPoints}</p>
            <div class="cards-row noGlitch">
                ${this.opponentCards.map((card, i) => `<div class="noGlitch card${this.opponentFlipped[i] ? " flipped" : ""}" data-index="${i}" data-player="false"><div class="card-face card-back noGlitch"></div><div class="card-face card-front noGlitch"><span class="card-number noGlitch">${card}</span></div></div>`).join('')}
            </div>
            <div class="cards-row noGlitch">
                ${this.playerCards.map((card, i) => `<div class="noGlitch card${this.playerFlipped[i] ? " flipped" : ""}" data-index="${i}" data-player="true"><div class="card-face card-back noGlitch"></div><div class="card-face card-front noGlitch"><span class="card-number noGlitch">${card}</span></div></div>`).join('')}
            </div>
            <p>Your Score: ${this.playerPoints}</p>
            <br>
        `;
        }
        else {
            this.cardsGame.innerHTML = `
            <p>Player One Score: ${this.playerPoints}</p>
            <div class="cards-row noGlitch">
                ${this.opponentCards.map((card, i) => `<div class="noGlitch card${this.opponentFlipped[i] ? " flipped" : ""}" data-index="${i}" data-player="false"><div class="card-face card-back noGlitch"></div><div class="card-face card-front noGlitch"><span class="card-number noGlitch">${card}</span></div></div>`).join('')}
            </div>
            <div class="cards-row noGlitch">
                ${this.playerCards.map((card, i) => `<div class="noGlitch card${this.playerFlipped[i] ? " flipped" : ""}" data-index="${i}" data-player="true"><div class="card-face card-back noGlitch"></div><div class="card-face card-front noGlitch"><span class="card-number noGlitch">${card}</span></div></div>`).join('')}
            </div>
            <p>Player Two Score: ${this.opponentPoints}</p>
            <br>
            `;
        }

        if (this.standalone) {
            this.cardsGame.innerHTML += `
            <button id="cardsRulesButton" class="menu noGlitch">Rules</button>
            <button class="restart-button menu noGlitch">Restart</button>
        <button id="menuButton" class="menu noGlitch">Menu</button>
    `;
            assignMenuButton();
        }
        else {
            this.cardsGame.innerHTML += `
        <button class="close-button menu noGlitch">Give up</button>
    `;
        }

        this.addRestartListeners();

        const closeButton = document.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.popupManager.closePopup('cardsPopup');
                resumeGlitch();
            });
        }

        this.addCardListeners();
    }

    showBetSelection() {
        let maxGold = this.game.gameState.player.gold;
        if (maxGold > getCurrentScene(this.game.gameState).goldPool / this.difficultyMultiplier) {
            maxGold = getCurrentScene(this.game.gameState).goldPool / this.difficultyMultiplier;
        }

        maxGold = roundToFull(maxGold);

        const sceneGoldPool = getCurrentScene(this.game.gameState).goldPool >= 0 ? getCurrentScene(this.game.gameState).goldPool : 0;

        if (maxGold == 0) {
            this.cardsGame.innerHTML = `
            <div class="bet-selection noGlitch">
                <p>There is <strong>${sceneGoldPool} Gold</strong> in this location.</p>
                <p>You posses ${this.game.gameState.player.gold} Gold.</p>
                <br>
                <h2>Insufficient gold for betting</h2>
                <br>
                <button id="startGameButton" class="menu noGlitch">Start Game</button>
                <button id="closeGameButton" class="menu noGlitch">Close</button>
            </div>
        `;
        }
        else {
            this.cardsGame.innerHTML = `
            <div class="bet-selection noGlitch">
                <p>There is <strong>${sceneGoldPool} Gold</strong> in this location.</p>
                <p>You posses ${this.game.gameState.player.gold} Gold.</p>
                <br>
                <h2>Select your bet:</h2>
                <input type="range" id="betRange" name="betRange" min="0" max="${maxGold}" value="0" step="1">
                <p>Bet <strong><span id="betValue">0</span> Gold</strong></p>
                <br>
                <button id="startGameButton" class="menu noGlitch">Start Game</button>
                <button id="closeGameButton" class="menu noGlitch">Close</button>
            </div>
        `;
        }

        const betRange = document.getElementById("betRange");
        const betValue = document.getElementById("betValue");

        if (betRange && betValue) {
            betRange.addEventListener("input", () => {
                betValue.textContent = betRange.value;
            });
        }

        const closeGameButton = document.getElementById("closeGameButton");
        if (closeGameButton && this.game) {
            closeGameButton.addEventListener("click", () => {
                this.game.popupManager.closePopup("cardsPopup");
            });
        }

        const startGameButton = document.getElementById("startGameButton");
        startGameButton.addEventListener("click", () => {
            if (betRange) {
                this.betAmount = parseInt(betRange.value, 10);
            }
            this.game.gameState.player.gold -= this.betAmount;
            getCurrentScene(this.game.gameState).goldPool += this.betAmount;
            this.game.gameUI.updatePlayerStats();
            if (this.game) {
                this.game.gameState.save();
            }
            this.checkIfAIStarts();
            this.render();
        });
    }

    addRestartListeners() {
        const restartButtons = document.querySelectorAll('.restart-button');
        restartButtons.forEach(restartButton => {
            restartButton.addEventListener('click', () => {
                this.playerTurn = true;
                this.playerPoints = 0;
                this.opponentPoints = 0;
                this.playerCards = this.generateCards();
                this.opponentCards = this.generateCards();
                this.playerFlipped = Array(5).fill(false);
                this.opponentFlipped = Array(5).fill(false);

                if (this.ai && this.game) {
                    this.showBetSelection();
                } else {
                    this.render();
                    this.checkIfAIStarts();
                }
            });
        });
    }

    cardClickListener(e) {
        if (!this.playerTurn && this.ai) return;
        const cardElement = e.target.closest('.card');
        const isPlayer = cardElement.dataset.player === "true";
        const index = parseInt(cardElement.dataset.index, 10);

        if (isPlayer ? !this.playerFlipped[index] : !this.opponentFlipped[index]) {
            this.flipCard(isPlayer, index);
        }
    }

    addCardListeners() {
        const cards = document.querySelectorAll(".card");
        cards.forEach(card => {
            // Remove the existing event listener
            card.removeEventListener("click", this.cardClickListener.bind(this));

            // Add the new event listener
            card.addEventListener("click", this.cardClickListener.bind(this));
        });
    }
}

class AI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
    }

    chooseCard(playerCards, playerFlipped, opponentCards, opponentFlipped) {
        if (this.difficulty === 'easy') {
            return this.chooseCardEasy(playerCards, playerFlipped, opponentCards, opponentFlipped);
        } else if (this.difficulty === 'hard') {
            return this.chooseCardHard(playerCards, playerFlipped, opponentCards, opponentFlipped);
        } else {
            const highestCard = this.chooseHighestCard(playerCards, playerFlipped, opponentCards, opponentFlipped);
            if (highestCard) {
                return highestCard;
            }
            return this.chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped);
        }
    }

    chooseCardEasy(playerCards, playerFlipped, opponentCards, opponentFlipped) {
        if (Math.random() < 0.4) {
            return this.chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped);
        }

        let min = Infinity;
        let index = -1;
        let isPlayer = false;

        playerCards.forEach((card, i) => {
            if (!playerFlipped[i] && card < min) {
                min = card;
                index = i;
                isPlayer = true;
            }
        });

        opponentCards.forEach((card, i) => {
            if (!opponentFlipped[i] && card < min) {
                min = card;
                index = i;
                isPlayer = false;
            }
        });

        if (index == -1) {
            return this.chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped);
        }
        else {
            return { isPlayer, index };
        }
    }

    chooseCardHard(playerCards, playerFlipped, opponentCards, opponentFlipped) {
        const highestCard = this.chooseHighestCard(playerCards, playerFlipped, opponentCards, opponentFlipped);
        if (highestCard) {
            return highestCard;
        }

        if (Math.random() < 0.2) {
            return this.chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped);
        }

        let max = -Infinity;
        let index = -1;
        let isPlayer = false;

        playerCards.forEach((card, i) => {
            if (!playerFlipped[i] && card > max) {
                max = card;
                index = i;
                isPlayer = true;
            }
        });

        opponentCards.forEach((card, i) => {
            if (!opponentFlipped[i] && card > max) {
                max = card;
                index = i;
                isPlayer = false;
            }
        });

        if (index == -1) {
            return this.chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped);
        }
        else {
            return { isPlayer, index };
        }
    }

    chooseCardRandom(playerCards, playerFlipped, opponentCards, opponentFlipped) {
        const unflippedIndicesPlayer = playerCards.map((card, i) => !playerFlipped[i] ? i : -1).filter(i => i !== -1);
        const unflippedIndicesOpponent = opponentCards.map((card, i) => !opponentFlipped[i] ? i : -1).filter(i => i !== -1);

        const totalUnflipped = unflippedIndicesPlayer.length + unflippedIndicesOpponent.length;
        const randomIndex = Math.floor(Math.random() * totalUnflipped);

        if (randomIndex < unflippedIndicesPlayer.length) {
            return { isPlayer: true, index: unflippedIndicesPlayer[randomIndex] };
        } else {
            return { isPlayer: false, index: unflippedIndicesOpponent[randomIndex - unflippedIndicesPlayer.length] };
        }
    }

    chooseHighestCard(playerCards, playerFlipped, opponentCards, opponentFlipped) {
        let highestCardIndex = -1;
        let highestCardValue = -Infinity;
        let isPlayer = false;

        const allUnflippedCards = [
            ...playerCards.filter((card, i) => !playerFlipped[i]),
            ...opponentCards.filter((card, i) => !opponentFlipped[i])
        ];

        playerCards.forEach((card, i) => {
            if (!playerFlipped[i] && card > highestCardValue && card > Math.max(...allUnflippedCards)) {
                highestCardValue = card;
                highestCardIndex = i;
                isPlayer = true;
            }
        });

        opponentCards.forEach((card, i) => {
            if (!opponentFlipped[i] && card > highestCardValue && card > Math.max(...allUnflippedCards)) {
                highestCardValue = card;
                highestCardIndex = i;
                isPlayer = false;
            }
        });

        if (highestCardIndex !== -1) {
            return { isPlayer, index: highestCardIndex };
        }

        return null;
    }
}