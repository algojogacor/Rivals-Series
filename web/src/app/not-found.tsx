import Link from 'next/link';
import { Flag, ArrowLeft, Trophy, FileText } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 relative overflow-hidden">
      {/* Background ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full pointer-events-none blur-[120px] opacity-20"
        style={{
          background: 'radial-gradient(circle, var(--p-a) 0%, var(--p-b) 50%, transparent 80%)',
        }}
      />

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Tactical Flag Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--ink-1)] border border-[var(--line)] shadow-lg shadow-black/40 text-amber-400 mb-2">
          <Flag className="w-8 h-8 rotate-12" />
        </div>

        {/* 404 Large Display */}
        <div className="space-y-2">
          <div className="font-[family-name:var(--font-display)] font-extrabold text-7xl sm:text-8xl tracking-tight text-[var(--text)] leading-none">
            404
          </div>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-xl sm:text-2xl uppercase tracking-wider text-[var(--text-dim)]">
            Bola Keluar Lapangan (Offside)
          </h1>
        </div>

        <p className="text-sm text-[var(--text-faint)] leading-relaxed">
          Halaman atau putaran tanding yang Anda cari berada di luar garis lapangan resmi Rivals Series S1. Silakan kembali ke arena kompetisi.
        </p>

        {/* Action buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <Link
            href="/matches"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold uppercase tracking-wider text-[var(--text)] hover:border-[var(--text-dim)] transition-all"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Match Center</span>
          </Link>

          <Link
            href="/rules"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text)] transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Regulasi</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
