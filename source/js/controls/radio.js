/*
 *
 * Radio button group (generic; display_sourece_radio and
 * camera_preset_radio are also base on this type)
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { disableControl, enableControl } from "../utilities.js";
import { setButtonState } from "./toggle_button.js";

function handleRadioSelect(e) {
  const btn = e.target;
  const container = btn.parentElement;

  // callback for updateStatus
  function reset() {
    // reattach listeners
    container.querySelectorAll(".radio-option").forEach((option) => {
      // option.addEventListener("click", handleRadioSelect);
      // option.addEventListener("touchstart", handleRadioSelect);
      // option.setAttribute("data-allow-events", "");
      enableControl(option, handleRadioSelect);
    });
  }

  // only switch selection if the tapped option is not already selected
  if (
    btn.getAttribute("data-value") !== "true" ||
    btn.getAttribute("data-override") === "true"
  ) {
    // block clicks on all options in the select
    container.querySelectorAll(".radio-option").forEach(function (option) {
      disableControl(option, handleRadioSelect);
    });

    // visual feedback
    if (container.querySelector("[data-value=true]") !== null) {
      // clear any previous selection(s)
      container.querySelectorAll("[data-value=true]").forEach((option) => {
        setButtonState(option, false, handleRadioSelect);
      });
    }
    setButtonState(btn, true, handleRadioSelect);

    // update backend
    const path = btn.getAttribute("data-path");
    const payload = path.replace(/<value>/, true);
    updateStatus(payload, reset);
  }
}

// Export functions
export { handleRadioSelect };
