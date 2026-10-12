// RIVALS SERIES SEASON 1 (RS S1) CENTRALIZED RULES & CALCULATION ENGINE
// Implements all authoritative scoring, tiebreak, quota, and award logic from rules.md

import {
  ParticipantId,
  Participant,
  Match,
  MatchSettings,
  MatchGoalEvent,
  GoalkeeperMatchRecord,
  MatchQuotaCredit,
  Sanction,
  ParticipantStanding,
  EarlyChampionCalculation,
  GoldenBootEntry,
  GoldenGloveEntry,
  PlaymakerEntry,
  GoalNomination,
  AwardBallot,
  GoalOfTheSeasonResult,
} from './types';

/**
 * Pasal 11: Derive Match Settings from Matchday Number
 * Independent of calendar dates or the order in which matches are played.
 */
export function deriveMatchSettings(mdNumber: number): MatchSettings {
  if (mdNumber < 1 || mdNumber > 20) {
    throw new Error(`Nomor Matchday tidak valid: ${mdNumber}. RS S1 terdiri atas MD1 sampai MD20.`);
  }

  const isGroupStage = mdNumber <= 10;

  return {
    phase: isGroupStage ? 'group_stage' : 'knockout_stage',
    phaseLabel: isGroupStage ? 'Group Stage' : 'Knockout Stage',
    durationMinutes: 8,
    condition: 'Random',
    maxSubstitutions: 6,
    maxSubWindows: 6,
    extraTimeAllowed: !isGroupStage,
    penaltiesAllowed: !isGroupStage,
    drawAllowed: isGroupStage,
  };
}

/**
 * Pasal 6 & Pasal 28: Derive Points and Winner from Match Result
 */
export function calculateMatchPoints(match: Match): {
  pointsHome: number;
  pointsAway: number;
  winnerId: ParticipantId | null;
  isDraw: boolean;
} {
  // 1. Forfeit outcomes
  if (match.result_type === 'forfeit_pa') {
    return {
      pointsHome: 0,
      pointsAway: 3,
      winnerId: match.away_participant_id,
      isDraw: false,
    };
  }
  if (match.result_type === 'forfeit_pb') {
    return {
      pointsHome: 3,
      pointsAway: 0,
      winnerId: match.home_participant_id,
      isDraw: false,
    };
  }
  if (match.result_type === 'double_forfeit') {
    return {
      pointsHome: 0,
      pointsAway: 0,
      winnerId: null,
      isDraw: false,
    };
  }

  // 2. Technical Win (Digital Coin Toss fallback)
  if (match.result_type === 'technical_win_pa') {
    return {
      pointsHome: 3,
      pointsAway: 0,
      winnerId: match.home_participant_id,
      isDraw: false,
    };
  }
  if (match.result_type === 'technical_win_pb') {
    return {
      pointsHome: 0,
      pointsAway: 3,
      winnerId: match.away_participant_id,
      isDraw: false,
    };
  }

  // 3. Normal or Reconstructed Matches
  const homeReg = match.home_score ?? 0;
  const awayReg = match.away_score ?? 0;

  if (match.phase === 'group_stage') {
    if (homeReg > awayReg) {
      return { pointsHome: 3, pointsAway: 0, winnerId: match.home_participant_id, isDraw: false };
    } else if (homeReg < awayReg) {
      return { pointsHome: 0, pointsAway: 3, winnerId: match.away_participant_id, isDraw: false };
    } else {
      return { pointsHome: 1, pointsAway: 1, winnerId: null, isDraw: true };
    }
  }

  // Knockout Stage (MD11-MD20) - Must yield a winner
  // If Extra Time was played, compare regulation + ET or ET final score
  const homeEt = match.et_played ? (match.home_et_score ?? homeReg) : homeReg;
  const awayEt = match.et_played ? (match.away_et_score ?? awayReg) : awayReg;

  if (homeEt > awayEt) {
    return { pointsHome: 3, pointsAway: 0, winnerId: match.home_participant_id, isDraw: false };
  } else if (homeEt < awayEt) {
    return { pointsHome: 0, pointsAway: 3, winnerId: match.away_participant_id, isDraw: false };
  }

  // Penalties decide winner
  const homePk = match.home_pk_score ?? 0;
  const awayPk = match.away_pk_score ?? 0;

  if (homePk > awayPk) {
    return { pointsHome: 3, pointsAway: 0, winnerId: match.home_participant_id, isDraw: false };
  } else if (homePk < awayPk) {
    return { pointsHome: 0, pointsAway: 3, winnerId: match.away_participant_id, isDraw: false };
  }

  // Default fallback if unplayed or identical
  return { pointsHome: 0, pointsAway: 0, winnerId: null, isDraw: false };
}

