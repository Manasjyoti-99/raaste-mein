/* All orders are local demonstrations. Nothing is sent to a cafe. */
(() => {
  "use strict";
  const MAX_QUANTITY = 10;

  function catalogue(cafe) {
    if (!cafe || !Array.isArray(cafe.menu) || !cafe.menu.length) throw new Error("This cafe has no saved menu.");
    return cafe.menu.map((item, index) => {
      if (!item || typeof item.name !== "string" || !item.name.trim() ||
          !Number.isSafeInteger(item.priceMin) || item.priceMin < 0 ||
          !Number.isSafeInteger(item.priceMax) || item.priceMax < item.priceMin) throw new Error("Invalid saved menu price.");
      // Supplied prices are ranges. Use their lower end for clearly labelled demo totals.
      return { id: String(index), name: item.name, price: item.priceMin, priceMin: item.priceMin, priceMax: item.priceMax };
    });
  }

  function cart(cafe, quantities) {
    const items = catalogue(cafe);
    if (!Array.isArray(quantities) || quantities.length !== items.length ||
        quantities.some(value => !Number.isInteger(value) || value < 0 || value > MAX_QUANTITY)) throw new Error("Use whole quantities from 0 to 10.");
    const lines = items.map((item, index) => ({ ...item, quantity: quantities[index], subtotal: item.price * quantities[index] })).filter(item => item.quantity);
    return { lines, quantity: lines.reduce((sum, item) => sum + item.quantity, 0), total: lines.reduce((sum, item) => sum + item.subtotal, 0) };
  }

  function arrival(candidate) {
    if (!candidate || !Number.isFinite(candidate.currentMinute) || !Number.isFinite(candidate.arrivalMinute) ||
        candidate.arrivalMinute < candidate.currentMinute) throw new Error("Arrival estimate is unavailable.");
    return { minutes: candidate.arrivalMinute, secondsAway: Math.max(0, Math.round((candidate.arrivalMinute - candidate.currentMinute) * 60)),
      dayOffset: Math.floor(candidate.arrivalMinute / 1440) - Math.floor(candidate.currentMinute / 1440) };
  }

  function confirm(cafe, quantities, candidate, tripId, date) {
    const contents = cart(cafe, quantities);
    if (!contents.quantity) throw new Error("Add an item to the cart first.");
    if (!candidate?.available || candidate.cafe.id !== cafe.id) throw new Error(candidate?.availabilityReason || "This stop cannot fit the current trip.");
    const ready = arrival(candidate);
    return { id: "DEMO-" + tripId + "-" + cafe.id, cafeId: cafe.id, cafeName: cafe.name, tripId, date,
      simulated: true, ...contents, arrivalMinutes: ready.minutes, secondsAway: ready.secondsAway, dayOffset: ready.dayOffset };
  }

  const api = { MAX_QUANTITY, catalogue, cart, arrival, confirm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.OrderEngine = api;
})();
