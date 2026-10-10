import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  onActionClick,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] ${className}`}
    >
      {/* SVG football pitch line linework: center circle + half line, stroke var(--line), 120px */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-4 select-none shrink-0"
        aria-hidden="true"
      >
        {/* Outer boundary pitch frame */}
        <rect
          x="12"
          y="12"
          width="96"
          height="96"
          rx="6"
          stroke="var(--line)"
          strokeWidth="1.5"
        />
        {/* Half line */}
        <line
          x1="12"
          y1="60"
          x2="108"
          y2="60"
          stroke="var(--line)"
          strokeWidth="1.5"
        />
        {/* Center circle */}
        <circle
          cx="60"
          cy="60"
          r="20"
          stroke="var(--line)"
          strokeWidth="1.5"
        />
        {/* Center spot */}
        <circle
          cx="60"
          cy="60"
          r="2.5"
          fill="var(--line)"
        />
      </svg>

      {/* Satu kalimat judul (display h3) */}
      <h3 className="text-2xl font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[var(--text)] mb-2">
        {title}
      </h3>

      {/* Satu kalimat penjelas --text-dim */}
      <p className="text-[15px] text-[var(--text-dim)] max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {/* Tombol aksi opsional (Primary: fill --text, text --ink-0, h-48, radius 8) */}
      {actionText && (actionHref || onActionClick) && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-[15px] font-semibold hover:opacity-90 transition-opacity"
          >
            {actionText}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-[15px] font-semibold hover:opacity-90 transition-opacity"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  );
}
