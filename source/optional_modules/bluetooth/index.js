/***
 * Bluetooth Pairing Modal
 *
 * Handles the Bluetooth device pairing process including:
 * - Showing/hiding the pairing modal
 * - Starting/canceling the pairing process
 * - Displaying a countdown timer
 * - Updating UI based on connection status
 */

import { countdown } from "../../js/utilities.js";
import { globals } from "../../js/globals.js";
import { updateStatus } from "../../js/orchestrator_request.js";
import { bumpMainContentForBanners } from "../../js/utilities.js";
import bluetoothModal from "./components/bluetooth_modal.html";
import bluetoothBanner from "./components/bluetooth_banner.html";
import "./bluetooth.css";

const pairingTime = 60; // seconds
let modalPairingTimeoutId;
let bannerPairingTimeoutId;
let modalDismissTimeout;
let guiInitiated = false;

// Runs once on ui_ready
function initiateBluetoothGUI() {
  if (!guiInitiated && globals.getState()?.bluetooth) {
    // Initiate zoomData object with globals.state (which should be assigned before ui_ready fires)

    const bluetoothIconHTML = document.getElementById(
      "bluetooth-icon-template",
    ).innerHTML;
    const bannersHTML = bluetoothBanner.replace(
      /{{bluetooth_icon}}/g,
      bluetoothIconHTML,
    );

    // Add bluetooth banner to DOM
    document
      .getElementById("banners-container")
      .insertAdjacentHTML("beforeend", bannersHTML);

    // Add bluetooth modal to DOM
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", bluetoothModal);

    // Attaching event listeners to input button rendered by main.js
    document.querySelectorAll("[data-bluetooth-input]").forEach((input) => {
      input.addEventListener("click", showBluetoothModal);
      input.addEventListener("touchstart", showBluetoothModal);
    });

    // convert to query selector??
    const disconnectBtn = document.querySelector(
      "button[name=disconnect-bluetooth]",
    );
    const pairButton = document.getElementById(
      "bluetooth-pairing-start-button",
    );
    const cancelButton = document.getElementById(
      "bluetooth-pairing-cancel-button",
    );
    const backButton = document.getElementById("bluetooth-pairing-back-button");

    // Attaching event listeners to buttons rendered by this module
    if (pairButton) {
      pairButton.addEventListener("click", handlePairingClick);
      pairButton.addEventListener("touchstart", handlePairingClick);
    }
    if (backButton) {
      backButton.addEventListener("click", hideBluetoothModal);
      backButton.addEventListener("touchstart", hideBluetoothModal);
    }
    if (cancelButton) {
      cancelButton.addEventListener("click", handleCancelPairing);
      cancelButton.addEventListener("touchstart", handleCancelPairing);
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", disconnectPairing);
      disconnectBtn.addEventListener("touchstart", disconnectPairing);
    }

    guiInitiated = true;

    // Start listening for state changes from main
    window.addEventListener("new_state", updateDeviceStatus);
    window.addEventListener("new_state", updateRoomName);
  }
}

// new_state functions
function updateRoomName(e) {
  const roomName = e.detail.bluetooth?.room_name;
  const banner = document.getElementById("bluetooth-status-notification");

  // Update room name in banner and modal
  const modalDescriptionBlob = document
    .getElementById("bluetooth-description")
    .innerHTML.replace(/{{room_name}}/g, roomName);
  document.getElementById("bluetooth-description").innerHTML =
    modalDescriptionBlob;
  const bannerRoomNameBlob = banner
    .querySelector(".feedback-message")
    .innerHTML.replace(/{{room_name}}/g, roomName);
  banner.querySelector(".feedback-message").innerHTML = bannerRoomNameBlob;
}

