import React from "react";
import { useDB } from "../context/DBContext";
import { connectToDB } from "../utils/api";
import { toast } from "sonner";
import Loader from "./Loader";

export const ConnectionForm: React.FC = () => {
  const { connection, setConnection, reset } = useDB();

  const [host, setHost] = React.useState(connection.host || "");
  const [port, setPort] = React.useState<number>(connection.port || 5432);
  const [user, setUsername] = React.useState(connection.user || "");
  const [password, setPassword] = React.useState(connection.password || "");
  const [database, setDatabase] = React.useState(connection.database || "");
  const [loading, setLoading] = React.useState(false);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await connectToDB({ host, port, user, password, database });

      if (res.status) {
        setConnection({ host, port, user, password, database, connected: true });
        toast.success("Connected to Postgres");
      } else {
        setConnection({ connected: false });
        toast.error(res.message || "Connection failed");
      }
    } catch (err: any) {
      setConnection({ connected: false });
      toast.error(err?.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    reset();
    toast("Disconnected");
  };

  return (
    <form onSubmit={connect} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Database Connection</h2>
        {connection.connected ? (
          <span className="text-xs text-emerald-600">Connected</span>
        ) : (
          <span className="text-xs text-muted-foreground">Not connected</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Host</span>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="localhost"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Port</span>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="5432"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">User</span>
          <input
            type="text"
            value={user} // ← fixed: was 'username'
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-muted-foreground">Database</span>
          <input
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="test"
            required
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
        >
          {loading ? <Loader label="Connecting" /> : "Connect"}
        </button>

        <button
          type="button"
          onClick={disconnect}
          className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
        >
          Disconnect
        </button>
      </div>
    </form>
  );
};

export default ConnectionForm;
