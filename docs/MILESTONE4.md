# Milestone 4 implementation ledger

Working copy: C:/Code/RankdLab - backup, the existing backup directory. The path in
the brief did not exist. Original repository untouched. Branch:
feat/milestone4-intelligence. SQLite snapshot: ignored .research/pre-milestone4.db.
The two existing replay records and their files are preserved.

## A - tactical foundation

Plan: typed interpretation and bounded timestamp history around the existing parser.
Implemented tactical-1: recorded actors, nullable contextual features, provisional
depth-based roles, team symmetry, score/clock and explicit uncertainty.
TemporalWindow checks every frame for missing actors, gaps, duplicate timestamps,
clock resets and teleports. Travel time is an optimistic bound to the current ball
point, not an interception-order prediction. Low chassis is not grounded proof.
Touches, possession, demolition and boost-pad opportunities remain unavailable.
Five tactical and genuine-parser compatibility tests pass. No parser rewrite.

## B - Duel sequences

Plan: preserve exposure and add last-cover advance plus widening recovery drift.
Both run only in 1v1, require a low central goalward ball with a nearby opponent,
complete timestamp history and recorded subject velocity. Advance inspects two
seconds of prior coverage; drift measures one second of increasing goal distance
and lateral displacement. Both require a further .7 seconds of qualifying samples.
Tests cover positives, pressure/ball-direction/aerial/velocity negatives, direction
symmetry and missing frames between sampled evaluations. No touch/blame inference.
Existing exposure remains a separate, versioned rule. Genuine evaluation is in H.

## C - Doubles roles and recovery

Plan: reuse the measured sequence primitives with explicit doubles eligibility,
not duel responsibility. Added second-man advance (requires a clear previously
deeper position and current second-man estimate) and uncovered recovery drift
(suppressed when the teammate covers). Existing double-commit, bunching and
exposed-goal rules remain unchanged and separately versioned. Dynamic depth roles
can switch or become unknown on ties; no permanent player role is stored.
Fourteen sequence, existing-rule and diagnostic tests pass; one private test skips
without its environment variable. Intentional support, ball moving away, aerial
contexts and a covering teammate are negatives. Rotation intent and boost-pickup
attribution remain unsupported.

## D - Standard structure

Plan: interpret third-man responsibility and a separate central coverage gap.
Added third-man advance, requiring both other players to have been ahead in the
prior two seconds, and central coverage gap, requiring three sustained wide low
positions under a central goalward threat. Only a clear deepest player receives
the team-level observation, without causal blame. A central defender suppresses
the gap; an additional covering player suppresses advance. Twelve sequence and
legacy-detector tests pass, including different formations. Challenge sequencing,
rotation intent and aerial defensive coverage remain beyond these candidates.

## E - rank context and practice priorities

Plan: four communication levels, immutable analysis snapshots and honest repeated
patterns. Context v2 records optional self-reported rank and distinct prior match
counts by stable selected replay player. Bronze-Gold, Platinum-Diamond,
Champion-GC and SSL receive different explanation detail without changing facts.
A training objective requires candidates across at least two distinct matches;
an isolated flag cannot establish a recurring weakness. Disputed current flags
are excluded. Sixteen rank/context/plan tests pass. Suggested drills are authored
review exercises, not measured training outcomes or skill benchmarks.
