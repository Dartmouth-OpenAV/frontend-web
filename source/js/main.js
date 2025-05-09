// Import all required modules
import { openModal, closeModal, setupModals } from './modals.js';
import { handleMaintenanceClick, resetMaintenanceModalTimeout } from './maintenance_modal.js';
import { followPath } from './utilities.js';
import { handlePanTiltZoom, handlePanTiltZoomStop } from './controls/camera_pan_tilt_zoom.js';
import { handleDefaultButton } from './controls/default_button.js';
import { setDisplaySourceOptionState } from './controls/display_source_radio.js';
import { setMuteButtonState } from './controls/mute_button.js';
import { setPowerState } from './controls/power_button.js';
import { handleRadioSelect } from './controls/radio.js';
import { setButtonState, handleToggleButton } from './controls/toggle_button.js';
import { setVideoMuteButtonState } from './controls/video_mute_button.js';
import { setVolumeSliderState } from './controls/volume_slider.js';

let orchestrator, system, refresh;
let updateStatusOngoing = false;
let retries = 2;

// pool of 10 volume slider timeout IDs (10 is an arbitrary upper limit on sliders per system)
let timer1, timer2, timer3, timer4, timer5, timer6, timer7, timer8, timer9, timer10;
const availableTimers = [timer1, timer2, timer3, timer4, timer5, timer6, timer7, timer8, timer9, timer10];
let nextAvailableTimer = 0;


function clearDisplay() {
  // clear main controls
  document.getElementById('main-controls').innerHTML = "";

  // clear custom modals
  document.getElementById('advanced-modals-container').innerHTML = "";

  // clear headers
  document.getElementById("room-name").innerHTML = "";
  document.getElementById("room-header").classList.add("hidden");
}

/***
 * 
 *  
 * Control set creation and update
 *    
 *                                                    
 */
