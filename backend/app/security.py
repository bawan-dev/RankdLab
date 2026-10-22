import hashlib
import secrets
import threading
from collections import defaultdict, deque
from time import monotonic

from fastapi import HTTPException
from pwdlib import PasswordHash

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("rankdlab-dummy-timing-password")
COOKIE = "rankdlab_session"


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


class RateLimiter:
    """Single-process limiter. Add a shared edge limiter before scaling replicas."""

    def __init__(self):
        self.entries: dict[str, deque] = defaultdict(deque)
        self.lock = threading.Lock()

    def check(self, key: str, limit: int, seconds: int):
        with self.lock:
            current = monotonic()
            if len(self.entries) > 10000:
                self.entries = defaultdict(
                    deque, {k: v for k, v in self.entries.items() if v and v[-1] > current - 3600}
                )
            values = self.entries[key]
            while values and values[0] <= current - seconds:
                values.popleft()
            if len(values) >= limit:
                raise HTTPException(
                    429,
                    "Too many requests. Try again later.",
                    headers={"Retry-After": str(seconds)},
                )
            values.append(current)
