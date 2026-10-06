"""In-memory budget for LLM calls, so a public demo can't be used to drain an API quota."""

import threading
import time
from collections import defaultdict, deque


class LLMBudget:
    """
    Sliding one-hour window per client plus a rolling 24-hour cap for the whole server.
    In-memory is enough for a single-instance demo; multiple instances would need Redis.
    """

    def __init__(self, per_client_per_hour: int, per_day: int, clock=time.monotonic) -> None:
        self.per_client_per_hour = per_client_per_hour
        self.per_day = per_day
        self._clock = clock
        self._lock = threading.Lock()
        self._by_client: dict[str, deque[float]] = defaultdict(deque)
        self._global: deque[float] = deque()

    def try_acquire(self, client: str) -> bool:
        now = self._clock()
        with self._lock:
            calls = self._by_client[client]
            _drop_older_than(calls, now - 3600)
            _drop_older_than(self._global, now - 86_400)
            if len(calls) >= self.per_client_per_hour or len(self._global) >= self.per_day:
                return False
            calls.append(now)
            self._global.append(now)
            return True


def _drop_older_than(window: deque[float], cutoff: float) -> None:
    while window and window[0] <= cutoff:
        window.popleft()
