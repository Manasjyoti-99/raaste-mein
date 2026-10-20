# Recommendation and learning methods

The following methods describe the frozen v5.1.0 implementation. Numerical weights and thresholds are prototype configuration choices.

## Route geometry

The route contains 183 ordered latitude/longitude points. Haversine segment lengths produce a cumulative distance of approximately 2,048.3 m. Point order defines the supported hostel-to-post-office direction.

`measureCafe()` finds the nearest point on every route segment using a local metric approximation. It records a venue's offset from the route and its distance along the route from the start. The phone location uses the same projection method.

## Extra travel and arrival

Let $d_i$ be venue offset in metres and $v$ planning speed in metres per second. Estimated extra travel in minutes is:

$$
\Delta t_i = \frac{2d_i}{60v}.
$$

This approximates an out-and-back trip from the route. It does not model road access or food-related dwell time.

For live GPS, let $s$ be current route progress, $s_i$ the venue route position, $t_0$ the actual IST clock in minutes and $B_i$ the extra travel reserved for accepted stops still ahead before venue $i$. Predicted arrival is:

$$
t_i = t_0 + \frac{\max(0,s_i-s)}{60v} + \frac{\Delta t_i}{2} + B_i.
$$

GPS uses a valid moving speed when available. Until it is available, stop estimates use a labelled 15 km/h assumption. Replay uses modelled 15 km/h travel and a user-selected departure clock. Playback multipliers accelerate the demonstration timer.

## Availability and prompt eligibility

A venue must be ahead, within 300 m of the route, open at the current trip clock and open at expected arrival. Extra travel must fit the 30 min maximum and remaining spare travel. GPS mode also requires an active, fresh and trusted route fix.

Remaining spare travel is the initial allowance less the estimated travel reserved for accepted stops. The user can choose 0-30 min. Preparation, waiting and eating are excluded.

Prompt eligibility additionally excludes a venue already shown during the current trip and requires a score of at least 0.50. The complete list continues to show all nine venues with their status.

## Ranking score

$$
S_i = 0.60A_i + 0.20T_i + 0.10R_i + 0.10D_i.
$$

| Term | Definition |
| --- | --- |
| $A_i$ | $0.8$ times venue preference plus $0.2$ times assigned-category preference |
| $T_i$ | Saved category time-fit value at predicted arrival |
| $R_i$ | Saved venue rating divided by 5 |
| $D_i$ | $1-\Delta t_i/30$, restricted to the interval from 0 to 1 |

Preferences start at 0.50. Scores and preferences are bounded ranking values, not probabilities. Equal scores favour nearer route position, then venue identifier.

| Arrival period | Tea | Coffee | Snacks | Meals |
| --- | ---: | ---: | ---: | ---: |
| Morning, 06:00-12:00 | 1.00 | 1.00 | 0.70 | 0.40 |
| Lunchtime, 12:00-15:00 | 0.55 | 0.60 | 0.70 | 1.00 |
| Afternoon, 15:00-17:00 | 0.85 | 0.80 | 0.85 | 0.50 |
| Evening, 17:00-20:00 | 1.00 | 0.80 | 1.00 | 0.60 |
| Night, 20:00-06:00 | 0.65 | 0.50 | 0.70 | 0.90 |

Time-fit values are developer-defined. Each venue has one scoring category even when its menu includes several food types. Opening windows include opening time and exclude closing time, with overnight handling.

## Automatic alerts

In live mode, the engine ranks eligible venues at least 300 m ahead. It shows the highest-ranked candidate only when that candidate is no more than 400 m ahead. A higher-ranked future venue can therefore defer a nearby lower-ranked option. Replay uses a trigger 350 m before the venue projection.

The app shows at most two automatic suggestions per trip and requires 250 m separation. A displayed card consumes a slot even if later dismissed. A venue is marked seen when shown. Missed approach windows are skipped. Other open panels suppress new alerts.

A prompt closes after 12 seconds, or by a close/outside tap/swipe action. Dismissal causes no preference update.

## Preference update

For each explicit event, both the venue and its assigned category receive the same step:

$$
p_{new} = \min(1,\max(0,p_{old}+\delta)).
$$

Accept uses $\delta=0.10$. Reject uses $\delta=-0.05$. Only one final choice per venue per trip counts. Repeating the same action adds no duplicate reinforcement. Changing a choice replaces that event. Statistics reconstruct preferences from the saved event sequence.

Automatic suggestions use the preference snapshot captured at trip start. New explicit choices influence later trips. This is transparent incremental adaptation, with no fitted neural network or language-model inference.

## Explanation conditions

A previous-choice remark can state the recorded accept/reject count. A usual-choice remark requires at least three venue accepts and an acceptance fraction of at least two-thirds. A time-specific usual-choice statement also requires at least three accepts in that band and more accepts than rejects. Context remarks can use the arrival band and saved menu, for example a lunchtime noodle option.

## Routine grouping

GPS, replay and sample sources stay separate. A routine requires at least three completed trips in one source, the same weekday/weekend group, every endpoint pair within 150 m and a total departure window no greater than 30 min. The app reports distinct dates separately. Three records alone do not imply a routine.

## GPS record qualification

Key defaults are accuracy no worse than 50 m, age no greater than 15 s and route offset no greater than 75 m. The jump allowance is elapsed seconds times 12 m/s plus 30 m. Speed can use a valid device value or a displacement-based estimate above a noise threshold, with smoothing during movement.

Arrival requires proximity within 30 m of the destination, within 50 m along-route tolerance and two qualifying fixes at least 1 s apart. A completed GPS history record additionally requires a start within 75 m, no invalidating interruption, no gap over 30 s or forward step over 250 m, and accumulated valid forward progress of at least 80% of route length.

These are implemented checks, not validated sensor-performance guarantees. The [technical report](Raaste_Mein_Technical_Report.pdf) provides the worked numerical example and further parameter detail.
