import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
  getVisibleRosterCards,
} from '@/lib/db';
import { calculateStandings, calculateWinningStreak } from '@/lib/engine';
import { ParticipantId } from '@/lib/types';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Profil Peserta | Rivals Series Season 1',
  description: 'Profil resmi kompetitor, statistik tanding, dan susunan kartu skuad Rivals Series Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function ParticipantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id !== 'participant_a' && id !== 'participant_b') {
    notFound();
  }
  const participantId = id as ParticipantId;
  const session = await getSession();

  const [participants, matches, sanctions, quotaCredits, seasonSettings, phase1Roster, phase2Roster] =
    await Promise.all([
      getParticipants(),
      getAllMatches(),
      getAllSanctions(),
      getAllQuotaCredits(),
      getSeasonSettings(),
      getVisibleRosterCards(1, session?.participantId),
      getVisibleRosterCards(2, session?.participantId),
    ]);

  const participant = participants.find((p) => p.id === participantId);
  if (!participant) notFound();

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
  const standing = standings.find((s) => s.participant_id === participantId)!;
  const streak = calculateWinningStreak(matches, participantId);

  const md10Match = matches.find((m) => m.md_number === 10);
  const md10Completed = md10Match?.status === 'confirmed' || md10Match?.status === 'forfeited';

  const activeRoster = md10Completed && phase2Roster.cards.some((c) => c.participant_id === participantId)
    ? phase2Roster
    : phase1Roster;
  const activePhaseNum = activeRoster === phase2Roster ? 2 : 1;

  const isViewingOwnProfile = session?.participantId === participantId;
  const isOpponentHidden = !activeRoster.phaseStatus.both_locked && !isViewingOwnProfile;
  const myCards = activeRoster.cards.filter((c) => c.participant_id === participantId);
  const myCount = participantId === 'participant_a' ? activeRoster.paCount : activeRoster.pbCount;
  const isParticipantLocked =
    participantId === 'participant_a'
      ? activeRoster.phaseStatus.pa_locked === 1
      : activeRoster.phaseStatus.pb_locked === 1;

  const isA = participantId === 'participant_a';
  const playerColor = isA ? 'var(--p-a)' : 'var(--p-b)';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/standings"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Klasemen</span>
        </Link>
      </div>

      {/* Participant Hero Card */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-[8px] flex items-center justify-center font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase shrink-0"
            style={{ backgroundColor: playerColor, color: 'var(--ink-0)' }}
          >
            {participant.monogram}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-[var(--text)]">
                {participant.display_name}
              </h1>
              {participant.is_admin === 1 && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[13px] text-[var(--text-dim)] mt-0.5">
              Peringkat #{standing.rank} Resmi · Rivals Series Season 1 Competitor
              {streak > 0 ? ` · ${streak} Kemenangan Beruntun` : ''}
            </p>
          </div>
        </div>

        {/* Primary Stats Row */}
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[var(--line)] pt-4 md:pt-0 md:pl-8">
          <div className="text-center">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums text-[var(--text)] block">
              {standing.points}
            </span>
            <span className="text-[11px] text-[var(--text-faint)] uppercase font-semibold tracking-wider">
              Poin
            </span>
          </div>
          <div className="text-center">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums text-[var(--text)] block">
              {standing.w}
            </span>
            <span className="text-[11px] text-[var(--text-faint)] uppercase font-semibold tracking-wider">
              Menang
            </span>
          </div>
          <div className="text-center">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums text-[var(--text)] block">
              {standing.gf}:{standing.ga}
            </span>
            <span className="text-[11px] text-[var(--text-faint)] uppercase font-semibold tracking-wider">
              Gol
            </span>
          </div>
          <div className="text-center">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl tabular-nums text-[var(--text)] block">
              {standing.id_credits}/5
            </span>
            <span className="text-[11px] text-[var(--text-faint)] uppercase font-semibold tracking-wider">
              Kredit ID
            </span>
          </div>
        </div>
      </div>

      {/* Roster Cards Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl uppercase tracking-tight text-[var(--text)]">
              Skuad Terdaftar — Fase {activePhaseNum} ({myCount}/26)
            </h2>
            {isParticipantLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                Terkunci
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/30">
                Penyusunan
              </span>
            )}
          </div>
          <span className="text-[13px] text-[var(--text-dim)]">
            Pasal 14 & 15 · Maks 26 Kartu · Min 2 Trending · 1 Kartu per Pemain Virtual
          </span>
        </div>

        {isOpponentHidden ? (
          <div className="p-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[var(--ink-2)] border border-[var(--line)] flex items-center justify-center mx-auto text-[var(--text-dim)]">
              <Lock className="w-5 h-5" />
            </div>
            <p className="font-[family-name:var(--font-display)] font-bold text-lg uppercase tracking-tight text-[var(--text)]">
              Skuad Tersembunyi ({myCount}/26 Kartu Terdaftar)
            </p>
            <p className="text-[13px] text-[var(--text-dim)] max-w-md mx-auto">
              Sesuai regulasi Rivals Series, susunan kartu skuad peserta dirahasiakan di sisi server sampai kedua peserta resmi mengunci skuad Fase {activePhaseNum}.
            </p>
          </div>
        ) : myCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCards.map((card) => (
              <div
                key={card.id}
                className="rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)] p-3.5 flex items-center justify-between gap-3 hover:border-[var(--text-dim)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar
                    cardId={card.efootball_card_id}
                    basePlayerId={card.base_player_id}
                    name={card.player_name}
                    position={card.position}
                    isTrending={card.is_trending}
                    isIndonesian={card.is_indonesian}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {card.position && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] font-[family-name:var(--font-mono)] text-[10px] font-bold text-[var(--text)]">
                          {card.position}
                        </span>
                      )}
                      {card.overall_max && (
                        <span className="font-[family-name:var(--font-display)] font-extrabold text-sm tabular-nums text-[var(--warn)]">
                          {card.overall_max}
                        </span>
                      )}
                      <span className="font-semibold text-sm text-[var(--text)] truncate">
                        {card.player_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-faint)] block truncate mt-0.5">
                      {card.card_version} · {card.card_category || 'Standard'}
                      {card.club_name ? ` · ${card.club_name}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {card.is_trending === 1 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a)]/30">
                      TRENDING
                    </span>
                  )}
                  {card.is_indonesian === 1 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                      IDN
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] text-center text-sm text-[var(--text-dim)]">
            Belum ada kartu pemain yang didaftarkan untuk fase ini.
          </div>
        )}
      </section>
    </div>
  );
}

