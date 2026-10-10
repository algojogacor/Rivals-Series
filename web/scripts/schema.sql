-- RIVALS SERIES SEASON 1 (RS S1) DATABASE SCHEMA FOR TURSO (LIBSQL)
-- Built for 2-participant eFootball 1v1 competition with strict audit integrity

-- 1. PARTICIPANTS (Exactly 2 participants)
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY CHECK(id IN ('participant_a', 'participant_b')),
  display_name TEXT NOT NULL,
  auth_email TEXT UNIQUE,
  monogram TEXT NOT NULL,
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
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
  locked_at TEXT,
  locked_by TEXT REFERENCES participants(id),
  snapshot_hash TEXT
);

-- 4. ROSTER CARDS (Max 26 cards per participant per phase, max 1 card per virtual player / base_player_id)
CREATE TABLE IF NOT EXISTS roster_cards (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  roster_phase INTEGER NOT NULL CHECK(roster_phase IN (1, 2)),
  base_player_id INTEGER,
  player_name TEXT NOT NULL,
  card_version TEXT NOT NULL,
  card_category TEXT NOT NULL DEFAULT 'Standard',
  is_trending INTEGER NOT NULL DEFAULT 0,
  nationality TEXT NOT NULL,
  is_indonesian INTEGER NOT NULL DEFAULT 0,
  position TEXT,
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
  scorer_player_name TEXT NOT NULL,
  scorer_card_version TEXT,
  minute INTEGER,
  period TEXT NOT NULL DEFAULT 'regular_first_half' CHECK(period IN ('regular_first_half', 'regular_second_half', 'extra_time_first_half', 'extra_time_second_half')),
  is_own_goal INTEGER NOT NULL DEFAULT 0,
  is_reconstruction_only INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. GOALKEEPER MATCH RECORDS (For Golden Glove eligibility)
CREATE TABLE IF NOT EXISTS goalkeeper_match_records (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
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

-- 14. AUDIT EVENTS (Append-only history)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES participants(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT NOT NULL,
  rule_article TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_matches_md_number ON matches(md_number);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_roster_cards_participant ON roster_cards(participant_id, roster_phase);
CREATE INDEX IF NOT EXISTS idx_goal_events_match ON match_goal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
