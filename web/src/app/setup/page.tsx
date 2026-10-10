import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getSeasonSettings,
  getVisibleRosterCards,
  getShortlistCards,
  getLatestSeasonInvite,
} from '@/lib/db';
import { validateInviteTokenServer } from '@/lib/actions';
import { SetupWizardClient } from '@/components/SetupWizardClient';

export const metadata = {
  title: 'Setup Musim | Rivals Series Season 1',
  description:
    'Konfigurasi awal peserta yang setara, identitas visual, PIN keamanan, undangan sekali pakai, dan penyusunan skuad Rivals Series Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; invite?: string }>;
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
  let latestInvite = null;
  let inviteValidation: {
    valid: boolean;
    status: 'valid' | 'used' | 'expired' | 'revoked' | 'invalid';
    error?: string;
    inviteId?: string;
    expiresAt?: string;
    codeHint?: string;
  } | null = null;

  try {
    session = await getSession();
    [seasonSettings, participants, visibleRosterData, latestInvite] = await Promise.all([
      getSeasonSettings(),
      getParticipants(),
      getVisibleRosterCards(1, session?.participantId || null),
      getLatestSeasonInvite('participant_b'),
    ]);
    if (session) {
      shortlistCards = await getShortlistCards(session.participantId);
    }
    if (params.invite) {
      inviteValidation = await validateInviteTokenServer(params.invite);
    }
  } catch (err) {
    console.error('SetupPage load error:', err);
  }

  const isSetupMode = seasonSettings?.status === 'setup';
  const setupKeyValid = Boolean(
    params.key && process.env.SETUP_KEY && params.key === process.env.SETUP_KEY
  );

  // If season is already live/completed, redirect to home (squad & profile management happen in /control)
  if (!isSetupMode) {
    redirect('/');
  }

  const participantA = participants.find((p) => p.id === 'participant_a') || {
    id: 'participant_a',
    display_name: 'Pemain A',
    monogram: 'PA',
    is_admin: 0,
    profile_completed: 0,
  };

  const participantB = participants.find((p) => p.id === 'participant_b') || {
    id: 'participant_b',
    display_name: 'Pemain B',
    monogram: 'PB',
    is_admin: 0,
    profile_completed: 0,
  };

  return (
    <SetupWizardClient
      session={session}
      participantA={participantA}
      participantB={participantB}
      seasonSettings={seasonSettings}
      setupKeyValid={setupKeyValid}
      setupKeyFromUrl={setupKeyValid ? params.key! : null}
      inviteTokenFromUrl={params.invite || null}
      inviteValidation={inviteValidation}
      latestInvite={latestInvite}
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
