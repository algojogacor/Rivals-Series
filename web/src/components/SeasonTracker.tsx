'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Match, Participant } from '@/lib/types';

interface SeasonTrackerProps {
  matches: Match[];
  participants?: Participant[];
  className?: string;
}

export function SeasonTracker({ matches, participants, className = '' }: SeasonTrackerProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // Map matches by md_number
  const matchMap = new Map<number, Match>();
  matches.forEach((m) => matchMap.set(m.md_number, m));

  // Count confirmed matches
  const confirmedCount = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  ).length;

  // Find the next scheduled match (first match not confirmed and not awaiting)
  const nextMatch = matches.find((m) => m.status === 'scheduled') || null;
  const nextMdNumber = nextMatch ? nextMatch.md_number : null;

  const renderSegment = (md: number) => {
    const match = matchMap.get(md);
    const isNext = md === nextMdNumber;
    const status = match?.status || 'scheduled';
    const isConfirmed = ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(status);
    const isAwaiting = status === 'awaiting_confirmation' || match?.confirmation_status === 'pending';

    let segmentStyle: React.CSSProperties = {};
    // Balok tebal tinggi 10px, lebar fleksibel, sudut membulat 3px
    let segmentClasses = 'block w-full h-[10px] rounded-[3px] box-border transition-all cursor-pointer focus:outline-none';
    let tooltipText = `MD${md}`;

    if (isConfirmed && match) {
      if (match.is_draw === 1) {
        segmentStyle = {
          background: 'linear-gradient(to right, var(--p-a) 50%, var(--p-b) 50%)',
        };
        tooltipText = `MD${md}: Seri (${match.home_score ?? 0}–${match.away_score ?? 0})`;
      } else if (match.winner_id === 'participant_a') {
        segmentStyle = { backgroundColor: 'var(--p-a)' };
        tooltipText = `MD${md}: Menang Pemain A (${match.home_score ?? 0}–${match.away_score ?? 0})`;
      } else if (match.winner_id === 'participant_b') {
        segmentStyle = { backgroundColor: 'var(--p-b)' };
        tooltipText = `MD${md}: Menang Pemain B (${match.home_score ?? 0}–${match.away_score ?? 0})`;
      } else {
        segmentStyle = { backgroundColor: 'var(--text-dim)' };
        tooltipText = `MD${md}: Selesai`;
      }
    } else if (isAwaiting) {
      segmentClasses += ' border-[1.5px] border-[var(--text-dim)] bg-transparent';
      tooltipText = `MD${md}: Menunggu konfirmasi`;
    } else if (isNext) {
      // Laga berikutnya = outline --text dan berdenyut pelan
      segmentClasses += ' border-[1.5px] border-[var(--text)] animate-pulse-slow bg-transparent';
      tooltipText = `MD${md}: Laga berikutnya`;
    } else {
      // Belum main = outline --line
      segmentClasses += ' border-[1.5px] border-[var(--line)] bg-[var(--ink-1)]';
      tooltipText = `MD${md}: Belum dimainkan`;
    }

    const isHovered = activeTooltip === md;

    return (
      <div
        key={md}
        className="relative flex-1 group"
        onMouseEnter={() => setActiveTooltip(md)}
        onMouseLeave={() => setActiveTooltip(null)}
        onClick={() => setActiveTooltip(activeTooltip === md ? null : md)}
      >
        <Link
          href={`/matches/${md}`}
          className={segmentClasses}
          style={segmentStyle}
          aria-label={tooltipText}
        />

        {/* Hover / Tap Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none whitespace-nowrap rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] px-2.5 py-1 text-[13px] font-medium text-[var(--text)] shadow-[0_12px_32px_rgb(0_0_0_/_0.45)]">
            {tooltipText}
          </div>
        )}
      </div>
    );
  };

  const groupStageMds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const knockoutMds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Desktop view: 20 segmen horizontal dalam dua kelompok (MD1–10 Group Stage, celah 24px, MD11–20 Knockout) */}
      <div className="hidden md:flex items-start gap-6 w-full">
        {/* Kelompok Group Stage: label sejajar dengan awal kelompok */}
        <div className="flex-1 space-y-2">
          <div className="text-left text-[13px] font-semibold text-[var(--text-dim)] tracking-wide">
            Group Stage · MD1–10
          </div>
          <div className="flex items-center gap-1.5 w-full">
            {groupStageMds.map(renderSegment)}
          </div>
        </div>

        {/* Kelompok Knockout: label sejajar dengan awal kelompok */}
        <div className="flex-1 space-y-2">
          <div className="text-left text-[13px] font-semibold text-[var(--text-dim)] tracking-wide">
            Knockout · MD11–20
          </div>
          <div className="flex items-center gap-1.5 w-full">
            {knockoutMds.map(renderSegment)}
          </div>
        </div>
      </div>

      {/* Mobile view: dua baris (10 + 10), label kelompok sejajar di awal baris */}
      <div className="flex md:hidden flex-col gap-3.5 w-full">
        <div className="space-y-1.5">
          <div className="text-left text-[13px] font-semibold text-[var(--text-dim)] tracking-wide">
            Group Stage · MD1–10
          </div>
          <div className="flex items-center gap-1 w-full">
            {groupStageMds.map(renderSegment)}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-left text-[13px] font-semibold text-[var(--text-dim)] tracking-wide">
            Knockout · MD11–20
          </div>
          <div className="flex items-center gap-1 w-full">
            {knockoutMds.map(renderSegment)}
          </div>
        </div>
      </div>

      {/* Teks di bawahnya: "X dari 20 laga disahkan" */}
      <div className="flex items-center justify-between text-[13px] text-[var(--text-dim)] pt-0.5">
        <span>{confirmedCount} dari 20 laga disahkan</span>
        <span className="text-[var(--text-faint)]">Sentuh segmen untuk rincian MD</span>
      </div>
    </div>
  );
}
