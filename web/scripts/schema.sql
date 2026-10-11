-- RIVALS SERIES SEASON 1 (RS S1) DATABASE SCHEMA FOR TURSO (LIBSQL)
-- Built for 2-participant eFootball 1v1 competition with strict audit integrity

-- 1. PARTICIPANTS (Exactly 2 equal-peer participants)
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY CHECK(id IN ('participant_a', 'participant_b')),
  display_name TEXT NOT NULL,
  auth_email TEXT UNIQUE,
  monogram TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#E5A93B',
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  pin_hash TEXT,
  pin_updated_at TEXT,
  profile_completed INTEGER NOT NULL DEFAULT 0,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_audit_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. SEASON SETTINGS
CREATE TABLE IF NOT EXISTS season_settings (
  id TEXT PRIMARY KEY DEFAULT 'season_1',
  season_name TEXT NOT NULL DEFAULT 'Rivals Series Season 1',
  game_title TEXT NOT NULL DEFAULT 'eFootball™ Friend Match 1v1, Dream Team',
  status TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup', 'live', 'completed')),
  total_matchdays INTEGER NOT NULL DEFAULT 20,
  match_duration_minutes INTEGER NOT NULL DEFAULT 8,
  player_condition TEXT NOT NULL DEFAULT 'Random',
  max_substitutions INTEGER NOT NULL DEFAULT 6,
  max_sub_windows INTEGER NOT NULL DEFAULT 6,
  current_roster_phase INTEGER NOT NULL DEFAULT 1 CHECK(current_roster_phase IN (1, 2)),
  coin_toss_tool_name TEXT DEFAULT 'Google Flip a Coin',
  coin_toss_tool_url TEXT DEFAULT 'https://www.google.com/search?q=flip+a+coin',
  coin_toss_mapping TEXT DEFAULT 'Heads = Peserta A, Tails = Peserta B',
  ai_adjudicator_service TEXT DEFAULT 'Claude 3.5 Sonnet / GPT-4o',
  champion_id TEXT REFERENCES participants(id),
  early_champion_secured INTEGER NOT NULL DEFAULT 0,
  player_a_color TEXT NOT NULL DEFAULT '#ffb02e',
  player_b_color TEXT NOT NULL DEFAULT '#3ec9e6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. ROSTER PHASES (Phase 1: MD1-MD10, Phase 2: MD11-MD20)
CREATE TABLE IF NOT EXISTS roster_phases (
  phase INTEGER PRIMARY KEY CHECK(phase IN (1, 2)),
  label TEXT NOT NULL,
  is_locked INTEGER NOT NULL DEFAULT 0,
  pa_locked INTEGER NOT NULL DEFAULT 0,
  pa_locked_at TEXT,
  pb_locked INTEGER NOT NULL DEFAULT 0,
  pb_locked_at TEXT,
  locked_at TEXT,
  locked_by TEXT REFERENCES participants(id),
  snapshot_hash TEXT
);

-- 4. ROSTER CARDS (Max 26 cards per participant per phase, max 1 card per virtual player / base_player_id)
CREATE TABLE IF NOT EXISTS roster_cards (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  roster_phase INTEGER NOT NULL CHECK(roster_phase IN (1, 2)),
  efootball_card_id TEXT,
  base_player_id INTEGER,
  player_name TEXT NOT NULL,
  card_version TEXT NOT NULL,
  card_category TEXT NOT NULL DEFAULT 'Standard',
  is_trending INTEGER NOT NULL DEFAULT 0,
  nationality TEXT NOT NULL,
  is_indonesian INTEGER NOT NULL DEFAULT 0,
  position TEXT,
  overall_lv1 INTEGER,
  overall_max INTEGER,
  slot_code TEXT,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. MATCHES (Exactly 20 Matchdays: MD1-MD20)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  md_number INTEGER NOT NULL UNIQUE CHECK(md_number BETWEEN 1 AND 20),
  phase TEXT NOT NULL CHECK(phase IN ('group_stage', 'knockout_stage')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'awaiting_confirmation', 'confirmed', 'reconstructed', 'forfeited', 'technical_win', 'disputed', 'postponed')),
  result_type TEXT NOT NULL DEFAULT 'normal' CHECK(result_type IN ('normal', 'reconstructed', 'forfeit_pa', 'forfeit_pb', 'double_forfeit', 'technical_win_pa', 'technical_win_pb')),
  home_participant_id TEXT NOT NULL DEFAULT 'participant_a' REFERENCES participants(id),
  away_participant_id TEXT NOT NULL DEFAULT 'participant_b' REFERENCES participants(id),
  played_at TEXT,
  reported_at TEXT,
  reported_by TEXT REFERENCES participants(id),
  confirmation_status TEXT NOT NULL DEFAULT 'pending' CHECK(confirmation_status IN ('pending', 'confirmed_both', 'admin_auto_confirmed', 'disputed')),
  confirmed_by_pa_at TEXT,
  confirmed_by_pb_at TEXT,
  admin_auto_confirmed_at TEXT,
  home_score INTEGER,
  away_score INTEGER,
  et_played INTEGER NOT NULL DEFAULT 0,
  home_et_score INTEGER,
  away_et_score INTEGER,
  pk_played INTEGER NOT NULL DEFAULT 0,
  home_pk_score INTEGER,
  away_pk_score INTEGER,
  winner_id TEXT REFERENCES participants(id),
  is_draw INTEGER NOT NULL DEFAULT 0,
  points_home INTEGER NOT NULL DEFAULT 0,
  points_away INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  match_report_text TEXT,
  result_screenshot_url TEXT,
  lineup_screenshot_shared_wa INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. MATCH GOAL EVENTS
CREATE TABLE IF NOT EXISTS match_goal_events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  scoring_participant_id TEXT NOT NULL REFERENCES participants(id),
  scorer_card_id TEXT,
  scorer_base_player_id INTEGER,
  scorer_player_name TEXT NOT NULL,
  scorer_card_version TEXT,
  minute INTEGER,
  period TEXT NOT NULL DEFAULT 'regular_first_half' CHECK(period IN ('regular_first_half', 'regular_second_half', 'extra_time_first_half', 'extra_time_second_half')),
  is_own_goal INTEGER NOT NULL DEFAULT 0,
  is_reconstruction_only INTEGER NOT NULL DEFAULT 0,
  assist_player_name TEXT,
  assist_card_id TEXT,
  assist_base_player_id INTEGER,
  assist_card_version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. GOALKEEPER MATCH RECORDS (For Golden Glove eligibility)
CREATE TABLE IF NOT EXISTS goalkeeper_match_records (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  goalkeeper_card_id TEXT,
  goalkeeper_base_player_id INTEGER,
  goalkeeper_name TEXT NOT NULL,
  is_starter INTEGER NOT NULL DEFAULT 1,
  remained_full_match INTEGER NOT NULL DEFAULT 1,
  clean_sheet_eligible INTEGER NOT NULL DEFAULT 0,
  UNIQUE(match_id, participant_id)
);

-- 8. MATCH QUOTA CREDITS (Trending & Indonesian Player full-half tracking)
CREATE TABLE IF NOT EXISTS match_quota_credits (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  first_half_credit INTEGER NOT NULL DEFAULT 0 CHECK(first_half_credit IN (0, 1)),
  second_half_credit INTEGER NOT NULL DEFAULT 0 CHECK(second_half_credit IN (0, 1)),
  indonesia_in_dsp INTEGER NOT NULL DEFAULT 1 CHECK(indonesia_in_dsp IN (0, 1)),
  trending_first_half INTEGER NOT NULL DEFAULT 1 CHECK(trending_first_half IN (0, 1)),
  trending_second_half INTEGER NOT NULL DEFAULT 0 CHECK(trending_second_half IN (0, 1)),
  notes TEXT,
  UNIQUE(match_id, participant_id)
);

-- 9. CONNECTION INCIDENTS
CREATE TABLE IF NOT EXISTS connection_incidents (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  interrupted_period TEXT NOT NULL,
  interrupted_minute INTEGER NOT NULL,
  interrupted_home_score INTEGER NOT NULL,
  interrupted_away_score INTEGER NOT NULL,
  attribution TEXT NOT NULL DEFAULT 'unknown' CHECK(attribution IN ('participant_a', 'participant_b', 'server_global', 'unknown')),
  attribution_evidence TEXT,
  reconstruction_status TEXT NOT NULL DEFAULT 'pending' CHECK(reconstruction_status IN ('pending', 'completed', 'fallback_coin_toss', 'forfeited_third_strike')),
  coin_toss_used INTEGER NOT NULL DEFAULT 0,
  coin_toss_result TEXT,
  coin_toss_video_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. DISPUTES
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  filed_by TEXT NOT NULL REFERENCES participants(id),
  rule_article TEXT NOT NULL,
  dispute_type TEXT NOT NULL,
  claim_summary TEXT NOT NULL,
  evidence_urls TEXT,
  response_text TEXT,
  response_evidence_urls TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'responded', 'adjudicated', 'status_quo_retained', 'resolved')),
  ai_model TEXT,
  ai_ruling_summary TEXT,
  ai_ruling_text TEXT,
  dispute_package_json TEXT,
  filed_at TEXT NOT NULL DEFAULT (datetime('now')),
  response_deadline_at TEXT,
  adjudicated_at TEXT
);

