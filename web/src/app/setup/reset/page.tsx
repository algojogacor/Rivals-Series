import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPendingResetRequest, getSeasonSettings } from '@/lib/db';
import { ResetSeasonClient } from '@/components/ResetSeasonClient';

export const metadata = {
  title: 'Reset Musim Darurat | Rivals Series Season 1',
  description: 'Prosedur pemulihan dan reset musim RS S1 dengan perlindungan ganda dan persetujuan lawan.',
};

export const dynamic = 'force-dynamic';

export default async function ResetSetupPage() {
  const session = await getSession();

  // Both participants have equal rights to propose a season reset (requires opponent approval)
  if (!session) {
    redirect('/login?redirect=/setup/reset&error=' + encodeURIComponent('Halaman reset musim hanya dapat diakses oleh peserta yang sedang login.'));
  }

  const pendingReset = await getPendingResetRequest();
  const seasonSettings = await getSeasonSettings();

  return (
    <ResetSeasonClient
      session={session}
      pendingReset={pendingReset}
      seasonSettings={seasonSettings}
    />
  );
}
