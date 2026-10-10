import Link from 'next/link';
import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
  getAllGoalEvents,
  getAllGoalkeeperRecords,
  getAllGoalNominations,
  getAllAwardBallots,
} from '@/lib/db';
import {
  calculateStandings,
  calculateGoldenBoot,
  calculateGoldenGlove,
  calculateWinningStreak,
  calculateGoalOfTheSeason,
} from '@/lib/engine';
import { PlayerTag } from '@/components/PlayerTag';
import { StatusChip } from '@/components/StatusChip';
import { Trophy, Award, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Penghargaan | Rivals Series Season 1',
  description: 'Tujuh gelar kehormatan resmi Rivals Series Season 1 ditentukan murni dari performa kompetisi.',
};

export const dynamic = 'force-dynamic';

export default async function AwardsPage() {
  const [
    participants,
    matches,
    sanctions,
    quotaCredits,
    seasonSettings,
    goalEvents,
    gkRecords,
    goalNominations,
    awardBallots,
  ] = await Promise.all([
    getParticipants(),
    getAllMatches(),
    getAllSanctions(),
    getAllQuotaCredits(),
    getSeasonSettings(),
    getAllGoalEvents(),
    getAllGoalkeeperRecords(),
    getAllGoalNominations(),
    getAllAwardBallots(),
  ]);

  const pMap = new Map(participants.map((p) => [p.id, p]));
  const pA = pMap.get('participant_a') || {
    id: 'participant_a',
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };
  const pB = pMap.get('participant_b') || {
    id: 'participant_b',
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
  const leader = standings[0];
  const leaderParticipant = pMap.get(leader?.participant_id || 'participant_a');

  const confirmedMatches = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  );
  const confirmedIds = new Set(confirmedMatches.map((m) => m.id));

  const bootLeaders = calculateGoldenBoot(goalEvents, confirmedIds);
  const gloveLeaders = calculateGoldenGlove(gkRecords, matches);
  const gotsResults = calculateGoalOfTheSeason(goalNominations, awardBallots);

  const paStreak = calculateWinningStreak(matches, 'participant_a');
  const pbStreak = calculateWinningStreak(matches, 'participant_b');
  const maxStreak = Math.max(paStreak, pbStreak);
  const streakLeaderId = paStreak >= pbStreak ? 'participant_a' : 'participant_b';
  const streakLeader = pMap.get(streakLeaderId);

  // Best Defence (lowest GA, tiebreaker clean sheets)
  const bestDefenceLeader = [...standings].sort((a, b) => {
    if (a.ga !== b.ga) return a.ga - b.ga;
    return b.clean_sheets - a.clean_sheets;
  })[0];
  const bestDefenceParticipant = pMap.get(bestDefenceLeader?.participant_id || 'participant_a');

  // Most Clean Sheets
  const csLeader = [...standings].sort((a, b) => b.clean_sheets - a.clean_sheets)[0];
  const csParticipant = pMap.get(csLeader?.participant_id || 'participant_a');

  // Other awards list
  const otherAwards = [
    {
      title: 'Golden Boot S1',
      rule: 'Pemain virtual dengan jumlah gol sah terbanyak (versi kartu digabung).',
      ruleRef: 'Pasal 42',
      leaderContent:
        bootLeaders.length > 0 ? (
          <div className="flex items-center gap-2">
            <PlayerTag
              id={bootLeaders[0].participant_id}
              name={bootLeaders[0].player_name}
              monogram={pMap.get(bootLeaders[0].participant_id)?.monogram || 'P'}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--text)]">
              {bootLeaders[0].total_goals} Gol
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">—</span>
        ),
      icon: <Award className="w-5 h-5 text-[var(--p-a)]" />,
      action: null,
    },
    {
      title: 'Golden Glove S1',
      rule: 'Kiper starter bermain 90 menit reguler penuh dengan clean sheet terbanyak.',
      ruleRef: 'Pasal 44',
      leaderContent:
        gloveLeaders.length > 0 ? (
          <div className="flex items-center gap-2">
            <PlayerTag
              id={gloveLeaders[0].participant_id}
              name={gloveLeaders[0].goalkeeper_name}
              monogram={pMap.get(gloveLeaders[0].participant_id)?.monogram || 'P'}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--text)]">
              {gloveLeaders[0].clean_sheets} CS
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">—</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--p-b)]" />,
      action: null,
    },
    {
      title: 'Best Defence S1',
      rule: 'Peserta dengan jumlah kebobolan (GA) paling sedikit dalam klasemen akhir.',
      ruleRef: 'Pasal 45',
      leaderContent:
        bestDefenceLeader && bestDefenceLeader.mp > 0 ? (
          <div className="flex items-center gap-2">
            <PlayerTag
              id={bestDefenceLeader.participant_id}
              name={bestDefenceParticipant?.display_name || 'Peserta'}
              monogram={bestDefenceParticipant?.monogram || 'P'}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--text)]">
              {bestDefenceLeader.ga} Kebobolan
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">—</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--text-dim)]" />,
      action: null,
    },
    {
      title: 'Goal of the Season S1',
      rule: 'Gol terbaik hasil surat suara peringkat rahasia kedua peserta (bobot 4–3–2–1).',
      ruleRef: 'Pasal 43',
      leaderContent:
        gotsResults.length > 0 && gotsResults[0].is_winner ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--text)]">
              {gotsResults[0].title}
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">Menunggu Penguncian Suara</span>
        ),
      icon: <Sparkles className="w-5 h-5 text-[var(--p-a)]" />,
      action: (
        <Link
          href="/awards/goal-of-the-season"
          className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-semibold hover:opacity-90 transition-opacity gap-1.5"
        >
          <span>Buka Halaman Voting</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
    {
      title: 'Longest Winning Streak S1',
      rule: 'Kemenangan pertandingan beruntun terpanjang yang diraih secara sportif di lapangan.',
      ruleRef: 'Pasal 46',
      leaderContent:
        maxStreak > 0 ? (
          <div className="flex items-center gap-2">
            <PlayerTag
              id={streakLeaderId}
              name={streakLeader?.display_name || 'Peserta'}
              monogram={streakLeader?.monogram || 'P'}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--text)]">
              {maxStreak} Laga
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">—</span>
        ),
      icon: <Zap className="w-5 h-5 text-[var(--p-a)]" />,
      action: null,
    },
    {
      title: 'Most Clean Sheets S1',
      rule: 'Peserta dengan jumlah pertandingan tanpa kebobolan terbanyak.',
      ruleRef: 'Pasal 47',
      leaderContent:
        csLeader && csLeader.clean_sheets > 0 ? (
          <div className="flex items-center gap-2">
            <PlayerTag
              id={csLeader.participant_id}
              name={csParticipant?.display_name || 'Peserta'}
              monogram={csParticipant?.monogram || 'P'}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--text)]">
              {csLeader.clean_sheets} Laga
            </span>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--text-faint)]">—</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--ok)]" />,
      action: null,
    },
  ];

  return (
    <div className="space-y-10">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
          Penghargaan
        </h1>
        <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
          Tujuh gelar kehormatan resmi Rivals Series Season 1 yang ditentukan murni dari performa statistik dan voting independen dua pemain.
        </p>
      </div>

      {/* 2. RS CHAMPION (Panel Besar Lebar Penuh) */}
      <section className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--p-a)]">
              <Trophy className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)]">
                RS Champion Season 1
              </h2>
              <p className="text-[13px] text-[var(--text-dim)]">
                Gelar tertinggi untuk pemuncak klasemen akhir 20 matchday (Pasal 41).
              </p>
            </div>
          </div>

          <StatusChip
            status={isCompleted ? 'confirmed' : 'provisional'}
            label={isCompleted ? 'Juara Resmi' : 'Provisional'}
          />
        </div>

        {/* Champion Leader Display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
          <div className="space-y-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              Pemimpin Klasemen Saat Ini
            </span>
            <div className="flex items-center gap-4">
              <PlayerTag
                id={leader?.participant_id || 'participant_a'}
                name={leaderParticipant?.display_name || 'Peserta'}
                monogram={leaderParticipant?.monogram || 'PA'}
                size="lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <span className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                Poin Terkumpul
              </span>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl tabular-nums text-[var(--text)]">
                {leader?.points ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Enam Penghargaan Lain sebagai Daftar Baris (Bukan Kartu Kembar) */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)]">
          Gelar Kehormatan Lainnya
        </h2>

        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
          {otherAwards.map((a) => (
            <div
              key={a.title}
              className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--ink-2)]/30 transition-colors"
            >
              {/* Kiri: Nama & Aturan Singkat */}
              <div className="space-y-1 md:max-w-md">
                <div className="flex items-center gap-2.5">
                  {a.icon}
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)]">
                    {a.title}
                  </h3>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase font-mono">
                    {a.ruleRef}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
                  {a.rule}
                </p>
              </div>

              {/* Kanan: Pemimpin Saat Ini & Status / Action */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 self-start md:self-auto">
                <div>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider block mb-1">
                    Pemegang Saat Ini
                  </span>
                  {a.leaderContent}
                </div>

                <div className="flex items-center gap-3">
                  <StatusChip
                    status={isCompleted ? 'confirmed' : 'provisional'}
                    label="Provisional"
                  />
                  {a.action}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