// Create base html for each control defined and inject into DOM
// options -- { callback, half-width }
function setupControlSet(controlSetId, data, path, containerId, options = { 'half_width': false, 'justify_content': false }) {
  let icon = document.getElementById(`${data.icon}-icon-template`) ? document.getElementById(`${data.icon}-icon-template`).innerHTML : "";
  let noiconClass = icon === "" ? "no-icon" : "";
  const controlSetName = data.hasOwnProperty('name') ? data.name : controlSetId;
  let controlSetBlob = document.getElementById('generic-control-set-template').innerHTML
    .replace(/{{icon}}/g, icon)
    .replace(/{{no-icon}}/g, noiconClass)
    .replace(/{{id}}/g, controlSetId)
    .replace(/{{control_set_name}}/g, controlSetName);

  // insert control set into DOM
  const container = document.getElementById(containerId);
  container.insertAdjacentHTML('beforeend', controlSetBlob);

  const controlSet = container.lastElementChild;

  // add optional styling classes
  if (options.half_width) { controlSet.classList.add('half-width') }
  if (options.justify_content) { controlSet.classList.add('justify-content') }

  // loop through data.controls and create button in the DOM for each, based on type
  for (const control in data.controls) {
    const type = data.controls[control]?.type;
    if (!type) { console.error("No type specified for " + control) }

    const pathAttr = path.replace(/<id>/g, control);
    const channel = data.controls[control].hasOwnProperty('channel') ? data.controls[control].channel : "";

    // generate html based on button type
    let htmlBlob;
    if (type === "stateless_mute") {
      htmlBlob = document.getElementById('mute-button-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{muteState}}/g, "");
    }
    if (type === "stateless_volume") {
      htmlBlob = document.getElementById('stateless-volume-control-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{control_set}}/g, controlSetName);
    }
    if (type === "generic_toggle") {
      icon = document.getElementById(`${data.controls[control].icon}-icon-template`) ? document.getElementById(`${data.controls[control].icon}-icon-template`).innerHTML : "";
      noiconClass = icon === "" ? "no-icon" : "";
      htmlBlob = document.getElementById('generic-button-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{icon}}/g, icon)
        .replace(/{{no-icon}}/g, noiconClass)
        .replace(/{{enabled}}/g, data.controls[control].value);
    }
    if (type === "mute") {
      htmlBlob = document.getElementById('mute-button-template').innerHTML
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{muteState}}/g, data.controls[control].value);
    }
    if (type === "volume") {
      htmlBlob = document.getElementById('volume-control-template').innerHTML
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{timerId}}/g, nextAvailableTimer);
      nextAvailableTimer++;
    }
    if (type === "power") {
      const name = data.controls[control].hasOwnProperty('name') ? data.controls[control].name : "Power";
      const channelName = data.controls[control].hasOwnProperty('channel_name') ? data.controls[control].channel_name : "";
      const progressDuration = data.controls[control].hasOwnProperty('warmup_timer') ? data.controls[control].warmup_timer : false; // extra config for warmup/cool down progess bars
      htmlBlob = document.getElementById('power-button-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{name}}/g, name)
        .replace(/{{channel_name}}/g, channelName)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{duration}}/g, progressDuration)
        .replace(/{{value}}/g, data.controls[control].value);
    }
    if (type === "video_mute") {
      htmlBlob = document.getElementById('video-pause-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{value}}/g, data.controls[control].value);
    }
    if (type === "radio" || type === "camera_preset_radio" || type === "display_source_radio" || type === "input_select") {
      // container 
      let defaultOption = data.controls[control].hasOwnProperty('default_option') ? data.controls[control].default_option : "";
      if (data.controls[control].hasOwnProperty('default_input')) { // check for deprecated 'default_input' prop, for backwards compatibility
        defaultOption = data.controls[control].default_input;
      }

      let typeSpecificClass = type === "camera_preset_radio" ? 'camera-preset-radio' : '';
      if (type === "display_source_radio" || type === "input_select") {
        typeSpecificClass = 'display-source-radio';
      }
      const radioContainerTemplate = document.getElementById('radio-control-template').innerHTML
        .replace(/{{path}}/g, pathAttr.replace(/\"value\"/, '"options"'))
        .replace(/{{channel}}/g, channel)
        .replace(/{{defaultOption}}/g, defaultOption)
        .replace(/{{class}}/g, typeSpecificClass);

      // options
      const optionTemplate = document.getElementById('radio-option-template').innerHTML;
      let optionsBlob = "";
      for (const option in data.controls[control].options) {
        let icon = document.getElementById(`${data.controls[control].options[option].icon}-icon-template`) ? document.getElementById(`${data.controls[control].options[option].icon}-icon-template`).innerHTML : "";
        let noiconClass = icon === "" ? "no-icon" : "";
        const optionPath = pathAttr.replace(/\"value\"/, '"options"').replace(/<value>/, `{"${option}":{"value":<value>}}`);
        optionsBlob += optionTemplate
          .replace(/{{path}}/g, optionPath)
          .replace(/{{name}}/g, data.controls[control].options[option].name)
          .replace(/{{icon}}/g, icon)
          .replace(/{{no-icon}}/g, noiconClass)
          .replace(/{{control_set}}/g, controlSetName)
          .replace(/{{option}}/g, option)
          .replace(/{{value}}/g, data.controls[control].options[option].value);
      }

      htmlBlob = radioContainerTemplate.replace(/{{options}}/, optionsBlob);
    }
    if (type === "pan_tilt") {
      htmlBlob = document.getElementById('pan-tilt-template').innerHTML
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{path}}/g, pathAttr);
    }
    if (type === "camera_zoom") {
      htmlBlob = document.getElementById('camera-zoom-template').innerHTML
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{path}}/g, pathAttr);
    }
    if (type === "modal_launcher") {
      icon = document.getElementById(`${data.controls[control].icon}-icon-template`) ? document.getElementById(`${data.controls[control].icon}-icon-template`).innerHTML : "";
      noiconClass = icon === "" ? "no-icon" : "";

      htmlBlob = document.getElementById('modal-launcher-button-template').innerHTML
        .replace(/{{icon}}/g, icon)
        .replace(/{{no-icon}}/g, noiconClass)
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{modal}}/g, data.controls[control].modal);
    }

    // inject button into control set 
    controlSet.querySelector('.controls-wrapper').insertAdjacentHTML('beforeend', htmlBlob);
  }
}

