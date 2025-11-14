import React from "react";
import { Check, Copy } from "lucide-react";

export const SQLDisplay: React.FC<{ sql: string }> = ({ sql }) => {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (!sql) return null;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-medium">Generated SQL</h3>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          aria-label="Copy SQL to clipboard"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-sm"><code>{sql}</code></pre>
    </div>
  );
};

export default SQLDisplay;
