# Milestone 3 — local source handoff (2026-10-23)

This handoff finishes several interrupted Checkpoint F items **without replacing the
replay parser, database, or existing local user data**. Keep the original project
and a backup until you verify the updated app on Windows.

## Changes in this source ZIP

- Fixed the last trajectory continuity test so it constructs a complete `Frame`
  instead of relying on an invalid TypeScript cast. The TypeScript project now
  type-checks cleanly.
- Updated onboarding so saving player details doesn't immediately redirect the
  user away from 1v1, 2v2 and 3v3 rank selectors. An explicit **Go to dashboard**
  action is available once player details are saved; **Skip for now** remains
  available. Updated the Playwright onboarding scenario.
- Added a step-by-step onboarding summary and a more polished finish panel.
- Replaced the large, unhelpful zero-detection report empty state with concise
  evidence-first guidance and a **Review the replay** action. Findings are not
  manufactured or reclassified.
- Improved the persistent application header so it displays the current page
  (Duel, Doubles, Standard, viewer, report, etc.) rather than the same generic
  label everywhere.
- Added a real SQLite Alembic regression test that upgrades synthetic legacy
  accounts/replays to the Milestone 3 schema and verifies preservation and
  repeated-upgrade safety.
- Preserved the existing league-specific dashboard, manual rank storage,
  playlist classification and coaching functionality.

## Verification actually completed in the handoff environment

| Check | Result |
| --- | --- |
| Python backend suite | **47 passed, 4 skipped** (offline test environment) |
| Legacy-to-Milestone-3 migration regression | Passed |
| TypeScript `tsc -b` | Passed |
| ESLint | Passed |
| Prettier source check | Passed |
| Python syntax compilation | Passed |
| Original uploaded SQLite schema inspection | Already at `m3_profiles`; existing account and replay rows present |
| Vitest, Vite bundle and browser E2E | **Not executed**: the original ZIP's `node_modules` bundles Windows-native optional binaries, which do not run under Linux; npm download was unavailable |
| Native replay parser test cases | **Not executed**: Windows-native `subtr_actor` binary cannot execute in this Linux runtime |

The four skipped backend cases include replay-fixture/native parsing checks.
This is a verified source handoff, **not** a fully verified production release.

## What to do on Windows

1. **Stop both local RankdLab servers** (Vite and FastAPI).
2. Keep your existing `C:\Code\RankdLab` folder. Make a backup of the
   folder or at least your `data` directory and local code changes.
3. Extract the handoff ZIP so its `RankdLab` source folder overlays the existing
   `C:\Code\RankdLab` source folder. **Do not delete the existing folder first.**
4. The handoff deliberately contains no `data/`, `.git/`, `.research/`,
   `frontend/node_modules/`, `backend/.venv/`, `.env`, uploaded replays or
   personal database files. Keep those existing folders untouched.
5. Start your backend and frontend using the original README commands.
6. Run `backend\.venv\Scripts\python -m pytest backend/tests`, then in
   `frontend` run `npm.cmd run build`, `npm.cmd run lint`,
   `npm.cmd run format:check`, `npm.cmd test` and `npm.cmd run test:e2e`.
7. Manually test onboarding with two saved ranks, upload a **genuine** replay,
   inspect its match report, then test a replay with zero automated findings.

If you use Git, check `git diff` before staging. Nothing here was pushed or
committed to your local repository. Do not stage your `data` or `.env` files.

## Important unfinished product work

- **Detector recall remains limited.** This handoff does not increase or falsify
  findings. All three prior real fixture analyses had zero eligible findings.
- Three playlist-specific coaching experiences exist, but they are not
  comprehensive tactical intelligence or qualified expert-validated advice.
- Human-reviewed drawn alternative routes / rich annotation authoring and a
  labelled expert dataset remain broader product work beyond this handoff.
- End-to-end rendering, Windows-native replay decoding and the full Playwright
  suite still require verification on your actual development machine.
- No Epic or RL Tracker account linkage, scraping, or unapproved external data
  access is included.
