import Link from 'next/link';
import { getCachedAwardsData } from '@/lib/cached-data';
import { PlayerTag } from '@/components/PlayerTag';
import { StatusChip } from '@/components/StatusChip';
import { Trophy, Award, Shield, Zap, Sparkles, ArrowRight, Crown } from 'lucide-react';
import { RollingNumber } from '@/components/fx/RollingNumber';
import { TrophyShowcaseClient } from '@/components/awards/TrophyShowcaseClient';

export const metadata = {
  title: 'Penghargaan | Rivals Series Season 1',
  description: 'Delapan gelar kehormatan resmi Rivals Series Season 1 ditentukan murni dari performa kompetisi.',
};

export const revalidate = 300;

export default async function AwardsPage() {
  const {
    participants,
    standings,
    bootLeaders,
    playmakerLeaders,
    gloveLeaders,
    gotsResults,
    paStreak,
    pbStreak,
    isCompleted,
  } = await getCachedAwardsData();

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

  const leader = standings[0];
  const leaderParticipant = pMap.get(leader?.participant_id || 'participant_a');

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
      rule: 'Pemain virtual dengan jumlah gol sah terbanyak. Seluruh versi kartu digabung per pemain virtual.',
      ruleRef: 'Pasal 42',
      leaderContent:
        bootLeaders.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayerTag
                id={bootLeaders[0].participant_id}
                name={bootLeaders[0].player_name}
                monogram={pMap.get(bootLeaders[0].participant_id)?.monogram || 'P'}
                size="sm"
              />
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--gold)]">
                {bootLeaders[0].total_goals} Gol
              </span>
            </div>
            {bootLeaders[0].card_versions && bootLeaders[0].card_versions.length > 0 && (
              <span className="text-xs text-[var(--text-faint)] block font-mono">
                Versi kartu: {bootLeaders[0].card_versions.join(' + ')}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada gol tercatat</span>
        ),
      icon: <Award className="w-5 h-5 text-[var(--gold)]" />,
      action: null,
    },
    {
      title: 'Playmaker of the Season S1',
      rule: 'Pemain virtual dengan jumlah asis sah terbanyak. Seluruh versi kartu digabung per pemain virtual.',
      ruleRef: 'Pasal 42A',
      leaderContent:
        playmakerLeaders.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayerTag
                id={playmakerLeaders[0].participant_id}
                name={playmakerLeaders[0].player_name}
                monogram={pMap.get(playmakerLeaders[0].participant_id)?.monogram || 'P'}
                size="sm"
              />
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--p-b)]">
                {playmakerLeaders[0].total_assists} Asis
              </span>
            </div>
            {playmakerLeaders[0].card_versions && playmakerLeaders[0].card_versions.length > 0 && (
              <span className="text-xs text-[var(--text-faint)] block font-mono">
                Versi kartu: {playmakerLeaders[0].card_versions.join(' + ')}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada asis tercatat</span>
        ),
      icon: <Sparkles className="w-5 h-5 text-[var(--p-b)]" />,
      action: null,
    },
    {
      title: 'Golden Glove S1',
      rule: 'Kiper starter bermain 90 menit reguler penuh dengan clean sheet terbanyak.',
      ruleRef: 'Pasal 44',
      leaderContent:
        gloveLeaders.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PlayerTag
                id={gloveLeaders[0].participant_id}
                name={gloveLeaders[0].goalkeeper_name}
                monogram={pMap.get(gloveLeaders[0].participant_id)?.monogram || 'P'}
                size="sm"
              />
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums text-[var(--p-a)]">
                {gloveLeaders[0].clean_sheets} Clean Sheet
              </span>
            </div>
            {gloveLeaders[0].card_versions && gloveLeaders[0].card_versions.length > 0 && (
              <span className="text-xs text-[var(--text-faint)] block font-mono">
                Versi kartu: {gloveLeaders[0].card_versions.join(' + ')}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada clean sheet</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--p-a)]" />,
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
          <span className="text-xs text-[var(--text-faint)] font-mono">—</span>
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
          <span className="text-xs text-[var(--text-faint)] font-mono">Menunggu Penguncian Suara</span>
        ),
      icon: <Sparkles className="w-5 h-5 text-[var(--p-b)]" />,
      action: (
        <Link
          href="/awards/goal-of-the-season"
          className="inline-flex items-center justify-center h-9 px-3.5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white transition-all gap-1.5"
        >
          <span>Voting GotS</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
    {
      title: 'Longest Winning Streak S1',
      rule: 'Kemenangan pertandingan beruntun terpanjang yang diraih sepanjang musim.',
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
          <span className="text-xs text-[var(--text-faint)] font-mono">0 Laga</span>
        ),
      icon: <Zap className="w-5 h-5 text-[var(--p-a)]" />,
      action: null,
    },
    {
      title: 'Most Clean Sheets S1',
      rule: 'Peserta dengan jumlah pertandingan tanpa kebobolan terbanyak di seluruh musim.',
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
              {csLeader.clean_sheets} Pertandingan
            </span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">0 Pertandingan</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--ok)]" />,
      action: null,
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Header */}
      <div className="space-y-2 border-b border-[var(--line)] pb-6">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 text-[var(--gold)]" />
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
            Penghargaan Resmi
          </h1>
        </div>
        <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
          Tujuh gelar kehormatan resmi Rivals Series Season 1 yang ditentukan murni dari performa statistik dan voting independen dua pemain.
        </p>
      </div>

      {/* 2. RS CHAMPION (Championship Trophy Grand Showcase with 3D Canvas) */}
      <section className="relative overflow-hidden rounded-[20px] bg-[var(--ink-1)] border-2 border-[var(--gold)]/40 p-6 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
        {/* Subtle gold ambient glow */}
        <div
          className="absolute -top-24 right-0 w-96 h-96 rounded-full pointer-events-none opacity-25 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--gold) 0%, transparent 70%)',
          }}
        />

        {/* Top bar with responsive wrapping */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--gold)]/10 border border-[var(--gold)]/40 text-[var(--gold)] shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Crown className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)]">
                  RS Champion Season 1
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 shrink-0">
                  Gelar Utama
                </span>
              </div>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">
                Peringkat 1 klasemen akhir 20 matchday (Pasal 41 Regulasi).
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <StatusChip
              status={isCompleted ? 'confirmed' : 'provisional'}
              label={isCompleted ? 'Juara Terkunci' : 'Provisional'}
            />
          </div>
        </div>

        {/* Champion Details Grid: Left Info & Leader, Right 3D Trophy Showcase */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-8 pt-4">
          {/* Left Column: Leader & Poin */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">
                Pimpinan Klasemen Sementara
              </span>
              <div className="flex items-center gap-4 p-4 rounded-[14px] bg-[var(--ink-0)]/70 border border-[var(--line)]">
                <PlayerTag
                  id={leader?.participant_id || 'participant_a'}
                  name={leaderParticipant?.display_name || 'Peserta'}
                  monogram={leaderParticipant?.monogram || 'PA'}
                  size="lg"
                />
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="p-4 rounded-[14px] bg-[var(--ink-0)]/70 border border-[var(--line)] flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">
                  Poin Terkumpul
                </span>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl tabular-nums text-[var(--gold)]">
                  <RollingNumber value={leader?.points ?? 0} />
                </span>
              </div>

              <div className="p-4 rounded-[14px] bg-[var(--ink-0)]/70 border border-[var(--line)] flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">
                  Selisih Gol (GD)
                </span>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl tabular-nums text-[var(--text)]">
                  <RollingNumber
                    value={Math.abs(leader?.gd ?? 0)}
                    prefix={(leader?.gd ?? 0) > 0 ? '+' : (leader?.gd ?? 0) < 0 ? '-' : ''}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Golden Trophy */}
          <div className="flex flex-col items-center justify-center p-2 rounded-[16px] bg-[var(--ink-0)]/40 border border-[var(--line)]">
            <TrophyShowcaseClient />
          </div>
        </div>
      </section>

      {/* 3. Enam Penghargaan Lain sebagai Daftar Baris */}
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
          Gelar Kehormatan Lainnya (BAB X)
        </h2>

        <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden shadow-sm">
          {otherAwards.map((a) => (
            <div
              key={a.title}
              className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--ink-2)]/30 transition-colors"
            >
              {/* Kiri: Nama & Aturan Singkat */}
              <div className="space-y-1 md:max-w-md">
                <div className="flex flex-wrap items-center gap-2.5">
                  {a.icon}
                  <h3 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)]">
                    {a.title}
                  </h3>
                  <span className="text-[11px] text-[var(--text-faint)] uppercase font-mono px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)]">
                    {a.ruleRef}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                  {a.rule}
                </p>
              </div>

              {/* Kanan: Pemegang Saat Ini & Status / Action */}
              <div className="flex flex-wrap items-center gap-4 md:gap-6 self-start md:self-auto">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider block mb-1">
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
