/***
 *
 *
 * Tech Info ("Maintenance") Modal
 *
 *
 */
import { globals } from "./globals.js";
import { orchestratorRequest } from "./orchestrator_request.js";

let clickCounter = 0;
let techClickTimeoutId; // time between clicks
let techModalTimeoutId; // modal auto-close

function resetTechModalTimeout() {
  clearTimeout(techModalTimeoutId);

  // close the maintenance modal after 5 minutes
  techModalTimeoutId = setTimeout(() => {
    document.getElementById("maintenance").classList.add("hidden");
  }, 300000);
}

// On three clicks within 1 second, launch the Tech Modal
function handleTechClick() {
  // being extra paranoid, capping this number
  if (clickCounter < 4) {
    clickCounter++;
  }

  if (clickCounter === 3) {
    document.getElementById("maintenance").classList.remove("hidden");
    resetTechModalTimeout();
  }

  // clear clickCounter after 1 second idle
  clearTimeout(techClickTimeoutId);
  techClickTimeoutId = setTimeout(() => {
    clickCounter = 0;
  }, 1000);
}

// Clear orchestrator cache
function clearSystemCache() {
  // pause the refresh loop while clearing cache
  window.dispatchEvent(new Event("update_started"));

  // clear old error messages
  document.getElementById("tech-errors").innerHTML = "";

  // send DELETE request to orhcestrator
  const url = `${globals.orchestrator}/api/systems/${globals.system}/cache`;
  const options = {
    method: "delete",
  };
  orchestratorRequest(url, options).then((response) => {
    if (!response.ok) {
      const alert = document
        .getElementById("alert-template")
        .innerHTML.replace(
          /{{message}}/,
          `ERROR: ${response.status} response from ${globals.orchestrator}/api/systems/${globals.system}/cache`,
        );
      document
        .getElementById("tech-errors")
        .insertAdjacentHTML("beforeend", alert);
    };

    // allow refresh loop to resume
    window.dispatchEvent(new Event("update_complete"));
  });
}

// Write new state JSON
function updateTechModal(e) {
  const newState = e.detail;
  try {
    document.getElementById("maintenance").querySelector("pre").innerHTML =
      JSON.stringify(newState, null, 4);
    document
      .getElementById("maintenance")
      .querySelector(".timestamp").innerHTML = new Date();
  } catch (err) {
    console.error("Problem updating tech modal", err);
  }
}

// Add handlers for tech modal buttons
function initiateTechModalGUI() {
  // listeners for tech actions
  document
    .getElementById("room-name")
    .addEventListener("click", handleTechClick);
  document
    .getElementById("maintenance")
    .addEventListener("click", resetTechModalTimeout);
  document
    .getElementById("config-reload-btn")
    .addEventListener("click", clearSystemCache);
  document
    .querySelector("#maintenance .dismiss")
    .addEventListener("click", () => {
      document.getElementById("maintenance").classList.add("hidden");
      document.getElementById("tech-errors").innerHTML = "";
    });

  // icons for maintenance mode banner
  document
    .querySelectorAll("#maintenance-mode-warning .icon-container")
    .forEach((elem) => {
      elem.innerHTML = document.getElementById(
        "construction-icon-template",
      ).innerHTML;
    });
}

/* page load listener */
window.addEventListener("ui_ready", initiateTechModalGUI);
window.addEventListener("new_state", updateTechModal);
