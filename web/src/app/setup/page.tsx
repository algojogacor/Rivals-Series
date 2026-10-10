import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getSeasonSettings,
  getVisibleRosterCards,
  getShortlistCards,
} from '@/lib/db';
import { SetupWizardClient } from '@/components/SetupWizardClient';

export const metadata = {
  title: 'Setup Musim | Rivals Series Season 1',
  description:
    'Konfigurasi awal peserta, identitas visual, penyusunan skuad eFootball™, dan kesiapan sistem Rivals Series Season 1.',
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
  let visibleRosterData = {
    cards: [] as any[],
    phaseStatus: {
      phase: 1,
      is_locked: 0,
      pa_locked: 0,
      pb_locked: 0,
      both_locked: false,
      md10_completed: false,
    },
    paCount: 0,
    pbCount: 0,
    paTrendingCount: 0,
    pbTrendingCount: 0,
    paIndoCount: 0,
    pbIndoCount: 0,
  };
  let shortlistCards: any[] = [];

  try {
    session = await getSession();
    [seasonSettings, participants, visibleRosterData] = await Promise.all([
      getSeasonSettings(),
      getParticipants(),
      getVisibleRosterCards(1, session?.participantId || null),
    ]);
    if (session) {
      shortlistCards = await getShortlistCards(session.participantId);
    }
  } catch (err) {
    console.error('SetupPage load error:', err);
  }

  const isSetupMode = seasonSettings?.status === 'setup';
  const setupKeyValid = Boolean(
    params.key && process.env.SETUP_KEY && params.key === process.env.SETUP_KEY
  );
  const isAdmin = Boolean(session?.isAdmin);

  // Protection for public Vercel deployment: If season is NOT in setup mode, only logged-in admin or valid SETUP_KEY can access
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
      session={session}
      participantA={participantA}
      participantB={participantB}
      seasonSettings={seasonSettings}
      isAdmin={isAdmin}
      phase1Status={visibleRosterData.phaseStatus}
      visibleCardsPhase1={visibleRosterData.cards}
      shortlistCards={shortlistCards}
      paSummaryPhase1={{
        count: visibleRosterData.paCount,
        trending: visibleRosterData.paTrendingCount,
        indo: visibleRosterData.paIndoCount,
      }}
      pbSummaryPhase1={{
        count: visibleRosterData.pbCount,
        trending: visibleRosterData.pbTrendingCount,
        indo: visibleRosterData.pbIndoCount,
      }}
    />
  );
}
