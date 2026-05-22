import json
import queue

from flask import Response, stream_with_context

from .hub import HEARTBEAT_SECONDS, subscribe, unsubscribe


def sse_response(user_id: int) -> Response:
    def generate():
        sub = subscribe(user_id)
        try:
            yield ": connected\n\n"
            while True:
                try:
                    event, data = sub.get(timeout=HEARTBEAT_SECONDS)
                    yield f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"
                except queue.Empty:
                    yield ": heartbeat\n\n"
        finally:
            unsubscribe(user_id, sub)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
