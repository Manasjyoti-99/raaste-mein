# Demonstration evidence

This repository documents a functional prototype. Recorded observations, user confirmations and illustrative calculations have different evidential roles.

## Final phone screenshots

Eight supplied screenshots show the installed v5.1.0 phone interface during one evening GPS journey on 17 October 2026. They include:

- A compact date/time/speed header, large map and bottom controls.
- Chaayos at 18:19 IST, shown 399 m ahead with approximately 40 s extra travel.
- Tealogy at 18:36 IST, shown 397 m ahead with approximately 18 s extra travel.
- Selected progression frames from 11% to 96% route progress.

The [screenshot index](../assets/screenshots/README.md) maps each original image to its observation. A screenshot proves its visible state, not which choice was pressed or whether food was purchased. The final image is near arrival, with 64 m remaining.

## Inspected personal export

The author supplied a history export containing three completed GPS records, all on 17 October 2026. It retained one explicit Accept event for Naivedyam at lunchtime. Reconstructing the profile gives a Naivedyam preference of 0.60 and meals-category preference of 0.60. No Reject event appears in that snapshot.

The profile's 45 session entries include starts/resets without feedback. They are not 45 completed journeys. The export contains no continuous GPS trace and no complete alert-exposure log. The original personal backup is not distributed in this repository. The [derived summary](evidence-summary.json) is labelled accordingly.

The author also confirmed replay and learning demonstrations. This particular export contains no completed replay record and no routine satisfying the grouping rule. It must not be used to claim those records are present.

## Synthetic data and illustrations

`data/history.json` contains ten explicitly synthetic sample trips for the sample routine view. They provide no food-choice feedback and do not count as real journeys.

The learning graph in the report shows mathematical consequences of Accept, Reject and neutral dismissal. The worked score calculation holds assumed inputs constant. Both are illustrations of the implemented rules, not field measurements.

## Interpretation and limits

The evidence supports installed-phone operation and advance suggestions on the fixed campus route. It does not provide a controlled estimate of relevance, search time saved, meal-habit improvement or travel-time prediction error. Generalisation to other users, routes or a vehicle display remains outside the demonstrated scope.

The final phone layout and the collected demonstrations have author acceptance. Further trips are not a prerequisite for this ideathon repository.
