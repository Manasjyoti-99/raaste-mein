# System architecture

The application is a static HTML/CSS/JavaScript PWA. It loads a saved route, a venue catalogue and numerical configuration. The phone performs the recommendation calculations and retains the user's local state.

## Modules

| File | Responsibility |
| --- | --- |
| `index.html` | Mobile interface, settings, lists, dialogs and controls |
| `style.css` | Responsive portrait layout and visual states |
| `app.js` | Route preparation, current trip, rendering, mode transitions, alerts and persistence |
| `suggestion-engine.js` | Projection, opening windows, travel estimates, score and alert candidate selection |
| `gps-engine.js` | Validate fixes, estimate/smooth speed, track progress and qualify arrival/history |
| `feedback-learning.js` | Retain one final venue choice per trip and reconstruct preference statistics |
| `routine-engine.js` | Keep completed-trip sources separate and detect bounded routine groups |
| `order-engine.js` | Saved menu, integer quantities, demo amounts and simulated receipt |
| `history-backup.js` | Validate and transfer the route's local profile/history JSON |
| `pwa.js` | Installation, update handling and screen wake-lock requests |
| `service-worker.js` | Cache a coherent version of the listed app files |
| `recovery.js`, `recover.html` | Reconnect the installed app without deliberately clearing history |

## Data flow

The current position, clock and spare-travel allowance form the trip context. The recommendation engine combines that context with precomputed venue route projections, saved hours and the preference snapshot. It returns the selected candidate to the interface. Accept/Reject actions update stored events. A subsequent trip reconstructs and snapshots updated preferences.

GPS validation precedes marker movement and live suggestions. Bad fixes leave the last trusted position in place and suspend new alerts. Arrival and eligibility for a completed-trip record are different decisions.

## Persistent state

| Key | Content |
| --- | --- |
| `invehicle.learning.v1.iitd-hostel-post-office` | Choice profile with trip-session entries and explicit feedback events |
| `invehicle.routines.v2.iitd-hostel-post-office` | Completed GPS/replay metadata and the selected history view |

The application exports both records as `invehicle-history-backup`, version 2, with the route identifier. Restore validates the format, matching route and record consistency, then replaces the local records. It does not merge arbitrary backups.

The app stores no continuous GPS trace in this backup. Current planned stops, orders, receipts and progress are in-session state. Trip reset keeps persistent records. The explicit learning/history reset clears them.

## Network boundary

The host serves static files. External map tiles use OpenStreetMap. The recommendation engine does not query a remote model, restaurant API or cloud learning database. The service worker caches bundled app files and data, while external map tiles remain online resources.
