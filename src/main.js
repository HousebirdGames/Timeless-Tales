/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/timeless-tales/service-worker.js?v=2.0.6')
            .then(function (registration) {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);

                if (navigator.serviceWorker.controller) {
                    console.log('This page is currently controlled by:', navigator.serviceWorker.controller);
                }

                navigator.serviceWorker.ready.then((registration) => {
                    console.log('A service worker is active and ready:', registration.active);
                });
            }, function (err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            const scriptURL = registration.active ? registration.active.scriptURL : '';
            if (scriptURL && !scriptURL.includes(`?v=2.0.6`)) {
                registration.unregister().then(() => {
                    console.log(`Service Worker unregistered: ${scriptURL}`);
                });
            }
        });
    });
}

navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
        showUpdateNotification();
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker has taken control');
        window.location.reload();
    });
}

function showUpdateNotification() {
    if (confirm('A new version of this app is available. Reload to update?')) {
        window.location.reload();
    }
}

let deferredPrompt;

const installButton = document.getElementById('installButton');

if (installButton) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });

    installButton.addEventListener('click', (e) => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                alertPopup("With the local installation you can now play offline as well. Have fun!")
            }
        });
    });
    installButton.addEventListener('animationend', () => {
        installButton.style.animation = '';
    });

    window.addEventListener('appinstalled', () => {
        console.log("App installed");
        installButton.style.display = 'none';
        deferredPrompt = null;
    });
}

import Game from './modules/game.js?v=2.0.6';
import GameUI from './modules/gameUI.js?v=2.0.6';
import { calculateEnemyCombinations } from './modules/enemyGeneration.js?v=2.0.6';
import { calculateItemVariations } from './modules/itemGeneration.js?v=2.0.6';
import { locations, endbosses } from './modules/gameData.js?v=2.0.6';
import PopupManager from './modules/popupManager.js?v=2.0.6';
import { CardsGame } from './modules/cards.js?v=2.0.6';
import { patchNotesData } from './patchNotes.js?v=2.0.6';

const popupManager = new PopupManager();

