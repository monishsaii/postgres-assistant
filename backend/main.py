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



@app.post("/api/run-sql")
def api_run_sql(payload: RunSQLRequest, Authorization: Optional[str] = Header(None)):
    """
    Execute SQL against the connected DB and return results.
    """
    db_config, _token = _get_db_config_from_auth_header(Authorization)
    sql_query = payload.sql_query

    try:
        conn = _connect_with_config(db_config)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(sql_query)
        # try to fetch rows (SELECT); for non-SELECT, fetchall will raise and we'll return empty results
        try:
            rows = cur.fetchall()
            # RealDictCursor returns list of dicts; also extract column order
            columns = list(rows[0].keys()) if rows else []
        except psycopg2.ProgrammingError:
            # no results (e.g., UPDATE/INSERT)
            rows = []
            columns = []
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {e}")

    return {"status": "success", "sql_query": sql_query, "columns": columns, "results": rows}

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
