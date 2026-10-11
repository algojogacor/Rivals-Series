import React from 'react';
import Link from 'next/link';

export type EmptyStateMotif = 'pitch' | 'whistle' | 'boot' | 'playmaker' | 'glove' | 'trophy' | 'search';

interface EmptyStateProps {
  title: string;
  description: string;
  motif?: EmptyStateMotif;
  nextStep?: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  motif = 'pitch',
  nextStep,
  actionText,
  actionHref,
  onActionClick,
  className = '',
}: EmptyStateProps) {
  const renderMotifSvg = () => {
    switch (motif) {
      case 'whistle':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--p-a)]/70 shrink-0"
            aria-hidden="true"
          >
            {/* Whistle outline */}
            <circle cx="48" cy="48" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
            <path
              d="M48 26 L18 26 C15 26 12 28 12 32 L12 42 C12 46 15 48 18 48 L26 48"
              stroke="var(--text)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="48" cy="48" r="9" stroke="var(--text-dim)" strokeWidth="2" />
            {/* Sound waves */}
            <path d="M66 22 C70 26 72 32 72 38" stroke="var(--p-a)" strokeWidth="2" strokeLinecap="round" />
            <path d="M72 16 C78 22 80 30 80 40" stroke="var(--p-a)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </svg>
        );

      case 'boot':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--gold)]/80 shrink-0"
            aria-hidden="true"
          >
            {/* Goal net background */}
            <rect x="10" y="14" width="60" height="34" rx="4" stroke="var(--line)" strokeWidth="1.5" />
            <line x1="25" y1="14" x2="25" y2="48" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="40" y1="14" x2="40" y2="48" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="55" y1="14" x2="55" y2="48" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 2" />
            {/* Golden Boot Silhouette / Target */}
            <circle cx="40" cy="56" r="16" stroke="currentColor" strokeWidth="2" />
            <circle cx="40" cy="56" r="6" fill="currentColor" />
            <path d="M28 56 L52 56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M40 44 L40 68" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'playmaker':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--p-b)]/80 shrink-0"
            aria-hidden="true"
          >
            {/* Tactical pitch grid arc */}
            <circle cx="40" cy="40" r="32" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Curved Assist trajectory path */}
            <path
              d="M18 56 C24 32, 44 24, 60 36"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
            {/* Playmaker spark star */}
            <path
              d="M60 36 L66 32 L64 39 L70 42 L63 43 L62 50 L58 44 L51 44 L56 39 L54 32 Z"
              fill="rgba(192, 132, 252, 0.25)"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Ball origin circle */}
            <circle cx="18" cy="56" r="4" fill="var(--p-a)" />
          </svg>
        );

      case 'glove':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--p-b)]/80 shrink-0"
            aria-hidden="true"
          >
            {/* Defensive Shield with Clean Sheet Star */}
            <path
              d="M40 14 L64 24 C64 48 52 64 40 70 C28 64 16 48 16 24 Z"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(167, 139, 250, 0.06)"
            />
            <path
              d="M40 28 L43.5 37 L53 37.5 L45 43.5 L48 52.5 L40 46.5 L32 52.5 L35 43.5 L27 37.5 L36.5 37 Z"
              stroke="var(--text)"
              strokeWidth="1.5"
              fill="none"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'trophy':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--gold)] shrink-0"
            aria-hidden="true"
          >
            {/* Trophy Cup */}
            <path
              d="M26 18 H54 V34 C54 42 48 48 40 48 C32 48 26 42 26 34 Z"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(251, 191, 36, 0.08)"
            />
            {/* Handles */}
            <path d="M26 22 H18 C15 22 14 26 14 30 C14 36 20 40 26 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M54 22 H62 C65 22 66 26 66 30 C66 36 60 40 54 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Stem & Base */}
            <path d="M40 48 V58" stroke="currentColor" strokeWidth="3" />
            <path d="M28 64 H52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'search':
        return (
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 text-[var(--text-dim)] shrink-0"
            aria-hidden="true"
          >
            <circle cx="36" cy="36" r="18" stroke="currentColor" strokeWidth="2.5" />
            <path d="M49 49 L66 66" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="36" cy="36" r="8" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        );

      case 'pitch':
      default:
        return (
          <svg
            width="90"
            height="90"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-4 select-none shrink-0"
            aria-hidden="true"
          >
            <rect
              x="12"
              y="12"
              width="96"
              height="96"
              rx="8"
              stroke="var(--line)"
              strokeWidth="1.5"
              fill="rgba(255, 255, 255, 0.015)"
            />
            <line
              x1="12"
              y1="60"
              x2="108"
              y2="60"
              stroke="var(--line)"
              strokeWidth="1.5"
            />
            <circle
              cx="60"
              cy="60"
              r="22"
              stroke="var(--line)"
              strokeWidth="1.5"
            />
            <circle
              cx="60"
              cy="60"
              r="3"
              fill="var(--p-a)"
              opacity="0.8"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] ${className}`}
    >
      {/* Background stadium light subtle sweep */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
        }}
      />

      {/* Contextual Icon Motif */}
      {renderMotifSvg()}

      {/* Judul utama (display h3) */}
      <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[var(--text)] mb-2">
        {title}
      </h3>

      {/* Penjelas status saat ini */}
      <p className="text-[14px] sm:text-[15px] text-[var(--text-dim)] max-w-md leading-relaxed mb-4">
        {description}
      </p>

      {/* Directional Next Step (Apa yang akan terjadi / langkah selanjutnya) */}
      {nextStep && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text-dim)] mb-6 max-w-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--p-a)] shrink-0" />
          <span>{nextStep}</span>
        </div>
      )}

      {/* Action Button */}
      {actionText && (actionHref || onActionClick) && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center h-11 sm:h-12 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-sm sm:text-[15px] font-semibold hover:bg-white hover:shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all"
          >
            {actionText}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center justify-center h-11 sm:h-12 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-sm sm:text-[15px] font-semibold hover:bg-white hover:shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  );
}