function updateDeviceStatus(e) {
  const bluetoothInfo = e.detail.state?.bluetooth;
  const statusElement = document.getElementById("bluetooth-description");
  const pairButton = document.getElementById("bluetooth-pairing-start-button");
  const bluetoothBanner = document.getElementById(
    "bluetooth-status-notification",
  );
  const disconnectBtn = document
    .getElementById("bluetooth-status-notification")
    .querySelector("button[name=disconnect-bluetooth]");

  if (bluetoothInfo?.status == "CONNECTED") {
    cancelBluetoothCountdowns();

    if (statusElement) {
      let statusHTML = "<p>Connected to Device</p>";
      if (bluetoothInfo.device_info && bluetoothInfo.device_info != "unknown") {
        statusHTML = statusHTML + "<p>" + bluetoothInfo.device_info + "</p>";
      }
      if (bluetoothInfo.music_info && bluetoothInfo.music_info != "unknown") {
        statusHTML = statusHTML + "<p>" + bluetoothInfo.music_info + "</p>";
      }
      statusElement.innerHTML = statusHTML;
    }

    if (pairButton) {
      pairButton.classList.remove("hidden");
      pairButton.classList.add("active");
      const label = pairButton.querySelector(".button-label");
      if (label) {
        label.innerHTML = "Disconnect";
      }
    }

    if (bluetoothBanner) {
      bluetoothBanner.classList.remove("hidden");
      let bannerStatusMessage = bluetoothBanner.querySelector(
        ".connected-status-container",
      );
      let bannerCountdown = bluetoothBanner.querySelector(
        ".countdown-container",
      );
      let bannerHTML = "<p>Connected to Device</p>";
      if (bluetoothInfo.device_info && bluetoothInfo.device_info != "unknown") {
        bannerHTML = "<p>Connected to " + bluetoothInfo.device_info;
        if (bluetoothInfo.music_info && bluetoothInfo.music_info != "unknown") {
          bannerHTML = bannerHTML + " - " + bluetoothInfo.music_info;
        }
        bannerHTML = bannerHTML + "</p>";
      }
      bannerCountdown.classList.add("hidden");

      bannerStatusMessage.innerHTML = bannerHTML;
      bannerStatusMessage.classList.remove("hidden");
    }
    if (disconnectBtn) {
      disconnectBtn.classList.remove("hidden");
    }
    clearInterval(modalPairingTimeoutId);
    clearInterval(bannerPairingTimeoutId);
    modalPairingTimeoutId = null;
    bannerPairingTimeoutId = null;
    // set timer for 5 seconds before closing modal
    modalDismissTimeout = setTimeout(() => {
      hideBluetoothModal();
      modalDismissTimeout = null;
    }, 5000);
  } else if (bluetoothInfo?.status == "IDLE" && !modalPairingTimeoutId) {
    // Resets modal and banner
    resetModalState();
  }
}

