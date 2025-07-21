/* Global variables */
import { globals } from '../../js/globals.js';
import { updateStatus } from '../../js/main.js';
import { attachSharedModalListeners, openModal } from '../../js/modals.js';
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
let zoomData;

function joinZoomMeeting(meetingId, password, callback=null) {
  // stop the getZoomData loop
  clearTimeout(refresh);

  // User feedback: show banner
  const banner = document.getElementById( 'zoom-room-notification' );
	banner.querySelector( '.feedback-message' ).innerHTML = 'Joining meeting ' ;
	// zoomBanner.querySelector( '.meeting-name' ).innerHTML = meetingId ;
	banner.classList.remove( 'hidden' ) ;

  // bump main content for banner

  // Post join request to orchestrator
  const payload = JSON.stringify({ zoom_room : { join : { id: meetingId, password: password }}}) ;
  console.log('payload for zoom join');
  console.log(payload);
  updateStatus(payload, () => {
    getZoomData(); // start the loop again

    // call callback (reset)
    if (callback) { // Note: Using this pattern so that joinZoomMeeting can be exported for other modules to use in future
      callback();
    }
  });
}

function leaveZoomMeeting(callback=null) {
  // stop the getZoomData loop
  clearTimeout(refresh);

  // User feedback: update banner
  const banner = document.getElementById( 'zoom-room-notification' );
  banner.querySelector( '.feedback-message' ).innerHTML = 'Leaving meeting ' ;
  banner.classList.remove( 'hidden' ) ;

  // bump main content for banner

  // Post leave request to orchestrator
  const payload = JSON.stringify({ zoom_room : { leave : true }}) ;
  updateStatus(payload, () => {
    getZoomData(); // start the loop again

    // call callback (reset)
    if (callback) {
      callback();
    }
  })
}

function openZoomPrompt() {
  const meetingJoined = zoomData.meeting?.status === "in_meeting" ? true : false ;

  function handleSuggestedJoinSubmit(e) {
    // remove the submit listener
    const modal = document.getElementById('scheduled-zoom-prompt') ;
    const submitBtn = modal.querySelector('button[name=join-suggested-meeting]') ; // TO DO: refactor to use form/submit?
    submitBtn.removeEventListener('click', handleSuggestedJoinSubmit);

    // user feedback: style submit button
    //submitBtn.classList.add(??)

    // callback for updateStatus
    function reset() {
      // hide suggested join modal
      modal.classList.add('hidden');

      // style buttons active
      //submitBtn.classList.remove(??)
    }

    joinZoomMeeting( zoomData.suggested_meeting?.meeting_id, zoomData.suggested_meeting?.meeting_password, reset) ;
  }

  function handleLeaveSubmit(e) {
    // remove submit listener
    const modal = document.getElementById('leave-zoom-prompt') ;
    const submitBtn = modal.querySelector('button[name=leave-meeting]') ; // TO DO: refactor to use form/submit?
    submitBtn.removeEventListener('click', handleLeaveSubmit);

    // user feedback: style submit button

    function reset() {
      // hide leave modal
      modal.classList.add('hidden');

      // style buttons active
      //submitBtn.classList.remove(??)
    }

    leaveZoomMeeting(reset);
  }

  // Open one of three prompts based on Zoom state:
  //  // Suggested meeting join:
  if ( !meetingJoined && zoomData.suggested_meeting ) {
    // update modal text
    const modal = document.getElementById('scheduled-zoom-prompt');
    modal.querySelector( '.meeting-name' ).textContent = zoomData.suggested_meeting.meeting_name ;

    // re-attach submit listener
    modal.querySelector('button[name=join-suggested-meeting]').addEventListener('click', handleSuggestedJoinSubmit);

    openModal(null, 'scheduled-zoom-prompt');
  }
  //  // Manual meeting join:
  else if ( !meetingJoined ) {
    openManualJoinForm(); // using a global function instead of inline so that Suggested Meeting dismiss can run this routine
  }
  //  // Leave meeting prompt
  else {
    // re-attach submit listeners etc ...
    const modal = document.getElementById('leave-zoom-prompt');
    modal.querySelector('button[name=leave-meeting]').addEventListener('click', handleLeaveSubmit);

    openModal(null, 'leave-zoom-prompt');
  }
}

// Making this snippet reusable so that Manual Meeting join can share
// with Suggested Meeting dismiss
function openManualJoinForm() {
  // clear old form input
  const form = document.getElementById('join-meeting-by-id');
  form.reset();

  // re-attach form submit listener
  function handleManualJoinSubmit(e) {
    e.preventDefault();
    const modal = document.getElementById('manual-zoom-prompt') ;
    // const form = e.target;
    const submitBtn = form.querySelector('button[type=submit]')

    // remove submit listener
    form.removeEventListener('submit', handleManualJoinSubmit);

    // user feedback: style submit button
    //submitBtn.classList.add(??)

    // get values from form
		const meetingId = form.querySelector( "input[name=meeting_id]" ).value ;
		const password = form.querySelector( "input[name=password]" ).value ;

    // callback for updateStatus
    function reset() {
      // hide manual join modal
      modal.classList.add('hidden');

      // style buttons active
      //submitBtn.classList.remove(??)
    }

    joinZoomMeeting( meetingId, password, reset );  
  }
  form.addEventListener('submit', handleManualJoinSubmit);

  openModal(null, 'manual-zoom-prompt');
}

function displayZoomStatus() {

}

function getZoomData() {
  clearTimeout(refresh);

  if ( globals.state?.zoom_room ) {
    // Cache Zoom Room status for event listeners
    zoomData = globals.state.zoom_room ;

    // update the gui to reflect current state, check for abandoned meeting etc.
    // ...

    refresh = window.setTimeout(getZoomData, REFRESH_WAIT);  
  }
  // lost global state, try again (shouldn't get here)
  else {
    refresh = window.setTimeout(getZoomData, REFRESH_WAIT);
  }
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
    zoomData = globals.state.zoom_room ;

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

    // Attach static listeners to inputs in custom Zoom modals, eg. Close/Back buttons
    attachSharedModalListeners();
    // special handler for the Suggested Meeting prompt dismiss-modal button: Open the manual join prompt
    document.querySelector('#scheduled-zoom-prompt button.dismiss-modal').addEventListener('click', openManualJoinForm);

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


    // Start the status loop
    getZoomData() ;
  } 
}


/* page load listener */
window.addEventListener("load", async (event) => {
  initiateZoomGUI() ;
});

