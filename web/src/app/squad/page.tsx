import { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import {
  getParticipants,
  getSeasonSettings,
  getAllMatches,
  getVisibleRosterCards,
  getPlayersMetadata,
} from '@/lib/db';
import { SquadViewerClient } from '@/components/squad/SquadViewerClient';

export const metadata: Metadata = {
  title: 'Lembar Skuad Resmi | Rivals Series Season 1',
  description: 'Daftar resmi 26 kartu pemain virtual algojogacor dan CHarmed dalam kompetisi Rivals Series Season 1.',
};

export const dynamic = 'force-dynamic';

export default async function SquadPage() {
  const session = await getSession();

  const [participants, seasonSettings, matches, phase1Roster, phase2Roster] =
    await Promise.all([
      getParticipants(),
      getSeasonSettings(),
      getAllMatches(),
      getVisibleRosterCards(1, session?.participantId),
      getVisibleRosterCards(2, session?.participantId),
    ]);

  const md10Match = matches.find((m) => m.md_number === 10);
  const md10Completed = md10Match?.status === 'confirmed' || md10Match?.status === 'forfeited';

  // Gather all unique cardIds and basePlayerIds across both rosters to fetch rich metadata
  const allCardIds: string[] = [];
  const allBaseIds: number[] = [];

  for (const card of [...phase1Roster.cards, ...phase2Roster.cards]) {
    if (card.efootball_card_id) allCardIds.push(card.efootball_card_id);
    if (card.base_player_id) allBaseIds.push(card.base_player_id);
  }

  const playersMetaMap = await getPlayersMetadata(allCardIds, allBaseIds);
  const playersMeta = Object.fromEntries(playersMetaMap.entries());

  return (
    <SquadViewerClient
      participants={participants}
      phase1Cards={phase1Roster.cards}
      phase2Cards={phase2Roster.cards}
      phase1Status={phase1Roster.phaseStatus}
      phase2Status={phase2Roster.phaseStatus}
      playersMeta={playersMeta}
      initialParticipantId={session?.participantId || 'participant_a'}
      md10Completed={md10Completed}
    />
  );
}
