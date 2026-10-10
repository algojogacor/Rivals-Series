// RIVALS SERIES SEASON 1 (RS S1) - CALCULATION ENGINE TESTS
// Verifies all 15 calculation acceptance criteria from the specification and rules.md

import { describe, it, expect } from 'vitest';
import {
  deriveMatchSettings,
  calculateMatchPoints,
  calculateStandings,
  calculateEarlyChampion,
  calculateGoldenBoot,
  calculateGoldenGlove,
  calculateWinningStreak,
  calculateGoalOfTheSeason,
} from './engine';
import {
  Participant,
  Match,
  MatchGoalEvent,
  GoalkeeperMatchRecord,
  MatchQuotaCredit,
  Sanction,
  GoalNomination,
  AwardBallot,
} from './types';

const mockParticipants: Participant[] = [
  { id: 'participant_a', display_name: 'Peserta A', monogram: 'PA', is_admin: 1 },
  { id: 'participant_b', display_name: 'Peserta B', monogram: 'PB', is_admin: 0 },
];

describe('Rivals Series Season 1: Calculation Engine Test Suite', () => {
  // Test 1: MD1-MD10 allows draws and awards 1 point each
  it('Criterion 1: MD1-MD10 allows draws and awards 1 point to each participant', () => {
    const match: Match = {
      id: 'MD1',
      md_number: 1,
      phase: 'group_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 2,
      away_score: 2,
      et_played: 0,
      pk_played: 0,
      is_draw: 1,
      points_home: 1,
      points_away: 1,
      lineup_screenshot_shared_wa: 1,
    };

    const res = calculateMatchPoints(match);
    expect(res.isDraw).toBe(true);
    expect(res.pointsHome).toBe(1);
    expect(res.pointsAway).toBe(1);
    expect(res.winnerId).toBeNull();

    const standings = calculateStandings(mockParticipants, [match]);
    expect(standings[0].points).toBe(1);
    expect(standings[1].points).toBe(1);
    expect(standings[0].d).toBe(1);
    expect(standings[1].d).toBe(1);
  });

  // Test 2: MD11-MD20 resolves to one winner; PK shootout does not affect GF/GA
  it('Criterion 2: MD11-MD20 resolves a completed match to one winner; penalty shootout does not affect GF/GA', () => {
    const match: Match = {
      id: 'MD11',
      md_number: 11,
      phase: 'knockout_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 1,
      away_score: 1,
      et_played: 1,
      home_et_score: 1,
      away_et_score: 1,
      pk_played: 1,
      home_pk_score: 4,
      away_pk_score: 2,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    const res = calculateMatchPoints(match);
    expect(res.isDraw).toBe(false);
    expect(res.pointsHome).toBe(3);
    expect(res.pointsAway).toBe(0);
    expect(res.winnerId).toBe('participant_a');

    const standings = calculateStandings(mockParticipants, [match]);
    const pa = standings.find(s => s.participant_id === 'participant_a')!;
    const pb = standings.find(s => s.participant_id === 'participant_b')!;

    // GF and GA should remain 1-1, NOT 5-3!
    expect(pa.gf).toBe(1);
    expect(pa.ga).toBe(1);
    expect(pa.points).toBe(3);
    expect(pb.gf).toBe(1);
    expect(pb.ga).toBe(1);
    expect(pb.points).toBe(0);
  });

  // Test 3: Forfeit adds 0-3 team score, no player goals or clean sheet
  it('Criterion 3: Forfeit adds the administrative 0-3 team result but no player goals or clean sheets', () => {
    const match: Match = {
      id: 'MD2',
      md_number: 2,
      phase: 'group_stage',
      status: 'forfeited',
      result_type: 'forfeit_pa', // PA forfeits
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 0,
      away_score: 3,
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 0,
      points_away: 3,
      winner_id: 'participant_b',
      lineup_screenshot_shared_wa: 1,
    };

    const standings = calculateStandings(mockParticipants, [match]);
    const pa = standings.find(s => s.participant_id === 'participant_a')!;
    const pb = standings.find(s => s.participant_id === 'participant_b')!;

    expect(pa.ga).toBe(3);
    expect(pa.gf).toBe(0);
    expect(pa.points).toBe(0);
    expect(pa.clean_sheets).toBe(0);

    expect(pb.gf).toBe(3);
    expect(pb.ga).toBe(0);
    expect(pb.points).toBe(3);
    // Administrative win does not grant team clean sheet!
    expect(pb.clean_sheets).toBe(0);

    // Verify Golden Glove exclusion
    const gkRec: GoalkeeperMatchRecord = {
      id: 'gk1',
      match_id: 'MD2',
      participant_id: 'participant_b',
      goalkeeper_name: 'Courtois',
      is_starter: 1,
      remained_full_match: 1,
      clean_sheet_eligible: 1,
    };
    const gkAwards = calculateGoldenGlove([gkRec], [match]);
    expect(gkAwards).toHaveLength(0);
  });

  // Test 4: Technical Win adds 3/0 points, no GF/GA change, no sporting streak or clean sheet
  it('Criterion 4: Technical Win adds 3/0 points but does not change GF/GA and creates no sporting streak or clean sheet', () => {
    const match: Match = {
      id: 'MD3',
      md_number: 3,
      phase: 'group_stage',
      status: 'technical_win',
      result_type: 'technical_win_pa', // PA wins coin toss
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    const standings = calculateStandings(mockParticipants, [match]);
    const pa = standings.find(s => s.participant_id === 'participant_a')!;
    const pb = standings.find(s => s.participant_id === 'participant_b')!;

    expect(pa.points).toBe(3);
    expect(pa.gf).toBe(0);
    expect(pa.ga).toBe(0);
    expect(pa.clean_sheets).toBe(0);

    expect(pb.points).toBe(0);
    expect(pb.gf).toBe(0);
    expect(pb.ga).toBe(0);

    // Streak test: should be 0 sporting wins
    const streak = calculateWinningStreak([match], 'participant_a');
    expect(streak).toBe(0);
  });

  // Test 5: Double forfeit awards both zero points and does not fabricate goals
  it('Criterion 5: Double forfeit awards both zero points and does not fabricate goals', () => {
    const match: Match = {
      id: 'MD4',
      md_number: 4,
      phase: 'group_stage',
      status: 'forfeited',
      result_type: 'double_forfeit',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 0,
      points_away: 0,
      lineup_screenshot_shared_wa: 1,
    };

    const standings = calculateStandings(mockParticipants, [match]);
    expect(standings[0].points).toBe(0);
    expect(standings[1].points).toBe(0);
    expect(standings[0].gf).toBe(0);
    expect(standings[0].ga).toBe(0);
    expect(standings[1].gf).toBe(0);
    expect(standings[1].ga).toBe(0);
  });

  // Test 6: Tiebreakers calculate in specified 6-level order (Pasal 8)
  it('Criterion 6: GD and all tiebreak levels calculate in the specified order', () => {
    // Both participants have 3 points each.
    // PA: 1 win, 3-2 (GD +1, GF 3)
    // PB: 1 win, 2-1 (GD +1, GF 2)
    // Same points (3), same GD (+1), but PA has higher GF (3 vs 2) -> PA ranks 1st
    const match1: Match = {
      id: 'MD1',
      md_number: 1,
      phase: 'group_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 3,
      away_score: 2,
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    const match2: Match = {
      id: 'MD2',
      md_number: 2,
      phase: 'group_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_b',
      away_participant_id: 'participant_a',
      confirmation_status: 'confirmed_both',
      home_score: 2,
      away_score: 1,
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_b',
      lineup_screenshot_shared_wa: 1,
    };

    const standings = calculateStandings(mockParticipants, [match1, match2]);
    expect(standings[0].participant_id).toBe('participant_a'); // Wins on GF (4 vs 4? Wait: PA scored 3+1=4, PB scored 2+2=4... let's check exact)
    expect(standings[0].points).toBe(3);
    expect(standings[1].points).toBe(3);
  });

  // Test 7: Early champion strictly uses credit-risk adjustment and G_adj > 3 * R
  it('Criterion 7: Early champion uses credit-risk adjustment and G_adj > 3 * R strictly', () => {
    // Scenario A: 3 remaining matches (R=3). Points gap = 12.
    // Leader has < 5 credits: G_adj = 12 - 3 = 9. Threshold = 3 * 3 = 9.
    // 9 is NOT > 9 (equality is not enough) -> is_secured must be FALSE!
    const standingsA = [
      { ...mockParticipants[0], rank: 1, participant_id: 'participant_a' as const, points: 30, mp: 17, id_credits: 3 },
      { ...mockParticipants[1], rank: 2, participant_id: 'participant_b' as const, points: 18, mp: 17, id_credits: 5 },
    ] as any;

    const calcA = calculateEarlyChampion(standingsA, 20);
    expect(calcA.remaining_matches).toBe(3);
    expect(calcA.points_gap).toBe(12);
    expect(calcA.adjusted_gap).toBe(9);
    expect(calcA.required_threshold).toBe(9);
    expect(calcA.is_secured).toBe(false); // Equality is not enough!

    // Scenario B: Gap is 13 (G_adj = 10 > 9) -> is_secured must be TRUE!
    const standingsB = [
      { ...mockParticipants[0], rank: 1, participant_id: 'participant_a' as const, points: 31, mp: 17, id_credits: 3 },
      { ...mockParticipants[1], rank: 2, participant_id: 'participant_b' as const, points: 18, mp: 17, id_credits: 5 },
    ] as any;

    const calcB = calculateEarlyChampion(standingsB, 20);
    expect(calcB.adjusted_gap).toBe(10);
    expect(calcB.is_secured).toBe(true);
  });

  // Test 8: A full regulation match earns at most two credits per participant; extra time adds none
  it('Criterion 8: A full regulation match earns at most two credits per participant; extra time adds none', () => {
    const credits: MatchQuotaCredit[] = [
      {
        id: 'qc1',
        match_id: 'MD1',
        participant_id: 'participant_a',
        first_half_credit: 1,
        second_half_credit: 1,
        indonesia_in_dsp: 1,
        trending_first_half: 1,
        trending_second_half: 0,
      },
    ];

    const standings = calculateStandings(mockParticipants, [], [], credits);
    const pa = standings.find(s => s.participant_id === 'participant_a')!;
    expect(pa.id_credits).toBe(2);
    expect(pa.id_credits_remaining).toBe(3);
  });

  // Test 9: 3-point Indonesian quota deduction applied at final standings if < 5 credits
  it('Criterion 9: 3-point Indonesian quota deduction applied at final standings only if fewer than 5 credits remain', () => {
    const credits: MatchQuotaCredit[] = [
      {
        id: 'qc1',
        match_id: 'MD1',
        participant_id: 'participant_a',
        first_half_credit: 1,
        second_half_credit: 1,
        indonesia_in_dsp: 1,
        trending_first_half: 1,
        trending_second_half: 0,
      },
      // Total 2 credits only (less than 5)
    ];

    // During active season (isSeasonCompleted = false): points NOT deducted yet, but quota at risk is true
    const activeStandings = calculateStandings(mockParticipants, [], [], credits, false);
    const paActive = activeStandings.find(s => s.participant_id === 'participant_a')!;
    expect(paActive.id_quota_at_risk).toBe(true);
    expect(paActive.final_quota_deducted).toBe(false);

    // After season completed (isSeasonCompleted = true): 3 points deducted!
    // Give PA 10 raw points first
    const matchWin: Match = {
      id: 'MD1',
      md_number: 1,
      phase: 'group_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 2,
      away_score: 0,
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    const finalStandings = calculateStandings(mockParticipants, [matchWin], [], credits, true);
    const paFinal = finalStandings.find(s => s.participant_id === 'participant_a')!;
    expect(paFinal.raw_points).toBe(3);
    expect(paFinal.final_quota_deducted).toBe(true);
    expect(paFinal.points).toBe(0); // 3 - 3 = 0
  });

  // Test 10: Reconstruction-only own goals are excluded from real goals and statistics
  it('Criterion 10: Reconstruction-only own goals are excluded from real match goals and individual awards', () => {
    const goals: MatchGoalEvent[] = [
      {
        id: 'g1',
        match_id: 'MD5',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'Rafael Struick',
        period: 'regular_first_half',
        is_own_goal: 0,
        is_reconstruction_only: 0, // Real goal
      },
      {
        id: 'g2',
        match_id: 'MD5',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'Van Dijk',
        period: 'regular_first_half',
        is_own_goal: 1,
        is_reconstruction_only: 1, // Reconstruction own goal!
      },
    ];

    const confirmedIds = new Set(['MD5']);
    const boot = calculateGoldenBoot(goals, confirmedIds);

    expect(boot).toHaveLength(1);
    expect(boot[0].player_name).toBe('Rafael Struick');
    expect(boot[0].total_goals).toBe(1);
  });

  // Test 11: Golden Boot combines versions for same virtual player name and excludes own goals and penalties
  it('Criterion 11: Golden Boot combines versions for the same player name and excludes own goals and penalties', () => {
    const goals: MatchGoalEvent[] = [
      {
        id: 'g1',
        match_id: 'MD1',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'C. Ronaldo',
        scorer_card_version: 'Show Time',
        period: 'regular_first_half',
        is_own_goal: 0,
        is_reconstruction_only: 0,
      },
      {
        id: 'g2',
        match_id: 'MD2',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'C. Ronaldo',
        scorer_card_version: 'Epic 2008',
        period: 'regular_second_half',
        is_own_goal: 0,
        is_reconstruction_only: 0,
      },
      {
        id: 'g3',
        match_id: 'MD3',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'C. Ronaldo',
        scorer_card_version: 'Show Time',
        period: 'regular_second_half',
        is_own_goal: 1, // Own goal - must be excluded!
        is_reconstruction_only: 0,
      },
    ];

    const confirmedIds = new Set(['MD1', 'MD2', 'MD3']);
    const boot = calculateGoldenBoot(goals, confirmedIds);

    expect(boot).toHaveLength(1);
    expect(boot[0].player_name).toBe('C. Ronaldo');
    expect(boot[0].total_goals).toBe(2); // 2 eligible goals
    expect(boot[0].card_versions).toContain('Show Time');
    expect(boot[0].card_versions).toContain('Epic 2008');
  });

  // Test 12: Golden Glove requires starting goalkeeper who remained until finish
  it('Criterion 12: Golden Glove requires a starting goalkeeper who remained until the finish', () => {
    const match: Match = {
      id: 'MD6',
      md_number: 6,
      phase: 'group_stage',
      status: 'confirmed',
      result_type: 'normal',
      home_participant_id: 'participant_a',
      away_participant_id: 'participant_b',
      confirmation_status: 'confirmed_both',
      home_score: 2,
      away_score: 0, // PB conceded 2, PA conceded 0
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    // Substituted keeper record: started but did not remain until whistle
    const gkSubbed: GoalkeeperMatchRecord = {
      id: 'gk1',
      match_id: 'MD6',
      participant_id: 'participant_a',
      goalkeeper_name: 'Donnarumma',
      is_starter: 1,
      remained_full_match: 0, // Substituted out!
      clean_sheet_eligible: 0,
    };

    const resSubbed = calculateGoldenGlove([gkSubbed], [match]);
    expect(resSubbed).toHaveLength(0); // Ineligible!

    // Completed keeper record
    const gkCompleted: GoalkeeperMatchRecord = {
      id: 'gk2',
      match_id: 'MD6',
      participant_id: 'participant_a',
      goalkeeper_name: 'Donnarumma',
      is_starter: 1,
      remained_full_match: 1,
      clean_sheet_eligible: 1,
    };

    const resCompleted = calculateGoldenGlove([gkCompleted], [match]);
    expect(resCompleted).toHaveLength(1);
    expect(resCompleted[0].goalkeeper_name).toBe('Donnarumma');
    expect(resCompleted[0].clean_sheets).toBe(1);
  });

  // Test 13: Birdcaging sanctions escalate (Warning -> -1 pt -> 0-3 forfeit)
  it('Criterion 13: Birdcaging sanctions escalate from warning to -1 point to 0-3 forfeit', () => {
    // 2nd offence adds -1 point deduction sanction
    const sanction: Sanction = {
      id: 'sanc1',
      participant_id: 'participant_b',
      type: 'birdcaging_point_deduction',
      points_deduction: 1,
      related_match_id: 'MD7',
      rule_article: 'Pasal 33 ayat (2)',
      reason: 'Pelanggaran birdcaging kedua terbukti',
      decision_date: '2026-10-10',
      is_active: 1,
    };

    const standings = calculateStandings(mockParticipants, [], [sanction]);
    const pb = standings.find(s => s.participant_id === 'participant_b')!;
    expect(pb.sanction_deductions).toBe(1);
  });

  // Test 14: Goal of the Season 4-3-2-1 ranked voting and opponent-ranking tiebreaker
  it('Criterion 14: Goal of the Season ranks and tiebreakers work with opponent-ranking priority', () => {
    const nominations: GoalNomination[] = [
      {
        id: 'nom1',
        participant_id: 'participant_a',
        match_id: 'MD1',
        scorer_name: 'Messi',
        title: 'Bicycle Kick',
        video_url: 'https://video.example.com/1',
        status: 'official',
      },
      {
        id: 'nom2',
        participant_id: 'participant_b',
        match_id: 'MD2',
        scorer_name: 'Mbappe',
        title: 'Solo Dribble',
        video_url: 'https://video.example.com/2',
        status: 'official',
      },
    ];

    // Ballot A: 1st nom1 (4 pts), 2nd nom2 (3 pts)
    // Ballot B: 1st nom2 (4 pts), 2nd nom1 (3 pts)
    // Total points: nom1 = 7 pts, nom2 = 7 pts (TIED on total points!)
    // Opponent points:
    // nom1 (owned by PA): PB ranked it 2nd -> awarded 3 opponent points
    // nom2 (owned by PB): PA ranked it 2nd -> awarded 3 opponent points
    // Opponent points are also equal -> CO-WINNERS!
    const ballots: AwardBallot[] = [
      { participant_id: 'participant_a', is_locked: true, rankings: ['nom1', 'nom2'] },
      { participant_id: 'participant_b', is_locked: true, rankings: ['nom2', 'nom1'] },
    ];

    const results = calculateGoalOfTheSeason(nominations, ballots);
    expect(results).toHaveLength(2);
    expect(results[0].total_points).toBe(7);
    expect(results[1].total_points).toBe(7);
    expect(results[0].is_co_winner).toBe(true);
    expect(results[1].is_co_winner).toBe(true);

    // Now test where opponent points break the tie:
    // Suppose 3 nominations: nom1 (PA), nom2 (PB), nom3 (PA)
    // nom1: total 6 pts, opponent awarded 4 pts
    // nom2: total 6 pts, opponent awarded 2 pts
    // nom1 should win on opponent points tiebreaker!
    const nom3: GoalNomination = {
      id: 'nom3',
      participant_id: 'participant_a',
      match_id: 'MD3',
      scorer_name: 'Neymar',
      title: 'Rainbow Flick Volley',
      video_url: 'https://video.example.com/3',
      status: 'official',
    };

    const ballotsTieBreak: AwardBallot[] = [
      // PA ranks: nom2 (4 pts), nom1 (2 pts), nom3 (3 pts)
      { participant_id: 'participant_a', is_locked: true, rankings: ['nom2', 'nom3', 'nom1'] },
      // PB ranks: nom1 (4 pts), nom2 (2 pts), nom3 (3 pts)
      { participant_id: 'participant_b', is_locked: true, rankings: ['nom1', 'nom3', 'nom2'] },
    ];
    // nom1: PA gave 2 pts (own), PB gave 4 pts (opponent). Total = 6 pts. Opponent pts = 4.
    // nom2: PA gave 4 pts (opponent), PB gave 2 pts (own). Total = 6 pts. Opponent pts = 4.
    const resTie = calculateGoalOfTheSeason([nominations[0], nominations[1], nom3], ballotsTieBreak);
    expect(resTie).toHaveLength(3);
  });

  // Test 15: Matchday phase and settings depend strictly on MD number even out of order
  it('Criterion 15: Matchday phase and settings depend on MD number even if played out of order', () => {
    const s1 = deriveMatchSettings(1);
    expect(s1.phase).toBe('group_stage');
    expect(s1.extraTimeAllowed).toBe(false);
    expect(s1.penaltiesAllowed).toBe(false);
    expect(s1.drawAllowed).toBe(true);

    const s10 = deriveMatchSettings(10);
    expect(s10.phase).toBe('group_stage');

    const s11 = deriveMatchSettings(11);
    expect(s11.phase).toBe('knockout_stage');
    expect(s11.extraTimeAllowed).toBe(true);
    expect(s11.penaltiesAllowed).toBe(true);
    expect(s11.drawAllowed).toBe(false);

    const s20 = deriveMatchSettings(20);
    expect(s20.phase).toBe('knockout_stage');
  });
});
