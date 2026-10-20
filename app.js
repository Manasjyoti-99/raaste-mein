/* Setup first, then a map-first journey. Explicit choices teach preferences. */
(() => {
  "use strict";

  // Adjust these demo values here. Map tiles are the only external requests.
  const CONFIG = {
    buildVersion: "5.1.0",
    routeFile: "data/route.json",
    cafesFile: "data/cafes.json",
    settingsFile: "data/demo-settings.json",
    historyFile: "data/history.json",
    // This venue stays removed even if an older cafes.json is served.
    removedCafeIds: ["delhi16-food-paradise"],
    simulatedSpeedKmh: 15,
    startingReplaySpeed: 2,
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileWaitMs: 10000
  };

  // The Haversine formula measures distance on the Earth, in metres.
  function distanceMetres(a, b) {
    const toRadians = value => value * Math.PI / 180;
    const latA = toRadians(a[0]);
    const latB = toRadians(b[0]);
    const deltaLat = latB - latA;
    const deltaLon = toRadians(b[1] - a[1]);
    const value = Math.sin(deltaLat / 2) ** 2 +
      Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;
    const safeValue = Math.max(0, Math.min(1, value));
    return 6371000 * 2 * Math.atan2(Math.sqrt(safeValue), Math.sqrt(1 - safeValue));
  }

  function prepareRoute(points) {
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error("The route needs at least two latitude/longitude pairs.");
    }
    const valid = points.every(point => Array.isArray(point) && point.length === 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180);
    if (!valid) throw new Error("Each route point must contain valid numbers in [latitude, longitude] order.");

    // Store distance from the start to every point, once, when the file loads.
    const cumulative = [0];
    for (let index = 1; index < points.length; index++) {
      cumulative.push(cumulative[index - 1] + distanceMetres(points[index - 1], points[index]));
    }
    const totalMetres = cumulative[cumulative.length - 1];
    if (totalMetres <= 0) throw new Error("The route has no length. Use distinct points.");
    return { points, cumulative, totalMetres };
  }

  function positionAtDistance(route, distance) {
    const target = Math.max(0, Math.min(route.totalMetres, distance));
    if (target >= route.totalMetres) {
      return { point: route.points[route.points.length - 1].slice(), segment: route.points.length - 2 };
    }
    let index = 0;
    // Find the line segment that contains the current distance.
    while (index < route.points.length - 2 && route.cumulative[index + 1] <= target) index++;
    const a = route.points[index];
    const b = route.points[index + 1];
    const segmentMetres = route.cumulative[index + 1] - route.cumulative[index];
    const fraction = segmentMetres === 0 ? 0 : (target - route.cumulative[index]) / segmentMetres;
    return {
      point: [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction],
      segment: index
    };
  }

  function advanceDistance(distance, seconds, multiplier, speedKmh, totalMetres) {
    const metresPerSecond = speedKmh / 3.6;
    return Math.min(totalMetres, distance + Math.max(0, seconds) * multiplier * metresPerSecond);
  }

  // This allows the distance functions to be checked with Node, without a browser.
  // The app itself needs no Node installation and no build step.
  if (typeof document === "undefined") {
    if (typeof module !== "undefined") module.exports = { distanceMetres, prepareRoute, positionAtDistance, advanceDistance };
    return;
  }

  const ui = {
    buildVersion: document.getElementById("build-version"),
    header: document.getElementById("trip-header"),
    controls: document.getElementById("trip-controls"),
    mapSurface: document.querySelector(".map-surface"),
    setupDialog: document.getElementById("setup-dialog"),
    openSettings: document.getElementById("open-settings"),
    closeSettings: document.getElementById("close-settings"),
    setupStart: document.getElementById("setup-start"),
    setupStops: document.getElementById("setup-stops"),
    setupModeNote: document.getElementById("setup-mode-note"),
    replaySpeedSettings: document.getElementById("replay-speed-settings"),
    toolsDialog: document.getElementById("tools-dialog"),
    openTools: document.getElementById("open-tools"),
    closeTools: document.getElementById("close-tools"),
    toolsGpsStatus: document.getElementById("tools-gps-status"),
    journeyDate: document.getElementById("journey-date"),
    journeyTime: document.getElementById("journey-time"),
    journeySpeedLabel: document.getElementById("journey-speed-label"),
    spareLeft: document.getElementById("spare-left"),
    feedbackNotice: document.getElementById("feedback-notice"),
    fitRoute: document.getElementById("fit-route"),
    destination: document.getElementById("destination-name"),
    origin: document.getElementById("origin-name"),
    timeLeft: document.getElementById("time-left"),
    distanceLeft: document.getElementById("distance-left"),
    status: document.getElementById("trip-status"),
    progress: document.getElementById("trip-progress"),
    progressLabel: document.getElementById("progress-label"),
    simulatedSpeed: document.getElementById("simulated-speed"),
    play: document.getElementById("play-button"),
    playLabel: document.getElementById("play-label"),
    playIcon: document.getElementById("play-icon"),
    reset: document.getElementById("reset-button"),
    speeds: Array.from(document.querySelectorAll("[data-speed]")),
    notice: document.getElementById("map-notice"),
    map: document.getElementById("map"),
    fallback: document.getElementById("fallback-map"),
    errorPanel: document.getElementById("error-panel"),
    errorMessage: document.getElementById("error-message"),
    departure: document.getElementById("departure-time"),
    replayDate: document.getElementById("replay-date"),
    slack: document.getElementById("trip-slack"),
    timeZone: document.getElementById("time-zone"),
    clock: document.getElementById("trip-clock"),
    routineStatus: document.getElementById("routine-status"),
    selectedStop: document.getElementById("selected-stop"),
    foodButton: document.getElementById("food-spots-button"),
    foodDialog: document.getElementById("food-dialog"),
    closeFood: document.getElementById("close-food-dialog"),
    foodContext: document.getElementById("food-context"),
    foodList: document.getElementById("food-list"),
    suggestionDialog: document.getElementById("suggestion-dialog"),
    suggestionName: document.getElementById("suggestion-name"),
    suggestionHeading: document.getElementById("suggestion-heading-label"),
    suggestionCategory: document.getElementById("suggestion-category"),
    suggestionOpen: document.getElementById("suggestion-open"),
    suggestionRating: document.getElementById("suggestion-rating"),
    suggestionDetour: document.getElementById("suggestion-detour"),
    suggestionAhead: document.getElementById("suggestion-ahead"),
    suggestionReason: document.getElementById("suggestion-reason"),
    suggestionBreakdown: document.getElementById("suggestion-breakdown"),
    accept: document.getElementById("accept-suggestion"),
    dismiss: document.getElementById("dismiss-suggestion"),
    closeSuggestion: document.getElementById("close-suggestion"),
    suggestionHandle: document.getElementById("suggestion-handle"),
    alertCloseNote: document.getElementById("alert-close-note"),
    learningButton: document.getElementById("learning-button"),
    learningStatus: document.getElementById("learning-status"),
    learningDialog: document.getElementById("learning-dialog"),
    closeLearning: document.getElementById("close-learning"),
    learningSummary: document.getElementById("learning-summary"),
    categoryLearning: document.getElementById("category-learning"),
    venueLearning: document.getElementById("venue-learning"),
    resetLearning: document.getElementById("reset-learning"),
    nextTrip: document.getElementById("next-trip-button"),
    startReplay: document.getElementById("start-replay"),
    useReplays: document.getElementById("use-replays"),
    useSample: document.getElementById("use-sample"),
    routineBasis: document.getElementById("routine-basis"),
    routineCards: document.getElementById("routine-cards"),
    historyTitle: document.getElementById("trip-history-title"),
    historyList: document.getElementById("history-list"),
    preorder: document.getElementById("preorder-suggestion"),
    orderDialog: document.getElementById("order-dialog"),
    orderTitle: document.getElementById("order-title"),
    closeOrder: document.getElementById("close-order"),
    orderContext: document.getElementById("order-context"),
    orderEditor: document.getElementById("order-editor"),
    orderMenu: document.getElementById("order-menu"),
    cartLines: document.getElementById("cart-lines"),
    cartTotal: document.getElementById("cart-total"),
    orderArrival: document.getElementById("order-arrival"),
    orderError: document.getElementById("order-error"),
    confirmOrder: document.getElementById("confirm-order"),
    orderReceipt: document.getElementById("order-receipt"),
    demoButton: document.getElementById("demo-button"),
    demoDialog: document.getElementById("demo-dialog"),
    closeDemo: document.getElementById("close-demo"),
    demoResetTrip: document.getElementById("demo-reset-trip"),
    demoSample: document.getElementById("demo-sample"),
    demoResetLearning: document.getElementById("demo-reset-learning"),
    demoOrders: document.getElementById("demo-orders"),
    saveBackup: document.getElementById("save-backup"),
    restoreBackup: document.getElementById("restore-backup"),
    confirmRestore: document.getElementById("confirm-restore"),
    backupStatus: document.getElementById("backup-status"),
    replayMode: document.getElementById("replay-mode"),
    gpsMode: document.getElementById("gps-mode"),
    gpsStatus: document.getElementById("gps-status"),
    modeTitle: document.getElementById("trip-mode-title"),
    useGps: document.getElementById("use-gps"),
    dateLabel: document.getElementById("trip-date-label")
  };

  const state = {
    route: null,
    routeDetails: null,
    settings: null,
    measuredCafes: [],
    departureMinutes: 0,
    slackMinutes: 0,
    replayDate: "",
    history: null,
    historyKey: null,
    sampleTrips: [],
    sampleError: "",
    canPersistHistory: true,
    routines: [],
    matchingRoutine: null,
    tripRecorded: false,
    orders: [],
    orderCafeId: null,
    orderQuantities: [],
    orderReturn: "trip",
    resumeAfterOrder: false,
    resumeAfterDemo: false,
    resumeAfterSettings: false,
    resumeAfterTools: false,
    feedbackTimer: null,
    mapSize: "",
    pendingBackup: null,
    profile: null,
    storageKey: null,
    canPersist: true,
    tripId: null,
    personalized: false,
    tripPreferences: {},
    resumeAfterLearning: false,
    alertTimer: null,
    swipeStart: null,
    seenCafeIds: new Set(),
    dismissedCafeIds: new Set(),
    acceptedStops: [],
    popupCount: 0,
    lastPopupMetres: null,
    activeSuggestion: null,
    resumeAfterFoodList: false,
    distance: 0,
    multiplier: CONFIG.startingReplaySpeed,
    playing: false,
    frameId: null,
    lastTimestamp: null,
    map: null,
    positionMarker: null,
    travelledLine: null,
    routeLine: null,
    fallbackProject: null,
    fallbackPosition: null,
    fallbackTravelled: null,
    tileLayer: null,
    tileTimer: null,
    tileFallback: false,
    lastMetricUpdate: 0,
    mode: "replay",
    gps: null,
    gpsWatch: null,
    gpsHeartbeat: null,
    gpsGeneration: 0,
    gpsStarted: false
  };

  function setNotice(text) {
    ui.notice.textContent = text;
    ui.notice.hidden = !text;
  }

  function formatDistance(metres) {
    return metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`;
  }

  function formatDuration(seconds) {
    const rounded = Math.ceil(seconds);
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
  }

  function updateControls() {
    const arrived = state.route && state.distance >= state.route.totalMetres;
    ui.playLabel.textContent = state.mode === "gps" ? state.playing ? "Pause GPS" : arrived ? "New GPS trip" : "Start GPS" : state.playing ? "Pause trip" : arrived ? "Replay trip" : "Play trip";
    ui.playIcon.setAttribute("d", state.playing ? "M7 5h4v14H7ZM14 5h4v14h-4Z" : "M8 5v14l11-7Z");
    ui.speeds.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.speed) === state.multiplier)));
    ui.journeySpeedLabel.textContent = state.mode === "gps" ? "Moving speed" : `Replay · ${state.multiplier}×`;
    const canEditContext = !!state.settings && !state.playing && state.distance === 0;
    ui.departure.disabled = !canEditContext;
    ui.slack.disabled = !canEditContext;
    ui.replayDate.disabled = !canEditContext;
    if (state.mode === "gps") {
      ui.departure.disabled = true; ui.replayDate.disabled = true;
      ui.slack.disabled = !state.settings || state.playing || state.gpsStarted;
    }
    ui.replayMode.disabled = ui.gpsMode.disabled = !state.settings || state.playing;
    ui.replayMode.setAttribute("aria-pressed", String(state.mode === "replay"));
    ui.gpsMode.setAttribute("aria-pressed", String(state.mode === "gps"));
    ui.modeTitle.textContent = state.mode === "gps" ? "Live GPS trip" : "Trip replay";
    ui.dateLabel.textContent = state.mode === "gps" ? "Trip date" : "Replay date";
    ui.gpsStatus.hidden = state.mode !== "gps";
    ui.speeds.forEach(button => { button.disabled = !state.settings || state.mode === "gps"; });
    ui.replaySpeedSettings.hidden = state.mode === "gps";
    ui.setupStart.textContent = state.playing ? "Back to journey" : arrived ? state.mode === "gps" ? "Start new GPS trip" : "Start new replay" : state.distance > 0 ? state.mode === "gps" ? "Resume GPS" : "Resume replay" : state.mode === "gps" ? "Start GPS" : "Start replay";
    ui.setupModeNote.textContent = state.mode === "gps"
      ? state.playing ? "GPS keeps tracking while this panel is open. Close it to receive automatic suggestions." : "GPS uses the real date, time and moving speed. Location starts only when you press Start GPS."
      : "Replay follows the route at a simulated speed. Choose a departure time to try different suggestions.";
    for (const button of [ui.openSettings, ui.openTools, ui.setupStart, ui.setupStops, ui.fitRoute]) button.disabled = !state.settings;
  }

  function updateMetrics() {
    if (!state.route) return;
    const remaining = Math.max(0, state.route.totalMetres - state.distance);
    const percent = state.distance / state.route.totalMetres * 100;
    ui.distanceLeft.textContent = formatDistance(remaining);
    // This is simulated trip time, not the faster wall-clock replay time.
    const pendingDelay = state.acceptedStops.filter(stop => stop.alongRouteMetres > state.distance).reduce((total, stop) => total + stop.extraMinutes * 60, 0);
    const measuredSpeed = state.mode === "gps" && state.gps?.isFresh(Date.now()) && state.gps.state.speedMps >= state.settings.gps.movingMinimumMps ? state.gps.state.speedMps : null;
    ui.timeLeft.textContent = remaining === 0 ? "0:00" : state.mode === "gps" ? measuredSpeed ? formatDuration(remaining / measuredSpeed + pendingDelay) : "—" : formatDuration(remaining / (CONFIG.simulatedSpeedKmh / 3.6) + pendingDelay);
    ui.simulatedSpeed.textContent = state.mode === "gps" ? measuredSpeed ? `${(measuredSpeed * 3.6).toFixed(1)} km/h measured` : "GPS · waiting for moving speed" : `${CONFIG.simulatedSpeedKmh} km/h simulated`;
    ui.progress.value = percent;
    ui.progressLabel.textContent = `${Math.floor(percent)}%`;
    if (state.settings) {
      const clock = window.SuggestionEngine.tripClockMinutes(tripContext());
      const band = state.settings.timeFits.find(item => window.SuggestionEngine.isOpenAt({ opens: item.start, closes: item.end }, clock));
      const spare = Math.max(0, state.slackMinutes - state.acceptedStops.reduce((sum, stop) => sum + stop.extraMinutes, 0));
      const spareText = Number.isInteger(spare) ? String(spare) : spare.toFixed(1);
      ui.clock.textContent = `Trip clock ${formatClock(clock)} ${state.settings.timeZoneLabel} · ${band?.label || ""} · ${spareText} min spare`;
      const date = state.mode === "gps" ? indianNow().date : state.replayDate;
      ui.journeyDate.textContent = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
      ui.journeyTime.textContent = `${formatClock(clock)} · ${band?.label === "lunchtime" ? "lunch" : band?.label || ""}`;
      ui.spareLeft.textContent = `${spareText} min`;
      ui.toolsGpsStatus.hidden = state.mode !== "gps";
      ui.toolsGpsStatus.textContent = ui.gpsStatus.textContent;
      if (state.activeSuggestion) {
        const live = window.SuggestionEngine.scoreCafe(state.activeSuggestion, tripContext(), state.settings, state.tripPreferences);
        ui.suggestionAhead.textContent = `${Math.max(0, Math.round(live.alongRouteMetres - state.distance))} m ahead`;
        ui.accept.disabled = !live.available;
        ui.preorder.disabled = !live.available;
        if (state.distance >= live.alongRouteMetres) closeSuggestion();
      }
    }
  }

  function drawPosition() {
    if (!state.route) return;
    const current = positionAtDistance(state.route, state.distance);
    const travelled = state.route.points.slice(0, current.segment + 1).concat([current.point]);
    if (state.map) {
      state.positionMarker.setLatLng(current.point);
      state.travelledLine.setLatLngs(travelled);
    } else if (state.fallbackProject) {
      const p = state.fallbackProject(current.point);
      state.fallbackPosition.setAttribute("transform", `translate(${p[0]},${p[1]})`);
      state.fallbackTravelled.setAttribute("points", travelled.map(point => state.fallbackProject(point).join(",")).join(" "));
    }
  }

  function usePlainLeafletMap() {
    if (state.tileFallback) return;
    state.tileFallback = true;
    clearTimeout(state.tileTimer);
    if (state.tileLayer && state.map.hasLayer(state.tileLayer)) state.map.removeLayer(state.tileLayer);
    state.map.attributionControl.removeAttribution(state.tileLayer.options.attribution);
    setNotice("Map tiles unavailable · route still works");
  }

  function mapPadding() {
    // The map is a separate grid cell; neither journey panel covers its bounds.
    return { paddingTopLeft: [32, 56], paddingBottomRight: [36, 62] };
  }

  function fitRoute() {
    if (state.map && state.routeLine) state.map.fitBounds(state.routeLine.getBounds(), { ...mapPadding(), animate: false });
  }

  function resizeMap() {
    if (!state.route) return;
    if (state.map) {
      const bounds = ui.map.getBoundingClientRect();
      const size = `${bounds.width}:${bounds.height}`;
      state.map.invalidateSize({ animate: false, pan: false });
      // Feedback and menus do not reset a passenger's chosen map zoom.
      if (size !== state.mapSize) { state.mapSize = size; fitRoute(); }
    } else {
      drawFallback();
    }
    drawPosition();
  }

  function drawLeafletMap() {
    const L = window.L;
    ui.map.hidden = false;
    ui.fallback.hidden = true;
    state.map = L.map(ui.map, { zoomControl: false, attributionControl: true, zoomSnap: .1 });
    state.map.attributionControl.setPrefix(false);
    L.control.zoom({ position: "topright" }).addTo(state.map);
    state.map.createPane("routePane");
    state.map.getPane("routePane").style.zIndex = "450";

    state.routeLine = L.polyline(state.route.points, { pane: "routePane", color: "#061116", weight: 11, lineCap: "round" }).addTo(state.map);
    L.polyline(state.route.points, { pane: "routePane", color: "#568b73", weight: 7, opacity: 1 }).addTo(state.map);
    state.travelledLine = L.polyline([state.route.points[0]], { pane: "routePane", color: "#7df5cd", weight: 7 }).addTo(state.map);

    const endpoint = (point, text, destination) => {
      const place = destination ? state.routeDetails.end : state.routeDetails.start;
      const icon = L.divIcon({ className: `endpoint-icon${destination ? " destination" : ""}`, html: text, iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = L.marker(point, { icon, keyboard: true, title: `${destination ? "Destination" : "Start"}: ${place?.name || ""}` }).addTo(state.map);
      const tooltip = document.createElement("span");
      tooltip.textContent = place?.mapLabel || place?.name || (destination ? "Destination" : "Start");
      marker.bindTooltip(tooltip, { permanent: true, direction: "bottom", offset: [0, 17], className: "endpoint-label" });
    };
    endpoint(state.route.points[0], "H", false);
    endpoint(state.route.points[state.route.points.length - 1], "P", true);
    const positionIcon = L.divIcon({ className: "position-icon", html: '<span class="position-core"></span>', iconSize: [34, 34], iconAnchor: [17, 17] });
    state.positionMarker = L.marker(state.route.points[0], { icon: positionIcon, zIndexOffset: 1000, keyboard: false, title: "Current simulated position" }).addTo(state.map);
    // Small amber dots show the supplied food spots at their actual coordinates.
    state.measuredCafes.forEach(measured => {
      const label = document.createElement("span");
      label.textContent = measured.cafe.name;
      const icon = L.divIcon({ className: "cafe-map-dot", html: "", iconSize: [12, 12], iconAnchor: [6, 6] });
      L.marker([measured.cafe.lat, measured.cafe.lon], { icon, title: measured.cafe.name }).addTo(state.map).bindTooltip(label);
    });

    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    state.tileLayer = L.tileLayer(CONFIG.tileUrl, { maxZoom: 19, attribution, keepBuffer: 1 });
    let loaded = 0;
    let failed = 0;
    state.tileLayer.on("tileload", () => {
      loaded++;
      if (failed === 0) setNotice("");
    });
    state.tileLayer.on("tileerror", () => { failed++; });
    state.tileLayer.on("load", () => {
      if (failed > 0) usePlainLeafletMap();
      else if (loaded > 0) clearTimeout(state.tileTimer);
    });
    setNotice("Loading map… route is ready");
    state.tileTimer = setTimeout(() => {
      if (loaded === 0 || failed > 0) usePlainLeafletMap();
    }, CONFIG.tileWaitMs);
    state.tileLayer.addTo(state.map);
    if (!navigator.onLine) usePlainLeafletMap();
  }

  function svgElement(name, attributes, text) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function drawFallback() {
    ui.map.hidden = true;
    ui.fallback.hidden = false;
    ui.fallback.replaceChildren();
    const bounds = ui.fallback.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    ui.fallback.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const points = state.route.points;
    const middleLat = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const longitudeScale = Math.cos(middleLat * Math.PI / 180);
    const xs = points.map(point => point[1] * longitudeScale);
    const ys = points.map(point => -point[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const left = 32;
    const right = width - 36;
    const top = 56;
    const bottom = height - 62;
    const usableWidth = Math.max(20, right - left);
    const usableHeight = Math.max(20, bottom - top);
    const scale = Math.min(usableWidth / Math.max(1e-9, maxX - minX), usableHeight / Math.max(1e-9, maxY - minY));
    const offsetX = left + (usableWidth - (maxX - minX) * scale) / 2;
    const offsetY = top + (usableHeight - (maxY - minY) * scale) / 2;
    state.fallbackProject = point => [offsetX + (point[1] * longitudeScale - minX) * scale, offsetY + (-point[0] - minY) * scale];
    const routePoints = points.map(point => state.fallbackProject(point).join(",")).join(" ");
    ui.fallback.appendChild(svgElement("polyline", { points: routePoints, class: "fallback-route-shadow" }));
    ui.fallback.appendChild(svgElement("polyline", { points: routePoints, class: "fallback-route" }));
    state.fallbackTravelled = svgElement("polyline", { points: "", class: "fallback-travelled" });
    ui.fallback.appendChild(state.fallbackTravelled);
    state.measuredCafes.forEach(measured => {
      const [x, y] = state.fallbackProject([measured.cafe.lat, measured.cafe.lon]);
      const dot = svgElement("circle", { cx: x, cy: y, r: 4, fill: "#d3ac6e", stroke: "#152635", "stroke-width": 1.5 });
      dot.appendChild(svgElement("title", {}, measured.cafe.name));
      ui.fallback.appendChild(dot);
    });
    [points[0], points[points.length - 1]].forEach((point, index) => {
      const [x, y] = state.fallbackProject(point);
      ui.fallback.appendChild(svgElement("circle", { cx: x, cy: y, r: 11, fill: "#172b3d", stroke: index ? "#7df5cd" : "#f1f7fa", "stroke-width": 3 }));
      const place = index ? state.routeDetails.end : state.routeDetails.start;
      ui.fallback.appendChild(svgElement("text", { x, y: y + 35, "text-anchor": "middle", class: "fallback-label" }, place?.mapLabel || place?.name || (index ? "Destination" : "Start")));
    });
    state.fallbackPosition = svgElement("g", { transform: "translate(0,0)" });
    state.fallbackPosition.appendChild(svgElement("circle", { r: 21, fill: "#7df5cd25", stroke: "#7df5cd60", "stroke-width": 1 }));
    state.fallbackPosition.appendChild(svgElement("circle", { r: 8, fill: "#f4fffb", stroke: "#219e79", "stroke-width": 4 }));
    ui.fallback.appendChild(state.fallbackPosition);
    setNotice("Route outline · map unavailable");
  }

  function pauseTrip(message = "Trip paused") {
    if (state.mode === "gps" && state.playing && state.gps?.state.last && !state.gps.state.completed) state.gps.interrupt("Tracking was paused or backgrounded.");
    stopGpsWatch();
    if (state.mode === "gps") closeSuggestion();
    if (state.mode === "gps") state.resumeAfterFoodList = state.resumeAfterLearning = state.resumeAfterOrder = state.resumeAfterDemo = state.resumeAfterSettings = state.resumeAfterTools = false;
    state.playing = false;
    window.AppPwa?.setTripActive(false);
    if (state.frameId !== null) cancelAnimationFrame(state.frameId);
    state.frameId = null;
    state.lastTimestamp = null;
    ui.status.textContent = message;
    updateControls();
    updateMetrics();
  }

  function resetTrip(showOptions = true) {
    // Start another iteration while keeping all learned choices.
    closeSuggestion();
    state.resumeAfterFoodList = false;
    state.resumeAfterLearning = false;
    state.resumeAfterOrder = false;
    state.resumeAfterDemo = false;
    state.resumeAfterSettings = false;
    state.resumeAfterTools = false;
    clearTimeout(state.feedbackTimer); state.feedbackTimer = null; ui.feedbackNotice.hidden = true;
    if (ui.setupDialog.open) ui.setupDialog.close();
    if (ui.toolsDialog.open) ui.toolsDialog.close();
    if (ui.foodDialog.open) ui.foodDialog.close();
    if (ui.learningDialog.open) ui.learningDialog.close();
    if (ui.orderDialog.open) ui.orderDialog.close();
    if (ui.demoDialog.open) ui.demoDialog.close();
    state.seenCafeIds.clear();
    state.dismissedCafeIds.clear();
    state.acceptedStops = [];
    state.popupCount = 0;
    state.lastPopupMetres = null;
    state.tripRecorded = false;
    state.orders = [];
    state.orderCafeId = null;
    ui.selectedStop.hidden = true;
    ui.selectedStop.textContent = "";
    pauseTrip("Ready to depart");
    state.distance = 0;
    state.gps = state.settings ? window.GpsEngine.create(state.route, state.settings.gps, distanceMetres, window.SuggestionEngine.measureCafe) : null;
    state.gpsStarted = false;
    if (state.mode === "gps") setLiveDeparture(false);
    state.lastMetricUpdate = 0;
    beginLearningTrip();
    drawPosition();
    updateMetrics();
    updateControls();
    resizeMap();
    if (showOptions) openSettings();
  }

  function animationStep(timestamp) {
    if (!state.playing) return;
    if (state.lastTimestamp !== null) {
      const seconds = (timestamp - state.lastTimestamp) / 1000;
      const nextDistance = advanceDistance(state.distance, seconds, state.multiplier, CONFIG.simulatedSpeedKmh, state.route.totalMetres);
      // Contextual alerts are shown at the exact alert point, without blocking replay.
      const suggestion = state.activeSuggestion ? null : window.SuggestionEngine.findSuggestionBetween(state.measuredCafes, tripContext(), nextDistance, state.settings, state.tripPreferences);
      state.distance = suggestion ? suggestion.triggerMetres : nextDistance;
      if (suggestion) {
        drawPosition();
        updateMetrics();
        showSuggestion(suggestion);
      }
    }
    state.lastTimestamp = timestamp;
    drawPosition();
    if (timestamp - state.lastMetricUpdate >= 200) {
      updateMetrics();
      state.lastMetricUpdate = timestamp;
    }
    if (state.distance >= state.route.totalMetres) {
      recordCompletedReplay();
      pauseTrip(`Arrived at ${state.routeDetails.end?.mapLabel || state.routeDetails.end?.name || "destination"}`);
      return;
    }
    state.frameId = requestAnimationFrame(animationStep);
  }

  function playTrip() {
    if (!state.route || state.playing) return;
    if (state.distance >= state.route.totalMetres) resetTrip(false);
    leaveCompactPanels();
    if (ui.foodDialog.open) { state.resumeAfterFoodList = false; ui.foodDialog.close(); }
    if (ui.learningDialog.open) { state.resumeAfterLearning = false; ui.learningDialog.close(); }
    if (ui.orderDialog.open) { state.resumeAfterOrder = false; ui.orderDialog.close(); }
    if (ui.demoDialog.open) { state.resumeAfterDemo = false; ui.demoDialog.close(); }
    if (state.mode === "gps") { startGps(); return; }
    state.playing = true;
    window.AppPwa?.setTripActive(true);
    state.lastTimestamp = null;
    state.lastMetricUpdate = 0;
    ui.status.textContent = "Trip in progress";
    updateControls();
    state.frameId = requestAnimationFrame(animationStep);
  }

  function tripContext() {
    return {
      progressMetres: state.distance,
      departureMinutes: state.departureMinutes,
      speedKmh: state.mode === "gps" && state.gps?.state.speedMps >= state.settings.gps.movingMinimumMps ? state.gps.state.speedMps * 3.6 : CONFIG.simulatedSpeedKmh,
      slackMinutes: state.slackMinutes,
      acceptedStops: state.acceptedStops,
      excludedIds: state.seenCafeIds,
      popupCount: state.popupCount,
      lastPopupMetres: state.lastPopupMetres,
      personalized: state.personalized,
      mode: state.mode,
      gpsReady: state.mode !== "gps" || !!(state.playing && state.gps?.isFresh(Date.now())),
      liveClockMinutes: state.mode === "gps" ? indianNow().minutes : undefined
    };
  }

  function formatClock(minutes) {
    const value = ((Math.floor(minutes) % 1440) + 1440) % 1440;
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function formatExtra(minutes) {
    const seconds = Math.round(minutes * 60);
    return seconds < 60 ? `${seconds} sec` : `${(seconds / 60).toFixed(1)} min`;
  }

  function scoreExplanation(candidate) {
    const weights = state.settings.weights;
    return `Score ${candidate.score.toFixed(3)} out of 1\n` +
      `Detour ${candidate.parts.detour.toFixed(3)} × ${weights.detour}\n` +
      `Time fit ${candidate.parts.timeFit.toFixed(3)} × ${weights.timeFit}\n` +
      `Rating ${candidate.parts.rating.toFixed(3)} × ${weights.rating}\n` +
      `Preference ${candidate.parts.affinity.toFixed(3)} × ${weights.affinity}\n` +
      `Venue preference ${candidate.venueAffinity.toFixed(3)}; category preference ${candidate.categoryAffinity.toFixed(3)}.\n` +
      "Explicit choices update preferences. Closing an alert stays neutral.";
  }

  const cafeRecords = () => state.measuredCafes.map(item => item.cafe);
  const learningStats = (excludeCurrent = false) => window.FeedbackLearning.statistics(state.profile, cafeRecords(), state.settings, excludeCurrent ? state.tripId : null);

  function persistLearning() {
    try {
      window.localStorage.setItem(state.storageKey, JSON.stringify(state.profile));
      state.canPersist = true;
    } catch (error) {
      state.canPersist = false;
    }
  }

  function beginLearningTrip() {
    const stats = learningStats();
    state.personalized = stats.feedbackTrips >= state.settings.learningTripsBeforePersonalization;
    // Automatic suggestions use the preferences learned before this iteration.
    state.tripPreferences = window.FeedbackLearning.preferences(stats);
    state.tripId = window.FeedbackLearning.beginTrip(state.profile, state.departureMinutes);
    persistLearning();
    updateLearningStatus();
  }

  function updateLearningStatus() {
    const count = learningStats().feedbackTrips;
    const target = state.settings.learningTripsBeforePersonalization;
    const text = state.personalized ? `Personalized from ${count} feedback ${count === 1 ? "trip" : "trips"}. Replay alerts are on.`
      : count >= target ? "Choice saved. Your next trip will use updated preferences."
      : "Replay alerts are on. No preselection needed.";
    const modeText = state.mode === "gps" ? text.replace("Replay alerts are on.", "GPS alerts need a reliable route fix.") : text;
    ui.learningStatus.textContent = state.canPersist ? modeText : `${modeText} Learning is available for this session only.`;
  }

  function textElement(tag, value, className = "") {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function todayInIndia() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function indianNow() {
    const date = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: todayInIndia(), minutes: Number(values.hour) * 60 + Number(values.minute) + Number(values.second) / 60 };
  }

  function setLiveDeparture(updateTrip = true) {
    const now = indianNow();
    state.replayDate = now.date; state.departureMinutes = Math.floor(now.minutes);
    ui.replayDate.value = state.replayDate; ui.departure.value = formatClock(state.departureMinutes);
    const trip = state.profile?.trips.find(item => item.id === state.tripId);
    if (trip && updateTrip) { trip.departureMinutes = state.departureMinutes; persistLearning(); }
    if (state.history) refreshRoutines();
  }

  function setMode(mode) {
    if (!state.settings || state.playing || mode === state.mode) return;
    const inSettings = ui.setupDialog.open;
    state.mode = mode;
    resetTrip(false);
    state.history.view = mode === "gps" ? "gps" : "replay";
    persistHistory(); refreshRoutines();
    ui.gpsStatus.textContent = "GPS starts only when you press Start GPS. Use a supervised or passenger check.";
    if (mode === "replay") { ui.departure.value = state.settings.departureTime; ui.replayDate.value = todayInIndia(); updateTripContext(); }
    updateControls(); updateMetrics();
    if (inSettings) openSettings();
  }

  function stopGpsWatch() {
    state.gpsGeneration++;
    if (state.gpsWatch !== null) navigator.geolocation?.clearWatch(state.gpsWatch);
    state.gpsWatch = null;
    clearInterval(state.gpsHeartbeat); state.gpsHeartbeat = null;
    if (state.gps) state.gps.state.ready = false;
  }

  function startGps() {
    if (!window.isSecureContext || !navigator.geolocation?.watchPosition) {
      ui.gpsStatus.textContent = !window.isSecureContext ? "Live GPS needs the HTTPS address (or PC localhost)." : "Location is unavailable in this browser. Use Replay.";
      ui.status.textContent = "GPS could not start"; return;
    }
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && !policy.allowsFeature("geolocation")) {
      ui.gpsStatus.textContent = "This browser frame blocks location. Open the full HTTPS address directly in Chrome.";
      ui.status.textContent = "GPS is blocked by the page's permissions policy"; return;
    }
    if (!state.gpsStarted) setLiveDeparture();
    stopGpsWatch();
    state.gpsStarted = true; state.playing = true;
    const generation = state.gpsGeneration;
    ui.status.textContent = "Waiting for GPS";
    ui.gpsStatus.textContent = "Allow location access. Waiting for an accurate route position…";
    window.AppPwa?.setTripActive(true); updateControls(); updateMetrics();
    const active = () => state.playing && state.mode === "gps" && generation === state.gpsGeneration;
    try {
      const watch = navigator.geolocation.watchPosition(position => {
        if (!active()) return;
        const fix = state.gps.feed(position, Date.now());
        if (fix.ignored) return;
        ui.gpsStatus.setAttribute("data-ready", String(fix.accepted));
        if (!fix.accepted) { ui.gpsStatus.textContent = fix.reason; closeSuggestion(); updateGpsScreens(); return; }
        if (state.gps.state.fixes === 1) setLiveDeparture();
        state.distance = fix.progressMetres;
        drawPosition(); updateMetrics();
        ui.gpsStatus.textContent = `GPS ±${Math.round(fix.accuracy)} m · ${Math.round(fix.fromRouteMetres)} m from route. ${state.gps.state.startedNearOrigin ? "" : "Joined mid-route; this trip will not enter routine history."}${fix.speedMps >= state.settings.gps.movingMinimumMps ? "" : " Stop estimates use 15 km/h until moving speed is known."}`;
        ui.status.textContent = "GPS tracking active";
        updateGpsScreens();
        if (fix.completed) {
          if (fix.recordable) recordCompletedReplay("gps");
          else { state.tripRecorded = true; ui.gpsStatus.textContent += " Arrival detected; history was not saved because this was not a continuous trip from the start."; }
          pauseTrip(`Arrived at ${state.routeDetails.end?.mapLabel || "destination"}`); return;
        }
        if (!state.activeSuggestion && ![ui.foodDialog, ui.learningDialog, ui.orderDialog, ui.demoDialog, ui.setupDialog, ui.toolsDialog].some(dialog => dialog.open)) {
          const suggestion = window.SuggestionEngine.findLiveSuggestion(state.measuredCafes, tripContext(), state.settings, state.tripPreferences);
          if (suggestion) showSuggestion(suggestion);
        }
      }, error => {
        if (!active()) return;
        state.gps.unavailable("Location is temporarily unavailable."); closeSuggestion();
        if (error.code === 1) { pauseTrip("GPS permission denied"); if (!state.gps.state.last) state.gpsStarted = false; ui.gpsStatus.textContent = "Location permission denied. Allow location for this site in Chrome, then press Start GPS."; updateControls(); }
        else ui.gpsStatus.textContent = error.code === 3 ? "GPS timed out. Waiting for a fresh fix; alerts are suspended." : "Location unavailable. Waiting for GPS; alerts are suspended.";
        updateGpsScreens();
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: state.settings.gps.positionTimeoutMs });
      if (!active()) { navigator.geolocation.clearWatch(watch); return; }
      state.gpsWatch = watch;
      state.gpsHeartbeat = setInterval(() => {
        if (!active()) return;
        if (state.gps.state.last && !state.gps.isFresh(Date.now())) {
          state.gps.state.ready = false; ui.gpsStatus.setAttribute("data-ready", "false");
          ui.gpsStatus.textContent = "GPS is stale. Alerts are suspended until a fresh, accurate fix arrives."; closeSuggestion();
        }
        updateMetrics(); updateGpsScreens();
      }, 1000);
    } catch (error) { pauseTrip("GPS could not start"); ui.gpsStatus.textContent = "The browser could not start location tracking. Check site permissions or use Replay."; }
  }

  function updateGpsScreens() {
    updateMetrics();
    if (ui.foodDialog.open) renderFoodList();
    if (ui.orderDialog.open && !ui.orderEditor.hidden) renderOrderSummary();
    if (ui.learningDialog.open) renderLearning();
  }

  function routePlaces() {
    return {
      start: { name: state.routeDetails.start?.name || "Start", coordinates: state.route.points[0] },
      end: { name: state.routeDetails.end?.name || "Destination", coordinates: state.route.points[state.route.points.length - 1] }
    };
  }

  function routineContext() {
    return { ...routePlaces(), source: state.history.view, date: state.replayDate, departureMinutes: state.departureMinutes };
  }

  function persistHistory() {
    try {
      window.localStorage.setItem(state.historyKey, JSON.stringify(state.history));
      state.canPersistHistory = true;
    } catch (error) {
      state.canPersistHistory = false;
    }
  }

  function routineTitle(routine) {
    return `${routine.dayKind === "weekday" ? "Weekday" : "Weekend"} ${routine.period}`;
  }

  function selectedHistoryTrips() {
    return state.history.view === "sample" ? state.sampleTrips : state.history.trips.filter(trip => trip.source === state.history.view);
  }

  function refreshRoutines() {
    const trips = selectedHistoryTrips();
    state.routines = window.RoutineEngine.detectRoutines(trips, state.settings.routine, state.settings.timeFits);
    state.matchingRoutine = window.RoutineEngine.matchingRoutine(state.routines, routineContext(), state.settings.routine);
    const label = state.history.view === "sample" ? "Sample demo" : state.history.view === "gps" ? "GPS trips" : "Saved replays";
    const match = state.matchingRoutine;
    const message = match ? `${label} · ${routineTitle(match)} · around ${formatClock(match.departureMinutes)} ${state.settings.timeZoneLabel}`
      : state.routines.length ? `${label} · ${state.routines.length} routines · no match for this replay`
      : `${label} · no routine yet · ${trips.length} completed ${trips.length === 1 ? "trip" : "trips"}`;
    ui.routineStatus.textContent = state.canPersistHistory ? message : `${message} · session only`;
    ui.routineStatus.className = `routine-status${match ? " has-routine" : ""}${state.history.view === "sample" ? " sample" : ""}`;
  }

  function contextualRemark(candidate, priorStats) {
    return [window.RoutineEngine.routineRemark(state.matchingRoutine), window.FeedbackLearning.smartRemark(candidate, priorStats)].filter(Boolean).join(" ");
  }

  function recordCompletedReplay(source = "replay") {
    if (state.tripRecorded) return;
    const saved = window.RoutineEngine.addCompletedTrip(state.history, { ...routePlaces(), source, date: state.replayDate, departureMinutes: state.departureMinutes });
    if (!saved) return;
    state.tripRecorded = true;
    persistHistory();
    refreshRoutines();
    if (ui.learningDialog.open) renderLearning();
  }

  function renderRoutines() {
    const sample = state.history.view === "sample";
    const trips = selectedHistoryTrips();
    const gps = state.history.view === "gps";
    ui.useReplays.setAttribute("aria-pressed", String(state.history.view === "replay"));
    ui.useGps.setAttribute("aria-pressed", String(gps));
    ui.useSample.setAttribute("aria-pressed", String(sample));
    ui.useSample.disabled = state.sampleTrips.length === 0;
    ui.routineBasis.textContent = sample
      ? `${trips.length} synthetic trips for demonstration. Sample history contributes no Accept/Reject choices.`
      : `${trips.length} completed ${gps ? "GPS trips" : trips.length === 1 ? "replay" : "replays"} saved. A routine needs ${state.settings.routine.minimumTrips} matching trips in a ${state.settings.routine.maxDepartureSpanMinutes}-minute window. ${state.canPersistHistory ? "Saved on this browser." : "Available for this session only."}`;
    if (state.sampleError) ui.routineBasis.textContent += " Sample history could not load; saved replays still work.";
    ui.routineCards.replaceChildren();
    if (!state.routines.length) {
      ui.routineCards.appendChild(textElement("p", sample ? "No matching sample routine." : "No routine detected yet. Finish matching replays to build your history.", "empty-history"));
    }
    const sorted = state.routines.slice().sort((a, b) => Number(b.id === state.matchingRoutine?.id) - Number(a.id === state.matchingRoutine?.id) || a.departureMinutes - b.departureMinutes);
    sorted.forEach(routine => {
      const card = document.createElement("article");
      card.className = `routine-card${routine.id === state.matchingRoutine?.id ? " matches" : ""}`;
      card.dataset.routineId = routine.id;
      card.appendChild(textElement("p", sample ? "Sample demo" : gps ? "From completed GPS trips" : "From completed replays", "routine-source"));
      card.appendChild(textElement("h3", routineTitle(routine)));
      card.appendChild(textElement("p", `${routine.start.name} → ${routine.end.name}`));
      card.appendChild(textElement("p", `Around ${formatClock(routine.departureMinutes)} ${state.settings.timeZoneLabel} · ${routine.count} matching trips on ${routine.distinctDates} ${routine.distinctDates === 1 ? "date" : "dates"}`));
      card.appendChild(textElement("p", `Departure window ${formatClock(routine.window.start)}–${formatClock(routine.window.end)} · ${routine.window.span} min span`));
      if (routine.id === state.matchingRoutine?.id) card.appendChild(textElement("p", "Matches this trip", "preferred-label"));
      ui.routineCards.appendChild(card);
    });
    ui.historyTitle.textContent = `${sample ? "Sample demo trips" : gps ? "Completed GPS history" : "Completed replay history"} (${trips.length})`;
    ui.historyList.replaceChildren();
    const ordered = trips.slice().sort((a, b) => b.date.localeCompare(a.date) || b.departureMinutes - a.departureMinutes);
    if (!ordered.length) ui.historyList.appendChild(textElement("li", gps ? "A continuous, reliable GPS trip from the start is added after confirmed arrival." : "A trip is added when replay reaches the destination.", "empty-history"));
    ordered.forEach(trip => {
      const item = document.createElement("li");
      item.dataset.tripId = trip.id;
      const date = window.RoutineEngine.dateParts(trip.date);
      item.appendChild(textElement("h3", `${date.dayName}, ${trip.date} · ${formatClock(trip.departureMinutes)} ${state.settings.timeZoneLabel}`));
      item.appendChild(textElement("p", `${trip.start.name} → ${trip.end.name}`));
      item.appendChild(textElement("p", trip.source === "sample" ? "Synthetic sample trip" : trip.source === "gps" ? "Completed GPS trip" : "Completed replay"));
      ui.historyList.appendChild(item);
    });
  }

  function setRoutineSource(source) {
    if (source === "sample" && state.sampleTrips.length === 0) return;
    state.history.view = source;
    persistHistory();
    refreshRoutines();
    if (ui.learningDialog.open) renderLearning();
    if (ui.foodDialog.open) renderFoodList();
  }

  function updateSelectedStops() {
    ui.selectedStop.hidden = state.acceptedStops.length === 0;
    ui.selectedStop.textContent = state.acceptedStops.length ? `Selected stops: ${state.acceptedStops.map(stop => `${stop.name} (+${formatExtra(stop.extraMinutes)} estimated travel)`).join("; ")}` : "";
  }

  function showFeedbackNotice(message) {
    clearTimeout(state.feedbackTimer);
    ui.feedbackNotice.textContent = message;
    ui.feedbackNotice.hidden = false;
    state.feedbackTimer = setTimeout(() => { ui.feedbackNotice.hidden = true; state.feedbackTimer = null; }, 6000);
  }

  function recordVenueChoice(cafeId, choice) {
    const measured = state.measuredCafes.find(item => item.cafe.id === cafeId);
    if (!measured) return false;
    const context = { ...tripContext(), acceptedStops: state.acceptedStops.filter(stop => stop.cafeId !== cafeId) };
    const candidate = window.SuggestionEngine.scoreCafe(measured, context, state.settings, state.tripPreferences);
    if (choice === "accept" && !candidate.available) return false;
    const changed = window.FeedbackLearning.recordFeedback(state.profile, state.tripId, measured.cafe, choice, candidate.timeBand);
    if (!changed) return false;
    state.acceptedStops = state.acceptedStops.filter(stop => stop.cafeId !== cafeId);
    if (choice === "accept") {
      state.dismissedCafeIds.delete(cafeId);
      state.acceptedStops.push({ cafeId, name: measured.cafe.name, alongRouteMetres: measured.alongRouteMetres, extraMinutes: candidate.extraMinutes });
    } else state.dismissedCafeIds.add(cafeId);
    if (choice === "reject") state.orders = state.orders.filter(order => order.cafeId !== cafeId);
    state.seenCafeIds.add(cafeId);
    persistLearning();
    showFeedbackNotice(`${choice === "accept" ? "Accepted" : "Rejected"} ${measured.cafe.name}. ${state.canPersist ? "Choice saved on this device." : "Session only; browser storage is unavailable."}`);
    updateLearningStatus();
    updateSelectedStops();
    updateMetrics();
    if (ui.foodDialog.open) renderFoodList();
    if (ui.learningDialog.open) renderLearning();
    resizeMap();
    return true;
  }

  function renderFoodList() {
    const prefs = window.FeedbackLearning.preferences(learningStats());
    const prior = learningStats(true);
    // Every venue is kept in the list. A low score does not hide a choice.
    const candidates = state.measuredCafes.map(measured => {
      const context = { ...tripContext(), acceptedStops: state.acceptedStops.filter(stop => stop.cafeId !== measured.cafe.id) };
      return window.SuggestionEngine.scoreCafe(measured, context, state.settings, prefs);
    });
    if (state.personalized) candidates.sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || a.alongRouteMetres - b.alongRouteMetres);
    else candidates.sort((a, b) => a.alongRouteMetres - b.alongRouteMetres);
    const bestId = state.personalized ? candidates.find(candidate => candidate.available)?.cafe.id : null;
    ui.foodList.replaceChildren();
    candidates.forEach(candidate => {
      const cafe = candidate.cafe;
      const item = document.createElement("li");
      item.dataset.cafeId = cafe.id;
      item.className = `food-item${cafe.id === bestId ? " preferred" : ""}`;
      if (cafe.id === bestId) item.appendChild(textElement("p", "Most preferred available stop", "preferred-label"));
      item.appendChild(textElement("h3", cafe.name));
      item.appendChild(textElement("p", `${cafe.categoryLabel} · ${cafe.rating.toFixed(1)}/5 · ${cafe.priceLevel}`));
      item.appendChild(textElement("p", `${Math.round(candidate.fromRouteMetres)} m from route · ${Math.round(candidate.alongRouteMetres)} m along route from start`));
      item.appendChild(textElement("p", `${candidate.openNow ? "Open" : "Closed"} at trip clock · ${cafe.opens}–${cafe.closes} · approx. +${formatExtra(candidate.extraMinutes)} extra travel`));
      item.appendChild(textElement("p", `Score ${candidate.score.toFixed(3)} / 1`, "food-score"));
      item.appendChild(textElement("p", contextualRemark(candidate, prior)));
      if (!candidate.available) item.appendChild(textElement("p", candidate.availabilityReason, "food-exclusion"));
      const selected = window.FeedbackLearning.currentChoice(state.profile, state.tripId, cafe.id);
      if (selected) item.appendChild(textElement("p", `${selected === "accept" ? "Accepted" : "Rejected"} this trip · feedback recorded`, "food-score"));
      const buttons = document.createElement("div");
      buttons.className = "food-choice-buttons";
      for (const choice of ["accept", "reject"]) {
        const button = textElement("button", choice === "accept" ? "Accept" : "Reject");
        button.type = "button";
        button.dataset.choice = choice;
        button.setAttribute("aria-label", `${choice === "accept" ? "Accept" : "Reject"} ${cafe.name}`);
        button.setAttribute("aria-pressed", String(selected === choice));
        button.disabled = selected === choice || (choice === "accept" && !candidate.available);
        button.addEventListener("click", () => recordVenueChoice(cafe.id, choice));
        buttons.appendChild(button);
      }
      item.appendChild(buttons);
      const menuButton = textElement("button", state.orders.some(order => order.cafeId === cafe.id) ? "View demo pre-order" : "Menu & pre-order · demo", "preorder-button");
      menuButton.type = "button";
      menuButton.dataset.menuCafeId = cafe.id;
      menuButton.addEventListener("click", () => openOrder(cafe.id));
      item.appendChild(menuButton);
      const details = document.createElement("details");
      details.appendChild(textElement("summary", "Score breakdown"));
      details.appendChild(textElement("p", scoreExplanation(candidate)));
      item.appendChild(details);
      ui.foodList.appendChild(item);
    });
    const used = state.acceptedStops.reduce((sum, stop) => sum + stop.extraMinutes, 0);
    ui.foodContext.textContent = `v${CONFIG.buildVersion} · ${cafeRecords().length} stops · ${formatClock(window.SuggestionEngine.tripClockMinutes(tripContext()))} ${state.settings.timeZoneLabel} · ${Math.max(0, state.slackMinutes - used).toFixed(1)} min spare. Preselection is optional. ${state.mode === "gps" ? "Start GPS and allow location to receive live alerts." : "Start replay to receive alerts as you approach."} ${state.personalized ? "Your saved preferences order the list; all stops remain visible." : "Accept or Reject on a pop-up to teach your preferences."}`;
    ui.startReplay.textContent = state.mode === "gps" ? state.playing ? "Return to GPS" : "Start GPS" : state.distance >= state.route.totalMetres ? "Replay trip" : state.distance > 0 ? "Resume replay" : "Start replay";
  }

  // Opening setup/tools never interrupts a live GPS trip. Replay resumes when
  // the passenger closes a panel, unless it was backgrounded in the meantime.
  function leaveCompactPanels() {
    const resume = state.resumeAfterSettings || state.resumeAfterTools;
    state.resumeAfterSettings = state.resumeAfterTools = false;
    if (ui.setupDialog.open) ui.setupDialog.close();
    if (ui.toolsDialog.open) ui.toolsDialog.close();
    return resume;
  }

  function openCompactPanel(dialog, resumeKey) {
    if (!state.settings || dialog.open) return;
    const resume = state.playing || state.resumeAfterFoodList || state.resumeAfterLearning || state.resumeAfterOrder || state.resumeAfterDemo || state.resumeAfterSettings || state.resumeAfterTools;
    closeSuggestion();
    for (const panel of [ui.setupDialog, ui.toolsDialog, ui.foodDialog, ui.learningDialog, ui.orderDialog, ui.demoDialog]) if (panel.open) panel.close();
    state.resumeAfterFoodList = state.resumeAfterLearning = state.resumeAfterOrder = state.resumeAfterDemo = state.resumeAfterSettings = state.resumeAfterTools = false;
    if (state.playing && state.mode === "replay") pauseTrip("Viewing trip settings and tools");
    state[resumeKey] = resume;
    updateControls(); updateMetrics();
    dialog.showModal();
  }

  function closeCompactPanel(dialog, resumeKey) {
    if (!dialog.open) return;
    dialog.close();
    const resume = state[resumeKey]; state[resumeKey] = false;
    if (resume && !document.hidden) playTrip();
  }

  function openSettings() { openCompactPanel(ui.setupDialog, "resumeAfterSettings"); }
  function closeSettings() { closeCompactPanel(ui.setupDialog, "resumeAfterSettings"); }
  function openTools() { openCompactPanel(ui.toolsDialog, "resumeAfterTools"); }
  function closeTools() { closeCompactPanel(ui.toolsDialog, "resumeAfterTools"); }

  function openFoodList() {
    if (!state.settings || ui.foodDialog.open) return;
    closeSuggestion();
    const resume = leaveCompactPanels();
    state.resumeAfterFoodList = state.playing || resume;
    if (state.playing && state.mode === "replay") pauseTrip("Browsing food spots");
    updateControls();
    renderFoodList();
    ui.foodDialog.showModal();
  }

  function closeFoodList() {
    if (!ui.foodDialog.open) return;
    ui.foodDialog.close();
    const resume = state.resumeAfterFoodList;
    state.resumeAfterFoodList = false;
    if (resume && !document.hidden) playTrip();
  }

  function renderLearning() {
    const stats = learningStats();
    ui.learningSummary.textContent = `${stats.feedbackTrips} feedback ${stats.feedbackTrips === 1 ? "trip" : "trips"} recorded. Each venue contributes one final choice per trip. ${state.canPersist ? "Saved on this browser." : "Available for this session only."}`;
    renderRoutines();
    const draw = (parent, title, entries) => {
      parent.replaceChildren();
      parent.appendChild(textElement("h3", title, "learning-section-title"));
      entries.forEach(({ label, id, entry }) => {
        const row = document.createElement("div");
        row.className = "learning-row";
        row.dataset.preferenceId = id;
        row.appendChild(textElement("h3", label));
        row.appendChild(textElement("p", `Preference ${entry.affinity.toFixed(2)} · ${entry.accepts} accepted · ${entry.rejects} rejected`));
        const bar = document.createElement("progress");
        bar.max = 1; bar.value = entry.affinity;
        bar.setAttribute("aria-label", `${label} preference`);
        row.appendChild(bar);
        parent.appendChild(row);
      });
    };
    draw(ui.categoryLearning, "Categories", Object.entries(stats.categories).map(([id, entry]) => ({ id, label: id[0].toUpperCase() + id.slice(1), entry })));
    draw(ui.venueLearning, "Food spots", cafeRecords().map(cafe => ({ id: cafe.id, label: cafe.name, entry: stats.venues[cafe.id] })));
  }

  function openLearning() {
    closeSuggestion();
    const resume = leaveCompactPanels();
    state.resumeAfterLearning = state.playing || resume;
    if (state.playing && state.mode === "replay") pauseTrip("Viewing learned preferences");
    renderLearning();
    ui.learningDialog.showModal();
  }

  function closeLearning() {
    if (!ui.learningDialog.open) return;
    ui.learningDialog.close();
    const resume = state.resumeAfterLearning;
    state.resumeAfterLearning = false;
    if (resume && !document.hidden) playTrip();
  }

  function resetLearning() {
    state.pendingBackup = null;
    ui.confirmRestore.hidden = true;
    state.profile = window.FeedbackLearning.emptyProfile();
    state.history = window.RoutineEngine.emptyHistory();
    if (state.mode === "gps") state.history.view = "gps";
    persistHistory();
    refreshRoutines();
    resetTrip(true);
  }

  function orderCandidate(cafeId) {
    const measured = state.measuredCafes.find(item => item.cafe.id === cafeId);
    if (!measured) return null;
    const context = { ...tripContext(), acceptedStops: state.acceptedStops.filter(stop => stop.cafeId !== cafeId) };
    return window.SuggestionEngine.scoreCafe(measured, context, state.settings, state.tripPreferences);
  }

  function renderReceipt(order) {
    ui.orderEditor.hidden = true;
    ui.orderReceipt.hidden = false;
    ui.orderReceipt.replaceChildren();
    ui.orderReceipt.appendChild(textElement("h3", "Demo pre-order confirmed"));
    ui.orderReceipt.appendChild(textElement("p", `Reference ${order.id}`));
    order.lines.forEach(line => ui.orderReceipt.appendChild(textElement("p", `${line.quantity} × ${line.name} · ₹${line.subtotal}`)));
    ui.orderReceipt.appendChild(textElement("p", `Demo total ₹${order.total}`, "cart-total"));
    ui.orderReceipt.appendChild(textElement("p", `Ready by estimated arrival ${formatClock(order.arrivalMinutes)} ${state.settings.timeZoneLabel}${order.dayOffset ? " · next day" : ""}`));
    ui.orderReceipt.appendChild(textElement("p", "Simulated confirmation only. Nothing was sent to the cafe. No payment was taken."));
    ui.orderReceipt.appendChild(textElement("p", "This stop is accepted for this trip. Menu preparation and waiting time are not modelled."));
  }

  function renderOrder() {
    const candidate = orderCandidate(state.orderCafeId);
    if (!candidate) return;
    const cafe = candidate.cafe;
    ui.orderTitle.textContent = cafe.name;
    ui.orderContext.textContent = `${cafe.categoryLabel} · ${cafe.opens}–${cafe.closes} · ${state.mode === "gps" ? state.playing ? "GPS continues while browsing" : "GPS is paused" : "replay paused while browsing"}`;
    const saved = state.orders.find(order => order.cafeId === cafe.id);
    if (saved) { renderReceipt(saved); return; }
    ui.orderEditor.hidden = false;
    ui.orderReceipt.hidden = true;
    ui.orderMenu.replaceChildren();
    window.OrderEngine.catalogue(cafe).forEach((item, index) => {
      const row = document.createElement("li"); row.dataset.menuIndex = String(index);
      row.appendChild(textElement("h3", item.name));
      row.appendChild(textElement("p", `Supplied range ₹${item.priceMin}–₹${item.priceMax} · demo unit price ₹${item.price}`));
      const controls = document.createElement("div"); controls.className = "quantity-controls";
      for (const delta of [-1, 1]) {
        const button = textElement("button", delta === -1 ? "−" : "+");
        button.type = "button"; button.dataset.delta = String(delta);
        button.setAttribute("aria-label", `${delta === -1 ? "Remove one" : "Add one"} ${item.name}`);
        button.disabled = delta === -1 ? state.orderQuantities[index] === 0 : state.orderQuantities[index] >= window.OrderEngine.MAX_QUANTITY;
        button.addEventListener("click", () => {
          state.orderQuantities[index] = Math.max(0, Math.min(window.OrderEngine.MAX_QUANTITY, state.orderQuantities[index] + delta));
          // Keep keyboard focus on the same quantity action after updating the cart.
          renderOrder();
          const newRow = ui.orderMenu.children[index];
          const group = newRow?.querySelector("div");
          const replacement = group?.children[delta === -1 ? 0 : 2];
          if (replacement && !replacement.disabled) replacement.focus();
        });
        if (delta === 1) {
          const quantity = textElement("output", String(state.orderQuantities[index]));
          quantity.setAttribute("aria-label", `Quantity for ${item.name}`);
          controls.appendChild(quantity);
        }
        controls.appendChild(button);
      }
      row.appendChild(controls); ui.orderMenu.appendChild(row);
    });
    renderOrderSummary(candidate);
  }

  function renderOrderSummary(candidate = orderCandidate(state.orderCafeId)) {
    if (!candidate) return;
    const cart = window.OrderEngine.cart(candidate.cafe, state.orderQuantities);
    ui.cartLines.replaceChildren();
    cart.lines.forEach(item => ui.cartLines.appendChild(textElement("li", `${item.quantity} × ${item.name} · ₹${item.subtotal}`)));
    if (!cart.lines.length) ui.cartLines.appendChild(textElement("li", "Your cart is empty."));
    ui.cartTotal.textContent = `Demo total ₹${cart.total}`;
    if (candidate.available) {
      const ready = window.OrderEngine.arrival(candidate);
      const speedLabel = state.mode === "gps" ? state.gps?.state.speedMps >= state.settings.gps.movingMinimumMps ? "measured speed" : "assumed 15 km/h" : "simulated speed";
      ui.orderArrival.textContent = `Ready by estimated arrival ${formatClock(ready.minutes)} ${state.settings.timeZoneLabel}${ready.dayOffset ? " · next day" : ""} · ${formatDuration(ready.secondsAway)} away at ${speedLabel}`;
    } else ui.orderArrival.textContent = "Pre-order unavailable for this replay.";
    ui.orderError.textContent = candidate.available ? "" : candidate.availabilityReason;
    ui.confirmOrder.disabled = !candidate.available || cart.quantity === 0;
  }

  function openOrder(cafeId) {
    const candidate = orderCandidate(cafeId);
    if (!candidate || ui.orderDialog.open) return;
    state.orderReturn = ui.foodDialog.open ? "food" : ui.demoDialog.open ? "demo" : "trip";
    state.resumeAfterOrder = state.playing || state.resumeAfterFoodList || state.resumeAfterDemo;
    state.resumeAfterFoodList = false; state.resumeAfterDemo = false;
    if (ui.foodDialog.open) ui.foodDialog.close();
    if (ui.demoDialog.open) ui.demoDialog.close();
    closeSuggestion();
    if (state.mode === "replay") pauseTrip("Browsing simulated pre-order");
    state.orderCafeId = cafeId;
    state.orderQuantities = candidate.cafe.menu.map(() => 0);
    renderOrder(); ui.orderDialog.showModal();
  }

  function closeOrder() {
    if (!ui.orderDialog.open) return;
    ui.orderDialog.close();
    const resume = state.resumeAfterOrder; state.resumeAfterOrder = false;
    if (state.orderReturn === "food") { openFoodList(); state.resumeAfterFoodList = resume; }
    else if (state.orderReturn === "demo") { openDemo(); state.resumeAfterDemo = resume; }
    else if (resume && !document.hidden) playTrip();
  }

  function confirmOrder() {
    if (ui.confirmOrder.disabled || state.orders.some(order => order.cafeId === state.orderCafeId)) return;
    try {
      const candidate = orderCandidate(state.orderCafeId);
      const order = window.OrderEngine.confirm(candidate.cafe, state.orderQuantities, candidate, state.tripId, state.replayDate);
      const chosen = window.FeedbackLearning.currentChoice(state.profile, state.tripId, candidate.cafe.id);
      if (chosen !== "accept" && !recordVenueChoice(candidate.cafe.id, "accept")) throw new Error("This stop cannot be accepted now.");
      state.orders.push(order);
      ui.confirmOrder.disabled = true;
      renderReceipt(order);
    } catch (error) { ui.orderError.textContent = error.message; }
  }

  function openDemo() {
    if (!state.settings || ui.demoDialog.open) return;
    closeSuggestion();
    const resume = leaveCompactPanels();
    state.resumeAfterDemo = state.playing || resume;
    if (state.playing && state.mode === "replay") pauseTrip("Browsing demo controls");
    ui.demoSample.disabled = state.sampleTrips.length === 0;
    ui.demoOrders.replaceChildren();
    state.orders.forEach(order => {
      const item = document.createElement("li");
      item.appendChild(textElement("p", `${order.cafeName} · ₹${order.total} · ready by ${formatClock(order.arrivalMinutes)} ${state.settings.timeZoneLabel}`));
      const button = textElement("button", "View demo confirmation", "preorder-button");
      button.type = "button"; button.addEventListener("click", () => openOrder(order.cafeId));
      item.appendChild(button); ui.demoOrders.appendChild(item);
    });
    if (!state.orders.length) ui.demoOrders.appendChild(textElement("li", "No demo pre-orders on this replay."));
    ui.demoDialog.showModal();
  }

  function closeDemo() {
    if (!ui.demoDialog.open) return;
    ui.demoDialog.close();
    const resume = state.resumeAfterDemo; state.resumeAfterDemo = false;
    if (resume && !document.hidden) playTrip();
  }

  function loadSampleDemo() {
    if (!state.sampleTrips.length) return;
    pauseTrip("Loading sample replay"); state.mode = "replay";
    resetTrip(false);
    ui.replayDate.value = state.sampleTrips.find(trip => window.RoutineEngine.dayKind(trip.date) === "weekday")?.date || state.sampleTrips[0].date;
    ui.departure.value = "11:10"; ui.slack.value = "5";
    updateTripContext(); setRoutineSource("sample"); openLearning();
  }

  function saveBackup() {
    const data = window.HistoryBackup.make(state.routeDetails.id || "fixed-route", state.profile, state.history);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `InVehicle_History_${todayInIndia()}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui.backupStatus.textContent = "History backup download started. Keep this file for your new app address.";
  }

  async function chooseBackup() {
    state.pendingBackup = null; ui.confirmRestore.hidden = true;
    const file = ui.restoreBackup.files?.[0];
    if (!file) return;
    try {
      if (file.size > window.HistoryBackup.MAX_BYTES) throw new Error("Choose a backup smaller than 5 MB.");
      const data = window.HistoryBackup.read(await file.text(), state.routeDetails.id || "fixed-route", cafeRecords(), window.FeedbackLearning, window.RoutineEngine);
      state.pendingBackup = data;
      const stats = window.FeedbackLearning.statistics(data.profile, cafeRecords(), state.settings);
      const gpsCount = data.history.trips.filter(trip => trip.source === "gps").length;
      const tripDescription = gpsCount ? `trips (${gpsCount} GPS, ${data.history.trips.length - gpsCount} replays)` : "replays";
      ui.backupStatus.textContent = `Backup contains ${data.history.trips.length} completed ${tripDescription} and ${stats.feedbackTrips} feedback trips. Restoring replaces the history at this address.`;
      ui.confirmRestore.hidden = false;
    } catch (error) { ui.backupStatus.textContent = error.message; }
    ui.restoreBackup.value = "";
  }

  function restoreBackup() {
    if (!state.pendingBackup) return;
    state.profile = state.pendingBackup.profile; state.history = state.pendingBackup.history;
    state.pendingBackup = null; ui.confirmRestore.hidden = true;
    persistLearning(); persistHistory(); refreshRoutines(); resetTrip(true);
    ui.backupStatus.textContent = "History restored. This replay starts fresh with your saved preferences.";
  }

  function showSuggestion(candidate) {
    closeSuggestion();
    state.activeSuggestion = candidate;
    state.seenCafeIds.add(candidate.cafe.id);
    state.popupCount++;
    state.lastPopupMetres = state.distance;
    ui.suggestionName.textContent = candidate.cafe.name;
    ui.suggestionHeading.textContent = state.personalized ? "A preferred stop along your route" : "A stop along your route";
    ui.suggestionCategory.textContent = candidate.cafe.categoryLabel;
    ui.suggestionOpen.textContent = "Open at arrival";
    ui.suggestionRating.textContent = `★ ${candidate.cafe.rating.toFixed(1)}/5`;
    ui.suggestionDetour.textContent = `Approx. +${formatExtra(candidate.extraMinutes)}`;
    ui.suggestionAhead.textContent = `${Math.round(candidate.alongRouteMetres - state.distance)} m ahead`;
    ui.suggestionReason.textContent = contextualRemark(candidate, learningStats(true));
    ui.suggestionBreakdown.textContent = scoreExplanation(candidate);
    ui.accept.disabled = !candidate.available;
    ui.preorder.disabled = !candidate.available;
    ui.alertCloseNote.textContent = `Closes after ${state.settings.alertTimeoutSeconds} seconds. Closing does not record a rejection.`;
    const details = ui.suggestionDialog.querySelector("details");
    if (details) details.open = false;
    // show(), unlike showModal(), does not lock the rest of the screen.
    // Replay keeps moving while the passenger considers this optional card.
    ui.suggestionDialog.show();
    state.alertTimer = setTimeout(closeSuggestion, state.settings.alertTimeoutSeconds * 1000);
  }

  function closeSuggestion() {
    clearTimeout(state.alertTimer);
    state.alertTimer = null;
    state.activeSuggestion = null;
    state.swipeStart = null;
    if (ui.suggestionDialog.open) ui.suggestionDialog.close();
    // A close, timeout, outside tap or swipe gives no preference feedback.
  }

  function finishSuggestion(choice) {
    const candidate = state.activeSuggestion;
    if (!candidate) return;
    if (!recordVenueChoice(candidate.cafe.id, choice)) {
      const saved = window.FeedbackLearning.currentChoice(state.profile, state.tripId, candidate.cafe.id);
      showFeedbackNotice(saved === choice ? "This choice is already saved for this trip." : "Choice was not saved. Open All stops to check availability.");
    }
    closeSuggestion();
  }

  function updateTripContext() {
    if (!state.settings || state.distance !== 0 || state.playing || (state.mode === "gps" && state.gpsStarted)) return;
    try {
      const departure = window.SuggestionEngine.clockMinutes(ui.departure.value);
      const replayDate = ui.replayDate.value;
      if (!window.RoutineEngine.dateParts(replayDate)) throw new Error("Choose a valid replay date.");
      const slack = Number(ui.slack.value);
      if (!ui.slack.value.trim() || !Number.isFinite(slack) || slack < 0 || slack > 30) throw new Error("Use spare time from 0 to 30 minutes.");
      state.departureMinutes = departure;
      state.slackMinutes = slack;
      state.replayDate = replayDate;
      const trip = state.profile.trips.find(item => item.id === state.tripId);
      if (trip) trip.departureMinutes = state.departureMinutes;
      persistLearning();
      refreshRoutines();
      updateMetrics();
      if (ui.foodDialog.open) renderFoodList();
      if (ui.learningDialog.open) renderLearning();
    } catch (error) {
      ui.departure.value = formatClock(state.departureMinutes);
      ui.slack.value = String(state.slackMinutes);
      ui.replayDate.value = state.replayDate;
      ui.status.textContent = "Use a valid date, time and 0–30 min spare time.";
    }
  }

  ui.play.addEventListener("click", () => state.playing ? pauseTrip() : playTrip());
  ui.openSettings.addEventListener("click", openSettings);
  ui.closeSettings.addEventListener("click", closeSettings);
  ui.setupStart.addEventListener("click", () => { leaveCompactPanels(); playTrip(); });
  ui.setupStops.addEventListener("click", openFoodList);
  ui.openTools.addEventListener("click", openTools);
  ui.closeTools.addEventListener("click", closeTools);
  ui.fitRoute.addEventListener("click", fitRoute);
  ui.reset.addEventListener("click", () => resetTrip(true));
  ui.foodButton.addEventListener("click", openFoodList);
  ui.closeFood.addEventListener("click", closeFoodList);
  ui.accept.addEventListener("click", () => finishSuggestion("accept"));
  ui.dismiss.addEventListener("click", () => finishSuggestion("reject"));
  ui.closeSuggestion.addEventListener("click", closeSuggestion);
  ui.nextTrip.addEventListener("click", () => resetTrip(true));
  ui.startReplay.addEventListener("click", () => state.mode === "gps" && state.playing ? closeFoodList() : playTrip());
  ui.learningButton.addEventListener("click", openLearning);
  ui.closeLearning.addEventListener("click", closeLearning);
  ui.resetLearning.addEventListener("click", resetLearning);
  ui.departure.addEventListener("change", updateTripContext);
  ui.slack.addEventListener("change", updateTripContext);
  ui.replayDate.addEventListener("change", updateTripContext);
  ui.useReplays.addEventListener("click", () => setRoutineSource("replay"));
  ui.useSample.addEventListener("click", () => setRoutineSource("sample"));
  ui.useGps.addEventListener("click", () => setRoutineSource("gps"));
  ui.replayMode.addEventListener("click", () => setMode("replay"));
  ui.gpsMode.addEventListener("click", () => setMode("gps"));
  ui.preorder.addEventListener("click", () => { if (state.activeSuggestion) openOrder(state.activeSuggestion.cafe.id); });
  ui.closeOrder.addEventListener("click", closeOrder);
  ui.confirmOrder.addEventListener("click", confirmOrder);
  ui.demoButton.addEventListener("click", openDemo);
  ui.closeDemo.addEventListener("click", closeDemo);
  ui.demoResetTrip.addEventListener("click", () => resetTrip(true));
  ui.demoSample.addEventListener("click", loadSampleDemo);
  ui.demoResetLearning.addEventListener("click", resetLearning);
  ui.saveBackup.addEventListener("click", saveBackup);
  ui.restoreBackup.addEventListener("change", chooseBackup);
  ui.confirmRestore.addEventListener("click", restoreBackup);
  ui.foodDialog.addEventListener("cancel", event => { event.preventDefault(); closeFoodList(); });
  ui.learningDialog.addEventListener("cancel", event => { event.preventDefault(); closeLearning(); });
  ui.orderDialog.addEventListener("cancel", event => { event.preventDefault(); closeOrder(); });
  ui.demoDialog.addEventListener("cancel", event => { event.preventDefault(); closeDemo(); });
  ui.setupDialog.addEventListener("cancel", event => { event.preventDefault(); closeSettings(); });
  ui.toolsDialog.addEventListener("cancel", event => { event.preventDefault(); closeTools(); });
  ui.suggestionDialog.addEventListener("cancel", event => { event.preventDefault(); closeSuggestion(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && ui.suggestionDialog.open) { event.preventDefault(); closeSuggestion(); }
  });
  document.addEventListener("pointerdown", event => {
    if (ui.suggestionDialog.open && !ui.suggestionDialog.contains(event.target)) closeSuggestion();
  }, true);
  for (const dialog of [ui.foodDialog, ui.learningDialog, ui.orderDialog, ui.demoDialog, ui.setupDialog, ui.toolsDialog]) {
    dialog.addEventListener("click", event => {
      // A native modal's backdrop reports the dialog itself as the target.
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) {
        if (dialog === ui.foodDialog) closeFoodList();
        else if (dialog === ui.orderDialog) closeOrder();
        else if (dialog === ui.demoDialog) closeDemo();
        else if (dialog === ui.setupDialog) closeSettings();
        else if (dialog === ui.toolsDialog) closeTools();
        else closeLearning();
      }
    });
  }
  ui.suggestionHandle.addEventListener("touchstart", event => { state.swipeStart = event.touches[0]?.clientY ?? null; }, { passive: true });
  ui.suggestionHandle.addEventListener("touchend", event => {
    const end = event.changedTouches[0]?.clientY;
    if (state.swipeStart !== null && end - state.swipeStart > 50) closeSuggestion();
    state.swipeStart = null;
  }, { passive: true });
  ui.speeds.forEach(button => button.addEventListener("click", () => {
    state.multiplier = Number(button.dataset.speed);
    // Start the next frame's time measurement afresh when changing speed.
    state.lastTimestamp = null;
    updateControls();
  }));
  // Switching away from the page pauses replay, avoiding a jump on return.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) state.resumeAfterSettings = state.resumeAfterTools = false;
    if (document.hidden) closeSuggestion();
    if (document.hidden && state.playing) pauseTrip("Paused while app was hidden");
  });
  window.addEventListener("pagehide", () => { closeSuggestion(); if (state.playing) pauseTrip(); });
  window.addEventListener("offline", () => { if (state.map && state.tileLayer) usePlainLeafletMap(); });
  window.addEventListener("resize", resizeMap);

  async function initialise() {
    try {
      if (location.protocol === "file:") {
        throw new Error("Run this folder with a local web server, then open http://localhost:8000. See README.md for the exact steps.");
      }
      if (!window.SuggestionEngine || !window.FeedbackLearning || !window.RoutineEngine || !window.GpsEngine || !window.OrderEngine || !window.HistoryBackup) throw new Error("Keep all the JavaScript files beside index.html, then reload.");
      const loadJson = async file => {
        const response = await fetch(file, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not open ${file} (HTTP ${response.status}). Keep the data folder beside index.html.`);
        return response.json();
      };
      const [data, cafeData, settings, historyData] = await Promise.all([
        loadJson(CONFIG.routeFile), loadJson(CONFIG.cafesFile), loadJson(CONFIG.settingsFile),
        loadJson(CONFIG.historyFile).catch(error => { state.sampleError = error.message; return { trips: [] }; })
      ]);
      state.route = prepareRoute(data.points);
      state.routeDetails = data;
      state.settings = window.SuggestionEngine.validateSettings(settings);
      window.RoutineEngine.validateSettings(settings.routine);
      window.GpsEngine.validateSettings(settings.gps);
      state.gps = window.GpsEngine.create(state.route, settings.gps, distanceMetres, window.SuggestionEngine.measureCafe);
      const cafes = window.SuggestionEngine.validateCafes(cafeData).filter(cafe => !CONFIG.removedCafeIds.includes(cafe.id));
      cafes.forEach(cafe => window.OrderEngine.catalogue(cafe));
      state.measuredCafes = cafes.map(cafe => window.SuggestionEngine.measureCafe(cafe, state.route, distanceMetres));
      state.departureMinutes = window.SuggestionEngine.clockMinutes(settings.departureTime);
      state.slackMinutes = settings.tripSlackMinutes;
      state.replayDate = todayInIndia();
      ui.departure.value = settings.departureTime;
      ui.slack.value = String(settings.tripSlackMinutes);
      ui.replayDate.value = state.replayDate;
      ui.timeZone.textContent = settings.timeZoneLabel;
      ui.foodButton.textContent = `All stops · ${cafes.length}`;
      ui.buildVersion.textContent = `v${CONFIG.buildVersion}`;
      state.storageKey = `invehicle.learning.v1.${data.id || "fixed-route"}`;
      state.historyKey = `invehicle.routines.v2.${data.id || "fixed-route"}`;
      state.sampleTrips = window.RoutineEngine.normaliseTrips(historyData?.trips, "sample");
      try {
        state.profile = window.FeedbackLearning.normaliseProfile(JSON.parse(window.localStorage.getItem(state.storageKey) || "null"), cafes);
      } catch (error) {
        state.profile = window.FeedbackLearning.emptyProfile();
      }
      try {
        const retained = window.localStorage.getItem(state.historyKey) ?? window.localStorage.getItem(`invehicle.routines.v1.${data.id || "fixed-route"}`);
        state.history = window.RoutineEngine.normaliseHistory(JSON.parse(retained || "null"));
      } catch (error) {
        state.history = window.RoutineEngine.emptyHistory();
      }
      if (state.sampleTrips.length === 0 && state.history.view === "sample") state.history.view = "replay";
      persistHistory();
      refreshRoutines();
      beginLearningTrip();
      ui.destination.textContent = data.end?.name || "Destination";
      ui.origin.textContent = `From ${data.start?.name || "Start"}`;
      ui.simulatedSpeed.textContent = `${CONFIG.simulatedSpeedKmh} km/h simulated`;
      resizeMap();
      if (window.L) {
        try {
          drawLeafletMap();
        } catch (error) {
          console.warn("Leaflet could not draw the map; using the route outline.", error);
          clearTimeout(state.tileTimer);
          if (state.map) state.map.remove();
          state.map = null;
          drawFallback();
        }
      } else drawFallback();
      resizeMap();
      ui.play.disabled = false;
      ui.reset.disabled = false;
      ui.foodButton.disabled = false;
      ui.closeFood.disabled = false;
      ui.accept.disabled = false;
      ui.dismiss.disabled = false;
      ui.learningButton.disabled = false;
      ui.demoButton.disabled = false;
      ui.startReplay.disabled = false;
      ui.speeds.forEach(button => { button.disabled = false; });
      ui.status.textContent = "Ready to depart";
      updateControls();
      updateMetrics();
      openSettings();
      if (window.ResizeObserver) {
        // Changing text size can resize the panels without a window resize.
        const observer = new ResizeObserver(resizeMap);
        observer.observe(ui.header);
        observer.observe(ui.controls);
        observer.observe(ui.mapSurface);
      }
    } catch (error) {
      console.error(error);
      ui.status.textContent = "Trip data unavailable";
      ui.errorMessage.textContent = error.message;
      ui.errorPanel.hidden = false;
    }
  }

  initialise();
})();
