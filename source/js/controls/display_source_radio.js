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
  const zoomRoom =
    btn.getAttribute("data-zoom-room-controller") === "true" ? true : false;
  const shareScreenModal =
    btn.getAttribute("data-zoom-share-screen-modal-launcher") === "true"
      ? true
      : false;
  let powerOverride = false;

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
      powerOverride = true;
    }
    // clear override?
    else {
      btn.setAttribute("data-override", "false");
    }
  }

  // Zoom vs Share Screen button disambiguation
  if (!powerOverride && (zoomRoom || shareScreenModal)) {
    const otherZoomButton = zoomRoom
      ? container.querySelector("[data-zoom-share-screen-modal-launcher=true]")
      : container.querySelector("[data-zoom-room-controller=true]");

    if (btn.getAttribute("data-selected-zoom-input") === "false") {
      btn.setAttribute("data-override", "true");
    } else if (btn.getAttribute("data-selected-zoom-input") === "true") {
      btn.setAttribute("data-override", "false");
    }
    // check for "uninitiated" state
    else if (
      otherZoomButton &&
      otherZoomButton.getAttribute("data-selected-zoom-input") !== "true"
    ) {
      // in this case, arbitrarily pick the data-zoom-room-controller to be highlighted
      if (container.querySelector("[data-zoom-room-controller=true]")) {
        container
          .querySelector("[data-zoom-room-controller=true]")
          .setAttribute("data-selected-zoom-input", "true");
        container
          .querySelector("[data-zoom-share-screen-modal-launcher=true]")
          .setAttribute("data-selected-zoom-input", "false");

        if (shareScreenModal) {
          btn.setAttribute("data-override", "true");
        }
      }
      // if for some reason there's a Share Screen button but no Zoom button, don't override Share Screen state
      else {
        btn.setAttribute("data-selected-zoom-input", "true");
        btn.setAttribute("data-override", "false");
      }
    }
  }

  // finally, set button state
  setButtonState(btn, state, handleDisplaySourceSelect);
}

function handleDisplaySourceSelect(e) {
  const btn = e.target;
  const container = btn.parentElement;

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

    // visual feedback
    if (container.querySelector("[data-value=true]") !== null) {
      setDisplaySourceOptionState(
        container.querySelector("[data-value=true]"),
        false,
      ); // clear any previous selection
    }
    setDisplaySourceOptionState(btn, true);

    // callback
    function reset(response) {
      // set input option states
      container.querySelectorAll(".radio-option").forEach((input) => {
        const path = input.getAttribute("data-path");
        const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
        let returnedState = followPath(pathAsObj, response);
        input.setAttribute("data-allow-events", "");
        setDisplaySourceOptionState(input, returnedState.value);
      });

      // set video mute state if it was updated
      if (pauseActionInitiated) {
        document
          .querySelectorAll(`.pause-button[data-channel="${channel}"]`)
          .forEach((pauseBtn) => {
            const path = pauseBtn.getAttribute("data-path");
            const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
            let returnedState = followPath(pathAsObj, response);
            pauseBtn.setAttribute("data-allow-events", "");
            setVideoMuteButtonState(pauseBtn, returnedState.value);
          });
      }

      // check if a power up was initiated and needs to be reflected in UI/reset
      if (powerActionInitiated) {
        function resetPowerButton(powerBtn, state) {
          powerBtn.setAttribute("data-allow-events", "");
          setPowerState(powerBtn, state);
        }

        // warmup bars for linked power buttons?
        document
          .querySelectorAll(`.power-button[data-channel="${channel}"]`)
          .forEach((btn) => {
            // check that power status is true ie. the power up call we just initiated actually worked
            const powerButtonPathAsObj = JSON.parse(
              btn.getAttribute("data-path").replace(/<value>/, '""'),
            );
            const powerState = followPath(powerButtonPathAsObj, response);
            // check if we need a warmup timeout
            if (powerState.value && btn.getAttribute("data-duration")) {
              // e.g. if the power up was successful
              const progressDuration = parseInt(
                btn.getAttribute("data-duration"),
              );
              const progress =
                btn.parentElement.parentElement.querySelector(".progress");
              useProgressBar(
                progress,
                progressDuration,
                "warming",
                function () {
                  resetPowerButton(btn, powerState.value);
                },
              );
            } else {
              // if update failed or there's no progress bar, reset power button immediately
              resetPowerButton(btn, powerState.value);
            }
          });
      }
    }

    // update backend
    const path = btn.getAttribute("data-path");
    let postData = path.replace(/<value>/, true);

    // check if this should intiate power up on linked power button(s)
    const channel = btn.parentElement.getAttribute("data-channel"); // evaluates falsey if unset
    if (channel) {
      document
        .querySelectorAll(`.power-button[data-channel="${channel}"]`)
        .forEach((powerBtn) => {
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
            setPowerState(powerBtn, true);

            powerActionInitiated = true;
          }
        });

      // check if selection should trigger video mute = false on the channel
      document
        .querySelectorAll(`.pause-button[data-channel="${channel}"]`)
        .forEach((pauseBtn) => {
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
    updateStatus(appendUIInteractionJSON(postData), reset);
  }
}

// Export functions
export { setDisplaySourceOptionState, handleDisplaySourceSelect };
