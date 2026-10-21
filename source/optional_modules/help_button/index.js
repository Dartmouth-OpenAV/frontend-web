import { globals } from "../../js/globals.js";
import helpModal from "./components/help_modal.html";
import helpButton from "./components/help_button.html";
import { attachSharedModalListeners, openModal } from "../../js/modals.js";
import "./help_button.css";

let guiInitiated = false;

// Runs once on ui_ready
function initiateHelpButton() {
    if (!guiInitiated && globals.getState()?.help?.url) {
        const helpIconHTML = document.getElementById(
            "help-icon-template",
        ).innerHTML;
        const helpButtonHTML = helpButton.replace(
            /{{help-icon}}/g,
            helpIconHTML,
        );

        // Add help modal to DOM
        document
            .getElementById("plugin-modals-container")
            .insertAdjacentHTML("beforeend", helpModal);
        // Add help button to header
        document
            .getElementById("room-header-left")
            .insertAdjacentHTML("beforeend", helpButtonHTML);
        // Add modal opener to help button
        const helpButtonElement = document
            .getElementById("help-btn");

        helpButtonElement.addEventListener("click", () => openModal(null, "help-modal", true));
        helpButtonElement.addEventListener("touchstart", () => openModal(null, "help-modal", true));

        // Attach static listeners to inputs in custom modals, eg. Cancel/Back dismiss buttons
        attachSharedModalListeners();
        guiInitiated = true;

        const tile = document.getElementById("help-iframe");
        const frame = document.createElement('iframe');
        frame.src = globals.getState()?.help?.url;
        tile.appendChild(frame);
    }
}

window.addEventListener("ui_ready", initiateHelpButton);
