import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
} from '@/lib/db';
import { calculateStandings } from '@/lib/engine';
import { StandingsView } from '@/components/StandingsView';

export const metadata = {
  title: 'Klasemen | Rivals Series Season 1',
  description: 'Tabel klasemen otoritatif Rivals Series Season 1 eFootball 1v1 duel competition.',
};

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const [participants, matches, sanctions, quotaCredits, seasonSettings] = await Promise.all([
    getParticipants(),
    getAllMatches(),
    getAllSanctions(),
    getAllQuotaCredits(),
    getSeasonSettings(),
  ]);

  const isCompleted = seasonSettings?.status === 'completed';
  const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);

  return <StandingsView standings={standings} />;
}
