# Verification ledger

## Milestone 4 - 2026-10-23

Backup-only implementation on feat/milestone4-intelligence. See [MILESTONE4.md](MILESTONE4.md),
[DETECTOR_CATALOG.md](DETECTOR_CATALOG.md), [COACHING_ARCHITECTURE.md](COACHING_ARCHITECTURE.md)
and [EVALUATION.md](EVALUATION.md).

- 73 backend tests passed, including genuine parser/private detection and migrations.
- 8 frontend unit tests and 6 Chromium end-to-end workflows passed.
- Backend lint/format/mypy and frontend lint/format/type-check/build passed.
- Three public and nine private replays audited read-only; six new sequence rules
  produced no qualifying flags. One legacy opponent exposed-goal flag remains.
- Owner reviews and feedback persist separately; no expert accuracy metrics available.
- All pre-existing backup database values compared equal after the additive migration.
- Compose configuration passed; Docker/PostgreSQL runtime unavailable.
- One upstream httpx deprecation warning. No push, deployment or production model.


## Coaching detection investigation — 2026-10-22

See [DETECTION_INVESTIGATION.md](DETECTION_INVESTIGATION.md) for the root cause,
per-replay/category counts, player identity verification, frame coverage and
precise rejection evidence. All three public fixtures and all nine private
DemosEpic files were parsed and audited. No detector thresholds were changed.

- **35 pytest tests passed**, including optional private genuine-match detection,
  audit/result equivalence, full-frame accounting, structured logs, explicit duel
  skip and unsupported-mode report messaging. One upstream httpx warning remains.
- **6 Vitest tests passed**; **4 Chromium E2E tests passed (33.7s)**, including a
  genuine automatic finding driving pause, director camera, scene annotations,
  context replay, Continue and saved progress. No manual/fake event in that test.
- Ruff lint/format, mypy, ESLint, TypeScript/Vite production build passed.
- New jobs persist analysis-diagnostics.json and emit structured rejection counts.
  Existing findings and the user's selected-player/session records were preserved.
- Report UI now explains team-only coverage and unsupported 1v1 coaching explicitly.
  No coordinate/identity/truncation bug was found explaining the zero personal count.
- Private replay files and audit output remain local and ignored. No push/deploy.

Milestone results are appended only after commands actually execute.

## Foundation — 2026-10-22

- Backend: pytest 1 passed; Ruff lint/format and mypy passed.
- Frontend: Vitest 1 passed; ESLint, Prettier and TypeScript/Vite build passed.
- npm audit: 0 vulnerabilities after upgrading Vitest to 5.0.5.
- Uvicorn on 127.0.0.1:8000 and Vite on 127.0.0.1:5173 started successfully;
  direct HTTP requests returned healthy JSON and HTTP 200 respectively.
- One upstream TestClient deprecation warning (httpx transport) remains.
- Foundation is complete; replay, authentication and coaching were not part of
  this first checkpoint.

## Replay, coaching, rules and persistence checkpoint — 2026-10-22

- Backend: **20 pytest tests passed**, including real upload/native parsing,
  timestamp/metadata checks, corruption, oversize/path/MIME validation, accounts,
  sessions, CSRF/origin checks, ownership isolation, feedback, reports, analytics,
  deletion and detector positive/negative scenarios.
- Frontend: **6 Vitest tests passed**, including coordinate/quaternion mapping,
  interpolation, duplicate timestamps, teleports and coaching state transitions.
- **3 Playwright Chromium end-to-end tests passed (23.5s)**: responsive landing;
  registration -> genuine upload -> player selection -> WebGL -> seek/play ->
  authored note -> rewind/pause -> feedback -> Continue -> saved progress reload
  -> stored report -> JSON download -> replay deletion; empty/corrupt failures.
- ESLint, TypeScript/Vite build, backend Ruff and mypy passed on this checkpoint.
- SQLite Alembic migration upgrade executed. Docker executable exists but daemon
  is stopped; no Docker image execution or PostgreSQL runtime verification yet.
- Screenshots saved under ignored `.research/screenshots/` and visually reviewed.
  A mobile screenshot captured a sidebar breakpoint transition; further mobile
  screenshot checks will wait for it to finish.
- Actual replay fixture has no rule detections with these conservative settings.
  Manually authored moments successfully exercise the same coaching machinery.

