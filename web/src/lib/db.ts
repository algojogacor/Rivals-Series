// RIVALS SERIES SEASON 1 (RS S1) DATABASE ACCESS LAYER
// Powered by Turso (LibSQL) with query helpers, mutations, and audit logging

import { createClient, Client } from '@libsql/client';
import {
  Participant,
  ParticipantId,
  Match,
  MatchGoalEvent,
  GoalkeeperMatchRecord,
  MatchQuotaCredit,
  Sanction,
  GoalNomination,
  AwardBallot,
  SeasonSettings,
  ResetRequest,
  RosterCard,
  RosterPhaseStatus,
} from './types';

let cachedClient: Client | null = null;

export function getDbClient(): Client {
  if (cachedClient) return cachedClient;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL environment variable is required.');
  }

  cachedClient = createClient({
    url,
    authToken: authToken || undefined,
  });

  return cachedClient;
}

export async function getParticipants(): Promise<Participant[]> {
  try {
    const db = getDbClient();
    const res = await db.execute('SELECT * FROM participants ORDER BY id ASC;');
    return res.rows.map(r => ({
      id: r.id as ParticipantId,
      display_name: String(r.display_name),
      monogram: String(r.monogram),
      auth_email: r.auth_email ? String(r.auth_email) : null,
      avatar_url: r.avatar_url ? String(r.avatar_url) : null,
      is_admin: Number(r.is_admin),
    }));
  } catch (err) {
    console.error('Failed to load participants from DB, using fallback defaults:', err);
    return [
      { id: 'participant_a', display_name: 'Peserta A', monogram: 'PA', is_admin: 1 },
      { id: 'participant_b', display_name: 'Peserta B', monogram: 'PB', is_admin: 0 },
    ];
  }
}

export async function getSeasonSettings(): Promise<SeasonSettings | null> {
  try {
    const db = getDbClient();
    const res = await db.execute({
      sql: "SELECT * FROM season_settings WHERE id = 'season_1';",
      args: [],
    });
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: String(r.id),
      season_name: String(r.season_name || 'Rivals Series Season 1'),
      game_title: String(r.game_title || 'eFootball™ Friend Match 1v1, Dream Team'),
      status: (r.status as any) || 'setup',
      total_matchdays: Number(r.total_matchdays || 20),
      match_duration_minutes: Number(r.match_duration_minutes || 8),
      player_condition: String(r.player_condition || 'Random'),
      max_substitutions: Number(r.max_substitutions || 6),
      max_sub_windows: Number(r.max_sub_windows || 6),
      current_roster_phase: Number(r.current_roster_phase || 1),
      coin_toss_tool_name: r.coin_toss_tool_name ? String(r.coin_toss_tool_name) : null,
      coin_toss_tool_url: r.coin_toss_tool_url ? String(r.coin_toss_tool_url) : null,
      coin_toss_mapping: r.coin_toss_mapping ? String(r.coin_toss_mapping) : null,
      ai_adjudicator_service: r.ai_adjudicator_service ? String(r.ai_adjudicator_service) : null,
      champion_id: r.champion_id ? String(r.champion_id) : null,
      early_champion_secured: Number(r.early_champion_secured || 0),
      player_a_color: r.player_a_color ? String(r.player_a_color) : '#ffb02e',
      player_b_color: r.player_b_color ? String(r.player_b_color) : '#3ec9e6',
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    };
  } catch (err) {
    console.error('Failed to load season_settings from DB, using fallback defaults:', err);
    return {
      id: 'season_1',
      season_name: 'Rivals Series Season 1',
      game_title: 'eFootball™ Friend Match 1v1, Dream Team',
      status: 'live', // fallback so layout does not force redirect when DB is unreachable
      total_matchdays: 20,
      match_duration_minutes: 8,
      player_condition: 'Random',
      max_substitutions: 6,
      max_sub_windows: 6,
      current_roster_phase: 1,
      early_champion_secured: 0,
      player_a_color: '#ffb02e',
      player_b_color: '#3ec9e6',
    };
  }
}

