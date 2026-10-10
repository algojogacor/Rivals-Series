'use client';

import React from 'react';
import {
  Sparkles,
  Flag,
  Lock,
  Unlock,
  AlertCircle,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Participant, ParticipantId, RosterCard, RosterPhaseStatus } from '@/lib/types';
import { PlayerTag } from '../PlayerTag';
import { loginParticipantAction, logoutParticipantAction, initializePhase2SquadAction } from '@/lib/actions';

interface SquadQuotaBannerProps {
  session: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin: boolean;
  } | null;
  pA: Participant;
  pB: Participant;
  activePhase: number;
  setActivePhase: (phase: number) => void;
  phase2Status?: RosterPhaseStatus;
  currentPhaseStatus: RosterPhaseStatus;
  paSummaryPhase1: { count: number; trending: number; indo: number };
  pbSummaryPhase1: { count: number; trending: number; indo: number };
  myCards: RosterCard[];
  myTotalCount: number;
  myTrendingCount: number;
  myIndonesianCount: number;
  myLocked: boolean;
  canModifyMySquad: boolean;
  lockMissingReasons: string[];
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  handleLockMySquad: () => void;
  showToast: (type: 'success' | 'error', text: string) => void;
  onSquadLockedChange?: () => void;
}

export function SquadQuotaBanner({
  session,
  pA,
  pB,
  activePhase,
  setActivePhase,
  phase2Status,
  currentPhaseStatus,
  paSummaryPhase1,
  pbSummaryPhase1,
  myCards,
  myTotalCount,
  myTrendingCount,
  myIndonesianCount,
  myLocked,
  canModifyMySquad,
  lockMissingReasons,
  isPending,
  startTransition,
  handleLockMySquad,
  showToast,
  onSquadLockedChange,
}: SquadQuotaBannerProps) {
  return (
    <div className="space-y-4">
      {/* Top Status & Account Switcher Banner */}
      <div className="rounded-[12px] bg-[var(--ink-2)] border border-[var(--line)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)]">
                Penyusun Skuad eFootball™ (eFHUB)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[var(--ink-1)] border border-[var(--line)] text-[var(--text-dim)]">
                Pasal 14, 15 & 17
              </span>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Tiap peserta memilih sendiri maksimal 26 kartu dari akunnya (tanpa kartu kembar pemain virtual yang sama, minimal 2 kartu Trending). Skuad lawan disembunyikan sampai keduanya terkunci.
            </p>
          </div>

          {/* Phase Selector (Phase 1 vs Phase 2 after MD10) */}
          {phase2Status && (
            <div className="inline-flex rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActivePhase(1)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold uppercase transition-colors ${
                  activePhase === 1
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                Fase 1 (MD1–10)
              </button>
              <button
                type="button"
                onClick={() => setActivePhase(2)}
                className={`px-3 py-1.5 rounded-[6px] text-xs font-bold uppercase transition-colors flex items-center gap-1.5 ${
                  activePhase === 2
                    ? 'bg-[var(--text)] text-[var(--ink-0)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                }`}
              >
                <span>Fase 2 (Setelah MD10)</span>
                {!phase2Status.md10_completed && <Lock className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Two-Participant Lock Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Participant A Status */}
          <div
            className={`rounded-[8px] p-3.5 border flex items-center justify-between ${
              currentPhaseStatus.pa_locked === 1
                ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                : 'bg-[var(--ink-1)] border-[var(--line)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlayerTag
                id="participant_a"
                name={pA.display_name}
                monogram={pA.monogram}
                size="sm"
              />
              <div className="text-xs">
                <div className="font-bold text-[var(--text)]">
                  {currentPhaseStatus.pa_locked === 1 ? 'Skuad Terkunci' : 'Sedang Menyusun'}
                </div>
                <div className="text-[11px] text-[var(--text-faint)]">
                  {session?.participantId === 'participant_a' || currentPhaseStatus.both_locked
                    ? `${activePhase === 1 ? paSummaryPhase1.count : myCards.length}/26 Kartu · ${
                        activePhase === 1 ? paSummaryPhase1.trending : myTrendingCount
                      } Trending · ${activePhase === 1 ? paSummaryPhase1.indo : myIndonesianCount} IDN`
                    : `${paSummaryPhase1.count}/26 Kartu (Detail Rahasia)`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {currentPhaseStatus.pa_locked === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ok)]/20 text-[var(--ok)]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ink-2)] text-[var(--text-dim)]">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Belum Kunci</span>
                </span>
              )}
            </div>
          </div>

          {/* Participant B Status */}
          <div
            className={`rounded-[8px] p-3.5 border flex items-center justify-between ${
              currentPhaseStatus.pb_locked === 1
                ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                : 'bg-[var(--ink-1)] border-[var(--line)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlayerTag
                id="participant_b"
                name={pB.display_name}
                monogram={pB.monogram}
                size="sm"
              />
              <div className="text-xs">
                <div className="font-bold text-[var(--text)]">
                  {currentPhaseStatus.pb_locked === 1 ? 'Skuad Terkunci' : 'Sedang Menyusun'}
                </div>
                <div className="text-[11px] text-[var(--text-faint)]">
                  {session?.participantId === 'participant_b' || currentPhaseStatus.both_locked
                    ? `${activePhase === 1 ? pbSummaryPhase1.count : myCards.length}/26 Kartu · ${
                        activePhase === 1 ? pbSummaryPhase1.trending : myTrendingCount
                      } Trending · ${activePhase === 1 ? pbSummaryPhase1.indo : myIndonesianCount} IDN`
                    : `${pbSummaryPhase1.count}/26 Kartu (Detail Rahasia)`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {currentPhaseStatus.pb_locked === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ok)]/20 text-[var(--ok)]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Terkunci</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--ink-2)] text-[var(--text-dim)]">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Belum Kunci</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Account Login / Switcher Inside Workbench */}
        <div className="pt-2 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {session ? (
            <>
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-[var(--text-dim)]">Masuk sebagai:</span>
                <PlayerTag
                  id={session.participantId}
                  name={session.participant.display_name}
                  monogram={session.participant.monogram}
                  size="sm"
                />
                <span className="text-[11px] text-[var(--text-faint)]">
                  (Anda hanya dapat menyusun & mengunci skuad milik Anda sendiri)
                </span>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await logoutParticipantAction();
                    onSquadLockedChange?.();
                  });
                }}
                className="h-8 px-3 rounded-[6px] border border-[var(--line)] bg-[var(--ink-1)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ganti Akun Peserta</span>
              </button>
            </>
          ) : (
            <form
              action={(formData) => {
                startTransition(async () => {
                  const res = await loginParticipantAction(formData);
                  if (res?.error) {
                    showToast('error', res.error);
                  } else {
                    showToast('success', 'Berhasil masuk ke akun peserta.');
                    onSquadLockedChange?.();
                  }
                });
              }}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--ink-1)] p-3 rounded-[8px] border border-[var(--line)]"
            >
              <div className="text-xs font-semibold text-[var(--text)]">
                Masuk ke akun Anda untuk memilih dan mengunci 26 kartu skuad:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="participant_id"
                  className="h-9 px-3 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold text-[var(--text)]"
                >
                  <option value="participant_a">{pA.display_name} (Pemain A)</option>
                  <option value="participant_b">{pB.display_name} (Pemain B)</option>
                </select>
                <input
                  type="password"
                  name="pin"
                  placeholder="PIN Peserta"
                  required
                  className="h-9 w-36 px-3 rounded-[6px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-mono text-[var(--text)]"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-4 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Logged-in Participant Counters & Lock Control Bar */}
      {session && (
        <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-4 sm:p-5 space-y-4">
          {/* Phase 2 MD10 Gate Notice */}
          {activePhase === 2 && !currentPhaseStatus.md10_completed && (
            <div className="rounded-[8px] bg-[var(--p-a-soft)] border border-[var(--p-a)]/40 p-4 text-xs text-[var(--p-a)] flex items-center gap-3">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-bold uppercase">
                  Bursa Fase 2 Terkunci Sampai MD10 Selesai (Pasal 14 & 15)
                </div>
                <p className="text-[var(--text-dim)] mt-0.5">
                  Skuad Fase 1 tetap berlaku penuh untuk MD1 sampai MD10. Anda baru dapat melakukan perubahan atau mengganti versi kartu untuk Fase 2 setelah pertandingan MD10 selesai dan disahkan.
                </p>
              </div>
            </div>
          )}

          {activePhase === 2 && currentPhaseStatus.md10_completed && myCards.length === 0 && !myLocked && (
            <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <div className="font-bold text-[var(--text)]">
                  MD10 Telah Selesai — Bursa Skuad Fase 2 Dibuka!
                </div>
                <p className="text-[var(--text-dim)]">
                  Salin 26 kartu Fase 1 Anda ke Fase 2 untuk melakukan pergantian pemain atau meng-upgrade versi kartu dari pemain virtual yang sama.
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const res = await initializePhase2SquadAction();
                    if (res?.error) showToast('error', res.error);
                    else {
                      showToast('success', 'Skuad Fase 1 berhasil disalin ke Fase 2. Silakan sesuaikan skuad Anda.');
                      onSquadLockedChange?.();
                    }
                  });
                }}
                className="h-9 px-4 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider shrink-0"
              >
                Salin dari Skuad Fase 1
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Three Distinct Counters: Total (max 26), Trending (min 2), Indonesian */}
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                  Total Kartu Skuad
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums ${
                      myTotalCount > 26
                        ? 'text-[var(--danger)]'
                        : myTotalCount === 26
                        ? 'text-[var(--ok)]'
                        : 'text-[var(--text)]'
                    }`}
                  >
                    {myTotalCount}
                  </span>
                  <span className="text-xs text-[var(--text-dim)] font-mono">/ 26 maks</span>
                </div>
              </div>

              <div
                className={`rounded-[8px] border p-3 ${
                  myTrendingCount >= 2
                    ? 'bg-[var(--ok)]/10 border-[var(--ok)]/40'
                    : 'bg-[var(--p-a-soft)] border-[var(--p-a)]/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--p-a)]" />
                  <span>Kartu Trending</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums ${
                      myTrendingCount >= 2 ? 'text-[var(--ok)]' : 'text-[var(--p-a)]'
                    }`}
                  >
                    {myTrendingCount}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    (min. 2 wajib)
                  </span>
                </div>
              </div>

              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] flex items-center gap-1">
                  <Flag className="w-3 h-3 text-[var(--ok)]" />
                  <span>Pemain Indonesia</span>
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-[family-name:var(--font-display)] font-extrabold text-2xl tabular-nums text-[var(--ok)]">
                    {myIndonesianCount}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    terdaftar
                  </span>
                </div>
              </div>
            </div>

            {/* Lock My Squad Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {myLocked ? (
                <div className="px-4 py-2.5 rounded-[8px] bg-[var(--ok)]/15 border border-[var(--ok)]/40 text-xs font-bold text-[var(--ok)] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Skuad Fase {activePhase} Anda Sudah Terkunci</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending || !canModifyMySquad}
                  onClick={handleLockMySquad}
                  className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-extrabold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Kunci Skuad Saya ({myTotalCount}/26)</span>
                </button>
              )}
            </div>
          </div>

          {/* Clear Validation Hint if Not Ready to Lock */}
          {!myLocked && lockMissingReasons.length > 0 && (
            <div className="text-xs text-[var(--p-a)] bg-[var(--p-a-soft)] border border-[var(--p-a)]/30 rounded-[8px] px-3.5 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Syarat mengunci skuad belum terpenuhi: <strong>{lockMissingReasons.join('; ')}</strong>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
