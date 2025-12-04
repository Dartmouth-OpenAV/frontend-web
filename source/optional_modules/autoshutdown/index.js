/***
 *
 *
 * Autoshutdown
 *
 *
 */
import {
  sendUIInteractionUpdate,
  countdown,
  disableControl,
  enableControl,
  useProgressBar,
  throwClientError,
} from "../../js/utilities.js";
import {
  attachSharedModalListeners,
  openModal,
  closeModal,
} from "../../js/modals.js";
import { globals } from "../../js/globals.js";
import { handleDisplaySourceSelect } from "../../js/controls/display_source_radio.js";
import { handleTogglePower } from "../../js/controls/power_button.js";
import { updateStatus } from "../../js/orchestrator_request.js";
import autoshutdownWarningModal from "./components/autoshutdown_modal.html";
import "./autoshutdown.css";

let autoshutdownTriggered = false;
const autoshutdownWarningTime = 600; // seconds
let countdownTimeoutId;

function checkForAutoshutdown() {
  const environmentSensingData = globals.getState()?.environment_sensing
    ? globals.getState()?.environment_sensing
    : false;

  // first, check that there are any displays that even need to be shutdown
  if (
    environmentSensingData &&
    document.querySelectorAll(".power-button[data-value=true]").length > 0
  ) {
    let occupancyDetected = false;

    // environmentSensing endpoint can include any number of checks,
    // each of which should have an "occupancy_detected" GET defined.
    // Note: If the check returns an error we want to assume occupancy
    // to be cautious, hence the !==false check
    for (const occupancyCheck in environmentSensingData) {
      if (environmentSensingData[occupancyCheck].occupancy_detected !== false) {
        occupancyDetected = true;
      }
    }

    // If no occupancy detected, and autoshutdown has not yet been triggered,
    // display the autoshutdown warning
    if (!autoshutdownTriggered && !occupancyDetected) {
      autoshutdownTriggered = true;
      const autoshutdownWarningModal = document.getElementById(
        "autoshutdown-warning",
      );

      // attach cancel listeners
      autoshutdownWarningModal
        .querySelector("button[name=cancel]")
        .addEventListener("click", handleCancelAutoshutdown);
      autoshutdownWarningModal
        .querySelector("button[name=cancel]")
        .addEventListener("touchstart", handleCancelAutoshutdown);

      openModal(null, "autoshutdown-warning", false); // userInput = false

      // Default action: shutdown after 600 seconds
      const countdownSpan = autoshutdownWarningModal.querySelector(".counter");
      countdownTimeoutId = countdown(
        countdownSpan,
        autoshutdownWarningTime,
        autoshutdown,
      );
    }

    // else, autoshutdown has already been triggered; check for anyone walking into the room during shutdown
    else if (autoshutdownTriggered && occupancyDetected) {
      console.log("New occupancy detected during autoshutdown countdown");
      cancelAutoshutdown();
    }
  }
}

function autoshutdown() {
  document.querySelectorAll(".power-button[data-value=true]").forEach((btn) => {
    // visual feedback
    // block clicks
    disableControl(btn, handleTogglePower);
    // check if linked input buttons need to be blocked too
    const channel = btn.getAttribute("data-channel")
      ? btn.getAttribute("data-channel")
      : false;
    const linkedInputs = channel
      ? document.querySelectorAll(
          `.display-source-radio[data-channel=${channel}] .radio-option`,
        )
      : false;
    if (channel && linkedInputs) {
      linkedInputs.forEach((inputBtn) => {
        disableControl(inputBtn, handleDisplaySourceSelect);
      });
    }

    // callback
    function reset() {
      // check for progress bar
      const progressDuration = btn.getAttribute("data-duration")
        ? parseInt(btn.getAttribute("data-duration"))
        : false;
      if (progressDuration) {
        const progress =
          btn.parentElement.parentElement.querySelector(".progress");
        useProgressBar(progress, progressDuration, "cooling", allowEvents);
      }
      // if they don't need a warmup, reattach power clicks now
      else {
        allowEvents();
      }
    }

    function allowEvents() {
      enableControl(btn, handleTogglePower);
      linkedInputs.forEach((input) => {
        enableControl(input);
      });
    }

    // update backend
    let payload = btn.getAttribute("data-path").replace(/<value>/, false);
    // pass false for userInput to avoid user interaction being logged
    updateStatus(payload, reset, false);
  });

  // hide the modal
  document.getElementById("autoshutdown-warning").classList.add("hidden");
}

function handleCancelAutoshutdown(e) {
  // visual feedback
  e.target.classList.add("active");
  closeModal(e);

  // do the thing
  cancelAutoshutdown();

  // post alert to Slack about potential sensor error
  throwClientError(
    "Possible occupancy detection error (autoshutdown cancelled by button press)",
  );

  // send ajax_call to propagate cancel to other panels
  sendUIInteractionUpdate();
}

function cancelAutoshutdown() {
  const autoshutdownWarningModal = document.getElementById(
    "autoshutdown-warning",
  );
  autoshutdownWarningModal.classList.add("hidden");

  // halt the countdown to shutdown
  clearInterval(countdownTimeoutId);

  // reset autoshutdownTriggered flag to resting state
  autoshutdownTriggered = false;

  // Remove the Cancel button listeners
  autoshutdownWarningModal
    .querySelector("button[name=cancel]")
    .removeEventListener("click", handleCancelAutoshutdown);
  autoshutdownWarningModal
    .querySelector("button[name=cancel]")
    .removeEventListener("touchstart", handleCancelAutoshutdown);
}

function initiateAutoshutdownGUI() {
  // make sure elements only get initialized once
  if (globals.getState()?.environment_sensing) {
    // If Autoshutdown modal not present already, add to DOM
    if (!document.getElementById("autoshutdown-warning")) {
      // Add Autoshutdown modal to DOM
      document
        .getElementById("plugin-modals-container")
        .insertAdjacentHTML("beforeend", autoshutdownWarningModal);
    }

    // Attach static listeners to inputs in custom Autoshutdown modals, eg. Cancel/Back dismiss buttons
    attachSharedModalListeners();

    // Start listening for state changes from main
    window.addEventListener("new_state", checkForAutoshutdown);
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateAutoshutdownGUI);