/**
 * Filter only official confirmed matches
 */
export function isOfficialMatch(match: Match): boolean {
  return ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(match.status);
}

/**
 * Pasal 7, 8, & 19: Standings Aggregation and Tiebreaker Ranking
 */
export function calculateStandings(
  participants: Participant[],
  matches: Match[],
  sanctions: Sanction[] = [],
  quotaCredits: MatchQuotaCredit[] = [],
  isSeasonCompleted: boolean = false
): ParticipantStanding[] {
  const standingsMap = new Map<ParticipantId, ParticipantStanding>();

  for (const p of participants) {
    standingsMap.set(p.id, {
      rank: 1,
      participant_id: p.id,
      display_name: p.display_name,
      monogram: p.monogram,
      mp: 0,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      raw_points: 0,
      sanction_deductions: 0,
      id_credits: 0,
      id_credits_remaining: 5,
      id_quota_at_risk: true,
      final_quota_deducted: false,
      clean_sheets: 0,
      wins_knockout: 0,
      gd_knockout: 0,
      gf_knockout: 0,
      form: [],
    });
  }

  // Process only confirmed matches
  const officialMatches = matches.filter(isOfficialMatch);

  // Sort matches by MD number or played_at to establish chronological form
  const sortedMatches = [...officialMatches].sort((a, b) => {
    if (a.played_at && b.played_at) {
      return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
    }
    return a.md_number - b.md_number;
  });

  for (const m of sortedMatches) {
    const home = standingsMap.get(m.home_participant_id);
    const away = standingsMap.get(m.away_participant_id);
    if (!home || !away) continue;

    home.mp += 1;
    away.mp += 1;

    const pointsRes = calculateMatchPoints(m);

    // 1. Handle Forfeit 0-3 Team Scores
    if (m.result_type === 'forfeit_pa') {
      // PA forfeited: PB gets 3-0 win
      home.l += 1;
      home.ga += 3;
      home.form.push('L');

      away.w += 1;
      away.gf += 3;
      away.raw_points += 3;
      away.form.push('W');
      continue;
    }
    if (m.result_type === 'forfeit_pb') {
      // PB forfeited: PA gets 3-0 win
      away.l += 1;
      away.ga += 3;
      away.form.push('L');

      home.w += 1;
      home.gf += 3;
      home.raw_points += 3;
      home.form.push('W');
      continue;
    }
    if (m.result_type === 'double_forfeit') {
      home.l += 1;
      away.l += 1;
      home.form.push('L');
      away.form.push('L');
      continue;
    }

    // 2. Handle Technical Win (Coin Toss)
    // Points 3/0, but GF/GA unchanged!
    if (m.result_type === 'technical_win_pa') {
      home.w += 1;
      home.raw_points += 3;
      home.form.push('W');

      away.l += 1;
      away.form.push('L');
      continue;
    }
    if (m.result_type === 'technical_win_pb') {
      away.w += 1;
      away.raw_points += 3;
      away.form.push('W');

      home.l += 1;
      home.form.push('L');
      continue;
    }

    // 3. Normal / Reconstructed Matches
    // Use regulation score or ET score if ET was played
    const hGoals = m.et_played ? (m.home_et_score ?? m.home_score ?? 0) : (m.home_score ?? 0);
    const aGoals = m.et_played ? (m.away_et_score ?? m.away_score ?? 0) : (m.away_score ?? 0);

    home.gf += hGoals;
    home.ga += aGoals;
    away.gf += aGoals;
    away.ga += hGoals;

    // Clean sheet checks for normal match
    if (aGoals === 0) home.clean_sheets += 1;
    if (hGoals === 0) away.clean_sheets += 1;

    // Points and W/D/L
    home.raw_points += pointsRes.pointsHome;
    away.raw_points += pointsRes.pointsAway;

    if (pointsRes.isDraw) {
      home.d += 1;
      away.d += 1;
      home.form.push('D');
      away.form.push('D');
    } else if (pointsRes.winnerId === home.participant_id) {
      home.w += 1;
      away.l += 1;
      home.form.push('W');
      away.form.push('L');
      if (m.phase === 'knockout_stage') {
        home.wins_knockout += 1;
      }
    } else {
      away.w += 1;
      home.l += 1;
      away.form.push('W');
      home.form.push('L');
      if (m.phase === 'knockout_stage') {
        away.wins_knockout += 1;
      }
    }

    if (m.phase === 'knockout_stage') {
      home.gf_knockout += hGoals;
      home.gd_knockout += (hGoals - aGoals);
      away.gf_knockout += aGoals;
      away.gd_knockout += (aGoals - hGoals);
    }
  }

  // Calculate Goal Difference GD = GF - GA
  for (const s of standingsMap.values()) {
    s.gd = s.gf - s.ga;
  }

  // Indonesian Player Credits Quota
  for (const qc of quotaCredits) {
    const s = standingsMap.get(qc.participant_id);
    if (!s) continue;
    // Each half credit is 0 or 1
    s.id_credits += (qc.first_half_credit ? 1 : 0) + (qc.second_half_credit ? 1 : 0);
  }

  for (const s of standingsMap.values()) {
    s.id_credits_remaining = Math.max(0, 5 - s.id_credits);
    s.id_quota_at_risk = s.id_credits < 5;
  }

  // Apply Sanction Deductions
  for (const sanc of sanctions) {
    if (!sanc.is_active) continue;
    const s = standingsMap.get(sanc.participant_id);
    if (!s) continue;
    s.sanction_deductions += sanc.points_deduction;
  }

  // End of Season Quota 3-Point Deduction (Pasal 19 ayat 5)
  // If season completed and credits < 5, apply 3-pt deduction
  for (const s of standingsMap.values()) {
    let totalDeductions = s.sanction_deductions;
    if (isSeasonCompleted && s.id_credits < 5) {
      totalDeductions += 3;
      s.final_quota_deducted = true;
    }
    s.points = Math.max(0, s.raw_points - totalDeductions);
  }

  // Sort and apply tiebreakers (Pasal 8)
  const sorted = Array.from(standingsMap.values()).sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. GD
    if (b.gd !== a.gd) return b.gd - a.gd;
    // 3. GF
    if (b.gf !== a.gf) return b.gf - a.gf;
    // 4. Overall Wins
    if (b.w !== a.w) return b.w - a.w;
    // 5. Knockout Wins (MD11-20)
    if (b.wins_knockout !== a.wins_knockout) return b.wins_knockout - a.wins_knockout;
    // 6. Knockout GD (MD11-20)
    if (b.gd_knockout !== a.gd_knockout) return b.gd_knockout - a.gd_knockout;
    // 7. Knockout GF (MD11-20)
    if (b.gf_knockout !== a.gf_knockout) return b.gf_knockout - a.gf_knockout;
    return 0;
  });

  // Assign ranks
  sorted.forEach((item, index) => {
    item.rank = index + 1;
  });

  return sorted;
}

