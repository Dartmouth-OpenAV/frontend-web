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
        // Re-evaluate selected camera input when any Zoom input state changes
        registerStateChangeEvent(
          "zoom_input_updated",
          zoomInput,
          [...document.querySelectorAll("[data-camera-zoom-true]")],
          handleZoomSelected,
        );
      });
    document.querySelectorAll(".power-button").forEach((powerButton) => {
      registerStateChangeEvent(
        "power_updated",
        powerButton,
        [...document.querySelectorAll("[data-camera-power-false]")],
        handlePowerOff,
      );
    });
    document.querySelectorAll(".power-button").forEach((powerButton) => {
      registerStateChangeEvent(
        "power_updated",
        powerButton,
        [...document.querySelectorAll("[data-camera-zoom-true]")],
        handlePowerOn,
      );
    });
    guiInitiated = true;
  }
}

function handleZoomSelected(e) {
  // If Zoom is turned on, set the cameras to default preset unless another preset is already selected
  const triggerBtn = e.detail; // zoom input button
  const targetBtn = e.target; // camera preset button
  // data-value: false means Zoom input is not selected
  // data-override: true means something is hiding the video output
  if (
    triggerBtn.getAttribute("data-override") === "true" ||
    triggerBtn.getAttribute("data-value") === "false"
  ) {
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
    updateStatus(payload, null, false);
  }
}

function handlePowerOff(e) {
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
      globals.getState().recording?.status === false) &&
    allPowerOff === true
  ) {
    const payload = targetBtn
      .getAttribute("data-path")
      .replace(/<value>/, true);
    updateStatus(payload, null, false);
  }
}

function handlePowerOn(e) {
  // If a power on event selects a zoom input, set the cameras to zoom preset
  const triggerBtn = e.detail; // power button
  const targetBtn = e.target; // zoom camera preset button
  const channel = triggerBtn.getAttribute("data-channel");
  if (triggerBtn.getAttribute("data-value") === "false") {
    return;
  }
  const selectedZoomInputs = channel
    ? document.querySelectorAll(
        `.display-source-radio[data-channel=${channel}] .radio-option[data-zoom-meeting-prompt][data-value=true]`,
      )
    : false;

  if (selectedZoomInputs) {
    const radioIsSetToPrivacy = targetBtn.parentElement.querySelector(
      ".radio-option[data-option=privacy][data-value=true]",
    )
      ? true
      : false;
    const noPresetSelected = targetBtn.parentElement.querySelector(
      ".radio-option.active",
    )
      ? false
      : true;
    if (radioIsSetToPrivacy || noPresetSelected) {
      const payload = targetBtn
        .getAttribute("data-path")
        .replace(/<value>/, true);
      updateStatus(payload, null, false);
    }
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateCameraIntegration);
