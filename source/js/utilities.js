/***
 *
 *
 * Utilities
 *
 *
 */
// import { updateStatus } from "./main.js";
import { updateStatus } from "./orchestrator_request.js";

let countdownTimeoutId;

function mergeJSON(obj1, obj2) {
  let attributes = Object.keys(obj2);

  for (let i = 0; i < attributes.length; i++) {
    if (!Object.hasOwn(obj1, attributes[i])) {
      obj1[attributes[i]] = obj2[attributes[i]];
    } else {
      if (typeof obj1[attributes[i]] === "object") {
        obj1[attributes[i]] = mergeJSON(
          obj1[attributes[i]],
          obj2[attributes[i]],
        );
      }
    }
  }
  return obj1;
}

// crawl the orchestrator state data to find the end value of a control path
// ie. path, response
function followPath(path, obj) {
  const pathKey = Object.keys(path)[0];

  if (Object.hasOwn(obj, pathKey)) {
    // then look for the next path key in response ...
    if (typeof path[pathKey] === "object") {
      return followPath(path[pathKey], obj[pathKey]);
    } else {
      return { value: obj[pathKey], parentObject: obj };
    }
  } else {
    console.log(`obj does not match the path: ${path}`);
    return false;
  }
}

function countdown(counterDiv) {
  // get the current number
  var curr = parseInt(counterDiv.innerHTML);

  // reset it to current -1
  counterDiv.innerHTML = curr - 1;

  countdownTimeoutId = setTimeout(function () {
    if (curr > 1) {
      countdown(counterDiv, countdownTimeoutId);
    } else {
      clearTimeout(countdownTimeoutId);
    }
  }, 1000);
}

// useProgressBar gets called in both handleTogglePower and handleDisplaySourceSelect
// progress -- reference to the DOM element to affect;
// powerState -- boolean (true if powering up);
// duration -- int, representing *seconds*;
function useProgressBar(
  progress,
  duration,
  progressClass = "warming",
  callback,
) {
  progress.classList.add(progressClass);
  progress.setAttribute("style", `--duration:${duration}s;`);
  progress.classList.remove("hidden");

  setTimeout(function () {
    // hide this progress bar
    progress.classList.add("hidden");
    progress.classList.remove("warming");
    progress.classList.remove("cooling");

    callback(); // reattach event listeners
  }, duration * 1000);
}

function appendUIInteractionJSON(baseJSON) {
  let obj = JSON.parse(baseJSON);
  obj["environment_sensing"] = {
    ui_interactions: { occupancy_detected: true },
  };
  return JSON.stringify(obj);
}

function sendUIInteractionUpdate() {
  const payload = JSON.stringify({
    environment_sensing: { ui_interactions: { occupancy_detected: true } },
  });
  updateStatus(payload, null);
}

// Export functions
export {
  mergeJSON,
  followPath,
  countdown,
  countdownTimeoutId,
  useProgressBar,
  appendUIInteractionJSON,
  sendUIInteractionUpdate,
};
