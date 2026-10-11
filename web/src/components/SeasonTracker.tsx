'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Match, Participant } from '@/lib/types';
import { deriveMatchSettings } from '@/lib/engine';
import { Calendar, Trophy, Zap, ChevronRight, Swords, CheckCircle2, Clock } from 'lucide-react';

interface SeasonTrackerProps {
  matches: Match[];
  participants?: Participant[];
  className?: string;
}

export function SeasonTracker({ matches, participants = [], className = '' }: SeasonTrackerProps) {
  // Map matches by md_number
  const matchMap = new Map<number, Match>();
  matches.forEach((m) => matchMap.set(m.md_number, m));

  // Find next scheduled match
  const nextMatch = matches.find((m) => m.status === 'scheduled') || null;
  const nextMdNumber = nextMatch ? nextMatch.md_number : null;

  // Selected matchday for quick inspect (defaults to next match, or latest confirmed, or MD1)
  const defaultSelected = nextMdNumber ?? 1;
  const [selectedMd, setSelectedMd] = useState<number>(defaultSelected);
  const [hoveredMd, setHoveredMd] = useState<number | null>(null);

  // The MD to display in the inspect panel (hovered takes preview priority, else selected)
  const activeMd = hoveredMd ?? selectedMd;
  const activeMatch = matchMap.get(activeMd);
  const activeSettings = deriveMatchSettings(activeMd);

  // Player lookup
  const pA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a',
    display_name: 'algojogacor',
    monogram: 'AG',
  };
  const pB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b',
    display_name: 'CHarmed',
    monogram: 'CH',
  };

  // Count confirmed matches
  const confirmedCount = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  ).length;

  const completionPct = Math.round((confirmedCount / 20) * 100);

  const getSegmentState = (md: number) => {
    const match = matchMap.get(md);
    const isNext = md === nextMdNumber;
    const isSelected = md === activeMd;
    const status = match?.status || 'scheduled';
    const isConfirmed = ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(status);
    const isAwaiting = status === 'awaiting_confirmation' || match?.confirmation_status === 'pending';

    let bgStyle: React.CSSProperties = {};
    let borderClass = 'border border-[var(--line)] bg-[var(--ink-2)]/60';
    let statusLabel = 'Terjadwal';

    if (isConfirmed && match) {
      if (match.is_draw === 1) {
        bgStyle = { background: 'linear-gradient(90deg, var(--p-a) 50%, var(--p-b) 50%)' };
        statusLabel = `Seri ${match.home_score ?? 0}–${match.away_score ?? 0}`;
      } else if (match.winner_id === 'participant_a') {
        bgStyle = {
          backgroundColor: 'var(--p-a)',
          boxShadow: isSelected ? '0 0 14px var(--p-a)' : '0 0 8px var(--p-a-glow)',
        };
        statusLabel = `Menang algojogacor (${match.home_score ?? 0}–${match.away_score ?? 0})`;
      } else if (match.winner_id === 'participant_b') {
        bgStyle = {
          backgroundColor: 'var(--p-b)',
          boxShadow: isSelected ? '0 0 14px var(--p-b)' : '0 0 8px var(--p-b-glow)',
        };
        statusLabel = `Menang CHarmed (${match.home_score ?? 0}–${match.away_score ?? 0})`;
      } else {
        bgStyle = { backgroundColor: 'var(--text-dim)' };
        statusLabel = 'Selesai';
      }
      borderClass = 'border-transparent';
    } else if (isAwaiting) {
      borderClass = 'border-amber-400/80 bg-amber-400/20';
      statusLabel = 'Menunggu Konfirmasi';
    } else if (isNext) {
      borderClass = 'border-[var(--text)] bg-[var(--ink-0)] shadow-[0_0_12px_rgba(255,255,255,0.3)] animate-pulse-slow';
      statusLabel = 'Next Kick-off';
    }

    return { bgStyle, borderClass, isNext, isSelected, isConfirmed, isAwaiting, statusLabel };
  };

  const renderSegment = (md: number) => {
    const { bgStyle, borderClass, isNext, isSelected } = getSegmentState(md);

    return (
      <button
        key={md}
        type="button"
        onClick={() => setSelectedMd(md)}
        onMouseEnter={() => setHoveredMd(md)}
        onMouseLeave={() => setHoveredMd(null)}
        className={`group relative flex-1 h-[20px] rounded-[5px] transition-all duration-200 cursor-pointer focus:outline-none ${borderClass} ${
          isSelected ? 'ring-2 ring-white scale-105 z-10' : 'hover:scale-105'
        }`}
        style={bgStyle}
        aria-label={`Matchday ${md}`}
      >
        {isNext && (
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />
        )}
        <span className="sr-only">MD{md}</span>
      </button>
    );
  };

  const groupStageMds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const knockoutMds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  // Inspect panel match details
  const activeHostIsA = activeMatch?.home_participant_id === 'participant_a';
  const activeIsConfirmed = activeMatch && ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(activeMatch.status);
  const activeIsAwaiting = activeMatch?.status === 'awaiting_confirmation' || activeMatch?.confirmation_status === 'pending';
  const activeIsNext = activeMd === nextMdNumber;

  return (
    <div className={`w-full rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] p-5 sm:p-7 space-y-6 shadow-md transition-all ${className}`}>
      {/* 1. Header: Title, Completion rate & Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-center text-[var(--p-a)]">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)]">
              Kalender & Lintasan Musim
            </h3>
            <p className="text-xs text-[var(--text-faint)]">
              Peta 20 putaran duel langsung antara algojogacor vs CHarmed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ink-0)] border border-[var(--line)] text-xs font-mono">
            <span className="text-[var(--text)] font-bold">{confirmedCount}/20</span>
            <span className="text-[var(--text-faint)]">MD ({completionPct}%)</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-faint)] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--p-a)] shadow-[0_0_6px_var(--p-a)]" />
              <span>algojogacor</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--p-b)] shadow-[0_0_6px_var(--p-b)]" />
              <span>CHarmed</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white bg-transparent" />
              <span>Next</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Trackers: Phase 1 & Phase 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Phase 1: Group Stage (MD 1-10) */}
        <div className="p-4 sm:p-5 rounded-[12px] bg-[var(--ink-0)]/50 border border-[var(--line)] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--text-dim)]" />
              <span className="font-bold uppercase tracking-wider text-[var(--text)]">
                Fase 1: Group Stage
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-faint)]">
              MD1–10 · Durasi 8m · Poin 3-1-0
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full pt-1">
            {groupStageMds.map(renderSegment)}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-faint)]">
            <span>MD1</span>
            <span>MD5</span>
            <span>MD10</span>
          </div>
        </div>

        {/* Phase 2: Knockout Stage (MD 11-20) - High-Stakes Visual Aura */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-[12px] bg-gradient-to-br from-amber-500/10 via-[var(--ink-0)]/70 to-purple-500/10 border border-amber-500/30 space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-amber-300">
                Fase 2: Knockout Stage
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              HIGH STAKES · ET & PK WAJIB
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full pt-1">
            {knockoutMds.map(renderSegment)}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/70">
            <span>MD11</span>
            <span>MD15</span>
            <span className="font-bold text-amber-400">MD20 (Final)</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Matchday Quick Inspect Card */}
      <div className="rounded-[12px] bg-[var(--ink-0)] border border-[var(--line)] p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: MD pill & Phase */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)] shrink-0">
            <span className="text-[10px] font-mono uppercase text-[var(--text-faint)]">PUTARAN</span>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl text-[var(--text)]">
              MD{activeMd}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                {activeSettings.phaseLabel}
              </span>
              {activeIsNext && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--text)] text-[var(--ink-0)] uppercase">
                  Siap Tanding
                </span>
              )}
              {activeIsAwaiting && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Menunggu Konfirmasi
                </span>
              )}
              {activeIsConfirmed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Resmi
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-faint)]">
              {activeHostIsA ? 'Tuan Rumah: algojogacor' : 'Tuan Rumah: CHarmed'} · {activeSettings.durationMinutes} Menit {activeSettings.extraTimeAllowed ? '· ET & PK Aktif' : '· Seri Diizinkan'}
            </p>
          </div>
        </div>

        {/* Center: Matchup Score / Status */}
        <div className="flex items-center justify-center gap-5 w-full md:w-auto py-1 px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--p-a)]" />
            <span className={`text-xs font-bold ${activeMatch?.winner_id === 'participant_a' ? 'text-[var(--p-a)]' : 'text-[var(--text)]'}`}>
              algojogacor
            </span>
          </div>

          {activeIsConfirmed && activeMatch ? (
            <div className="font-[family-name:var(--font-display)] font-extrabold text-lg tabular-nums px-2 py-0.5 rounded bg-[var(--ink-2)] text-[var(--text)]">
              {activeMatch.home_score} : {activeMatch.away_score}
            </div>
          ) : (
            <span className="text-xs font-mono text-[var(--text-faint)] uppercase px-2">
              VS
            </span>
          )}

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${activeMatch?.winner_id === 'participant_b' ? 'text-[var(--p-b)]' : 'text-[var(--text)]'}`}>
              CHarmed
            </span>
            <span className="w-2 h-2 rounded-full bg-[var(--p-b)]" />
          </div>
        </div>

        {/* Right: Direct CTA */}
        <div className="w-full md:w-auto flex justify-end">
          <Link
            href={`/matches/${activeMd}`}
            className="inline-flex items-center justify-center gap-1.5 w-full md:w-auto px-4 py-2 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold text-[var(--text)] hover:border-[var(--text-dim)] hover:bg-[var(--ink-3)] transition-all"
          >
            <span>Buka Match Center MD{activeMd}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
