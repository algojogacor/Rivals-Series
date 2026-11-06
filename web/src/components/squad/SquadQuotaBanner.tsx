'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Flag,
  Lock,
  Unlock,
  AlertCircle,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  Participant,
  ParticipantId,
  RosterCard,
  RosterPhaseStatus,
  Match,
  SquadUnlockRequest,
} from '@/lib/types';
import { PlayerTag } from '../PlayerTag';
import {
  loginParticipantAction,
  logoutParticipantAction,
  initializePhase2SquadAction,
  unlockParticipantSquadAction,
  requestSquadUnlockAction,
  respondSquadUnlockAction,
  cancelSquadUnlockAction,
} from '@/lib/actions';

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
  matches?: Match[];
  pendingSquadUnlockRequests?: SquadUnlockRequest[];
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
  matches = [],
  pendingSquadUnlockRequests = [],
  onSquadLockedChange,
}: SquadQuotaBannerProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  const opponentId: ParticipantId =
    session?.participantId === 'participant_a' ? 'participant_b' : 'participant_a';
  const opponentName = opponentId === 'participant_a' ? pA.display_name : pB.display_name;

  const openingMd = activePhase === 1 ? 1 : 11;
  const openingMatch = matches.find((m) => m.md_number === openingMd);
  const openingMatchScheduled = openingMatch ? openingMatch.status === 'scheduled' : true;

  const activePendingRequest = pendingSquadUnlockRequests.find(
    (r) => r.phase === activePhase && r.status === 'pending_approval'
  );

  const handleSelfUnlock = () => {
    if (
      !window.confirm(
        `Batalkan kunci skuad Fase ${activePhase}? Skuad Anda akan kembali ke status draf sehingga dapat diedit kembali.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await unlockParticipantSquadAction(activePhase);
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast(
          'success',
          `Kunci skuad Fase ${activePhase} berhasil dibatalkan. Anda dapat menyesuaikan skuad kembali.`
        );
        onSquadLockedChange?.();
      }
    });
  };

  const handleSubmitUnlockRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockReason.trim().length < 5) {
      showToast('error', 'Alasan permohonan buka kunci wajib diisi minimal 5 karakter.');
      return;
    }
    const fd = new FormData();
    fd.append('phase', String(activePhase));
    fd.append('reason', unlockReason.trim());

    startTransition(async () => {
      const res = await requestSquadUnlockAction(fd);
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast('success', 'Permohonan buka kunci skuad bersama berhasil dikirim ke lawan.');
        setShowUnlockModal(false);
        setUnlockReason('');
        onSquadLockedChange?.();
      }
    });
  };

  const handleRespondUnlockRequest = (requestId: string, approved: boolean) => {
    startTransition(async () => {
      const res = await respondSquadUnlockAction({
        requestId,
        approved,
        rejectionReason: approved ? undefined : 'Ditolak oleh lawan',
      });
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast(
          'success',
          approved
            ? `Buka kunci skuad Fase ${activePhase} berhasil disetujui. Kedua skuad kembali ke mode draf.`
            : 'Permohonan buka kunci skuad ditolak.'
        );
        onSquadLockedChange?.();
      }
    });
  };

  const handleCancelUnlockRequest = (requestId: string) => {
    startTransition(async () => {
      const res = await cancelSquadUnlockAction(requestId);
      if (res?.error) {
        showToast('error', res.error);
      } else {
        showToast('success', 'Permohonan buka kunci skuad berhasil dibatalkan.');
        onSquadLockedChange?.();
      }
    });
  };

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

          {/* Active Pending Squad Unlock Request Banner */}
          {activePendingRequest && (
            <>
              {activePendingRequest.requested_by === session.participantId ? (
                <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--gold)]/40 p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Unlock className="w-5 h-5 text-[var(--gold)] shrink-0" />
                      <div>
                        <div className="font-bold text-xs uppercase text-[var(--text)]">
                          Permohonan Buka Kunci Skuad Fase {activePhase} Terkirim
                        </div>
                        <p className="text-[11px] text-[var(--text-dim)]">
                          Menunggu persetujuan dari {opponentName}. Skuad akan kembali dapat diedit begitu disetujui.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleCancelUnlockRequest(activePendingRequest.id)}
                      className="h-8 px-3 rounded-[6px] border border-[var(--line)] bg-[var(--ink-1)] text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors shrink-0"
                    >
                      Batalkan Permohonan
                    </button>
                  </div>
                  <div className="text-xs text-[var(--text)] bg-[var(--ink-1)] px-3 py-2 rounded border border-[var(--line)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                      Alasan Anda:
                    </span>
                    &ldquo;{activePendingRequest.reason}&rdquo;
                  </div>
                </div>
              ) : (
                <div className="rounded-[8px] bg-[var(--gold)]/10 border border-[var(--gold)]/50 p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Unlock className="w-5 h-5 text-[var(--gold)] shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase text-[var(--text)]">
                        Permohonan Buka Kunci Skuad dari {opponentName}
                      </div>
                      <p className="text-[11px] text-[var(--text-dim)]">
                        Lawan meminta izin membuka kembali kunci skuad Fase {activePhase} bersama.
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--text)] bg-[var(--ink-2)] px-3 py-2 rounded border border-[var(--line)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block">
                      Alasan dari {opponentName}:
                    </span>
                    &ldquo;{activePendingRequest.reason}&rdquo;
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRespondUnlockRequest(activePendingRequest.id, true)}
                      className="h-8 px-4 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                    >
                      Setujui Buka Kunci
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRespondUnlockRequest(activePendingRequest.id, false)}
                      className="h-8 px-3.5 rounded-[6px] border border-[var(--line)] text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              )}
            </>
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

            {/* Lock / Unlock My Squad Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {myLocked ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-4 py-2.5 rounded-[8px] bg-[var(--ok)]/15 border border-[var(--ok)]/40 text-xs font-bold text-[var(--ok)] flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Skuad Fase {activePhase} Anda Sudah Terkunci</span>
                  </div>

                  {/* Case A: Self-unlock when opponent has not locked yet and opening match scheduled */}
                  {!currentPhaseStatus.both_locked && openingMatchScheduled && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSelfUnlock}
                      className="h-9 px-3.5 rounded-[8px] border border-[var(--line)] bg-[var(--ink-2)] text-xs font-bold text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--text-dim)] transition-colors flex items-center gap-1.5"
                      title="Batalkan kunci skuad mandiri sebelum lawan mengunci"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Batal Kunci</span>
                    </button>
                  )}

                  {/* Case B: Mutual unlock request when both are locked, opening match scheduled, and no pending request */}
                  {currentPhaseStatus.both_locked && openingMatchScheduled && !activePendingRequest && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setShowUnlockModal(true)}
                      className="h-9 px-3.5 rounded-[8px] border border-[var(--gold)]/40 bg-[var(--gold)]/10 text-xs font-bold text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-colors flex items-center gap-1.5"
                      title="Ajukan pembukaan kunci skuad bersama kepada lawan sebelum kick-off"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Ajukan Buka Kunci Bersama</span>
                    </button>
                  )}

                  {/* Note if opening match is already played / reported */}
                  {currentPhaseStatus.both_locked && !openingMatchScheduled && (
                    <span className="text-[11px] text-[var(--text-faint)] italic">
                      MD{openingMd} sudah berjalan · Skuad terkunci permanen
                    </span>
                  )}
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

      {/* Mutual Squad Unlock Request Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[14px] bg-[var(--ink-1)] border border-[var(--line)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2.5">
                <Unlock className="w-5 h-5 text-[var(--gold)]" />
                <h3 className="font-[family-name:var(--font-display)] font-extrabold text-lg uppercase tracking-tight text-[var(--text)]">
                  Ajukan Buka Kunci Skuad (Fase {activePhase})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockReason('');
                }}
                className="text-xs font-bold text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
              >
                ✕ Tutup
              </button>
            </div>

            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              Karena kedua peserta telah mengunci skuad, pembatalan kunci memerlukan persetujuan bersama dari lawan tanding Anda ({opponentName}). Jika disetujui, kedua skuad Fase {activePhase} akan kembali ke mode draf dan bebas diedit sebelum MD{openingMd} dilaporkan.
            </p>

            <form onSubmit={handleSubmitUnlockRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Alasan Pembukaan Kunci <span className="text-[var(--danger)]">*</span>
                </label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Contoh: Salah memilih varian kartu Lewandowski atau ingin menukar kartu cadangan sebelum kick-off..."
                  required
                  rows={3}
                  className="w-full p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--text)] focus:outline-none transition-colors resize-none"
                />
                <span className="text-[10px] text-[var(--text-faint)] mt-1 block">
                  Minimal 5 karakter. Alasan ini akan dibaca oleh {opponentName}.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockModal(false);
                    setUnlockReason('');
                  }}
                  className="h-9 px-4 rounded-[6px] border border-[var(--line)] text-xs font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending || unlockReason.trim().length < 5}
                  className="h-9 px-5 rounded-[6px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isPending ? 'Mengirim…' : 'Kirim Permohonan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
