# Verification ledger

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
