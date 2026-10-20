/* Reachable outside the old worker's cached navigation paths. History stays untouched. */
(() => {
  "use strict";
  const VERSION = "5.1.0";
  const button = document.getElementById("reconnect-app");
  const status = document.getElementById("recovery-status");
  const base = new URL("./", window.location.href);
  let generation = 0, cleanup = () => {};

  function readBuild(worker) {
    if (!worker) return Promise.resolve(null);
    return new Promise(resolve => {
      const channel = new MessageChannel();
      let finished = false;
      const finish = value => {
        if (finished) return;
        finished = true; clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value);
      };
      const timer = setTimeout(() => finish(null), 1200);
      channel.port1.onmessage = event => finish(event.data?.version || null);
      try { worker.postMessage({ type: "GET_BUILD" }, [channel.port2]); }
      catch (error) { finish(null); }
    });
  }

  async function reconnect() {
    cleanup();
    const token = ++generation;
    let running = true;
    const removers = [], watched = new Set();
    const current = () => running && token === generation;
    const stop = () => { running = false; clearTimeout(deadline); removers.forEach(remove => remove()); };
    const fail = message => {
      if (!current()) return;
      stop(); button.disabled = false; button.textContent = "Try reconnecting again"; status.textContent = message;
    };
    const deadline = setTimeout(() => fail("The app could not reconnect yet. Stay online and try again. Your saved choices and trips have not been cleared."), 20000);
    cleanup = stop;
    const listen = (target, type, handler) => {
      target.addEventListener(type, handler);
      removers.push(() => target.removeEventListener(type, handler));
    };
    button.disabled = true; status.textContent = "Reconnecting… Your saved choices and trips will stay on this phone.";
    if (!window.isSecureContext || !navigator.serviceWorker) {
      fail("Open this HTTPS address directly in Chrome, then try again."); return;
    }
    async function openIfReady(worker) {
      const version = await readBuild(worker);
      if (!current() || version !== VERSION) return;
      stop(); status.textContent = "App reconnected. Opening your trip…";
      window.location.replace(new URL("?v=" + VERSION, base).href);
    }
    try {
      const registration = await navigator.serviceWorker.register(new URL("service-worker.js", base).href, { scope: base.href, updateViaCache: "none" });
      if (!current()) return;
      async function activateWaiting() {
        const worker = registration.waiting;
        if (!worker || await readBuild(worker) !== VERSION || !current()) return;
        status.textContent = "App update ready. Reopening your trip…";
        worker.postMessage({ type: "ACTIVATE_UPDATE" });
      }
      function watchInstalling() {
        const worker = registration.installing;
        if (!worker || watched.has(worker)) return;
        watched.add(worker);
        listen(worker, "statechange", () => {
          if (!current()) return;
          if (worker.state === "installed") activateWaiting();
          if (worker.state === "activated") openIfReady(worker);
          if (worker.state === "redundant") fail("The update did not finish. Check your connection and try again. Your history is still saved.");
        });
      }
      listen(navigator.serviceWorker, "controllerchange", () => openIfReady(navigator.serviceWorker.controller));
      listen(registration, "updatefound", watchInstalling);
      watchInstalling();
      await activateWaiting();
      if (!current()) return;
      await openIfReady(registration.active);
      if (!current()) return;
      if (registration.active) await registration.update();
      if (!current()) return;
      watchInstalling();
      await activateWaiting();
      if (current()) await openIfReady(registration.active);
    } catch (error) {
      fail("Could not reconnect. Keep mobile data on and try again in Chrome. Your saved history has not been cleared.");
    }
  }
  button.addEventListener("click", reconnect);
})();
