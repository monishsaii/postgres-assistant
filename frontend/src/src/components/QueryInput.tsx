import React from "react";
import { useDB } from "../context/DBContext";
import { generateSQL } from "../utils/api";
import { toast } from "sonner";
import Loader from "./Loader";

export const QueryInput: React.FC<{
  onResult: (sql: string, columns: string[], rows: any[][]) => void;
}> = ({ onResult }) => {
  const { connection } = useDB();
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection.connected) {
      toast.error("Please connect to the database first");
      return;
    }
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { sql, columns, rows } = await generateSQL({
        nl_query: query,
        connection: {
          host: connection.host,
          port: connection.port,
          user: connection.user,
          password: connection.password,
          database: connection.database,
        },
      });
      onResult(sql, columns, rows);
      if (!columns?.length) toast("No rows returned");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate SQL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Natural Language Query</h2>
        <span className="text-xs text-muted-foreground">Connected: {connection.connected ? "Yes" : "No"}</span>
      </div>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Show the top 10 customers by revenue last quarter"
        className="min-h-[140px] w-full rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={loading || !connection.connected}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {loading ? <Loader label="Generating" /> : "Generate SQL"}
        </button>
      </div>
    </form>
  );
};

export default QueryInput;
