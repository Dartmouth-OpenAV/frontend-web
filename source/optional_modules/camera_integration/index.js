/* Global variables */
import { updateStatus } from "../../js/orchestrator_request.js";
import { registerStateChangeEvent } from "../../js/utilities.js";
import { globals } from "../../js/globals.js";
let guiInitiated = false;

function initiateCameraIntegration() {
  // make sure elements only get initialized once
  if (!guiInitiated) {
    document
      .querySelectorAll("[data-camera-zoom-true]")
      .forEach((cameraPreset) => {
        document
          .querySelectorAll("[data-zoom-meeting-prompt]")
          .forEach((zoomInput) => {
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
        // Look for linked power buttons, which should trigger privacy preset on shutdown
        const channel = cameraPreset.parentElement.getAttribute("data-channel");
        const linkedPower = channel
          ? document.querySelector(`.power-button[data-channel=${channel}]`)
          : null;
        if (linkedPower) {
          registerStateChangeEvent(
            "power_updated",
            linkedPower,
            [cameraPreset],
            handlePowerSelected,
          );
        }
      });
    guiInitiated = true;
  }
}

function handleZoomSelected(e) {
  // If Zoom is turned on, set the cameras to default preset unless another preset is already selected
  const triggerBtn = e.detail;
  const triggerBtnParent = triggerBtn.parentElement;
  if (triggerBtn.getAttribute("data-value") === "false") {
    return;
  }
  const channel = triggerBtnParent.getAttribute("data-channel");
  document
    .querySelectorAll(`.camera-preset-radio[data-channel*=${channel}]`)
    .forEach((radio) => {
      const radioIsSetToPrivacy = radio.querySelector(
        ".radio-option[data-option=privacy][data-value=true]",
      )
        ? true
        : false;
      const noPresetSelected = radio.querySelector(".radio-option.active")
        ? false
        : true;
      if (radioIsSetToPrivacy || noPresetSelected) {
        const targetBtn = e.target;
        const value = true;
        const payload = targetBtn
          .getAttribute("data-path")
          .replace(/<value>/, value);
        updateStatus(payload, null);
      }
    });
}

function handlePowerSelected(e) {
  // If last power is turned off, set the cameras to called preset
  const triggerBtn = e.detail;
  if (triggerBtn.getAttribute("data-value") === "true") {
    return;
  }
  const targetBtn = e.target;
  const channel = targetBtn.parentElement.getAttribute("data-channel");
  const allChannelPowerOff =
    document.querySelectorAll(
      `.power-button[data-channel="${channel}"] .active`,
    ).length === 0;
  // If recording doesn't exist OR is not active AND all power buttons are off, set the cameras to called preset
  if (
    (!Object.hasOwn(globals.getState(), "recording") ||
      globals.getState().recording?.status?.recording === false) &&
    allChannelPowerOff
  ) {
    const value = true;
    const payload = targetBtn
      .getAttribute("data-path")
      .replace(/<value>/, value);
    updateStatus(payload, null);
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateCameraIntegration);
