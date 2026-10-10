'use client';

import React from 'react';
import { Trophy, Sparkles, Calendar, Shield, ArrowRight } from 'lucide-react';

interface SetupStep2FormatProps {
  onPrevStep: () => void;
  onNextStep: () => void;
}

export function SetupStep2Format({ onPrevStep, onNextStep }: SetupStep2FormatProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-3xl uppercase tracking-tight text-[var(--text)]">
          Langkah 2: Format Musim
        </h2>
        <p className="text-[13px] text-[var(--text-dim)] mt-1">
          Ringkasan regulasi resmi dari <code className="text-[var(--text)]">rules.md</code>. Tidak ada yang perlu diisi di langkah ini.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--p-a)] font-semibold text-sm">
            <Trophy className="w-4 h-4" />
            <span>20 Matchday Duel</span>
          </div>
          <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
            MD1–MD10: <strong>Group Stage</strong> (Menang 3, Seri 1, Kalah 0).
            <br />
            MD11–MD20: <strong>Knockout Stage</strong> (ET & Penalti on, tidak ada hasil seri).
          </p>
        </div>

        <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--p-b)] font-semibold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Kartu Trending & Kuota Indonesia</span>
          </div>
          <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
            Wajib minimal 2 pemain <strong>Trending</strong> bermain bersamaan 1 babak reguler penuh di tiap MD (Pasal 17), serta 1 pemain <strong>Indonesia</strong> di DSP tiap laga dan target 5 kredit musiman (Pasal 18–19).
          </p>
        </div>

        <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Skuad 26 Kartu Tanpa Kembar</span>
          </div>
          <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
            Maksimal 26 kartu per peserta tanpa kartu kembar dari pemain virtual yang sama (Pasal 14). Terkunci sampai MD10 selesai dan skuad lawan dirahasiakan sampai keduanya mengunci.
          </p>
        </div>

        <div className="rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] p-5 space-y-2">
          <div className="flex items-center gap-2 text-[var(--text)] font-semibold text-sm">
            <Shield className="w-4 h-4" />
            <span>Kedudukan Setara & Konsensus</span>
          </div>
          <p className="text-[13px] text-[var(--text-dim)] leading-relaxed">
            Kedua pemain memiliki hak yang setara. Pengesahan hasil, pembukaan sengketa, dan reset musim membutuhkan persetujuan lawan atau verifikasi bukti sesuai regulasi.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onPrevStep}
          className="h-12 px-6 rounded-[8px] border border-[var(--line)] text-[var(--text)] font-medium text-sm hover:bg-[var(--ink-2)] transition-colors"
        >
          Kembali
        </button>

        <button
          type="button"
          onClick={onNextStep}
          className="h-12 px-8 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <span>Lanjut ke Susun Skuad</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