// system healing: make sure all stateful buttons reflect current orchestrator state
function updateAllControls(statusData) {
  let controls = document.querySelectorAll('.control');

  controls.forEach((control) => {
    let type, value, parentObject;
    // skip modal_launcher buttons
    if ( !control.getAttribute('data-modal') ) {
      const path = control.getAttribute('data-path');
      const pathAsObj = JSON.parse(path.replace(/<value>/, '""'));
      ({ value, parentObject } = followPath(pathAsObj, statusData));
      type = parentObject.type ;
    }
    else {
      type = 'modal_launcher' ;
    }

    /* set up button based on type */
    if (type || value.value?.type) {
      /* stateless controls (just need handlers attached) */
      // stateless_mute
      if (type === 'stateless_mute') {
        control.addEventListener('click', handleDefaultButton);
        control.addEventListener('touchstart', handleDefaultButton);
      }
      // stateless_volume
      if (type === 'stateless_volume') {
        control.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', handleDefaultButton);
          btn.addEventListener('touchstart', handleDefaultButton);
        });
      }
      // pan_tilt and camera_zoom (ptz)
      if (type === 'pan_tilt' || type === 'camera_zoom') {
        control.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('mousedown', handlePanTiltZoom);
          btn.addEventListener('touchstart', handlePanTiltZoom);

          btn.addEventListener('mouseup', handlePanTiltZoomStop);
          btn.addEventListener('touchend', handlePanTiltZoomStop);
        });
      }
      // modal_launcher
      if (type === 'modal_launcher') {
        control.addEventListener('click', openModal);
        control.addEventListener('touchstart', openModal);
      }

      /* stateful controls */
      // generic_toggle
      if (type === 'generic_toggle') {
        setButtonState(control, value, handleToggleButton);
      }
      // mute
      if (type === 'mute') {
        setMuteButtonState(control, value);
      }
      // volume
      if (type === 'volume') {
        // if linked mute has not already been evaluated/set, make sure slider still knows its mute state
        if (control.getAttribute('data-channel')
          && document.querySelector(`.mute[data-channel=${control.getAttribute('data-channel')}]`).getAttribute('data-value') === "true") {
          control.setAttribute('data-muted', true);
        }
        setVolumeSliderState(control, value);
      }
      // power 
      if (type === 'power') {
        setPowerState(control, value);
      }
      // video mute
      if (type === 'video_mute') {
        setVideoMuteButtonState(control, value);
      }
      // radio types: radio (generic), display_source_radio (previously input_select), camera_preset_radio
      if (type === "radio" || type === "camera_preset_radio" || type === "display_source_radio" || type === "input_select") {
        control.querySelectorAll('.radio-option').forEach((option) => {
          const optionID = option.getAttribute('data-option');
          const optionState = value[optionID].value;
          if (type === "display_source_radio" || type === "input_select") {
            setDisplaySourceOptionState(option, optionState);
          } else {
            setButtonState(option, optionState, handleRadioSelect);
          }
        });
      }
    }
  });
}

async function updateStatus(payload, callback) {
  // Delay incoming update until current update has finished
  if (updateStatusOngoing) {
    setTimeout(updateStatus(payload, callback), 500);
    return null;
  } else {
    updateStatusOngoing = true;
  }

  // Pause refresh loop
  window.clearTimeout(refresh);

  // Send the update to the orchestrator
  const response = await fetch(`${orchestrator}/api/systems/${system}/state`, {
    method: 'PUT',
    body: payload
  })
    .then(response => response.json())
    .catch(error => {
      console.error('Error:', error);
    });

  // Call the callback function if one is provided
  if (callback) {
    callback(response);
  }

  // Reset refresh loop
  refresh = window.setTimeout(getStatus, 5000);

  // Allow other updates to go through
  updateStatusOngoing = false;

  return response;
}

