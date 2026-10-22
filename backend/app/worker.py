import json
import logging
import os
import subprocess
import sys
import threading
from pathlib import Path

from sqlalchemy import select, update

from app.analysis import VERSION, analyse
from app.coaching import snapshot
from app.database import Replay, now
from app.playlists import replay_format

logger = logging.getLogger("rankdlab.worker")


def run_parser(source: Path, target: Path, timeout: int) -> dict:
    # Fixed argument vector; never execute a filename or interpolate shell commands.
    environment = os.environ.copy()
    environment.update(OPENBLAS_NUM_THREADS="1", OMP_NUM_THREADS="1")
    result = subprocess.run(
        [sys.executable, "-m", "app.parse", str(source), str(target)],
        timeout=timeout,
        capture_output=True,
        shell=False,
        env=environment,
    )
    if result.returncode or not target.exists() or target.stat().st_size > 160 * 1024**2:
        raise ValueError("Corrupted, unsupported or oversized replay data")
    return json.loads(target.read_text(encoding="utf-8"))


class ReplayWorker:
    def __init__(self, sessions, settings):
        self.sessions = sessions
        self.settings = settings
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.run, name="replay-worker", daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=self.settings.parser_timeout + 5)

    def run(self):
        while not self.stop_event.is_set():
            try:
                if not self.process_one():
                    self.stop_event.wait(0.5)
            except Exception:
                logger.exception("worker_iteration_failed")
                self.stop_event.wait(2)

    def process_one(self) -> bool:
        with self.sessions() as db:
            # Recover abandoned work only after the bounded parser time has elapsed.
            db.execute(
                update(Replay)
                .where(
                    Replay.status == "processing",
                    Replay.claimed_at < now() - self.settings.parser_timeout - 60,
                )
                .values(status="queued", claimed_at=None)
            )
            candidate = db.scalar(
                select(Replay.id)
                .where(Replay.status == "queued")
                .order_by(Replay.created_at)
                .limit(1)
            )
            if not candidate:
                db.commit()
                return False
            claimed = db.execute(
                update(Replay)
                .where(Replay.id == candidate, Replay.status == "queued")
                .values(status="processing", claimed_at=now())
            )
            db.commit()
            if claimed.rowcount != 1:
                return True
        directory = self.settings.data_dir / "replays" / candidate
        target = directory / "frames.json"
        try:
            data = run_parser(directory / "source.replay", target, self.settings.parser_timeout)
            diagnostics: dict = {}
            findings, active_seconds = analyse(data, candidate, diagnostics)
            (directory / "analysis-diagnostics.json").write_text(
                json.dumps(diagnostics, indent=2), encoding="utf-8"
            )
            data["metadata"]["active_seconds"] = active_seconds
            with self.sessions() as db:
                replay = db.get(Replay, candidate)
                if replay:
                    replay.metadata_json = data["metadata"]
                    replay.findings = findings
                    replay.engine_version = VERSION
                    replay.coaching_context = snapshot(
                        db, replay.user_id, replay_format(replay), replay.id
                    )
                    replay.status = "ready"
                    db.commit()
            logger.info("replay_ready", extra={"replay_id": candidate})
        except Exception:
            logger.exception("replay_processing_failed", extra={"replay_id": candidate})
            target.unlink(missing_ok=True)
            with self.sessions() as db:
                replay = db.get(Replay, candidate)
                if replay:
                    replay.status = "failed"
                    replay.error = (
                        "This file could not be processed. Use an intact Soccar .replay file "
                        "(up to 30 minutes)."
                    )
                    db.commit()
        return True
