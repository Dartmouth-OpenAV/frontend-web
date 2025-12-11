/***
 *
 *
 * globals
 *
 *
 */
const globals = (() => {
  let _state = null;
  let _orchestrator = null;
  let _homeOrchestrator = null;
  let _system = null;
  let _uiReady = false;
  const isArgUndefined = (arg) => {
    if (!arg && arg !== false) {
      throw new Error(`Argument is undefined`);
    }
    return arg;
  };
  return {
    getState: () => deepClone(_state),
    getOrchestrator: () => _orchestrator,
    getHomeOrchestrator: () => _homeOrchestrator,
    getSystem: () => _system,
    getUIReady: () => _uiReady,
    setState: (state) => {
      isArgUndefined(state);
      _state = deepClone(state);
    },
    setOrchestrator: (orchestrator) => {
      isArgUndefined(orchestrator);
      _orchestrator = orchestrator;
    },
    setHomeOrchestrator: (homeOrchestrator) => {
      isArgUndefined(homeOrchestrator);
      _homeOrchestrator = homeOrchestrator;
    },
    setSystem: (system) => {
      isArgUndefined(system);
      _system = system;
    },
    setUIReady: (uiReady) => {
      isArgUndefined(uiReady);
      _uiReady = uiReady;
    },
  };
})();

//custom structuredClone replacement to be compatible with old Chrome versions
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

export { globals };
