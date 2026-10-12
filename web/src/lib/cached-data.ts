import { unstable_cache, revalidateTag, updateTag } from 'next/cache';

/**
 * On-demand cache invalidator supporting Next.js 16 updateTag & revalidateTag
 */
export function invalidateCacheTags(...tags: string[]) {
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      // ignore if outside action context
    }
    try {
      revalidateTag(tag, { expire: 0 });
    } catch {
      // ignore
    }
  }
}
import {
  getParticipants,
  getAllMatches,
  getAllSanctions,
  getAllQuotaCredits,
  getSeasonSettings,
  getAllGoalEvents,
  getAllGoalkeeperRecords,
  getAllGoalNominations,
  getAllAwardBallots,
  getPlayersMetadata,
  PlayerCardMetadata,
} from './db';
import {
  calculateStandings,
  calculateGoldenBoot,
  calculatePlaymakerAward,
  calculateGoldenGlove,
  calculateWinningStreak,
  calculateGoalOfTheSeason,
} from './engine';

/**
 * Cached standings calculation used by Homepage and Standings view.
 * Automatically invalidated when match reports are submitted, confirmed, or disputed.
 */
export const getCachedStandingsData = unstable_cache(
  async () => {
    const [participants, matches, sanctions, quotaCredits, seasonSettings] = await Promise.all([
      getParticipants(),
      getAllMatches(),
      getAllSanctions(),
      getAllQuotaCredits(),
      getSeasonSettings(),
    ]);
    const isCompleted = seasonSettings?.status === 'completed';
    const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);
    return {
      participants,
      matches,
      sanctions,
      quotaCredits,
      seasonSettings,
      standings,
      isCompleted,
    };
  },
  ['rs_standings_data'],
  { revalidate: 300, tags: ['standings', 'matches', 'season'] }
);

/**
 * Cached match center schedule and results list.
 */
export const getCachedMatchesData = unstable_cache(
  async () => {
    const [matches, participants] = await Promise.all([
      getAllMatches(),
      getParticipants(),
    ]);
    return { matches, participants };
  },
  ['rs_matches_data'],
  { revalidate: 300, tags: ['matches', 'participants'] }
);

/**
 * Cached statistics data (Golden Boot, Golden Glove, Winning Streak, Standings).
 */
export const getCachedStatisticsData = unstable_cache(
  async () => {
    const [
      matches,
      participants,
      goalEvents,
      gkRecords,
      sanctions,
      quotaCredits,
      seasonSettings,
    ] = await Promise.all([
      getAllMatches(),
      getParticipants(),
      getAllGoalEvents(),
      getAllGoalkeeperRecords(),
      getAllSanctions(),
      getAllQuotaCredits(),
      getSeasonSettings(),
    ]);

    const isCompleted = seasonSettings?.status === 'completed';
    const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);

    const confirmedMatches = matches.filter((m) =>
      ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
    );
    const confirmedIds = new Set(confirmedMatches.map((m) => m.id));

    const topScorers = calculateGoldenBoot(goalEvents, confirmedIds);
    const topAssisters = calculatePlaymakerAward(goalEvents, confirmedIds);
    const topGoalkeepers = calculateGoldenGlove(gkRecords, matches);
    const paStreak = calculateWinningStreak(matches, 'participant_a');
    const pbStreak = calculateWinningStreak(matches, 'participant_b');

    const allCardIds = [
      ...topScorers.map((s) => s.card_id),
      ...topAssisters.map((a) => a.card_id),
      ...topGoalkeepers.map((g) => g.card_id),
    ];
    const allBaseIds = [
      ...topScorers.map((s) => s.base_player_id),
      ...topAssisters.map((a) => a.base_player_id),
      ...topGoalkeepers.map((g) => g.base_player_id),
    ];
    const rawMetaMap = await getPlayersMetadata(allCardIds, allBaseIds);
    const playersMeta: Record<string, PlayerCardMetadata> = Object.fromEntries(rawMetaMap.entries());

    return {
      matches,
      participants,
      goalEvents,
      gkRecords,
      sanctions,
      quotaCredits,
      seasonSettings,
      standings,
      topScorers,
      topAssisters,
      topGoalkeepers,
      playersMeta,
      paStreak,
      pbStreak,
      isCompleted,
    };
  },
  ['rs_statistics_data'],
  { revalidate: 300, tags: ['statistics', 'matches', 'goals'] }
);

/**
 * Cached awards calculation and ballots.
 */
export const getCachedAwardsData = unstable_cache(
  async () => {
    const [
      participants,
      matches,
      sanctions,
      quotaCredits,
      seasonSettings,
      goalEvents,
      gkRecords,
      goalNominations,
      awardBallots,
    ] = await Promise.all([
      getParticipants(),
      getAllMatches(),
      getAllSanctions(),
      getAllQuotaCredits(),
      getSeasonSettings(),
      getAllGoalEvents(),
      getAllGoalkeeperRecords(),
      getAllGoalNominations(),
      getAllAwardBallots(),
    ]);

    const isCompleted = seasonSettings?.status === 'completed';
    const standings = calculateStandings(participants, matches, sanctions, quotaCredits, isCompleted);

    const confirmedMatches = matches.filter((m) =>
      ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(m.status)
    );
    const confirmedIds = new Set(confirmedMatches.map((m) => m.id));

    const bootLeaders = calculateGoldenBoot(goalEvents, confirmedIds);
    const playmakerLeaders = calculatePlaymakerAward(goalEvents, confirmedIds);
    const gloveLeaders = calculateGoldenGlove(gkRecords, matches);
    const gotsResults = calculateGoalOfTheSeason(goalNominations, awardBallots);
    const paStreak = calculateWinningStreak(matches, 'participant_a');
    const pbStreak = calculateWinningStreak(matches, 'participant_b');

    const allCardIds = [
      ...bootLeaders.map((s) => s.card_id),
      ...playmakerLeaders.map((a) => a.card_id),
      ...gloveLeaders.map((g) => g.card_id),
    ];
    const allBaseIds = [
      ...bootLeaders.map((s) => s.base_player_id),
      ...playmakerLeaders.map((a) => a.base_player_id),
      ...gloveLeaders.map((g) => g.base_player_id),
    ];
    const rawMetaMap = await getPlayersMetadata(allCardIds, allBaseIds);
    const playersMeta: Record<string, PlayerCardMetadata> = Object.fromEntries(rawMetaMap.entries());

    return {
      participants,
      matches,
      sanctions,
      quotaCredits,
      seasonSettings,
      goalEvents,
      gkRecords,
      goalNominations,
      awardBallots,
      standings,
      bootLeaders,
      playmakerLeaders,
      gloveLeaders,
      gotsResults,
      playersMeta,
      paStreak,
      pbStreak,
      isCompleted,
    };
  },
  ['rs_awards_data'],
  { revalidate: 300, tags: ['awards', 'statistics', 'matches', 'nominations'] }
);
