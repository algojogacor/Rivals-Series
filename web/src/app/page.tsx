import Link from 'next/link';
import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { calculateStandings, deriveMatchSettings } from '@/lib/engine';
import { VersusHero } from '@/components/VersusHero';
import { SeasonTracker } from '@/components/SeasonTracker';
import { H2HBars } from '@/components/H2HBars';
import { PlayerTag } from '@/components/PlayerTag';
import { EmptyState } from '@/components/EmptyState';
import { ArrowRight, Settings2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [
    participants,
    matches,
    sanctions,
    quotaCredits,
    seasonSettings,
    session,
  ] = await Promise.all([
    getParticipants(),
    getAllMatches(),
    getAllSanctions(),
    getAllQuotaCredits(),
    getSeasonSettings(),
    getSession(),
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

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
  const standingA = standings.find((s) => s.participant_id === 'participant_a') || standings[0];
  const standingB = standings.find((s) => s.participant_id === 'participant_b') || standings[1];

  const confirmedMatches = matches.filter((m) =>
    ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
  );

  // Next match (first scheduled match)
  const nextMatch = matches.find((m) => m.status === 'scheduled');
  const nextSettings = nextMatch ? deriveMatchSettings(nextMatch.md_number) : null;
  const nextHostIsA = nextMatch?.home_participant_id === 'participant_a';

  // Latest confirmed match
  const latestMatch = [...confirmedMatches].reverse()[0];
  const latestSettings = latestMatch ? deriveMatchSettings(latestMatch.md_number) : null;

  return (
    <div className="space-y-[72px] md:space-y-[112px]">
      {/* 1. VERSUS HERO (Tinggi ~70vh, min 520, max 680) */}
      <VersusHero
        participantA={pA}
        participantB={pB}
        standingA={standingA}
        standingB={standingB}
        seasonSettings={seasonSettings}
      />

      {/* 2. SEASON TRACKER (Tepat di bawah hero, lebar penuh konten) */}
      <section aria-label="Progres Musim">
        <SeasonTracker matches={matches} participants={participants} />
      </section>

      {/* 3. KICK-OFF (Pertandingan berikutnya) - Satu strip lebar */}
      {nextMatch && nextSettings && (
        <section aria-label="Pertandingan Berikutnya" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
              Kick-off Berikutnya
            </h2>
            <span className="text-[13px] text-[var(--text-dim)]">
              Jadwal Fleksibel
            </span>
          </div>

          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
            {/* Header row: Left Player A, Center Match info, Right Player B - strictly aligned */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
              {/* Kiri: PlayerTag A */}
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center h-9">
                  <PlayerTag
                    id="participant_a"
                    name={pA.display_name}
                    monogram={pA.monogram}
                    size="md"
                  />
                </div>
                <div className="h-5 flex items-center mt-1">
                  {nextHostIsA ? (
                    <span className="text-[13px] text-[var(--text-faint)]">
                      Room Creator (Tuan Rumah)
                    </span>
                  ) : (
                    <span className="text-[13px] text-[var(--text-faint)] opacity-0 select-none">
                      Away
                    </span>
                  )}
                </div>
              </div>

              {/* Tengah: MD info + "vs" */}
              <div className="flex flex-col items-center justify-center text-center px-4 shrink-0">
                <span className="text-[13px] font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-1">
                  {nextMatch.id} · {nextSettings.phaseLabel}
                </span>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl sm:text-4xl uppercase text-[var(--text)] tracking-wider">
                  vs
                </span>
                <div className="h-5 mt-1" />
              </div>

              {/* Kanan: PlayerTag B */}
              <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right">
                <div className="flex items-center h-9">
                  <PlayerTag
                    id="participant_b"
                    name={pB.display_name}
                    monogram={pB.monogram}
                    size="md"
                  />
                </div>
                <div className="h-5 flex items-center mt-1">
                  {!nextHostIsA ? (
                    <span className="text-[13px] text-[var(--text-faint)]">
                      Room Creator (Tuan Rumah)
                    </span>
                  ) : (
                    <span className="text-[13px] text-[var(--text-faint)] opacity-0 select-none">
                      Away
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Aturan Chip: 8 menit · Extra Time off · Penalti off · Kondisi acak */}
            <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-dim)]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  <Settings2 className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                  <span>{nextSettings.durationMinutes} menit</span>
                </span>
                <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  {nextSettings.extraTimeAllowed ? 'Extra Time on' : 'Extra Time off'}
                </span>
                <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  {nextSettings.penaltiesAllowed ? 'Penalti on' : 'Penalti off'}
                </span>
                <span className="px-3 py-1 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  Kondisi acak
                </span>
              </div>

              {/* Aksi: Tombol primary "Lapor Hasil" (hanya jika login) & link panduan */}
              <div className="flex items-center gap-4">
                <Link
                  href={`/matches/${nextMatch.md_number}`}
                  className="text-[13px] font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-colors underline underline-offset-4"
                >
                  Panduan pengaturan pertandingan
                </Link>

                {session && (
                  <Link
                    href="/control"
                    className="inline-flex items-center justify-center h-12 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-[15px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    Lapor Hasil
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. HEAD-TO-HEAD: H2HBars menggantikan kartu peserta dan tabel klasemen */}
      <section aria-label="Perbandingan Head to Head" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Head-to-Head Musim
          </h2>
          <Link
            href="/standings"
            className="text-[13px] font-semibold text-[var(--text)] hover:text-[var(--text-dim)] flex items-center gap-1.5 transition-colors underline underline-offset-4"
          >
            <span>Lihat klasemen lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <H2HBars standingA={standingA} standingB={standingB} />
      </section>

      {/* 5. HASIL TERAKHIR: EmptyState jika kosong, atau baris skor besar jika ada */}
      <section aria-label="Hasil Terakhir" className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
          Hasil Terakhir
        </h2>

        {latestMatch ? (
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Kiri: MD dan tanggal */}
            <div className="text-center md:text-left space-y-1">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl text-[var(--text-dim)]">
                {latestMatch.id}
              </span>
              <p className="text-[13px] text-[var(--text-faint)]">
                {latestSettings?.phaseLabel} ·{' '}
                {latestMatch.played_at
                  ? new Date(latestMatch.played_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Hasil Terverifikasi'}
              </p>
            </div>

            {/* Tengah: Baris Skor Besar (display 3rem) */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-right">
                <span className="font-semibold text-base sm:text-lg block text-[var(--text)]">
                  {pA.display_name}
                </span>
                <span className="text-[13px] text-[var(--text-dim)]">Pemain A</span>
              </div>

              <div className="font-[family-name:var(--font-display)] font-extrabold text-5xl sm:text-6xl tabular-nums leading-none flex items-center gap-3">
                <span
                  style={{
                    color:
                      latestMatch.winner_id === 'participant_a'
                        ? 'var(--p-a)'
                        : 'var(--text)',
                  }}
                >
                  {latestMatch.home_score}
                </span>
                <span className="text-[var(--text-dim)] text-3xl">:</span>
                <span
                  style={{
                    color:
                      latestMatch.winner_id === 'participant_b'
                        ? 'var(--p-b)'
                        : 'var(--text)',
                  }}
                >
                  {latestMatch.away_score}
                </span>
              </div>

              <div className="text-left">
                <span className="font-semibold text-base sm:text-lg block text-[var(--text)]">
                  {pB.display_name}
                </span>
                <span className="text-[13px] text-[var(--text-dim)]">Pemain B</span>
              </div>
            </div>

            {/* Kanan: Tautan detail */}
            <div className="shrink-0">
              <Link
                href={`/matches/${latestMatch.md_number}`}
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--text)] hover:underline"
              >
                <span>Detail Pertandingan</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Belum ada peluit akhir"
            description="Hasil pertama muncul di sini setelah kedua pemain mengesahkannya."
            actionText={session ? 'Lapor Hasil Pertandingan' : undefined}
            actionHref={session ? '/control' : undefined}
          />
        )}
      </section>
    </div>
  );
}