export async function getAllMatches(): Promise<Match[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM matches ORDER BY md_number ASC;');
  return res.rows.map(r => ({
    id: String(r.id),
    md_number: Number(r.md_number),
    phase: r.phase as any,
    status: r.status as any,
    result_type: r.result_type as any,
    home_participant_id: r.home_participant_id as ParticipantId,
    away_participant_id: r.away_participant_id as ParticipantId,
    played_at: r.played_at ? String(r.played_at) : null,
    reported_at: r.reported_at ? String(r.reported_at) : null,
    reported_by: r.reported_by ? (r.reported_by as ParticipantId) : null,
    confirmation_status: r.confirmation_status as any,
    confirmed_by_pa_at: r.confirmed_by_pa_at ? String(r.confirmed_by_pa_at) : null,
    confirmed_by_pb_at: r.confirmed_by_pb_at ? String(r.confirmed_by_pb_at) : null,
    admin_auto_confirmed_at: r.admin_auto_confirmed_at ? String(r.admin_auto_confirmed_at) : null,
    home_score: r.home_score !== null ? Number(r.home_score) : null,
    away_score: r.away_score !== null ? Number(r.away_score) : null,
    et_played: Number(r.et_played || 0),
    home_et_score: r.home_et_score !== null ? Number(r.home_et_score) : null,
    away_et_score: r.away_et_score !== null ? Number(r.away_et_score) : null,
    pk_played: Number(r.pk_played || 0),
    home_pk_score: r.home_pk_score !== null ? Number(r.home_pk_score) : null,
    away_pk_score: r.away_pk_score !== null ? Number(r.away_pk_score) : null,
    winner_id: r.winner_id ? (r.winner_id as ParticipantId) : null,
    is_draw: Number(r.is_draw || 0),
    points_home: Number(r.points_home || 0),
    points_away: Number(r.points_away || 0),
    admin_notes: r.admin_notes ? String(r.admin_notes) : null,
    match_report_text: r.match_report_text ? String(r.match_report_text) : null,
    result_screenshot_url: r.result_screenshot_url ? String(r.result_screenshot_url) : null,
    lineup_screenshot_shared_wa: Number(r.lineup_screenshot_shared_wa || 0),
  }));
}

export async function getMatchByMd(mdNumber: number): Promise<Match | null> {
  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM matches WHERE md_number = ?;',
    args: [mdNumber],
  });
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: String(r.id),
    md_number: Number(r.md_number),
    phase: r.phase as any,
    status: r.status as any,
    result_type: r.result_type as any,
    home_participant_id: r.home_participant_id as ParticipantId,
    away_participant_id: r.away_participant_id as ParticipantId,
    played_at: r.played_at ? String(r.played_at) : null,
    reported_at: r.reported_at ? String(r.reported_at) : null,
    reported_by: r.reported_by ? (r.reported_by as ParticipantId) : null,
    confirmation_status: r.confirmation_status as any,
    confirmed_by_pa_at: r.confirmed_by_pa_at ? String(r.confirmed_by_pa_at) : null,
    confirmed_by_pb_at: r.confirmed_by_pb_at ? String(r.confirmed_by_pb_at) : null,
    admin_auto_confirmed_at: r.admin_auto_confirmed_at ? String(r.admin_auto_confirmed_at) : null,
    home_score: r.home_score !== null ? Number(r.home_score) : null,
    away_score: r.away_score !== null ? Number(r.away_score) : null,
    et_played: Number(r.et_played || 0),
    home_et_score: r.home_et_score !== null ? Number(r.home_et_score) : null,
    away_et_score: r.away_et_score !== null ? Number(r.away_et_score) : null,
    pk_played: Number(r.pk_played || 0),
    home_pk_score: r.home_pk_score !== null ? Number(r.home_pk_score) : null,
    away_pk_score: r.away_pk_score !== null ? Number(r.away_pk_score) : null,
    winner_id: r.winner_id ? (r.winner_id as ParticipantId) : null,
    is_draw: Number(r.is_draw || 0),
    points_home: Number(r.points_home || 0),
    points_away: Number(r.points_away || 0),
    admin_notes: r.admin_notes ? String(r.admin_notes) : null,
    match_report_text: r.match_report_text ? String(r.match_report_text) : null,
    result_screenshot_url: r.result_screenshot_url ? String(r.result_screenshot_url) : null,
    lineup_screenshot_shared_wa: Number(r.lineup_screenshot_shared_wa || 0),
  };
}

