/*
 *
 * Display source radio
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { setButtonState } from "./toggle_button.js";
import { setPowerState, handleTogglePower } from "./power_button.js";
import {
  followPath,
  mergeJSON,
  useProgressBar,
  appendUIInteractionJSON,
} from "../utilities.js";
import {
  handleVideoMute,
  setVideoMuteButtonState,
} from "./video_mute_button.js";

function setDisplaySourceOptionState(btn, state) {
  const container = btn.parentElement;
  const channel = container.getAttribute("data-channel"); // evaluates falsey if unset

  // check for power or pause state override
  if (channel) {
    // if linked power == false || linked pause == true, override state
    if (
      (document.querySelector(`.power-button[data-channel=${channel}]`) &&
        document
          .querySelector(`.power-button[data-channel=${channel}]`)
          .getAttribute("data-value") === "false") ||
      (document.querySelector(`.pause-button[data-channel=${channel}]`) &&
        document
          .querySelector(`.pause-button[data-channel=${channel}]`)
          .getAttribute("data-value") === "true")
    ) {
      btn.setAttribute("data-override", "true");
    }
    // clear override
    else {
      btn.setAttribute("data-override", "false");
    }
  }

  // finally, set button state
  setButtonState(btn, state, handleDisplaySourceSelect);
}

function handleDisplaySourceSelect(e) {
  const btn = e.target;
  const container = btn.parentElement;
  const channel = container.getAttribute("data-channel");
  const linkedPowerButtons = channel
    ? document.querySelectorAll(`.power-button[data-channel="${channel}"]`)
    : false;
  const linkedPauseButtons = channel
    ? document.querySelectorAll(`.pause-button[data-channel="${channel}"]`)
    : false;

  // only switch input if the tapped input is not already selected
  if (!btn.classList.contains("active")) {
    let powerActionInitiated = false;
    let pauseActionInitiated = false;

    // block clicks on all options in the select
    container.querySelectorAll(".radio-option").forEach(function (input) {
      input.removeEventListener("click", handleDisplaySourceSelect);
      input.removeEventListener("touchstart", handleDisplaySourceSelect);
      input.removeAttribute("data-allow-events");
    });

    // callback for updateStatus
    function reset(response) {
      // re-attach click listeners on radio options
      container.querySelectorAll(".radio-option").forEach((input) => {
        input.addEventListener("click", handleDisplaySourceSelect);
        input.addEventListener("touchstart", handleDisplaySourceSelect);
        input.setAttribute("data-allow-events", "");
      });

      // re-attach click listeners on any linked video_mute buttons
      if (pauseActionInitiated) {
        linkedPauseButtons.forEach((btn) => {
          btn.addEventListener("click", handleVideoMute);
          btn.addEventListener("touchstart", handleVideoMute);
          btn.setAttribute("data-allow-events", "");
        });
      }

      // re-attach click listeners on linked power buttons and show warm-up bar
      if (powerActionInitiated) {
        // start warm up timer if configured
        linkedPowerButtons.forEach((btn) => {
          // check that power status is true ie. the power up call we just initiated actually worked
          const powerButtonPathAsObj = JSON.parse(
            btn.getAttribute("data-path").replace(/<value>/, '""'),
          );
          const powerState = followPath(powerButtonPathAsObj, response);

          // if power on was successful and warm up duration is configured,
          // show progress bar and continue blocking clicks until timeout
          if (powerState.value && btn.getAttribute("data-duration")) {
            // e.g. if the power up was successful
            const progressDuration = parseInt(
              btn.getAttribute("data-duration"),
            );
            const progress =
              btn.parentElement.parentElement.querySelector(".progress");

            useProgressBar(progress, progressDuration, "warming", function () {
              btn.addEventListener("click", handleTogglePower);
              btn.addEventListener("touchstart", handleTogglePower);
              btn.setAttribute("data-allow-events", "");
            });

            // if power on failed or there's no progress bar, re-attach listeners immediately
          } else {
            btn.addEventListener("click", handleTogglePower);
            btn.addEventListener("touchstart", handleTogglePower);
            btn.setAttribute("data-allow-events", "");
          }
        });
      }
    }

    // start building payload
    const path = btn.getAttribute("data-path");
    let postData = path.replace(/<value>/, true);

    // check if this should intiate power up on linked power button(s)
    if (channel) {
      linkedPowerButtons.forEach((powerBtn) => {
        // if the current power state is false, turn on the display
        if (powerBtn.getAttribute("data-value") === "false") {
          const extraData = powerBtn
            .getAttribute("data-path")
            .replace(/<value>/, true);

          // to do: explicitly make sure power comes before input select
          let mergedJSON = mergeJSON(
            JSON.parse(extraData),
            JSON.parse(postData),
          );

          postData = JSON.stringify(mergedJSON);

          // block power clicks & show visual feedback on the button
          powerBtn.removeEventListener("click", handleTogglePower);
          powerBtn.removeEventListener("touchstart", handleTogglePower);
          powerBtn.removeAttribute("data-allow-events");
          console.log("Setting linkePowerButton to true");
          setPowerState(powerBtn, true);

          powerActionInitiated = true;
        }
      });

      // check if selection should trigger video mute = false on the channel
      linkedPauseButtons.forEach((pauseBtn) => {
        if (pauseBtn.getAttribute("data-value") === "true") {
          const extraData = pauseBtn
            .getAttribute("data-path")
            .replace(/<value>/, false);
          let mergedJSON = mergeJSON(
            JSON.parse(postData),
            JSON.parse(extraData),
          );
          postData = JSON.stringify(mergedJSON);

          // block pause clicks & show visual feedback:
          pauseBtn.removeEventListener("click", handleVideoMute);
          pauseBtn.removeEventListener("touchstart", handleVideoMute);
          pauseBtn.removeAttribute("data-allow-events");
          setVideoMuteButtonState(pauseBtn, false);

          pauseActionInitiated = true;
        }
      });
    }

    // Visual feedback; Note: Needs to happen after linked power is set
    // so that override gets removed
    // clear any previous selection(s)
    if (container.querySelector("[data-value=true]") !== null) {
      container.querySelectorAll("[data-value=true]").forEach((input) => {
        setDisplaySourceOptionState(input, false);
      });
    }
    // set new selection state
    setDisplaySourceOptionState(btn, true);

    updateStatus(appendUIInteractionJSON(postData), reset);
  }
}

// Export functions
export { setDisplaySourceOptionState, handleDisplaySourceSelect };
