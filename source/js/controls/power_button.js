/*
 *
 * Power
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { setButtonState } from "./toggle_button.js";
import {
  handleVideoMute,
  setVideoMuteButtonState,
} from "./video_mute_button.js";
import {
  setDisplaySourceOptionState,
  handleDisplaySourceSelect,
} from "./display_source_radio.js";
import {
  followPath,
  mergeJSON,
  countdown,
  countdownTimeoutId,
  useProgressBar,
  appendUIInteractionJSON,
} from "../utilities.js";

const shutdownWarningTime = 60; // seconds

function setPowerState(powerBtn, state) {
  setButtonState(powerBtn, state, handleTogglePower);

  // update dependent buttons
  const channel = powerBtn.getAttribute("data-channel");
  if (channel) {
    // toggle visibility of linked video mute
    const linkedPauseButtons = document.querySelectorAll(
      `.pause-button[data-channel="${channel}"]`,
    );
    linkedPauseButtons.forEach((pauseBtn) => {
      if (state === true) {
        pauseBtn.classList.remove("invisible");
      } else {
        pauseBtn.classList.add("invisible");
      }
    });

    // ask linkedInputs to re-evaluate themselves
    const linkedInputs = document.querySelectorAll(
      `.display-source-radio[data-channel="${channel}"] .radio-option`,
    );
    linkedInputs.forEach((input) => {
      const currentState =
        input.getAttribute("data-value") === "true" ? true : false;
      setDisplaySourceOptionState(input, currentState);
    });
  }
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
  let shutdownTimeoutId;

  // Note, because some touches on this button only launch a modal, listeners are
  // removed only when a power action is actually taken (in sendPowerUpdate)

  // internal functions
  function cleanupConfirmationModal() {
    // prevent default shutdown
    clearTimeout(shutdownTimeoutId);
    clearTimeout(countdownTimeoutId);

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
    // block clicks on power button
    btn.removeEventListener("click", handleTogglePower);
    btn.removeEventListener("touchstart", handleTogglePower);
    btn.removeAttribute("data-allow-events");

    // block linked inputs and pause listeners
    if (channel) {
      linkedPauseButtons.forEach((pauseBtn) => {
        pauseBtn.removeEventListener("click", handleVideoMute);
        pauseBtn.removeEventListener("touchstart", handleVideoMute);
        pauseBtn.removeAttribute("data-allow-events");
      });

      linkedInputs.forEach((input) => {
        input.removeEventListener("click", handleDisplaySourceSelect);
        input.removeEventListener("touchstart", handleDisplaySourceSelect);
        input.removeAttribute("data-allow-events");
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

  function reattachPowerListener() {
    btn.setAttribute("data-allow-events", "");
    btn.addEventListener("click", handleTogglePower);
    btn.addEventListener("touchstart", handleTogglePower);
  }

  function reattachLinkedListeners() {
    // reattach linked input and pause listeners
    if (channel) {
      linkedPauseButtons.forEach((pauseBtn) => {
        pauseBtn.addEventListener("click", handleVideoMute);
        pauseBtn.addEventListener("touchstart", handleVideoMute);
        pauseBtn.setAttribute("data-allow-events", "");
      });

      linkedInputs.forEach((input) => {
        input.addEventListener("click", handleDisplaySourceSelect);
        input.addEventListener("touchstart", handleDisplaySourceSelect);
        input.setAttribute("data-allow-events", "");
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
        timerCallback = reattachPowerListener;
      }
      // on power off, block linked listeners until timout
      else {
        timerCallback = () => {
          reattachPowerListener();
          reattachLinkedListeners();
        };
      }

      useProgressBar(progress, progressDuration, progressClass, timerCallback);
    }
    // no progress bar (or update failed)
    else {
      reattachPowerListener();
      reattachLinkedListeners();
    }
  }

  function sendPowerUpdate() {
    // block clicks
    dettachClickListeners();

    // visual feedback: power button
    btn.classList.toggle("active");

    // visual feedback: linked controls
    if (channel) {
      // on power up, show pause button and select default input
      if (newState === true) {
        // select a default input for each linked radio
        document
          .querySelectorAll(`.display-source-radio[data-channel="${channel}"]`)
          .forEach((radio) => {
            let defaultInput = radio.getAttribute("data-default-option");

            // check for special value "last_selected". Note: Some displays/switchers do not maintain input state
            // while power is off, so this feature is not universaly supported
            if (defaultInput === "last_selected") {
              defaultInput = radio.querySelector("[data-value=true]")
                ? radio
                    .querySelector("[data-value=true]")
                    .getAttribute("data-option")
                : false;
            }

            // no default input found, default to first .radio-option
            if (
              !defaultInput ||
              !radio.querySelector(`[data-option=${defaultInput}]`)
            ) {
              defaultInput = radio
                .querySelector(".radio-option")
                .getAttribute("data-option");
            }

            const selectedInput = radio.querySelector(
              `[data-option=${defaultInput}]`,
            );

            // visual feedback
            selectedInput.classList.add("active");

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

        // unhide linked video mute buttons
        linkedPauseButtons.forEach((pauseBtn) => {
          pauseBtn.classList.remove("invisible");
        });
      }

      // on power off, visually deselect input (no payload update)
      // but hide and update video mute
      else {
        linkedInputs.forEach((input) => {
          input.classList.remove("active");
        });

        linkedPauseButtons.forEach((pauseBtn) => {
          const extraData = pauseBtn
            .getAttribute("data-path")
            .replace(/<value>/, false);
          let mergedJSON = mergeJSON(
            JSON.parse(postData),
            JSON.parse(extraData),
          );
          postData = JSON.stringify(mergedJSON);

          pauseBtn.classList.add("invisible");
        });
      }
    }

    updateStatus(appendUIInteractionJSON(postData), reset);
  }

  // Main:
  // power on: send update immediately
  if (newState === true) {
    sendPowerUpdate();
  }
  // shutdown: show confirmation modal
  else {
    // set the confirmation screen projector counter and name
    confirmation.querySelector(".counter").innerHTML = shutdownWarningTime;
    countdown(confirmation.querySelector(".counter"));
    confirmation.querySelector(".projector-name").textContent =
      btn.getAttribute("data-channel-name");

    // attach event listeners to confirm and cancel buttons
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

    // Default action: shutdown after 60 seconds
    var duration = shutdownWarningTime * 1000 + 100;
    shutdownTimeoutId = setTimeout(sendPowerUpdate, duration);
  }
}

// Export functions
export { setPowerState, handleTogglePower };
