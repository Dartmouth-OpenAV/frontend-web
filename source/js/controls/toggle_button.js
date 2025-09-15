/*
 *
 * Toggle button (stateful)
 *
 */
import { updateStatus } from "../orchestrator_request.js";

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
  // block clicks
  var btn = e.target;
  btn.removeEventListener("click", handleToggleButton);
  btn.removeEventListener("touchstart", handleToggleButton);
  btn.removeAttribute("data-allow-events");

  // visual feedback
  const newState = btn.getAttribute("data-value") === "true" ? false : true;
  setButtonState(btn, newState, handleToggleButton);

  // callback for updateStatus
  function reset() {
    // reattach listeners
    btn.addEventListener("click", handleToggleButton);
    btn.addEventListener("touchstart", handleToggleButton);
    btn.setAttribute("data-allow-events", "");
  }

  // update backend
  const path = btn.getAttribute("data-path");
  const payload = path.replace(/<value>/, newState);
  updateStatus(payload, reset);
}

// Export functions
export { setButtonState, handleToggleButton };