document.addEventListener("DOMContentLoaded", () => {

    assignMenuButton();

    const gameDiv = document.getElementById("game");
    const game = new Game();
    if (gameDiv) {
        const gameUI = new GameUI(game);
        game.setGameUI(gameUI);
        game.play();
    }

    const startTenCards = document.querySelector(".startTenCards");
    if (startTenCards) {
        window.cardsGame = new CardsGame(null, null, true);
    }

    const difficultyButtons = document.querySelectorAll('.difficulty-button');
    if (difficultyButtons) {
        difficultyButtons.forEach(button => {
            button.addEventListener('click', () => {
                window.cardsGame = new CardsGame(button.dataset.difficulty, null, true);
            });
        });
    }

    const localMultiplayerButton = document.querySelector('.local-multiplayer-button');
    if (localMultiplayerButton) {
        localMultiplayerButton.addEventListener('click', () => {
            window.cardsGame = new CardsGame(null, null, true);
        });
    }

    const closePopupButtons = document.querySelectorAll(".closePopup");
    closePopupButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const parentPopup = button.closest(".popup");
            if (parentPopup) {
                popupManager.closePopup(parentPopup.id);
            }
        });
    });

    const newGamePopupButton = document.querySelector("button#newGamePopupButton");
    if (newGamePopupButton) {
        newGamePopupButton.addEventListener("click", () => {
            popupManager.openPopup("newGamePopup");
        });
    }

    const playCardsButton = document.querySelector("button#playCards");
    if (playCardsButton) {
        playCardsButton.addEventListener("click", () => {
            window.cardsGame = new CardsGame(null, null, true);
            popupManager.closePopup("menu");
        });
    }

    const cardsRulesButton = document.querySelector("button#cardsRulesButton");
    if (cardsRulesButton) {
        cardsRulesButton.addEventListener("click", () => {
            popupManager.openPopup("cardsRulesPopup");
        });
    }

    const inventoryButton = document.querySelector("button#inventoryButton");
    if (inventoryButton && game) {
        inventoryButton.addEventListener("click", () => {
            game.gameUI.updateInventoryPopup();
            popupManager.openPopup("inventoryPopup");
        });
    }

    const enterNameButton = document.querySelector("button#enter-name-button");
    if (enterNameButton) {
        enterNameButton.addEventListener("click", () => {
            popupManager.openPopup("playerNameModal");
        });
    }

    const playerNameInput = document.getElementById("playerNameInput");
    const submitNameButton = document.getElementById("submitNameButton");

    if (submitNameButton && playerNameInput) {
        submitNameButton.addEventListener("click", () => {
            let playerName = playerNameInput.value.trim();

            if (playerName !== "") {
                game.setPlayerName(playerName);
                popupManager.closePopup("playerNameModal");
                popupManager.openPopup("playerClassPopup")
            } else {
                alertPopup("Please enter a valid name.");
            }
        });
    }

    const changeStyleButton = document.getElementById("changeStyleButton");
    if (changeStyleButton) {
        changeStyleButton.addEventListener("click", () => {
            popupManager.openPopup("stylePopup");
        });
    }

    const styleButtons = document.querySelectorAll(".style-button");
    if (styleButtons) {
        styleButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const styleFile = button.getAttribute("data-style");
                setSelectedStyle(styleFile);
            });
        });
    }

    const clearButton = document.getElementById("clearButton");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            const localStorageEntriesToDelete = ['gameState'];
            deleteSpecificLocalStorageEntries(localStorageEntriesToDelete);
            const cookiesToDelete = ['storageAcknowledgementTimelessTales', 'selectedStyle', 'lastUpdateNoteTimelessTales'];
            deleteSpecificCookies(cookiesToDelete);
            location.reload()
        });
    }

    const openAcknolegmentPopupButtons = document.querySelectorAll(".openAcknolegmentPopupButton");
    if (openAcknolegmentPopupButtons) {
        openAcknolegmentPopupButtons.forEach(openAcknolegmentPopupButton => {
            openAcknolegmentPopupButton.addEventListener("click", () => {
                popupManager.openPopup("storageAcknowledgementPopup");
            });
        });
    }

    if (getCookie("storageAcknowledgementTimelessTales") === 'true') {
        popupManager.closePopup("storageAcknowledgementPopup");
    }

    const storageAcknowledgementButton = document.getElementById("storageAcknowledgementButton");
    if (storageAcknowledgementButton) {
        storageAcknowledgementButton.addEventListener("click", () => {
            const wasTrue = getCookie("storageAcknowledgementTimelessTales") === 'true';
            setCookie("storageAcknowledgementTimelessTales", true, 365);
            popupManager.closePopup("storageAcknowledgementPopup");
            if (!wasTrue) {
                location.reload();
            }
        });
    }

    if (getCookie("storageAcknowledgementTimelessTales") != 'true' || !getCookie("storageAcknowledgementTimelessTales")) {
        popupManager.openPopup("storageAcknowledgementPopup");
    }

    const selectedStyle = getCookie("selectedStyle");
    if (selectedStyle) {
        const stylePath = selectedStyle.replace(/(\.css)(\?v=[\d.]+)?$/, `$1?v=2.0.6`);
        setSelectedStyle(stylePath);
    }

    function setSelectedStyle(styleFile) {
        const isInSubfolder = window.location.pathname.split('/').length > 3;
        const adjustedStyleFile = isInSubfolder ? `../${styleFile}` : styleFile;
        document.querySelector('link[id="secondary-style"]').href = "timeless-tales/" + adjustedStyleFile;
        if (getCookie("storageAcknowledgementTimelessTales") === 'true') {
            setCookie("selectedStyle", styleFile, 365);
        }
    }

    const numbersButton = document.getElementById("numbersButton");
    if (numbersButton) {
        numbersButton.addEventListener("click", () => {
            popupManager.openPopup("numbersPopup");

            const locationsCount = locations.length + endbosses.length;
            const enemyCombinations = calculateEnemyCombinations();
            const itemVariations = calculateItemVariations();

            let listHTML = '';
            listHTML += `<li>Locations: <strong>${locationsCount}</strong></li>`;
            listHTML += `<li>Enemy Types: <strong>${enemyCombinations.numEnemyTypes}</strong></li>`;
            listHTML += `<li>Enemy Variations: <strong>${enemyCombinations.totalCombinations}</strong></li>`;
            listHTML += `<li>Endbosses: <strong>${enemyCombinations.numEndbosses}</strong></li>`;
            listHTML += `<li>Items dropped by Endbosses: <strong>${itemVariations.numEndbossDrops}</strong></li>`;
            listHTML += `<li>Base Items: <strong>${itemVariations.numBaseItems}</strong></li>`;
            listHTML += `<li>Base Item Variations: <strong>${itemVariations.totalVariations}</strong></li>`;
            listHTML += `<li>Companions: <strong>${itemVariations.numCompanions}</strong></li>`;

            document.getElementById("numbersList").innerHTML = listHTML;
        });
    }

    const updateNotesButton = document.getElementById("updateNotesButton");
    if (updateNotesButton) {
        updateNotesButton.addEventListener('click', () => {
            showUpdateNotes(true);
        });
    }

    function showUpdateNotes(force = false) {
        const latestPatch = patchNotesData[0];

        if (getCookie("lastUpdateNoteTimelessTales") !== latestPatch.version || force) {
            const updatePopup = document.getElementById("updatePopup");
            const updateContent = document.getElementById("updateContent");
            const patchNotesButtonsContainer = document.getElementById("patchNotesButtonsContainer");

            if (updatePopup && updateContent && patchNotesButtonsContainer) {
                updateContent.innerHTML = `
                  <p>Version ${latestPatch.version}</p>
                  <ul id="patchNotesList">
                    ${latestPatch.notes.map((note) => `<li>${note}</li>`).join('')}
                  </ul>
                `;

                patchNotesButtonsContainer.innerHTML = '';
                //const reversedPatchNotes = [...patchNotesData].reverse();
                patchNotesData.forEach((patch, index) => {
                    const button = document.createElement("button");
                    button.classList.add('updateVersionButton');
                    button.textContent = `Version ${patch.version}`;

                    if (patch.version === latestPatch.version) {
                        button.classList.add('active');
                    }

                    button.addEventListener("click", () => {
                        updateContent.querySelector("p").textContent = `Version ${patch.version}`;
                        document.getElementById("patchNotesList").innerHTML = patch.notes
                            .map((note) => `<li>${note}</li>`)
                            .join("");

                        // Remove the active class from all buttons
                        patchNotesButtonsContainer.querySelectorAll('.updateVersionButton').forEach(btn => {
                            btn.classList.remove('active');
                        });

                        // Add the active class to the clicked button
                        button.classList.add('active');
                    });
                    patchNotesButtonsContainer.appendChild(button);
                });

                popupManager.openPopup("updatePopup");
                const updateConfirm = document.getElementById("updateConfirm");
                if (updateConfirm) {
                    updateConfirm.addEventListener("click", (event) => {
                        if (getCookie("storageAcknowledgementTimelessTales") === "true") {
                            setCookie("lastUpdateNoteTimelessTales", latestPatch.version, 365);
                        }
                        popupManager.closePopup("updatePopup");
                    });
                }
            }
        }
    }

    if (getCookie("storageAcknowledgementTimelessTales") == 'true') {
        showUpdateNotes();
    }

    window.addEventListener("click", (event) => {
        popupManager.popups.forEach((popup) => {
            if (popup.classList.contains("keepOpen")) {
                return;
            }

            if (event.target === popup) {
                popupManager.closePopup(popup.id);
            }
        });
    });

    const fullscreenButton = document.getElementById('fullscreenButton');

    if (fullscreenButton) {
        if (window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true) {
            fullscreenButton.style.display = 'none';
            document.querySelector('.showOnAncientStyle').style.display = 'none';
            document.querySelector('.hideOnAncientStyle').style.display = 'none';
        }

        fullscreenButton.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }
});

