/***
 *
 *
 * Modals
 *
 *
 */
import { setupControlSet } from "./main.js";
import { sendUIInteractionUpdate } from "./utilities.js";

const MODAL_TIMEOUT_DEFAULT = 5 * 60000; // 5 minutes as milliseconds
let modalTimeoutId;
let timeoutDuration = MODAL_TIMEOUT_DEFAULT;

function openModal(e = null, modalId = null) {
  // open requested modal
  const linkedModalId = e ? e.target.getAttribute("data-modal") : modalId;
  const linkedModal = document.getElementById(linkedModalId);
  linkedModal.classList.remove("hidden");

  // reset the auto close timeout
  timeoutDuration = linkedModal.getAttribute("data-timeout")
    ? parseFloat(linkedModal.getAttribute("data-timeout")) * 60000 // end users configure timeout in minutes
    : MODAL_TIMEOUT_DEFAULT;
  timeoutModals();

  sendUIInteractionUpdate();
}

function closeModal(e) {
  clearTimeout(modalTimeoutId);
  const parentmodal = e.target.getAttribute("data-dismiss");
  document.getElementById(parentmodal).classList.add("hidden");

  sendUIInteractionUpdate();
}

// Note on timeoutModals:
// Although multiple modals may be unhidden, they share one timeout (for simplicity
// and because if someone abandons the touch screen it doesn't matter if the modals
// close in sequential order), so the last opened modal resets the global timeout
// duration for all open modals
function timeoutModals() {
  clearTimeout(modalTimeoutId);

  modalTimeoutId = setTimeout(function () {
    document
      .querySelectorAll(".modal:not(.timeout-exempt)")
      .forEach((modal) => {
        modal.classList.add("hidden");
      });
  }, timeoutDuration);
}

function setupModals(modals) {
  for (const modal in modals) {
    // if the modal has already been created, exit
    if (!document.getElementById(modal)) {
      // render new modals
      const timeoutDuration = modals[modal].timeout_timer
        ? modals[modal].timeout_timer
        : MODAL_TIMEOUT_DEFAULT;
      let html_blob = document
        .getElementById("advanced-modal-template")
        .innerHTML.replace(/{{modalId}}/g, modal)
        .replace(/{{title}}/g, modals[modal].name)
        .replace(/{{timeoutDuration}}/g, timeoutDuration);

      document
        .getElementById("advanced-modals-container")
        .insertAdjacentHTML("beforeend", html_blob);

      // inject control sets into modal
      for (const controlSet in modals[modal].control_sets) {
        const path = `{"modals":{"${modal}":{"control_sets":{"${controlSet}":{"controls":{"<id>":{"value":<value>}}}}}}}`;

        // check for options
        let options = { half_width: false, justify_content: false }; // defaults
        if (modals[modal].control_sets[controlSet].display_options) {
          for (let opt in modals[modal].control_sets[controlSet]
            .display_options) {
            options[opt] =
              modals[modal].control_sets[controlSet].display_options[opt];
          }
        }

        setupControlSet(
          controlSet,
          modals[modal].control_sets[controlSet],
          path,
          `${modal}-content`,
          options,
        );
      }
    }
  }

  attachSharedModalListeners();
}

// Making this reusable so that optional modules with custom modals can use
// these basic open/close modal mechanisms
function attachSharedModalListeners() {
  // attach listener to Back buttons (note: clean this up in advanced_controls)
  document.querySelectorAll(".dismiss-modal").forEach((btn) => {
    btn.addEventListener("click", closeModal);
    btn.addEventListener("touchstart", closeModal);
  });

  // attach listeners to reset timeout on any touch inside modal
  document.querySelectorAll(".modal:not(.timeout-exempt)").forEach((modal) => {
    modal.addEventListener("click", timeoutModals);
    modal.addEventListener("touchstart", timeoutModals);
  });
}

// Export functions
export {
  openModal,
  closeModal,
  timeoutModals,
  setupModals,
  attachSharedModalListeners,
};
