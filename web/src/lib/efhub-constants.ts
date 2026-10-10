// eFHUB / eFootball Data Constants, Mappings, and Image Fallback Helpers

export const PLAYER_TYPE_MAP: Record<number, string> = {
  1: 'Standard',
  2: 'Featured',
  3: 'Trending',
  4: 'Legend',
  5: 'Epic',
  6: 'Highlight',
  7: 'Big Time',
  8: 'Show Time',
};

export const POSITION_MAP: Record<number, string> = {
  0: 'GK',
  1: 'CB',
  2: 'LB',
  3: 'RB',
  4: 'DMF',
  5: 'CMF',
  6: 'LMF',
  7: 'RMF',
  8: 'AMF',
  9: 'LWF',
  10: 'RWF',
  11: 'SS',
  12: 'CF',
};

export const POSITION_LIST = [
  { id: 0, code: 'GK', group: 'GK' },
  { id: 1, code: 'CB', group: 'DEF' },
  { id: 2, code: 'LB', group: 'DEF' },
  { id: 3, code: 'RB', group: 'DEF' },
  { id: 4, code: 'DMF', group: 'MID' },
  { id: 5, code: 'CMF', group: 'MID' },
  { id: 6, code: 'LMF', group: 'MID' },
  { id: 7, code: 'RMF', group: 'MID' },
  { id: 8, code: 'AMF', group: 'MID' },
  { id: 9, code: 'LWF', group: 'FWD' },
  { id: 10, code: 'RWF', group: 'FWD' },
  { id: 11, code: 'SS', group: 'FWD' },
  { id: 12, code: 'CF', group: 'FWD' },
] as const;

export const PLAYSTYLE_MAP: Record<number, string> = {
  0: 'None',
  1: 'Goal Poacher',
  2: 'Dummy Runner',
  3: 'Fox In The Box',
  4: 'Prolific Winger',
  5: 'Classic No. 10',
  6: 'Hole Player',
  7: 'Box To Box',
  8: 'Anchor Man',
  9: 'Destroyer',
  10: 'Extra Frontman',
  11: 'Offensive Wingback',
  12: 'Defensive Full-back',
  13: 'Deep-Lying Forward',
  14: 'Creative Playmaker',
  15: 'Build Up',
  16: 'Offensive Goalkeeper',
  17: 'Defensive Goalkeeper',
  18: 'Roaming Flank',
  19: 'Cross Specialist',
  20: 'Orchestrator',
  21: 'Full-back Finisher',
  22: 'Target Man',
  23: 'Press Back',
  24: 'Front Line Pressure',
  25: 'Front Line Poacher',
  26: 'Attack Outlet',
  27: 'All Action Defender',
  28: 'Pass Disruptor',
  29: 'Covering Role',
  30: 'High Line Master',
  31: 'Tough Marker',
  32: 'Deep Defender',
  33: 'Sweeper GK',
  34: 'Build-up GK',
  35: 'High Line GK',
};

export const OFFENSIVE_PLAYSTYLES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 35,
].map((id) => ({ id, label: PLAYSTYLE_MAP[id] }));

export const DEFENSIVE_PLAYSTYLES = [
  9, 16, 17, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
].map((id) => ({ id, label: PLAYSTYLE_MAP[id] }));

