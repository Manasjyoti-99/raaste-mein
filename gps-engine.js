/* Validate phone fixes before they can move the marker, trigger alerts or record a trip. */
(() => {
  "use strict";
  function validateSettings(value) {
    const positive = ["maxAccuracyMetres", "maxDistanceFromRouteMetres", "maxAgeSeconds", "futureToleranceSeconds",
      "maximumSpeedMps", "jumpAllowanceMetres", "startRadiusMetres", "arrivalRadiusMetres", "arrivalAlongToleranceMetres",
      "arrivalMinIntervalSeconds", "maxHistoryGapSeconds", "maxHistoryStepMetres", "movingMinimumMps", "positionTimeoutMs"];
    if (!value || positive.some(key => !Number.isFinite(value[key]) || value[key] <= 0) ||
        !Number.isInteger(value.arrivalFixes) || value.arrivalFixes < 2 ||
        !Number.isFinite(value.minimumHistoryCoverage) || value.minimumHistoryCoverage <= 0 || value.minimumHistoryCoverage > 1) throw new Error("Invalid GPS settings.");
    return value;
  }

  function create(route, settings, distanceMetres, project) {
    validateSettings(settings);
    const state = { ready: false, last: null, speedAnchor: null, progressMetres: 0, speedMps: null,
      completed: false, startedNearOrigin: false, historyInterrupted: false, interruptionReason: "",
      coverageMetres: 0, arrivalCount: 0, arrivalAt: null, lastArrivalAt: null, fixes: 0 };
    function interrupt(reason) {
      state.historyInterrupted = true;
      if (!state.interruptionReason) state.interruptionReason = reason;
    }
    function unavailable(reason, invalidatesHistory = false) {
      state.ready = false; state.arrivalCount = 0; state.arrivalAt = null; state.lastArrivalAt = null;
      if (invalidatesHistory && state.last) interrupt(reason);
      return { accepted: false, reason };
    }
    function isFresh(now) {
      return !!state.last && state.ready && now - state.last.timestamp <= settings.maxAgeSeconds * 1000;
    }
    function feed(position, now) {
      if (state.completed) return { accepted: false, ignored: true, reason: "This GPS trip has finished." };
      const c = position?.coords, timestamp = position?.timestamp;
      if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude) ||
          Math.abs(c.latitude) > 90 || Math.abs(c.longitude) > 180 || !Number.isFinite(timestamp) ||
          !Number.isFinite(c.accuracy) || c.accuracy < 0 || !Number.isFinite(now)) return unavailable("Waiting for a valid GPS reading.");
      if (timestamp > now + settings.futureToleranceSeconds * 1000 || now - timestamp > settings.maxAgeSeconds * 1000) return unavailable("GPS reading is stale. Waiting for a fresh location.");
      if (c.accuracy > settings.maxAccuracyMetres) return unavailable(`GPS accuracy ±${Math.round(c.accuracy)} m; waiting for ${settings.maxAccuracyMetres} m or better.`);
      if (state.last && timestamp <= state.last.timestamp) return { accepted: false, ignored: true, reason: "Duplicate or out-of-order GPS update ignored." };
      const point = [c.latitude, c.longitude];
      const snapped = project({ lat: c.latitude, lon: c.longitude }, route, distanceMetres);
      if (snapped.fromRouteMetres > settings.maxDistanceFromRouteMetres) return unavailable(`Off route by ${Math.round(snapped.fromRouteMetres)} m. Alerts are suspended.`, true);
      const previous = state.last;
      if (previous) {
        const seconds = (timestamp - previous.timestamp) / 1000;
        const allowance = seconds * settings.maximumSpeedMps + settings.jumpAllowanceMetres;
        if (distanceMetres(previous.point, point) > allowance || Math.abs(snapped.alongRouteMetres - state.progressMetres) > allowance) return unavailable("GPS position jumped too far. Waiting for a consistent reading.");
        const advance = Math.max(0, snapped.alongRouteMetres - state.progressMetres);
        if (seconds > settings.maxHistoryGapSeconds || advance > settings.maxHistoryStepMetres) interrupt("GPS coverage was interrupted.");
        else state.coverageMetres += Math.min(advance, settings.maxHistoryStepMetres);
      } else {
        state.startedNearOrigin = snapped.alongRouteMetres <= settings.startRadiusMetres && distanceMetres(point, route.points[0]) <= settings.startRadiusMetres;
        state.speedAnchor = { point, timestamp };
      }
      let speed = Number.isFinite(c.speed) && c.speed >= 0 && c.speed <= settings.maximumSpeedMps ? c.speed : null;
      const anchor = state.speedAnchor;
      if (speed === null && anchor && timestamp > anchor.timestamp) {
        const seconds = (timestamp - anchor.timestamp) / 1000;
        const travelled = distanceMetres(anchor.point, point);
        const noise = Math.max(5, c.accuracy * 0.5);
        if (seconds >= 2 && travelled >= noise) { speed = Math.min(settings.maximumSpeedMps, travelled / seconds); state.speedAnchor = { point, timestamp }; }
        else if (seconds >= settings.maxAgeSeconds) { speed = 0; state.speedAnchor = { point, timestamp }; }
      } else if (speed !== null) state.speedAnchor = { point, timestamp };
      if (speed !== null && speed >= settings.movingMinimumMps) state.speedMps = state.speedMps >= settings.movingMinimumMps ? 0.6 * state.speedMps + 0.4 * speed : speed;
      else state.speedMps = speed;
      state.progressMetres = snapped.alongRouteMetres;
      state.last = { point, snappedPoint: snapped.closestPoint, timestamp, accuracy: c.accuracy, fromRouteMetres: snapped.fromRouteMetres };
      state.ready = true; state.fixes++;
      const nearEnd = route.totalMetres - state.progressMetres <= settings.arrivalAlongToleranceMetres &&
        distanceMetres(point, route.points[route.points.length - 1]) <= settings.arrivalRadiusMetres;
      if (nearEnd) {
        if (state.arrivalAt === null) state.arrivalAt = timestamp;
        if (state.lastArrivalAt === null || timestamp - state.lastArrivalAt >= settings.arrivalMinIntervalSeconds * 1000) {
          state.arrivalCount++; state.lastArrivalAt = timestamp;
        }
      } else { state.arrivalCount = 0; state.arrivalAt = null; state.lastArrivalAt = null; }
      state.completed = state.arrivalCount >= settings.arrivalFixes;
      const recordable = state.completed && state.startedNearOrigin && !state.historyInterrupted && state.coverageMetres >= route.totalMetres * settings.minimumHistoryCoverage;
      return { accepted: true, progressMetres: state.completed ? route.totalMetres : state.progressMetres,
        snappedPoint: snapped.closestPoint, speedMps: state.speedMps, accuracy: c.accuracy,
        fromRouteMetres: snapped.fromRouteMetres, completed: state.completed, recordable };
    }
    return { state, feed, isFresh, interrupt, unavailable };
  }
  const api = { validateSettings, create };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.GpsEngine = api;
})();
