'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MonogramLogo } from './MonogramLogo';
import { Menu, X, Shield, User } from 'lucide-react';

interface NavbarProps {
  sessionParticipantName?: string | null;
  isAdmin?: boolean;
}

export function Navbar({ sessionParticipantName, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/standings', label: 'Klasemen' },
    { href: '/matches', label: 'Match Center' },
    { href: '/statistics', label: 'Statistik' },
    { href: '/awards', label: 'Penghargaan' },
    { href: '/rules', label: 'Regulasi' },
    { href: '/control', label: 'Pusat Kontrol' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1E2E48] bg-[#0C1728]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded border border-[#1E2E48] bg-[#121F33] p-1.5 transition-colors group-hover:border-[#E53430]">
            <MonogramLogo className="w-7 h-7" width={28} height={18} fill="#EEE6DA" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-[#EEE6DA] text-base uppercase">
                Rivals Series
              </span>
              <span className="rounded bg-[#E53430] px-1.5 py-0.2 text-[10px] font-bold text-white tracking-widest uppercase">
                S1
              </span>
            </div>
            <p className="text-[11px] font-medium text-[#7D8794] tracking-wider uppercase">
              eFootball 1v1 Competition
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isControl = link.href === '/control';
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                  isActive
                    ? 'bg-[#121F33] text-[#EEE6DA] border-b-2 border-[#E53430]'
                    : isControl
                    ? 'text-amber-300/90 hover:text-amber-200 hover:bg-[#121F33]/60'
                    : 'text-[#94A3B8] hover:text-[#EEE6DA] hover:bg-[#121F33]/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Session Status & Action */}
        <div className="hidden md:flex items-center gap-3">
          {sessionParticipantName ? (
            <Link
              href="/control"
              className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{sessionParticipantName}</span>
            </Link>
          ) : (
            <Link
              href="/control"
              className="flex items-center gap-1.5 rounded border border-[#1E2E48] bg-[#121F33] px-3 py-1.5 text-xs font-medium text-[#94A3B8] hover:text-[#EEE6DA] hover:border-[#7D8794] transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-[#7D8794]" />
              <span>Masuk Peserta</span>
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded border border-[#1E2E48] bg-[#121F33] text-[#EEE6DA]"
            aria-label="Buka navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#1E2E48] bg-[#0C1728] px-4 py-3 space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold tracking-wider rounded ${
                  isActive
                    ? 'bg-[#121F33] text-[#EEE6DA] border-l-2 border-[#E53430]'
                    : 'text-[#94A3B8] hover:bg-[#121F33] hover:text-[#EEE6DA]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[#1E2E48]">
            <Link
              href="/control"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold rounded bg-[#121F33] text-emerald-300 border border-emerald-500/30"
            >
              <User className="w-4 h-4" />
              {sessionParticipantName ? `Sesi Aktif: ${sessionParticipantName}` : 'Masuk sebagai Peserta'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
