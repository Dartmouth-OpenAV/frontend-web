/* Global variables */
import { updateStatus } from "../../js/orchestrator_request.js";
import { registerStateChangeEvent } from "../../js/utilities.js";
import { globals } from "../../js/globals.js";
let guiInitiated = false;

function initiateCameraIntegration() {
  // make sure elements only get initialized once
  if (!guiInitiated) {
    document
      .querySelectorAll("[data-zoom-meeting-prompt]")
      .forEach((zoomInput) => {
        document
          .querySelectorAll("[data-camera-zoom-true]")
          .forEach((cameraPreset) => {
            // Re-evaluate selected camera input when any Zoom input state changes
            registerStateChangeEvent(
              "zoom_input_updated",
              zoomInput,
              [cameraPreset],
              handleZoomSelected,
            );
          });
      });
    document
      .querySelectorAll("[data-camera-power-false]")
      .forEach((cameraPreset) => {
        // Look for power buttons, which should trigger privacy preset on shutdown
        document.querySelectorAll(".power-button").forEach((powerButton) => {
          registerStateChangeEvent(
            "power_updated",
            powerButton,
            [cameraPreset],
            handlePowerSelected,
          );
        });
      });
    guiInitiated = true;
  }
}

function handleZoomSelected(e) {
  // If Zoom is turned on, set the cameras to default preset unless another preset is already selected
  const triggerBtn = e.detail;
  const targetBtn = e.target;
  if (triggerBtn.getAttribute("data-value") === "false") {
    return;
  }
  const targetBtnParent = e.target.parentElement;
  const radioIsSetToPrivacy = targetBtnParent.querySelector(
    ".radio-option[data-option=privacy][data-value=true]",
  )
    ? true
    : false;
  const noPresetSelected = targetBtnParent.querySelector(".radio-option.active")
    ? false
    : true;
  if (radioIsSetToPrivacy || noPresetSelected) {
    const payload = targetBtn
      .getAttribute("data-path")
      .replace(/<value>/, true);
    updateStatus(payload, null);
  }
}

function handlePowerSelected(e) {
  // If last power is turned off, set the cameras to called preset
  const triggerBtn = e.detail;
  const targetBtn = e.target;
  if (triggerBtn.getAttribute("data-value") === "true") {
    return;
  }
  const allPowerOff =
    document.querySelectorAll(`.power-button .active`).length === 0;
  // If recording doesn't exist OR is not active AND all power buttons are off, set the cameras to called preset
  if (
    (!Object.hasOwn(globals.getState(), "recording") ||
      globals.getState().recording?.status?.recording === false) &&
    allPowerOff
  ) {
    const payload = targetBtn
      .getAttribute("data-path")
      .replace(/<value>/, true);
    updateStatus(payload, null);
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateCameraIntegration);
