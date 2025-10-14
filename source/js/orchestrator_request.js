/* eslint-disable prettier/prettier */
import { globals } from "./globals.js";

const TIMEOUT_WAIT = 5000;
const MAX_RETRIES = 2;
let retries = MAX_RETRIES;

const updateStack = [];

async function healthcheckHost(hostname) {
  const orchestrator = await fetch(`${hostname}/config`)
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      return json.orchestrator;
    })
    .catch((err) => {
      console.log(`Error connecting to ${hostname}`, err);
      return false
    });

  // check that this server's home orchestrator is available
  if (orchestrator) {
    return fetch(`${orchestrator}/api/version`)
      .then((response) => {
        return response.ok
      })
      .catch((err) => {
        console.log(`Error connecting to ${orchestrator}`, err);
        return false
      })
  }
  return false;
}

// Fisher–Yates shuffle with string seed (AI generated)
function shuffleArrayWithSeed(array, seedStr) {
  // Simple string → 32-bit integer hash (djb2)
  function stringToSeed(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return h >>> 0; // force unsigned 32-bit
  }

  // Mulberry32 PRNG
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let seed = stringToSeed(seedStr);
  let rng = mulberry32(seed);
  let a = array.slice(); // copy to avoid mutating
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function failover() {
  const backupHosts = globals.getState()?.backup_orchestrators;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  if (backupHosts && backupHosts.length > 0) {
    // Shuffle the backup_orchestrators list deterministically, using the system as a seed
    console.log("backupHosts", backupHosts);
    const shuffledBackups = shuffleArrayWithSeed(backupHosts, globals.getSystem());
    console.log("shuffledBackups", shuffledBackups);

    // Every 1000ms, send a GET /version request to the next potential backup orchestrator API (port 81)
    // to see if it is available to serve this client
    for (const host of shuffledBackups) {
      if (await healthcheckHost(host)) {
        // good to go, don't have to worry about breaking and closing other connections etc
        // because we're about to reload at a different URL
        let newLocation = `${host}${window.location.search}`;

        // Add failback_host if this is not already failed over from another system
        if (!window.location.search.includes("failback_host=")) {
          newLocation += newLocation.includes("?") ? `&failback_host=${location.origin}` : `?failback_host=${location.origin}`;
        }
        console.log("Failing over to ", newLocation);
        location.replace(newLocation);
      }

      await delay(1000);
    }
  } else {
    console.log("No backup_orchestrators configured");
    // TO DO: display failure message to user?
  }
}


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
      // return globals.getState() ? failover() : response; // DEV ONLY testing failover!!!
    })
    .catch((err) => {
      console.log(err);
      return retry();
    });
}

// Update stack handling
const dequeue = () => {
  if (!updateStack[0]) {
    window.dispatchEvent(new Event("update_complete"));
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
  const orchestrator = globals.getOrchestrator();
  const system = globals.getSystem();
  if (!orchestrator || !system) {
    return null;
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
  const url = `${orchestrator}/api/systems/${system}/state`;
  enqueue(() => orchestratorRequest(url, options), callback);
}

export { updateStatus, orchestratorRequest, healthcheckHost };
