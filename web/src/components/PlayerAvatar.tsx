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
  const variant = size === 'xl' ? 'card' : 'mini';

  const candidates = React.useMemo(() => {
    if (!cardId && !basePlayerId) return [];
    return getPlayerImageCandidateUrls(
      cardId || basePlayerId || '',
      basePlayerId || undefined,
      variant
    );
  }, [cardId, basePlayerId, variant]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setRetryCount(0);
  }, [cardId, basePlayerId, variant]);

  const rawActiveUrl = candidateIndex < candidates.length ? candidates[candidateIndex] : null;
  const activeUrl = rawActiveUrl
    ? retryCount > 0
      ? `${rawActiveUrl}${rawActiveUrl.includes('?') ? '&' : '?'}r=${retryCount}`
      : rawActiveUrl
    : null;

  const handleImageError = () => {
    if (candidateIndex === 0 && retryCount < 2) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, 800);
      return;
    }
    setCandidateIndex((prev) => prev + 1);
    setRetryCount(0);
  };

  const initials = React.useMemo(() => {
    const cleaned = (name || 'P').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  }, [name]);

  const sizeMap = {
    sm: 'w-12 h-8 text-xs rounded-[6px]',
    md: 'w-[68px] h-[48px] text-sm rounded-[8px]',
    lg: 'w-[84px] h-[58px] text-lg rounded-[8px]',
    xl: 'w-24 h-[134px] text-2xl rounded-[10px]',
  };

  const borderStyle = Number(isTrending) === 1
    ? 'border-[var(--p-a)]/60 bg-[var(--p-a-soft)]'
    : Number(isIndonesian) === 1
    ? 'border-[var(--ok)]/60 bg-[var(--ok)]/10'
    : 'border-[var(--line)] bg-[var(--ink-1)]';

  return (
    <div
      className={`relative shrink-0 overflow-hidden border flex items-center justify-center select-none ${sizeMap[size]} ${borderStyle} ${className}`}
    >
      {activeUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt={name}
          onError={handleImageError}
          className="w-full h-full object-contain"
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
