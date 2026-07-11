"use client";

import type { ReactNode } from "react";

// Shared page header: title block on the left, action buttons on the right.
export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
      <div>
        {title}
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}