export async function getAllGoalEvents(matchId?: string): Promise<MatchGoalEvent[]> {
  const db = getDbClient();
  const sql = matchId 
    ? 'SELECT * FROM match_goal_events WHERE match_id = ? ORDER BY minute ASC;'
    : 'SELECT * FROM match_goal_events ORDER BY match_id ASC, minute ASC;';
  const args = matchId ? [matchId] : [];
  const res = await db.execute({ sql, args });

  return res.rows.map(r => ({
    id: String(r.id),
    match_id: String(r.match_id),
    scoring_participant_id: r.scoring_participant_id as ParticipantId,
    scorer_card_id: r.scorer_card_id ? String(r.scorer_card_id) : null,
    scorer_base_player_id: r.scorer_base_player_id ? Number(r.scorer_base_player_id) : null,
    scorer_player_name: String(r.scorer_player_name),
    scorer_card_version: r.scorer_card_version ? String(r.scorer_card_version) : null,
    minute: r.minute !== null ? Number(r.minute) : null,
    period: r.period as any,
    is_own_goal: Number(r.is_own_goal || 0),
    is_reconstruction_only: Number(r.is_reconstruction_only || 0),
  }));
}

export async function getAllGoalkeeperRecords(matchId?: string): Promise<GoalkeeperMatchRecord[]> {
  const db = getDbClient();
  const sql = matchId 
    ? 'SELECT * FROM goalkeeper_match_records WHERE match_id = ?;'
    : 'SELECT * FROM goalkeeper_match_records;';
  const args = matchId ? [matchId] : [];
  const res = await db.execute({ sql, args });

  return res.rows.map(r => ({
    id: String(r.id),
    match_id: String(r.match_id),
    participant_id: r.participant_id as ParticipantId,
    goalkeeper_card_id: r.goalkeeper_card_id ? String(r.goalkeeper_card_id) : null,
    goalkeeper_base_player_id: r.goalkeeper_base_player_id ? Number(r.goalkeeper_base_player_id) : null,
    goalkeeper_name: String(r.goalkeeper_name),
    goalkeeper_card_version: r.goalkeeper_card_version ? String(r.goalkeeper_card_version) : null,
    is_starter: Number(r.is_starter || 1),
    remained_full_match: Number(r.remained_full_match || 1),
    clean_sheet_eligible: Number(r.clean_sheet_eligible || 0),
  }));
}

export async function getAllQuotaCredits(matchId?: string): Promise<MatchQuotaCredit[]> {
  const db = getDbClient();
  const sql = matchId 
    ? 'SELECT * FROM match_quota_credits WHERE match_id = ?;'
    : 'SELECT * FROM match_quota_credits;';
  const args = matchId ? [matchId] : [];
  const res = await db.execute({ sql, args });

  return res.rows.map(r => ({
    id: String(r.id),
    match_id: String(r.match_id),
    participant_id: r.participant_id as ParticipantId,
    first_half_credit: Number(r.first_half_credit || 0),
    second_half_credit: Number(r.second_half_credit || 0),
    indonesia_in_dsp: Number(r.indonesia_in_dsp || 1),
    trending_first_half: r.trending_first_half !== undefined ? Number(r.trending_first_half) : 1,
    trending_second_half: r.trending_second_half !== undefined ? Number(r.trending_second_half) : 0,
    notes: r.notes ? String(r.notes) : null,
  }));
}

