'use client';

import React from 'react';
import { Loader2, CheckCircle2, X, RotateCcw, ArrowRight } from 'lucide-react';

interface SetupStep4ReadinessProps {
  checkingSystem: boolean;
  systemReadiness: {
    dbConnection: boolean | null;
    tablesCreated: boolean | null;
    matchesSeeded: boolean | null;
    settingsSaved: boolean | null;
    playersSynced?: boolean | null;
    playersCount?: number;
    errorMessage: string | null;
  };
  allSystemChecksPassed: boolean;
  runSystemCheck: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export function SetupStep4Readiness({
  checkingSystem,
  systemReadiness,
  allSystemChecksPassed,
  runSystemCheck,
  onPrevStep,
  onNextStep,
}: SetupStep4ReadinessProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
          Langkah 4: Siapkan Sistem
        </h2>
        <p className="text-[13px] text-[var(--text-dim)] mt-1">
          Pemeriksaan otomatis kesiapan koneksi database, struktur tabel, katalog pemain eFHUB, dan data matchday sebelum kick-off.
        </p>
      </div>

      <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] divide-y divide-[var(--line)]">
        {/* Item 1 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">
              1. Koneksi Database Turso LibSQL
            </div>
            <div className="text-[12px] text-[var(--text-faint)]">
              Menghubungkan ke cloud database endpoint
            </div>
          </div>
          <div>
            {checkingSystem && systemReadiness.dbConnection === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
            ) : systemReadiness.dbConnection ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Terhubung</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                <X className="w-5 h-5" />
                <span>Gagal</span>
              </div>
            )}
          </div>
        </div>

        {/* Item 2 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">
              2. Tabel-tabel Sistem & Undangan Terverifikasi
            </div>
            <div className="text-[12px] text-[var(--text-faint)]">
              Peserta, undangan sekali pakai, jadwal, jejak audit kekal, dan indeks skuad
            </div>
          </div>
          <div>
            {checkingSystem && systemReadiness.tablesCreated === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
            ) : systemReadiness.tablesCreated ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Lengkap</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                <X className="w-5 h-5" />
                <span>Gagal</span>
              </div>
            )}
          </div>
        </div>

        {/* Item 3 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">
              3. Katalog Pemain eFootball™ (eFHUB) Terindeks
            </div>
            <div className="text-[12px] text-[var(--text-faint)]">
              Tabel lookup pemain eFootball™ dengan indeks FTS5
            </div>
          </div>
          <div>
            {checkingSystem && systemReadiness.playersSynced === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
            ) : systemReadiness.playersSynced ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {(systemReadiness.playersCount || 0).toLocaleString('id-ID')} Kartu Siap
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                <X className="w-5 h-5" />
                <span>Belum Disinkronkan (pnpm sync:players)</span>
              </div>
            )}
          </div>
        </div>

        {/* Item 4 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">
              4. 20 Matchday Disiapkan
            </div>
            <div className="text-[12px] text-[var(--text-faint)]">
              Jadwal MD1 sampai MD20 siap dimainkan
            </div>
          </div>
          <div>
            {checkingSystem && systemReadiness.matchesSeeded === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
            ) : systemReadiness.matchesSeeded ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>20 Laga Siap</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                <X className="w-5 h-5" />
                <span>Gagal</span>
              </div>
            )}
          </div>
        </div>

        {/* Item 5 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-[var(--text)]">
              5. Pengaturan Musim Tersimpan
            </div>
            <div className="text-[12px] text-[var(--text-faint)]">
              Warna pemain dan durasi 8 menit disahkan
            </div>
          </div>
          <div>
            {checkingSystem && systemReadiness.settingsSaved === null ? (
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-dim)]" />
            ) : systemReadiness.settingsSaved ? (
              <div className="flex items-center gap-1.5 text-[var(--ok)] text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Tersimpan</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[var(--danger)] text-xs font-semibold">
                <X className="w-5 h-5" />
                <span>Gagal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {systemReadiness.errorMessage && (
        <div className="rounded-[8px] bg-[var(--danger)]/15 border border-[var(--danger)]/40 p-4 text-[13px] text-[var(--danger)]">
          {systemReadiness.errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrevStep}
            className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
          >
            Kembali ke Skuad
          </button>

          <button
            type="button"
            disabled={checkingSystem}
            onClick={runSystemCheck}
            className="h-12 px-5 rounded-[8px] border border-[var(--line)] text-[var(--text-dim)] font-medium text-sm hover:text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${checkingSystem ? 'animate-spin' : ''}`} />
            <span>Coba Lagi</span>
          </button>
        </div>

        <button
          type="button"
          disabled={!allSystemChecksPassed || checkingSystem}
          onClick={onNextStep}
          className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
        >
          <span>Lanjut ke Kick-off</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
