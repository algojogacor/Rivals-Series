'use client';

import React, { useState, useEffect } from 'react';
import { getPlayerImageCandidateUrls } from '@/lib/efhub-constants';

interface PlayerAvatarProps {
  cardId?: string | number | null;
  basePlayerId?: string | number | null;
  name: string;
  position?: string | null;
  isTrending?: boolean | number;
  isIndonesian?: boolean | number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PlayerAvatar({
  cardId,
  basePlayerId,
  name,
  position,
  isTrending,
  isIndonesian,
  size = 'md',
  className = '',
}: PlayerAvatarProps) {
  const candidates = React.useMemo(() => {
    if (!cardId && !basePlayerId) return [];
    return getPlayerImageCandidateUrls(cardId || basePlayerId || '', basePlayerId || undefined);
  }, [cardId, basePlayerId]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [cardId, basePlayerId]);

  const initials = React.useMemo(() => {
    const cleaned = (name || 'P').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  }, [name]);

  const sizeMap = {
    sm: 'w-9 h-9 text-xs rounded-[6px]',
    md: 'w-12 h-12 text-sm rounded-[8px]',
    lg: 'w-16 h-16 text-lg rounded-[10px]',
    xl: 'w-24 h-24 text-2xl rounded-[12px]',
  };

  const borderStyle = Number(isTrending) === 1
    ? 'border-[var(--p-a)]/60 bg-[var(--p-a-soft)]'
    : Number(isIndonesian) === 1
    ? 'border-[var(--ok)]/60 bg-[var(--ok)]/10'
    : 'border-[var(--line)] bg-[var(--ink-2)]';

  const activeUrl = candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  return (
    <div
      className={`relative shrink-0 overflow-hidden border flex items-center justify-center select-none ${sizeMap[size]} ${borderStyle} ${className}`}
    >
      {activeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={name}
          loading="lazy"
          onError={() => setCandidateIndex((prev) => prev + 1)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="flex flex-col items-center justify-center leading-none">
          <span className="font-[family-name:var(--font-display)] font-extrabold tracking-tight text-[var(--text)]">
            {initials}
          </span>
          {position && size !== 'sm' && (
            <span className="text-[9px] font-mono uppercase text-[var(--text-dim)] mt-0.5">
              {position}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
