# backend/utils/session_store.py
import time
import threading
import uuid
from typing import Dict, Any

_SESSIONS: Dict[str, Dict[str, Any]] = {}
_LOCK = threading.Lock()
SESSION_TTL = 60 * 30  # 30 minutes; adjust as needed

def create_session(db_config: dict, ttl: int = SESSION_TTL) -> str:
    token = uuid.uuid4().hex
    now = int(time.time())
    session = {"created": now, "expires": now + ttl, "db": db_config}
    with _LOCK:
        _SESSIONS[token] = session
    return token

def get_session(token: str):
    with _LOCK:
        s = _SESSIONS.get(token)
        if not s:
            return None
        if s["expires"] < int(time.time()):
            del _SESSIONS[token]
            return None
        return s

def delete_session(token: str):
    with _LOCK:
        _SESSIONS.pop(token, None)

def _cleanup_loop(interval: int = 60):
    while True:
        now = int(time.time())
        with _LOCK:
            expired = [t for t, s in _SESSIONS.items() if s["expires"] < now]
            for t in expired:
                del _SESSIONS[t]
        time.sleep(interval)

# start background cleaner
_cleanup_thread = threading.Thread(target=_cleanup_loop, daemon=True)
_cleanup_thread.start()
