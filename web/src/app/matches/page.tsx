import Link from 'next/link';
import { getCachedMatchesData } from '@/lib/cached-data';
import { getSession } from '@/lib/auth';
import { MatchRow } from '@/components/MatchRow';
import { Calendar, Sliders, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Match Center | Rivals Series Season 1',
  description: 'Jadwal fleksibel 20 matchday, hasil skor resmi, dan status konfirmasi Rivals Series Season 1.',
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>;
}) {
  const [params, matchesData, session] = await Promise.all([
    searchParams,
    getCachedMatchesData(),
    getSession(),
  ]);
  const { matches, participants } = matchesData;

  const activePhase = params.phase || 'all';

  // Next scheduled match
  const nextMatch = matches.find((m) => m.status === 'scheduled');
  const nextMdNumber = nextMatch?.md_number;

  // Filter groups
  const groupStageMatches = matches.filter((m) => m.phase === 'group_stage');
  const knockoutMatches = matches.filter((m) => m.phase === 'knockout_stage');

  const showGroup = activePhase === 'all' || activePhase === 'group';
  const showKnockout = activePhase === 'all' || activePhase === 'knockout';

  // Completed count
  const completedCount = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  ).length;

  return (
    <div className="space-y-8">
      {/* 1. Header with Segmented Control & Primary Action */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-[var(--line)] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[var(--p-a)]" />
            <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[clamp(2.5rem,5vw,3.75rem)] uppercase tracking-tight text-[var(--text)] leading-none">
              Match Center
            </h1>
          </div>
          <p className="text-[15px] text-[var(--text-dim)] max-w-xl">
            20 pertandingan duel dengan jadwal fleksibel. {completedCount} laga disahkan, {20 - completedCount} laga tersisa.
          </p>
        </div>

        {/* Action Zone: Segmented Phase Control & Lapor CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 rounded-[10px] bg-[var(--ink-1)] border border-[var(--line)]">
            <Link
              href="/matches"
              className={`px-3.5 py-1.5 rounded-[7px] text-xs font-bold uppercase tracking-wider transition-colors ${
                activePhase === 'all'
                  ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Semua (20)
            </Link>
            <Link
              href="/matches?phase=group"
              className={`px-3.5 py-1.5 rounded-[7px] text-xs font-bold uppercase tracking-wider transition-colors ${
                activePhase === 'group'
                  ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Group Stage (1–10)
            </Link>
            <Link
              href="/matches?phase=knockout"
              className={`px-3.5 py-1.5 rounded-[7px] text-xs font-bold uppercase tracking-wider transition-colors ${
                activePhase === 'knockout'
                  ? 'bg-[var(--ink-2)] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              Knockout (11–20)
            </Link>
          </div>

          <Link
            href="/control"
            className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_16px_rgba(255,255,255,0.25)] transition-all shrink-0"
          >
            Lapor Hasil
          </Link>
        </div>
      </div>

      {/* 2. Group Stage (MD1–10) */}
      {showGroup && (
        <section className="space-y-3">
          <div className="sticky top-16 z-20 py-2.5 px-3 rounded-[8px] bg-[var(--ink-0)]/95 backdrop-blur-md border border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--p-a)]" />
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-lg sm:text-xl uppercase tracking-tight text-[var(--text)]">
                Fase 1: Group Stage · MD1–10
              </h2>
            </div>
            <span className="text-xs text-[var(--text-dim)] font-mono">
              Poin: Menang 3 · Seri 1 · Kalah 0 · 8 Menit
            </span>
          </div>

          <div className="space-y-2.5">
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
        <section className="space-y-3 pt-6">
          <div className="sticky top-16 z-20 py-2.5 px-3 rounded-[8px] bg-[var(--ink-0)]/95 backdrop-blur-md border border-[var(--line)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--p-b)]" />
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-lg sm:text-xl uppercase tracking-tight text-[var(--text)]">
                Fase 2: Knockout Stage · MD11–20
              </h2>
            </div>
            <span className="text-xs text-[var(--text-dim)] font-mono">
              ET & Penalti Wajib · Tanpa Hasil Seri
            </span>
          </div>

          <div className="space-y-2.5">
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
