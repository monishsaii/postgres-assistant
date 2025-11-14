import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DBConnectionInput = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type DBConnection = DBConnectionInput & {
  connected: boolean;
};

type DBContextType = {
  connection: DBConnection;
  setConnection: (update: Partial<DBConnection>) => void;
  setDefaults: (defaults: DBConnectionInput) => void;
  reset: () => void;
};

const DEFAULTS_KEY = "db_defaults";

const defaultConnection: DBConnection = {
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "",
  database: "test",
  connected: false,
};

const DBContext = createContext<DBContextType | undefined>(undefined);

export const DBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connection, setConnectionState] = useState<DBConnection>(defaultConnection);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEFAULTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DBConnectionInput;
        setConnectionState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const api = useMemo<DBContextType>(
    () => ({
      connection,
      setConnection: (update) =>
        setConnectionState((prev) => ({ ...prev, ...update })),
      setDefaults: (defaults) => {
        localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
        setConnectionState((prev) => ({ ...prev, ...defaults, connected: false }));
      },
      reset: () => setConnectionState(defaultConnection),
    }),
    [connection]
  );

  return <DBContext.Provider value={api}>{children}</DBContext.Provider>;
};

export const useDB = () => {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error("useDB must be used within DBProvider");
  return ctx;
};
