/*
 *
 * Toggle button (stateful)
 *
 */
import { updateStatus } from "../orchestrator_request.js";
import { disableControl, enableControl } from "../utilities.js";

function setButtonState(btn, state, handler) {
  if (state === true && btn.getAttribute("data-override") !== "true") {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }

  // data-* attributes
  btn.setAttribute("data-value", state);

  // handlers
  if (btn.hasAttribute("data-allow-events")) {
    btn.addEventListener("click", handler);
    btn.addEventListener("touchstart", handler);
  }
}

function handleToggleButton(e) {
  const btn = e.target;

  // block clicks and show visual feedback
  disableControl(btn, handleToggleButton);
  const newState = btn.getAttribute("data-value") === "true" ? false : true;
  setButtonState(btn, newState, handleToggleButton);

  // callback for updateStatus
  function reset() {
    enableControl(btn, handleToggleButton);
  }

  // update backend
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newState);
  updateStatus(payload, reset);
}

// Export functions
export { setButtonState, handleToggleButton };
