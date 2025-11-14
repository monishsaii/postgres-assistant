import React from "react";

export const Loader: React.FC<{ label?: string; className?: string }> = ({ label, className }) => {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`} role="status" aria-live="polite">
      <svg className="h-5 w-5 animate-spin text-primary" viewBox="0 0 50 50">
        <circle className="opacity-30" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" />
        <circle className="opacity-90" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="5" fill="none" strokeDasharray="100" strokeDashoffset="75" />
      </svg>
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  );
};

export default Loader;
