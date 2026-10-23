# Coaching evaluation and review protocol

## Current status

No qualified expert-labelled evaluation set is present. Technical tests use
synthetic positive/negative trajectories explicitly marked as tests. Genuine replay
fixtures verify compatibility, detector execution and controls; they do not prove
accuracy. Ordinary owner judgements and helpfulness ratings are not expert ground
truth. No production model was trained, threshold tuning on these fixtures was not
performed, and no real precision/recall or coach-quality claim is justified.

## Review workflow

1. Upload a real replay, confirm format if requested, and select the correct player.
2. Seek or open a coaching moment. Expand **Review or correct a tactical situation**.
3. Use current moment; set a start/end window up to 30 seconds and category.
4. Record confirmed issue, reasonable decision/reject flag, or uncertain, with
   comments. Optional field X/Y provides a reviewer-proposed schematic area.
5. Save, then open the reviewed situation through the existing director. Continue
   resumes playback. The original automatic finding is retained unchanged.
6. Use Helpful / Not helpful / Incorrect / Unsure separately for subjective feedback.
7. Export your versioned review dataset from the workbench. Account data and replay
   filenames are omitted, but review comments should be inspected before sharing.

`GET /api/replays/{id}/reviews`, `POST .../reviews`, `GET /api/reviews/export`,
`GET /api/evaluation` and `GET .../diagnostics` all require owner authentication.

## Reproducible evaluation

From the backup root, with the local environment installed:

```powershell
backend/.venv/Scripts/python scripts/evaluate-coaching.py path/to/export.jsonl
backend/.venv/Scripts/python scripts/diagnose-replays.py .research/genuine-duel.replay .research/genuine-doubles.replay .research/season24-standard.replay --output .research/m4-audit
```

Review export `review-set-1` contains match exposure (active seconds), original
automatic findings and owner review records with player reference, time range,
category, nullable `tactical-1` features, comments and detector version. Findings
per match/minute and by playlist are descriptive counts. They are not skill scores.

Evaluation collapses exact repeated review keys to the latest judgement, excludes
uncertain judgements and withholds metrics for unverified owner labels. A separate
curated dataset may state `externally-verified-expert` provenance only after an
external qualification/adjudication process. The CLI trusts that supplied provenance;
it does not verify reviewer identity. App users cannot grant themselves that status.
Where supplied, TP/FP/FN/TN and precision/recall apply only within reviewed windows,
with mode/category groups and sample counts. Unlabelled time is never a negative.
Overlapping/conflicting windows require adjudication before evaluation. Selective
review and small samples can bias all results; these are not whole-match metrics.

Before any model work, collect independent positives, reasonable negatives,
ambiguous examples, reviewer agreement and provenance across ranks/playlists.
Pre-register eligibility and match tolerances. Split by connected match/player
groups using the existing leakage-aware split, and retain a separate unseen set.
Compare against simple rule/majority baselines. New nullable tactical features are
not compatible with the old `spatial-0.1.0` binary model without an explicit adapter.

## Genuine replay audit — 2026-10-23

Results below are all players, not just the account's selected player. Private
files remain local; abbreviated stems identify them without exposing player names.
The only surviving flag is the previously observed opponent exposed-goal moment
at elapsed 252.740s in B8ED0AFA. It is not attributed to Busiest. No expert has
verified it as a mistake. No new sequence rule produced a qualifying finding.

| Replay | Mode | Frames / players | Candidate samples | Missing active frames | Findings | Parse / analysis seconds |
|---|---|---:|---:|---:|---|---:|
| genuine-duel.replay | 1v1 | 2523 / 2 | 0 | 0 | 0 in every eligible category | 0.30 / 0.03 |
| genuine-doubles.replay | 2v2 | 9530 / 4 | 2 | 0 | 0 in every eligible category | 1.70 / 0.35 |
| season24-standard.replay | 3v3 | 7501 / 6 | 15 | 3 | 0 in every eligible category | 2.27 / 0.48 |
| 072998B3 (private) | 1v1 | 5482 / 2 | 0 | 0 | 0 in every eligible category | 0.61 / 0.07 |
| 1E1CC55F (private) | 2v2 | 10075 / 4 | 7 | 10 | 0 in every eligible category | 1.78 / 0.40 |
| 37DA5403 (private) | 1v1 | 4264 / 2 | 6 | 5 | 0 in every eligible category | 0.46 / 0.05 |
| 5B38B317 (private) | 1v1 | 5954 / 2 | 0 | 0 | 0 in every eligible category | 0.63 / 0.11 |
| 723EF421 (private) | 1v1 | 12632 / 2 | 5 | 0 | 0 in every eligible category | 1.31 / 0.25 |
| B8ED0AFA (private) | 2v2 | 10314 / 4 | 20 | 0 | potential_exposed_goal: 1 | 2.26 / 0.62 |
| E16B7BE5 (private) | 1v1 | 9031 / 2 | 10 | 5 | 0 in every eligible category | 1.00 / 0.20 |
| EAD947FF (private) | 2v2 | 4710 / 4 | 13 | 0 | 0 in every eligible category | 0.80 / 0.13 |
| FCD8B668 (private) | 2v2 | 4830 / 4 | 8 | 0 | 0 in every eligible category | 0.95 / 0.19 |

All eligible per-player detectors executed on the complete replay; each audit
records frame visits, candidate sample counts, exact rejection counters, missing
actors, max sustained duration and versions in ignored `.research/m4-audit`.
Mode coverage is 3 Duel candidates, 5 Doubles and 5 Standard (see catalog).
Non-active/kickoff samples and missing actors are explicit exclusions. Most new
sequence rejections are no threat, insufficient history, no clear covering role or
no qualifying displacement; zero flags is not evidence of mistake-free play.

Most frequent rejection reasons across these 12 replays (overlapping per-player evaluations):

- `aerial_wall_or_wide_ball_context`: 80,462
- `ball_velocity_depth_or_wide_position`: 33,328
- `ball_depth_subject_distance_or_height`: 30,554
- `emergency_wall_or_aerial_exclusion`: 26,866
- `ball_not_low_goalward_threat`: 9,693
- `no_central_defensive_threat_under_pressure`: 6,690
- `subject_distance_or_closing_speed`: 6,359
- `no_nearby_opponent_pressure`: 2,062

Performance numbers are local single-run wall time, not service benchmarks.
The 12,632-frame 436.8-second private replay separately measured 54.47 MiB peak
Python allocations with tracemalloc (parse 1.61s, analysis 1.01s with profiling).
This excludes native parser subprocess RSS and GPU/browser memory. Its unprofiled
analysis was .25s. Upload/report handlers are covered by browser workflows but no
production latency/load or frame-rate benchmark is claimed. Camera projection and
gap handling have unit tests; smoothness still requires human hardware review.
