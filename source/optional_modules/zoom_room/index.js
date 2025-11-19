/* Global variables */
import { globals } from "../../js/globals.js";
import { updateStatus } from "../../js/orchestrator_request.js";
import {
  bumpMainContentForBanners,
  registerStateChangeEvent,
} from "../../js/utilities.js";
import { attachSharedModalListeners, openModal } from "../../js/modals.js";

import banners from "./components/zoom_banners.html";
import joinManualModal from "./components/join_manual_modal.html";
import joinSuggestedModal from "./components/join_suggested_modal.html";
import leaveModal from "./components/leave_modal.html";
import abandonedMeetingModal from "./components/abandoned_meeting_modal.html";
import shareScreenModal from "./components/share_screen_modal.html";
import sharingKeyTemplate from "./components/sharing_key.html";
import "./zoom.css";

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
  const currentMeeting = zoomData.meeting?.info?.meeting_name
    ? zoomData.meeting.info.meeting_name
    : zoomData.meeting?.info?.meeting_number;

  banner.querySelector(".feedback-message").innerHTML =
    `Leaving meeting: ${currentMeeting}`;
  const leaveBtn = banner.querySelector("button[name=leave-meeting]");
  leaveBtn.classList.add("hidden");
  showBanner();

  // add a hook for powerHandler to see the leave attempt initiated
  banner.setAttribute("data-leaving-meeting", "");

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

  // callback for updateStatus
  function reset() {
    modal.classList.add("hidden");
  }

  joinZoomMeeting(
    zoomData.suggested_meeting.id,
    zoomData.suggested_meeting.password,
    reset,
  );
}

function handleManualJoinSubmit(e) {
  e.preventDefault();
  const modal = document.getElementById("manual-zoom-prompt");
  const form = document.getElementById("join-meeting-by-id");

  // remove submit listener
  form.removeEventListener("submit", handleManualJoinSubmit);

  // get values from form
  const meetingId = form.querySelector("input[name=meeting_id]").value;
  const password = form.querySelector("input[name=password]").value;

  // callback for updateStatus
  function reset() {
    modal.classList.add("hidden");
  }

  joinZoomMeeting(meetingId, password, reset);
}

