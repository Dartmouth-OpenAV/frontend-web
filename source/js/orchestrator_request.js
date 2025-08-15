import { globals } from './globals.js';

const TIMEOUT_WAIT = 5000 ;
const MAX_RETRIES = 2;
let retries = MAX_RETRIES;

const updateStack = []

function failover() {
  console.log("failover placeholder") ;

  // emit update_complete 

  // set a new orchestrator ...

  // retries = 0;

  return false
}

function failback() {
  console.log("failback placeholder");
}


// Wrapper function to handle retry and failover
// On success, return full response; on failure, return failover (which returns False for now)
async function orchestratorRequest(url, options) {
  function retry() {
    if ( retries > 0 ) {
      retries--;
      return orchestratorRequest(url, options)
    }

    return failover()
  }

  return fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_WAIT) })
    .then(response => {
      if ( response.status >= 500 ) {
        return retry()
      }
      retries = MAX_RETRIES ; // make sure retries gets reset after success
      return response
    })
    .catch(err => {
      console.log(err); 
      return retry()
    })
}


// Async function queuing class borrowed from https://www.ccdatalab.org/blog/queueing-javascript-promises
const Queue = (onResolve, onReject) => {
  const dequeue = () => {
    // no work to do
    if (!updateStack[0]) return

    // work to do!
    updateStack[0]()
      .then(onResolve)
      .catch(onReject)
      .then(() => updateStack.shift())
      .then(dequeue)
  }

  const enqueue = (func) => {
	  updateStack.push(func)
	  if (updateStack.length === 1) dequeue()
  }

  return enqueue
}


// Wrapper function for PUTs to systems/{system}/state, to handle queueing and 
// pausing/resuming the main refreshStatus loop
function updateStatus(payload, callback=null) {
  // make sure global orchestrator and system variables are set
  if ( !globals.orchestrator || !globals.system ) {
    return null // TO DO: improve handling for this scenario
  }
  // OK to proceed

  // Tell main refreshStatus loop to pause while system state updates
  window.dispatchEvent( new Event('update_started') );

  // Create an instance of Queue.enqueue with success and error handlers for updateStatus;
  // (Note: declaring this in this scope so that callback is accessible)
  const enqueueUpdate = Queue(
    async (response) => {
      if ( response.ok ) {
        const json = await response.json() ;

        // Check for additional custom callback from caller
        if ( callback ) {
          callback(json)
        }

        // Allow refreshState loop to resume
        // window.dispatchEvent( new CustomEvent('update_complete', { detail: json }) ); // NOTE: deprecating this implementation because it caused unforseen UX malfunction (esp. volume)
        window.dispatchEvent( new Event('update_complete') );

        return json
      }
      
      // On error from update, log and allow refreshState loop to resume
      console.error(`${response.status} response from updateStatus`) ;
      window.dispatchEvent( new Event('update_complete') );
    },
    (err) => {
      console.error(err);

      // Allow refreshState loop to resume
      window.dispatchEvent( new Event('update_complete') );
    }
  );

  // Add this updateStatus request to the queue
  const options = {
    method: 'PUT',
    body: payload
  }
  const url = `${globals.orchestrator}/api/systems/${globals.system}/state` ;

  enqueueUpdate(() => orchestratorRequest(url, options))
}


export { 
  updateStatus,
  orchestratorRequest
}