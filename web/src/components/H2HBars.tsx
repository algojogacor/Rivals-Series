import { ParticipantStanding } from '@/lib/types';
import { PlayerTag } from './PlayerTag';
import { Flag } from 'lucide-react';
import { RollingNumber } from './fx/RollingNumber';

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
    <div className={`w-full space-y-3 ${className}`}>
      {/* 0. Header Row: PlayerTag Pemain A di kiri dan Pemain B di kanan dengan aksen kartu */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)]">
        <div className="flex items-center gap-2">
          <PlayerTag
            id={standingA.participant_id || 'participant_a'}
            name={standingA.display_name}
            monogram={standingA.monogram}
            size="sm"
          />
          <span className="hidden sm:inline text-[11px] font-bold text-[var(--p-a)] uppercase tracking-wider">
            (Pemain A)
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--ink-2)] border border-[var(--line)]">
          <span className="text-[11px] font-extrabold font-[family-name:var(--font-display)] uppercase tracking-widest text-[var(--text-faint)]">
            HEAD TO HEAD
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] font-bold text-[var(--p-b)] uppercase tracking-wider">
            (Pemain B)
          </span>
          <PlayerTag
            id={standingB.participant_id || 'participant_b'}
            name={standingB.display_name}
            monogram={standingB.monogram}
            size="sm"
          />
        </div>
      </div>

      {/* 1. Metric Comparison Rows (Height 58px) */}
      <div className="space-y-2">
        {metrics.map((m) => {
          const total = m.valA + m.valB;
          const pctA = total > 0 ? (m.valA / total) * 100 : 0;
          const pctB = total > 0 ? (m.valB / total) * 100 : 0;
          const leaderIsA = m.valA > m.valB;
          const leaderIsB = m.valB > m.valA;

          return (
            <div
              key={m.label}
              className="flex items-center justify-between h-[58px] px-3.5 sm:px-5 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--line)]/80 transition-colors shadow-sm"
            >
              {/* Left Value (Pemain A) */}
              <div className="w-12 sm:w-16 text-left shrink-0">
                <span
                  className={`font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                    leaderIsA
                      ? 'text-[var(--p-a)] drop-shadow-[0_0_8px_var(--p-a-glow)]'
                      : 'text-[var(--text-dim)]'
                  }`}
                >
                  <RollingNumber
                    value={m.valA}
                    prefix={m.label === 'Selisih Gol' && standingA.gd > 0 ? '+' : ''}
                  />
                </span>
              </div>

              {/* Center Area: Bar A (grows left) | Label | Bar B (grows right) */}
              <div className="flex-1 flex items-center gap-2.5 sm:gap-4 mx-2 sm:mx-4">
                {/* Left Bar (grows left from center) */}
                <div className="flex-1 flex justify-end h-2.5 rounded-full overflow-hidden bg-[var(--ink-2)]">
                  {total > 0 ? (
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pctA}%`,
                        background: 'linear-gradient(to left, var(--p-a), color-mix(in oklab, var(--p-a) 40%, transparent))',
                      }}
                    />
                  ) : (
                    <div className="h-full w-full border-t border-[var(--line-subtle)]" />
                  )}
                </div>

                {/* Center Label (display font, high contrast) */}
                <span className="shrink-0 text-center text-xs sm:text-[13px] font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text)] min-w-[75px] sm:min-w-[100px]">
                  {m.label}
                </span>

                {/* Right Bar (grows right from center) */}
                <div className="flex-1 flex justify-start h-2.5 rounded-full overflow-hidden bg-[var(--ink-2)]">
                  {total > 0 ? (
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pctB}%`,
                        background: 'linear-gradient(to right, var(--p-b), color-mix(in oklab, var(--p-b) 40%, transparent))',
                      }}
                    />
                  ) : (
                    <div className="h-full w-full border-t border-[var(--line-subtle)]" />
                  )}
                </div>
              </div>

              {/* Right Value (Pemain B) */}
              <div className="w-12 sm:w-16 text-right shrink-0">
                <span
                  className={`font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                    leaderIsB
                      ? 'text-[var(--p-b)] drop-shadow-[0_0_8px_var(--p-b-glow)]'
                      : 'text-[var(--text-dim)]'
                  }`}
                >
                  <RollingNumber
                    value={m.valB}
                    prefix={m.label === 'Selisih Gol' && standingB.gd > 0 ? '+' : ''}
                  />
                </span>
              </div>
            </div>
          );
        })}

        {/* 2. Kredit Indonesia Row (Mandatory 5 credits) */}
        <div className="flex items-center justify-between h-[58px] px-3.5 sm:px-5 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] shadow-sm">
          {/* Left Side: Kredit Pemain A (dots + text x/5) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl tabular-nums text-[var(--p-a)]">
              {standingA.id_credits}/5
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((dot) => {
                const isFilled = dot <= standingA.id_credits;
                return (
                  <div
                    key={dot}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      isFilled
                        ? 'bg-[var(--p-a)] shadow-[0_0_6px_var(--p-a-glow)]'
                        : 'border border-[var(--line)] bg-[var(--ink-2)]'
                    }`}
                    title={`Kredit A: ${standingA.id_credits}/5`}
                  />
                );
              })}
            </div>
          </div>

          {/* Center Label with Indonesian Flag Motif */}
          <div className="flex items-center gap-1.5 shrink-0 px-2">
            <Flag className="w-3.5 h-3.5 text-red-400" />
            <span className="text-center text-xs sm:text-[13px] font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text)]">
              Kredit Indonesia
            </span>
          </div>

          {/* Right Side: Kredit Pemain B (dots + text x/5) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((dot) => {
                const isFilled = dot <= standingB.id_credits;
                return (
                  <div
                    key={dot}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      isFilled
                        ? 'bg-[var(--p-b)] shadow-[0_0_6px_var(--p-b-glow)]'
                        : 'border border-[var(--line)] bg-[var(--ink-2)]'
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
      </div>

      {/* Explanatory text when all zero */}
      {allZero && (
        <p className="text-xs text-center text-[var(--text-dim)] pt-1">
          Bar rivalitas akan terisi secara dinamis begitu hasil pertandingan pertama disahkan.
        </p>
      )}
    </div>
  );
}