async function getStatus() {
  window.clearTimeout(refresh); // pause refresh loop

  let redraw = document.getElementById("main-controls").innerHTML ? false : true;

  const status = await fetch(`${orchestrator}/api/systems/${system}/state`)
    .then(response => {
      if (response.status !== 200) {
        clearDisplay();
        redraw = true;
        let message;
        switch (response.status) {
          case 204:
            message = "<p>System initializing ...</p>";
            break;
          case 404:
            message = "<p>Could not find system</p>";
            break;
          case 500:
            message = "<p>Internal Server Error</p>";
            break;
          default:
            message = "<p>System status unknown</p>";
        }

        document.getElementById("message").innerHTML = message;
        document.getElementById("message").classList.remove("hidden");

        return false
      }

      // 200 response:
      retries = 2 ;
      return response.json()
    })
    .catch(err => {
      document.getElementById("message").innerHTML = `<p>Unable to reach orchestrator ${orchestrator}</p>` ;
      document.getElementById("message").classList.remove("hidden") ;
      retries-- ;

      return false
    })

  // reset refresh loop, except in case of fetch failure
  if ( retries > -1 ) {
    refresh = window.setTimeout(getStatus, 5000);
  }
  else {
    document.getElementById("message").innerHTML += '<p>Refresh your browser to try again.</p>' ;
  }
  
  // re/draw the gui
  if (status) {
    document.getElementById("message").classList.add("hidden");

    // header
    document.getElementById("room-name").innerHTML = status.system_name;
    document.getElementById("room-header").classList.remove("hidden");

    // maintenance modal data
    document.getElementById( "maintenance" ).querySelector( "pre" ).innerHTML = JSON.stringify(status, null, 4) ;
		document.getElementById( "maintenance" ).querySelector( ".timestamp" ).innerHTML = new Date() ;

    // main controls
    if (redraw && status.control_sets) {
      for (const controlSet in status.control_sets) {
        let path = `{"control_sets":{"${controlSet}":{"controls":{"<id>":{"value":<value>}}}}}`;

        // check for options
        let options = { 'half_width': false, 'justify_content': false }; // defaults
        if (status.control_sets[controlSet].display_options) {
          for (let opt in status.control_sets[controlSet].display_options) {
            options[opt] = status.control_sets[controlSet].display_options[opt];
          }
        }

        setupControlSet(controlSet, status.control_sets[controlSet], path, 'main-controls');
      }
    }

    // advanced controls 
    if ( redraw && status.modals )  {
      setupModals(status.modals, false);
    }

    // update controls to the current state
    updateAllControls(status);
  }
}



/* page load listener */
window.addEventListener("load", async (event) => {
  // set the 'orchestrator' and 'system' variables
  // check if the system and orchestrator are passed in the URL
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.has('system')) {
    system = queryParams.get('system');
  }
  if (queryParams.has('orchestrator')) {
    orchestrator = queryParams.get('orchestrator');
  }

  // If orchestrator is not defined in URL param, fetch from /config
  if (!orchestrator) {
    orchestrator = await fetch("/config")
	    .then(response => response.json())
      .then(json => json.orchestrator)
      .catch(err => {
        console.error("Could not get 'orchestrator' from server", err);
        return null
      })
  }

  // If either orchestrator or system is not set, show error message
  if (!orchestrator || !system) {
    document.getElementById("message").innerHTML = "<p>System configuration not found.</p> <p>Make sure 'system' and 'orchestrator' URL parameters are set.</p>";
    document.getElementById("message").classList.remove("hidden");
  }

  // start getStatus loop
  if (orchestrator && system) {
    getStatus();
  }

  // preventDefault on all form submit actions 
  document.querySelectorAll("form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  });

  // modal dismiss listeners
  document.querySelectorAll(".modal .dismiss").forEach(function (dismiss) {
    dismiss.addEventListener("click", closeModal);
  });

  // maintenance modal
  document.getElementById('room-name').addEventListener('click', handleMaintenanceClick);
  document.getElementById('maintenance').addEventListener('click', resetMaintenanceModalTimeout);
});

export { 
  updateStatus, 
  setupControlSet,
  refresh, 
  availableTimers 
};