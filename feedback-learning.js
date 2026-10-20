/* Small, inspectable learning rules. Only explicit Accept/Reject choices count. */
(() => {
  "use strict";
  const CATEGORIES = ["tea", "coffee", "snacks", "meals"];
  const clamp = value => Math.max(0, Math.min(1, value));

  function emptyProfile() {
    return { version: 1, nextTripNumber: 1, trips: [] };
  }

  function normaliseProfile(value, cafes) {
    if (!value || value.version !== 1 || !Array.isArray(value.trips)) return emptyProfile();
    const known = new Map(cafes.map(cafe => [cafe.id, cafe]));
    const profile = emptyProfile();
    const ids = new Set();
    for (const oldTrip of value.trips) {
      if (!oldTrip || typeof oldTrip.id !== "string" || ids.has(oldTrip.id) || !Array.isArray(oldTrip.events)) continue;
      ids.add(oldTrip.id);
      const events = new Map();
      for (const event of oldTrip.events) {
        const cafe = known.get(event?.cafeId);
        if (!cafe || !["accept", "reject"].includes(event.choice)) continue;
        // Keep one final choice for each venue in each trip.
        events.set(cafe.id, { cafeId: cafe.id, category: cafe.category, choice: event.choice, timeBand: String(event.timeBand || "") });
      }
      profile.trips.push({ id: oldTrip.id, departureMinutes: Number(oldTrip.departureMinutes) || 0, events: [...events.values()] });
    }
    const highest = profile.trips.reduce((max, trip) => Math.max(max, Number(trip.id.replace(/^trip-/, "")) || 0), 0);
    profile.nextTripNumber = Math.max(highest + 1, Number.isInteger(value.nextTripNumber) ? value.nextTripNumber : 1);
    return profile;
  }

  function beginTrip(profile, departureMinutes) {
    const trip = { id: `trip-${profile.nextTripNumber++}`, departureMinutes, events: [] };
    profile.trips.push(trip);
    return trip.id;
  }

  function recordFeedback(profile, tripId, cafe, choice, timeBand) {
    if (!["accept", "reject"].includes(choice)) return false;
    const trip = profile.trips.find(item => item.id === tripId);
    if (!trip) return false;
    const old = trip.events.find(event => event.cafeId === cafe.id);
    if (old?.choice === choice) return false;
    if (old) { old.choice = choice; old.timeBand = timeBand; }
    else trip.events.push({ cafeId: cafe.id, category: cafe.category, choice, timeBand });
    return true;
  }

  function statistics(profile, cafes, settings, excludedTripId = null) {
    const make = () => ({ affinity: settings.baselineAffinity, accepts: 0, rejects: 0, bands: {} });
    const venues = Object.fromEntries(cafes.map(cafe => [cafe.id, make()]));
    const categories = Object.fromEntries(CATEGORIES.map(category => [category, make()]));
    let feedbackTrips = 0;
    for (const trip of profile.trips) {
      if (trip.id === excludedTripId || trip.events.length === 0) continue;
      let hasFeedback = false;
      for (const event of trip.events) {
        const venue = venues[event.cafeId], category = categories[event.category];
        if (!venue || !category) continue;
        hasFeedback = true;
        const field = event.choice === "accept" ? "accepts" : "rejects";
        const delta = event.choice === "accept" ? settings.learningAcceptStep : -settings.learningRejectStep;
        for (const entry of [venue, category]) {
          entry.affinity = clamp(entry.affinity + delta);
          entry[field]++;
          entry.bands[event.timeBand] ||= { accepts: 0, rejects: 0 };
          entry.bands[event.timeBand][field]++;
        }
      }
      if (hasFeedback) feedbackTrips++;
    }
    return { venues, categories, feedbackTrips };
  }

  function preferences(stats) {
    return {
      venues: Object.fromEntries(Object.entries(stats.venues).map(([id, entry]) => [id, entry.affinity])),
      categories: Object.fromEntries(Object.entries(stats.categories).map(([id, entry]) => [id, entry.affinity]))
    };
  }

  function currentChoice(profile, tripId, cafeId) {
    return profile.trips.find(trip => trip.id === tripId)?.events.find(event => event.cafeId === cafeId)?.choice || null;
  }

  function smartRemark(candidate, priorStats) {
    const cafe = candidate.cafe;
    const history = priorStats.venues[cafe.id];
    const total = (history?.accepts || 0) + (history?.rejects || 0);
    const band = history?.bands[candidate.timeBand];
    let learned = "";
    if (history?.accepts >= 3 && history.accepts / total >= 2 / 3) {
      const placeType = { tea: "tea spot", coffee: "coffee spot", snacks: "snack stop", meals: "meal stop" }[cafe.category];
      learned = band?.accepts >= 3 && band.accepts > band.rejects
        ? `You usually choose this ${placeType} around this time.`
        : `You usually choose this ${placeType}.`;
    } else if (history?.accepts > 0) {
      learned = `You accepted this stop on ${history.accepts} previous ${history.accepts === 1 ? "trip" : "trips"}.`;
    } else if (history?.rejects > 0) {
      learned = `You rejected this stop on ${history.rejects} previous ${history.rejects === 1 ? "trip" : "trips"}.`;
    }

    let context = "";
    if (candidate.timeBand === "lunchtime") {
      const noodles = cafe.menu.find(item => /noodle|maggi|chowmein/i.test(item.name));
      if (noodles) context = `It’s lunchtime; ${noodles.name} is on the menu here.`;
      else if (cafe.category === "meals") context = "It’s lunchtime; this is a meal option along your route.";
    } else if (candidate.timeBand === "morning" && ["tea", "coffee"].includes(cafe.category)) {
      context = `${cafe.category === "tea" ? "Tea" : "Coffee"} fits a morning stop.`;
    } else if (candidate.timeBand === "evening" && cafe.category === "snacks") {
      context = "A snack could fit this evening trip.";
    }
    return [learned, context].filter(Boolean).join(" ") || "A nearby option along your route.";
  }

  const api = { emptyProfile, normaliseProfile, beginTrip, recordFeedback, statistics, preferences, currentChoice, smartRemark };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FeedbackLearning = api;
})();
