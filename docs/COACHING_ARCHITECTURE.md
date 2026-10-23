# Coaching architecture

## Evidence flow

Native parser subprocess -> additive transport adapter -> bounded continuous
history -> tactical state at evaluated samples -> playlist registry -> sustained
candidate -> immutable finding -> stored rank/history snapshot -> explanation ->
director and report. Heavy parsing and analysis remain in the worker, not React.

`replay_adapter.py` keeps native Z-up coordinates, source/elapsed timestamps,
nullable velocities/boost and stable hashed remote player identities. Additive
`native-events-2` retains parser-derived touch/demo/pad event times with nullable
actor attribution. A parser-derived event is not independently verified contact
or evidence of possession. In the inspected doubles source, all 113 touch events
had no player attribution. Boost decisions and touch quality are not implemented.

`tactical.py` provides typed match/player states, native distances, depth,
goal-side flags, approach cosine, relative speed and an optimistic stationary-ball
travel-time bound (distance / maximum-speed bound). This does not predict arrival
order: acceleration, turning, jump/aerial choices and controller intent are absent.
Height proxies are distinguished from unknown ground contact and demolition state.
Overtime is unknown unless explicit evidence exists; a positive clock does not
establish regulation time. Score is reconstructed from the recorded goal events.

Roles are provisional ordered defensive depths with >300 UU separation. Ambiguous
ties yield no role. First/second/third man are not permanent player attributes,
proof of responsibility, or a mandated rotation system. Selected-player identity
is the user's explicit replay selection, not a display-name match to the account.

## Sequence handling and versions

TemporalWindow retains at most five seconds of raw evidence and checks every
frame, including frames between geometric samples. Missing actors, inactive play,
gaps >=.25s, backwards time, clock resets >5s and >1800 UU jumps break the window.
Duplicate timestamps are ignored rather than counted as elapsed evidence. First
four seconds of active segments remain kickoff exclusions. Geometric evaluation
uses actual timestamps at >=.18s spacing. This can miss short between-sample
changes; sustained eligibility means evaluated samples, not continuous physics.

Analysis version: `tactical-0.4.0`. Existing geometry detectors retain
`geometry-0.2.0`; new sequences use `sequence-1`; features use `tactical-1`; rank
context uses `coaching-context-2`; reviews use `review-set-1`. Per-player/category
12-second cooldown and deterministic IDs prevent accidental duplicated output in
the same version/run. Old stored reports are not automatically rewritten.

The existing ML `spatial-0.1.0` binary export and offline grouped baselines remain
available. New nullable tactical review features are a separate schema and must
not be passed silently into that old model. No production ML model was trained.

## Presentation, alternatives and review

Rank changes communication style and objective count, never detector physics.
Snapshots preserve optional self-reported rank and prior distinct matches. Plans
require repeated categories across distinct matches; owner uncertainty/rejections
and disputed flags are excluded from new plans/history counts. These remain
candidate patterns, not verified weaknesses or measured training outcomes.

Director framing fits the recorded actor/ball positions with stable camera
direction; camera easing and reduced-motion support remain. Trajectories split at
gaps, state changes, missing actors and teleports. Automatic alternative arrows
exist only for supported low central goalward threats. They point schematically
at a proposed area, without travel-time/turning/reachability guarantees. Unsupported
rules and new text-only manual notes draw no arrow. Old saved notes still load.

Owner reviews are append-only rows separate from automatic findings and from
subjective feedback ratings. Reviewer-supplied areas are bounded to field units.
Review routes use the same owner checks as replay APIs; deletion cascades to
reviews, feedback and legacy labels. Exports omit emails, names and filenames;
comments are user-authored and should still be checked before sharing externally.

Diagnostics expose evaluated detectors, candidate samples, sustained duration,
rejections, interruptions and emitted findings through an owner-only endpoint.
Legacy replays without stored diagnostics return a clear 404, not invented data.
