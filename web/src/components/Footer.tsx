import Link from 'next/link';
import { MonogramLogo } from './MonogramLogo';
import { Database, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[#1E2E48] bg-[#08101C] text-[#94A3B8] mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Identity */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <MonogramLogo className="w-8 h-8" width={32} height={21} fill="#EEE6DA" />
              <div>
                <h3 className="text-sm font-bold tracking-tight text-[#EEE6DA] uppercase">
                  Rivals Series Season 1
                </h3>
                <p className="text-xs text-[#7D8794]">
                  Official eFootball 1v1 Competition Hub
                </p>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-md">
              Publikasi digital resmi hasil pertandingan, klasemen, statistik, pemenuhan kuota pemain Indonesia, dan penghargaan untuk kompetisi independen dua peserta.
            </p>
            <div className="flex items-center gap-2 pt-2 text-[11px] text-[#7D8794]">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Penyimpanan Data Terpusat: <strong>Turso LibSQL Database</strong></span>
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EEE6DA] mb-3">
              Navigasi Kompetisi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/standings" className="hover:text-[#EEE6DA] transition-colors">
                  Official League Table
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-[#EEE6DA] transition-colors">
                  Match Center (MD1–MD20)
                </Link>
              </li>
              <li>
                <Link href="/statistics" className="hover:text-[#EEE6DA] transition-colors">
                  Statistik & Rekor Musim
                </Link>
              </li>
              <li>
                <Link href="/awards" className="hover:text-[#EEE6DA] transition-colors">
                  Tujuh Penghargaan Resmi
                </Link>
              </li>
              <li>
                <Link href="/awards/goal-of-the-season" className="hover:text-[#EEE6DA] transition-colors">
                  Goal of the Season & Voting
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Integritas Regulasi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#EEE6DA] mb-3">
              Otoritas Regulasi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/rules" className="hover:text-[#EEE6DA] transition-colors">
                  Ringkasan Regulasi Resmi (BAB I–XII)
                </Link>
              </li>
              <li>
                <Link href="/control" className="hover:text-[#EEE6DA] transition-colors">
                  Pusat Operasional & Audit Trail
                </Link>
              </li>
              <li className="pt-2 text-[11px] text-[#64748B]">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E53430]" />
                  Sumber Otoritatif: <code>rules.md</code>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#1E2E48] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
          <p>
            © 2026 Rivals Series Season 1. Seluruh hak cipta dan regulasi disepakati oleh kedua peserta.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>EDISI REGULASI 1.0</span>
            <span>•</span>
            <span>20 MATCHDAY RESMI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
