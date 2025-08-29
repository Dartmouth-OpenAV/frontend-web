/* Global variables */
import { globals } from "../../js/globals.js";
import { updateStatus } from "../../js/orchestrator_request.js";
import { bumpMainContentForBanners } from "../../js/utilities.js";
import { attachSharedModalListeners, openModal } from "../../js/modals.js";
import banners from "./components/zoom_banners.html";
import joinManualModal from "./components/join_manual_modal.html";
import joinSuggestedModal from "./components/join_suggested_modal.html";
import leaveModal from "./components/leave_modal.html";
import abandonedMeetingModal from "./components/abandoned_meeting_modal.html";
import shareScreenModal from "./components/share_screen_modal.html";
import "./zoom.css";

/* Zoom variables */
//let refresh, zoomLeaveTimeoutId;
//const abandonedZoomWaitTime = 7200000; // milliseconds (2hs)

let guiInitiated = false;
let zoomData;

function showBanner() {
  const banner = document.getElementById("zoom-room-notification");
  banner.classList.remove("hidden");
  bumpMainContentForBanners();
}

function joinZoomMeeting(meetingId, password, callback = null) {
  // User feedback: show banner
  const banner = document.getElementById("zoom-room-notification");
  banner.querySelector(".feedback-message").innerHTML =
    `Joining meeting ${meetingId}`;
  showBanner();

  // Post join request to orchestrator
  const payload = JSON.stringify({
    zoom_room: {
      join: { id: meetingId, password: password },
    },
  });
  updateStatus(payload, () => {
    // call callback (reset)
    // Note: Using this pattern so that joinZoomMeeting can be exported for other modules to use in future
    if (callback) {
      callback();
    }
  });
}

function leaveZoomMeeting(callback = null) {
  // User feedback: update banner
  const banner = document.getElementById("zoom-room-notification");
  const currentMeeting = zoomData.meeting.info?.meeting_name
    ? zoomData.meeting.info?.meeting_name
    : zoomData.meeting.info?.meeting_number;

  banner.querySelector(".feedback-message").innerHTML =
    `Leaving meeting: ${currentMeeting}`;
  showBanner();

  // Post leave request to orchestrator
  const payload = JSON.stringify({
    zoom_room: {
      leave: true,
    },
  });
  updateStatus(payload, () => {
    // call callback (reset)
    if (callback) {
      callback();
    }
  });
}

function handleSuggestedJoinSubmit() {
  // remove the submit listener
  const modal = document.getElementById("scheduled-zoom-prompt");
  const submitBtn = modal.querySelector("button[name=join-suggested-meeting]"); // TO DO: refactor to use form/submit?
  submitBtn.removeEventListener("click", handleSuggestedJoinSubmit);

  // user feedback: style submit button
  //submitBtn.classList.add(??)

  // callback for updateStatus
  function reset() {
    // hide suggested join modal
    modal.classList.add("hidden");

    // style buttons active
    //submitBtn.classList.remove(??)
  }

  joinZoomMeeting(
    zoomData.suggested_meeting?.meeting_id,
    zoomData.suggested_meeting?.meeting_password,
    reset,
  );
}

function handleManualJoinSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById("manual-zoom-prompt");
  const form = document.getElementById("join-meeting-by-id");

  // remove submit listener
  form.removeEventListener("submit", handleManualJoinSubmit);

  // user feedback: style submit button
  //submitBtn.classList.add(??)

  // get values from form
  const meetingId = form.querySelector("input[name=meeting_id]").value;
  const password = form.querySelector("input[name=password]").value;

  // callback for updateStatus
  function reset() {
    // hide manual join modal
    modal.classList.add("hidden");

    // style buttons active
    //submitBtn.classList.remove(??)
  }

  joinZoomMeeting(meetingId, password, reset);
}

function handleLeaveSubmit() {
  // remove submit listener
  const modal = document.getElementById("leave-zoom-prompt");
  const submitBtn = modal.querySelector("button[name=leave-meeting]"); // TO DO: refactor to use form/submit?
  submitBtn.removeEventListener("click", handleLeaveSubmit);

  // user feedback: style submit button

  function reset() {
    // hide leave modal
    modal.classList.add("hidden");

    // style buttons active
    //submitBtn.classList.remove(??)
  }

  leaveZoomMeeting(reset);
}