/**
 * Pasal 9: Mathematically Secured Champion Calculation
 * Formula: G_adj > 3 * R
 * Where G_adj = G - 3 if leader has < 5 credits, else G
 */
export function calculateEarlyChampion(
  standings: ParticipantStanding[],
  totalRegularMatches: number = 20
): EarlyChampionCalculation {
  if (standings.length < 2) {
    return {
      is_secured: false,
      points_gap: 0,
      remaining_matches: 0,
      leader_credits: 0,
      adjusted_gap: 0,
      required_threshold: 0,
      explanation: 'Memerlukan data kedua peserta.',
    };
  }

  const leader = standings[0];
  const chaser = standings[1];

  // Number of unfinished regular matches in the season
  // Each match involves both participants, so unfinished matches = total - max(played)
  const completedCount = Math.max(leader.mp, chaser.mp);
  const R = Math.max(0, totalRegularMatches - completedCount);
  const G = leader.points - chaser.points;

  // Account for potential 3-point deduction if leader has not reached 5 credits
  const leaderCredits = leader.id_credits;
  const G_adj = leaderCredits < 5 ? (G - 3) : G;
  const threshold = 3 * R;

  // Must strictly exceed threshold (equality is not enough)
  const isSecured = R > 0 && G_adj > threshold;

  let explanation = '';
  if (R === 0) {
    explanation = 'Musim reguler telah selesai. Juara ditentukan dari klasemen akhir.';
  } else if (isSecured) {
    explanation = `Gelar juara telah terkunci secara matematis! Selisih poin disesuaikan (${G_adj}) melampaui poin maksimal yang dapat diraih lawan dalam sisa ${R} laga (${threshold} poin).`;
  } else {
    explanation = `Persaingan masih terbuka. Sisa ${R} laga (maksimal ${threshold} poin diperebutkan). Selisih poin efektif saat ini: ${G_adj} poin.`;
  }

  return {
    is_secured: isSecured,
    leader_id: isSecured ? leader.participant_id : null,
    leader_name: isSecured ? leader.display_name : null,
    points_gap: G,
    remaining_matches: R,
    leader_credits: leaderCredits,
    adjusted_gap: G_adj,
    required_threshold: threshold,
    explanation,
  };
}

