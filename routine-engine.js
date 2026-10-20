/* Routine detection uses completed trips. Sample data stays separate from saved replays. */
(() => {
  "use strict";
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const modulo = value => ((value % 1440) + 1440) % 1440;

  function dateParts(text) {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const [year, month, day] = text.split("-").map(Number);
    if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { year, month, day, weekday: date.getUTCDay(), dayName: DAY_NAMES[date.getUTCDay()] };
  }

  function dayKind(date) {
    const parts = dateParts(date);
    return parts ? ([0, 6].includes(parts.weekday) ? "weekend" : "weekday") : null;
  }

  function clockMinutes(text) {
    if (typeof text !== "string" || !/^\d{2}:\d{2}$/.test(text)) return null;
    const [hours, minutes] = text.split(":").map(Number);
    return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
  }

  function validPlace(place) {
    return place && typeof place.name === "string" && place.name.trim() &&
      Array.isArray(place.coordinates) && place.coordinates.length === 2 &&
      place.coordinates.every(Number.isFinite) &&
      Math.abs(place.coordinates[0]) <= 90 && Math.abs(place.coordinates[1]) <= 180;
  }

  function normaliseTrip(value) {
    if (!value || typeof value.id !== "string" || !value.id.trim() ||
        !["replay", "gps", "sample"].includes(value.source) || value.completed !== true ||
        !dateParts(value.date) || !validPlace(value.start) || !validPlace(value.end)) return null;
    const departureMinutes = Number.isFinite(value.departureMinutes)
      ? value.departureMinutes : clockMinutes(value.departureTime);
    if (!Number.isInteger(departureMinutes) || departureMinutes < 0 || departureMinutes >= 1440) return null;
    return {
      id: value.id, source: value.source, completed: true, date: value.date, departureMinutes,
      start: { name: value.start.name.trim(), coordinates: value.start.coordinates.slice() },
      end: { name: value.end.name.trim(), coordinates: value.end.coordinates.slice() }
    };
  }

  function normaliseTrips(values, source) {
    if (!Array.isArray(values)) return [];
    const seen = new Set(), trips = [];
    for (const value of values) {
      const trip = normaliseTrip(value);
      if (!trip || trip.source !== source || seen.has(trip.id)) continue;
      seen.add(trip.id); trips.push(trip);
    }
    return trips;
  }

  function emptyHistory() {
    return { version: 2, nextTripNumber: 1, view: "replay", trips: [] };
  }

  function normaliseHistory(value) {
    if (!value || ![1, 2].includes(value.version)) return emptyHistory();
    const valid = [...normaliseTrips(value.trips, "replay"), ...normaliseTrips(value.trips, "gps")];
    const byId = new Map(valid.map(trip => [trip.id, trip]));
    const seen = new Set();
    const trips = (Array.isArray(value.trips) ? value.trips : []).map(trip => byId.get(trip?.id)).filter(trip => trip && !seen.has(trip.id) && seen.add(trip.id));
    const highest = trips.reduce((max, trip) => {
      const number = Number(trip.id.replace(/^(?:replay|gps)-/, ""));
      return Math.max(max, Number.isSafeInteger(number) && number > 0 ? number : 0);
    }, 0);
    return {
      version: 2, trips,
      nextTripNumber: Math.max(highest + 1, Number.isSafeInteger(value.nextTripNumber) && value.nextTripNumber > 0 ? value.nextTripNumber : 1),
      view: ["gps", "sample"].includes(value.view) ? value.view : "replay"
    };
  }

  function addCompletedTrip(history, value) {
    const source = value.source === "gps" ? "gps" : "replay";
    const trip = normaliseTrip({ ...value, id: source + "-" + history.nextTripNumber, source, completed: true });
    if (!trip) return null;
    history.nextTripNumber++;
    history.trips.push(trip);
    return trip;
  }

  function validateSettings(settings) {
    if (!settings || !Number.isInteger(settings.minimumTrips) || settings.minimumTrips < 3 ||
        !Number.isFinite(settings.maxEndpointDistanceMetres) || settings.maxEndpointDistanceMetres <= 0 ||
        !Number.isFinite(settings.maxDepartureSpanMinutes) || settings.maxDepartureSpanMinutes <= 0 ||
        settings.maxDepartureSpanMinutes >= 720) throw new Error("Invalid routine settings.");
    return settings;
  }

  function distanceMetres(a, b) {
    const rad = Math.PI / 180;
    const x = Math.sin((b[0] - a[0]) * rad / 2) ** 2 +
      Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, x))), Math.sqrt(Math.max(0, 1 - x)));
  }

  function samePlaces(a, b, settings) {
    return distanceMetres(a.start.coordinates, b.start.coordinates) <= settings.maxEndpointDistanceMetres + 1e-7 &&
      distanceMetres(a.end.coordinates, b.end.coordinates) <= settings.maxEndpointDistanceMetres + 1e-7;
  }

  // Find the shortest clock window containing all departures, including midnight.
  function departureWindow(trips) {
    const minutes = trips.map(trip => trip.departureMinutes).sort((a, b) => a - b);
    if (!minutes.length) return { start: 0, end: 0, span: 0 };
    let largestGap = -1, start = minutes[0];
    for (let i = 0; i < minutes.length; i++) {
      const next = i + 1 < minutes.length ? minutes[i + 1] : minutes[0] + 1440;
      const gap = next - minutes[i];
      if (gap > largestGap) { largestGap = gap; start = modulo(next); }
    }
    return { start, end: modulo(start + 1440 - largestGap), span: 1440 - largestGap };
  }

  function typicalDeparture(trips) {
    const window = departureWindow(trips);
    const ordered = trips.map(trip => window.start + modulo(trip.departureMinutes - window.start)).sort((a, b) => a - b);
    const middle = Math.floor(ordered.length / 2);
    const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
    return modulo(Math.round(median));
  }

  function periodAt(minute, timeFits) {
    for (const band of timeFits || []) {
      const start = clockMinutes(band.start);
      const end = band.end === "24:00" ? 1440 : clockMinutes(band.end);
      if (start === null || end === null) continue;
      const current = modulo(minute);
      if ((end > start && current >= start && current < end) ||
          (end <= start && (current >= start || current < end))) return band.label;
    }
    return "trip";
  }

  function detectRoutines(values, settings, timeFits) {
    validateSettings(settings);
    const trips = [...normaliseTrips(values, "replay"), ...normaliseTrips(values, "gps"), ...normaliseTrips(values, "sample")];
    const candidates = new Map();
    // Scan bounded windows. 11:00, 11:25 and 11:50 must not chain into one routine.
    for (const anchor of trips) {
      const nearby = trips.filter(trip => trip.source === anchor.source &&
        dayKind(trip.date) === dayKind(anchor.date) &&
        modulo(trip.departureMinutes - anchor.departureMinutes) <= settings.maxDepartureSpanMinutes &&
        samePlaces(anchor, trip, settings))
        .sort((a, b) => modulo(a.departureMinutes - anchor.departureMinutes) - modulo(b.departureMinutes - anchor.departureMinutes) ||
          a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      const members = [];
      for (const trip of nearby) {
        // Each pair must fit the spatial limit; a long chain of nearby endpoints is not enough.
        if (members.every(other => samePlaces(other, trip, settings))) members.push(trip);
      }
      if (members.length < settings.minimumTrips) continue;
      const key = members.map(trip => trip.source + ":" + trip.id).sort().join("|");
      candidates.set(key, members);
    }
    const ordered = [...candidates.values()].sort((a, b) => b.length - a.length ||
      b.map(trip => trip.date).sort().at(-1).localeCompare(a.map(trip => trip.date).sort().at(-1)) ||
      typicalDeparture(a) - typicalDeparture(b));
    const used = new Set(), routines = [];
    for (const group of ordered) {
      const members = group.filter(trip => !used.has(trip.source + ":" + trip.id));
      if (members.length < settings.minimumTrips) continue;
      members.forEach(trip => used.add(trip.source + ":" + trip.id));
      const departureMinutes = typicalDeparture(members);
      const window = departureWindow(members);
      routines.push({
        id: members.map(trip => trip.source + ":" + trip.id).sort().join("|"),
        source: members[0].source, dayKind: dayKind(members[0].date),
        period: periodAt(departureMinutes, timeFits), departureMinutes, window,
        start: members[0].start, end: members[0].end,
        count: members.length, distinctDates: new Set(members.map(trip => trip.date)).size,
        trips: members.slice().sort((a, b) => a.date.localeCompare(b.date) || a.departureMinutes - b.departureMinutes)
      });
    }
    return routines;
  }

  function matchingRoutine(routines, context, settings) {
    const current = normaliseTrip({ ...context, id: "current-context", completed: true });
    if (!current) return null;
    return routines.filter(routine => routine.source === current.source && routine.dayKind === dayKind(current.date) &&
      routine.trips.every(trip => samePlaces(trip, current, settings)) &&
      departureWindow([...routine.trips, current]).span <= settings.maxDepartureSpanMinutes + 1e-7)
      .sort((a, b) => b.count - a.count || a.window.span - b.window.span)[0] || null;
  }

  function routineRemark(routine) {
    if (!routine) return "";
    const period = routine.period === "trip" ? "" : " " + routine.period;
    return routine.source === "sample"
      ? "Matches the sample " + routine.dayKind + period + " routine."
      : "Matches your " + routine.dayKind + period + " routine from " + (routine.source === "gps" ? "completed GPS trips." : "saved replays.");
  }

  const api = { dateParts, dayKind, clockMinutes, normaliseTrip, normaliseTrips, emptyHistory,
    normaliseHistory, addCompletedTrip, validateSettings, distanceMetres, departureWindow,
    typicalDeparture, periodAt, detectRoutines, matchingRoutine, routineRemark };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.RoutineEngine = api;
})();
