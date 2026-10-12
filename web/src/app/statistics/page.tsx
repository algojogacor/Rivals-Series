import Link from 'next/link';
import { getCachedStatisticsData } from '@/lib/cached-data';
import { PlayerTag } from '@/components/PlayerTag';
import { EmptyState } from '@/components/EmptyState';
import { Trophy, Shield, Award, Flame, Sparkles } from 'lucide-react';
import { RollingNumber } from '@/components/fx/RollingNumber';

export const metadata = {
  title: 'Statistik | Rivals Series Season 1',
  description:
    'Statistik resmi pencetak gol Golden Boot, kreator peluang Playmaker of the Season, clean sheet Golden Glove, dan rekor performa musim.',
};

export const revalidate = 300;

function assignTiedRanks<T>(items: T[], getScore: (item: T) => number): Array<T & { rank: number }> {
  let currentRank = 1;
  const result: Array<T & { rank: number }> = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0 && getScore(items[i]) < getScore(items[i - 1])) {
      currentRank = i + 1;
    }
    result.push({ ...items[i], rank: currentRank });
  }
  return result;
}

export default async function StatisticsPage() {
  const {
    participants,
    standings,
    topScorers,
    topAssisters,
    topGoalkeepers,
    paStreak,
    pbStreak,
  } = await getCachedStatisticsData();

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

  const standingA = standings.find((s) => s.participant_id === 'participant_a') || standings[0];
  const standingB = standings.find((s) => s.participant_id === 'participant_b') || standings[1];

  // Compute tied ranks (standard competition ranking: 1, 1, 3...)
  const rankedScorers = assignTiedRanks(topScorers, (s) => s.total_goals);
  const rankedAssisters = assignTiedRanks(topAssisters, (a) => a.total_assists);
  const rankedGoalkeepers = assignTiedRanks(topGoalkeepers, (g) => g.clean_sheets);

  // Streak metrics for H2H visual bar
  const streakTotal = paStreak + pbStreak;
  const paStreakPct = streakTotal > 0 ? (paStreak / streakTotal) * 100 : 50;
  const pbStreakPct = streakTotal > 0 ? (pbStreak / streakTotal) * 100 : 50;

  const csTotal = (standingA?.clean_sheets || 0) + (standingB?.clean_sheets || 0);
  const paCsPct = csTotal > 0 ? ((standingA?.clean_sheets || 0) / csTotal) * 100 : 50;
  const pbCsPct = csTotal > 0 ? ((standingB?.clean_sheets || 0) / csTotal) * 100 : 50;

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[var(--gold)]" />
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
            Statistik Kompetisi
          </h1>
        </div>
        <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
          Data performa individual pemain virtual dihitung per pemilik tim dan rekor kompetisi resmi yang disahkan dari 20 matchday.
        </p>
      </div>

      {/* 2. Tiga Kolom Gelar Individual: Golden Boot, Playmaker, & Golden Glove */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Golden Boot (Pencetak Gol) */}
        <section className="space-y-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <span>Golden Boot</span>
            </h2>
            <Link
              href="/rules#pasal-42"
              className="text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4 uppercase tracking-wider"
            >
              Pasal 42
            </Link>
          </div>

          {rankedScorers.length > 0 ? (
            <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden shadow-sm flex-1">
              {rankedScorers.map((s) => {
                const isA = s.participant_id === 'participant_a';
                const p = isA ? pA : pB;
                return (
                  <div
                    key={`${s.participant_id}-${s.base_player_id || s.player_name}`}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--ink-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums w-6 shrink-0 text-center ${
                        s.rank === 1 ? 'text-[var(--gold)]' : 'text-[var(--text-dim)]'
                      }`}>
                        #{s.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-[var(--text)] block truncate">
                          {s.player_name}
                        </span>
                        {s.card_versions.length > 0 && (
                          <span className="text-[11px] text-[var(--text-faint)] block truncate font-mono">
                            {s.card_versions.join(' + ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <PlayerTag
                        id={s.participant_id}
                        name=""
                        monogram={p.monogram}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--gold)] min-w-[28px] text-right">
                        {s.total_goals}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              motif="boot"
              title="Perburuan Golden Boot"
              description="Pemain virtual dengan jumlah gol sah terbanyak per pemilik tim. Seluruh versi kartu digabung dalam satu pemilik (tidak lintas pemilik)."
              nextStep="Otomatis diagregasi saat laporan disahkan kedua pemain (Pasal 42)."
              className="flex-1"
            />
          )}
        </section>

        {/* Playmaker of the Season (Top Assist) */}
        <section className="space-y-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--p-b)] shrink-0" />
              <span>Playmaker of Season</span>
            </h2>
            <Link
              href="/rules#pasal-42a"
              className="text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4 uppercase tracking-wider"
            >
              Pasal 42A
            </Link>
          </div>

          {rankedAssisters.length > 0 ? (
            <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden shadow-sm flex-1">
              {rankedAssisters.map((a) => {
                const isA = a.participant_id === 'participant_a';
                const p = isA ? pA : pB;
                return (
                  <div
                    key={`${a.participant_id}-${a.base_player_id || a.player_name}`}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--ink-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums w-6 shrink-0 text-center ${
                        a.rank === 1 ? 'text-[var(--p-b)]' : 'text-[var(--text-dim)]'
                      }`}>
                        #{a.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-[var(--text)] block truncate">
                          {a.player_name}
                        </span>
                        {a.card_versions.length > 0 && (
                          <span className="text-[11px] text-[var(--text-faint)] block truncate font-mono">
                            {a.card_versions.join(' + ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <PlayerTag
                        id={a.participant_id}
                        name=""
                        monogram={p.monogram}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--p-b)] min-w-[28px] text-right">
                        {a.total_assists}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              motif="playmaker"
              title="Perburuan Top Asis"
              description="Pemain virtual dengan catatan asis terbanyak per pemilik tim. Seluruh versi kartu digabung dalam satu pemilik (tidak lintas pemilik)."
              nextStep="Otomatis diagregasi dari asis sah pada formulir laporan hasil (Pasal 42A)."
              className="flex-1"
            />
          )}
        </section>

        {/* Golden Glove (Clean Sheet Kiper) */}
        <section className="space-y-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--p-a)] shrink-0" />
              <span>Golden Glove</span>
            </h2>
            <Link
              href="/rules#pasal-44"
              className="text-[11px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4 uppercase tracking-wider"
            >
              Pasal 44
            </Link>
          </div>

          {rankedGoalkeepers.length > 0 ? (
            <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden shadow-sm flex-1">
              {rankedGoalkeepers.map((g) => {
                const isA = g.participant_id === 'participant_a';
                const p = isA ? pA : pB;
                return (
                  <div
                    key={`${g.participant_id}-${g.base_player_id || g.goalkeeper_name}`}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--ink-2)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums w-6 shrink-0 text-center ${
                        g.rank === 1 ? 'text-[var(--p-a)]' : 'text-[var(--text-dim)]'
                      }`}>
                        #{g.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-[var(--text)] block truncate">
                          {g.goalkeeper_name}
                        </span>
                        <span className="text-[11px] text-[var(--text-faint)] block">
                          Starter 90 menit reguler
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <PlayerTag
                        id={g.participant_id}
                        name=""
                        monogram={p.monogram}
                        size="sm"
                      />
                      <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--p-a)] min-w-[28px] text-right">
                        {g.clean_sheets}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              motif="glove"
              title="Perburuan Golden Glove"
              description="Kiper starter yang bermain 90 menit reguler penuh tanpa kebobolan per pemilik tim."
              nextStep="Tercatat otomatis dari pemilihan nama kiper starter di laporan laga (Pasal 44)."
              className="flex-1"
            />
          )}
        </section>
      </div>

      {/* 3. Rekor Performa & Streak via H2H Bars */}
      <section className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
              Perbandingan Rekor Performa Tim
            </h2>
          </div>
          <span className="text-xs text-[var(--text-dim)] font-mono">
            Winning Streak & Clean Sheets Tim
          </span>
        </div>

        {/* H2H Comparative Box */}
        <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] p-6 space-y-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <PlayerTag
              id="participant_a"
              name={pA.display_name}
              monogram={pA.monogram}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] text-xs font-bold text-[var(--text-faint)] uppercase tracking-widest px-3 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)]">
              DUEL REKOR
            </span>
            <PlayerTag
              id="participant_b"
              name={pB.display_name}
              monogram={pB.monogram}
              size="sm"
            />
          </div>

          {/* Bar 1: Winning Streak */}
          <div className="flex items-center justify-between h-[58px] px-4 sm:px-5 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
            <span
              className={`w-12 sm:w-16 font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                paStreak >= pbStreak && paStreak > 0 ? 'text-[var(--p-a)] drop-shadow-[0_0_8px_var(--p-a-glow)]' : 'text-[var(--text-dim)]'
              }`}
            >
              <RollingNumber value={paStreak} />
            </span>

            <div className="flex-1 flex items-center gap-2 sm:gap-4 mx-2 sm:mx-4">
              <div className="flex-1 flex justify-end h-2.5 rounded-full overflow-hidden bg-[var(--ink-1)]">
                {streakTotal > 0 ? (
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${paStreakPct}%`,
                      background: 'linear-gradient(to left, var(--p-a), color-mix(in oklab, var(--p-a) 40%, transparent))',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
              <span className="shrink-0 text-center text-xs sm:text-[13px] font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text)] min-w-[90px] sm:min-w-[110px]">
                Winning Streak
              </span>
              <div className="flex-1 flex justify-start h-2.5 rounded-full overflow-hidden bg-[var(--ink-1)]">
                {streakTotal > 0 ? (
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pbStreakPct}%`,
                      background: 'linear-gradient(to right, var(--p-b), color-mix(in oklab, var(--p-b) 40%, transparent))',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
            </div>

            <span
              className={`w-12 sm:w-16 text-right font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                pbStreak >= paStreak && pbStreak > 0 ? 'text-[var(--p-b)] drop-shadow-[0_0_8px_var(--p-b-glow)]' : 'text-[var(--text-dim)]'
              }`}
            >
              <RollingNumber value={pbStreak} />
            </span>
          </div>

          {/* Bar 2: Team Clean Sheets */}
          <div className="flex items-center justify-between h-[58px] px-4 sm:px-5 rounded-[10px] bg-[var(--ink-2)] border border-[var(--line)]">
            <span
              className={`w-12 sm:w-16 font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                (standingA?.clean_sheets || 0) >= (standingB?.clean_sheets || 0) && (standingA?.clean_sheets || 0) > 0
                  ? 'text-[var(--p-a)] drop-shadow-[0_0_8px_var(--p-a-glow)]'
                  : 'text-[var(--text-dim)]'
              }`}
            >
              <RollingNumber value={standingA?.clean_sheets || 0} />
            </span>

            <div className="flex-1 flex items-center gap-2 sm:gap-4 mx-2 sm:mx-4">
              <div className="flex-1 flex justify-end h-2.5 rounded-full overflow-hidden bg-[var(--ink-1)]">
                {csTotal > 0 ? (
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${paCsPct}%`,
                      background: 'linear-gradient(to left, var(--p-a), color-mix(in oklab, var(--p-a) 40%, transparent))',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
              <span className="shrink-0 text-center text-xs sm:text-[13px] font-[family-name:var(--font-display)] font-bold uppercase tracking-wider text-[var(--text)] min-w-[90px] sm:min-w-[110px]">
                Clean Sheets Tim
              </span>
              <div className="flex-1 flex justify-start h-2.5 rounded-full overflow-hidden bg-[var(--ink-1)]">
                {csTotal > 0 ? (
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pbCsPct}%`,
                      background: 'linear-gradient(to right, var(--p-b), color-mix(in oklab, var(--p-b) 40%, transparent))',
                    }}
                  />
                ) : (
                  <div className="h-full w-full border-t border-[var(--line)]" />
                )}
              </div>
            </div>

            <span
              className={`w-12 sm:w-16 text-right font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums ${
                (standingB?.clean_sheets || 0) >= (standingA?.clean_sheets || 0) && (standingB?.clean_sheets || 0) > 0
                  ? 'text-[var(--p-b)] drop-shadow-[0_0_8px_var(--p-b-glow)]'
                  : 'text-[var(--text-dim)]'
              }`}
            >
              <RollingNumber value={standingB?.clean_sheets || 0} />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
