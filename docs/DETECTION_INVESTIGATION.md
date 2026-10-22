# Zero-detection investigation — 2026-10-22

## Root cause

The uploaded `B8ED0AFA11F1CE4C002D5D908B032A02.replay` was processed successfully.
Its database record contains one automatic exposed-goal finding for the opponent
IShowFinancing. The selected player is **ßusiest**, stable player ID
`05c5980c928d61c3938c2ee6`. That player has no emitted findings under the current
rules. Both API report and viewer deliberately filter events by this ID; neither
silently discards a qualifying event for the selected player. No threshold was
changed to generate a result. The previous zero-fixture results were accurate.

The product's coverage and observability were insufficiently explicit: all rules
require teammates (so every 1v1 skips all detectors), and no rejection summary was
stored/logged. Reports now explicitly distinguish unsupported duel coaching from
limited team-rule coverage. Diagnostic counters and persisted audit files explain
the decisions. No detection, identity, coordinate or truncation defect was found
that explains this selected player's zero count.

## Uploaded match evidence

- Native parser -> versioned native-unit adapter -> background worker ->
  `analyse` -> SQL Replay.findings -> owner-scoped API -> player-filtered viewer.
- All **10,314 frames** visited, ending at **486.7024145 elapsed seconds**.
  9,447 Active; 867 non-Active; 527 kickoff-context exclusions; 6,688 sampling
  skips; **2,232 complete sampled frames**. No missing-actor sampling exclusions.
  These mutually exclusive frame-gate counts sum to 10,314.
- All three detectors evaluated **2,232 times each for ßusiest**. Stable remote-ID
  hashing is shared by metadata and frame tracks; display-name spelling/Unicode
  is not used for matching. ßusiest has positions in 10,310/10,314 frames and
  velocities in 10,263; missing values did not remove sampled detection frames.
- Double commit: 4 candidate samples, longest run approximately **0.553s**, below **0.65s**.
  1,745 samples excluded for emergency/wall/aerial geometry, 408 for subject
  distance/closing speed, 75 without a qualifying same-side teammate.
- Defensive bunching: 0 candidates; 1,991 rejected at subject/ball geometry,
  128 without nearby opponent pressure, 113 without a qualifying nearby teammate.
- Exposed goal: 2 candidates, longest approximately **0.184s**, below **0.9s**. 2,120 rejected
  at ball direction/depth/width and 110 because a defender still covered depth.
- The actual opponent event occurs at **252.739768s** (4:12.740 elapsed), with
  2,028.30 UU/s goalward ball velocity, 2,691.65 UU defensive gap, 458.35 UU nearest
  opponent distance and 0.919098s sustained evidence. This is heuristic evidence,
  not proof of a coaching mistake or responsibility for a conceded goal.
- The originally stored event and fresh rerun match in player, category, time,
  evidence and alternative. Event IDs differ only when the replay ID changes.

## Genuine fixture results (all players)

| Replay | Frames visited | Samples per eligible player | Double commit | Bunching | Exposed goal |
| --- | ---: | ---: | ---: | ---: | ---: |
| genuine-doubles | 9,530 | 1,335 | 0 | 0 | 0 |
| season24-standard | 7,501 | 1,480 | 0 | 0 | 0 |
| genuine-duel | 2,523 | 0 evaluations (337 complete samples; no teammates) | 0 | 0 | 0 |

Doubles has two single-sample double-commit candidates, neither sustained.
Standard has two single-sample double-commit candidates; its longest bunching
runs are 0.768s and 0.962s (<1.2s); its exposed-goal candidate lasts 0.193s (<0.9s).
The duel is outside current automatic coaching coverage, not a negative assessment.

All **nine** files in the supplied DemosEpic directory were also parsed and fully
audited. Category counts are shown across all players, not falsely attributed to
Busiest; several files contain other display names or aliases.

