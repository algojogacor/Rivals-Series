import React from 'react';
import Link from 'next/link';
import { ChevronRight, Settings2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Match, Participant } from '@/lib/types';
import { deriveMatchSettings } from '@/lib/engine';
import { PlayerTag } from './PlayerTag';
import { StatusChip } from './StatusChip';

interface MatchRowProps {
  match: Match;
  participants: Participant[];
  isNextMatch?: boolean;
  canReport?: boolean;
  className?: string;
}

export function MatchRow({
  match,
  participants,
  isNextMatch = false,
  canReport = false,
  className = '',
}: MatchRowProps) {
  const pA = participants.find((p) => p.id === 'participant_a');
  const pB = participants.find((p) => p.id === 'participant_b');
  const settings = deriveMatchSettings(match.md_number);

  const isConfirmed = [
    'confirmed',
    'reconstructed',
    'forfeited',
    'technical_win',
  ].includes(match.status);
  const isPlayed = match.home_score !== null && match.away_score !== null;

  // Determine winner for score coloring
  const isAWinner = isConfirmed && match.winner_id === 'participant_a';
  const isBWinner = isConfirmed && match.winner_id === 'participant_b';
  const isHostA = match.home_participant_id === 'participant_a';

  // 1. HIGHLIGHT CARD: LAGA BERIKUTNYA (MATCH SPOTLIGHT)
  if (isNextMatch) {
    return (
      <div
        className={`relative overflow-hidden rounded-[14px] border-2 border-[var(--p-a-border)] bg-[var(--ink-1)] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${className}`}
      >
        {/* Subtle ambient gradient */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, var(--p-a-glow) 0%, transparent 70%)',
          }}
        />

        {/* Top bar: Badge Laga Berikutnya */}
        <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[var(--line)] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--p-a)] animate-pulse" />
            <span className="font-[family-name:var(--font-display)] font-extrabold text-sm uppercase tracking-wider text-[var(--p-a)]">
              Laga Berikutnya · MD{match.md_number} ({settings.phaseLabel})
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text-dim)]">
            Siap Bertanding
          </span>
        </div>

        {/* Center Teams Matchup */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 py-2">
          {/* Sisi Kiri: Pemain A */}
          <div className="flex-1 w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 p-3 rounded-[10px] bg-[var(--ink-0)]/70 border border-[var(--p-a-border)]">
            <PlayerTag
              id="participant_a"
              name={pA?.display_name || 'Peserta A'}
              monogram={pA?.monogram || 'PA'}
              size="md"
            />
            {isHostA && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--p-a-soft)] text-[var(--p-a)] border border-[var(--p-a-border)] shrink-0">
                Tuan Rumah
              </span>
            )}
          </div>

          {/* Tengah: VS */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <span className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase text-[var(--text)] tracking-wider">
              VS
            </span>
          </div>

          {/* Sisi Kanan: Pemain B */}
          <div className="flex-1 w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 p-3 rounded-[10px] bg-[var(--ink-0)]/70 border border-[var(--p-b-border)]">
            {!isHostA && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--p-b-soft)] text-[var(--p-b)] border border-[var(--p-b-border)] shrink-0">
                Tuan Rumah
              </span>
            )}
            <PlayerTag
              id="participant_b"
              name={pB?.display_name || 'Peserta B'}
              monogram={pB?.monogram || 'PB'}
              size="md"
            />
          </div>
        </div>

        {/* Bottom Rules & CTA */}
        <div className="relative z-10 mt-4 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)]">
              <Settings2 className="w-3.5 h-3.5" />
              <span>{settings.durationMinutes} menit</span>
            </span>
            <span className="px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)]">
              {settings.extraTimeAllowed ? 'Extra Time on' : 'Extra Time off'}
            </span>
            <span className="px-2.5 py-1 rounded bg-[var(--ink-2)] border border-[var(--line)]">
              {settings.penaltiesAllowed ? 'Penalti on' : 'Penalti off'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/matches/${match.md_number}`}
              className="text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] underline underline-offset-4"
            >
              Panduan Kamar Tanding
            </Link>
            <Link
              href="/control"
              className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_12px_rgba(255,255,255,0.2)] transition-all shrink-0"
            >
              Lapor Hasil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. STANDARD MATCH ROW (SELESAI ATAU TERJADWAL)
  return (
    <div
      className={`group relative rounded-[10px] border border-[var(--line)] bg-[var(--ink-1)] transition-colors hover:border-[var(--text-dim)]/50 ${
        isConfirmed ? 'hover:bg-[var(--ink-2)]/30' : ''
      } h-[64px] px-3.5 sm:px-5 ${className}`}
    >
      <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
        {/* Left: MD Number (display font, tabular) */}
        <Link
          href={`/matches/${match.md_number}`}
          className="shrink-0 font-[family-name:var(--font-display)] font-extrabold text-2xl text-[var(--text-dim)] group-hover:text-[var(--text)] tabular-nums w-12 sm:w-16 transition-colors"
        >
          MD{match.md_number}
        </Link>

        {/* Center: PlayerTag A — score / "vs" — PlayerTag B */}
        <Link
          href={`/matches/${match.md_number}`}
          className="flex-1 flex items-center justify-center gap-2 sm:gap-6 min-w-0"
        >
          {/* Player A (Right-aligned to center) */}
          <div className="flex-1 flex justify-end truncate">
            <PlayerTag
              id="participant_a"
              name={pA?.display_name || 'Peserta A'}
              monogram={pA?.monogram || 'PA'}
              size="sm"
              className="max-w-full justify-end"
            />
          </div>

          {/* Score or "vs" (Papan skor resmi) */}
          <div className="shrink-0 px-2 sm:px-4 text-center">
            {isPlayed ? (
              <div className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl tabular-nums leading-none flex items-center gap-2">
                <span
                  style={{
                    color: isAWinner ? 'var(--p-a)' : 'var(--text)',
                    textShadow: isAWinner ? '0 0 10px var(--p-a-glow)' : 'none',
                  }}
                >
                  {match.home_score}
                </span>
                <span className="text-[var(--text-faint)] text-lg font-light">:</span>
                <span
                  style={{
                    color: isBWinner ? 'var(--p-b)' : 'var(--text)',
                    textShadow: isBWinner ? '0 0 10px var(--p-b-glow)' : 'none',
                  }}
                >
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-xs font-[family-name:var(--font-display)] font-bold text-[var(--text-faint)] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--line)]">
                vs
              </span>
            )}
          </div>

          {/* Player B (Left-aligned) */}
          <div className="flex-1 flex justify-start truncate">
            <PlayerTag
              id="participant_b"
              name={pB?.display_name || 'Peserta B'}
              monogram={pB?.monogram || 'PB'}
              size="sm"
              className="max-w-full justify-start"
            />
          </div>
        </Link>

        {/* Right: StatusChip + Arrow Link */}
        <div className="shrink-0 flex items-center gap-2">
          <StatusChip
            status={match.status}
            confirmationStatus={match.confirmation_status}
            className="hidden sm:inline-flex"
          />
          <Link
            href={`/matches/${match.md_number}`}
            className="p-1.5 rounded-[6px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors"
            aria-label={`Detail MD${match.md_number}`}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