Milestone 2 is functional for the tested Soccar fixture. Milestone 3 has working
authored coaching. Milestone 4 delivers three experimental rules, not validated
coaching accuracy. Milestone 5 delivers local persistent accounts and reports;
production PostgreSQL verification, account recovery and broader scale remain.

## ML infrastructure checkpoint — 2026-10-22

- Backend now **23 pytest tests passed**; Ruff and mypy passed.
- Feature extraction, owner-scoped explicit review labels, versioned JSONL export,
  label deletion and grouped holdout logic are implemented and tested.
- Offline logistic baseline and majority/rule comparisons executed in a clearly
  synthetic unit-test smoke test. No genuine coaching dataset, product model or
  coaching performance metric was fabricated.
- Optional MLflow integration is written but unexecuted; it is documented as such.
- Milestone 6 infrastructure is available; expert data collection and validated
  model integration remain future work.

## Hardening and compatibility — 2026-10-22

- **29 backend tests passed**, including three genuine replay formats: doubles
  (9,530 frames / 4 players / 4–1), Season 24 standard (7,501 / 6 / 4–2) and duel
  (2,523 / 2 / unavailable–4). Missing score metadata is preserved as unavailable.
- Added streamed-request limits, migration upgrade/check/downgrade verification,
  production-setting validation, request identifiers and restricted CORS checks.
- **3 Chromium E2E tests passed again (22.1s)** after native dialog focus handling,
  camera/label/trajectory improvements and mobile transition verification.
- Runtime dependency export and cross-platform uv lock generated; locked dev/ML
  environment synchronized successfully. `pip check`: no broken requirements.
- `docker compose config --quiet` passed with a disposable validation password.
  Docker daemon unavailable: no local container, PostgreSQL or nginx runtime pass
  is claimed. Those are written CI checks, not executed remote results.
- External monitoring, restore drills, production scale/security audit, expert
  coaching validation and optional MLflow execution remain incomplete.

An additional deletion-failure regression test passed: OS file-removal failures
return 503, retain a retryable record/account, and succeed after the failure is
removed. Failed/corrupt replays now also have working UI deletion controls.

## Final local check

- pytest: **30 passed**, one upstream TestClient/httpx deprecation warning.
- Vitest: **6 passed**. Playwright Chromium: **3 passed (22.6s)**, including
  deletion of failed uploads and saved review state after browser reload.
- ESLint, Prettier, TypeScript/Vite production build, Ruff lint/format and mypy:
  passed. npm audit: **0 vulnerabilities**. `pip check`: passed.
- All three genuine fixture checksums verified. Compose configuration and CI YAML
  syntax parsed successfully. No remote CI, container execution or public deploy.
- Preview servers were used for verification and stopped during handoff; use the
  README commands to start the app. Screenshots remain in `.research/screenshots/`.

## Milestone 3 interrupted-run handoff — 2026-10-23

Astra's interrupted checkpoint was reviewed against the uploaded source ZIP.
The following checks were **re-run** after targeted fixes in a Linux handoff
environment, not asserted from a previous assistant's report:

- **47 pytest passed, 4 skipped** (native replay fixtures unavailable in the
  Linux runtime). Includes an added SQLite migration-preservation smoke test.
- **TypeScript `tsc -b` passed**, fixing a genuine previously failing test-frame
  type assertion.
- **ESLint and Prettier source checks passed**.
- Existing SQLite DB (inspected read-only from a disposable extracted copy) was
  already at the `m3_profiles` revision and had account/replay records present.
- Frontend browser E2E, Vite bundling, Vitest and native replay parser execution
  remain **unverified** in this runtime: Windows-native optional Node packages
  and the Windows-only replay-parser binding were not runnable. Re-run on Windows.
- Original uploaded ZIP and user database were not modified; deliverable ZIP
  excludes local data, secrets and generated dependency directories.

See [MILESTONE3_HANDOFF.md](MILESTONE3_HANDOFF.md).


## Replay studio visual upgrade - 2026-10-23

Backup workspace only. Replaced the small block-car presentation with original
rounded car bodywork, glass, tires/rims, lights and spoilers; added striped turf,
soft contact shadows, goal nets, seating and floodlight geometry. Cars are
stylised presentation assets, not reconstructed cosmetics or collision hitboxes.
No simulated boost/throttle animation was added without recorded action evidence.
The arena spans the workspace width with a taller responsive stage; coaching
and team detail remain available below it. Director follows recorded local play;
player view is closer. Added camera zoom, reset and free orbit with drag/pan/wheel
and keyboard panning. Overhead framing adapts to portrait aspect. Existing
interpolation, player identity, analysis and stored replay data are unchanged.

