/* Global variables */
import { globals } from '../../js/globals.js';
import { attachSharedModalListeners } from '../../js/modals.js';
import banners from './components/zoom_banners.html'
import joinManualModal from './components/join_manual_modal.html'
import joinSuggestedModal from './components/join_suggested_modal.html'
import leaveModal from './components/leave_modal.html'
import abandonedMeetingModal from './components/abandoned_meeting_modal.html'
import shareScreenModal from './components/share_screen_modal.html'
import './zoom.css'

/* Zoom variables */
let refresh, zoomLeaveTimeoutId;
const abandonedZoomWaitTime = 7200000; // milliseconds (2hs)

const REFRESH_WAIT = 5000 ;
const MAX_TRIES = 5;
let guiInitiationTries = 0;
let zoomStatus;

function getZoomStatus() {
  clearTimeout(refresh);

  if ( globals.state ) {
    // If a Zoom Room is configured, cache the status and restart the refresh loop;
    // else just stop checking for Zoom state (do nothing)
    if ( globals.state.hasOwnProperty('zoom_room') ) {
      zoomStatus = globals.state.zoom_room
      refresh = window.setTimeout(getZoomStatus, REFRESH_WAIT);
    }
  }
  // waiting for global state, try again
  else {
    refresh = window.setTimeout(getZoomStatus, REFRESH_WAIT);
  }
}

function openZoomPrompt() {
  console.log('openZoomPrompt placeholder');

  // if no meeting is joined yet, do that dance
  // else if meeting is joined, leave
  // document.getElementById('manual-zoom-prompt').classList.toggle('hidden');

}

function initiateZoomGUI() {
  // Make sure the main window.onload process has run and gotten a system state;
  // setupControlSets also needs to run (uiReady) before setting event listeners
  if ( !globals.state || !globals.uiReady ) {
    if ( guiInitiationTries <= MAX_TRIES ) {
      guiInitiationTries++;
      return setTimeout( initiateZoomGUI, 500 )
    }
    return false  // TO DO: call client error here? 
  }
  
  // Only need to render Zoom UI components if this system has zoom_room configured
  if ( globals.state.hasOwnProperty("zoom_room") ) {
    // Add Zoom Room banners to DOM 
    document.getElementById('banners-container').insertAdjacentHTML('beforeend', banners) ;

    // Add Zoom modals to DOM
    document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', joinSuggestedModal) ;
    document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', joinManualModal) ;
    document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', leaveModal) ;
    document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', shareScreenModal) ;
    document.getElementById('plugin-modals-container').insertAdjacentHTML('beforeend', abandonedMeetingModal) ;

    // Attach listeners to all controls tagged data-zoom-room-input
    document.querySelectorAll('[data-zoom-room-input]').forEach(input => {
      input.addEventListener('click', openZoomPrompt)
    });

    // Attach listeners to inputs in custom Zoom modals
    attachSharedModalListeners();

    // Focus listener for "join meeting" form inputs
    document.querySelectorAll( "form#join_meeting_by_id input" ).forEach( function handler(input) {
      input.addEventListener("focus", function(e) {
        document.getElementById( "manual-zoom-prompt" ).classList.add( "focused" );
      });
    });

    // Attach listeners for static SIP toggle buttons
    // document.querySelectorAll("#sip-toggle button").forEach( function(button){
    //   button.addEventListener( "click", toggleSip );
    // });  
  } 
}


/* page load listener */
window.addEventListener("load", async (event) => {
  initiateZoomGUI() ;
  getZoomStatus() ;
});

// from get_status:
// Zoom Room setup
// if ( response.hasOwnProperty("zoom_room") ) {
//   captureZoomJoinData( response.zoom_room );
//   displayZoomStatus( response.zoom_room.sharing_info?.sharing_key, response.zoom_room.current_meeting, response.zoom_room.last_meeting_join_status, response.zoom_room.last_interaction );
//   checkForAbandonedZoomMeeting( response.zoom_room, response.video ) ;
//   // checkForMutedZoomRoom( response.zoom_room );
//   checkForZoomRoomWarnings( response.zoom_room );
// }