import React from 'react';
import Link from 'next/link';
import { ChevronRight, Settings2 } from 'lucide-react';
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

  return (
    <div
      className={`relative rounded-[8px] border border-[var(--line)] bg-[var(--ink-1)] transition-colors hover:border-[var(--text-dim)] ${
        isNextMatch ? 'p-4 sm:p-5' : 'h-[64px] px-3 sm:px-4'
      } ${className}`}
    >
      <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
        {/* Left: MD Number (display 2rem, --text-dim) */}
        <Link
          href={`/matches/${match.md_number}`}
          className="shrink-0 font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl text-[var(--text-dim)] tabular-nums w-10 sm:w-14"
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

          {/* Score or "vs" */}
          <div className="shrink-0 px-2 sm:px-3 text-center">
            {isPlayed ? (
              <div className="font-[family-name:var(--font-display)] font-extrabold text-xl sm:text-2xl tabular-nums leading-none flex items-center gap-1.5">
                <span
                  style={{
                    color: isAWinner ? 'var(--p-a)' : 'var(--text)',
                  }}
                >
                  {match.home_score}
                </span>
                <span className="text-[var(--text-dim)]">:</span>
                <span
                  style={{
                    color: isBWinner ? 'var(--p-b)' : 'var(--text)',
                  }}
                >
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-[family-name:var(--font-display)] font-bold text-[var(--text-dim)] uppercase tracking-wider">
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

        {/* Right: StatusChip + Arrow */}
        <div className="shrink-0 flex items-center gap-2">
          <StatusChip
            status={match.status}
            confirmationStatus={match.confirmation_status}
            className="hidden sm:inline-flex"
          />
          <Link
            href={`/matches/${match.md_number}`}
            className="p-1 text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            aria-label={`Detail MD${match.md_number}`}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Expanded section for Next Match */}
      {isNextMatch && (
        <div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5" />
              <span>{settings.durationMinutes} menit</span>
            </span>
            <span>·</span>
            <span>{settings.extraTimeAllowed ? 'Extra Time on' : 'Extra Time off'}</span>
            <span>·</span>
            <span>{settings.penaltiesAllowed ? 'Penalti on' : 'Penalti off'}</span>
            <span>·</span>
            <span>Kondisi acak</span>
            <span>·</span>
            <span className="text-[var(--text-faint)]">
              Room Creator: {match.home_participant_id === 'participant_a' ? pA?.display_name : pB?.display_name}
            </span>
          </div>

          {canReport ? (
            <Link
              href="/control"
              className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              Lapor Hasil
            </Link>
          ) : (
            <Link
              href={`/matches/${match.md_number}`}
              className="text-xs font-semibold text-[var(--text)] hover:underline shrink-0"
            >
              Panduan Pengaturan →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
