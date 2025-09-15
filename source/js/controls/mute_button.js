/*
 *
 * Audio Mute button
 *
 */
import { updateStatus } from "../orchestrator_request.js";
import { setVolumeSliderState } from "./volume_slider.js";

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

  // data-* attributes
  btn.setAttribute("data-value", state);

  // handlers
  if (btn.hasAttribute("data-allow-events")) {
    btn.addEventListener("click", handleMuteButton);
    btn.addEventListener("touchstart", handleMuteButton);
  }

  // look for linked volume sliders and tell them to update their state
  if (btn.getAttribute("data-channel")) {
    document
      .querySelectorAll(
        `.slider[data-channel="${btn.getAttribute("data-channel")}"]`,
      )
      .forEach((slider) => {
        slider.setAttribute("data-muted", state);
        setVolumeSliderState(slider, slider.value);
      });
  }
}

function handleMuteButton(e) {
  // block clicks
  var btn = e.target;
  btn.removeEventListener("click", handleMuteButton);
  btn.removeEventListener("touchstart", handleMuteButton);
  btn.removeAttribute("data-allow-events");

  // visual feedback
  const newValue = btn.getAttribute("data-value") === "true" ? false : true;
  setMuteButtonState(btn, newValue);

  // callback for updateStatus
  function reset() {
    // reattach listeners
    btn.setAttribute("data-allow-events", "");
    btn.addEventListener("click", handleMuteButton);
    btn.addEventListener("touchstart", handleMuteButton);
  }

  // update backend
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newValue);

  updateStatus(payload, reset);
}

// Export functions
export { setMuteButtonState, handleMuteButton };