/**
 * Pasal 42: Golden Boot Goal Aggregation
 * Combines player card versions of the same virtual player (base_player_id or normalized name),
 * excludes own goals, shootout, reconstruction-only, and forfeit goals.
 */
export function calculateGoldenBoot(
  goalEvents: MatchGoalEvent[],
  confirmedMatchIds: Set<string>
): GoldenBootEntry[] {
  const map = new Map<
    string,
    {
      cardId: string | null;
      basePlayerId: number | null;
      playerName: string;
      participantId: ParticipantId;
      totalGoals: number;
      versions: Set<string>;
    }
  >();

  for (const ev of goalEvents) {
    // Only count goals from confirmed matches
    if (!confirmedMatchIds.has(ev.match_id)) continue;
    // Exclude own goals
    if (ev.is_own_goal) continue;
    // Exclude reconstruction-only own goals
    if (ev.is_reconstruction_only) continue;

    const cleanName = ev.scorer_player_name.trim();
    if (!cleanName) continue;

    const baseId = ev.scorer_base_player_id ? Number(ev.scorer_base_player_id) : null;
    const key = baseId
      ? `${ev.scoring_participant_id}::base_${baseId}`
      : `${ev.scoring_participant_id}::name_${cleanName.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, {
        cardId: ev.scorer_card_id || null,
        basePlayerId: baseId,
        playerName: cleanName,
        participantId: ev.scoring_participant_id,
        totalGoals: 0,
        versions: new Set<string>(),
      });
    }

    const entry = map.get(key)!;
    entry.totalGoals += 1;
    if (ev.scorer_card_id && !entry.cardId) {
      entry.cardId = ev.scorer_card_id;
    }
    if (ev.scorer_card_version) {
      entry.versions.add(ev.scorer_card_version);
    }
  }

  const results: GoldenBootEntry[] = Array.from(map.values()).map((data) => ({
    card_id: data.cardId,
    base_player_id: data.basePlayerId,
    player_name: data.playerName,
    participant_id: data.participantId,
    total_goals: data.totalGoals,
    card_versions: Array.from(data.versions),
  }));

  return results.sort((a, b) => b.total_goals - a.total_goals);
}

/**
 * Pasal 42A: Playmaker of the Season S1 (Top Assist)
 * Aggregates all valid assists per virtual player across different card versions.
 * Assist entries belong to the participant whose team scored (scoring_participant_id).
 * Excludes own goals, unconfirmed matches, and reconstruction goals.
 */
export function calculatePlaymakerAward(
  goalEvents: MatchGoalEvent[],
  confirmedMatchIds: Set<string>
): PlaymakerEntry[] {
  const map = new Map<
    string,
    {
      cardId: string | null;
      basePlayerId: number | null;
      playerName: string;
      participantId: ParticipantId;
      totalAssists: number;
      versions: Set<string>;
    }
  >();

  for (const ev of goalEvents) {
    // Only count assists from confirmed matches
    if (!confirmedMatchIds.has(ev.match_id)) continue;
    // Exclude own goals
    if (ev.is_own_goal) continue;
    // Exclude reconstruction-only own goals
    if (ev.is_reconstruction_only) continue;
    // Assist player name must be present
    if (!ev.assist_player_name) continue;

    const cleanName = ev.assist_player_name.trim();
    if (!cleanName) continue;

    const baseId = ev.assist_base_player_id ? Number(ev.assist_base_player_id) : null;
    const key = baseId
      ? `${ev.scoring_participant_id}::base_${baseId}`
      : `${ev.scoring_participant_id}::name_${cleanName.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, {
        cardId: ev.assist_card_id || null,
        basePlayerId: baseId,
        playerName: cleanName,
        participantId: ev.scoring_participant_id,
        totalAssists: 0,
        versions: new Set<string>(),
      });
    }

    const entry = map.get(key)!;
    entry.totalAssists += 1;
    if (ev.assist_card_id && !entry.cardId) {
      entry.cardId = ev.assist_card_id;
    }
    if (ev.assist_card_version) {
      entry.versions.add(ev.assist_card_version);
    }
  }

  const results: PlaymakerEntry[] = Array.from(map.values()).map((data) => ({
    card_id: data.cardId,
    base_player_id: data.basePlayerId,
    player_name: data.playerName,
    participant_id: data.participantId,
    total_assists: data.totalAssists,
    card_versions: Array.from(data.versions),
  }));

  return results.sort((a, b) => b.total_assists - a.total_assists);
}

