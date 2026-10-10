import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
  getAllRosterCards,
} from '@/lib/db';
import { calculateStandings, calculateWinningStreak } from '@/lib/engine';
import { ParticipantId } from '@/lib/types';
import { PlayerTag } from '@/components/PlayerTag';
import { Flag, Trophy, Shield, ArrowLeft, CheckCircle2, User } from 'lucide-react';

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

  const [participants, matches, sanctions, quotaCredits, seasonSettings, rosterCards] = await Promise.all([
    getParticipants(),
    getAllMatches(),
    getAllSanctions(),
    getAllQuotaCredits(),
    getSeasonSettings(),
    getAllRosterCards(1), // Phase 1 active
  ]);

  const participant = participants.find((p) => p.id === participantId);
  if (!participant) notFound();

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
  const standing = standings.find((s) => s.participant_id === participantId)!;
  const streak = calculateWinningStreak(matches, participantId);

  // Filter roster cards for this participant
  const myCards = rosterCards.filter((c: any) => c.participant_id === participantId);

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
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl uppercase tracking-tight text-[var(--text)]">
            Skuad Terdaftar — Fase 1 ({myCards.length}/26)
          </h2>
          <span className="text-[13px] text-[var(--text-dim)]">
            Pasal 14 & 15 (Maksimal 26 Kartu)
          </span>
        </div>

        {myCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myCards.map((card: any) => (
              <div
                key={card.id}
                className="rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-4 flex items-center justify-between gap-3 hover:border-[var(--text-dim)] transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-[var(--text)] block truncate">
                    {card.player_name}
                  </span>
                  <span className="text-[12px] text-[var(--text-faint)] block truncate">
                    {card.card_version} · {card.card_category || 'Standard'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {card.is_indonesian === 1 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30">
                      IDN
                    </span>
                  )}
                  {card.is_trending === 1 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a)]/30">
                      TRENDING
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
