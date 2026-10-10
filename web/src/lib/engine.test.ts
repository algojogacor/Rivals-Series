// RIVALS SERIES SEASON 1 (RS S1) - CALCULATION ENGINE TESTS
// Verifies all calculation acceptance criteria from the specification and rules.md

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
  validateSquadForLock,
  evaluateMatchTrendingCompliance,
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
    expect(standings[0].participant_id).toBe('participant_a');
    expect(standings[0].points).toBe(3);
    expect(standings[1].points).toBe(3);
  });

  // Test 7: Early champion strictly uses credit-risk adjustment and G_adj > 3 * R
  it('Criterion 7: Early champion uses credit-risk adjustment and G_adj > 3 * R strictly', () => {
    const standingsA = [
      { ...mockParticipants[0], rank: 1, participant_id: 'participant_a' as const, points: 30, mp: 17, id_credits: 3 },
      { ...mockParticipants[1], rank: 2, participant_id: 'participant_b' as const, points: 18, mp: 17, id_credits: 5 },
    ] as any;

    const calcA = calculateEarlyChampion(standingsA, 20);
    expect(calcA.remaining_matches).toBe(3);
    expect(calcA.points_gap).toBe(12);
    expect(calcA.adjusted_gap).toBe(9);
    expect(calcA.required_threshold).toBe(9);
    expect(calcA.is_secured).toBe(false);

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
    ];

    const activeStandings = calculateStandings(mockParticipants, [], [], credits, false);
    const paActive = activeStandings.find(s => s.participant_id === 'participant_a')!;
    expect(paActive.id_quota_at_risk).toBe(true);
    expect(paActive.final_quota_deducted).toBe(false);

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
    expect(paFinal.points).toBe(0);
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
        is_reconstruction_only: 0,
      },
      {
        id: 'g2',
        match_id: 'MD5',
        scoring_participant_id: 'participant_a',
        scorer_player_name: 'Van Dijk',
        period: 'regular_first_half',
        is_own_goal: 1,
        is_reconstruction_only: 1,
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
        is_own_goal: 1,
        is_reconstruction_only: 0,
      },
    ];

    const confirmedIds = new Set(['MD1', 'MD2', 'MD3']);
    const boot = calculateGoldenBoot(goals, confirmedIds);

    expect(boot).toHaveLength(1);
    expect(boot[0].player_name).toBe('C. Ronaldo');
    expect(boot[0].total_goals).toBe(2);
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
      away_score: 0,
      et_played: 0,
      pk_played: 0,
      is_draw: 0,
      points_home: 3,
      points_away: 0,
      winner_id: 'participant_a',
      lineup_screenshot_shared_wa: 1,
    };

    const gkSubbed: GoalkeeperMatchRecord = {
      id: 'gk1',
      match_id: 'MD6',
      participant_id: 'participant_a',
      goalkeeper_name: 'Donnarumma',
      is_starter: 1,
      remained_full_match: 0,
      clean_sheet_eligible: 0,
    };

    const resSubbed = calculateGoldenGlove([gkSubbed], [match]);
    expect(resSubbed).toHaveLength(0);

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
      { participant_id: 'participant_a', is_locked: true, rankings: ['nom2', 'nom3', 'nom1'] },
      { participant_id: 'participant_b', is_locked: true, rankings: ['nom1', 'nom3', 'nom2'] },
    ];
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

  // Test 16: Golden Boot & Golden Glove merge card versions by virtual player (base_player_id) across Phase 1 & Phase 2
  it('Criterion 16: Golden Boot & Golden Glove merge statistics by virtual player (base_player_id) across different card versions', () => {
    const goals: MatchGoalEvent[] = [
      {
        id: 'g_md4',
        match_id: 'MD4',
        scoring_participant_id: 'participant_a',
        scorer_card_id: '7511',
        scorer_base_player_id: 7511,
        scorer_player_name: 'L. Messi',
        scorer_card_version: 'Standard',
        period: 'regular_first_half',
        is_own_goal: 0,
        is_reconstruction_only: 0,
      },
      {
        id: 'g_md12',
        match_id: 'MD12',
        scoring_participant_id: 'participant_a',
        scorer_card_id: '105874433562935',
        scorer_base_player_id: 7511, // Same virtual player (Messi) upgraded after MD10!
        scorer_player_name: 'L. Messi',
        scorer_card_version: 'Trending · Worldwide Sep 2024',
        period: 'regular_second_half',
        is_own_goal: 0,
        is_reconstruction_only: 0,
      },
    ];

    const boot = calculateGoldenBoot(goals, new Set(['MD4', 'MD12']));
    expect(boot).toHaveLength(1);
    expect(boot[0].base_player_id).toBe(7511);
    expect(boot[0].total_goals).toBe(2);
    expect(boot[0].card_versions).toEqual(['Standard', 'Trending · Worldwide Sep 2024']);

    const matches: Match[] = [
      {
        id: 'MD4',
        md_number: 4,
        phase: 'group_stage',
        status: 'confirmed',
        result_type: 'normal',
        home_participant_id: 'participant_a',
        away_participant_id: 'participant_b',
        confirmation_status: 'confirmed_both',
        home_score: 1,
        away_score: 0,
        et_played: 0,
        pk_played: 0,
        is_draw: 0,
        points_home: 3,
        points_away: 0,
        winner_id: 'participant_a',
        lineup_screenshot_shared_wa: 1,
      },
      {
        id: 'MD12',
        md_number: 12,
        phase: 'knockout_stage',
        status: 'confirmed',
        result_type: 'normal',
        home_participant_id: 'participant_b',
        away_participant_id: 'participant_a',
        confirmation_status: 'confirmed_both',
        home_score: 0,
        away_score: 2,
        et_played: 0,
        pk_played: 0,
        is_draw: 0,
        points_home: 0,
        points_away: 3,
        winner_id: 'participant_a',
        lineup_screenshot_shared_wa: 1,
      },
    ];

    const gkRecords: GoalkeeperMatchRecord[] = [
      {
        id: 'gk_md4',
        match_id: 'MD4',
        participant_id: 'participant_a',
        goalkeeper_card_id: '114873',
        goalkeeper_base_player_id: 114873,
        goalkeeper_name: 'G. Donnarumma',
        goalkeeper_card_version: 'Standard',
        is_starter: 1,
        remained_full_match: 1,
        clean_sheet_eligible: 1,
      },
      {
        id: 'gk_md12',
        match_id: 'MD12',
        participant_id: 'participant_a',
        goalkeeper_card_id: '105874433666489',
        goalkeeper_base_player_id: 114873, // Same virtual goalkeeper upgraded after MD10!
        goalkeeper_name: 'G. Donnarumma',
        goalkeeper_card_version: 'Trending ·UCL Oct 2024',
        is_starter: 1,
        remained_full_match: 1,
        clean_sheet_eligible: 1,
      },
    ];

    const glove = calculateGoldenGlove(gkRecords, matches);
    expect(glove).toHaveLength(1);
    expect(glove[0].base_player_id).toBe(114873);
    expect(glove[0].clean_sheets).toBe(2);
    expect(glove[0].card_versions).toEqual(['Standard', 'Trending ·UCL Oct 2024']);
  });

  // Test 17: Squad lock validation enforces max 26 cards, min 2 Trending cards, and no duplicate base_player_id
  it('Criterion 17: validateSquadForLock enforces max 26 cards, min 2 Trending cards, and rejects duplicate virtual players', () => {
    // Case A: Only 1 Trending card -> rejected with exact reason
    const oneTrending = validateSquadForLock([
      { player_name: 'K. Mbappé', base_player_id: 110718, is_trending: 1, is_indonesian: 0 },
      { player_name: 'Marselino Ferdinan', base_player_id: 150001, is_trending: 0, is_indonesian: 1 },
    ]);
    expect(oneTrending.valid).toBe(false);
    expect(oneTrending.errors.join(' ')).toContain('kurang 1 kartu Trending');

    // Case B: Duplicate virtual player (same base_player_id) -> rejected
    const duplicateVirtual = validateSquadForLock([
      { player_name: 'L. Messi (Standard)', base_player_id: 7511, is_trending: 0 },
      { player_name: 'L. Messi (Trending)', base_player_id: 7511, is_trending: 1 },
      { player_name: 'E. Haaland (Trending)', base_player_id: 133543, is_trending: 1 },
    ]);
    expect(duplicateVirtual.valid).toBe(false);
    expect(duplicateVirtual.duplicatePlayers).toHaveLength(1);
    expect(duplicateVirtual.errors.join(' ')).toContain('Terdapat kartu kembar dari pemain virtual yang sama');

    // Case C: Valid squad with 2 Trending cards from distinct virtual players
    const validSquad = validateSquadForLock([
      { player_name: 'L. Messi (Trending)', base_player_id: 7511, is_trending: 1, is_indonesian: 0 },
      { player_name: 'E. Haaland (Trending)', base_player_id: 133543, is_trending: 1, is_indonesian: 0 },
      { player_name: 'Jay Idzes', base_player_id: 137504, is_trending: 0, is_indonesian: 1 },
    ]);
    expect(validSquad.valid).toBe(true);
    expect(validSquad.trendingCount).toBe(2);
    expect(validSquad.indonesianCount).toBe(1);
  });

  // Test 18: Per-MD Trending compliance requires at least 1 full regular half with >=2 Trending players
  it('Criterion 18: evaluateMatchTrendingCompliance checks per-MD Trending card requirement (Pasal 17)', () => {
    expect(
      evaluateMatchTrendingCompliance({ trending_first_half: 1, trending_second_half: 0 }).compliant
    ).toBe(true);
    expect(
      evaluateMatchTrendingCompliance({ trending_first_half: 0, trending_second_half: 1 }).compliant
    ).toBe(true);
    expect(
      evaluateMatchTrendingCompliance({ trending_first_half: 0, trending_second_half: 0 }).compliant
    ).toBe(false);
  });
});

