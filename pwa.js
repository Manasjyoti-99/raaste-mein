/* Installation, offline status and screen wake lock. Replay still works if these APIs are unavailable. */
(() => {
  "use strict";
  const status = document.getElementById("offline-status");
  const install = document.getElementById("install-app");
  const update = document.getElementById("update-app");
  const wakeStatus = document.getElementById("wake-status");
  let registration = null, installPrompt = null, offlineReady = !!navigator.serviceWorker?.controller;
  let wantsWakeLock = false, wakeLock = null, requestingWakeLock = false, activatingUpdate = false;

  function offlineMessage() {
    if (!window.isSecureContext) status.textContent = "Installation and offline mode need the HTTPS address.";
    else if (!("serviceWorker" in navigator)) status.textContent = "Offline installation is unavailable in this browser.";
    else if (offlineReady) status.textContent = navigator.onLine ? "Offline replay and menus ready · map tiles need internet." : "Offline mode · replay, menus and learning available.";
    else status.textContent = "Preparing offline replay and menus…";
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault(); installPrompt = event; install.hidden = false;
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; install.hidden = true; });
  install.addEventListener("click", async () => {
    if (!installPrompt) return;
    const prompt = installPrompt; installPrompt = null; install.hidden = true;
    try { await prompt.prompt(); await prompt.userChoice; } catch (error) { /* Chrome's menu remains available. */ }
  });

  update.addEventListener("click", async () => {
    if (!registration?.waiting) return;
    // Save current local history first; do not reload a moving replay.
    if (wantsWakeLock) { status.textContent = "Pause or finish the trip before updating."; return; }
    activatingUpdate = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  });

  async function releaseWakeLock() {
    const lock = wakeLock; wakeLock = null;
    if (lock) try { await lock.release(); } catch (error) { /* OS may already have released it. */ }
  }
  async function requestWakeLock() {
    if (!wantsWakeLock || document.hidden || wakeLock || requestingWakeLock) return;
    if (!window.isSecureContext || !navigator.wakeLock?.request) {
      wakeStatus.textContent = "Screen wake lock unavailable; use the phone's screen timeout setting."; return;
    }
    requestingWakeLock = true;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (!wantsWakeLock || document.hidden) { await lock.release(); return; }
      wakeLock = lock;
      wakeStatus.textContent = "Screen kept awake during this trip.";
      lock.addEventListener("release", () => {
        if (wakeLock && wakeLock !== lock) return;
        if (wakeLock === lock) wakeLock = null;
        wakeStatus.textContent = wantsWakeLock ? "Phone released the screen lock; screen timeout may apply." : "Screen lock released while paused.";
      });
    } catch (error) {
      wakeStatus.textContent = "Phone did not grant a screen lock; screen timeout may apply.";
    } finally { requestingWakeLock = false; }
  }
  function setTripActive(active) {
    wantsWakeLock = !!active;
    if (wantsWakeLock) requestWakeLock();
    else { releaseWakeLock(); wakeStatus.textContent = "Screen lock released while paused."; }
  }
  window.AppPwa = { setTripActive };
  document.addEventListener("visibilitychange", () => document.hidden ? releaseWakeLock() : requestWakeLock());
  window.addEventListener("pagehide", () => { wantsWakeLock = false; releaseWakeLock(); });
  for (const name of ["online", "offline"]) window.addEventListener(name, offlineMessage);

  offlineMessage();
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    offlineReady = true; offlineMessage();
    if (activatingUpdate) window.location.reload();
  });
  navigator.serviceWorker.register("service-worker.js", { scope: "./", updateViaCache: "none" }).then(value => {
    registration = value;
    const showUpdate = () => { if (registration.waiting) update.hidden = false; };
    showUpdate();
    const watchInstalling = () => {
      const worker = registration.installing;
      if (worker) worker.addEventListener("statechange", () => {
        if (worker.state === "installed") showUpdate();
        if (worker.state === "redundant" && !offlineReady) status.textContent = "Offline setup failed. Stay online and reload to retry.";
      });
    };
    watchInstalling();
    registration.addEventListener("updatefound", watchInstalling);
    return navigator.serviceWorker.ready;
  }).then(() => { offlineReady = true; offlineMessage(); }).catch(() => {
    if (offlineReady) offlineMessage();
    else status.textContent = "Offline setup failed. Stay online and reload to retry.";
  });
})();