// Show and hide stuff
function showBluetoothModal() {
  const modal = document.getElementById("bluetooth-pairing");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function hideBluetoothModal() {
  const modal = document.getElementById("bluetooth-pairing");
  clearInterval(modalDismissTimeout);
  if (modal) {
    modal.classList.add("hidden");
  }
}

function showBluetoothBanner() {
  const bluetoothBanner = document.getElementById(
    "bluetooth-status-notification",
  );
  if (bluetoothBanner) {
    bluetoothBanner.classList.remove("hidden");
  }
  bumpMainContentForBanners();
}

function hideBluetoothBanner() {
  const bluetoothBanner = document.getElementById(
    "bluetooth-status-notification",
  );
  if (bluetoothBanner) {
    bluetoothBanner.classList.add("hidden");
  }
  bumpMainContentForBanners();
}

// Handle functions
function handleCancelPairing() {
  cancelBluetoothCountdowns();
  disconnectPairing();
}

function handlePairingClick() {
  const pairButton = document.getElementById("bluetooth-pairing-start-button");
  if (pairButton.classList.contains("active")) {
    pairButton.classList.remove("active");
    disconnectPairing();
  } else {
    pairButton.classList.add("active");
    pairButton.classList.add("hidden");
    startPairing();
  }
}

// Pairing functions
function startPairing() {
  // Show banner
  showBluetoothBanner();

  // Show connection countdowns
  startBluetoothCountdowns();

  // Send command to start pairing
  const payload = JSON.stringify({
    bluetooth: { pair: true },
  });

  updateStatus(payload, function (response) {
    if (response["status"] !== "success") {
      console.log(response);
      console.log("Error starting pairing");
    }
  });
}

function timeoutCallback() {
  resetModalState();
  hideBluetoothBanner();
  disconnectPairing();
}

function disconnectPairing() {
  resetModalState();

  // Send command to cancel pairing
  const payload = JSON.stringify({
    bluetooth: { pair: false },
  });
  updateStatus(payload, function (response) {
    if (response["status"] !== "success") {
      console.log("Error canceling pairing");
    }
  });
}

// Countdown functions
function startBluetoothCountdowns() {
  const modalCountdownElement = document.getElementById(
    "bluetooth-pairing-countdown",
  );
  const modalCounterDiv = modalCountdownElement.querySelector(".counter");
  const bannerCountdownElement = document.getElementById(
    "bluetooth-status-notification",
  );
  const bannerCounterDiv = bannerCountdownElement.querySelector(".counter");

  // Show cancel button
  const cancelButton = document.getElementById(
    "bluetooth-pairing-cancel-button",
  );
  cancelButton.classList.remove("hidden");

  // Show modal countdown. Start modal and banner countdowns.
  modalCountdownElement.classList.remove("hidden");
  modalPairingTimeoutId = countdown(
    modalCounterDiv,
    pairingTime,
    timeoutCallback,
  );
  bannerPairingTimeoutId = countdown(bannerCounterDiv, pairingTime);
}

function cancelBluetoothCountdowns() {
  const modalCountdownElement = document.getElementById(
    "bluetooth-pairing-countdown",
  );

  // Hide cancel button
  const cancelButton = document.getElementById(
    "bluetooth-pairing-cancel-button",
  );
  cancelButton.classList.add("hidden");

  // Stop timeout to automatically reset the modal and banner
  clearInterval(modalPairingTimeoutId);
  clearInterval(bannerPairingTimeoutId);
  modalPairingTimeoutId = null;
  modalCountdownElement.classList.add("hidden");
}

// Reset functions
function resetModalState() {
  const countdownElement = document.getElementById(
    "bluetooth-pairing-countdown",
  );
  const statusElement = document.getElementById("bluetooth-description");
  const pairButton = document.getElementById("bluetooth-pairing-start-button");
  const cancelButton = document.getElementById(
    "bluetooth-pairing-cancel-button",
  );

  if (countdownElement) {
    countdownElement.classList.add("hidden");
  }

  if (statusElement) {
    if (globals.getState().bluetooth.room_name) {
      statusElement.innerHTML =
        "<p>Connect your device to the room with Bluetooth <br>BT Name: " +
        globals.getState().bluetooth.room_name +
        "</p>";
    } else {
      statusElement.innerHTML =
        "<p>Connect your device to the room with Bluetooth</p>";
    }
  }

  if (cancelButton) {
    cancelButton.classList.add("hidden");
  }

  if (pairButton) {
    pairButton.classList.remove("active");
    pairButton.classList.remove("hidden");
    const label = pairButton.querySelector(".button-label");
    if (label) {
      label.innerHTML = "Start Pairing";
    }
  }

  resetBluetoothBanner();
}

function resetBluetoothBanner() {
  const bluetoothBanner = document.getElementById(
    "bluetooth-status-notification",
  );
  let bannerStatusMessage = bluetoothBanner.querySelector(
    ".connected-status-container",
  );
  let bannerCountdown = bluetoothBanner.querySelector(".countdown-container");
  const disconnectBtn = document
    .getElementById("bluetooth-status-notification")
    .querySelector("button[name=disconnect-bluetooth]");

  hideBluetoothBanner();
  if (bannerStatusMessage) {
    bannerStatusMessage.classList.add("hidden");
  }
  if (bannerCountdown) {
    bannerCountdown.classList.remove("hidden");
  }
  if (disconnectBtn) {
    disconnectBtn.classList.add("hidden");
  }
}

window.addEventListener("ui_ready", initiateBluetoothGUI);
