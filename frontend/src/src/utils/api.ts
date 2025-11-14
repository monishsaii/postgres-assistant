// frontend/src/api.ts
import type { DBConnectionInput } from "../context/DBContext";

const BASE_URL = "http://127.0.0.1:8000";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function postRaw(url: string, body: unknown, token?: string) {
  const finalUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(finalUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const payload = await safeJson(res);
  if (!res.ok) {
    // payload might be string or object; normalize
    const message = typeof payload === "string" ? payload : (payload?.detail ?? payload?.message ?? JSON.stringify(payload));
    throw new Error(`(${res.status}) ${message}`);
  }
  return payload;
}

/* Token helpers - store token in localStorage under 'pg_token' */
export function setToken(token: string) {
  localStorage.setItem("pg_token", token);
}
export function getToken(): string | null {
  return localStorage.getItem("pg_token");
}
export function clearToken() {
  localStorage.removeItem("pg_token");
}

export type ConnectResponse = {
  status: string;
  token?: string;
  expires_in?: number;
  message?: string;
};

function validateConnectionInput(config: DBConnectionInput) {
  if (!config.host) throw new Error("DB host is required");
  if (!config.port) throw new Error("DB port is required");
  if (!config.user) throw new Error("DB user is required");
  if (!config.password) throw new Error("DB password is required");
  if (!config.database) throw new Error("DB database is required");
}

/**
 * connectToDB
 * - Posts DB credentials to /api/connect
 * - On success stores token in localStorage and returns the response
 */
export const connectToDB = async (
  config: DBConnectionInput
): Promise<ConnectResponse> => {
  validateConnectionInput(config);

  const payload = {
    host: config.host,
    port: Number(config.port),
    user: config.user,
    password: config.password,
    database: config.database,
  };

  console.log("Sending /api/connect payload:", payload);
  const resp = await postRaw("/api/connect", payload);
  if (resp?.token) setToken(String(resp.token));
  return resp as ConnectResponse;
};

/* Types used for generateSQL output normalization */
export type GenerateSQLParams = {
  nl_query: string;
  connection?: DBConnectionInput; // optional: only used for legacy fallback
};

export type GenerateSQLResponse = {
  sql: string;
  columns: string[];
  rows: any[][];
};

/**
 * generateSQL
 * - Preferred flow: use saved token (session) and POST { nl_query } to /api/nl2sql
 * - Fallback: if no token, POST full connection + nl_query to /api/nl2sql (legacy)
 * - Normalizes output to { sql, columns, rows }
 */
export const generateSQL = async (
  params: GenerateSQLParams
): Promise<GenerateSQLResponse> => {
  if (!params.nl_query) throw new Error("nl_query is required");

  const token = getToken();

  if (token) {
    // session-based flow (recommended)
    console.log("Calling /api/nl2sql with session token");
    const resp = await postRaw("/api/nl2sql", { nl_query: params.nl_query }, token);
    // expected shape: { status: "success", sql_query: "..." } per backend
    const sql: string = resp?.sql_query ?? resp?.sql ?? resp?.query ?? "";
    return { sql, columns: [], rows: [] };
  } else {
    // legacy: send full connection + nl_query (keeps backward compatibility)
    if (!params.connection) throw new Error("No session token and no connection provided");
    validateConnectionInput(params.connection);

    const payload = {
      host: params.connection.host,
      port: Number(params.connection.port),
      user: params.connection.user,
      password: params.connection.password,
      database: params.connection.database,
      nl_query: params.nl_query,
    };

    console.log("Calling legacy /api/nl2sql with connection payload");
    const resp = await postRaw("/api/nl2sql", payload);

    // normalize various possible backend formats
    const sql: string = resp.sql_query ?? resp.sql ?? resp.generated_sql ?? resp.query ?? "";

    let columns: string[] = [];
    let rows: any[][] = [];

    // backend might return columns+results, or results array of objects under 'results'
    if (Array.isArray(resp.columns) && Array.isArray(resp.results)) {
      columns = resp.columns;
      rows = resp.results;
    } else if (Array.isArray(resp.columns) && Array.isArray(resp.rows)) {
      columns = resp.columns;
      rows = resp.rows;
    } else if (Array.isArray(resp.results) && resp.results.length && typeof resp.results[0] === "object" && !Array.isArray(resp.results[0])) {
      // results: array of objects (RealDictCursor)
      const results = resp.results as Record<string, any>[];
      const keys = new Set<string>();
      results.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
      columns = Array.from(keys);
      rows = results.map((r) => columns.map((c) => r[c]));
    } else if (Array.isArray(resp.results) && Array.isArray(resp.results[0])) {
      // results is already rows
      rows = resp.results;
      columns = resp.columns ?? [];
    }

    return { sql, columns, rows };
  }
};

/**
 * runSQL
 * - Executes an SQL string on server using session token (must be connected)
 * - Returns normalized result: { sql, columns, results }
 */
export type RunSQLResponse = {
  status: string;
  sql_query: string;
  columns: string[];
  results: any[]; // may be array of rows or array of objects depending on backend
};

export const runSQL = async (sql_query: string): Promise<RunSQLResponse> => {
  if (!sql_query) throw new Error("sql_query is required");
  const token = getToken();
  if (!token) throw new Error("No session token found — call connectToDB first");

  const resp = await postRaw("/api/run-sql", { sql_query }, token);

  // backend returns { status, sql_query, columns, results }
  return {
    status: resp.status ?? "success",
    sql_query: resp.sql_query ?? sql_query,
    columns: resp.columns ?? [],
    results: resp.results ?? [],
  } as RunSQLResponse;
};
