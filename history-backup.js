/* Backups move only local learning/history between the local app and its HTTPS address. */
(() => {
  "use strict";
  const FORMAT = "invehicle-history-backup";
  const VERSION = 2;
  const MAX_BYTES = 5 * 1024 * 1024;
  function make(routeId, profile, history) {
    return { format: FORMAT, version: VERSION, routeId, profile, history };
  }
  function read(text, routeId, cafes, learning, routines) {
    if (typeof text !== "string" || text.length > MAX_BYTES) throw new Error("Choose a history backup smaller than 5 MB.");
    let data;
    try { data = JSON.parse(text); } catch (error) { throw new Error("This file is not valid JSON."); }
    if (!data || data.format !== FORMAT || ![1, VERSION].includes(data.version)) throw new Error("Choose a backup saved by this app.");
    if (data.routeId !== routeId) throw new Error("This backup belongs to a different route.");
    if (data.profile?.version !== 1 || !Array.isArray(data.profile.trips) ||
        ![1, 2].includes(data.history?.version) || !Array.isArray(data.history.trips)) throw new Error("The backup's history format is invalid.");
    const profile = learning.normaliseProfile(data.profile, cafes);
    const history = routines.normaliseHistory(data.history);
    // Never replace good local history with a partially damaged backup.
    if (profile.trips.length !== data.profile.trips.length || history.trips.length !== data.history.trips.length ||
        profile.trips.some((trip, index) => trip.events.length !== data.profile.trips[index]?.events?.length)) throw new Error("The backup contains invalid or duplicate records.");
    return { profile, history };
  }
  const api = { FORMAT, VERSION, MAX_BYTES, make, read };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.HistoryBackup = api;
})();
