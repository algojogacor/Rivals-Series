'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ResetRequest, SeasonSettings } from '@/lib/types';
import { requestSeasonResetAction } from '@/lib/actions';
import { 
  AlertTriangle, 
  Download, 
  Check, 
  ArrowLeft, 
  ShieldAlert, 
  Loader2, 
  Clock, 
  ChevronRight,
  Database
} from 'lucide-react';

interface ResetSeasonClientProps {
  session: {
    participantId: string;
    participant: {
      display_name: string;
      monogram: string;
    };
    isAdmin: boolean;
  };
  pendingReset: ResetRequest | null;
  seasonSettings?: SeasonSettings | null;
}

export function ResetSeasonClient({
  session,
  pendingReset,
  seasonSettings,
}: ResetSeasonClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [archiveDownloaded, setArchiveDownloaded] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [resetMode, setResetMode] = useState<'results_only' | 'total_reset'>('results_only');
  const [confirmationPhrase, setConfirmationPhrase] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);

  // Trigger JSON & CSV Archive Download
  const handleDownloadArchive = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      // Trigger JSON download
      const jsonLink = document.createElement('a');
      jsonLink.href = '/api/archive?format=json';
      jsonLink.download = `rs_s1_archive_${Date.now()}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);

      // Trigger CSV download with small timeout so browser allows both
      setTimeout(() => {
        const csvLink = document.createElement('a');
        csvLink.href = '/api/archive?format=csv';
        csvLink.download = `rs_s1_archive_${Date.now()}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        setArchiveDownloaded(true);
        setDownloading(false);
      }, 500);
    } catch (err: any) {
      setErrorMsg('Gagal mengunduh arsip: ' + err.message);
      setDownloading(false);
    }
  };

  const isPhraseMatched = confirmationPhrase === 'RESET RS S1';
  const isSubmitEnabled = archiveDownloaded && isPhraseMatched && !isPending;

  const handleSubmitReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled) return;

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('reset_mode', resetMode);
      formData.set('confirmation_phrase', confirmationPhrase);
      formData.set('archive_confirmed', 'true');

      const res = await requestSeasonResetAction(formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.requestId) {
        setSuccessRequestId(res.requestId);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--ink-0)] text-[var(--text)] px-4 py-8 md:py-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-[840px] space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/control"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Pusat Kontrol</span>
          </Link>
          <span className="text-[12px] font-mono uppercase text-[var(--text-faint)]">
            Prosedur Darurat RS S1 · Pasal 50
          </span>
        </div>

        {/* Existing Pending Request Notice */}
        {(pendingReset || successRequestId) && (
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--text-dim)] p-6 md:p-8 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-[var(--text)]">
              <Clock className="w-6 h-6 animate-pulse-slow" />
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl uppercase tracking-tight">
                Permintaan Reset Sedang Menunggu Persetujuan Lawan
              </h2>
            </div>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed">
              Permintaan reset ID <code className="text-[var(--text)] font-mono">{pendingReset?.id || successRequestId}</code> telah berhasil diajukan ke database. Demi asas transparansi dan integritas kompetisi, <strong>lawan tanding wajib memberikan persetujuan</strong> melalui Pusat Kontrol (Tab Konfirmasi) sebelum reset dieksekusi secara permanen dalam satu transaksi database.
            </p>
            <div className="pt-2 flex items-center gap-4">
              <Link
                href="/control"
                className="h-11 px-5 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <span>Buka Pusat Kontrol</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Main Reset Form (Hidden if request is already active) */}
        {!pendingReset && !successRequestId && (
          <div className="rounded-[12px] bg-[var(--ink-1)] border border-[var(--danger)]/50 p-6 md:p-10 space-y-8 shadow-2xl">
            {/* Header Warning */}
            <div className="space-y-3 border-b border-[var(--line)] pb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/30 text-[13px] font-bold uppercase tracking-wider text-[var(--danger)]">
                <AlertTriangle className="w-4 h-4" />
                <span>Tindakan Destruktif Bersama (Butuh Persetujuan Lawan)</span>
              </div>
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-[var(--text)] leading-none">
                Reset Musim Rivals Series
              </h1>
              <p className="text-sm text-[var(--danger)] leading-relaxed font-medium">
                Tindakan ini akan menghapus seluruh data pertandingan musim ini. Klasemen, riwayat matchday, gol, dan catatan kiper akan dikosongkan.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitReset} className="space-y-8">
              {/* SYARAT 1: Wajib Unduh Arsip */}
              <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm text-[var(--text)] flex items-center gap-2">
                      <span>Syarat 1: Unduh Cadangan Data Lengkap (JSON & CSV)</span>
                      {archiveDownloaded && (
                        <span className="inline-flex items-center gap-1 text-[var(--ok)] text-xs font-semibold">
                          <Check className="w-4 h-4" />
                          <span>Tersimpan</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[var(--text-faint)]">
                      Cadangan resmi wajib diunduh sebelum tombol eksekusi dapat diaktifkan.
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleDownloadArchive}
                    disabled={downloading}
                    className={`h-11 px-5 rounded-[8px] font-semibold text-sm transition-all flex items-center gap-2 ${
                      archiveDownloaded
                        ? 'bg-[var(--ok)]/15 border border-[var(--ok)] text-[var(--ok)]'
                        : 'bg-[var(--text)] text-[var(--ink-0)] hover:opacity-90'
                    }`}
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengunduh Arsip…</span>
                      </>
                    ) : archiveDownloaded ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Arsip Berhasil Diunduh (Unduh Lagi jika Perlu)</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Unduh Arsip Musim (JSON + CSV)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SYARAT 2: Pilihan Mode Reset */}
              <div className="space-y-3">
                <label className="block text-[13px] font-semibold text-[var(--text-dim)]">
                  Syarat 2: Tentukan Cakupan Mode Reset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Results Only */}
                  <label
                    className={`p-5 rounded-[8px] border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      resetMode === 'results_only'
                        ? 'bg-[var(--ink-2)] border-[var(--text)] ring-1 ring-[var(--text)]'
                        : 'bg-[var(--ink-2)]/60 border-[var(--line)] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-base text-[var(--text)] font-[family-name:var(--font-display)] uppercase tracking-tight">
                        Reset Hasil Saja
                      </div>
                      <input
                        type="radio"
                        name="mode_choice"
                        value="results_only"
                        checked={resetMode === 'results_only'}
                        onChange={() => setResetMode('results_only')}
                        className="accent-[var(--text)] mt-1"
                      />
                    </div>
                    <p className="text-[12px] text-[var(--text-dim)] leading-relaxed">
                      Jadwal 20 MD tetap ada. Semua skor, gol, dan statistik kembali ke 0. Status musim tetap <strong>Live</strong>.
                    </p>
                  </label>

                  {/* Option 2: Total Reset */}
                  <label
                    className={`p-5 rounded-[8px] border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      resetMode === 'total_reset'
                        ? 'bg-[var(--ink-2)] border-[var(--danger)] ring-1 ring-[var(--danger)]'
                        : 'bg-[var(--ink-2)]/60 border-[var(--line)] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-base text-[var(--danger)] font-[family-name:var(--font-display)] uppercase tracking-tight">
                        Reset Total Musim
                      </div>
                      <input
                        type="radio"
                        name="mode_choice"
                        value="total_reset"
                        checked={resetMode === 'total_reset'}
                        onChange={() => setResetMode('total_reset')}
                        className="accent-[var(--danger)] mt-1"
                      />
                    </div>
                    <p className="text-[12px] text-[var(--text-dim)] leading-relaxed">
                      Mengembalikan seluruh konfigurasi ke status <strong>Setup</strong>. Nama pemain, warna, dan jadwal dapat diatur ulang dari awal.
                    </p>
                  </label>
                </div>
              </div>

              {/* SYARAT 3: Konfirmasi Ganda Kalimat */}
              <div className="space-y-3">
                <label className="block text-[13px] font-semibold text-[var(--text-dim)]" htmlFor="phrase">
                  Syarat 3: Ketik persis kalimat konfirmasi{' '}
                  <span className="font-mono text-[var(--danger)] select-all font-bold">RESET RS S1</span>
                </label>
                <input
                  id="phrase"
                  type="text"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder="Ketik persis: RESET RS S1"
                  className="w-full h-12 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] font-mono text-[var(--text)] placeholder-[var(--text-faint)] focus:border-[var(--danger)] focus:outline-none transition-colors"
                />
              </div>

              {/* ACTION: Destructive Button */}
              <div className="pt-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[12px] text-[var(--text-faint)]">
                  {!archiveDownloaded
                    ? '⚠️ Anda harus mengunduh arsip terlebih dahulu.'
                    : !isPhraseMatched
                    ? '⚠️ Kalimat konfirmasi belum cocok.'
                    : '✅ Semua syarat terpenuhi. Siap diajukan untuk persetujuan lawan.'}
                </div>

                <button
                  type="submit"
                  disabled={!isSubmitEnabled}
                  className="w-full sm:w-auto h-12 px-8 rounded-[8px] bg-[var(--danger)] text-[var(--ink-0)] font-extrabold text-sm uppercase tracking-wider font-[family-name:var(--font-display)] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengajukan…</span>
                    </>
                  ) : (
                    <span>Ajukan Reset Musim</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
