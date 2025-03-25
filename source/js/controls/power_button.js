/*
 *
 * Power
 * 
 */

import { updateStatus } from '../main.js';
import { setButtonState } from './toggle_button.js';
import { handleVideoMute, setVideoMuteButtonState } from './video_mute_button.js';
import { setDisplaySourceOptionState, handleDisplaySourceSelect } from './display_source_radio.js';
import { followPath, mergeJSON, countdown, countdownTimeoutId, useProgressBar } from '../utilities.js';

const shutdownWarningTime = 60; // seconds

function setPowerState(powerBtn, state) {
  setButtonState(powerBtn, state, handleTogglePower);

  // update dependent buttons
  const channel = powerBtn.getAttribute('data-channel');

  // toggle visibility of linked video mute
  if (channel) {
    document.querySelectorAll(`.pause-button[data-channel='${channel}']`).forEach((pauseBtn) => {
      if (state === true) {
        pauseBtn.classList.remove('invisible');
      }
      else {
        pauseBtn.classList.add('invisible');
      }
    });
  }

  // ask linkedInputs to re-evaluate themselves
  if (channel) {
    document.querySelectorAll(`.display-source-radio[data-channel='${channel}'] .radio-option`).forEach((input) => {
      const currentState = input.getAttribute('data-value') === 'true' ? true : false;
      setDisplaySourceOptionState(input, currentState);
    });
  }
}


