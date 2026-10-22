# Implementation ledger

## Inspection and architecture

The initial tracked repository contained README.md and .gitignore. The untracked
`backend/replay_finder.py` learning script and zero-byte `test_replays/` files
have been preserved. There was no existing application or dependency setup.

Use a monorepo with `frontend/` (React, TypeScript, Vite, Three.js, Tailwind),
`backend/` (FastAPI, SQLAlchemy, Alembic), `docs/`, and `.github/workflows/`.
The API owns authentication, replay processing, stored findings and exports.
The browser receives a versioned, timestamped replay model and renders original
geometric assets. Native replay parsing runs in a bounded subprocess, outside
the API process. A database-backed worker handles durable processing jobs.
SQLite is the local default; PostgreSQL is the production target.

## Sequenced milestones

1. Foundation: runnable shell, health API, formatting, lint, types, tests.
2. Real replay: bounded uploads, parser adapter, genuine-fixture tests, original
   arena, interpolation, playback, timestamp and coordinate tests.
3. Coaching presentation: deterministic cameras, annotations, authored moments,
   pause/context/review/continue state machine.
4. Rules: conservative explainable detectors with positive and negative cases,
   evidence and versioning, viewer integration.
5. Persistence: accounts, sessions, ownership, migrations, replay history,
   selected-player reports, feedback, analytics, goals and deletion.
6. ML infrastructure: review labels, reproducible features, grouped held-out
   evaluation. No unvalidated model in the product.
7. Hardening: CI, containers, error handling, end-to-end checks, operations and
   explicit production gaps. No push, deployment or billing is authorized.

## Verified library research (2026-10-22)

- npm `@rlrml/player@1.5.1` depends on `@rlrml/subtr-actor@1.5.1` and peers
  on `three@^0.180.0`; both declare MIT licensing.
- `subtr-actor-py==1.5.1` provides a CPython abi3 Windows x64 wheel; installed
  successfully on Python 3.11.5. `get_replay_frames_data(filepath)` returns
  metadata, timestamped frames, player rigid bodies and event streams.
- Actual data parsed from upstream `assets/recent-ranked-doubles-2026-03-10.replay`.
  The file is ignored and is not redistributed as a product asset.
- Use the native Python parser with our own versioned transport/viewer adapter.
  The player package was inspected but is not needed as a second parser.
- Coordinates follow the upstream adapter: (x,y,z) -> (x,z,y); quaternion
  (x,y,z,w) -> (x,z,y,-w). Rendering scales positions by 1/100.

Primary sources:
- https://github.com/rlrml/subtr-actor/blob/master/python/PYTHON-README.md
- https://github.com/rlrml/subtr-actor/blob/master/js/player/README.md
- https://github.com/rlrml/subtr-actor/blob/master/js/player/src/player/adapter/coords.ts
- https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- https://docs.sqlalchemy.org/en/20/orm/quickstart.html
- https://vite.dev/guide/
- https://tailwindcss.com/docs/installation/using-vite

## Milestone 1

Implemented the monorepo, React shell, API health endpoint and check commands.
Verification results and later milestone status are recorded in VERIFICATION.md.

## Delivered checkpoints

- `978aeb9`: Milestone 1 foundation, verified and committed.
- `43d42fd`: Integrated replay/viewer, authored coaching, three rule detectors,
  persistent accounts/history/reports and local security (Milestones 2–5).
- `9ed9c12`: Milestone 6 data/feature/offline baseline infrastructure. No validated
  model enabled; expert labels and production evaluation remain outstanding.
- Milestone 7 adds reproducible lockfiles, CI, containers, migration/security tests
  and runbooks. Local container/PostgreSQL execution and remote CI remain unverified.

The full commercial production objective is not complete. See OPERATIONS.md,
ML.md and LEGAL.md for explicit unfinished work and launch requirements.
