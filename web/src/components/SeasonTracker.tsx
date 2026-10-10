'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Match, Participant } from '@/lib/types';
import { Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';

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

  const completionPct = Math.round((confirmedCount / 20) * 100);

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
    let segmentClasses =
      'block w-full h-[14px] rounded-[4px] box-border transition-all cursor-pointer focus:outline-none relative';
    let tooltipText = `MD${md}`;
    let badgeText = '';

    if (isConfirmed && match) {
      if (match.is_draw === 1) {
        segmentStyle = {
          background: 'linear-gradient(to right, var(--p-a) 50%, var(--p-b) 50%)',
        };
        tooltipText = `MD${md}: Seri (${match.home_score ?? 0}–${match.away_score ?? 0})`;
        badgeText = 'D';
      } else if (match.winner_id === 'participant_a') {
        segmentStyle = {
          backgroundColor: 'var(--p-a)',
          boxShadow: '0 0 10px var(--p-a-glow)',
        };
        tooltipText = `MD${md}: Menang Pemain A (${match.home_score ?? 0}–${match.away_score ?? 0})`;
        badgeText = 'A';
      } else if (match.winner_id === 'participant_b') {
        segmentStyle = {
          backgroundColor: 'var(--p-b)',
          boxShadow: '0 0 10px var(--p-b-glow)',
        };
        tooltipText = `MD${md}: Menang Pemain B (${match.home_score ?? 0}–${match.away_score ?? 0})`;
        badgeText = 'B';
      } else {
        segmentStyle = { backgroundColor: 'var(--text-dim)' };
        tooltipText = `MD${md}: Selesai`;
      }
    } else if (isAwaiting) {
      segmentClasses += ' border-[1.5px] border-amber-400/80 bg-amber-400/10';
      tooltipText = `MD${md}: Menunggu konfirmasi skor`;
    } else if (isNext) {
      // Laga berikutnya = border terang, pulsing pelan
      segmentClasses +=
        ' border-[2px] border-[var(--text)] bg-[var(--ink-2)] animate-pulse-slow shadow-[0_0_12px_rgba(255,255,255,0.2)]';
      tooltipText = `MD${md}: Laga Berikutnya (Siap Tanding)`;
    } else {
      // Belum main
      segmentClasses += ' border border-[var(--line)] bg-[var(--ink-1)] hover:border-[var(--text-faint)]';
      tooltipText = `MD${md}: Terjadwal`;
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
        >
          {isNext && (
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--text)]" />
          )}
        </Link>

        {/* Hover / Tap Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none whitespace-nowrap rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] shadow-[0_12px_32px_rgb(0_0_0_/_0.7)]">
            <span className="block font-mono text-[10px] text-[var(--text-faint)] uppercase">
              {md <= 10 ? 'Group Stage' : 'Knockout Stage'}
            </span>
            <span>{tooltipText}</span>
          </div>
        )}
      </div>
    );
  };

  const groupStageMds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const knockoutMds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  return (
    <div className={`w-full rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] p-5 sm:p-6 space-y-4 shadow-sm ${className}`}>
      {/* Header bar: Progres Musim + Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[var(--p-a)]" />
          <h3 className="font-[family-name:var(--font-display)] font-extrabold text-lg uppercase tracking-tight text-[var(--text)]">
            Kalender & Lintasan Musim
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)] font-mono">
            {confirmedCount}/20 MD ({completionPct}%)
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--text-faint)]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--p-a)]" />
            <span>Pemain A</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--p-b)]" />
            <span>Pemain B</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-[var(--text)]" />
            <span>Next Match</span>
          </span>
        </div>
      </div>

      {/* Desktop view: 20 segmen horizontal dalam dua kelompok */}
      <div className="hidden md:flex items-start gap-8 w-full">
        {/* Kelompok Group Stage (MD1–10) */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-dim)]">
            <span className="uppercase tracking-wider">Fase 1: Group Stage</span>
            <span className="text-[11px] text-[var(--text-faint)]">MD1–10 · Durasi 8m</span>
          </div>
          <div className="flex items-center gap-1.5 w-full">
            {groupStageMds.map(renderSegment)}
          </div>
        </div>

        {/* Kelompok Knockout (MD11–20) */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-dim)]">
            <span className="uppercase tracking-wider">Fase 2: Knockout Stage</span>
            <span className="text-[11px] text-[var(--text-faint)]">MD11–20 · ET & PK Wajib</span>
          </div>
          <div className="flex items-center gap-1.5 w-full">
            {knockoutMds.map(renderSegment)}
          </div>
        </div>
      </div>

      {/* Mobile view: dua baris (10 + 10) */}
      <div className="flex md:hidden flex-col gap-4 w-full">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-dim)]">
            <span>Fase 1: Group Stage (MD1–10)</span>
            <span className="text-[11px] text-[var(--text-faint)]">Poin 3-1-0</span>
          </div>
          <div className="flex items-center gap-1 w-full">
            {groupStageMds.map(renderSegment)}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-dim)]">
            <span>Fase 2: Knockout (MD11–20)</span>
            <span className="text-[11px] text-[var(--text-faint)]">ET & PK On</span>
          </div>
          <div className="flex items-center gap-1 w-full">
            {knockoutMds.map(renderSegment)}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-[var(--text-dim)] pt-1 border-t border-[var(--line)]">
        <span>Klik atau sentuh nomor segmen untuk langsung membuka ruang tanding.</span>
        <Link
          href="/matches"
          className="text-[var(--text)] hover:underline font-semibold"
        >
          Buka Jadwal Lengkap →
        </Link>
      </div>
    </div>
  );
}
