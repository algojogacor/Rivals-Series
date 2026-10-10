import Link from 'next/link';
import { getAllMatches, getParticipants } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { MatchRow } from '@/components/MatchRow';

export const metadata = {
  title: 'Match Center | Rivals Series Season 1',
  description: 'Jadwal fleksibel 20 matchday, hasil skor resmi, dan status konfirmasi Rivals Series Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const params = await searchParams;
  const [matches, participants, session] = await Promise.all([
    getAllMatches(),
    getParticipants(),
    getSession(),
  ]);

  const activePhase = params.phase || 'all';

  // Next scheduled match
  const nextMatch = matches.find((m) => m.status === 'scheduled');
  const nextMdNumber = nextMatch?.md_number;

  // Filter groups
  const groupStageMatches = matches.filter((m) => m.phase === 'group_stage');
  const knockoutMatches = matches.filter((m) => m.phase === 'knockout_stage');

  const showGroup = activePhase === 'all' || activePhase === 'group';
  const showKnockout = activePhase === 'all' || activePhase === 'knockout';

  return (
    <div className="space-y-8">
      {/* 1. Header with Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
            Match Center
          </h1>
          <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
            20 pertandingan duel dengan jadwal fleksibel. Nomor matchday menentukan aturan durasi dan regulasi adu penalti.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] self-start sm:self-auto">
          <Link
            href="/matches"
            className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-colors ${
              activePhase === 'all'
                ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            Semua (20)
          </Link>
          <Link
            href="/matches?phase=group"
            className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-colors ${
              activePhase === 'group'
                ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            Group Stage (1–10)
          </Link>
          <Link
            href="/matches?phase=knockout"
            className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-colors ${
              activePhase === 'knockout'
                ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            Knockout (11–20)
          </Link>
        </div>
      </div>

      {/* 2. Group Stage (MD1–10) */}
      {showGroup && (
        <section className="space-y-3">
          <div className="sticky top-16 z-20 py-2 bg-[var(--ink-0)]/90 backdrop-blur-sm border-b border-[var(--line)] flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg sm:text-xl uppercase tracking-tight text-[var(--text)]">
              Group Stage · MD1–10
            </h2>
            <span className="text-[12px] text-[var(--text-faint)]">
              Poin: Menang 3 · Seri 1 · Kalah 0
            </span>
          </div>

          <div className="space-y-2">
            {groupStageMatches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                participants={participants}
                isNextMatch={m.md_number === nextMdNumber}
                canReport={Boolean(session)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Knockout Stage (MD11–20) */}
      {showKnockout && (
        <section className="space-y-3 pt-4">
          <div className="sticky top-16 z-20 py-2 bg-[var(--ink-0)]/90 backdrop-blur-sm border-b border-[var(--line)] flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-lg sm:text-xl uppercase tracking-tight text-[var(--text)]">
              Knockout Stage · MD11–20
            </h2>
            <span className="text-[12px] text-[var(--text-faint)]">
              ET & Penalti On · Wajib Ada Pemenang (Tanpa Seri)
            </span>
          </div>

          <div className="space-y-2">
            {knockoutMatches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                participants={participants}
                isNextMatch={m.md_number === nextMdNumber}
                canReport={Boolean(session)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
