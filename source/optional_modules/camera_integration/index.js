/* Global variables */
import { updateStatus } from "../../js/orchestrator_request.js";
import { registerStateChangeEvent, sleep } from "../../js/utilities.js";
import { globals } from "../../js/globals.js";

import cameraPreview from "./components/camera_preview.html";
import cameraTabs from "./components/camera_tabs.html";
import "./camera_preview.css";

let guiInitiated = false;
var iframeGrid;
var iframeURLs;

//insert iframe grid into camera_controls-content aka {modal}-content

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
    //inserting cameraPreview into modal
    const previewConfigContent = globals.getState()?.camera_preview;
    if (previewConfigContent) {
      iframeURLs = previewConfigContent?.iframe_urls;
      const cameraPresetControl = document.querySelector("[data-camera-preview-all]");
      if (cameraPresetControl) {
        //data-camera-preview is set on the control set
        //need to find parent modal to insert preview HTML
        const cameraModal = cameraPresetControl.closest('.modal');
        const cameraModalPrimaryControl = cameraPresetControl.closest('.primary-control-group');
        cameraModalPrimaryControl.insertAdjacentHTML('beforeend', cameraPreview);
        cameraModalPrimaryControl.insertAdjacentHTML('afterbegin', cameraTabs);
        iframeGrid = document.getElementById("camera-preview-iframe-grid")
        const cameraModalLauncherButton = document.querySelector(`[data-modal=${cameraModal.id}]`);
        if (cameraModalLauncherButton) {
          cameraModalLauncherButton.addEventListener("click", () => renderPreviewGrid('all'));
          cameraModalLauncherButton.addEventListener("touchstart", () => renderPreviewGrid('all'));
          cameraModalLauncherButton.addEventListener("click", () => switchTabs('all'));
          cameraModalLauncherButton.addEventListener("touchstart", () => switchTabs('all'));
        }
        renderCameraTabs();
        switchTabs('all');
        //clearing the iframes after leaving the modal
        const backButton = cameraModal.querySelector(".dismiss-modal");
        if (backButton) {
          backButton.addEventListener("click", clearPreviewGrid);
          backButton.addEventListener("touchstart", clearPreviewGrid);
        }
      }
    }

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
    document.querySelectorAll(`.power-button.active`).length === 0;
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

async function handlePowerOn(e) {
  // If a power on event selects a zoom input, set the cameras to zoom preset
  const triggerBtn = e.detail; // power button
  const targetBtn = e.target; // zoom camera preset button
  const channel = triggerBtn.getAttribute("data-channel");
  if (triggerBtn.getAttribute("data-value") === "false") {
    return;
  }
  await sleep(100);
  const selectedZoomInputs = channel
    ? document.querySelectorAll(
      `.display-source-radio[data-channel=${channel}] .radio-option[data-zoom-meeting-prompt][data-value=true]`,
    )
    : false;

  if (selectedZoomInputs && selectedZoomInputs.length > 0) {
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

function buildStreamUrl(base) {
  const url = new URL(base);
  url.searchParams.set('controls', 'false');
  url.searchParams.set('muted', 'true');
  return url.toString();
}

function renderCameraTabs(){
  const cameraTabDiv = document.getElementById('camera-preview-tabs');
  if (document.querySelector('[data-camera-preview-all]')){
    const tabButtonAll = makeTabButton('all');
    cameraTabDiv.appendChild(tabButtonAll);
  }
  for (const name of Object.keys(iframeURLs)) {
    if (document.querySelector(`[data-camera-preview-${name}]`)){
      const tabButton = makeTabButton(name);
      cameraTabDiv.appendChild(tabButton);
    }
  }
  if (cameraTabDiv.children.length <= 1){
    cameraTabDiv.classList.add('hidden');
  }
}

function makeTabButton(name) {
  const tabButton = document.createElement('button');
  tabButton.classList.add('camera-tab-button', 'text-only');
  tabButton.id = `${name}`;

  const tabLabel = document.createElement('div');
  tabLabel.classList.add('button-label');
  // Replaces dashes with spaces and capitalizes first letter of every word
  const formattedName = formatName(name);
  tabLabel.textContent = formattedName;

  tabButton.appendChild(tabLabel);
  tabButton.addEventListener('touchstart',() => switchTabs(`${name}`));
  tabButton.addEventListener('click',() => switchTabs(`${name}`));
  return tabButton;
}

function formatName(str) {
  str = str.replace('-',' ');
  str = str.replace(/\b\w/g, char => char.toUpperCase());
  return str;
}

function renderPreviewGrid(selection) {
  clearPreviewGrid();
  for (const [name, base] of Object.entries(iframeURLs)) {
    if (selection == "all" || name == selection) {
      const tile = document.createElement('div');
      tile.className = 'iframe-tile';

      const frame = document.createElement('iframe');
      frame.src = buildStreamUrl(base);

      tile.appendChild(frame);
      iframeGrid.appendChild(tile);
    }
  }
}

function switchTabs(selection) {
  //find button with selection
  const newButton = document.querySelector(`#${selection}.camera-tab-button`);
  const newControlWrapper = document.querySelector(`[data-camera-preview-${selection}]`);
  var newControls;
  if (newControlWrapper) {
    newControls = newControlWrapper.closest('.secondary-control-group');
  }
  //mark current active button inactive, mark new button as active. 
  const currentButton = document.querySelector('.camera-tab-button.active');
  const currentControls = document.querySelectorAll('#camera_controls-content > .secondary-control-group:not(.hidden)');

  //Hide current and show new control set
  if (currentControls) {
    currentControls.forEach((control) => {
      control.classList.add('hidden');
    });
  }
  if (newControls) {
    newControls.classList.remove("hidden");
  }
  //Change active button tab
  if (currentButton) {
    currentButton.classList.remove("active");
  }
  if (newButton) {
    newButton.classList.add("active");
  }

  //Render grid with selection
  renderPreviewGrid(selection);
}

function clearPreviewGrid() {
  // removes every iframe tile at once
  iframeGrid.replaceChildren();
}

/* page load listener */
window.addEventListener("ui_ready", initiateCameraIntegration);
