import React from "react";
import ConnectionForm from "../components/ConnectionForm";
import QueryInput from "../components/QueryInput";
import SQLDisplay from "../components/SQLDisplay";
import ResultTable from "../components/ResultTable";

const HomePage: React.FC = () => {
  const [sql, setSql] = React.useState("");
  const [columns, setColumns] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<any[][]>([]);

  const handleResult = (newSql: string, cols: string[], data: any[][]) => {
    setSql(newSql);
    setColumns(cols);
    setRows(data);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Postgres Assistant</h1>
          <p className="text-sm/6 text-white/85">Connect to your database, ask in plain English, get SQL and results.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ConnectionForm />
        </div>
        <div className="lg:col-span-3">
          <QueryInput onResult={handleResult} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SQLDisplay sql={sql} />
        </div>
        <div className="lg:col-span-3">
          <ResultTable columns={columns} results={rows} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
