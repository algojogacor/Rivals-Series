import React from 'react';
import { ParticipantStanding } from '@/lib/types';
import { PlayerTag } from './PlayerTag';

interface H2HBarsProps {
  standingA: ParticipantStanding;
  standingB: ParticipantStanding;
  className?: string;
}

export function H2HBars({ standingA, standingB, className = '' }: H2HBarsProps) {
  const allZero =
    standingA.mp === 0 &&
    standingB.mp === 0 &&
    standingA.w === 0 &&
    standingB.w === 0 &&
    standingA.gf === 0 &&
    standingB.gf === 0;

  // Comparison metrics: Menang, Seri, Gol, Selisih gol, Clean sheet
  const metrics = [
    {
      label: 'Menang',
      valA: standingA.w,
      valB: standingB.w,
      formatA: String(standingA.w),
      formatB: String(standingB.w),
    },
    {
      label: 'Seri',
      valA: standingA.d,
      valB: standingB.d,
      formatA: String(standingA.d),
      formatB: String(standingB.d),
    },
    {
      label: 'Gol',
      valA: standingA.gf,
      valB: standingB.gf,
      formatA: String(standingA.gf),
      formatB: String(standingB.gf),
    },
    {
      label: 'Selisih Gol',
      // For GD which can be negative, normalize for bar comparison
      valA: Math.max(0, standingA.gd),
      valB: Math.max(0, standingB.gd),
      formatA: standingA.gd > 0 ? `+${standingA.gd}` : String(standingA.gd),
      formatB: standingB.gd > 0 ? `+${standingB.gd}` : String(standingB.gd),
    },
    {
      label: 'Clean Sheet',
      valA: standingA.clean_sheets,
      valB: standingB.clean_sheets,
      formatA: String(standingA.clean_sheets),
      formatB: String(standingB.clean_sheets),
    },
  ];

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {/* 0. Header Row: PlayerTag Pemain A di kiri dan Pemain B di kanan */}
      <div className="flex items-center justify-between px-2 sm:px-3 pb-1">
        <PlayerTag
          id={standingA.participant_id || 'participant_a'}
          name={standingA.display_name}
          monogram={standingA.monogram}
          size="sm"
        />
        <span className="text-[12px] font-bold font-[family-name:var(--font-display)] uppercase tracking-wider text-[var(--text-faint)]">
          VS
        </span>
        <PlayerTag
          id={standingB.participant_id || 'participant_b'}
          name={standingB.display_name}
          monogram={standingB.monogram}
          size="sm"
        />
      </div>

      {/* 1. Metric Comparison Rows (Height 56px, gap 8px) */}
      {metrics.map((m) => {
        const total = m.valA + m.valB;
        const pctA = total > 0 ? (m.valA / total) * 100 : 0;
        const pctB = total > 0 ? (m.valB / total) * 100 : 0;

        return (
          <div
            key={m.label}
            className="flex items-center justify-between h-[56px] px-3 sm:px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]"
          >
            {/* Left Value (Pemain A) */}
            <div className="w-12 sm:w-16 text-left shrink-0">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-a)]">
                {m.formatA}
              </span>
            </div>

            {/* Center Area: Bar A (grows left) | Label | Bar B (grows right) */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 mx-2 sm:mx-4">
              {/* Left Bar (grows left from center) */}
              <div className="flex-1 flex justify-end h-2 rounded-[3px] overflow-hidden bg-[var(--ink-2)]">
                {total > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all duration-500"
                    style={{
                      width: `${pctA}%`,
                      backgroundColor: 'var(--p-a)',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>

              {/* Center Label (display font, --text-dim) */}
              <span className="shrink-0 text-center text-xs sm:text-sm font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text-dim)] min-w-[70px] sm:min-w-[90px]">
                {m.label}
              </span>

              {/* Right Bar (grows right from center) */}
              <div className="flex-1 flex justify-start h-2 rounded-[3px] overflow-hidden bg-[var(--ink-2)]">
                {total > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all duration-500"
                    style={{
                      width: `${pctB}%`,
                      backgroundColor: 'var(--p-b)',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
            </div>

            {/* Right Value (Pemain B) */}
            <div className="w-12 sm:w-16 text-right shrink-0">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-b)]">
                {m.formatB}
              </span>
            </div>
          </div>
        );
      })}

      {/* 2. Kredit Indonesia Row (5 dots on each side, height 56px) */}
      <div className="flex items-center justify-between h-[56px] px-3 sm:px-4 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)]">
        {/* Left Side: Kredit Pemain A (dots + text x/5) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl tabular-nums text-[var(--p-a)]">
            {standingA.id_credits}/5
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((dot) => {
              const isFilled = dot <= standingA.id_credits;
              return (
                <div
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isFilled
                      ? 'bg-[var(--p-a)]'
                      : 'border border-[var(--line)] bg-transparent'
                  }`}
                  title={`Kredit A: ${standingA.id_credits}/5`}
                />
              );
            })}
          </div>
        </div>

        {/* Center Label */}
        <span className="shrink-0 text-center text-xs sm:text-sm font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text-dim)] px-2">
          Kredit Indonesia
        </span>

        {/* Right Side: Kredit Pemain B (dots + text x/5) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((dot) => {
              const isFilled = dot <= standingB.id_credits;
              return (
                <div
                  key={dot}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isFilled
                      ? 'bg-[var(--p-b)]'
                      : 'border border-[var(--line)] bg-transparent'
                  }`}
                  title={`Kredit B: ${standingB.id_credits}/5`}
                />
              );
            })}
          </div>
          <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl tabular-nums text-[var(--p-b)]">
            {standingB.id_credits}/5
          </span>
        </div>
      </div>

      {/* Explanatory text when all zero */}
      {allZero && (
        <p className="text-[13px] text-center text-[var(--text-dim)] pt-1">
          Bar akan terisi setelah laga pertama disahkan.
        </p>
      )}
    </div>
  );
}