/**
 * Pasal 44: Golden Glove Individual Clean-Sheet Eligibility
 * Goalkeeper must start and remain on the pitch until final whistle.
 * Combines card versions of the same virtual goalkeeper (goalkeeper_base_player_id or normalized name).
 * Excludes matches that ended in forfeit or Technical Win.
 */
export function calculateGoldenGlove(
  gkRecords: GoalkeeperMatchRecord[],
  matches: Match[]
): GoldenGloveEntry[] {
  const matchMap = new Map<string, Match>(matches.map((m) => [m.id, m]));
  const map = new Map<
    string,
    {
      cardId: string | null;
      basePlayerId: number | null;
      goalkeeperName: string;
      participantId: ParticipantId;
      cleanSheets: number;
      versions: Set<string>;
    }
  >();

  for (const rec of gkRecords) {
    const match = matchMap.get(rec.match_id);
    if (!match || !isOfficialMatch(match)) continue;

    // Forfeit and Technical Win do NOT produce clean sheets
    if (
      ['forfeit_pa', 'forfeit_pb', 'double_forfeit', 'technical_win_pa', 'technical_win_pb'].includes(
        match.result_type
      )
    ) {
      continue;
    }

    // Must be starter and remain until whistle
    if (!rec.is_starter || !rec.remained_full_match) continue;

    // Check if team conceded zero goals
    const isHome = match.home_participant_id === rec.participant_id;
    const goalsConceded = isHome
      ? match.et_played
        ? (match.away_et_score ?? match.away_score ?? 0)
        : (match.away_score ?? 0)
      : match.et_played
      ? (match.home_et_score ?? match.home_score ?? 0)
      : (match.home_score ?? 0);

    if (goalsConceded === 0) {
      const cleanName = rec.goalkeeper_name.trim();
      if (!cleanName) continue;
      const baseId = rec.goalkeeper_base_player_id ? Number(rec.goalkeeper_base_player_id) : null;
      const key = baseId
        ? `${rec.participant_id}::base_${baseId}`
        : `${rec.participant_id}::name_${cleanName.toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          cardId: rec.goalkeeper_card_id || null,
          basePlayerId: baseId,
          goalkeeperName: cleanName,
          participantId: rec.participant_id,
          cleanSheets: 0,
          versions: new Set<string>(),
        });
      }
      const entry = map.get(key)!;
      entry.cleanSheets += 1;
      if (rec.goalkeeper_card_id && !entry.cardId) {
        entry.cardId = rec.goalkeeper_card_id;
      }
      if (rec.goalkeeper_card_version) {
        entry.versions.add(rec.goalkeeper_card_version);
      }
    }
  }

  const results: GoldenGloveEntry[] = Array.from(map.values()).map((data) => ({
    card_id: data.cardId,
    base_player_id: data.basePlayerId,
    goalkeeper_name: data.goalkeeperName,
    participant_id: data.participantId,
    clean_sheets: data.cleanSheets,
    card_versions: Array.from(data.versions),
  }));

  return results.sort((a, b) => b.clean_sheets - a.clean_sheets);
}

/**
 * Pasal 14 & Pasal 17: Validate Squad before Locking
 * Enforces max 26 cards, no duplicate virtual players (base_player_id), and minimum 2 Trending cards.
 */
export function validateSquadForLock(
  cards: Array<{
    base_player_id?: number | null;
    player_name: string;
    card_version?: string | null;
    is_trending?: number | boolean | null;
    is_indonesian?: number | boolean | null;
  }>
): {
  valid: boolean;
  totalCards: number;
  trendingCount: number;
  indonesianCount: number;
  duplicatePlayers: string[];
  errors: string[];
} {
  const totalCards = cards.length;
  const trendingCount = cards.filter((c) => Number(c.is_trending) === 1).length;
  const indonesianCount = cards.filter((c) => Number(c.is_indonesian) === 1).length;

  const seenVirtual = new Map<string, string>();
  const duplicatePlayers: string[] = [];

  for (const c of cards) {
    const virtualKey = c.base_player_id
      ? `base_${c.base_player_id}`
      : `name_${c.player_name.trim().toLowerCase()}`;
    if (seenVirtual.has(virtualKey)) {
      const existingName = seenVirtual.get(virtualKey)!;
      if (!duplicatePlayers.includes(existingName)) {
        duplicatePlayers.push(existingName);
      }
    } else {
      seenVirtual.set(virtualKey, c.player_name);
    }
  }

  const errors: string[] = [];

  if (totalCards === 0) {
    errors.push('Skuad masih kosong. Pilih kartu pemain terlebih dahulu sebelum mengunci skuad.');
  }
  if (totalCards > 26) {
    errors.push(
      `Total kartu melebihi batas: terdaftar ${totalCards} kartu dari maksimal 26 kartu (kelebihan ${totalCards - 26} kartu, Pasal 14 ayat 1).`
    );
  }
  if (trendingCount < 2) {
    errors.push(
      `Syarat kartu Trending belum terpenuhi: baru ada ${trendingCount} kartu Trending dari minimal 2 kartu Trending wajib (kurang ${2 - trendingCount} kartu Trending, Pasal 14 ayat 4 & Pasal 17).`
    );
  }
  if (duplicatePlayers.length > 0) {
    errors.push(
      `Terdapat kartu kembar dari pemain virtual yang sama (${duplicatePlayers.join(', ')}). Setiap pemain virtual hanya boleh memiliki satu kartu di dalam skuad (Pasal 14 ayat 3).`
    );
  }

  return {
    valid: errors.length === 0,
    totalCards,
    trendingCount,
    indonesianCount,
    duplicatePlayers,
    errors,
  };
}

/**
 * Pasal 17: Evaluate Per-Matchday Trending Card Compliance
 * Requires at least 1 full regular half (45 mins) with >= 2 Trending players simultaneously on the pitch.
 */
export function evaluateMatchTrendingCompliance(
  quotaCredit?: Partial<MatchQuotaCredit> | null
): {
  compliant: boolean;
  firstHalf: boolean;
  secondHalf: boolean;
  explanation: string;
} {
  const firstHalf = Number(quotaCredit?.trending_first_half ?? 0) === 1;
  const secondHalf = Number(quotaCredit?.trending_second_half ?? 0) === 1;
  const compliant = firstHalf || secondHalf;

  let explanation = '';
  if (firstHalf && secondHalf) {
    explanation = 'Memenuhi syarat (Babak 1 & Babak 2 penuh dengan ≥2 pemain Trending bersamaan).';
  } else if (firstHalf) {
    explanation = 'Memenuhi syarat (Babak 1 penuh dengan ≥2 pemain Trending bersamaan).';
  } else if (secondHalf) {
    explanation = 'Memenuhi syarat (Babak 2 penuh dengan ≥2 pemain Trending bersamaan).';
  } else {
    explanation = 'Tidak memenuhi syarat Pasal 17 (Belum ada babak reguler penuh dengan ≥2 pemain Trending bersamaan).';
  }

  return { compliant, firstHalf, secondHalf, explanation };
}

/**
 * Pasal 46: Longest Sporting Winning Streak
 * Excludes forfeit wins and coin-toss Technical Wins.
 */
export function calculateWinningStreak(
  matches: Match[],
  participantId: ParticipantId
): number {
  const officialMatches = matches.filter(isOfficialMatch);

  // Chronological order
  const sorted = [...officialMatches].sort((a, b) => {
    if (a.played_at && b.played_at) {
      return new Date(a.played_at).getTime() - new Date(b.played_at).getTime();
    }
    return a.md_number - b.md_number;
  });

  let maxStreak = 0;
  let currentStreak = 0;

  for (const m of sorted) {
    const pts = calculateMatchPoints(m);
    const isWinner = pts.winnerId === participantId;

    // Check if it was a sporting win
    // Forfeit and Technical Win do NOT count as sporting wins
    const isAdministrative = ['forfeit_pa', 'forfeit_pb', 'technical_win_pa', 'technical_win_pb'].includes(m.result_type);

    if (isWinner && !isAdministrative) {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Pasal 43: Goal of the Season Ranked Voting & Tiebreaker
 * 1st = 4 pts, 2nd = 3 pts, 3rd = 2 pts, 4th = 1 pt.
 * Tiebreaker: higher points from opponent (non-owner). Co-winners if still tied.
 */
export function calculateGoalOfTheSeason(
  nominations: GoalNomination[],
  ballots: AwardBallot[]
): GoalOfTheSeasonResult[] {
  if (nominations.length === 0) return [];

  const eligibleNominations = nominations.filter(n => n.status === 'official');
  const nScores = new Map<string, { totalPoints: number; opponentPoints: number }>();

  for (const nom of eligibleNominations) {
    nScores.set(nom.id, { totalPoints: 0, opponentPoints: 0 });
  }

  const pointWeights = [4, 3, 2, 1];

  for (const ballot of ballots) {
    if (!ballot.is_locked || !ballot.rankings) continue;

    ballot.rankings.forEach((nomId, index) => {
      if (!nScores.has(nomId)) return;
      const points = pointWeights[index] ?? 0;
      const scoreData = nScores.get(nomId)!;
      scoreData.totalPoints += points;

      // Find owner of nomination
      const nom = eligibleNominations.find(n => n.id === nomId);
      if (nom && nom.participant_id !== ballot.participant_id) {
        // Points awarded by opponent
        scoreData.opponentPoints += points;
      }
    });
  }

  const results: GoalOfTheSeasonResult[] = eligibleNominations.map(nom => {
    const s = nScores.get(nom.id) ?? { totalPoints: 0, opponentPoints: 0 };
    return {
      nomination_id: nom.id,
      title: nom.title,
      scorer_name: nom.scorer_name,
      participant_id: nom.participant_id,
      video_url: nom.video_url,
      total_points: s.totalPoints,
      opponent_points: s.opponentPoints,
      rank: 1,
      is_winner: false,
      is_co_winner: false,
    };
  });

  // Sort by total points, then opponent points tiebreaker
  results.sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }
    return b.opponent_points - a.opponent_points;
  });

  if (results.length > 0) {
    const topScore = results[0].total_points;
    const topOpponent = results[0].opponent_points;

    // Check for co-winners
    const winners = results.filter(r => r.total_points === topScore && r.opponent_points === topOpponent);
    const isCo = winners.length > 1;

    let currentRank = 1;
    results.forEach((r, idx) => {
      if (idx > 0) {
        const prev = results[idx - 1];
        if (r.total_points < prev.total_points || r.opponent_points < prev.opponent_points) {
          currentRank = idx + 1;
        }
      }
      r.rank = currentRank;
      if (r.total_points === topScore && r.opponent_points === topOpponent) {
        r.is_winner = true;
        r.is_co_winner = isCo;
      } else {
        r.is_winner = false;
        r.is_co_winner = false;
      }
    });
  }

  return results;
}
