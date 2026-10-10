'use client';

import React from 'react';
import { Participant, ParticipantStanding, SeasonSettings } from '@/lib/types';
import { PlayerTag } from './PlayerTag';
import { StatusChip } from './StatusChip';

interface VersusHeroProps {
  standingA?: ParticipantStanding;
  standingB?: ParticipantStanding;
  participantA: Participant;
  participantB: Participant;
  seasonSettings?: SeasonSettings | null;
  className?: string;
}

export function VersusHero({
  standingA,
  standingB,
  participantA,
  participantB,
  seasonSettings,
  className = '',
}: VersusHeroProps) {
  const pointsA = standingA ? standingA.points : 0;
  const pointsB = standingB ? standingB.points : 0;

  // Form 5 dots: 'W' | 'D' | 'L'
  const formA = standingA?.form?.slice(-5) || [];
  const formB = standingB?.form?.slice(-5) || [];

  // Pad to 5 dots if less than 5 matches played
  const paddedFormA: Array<'W' | 'D' | 'L' | null> = [...Array(5 - formA.length).fill(null), ...formA];
  const paddedFormB: Array<'W' | 'D' | 'L' | null> = [...Array(5 - formB.length).fill(null), ...formB];

  const renderFormDot = (res: 'W' | 'D' | 'L' | null, isPlayerA: boolean, index: number) => {
    let dotStyle = 'border border-[var(--text-faint)] bg-transparent';
    let title = 'Belum bertanding';

    if (res === 'W') {
      dotStyle = isPlayerA
        ? 'bg-[var(--p-a)] border-transparent shadow-[0_0_8px_var(--p-a-glow)]'
        : 'bg-[var(--p-b)] border-transparent shadow-[0_0_8px_var(--p-b-glow)]';
      title = 'Menang';
    } else if (res === 'D') {
      dotStyle = 'bg-[var(--text-dim)] border-transparent';
      title = 'Seri';
    } else if (res === 'L') {
      dotStyle = 'border border-[var(--danger)] bg-transparent';
      title = 'Kalah';
    }

    return (
      <span
        key={index}
        className={`inline-block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 transition-colors ${dotStyle}`}
        title={title}
      />
    );
  };

  const seasonStatus = seasonSettings?.status || 'live';

  return (
    <section
      aria-label="Panggung Rivalitas Musim"
      className={`relative w-full min-h-[460px] md:min-h-[500px] overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--ink-0)] select-none shadow-[0_16px_48px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* 1. ATMOSFER STADION: Floodlights + Garis Lapangan */}
      {/* Floodlight Beam Kiri (Pemain A Cyan) */}
      <div
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--p-a-glow) 0%, transparent 70%)',
        }}
      />

      {/* Floodlight Beam Kanan (Pemain B Ungu) */}
      <div
        className="absolute -top-32 -right-24 w-96 h-96 rounded-full pointer-events-none opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--p-b-glow) 0%, transparent 70%)',
        }}
      />

      {/* Pita Rumput Lapangan Samar (Pola 80px) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255, 255, 255, 0.015) 80px, rgba(255, 255, 255, 0.015) 160px)',
        }}
      />

      {/* Garis Lapangan Samar (SVG garis putih: lingkaran tengah & titik putih) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-white/5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="50%" y1="0%" x2="50%" y2="100%" strokeWidth="1.5" />
        <ellipse cx="50%" cy="50%" rx="140" ry="140" strokeWidth="1.5" />
        <circle cx="50%" cy="50%" r="5" fill="rgba(255,255,255,0.08)" />
      </svg>

      {/* 2. DIAGONAL SPLIT BACKGROUND (Cyan Kiri vs Ungu Kanan) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Desktop Diagonal Cut */}
        <div className="hidden md:block absolute inset-0">
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              backgroundColor: 'var(--p-a-soft)',
              clipPath: 'polygon(0 0, 54% 0, 46% 100%, 0 100%)',
            }}
          />
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              backgroundColor: 'var(--p-b-soft)',
              clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%)',
            }}
          />
        </div>

        {/* Mobile Horizontal Split */}
        <div className="md:hidden absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-a-soft)',
              clipPath: 'polygon(0 0, 100% 0, 100% 48%, 0 52%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-b-soft)',
              clipPath: 'polygon(0 52%, 100% 48%, 100% 100%, 0 100%)',
            }}
          />
        </div>
      </div>

      {/* 3. HERO CONTENT — DESKTOP VIEW */}
      {/* CATATAN KRITIS: Tidak ada opacity-0 pada Pemain B agar selalu tampil andal di print/screenshot */}
      <div className="relative z-10 hidden md:grid grid-cols-[1fr_auto_1fr] items-center h-full min-h-[500px] px-8 lg:px-14">
        {/* KIRI: Blok Pemain A (Cyan, rata kanan ke tengah) */}
        <div className="flex flex-col items-end text-right pr-6 lg:pr-12">
          {/* Tag & Monogram Badge */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xs font-bold text-[var(--p-a)] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--ink-1)] border border-[var(--p-a-border)] shadow-sm">
              Pemain A
            </span>
            <PlayerTag
              id="participant_a"
              name=""
              monogram={participantA.monogram}
              size="md"
            />
          </div>

          {/* Nama Pemain A */}
          <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[clamp(2.75rem,4.5vw,4.25rem)] text-[var(--text)] leading-[0.95] break-words max-w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {participantA.display_name}
          </h2>

          {/* Stats Bar Singkat: Poin & Selisih Gol */}
          <div className="flex items-center gap-3 mt-3 text-xs font-semibold text-[var(--text-dim)]">
            <span className="px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)] tabular-nums">
              {standingA ? `${standingA.mp} Laga · ${standingA.w}M ${standingA.d}S ${standingA.l}K` : '0 Laga'}
            </span>
            {standingA && standingA.gd !== 0 && (
              <span className="tabular-nums font-mono text-[var(--p-a)]">
                GD {standingA.gd > 0 ? `+${standingA.gd}` : standingA.gd}
              </span>
            )}
          </div>

          {/* 5 Titik Form Terakhir */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-xs text-[var(--text-dim)] font-medium mr-1 uppercase tracking-wider">Form:</span>
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--ink-1)] border border-[var(--line)]">
              {paddedFormA.map((res, i) => renderFormDot(res, true, i))}
            </div>
          </div>
        </div>

        {/* TENGAH: Papan Skor Siaran Televisi (TV Broadcast Scoreboard) */}
        <div className="flex flex-col items-center justify-center text-center px-6 lg:px-10 shrink-0 min-w-[240px]">
          {/* Header Papan Skor: Status Musim */}
          <div className="mb-4">
            <StatusChip status={seasonStatus} />
          </div>

          {/* Skor Digital Besar "PTS A : PTS B" */}
          <div className="relative p-6 rounded-[16px] bg-[var(--ink-1)]/80 backdrop-blur-md border border-[var(--line)] shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-2">
              Poin Klasemen
            </div>
            <div className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(4.5rem,7vw,6.5rem)] tabular-nums leading-none tracking-tight text-[var(--text)] flex items-center justify-center gap-3">
              <span
                style={{
                  color: pointsA > pointsB ? 'var(--p-a)' : pointsA === pointsB ? 'var(--text)' : 'var(--text-dim)',
                  textShadow: pointsA > pointsB ? '0 0 20px var(--p-a-glow)' : 'none',
                }}
              >
                {pointsA}
              </span>
              <span className="text-[var(--text-faint)] font-light text-[0.7em] select-none">:</span>
              <span
                style={{
                  color: pointsB > pointsA ? 'var(--p-b)' : pointsA === pointsB ? 'var(--text)' : 'var(--text-dim)',
                  textShadow: pointsB > pointsA ? '0 0 20px var(--p-b-glow)' : 'none',
                }}
              >
                {pointsB}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[var(--text-dim)] border-t border-[var(--line)] pt-2.5">
              <span>Rivals Series</span>
              <span className="text-[var(--text-faint)]">·</span>
              <span>Season 1</span>
            </div>
          </div>

          <div className="mt-4 text-[11px] font-medium tracking-wide text-[var(--text-faint)]">
            20 Matchday eFootball 1v1 Dream Team
          </div>
        </div>

        {/* KANAN: Blok Pemain B (Ungu, rata kiri ke tengah) */}
        {/* PENTING: Bebas dari opacity-0! */}
        <div className="flex flex-col items-start text-left pl-6 lg:pl-12">
          {/* Tag & Monogram Badge */}
          <div className="flex items-center gap-2.5 mb-3">
            <PlayerTag
              id="participant_b"
              name=""
              monogram={participantB.monogram}
              size="md"
            />
            <span className="text-xs font-bold text-[var(--p-b)] uppercase tracking-widest px-2.5 py-1 rounded bg-[var(--ink-1)] border border-[var(--p-b-border)] shadow-sm">
              Pemain B
            </span>
          </div>

          {/* Nama Pemain B */}
          <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[clamp(2.75rem,4.5vw,4.25rem)] text-[var(--text)] leading-[0.95] break-words max-w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {participantB.display_name}
          </h2>

          {/* Stats Bar Singkat: Poin & Selisih Gol */}
          <div className="flex items-center gap-3 mt-3 text-xs font-semibold text-[var(--text-dim)]">
            <span className="px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)] tabular-nums">
              {standingB ? `${standingB.mp} Laga · ${standingB.w}M ${standingB.d}S ${standingB.l}K` : '0 Laga'}
            </span>
            {standingB && standingB.gd !== 0 && (
              <span className="tabular-nums font-mono text-[var(--p-b)]">
                GD {standingB.gd > 0 ? `+${standingB.gd}` : standingB.gd}
              </span>
            )}
          </div>

          {/* 5 Titik Form Terakhir */}
          <div className="flex items-center gap-2 mt-4 justify-start">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--ink-1)] border border-[var(--line)]">
              {paddedFormB.map((res, i) => renderFormDot(res, false, i))}
            </div>
            <span className="text-xs text-[var(--text-dim)] font-medium ml-1 uppercase tracking-wider">Form</span>
          </div>
        </div>
      </div>

      {/* 4. HERO CONTENT — MOBILE VIEW */}
      {/* Tampilan berkarakter di layar ponsel: dua kartu beraksen warna membelah skor tengah */}
      <div className="relative z-10 md:hidden flex flex-col justify-between h-full p-5 sm:p-6 space-y-4">
        {/* Kartu Atas: Pemain A */}
        <div className="rounded-[12px] bg-[var(--ink-1)]/90 backdrop-blur-sm border border-[var(--p-a-border)] p-4 flex items-center justify-between shadow-sm">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <PlayerTag
                id="participant_a"
                name=""
                monogram={participantA.monogram}
                size="sm"
              />
              <span className="text-[11px] font-bold text-[var(--p-a)] uppercase tracking-wider">Pemain A</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase text-2xl sm:text-3xl text-[var(--text)] leading-tight truncate">
              {participantA.display_name}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">Form</span>
            <div className="flex items-center gap-1">
              {paddedFormA.map((res, i) => renderFormDot(res, true, i))}
            </div>
          </div>
        </div>

        {/* Tengah: Papan Skor Poin */}
        <div className="flex flex-col items-center justify-center text-center py-2">
          <StatusChip status={seasonStatus} className="mb-2" />
          <div className="p-3.5 px-6 rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] shadow-lg inline-flex items-center gap-3">
            <span
              className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums leading-none"
              style={{ color: pointsA > pointsB ? 'var(--p-a)' : 'var(--text)' }}
            >
              {pointsA}
            </span>
            <span className="text-[var(--text-faint)] text-2xl font-light">:</span>
            <span
              className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums leading-none"
              style={{ color: pointsB > pointsA ? 'var(--p-b)' : 'var(--text)' }}
            >
              {pointsB}
            </span>
          </div>
          <span className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)]">
            Rivals Series Season 1
          </span>
        </div>

        {/* Kartu Bawah: Pemain B */}
        <div className="rounded-[12px] bg-[var(--ink-1)]/90 backdrop-blur-sm border border-[var(--p-b-border)] p-4 flex items-center justify-between shadow-sm">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <PlayerTag
                id="participant_b"
                name=""
                monogram={participantB.monogram}
                size="sm"
              />
              <span className="text-[11px] font-bold text-[var(--p-b)] uppercase tracking-wider">Pemain B</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase text-2xl sm:text-3xl text-[var(--text)] leading-tight truncate">
              {participantB.display_name}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">Form</span>
            <div className="flex items-center gap-1">
              {paddedFormB.map((res, i) => renderFormDot(res, false, i))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
