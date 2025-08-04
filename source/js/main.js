// Import all required modules
import { globals } from './globals.js';
import { orchestratorRequest } from './orchestrator_request.js' ;
import { openModal, setupModals } from './modals.js';
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

import '../css/styles.css'

const REFRESH_WAIT = 5000 ;
let refresh;

let nextAvailableTimer = 0;

function clearDisplay() {
  // clear main controls
  document.getElementById('main-controls').innerHTML = "";

  // clear custom modals
  document.getElementById('advanced-modals-container').innerHTML = "";

  // clear headers and messages
  document.getElementById("room-name").innerHTML = "";
  document.getElementById("room-header").classList.add("hidden");
  document.getElementById("message").innerHTML = "";
  document.getElementById("message").classList.add("hidden");
}

function alert404() {
  clearDisplay();
  document.getElementById("message").innerHTML = "<p>System configuration not found.</p> <p>Make sure 'system' and 'orchestrator' URL parameters are set.</p>";
  document.getElementById("message").classList.remove("hidden");
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
    const otherAttributes = data.controls[control].hasOwnProperty('data_attributes') ?
          data.controls[control].data_attributes.map(attr => `data-${attr}`).join(' ')
          : '';

    // generate html based on button type
    let htmlBlob;
    if (type === "stateless_mute") {
      htmlBlob = document.getElementById('mute-button-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{muteState}}/g, "")
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "stateless_volume") {
      htmlBlob = document.getElementById('stateless-volume-control-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "generic_toggle") {
      icon = document.getElementById(`${data.controls[control].icon}-icon-template`) ? document.getElementById(`${data.controls[control].icon}-icon-template`).innerHTML : "";
      noiconClass = icon === "" ? "no-icon" : "";
      htmlBlob = document.getElementById('generic-button-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{icon}}/g, icon)
        .replace(/{{no-icon}}/g, noiconClass)
        .replace(/{{enabled}}/g, data.controls[control].value)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "mute") {
      htmlBlob = document.getElementById('mute-button-template').innerHTML
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{muteState}}/g, data.controls[control].value)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "volume") {
      htmlBlob = document.getElementById('volume-control-template').innerHTML
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{timerId}}/g, nextAvailableTimer)
        .replace(/{{otherAttributes}}/, otherAttributes);
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
        .replace(/{{value}}/g, data.controls[control].value)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "video_mute") {
      htmlBlob = document.getElementById('video-pause-template').innerHTML
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{channel}}/g, channel)
        .replace(/{{control_set}}/g, controlSetName)
        .replace(/{{value}}/g, data.controls[control].value)
        .replace(/{{otherAttributes}}/, otherAttributes);
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

        const otherAttributes = data.controls[control].options[option].hasOwnProperty('data_attributes') ?
          data.controls[control].options[option].data_attributes.map(attr => `data-${attr}`).join(' ')
          : '';

        optionsBlob += optionTemplate
          .replace(/{{path}}/g, optionPath)
          .replace(/{{name}}/g, data.controls[control].options[option].name)
          .replace(/{{icon}}/g, icon)
          .replace(/{{no-icon}}/g, noiconClass)
          .replace(/{{control_set}}/g, controlSetName)
          .replace(/{{option}}/g, option)
          .replace(/{{value}}/g, data.controls[control].options[option].value)
          .replace(/{{otherAttributes}}/, otherAttributes);
      }

      htmlBlob = radioContainerTemplate.replace(/{{options}}/, optionsBlob);
    }
    if (type === "pan_tilt") {
      htmlBlob = document.getElementById('pan-tilt-template').innerHTML
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "camera_zoom") {
      htmlBlob = document.getElementById('camera-zoom-template').innerHTML
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{path}}/g, pathAttr)
        .replace(/{{otherAttributes}}/, otherAttributes);
    }
    if (type === "modal_launcher") {
      icon = document.getElementById(`${data.controls[control].icon}-icon-template`) ? document.getElementById(`${data.controls[control].icon}-icon-template`).innerHTML : "";
      noiconClass = icon === "" ? "no-icon" : "";

      htmlBlob = document.getElementById('modal-launcher-button-template').innerHTML
        .replace(/{{icon}}/g, icon)
        .replace(/{{no-icon}}/g, noiconClass)
        .replace(/{{name}}/g, data.controls[control].name)
        .replace(/{{modal}}/g, data.controls[control].modal)
        .replace(/{{otherAttributes}}/, otherAttributes);
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

function pauseRefresh() {
  window.clearTimeout(refresh); 
}

// main state healing loop
async function refreshState() {
  // Pause refresh loop
  pauseRefresh();

  if (!globals.orchestrator || !globals.system) {
    alert404();
    return null
  } 

  // Request state from orchestrator
  const state = await orchestratorRequest(`${globals.orchestrator}/api/systems/${globals.system}/state`)
    .then(async response => {
      // Do not continue the refresh loop on non-OK responses
      // Add user feedback in case of 404
      if ( response.status === 404 ) {
        clearDisplay();
        document.getElementById("message").innerHTML = "<p>Could not find system</p>";
        document.getElementById("message").classList.remove("hidden");
        return false
      }
      // catch all other non-200 responses (shouldn't get here)
      if ( !response.ok ) {
        return false
      }
      // Handle special 204 response: Continue refresh loop but don't render UI
      if (response.status === 204) {
        clearDisplay();
        document.getElementById("message").innerHTML = response.status === 204 ? "<p>System initializing ...</p>" : "<p>Could not find system</p>";
        document.getElementById("message").classList.remove("hidden");
        return "WAIT"
      }

      // 200 response, should have json body
      return await response.json()
    });

  if ( state ) {
    // Set global state and render UI
    if ( state !== "WAIT" ) { // exclude 204s
      globals.state = state ;
      window.dispatchEvent( new CustomEvent('new_state', { detail: state }) );

      // If controls have not been rendered yet, render control sets
      // TO DO: check for when controls are added/removed instead of checking for any controls
      if ( !document.getElementById("main-controls").innerHTML ) {
        drawUI(state);
      }

      // Attach listeners and set state on controls
      updateAllControls(state); 

      // Check for maintenance mode
      if ( state.maintenance_mode ) {
        document.getElementById( 'maintenance-mode-warning' ).classList.remove( 'hidden' );
      } else {
        document.getElementById( 'maintenance-mode-warning' ).classList.add( 'hidden' );
      }

      // Check for recording mode
      if ( state.recording?.status ) {
        document.getElementById( 'recording-indicator' ).classList.remove( 'hidden' );
      } else {
        document.getElementById( 'recording-indicator' ).classList.add( 'hidden' );
      }
    }

    // On OK statuses, continue refresh loop
    refresh = window.setTimeout(refreshState, REFRESH_WAIT);
  }
}

function drawUI( config ) {
  clearDisplay();

  // header
  document.getElementById("room-name").innerHTML = config.system_name;
  document.getElementById("room-header").classList.remove("hidden");

  // main controls
  if ( config.control_sets ) {
    for (const controlSet in config.control_sets) {
      let path = `{"control_sets":{"${controlSet}":{"controls":{"<id>":{"value":<value>}}}}}`;

      // check for options
      let options = { 'half_width': false, 'justify_content': false }; // defaults
      if (config.control_sets[controlSet].display_options) {
        for (let opt in config.control_sets[controlSet].display_options) {
          options[opt] = config.control_sets[controlSet].display_options[opt];
        }
      }

      setupControlSet(controlSet, config.control_sets[controlSet], path, 'main-controls');
    }
  }

  // render custom modals for advanced controls 
  if ( config.modals )  {
    setupModals(config.modals, false);
  }

  // Tell modules it's safe to attach custom listeners to controls
  window.dispatchEvent( new Event('ui_ready') );
  globals.uiReady = true ; // keeping this construct available as well, for modules that might load asynchronously
}



// clear cache and reload
function clearSystemCache() {
  pauseRefresh();
  document.getElementById('tech-errors').innerHTML = '';

  const url = `${globals.orchestrator}/api/systems/${globals.system}/cache` ;
  const options = {
    method: 'delete'
  };
  orchestratorRequest(url, options)
    .then(response => {
      if (!response.ok ) {
        const alert = document.getElementById('alert-template').innerHTML.replace(/{{message}}/, `ERROR: ${response.status} response from ${orchestrator}/api/systems/${system}/cache`) ;
        document.getElementById('tech-errors').insertAdjacentHTML('beforeend', alert) ;  
      }
      refreshState();
    })
}


/* page load listener */
window.addEventListener("load", async (event) => {
  // Check for home orchestrator from server config
  await fetch("/config")
	    .then(response => response.json())
      .then(json => {
        globals.homeOrchestrator = json.orchestrator ;
        globals.orchestrator = json.orchestrator ;
        return json.orchestrator
      })
      .catch(err => {
        console.log("Could not get 'orchestrator' from server", err);
        return null
      });

  // If orchestrator param set in URL, use this as current value (overwrite homeOrchestrator)
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.has('orchestrator')) {
    globals.orchestrator = queryParams.get('orchestrator') ;
  }

  // Set global system from query param
  if (queryParams.has('system')) {
    globals.system = queryParams.get('system');
  }
  
  // If either orchestrator or system is not set, show error message and stop processing
  if (!globals.orchestrator || !globals.system) {
    return alert404()
  }

  // start refreshState loop
  refreshState();

  // listeners for maintenance modal
  document.getElementById('room-name').addEventListener('click', handleMaintenanceClick);
  document.getElementById('maintenance').addEventListener('click', resetMaintenanceModalTimeout);
  document.getElementById('config-reload-btn').addEventListener('click', clearSystemCache);
  document.querySelector('#maintenance .dismiss').addEventListener('click', ()=> {
    document.getElementById('maintenance').classList.add('hidden');
    document.getElementById('tech-errors').innerHTML = '';
  });
  
  // icons for maintenance mode banner
  document.querySelectorAll( "#maintenance-mode-warning .icon-container" ).forEach(elem => {
		elem.innerHTML = document.getElementById("construction-icon-template").innerHTML ;
	})
});


/* updateStatus listeners */
window.addEventListener('update_started', pauseRefresh);
window.addEventListener('update_complete', (e) => {
  // if ( e.detail ) {
  //   updateAllControls(e.detail);
  // } <-- Although tempting, makes volume slider jumpy
  refresh = window.setTimeout(refreshState, REFRESH_WAIT);
});


export {  
  setupControlSet
};