function handleLeaveSubmit() {
  // remove submit listener
  const modal = document.getElementById("leave-zoom-prompt");
  const submitBtn = modal.querySelector("button[name=leave-meeting]"); // TO DO: refactor to use form/submit?
  submitBtn.removeEventListener("click", handleLeaveSubmit);

  // callback for updateStatus
  function reset() {
    modal.classList.add("hidden");
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

  // make sure SIP toggle is on default value (Zoom)
  toggleSIP();

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

// Check for other Zoom inputs (eg. a Share Screen button) and set data-override
// to true so they will not display as active
function selectZoomInput(input, newSelection = false) {
  // check if there is another Zoom input in the same radio
  const radioGroup = input.parentElement;
  const zoomOpts = radioGroup.querySelectorAll(
    "[data-zoom-meeting-prompt], [data-zoom-share-prompt]",
  );
  if (zoomOpts.length > 1) {
    // De-select all Zoom inputs
    radioGroup
      .querySelectorAll("[data-zoom-meeting-prompt], [data-zoom-share-prompt]")
      .forEach((opt) => {
        opt.setAttribute("data-override", true);
        opt.classList.remove("active");
        opt.removeAttribute("data-zoom-last-selected");
      });

    // select the requested input
    input.setAttribute("data-zoom-last-selected", "");

    // check for potential conflict with a linked power or video_mute button before applying data-override
    if (newSelection) {
      const channel = radioGroup.getAttribute("data-channel");
      const linkedPower = document.querySelector(
        `.power-button[data-channel=${channel}]`,
      );
      const linkedPause = document.querySelector(
        `.pause-button[data-channel=${channel}]`,
      );
      if (
        (!linkedPower || linkedPower.getAttribute("data-value") === "true") &&
        (!linkedPause || linkedPause.getAttribute("data-value") !== "true")
      ) {
        input.setAttribute("data-override", false);
      }
    } else {
      input.setAttribute("data-override", false);
    }
  }

  // finally, update visually
  if (input.getAttribute("data-override") !== "true") {
    input.classList.add("active");
  }
}

function handleZoomRoomWarning(e) {
  const btn = e.target;
  const banner = btn.parentElement;

  function reset() {
    // clean up banner
    banner.classList.add("hidden");
    btn.classList.remove("active");
    bumpMainContentForBanners();
  }

  // visual feedback
  btn.classList.add("active");

  // block clicks until next time warning state is triggered
  btn.removeAttribute("click", handleZoomRoomWarning);
  btn.removeAttribute("touchstart", handleZoomRoomWarning);

  // post unmute request
  const action = btn.getAttribute("data-action");
  const payload = JSON.stringify({
    zoom_room: {
      meeting: {
        presence: {
          [action]: false,
        },
      },
    },
  });

  updateStatus(payload, reset);
}

function checkForZoomRoomWarnings() {
  const audioWarningBanner = document.getElementById("zoom-room-audio-warning");
  const cameraWarningBanner = document.getElementById(
    "zoom-room-camera-warning",
  );

  if (
    zoomData.meeting?.presence?.microphone_muted === "true" ||
    zoomData.meeting?.presence?.microphone_muted === true
  ) {
    audioWarningBanner
      .querySelector("button")
      .addEventListener("click", handleZoomRoomWarning);
    audioWarningBanner
      .querySelector("button")
      .addEventListener("touchstart", handleZoomRoomWarning);
    audioWarningBanner.classList.remove("hidden");
  } else {
    audioWarningBanner.classList.add("hidden");
  }

  if (
    zoomData.meeting?.presence?.video_muted === "true" ||
    zoomData.meeting?.presence?.video_muted === true
  ) {
    cameraWarningBanner
      .querySelector("button")
      .addEventListener("click", handleZoomRoomWarning);
    cameraWarningBanner
      .querySelector("button")
      .addEventListener("touchstart", handleZoomRoomWarning);
    cameraWarningBanner.classList.remove("hidden");
  } else {
    cameraWarningBanner.classList.add("hidden");
  }

  bumpMainContentForBanners();
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

  // Highlight correct Zoom inputs
  document
    .querySelectorAll(
      "[data-zoom-last-selected][data-value=true][data-override=false]",
    )
    .forEach((input) => {
      selectZoomInput(input);
    });

  // Update banners
  // const meetingStatus =
  //   zoomData.meeting?.status &&
  //   zoomData.meeting?.info?.meeting_type === "meeting"
  //     ? zoomData.meeting.status
  //     : false;
  const meetingStatus = zoomData.meeting?.status;

  const currentMeeting = zoomData.meeting?.info?.meeting_name
    ? zoomData.meeting.info.meeting_name
    : zoomData.meeting?.info?.meeting_number;

  // in_meeting
  if (
    meetingStatus === "in_meeting" &&
    zoomData.meeting?.info?.meeting_type === "meeting"
  ) {
    zoomBanner.querySelector(".feedback-message").innerHTML =
      `In meeting: ${currentMeeting}`;

    showLeaveBtn();
    showBanner();

    // add a hook for powerHandler to see a meeting is joined
    zoomBanner.setAttribute("data-meeting-joined", "");

    // check if Zoom Room mic or camera is muted
    checkForZoomRoomWarnings();
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

    // clear old data
    zoomBanner.removeAttribute("data-meeting-joined");
  }

  // no meeting, clean up banner and leave button
  if (!meetingStatus || meetingStatus === "not_in_meeting") {
    zoomBanner.classList.add("hidden");
    zoomBanner.removeAttribute("data-meeting-joined");
    zoomBanner.removeAttribute("data-leaving-meeting");
    cleanUpLeaveBtn();

    // clear any moot Zoom warnings (no meeting)
    document.getElementById("zoom-room-audio-warning").classList.add("hidden");
    document.getElementById("zoom-room-camera-warning").classList.add("hidden");

    bumpMainContentForBanners();
  }

  // Display Sharing Key
  const sharingKey = zoomData.sharing_key;
  if (
    sharingKey &&
    sharingKey !== document.querySelector(".zoom-sharing-key").innerHTML
  ) {
    document.querySelectorAll(".zoom-sharing-key").forEach(function (elem) {
      elem.innerHTML = sharingKey;
    });
    document
      .getElementById("zoom-sharing-key-container")
      .classList.remove("hidden");
    document
      .querySelector("#share-screen-zoom-prompt .zoom-sharing-key")
      .classList.remove("not-available");
  } else if (!sharingKey) {
    document
      .getElementById("zoom-sharing-key-container")
      .classList.add("hidden");
    document
      .querySelector("#share-screen-zoom-prompt .zoom-sharing-key")
      .classList.add("not-available");
    document.querySelector(
      "#share-screen-zoom-prompt .zoom-sharing-key",
    ).innerHTML = "Not Available";
  }
}

function handleZoomMeetingPromptClick(e) {
  // Open one of three prompts based on Zoom state:
  const meetingJoined =
    zoomData.meeting?.status === "in_meeting" ? true : false;

  // Suggested meeting join:
  if (
    !meetingJoined &&
    zoomData.suggested_meeting?.id &&
    zoomData.suggested_meeting?.password
  ) {
    // update modal text
    const modal = document.getElementById("scheduled-zoom-prompt");
    modal.querySelector(".meeting-name").textContent =
      zoomData.suggested_meeting.name;

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
  // Leave meeting prompt (first check that the Zoom button is already selected; otherwise just do nothing)
  else if (
    e.currentTarget.getAttribute("data-value") === "true" &&
    e.currentTarget.getAttribute("data-override") !== "true"
  ) {
    openLeaveZoomPrompt();
  }

  // Disambiguate with other Zoom inputs
  selectZoomInput(e.currentTarget, true);
}

function handleZoomSharePromptClick(e) {
  openModal(null, "share-screen-zoom-prompt");
  selectZoomInput(e.currentTarget, true);
}

function toggleSIP(e = null) {
  const label = document.querySelector(
    "#manual-zoom-prompt label[for=meeting_id]",
  );
  const input = document.querySelector(
    "#manual-zoom-prompt input[name=meeting_id]",
  );
  const activeButton = e
    ? e.target
    : document.querySelector("#sip-toggle button[value=zoom]");
  if (e?.target.value === "sip") {
    label.innerHTML = "SIP ID:";
    input.setAttribute("inputmode", "text");
  } else {
    label.innerHTML = "Meeting ID:";
    input.setAttribute("inputmode", "numeric");
  }

  input.focus();
  activeButton.parentElement
    .querySelector(".active")
    .classList.remove("active");
  activeButton.classList.add("active");
}

function initiateZoomGUI() {
  // make sure elements only get initialized once, and listeners only get attached if zoom_room configured
  if (globals.getState()?.zoom_room) {
    // Initiate zoomData object with globals.getState (which should be assigned before ui_ready fires)
    zoomData = globals.getState()?.zoom_room;

    // If Zoom banners not present already, add to DOM
    if (!document.getElementById("zoom-room-notification")) {
      const zoomIconHTML =
        document.getElementById("zoom-icon-template").innerHTML;
      const micIconHTML =
        document.getElementById("mic-icon-template").innerHTML;
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
    }

    // If Sharing Key container not present, add to DOM (in main)
    if (!document.getElementById("zoom-sharing-key-container")) {
      const shareScreenIconHTML = document.getElementById(
        "share-screen-icon-template",
      ).innerHTML;
      const sharingKeyHTML = sharingKeyTemplate.replace(
        /{{share_screen_icon}}/g,
        shareScreenIconHTML,
      );
      document
        .querySelector("main")
        .insertAdjacentHTML("beforeend", sharingKeyHTML);
    }

    // Attach listeners to all controls tagged data-zoom-meeting-prompt
    document.querySelectorAll("[data-zoom-meeting-prompt]").forEach((input) => {
      input.addEventListener("click", handleZoomMeetingPromptClick);
    });

    // Attach listeners to all controls tagged data-zoom-sharing-prompt
    document.querySelectorAll("[data-zoom-share-prompt]").forEach((input) => {
      input.addEventListener("click", handleZoomSharePromptClick);
    });

    // Select one Zoom input in radios with multiple Zoom inputs selected at boot
    document.querySelectorAll(".display-source-radio").forEach((radioGroup) => {
      const zoomOpts = radioGroup.querySelectorAll(
        "[data-zoom-meeting-prompt], [data-zoom-share-prompt]",
      );
      if (
        zoomOpts.length > 1 &&
        zoomOpts[0].getAttribute("data-value") === "true"
      ) {
        selectZoomInput(zoomOpts[0]);
      }
    });

    // Register state change callbacks for Zoom inputs and any linked Power buttons
    function inputChangeCallback(e) {
      // e.currentTarget is the parent radio in this case
      e.currentTarget
        .querySelectorAll(
          "[data-zoom-last-selected][data-value=true][data-override=false]",
        )
        .forEach((input) => {
          selectZoomInput(input);
        });
    }

    function powerHandler(e) {
      const triggerBtn = e.detail;
      // In case of multi-screen rooms, make sure no other video output is on Zoom
      const activeZoomInputs = document.querySelectorAll(
        "[data-zoom-meeting-prompt][data-value=true].active, [data-zoom-share-prompt][data-value=true].active",
      );
      if (
        triggerBtn.getAttribute("data-value") === "false" &&
        activeZoomInputs.length === 0
      ) {
        const banner = document.getElementById("zoom-room-notification");
        const meetingJoined = banner.hasAttribute("data-meeting-joined");
        const leaveInitiated = banner.hasAttribute("data-leaving-meeting");
        if (meetingJoined && !leaveInitiated) {
          leaveZoomMeeting();
        }
      }
    }

    document
      .querySelectorAll("[data-zoom-meeting-prompt], [data-zoom-share-prompt]")
      .forEach((input) => {
        // Re-evaluate selected Zoom input when any Zoom input state changes
        registerStateChangeEvent(
          "zoom_input_updated",
          input,
          [input.parentElement],
          inputChangeCallback,
        );

        // Look for linked power buttons, which should trigger Zoom leave on shutdown
        const channel = input.parentElement.getAttribute("data-channel");
        const linkedPower = channel
          ? document.querySelector(`.power-button[data-channel=${channel}]`)
          : null;
        if (linkedPower) {
          registerStateChangeEvent(
            "power_updated",
            linkedPower,
            [document.body],
            powerHandler,
          );
        }
      });

    // Attach static listeners to inputs in custom Zoom modals, eg. Cancel/Back dismiss buttons
    attachSharedModalListeners();

    // Special extra handlers for the dismiss-modal buttons (clean up Zoom handlers):
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
    document.querySelectorAll("#sip-toggle button").forEach(function (button) {
      button.addEventListener("click", toggleSIP);
    });

    // Start listening for state changes from main
    window.addEventListener("new_state", displayZoomStatus);
  }
}

/* page load listener */
window.addEventListener("ui_ready", initiateZoomGUI);
