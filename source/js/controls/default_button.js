/*
 *
 * Default button (stateless)
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { appendUIInteractionJSON } from "../utilities.js";

function handleDefaultButton(e) {
  // block clicks
  var btn = e.target;
  btn.removeEventListener("click", handleDefaultButton);
  btn.removeEventListener("touchstart", handleDefaultButton);
  /* NOTE: for the stateless_volume button, you lose the finesse of blocking clicks on the other .volume-stepper button too */

  // visual feedback
  btn.classList.add("active");

  // callback
  function reset() {
    btn.classList.remove("active");
    btn.addEventListener("click", handleDefaultButton);
    btn.addEventListener("touchstart", handleDefaultButton);
  }

  // update backend
  const value = btn.getAttribute("data-value")
    ? btn.getAttribute("data-value")
    : true;
  const payload = btn.getAttribute("data-path").replace(/<value>/, value);
  updateStatus(appendUIInteractionJSON(payload), reset);
}

// Export functions
export { handleDefaultButton };