function handleTogglePower(e) {
  const btn = e.target;
  const currentState = btn.getAttribute('data-value');
  const newState = currentState === 'true' ? false : true;
  const path = btn.getAttribute('data-path');
  let postData = path.replace(/<value>/, newState);
  const channel = btn.getAttribute('data-channel') ? btn.getAttribute('data-channel') : false;
  const linkedInputs = channel ? document.querySelectorAll(`.display-source-radio[data-channel='${channel}'] .radio-option`) : false;

  const confirmation = document.getElementById("shutdown-confirmation");
  let shutdownTimeoutId;

  // Note, because some touches on this button only launch a modal, listeners are 
  // removed only when a power action is actually taken (in sendPowerUpdate)

  // callbacks
  function cleanupConfirmationModal() {
    // prevent default shutdown
    clearTimeout(shutdownTimeoutId);
    clearTimeout(countdownTimeoutId);

    // hide the modal
    confirmation.classList.add('hidden');

    // remove button listeners
    confirmation.querySelector("button[name=shutdown]").removeEventListener("click", sendPowerUpdate);
    confirmation.querySelector("button[name=shutdown]").removeEventListener("touchstart", sendPowerUpdate);
    confirmation.querySelector("button[name=cancel]").removeEventListener("click", cleanupConfirmationModal);
    confirmation.querySelector("button[name=cancel]").removeEventListener("touchstart", cleanupConfirmationModal);
  }

  function reset(response) {
    clearTimeout(shutdownTimeoutId);
    clearTimeout(countdownTimeoutId);
    const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
    const returnedState = followPath(pathAsObj, response);

    // check for timeout before re-allowing events
    const progressDuration = btn.getAttribute('data-duration') ? parseInt(btn.getAttribute('data-duration')) : false;
    if (progressDuration && returnedState.value === newState) {
      // allow input select during warm up
      if (returnedState.value === true && channel) {
        linkedInputs.forEach((input) => {
          input.setAttribute('data-allow-events', '');
        });
      }

      // warmup/cooldown bar
      const progress = btn.parentElement.parentElement.querySelector('.progress');
      const progressClass = newState === true ? 'warming' : 'cooling';
      useProgressBar(progress, progressDuration, progressClass, function () {
        // reattach power events
        btn.setAttribute('data-allow-events', '');
        btn.addEventListener('click', handleTogglePower);
        btn.addEventListener('touchstart', handleTogglePower);

        // reattach input events (redundant but harmless in the case of power on) 
        if (channel) {
          linkedInputs.forEach((input) => {
            input.setAttribute('data-allow-events', '');
            input.addEventListener('click', handleDisplaySourceSelect);
            input.addEventListener('touchstart', handleDisplaySourceSelect);
          });
        }
      });
    }
    // no progress bar (or update failed)
    else {
      // allow power and linked input events (get reattached in state setter below)
      btn.setAttribute('data-allow-events', '');

      if (channel) {
        linkedInputs.forEach((input) => {
          input.setAttribute('data-allow-events', '');
        });
      }
    }

    // visual feedback on response: power
    setPowerState(btn, returnedState.value);

    if (channel) {
      // visual feedback on response: linked inputs
      linkedInputs.forEach((input) => {
        const inputPathAsObj = JSON.parse(input.getAttribute('data-path').replace(/<value>/, true));
        let inputState = followPath(inputPathAsObj, response).value;
        setDisplaySourceOptionState(input, inputState);
      });

      // visual feedback on response: linked pause
      document.querySelectorAll(`.pause-button[data-channel='${channel}']`).forEach((pauseBtn) => {
        const pauseButtonPathAsObj = JSON.parse(pauseBtn.getAttribute('data-path').replace(/<value>/, true));
        const pauseButtonState = followPath(pauseButtonPathAsObj, response);
        pauseBtn.setAttribute('data-allow-events', ''); // safe to allow pause in any scenario
        setVideoMuteButtonState(pauseBtn, pauseButtonState);
      });
    }

    // hide confirmation if it isn't already
    cleanupConfirmationModal();
  }

  /* send update */
  function sendPowerUpdate() {
    // block clicks on power button
    btn.removeEventListener('click', handleTogglePower);
    btn.removeEventListener('touchstart', handleTogglePower);
    btn.removeAttribute('data-allow-events');

    // block clicks on linked pause and input buttons
    if (channel) {
      document.querySelectorAll(`.pause-button[data-channel='${channel}']`).forEach((pauseBtn) => {
        pauseBtn.removeEventListener('click', handleVideoMute);
        pauseBtn.removeEventListener('touchstart', handleVideoMute);
        pauseBtn.removeAttribute('data-allow-events');
      });

      linkedInputs.forEach((input) => {
        input.removeEventListener('click', handleDisplaySourceSelect);
        input.removeEventListener('touchstart', handleDisplaySourceSelect);
        input.removeAttribute('data-allow-events');
      });
    }

    // block clicks on shutdown confirmation button
    confirmation.querySelector("button[name=shutdown]").removeEventListener("click", sendPowerUpdate);
    confirmation.querySelector("button[name=shutdown]").removeEventListener("touchstart", sendPowerUpdate);

    // immediate visual feedback
    btn.classList.toggle('active');

    updateStatus(postData, reset)
  }

  // power on
  if (newState === true) {
    // if linked channel(s) exists, select one of its inputs in update_status
    if (channel) {
      document.querySelectorAll(`.display-source-radio[data-channel='${channel}']`).forEach((radio) => {
        let defaultInput = radio.getAttribute('data-default-option');

        // check for special value 'last_selected'. Note: Some displays/switchers do not maintain input state 
        // while power is off, so this feature is not universaly supported
        if (defaultInput === "last_selected") {
          defaultInput = radio.querySelector('[data-value=true]') ? radio.querySelector('[data-value=true]').getAttribute('data-option') : false;
        }

        // no default input found, default to first .radio-option
        if (!defaultInput || !radio.querySelector(`[data-option=${defaultInput}]`)) {
          defaultInput = radio.querySelector('.radio-option').getAttribute('data-option');
        }

        const extraData = radio.querySelector(`[data-option=${defaultInput}]`).getAttribute('data-path').replace(/<value>/, true);
        let mergedJSON = mergeJSON(JSON.parse(postData), JSON.parse(extraData));
        postData = JSON.stringify(mergedJSON);
      });
    }

    sendPowerUpdate();
  }
  // shutdown
  else {
    // set the confirmation screen projector counter and name
    confirmation.querySelector(".counter").innerHTML = shutdownWarningTime;
    countdown(confirmation.querySelector(".counter"));
    confirmation.querySelector(".projector-name").textContent = btn.getAttribute("data-channel-name");

    // attach event listeners to confirm and cancel buttons
    confirmation.querySelector("button[name=shutdown]").addEventListener("click", sendPowerUpdate);
    confirmation.querySelector("button[name=shutdown]").addEventListener("touchstart", sendPowerUpdate);
    confirmation.querySelector("button[name=cancel]").addEventListener("click", cleanupConfirmationModal);
    confirmation.querySelector("button[name=cancel]").addEventListener("touchstart", cleanupConfirmationModal);

    // reveal the modal
    confirmation.classList.remove('hidden');

    // Default action: shutdown after 60 seconds
    var duration = (shutdownWarningTime * 1000) + 100;  // shutdownWarningTime is global, set in window.onload
    shutdownTimeoutId = setTimeout(sendPowerUpdate, duration);
  }
}

// Export functions
export {
  setPowerState,
  handleTogglePower,
  countdownTimeoutId
};