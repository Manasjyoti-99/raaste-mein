/* Transparent rules only. This file never makes network requests. */
(() => {
  "use strict";
  const CATEGORIES = ["tea", "coffee", "snacks", "meals"];
  const clamp = value => Math.max(0, Math.min(1, value));

  function clockMinutes(text, allow24 = false) {
    if (typeof text !== "string" || !/^\d{2}:\d{2}$/.test(text)) throw new Error(`Invalid time: ${text}`);
    const [hours, minutes] = text.split(":").map(Number);
    if (hours === 24 && minutes === 0 && allow24) return 1440;
    if (hours > 23 || minutes > 59) throw new Error(`Invalid time: ${text}`);
    return hours * 60 + minutes;
  }

  function inTimeWindow(minute, start, end) {
    const current = ((minute % 1440) + 1440) % 1440;
    if (start === 0 && end === 1440) return true;
    // Opening time is included; closing time is excluded.
    return end > start ? current >= start && current < end : current >= start || current < end;
  }

  function isOpenAt(cafe, minute) {
    return inTimeWindow(minute, clockMinutes(cafe.opens), clockMinutes(cafe.closes, true));
  }

  function validateCafes(data) {
    if (!Array.isArray(data.cafes)) throw new Error("cafes.json must contain a cafes list.");
    const ids = new Set();
    for (const cafe of data.cafes) {
      if (!cafe.id || ids.has(cafe.id)) throw new Error("Cafe ids must be present and unique.");
      ids.add(cafe.id);
      if (typeof cafe.name !== "string" || !cafe.name.trim() || typeof cafe.categoryLabel !== "string") throw new Error(`Cafe ${cafe.id} needs a name and category label.`);
      if (!CATEGORIES.includes(cafe.category)) throw new Error(`Unknown scoring category for ${cafe.name}.`);
      if (!Number.isFinite(cafe.lat) || !Number.isFinite(cafe.lon) || Math.abs(cafe.lat) > 90 || Math.abs(cafe.lon) > 180) throw new Error(`Invalid coordinates for ${cafe.name}.`);
      if (!Number.isFinite(cafe.rating) || cafe.rating < 1 || cafe.rating > 5) throw new Error(`Invalid rating for ${cafe.name}.`);
      if (clockMinutes(cafe.opens) === clockMinutes(cafe.closes, true)) throw new Error(`Use 00:00–24:00 for a 24-hour cafe: ${cafe.name}.`);
      if (!Array.isArray(cafe.menu) || cafe.menu.length === 0) throw new Error(`Missing menu for ${cafe.name}.`);
      for (const item of cafe.menu) {
        if (!item.name || !Number.isFinite(item.priceMin) || !Number.isFinite(item.priceMax) || item.priceMin < 0 || item.priceMax < item.priceMin) throw new Error(`Invalid menu price range for ${cafe.name}.`);
      }
    }
    return data.cafes;
  }

  function validateSettings(settings) {
    clockMinutes(settings.departureTime);
    const positive = ["maxDistanceFromRouteMetres", "maxDetourMinutes", "triggerDistanceMetres", "learningAcceptStep", "learningRejectStep", "alertTimeoutSeconds"];
    const nonnegative = ["tripSlackMinutes", "minimumDistanceBetweenSuggestionsMetres"];
    for (const key of positive) if (!Number.isFinite(settings[key]) || settings[key] <= 0) throw new Error(`Invalid setting: ${key}`);
    for (const key of nonnegative) if (!Number.isFinite(settings[key]) || settings[key] < 0) throw new Error(`Invalid setting: ${key}`);
    if (settings.tripSlackMinutes > 30) throw new Error("Spare time must be between 0 and 30 minutes.");
    if (!Number.isInteger(settings.learningTripsBeforePersonalization) || settings.learningTripsBeforePersonalization < 1) throw new Error("Choose a positive number of learning trips.");
    if (!Number.isFinite(settings.venuePreferenceWeight) || settings.venuePreferenceWeight < 0 || settings.venuePreferenceWeight > 1) throw new Error("Venue preference weight must be between 0 and 1.");
    if (settings.triggerDistanceMetres < 300 || settings.triggerDistanceMetres > 400) throw new Error("Suggestion distance must be between 300 and 400 metres.");
    if (!Number.isInteger(settings.maxSuggestionsPerTrip) || settings.maxSuggestionsPerTrip < 1 || settings.maxSuggestionsPerTrip > 2) throw new Error("Use one or two suggestions per trip.");
    for (const key of ["baselineAffinity", "scoreThreshold"]) if (!Number.isFinite(settings[key]) || settings[key] < 0 || settings[key] > 1) throw new Error(`Invalid setting: ${key}`);
    const weights = ["detour", "timeFit", "rating", "affinity"].map(key => settings.weights?.[key]);
    if (weights.some(value => !Number.isFinite(value) || value < 0) || Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-8) throw new Error("Score weights must be nonnegative and add up to 1.");
    if (!Array.isArray(settings.timeFits) || settings.timeFits.length === 0) throw new Error("Time-of-day scores are missing.");
    for (const band of settings.timeFits) {
      clockMinutes(band.start); clockMinutes(band.end, true);
      for (const category of CATEGORIES) if (!Number.isFinite(band[category]) || band[category] < 0 || band[category] > 1) throw new Error(`Invalid time score for ${category}.`);
    }
    return settings;
  }

  function measureCafe(cafe, route, distanceMetres) {
    // Project onto each line segment, not just the nearest KML vertex.
    // This local flat-plane calculation is appropriate for this 2 km demo.
    const radius = 6371000;
    const radians = Math.PI / 180;
    const longitudeScale = Math.cos(cafe.lat * radians);
    const xy = point => [(point[1] - cafe.lon) * radians * radius * longitudeScale, (point[0] - cafe.lat) * radians * radius];
    let best = null;
    for (let index = 0; index < route.points.length - 1; index++) {
      const a = xy(route.points[index]), b = xy(route.points[index + 1]);
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const squaredLength = dx * dx + dy * dy;
      const fraction = squaredLength ? clamp(-(a[0] * dx + a[1] * dy) / squaredLength) : 0;
      const x = a[0] + fraction * dx, y = a[1] + fraction * dy;
      const squaredDistance = x * x + y * y;
      if (!best || squaredDistance < best.squaredDistance) {
        const first = route.points[index], last = route.points[index + 1];
        const closestPoint = [first[0] + fraction * (last[0] - first[0]), first[1] + fraction * (last[1] - first[1])];
        best = {
          cafe, squaredDistance, closestPoint,
          fromRouteMetres: distanceMetres([cafe.lat, cafe.lon], closestPoint),
          alongRouteMetres: route.cumulative[index] + fraction * (route.cumulative[index + 1] - route.cumulative[index])
        };
      }
    }
    return best;
  }

  function tripClockMinutes(context, distance = context.progressMetres) {
    if (Number.isFinite(context.liveClockMinutes)) {
      const futureDelay = (context.acceptedStops || []).filter(stop => stop.alongRouteMetres > context.progressMetres && stop.alongRouteMetres <= distance).reduce((total, stop) => total + stop.extraMinutes, 0);
      return context.liveClockMinutes + Math.max(0, distance - context.progressMetres) / (context.speedKmh / 3.6) / 60 + futureDelay;
    }
    const priorDelay = (context.acceptedStops || []).filter(stop => stop.alongRouteMetres <= distance).reduce((total, stop) => total + stop.extraMinutes, 0);
    return context.departureMinutes + distance / (context.speedKmh / 3.6) / 60 + priorDelay;
  }

  function scoreCafe(measured, context, settings, affinities = {}) {
    const cafe = measured.cafe;
    const extraMinutes = measured.fromRouteMetres * 2 / (context.speedKmh / 3.6) / 60;
    const currentMinute = tripClockMinutes(context);
    const arrivalMinute = tripClockMinutes(context, measured.alongRouteMetres) + extraMinutes / 2;
    const timeBand = settings.timeFits.find(band => inTimeWindow(arrivalMinute, clockMinutes(band.start), clockMinutes(band.end, true)));
    const categoryAffinity = clamp(affinities.categories?.[cafe.category] ?? affinities[cafe.category] ?? settings.baselineAffinity);
    const venueAffinity = clamp(affinities.venues?.[cafe.id] ?? settings.baselineAffinity);
    const parts = {
      detour: clamp(1 - extraMinutes / settings.maxDetourMinutes),
      timeFit: timeBand?.[cafe.category] ?? 0.5,
      rating: cafe.rating / 5,
      affinity: settings.venuePreferenceWeight * venueAffinity + (1 - settings.venuePreferenceWeight) * categoryAffinity
    };
    const score = Object.keys(parts).reduce((total, key) => total + parts[key] * settings.weights[key], 0);
    const usedSlack = (context.acceptedStops || []).reduce((total, stop) => total + stop.extraMinutes, 0);
    const remainingSlack = Math.max(0, context.slackMinutes - usedSlack);
    const openNow = isOpenAt(cafe, currentMinute);
    const openAtArrival = isOpenAt(cafe, arrivalMinute);
    let availabilityReason = "";
    if (context.mode === "gps" && !context.gpsReady) availabilityReason = "Waiting for a reliable route position";
    else if (measured.alongRouteMetres <= context.progressMetres) availabilityReason = "Behind your current position";
    else if (measured.fromRouteMetres > settings.maxDistanceFromRouteMetres) availabilityReason = "Too far from the route";
    else if (!openNow) availabilityReason = "Closed at the trip clock time";
    else if (!openAtArrival) availabilityReason = "Closes before expected arrival";
    else if (extraMinutes > settings.maxDetourMinutes) availabilityReason = "Detour exceeds the limit";
    else if (extraMinutes > remainingSlack + 1e-9) availabilityReason = "Detour exceeds spare time";
    let excludedReason = availabilityReason;
    if (!excludedReason && context.excludedIds?.has(cafe.id)) excludedReason = "Already shown this trip";
    if (!excludedReason && score < settings.scoreThreshold) excludedReason = "Below the suggestion threshold";
    return { ...measured, score, parts, venueAffinity, categoryAffinity, extraMinutes, remainingSlack, currentMinute, arrivalMinute, openNow, openAtArrival, timeBand: timeBand?.label || "this time of day", available: !availabilityReason, availabilityReason, eligible: !excludedReason, excludedReason };
  }

  function findSuggestionBetween(measuredCafes, context, nextDistance, settings, affinities = {}) {
    // Alerts work on the very first trip. History changes the score, not access to alerts.
    if (context.popupCount >= settings.maxSuggestionsPerTrip) return null;
    const epsilon = 1e-7;
    const earliestAllowed = Math.max(context.progressMetres, (context.lastPopupMetres ?? -Infinity) + settings.minimumDistanceBetweenSuggestionsMetres);
    const scheduled = measuredCafes.map(measured => {
      const triggerMetres = measured.alongRouteMetres - settings.triggerDistanceMetres;
      const score = scoreCafe(measured, context, settings, affinities);
      return { ...score, triggerMetres };
    }).filter(candidate => candidate.eligible && candidate.triggerMetres >= -epsilon && candidate.triggerMetres + epsilon >= earliestAllowed);

    // Offer the highest-scoring upcoming choice, using neutral preferences until feedback exists.
    // Low scores do not hide venues from the user's complete options list.
    scheduled.sort((a, b) => b.score - a.score || a.alongRouteMetres - b.alongRouteMetres || a.cafe.id.localeCompare(b.cafe.id));
    const best = scheduled[0];
    if (!best || best.triggerMetres > nextDistance + epsilon) return null;
    const atAlert = scoreCafe(best, { ...context, progressMetres: best.triggerMetres }, settings, affinities);
    return atAlert.eligible ? { ...atAlert, triggerMetres: best.triggerMetres } : null;
  }

  function findLiveSuggestion(measuredCafes, context, settings, affinities = {}) {
    if (!context.gpsReady || context.popupCount >= settings.maxSuggestionsPerTrip ||
        (context.lastPopupMetres !== null && context.lastPopupMetres !== undefined && context.progressMetres - context.lastPopupMetres < settings.minimumDistanceBetweenSuggestionsMetres)) return null;
    const minAhead = settings.triggerDistanceMetres - 50, maxAhead = settings.triggerDistanceMetres + 50;
    const upcoming = measuredCafes.map(measured => scoreCafe(measured, context, settings, affinities))
      .filter(candidate => candidate.eligible && candidate.alongRouteMetres - context.progressMetres >= minAhead);
    upcoming.sort((a, b) => b.score - a.score || a.alongRouteMetres - b.alongRouteMetres || a.cafe.id.localeCompare(b.cafe.id));
    const best = upcoming[0];
    // Keep the real marker at its GPS position. Never rewind it to a simulated trigger.
    return best && best.alongRouteMetres - context.progressMetres <= maxAhead ? best : null;
  }

  const api = { clockMinutes, isOpenAt, validateCafes, validateSettings, measureCafe, tripClockMinutes, scoreCafe, findSuggestionBetween, findLiveSuggestion };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.SuggestionEngine = api;
})();