export async function getAllSanctions(): Promise<Sanction[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM sanctions WHERE is_active = 1 ORDER BY decision_date DESC;');
  return res.rows.map(r => ({
    id: String(r.id),
    participant_id: r.participant_id as ParticipantId,
    type: r.type as any,
    points_deduction: Number(r.points_deduction || 0),
    related_match_id: r.related_match_id ? String(r.related_match_id) : null,
    rule_article: String(r.rule_article),
    reason: String(r.reason),
    decision_date: String(r.decision_date),
    is_active: Number(r.is_active || 1),
  }));
}

export async function getAllGoalNominations(): Promise<GoalNomination[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM goal_nominations ORDER BY created_at DESC;');
  return res.rows.map(r => ({
    id: String(r.id),
    participant_id: r.participant_id as ParticipantId,
    match_id: String(r.match_id),
    scorer_name: String(r.scorer_name),
    title: String(r.title),
    description: r.description ? String(r.description) : null,
    video_url: String(r.video_url),
    status: r.status as any,
    submitted_at: r.submitted_at ? String(r.submitted_at) : null,
  }));
}

export async function getAllAwardBallots(): Promise<AwardBallot[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM award_ballots;');
  return res.rows.map(r => ({
    participant_id: r.participant_id as ParticipantId,
    is_locked: Boolean(r.is_locked),
    locked_at: r.locked_at ? String(r.locked_at) : null,
    rankings: r.rankings_json ? JSON.parse(String(r.rankings_json)) : [],
  }));
}

export async function getAllDisputes(): Promise<any[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM disputes ORDER BY filed_at DESC;');
  return res.rows.map((r) => ({
    id: String(r.id),
    match_id: String(r.match_id),
    filed_by: r.filed_by as ParticipantId,
    reason: String(r.reason),
    rule_article: r.rule_article ? String(r.rule_article) : null,
    evidence_notes: r.evidence_notes ? String(r.evidence_notes) : null,
    evidence_url: r.evidence_url ? String(r.evidence_url) : null,
    status: String(r.status),
    resolution_notes: r.resolution_notes ? String(r.resolution_notes) : null,
    resolved_by: r.resolved_by ? String(r.resolved_by) : null,
    resolved_at: r.resolved_at ? String(r.resolved_at) : null,
    filed_at: String(r.filed_at),
  }));
}

export async function getAllAuditEvents(): Promise<any[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 100;');
  return res.rows.map((r) => ({
    id: String(r.id),
    actor_id: r.actor_id as ParticipantId,
    action: String(r.action),
    entity_type: String(r.entity_type),
    entity_id: String(r.entity_id),
    before_json: r.before_json ? String(r.before_json) : null,
    after_json: r.after_json ? String(r.after_json) : null,
    reason: String(r.reason),
    rule_article: r.rule_article ? String(r.rule_article) : null,
    timestamp: String(r.timestamp),
  }));
}

export async function getRosterPhaseStatus(phase: number = 1): Promise<RosterPhaseStatus> {
  try {
    const db = getDbClient();
    const [phaseRes, md10Res] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM roster_phases WHERE phase = ?;',
        args: [phase],
      }),
      db.execute({
        sql: "SELECT status FROM matches WHERE md_number = 10 LIMIT 1;",
        args: [],
      }),
    ]);

    const md10Status = md10Res.rows[0]?.status ? String(md10Res.rows[0].status) : 'scheduled';
    const md10Completed = ['confirmed', 'reconstructed', 'forfeited', 'technical_win'].includes(md10Status);

    if (phaseRes.rows.length === 0) {
      return {
        phase,
        is_locked: 0,
        locked_at: null,
        locked_by: null,
        pa_locked: 0,
        pa_locked_at: null,
        pb_locked: 0,
        pb_locked_at: null,
        both_locked: false,
        md10_completed: md10Completed,
      };
    }

    const r = phaseRes.rows[0];
    const paLocked = Number(r.pa_locked ?? 0);
    const pbLocked = Number(r.pb_locked ?? 0);
    const isLocked = Number(r.is_locked ?? 0) === 1 || (paLocked === 1 && pbLocked === 1) ? 1 : 0;

    return {
      phase: Number(r.phase || phase),
      is_locked: isLocked,
      locked_at: r.locked_at ? String(r.locked_at) : null,
      locked_by: r.locked_by ? String(r.locked_by) : null,
      pa_locked: paLocked,
      pa_locked_at: r.pa_locked_at ? String(r.pa_locked_at) : null,
      pb_locked: pbLocked,
      pb_locked_at: r.pb_locked_at ? String(r.pb_locked_at) : null,
      both_locked: paLocked === 1 && pbLocked === 1,
      md10_completed: md10Completed,
    };
  } catch (err) {
    console.error('getRosterPhaseStatus error:', err);
    return {
      phase,
      is_locked: 0,
      locked_at: null,
      locked_by: null,
      pa_locked: 0,
      pa_locked_at: null,
      pb_locked: 0,
      pb_locked_at: null,
      both_locked: false,
      md10_completed: false,
    };
  }
}