// Making this snippet reusable so that Manual Meeting join can share
// with Suggested Meeting dismiss
function openManualJoinForm() {
  // clear old form input
  const form = document.getElementById("join-meeting-by-id");
  form.reset(); // belt and suspenders

  // re-attach form submit listener
  form.addEventListener("submit", handleManualJoinSubmit);

  openModal(null, "manual-zoom-prompt");
}

// Making this snippet reusable to share with "Leave" button in status banner
function openLeaveZoomPrompt() {
  // re-attach submit listeners etc ...
  const modal = document.getElementById("leave-zoom-prompt");
  modal
    .querySelector("button[name=leave-meeting]")
    .addEventListener("click", handleLeaveSubmit);

  openModal(null, "leave-zoom-prompt");
}

// Open one of three prompts based on Zoom state:
function openZoomPrompt() {
  const meetingJoined =
    zoomData.meeting?.status === "in_meeting" ? true : false;

  // Suggested meeting join:
  if (!meetingJoined && zoomData.suggested_meeting) {
    // update modal text
    const modal = document.getElementById("scheduled-zoom-prompt");
    modal.querySelector(".meeting-name").textContent =
      zoomData.suggested_meeting.meeting_name;

    // re-attach submit listener
    modal
      .querySelector("button[name=join-suggested-meeting]")
      .addEventListener("click", handleSuggestedJoinSubmit);

    openModal(null, "scheduled-zoom-prompt");
  }
  // Manual meeting join:
  else if (!meetingJoined) {
    openManualJoinForm(); // using a global function instead of inline so that Suggested Meeting dismiss can run this routine
  }
  // Leave meeting prompt
  else {
    // // re-attach submit listeners etc ...
    // const modal = document.getElementById("leave-zoom-prompt");
    // modal
    //   .querySelector("button[name=leave-meeting]")
    //   .addEventListener("click", handleLeaveSubmit);

    // openModal(null, "leave-zoom-prompt");
    openLeaveZoomPrompt();
  }
}

function displayZoomStatus(e) {
  zoomData = e.detail.zoom_room;

  const zoomBanner = document.getElementById("zoom-room-notification");
  const leaveBtn = zoomBanner.querySelector("button[name=leave-meeting]");

  function showLeaveBtn() {
    leaveBtn.addEventListener("click", openLeaveZoomPrompt);
    leaveBtn.addEventListener("touchstart", openLeaveZoomPrompt);
    leaveBtn.classList.remove("hidden");
  }
  function cleanUpLeaveBtn() {
    leaveBtn.removeEventListener("click", openLeaveZoomPrompt);
    leaveBtn.removeEventListener("touchstart", openLeaveZoomPrompt);
    leaveBtn.classList.add("hidden");
  }

  // Update banner
  const meetingStatus = zoomData.meeting?.status
    ? zoomData.meeting.status
    : false;

  const currentMeeting = zoomData.meeting.info?.meeting_name
    ? zoomData.meeting.info?.meeting_name
    : zoomData.meeting.info?.meeting_number;

  // in_meeting
  if (meetingStatus === "in_meeting") {
    zoomBanner.querySelector(".feedback-message").innerHTML =
      `In meeting: ${currentMeeting}`;

    showLeaveBtn();
    showBanner();
  }

  // connecting
  if (meetingStatus === "connecting") {
    const connectionStatus = zoomData.meeting.connection_stage;

    // fallback message
    zoomBanner.querySelector(".feedback-message").innerHTML = currentMeeting
      ? `Connecting to meeting ${currentMeeting} ...`
      : "Connecting to meeting ...";

    // overwrite in the case of error
    if (connectionStatus === "locked") {
      zoomBanner.querySelector(".feedback-message").innerHTML = currentMeeting
        ? `Meeting Locked: ${currentMeeting}`
        : "Meeting Locked";
    }
    if (connectionStatus === "needs_passcode") {
      zoomBanner.querySelector(".feedback-message").innerHTML = currentMeeting
        ? `Passcode required for ${currentMeeting}.`
        : "Passcode required. Try again.";
    }
    if (connectionStatus === "needs_passcode_wrong_and_retry") {
      zoomBanner.querySelector(".feedback-message").innerHTML = currentMeeting
        ? `Wrong passcode for ${currentMeeting}.`
        : "Wrong passcode. Try again.";
    }

    cleanUpLeaveBtn();
    showBanner();
  }

  // no meeting, clean up banner and leave button
  if (!meetingStatus || meetingStatus === "not_in_meeting") {
    zoomBanner.classList.add("hidden");
    cleanUpLeaveBtn();
    bumpMainContentForBanners();
  }

  // Display sharing key

  // Check for abandoned Zoom meeting

  // Check for camera and audio mute warnings
}

