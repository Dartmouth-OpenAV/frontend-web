/***
 * 
 *  
 * Modals
 *    
 *                                                    
 */
import { setupControlSet } from './main.js';
import { sendUIInteractionUpdate } from './utilities.js';

const modalTimeoutDurationDefault = 5; // 5 minutes 
let modalTimeoutDuration = modalTimeoutDurationDefault ;
let modalTimeoutId;

function openModal(e = null, modalId = null) {
  const linkedModalId = e ? e.target.getAttribute('data-modal') : modalId;
  const linkedModal = document.getElementById(linkedModalId);
  linkedModal.classList.remove('hidden');
  modalTimeoutDuration = parseFloat(linkedModal.getAttribute('data-timeout')) * 60000;
  timeoutModals();

  sendUIInteractionUpdate();
}

function closeModal(e) {
  clearTimeout(modalTimeoutId);
  const parentmodal = e.target.getAttribute("data-dismiss");
  document.getElementById(parentmodal).classList.add("hidden");

  sendUIInteractionUpdate();
}

// duration should be minutes
function timeoutModals() {
  clearTimeout(modalTimeoutId);

  modalTimeoutId = setTimeout(function () {
    document.querySelectorAll('.modal:not(.timeout-exempt)').forEach((modal) => {
      modal.classList.add('hidden');
    });
  }, modalTimeoutDuration );
}

function setupModals(modals) {
  for (const modal in modals) {
    // if the modal has already been created, exit
    if (!document.getElementById(modal)) {
      // render new modals
      // timeoutDuration is in minutes
      const timeoutDuration = modals[modal].timeout_timer ? modals[modal].timeout_timer : modalTimeoutDurationDefault;
      let html_blob = document.getElementById('advanced-modal-template').innerHTML
        .replace(/{{modalId}}/g, modal)
        .replace(/{{title}}/g, modals[modal].name)
        .replace(/{{timeoutDuration}}/g, timeoutDuration);

      document.getElementById('advanced-modals-container').insertAdjacentHTML('beforeend', html_blob);

      // inject control sets into modal
      for (const controlSet in modals[modal].control_sets) {
        const path = `{"modals":{"${modal}":{"control_sets":{"${controlSet}":{"controls":{"<id>":{"value":<value>}}}}}}}`;

        // check for options
        let options = { 'half_width': false, 'justify_content': false }; // defaults
        if (modals[modal].control_sets[controlSet].display_options) {
          for (let opt in modals[modal].control_sets[controlSet].display_options) {
            options[opt] = modals[modal].control_sets[controlSet].display_options[opt];
          }
        }

        setupControlSet(controlSet, modals[modal].control_sets[controlSet], path, `${modal}-content`, options);
      }
    }
  }

  // // attach listener to Back buttons (note: clean this up in advanced_controls)
  // document.querySelectorAll('.exit-modal').forEach((btn) => {
  //   btn.addEventListener('click', closeModal);
  //   btn.addEventListener('touchstart', closeModal);
  // });

  // // attach listeners to reset timeout on any touch inside modal
  // document.querySelectorAll('.modal:not(.timeout-exempt)').forEach((modal) => {
  //   modal.addEventListener('click', timeoutModals);
  //   modal.addEventListener('touchstart', timeoutModals);
  // });
  attachSharedModalListeners();
}

// Making this reusable so that optional modules with custom modals can use
// these basic open/close modal mechanisms
function attachSharedModalListeners() {
  // attach listener to Back buttons (note: clean this up in advanced_controls)
  document.querySelectorAll('.exit-modal').forEach((btn) => {
    btn.addEventListener('click', closeModal);
    btn.addEventListener('touchstart', closeModal);
  });

  // attach listeners to reset timeout on any touch inside modal
  document.querySelectorAll('.modal:not(.timeout-exempt)').forEach((modal) => {
    modal.addEventListener('click', timeoutModals);
    modal.addEventListener('touchstart', timeoutModals);
  });
}

// Export functions
export {
  openModal,
  closeModal,
  timeoutModals,
  setupModals,
  attachSharedModalListeners
};