import Link from 'next/link';
import {
  getAllMatches,
  getParticipants,
  getAllGoalEvents,
  getAllGoalkeeperRecords,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
} from '@/lib/db';
import {
  calculateStandings,
  calculateGoldenBoot,
  calculateGoldenGlove,
  calculateWinningStreak,
} from '@/lib/engine';
import { PlayerTag } from '@/components/PlayerTag';
import { EmptyState } from '@/components/EmptyState';
import { Trophy, Shield, Zap } from 'lucide-react';

export const metadata = {
  title: 'Statistik | Rivals Series Season 1',
  description: 'Statistik resmi pencetak gol Golden Boot, clean sheet Golden Glove, dan rekor performa musim.',
};

export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  const [
    matches,
    participants,
    goalEvents,
    gkRecords,
    sanctions,
    quotaCredits,
    seasonSettings,
  ] = await Promise.all([
    getAllMatches(),
    getParticipants(),
    getAllGoalEvents(),
    getAllGoalkeeperRecords(),
    getAllSanctions(),
    getAllQuotaCredits(),
    getSeasonSettings(),
  ]);

  const pA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a',
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };
  const pB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b',
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  const confirmedMatches = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  );
  const confirmedIds = new Set(confirmedMatches.map((m) => m.id));

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
  const standingA = standings.find((s) => s.participant_id === 'participant_a') || standings[0];
  const standingB = standings.find((s) => s.participant_id === 'participant_b') || standings[1];

  const topScorers = calculateGoldenBoot(goalEvents, confirmedIds);
  const topGoalkeepers = calculateGoldenGlove(gkRecords, matches);

  const paStreak = calculateWinningStreak(matches, 'participant_a');
  const pbStreak = calculateWinningStreak(matches, 'participant_b');

  // Streak metrics for H2H visual bar
  const streakTotal = paStreak + pbStreak;
  const paStreakPct = streakTotal > 0 ? (paStreak / streakTotal) * 100 : 50;
  const pbStreakPct = streakTotal > 0 ? (pbStreak / streakTotal) * 100 : 50;

  const csTotal = (standingA?.clean_sheets || 0) + (standingB?.clean_sheets || 0);
  const paCsPct = csTotal > 0 ? ((standingA?.clean_sheets || 0) / csTotal) * 100 : 50;
  const pbCsPct = csTotal > 0 ? ((standingB?.clean_sheets || 0) / csTotal) * 100 : 50;

  return (
    <div className="space-y-10">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
          Statistik
        </h1>
        <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
          Data performa individual pemain virtual dan rekor kompetisi yang disahkan secara resmi dari 20 matchday.
        </p>
      </div>

      {/* 2. Dua Kolom: Golden Boot & Golden Glove */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Golden Boot (Pencetak Gol) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-[var(--p-a)]" />
              <span>Golden Boot</span>
            </h2>
            <Link href="/rules#pasal-42" className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4">
              Pasal 42
            </Link>
          </div>

          {topScorers.length > 0 ? (
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
              {topScorers.map((s, idx) => {
                const isA = s.participant_id === 'participant_a';
                const p = isA ? pA : pB;
                return (
                  <div
                    key={s.player_name}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--ink-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text-dim)] tabular-nums w-7 shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-base text-[var(--text)] block truncate">
                          {s.player_name}
                        </span>
                        {s.card_versions.length > 0 && (
                          <span className="text-[12px] text-[var(--text-faint)] block truncate">
                            {s.card_versions.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <PlayerTag
                        id={s.participant_id}
                        name=""
                        monogram={p.monogram}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums text-[var(--text)] min-w-[36px] text-right">
                        {s.total_goals}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Ghost rows */}
              <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-[8px] border border-dashed border-[var(--line)] flex items-center px-4 justify-between opacity-50">
                    <span className="text-[13px] text-[var(--text-faint)] font-mono">#{i}</span>
                    <span className="text-[13px] text-[var(--text-faint)]">Belum ada data</span>
                  </div>
                ))}
              </div>
              <EmptyState
                title="Belum ada gol disahkan"
                description="Statistik Golden Boot terisi otomatis setelah gol tercatat di laporan pertandingan sah."
              />
            </div>
          )}
        </section>

        {/* Golden Glove (Clean Sheet Kiper) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-[var(--p-b)]" />
              <span>Golden Glove</span>
            </h2>
            <Link href="/rules#pasal-44" className="text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4">
              Pasal 44
            </Link>
          </div>

          {topGoalkeepers.length > 0 ? (
            <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
              {topGoalkeepers.map((g, idx) => {
                const isA = g.participant_id === 'participant_a';
                const p = isA ? pA : pB;
                return (
                  <div
                    key={g.goalkeeper_name}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[var(--ink-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text-dim)] tabular-nums w-7 shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-base text-[var(--text)] block truncate">
                          {g.goalkeeper_name}
                        </span>
                        <span className="text-[12px] text-[var(--text-faint)] block">
                          Starter & bermain penuh reguler
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <PlayerTag
                        id={g.participant_id}
                        name=""
                        monogram={p.monogram}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl tabular-nums text-[var(--text)] min-w-[36px] text-right">
                        {g.clean_sheets}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Ghost rows */}
              <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-[8px] border border-dashed border-[var(--line)] flex items-center px-4 justify-between opacity-50">
                    <span className="text-[13px] text-[var(--text-faint)] font-mono">#{i}</span>
                    <span className="text-[13px] text-[var(--text-faint)]">Belum ada data</span>
                  </div>
                ))}
              </div>
              <EmptyState
                title="Belum ada clean sheet"
                description="Kiper starter yang bermain 90 menit reguler tanpa kebobolan akan dicatat di sini."
              />
            </div>
          )}
        </section>
      </div>

      {/* 3. Rekor Performa & Streak via H2H Bars */}
      <section className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Perbandingan Rekor Performa
          </h2>
          <span className="text-[13px] text-[var(--text-dim)]">
            Winning Streak & Clean Sheets Tim
          </span>
        </div>

        {/* H2H Row Header */}
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <PlayerTag
              id="participant_a"
              name={pA.display_name}
              monogram={pA.monogram}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] text-[12px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
              Rekor Tim
            </span>
            <PlayerTag
              id="participant_b"
              name={pB.display_name}
              monogram={pB.monogram}
              size="sm"
            />
          </div>

          {/* Bar 1: Winning Streak */}
          <div className="flex items-center justify-between h-[56px] px-3 sm:px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
            <span className="w-12 sm:w-16 font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-a)]">
              {paStreak}
            </span>

            <div className="flex-1 flex items-center gap-2 sm:gap-3 mx-2 sm:mx-4">
              <div className="flex-1 flex justify-end h-2 rounded-[3px] overflow-hidden bg-[var(--ink-1)]">
                {streakTotal > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all"
                    style={{ width: `${paStreakPct}%`, backgroundColor: 'var(--p-a)' }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
              <span className="shrink-0 text-center text-xs sm:text-sm font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text-dim)] min-w-[90px]">
                Winning Streak
              </span>
              <div className="flex-1 flex justify-start h-2 rounded-[3px] overflow-hidden bg-[var(--ink-1)]">
                {streakTotal > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all"
                    style={{ width: `${pbStreakPct}%`, backgroundColor: 'var(--p-b)' }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
            </div>

            <span className="w-12 sm:w-16 text-right font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-b)]">
              {pbStreak}
            </span>
          </div>

          {/* Bar 2: Team Clean Sheets */}
          <div className="flex items-center justify-between h-[56px] px-3 sm:px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
            <span className="w-12 sm:w-16 font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-a)]">
              {standingA?.clean_sheets || 0}
            </span>

            <div className="flex-1 flex items-center gap-2 sm:gap-3 mx-2 sm:mx-4">
              <div className="flex-1 flex justify-end h-2 rounded-[3px] overflow-hidden bg-[var(--ink-1)]">
                {csTotal > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all"
                    style={{ width: `${paCsPct}%`, backgroundColor: 'var(--p-a)' }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
              <span className="shrink-0 text-center text-xs sm:text-sm font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text-dim)] min-w-[90px]">
                Clean Sheets Tim
              </span>
              <div className="flex-1 flex justify-start h-2 rounded-[3px] overflow-hidden bg-[var(--ink-1)]">
                {csTotal > 0 ? (
                  <div
                    className="h-full rounded-[3px] transition-all"
                    style={{ width: `${pbCsPct}%`, backgroundColor: 'var(--p-b)' }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
            </div>

            <span className="w-12 sm:w-16 text-right font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums text-[var(--p-b)]">
              {standingB?.clean_sheets || 0}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
