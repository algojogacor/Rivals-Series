'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, Unlock, AlertCircle } from 'lucide-react';
import { Participant, Match, ResetRequest, MatchGoalEvent, SquadUnlockRequest } from '@/lib/types';
import {
  confirmMatchReportAction,
  respondSeasonResetAction,
  respondSquadUnlockAction,
  cancelSquadUnlockAction,
} from '@/lib/actions';
import { ControlSession } from './control-types';

interface PendingMatchesTabProps {
  session: ControlSession;
  participants: Participant[];
  pendingMatches: Match[];
  pendingReset?: ResetRequest | null;
  pendingSquadUnlockRequests?: SquadUnlockRequest[];
  goalEvents?: MatchGoalEvent[];
  pA: Participant;
  pB: Participant;
  isPending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
  onNavigateToDisputes: () => void;
}

export function PendingMatchesTab({
  session,
  participants,
  pendingMatches,
  pendingReset,
  pendingSquadUnlockRequests = [],
  goalEvents = [],
  pA,
  pB,
  isPending,
  startTransition,
  showMessage,
  onNavigateToDisputes,
}: PendingMatchesTabProps) {
  return (
    <div className="space-y-6">
      {/* Mutual Consent Reset Box if any */}
      {pendingReset && (
        <div className="rounded-[12px] border border-[var(--danger)] bg-[var(--danger)]/10 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-[var(--danger)] shrink-0" />
            <div>
              <h3 className="text-base font-bold uppercase tracking-tight text-[var(--text)]">
                Permintaan Reset Musim Menunggu Konfirmasi
              </h3>
              <p className="text-xs text-[var(--text-dim)]">
                Diajukan oleh {participants.find((p) => p.id === pendingReset.requested_by)?.display_name || pendingReset.requested_by} · Mode: {pendingReset.reset_mode === 'total_reset' ? 'Reset Total Musim' : 'Reset Hasil Saja'}
              </p>
            </div>
          </div>

          {session && session.participantId !== pendingReset.requested_by ? (
            <div className="space-y-3 pt-2 border-t border-[var(--danger)]/20">
              <p className="text-xs text-[var(--text)] leading-relaxed">
                Lawan tanding Anda mengajukan permohonan reset musim resmi. Berdasarkan Pasal 50 Regulasi Resmi RS S1, reset hanya akan dieksekusi secara permanen dalam satu transaksi database setelah Anda memberikan persetujuan di bawah ini.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondSeasonResetAction({
                        requestId: pendingReset.id,
                        approved: true,
                      });
                      if (res?.error) {
                        showMessage('error', res.error);
                      } else {
                        showMessage('success', 'Reset musim berhasil disetujui dan dieksekusi.');
                        window.location.reload();
                      }
                    });
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-[8px] bg-[var(--danger)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? 'Mengeksekusi…' : 'Setujui & Eksekusi Reset'}
                </button>

                <button
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondSeasonResetAction({
                        requestId: pendingReset.id,
                        approved: false,
                        rejectionReason: 'Ditolak oleh lawan',
                      });
                      if (res?.error) {
                        showMessage('error', res.error);
                      } else {
                        showMessage('success', 'Permintaan reset berhasil ditolak.');
                        window.location.reload();
                      }
                    });
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-[8px] border border-[var(--line)] text-[var(--text)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--ink-2)] transition-colors disabled:opacity-50"
                >
                  Tolak Permintaan
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--danger)]/20">
              Anda adalah pengaju permohonan reset ini. Menunggu persetujuan dari lawan tanding Anda ({participants.find((p) => p.id !== pendingReset.requested_by)?.display_name || 'Lawan'}).
            </div>
          )}
        </div>
      )}

      {/* Mutual Squad Unlock Requests Box if any */}
      {pendingSquadUnlockRequests.map((req) => {
        const isRequester = session?.participantId === req.requested_by;
        const requesterName = participants.find((p) => p.id === req.requested_by)?.display_name || req.requested_by;
        const opponentName = participants.find((p) => p.id !== req.requested_by)?.display_name || 'Lawan';

        if (isRequester) {
          return (
            <div
              key={req.id}
              className="rounded-[12px] border border-[var(--line)] bg-[var(--ink-2)] p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Unlock className="w-5 h-5 text-[var(--gold)] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold uppercase text-[var(--text)]">
                      Permohonan Buka Kunci Skuad Fase {req.phase} Terkirim
                    </h4>
                    <p className="text-xs text-[var(--text-dim)]">
                      Menunggu tanggapan dari {opponentName} · Dibuat {req.created_at}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await cancelSquadUnlockAction(req.id);
                      if (res?.error) {
                        showMessage('error', res.error);
                      } else {
                        showMessage('success', 'Permohonan buka kunci skuad berhasil dibatalkan.');
                        window.location.reload();
                      }
                    });
                  }}
                  disabled={isPending}
                  className="px-3.5 py-1.5 rounded-[6px] border border-[var(--line)] text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors disabled:opacity-50 self-start sm:self-auto"
                >
                  {isPending ? 'Membatalkan…' : 'Batalkan Permohonan'}
                </button>
              </div>
              <div className="text-xs text-[var(--text)] bg-[var(--ink-1)] p-3 rounded-[8px] border border-[var(--line)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block mb-1">
                  Alasan yang Anda sampaikan:
                </span>
                &ldquo;{req.reason}&rdquo;
              </div>
            </div>
          );
        }

        // Respondent card (opponent asked for unlock)
        return (
          <div
            key={req.id}
            className="rounded-[12px] border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Unlock className="h-6 w-6 text-[var(--gold)] shrink-0" />
              <div>
                <h3 className="text-base font-bold uppercase tracking-tight text-[var(--text)]">
                  Permohonan Buka Kunci Skuad Bersama (Fase {req.phase})
                </h3>
                <p className="text-xs text-[var(--text-dim)]">
                  Diajukan oleh {requesterName} · Dibuat {req.created_at}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[var(--gold)]/20">
              <div className="rounded-[8px] bg-[var(--ink-2)] p-3 border border-[var(--line)] text-xs text-[var(--text)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-faint)] block mb-1">
                  Alasan Permohonan dari {requesterName}:
                </span>
                &ldquo;{req.reason}&rdquo;
              </div>
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                Lawan tanding Anda ingin membuka kunci skuad untuk melakukan penyesuaian kartu pemain. Jika Anda setujui, kedua skuad Fase {req.phase} akan kembali ke status draf sehingga Anda berdua dapat menyesuaikan kartu sebelum pertandingan pembuka dilaporkan.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondSquadUnlockAction({
                        requestId: req.id,
                        approved: true,
                      });
                      if (res?.error) {
                        showMessage('error', res.error);
                      } else {
                        showMessage('success', `Buka kunci skuad Fase ${req.phase} berhasil disetujui. Kedua skuad kembali ke mode draf.`);
                        window.location.reload();
                      }
                    });
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? 'Memproses…' : 'Setujui Buka Kunci Skuad'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondSquadUnlockAction({
                        requestId: req.id,
                        approved: false,
                        rejectionReason: 'Ditolak oleh lawan',
                      });
                      if (res?.error) {
                        showMessage('error', res.error);
                      } else {
                        showMessage('success', 'Permohonan buka kunci skuad ditolak.');
                        window.location.reload();
                      }
                    });
                  }}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-[8px] border border-[var(--line)] text-[var(--text)] text-xs font-bold uppercase tracking-wider hover:bg-[var(--ink-2)] transition-colors disabled:opacity-50"
                >
                  Tolak Permohonan
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pending Matches Box */}
      <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight text-[var(--text)]">
            Kotak Masuk Konfirmasi Hasil
          </h2>
          <p className="text-[13px] text-[var(--text-dim)]">
            Hasil pertandingan sah setelah disahkan oleh kedua peserta (Pasal 22).
          </p>
        </div>

        {pendingMatches.length === 0 ? (
          <div className="p-8 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-[var(--ok)] mx-auto" />
            <h3 className="font-bold text-sm text-[var(--text)]">Tidak Ada Laporan Menunggu Konfirmasi</h3>
            <p className="text-xs text-[var(--text-dim)]">
              Seluruh pertandingan yang dilaporkan telah berstatus sah.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)] border border-[var(--line)] rounded-[8px] overflow-hidden bg-[var(--ink-2)]">
            {pendingMatches.map((m) => {
              const isReportedByMe = session && m.reported_by === session.participantId;
              const isHome = m.home_participant_id === 'participant_a';
              const pHome = isHome ? pA : pB;
              const pAway = isHome ? pB : pA;

              return (
                <div
                  key={m.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-display)] font-bold text-sm text-[var(--text)]">
                        MD{m.md_number}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--ink-1)] text-[var(--text-dim)] border border-[var(--line)]">
                        {m.phase === 'group_stage' ? 'Grup' : 'Knockout'}
                      </span>
                      <span className="text-xs text-[var(--text-faint)]">
                        Dilaporkan oleh:{' '}
                        <strong className="text-[var(--text-dim)]">
                          {participants.find((p) => p.id === m.reported_by)?.display_name || m.reported_by}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-semibold text-[var(--text)]">
                      <span>{pHome.display_name}</span>
                      <span className="font-mono text-base font-bold bg-[var(--ink-1)] px-3 py-1 rounded border border-[var(--line)]">
                        {m.home_score ?? '-'} : {m.away_score ?? '-'}
                      </span>
                      <span>{pAway.display_name}</span>
                    </div>

                    {m.match_report_text && (
                      <p className="text-xs text-[var(--text-dim)] italic">
                        Catatan: &ldquo;{m.match_report_text}&rdquo;
                      </p>
                    )}

                    {/* Goal events preview */}
                    {(() => {
                      const matchGoals = goalEvents.filter((g) => g.match_id === m.id);
                      if (matchGoals.length === 0) return null;
                      return (
                        <div className="pt-2 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-dim)]">
                            Daftar Gol ({matchGoals.length}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {matchGoals.map((g) => (
                              <div
                                key={g.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--ink-1)] border border-[var(--line)] text-xs"
                              >
                                <span className="font-mono text-[10px] text-[var(--text-dim)]">
                                  {g.minute}&apos;
                                </span>
                                <span className="font-bold text-[var(--text)]">
                                  {g.scorer_player_name}
                                </span>
                                {g.scorer_card_version && (
                                  <span className="text-[10px] text-[var(--text-faint)]">
                                    ({g.scorer_card_version})
                                  </span>
                                )}
                                {g.assist_player_name && (
                                  <span className="text-[11px] text-[var(--text-dim)] border-l border-[var(--line)] pl-1.5 ml-0.5 inline-flex items-center gap-1">
                                    <span className="text-[9px] uppercase font-bold text-[var(--text-faint)]">Asis:</span>
                                    <span className="font-semibold text-[var(--text)]">{g.assist_player_name}</span>
                                    {g.assist_card_version && (
                                      <span className="text-[10px] text-[var(--text-faint)]">({g.assist_card_version})</span>
                                    )}
                                  </span>
                                )}
                                {g.is_own_goal === 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--danger)]/15 text-[var(--danger)]">
                                    OG
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    {m.result_screenshot_url && (
                      <div className="pt-2 flex items-center gap-3">
                        <a
                          href={m.result_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative h-16 w-28 rounded-[6px] overflow-hidden border border-[var(--line)] bg-[var(--ink-0)] shrink-0 hover:border-[var(--text)] transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.result_screenshot_url}
                            alt="Screenshot Hasil"
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </a>
                        <div className="text-[11px] text-[var(--text-dim)] space-y-0.5">
                          <span className="font-semibold text-[var(--text)] block">
                            Bukti Screenshot Hasil:
                          </span>
                          <a
                            href={m.result_screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--p-a)] hover:underline inline-flex items-center gap-1 font-mono"
                          >
                            <span>Lihat Ukuran Penuh</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(async () => {
                          const res = await confirmMatchReportAction(m.id);
                          if (res?.error) {
                            showMessage('error', res.error);
                          } else {
                            showMessage('success', `Hasil ${m.id} berhasil dikonfirmasi dan disahkan.`);
                          }
                        });
                      }}
                      disabled={isPending}
                      className="h-10 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isReportedByMe ? 'Konfirmasi Ulang' : 'Setujui & Sahkan'}
                    </button>

                    <button
                      type="button"
                      onClick={onNavigateToDisputes}
                      className="h-10 px-4 rounded-[8px] border border-[var(--danger)] text-[var(--danger)] font-semibold text-xs uppercase tracking-wider hover:bg-[var(--danger)]/10 transition-colors"
                    >
                      Ajukan Sengketa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