export function roundToHalf(value) {
    return Math.round(value * 2) / 2;
}

export function roundToFull(value) {
    return Math.round(value);
}

export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = days ? `; expires=${date.toUTCString()}` : '';
    document.cookie = `${name}=${value}${expires}; path=/`;
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const deleteAllCookies = () => {
    const cookies = document.cookie.split(";");

    for (const cookie of cookies) {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
};

const deleteSpecificCookies = (cookieNames) => {
    for (const name of cookieNames) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
};

const deleteSpecificLocalStorageEntries = (keys) => {
    for (const key of keys) {
        localStorage.removeItem(key);
    }
};

export function alertPopup(content) {
    const alertPopup = document.getElementById("alertPopup");
    const alertPopupContent = document.getElementById("alertPopupContent");
    if (alertPopupContent && alertPopup) {
        popupManager.openPopup("alertPopup");
        alertPopupContent.innerHTML = content;
    }
    else {
        alert(content);
    }
}

export function assignMenuButton() {
    const menuButton = document.querySelector("button#menuButton");
    if (menuButton) {
        menuButton.addEventListener("click", () => {
            popupManager.openPopup("menu");
        });
    }
}

let glitchPaused = false;

export function pauseGlitch() {
    glitchPaused = true;
}

export function resumeGlitch() {
    glitchPaused = false;
}

setInterval(() => {
    document.querySelectorAll('.glitch').forEach(el => {
        el.classList.remove('glitch');
    });

    if (!glitchPaused) {
        const elements = document.querySelectorAll('*:not(.noGlitch)');
        const numElements = Math.floor(Math.random() * 5) + 1;
        const indices = Array.from({ length: elements.length }, (_, i) => i);
        const randomIndices = [];
        for (let i = 0; i < numElements; i++) {
            const randomIndex = Math.floor(Math.random() * indices.length);
            randomIndices.push(indices[randomIndex]);
            indices.splice(randomIndex, 1);
        }
        randomIndices.forEach(index => {
            elements[index].classList.add('glitch');
        });
    }
}, 10000);

const splashScreen = document.getElementById('splash-screen');
const splashImage = document.getElementById('splash-image');

if (splashScreen && splashImage) {
    function hideSplashScreen() {
        setTimeout(() => {
            splashScreen.classList.add("fade-out");
        }, 1000);
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 2000);
    }

    const firstLoad = sessionStorage.getItem('firstLoad');

    if (!firstLoad) {
        splashScreen.classList.add('fade-out-splash');
        setTimeout(hideSplashScreen, 4500);

        sessionStorage.setItem('firstLoad', 'true');
    } else {
        splashScreen.style.display = 'none';
    }
}