import React, { useState } from 'react';

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [errored, setErrored] = useState(false);

  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-14 h-14 text-base'
        : size === 'xl'
          ? 'w-20 h-20 text-xl'
          : 'w-9 h-9 text-xs';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  if (src && !errored) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={`${sizeClass} rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-lg shrink-0 flex items-center justify-center font-semibold tracking-tight bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700`}
    >
      {initials || 'HR'}
    </div>
  );
}