export async function getAllRosterCards(phase: number = 1): Promise<RosterCard[]> {
  const db = getDbClient();
  try {
    const res = await db.execute({
      sql: `SELECT
              rc.*,
              ep.club_name as ep_club_name,
              ep.playing_style as ep_playing_style,
              ep.playing_style_label as ep_playing_style_label,
              ep.player_type as ep_player_type,
              ep.player_type_label as ep_player_type_label,
              ep.top6_lv1 as ep_top6_lv1,
              ep.top6_max as ep_top6_max,
              ep.overall_lv1 as ep_overall_lv1,
              ep.overall_max as ep_overall_max,
              ep.position as ep_position
            FROM roster_cards rc
            LEFT JOIN efootball_players ep ON rc.efootball_card_id = ep.card_id
            WHERE rc.roster_phase = ? AND rc.is_active = 1
            ORDER BY rc.participant_id ASC, COALESCE(rc.overall_max, ep.overall_max, 0) DESC, rc.player_name ASC;`,
      args: [phase],
    });
    return res.rows.map((r) => ({
      id: String(r.id),
      participant_id: r.participant_id as ParticipantId,
      roster_phase: Number(r.roster_phase || 1),
      efootball_card_id: r.efootball_card_id ? String(r.efootball_card_id) : null,
      base_player_id: r.base_player_id ? Number(r.base_player_id) : null,
      player_name: String(r.player_name),
      card_version: String(r.card_version),
      card_category: r.card_category ? String(r.card_category) : null,
      is_trending: Number(r.is_trending ?? 0),
      nationality: r.nationality ? String(r.nationality) : null,
      is_indonesian: Number(r.is_indonesian || 0),
      position: r.position ? String(r.position) : r.ep_position ? String(r.ep_position) : null,
      overall_lv1: r.overall_lv1 !== null && r.overall_lv1 !== undefined ? Number(r.overall_lv1) : r.ep_overall_lv1 ? Number(r.ep_overall_lv1) : null,
      overall_max: r.overall_max !== null && r.overall_max !== undefined ? Number(r.overall_max) : r.ep_overall_max ? Number(r.ep_overall_max) : null,
      slot_code: r.slot_code ? String(r.slot_code) : null,
      is_active: Number(r.is_active || 1),
      created_at: r.created_at ? String(r.created_at) : null,
      club_name: r.ep_club_name ? String(r.ep_club_name) : null,
      playing_style: r.ep_playing_style ? Number(r.ep_playing_style) : null,
      playing_style_label: r.ep_playing_style_label ? String(r.ep_playing_style_label) : null,
      player_type: r.ep_player_type ? Number(r.ep_player_type) : null,
      player_type_label: r.ep_player_type_label ? String(r.ep_player_type_label) : null,
      top6_lv1: r.ep_top6_lv1 ? JSON.parse(String(r.ep_top6_lv1)) : [],
      top6_max: r.ep_top6_max ? JSON.parse(String(r.ep_top6_max)) : [],
    }));
  } catch {
    const res = await db.execute({
      sql: 'SELECT * FROM roster_cards WHERE roster_phase = ? AND is_active = 1 ORDER BY participant_id ASC, player_name ASC;',
      args: [phase],
    });
    return res.rows.map((r) => ({
      id: String(r.id),
      participant_id: r.participant_id as ParticipantId,
      roster_phase: Number(r.roster_phase || 1),
      efootball_card_id: r.efootball_card_id ? String(r.efootball_card_id) : null,
      base_player_id: r.base_player_id ? Number(r.base_player_id) : null,
      player_name: String(r.player_name),
      card_version: String(r.card_version),
      card_category: r.card_category ? String(r.card_category) : null,
      is_trending: Number(r.is_trending ?? 0),
      nationality: r.nationality ? String(r.nationality) : null,
      is_indonesian: Number(r.is_indonesian || 0),
      position: r.position ? String(r.position) : null,
      overall_lv1: r.overall_lv1 ? Number(r.overall_lv1) : null,
      overall_max: r.overall_max ? Number(r.overall_max) : null,
      slot_code: r.slot_code ? String(r.slot_code) : null,
      is_active: Number(r.is_active || 1),
      created_at: r.created_at ? String(r.created_at) : null,
    }));
  }
}

