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
    // Kontras tinggi: outline pakai --text-dim kalau belum main / kosong
    let dotStyle = 'border-[1.5px] border-[var(--text-dim)] bg-transparent';
    let title = 'Belum bertanding';

    if (res === 'W') {
      dotStyle = isPlayerA ? 'bg-[var(--p-a)] border-transparent' : 'bg-[var(--p-b)] border-transparent';
      title = 'Menang';
    } else if (res === 'D') {
      dotStyle = 'bg-[var(--text-dim)] border-transparent';
      title = 'Seri';
    } else if (res === 'L') {
      dotStyle = 'border-[1.5px] border-[var(--danger)] bg-transparent';
      title = 'Kalah';
    }

    return (
      <span
        key={index}
        className={`inline-block w-3 h-3 rounded-full shrink-0 transition-colors ${dotStyle}`}
        title={title}
      />
    );
  };

  const seasonStatus = seasonSettings?.status || 'setup';

  return (
    <section
      className={`relative w-full h-[480px] min-h-[440px] max-h-[520px] overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--ink-0)] select-none ${className}`}
    >
      {/* 1. ATMOSFER HERO: Stadion + Garis Lapangan + Pita Rumput Samar */}
      {/* Pita Rumput Samar (120px pita vertikal, selisih terang samar) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 120px, rgba(255, 255, 255, 0.02) 120px, rgba(255, 255, 255, 0.02) 240px)',
        }}
      />

      {/* Cahaya Stadion (Radial gradient lembut dari atas tengah) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--text) 5%, transparent) 0%, transparent 75%)',
        }}
      />

      {/* Garis Lapangan Samar (SVG garis putih opacity 0.06: lingkaran tengah, garis tengah) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-white/6"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        preserveAspectRatio="none"
      >
        <line x1="50%" y1="0%" x2="50%" y2="100%" strokeWidth="1.5" />
        <ellipse cx="50%" cy="50%" rx="120" ry="120" strokeWidth="1.5" />
        <circle cx="50%" cy="50%" r="4" fill="rgba(255,255,255,0.06)" />
      </svg>

      {/* 2. DIAGONAL SPLIT BACKGROUND: 
          Layar dibelah garis miring (~8°) dari atas ke bawah.
          Container menyapu dari atas ke bawah saat load pertama (700ms),
          dan setelah itu kedua tint (Sisi A amber lembut, Sisi B cyan lembut) tampil konsisten.
      */}
      <div className="absolute inset-0 pointer-events-none [animation:sweepHeroContainer_700ms_cubic-bezier(0.16,1,0.3,1)_forwards] motion-reduce:!animate-none">
        {/* Desktop Split */}
        <div className="hidden md:block absolute inset-0">
          {/* Sisi Kiri (Player A Soft) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-a-soft)',
              clipPath: 'polygon(0 0, 56% 0, 44% 100%, 0 100%)',
            }}
          />
          {/* Sisi Kanan (Player B Soft) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-b-soft)',
              clipPath: 'polygon(56% 0, 100% 0, 100% 100%, 44% 100%)',
            }}
          />
        </div>

        {/* Mobile Split (Horizontal diagonal) */}
        <div className="md:hidden absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-a-soft)',
              clipPath: 'polygon(0 0, 100% 0, 100% 46%, 0 54%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: 'var(--p-b-soft)',
              clipPath: 'polygon(0 54%, 100% 46%, 100% 100%, 0 100%)',
            }}
          />
        </div>
      </div>

      {/* 3. HERO CONTENT */}
      {/* Desktop Layout: Dua Pemain Berhadapan, Jarak Lega ke Skor Tengah */}
      <div className="relative z-10 hidden md:grid grid-cols-[1fr_auto_1fr] items-center h-full px-8 lg:px-14">
        {/* Kiri: Blok Pemain A rapi (PlayerTag + Nama A rata kanan menuju tengah) */}
        <div className="flex flex-col items-end text-right pr-8 lg:pr-14 [animation:slideA_450ms_cubic-bezier(0.16,1,0.3,1)_forwards] motion-reduce:!animate-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[13px] font-bold text-[var(--p-a)] uppercase tracking-wider">
              Pemain A
            </span>
            <PlayerTag
              id="participant_a"
              name=""
              monogram={participantA.monogram}
              size="md"
            />
          </div>

          <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[clamp(2.5rem,4.2vw,3.75rem)] text-[var(--text)] leading-[1.0] break-words max-w-full">
            {participantA.display_name}
          </h2>

          {/* 5 titik form terakhir kontras tinggi */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-[13px] text-[var(--text-dim)] font-medium mr-1">Form:</span>
            {paddedFormA.map((res, i) => renderFormDot(res, true, i))}
          </div>
        </div>

        {/* Tengah: Skor/poin besar, jarak lega, StatusChip di atas, caption di bawah */}
        <div className="flex flex-col items-center justify-center text-center px-8 lg:px-12 shrink-0 min-w-[220px]">
          {/* StatusChip musim */}
          <div className="mb-3">
            <StatusChip status={seasonStatus} />
          </div>

          {/* Skor besar "X : Y" (display 6rem, tabular) */}
          <div className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(4.25rem,6.5vw,5.5rem)] tabular-nums leading-none tracking-tight text-[var(--text)] flex items-center gap-3">
            <span style={{ color: pointsA > pointsB ? 'var(--p-a)' : 'var(--text)' }}>
              {pointsA}
            </span>
            <span className="text-[var(--text-dim)] font-normal text-[0.8em]">:</span>
            <span style={{ color: pointsB > pointsA ? 'var(--p-b)' : 'var(--text)' }}>
              {pointsB}
            </span>
          </div>

          {/* Caption di bawahnya */}
          <span className="mt-2 text-[13px] font-semibold uppercase tracking-widest text-[var(--text-dim)]">
            Rivals Series Season 1
          </span>
        </div>

        {/* Kanan: Blok Pemain B rapi (PlayerTag + Nama B rata kiri) */}
        <div className="flex flex-col items-start text-left pl-8 lg:pl-14 [animation:slideB_450ms_80ms_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0 [animation-fill-mode:forwards] motion-reduce:!opacity-100 motion-reduce:!animate-none">
          <div className="flex items-center gap-2 mb-2">
            <PlayerTag
              id="participant_b"
              name=""
              monogram={participantB.monogram}
              size="md"
            />
            <span className="text-[13px] font-bold text-[var(--p-b)] uppercase tracking-wider">
              Pemain B
            </span>
          </div>

          <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase tracking-tight text-[clamp(2.5rem,4.2vw,3.75rem)] text-[var(--text)] leading-[1.0] break-words max-w-full">
            {participantB.display_name}
          </h2>

          {/* 5 titik form terakhir kontras tinggi */}
          <div className="flex items-center gap-2 mt-4 justify-start">
            <span className="text-[13px] text-[var(--text-dim)] font-medium mr-1">Form:</span>
            {paddedFormB.map((res, i) => renderFormDot(res, false, i))}
          </div>
        </div>
      </div>

      {/* Mobile Layout: A di atas, B di bawah, skor di tengah-tengah */}
      <div className="relative z-10 md:hidden flex flex-col justify-between h-full p-6">
        {/* Atas: Pemain A */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PlayerTag
                id="participant_a"
                name=""
                monogram={participantA.monogram}
                size="sm"
              />
              <span className="text-xs font-bold text-[var(--p-a)] uppercase">Pemain A</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase text-3xl text-[var(--text)] leading-tight">
              {participantA.display_name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {paddedFormA.map((res, i) => renderFormDot(res, true, i))}
          </div>
        </div>

        {/* Tengah: Skor */}
        <div className="flex flex-col items-center justify-center text-center my-auto py-2">
          <StatusChip status={seasonStatus} className="mb-2" />
          <div className="font-[family-name:var(--font-display)] font-extrabold text-5xl tabular-nums leading-none tracking-tight text-[var(--text)] flex items-center gap-2">
            <span>{pointsA}</span>
            <span className="text-[var(--text-dim)] text-3xl">:</span>
            <span>{pointsB}</span>
          </div>
          <span className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">
            Rivals Series Season 1
          </span>
        </div>

        {/* Bawah: Pemain B */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PlayerTag
                id="participant_b"
                name=""
                monogram={participantB.monogram}
                size="sm"
              />
              <span className="text-xs font-bold text-[var(--p-b)] uppercase">Pemain B</span>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold uppercase text-3xl text-[var(--text)] leading-tight">
              {participantB.display_name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {paddedFormB.map((res, i) => renderFormDot(res, false, i))}
          </div>
        </div>
      </div>

      {/* Keyframe animations styles */}
      <style jsx>{`
        @keyframes sweepHeroContainer {
          0% {
            clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
          }
          100% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }
        @keyframes slideA {
          0% {
            opacity: 0;
            transform: translateX(-24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideB {
          0% {
            opacity: 0;
            transform: translateX(24px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
