import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getParticipants, getSeasonSettings } from '@/lib/db';
import { SetupWizardClient } from '@/components/SetupWizardClient';

export const metadata = {
  title: 'Setup Musim | Rivals Series Season 1',
  description: 'Konfigurasi awal peserta, identitas visual, dan kesiapan sistem Rivals Series Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  let session = null;
  let seasonSettings = null;
  let participants: any[] = [];

  try {
    session = await getSession();
    seasonSettings = await getSeasonSettings();
    participants = await getParticipants();
  } catch (err) {
    console.error('SetupPage load error:', err);
  }

  const isSetupMode = seasonSettings?.status === 'setup';
  const setupKeyValid = Boolean(params.key && process.env.SETUP_KEY && params.key === process.env.SETUP_KEY);
  const isAdmin = Boolean(session?.isAdmin);

  // Protection: If season is NOT in setup mode, only logged-in admin or valid SETUP_KEY can access
  if (!isSetupMode && !isAdmin && !setupKeyValid) {
    redirect('/');
  }

  const participantA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a',
    display_name: 'Peserta A',
    monogram: 'PA',
    is_admin: 1,
  };

  const participantB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b',
    display_name: 'Peserta B',
    monogram: 'PB',
    is_admin: 0,
  };

  return (
    <SetupWizardClient
      participantA={participantA}
      participantB={participantB}
      seasonSettings={seasonSettings}
      isAdmin={isAdmin}
    />
  );
}
