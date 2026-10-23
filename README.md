# RankdLab

An independent Rocket League replay coaching workspace built with React,
TypeScript, Three.js and FastAPI. **Functional local development product;
experimental coaching, not production or commercial signoff.**

The original vision is preserved in [docs/VISION.md](docs/VISION.md).

## What works

- Accounts with Argon2id passwords, opaque HttpOnly sessions and owner isolation.
- Bounded `.replay` uploads, durable background processing and safe failure states.
- Actual `subtr-actor-py` parsing: metadata, cars, ball, rotations, velocities,
  boost, timestamps, clock and goals. Compatibility tested with genuine replays.
- Original simplified 3D arena, interpolation, play/pause, seek, rewind, speed,
  overhead/elevated/follow/aerial cameras and a deterministic coaching director.
- Authored coaching moments, automatic pauses, context rewind, recorded/proposed
  arrows, evidence, Continue, inaccurate-detection feedback and saved progress.
- Versioned experimental geometry detectors for team formats plus a conservative
  duel exposure candidate; positive/negative scenarios do not establish coaching accuracy.
- Stored reports, JSON export, browser print/PDF layout, history, time-normalized
  trends, coaching goals, replay and account deletion.
- SQLite locally, PostgreSQL configuration, Alembic migrations, CI/container
  configuration and offline feature/label/baseline experimentation infrastructure.

No trained coaching model, calibrated confidence probabilities, expert coaching
validation or SSL-quality claim. The genuine doubles compatibility fixture has
zero automatic flags at the current conservative thresholds; authored notes test
the coaching experience on its real frames. No fake account metrics or seeded
matches appear in the product.

## Start locally (Windows)

Requires Python 3.11+ and Node 22.12+; tested with Python 3.11.5 / Node 24.13.0.

```powershell
cd C:\Code\RankdLab
python -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -e "backend[dev,ml]"
backend\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd C:\Code\RankdLab\frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173** and create a local account. There are no seeded
credentials. Development startup applies migrations; local data stays in ignored
`data/`. On Linux/macOS use `backend/.venv/bin/python` and `npm`.

For the locked environment, `uv sync --project backend --frozen --extra dev
--extra ml` replaces the venv/pip setup above. See [development commands](docs/DEVELOPMENT.md).

## Verification

```powershell
python scripts/fetch-test-replay.py --all
backend\.venv\Scripts\python -m pytest backend/tests
backend\.venv\Scripts\ruff check backend/app backend/tests backend/migrations
backend\.venv\Scripts\mypy --platform linux --config-file backend/pyproject.toml backend/app
cd frontend
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

See the exact executed results and remaining limits in
[docs/VERIFICATION.md](docs/VERIFICATION.md). For the 2026-10-23 source
handoff and Windows merge instructions, see
[docs/MILESTONE3_HANDOFF.md](docs/MILESTONE3_HANDOFF.md). The E2E suite uses isolated 8001/5174
servers and test data. Real fixture downloads are checksum-pinned and ignored.

## Repository map

```text
frontend/src/       UI, replay renderer, playback and coaching state
frontend/e2e/       real upload-to-report browser checks
backend/app/        API, authentication, jobs, parser adapter, rules, ML tools
backend/migrations/ versioned database schema
backend/tests/      scenarios, security, persistence and genuine compatibility
scripts/            fixture downloader and PostgreSQL smoke check
docs/               architecture, limitations, operations and ML/launch review
```

## Remaining work

Qualified coach evaluation, broader replay/arena coverage, additional tactical
detectors, opportunity-based metrics, expert review tooling, real labelled data,
validated models, account recovery/email verification, load/security testing and
production monitoring are incomplete. Docker daemon execution and PostgreSQL
runtime checks were unavailable locally; CI has been written but not remotely run.

Read [implementation plan](docs/IMPLEMENTATION.md), [replay contracts](docs/REPLAY_ENGINE.md),
[ML roadmap](docs/ML.md), [operations](docs/OPERATIONS.md) and [launch review](docs/LEGAL.md).
No code has been pushed or publicly deployed, and billing is not enabled.

RankdLab is not affiliated with or endorsed by Psyonix or Epic Games. Rocket League
and its trademarks belong to their respective owners.


Milestone 4 backup implementation: see [local handoff](docs/MILESTONE4.md),
[tactical architecture](docs/COACHING_ARCHITECTURE.md), [detector catalog](docs/DETECTOR_CATALOG.md)
and [evaluation status](docs/EVALUATION.md). Added candidates remain unvalidated
heuristics; no trained production coaching model or accuracy claim is made.
