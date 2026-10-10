'use client';

import React from 'react';
import { CheckCircle2, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Participant, RosterPhaseStatus } from '@/lib/types';

interface SetupStep5KickoffProps {
  participantA: Participant;
  participantB: Participant;
  displayNameA: string;
  displayNameB: string;
  activeColorA: string;
  activeColorB: string;
  phase1Status: RosterPhaseStatus;
  paSummaryPhase1: { count: number; trending: number; indo: number };
  pbSummaryPhase1: { count: number; trending: number; indo: number };
  bothProfilesReady: boolean;
  canStartSeason: boolean;
  isStartingSeason: boolean;
  isPending: boolean;
  handleStartSeason: () => void;
  onPrevStep: () => void;
  onGoToStep: (step: number) => void;
}

export function SetupStep5Kickoff({
  participantA,
  participantB,
  displayNameA,
  displayNameB,
  activeColorA,
  activeColorB,
  phase1Status,
  paSummaryPhase1,
  pbSummaryPhase1,
  bothProfilesReady,
  canStartSeason,
  isStartingSeason,
  isPending,
  handleStartSeason,
  onPrevStep,
  onGoToStep,
}: SetupStep5KickoffProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
          Langkah 5: Siap Kick-off
        </h2>
        <p className="text-[13px] text-[var(--text-dim)] mt-1">
          Musim baru dapat berstatus berjalan (&ldquo;Live&rdquo;) setelah kedua pemain selesai mendaftarkan akunnya dan kedua skuad Fase 1 terkunci (Pasal 14 ayat 2).
        </p>
      </div>

      {/* Big VS View with Player Colors, Account Status & Squad Lock Status */}
      <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-8 sm:p-12 text-center space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          <div className="space-y-2.5">
            <div
              className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
              style={{ color: activeColorA }}
            >
              {displayNameA}
            </div>
            <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              Pemain A · Pemulai Setup
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    participantA.profile_completed
                      ? 'text-[var(--ok)]'
                      : 'text-[var(--text-faint)]'
                  }`}
                />
                <span>
                  {participantA.profile_completed
                    ? 'Akun & PIN Terdaftar'
                    : 'Akun Belum Terdaftar'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                <Lock
                  className={`w-3.5 h-3.5 ${
                    phase1Status.pa_locked === 1 ? 'text-[var(--ok)]' : 'text-[var(--p-a)]'
                  }`}
                />
                <span>
                  {phase1Status.pa_locked === 1
                    ? `Skuad Terkunci (${paSummaryPhase1.count}/26)`
                    : 'Skuad Belum Dikunci'}
                </span>
              </div>
            </div>
          </div>

          <div className="font-[family-name:var(--font-display)] font-black text-4xl text-[var(--text-faint)]">
            VS
          </div>

          <div className="space-y-2.5">
            <div
              className="font-[family-name:var(--font-display)] font-extrabold text-4xl sm:text-5xl uppercase tracking-tight"
              style={{ color: activeColorB }}
            >
              {displayNameB}
            </div>
            <div className="text-[13px] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              Pemain B
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    participantB.profile_completed
                      ? 'text-[var(--ok)]'
                      : 'text-[var(--text-faint)]'
                  }`}
                />
                <span>
                  {participantB.profile_completed
                    ? 'Akun & PIN Terdaftar'
                    : 'Belum Bergabung lewat Undangan'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border border-[var(--line)] bg-[var(--ink-1)]">
                <Lock
                  className={`w-3.5 h-3.5 ${
                    phase1Status.pb_locked === 1 ? 'text-[var(--ok)]' : 'text-[var(--p-b)]'
                  }`}
                />
                <span>
                  {phase1Status.pb_locked === 1
                    ? `Skuad Terkunci (${pbSummaryPhase1.count}/26)`
                    : 'Skuad Belum Dikunci'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Status */}
        <div className="pt-4 border-t border-[var(--line)] max-w-lg mx-auto">
          {bothProfilesReady && phase1Status.both_locked ? (
            <p className="text-sm text-[var(--ok)] font-semibold">
              Kedua akun telah terdaftar dan kedua skuad Fase 1 telah terkunci! 20 matchday siap dimainkan mulai dari{' '}
              <strong>
                MD1: {displayNameA} vs {displayNameB}
              </strong>
              .
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-[var(--p-a)] font-semibold">
                Menunggu kedua pemain menyelesaikan pendaftaran akun/undangan (Langkah 1) dan mengunci skuad Fase 1 masing-masing (Langkah 3).
              </p>
              <div className="flex items-center justify-center gap-4">
                {!bothProfilesReady && (
                  <button
                    type="button"
                    onClick={() => onGoToStep(1)}
                    className="text-xs font-bold underline text-[var(--text)]"
                  >
                    Ke Langkah 1 (Identitas & Undangan)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onGoToStep(3)}
                  className="text-xs font-bold underline text-[var(--text)]"
                >
                  Ke Langkah 3 (Susun Skuad)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onPrevStep}
          disabled={isPending || isStartingSeason}
          className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
        >
          Kembali
        </button>

        <button
          type="button"
          onClick={handleStartSeason}
          disabled={isPending || isStartingSeason || !canStartSeason}
          className="h-14 px-10 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-extrabold text-base uppercase tracking-wider font-[family-name:var(--font-display)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-3 shadow-xl"
        >
          {isStartingSeason ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Meluncurkan Musim…</span>
            </>
          ) : (
            <>
              <span>Mulai Musim Rivals Series</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
