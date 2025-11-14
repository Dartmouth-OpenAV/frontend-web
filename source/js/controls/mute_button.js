/*
 *
 * Audio Mute button
 *
 */
import { updateStatus } from "../orchestrator_request.js";
import {
  disableControl,
  enableControl,
  dispatchStateChangeEvents,
} from "../utilities.js";

function setMuteButtonState(btn, state) {
  // everything is topsy turvy in mute land ...
  // when muted, the button should be grey, with the slash showing
  if (state === true) {
    btn.classList.remove("active");
    btn.querySelector(".slash").classList.remove("hidden");
  }
  // when not muted, color the button and remove the slash
  else {
    btn.classList.add("active");
    btn.querySelector(".slash").classList.add("hidden");
  }

  // Set data-* attributes; first cache original value for dispatchChangeEvents to compare
  const origValue = btn.getAttribute("data-value") === "true" ? true : false;
  btn.setAttribute("data-value", state);

  // handlers
  if (btn.hasAttribute("data-allow-events")) {
    btn.addEventListener("click", handleMuteButton);
    btn.addEventListener("touchstart", handleMuteButton);
  }

  // Alert modules with dependencies on this control's state
  if (state != origValue) {
    dispatchStateChangeEvents(btn);
  }
}

function handleMuteButton(e) {
  const btn = e.target;

  // block clicks and show visual feedback
  disableControl(btn, handleMuteButton);
  const newValue = btn.getAttribute("data-value") === "true" ? false : true;
  setMuteButtonState(btn, newValue);

  // callback for updateStatus
  function reset() {
    enableControl(btn, handleMuteButton);
  }

  // update backend
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newValue);
  updateStatus(payload, reset);
}

// Export functions
export { setMuteButtonState, handleMuteButton };
