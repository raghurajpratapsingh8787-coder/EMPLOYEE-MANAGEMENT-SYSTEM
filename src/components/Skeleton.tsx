import React from 'react';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800/70" />
          </div>
          <div className="hidden md:block h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="hidden sm:block h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 animate-pulse space-y-3"
        >
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-36 rounded bg-slate-100 dark:bg-slate-800/70" />
        </div>
      ))}
    </div>
  );
}
