// CAMERA TOGGLE — single source of truth for monitorUp.
// setMonitor() is the ONLY function allowed to mutate state.monitorUp. Enter and exit
// are symmetric and idempotent: raising when up or lowering when down are no-ops, so the
// UI can never get stuck "up" or double-open. If the exit path ever regresses, these
// tests fail. Do not bypass this function from render/input code.
export function setMonitor(state, up) {
  if (up) {
    if (state.monitorUp) return false;       // already up — no re-init
    if (state.pendingScare) return false;     // a scare locks the monitor down
    state.monitorUp = true;
    return true;
  } else {
    if (!state.monitorUp) return false;       // already down
    state.monitorUp = false;
    return true;
  }
}

// Returns true only when the active camera actually changed (so callers can fire the
// static blip exactly once per real switch).
export function switchCam(state, camId) {
  if (!state.monitorUp) return false;
  if (state.activeCam === camId) return false;
  state.activeCam = camId;
  return true;
}
