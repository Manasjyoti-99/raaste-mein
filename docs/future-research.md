# Proposed future research

**Project:** Raaste Mein  
**Research domain:** Machine Learning and Context-Aware Recommender Systems  
**Proposed title:** Context-Aware Preference Learning for Route-Constrained Food Stop Recommendation  
**Author:** Manasjyoti Baishya, IIT Delhi

This document proposes work beyond the v5.1.0 ideathon prototype. It is not a record of completed experiments, a trained model or a funding award.

## Research question

Can a compact model learned from sparse explicit feedback improve food-stop relevance over a distance-based ranking and the existing fixed-weight method, while preserving route and travel-budget feasibility and limiting unnecessary alerts?

## Existing baseline

The implemented PWA supports one 2.05 km IIT Delhi route and nine saved venues. Its ranking combines preference, time-of-day fit, rating and estimated detour using fixed weights. Explicit Accept and Reject choices update bounded venue and category preferences. Dismissals and ignored suggestions remain unlabelled. This is a working rule-based baseline with incremental preference updates; it is not a trained contextual prediction model.

The repository's [methods](methods.md) define that baseline. [Evidence](evidence.md) describes the available functional demonstrations and their limits. The existing evidence does not establish recommendation accuracy, general adoption, a reduction in missed meals or the effectiveness of the proposed model.

## Objectives

1. Learn a lightweight acceptance or relevance model using time of day, venue category, route position, estimated extra travel and prior explicit choices.
2. Apply the same route-direction, opening-hours and travel-budget checks before comparing recommendation methods.
3. Generate concise explanations grounded in the factors actually used for a recommendation.
4. Measure adaptation across journeys, relevance, travel-budget violations and notification burden.

## Proposed comparison

| Method | Purpose | Status |
| --- | --- | --- |
| Distance-based ranking with common feasibility checks | Simple reference method | To implement for the study |
| Current fixed-weight ranking and bounded preference updates | Reproducible prototype baseline | Implemented in v5.1.0 |
| Compact contextual model with incremental updates | Test whether learned context improves relevance | Proposed |

All methods would use the same venue inputs, feasibility checks and alert limits. This would help separate ranking effects from changes in eligibility or interruption frequency. The model family and its complexity would be selected after inspecting the volume and quality of consented data.

## Data collection and evaluation

The proposed study would collect consented journey interactions across repeated trips and different time periods. Only explicit acceptances and rejections would supply choice labels. A dismissed, expired or ignored card would not automatically count as a rejection. Separate user relevance ratings would provide information beyond acceptance, which can also depend on hunger, companions and immediate plans.

Chronological splits would train on earlier interactions and evaluate on later journeys. Where the participant count permits, a held-out-participant evaluation would examine performance for new users. Synthetic sample history and illustrative graphs would remain separate from collected observations. The protocol would define sample size, exclusions and analysis before reporting comparative results.

| Measure | Intended interpretation |
| --- | --- |
| User-rated relevance and explicit acceptance rate | Usefulness of displayed suggestions, with counts and uncertainty |
| Adaptation over repeated journeys | Change in relevance as explicit feedback accumulates |
| Feasibility and travel-budget violation rates | Whether displayed choices satisfy the defined constraints |
| Estimated versus observed extra travel | Error in the geometric detour assumption |
| Alerts per trip and user-rated interruption burden | Cost of prompting |
| Inference latency on a phone | Practicality of the proposed model |

The existing allowance covers extra travel only. Waiting, preparation and eating time would need separate measurements before claiming a complete meal fits a schedule. Observed detour error would require actual stop visits and a defined comparison journey, rather than assuming that accepting a card proves arrival or purchase.

## Data handling

The current app keeps learning and completed-trip metadata in localStorage. It has no remote research database and its backup is not a continuous GPS trace. Any future study would define consent, pseudonymous identifiers, retention, withdrawal and access controls before collecting research data. The protocol would prefer event-level context over continuous location collection where it answers the question. Personal exports would not be committed to this public repository.

## Intended outputs and impact

Expected outputs are an evaluated contextual recommendation method, a reproducible comparison protocol, documented results and an improved prototype. The intended application is food-stop discovery that fits everyday journeys using ordinary phones. Whether it reduces manual search effort without increasing detours or interruptions is a study question, not an established outcome.

The research would retain the narrow food-stop application initially. Support for new routes, live restaurant information or vehicle displays would require additional implementation and validation; these are not capabilities added by this proposal.
