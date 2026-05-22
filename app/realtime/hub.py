"""In-memory event bus for SSE (single-process; sufficient for dev/small deploy)."""

from __future__ import annotations

import queue
import threading
from typing import Any

_lock = threading.Lock()
_subscribers: dict[int, list[queue.Queue[tuple[str, dict[str, Any]]]]] = {}

HEARTBEAT_SECONDS = 25


def subscribe(user_id: int) -> queue.Queue[tuple[str, dict[str, Any]]]:
    q: queue.Queue[tuple[str, dict[str, Any]]] = queue.Queue(maxsize=64)
    with _lock:
        _subscribers.setdefault(user_id, []).append(q)
    return q


def unsubscribe(user_id: int, q: queue.Queue[tuple[str, dict[str, Any]]]) -> None:
    with _lock:
        subs = _subscribers.get(user_id, [])
        if q in subs:
            subs.remove(q)
        if not subs:
            _subscribers.pop(user_id, None)


def publish(user_id: int, event: str, data: dict[str, Any]) -> None:
    with _lock:
        subs = list(_subscribers.get(user_id, []))
    for sub in subs:
        try:
            sub.put_nowait((event, data))
        except queue.Full:
            pass
