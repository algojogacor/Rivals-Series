'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getPlayerImageCandidateUrls } from '@/lib/efhub-constants';
import type { PlayerCardMetadata } from '@/lib/db';

export interface PlayerCardVisualProps {
  cardId?: string | number | null;
  basePlayerId?: string | number | null;
  name: string;
  participantId?: 'participant_a' | 'participant_b' | null;
  metadata?: PlayerCardMetadata | null;
  cardVersion?: string | null;
  size?: 'thumb' | 'sm' | 'md' | 'lg';
  showOwnerBadge?: boolean;
  className?: string;
}

// Position color coding standard in eFootball
function getPositionBadgeColor(pos?: string | null): string {
  if (!pos) return 'bg-slate-600 text-white';
  const p = pos.toUpperCase();
  if (p === 'GK') return 'bg-[#eab308] text-black'; // Yellow
  if (['CB', 'LB', 'RB'].includes(p)) return 'bg-[#06b6d4] text-black'; // Cyan / Defending
  if (['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(p)) return 'bg-[#10b981] text-black'; // Emerald / Midfield
  return 'bg-[#f43f5e] text-white'; // Rose / Attacking
}

// Card Tier color themes
interface CardTheme {
  border: string;
  glow: string;
  gradient: string;
  badge: string;
  badgeText: string;
  label: string;
}

function getCardTheme(typeLabel?: string | null, isTrending?: number): CardTheme {
  const t = (typeLabel || '').toLowerCase();

  if (isTrending || t.includes('trending') || t.includes('potw')) {
    return {
      border: 'border-rose-500/80',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
      gradient: 'from-[#4c0519] via-[#881337] to-[#1e1b4b]',
      badge: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white',
      badgeText: 'text-rose-400',
      label: 'TRENDING',
    };
  }

  if (t.includes('epic') || t.includes('legend') || t.includes('big time')) {
    return {
      border: 'border-amber-400/90',
      glow: 'shadow-[0_0_14px_rgba(251,191,36,0.4)]',
      gradient: 'from-[#451a03] via-[#78350f] to-[#1c1917]',
      badge: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black',
      badgeText: 'text-amber-300',
      label: 'EPIC',
    };
  }

  if (t.includes('show time')) {
    return {
      border: 'border-cyan-400/90',
      glow: 'shadow-[0_0_14px_rgba(6,182,212,0.4)]',
      gradient: 'from-[#082f49] via-[#0369a1] to-[#020617]',
      badge: 'bg-gradient-to-r from-cyan-400 to-blue-400 text-black',
      badgeText: 'text-cyan-300',
      label: 'SHOW TIME',
    };
  }

  if (t.includes('highlight') || t.includes('featured')) {
    return {
      border: 'border-emerald-400/90',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      gradient: 'from-[#022c22] via-[#065f46] to-[#0a0f1d]',
      badge: 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 text-black',
      badgeText: 'text-emerald-300',
      label: 'HIGHLIGHT',
    };
  }

  return {
    border: 'border-slate-500/70',
    glow: 'shadow-[0_0_8px_rgba(100,116,139,0.2)]',
    gradient: 'from-[#1e293b] via-[#0f172a] to-[#020617]',
    badge: 'bg-slate-400 text-black',
    badgeText: 'text-slate-400',
    label: 'STANDARD',
  };
}

export function PlayerCardVisual({
  cardId,
  basePlayerId,
  name,
  participantId,
  metadata,
  cardVersion,
  size = 'thumb',
  showOwnerBadge = true,
  className = '',
}: PlayerCardVisualProps) {
  // Infer card type from metadata or cardVersion string
  const effectiveCardType = metadata?.card_type_label || (
    cardVersion?.toLowerCase().includes('trending') ? 'Trending' :
    cardVersion?.toLowerCase().includes('epic') ? 'Epic' :
    cardVersion?.toLowerCase().includes('show time') ? 'Show Time' :
    cardVersion?.toLowerCase().includes('highlight') ? 'Highlight' : 'Standard'
  );

  const effectiveRating = metadata?.overall_max || null;
  const effectivePos = metadata?.position_label || null;
  const isTrending = metadata?.is_trending ?? (cardVersion?.toLowerCase().includes('trending') ? 1 : 0);

  const theme = getCardTheme(effectiveCardType, isTrending);
  const posBadgeColor = getPositionBadgeColor(effectivePos);

  // Always load the official vertical portrait eFootball card (240x340).
  // Mini-cards in eFHUB is a 180x120 horizontal banner that crops and distorts portrait slots.
  const imageVariant = 'card';

  const candidates = useMemo(() => {
    if (!cardId && !basePlayerId) return [];
    return getPlayerImageCandidateUrls(
      cardId || basePlayerId || '',
      basePlayerId || undefined,
      imageVariant
    );
  }, [cardId, basePlayerId]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Only reset state if the card ID actually changes between renders (prevents resetting on client route transitions)
  const prevCardKey = useRef(`${cardId}-${basePlayerId}`);
  useEffect(() => {
    const currentKey = `${cardId}-${basePlayerId}`;
    if (prevCardKey.current !== currentKey) {
      prevCardKey.current = currentKey;
      setCandidateIndex(0);
      setRetryCount(0);
      setImageLoaded(false);
    }
  }, [cardId, basePlayerId]);

  const rawActiveUrl = candidateIndex < candidates.length ? candidates[candidateIndex] : null;
  const activeUrl = rawActiveUrl
    ? retryCount > 0
      ? `${rawActiveUrl}${rawActiveUrl.includes('?') ? '&' : '?'}r=${retryCount}`
      : rawActiveUrl
    : null;

  const handleImageError = () => {
    // If we're on the primary CDN URL (index 0), give Nginx reverse proxy a moment
    // to finish caching the image from upstream eFHUB before falling back or giving up.
    if (candidateIndex === 0 && retryCount < 2) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, 800);
      return;
    }
    // Proceed to next fallback URL candidate
    setCandidateIndex((prev) => prev + 1);
    setRetryCount(0);
  };

  // Initials for fallback
  const initials = useMemo(() => {
    const parts = (name || 'P').trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    return (name || 'P').slice(0, 2).toUpperCase();
  }, [name]);

  // Dimensions & typography classes (native eFootball card aspect ratio is 240 / 340 ~ 1:1.41)
  const isThumb = size === 'thumb';
  const isLarge = size === 'lg' || size === 'md';

  const containerSizes = {
    thumb: 'h-[46px] aspect-[240/340] rounded-[5px]',
    sm: 'h-[76px] aspect-[240/340] rounded-[8px]',
    md: 'h-[116px] aspect-[240/340] rounded-[10px]',
    lg: 'h-[156px] sm:h-[168px] aspect-[240/340] rounded-[12px]',
  }[size];

  const borderStyle = isThumb
    ? 'border border-white/15 shadow-sm'
    : `border-2 ${theme.border} ${theme.glow} shadow-md`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden select-none bg-[var(--ink-2)] bg-gradient-to-b ${theme.gradient} ${borderStyle} ${containerSizes} group transition-all duration-300 hover:scale-105 hover:z-20 ${className}`}
      title={`${name} · ${effectiveCardType} ${effectiveRating ? `(${effectiveRating})` : ''}`}
    >
      {/* 1. Official eFootball Vertical Card Image */}
      {activeUrl ? (
        <>
          {/* Skeleton loader sits behind the image while downloading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[var(--ink-0)] animate-pulse flex items-center justify-center z-0">
              <span className="text-[10px] font-bold text-[var(--gold)]/60">{initials}</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(node) => {
              // If already cached by browser, immediately mark as loaded without waiting for onLoad
              if (node && node.complete && node.naturalWidth > 0 && !imageLoaded) {
                setImageLoaded(true);
              }
            }}
            src={activeUrl}
            alt={name}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className="w-full h-full object-cover rounded-[inherit] relative z-10"
          />
        </>
      ) : (
        /* 2. Procedural Authentic eFootball Card Fallback */
        <div className="w-full h-full flex flex-col justify-between p-1.5 relative overflow-hidden">
          {/* Card Header: Rating & Position */}
          <div className="flex items-start justify-between gap-0.5 z-10">
            <div className="flex flex-col leading-none">
              {effectiveRating && (
                <span className={`font-[family-name:var(--font-display)] font-extrabold tracking-tight ${
                  isThumb ? 'text-[11px]' : 'text-sm sm:text-base'
                } text-white drop-shadow-md`}>
                  {effectiveRating}
                </span>
              )}
              {effectivePos && (
                <span className={`font-mono font-bold uppercase rounded-[2px] px-0.5 leading-tight ${posBadgeColor} ${
                  isThumb ? 'text-[7px]' : 'text-[9px]'
                }`}>
                  {effectivePos}
                </span>
              )}
            </div>
          </div>

          {/* Center Initials Silhouette */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <span className={`font-[family-name:var(--font-display)] font-black text-white ${
              isThumb ? 'text-lg' : 'text-3xl sm:text-4xl'
            }`}>
              {initials}
            </span>
          </div>

          {/* Card Footer: Type Banner & Name */}
          <div className="z-10 mt-auto pt-1 leading-tight">
            <span className={`block font-[family-name:var(--font-display)] font-bold text-white truncate drop-shadow-sm ${
              isThumb ? 'text-[8px]' : 'text-[11px]'
            }`}>
              {name}
            </span>
            {isLarge && (
              <span className={`block font-mono uppercase tracking-wider font-extrabold ${theme.badgeText} text-[8px]`}>
                {theme.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Team Owner Indicator (COR / CMS) */}
      {showOwnerBadge && participantId && (
        isThumb ? (
          /* Subtle bottom accent line on thumbnails to avoid obscuring the player's face/rating */
          <div
            className={`absolute bottom-0 inset-x-0 h-[2.5px] z-20 ${
              participantId === 'participant_a' ? 'bg-[#f43f5e]' : 'bg-[#06b6d4]'
            }`}
          />
        ) : (
          /* Prominent pill badge for larger cards */
          <div className="absolute top-1 right-1 z-20 pointer-events-none">
            <span
              className={`inline-block font-mono font-black uppercase tracking-wider rounded-[3px] shadow-sm leading-none ${
                participantId === 'participant_a'
                  ? 'bg-[#f43f5e] text-white border border-rose-300/40'
                  : 'bg-[#06b6d4] text-black border border-cyan-200/50'
              } text-[8px] px-1.5 py-0.5`}
            >
              {participantId === 'participant_a' ? 'COR' : 'CMS'}
            </span>
          </div>
        )
      )}

      {/* 4. Luxury Holographic Foil Sheen on Hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transform duration-1000" />
    </div>
  );
}
