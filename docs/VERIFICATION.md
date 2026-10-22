# Verification ledger

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
