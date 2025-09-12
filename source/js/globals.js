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
    if (!arg) {
      throw new Error(`Argument is undefined`);
    }
    return arg;
  };
  return {
    getState: () => structuredClone(_state),
    getOrchestrator: () => _orchestrator,
    getHomeOrchestrator: () => _homeOrchestrator,
    getSystem: () => _system,
    getUIReady: () => _uiReady,
    setState: (state) => {
      isArgUndefined(state);
      _state = structuredClone(state);
    },
    setOrchestrator: (orchestrator) => {
      isArgUndefined(orchestrator);
      _orchestrator = structuredClone(orchestrator);
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

export { globals };