| File stem | Frames | Double commit | Bunching | Exposed goal |
| --- | ---: | ---: | ---: | ---: |
| 072998B3451ED6E9916BA2968B398969 | 5,482 | 0 | 0 | 0 |
| 1E1CC55F4C8CD4F37F8F328B4F313AF7 | 10,075 | 0 | 0 | 0 |
| 37DA54034BAECE9630FB9AAD7A920BD2 | 4,264 | 0 | 0 | 0 |
| 5B38B317483702AD9ED90DB01579049E | 5,954 | 0 | 0 | 0 |
| 723EF42143242ED2BA6FD69957F9235A | 12,632 | 0 | 0 | 0 |
| B8ED0AFA11F1CE4C002D5D908B032A02 | 10,314 | 0 | 0 | 1 (opponent) |
| E16B7BE547AFF6A08C00E28DBBDEACBE | 9,031 | 0 | 0 | 0 |
| EAD947FF4C845A2193BB258B44DDADB8 | 4,710 | 0 | 0 | 0 |
| FCD8B66811F1C2645743DCBF0E97E74B | 4,830 | 0 | 0 | 0 |

## Rules, units and time

The detector runs in native Rocket League XYZ (Z up), distances in UU, velocities
in UU/s. Only the Three.js viewer swaps Y/Z and scales positions by 1/100, with
quaternion remapping and slerp covered by existing tests. Native velocity versus
adjacent position derivative in the doubles fixture has median ratio ~0.933
(sampling/collisions introduce noise); there is no factor-of-ten/unit conversion
error evident. Team 0 own goal is negative Y; team 1 is positive Y.

Every frame is visited, while geometric evaluations occur at intervals >=0.18s
(roughly 5 Hz, dependent on recorded spacing). Four seconds after each Active
segment begins are excluded. Timestamp gaps >=0.25s reset sustain state. Missing
any player or the ball skips that sampled frame and resets sustain. Conditions
must remain true at successive evaluated samples for the required duration;
12-second per-player/category cooldowns suppress repeats. Short inter-sample
changes may be missed; this is sampled evidence, not continuous proof.

Double commit excludes near-own-goal ball depth >3,300 UU, walls |X|>3,300,
ball height >400, subject height >250; it requires both players near the ball
(1,200 UU), closing above 650 UU/s from similar directions (dot>.65) with no
deeper covering third player. Bunching requires 1.2 seconds of close defenders
(<450 UU) away from a ball under opponent pressure in a specified defensive band.
Exposed goal requires >900 UU/s goalward ball movement, a central own-half band,
all defenders >600 UU upfield of the ball, a nearby opponent and the deepest
defender as the assigned subject. These are very narrow combined conditions.

## Scope limits and verified presentation

The system does not currently assess duel decisions, efficient boost routes,
mechanical execution, touch quality, possession intent, opponent threat prediction,
most aerial/wall challenges, pass plans, rotation intent or a general model of
risky second-man challenges. A rare narrow rule trigger cannot yield comprehensive
personalised coaching. Improving coverage needs coach-reviewed positives AND
negatives, tactical context and validated rules, not lowering thresholds until
matches produce flags. No trained model or expert validation is claimed.

The isolated Playwright regression uploads the actual private match, selects the
player owning its genuine rule finding and seeks just before it. It verifies
automatic pause at the exact event, challenge camera mode, actual scene annotation
objects, evidence panel, context rewind/re-pause, Continue and stored reviewed ID.
The test does not create a manual event, mock findings or alter the user's saved
player selection. Screenshot: `.research/screenshots/genuine-rule-coaching.png`.

## Reproduce and inspect diagnostics

`python scripts/diagnose-replays.py <replay-or-directory> --output <ignored-audit-directory>`
uses the real subprocess parser and produces per-replay frames, findings, per-player
detector evaluations/candidates/emissions/rejections/max sustain, frame filters
and last visited time. Results from this investigation are under ignored
`.research/detection-audit/`; original private replays are not modified or committed.
New worker jobs store `analysis-diagnostics.json` beside their replay and emit a
structured `analysis_summary` log without per-frame log spam. Existing ready
replays are not automatically reprocessed or relabelled.

For private regressions set `RANKDLAB_COACHING_REPLAY` to the known B8ED... file,
then run pytest or `npm run test:e2e -- detection.spec.ts`. Without this explicit
path the optional private tests skip; public fixtures and other tests still run.
