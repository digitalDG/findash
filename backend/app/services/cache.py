from datetime import datetime, timedelta, timezone
from typing import Optional

import redis
from app.core.config import settings

KEY_PREFIX = "findash:"


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Cache:
    """
    Redis-backed cache with a transparent in-memory fallback.
    All keys are namespaced under KEY_PREFIX so this instance can share
    a Redis server with other apps without collision.
    """

    def __init__(self) -> None:
        self._client: Optional[redis.Redis] = None
        self._mem: dict = {}  # fallback: key -> {val, exp}
        try:
            client: redis.Redis = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            client.ping()
            self._client = client
            print(f"[cache] Redis connected at {settings.redis_url}")
        except Exception as exc:
            print(f"[cache] Redis unavailable ({exc}) — using in-memory fallback")

    # ── low-level get / set / delete ───────────────────────────────────────

    def get(self, key: str) -> Optional[str]:
        k = KEY_PREFIX + key
        if self._client:
            try:
                return self._client.get(k)
            except Exception:
                pass
        entry = self._mem.get(k)
        if not entry:
            return None
        if entry["exp"] is not None and _now() > entry["exp"]:
            del self._mem[k]
            return None
        return entry["val"]

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        """Store *value* under *key*.  If *ttl* is given (seconds) the key expires."""
        k = KEY_PREFIX + key
        if self._client:
            try:
                self._client.set(k, value, ex=ttl)
                return
            except Exception:
                pass
        self._mem[k] = {
            "val": value,
            "exp": _now() + timedelta(seconds=ttl) if ttl else None,
        }

    def delete(self, key: str) -> None:
        k = KEY_PREFIX + key
        if self._client:
            try:
                self._client.delete(k)
            except Exception:
                pass
        self._mem.pop(k, None)

    @property
    def using_redis(self) -> bool:
        return self._client is not None


# Module-level singleton shared across the application
cache = Cache()
