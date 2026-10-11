import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getAllMatches,
  getVisibleRosterCards,
  getShortlistCards,
  getAllDisputes,
  getAuditTrailForViewer,
  getAllGoalNominations,
  getPendingResetRequest,
  getAllGoalEvents,
} from '@/lib/db';
import { ControlCenterClient } from '@/components/ControlCenterClient';

export const metadata = {
  title: 'Pusat Kontrol Peserta | Rivals Series Season 1',
  description:
    'Konsol operasional mandiri Peserta A dan Peserta B RS S1 untuk pelaporan hasil, konfirmasi, manajemen skuad, dan penyelesaian sengketa.',
};

export const dynamic = 'force-dynamic';

export default async function ControlCenterPage() {
  const session = await getSession();
  const [
    participants,
    matches,
    visiblePhase1,
    visiblePhase2,
    shortlistCards,
    disputes,
    auditTrail,
    goalNominations,
    pendingReset,
    goalEvents,
  ] = await Promise.all([
    getParticipants(),
    getAllMatches(),
    getVisibleRosterCards(1, session?.participantId || null),
    getVisibleRosterCards(2, session?.participantId || null),
    session ? getShortlistCards(session.participantId) : Promise.resolve([]),
    getAllDisputes(),
    getAuditTrailForViewer(session?.participantId || null),
    getAllGoalNominations(),
    getPendingResetRequest(),
    getAllGoalEvents(),
  ]);

  return (
    <ControlCenterClient
      session={session}
      participants={participants}
      matches={matches}
      rosterCards={visiblePhase1.cards}
      phase1Roster={visiblePhase1}
      phase2Roster={visiblePhase2}
      shortlistCards={shortlistCards}
      disputes={disputes}
      auditEvents={auditTrail.events}
      auditChainVerification={auditTrail.chainVerification}
      unreadOpponentAuditCount={auditTrail.unreadOpponentCount}
      lastAuditSeenAt={auditTrail.lastSeenAt}
      goalNominations={goalNominations}
      pendingReset={pendingReset}
      goalEvents={goalEvents}
    />
  );
}