/**
 * Pasal 14: Server-side opponent squad secrecy enforcement.
 * Until BOTH participants have locked their squads for a given phase,
 * a participant's squad is NEVER returned to the opponent or anonymous visitors.
 */
export async function getVisibleRosterCards(
  phase: number = 1,
  viewerParticipantId?: ParticipantId | null
): Promise<{
  cards: RosterCard[];
  phaseStatus: RosterPhaseStatus;
  paCount: number;
  pbCount: number;
  paTrendingCount: number;
  pbTrendingCount: number;
  paIndoCount: number;
  pbIndoCount: number;
}> {
  const [allCards, phaseStatus] = await Promise.all([
    getAllRosterCards(phase),
    getRosterPhaseStatus(phase),
  ]);

  const paCards = allCards.filter((c) => c.participant_id === 'participant_a');
  const pbCards = allCards.filter((c) => c.participant_id === 'participant_b');

  const summary = {
    phaseStatus,
    paCount: paCards.length,
    pbCount: pbCards.length,
    paTrendingCount: paCards.filter((c) => c.is_trending === 1).length,
    pbTrendingCount: pbCards.filter((c) => c.is_trending === 1).length,
    paIndoCount: paCards.filter((c) => c.is_indonesian === 1).length,
    pbIndoCount: pbCards.filter((c) => c.is_indonesian === 1).length,
  };

  if (phaseStatus.both_locked) {
    return { cards: allCards, ...summary };
  }

  if (!viewerParticipantId) {
    return { cards: [], ...summary };
  }

  return {
    cards: allCards.filter((c) => c.participant_id === viewerParticipantId),
    ...summary,
  };
}

export async function getShortlistCards(participantId: ParticipantId): Promise<any[]> {
  try {
    const db = getDbClient();
    const res = await db.execute({
      sql: `SELECT
              ss.id as shortlist_id,
              ss.created_at as shortlisted_at,
              ep.card_id,
              ep.base_player_id,
              ep.name,
              ep.position,
              ep.overall_lv1,
              ep.overall_max,
              ep.player_type,
              ep.player_type_label,
              ep.variation_name,
              ep.club_name,
              ep.nationality_name,
              ep.is_trending,
              ep.is_indonesian,
              ep.playing_style,
              ep.playing_style_label,
              ep.top6_lv1,
              ep.top6_max
            FROM squad_shortlist ss
            JOIN efootball_players ep ON ss.card_id = ep.card_id
            WHERE ss.participant_id = ?
            ORDER BY ss.created_at DESC;`,
      args: [participantId],
    });
    return res.rows.map((r) => ({
      shortlist_id: String(r.shortlist_id),
      card_id: String(r.card_id),
      base_player_id: Number(r.base_player_id),
      name: String(r.name),
      position: String(r.position),
      overall_lv1: Number(r.overall_lv1),
      overall_max: Number(r.overall_max),
      player_type: Number(r.player_type),
      player_type_label: String(r.player_type_label),
      variation_name: String(r.variation_name || ''),
      club_name: String(r.club_name || ''),
      nationality_name: String(r.nationality_name || ''),
      is_trending: Number(r.is_trending || 0),
      is_indonesian: Number(r.is_indonesian || 0),
      playing_style: Number(r.playing_style || 0),
      playing_style_label: String(r.playing_style_label || 'None'),
      top6_lv1: r.top6_lv1 ? JSON.parse(String(r.top6_lv1)) : [],
      top6_max: r.top6_max ? JSON.parse(String(r.top6_max)) : [],
    }));
  } catch (err) {
    console.error('getShortlistCards error:', err);
    return [];
  }
}