-- 11. SANCTIONS
CREATE TABLE IF NOT EXISTS sanctions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  type TEXT NOT NULL CHECK(type IN ('birdcaging_warning', 'birdcaging_point_deduction', 'birdcaging_forfeit', 'trending_forfeit', 'dsp_forfeit', 'quota_deduction', 'third_interruption_forfeit', 'administrative_correction')),
  points_deduction INTEGER NOT NULL DEFAULT 0,
  related_match_id TEXT REFERENCES matches(id),
  rule_article TEXT NOT NULL,
  reason TEXT NOT NULL,
  decision_date TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

-- 12. GOAL NOMINATIONS (Max 2 official nominations per participant)
CREATE TABLE IF NOT EXISTS goal_nominations (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  match_id TEXT NOT NULL REFERENCES matches(id),
  scorer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'official')),
  submitted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. AWARD BALLOTS (Private ranked voting 4-3-2-1)
CREATE TABLE IF NOT EXISTS award_ballots (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL UNIQUE REFERENCES participants(id),
  is_locked INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  rankings_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. AUDIT EVENTS (Append-only history with cryptographic hash chain)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES participants(id),
  actor_name TEXT,
  category TEXT NOT NULL DEFAULT 'setup',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT NOT NULL,
  rule_article TEXT,
  device_info TEXT,
  prev_hash TEXT,
  entry_hash TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'Jejak audit bersifat tambah-saja (append-only): perubahan data dilarang');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'Jejak audit bersifat tambah-saja (append-only): penghapusan data dilarang');
