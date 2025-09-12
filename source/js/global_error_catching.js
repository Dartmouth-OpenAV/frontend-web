/***
 *
 *
 * Error catching
 *
 *
 */
import { globals } from "./globals.js";
import { orchestratorRequest } from "./orchestrator_request.js";

// Global JS runtime error catching
window.onerror = function (message, source, lineno, colno) {
  console.error(
    `Javascript runtime error: ${message} \nFrom ${source}, line ${lineno} col ${colno}`,
  );
  // throw error to Slack
  throwClientError(
    `Javascript runtime error: ${message} \nFrom ${source}, line ${lineno} col ${colno}\nLast get_status: ${
      globals.getState() ? JSON.stringify(globals.getState()) : ""
    }`,
    "84hfn3jd7h4n",
    1,
  );
  return true;
};

async function throwClientError(message, code, severity) {
  // Send the update to the orchestrator
  const orchestrator = globals.getOrchestrator();
  const response = await orchestratorRequest(
    `${orchestrator}/api/errors/client`,
    {
      method: "POST",
      body: JSON.stringify({
        message: message,
        code: code,
        severity: severity,
      }),
    },
  ).catch((error) => {
    console.error("Error in function throwClientError: ", error);
  });
  return response;
}

export { throwClientError };
