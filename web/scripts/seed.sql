-- INITIAL SEED FOR RIVALS SERIES SEASON 1 (RS S1)
-- Initializes the 2 participants, season settings, roster phases, and MD1-MD20 in scheduled state.

-- Insert 2 Participants (Configurable display names)
INSERT OR IGNORE INTO participants (id, display_name, monogram, is_admin)
VALUES 
  ('participant_a', 'Peserta A', 'PA', 1),
  ('participant_b', 'Peserta B', 'PB', 0);

-- Insert Season Settings
INSERT OR IGNORE INTO season_settings (
  id, season_name, game_title, status, total_matchdays, 
  match_duration_minutes, player_condition, max_substitutions, max_sub_windows,
  current_roster_phase, coin_toss_tool_name, coin_toss_tool_url, coin_toss_mapping,
  ai_adjudicator_service, player_a_color, player_b_color
) VALUES (
  'season_1', 'Rivals Series Season 1', 'eFootball™ Friend Match 1v1, Dream Team', 'setup', 20,
  8, 'Random', 6, 6,
  1, 'Google Flip a Coin', 'https://www.google.com/search?q=flip+a+coin', 'Heads = Peserta A, Tails = Peserta B',
  'Claude 3.5 Sonnet / GPT-4o', '#ffb02e', '#3ec9e6'
);

-- Insert 2 Roster Phases
INSERT OR IGNORE INTO roster_phases (phase, label, is_locked)
VALUES 
  (1, 'Fase 1 (MD1–MD10)', 0),
  (2, 'Fase 2 (MD11–MD20)', 0);

-- Insert All 20 Regular Matches in Scheduled State (MD1 to MD20)
-- MD1-MD10: Group Stage (ET OFF, PK OFF)
-- MD11-MD20: Knockout Stage (ET ON, PK ON)
INSERT OR IGNORE INTO matches (id, md_number, phase, status, home_participant_id, away_participant_id)
VALUES
  ('MD1', 1, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD2', 2, 'group_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD3', 3, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD4', 4, 'group_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD5', 5, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD6', 6, 'group_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD7', 7, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD8', 8, 'group_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD9', 9, 'group_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD10', 10, 'group_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD11', 11, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD12', 12, 'knockout_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD13', 13, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD14', 14, 'knockout_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD15', 15, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD16', 16, 'knockout_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD17', 17, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD18', 18, 'knockout_stage', 'scheduled', 'participant_b', 'participant_a'),
  ('MD19', 19, 'knockout_stage', 'scheduled', 'participant_a', 'participant_b'),
  ('MD20', 20, 'knockout_stage', 'scheduled', 'participant_b', 'participant_a');
