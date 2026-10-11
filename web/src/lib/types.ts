// RIVALS SERIES SEASON 1 (RS S1) SHARED DATA TYPES

export type ParticipantId = 'participant_a' | 'participant_b';

export interface Participant {
  id: ParticipantId;
  display_name: string;
  monogram: string;
  color?: string | null;
  auth_email?: string | null;
  avatar_url?: string | null;
  is_admin: number;
  profile_completed?: number;
  pin_updated_at?: string | null;
  failed_login_attempts?: number;
  locked_until?: string | null;
  last_audit_seen_at?: string | null;
}

export type MatchPhase = 'group_stage' | 'knockout_stage';

export type MatchStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'reconstructed'
  | 'forfeited'
  | 'technical_win'
  | 'disputed'
  | 'postponed';

export type ResultType = 
  | 'normal'
  | 'reconstructed'
  | 'forfeit_pa'
  | 'forfeit_pb'
  | 'double_forfeit'
  | 'technical_win_pa'
  | 'technical_win_pb';

export type ConfirmationStatus = 
  | 'pending'
  | 'confirmed_both'
  | 'admin_auto_confirmed'
  | 'disputed';

export interface MatchSettings {
  phase: MatchPhase;
  phaseLabel: string;
  durationMinutes: number;
  condition: string;
  maxSubstitutions: number;
  maxSubWindows: number;
  extraTimeAllowed: boolean;
  penaltiesAllowed: boolean;
  drawAllowed: boolean;
}

export interface Match {
  id: string; // MD1, MD2, ...
  md_number: number;
  phase: MatchPhase;
  status: MatchStatus;
  result_type: ResultType;
  home_participant_id: ParticipantId;
  away_participant_id: ParticipantId;
  played_at?: string | null;
  reported_at?: string | null;
  reported_by?: ParticipantId | null;
  confirmation_status: ConfirmationStatus;
  confirmed_by_pa_at?: string | null;
  confirmed_by_pb_at?: string | null;
  admin_auto_confirmed_at?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  et_played: number;
  home_et_score?: number | null;
  away_et_score?: number | null;
  pk_played: number;
  home_pk_score?: number | null;
  away_pk_score?: number | null;
  winner_id?: ParticipantId | null;
  is_draw: number;
  points_home: number;
  points_away: number;
  admin_notes?: string | null;
  match_report_text?: string | null;
  result_screenshot_url?: string | null;
  lineup_screenshot_shared_wa: number;
}

export interface MatchGoalEvent {
  id: string;
  match_id: string;
  scoring_participant_id: ParticipantId;
  scorer_card_id?: string | null;
  scorer_base_player_id?: number | null;
  scorer_player_name: string;
  scorer_card_version?: string | null;
  minute?: number | null;
  period: 'regular_first_half' | 'regular_second_half' | 'extra_time_first_half' | 'extra_time_second_half';
  is_own_goal: number;
  is_reconstruction_only: number;
  assist_player_name?: string | null;
  assist_card_id?: string | null;
  assist_base_player_id?: number | null;
  assist_card_version?: string | null;
}

export interface GoalkeeperMatchRecord {
  id: string;
  match_id: string;
  participant_id: ParticipantId;
  goalkeeper_card_id?: string | null;
  goalkeeper_base_player_id?: number | null;
  goalkeeper_name: string;
  goalkeeper_card_version?: string | null;
  is_starter: number;
  remained_full_match: number;
  clean_sheet_eligible: number;
}

export interface MatchQuotaCredit {
  id: string;
  match_id: string;
  participant_id: ParticipantId;
  first_half_credit: number; // 0 or 1
  second_half_credit: number; // 0 or 1
  indonesia_in_dsp: number; // 0 or 1
  trending_first_half: number; // 0 or 1 (2 Trending players simultaneously full 1st half)
  trending_second_half: number; // 0 or 1 (2 Trending players simultaneously full 2nd half)
  notes?: string | null;
}

export interface RosterPhaseStatus {
  phase: number;
  is_locked: number;
  locked_at?: string | null;
  locked_by?: string | null;
  pa_locked: number;
  pa_locked_at?: string | null;
  pb_locked: number;
  pb_locked_at?: string | null;
  both_locked: boolean;
  md10_completed: boolean;
}

