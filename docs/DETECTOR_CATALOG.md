# Experimental detector catalog

No calibrated confidence, coach accuracy or proven counterfactual outcome is
claimed. All findings are potential risks; none automatically confirms a mistake.
Thresholds are explicit engineering hypotheses, not rank-dependent benchmarks.

## Preserved geometry candidates

| Category | Modes | Required evidence and eligibility | Sustain |
|---|---|---|---|
| potential_double_commit | 2v2, 3v3 | Player/teammate <1200 UU from ball, closing >650 UU/s, same-side dot >.65, low positions; excludes wall/aerial/emergency contexts and a deeper third cover | .65s |
| defensive_bunching | 2v2, 3v3 | Ball 500–3000 UU into defended half; player >1800 from ball, teammate within 450 and >1600 from ball, opponent within 1000; low positions | 1.2s |
| potential_exposed_goal | 2v2, 3v3 | Central ball 500–3500 into defended half, goalward velocity >=900, all defenders >600 upfield of ball, opponent within 1600; assigned only to deepest player | .9s |
| duel_goal_exposure | 1v1 | Sole defender >600 behind ball depth, low goalward ball >=900, opponent within 1600, horizontal constant-velocity projection within +/-800 of goal center | .9s |

Original geometry conditions are unchanged. Improved continuity gating can
conservatively suppress sustained events across missing data. These rules do not
establish who caused exposure or whether defending was physically possible.

## New temporal candidates

All six require complete roster positions, subject velocity through the context
window, current ball velocity, low subject chassis (<100 UU), low ball (<300),
non-wall context, central-ish ball (\|x\| <=1800), defensive depth 500–3000,
goalward speed >=600 and opponent within 1000. Missing evidence explicitly rejects
evaluation. The whole sequence is invalidated at discontinuities.

| Category | Mode | Additional evidence and exclusions | History / sustain |
|---|---|---|---|
| duel_cover_advance | 1v1 | Sole defender starts >=1000 goal-side, advances >=600 UU with attacking speed >=650, finishes within 500 depth of ball or beyond it | 2s / .7s |
| duel_recovery_drift | 1v1 | Ball >600 behind player; goal distance increases >=400 and lateral distance >=600 while goalward speed <=0 | 1s / .7s |
| doubles_second_man_advance | 2v2 | Clear second-man depth estimate; teammate was >600 ahead and provides no current goal-side cover; same measured advance | 2s / .7s |
| doubles_uncovered_recovery | 2v2 | Widening recovery as above; suppressed if teammate is goal-side | 1s / .7s |
| standard_third_man_advance | 3v3 | Clear third-man estimate; BOTH teammates previously >600 ahead; neither currently covers | 2s / .7s |
| standard_central_coverage_gap | 3v3 | All THREE low team positions \|x\| >=1800 now and one second ago, ball \|x\| <=800 and straight projection through central goal; assigned only to clear third man | 1s / 1.2s |

Interpretation is conservative but unvalidated. Legitimate aggression with an
unrecorded communication/intent context can still trigger. Negative tests cover
ball moving away, no nearby opponent, covering teammates, central defenders,
aerial contexts, velocity gaps, ambiguous roles and team-direction symmetry.

Diagnostics count candidate **samples**, not distinct tactical opportunities.
Sustain/cooldown rejections must not be interpreted as false negatives. Tests use
explicit synthetic trajectories to validate mechanics, not realistic coach labels.

## Deliberately unsupported

Possession quality, preventable vs unavoidable goals, missed-touch attribution,
corner/small-pad boost tradeoffs, physically realistic interception order,
controller intent, rotation correctness, nuanced challenge sequencing, aerial
handoffs and skill benchmarks. Parser-derived event support is retained for future
review; its incomplete attribution cannot justify possession/boost-quality flags.
The genuine dataset produced no positives for the six new sequence candidates;
they need independently labelled positive and negative match situations.
