# Local operations and deployment preparation

This checkout is a functional development product. It has not been publicly
deployed, load tested, penetration tested or approved for commercial launch.

## Reproducible dependencies

`backend/uv.lock` resolves runtime and optional extras across supported platforms.
`backend/requirements.lock` is a hash-pinned runtime export used by the container.
Use `uv sync --project backend --frozen --extra dev --extra ml` for the tested
development environment. Use `npm ci` against the frontend lockfile.

## Local container configuration

Copy `.env.example` to `.env` and choose a new random URL-safe database password
for `RANKDLAB_DB_PASSWORD`. Never commit `.env`. From the repository root:

```text
docker compose config --quiet
docker compose up --build --wait
```

Open http://127.0.0.1:8080. The only published port binds loopback. PostgreSQL and
the API stay on the Compose network. The API applies Alembic migrations before
starting, runs one HTTP worker plus a durable replay job thread, and stores files
in `replay_data`. The UI uses nginx with same-origin API proxying and SPA routes.
Containers use non-root app users, dropped capabilities, no-new-privileges,
read-only roots and temporary writable `/tmp`. The API has a 3 GiB container limit;
the parser adds Linux CPU/address-space/output limits and a wall-clock timeout.

The Compose file passed local configuration validation. Docker Desktop's Linux
daemon was unavailable in this session, so images, health checks, volume
permissions and the PostgreSQL runtime must still be verified. CI jobs are
provided to perform those checks after an approved push; CI has not run remotely.

## Before a production deployment

An actual deployment requires owner approval. Prepare a separate environment:

- Set `RANKDLAB_ENVIRONMENT=production`, a PostgreSQL URL, explicit HTTPS browser
  origins, explicit allowed hosts (including 127.0.0.1 for health checks), and
  `RANKDLAB_SECURE_COOKIES=true`. The app rejects insecure production settings
  and refuses startup when the database migration is behind the code.
- Put TLS termination in front of the web container, configure DNS, security
  updates and secret injection. Pin reviewed image digests for the release.
- Set a retention/storage quota and deletion policy, including backups/exports.
  Replay records are limited to 50 per account, 20 pending jobs globally and
  10 uploads/hour per account. Quotas are application checks, not a hard global
  transactional storage budget. Add a disk-space alert and enforce edge limits.
- Keep one API replica until the queue, quotas and crash recovery are stress
  tested. Current authentication/upload rate limits are process-local. A trusted
  ingress/shared limiter is necessary for multiple replicas and abusive traffic.
- Add email verification, password recovery, session administration, accessibility
  audit, parser fuzzing, storage exhaustion tests and incident response review.
- Separate native parsing into a stronger OS/container sandbox before treating
  hostile replay processing as fully isolated. Windows currently enforces only
  the subprocess timeout, not Linux address-space limits.
- Complete the legal/data review in LEGAL.md and expert detector evaluation.
  There is no paid subscription or billing integration.

## Health and error monitoring

`GET /api/health` checks the database and, when enabled, the replay worker thread.
It is suitable for readiness/liveness in the documented single-process topology.
Requests carry an `X-Request-ID`. `rankdlab.*` logs are JSON with request path,
status, latency and failure tracebacks; passwords and upload bodies are not
logged. Clients receive generic unexpected-error messages. Failed replay jobs
receive a safe persisted message that survives restart.

Collect container stdout/stderr in the deployment log service, alert on health
failures, repeated 5xx, parsing timeout/failure rates, queue age and disk space.
An external error monitoring provider is not connected or sending events yet;
its routing, privacy filters, retention and alert delivery require configuration
and a real alert drill before production signoff.

## Backups and recovery

For the native SQLite setup: stop the owned API, back up `data/` together (database,
WAL sidecars if present and `replays/`), restart, then restore to a separate folder
and verify login, a ready replay, a report and a new upload. Alternatively use
SQLite's online backup API for a database snapshot and coordinate file retention.
Never copy only a live main DB file and assume WAL transactions were included.

For PostgreSQL: take encrypted scheduled `pg_dump -Fc` backups plus a coordinated
snapshot of `replay_data`. Record application commit and Alembic revision with
each backup. Define retention and an RPO/RTO, test `pg_restore` into a fresh test
database and restore files into a separate volume. Run migration/status checks,
health, ownership tests and a replay/report smoke check before switching traffic.
No backup service or scheduled job has been enabled by this checkout.

Deletion removes live DB rows and replay files, and cascades feedback/labels.
Records are first marked as deleting so they cannot be claimed by the parser.
File-removal failures return a retryable error and retain the account/record;
the app does not report successful deletion while an OS deletion failure occurs.
Backups and previously downloaded exports remain subject to their documented
retention policy. Interrupted deletions can be retried from the UI. Disk access
failures must be monitored; orphan-file reconciliation and concurrent account
deletion/upload stress tests remain part of production hardening.

## CI and releases

`.github/workflows/ci.yml` contains separate checks for backend, frontend,
browser flow, PostgreSQL migrations/CRUD, and container builds/startup. Official
GitHub actions are pinned to verified commit SHAs, checkout persists no write
credential, and the workflow has read-only repository permission. It does not
push code, publish images or deploy. Only local Git commits were made here.
