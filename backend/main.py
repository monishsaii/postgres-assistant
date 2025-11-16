# backend/main.py
from fastapi import FastAPI, Body, HTTPException, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from utils.db_connection import get_connection  # your existing helper for default/test-connection
from services.nl2sql import generate_sql
from utils.session_store import create_session, get_session, delete_session
import re


app = FastAPI()

# CORS - allow local dev frontends (adjust if your frontend runs on a different port)
origins = [ "http://localhost:8080", # Vite frontend dev server 
            "http://127.0.0.1:8080" 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------- Pydantic models ----------
class ConnectRequest(BaseModel):
    host: str
    port: int
    user: str
    password: str
    database: str

class NLQueryRequest(BaseModel):
    nl_query: str

class RunSQLRequest(BaseModel):
    sql_query: str

# --------- Helpers ----------
def _connect_with_config(db_config: dict):
    """
    Returns a psycopg2 connection using the provided db_config dict:
    {"host","port","user","password","database"}
    """
    return psycopg2.connect(
        host=db_config["host"],
        port=db_config["port"],
        user=db_config["user"],
        password=db_config["password"],
        dbname=db_config["database"]
    )

def _get_db_config_from_auth_header(authorization: Optional[str]):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = authorization.split(" ", 1)[1].strip()
    sess = get_session(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    return sess["db"], token


SELECT_ONLY_RE = re.compile(r'^\s*(WITH\s+.+\s+)?SELECT\b', re.IGNORECASE | re.DOTALL)

def is_select_only(sql_text: str) -> bool:
    # basic guard: must start with optional WITH ... then SELECT
    if not sql_text or not isinstance(sql_text, str):
        return False
    # Reject if contains semicolon followed by non-space (multiple statements)
    if ';' in sql_text.strip().rstrip(';'):
        # allow trailing semicolon, but reject multiple statements
        parts = [p for p in sql_text.split(';') if p.strip()]
        if len(parts) > 1:
            return False
    return bool(SELECT_ONLY_RE.match(sql_text.strip()))

# --------- Endpoints ----------
@app.post("/api/connect")
def api_connect(payload: ConnectRequest):
    """
    Validate credentials and create a short-lived session token.
    """
    db_config = {
        "host": payload.host,
        "port": payload.port,
        "user": payload.user,
        "password": payload.password,
        "database": payload.database,
    }

    # test connection quickly
    try:
        conn = _connect_with_config(db_config)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect: {e}")

    token = create_session(db_config)
    return {"status": "success", "token": token, "expires_in": 60 * 30}

@app.post("/api/nl2sql")
def api_nl2sql(body: NLQueryRequest, Authorization: Optional[str] = Header(None)):
    """
    Token-based NL->SQL endpoint.
    Requires `Authorization: Bearer <token>` header where the token was returned by /api/connect.
    """
    # 1) validate Authorization header and get stored db config
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = Authorization.split(" ", 1)[1].strip()

    sess = get_session(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    db_config = sess["db"]  # expected shape: {"host","port","user","password","database"}

    # 2) fetch schema from the stored DB
    try:
        conn = _connect_with_config(db_config)   # uses the helper you added earlier
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema='public';
        """)
        schema_info = "\n".join([f"{r[0]}({r[1]})" for r in cur.fetchall()])
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schema info: {e}")

    # 3) call your Gemini NL2SQL generator
    try:
        sql_query = generate_sql(body.nl_query, schema_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NL2SQL generation failed: {e}")

    # 4) return SQL (frontend can then call /api/run-sql to execute)
    return {"status": "success", "sql_query": sql_query}

@app.post("/api/run-sql")
def api_run_sql(payload: RunSQLRequest, Authorization: Optional[str] = Header(None)):
    """
    Execute SQL (read or write) against the connected DB identified by the session token.
    Returns:
      - For SELECT: { status, sql_query, columns: [...], results: [ {col: val}, ... ] }
      - For DML: { status, sql_query, rowcount, message, results?: [...] } (results only if RETURNING used)
    """
    # 1) get DB config from token
    if not Authorization or not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = Authorization.split(" ", 1)[1].strip()
    sess = get_session(token)
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    db_config = sess["db"]

    sql_query = payload.sql_query
    if not sql_query or not isinstance(sql_query, str):
        raise HTTPException(status_code=400, detail="sql_query is required")

    try:
        conn = _connect_with_config(db_config)
        # use RealDictCursor so SELECT returns list of dicts
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql_query)

        # Try to fetch rows for SELECT-like queries; for DML this raises ProgrammingError
        results = []
        columns = []
        try:
            results = cur.fetchall()  # list of dicts
            columns = list(results[0].keys()) if results else []
            # commit after read as well (no harm)
            conn.commit()
            cur.close()
            conn.close()
            return {
                "status": "success",
                "sql_query": sql_query,
                "columns": columns,
                "results": results
            }
        except psycopg2.ProgrammingError:
            # No rows to fetch — likely DML (INSERT/UPDATE/DELETE)
            rowcount = cur.rowcount
            # If the statement used RETURNING, fetchall would succeed earlier; otherwise no results
            conn.commit()
            cur.close()
            conn.close()
            return {
                "status": "success",
                "sql_query": sql_query,
                "rowcount": rowcount,
                "message": f"Affected rows: {rowcount}"
            }

    except Exception as e:
        # Return informative error to client
        raise HTTPException(status_code=400, detail=f"Query execution failed: {e}")
@app.post("/api/disconnect")
def api_disconnect(Authorization: Optional[str] = Header(None)):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not Authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = Authorization.split(" ", 1)[1].strip()
    delete_session(token)
    return {"status": "ok", "message": "Session ended"}

# Keep simple ping and test-connection endpoints
@app.get("/api/ping")
def ping():
    return {"message": "Postgres Assistant backend is running!"}

@app.get("/api/test-connection")
def test_connection():
    """
    This uses your existing utils.get_connection() (which uses env vars).
    Keep this for server-side DB tests.
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()
        cur.close()
        conn.close()
        return {"status": "success", "postgres_version": version[0]}
    except Exception as e:
        return {"status": "error", "details": str(e)}
