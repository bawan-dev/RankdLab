# Local development

Requires Python 3.11+ and Node 22.12+ (tested with Python 3.11.5 / Node 24.13.0).
Use `npm.cmd` on Windows if PowerShell blocks npm.ps1.

```powershell
cd C:\Code\RankdLab
python -m venv backend\.venv
backend\.venv\Scripts\python -m pip install -e "backend[dev]"
cd frontend
npm.cmd ci
npm.cmd run dev
```

In another terminal, from the repository root:

```powershell
backend\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:5173. Vite proxies `/api` to FastAPI.

Development startup applies Alembic migrations automatically. The database and
replay files live in ignored `data/`. Register an account in the local UI; there
are no built-in credentials or seeded matches. Existing `test_replays/` files
are empty learning fixtures, not usable matches.

For the genuine compatibility fixture and browser tests, from the repo root:

```powershell
python scripts/fetch-test-replay.py
cd frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The E2E suite starts isolated servers on 8001/5174 and uses a separate database
under `.research/e2e/`. It never uses your normal local account database. Pytest
skips its genuine replay test if the downloaded fixture is missing; the E2E
workflow requires it. Screenshots are written to `.research/screenshots/`.

Checks, from `backend/`:
`.venv\Scripts\python -m pytest`, `.venv\Scripts\ruff check app tests`,
`.venv\Scripts\ruff format --check app tests`, `.venv\Scripts\mypy app`.

Checks, from `frontend/`: `npm.cmd run lint`, `npm.cmd run format:check`,
`npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`.
