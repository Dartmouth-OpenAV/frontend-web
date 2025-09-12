/* eslint-disable prettier/prettier */
import { globals } from "./globals.js";

const TIMEOUT_WAIT = 5000;
const MAX_RETRIES = 2;
let retries = MAX_RETRIES;

const updateStack = [];

function failover() {
  console.log("failover placeholder");

  // emit update_complete

  // set a new orchestrator ...

  // retries = 0;

  return false;
}

/*(function failback() {
  console.log("failback placeholder");
}*/

// Wrapper function to handle retry and failover
// On success, return full response; on failure, return failover (which returns False for now)
async function orchestratorRequest(url, options) {
  function retry() {
    if (retries > 0) {
      retries--;
      return orchestratorRequest(url, options);
    }

    return failover();
  }

  return fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_WAIT) })
    .then((response) => {
      if (response.status >= 500) {
        return retry();
      }
      retries = MAX_RETRIES; // make sure retries gets reset after success
      return response;
    })
    .catch((err) => {
      console.log(err);
      return retry();
    });
}

// Update stack handling
const dequeue = () => {
  if (!updateStack[0]) {
    window.dispatchEvent( new Event("update_complete") );
    return;
  }
  // if anything is still on the stack, continue dequeue
  updateStack[0].func()
    .then((response) => response.json())
    .then((json) => {
      if (updateStack[0].callback) {
        updateStack[0].callback(json)
      }
    })
    .catch((err) => {
      console.error("Error from dequeue:", err);
      if (updateStack[0].callback) {
        updateStack[0].callback()
      }
    })
    .then(() => updateStack.shift())
    .then(dequeue);
};

const enqueue = (func, callback) => {
  updateStack.push({ func, callback });
  if (updateStack.length === 1) dequeue();
};

// Wrapper function for PUTs to systems/{system}/state, to handle queueing and
// pausing/resuming the main refreshStatus loop
function updateStatus(payload, callback = null) {
  // make sure global orchestrator and system variables are set
  if (!globals.getOrchestrator() || !globals.getSystem()) {
    return null; // TO DO: improve handling for this scenario
  }
  // OK to proceed
  // Add UI interaction if environment_sensing is present
  if (globals.getState()?.environment_sensing) {
    let obj = JSON.parse(payload);
    obj["environment_sensing"] = {
      ui_interactions: { occupancy_detected: true },
    };
    payload = JSON.stringify(obj);
  }

  // Tell main refreshStatus loop to pause while system state updates
  window.dispatchEvent(new Event("update_started"));

  // Add this updateStatus request to the queue
  const options = {
    method: "PUT",
    body: payload,
  };
  const url = `${globals.getOrchestrator()}/api/systems/${globals.getSystem()}/state`;
  enqueue(() => orchestratorRequest(url, options), callback);
}

export { updateStatus, orchestratorRequest };
