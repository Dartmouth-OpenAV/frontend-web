/*
 *
 * Video mute (pause)
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { setDisplaySourceOptionState } from "./display_source_radio.js";

function setVideoMuteButtonState(btn, state) {
  // when video is muted, color the button, show the slash, and change text to
  if (state === true) {
    btn.classList.add("active");
    btn.querySelector(".slash").classList.remove("hidden");
    btn.querySelector(".button-label").innerHTML = "Show video";
  } else {
    btn.classList.remove("active");
    btn.querySelector(".slash").classList.add("hidden");
    btn.querySelector(".button-label").innerHTML = "Hide video";
  }

  // data-* attributes
  btn.setAttribute("data-value", state);

  // handlers
  if (btn.hasAttribute("data-allow-events")) {
    btn.addEventListener("click", handleVideoMute);
    btn.addEventListener("touchstart", handleVideoMute);
  }

  // ask linkedInputs to re-evaluate themselves
  const channel = btn.getAttribute("data-channel");
  if (channel) {
    document
      .querySelectorAll(
        `.display-source-radio[data-channel='${channel}'] .radio-option`,
      )
      .forEach((input) => {
        const currentState =
          input.getAttribute("data-value") === "true" ? true : false;
        setDisplaySourceOptionState(input, currentState);
      });
  }
}

function handleVideoMute(e) {
  const btn = e.target;
  const newState = btn.getAttribute("data-value") === "true" ? false : true;
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newState);

  // block clicks
  btn.removeEventListener("click", handleVideoMute);
  btn.removeEventListener("touchstart", handleVideoMute);
  btn.removeAttribute("data-allow-events");

  // visual feedback
  setVideoMuteButtonState(btn, newState);

  // callback from updateStatus
  function reset() {
    // reattach listeners
    btn.addEventListener("click", handleVideoMute);
    btn.addEventListener("touchstart", handleVideoMute);
    btn.setAttribute("data-allow-events", "");
  }

  // update backend
  updateStatus(payload, reset);
}

// Export functions
export { setVideoMuteButtonState, handleVideoMute };