export async function getRegulationsAmendments(): Promise<any[]> {
  const db = getDbClient();
  const res = await db.execute('SELECT * FROM regulations_amendments ORDER BY created_at DESC;');
  return res.rows.map((r) => ({
    id: String(r.id),
    proposal_text: String(r.proposal_text),
    proposed_by: r.proposed_by as ParticipantId,
    status: String(r.status),
    approved_by_partner_at: r.approved_by_partner_at ? String(r.approved_by_partner_at) : null,
    created_at: String(r.created_at),
  }));
}

export async function getPendingResetRequest(): Promise<ResetRequest | null> {
  try {
    const db = getDbClient();
    const res = await db.execute("SELECT * FROM reset_requests WHERE status = 'pending_approval' ORDER BY created_at DESC LIMIT 1;");
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: String(r.id),
      requested_by: r.requested_by as ParticipantId,
      reset_mode: r.reset_mode as 'results_only' | 'total_reset',
      status: r.status as any,
      archive_json: r.archive_json ? String(r.archive_json) : null,
      confirmation_phrase: String(r.confirmation_phrase),
      partner_approved_at: r.partner_approved_at ? String(r.partner_approved_at) : null,
      partner_rejection_reason: r.partner_rejection_reason ? String(r.partner_rejection_reason) : null,
      executed_at: r.executed_at ? String(r.executed_at) : null,
      created_at: String(r.created_at),
    };
  } catch (err) {
    console.error('getPendingResetRequest error:', err);
    return null;
  }
}

export async function getAllResetRequests(): Promise<ResetRequest[]> {
  try {
    const db = getDbClient();
    const res = await db.execute('SELECT * FROM reset_requests ORDER BY created_at DESC;');
    return res.rows.map(r => ({
      id: String(r.id),
      requested_by: r.requested_by as ParticipantId,
      reset_mode: r.reset_mode as 'results_only' | 'total_reset',
      status: r.status as any,
      archive_json: r.archive_json ? String(r.archive_json) : null,
      confirmation_phrase: String(r.confirmation_phrase),
      partner_approved_at: r.partner_approved_at ? String(r.partner_approved_at) : null,
      partner_rejection_reason: r.partner_rejection_reason ? String(r.partner_rejection_reason) : null,
      executed_at: r.executed_at ? String(r.executed_at) : null,
      created_at: String(r.created_at),
    }));
  } catch (err) {
    console.error('getAllResetRequests error:', err);
    return [];
  }
}

/**
 * Record an audit log event (Pasal 23 & 50)
 */
export async function recordAuditEvent(params: {
  actorId: ParticipantId;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: any;
  afterJson?: any;
  reason: string;
  ruleArticle?: string;
}): Promise<void> {
  const db = getDbClient();
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.execute({
    sql: `INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, before_json, after_json, reason, rule_article, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
    args: [
      id,
      params.actorId,
      params.action,
      params.entityType,
      params.entityId,
      params.beforeJson ? JSON.stringify(params.beforeJson) : null,
      params.afterJson ? JSON.stringify(params.afterJson) : null,
      params.reason,
      params.ruleArticle || null,
    ],
  });
}
