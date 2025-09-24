/*
 *
 * Volume slider
 *
 */

// import { refresh, availableTimers, updateStatus } from '../main.js';
import { updateStatus } from "../orchestrator_request.js";
import { dispatchStateChangeEvents } from "../utilities.js";

let handleVolumeOngoing = false;

// pool of 10 volume slider timeout IDs (10 is an arbitrary upper limit on sliders per system)
let timer1,
  timer2,
  timer3,
  timer4,
  timer5,
  timer6,
  timer7,
  timer8,
  timer9,
  timer10;
const availableTimers = [
  timer1,
  timer2,
  timer3,
  timer4,
  timer5,
  timer6,
  timer7,
  timer8,
  timer9,
  timer10,
];

function setVolumeSliderState(slider, level) {
  const color =
    slider.getAttribute("data-muted") === "true"
      ? "var(--slider-muted)"
      : "var(--theme-color)";
  level = level && parseInt(level) ? level : 0; // parse error values as 0
  slider.value = level;
  slider.setAttribute(
    "style",
    `background:linear-gradient(to right, ${color}, ${color} ${level}%, var(--slider-background) ${level}%, var(--slider-background))`,
  );

  // handlers
  if (slider.hasAttribute("data-allow-events")) {
    slider.addEventListener("input", handleVolumeSlider);
  }

  // Alert modules with dependencies on this control's state
  dispatchStateChangeEvents(slider);
}

// Removed unused "isRecursion = false" from declaration
function handleVolumeSlider(e) {
  const slider = e.target;
  const timerId = parseInt(slider.getAttribute("data-timer"));
  window.clearTimeout(availableTimers[timerId]); // restart check for touch end

  // pause the refresh loop while taking user input
  window.dispatchEvent(new Event("update_started"));

  // visual feedback
  setVolumeSliderState(slider, slider.value);

  if (!handleVolumeOngoing) {
    handleVolumeOngoing = true;
    const path = slider.getAttribute("data-path");
    const payload = path.replace(/<value>/, slider.value);
    updateStatus(payload, function () {
      handleVolumeOngoing = false;
    });
  } else {
    availableTimers[timerId] = setTimeout(function () {
      handleVolumeSlider(e, true);
    }, 200);
  }
}

// Export functions
export { setVolumeSliderState, handleVolumeSlider, handleVolumeOngoing };
