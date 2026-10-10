import { getSession } from '@/lib/auth';
import { 
  getParticipants, 
  getAllMatches, 
  getAllRosterCards, 
  getAllDisputes, 
  getAllAuditEvents,
  getAllGoalNominations,
  getPendingResetRequest
} from '@/lib/db';
import { ControlCenterClient } from '@/components/ControlCenterClient';

export const metadata = {
  title: 'Pusat Kontrol Peserta | Rivals Series Season 1',
  description: 'Konsol operasional mandiri Peserta A dan Peserta B RS S1 untuk pelaporan hasil, konfirmasi, manajemen skuad, dan penyelesaian sengketa.',
};

export default async function ControlCenterPage() {
  const session = await getSession();
  const participants = await getParticipants();
  const matches = await getAllMatches();
  const rosterCards = await getAllRosterCards(1);
  const disputes = await getAllDisputes();
  const auditEvents = await getAllAuditEvents();
  const goalNominations = await getAllGoalNominations();
  const pendingReset = await getPendingResetRequest();

  return (
    <ControlCenterClient
      session={session}
      participants={participants}
      matches={matches}
      rosterCards={rosterCards}
      disputes={disputes}
      auditEvents={auditEvents}
      goalNominations={goalNominations}
      pendingReset={pendingReset}
    />
  );
}
