/*
 *
 * Power
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { setButtonState } from "./toggle_button.js";
import {
  setVideoMuteButtonState,
  handleVideoMute,
} from "./video_mute_button.js";
import { handleDisplaySourceSelect } from "./display_source_radio.js";
import {
  followPath,
  mergeJSON,
  countdown,
  useProgressBar,
  disableControl,
  enableControl,
} from "../utilities.js";

const shutdownWarningTime = 60; // seconds
let countdownTimeoutId;

function setPowerState(powerBtn, state) {
  setButtonState(powerBtn, state, handleTogglePower);
}

function handleTogglePower(e) {
  const btn = e.target;
  const currentState = btn.getAttribute("data-value");
  const newState = currentState === "true" ? false : true;
  const path = btn.getAttribute("data-path");
  let postData = path.replace(/<value>/, newState);
  const channel = btn.getAttribute("data-channel")
    ? btn.getAttribute("data-channel")
    : false;
  const linkedInputs = channel
    ? document.querySelectorAll(
        `.display-source-radio[data-channel="${channel}"] .radio-option`,
      )
    : false;
  const linkedPauseButtons = channel
    ? document.querySelectorAll(`.pause-button[data-channel="${channel}"]`)
    : false;

  const confirmation = document.getElementById("shutdown-confirmation");

  // Note, because some touches on this button only launch a modal, listeners are
  // removed only when a power action is actually taken (in sendPowerUpdate)

  // internal functions
  function cleanupConfirmationModal() {
    // prevent default shutdown
    clearInterval(countdownTimeoutId);

    // hide the modal
    confirmation.classList.add("hidden");

    // remove button listeners
    confirmation
      .querySelector("button[name=shutdown]")
      .removeEventListener("click", sendPowerUpdate);
    confirmation
      .querySelector("button[name=shutdown]")
      .removeEventListener("touchstart", sendPowerUpdate);
    confirmation
      .querySelector("button[name=cancel]")
      .removeEventListener("click", cleanupConfirmationModal);
    confirmation
      .querySelector("button[name=cancel]")
      .removeEventListener("touchstart", cleanupConfirmationModal);
  }

  function dettachClickListeners() {
    // block power button
    disableControl(btn, handleTogglePower);

    // block linked inputs and pause listeners
    if (channel) {
      linkedPauseButtons.forEach((pauseBtn) => {
        disableControl(pauseBtn, handleVideoMute);
      });

      linkedInputs.forEach((input) => {
        disableControl(input, handleDisplaySourceSelect);
      });
    }

    // block clicks on shutdown confirmation button
    confirmation
      .querySelector("button[name=shutdown]")
      .removeEventListener("click", sendPowerUpdate);
    confirmation
      .querySelector("button[name=shutdown]")
      .removeEventListener("touchstart", sendPowerUpdate);
  }

  function reattachLinkedListeners() {
    // reattach linked input and pause listeners
    if (channel) {
      linkedPauseButtons.forEach((pauseBtn) => {
        enableControl(pauseBtn, handleVideoMute);
      });

      linkedInputs.forEach((input) => {
        enableControl(input, handleDisplaySourceSelect);
      });
    }
  }

  function reset(response) {
    cleanupConfirmationModal();

    // check for timeout before re-allowing events
    // first, check that the power event was successful
    const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
    const returnedState = followPath(pathAsObj, response);

    const progressDuration = btn.getAttribute("data-duration")
      ? parseInt(btn.getAttribute("data-duration"))
      : false;
    if (progressDuration && returnedState.value === newState) {
      // warmup/cooldown bar
      const progress =
        btn.parentElement.parentElement.querySelector(".progress");
      const progressClass = newState === true ? "warming" : "cooling";

      // on power on, allow linked controls before timeout
      let timerCallback;
      if (newState === true) {
        reattachLinkedListeners();
        // timerCallback = reattachPowerListener;
        timerCallback = () => {
          enableControl(btn, handleTogglePower);
        };
      }
      // on power off, block linked listeners until timeout
      else {
        timerCallback = () => {
          enableControl(btn, handleTogglePower);
          reattachLinkedListeners();
        };
      }

      useProgressBar(progress, progressDuration, progressClass, timerCallback);
    }
    // no progress bar (or update failed)
    else {
      enableControl(btn, handleTogglePower);
      reattachLinkedListeners();
    }
  }

  function sendPowerUpdate() {
    // block clicks
    dettachClickListeners();

    // build payload
    if (channel) {
      // on power up, select default input for each linked radio group
      if (newState === true) {
        document
          .querySelectorAll(`.display-source-radio[data-channel="${channel}"]`)
          .forEach((radio) => {
            const selectedInput = radio.querySelector("[data-value=true]")
              ? radio.querySelector("[data-value=true]")
              : radio.querySelector(".radio-option");

            // make sure data-value gets set for state setter to read
            selectedInput.setAttribute("data-value", true);

            // add to payload
            const extraData = selectedInput
              .getAttribute("data-path")
              .replace(/<value>/, true);
            let mergedJSON = mergeJSON(
              JSON.parse(postData),
              JSON.parse(extraData),
            );
            postData = JSON.stringify(mergedJSON);
          });
      }
      // on power off, visually deselect input (no payload update)
      // but hide and update video mute
      else {
        linkedPauseButtons.forEach((pauseBtn) => {
          const extraData = pauseBtn
            .getAttribute("data-path")
            .replace(/<value>/, false);
          let mergedJSON = mergeJSON(
            JSON.parse(postData),
            JSON.parse(extraData),
          );
          postData = JSON.stringify(mergedJSON);

          setVideoMuteButtonState(pauseBtn, false);
        });

        linkedInputs.forEach((input) => {
          input.setAttribute("data-override", true);
          // setDisplaySourceOptionState(input, false);
        });
      }
    }

    // visual feedback (wait in case default input selected)
    setPowerState(btn, newState);

    updateStatus(postData, reset);
  }

  // Main:
  // power on: send update immediately
  if (newState === true) {
    sendPowerUpdate();
  }
  // shutdown: show confirmation modal
  else {
    // Reset counter
    clearInterval(countdownTimeoutId);
    // confirmation.querySelector(".counter").innerHTML = shutdownWarningTime;
  
    // Launch countdown timer
    countdownTimeoutId = countdown(
      confirmation.querySelector(".counter"),
      shutdownWarningTime,
      sendPowerUpdate, // default action if countdown finishes
    );

    // Reset projector name in modal
    confirmation.querySelector(".projector-name").textContent =
      btn.getAttribute("data-channel-name");

    // Attach event listeners to confirm and cancel buttons
    confirmation
      .querySelector("button[name=shutdown]")
      .addEventListener("click", sendPowerUpdate);
    confirmation
      .querySelector("button[name=shutdown]")
      .addEventListener("touchstart", sendPowerUpdate);
    confirmation
      .querySelector("button[name=cancel]")
      .addEventListener("click", cleanupConfirmationModal);
    confirmation
      .querySelector("button[name=cancel]")
      .addEventListener("touchstart", cleanupConfirmationModal);

    // reveal the modal
    confirmation.classList.remove("hidden");
  }
}

// Export functions
export { handleTogglePower };
