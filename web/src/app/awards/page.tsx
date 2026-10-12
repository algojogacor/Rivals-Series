import Link from 'next/link';
import { getCachedAwardsData } from '@/lib/cached-data';
import { PlayerTag } from '@/components/PlayerTag';
import { PlayerCardVisual } from '@/components/PlayerCardVisual';
import { StatusChip } from '@/components/StatusChip';
import { Trophy, Award, Shield, Zap, Sparkles, ArrowRight, Crown } from 'lucide-react';
import { RollingNumber } from '@/components/fx/RollingNumber';
import { ChampionTrophyShowcase, AwardTrophyShowcase } from '@/components/awards/TrophyShowcaseClient';
import type { TrophyType } from '@/components/awards/TrophyViewer3D';
import type { PlayerCardMetadata } from '@/lib/db';

export const metadata = {
  title: 'Penghargaan | Rivals Series Season 1',
  description: 'Delapan gelar kehormatan resmi Rivals Series Season 1 ditentukan murni dari performa kompetisi.',
};

export const revalidate = 300;

function WinnerRow({
  participantId,
  name,
  monogram,
  score,
  scoreUnit,
  scoreColor = 'text-[var(--gold)]',
  cardVersions,
  subtext,
  cardId,
  basePlayerId,
  metadata,
  cardVisualSize = 'md',
}: {
  participantId: 'participant_a' | 'participant_b';
  name: string;
  monogram: string;
  score: string | number;
  scoreUnit?: string;
  scoreColor?: string;
  cardVersions?: string[];
  subtext?: string;
  cardId?: string | number | null;
  basePlayerId?: string | number | null;
  metadata?: PlayerCardMetadata | null;
  cardVisualSize?: 'sm' | 'md' | 'lg';
}) {
  const isPlayerCard = Boolean(cardId || basePlayerId || metadata || (cardVersions && cardVersions.length > 0));

  if (isPlayerCard) {
    return (
      <div className="flex items-center gap-3.5 p-2.5 rounded-[14px] bg-[var(--ink-1)]/80 border border-[var(--line)] transition-all hover:border-[var(--line-strong)]">
        <PlayerCardVisual
          cardId={cardId}
          basePlayerId={basePlayerId}
          name={name}
          participantId={participantId}
          metadata={metadata}
          cardVersion={cardVersions?.[0]}
          size={cardVisualSize}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <PlayerTag
              id={participantId}
              name=""
              monogram={monogram}
              size="sm"
            />
            <span className="font-[family-name:var(--font-display)] font-bold text-base sm:text-lg text-[var(--text)] truncate">
              {name}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className={`font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums leading-none ${scoreColor}`}>
              {score}
            </span>
            {scoreUnit && (
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {scoreUnit}
              </span>
            )}
          </div>

          {cardVersions && cardVersions.length > 0 && (
            <span className="text-[11px] text-[var(--text-faint)] block truncate font-mono">
              Versi: {cardVersions.join(' + ')}
            </span>
          )}
          {subtext && (
            <span className="text-[11px] text-[var(--text-faint)] block truncate">
              {subtext}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2.5">
        <PlayerTag
          id={participantId}
          name={name}
          monogram={monogram}
          size="sm"
        />
        <span className={`font-[family-name:var(--font-display)] font-extrabold text-xl tabular-nums ${scoreColor}`}>
          {score} {scoreUnit}
        </span>
      </div>
      {subtext && (
        <span className="text-[11px] text-[var(--text-faint)] block pl-[34px]">
          {subtext}
        </span>
      )}
    </div>
  );
}

export default async function AwardsPage() {
  const {
    participants,
    standings,
    bootLeaders,
    playmakerLeaders,
    gloveLeaders,
    gotsResults,
    playersMeta = {},
    paStreak,
    pbStreak,
    isCompleted,
  } = await getCachedAwardsData();

  const getMeta = (cardId?: string | null, baseId?: number | null, name?: string) => {
    if (cardId && playersMeta[cardId]) return playersMeta[cardId];
    if (baseId && playersMeta[`base_${baseId}`]) return playersMeta[`base_${baseId}`];
    if (name && playersMeta[`name_${name.toLowerCase()}`]) return playersMeta[`name_${name.toLowerCase()}`];
    return null;
  };

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

  const standingA = standings.find((s) => s.participant_id === 'participant_a') || standings[0];
  const standingB = standings.find((s) => s.participant_id === 'participant_b') || standings[1];

  const leader = standings[0];
  const leaderParticipant = pMap.get(leader?.participant_id || 'participant_a');
  const isChampionTied =
    standings.length >= 2 &&
    standings[0].points === standings[1].points &&
    standings[0].gd === standings[1].gd &&
    standings[0].gf === standings[1].gf &&
    standings[0].w === standings[1].w;

  // 1. Golden Boot: tie = co-winners
  const maxGoals = bootLeaders.length > 0 ? bootLeaders[0].total_goals : 0;
  const bootWinners = maxGoals > 0 ? bootLeaders.filter((b) => b.total_goals === maxGoals) : [];
  const isBootTied = bootWinners.length > 1;

  // 2. Playmaker of the Season: tie = co-winners
  const maxAssists = playmakerLeaders.length > 0 ? playmakerLeaders[0].total_assists : 0;
  const playmakerWinners = maxAssists > 0 ? playmakerLeaders.filter((p) => p.total_assists === maxAssists) : [];
  const isPlaymakerTied = playmakerWinners.length > 1;

  // 3. Golden Glove: tie = co-winners
  const maxGloveCs = gloveLeaders.length > 0 ? gloveLeaders[0].clean_sheets : 0;
  const gloveWinners = maxGloveCs > 0 ? gloveLeaders.filter((g) => g.clean_sheets === maxGloveCs) : [];
  const isGloveTied = gloveWinners.length > 1;

  // 4. Best Defence (lowest GA, tiebreaker clean sheets, co-winners if still tied)
  const hasPlayedAny = (standingA?.mp || 0) > 0 || (standingB?.mp || 0) > 0;
  let bestDefenceWinners: Array<{
    participantId: 'participant_a' | 'participant_b';
    name: string;
    monogram: string;
    ga: number;
    clean_sheets: number;
  }> = [];

  if (hasPlayedAny && standingA && standingB) {
    if (standingA.ga < standingB.ga) {
      bestDefenceWinners = [
        {
          participantId: 'participant_a',
          name: pA.display_name,
          monogram: pA.monogram,
          ga: standingA.ga,
          clean_sheets: standingA.clean_sheets,
        },
      ];
    } else if (standingB.ga < standingA.ga) {
      bestDefenceWinners = [
        {
          participantId: 'participant_b',
          name: pB.display_name,
          monogram: pB.monogram,
          ga: standingB.ga,
          clean_sheets: standingB.clean_sheets,
        },
      ];
    } else {
      // GA is identical: tiebreaker clean sheets (Pasal 45)
      if (standingA.clean_sheets > standingB.clean_sheets) {
        bestDefenceWinners = [
          {
            participantId: 'participant_a',
            name: pA.display_name,
            monogram: pA.monogram,
            ga: standingA.ga,
            clean_sheets: standingA.clean_sheets,
          },
        ];
      } else if (standingB.clean_sheets > standingA.clean_sheets) {
        bestDefenceWinners = [
          {
            participantId: 'participant_b',
            name: pB.display_name,
            monogram: pB.monogram,
            ga: standingB.ga,
            clean_sheets: standingB.clean_sheets,
          },
        ];
      } else {
        // Both GA and clean sheets equal -> co-winners
        bestDefenceWinners = [
          {
            participantId: 'participant_a',
            name: pA.display_name,
            monogram: pA.monogram,
            ga: standingA.ga,
            clean_sheets: standingA.clean_sheets,
          },
          {
            participantId: 'participant_b',
            name: pB.display_name,
            monogram: pB.monogram,
            ga: standingB.ga,
            clean_sheets: standingB.clean_sheets,
          },
        ];
      }
    }
  }
  const isBestDefenceTied = bestDefenceWinners.length > 1;

  // 5. Goal of the Season
  const gotsWinners = gotsResults.filter((r) => r.is_winner);
  const isGotsTied = gotsWinners.length > 1;

  // 6. Longest Winning Streak: tie = co-winners
  const maxStreak = Math.max(paStreak, pbStreak);
  let streakWinners: Array<{
    participantId: 'participant_a' | 'participant_b';
    name: string;
    monogram: string;
    streak: number;
  }> = [];

  if (maxStreak > 0) {
    if (paStreak === pbStreak) {
      streakWinners = [
        { participantId: 'participant_a', name: pA.display_name, monogram: pA.monogram, streak: paStreak },
        { participantId: 'participant_b', name: pB.display_name, monogram: pB.monogram, streak: pbStreak },
      ];
    } else if (paStreak > pbStreak) {
      streakWinners = [
        { participantId: 'participant_a', name: pA.display_name, monogram: pA.monogram, streak: paStreak },
      ];
    } else {
      streakWinners = [
        { participantId: 'participant_b', name: pB.display_name, monogram: pB.monogram, streak: pbStreak },
      ];
    }
  }
  const isStreakTied = streakWinners.length > 1;

  // 7. Most Clean Sheets: tie = co-winners
  const csA = standingA?.clean_sheets ?? 0;
  const csB = standingB?.clean_sheets ?? 0;
  const maxCs = Math.max(csA, csB);
  let csWinners: Array<{
    participantId: 'participant_a' | 'participant_b';
    name: string;
    monogram: string;
    clean_sheets: number;
  }> = [];

  if (maxCs > 0) {
    if (csA === csB) {
      csWinners = [
        { participantId: 'participant_a', name: pA.display_name, monogram: pA.monogram, clean_sheets: csA },
        { participantId: 'participant_b', name: pB.display_name, monogram: pB.monogram, clean_sheets: csB },
      ];
    } else if (csA > csB) {
      csWinners = [
        { participantId: 'participant_a', name: pA.display_name, monogram: pA.monogram, clean_sheets: csA },
      ];
    } else {
      csWinners = [
        { participantId: 'participant_b', name: pB.display_name, monogram: pB.monogram, clean_sheets: csB },
      ];
    }
  }
  const isCsTied = csWinners.length > 1;

  // Other awards list
  const otherAwards: Array<{
    title: string;
    trophyType: TrophyType;
    rule: string;
    ruleRef: string;
    isTied: boolean;
    leaderContent: React.ReactNode;
    icon: React.ReactNode;
    action: React.ReactNode | null;
  }> = [
    {
      title: 'Golden Boot S1',
      trophyType: 'boot',
      rule: 'Pemain virtual dengan jumlah gol sah terbanyak dalam satu pemilik tim. Seluruh versi kartu digabung per pemain virtual dalam satu pemilik (tidak lintas pemilik). Jika seri, gelar dibagi (co-winner) tanpa tiebreaker.',
      ruleRef: 'Pasal 42',
      isTied: isBootTied,
      leaderContent:
        bootWinners.length > 0 ? (
          <div className="space-y-2.5">
            {bootWinners.map((w) => (
              <WinnerRow
                key={`${w.participant_id}-${w.base_player_id || w.player_name}`}
                participantId={w.participant_id}
                name={w.player_name}
                monogram={pMap.get(w.participant_id)?.monogram || 'P'}
                score={w.total_goals}
                scoreUnit="Gol"
                scoreColor="text-[var(--gold)]"
                cardVersions={w.card_versions}
                cardId={w.card_id}
                basePlayerId={w.base_player_id}
                metadata={getMeta(w.card_id, w.base_player_id, w.player_name)}
                cardVisualSize={isBootTied ? 'sm' : 'md'}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada gol tercatat</span>
        ),
      icon: <Award className="w-5 h-5 text-[var(--gold)]" />,
      action: null,
    },
    {
      title: 'Playmaker of the Season S1',
      trophyType: 'playmaker',
      rule: 'Pemain virtual dengan jumlah asis sah terbanyak dalam satu pemilik tim. Seluruh versi kartu digabung per pemain virtual dalam satu pemilik (tidak lintas pemilik). Jika seri, gelar dibagi (co-winner) tanpa tiebreaker.',
      ruleRef: 'Pasal 42A',
      isTied: isPlaymakerTied,
      leaderContent:
        playmakerWinners.length > 0 ? (
          <div className="space-y-2.5">
            {playmakerWinners.map((w) => (
              <WinnerRow
                key={`${w.participant_id}-${w.base_player_id || w.player_name}`}
                participantId={w.participant_id}
                name={w.player_name}
                monogram={pMap.get(w.participant_id)?.monogram || 'P'}
                score={w.total_assists}
                scoreUnit="Asis"
                scoreColor="text-[var(--p-b)]"
                cardVersions={w.card_versions}
                cardId={w.card_id}
                basePlayerId={w.base_player_id}
                metadata={getMeta(w.card_id, w.base_player_id, w.player_name)}
                cardVisualSize={isPlaymakerTied ? 'sm' : 'md'}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada asis tercatat</span>
        ),
      icon: <Sparkles className="w-5 h-5 text-[var(--p-b)]" />,
      action: null,
    },
    {
      title: 'Golden Glove S1',
      trophyType: 'glove',
      rule: 'Kiper starter bermain 90 menit reguler penuh dengan clean sheet terbanyak per pemilik tim. Seluruh versi kartu kiper digabung dalam satu pemilik (tidak lintas pemilik). Jika seri, gelar dibagi (co-winner) tanpa tiebreaker.',
      ruleRef: 'Pasal 44',
      isTied: isGloveTied,
      leaderContent:
        gloveWinners.length > 0 ? (
          <div className="space-y-2.5">
            {gloveWinners.map((w) => (
              <WinnerRow
                key={`${w.participant_id}-${w.base_player_id || w.goalkeeper_name}`}
                participantId={w.participant_id}
                name={w.goalkeeper_name}
                monogram={pMap.get(w.participant_id)?.monogram || 'P'}
                score={w.clean_sheets}
                scoreUnit="Clean Sheet"
                scoreColor="text-[var(--p-a)]"
                cardVersions={w.card_versions}
                cardId={w.card_id}
                basePlayerId={w.base_player_id}
                metadata={getMeta(w.card_id, w.base_player_id, w.goalkeeper_name)}
                cardVisualSize={isGloveTied ? 'sm' : 'md'}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">Belum ada clean sheet</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--p-a)]" />,
      action: null,
    },
    {
      title: 'Best Defence S1',
      trophyType: 'best_defence',
      rule: 'Peserta dengan jumlah kebobolan (GA) paling sedikit dalam klasemen akhir. Jika GA seri, jumlah clean sheet tim menjadi pembeda (Pasal 45). Jika masih seri, gelar dibagi (co-winner).',
      ruleRef: 'Pasal 45',
      isTied: isBestDefenceTied,
      leaderContent:
        bestDefenceWinners.length > 0 ? (
          <div className="space-y-2.5">
            {bestDefenceWinners.map((w) => (
              <WinnerRow
                key={w.participantId}
                participantId={w.participantId}
                name={w.name}
                monogram={w.monogram}
                score={w.ga}
                scoreUnit="Kebobolan"
                scoreColor="text-[var(--text)]"
                subtext={`${w.clean_sheets} Clean Sheet Tim`}
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">—</span>
        ),
      icon: <Shield className="w-5 h-5 text-[var(--text-dim)]" />,
      action: null,
    },
    {
      title: 'Goal of the Season S1',
      trophyType: 'gots',
      rule: 'Gol terbaik hasil surat suara peringkat rahasia kedua peserta (bobot 4–3–2–1). Jika seri, poin dari lawan menjadi pembeda (Pasal 43). Jika masih seri, gelar dibagi (co-winner).',
      ruleRef: 'Pasal 43',
      isTied: isGotsTied,
      leaderContent:
        gotsWinners.length > 0 ? (
          <div className="space-y-2.5">
            {gotsWinners.map((w) => (
              <WinnerRow
                key={w.nomination_id}
                participantId={w.participant_id}
                name={pMap.get(w.participant_id)?.display_name || w.participant_id}
                monogram={pMap.get(w.participant_id)?.monogram || 'P'}
                score={w.total_points}
                scoreUnit="Poin"
                scoreColor="text-[var(--p-b)]"
                subtext={`"${w.title}" · Pencetak: ${w.scorer_name}`}
              />
            ))}
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
      trophyType: 'streak',
      rule: 'Kemenangan pertandingan beruntun terpanjang yang diraih sepanjang musim. Jika seri, gelar dibagi (co-winner) tanpa tiebreaker.',
      ruleRef: 'Pasal 46',
      isTied: isStreakTied,
      leaderContent:
        streakWinners.length > 0 ? (
          <div className="space-y-2.5">
            {streakWinners.map((w) => (
              <WinnerRow
                key={w.participantId}
                participantId={w.participantId}
                name={w.name}
                monogram={w.monogram}
                score={w.streak}
                scoreUnit="Laga"
                scoreColor="text-[var(--p-a)]"
              />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-faint)] font-mono">0 Laga</span>
        ),
      icon: <Zap className="w-5 h-5 text-[var(--p-a)]" />,
      action: null,
    },
    {
      title: 'Most Clean Sheets S1',
      trophyType: 'clean_sheet',
      rule: 'Peserta dengan jumlah pertandingan tanpa kebobolan terbanyak di seluruh musim. Jika seri, gelar dibagi (co-winner) tanpa tiebreaker.',
      ruleRef: 'Pasal 47',
      isTied: isCsTied,
      leaderContent:
        csWinners.length > 0 ? (
          <div className="space-y-2.5">
            {csWinners.map((w) => (
              <WinnerRow
                key={w.participantId}
                participantId={w.participantId}
                name={w.name}
                monogram={w.monogram}
                score={w.clean_sheets}
                scoreUnit="Pertandingan"
                scoreColor="text-[var(--ok)]"
              />
            ))}
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
          Delapan gelar kehormatan resmi Rivals Series Season 1 yang ditentukan murni dari performa kompetisi, catatan statistik per pemilik, dan voting independen dua pemain.
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
              label={isCompleted ? (isChampionTied ? 'Juara Bersama Terkunci' : 'Juara Terkunci') : 'Provisional'}
            />
          </div>
        </div>

        {/* Champion Details Grid: Left Info & Leader, Right 3D Trophy Showcase */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-8 pt-4">
          {/* Left Column: Leader & Poin */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-faint)]">
                {isChampionTied ? 'Pimpinan Klasemen Bersama' : 'Pimpinan Klasemen Sementara'}
              </span>
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-[14px] bg-[var(--ink-0)]/70 border border-[var(--line)]">
                <PlayerTag
                  id={leader?.participant_id || 'participant_a'}
                  name={leaderParticipant?.display_name || 'Peserta'}
                  monogram={leaderParticipant?.monogram || 'PA'}
                  size="lg"
                />
                {isChampionTied && standings[1] && (
                  <>
                    <span className="text-xs font-bold text-[var(--text-faint)] uppercase">&amp;</span>
                    <PlayerTag
                      id={standings[1].participant_id}
                      name={pMap.get(standings[1].participant_id)?.display_name || 'Peserta B'}
                      monogram={pMap.get(standings[1].participant_id)?.monogram || 'PB'}
                      size="lg"
                    />
                  </>
                )}
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

          {/* Right Column: 3D Interactive Grand Champion Trophy (AFC Asian Cup Inspired) */}
          <div className="flex flex-col items-center justify-center p-2 rounded-[16px] bg-[var(--ink-0)]/40 border border-[var(--line)] min-h-[300px] sm:min-h-[360px]">
            <ChampionTrophyShowcase isCompleted={isCompleted} isTied={isChampionTied} />
          </div>
        </div>
      </section>

      {/* 3. Tujuh Penghargaan Lain sebagai Grid Kartu Trofi 3D Interaktif */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)]">
              Gelar Kehormatan Lainnya (BAB X)
            </h2>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Setiap penghargaan memiliki objek trofi 3D tersendiri yang dapat diputar 360°. Status dan pemegang dihitung murni dari statistik kompetisi.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-faint)] uppercase px-2.5 py-1 rounded bg-[var(--ink-1)] border border-[var(--line)]">
            7 Gelar Individu &amp; Tim
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {otherAwards.map((a) => (
            <div
              key={a.title}
              className="relative overflow-hidden rounded-[20px] bg-[var(--ink-1)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-all flex flex-col justify-between p-5 sm:p-6 shadow-sm group hover:shadow-[0_12px_36px_rgba(0,0,0,0.4)]"
            >
              {/* Dedicated 3D Interactive Trophy Canvas */}
              <div className="relative w-full rounded-[14px] bg-[var(--ink-0)]/60 border border-[var(--line)]/80 overflow-hidden flex items-center justify-center mb-5">
                <AwardTrophyShowcase
                  type={a.trophyType}
                  size="md"
                  isCompleted={isCompleted}
                  isTied={a.isTied}
                />
                <div className="absolute top-2.5 right-2.5 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--ink-0)]/80 border border-[var(--line)] backdrop-blur-xs text-[10px] text-[var(--text-faint)] font-mono">
                  <span>3D Objek</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/80 animate-pulse" />
                </div>
              </div>

              {/* Award Content & Winners */}
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {a.icon}
                      <h3 className="font-[family-name:var(--font-display)] font-bold text-xl uppercase tracking-tight text-[var(--text)] truncate">
                        {a.title}
                      </h3>
                    </div>
                    <span className="text-[11px] text-[var(--text-faint)] uppercase font-mono px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] shrink-0">
                      {a.ruleRef}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                    {a.rule}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--line)]/60 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-wider">
                        {a.isTied
                          ? 'Pemegang Bersama'
                          : isCompleted
                          ? 'Pemenang Resmi'
                          : 'Pemegang Saat Ini'}
                      </span>
                      {a.isTied && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30">
                          Gelar Dibagi
                        </span>
                      )}
                    </div>
                    <StatusChip
                      status={isCompleted ? 'confirmed' : 'provisional'}
                      label={isCompleted ? 'Terkunci' : 'Provisional'}
                    />
                  </div>

                  <div className="p-3.5 rounded-[12px] bg-[var(--ink-0)]/60 border border-[var(--line)]/80">
                    {a.leaderContent}
                  </div>

                  {a.action && (
                    <div className="pt-1 flex justify-end">
                      {a.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
