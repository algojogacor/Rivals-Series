'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/setup')) {
    return null;
  }
  return (
    <footer className="w-full border-t border-[var(--line)] bg-[var(--ink-0)] py-6 text-center">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-[var(--text-dim)]">
        <span>Rivals Series Season 1</span>
        <div className="flex items-center gap-3">
          <span>Regulasi v1.0</span>
          <span>·</span>
          <Link
            href="/rules"
            className="hover:text-[var(--text)] transition-colors underline underline-offset-4"
          >
            Sumber aturan: rules.md
          </Link>
        </div>
      </div>
    </footer>
  );
}
