import React from "react";
import { useDB } from "../context/DBContext";
import { toast } from "sonner";

const SettingsPage: React.FC = () => {
  const { connection, setDefaults } = useDB();
  const [host, setHost] = React.useState(connection.host || "localhost");
  const [port, setPort] = React.useState<number>(connection.port || 5432);
  const [username, setUsername] = React.useState(connection.username || "");
  const [password, setPassword] = React.useState(connection.password || "");
  const [database, setDatabase] = React.useState(connection.database || "test");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setDefaults({ host, port, username, password, database });
    toast.success("Saved defaults");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <form onSubmit={save} className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Default Host</span>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Default Port</span>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Default Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Default Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Default Database</span>
            <input
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
          >
            Save Defaults
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
