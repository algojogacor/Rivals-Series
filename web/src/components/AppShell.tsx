'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Trophy, 
  Calendar, 
  BarChart2, 
  MoreHorizontal, 
  Award, 
  BookOpen, 
  Sliders, 
  LogOut, 
  User, 
  RotateCcw,
  X 
} from 'lucide-react';
import { ParticipantId, Participant } from '@/lib/types';
import { PlayerTag } from './PlayerTag';
import { MonogramLogo } from './MonogramLogo';
import { logoutParticipantAction } from '@/lib/actions';

interface AppShellProps {
  session: {
    participantId: ParticipantId;
    participant: Participant;
    isAdmin: boolean;
  } | null;
  children: React.ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on path change or click outside
  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileMenuOpen]);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/standings', label: 'Klasemen' },
    { href: '/matches', label: 'Match Center' },
    { href: '/statistics', label: 'Statistik' },
    { href: '/awards', label: 'Penghargaan' },
    { href: '/rules', label: 'Regulasi' },
  ];

  const isSetupRoute = pathname.startsWith('/setup');

  if (isSetupRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--ink-0)] text-[var(--text)]">
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ink-0)] text-[var(--text)] pb-20 md:pb-0">
      {/* 1. TOP STICKY BAR (Desktop & Mobile header) */}
      <header className="sticky top-0 z-40 w-full h-16 bg-[var(--ink-0)] border-b border-[var(--line)]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5 md:px-8">
          {/* Kiri: Logo "RS" (blok persegi) + "Rivals Series" */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--ink-1)] border border-[var(--line)] p-1.5 transition-colors group-hover:border-[var(--text)]">
              <MonogramLogo className="w-5 h-5" fill="var(--text)" />
            </div>
            <div className="flex items-center gap-1.5 font-[family-name:var(--font-display)]">
              <span className="font-extrabold text-xl tracking-tight uppercase text-[var(--text)]">
                Rivals Series
              </span>
              <span className="text-[13px] font-bold text-[var(--text-dim)] uppercase">
                S1
              </span>
            </div>
          </Link>

          {/* Tengah: Navigasi Desktop (teks 15px, aktif = teks --text + garis bawah 2px warna --text) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 h-full">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center h-full text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--text)] font-semibold'
                      : 'text-[var(--text-dim)] hover:text-[var(--text)]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--text)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Kanan: Chip pemain yang sedang login */}
          <div className="relative" ref={menuRef}>
            {session ? (
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-[8px] border border-[var(--line)] bg-[var(--ink-1)] hover:border-[var(--text-dim)] transition-colors focus:outline-none"
              >
                <PlayerTag
                  id={session.participantId}
                  name={session.participant.display_name}
                  monogram={session.participant.monogram}
                  size="sm"
                  nameClassName="hidden sm:inline text-xs font-semibold"
                />
              </button>
            ) : (
              <Link
                href="/control"
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-[8px] border border-[var(--line)] bg-[var(--ink-1)] text-xs font-semibold text-[var(--text)] hover:border-[var(--text-dim)] transition-colors"
              >
                Masuk
              </Link>
            )}

            {/* Profile Dropdown Menu */}
            {profileMenuOpen && session && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-[12px] bg-[var(--ink-1)] border border-[var(--line)] shadow-[0_12px_32px_rgb(0_0_0_/_0.45)] py-2 z-50">
                <div className="px-4 py-2 border-b border-[var(--line)]">
                  <p className="text-[13px] text-[var(--text-dim)]">Masuk sebagai</p>
                  <p className="text-[15px] font-bold text-[var(--text)] truncate">
                    {session.participant.display_name}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/control"
                    className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-[var(--text-dim)]" />
                    <span>Pusat Kontrol</span>
                  </Link>

                  <Link
                    href="/control?tab=profile"
                    className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--ink-2)] transition-colors"
                  >
                    <User className="w-4 h-4 text-[var(--text-dim)]" />
                    <span>Ubah Profil & PIN</span>
                  </Link>

                  <Link
                    href="/setup/reset"
                    className="flex items-center gap-2.5 px-4 py-2 text-[14px] text-[var(--danger)] hover:bg-[var(--ink-2)] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-[var(--danger)]" />
                    <span>Reset Musim</span>
                  </Link>
                </div>

                <div className="border-t border-[var(--line)] pt-1">
                  <form action={async () => { await logoutParticipantAction(); }}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[14px] text-[var(--text-dim)] hover:text-[var(--danger)] hover:bg-[var(--ink-2)] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT WRAPPER */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-5 md:px-8 py-6 md:py-10">
        {children}
      </main>

      {/* 3. MOBILE BOTTOM TAB BAR (5 items, safe-area aware) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--ink-0)] border-t border-[var(--line)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-5 h-14">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-1 ${
              pathname === '/' ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-dim)]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[11px] leading-none">Beranda</span>
          </Link>

          <Link
            href="/standings"
            className={`flex flex-col items-center justify-center gap-1 ${
              pathname === '/standings' ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-dim)]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="text-[11px] leading-none">Klasemen</span>
          </Link>

          <Link
            href="/matches"
            className={`flex flex-col items-center justify-center gap-1 ${
              pathname.startsWith('/matches') ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-dim)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[11px] leading-none">Jadwal</span>
          </Link>

          <Link
            href="/statistics"
            className={`flex flex-col items-center justify-center gap-1 ${
              pathname === '/statistics' ? 'text-[var(--text)] font-semibold' : 'text-[var(--text-dim)]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="text-[11px] leading-none">Statistik</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 ${
              ['/awards', '/rules', '/control'].some((p) => pathname.startsWith(p))
                ? 'text-[var(--text)] font-semibold'
                : 'text-[var(--text-dim)]'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[11px] leading-none">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Lainnya" Sheet / Modal */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--ink-1)] border-t border-[var(--line)] rounded-t-[16px] p-6 space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <h3 className="font-[family-name:var(--font-display)] font-extrabold text-xl uppercase tracking-tight text-[var(--text)]">
                Navigasi Lainnya
              </h3>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="p-1 rounded-[6px] text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Link
                href="/awards"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] font-medium text-[15px]"
              >
                <Award className="w-5 h-5 text-[var(--text-dim)]" />
                <span>Penghargaan Resmi</span>
              </Link>

              <Link
                href="/rules"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] font-medium text-[15px]"
              >
                <BookOpen className="w-5 h-5 text-[var(--text-dim)]" />
                <span>Regulasi Resmi (BAB I–XII)</span>
              </Link>

              <Link
                href="/control"
                onClick={() => setMobileMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--ink-2)] border border-[var(--line)] text-[var(--text)] font-medium text-[15px]"
              >
                <Sliders className="w-5 h-5 text-[var(--text-dim)]" />
                <span>Pusat Kontrol Peserta</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
