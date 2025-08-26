/*
 *
 * Radio button group (generic; display_sourece_radio and
 * camera_preset_radio are also base on this type)
 *
 */

import { updateStatus } from "../orchestrator_request.js";
import { setButtonState } from "./toggle_button.js";
import { followPath, appendUIInteractionJSON } from "../utilities.js";

function handleRadioSelect(e) {
  const btn = e.target;
  const container = btn.parentElement;

  // callback
  function reset(response) {
    container.querySelectorAll(".radio-option").forEach((option) => {
      const path = option.getAttribute("data-path");
      const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
      let returnedState = followPath(pathAsObj, response);
      option.setAttribute("data-allow-events", "");
      setButtonState(option, returnedState.value, handleRadioSelect);
    });
  }

  // only switch selection if the tapped option is not already selected
  if (!btn.classList.contains("active")) {
    // block clicks on all options in the select
    container.querySelectorAll(".radio-option").forEach(function (option) {
      option.removeEventListener("click", handleRadioSelect);
      option.removeEventListener("touchstart", handleRadioSelect);
      option.removeAttribute("data-allow-events");
    });

    // visual feedback
    if (container.querySelector("[data-value=true]") !== null) {
      setButtonState(
        container.querySelector("[data-value=true]"),
        false,
        handleRadioSelect,
      ); // clear any previous selection
    }
    setButtonState(btn, true, handleRadioSelect);

    // update backend
    const path = btn.getAttribute("data-path");
    const payload = path.replace(/<value>/, true);
    updateStatus(appendUIInteractionJSON(payload), reset);
  }
}

// Export functions
export { handleRadioSelect };
