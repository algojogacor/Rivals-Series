import Link from 'next/link';
import { getCachedStandingsData } from '@/lib/cached-data';
import { getSession } from '@/lib/auth';
import { deriveMatchSettings } from '@/lib/engine';
import { VersusHero } from '@/components/VersusHero';
import { SeasonTracker } from '@/components/SeasonTracker';
import { H2HBars } from '@/components/H2HBars';
import { PlayerTag } from '@/components/PlayerTag';
import { EmptyState } from '@/components/EmptyState';
import { ArrowRight, Settings2 } from 'lucide-react';

export default async function HomePage() {
  const [standingsData, session] = await Promise.all([
    getCachedStandingsData(),
    getSession(),
  ]);

  const { participants, matches, seasonSettings, standings } = standingsData;

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

      {/* 3. KICK-OFF BERIKUTNYA (Matchday Spotlight Stadium Card) */}
      {nextMatch && nextSettings && (
        <section aria-label="Pertandingan Berikutnya" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--p-a)] animate-pulse" />
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
                Kick-off Berikutnya
              </h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
              Jadwal Fleksibel
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6 shadow-md">
            {/* Ambient subtle spotlight inside card */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 70%)',
              }}
            />

            {/* Header row: Left Player A, Center Match info, Right Player B */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8">
              {/* Kiri: PlayerTag A */}
              <div className="flex-1 w-full sm:w-auto flex flex-col items-center sm:items-start text-center sm:text-left p-4 rounded-[12px] bg-[var(--ink-0)]/60 border border-[var(--p-a-border)]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-[var(--p-a)] uppercase tracking-wider">
                    Pemain A
                  </span>
                  {nextHostIsA && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--ink-2)] text-[var(--text)] border border-[var(--line)]">
                      Tuan Rumah
                    </span>
                  )}
                </div>
                <div className="flex items-center">
                  <PlayerTag
                    id="participant_a"
                    name={pA.display_name}
                    monogram={pA.monogram}
                    size="md"
                  />
                </div>
                <div className="mt-1 text-xs text-[var(--text-faint)]">
                  {nextHostIsA ? 'Wajib membuat Friend Match Room' : 'Tamu (Menunggu Room Code)'}
                </div>
              </div>

              {/* Tengah: MD info + "vs" */}
              <div className="flex flex-col items-center justify-center text-center px-4 shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1">
                  {nextMatch.id} · {nextSettings.phaseLabel}
                </span>
                <span className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase text-[var(--text)] tracking-wider">
                  vs
                </span>
                <span className="mt-1 text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">
                  Durasi {nextSettings.durationMinutes} Menit
                </span>
              </div>

              {/* Kanan: PlayerTag B */}
              <div className="flex-1 w-full sm:w-auto flex flex-col items-center sm:items-end text-center sm:text-right p-4 rounded-[12px] bg-[var(--ink-0)]/60 border border-[var(--p-b-border)]">
                <div className="flex items-center gap-2 mb-1">
                  {!nextHostIsA && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--ink-2)] text-[var(--text)] border border-[var(--line)]">
                      Tuan Rumah
                    </span>
                  )}
                  <span className="text-[11px] font-bold text-[var(--p-b)] uppercase tracking-wider">
                    Pemain B
                  </span>
                </div>
                <div className="flex items-center">
                  <PlayerTag
                    id="participant_b"
                    name={pB.display_name}
                    monogram={pB.monogram}
                    size="md"
                  />
                </div>
                <div className="mt-1 text-xs text-[var(--text-faint)]">
                  {!nextHostIsA ? 'Wajib membuat Friend Match Room' : 'Tamu (Menunggu Room Code)'}
                </div>
              </div>
            </div>

            {/* Aturan Chip: 8 menit · Extra Time off · Penalti off · Kondisi acak */}
            <div className="relative z-10 pt-4 border-t border-[var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  <Settings2 className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                  <span>{nextSettings.durationMinutes} menit reguler</span>
                </span>
                <span className="px-3 py-1.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  {nextSettings.extraTimeAllowed ? 'Extra Time on' : 'Extra Time off'}
                </span>
                <span className="px-3 py-1.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  {nextSettings.penaltiesAllowed ? 'Penalti on' : 'Penalti off'}
                </span>
                <span className="px-3 py-1.5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)]">
                  Kondisi acak (Random)
                </span>
              </div>

              {/* Aksi: Tombol Lapor Hasil & Link Panduan */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/matches/${nextMatch.md_number}`}
                  className="text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors underline underline-offset-4"
                >
                  Panduan Kamar Tanding
                </Link>

                <Link
                  href="/control"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_16px_rgba(255,255,255,0.25)] transition-all"
                >
                  Lapor Hasil Pertandingan
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. HEAD-TO-HEAD: H2HBars */}
      <section aria-label="Perbandingan Head to Head" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Head-to-Head Musim
          </h2>
          <Link
            href="/standings"
            className="text-xs font-semibold text-[var(--text)] hover:text-[var(--text-dim)] flex items-center gap-1.5 transition-colors underline underline-offset-4 uppercase tracking-wider"
          >
            <span>Lihat klasemen lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <H2HBars standingA={standingA} standingB={standingB} />
      </section>

      {/* 5. HASIL TERAKHIR */}
      <section aria-label="Hasil Terakhir" className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
          Hasil Terakhir
        </h2>

        {latestMatch ? (
          <div className="rounded-[16px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            {/* Kiri: MD dan tanggal */}
            <div className="text-center md:text-left space-y-1">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl text-[var(--text-dim)]">
                {latestMatch.id}
              </span>
              <p className="text-xs text-[var(--text-faint)]">
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

            {/* Tengah: Baris Skor Besar */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="text-right">
                <span className="font-semibold text-base sm:text-lg block text-[var(--text)]">
                  {pA.display_name}
                </span>
                <span className="text-xs text-[var(--p-a)] font-semibold">Pemain A</span>
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
                <span className="text-xs text-[var(--p-b)] font-semibold">Pemain B</span>
              </div>
            </div>

            {/* Kanan: Tautan detail */}
            <div className="shrink-0">
              <Link
                href={`/matches/${latestMatch.md_number}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
              >
                <span>Detail Pertandingan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            motif="whistle"
            title="Belum ada peluit akhir"
            description="Papan skor hasil resmi akan terbit di sini segera setelah kedua pemain mengesahkan laporan pertandingan perdana."
            nextStep="Mainkan MD1 sesuai jadwal lalu laporkan hasil pertandingan di Pusat Kontrol."
            actionText="Lapor Hasil Pertandingan"
            actionHref="/control"
          />
        )}
      </section>
    </div>
  );
}