export const STAT_DEFINITIONS = [
  // Attacking
  { key: 'OffensiveAwareness', maxKey: 'MAXOffensiveAwareness', short: 'OAW', label: 'Offensive Awareness', group: 'Attacking' },
  { key: 'BallControl', maxKey: 'MAXBallControl', short: 'BCT', label: 'Ball Control', group: 'Attacking' },
  { key: 'Dribbling', maxKey: 'MAXDribbling', short: 'DRI', label: 'Dribbling', group: 'Attacking' },
  { key: 'TightPossession', maxKey: 'MAXTightPossession', short: 'TPO', label: 'Tight Possession', group: 'Attacking' },
  { key: 'LowPass', maxKey: 'MAXLowPass', short: 'LPA', label: 'Low Pass', group: 'Attacking' },
  { key: 'LoftedPass', maxKey: 'MAXLoftedPass', short: 'LFP', label: 'Lofted Pass', group: 'Attacking' },
  { key: 'Finishing', maxKey: 'MAXFinishing', short: 'FIN', label: 'Finishing', group: 'Attacking' },
  { key: 'Heading', maxKey: 'MAXHeading', short: 'HEA', label: 'Heading', group: 'Attacking' },
  { key: 'PlaceKicking', maxKey: 'MAXPlaceKicking', short: 'PKI', label: 'Set Piece Taking', group: 'Attacking' },
  { key: 'Curl', maxKey: 'MAXCurl', short: 'CRL', label: 'Curl', group: 'Attacking' },
  // Defending
  { key: 'DefensiveAwareness', maxKey: 'MAXDefensiveAwareness', short: 'DAW', label: 'Defensive Awareness', group: 'Defending' },
  { key: 'DefensiveEngagement', maxKey: 'MAXDefensiveEngagement', short: 'DEN', label: 'Defensive Engagement', group: 'Defending' },
  { key: 'BallWinning', maxKey: 'MAXBallWinning', short: 'BWI', label: 'Tackling', group: 'Defending' },
  { key: 'Aggression', maxKey: 'MAXAggression', short: 'AGG', label: 'Aggression', group: 'Defending' },
  // Athleticism
  { key: 'Speed', maxKey: 'MAXSpeed', short: 'SPD', label: 'Speed', group: 'Athleticism' },
  { key: 'Acceleration', maxKey: 'MAXAcceleration', short: 'ACC', label: 'Acceleration', group: 'Athleticism' },
  { key: 'KickingPower', maxKey: 'MAXKickingPower', short: 'KPW', label: 'Kicking Power', group: 'Athleticism' },
  { key: 'Jump', maxKey: 'MAXJump', short: 'JMP', label: 'Jumping', group: 'Athleticism' },
  { key: 'PhysicalContact', maxKey: 'MAXPhysicalContact', short: 'PHY', label: 'Physical Contact', group: 'Athleticism' },
  { key: 'Balance', maxKey: 'MAXBalance', short: 'BAL', label: 'Balance', group: 'Athleticism' },
  { key: 'Stamina', maxKey: 'MAXStamina', short: 'STA', label: 'Stamina', group: 'Athleticism' },
  // Goalkeeping
  { key: 'GKAwareness', maxKey: 'MAXGKAwareness', short: 'GKA', label: 'GK Awareness', group: 'Goalkeeping' },
  { key: 'GKCatching', maxKey: 'MAXGKCatching', short: 'GKC', label: 'GK Catching', group: 'Goalkeeping' },
  { key: 'GKClearing', maxKey: 'MAXGKClearing', short: 'GKP', label: 'GK Parrying', group: 'Goalkeeping' },
  { key: 'GKReflexes', maxKey: 'MAXGKReflexes', short: 'GKR', label: 'GK Reflexes', group: 'Goalkeeping' },
  { key: 'GKReach', maxKey: 'MAXGKReach', short: 'GKRCH', label: 'GK Reach', group: 'Goalkeeping' },
] as const;

export interface TopStatItem {
  k: string; // short code e.g. 'SPD'
  l: string; // full label e.g. 'Speed'
  v: number; // stat value
}

export interface EfootballPlayerSummary {
  card_id: string;
  base_player_id: number;
  name: string;
  accented_name: string;
  player_type: number;
  card_type_label: string;
  variation_name: string | null;
  registered_position: number;
  position_label: string;
  playing_style: number;
  playing_style_label: string | null;
  playing_style_defensive: number;
  playing_style_defensive_label: string | null;
  overall_lv1: number;
  overall_max: number;
  level_cap: number;
  country_id: number;
  country_name: string;
  is_indonesian: number;
  is_trending: number;
  club_id: number;
  team_name: string;
  league_name: string;
  height: number;
  weight: number;
  age: number;
  stronger_foot: number;
  condition_rating: number;
  stars: number;
  top6_lv1: TopStatItem[];
  top6_max: TopStatItem[];
}

export interface EfootballPlayerDetail extends EfootballPlayerSummary {
  stats_lv1: Record<string, number>;
  stats_max: Record<string, number>;
  skills: string[];
  positions: {
    proficiency: Record<string, number>; // 0, 1, 2
    lv1: Record<string, number>;
    max: Record<string, number>;
    boosted: Record<string, number>;
  };
}

/**
 * Generates the ordered list of fallback image URLs for a player card.
 * Uses NEXT_PUBLIC_PLAYER_IMAGE_BASE_URL if defined, falling back to efimg.com upstream.
 * Browser image component iterates through these URLs on error and falls back to monogram.
 */
export function getPlayerImageCandidateUrls(
  cardId: string | number,
  basePlayerId?: number | null
): string[] {
  const cid = String(cardId);
  const bid = basePlayerId ? String(basePlayerId) : String(Number(BigInt(cid) & 0xffffffn));
  const envBase = (process.env.NEXT_PUBLIC_PLAYER_IMAGE_BASE_URL || '').trim().replace(/\/+$/, '');
  const upstreamBase = 'https://efimg.com/efootballhub22/images/Player';

  const bases = envBase ? [envBase, upstreamBase] : [upstreamBase];
  const filenames =
    cid !== bid
      ? [`${cid}_l.png`, `${cid}_.png`, `${bid}_.png`, `${bid}_l.png`]
      : [`${cid}_.png`, `${cid}_l.png`];

  const urls: string[] = [];
  for (const b of bases) {
    for (const fn of filenames) {
      const url = `${b}/${fn}`;
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }
  return urls;
}

/**
 * Returns eFHUB color tier for a stat value (40..105+)
 */
export function getStatTierColor(val: number): string {
  if (val >= 90) return '#00e5bc'; // Cyan/Teal 90+
  if (val >= 80) return '#4ade80'; // Green 80-89
  if (val >= 70) return '#facc15'; // Yellow 70-79
  return '#f87171'; // Red <70
}
