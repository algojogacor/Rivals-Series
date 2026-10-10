import React from 'react';
import { ParticipantId } from '@/lib/types';

interface PlayerTagProps {
  id: ParticipantId;
  name: string;
  monogram?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
  nameClassName?: string;
}

export function PlayerTag({
  id,
  name,
  monogram,
  size = 'md',
  showName = true,
  className = '',
  nameClassName = '',
}: PlayerTagProps) {
  const isA = id === 'participant_a';
  const playerColor = isA ? 'var(--p-a)' : 'var(--p-b)';
  const displayMonogram = monogram || (name ? name.slice(0, 2).toUpperCase() : isA ? 'PA' : 'PB');

  const blockSizes = {
    sm: 'w-6 h-6 text-xs rounded-[8px]',
    md: 'w-8 h-8 text-sm rounded-[8px]',
    lg: 'w-11 h-11 text-xl rounded-[8px]',
  };

  const nameSizes = {
    sm: 'text-[13px] font-medium leading-none',
    md: 'text-[15px] font-semibold leading-none',
    lg: 'text-xl font-bold font-[family-name:var(--font-display)] tracking-tight leading-none',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Initial block */}
      <div
        className={`flex items-center justify-center font-[family-name:var(--font-display)] font-extrabold select-none shrink-0 text-[var(--ink-0)] ${blockSizes[size]}`}
        style={{ backgroundColor: playerColor }}
        aria-hidden="true"
      >
        {displayMonogram}
      </div>

      {/* Name */}
      {showName && (
        <span className={`text-[var(--text)] truncate ${nameSizes[size]} ${nameClassName}`}>
          {name}
        </span>
      )}
    </div>
  );
}
