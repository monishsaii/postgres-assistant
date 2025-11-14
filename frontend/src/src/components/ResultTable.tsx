import React from "react";

export type ResultTableProps = {
  columns: string[];
  results: any[][];
};

export const ResultTable: React.FC<ResultTableProps> = ({ columns, results }) => {
  if (!columns?.length) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="border-b p-3">
        <h3 className="text-sm font-medium">Query Results</h3>
      </div>
      <div className="w-full overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-2 font-semibold text-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results?.length ? (
              results.map((row, i) => (
                <tr key={i} className="border-t">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-muted-foreground">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-muted-foreground">
                  No rows returned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultTable;