Validation: 8 frontend unit tests, 6 Chromium E2E workflows (1.4 minutes), ESLint,
Prettier and TypeScript/Vite build passed. Genuine replay tests assert player
focus, actual camera-distance change on zoom, drag-driven orbit, reset, playback,
automatic coaching/annotations/Continue, notes, reports and responsive layout.
Screenshots inspected locally under .research/screenshots, including
replay-car-detail.png and genuine-rule-coaching.png. An initial test run during
live edits failed playback advancement; the isolated test and final unchanged
full-suite rerun passed. No backend rules, thresholds or account data changed.

## Recorded car bodies and thrust - 2026-10-23

The adapter previously discarded the native parser's car body IDs and replicated
boost/jump component states. Adapter `native-actions-3` retains `car_body_id`,
`car_hitbox_family`, `boost_active`, `jump_active`, `double_jump_active` and
`dodge_active`. Unknown fields remain null; older caches remain readable with
effects disabled when telemetry is absent.

Octane and Fennec select distinct original silhouettes by product ID, despite
sharing a hitbox family. All nine local user replays contained only IDs 23 and
4284. Basic Dominus, Breakout and Merc silhouettes are also supported; unrecognised
IDs use a generic reconstruction labelled with the recorded ID. These are
stylised original geometry, not the game's production meshes, painted cosmetics,
decals or equipped boost assets. The Fennec ID mapping is documented in the
[ballchasing API](https://ballchasing.com/doc/api); legacy IDs are listed in
[Octane's body catalog](https://hackage.haskell.org/package/octane-0.11.0/src/library/Octane/Data/Bodies.hs).

Rear exhaust follows recorded boost-active state. Four local underbody emitters
produce an 180 ms fading burst at recorded jump, double-jump or dodge rising
edges. Missing samples, state changes and teleports break edge continuity.
Effects use replay time, freeze when paused, and reproduce when seeking; altitude,
speed and a falling boost gauge never substitute for recorded activation.
Between continuous samples, movement uses bounded Hermite interpolation with
recorded endpoint velocities and quaternion slerp. Impacts/inconsistent velocities
fall back to linear interpolation. Gaps and resets retain the existing guards.
Large seeks immediately reframe the automatic camera to avoid losing the car.
The final interpolation guards accepted 32,425 of 35,225 moving player segments
in doubles and 3,736 of 4,240 in duel; remaining segments use the linear fallback.

Fresh native parser runs verified the following active **player-frame samples**
(not independent jump/boost event counts):

| Genuine fixture | Frames | Boost | Jump | Double jump | Dodge |
| --- | ---: | ---: | ---: | ---: | ---: |
| Doubles | 9,530 | 6,819 | 748 | 95 | 3,248 |
| Duel | 2,523 | 1,156 | 115 | 10 | 721 |
| Season 24 standard | 7,501 | 9,390 | 1,098 | 152 | 4,444 |

The two existing local frame caches were upgraded using
`uv run --project backend --no-sync python scripts/upgrade-replay-visuals.py --data-dir data`.
The utility refuses changed identity, timing, sample coverage or physics, saves
the previous cache, and atomically replaces the frame JSON. The 10,075 and 10,314
frame caches matched every legacy field after removing only the additive visual
fields/version marker. Database reports, findings, notes and progress were not
rewritten. This utility is explicit; it does not reparse caches on an HTTP GET.

Validation: 79 backend tests, Ruff lint/format and mypy passed. All 12 frontend
unit tests, ESLint, Prettier and TypeScript/Vite production build passed. Chromium
coverage passed all six workflows (1.5 minutes), including genuine upload,
ID-based model switching, actual flame-group
visibility on recorded boost/jump samples, absence on idle samples, frozen paused
effects, interactive cameras, coaching/Continue, feedback, reports and deletion.
Inspected local screenshots include `replay-car-detail.png`,
`replay-fennec-detail.png`, `replay-recorded-boost.png` and
`replay-recorded-jump.png`. Initial browser harness failures involved an evicted
inspector response body and range-input string formatting; the harness now reads
the authenticated frames response directly and uses canonical slider values.
