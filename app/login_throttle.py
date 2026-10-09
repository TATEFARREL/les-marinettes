"""Throttling of failed login attempts.

State is kept in process memory: it resets when the app restarts and is not
shared between worker processes. Production runs a single uvicorn process.
"""

import math
import time
from collections import OrderedDict, deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field

from fastapi import Request


@dataclass(frozen=True)
class ThrottleRule:
    max_attempts: int
    window_seconds: float
    lockout_seconds: float


@dataclass
class _Entry:
    attempts: deque[float] = field(default_factory=deque)
    locked_until: float = 0.0


ThrottleKey = tuple[str, str]


class LoginThrottle:
    def __init__(
        self,
        rules: dict[str, ThrottleRule],
        *,
        max_keys: int = 20_000,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._rules = rules
        self._max_keys = max_keys
        self._clock = clock
        self._entries: OrderedDict[ThrottleKey, _Entry] = OrderedDict()

    def retry_after(self, keys: Iterable[ThrottleKey]) -> int:
        """Seconds until every given key is unlocked; 0 when none is locked."""
        now = self._clock()
        remaining = 0.0
        for key in keys:
            entry = self._entries.get(key)
            if entry is not None and entry.locked_until > now:
                remaining = max(remaining, entry.locked_until - now)
        return math.ceil(remaining)

    def record_attempt(self, keys: Iterable[ThrottleKey]) -> None:
        """Count an attempt before the password is checked.

        Counting up front, in the same synchronous step as ``retry_after``,
        stops concurrent requests from all slipping past the limit while
        their password checks are still running.
        """
        now = self._clock()
        for key in keys:
            rule = self._rules[key[0]]
            entry = self._entries.get(key)
            if entry is None:
                entry = _Entry()
                self._entries[key] = entry
            self._entries.move_to_end(key)
            while entry.attempts and entry.attempts[0] <= now - rule.window_seconds:
                entry.attempts.popleft()
            entry.attempts.append(now)
            if len(entry.attempts) >= rule.max_attempts:
                entry.locked_until = now + rule.lockout_seconds
                entry.attempts.clear()
        self._evict(now)

    def forgive(self, key: ThrottleKey) -> None:
        """Withdraw the most recent attempt for ``key`` (it turned out to succeed)."""
        entry = self._entries.get(key)
        if entry is not None and entry.attempts:
            entry.attempts.pop()

    def reset(self, key: ThrottleKey) -> None:
        self._entries.pop(key, None)

    def clear(self) -> None:
        self._entries.clear()

    def _evict(self, now: float) -> None:
        if len(self._entries) <= self._max_keys:
            return
        for key, entry in list(self._entries.items()):
            rule = self._rules[key[0]]
            stale = not entry.attempts or entry.attempts[-1] <= now - rule.window_seconds
            if entry.locked_until <= now and stale:
                del self._entries[key]
        while len(self._entries) > self._max_keys:
            self._entries.popitem(last=False)


# The per-account rule is the one that holds even if an attacker forges the
# client IP headers by calling the Render origin directly.
login_throttle = LoginThrottle(
    {
        "email": ThrottleRule(max_attempts=5, window_seconds=15 * 60, lockout_seconds=15 * 60),
        "ip": ThrottleRule(max_attempts=20, window_seconds=15 * 60, lockout_seconds=15 * 60),
    }
)


def client_ip(request: Request) -> str:
    # Behind Cloudflare and Render's proxy, request.client is the proxy itself.
    cf_ip = request.headers.get("cf-connecting-ip", "").strip()
    if cf_ip:
        return cf_ip
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"