function initiateZoomGUI() {
  // make sure elements only get initialized once, and listeners only get attached if zoom_room configured
  if (!guiInitiated && globals.state?.zoom_room) {
    // Initiate zoomData object with globals.state (which should be assigned before ui_ready fires)
    zoomData = globals.state?.zoom_room;

    // Add Zoom Room banners to DOM
    const zoomIconHTML =
      document.getElementById("zoom-icon-template").innerHTML;
    const micIconHTML = document.getElementById("mic-icon-template").innerHTML;
    const bannersHTML = banners
      .replace(/{{zoom_icon}}/g, zoomIconHTML)
      .replace(/{{mic_icon}}/g, micIconHTML);
    document
      .getElementById("banners-container")
      .insertAdjacentHTML("beforeend", bannersHTML);

    // Add Zoom modals to DOM
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", joinSuggestedModal);
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", joinManualModal);
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", leaveModal);
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", shareScreenModal);
    document
      .getElementById("plugin-modals-container")
      .insertAdjacentHTML("beforeend", abandonedMeetingModal);

    // Attach listeners to all controls tagged data-zoom-room-input
    document.querySelectorAll("[data-zoom-room-input]").forEach((input) => {
      input.addEventListener("click", openZoomPrompt);
    });

    // Attach static listeners to inputs in custom Zoom modals, eg. Cancel/Back dismiss buttons
    attachSharedModalListeners();
    // Special extra handlers for the dismiss-modal buttons:
    document
      .querySelector("#scheduled-zoom-prompt button.dismiss-modal")
      .addEventListener("click", () => {
        // remove scheduled-zoom-prompt submit handler and open Manual Join prompt
        document
          .querySelector(
            "#scheduled-zoom-prompt button[name=join-suggested-meeting]",
          )
          .removeEventListener("click", handleSuggestedJoinSubmit);
        openManualJoinForm();
      });
    document
      .querySelector("#manual-zoom-prompt button.dismiss-modal")
      .addEventListener("click", () => {
        // clear form and remove submit handler
        document
          .getElementById("join-meeting-by-id")
          .removeEventListener("submit", handleManualJoinSubmit);
        document.getElementById("join-meeting-by-id").reset();
      });
    document
      .querySelector("#leave-zoom-prompt button.dismiss-modal")
      .addEventListener("click", () => {
        // remove manual-zoom-prompt submit handler
        document
          .querySelector("#leave-zoom-prompt button[name=leave-meeting]")
          .removeEventListener("click", handleLeaveSubmit);
      });

    // Focus listener for "join meeting" form inputs
    document
      .querySelectorAll("form#join_meeting_by_id input")
      .forEach(function handler(input) {
        input.addEventListener("focus", function () {
          document
            .getElementById("manual-zoom-prompt")
            .classList.add("focused");
        });
      });

    // Attach listeners for static SIP toggle buttons
    // document.querySelectorAll("#sip-toggle button").forEach(function(button){
    //   button.addEventListener("click", toggleSip);
    // });

    guiInitiated = true;

    // Start listening for state changes from main
    window.addEventListener("new_state", displayZoomStatus);
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateZoomGUI);
