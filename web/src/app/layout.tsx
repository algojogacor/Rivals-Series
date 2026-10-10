import type { Metadata } from 'next';
import { Big_Shoulders, Barlow } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { SiteFooter } from '@/components/SiteFooter';
import { getSession } from '@/lib/auth';
import { getSeasonSettings } from '@/lib/db';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

const bigShoulders = Big_Shoulders({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-big-shoulders',
  display: 'swap',
  adjustFontFallback: false,
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rivals Series Season 1 — Official Competition Records',
  description: 'Official digital records, standings, match reports, statistics, and awards for Rivals Series Season 1 eFootball 1v1 competition.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  let session = null;
  let playerAColor = '#3ec9e6';
  let playerBColor = '#a78bfa';
  let isSetupStatus = false;

  // Defensive concurrent database reads: never crash if DB is temporarily unreachable
  const [sessionRes, settingsRes] = await Promise.all([
    getSession().catch((err) => {
      console.error('RootLayout: session read error, defaulting to guest', err);
      return null;
    }),
    getSeasonSettings().catch((err) => {
      console.error('RootLayout: season settings read error, using fallback colors', err);
      return null;
    }),
  ]);

  session = sessionRes;
  if (settingsRes) {
    if (settingsRes.player_a_color) playerAColor = settingsRes.player_a_color;
    if (settingsRes.player_b_color) playerBColor = settingsRes.player_b_color;
    if (settingsRes.status === 'setup') {
      isSetupStatus = true;
    }
  }

  // Safe redirect guard:
  // If season status is 'setup', redirect to /setup
  // EXEMPT: /setup*, /api*, /login*, static assets
  if (isSetupStatus) {
    const isExempt =
      pathname.startsWith('/setup') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/login');

    if (!isExempt) {
      redirect('/setup');
    }
  }

  return (
    <html lang="id" className={`${bigShoulders.variable} ${barlow.variable}`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root {
  --p-a: ${playerAColor};
  --p-b: ${playerBColor};
  --p-a-soft: color-mix(in oklab, var(--p-a) 14%, var(--ink-1));
  --p-b-soft: color-mix(in oklab, var(--p-b) 14%, var(--ink-1));
}`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--ink-0)] text-[var(--text)] antialiased">
        <AppShell session={session}>
          {children}
        </AppShell>
        <SiteFooter />
      </body>
    </html>
  );
}
