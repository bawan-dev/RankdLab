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

Checks, from `backend/`:
`.venv\Scripts\python -m pytest`, `.venv\Scripts\ruff check app tests`,
`.venv\Scripts\ruff format --check app tests`, `.venv\Scripts\mypy app`.

Checks, from `frontend/`: `npm.cmd run lint`, `npm.cmd run format:check`,
`npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`.
