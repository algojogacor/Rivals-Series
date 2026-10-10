import { getCachedStandingsData } from '@/lib/cached-data';
import { StandingsView } from '@/components/StandingsView';

export const metadata = {
  title: 'Klasemen | Rivals Series Season 1',
  description: 'Tabel klasemen otoritatif Rivals Series Season 1 eFootball 1v1 duel competition.',
};

export const revalidate = 60;

export default async function StandingsPage() {
  const { standings } = await getCachedStandingsData();
  return <StandingsView standings={standings} />;
}