END;

-- 15. REGULATIONS AMENDMENTS (Appendix E)
CREATE TABLE IF NOT EXISTS regulations_amendments (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  article_affected TEXT NOT NULL,
  summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  approved_by_both INTEGER NOT NULL DEFAULT 1,
  effective_matchday INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. RESET REQUESTS (Mutual Consent Reset Protocol)
CREATE TABLE IF NOT EXISTS reset_requests (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL REFERENCES participants(id),
  reset_mode TEXT NOT NULL CHECK(reset_mode IN ('results_only', 'total_reset')),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'approved', 'rejected', 'executed')),
  archive_json TEXT,
  confirmation_phrase TEXT NOT NULL,
  partner_approved_at TEXT,
  partner_rejection_reason TEXT,
  executed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 17. EFOOTBALL PLAYERS LOOKUP TABLE (Populated manually via pnpm sync:players)
-- Lightweight columns are queried for search/list; heavy JSON columns are fetched only on detail/compare.
CREATE TABLE IF NOT EXISTS efootball_players (
  card_id TEXT PRIMARY KEY,
  base_player_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  accented_name TEXT NOT NULL,
  name_search TEXT NOT NULL,
  player_type INTEGER NOT NULL,
  card_type_label TEXT NOT NULL,
  variation_name TEXT,
  registered_position INTEGER NOT NULL,
  position_label TEXT NOT NULL,
  playing_style INTEGER NOT NULL DEFAULT 0,
  playing_style_label TEXT,
  playing_style_defensive INTEGER NOT NULL DEFAULT 0,
  playing_style_defensive_label TEXT,
  overall_lv1 INTEGER NOT NULL,
  overall_max INTEGER NOT NULL,
  level_cap INTEGER NOT NULL DEFAULT 1,
  country_id INTEGER NOT NULL DEFAULT 0,
  country_name TEXT NOT NULL DEFAULT '-',
  is_indonesian INTEGER NOT NULL DEFAULT 0,
  is_trending INTEGER NOT NULL DEFAULT 0,
  club_id INTEGER NOT NULL DEFAULT 0,
  team_name TEXT NOT NULL DEFAULT '-',
  league_name TEXT NOT NULL DEFAULT '-',
  height INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 0,
  age INTEGER NOT NULL DEFAULT 0,
  stronger_foot INTEGER NOT NULL DEFAULT 0,
  condition_rating INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  top6_lv1_json TEXT NOT NULL DEFAULT '[]',
  top6_max_json TEXT NOT NULL DEFAULT '[]',
  stats_lv1_json TEXT NOT NULL DEFAULT '{}',
  stats_max_json TEXT NOT NULL DEFAULT '{}',
  skills_json TEXT NOT NULL DEFAULT '[]',
  positions_json TEXT NOT NULL DEFAULT '{}',
  datapack_id INTEGER NOT NULL DEFAULT 0
);

-- 18. SQUAD SHORTLIST ("My Team" candidate pool per participant)
CREATE TABLE IF NOT EXISTS squad_shortlist (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  card_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(participant_id, card_id)
);

-- 19. SEASON INVITES (One-time expiring invite tokens for the second player in /setup)
CREATE TABLE IF NOT EXISTS season_invites (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES participants(id),
  target_participant_id TEXT NOT NULL REFERENCES participants(id),
  token_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'used', 'expired', 'revoked')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_matches_md_number ON matches(md_number);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_roster_cards_participant ON roster_cards(participant_id, roster_phase);
CREATE INDEX IF NOT EXISTS idx_goal_events_match ON match_goal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ef_players_name_search ON efootball_players(name_search);
CREATE INDEX IF NOT EXISTS idx_ef_players_base_id ON efootball_players(base_player_id);
CREATE INDEX IF NOT EXISTS idx_ef_players_pos_ovr ON efootball_players(registered_position, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_type_ovr ON efootball_players(player_type, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_indo_ovr ON efootball_players(is_indonesian, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_trending_ovr ON efootball_players(is_trending, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_club ON efootball_players(team_name, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_country ON efootball_players(country_name, overall_max DESC);
CREATE INDEX IF NOT EXISTS idx_ef_players_ovr_max ON efootball_players(overall_max DESC, overall_lv1 DESC);
CREATE INDEX IF NOT EXISTS idx_shortlist_participant ON squad_shortlist(participant_id);
CREATE INDEX IF NOT EXISTS idx_season_invites_token ON season_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_season_invites_status ON season_invites(status);


