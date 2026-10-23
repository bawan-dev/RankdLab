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

## F - tactical presentation

Plan: preserve replay engine; improve framing and evidence/alternative separation.
Camera framing fits relevant recorded positions in portrait and landscape and
keeps a stable viewing direction. Context rewind uses available sequence bounds.
Added Next coaching moment and neutral actor rings. Recorded paths retain gaps.
Only supported low-ball threats receive a schematic central goal-side suggestion;
unsupported rules and new manual notes draw no route. Detailed evidence is
collapsed initially; uncertainty and alternative basis are visible. Eight frontend
unit tests (including camera projection bounds), seven alternatives/legacy backend
tests and all six genuine-browser workflows pass. The backup also needed the
already-identified duplicate Skip link and missing CI fixture fixes; applied here
without touching the original repository. No production coaching accuracy claim.

## G - human review, feedback and evaluation

Plan: separate versioned owner review records from untouched automatic findings,
subjective ratings and legacy binary ML labels. Added a non-destructive migration,
three review judgements, bounded time windows, category/player/finding validation,
optional reviewer-proposed areas and four feedback ratings. Owner review moments
open the same director. Versioned export omits account identity and filenames;
features preserve missing values. Original labels/ML experiments remain available.
Reviewed-window evaluation requires external expert provenance before producing
metrics; ordinary account-owner labels cannot become production accuracy data.
Sixty-six backend tests pass, one optional private test skips without its variable;
six browser tests pass including saved owner reviews/feedback and Continue in all
three real formats. Account isolation, invalid ranges, preservation, export and
cascading deletion are covered. No qualified expert dataset is available; no model
was trained and no real precision/recall is claimed.

## H - integration and handoff (2026-10-23)

Completed: 73 backend tests including the private genuine-finding regression; 8
frontend unit tests; 6 Chromium browser workflows including all three real formats,
owner reviews, usefulness feedback, automatic coaching, annotations, reports,
Continue, save/reload, responsive layouts and deletion. Ruff lint/format, mypy,
ESLint, Prettier, TypeScript and production frontend build pass. The empty review
CLI runs reproducibly and returns null accuracy metrics. Compose configuration
validates. PostgreSQL/container runtime checks are unavailable because Docker's
Linux engine is not running. One upstream httpx TestClient deprecation warning
remains. No tests failed or skipped in the final environment with the private
replay variable enabled; without it the optional private test is skipped.

All 3 public fixtures and 9 user-supplied private replays were parsed and analysed
read-only. See EVALUATION.md for per-file frame/player counts, candidate samples,
missing-data exclusions, actual findings and timings. No new sequence positives
qualified; no thresholds were lowered to manufacture events. The lone preserved
exposed-goal flag belongs to an opponent. Expert validation is still required.

Parser-derived event timestamps/nullable identities are retained additively.
Unattributed contacts do not become possession facts. Current demolition and
ground contact remain unknown. Positive clock time is not treated as proof of
regulation. Temporal tests cover variable sample rates, missing unsampled frames,
teleports, duplicate timestamps and symmetric team directions. Deterministic reruns
have identical IDs/results, not duplicated findings. User job cancellation is not
implemented; bounded parser failures, queue recovery and safe deletion rules remain.

Database migration m3_profiles -> m4_reviews was applied to this backup only.
Compared every pre-existing column/row in users, profiles, ranks, replays, feedback
and labels against the pre-change snapshot: unchanged, including both replay
records. Existing reports are retained and never silently reanalysed. Upload a
fresh copy to obtain Milestone 4 analysis. No source replay was modified, no data
was uploaded externally, and no push/deployment occurred. Original repository
remains untouched.

### Local acceptance

The backup is running at http://127.0.0.1:15173/ with API on 18000. A browser tab is
open on the preserved dashboard. These ports avoid the original running app.

To restart, use two PowerShell terminals in `C:/Code/RankdLab - backup`:

```powershell
# API terminal (after uv sync --project backend --frozen --extra dev --extra ml)
$env:RANKDLAB_DATABASE_URL='sqlite:///C:/Code/RankdLab - backup/data/rankdlab.db'
$env:RANKDLAB_DATA_DIR='C:/Code/RankdLab - backup/data'
$env:RANKDLAB_ORIGINS='["http://127.0.0.1:15173"]'
backend/.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 18000
# Frontend terminal
$env:API_PROXY='http://127.0.0.1:18000'
npm --prefix frontend run dev -- --port 15173
```

Select a playlist, upload an intact real .replay, confirm any ambiguous/mismatched
format, then select your player by replay identity. Playback pauses at qualifying
moments. Next coaching moment or timeline markers replay relevant context;
Continue resumes. Detailed evidence and alternative basis explain what is measured
and what is hypothetical. Zero flags is valid and common with current coverage.

Expand the tactical review workbench to annotate a range, use a current moment,
choose a judgement/category and save comments. It can reject/accept an automatic
finding without erasing it. Use usefulness ratings separately. Reports show rank
snapshots, raw observations and a repeated-evidence practice plan when available.
Legacy note controls still work. Verify desktop/mobile framing, manual camera,
speed, timeline, feedback reload, reports and private data deletion in a disposable
account before production use. Technical tests do not replace gameplay judgement.

### Local source-control checkpoints

- A: bfc4cfa - tactical model and temporal windows.
- B: 00edd4a - Duel commitment and recovery sequences.
- C: 009404a - Doubles supporting-player sequences.
- D: 83bf8f4 - Standard third-man and central coverage.
- E: 89a5582 - immutable rank context and repeated-evidence plans.
- F: 2f58c78 - framing, annotations and justified optional alternatives.
- G: c932f82 - separate human reviews, ratings and evaluation tooling.
- H: final integration commit follows this ledger; see git log.

Modified areas: tactical/playlist detectors, analysis integration and adapter,
coaching presentation/context, owner API/review persistence and migration, replay
viewer/camera/types/report/workbench, CLI audits/evaluation, regression suites and
these documents. Existing auth, storage security, parser isolation and offline ML
infrastructure were retained. No new external service or trained model is required.

### Remaining validation and limits

- Six new sequence rules have synthetic positives but no qualifying positives in
  the 12 genuine matches. Collect qualified labels before expanding/tuning them.
- Contact attribution, possession quality, tactical intent and physically realistic
  interceptions/recovery/counterfactual simulation are not established.
- No expert-labelled coaching accuracy set, calibrated confidence or proven skill
  improvement exists. Review agreement metrics require independent provenance.
- Native subprocess/browser memory, production concurrency/load and longer
  near-limit replays beyond this sample remain unbenchmarked. Human hardware
  inspection is still needed for camera smoothness and clipping in unusual scenes.
- No public deployment, GitHub Actions run, or PostgreSQL runtime result is claimed.

Final visual inspection also corrected the compact navigation-button width and
waits for the mobile navigation transition before responsive screenshots. Saved
legacy reports describe only their original detector coverage.
