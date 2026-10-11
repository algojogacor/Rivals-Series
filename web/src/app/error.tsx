'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16 relative overflow-hidden">
      <div className="max-w-md w-full space-y-6">
        {/* Tactical VAR Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
            VAR Review · Gangguan Teknis
          </span>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-[var(--text)]">
            Terjadi Kesalahan Tak Terduga
          </h1>
        </div>

        <p className="text-sm text-[var(--text-faint)] leading-relaxed">
          {error.message || 'Sistem arena mengalami hambatan teknis saat memuat data pertandingan.'}
        </p>

        {error.digest && (
          <div className="text-[11px] font-mono text-[var(--text-faint)] px-3 py-1.5 rounded bg-[var(--ink-1)] border border-[var(--line)]">
            Kode error: {error.digest}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[8px] bg-[var(--text)] text-[var(--ink-0)] text-xs font-bold uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-xs font-bold uppercase tracking-wider text-[var(--text)] hover:border-[var(--text-dim)] transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
