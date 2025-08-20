/***
 *
 *
 * Maintenance (Tech Info) Modal
 *
 *
 */
let clickCounter = 0;
let maintenanceClickTimeoutId; // time between clicks
let maintenanceModalTimeoutId; // modal auto-close

function resetMaintenanceModalTimeout() {
  clearTimeout(maintenanceModalTimeoutId);

  // close the maintenance modal after 5 minutes
  maintenanceModalTimeoutId = setTimeout(() => {
    document.getElementById("maintenance").classList.add("hidden");
  }, 300000);
}

function handleMaintenanceClick() {
  // being extra paranoid, capping this number
  if (clickCounter < 4) {
    clickCounter++;
  }

  if (clickCounter === 3) {
    document.getElementById("maintenance").classList.remove("hidden");
    resetMaintenanceModalTimeout();
  }

  // clear clickCounter after 1 second idle
  clearTimeout(maintenanceClickTimeoutId);
  maintenanceClickTimeoutId = setTimeout(() => {
    clickCounter = 0;
  }, 1000);
}

export { handleMaintenanceClick, resetMaintenanceModalTimeout };
