/*Timeless Tales is a retro text adventure created and published by Felix T. Vogel in 2023*/

export default class PopupManager {
    constructor() {
        this.popups = document.querySelectorAll('.popup');
    }

    openPopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.style.display = 'block';
        }
    }

    closePopup(popupId) {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.style.display = 'none';
        }
    }
}