export interface RosterCard {
  id: string;
  participant_id: ParticipantId;
  roster_phase: number;
  efootball_card_id?: string | null;
  base_player_id?: number | null;
  player_name: string;
  card_version: string;
  card_category?: string | null;
  is_trending: number;
  nationality?: string | null;
  is_indonesian: number;
  position?: string | null;
  overall_lv1?: number | null;
  overall_max?: number | null;
  slot_code?: string | null;
  is_active: number;
  created_at?: string | null;
  // Enriched from efootball_players join when available
  club_name?: string | null;
  playing_style?: number | null;
  playing_style_label?: string | null;
  player_type?: number | null;
  player_type_label?: string | null;
  top6_lv1?: Array<{ key: string; label: string; val: number }>;
  top6_max?: Array<{ key: string; label: string; val: number }>;
}

export type SanctionType = 
  | 'birdcaging_warning'
  | 'birdcaging_point_deduction'
  | 'birdcaging_forfeit'
  | 'trending_forfeit'
  | 'dsp_forfeit'
  | 'quota_deduction'
  | 'third_interruption_forfeit'
  | 'administrative_correction';

export interface Sanction {
  id: string;
  participant_id: ParticipantId;
  type: SanctionType;
  points_deduction: number;
  related_match_id?: string | null;
  rule_article: string;
  reason: string;
  decision_date: string;
  is_active: number;
}

export interface ParticipantStanding {
  rank: number;
  participant_id: ParticipantId;
  display_name: string;
  monogram: string;
  mp: number; // Matches Played
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number; // gf - ga
  points: number; // match earned points minus active sanctions
  raw_points: number; // points before sanctions
  sanction_deductions: number;
  id_credits: number; // achieved credits / 5
  id_credits_remaining: number; // 5 - achieved
  id_quota_at_risk: boolean; // true if credits < 5 and potential 3-pt deduction applies
  final_quota_deducted: boolean; // applied after MD20 if credits < 5
  clean_sheets: number; // team clean sheets
  wins_knockout: number; // wins in MD11-MD20
  gd_knockout: number; // GD in MD11-MD20
  gf_knockout: number; // GF in MD11-MD20
  form: Array<'W' | 'D' | 'L'>;
}

export interface EarlyChampionCalculation {
  is_secured: boolean;
  leader_id?: ParticipantId | null;
  leader_name?: string | null;
  points_gap: number; // G
  remaining_matches: number; // R
  leader_credits: number;
  adjusted_gap: number; // G_adj (G - 3 if credits < 5, else G)
  required_threshold: number; // 3 * R
  explanation: string;
}

export interface GoldenBootEntry {
  base_player_id?: number | null;
  player_name: string;
  participant_id: ParticipantId;
  total_goals: number;
  card_versions: string[];
}

export interface GoldenGloveEntry {
  base_player_id?: number | null;
  goalkeeper_name: string;
  participant_id: ParticipantId;
  clean_sheets: number;
  card_versions?: string[];
}

export interface GoalNomination {
  id: string;
  participant_id: ParticipantId;
  match_id: string;
  scorer_name: string;
  title: string;
  description?: string | null;
  video_url: string;
  status: 'draft' | 'official';
  submitted_at?: string | null;
}

export interface AwardBallot {
  participant_id: ParticipantId;
  is_locked: boolean;
  locked_at?: string | null;
  rankings: string[]; // Nomination IDs in ordered preference 1st -> 4th
}

export interface GoalOfTheSeasonResult {
  nomination_id: string;
  title: string;
  scorer_name: string;
  participant_id: ParticipantId;
  video_url: string;
  total_points: number;
  opponent_points: number; // Tiebreaker: points given by non-owner
  rank: number;
  is_winner: boolean;
  is_co_winner: boolean;
}

export interface SeasonSettings {
  id: string;
  season_name: string;
  game_title: string;
  status: 'setup' | 'live' | 'completed';
  total_matchdays: number;
  match_duration_minutes: number;
  player_condition: string;
  max_substitutions: number;
  max_sub_windows: number;
  current_roster_phase: number;
  coin_toss_tool_name?: string | null;
  coin_toss_tool_url?: string | null;
  coin_toss_mapping?: string | null;
  ai_adjudicator_service?: string | null;
  champion_id?: string | null;
  early_champion_secured: number;
  player_a_color: string;
  player_b_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface ResetRequest {
  id: string;
  requested_by: ParticipantId;
  reset_mode: 'results_only' | 'total_reset';
  status: 'pending_approval' | 'approved' | 'rejected' | 'executed';
  archive_json?: string | null;
  confirmation_phrase: string;
  partner_approved_at?: string | null;
  partner_rejection_reason?: string | null;
  executed_at?: string | null;
  created_at: string;
}

export interface SeasonInvite {
  id: string;
  created_by: ParticipantId;
  target_participant_id: ParticipantId;
  code_hint: string;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  expires_at: string;
  used_at?: string | null;
  created_at: string;
}


