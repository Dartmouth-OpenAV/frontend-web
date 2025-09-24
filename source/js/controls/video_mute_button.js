/*
 *
 * Video mute (pause)
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import {
  disableControl,
  enableControl,
  dispatchStateChangeEvents,
} from "../utilities.js";

function setVideoMuteButtonState(btn, state) {
  // When video is muted, color the button, show the slash, and change text to
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

  // check for state override from linked power button
  const channel = btn.getAttribute("data-channel");
  const linkedPower = channel
    ? document.querySelector(`.power-button[data-channel=${channel}]`)
    : false;
  if (linkedPower) {
    const powerOn =
      linkedPower.getAttribute("data-value") === "true" ? true : false;
    if (powerOn) {
      btn.classList.remove("invisible");
    } else {
      btn.classList.add("invisible");
    }
  }

  // Alert modules with dependencies on this control's state
  dispatchStateChangeEvents(btn);
}

function handleVideoMute(e) {
  const btn = e.target;

  // block clicks and show visual feedback
  disableControl(btn, handleVideoMute);
  const newState = btn.getAttribute("data-value") === "true" ? false : true;
  setVideoMuteButtonState(btn, newState);

  // callback for updateStatus
  function reset() {
    enableControl(btn, handleVideoMute);
  }

  // update backend
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newState);
  updateStatus(payload, reset);
}

// Export functions
export { setVideoMuteButtonState, handleVideoMute };
