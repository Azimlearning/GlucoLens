"""
Simple in-memory caches for session-scoped data.
For production, swap for Redis. The interface stays the same.
"""
import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Optional


class TTLCache:
    """Thread-safe LRU cache with per-entry TTL."""

    def __init__(self, max_size: int = 512, default_ttl_s: int = 300):
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max = max_size
        self._ttl = default_ttl_s
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._store:
                return None
            value, expires_at = self._store[key]
            if time.time() > expires_at:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    def set(self, key: str, value: Any, ttl_s: Optional[int] = None) -> None:
        with self._lock:
            expires_at = time.time() + (ttl_s if ttl_s is not None else self._ttl)
            self._store[key] = (value, expires_at)
            self._store.move_to_end(key)
            while len(self._store) > self._max:
                self._store.popitem(last=False)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


# Module-level shared caches
view_state_cache = TTLCache(max_size=256, default_ttl_s=300)        # Agent 7
patient_profile_cache = TTLCache(max_size=512, default_ttl_s=600)   # Agents 3, 5, 8
nutrient_estimate_cache = TTLCache(max_size=1024, default_ttl_s=86400)  # Agent 2
image_recognition_cache = TTLCache(max_size=128, default_ttl_s=60)  # Agent 1 (cost optimizer)
