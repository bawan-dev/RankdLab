import json
import logging
import time
import uuid

from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

logger = logging.getLogger("rankdlab.http")


class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        for key in ("request_id", "method", "path", "status", "duration_ms", "replay_id"):
            if hasattr(record, key):
                entry[key] = getattr(record, key)
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry)


class BodyTooLarge(HTTPException):
    def __init__(self):
        super().__init__(status_code=413, detail="Request exceeds upload limit")


class RequestGuard:
    def __init__(self, app, origins: list[str], max_bytes: int):
        self.app, self.origins, self.max_bytes = app, origins, max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope["headers"])
        method = scope["method"]
        limit = (
            self.max_bytes if method == "POST" and scope["path"] == "/api/replays" else 64 * 1024
        )
        if method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = headers.get(b"origin", b"").decode()
            if headers.get(b"x-requested-with") != b"RankdLab" or (
                origin and origin not in self.origins
            ):
                return await JSONResponse({"detail": "Request origin verification failed"}, 403)(
                    scope, receive, send
                )
        try:
            content_length = int(headers.get(b"content-length", b"0"))
        except ValueError:
            return await JSONResponse({"detail": "Invalid content length"}, 400)(
                scope, receive, send
            )
        if content_length > limit:
            return await JSONResponse({"detail": "Request exceeds upload limit"}, 413)(
                scope, receive, send
            )
        consumed = 0

        async def limited_receive():
            nonlocal consumed
            message = await receive()
            consumed += len(message.get("body", b""))
            if consumed > limit:
                raise BodyTooLarge
            return message

        request_id = uuid.uuid4().hex
        start = time.monotonic()

        async def logged_send(message):
            if message["type"] == "http.response.start":
                message["headers"] = [
                    *message.get("headers", []),
                    (b"x-request-id", request_id.encode()),
                    (b"x-content-type-options", b"nosniff"),
                    (b"cache-control", b"no-store"),
                ]
                logger.info(
                    "request",
                    extra={
                        "request_id": request_id,
                        "method": method,
                        "path": scope["path"],
                        "status": message["status"],
                        "duration_ms": round((time.monotonic() - start) * 1000),
                    },
                )
            await send(message)

        try:
            await self.app(scope, limited_receive, logged_send)
        except BodyTooLarge:
            await JSONResponse({"detail": "Request exceeds upload limit"}, 413)(
                scope, receive, logged_send
            )
