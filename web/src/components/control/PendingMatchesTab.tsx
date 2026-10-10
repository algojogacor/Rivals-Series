'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Participant, Match, ResetRequest } from '@/lib/types';
import { confirmMatchReportAction, respondSeasonResetAction } from '@/lib/actions';
import { ControlSession } from './control-types';

interface PendingMatchesTabProps {
  session: ControlSession;
  participants: Participant[];
  pendingMatches: Match[];
  pendingReset?: ResetRequest | null;
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
          <div className="space-y-4">
            {pendingMatches.map((m) => {
              const reportedByP = participants.find((p) => p.id === m.reported_by);
              const isReportedByMe = m.reported_by === session.participantId;

              return (
                <div
                  key={m.id}
                  className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--text)]">
                        {m.id}
                      </span>
                      <span className="font-bold text-base text-[var(--text)]">
                        {pA.display_name} {m.home_score} : {m.away_score} {pB.display_name}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-dim)]">
                      Dilaporkan oleh: <strong>{reportedByP?.display_name || m.reported_by}</strong>
                    </p>
                    {m.match_report_text && (
                      <p className="text-xs text-[var(--text-faint)] italic">
                        &ldquo;{m.match_report_text}&rdquo;
                      </p>
                    )}
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
