import { globals } from './globals.js';

const TIMEOUT_WAIT = 5000 ;
const MAX_RETRIES = 2;
let retries = MAX_RETRIES;

let updateStatusOngoing = false;
let updateStack = [];


function failover() {
  console.log("failover placeholder") ;

  // updateStatusOngoing = false;
  // emit update_complete 

  // set a new orchestrator ...

  // retries = 0;

  return false
}

function failback() {
  console.log("failback placeholder");
}


// wrapper function to handle retry and failover
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


// Update systems/{system}/state
function updateStatus(payload, callback=null) {
  // make sure global orchestrator and system variables are set
  if ( !globals.orchestrator || !globals.system ) {
    return null // TO DO: improve handling for this scenario
  }

  // Check for an update request that hasn't completed yet
  if ( updateStatusOngoing ) {
    console.log('placeholder for updateStatus queuing ...') ;
    return false
  }

  // OK to proceed
  updateStatusOngoing = true ;
  window.dispatchEvent( new Event('update_started') );

  const options = {
    method: 'PUT',
    body: payload
  }
  const url = `${globals.orchestrator}/api/systems/${globals.system}/state` ;
  return orchestratorRequest(url, options)
    .then(response => {
      updateStatusOngoing = false ;

      if ( response.ok ) {
        return response.json()
      }

      throw new Error(`${response.status} response from updateStatus`)      
    }) 
    .then(json => {
      // dispatch completion event and pass response for listener in main.js
      window.dispatchEvent( new CustomEvent('update_complete', { detail: json }) );

      if ( callback ) {
        return callback(json)
      }
      return json
    })
    .catch(err => {
      console.log(err);
      window.dispatchEvent( new Event('update_complete') );
    })
}


export { 
  updateStatus,
  orchestratorRequest
}