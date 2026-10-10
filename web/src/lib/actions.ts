// RIVALS SERIES SEASON 1 (RS S1) SERVER ACTIONS
// All mutations enforce server-side validation, authentication, and immutable audit logs

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import { getSession, loginParticipant, logoutParticipant } from './auth';
import {
  getDbClient,
  recordAuditEvent,
  executeWithAudit,
  getMatchByMd,
  getAllMatches,
  getRosterPhaseStatus,
  getAllRosterCards,
  getParticipants,
  getSeasonSettings,
} from './db';
import { calculateMatchPoints, deriveMatchSettings, validateSquadForLock } from './engine';
import { ParticipantId, Match } from './types';

/**
 * 1. Submit Match Report
 */
export async function submitMatchReportAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk sebagai Peserta A atau Peserta B untuk melapor.' };
  }

  const mdNumber = Number(formData.get('md_number'));
  if (isNaN(mdNumber) || mdNumber < 1 || mdNumber > 20) {
    return { error: 'Nomor Matchday tidak valid (harus MD1 sampai MD20).' };
  }

  const matchSettings = deriveMatchSettings(mdNumber);

  const homeScore = Number(formData.get('home_score'));
  const awayScore = Number(formData.get('away_score'));

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    return { error: 'Skor waktu reguler harus berupa angka positif.' };
  }

  const etPlayed = formData.get('et_played') === 'true' || formData.get('et_played') === 'on';
  const homeEtScore = etPlayed ? Number(formData.get('home_et_score') ?? homeScore) : homeScore;
  const awayEtScore = etPlayed ? Number(formData.get('away_et_score') ?? awayScore) : awayScore;

  const pkPlayed = formData.get('pk_played') === 'true' || formData.get('pk_played') === 'on';
  const homePkScore = pkPlayed ? Number(formData.get('home_pk_score') ?? 0) : null;
  const awayPkScore = pkPlayed ? Number(formData.get('away_pk_score') ?? 0) : null;

  // Knockout stage validation: must yield a winner
  if (matchSettings.phase === 'knockout_stage') {
    if (homeEtScore === awayEtScore && (!pkPlayed || homePkScore === awayPkScore)) {
      return { error: 'Pada Knockout Stage (MD11-MD20), pertandingan yang selesai normal wajib menghasilkan pemenang melalui ET atau adu penalti.' };
    }
  }

  const matchReportText = formData.get('match_report_text')?.toString() || null;
  const resultScreenshotUrl = formData.get('result_screenshot_url')?.toString() || null;
  const lineupWaShared = formData.get('lineup_wa_shared') === 'true' || formData.get('lineup_wa_shared') === 'on';

  // Indonesian Player Credits & Trending attestation (Pasal 17, 18, 19)
  const paFirstCredit = formData.get('pa_first_half_credit') === '1' ? 1 : 0;
  const paSecondCredit = formData.get('pa_second_half_credit') === '1' ? 1 : 0;
  const pbFirstCredit = formData.get('pb_first_half_credit') === '1' ? 1 : 0;
  const pbSecondCredit = formData.get('pb_second_half_credit') === '1' ? 1 : 0;

  const paIndoInDsp = formData.get('pa_indonesia_in_dsp') === '0' ? 0 : 1;
  const pbIndoInDsp = formData.get('pb_indonesia_in_dsp') === '0' ? 0 : 1;

  const paTrendingFirst = formData.get('pa_trending_first_half') === '1' ? 1 : 0;
  const paTrendingSecond = formData.get('pa_trending_second_half') === '1' ? 1 : 0;
  const pbTrendingFirst = formData.get('pb_trending_first_half') === '1' ? 1 : 0;
  const pbTrendingSecond = formData.get('pb_trending_second_half') === '1' ? 1 : 0;

  const paGkName = formData.get('pa_gk_name')?.toString()?.trim() || 'Kiper Peserta A';
  const paGkCardId = formData.get('pa_gk_card_id')?.toString() || null;
  const paGkBaseIdRaw = formData.get('pa_gk_base_player_id')?.toString();
  const paGkBaseId = paGkBaseIdRaw ? Number(paGkBaseIdRaw) : null;
  const paGkCardVersion = formData.get('pa_gk_card_version')?.toString() || null;
  const paGkFull = formData.get('pa_gk_full') === '1' ? 1 : 0;

  const pbGkName = formData.get('pb_gk_name')?.toString()?.trim() || 'Kiper Peserta B';
  const pbGkCardId = formData.get('pb_gk_card_id')?.toString() || null;
  const pbGkBaseIdRaw = formData.get('pb_gk_base_player_id')?.toString();
  const pbGkBaseId = pbGkBaseIdRaw ? Number(pbGkBaseIdRaw) : null;
  const pbGkCardVersion = formData.get('pb_gk_card_version')?.toString() || null;
  const pbGkFull = formData.get('pb_gk_full') === '1' ? 1 : 0;

  const goalEventsJsonRaw = formData.get('goal_events_json')?.toString();
  let parsedGoals: Array<{
    scoring_participant_id: ParticipantId;
    scorer_card_id?: string | null;
    scorer_base_player_id?: number | null;
    scorer_player_name: string;
    scorer_card_version?: string | null;
    minute?: number | null;
    period?: string;
    is_own_goal?: number;
  }> = [];

  if (goalEventsJsonRaw) {
    try {
      const parsed = JSON.parse(goalEventsJsonRaw);
      if (Array.isArray(parsed)) {
        parsedGoals = parsed.filter((g) => g && g.scorer_player_name && g.scorer_player_name.trim());
      }
    } catch {
      parsedGoals = [];
    }
  }

  const matchId = `MD${mdNumber}`;
  const db = getDbClient();

  // Check existing match state for before_json (whether this is initial submission or report modification)
  const existingMatchRes = await db.execute({
    sql: 'SELECT * FROM matches WHERE id = ? LIMIT 1;',
    args: [matchId],
  });
  const existingMatch = existingMatchRes.rows[0];
  const isUpdate = Boolean(existingMatch && existingMatch.status !== 'scheduled');

  // Create temporary match object to derive points
  const tempMatch: Match = {
    id: matchId,
    md_number: mdNumber,
    phase: matchSettings.phase,
    status: 'awaiting_confirmation',
    result_type: 'normal',
    home_participant_id: 'participant_a',
    away_participant_id: 'participant_b',
    confirmation_status: 'pending',
    home_score: homeScore,
    away_score: awayScore,
    et_played: etPlayed ? 1 : 0,
    home_et_score: etPlayed ? homeEtScore : null,
    away_et_score: etPlayed ? awayEtScore : null,
    pk_played: pkPlayed ? 1 : 0,
    home_pk_score: homePkScore,
    away_pk_score: awayPkScore,
    is_draw: 0,
    points_home: 0,
    points_away: 0,
    lineup_screenshot_shared_wa: lineupWaShared ? 1 : 0,
  };

  const pointsCalc = calculateMatchPoints(tempMatch);
  const finalAwayGoals = etPlayed ? awayEtScore : awayScore;
  const finalHomeGoals = etPlayed ? homeEtScore : homeScore;

  const statements: InStatement[] = [];

  // 1. Update match record
  statements.push({
    sql: `UPDATE matches SET 
            status = 'awaiting_confirmation',
            result_type = 'normal',
            played_at = datetime('now'),
            reported_at = datetime('now'),
            reported_by = ?,
            confirmation_status = 'pending',
            confirmed_by_pa_at = ?,
            confirmed_by_pb_at = ?,
            admin_auto_confirmed_at = NULL,
            home_score = ?,
            away_score = ?,
            et_played = ?,
            home_et_score = ?,
            away_et_score = ?,
            pk_played = ?,
            home_pk_score = ?,
            away_pk_score = ?,
            winner_id = ?,
            is_draw = ?,
            points_home = ?,
            points_away = ?,
            match_report_text = ?,
            result_screenshot_url = ?,
            lineup_screenshot_shared_wa = ?,
            updated_at = datetime('now')
          WHERE id = ?;`,
    args: [
      session.participantId,
      session.participantId === 'participant_a' ? new Date().toISOString() : null,
      session.participantId === 'participant_b' ? new Date().toISOString() : null,
      homeScore,
      awayScore,
      etPlayed ? 1 : 0,
      etPlayed ? homeEtScore : null,
      etPlayed ? awayEtScore : null,
      pkPlayed ? 1 : 0,
      homePkScore,
      awayPkScore,
      pointsCalc.winnerId,
      pointsCalc.isDraw ? 1 : 0,
      pointsCalc.pointsHome,
      pointsCalc.pointsAway,
      matchReportText,
      resultScreenshotUrl,
      lineupWaShared ? 1 : 0,
      matchId,
    ],
  });

  // 2. Save Quota Credits & Per-MD Trending Compliance
  statements.push({
    sql: `INSERT INTO match_quota_credits (id, match_id, participant_id, first_half_credit, second_half_credit, indonesia_in_dsp, trending_first_half, trending_second_half)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            first_half_credit = excluded.first_half_credit,
            second_half_credit = excluded.second_half_credit,
            indonesia_in_dsp = excluded.indonesia_in_dsp,
            trending_first_half = excluded.trending_first_half,
            trending_second_half = excluded.trending_second_half;`,
    args: [`qc_${matchId}_pa`, matchId, 'participant_a', paFirstCredit, paSecondCredit, paIndoInDsp, paTrendingFirst, paTrendingSecond],
  });

  statements.push({
    sql: `INSERT INTO match_quota_credits (id, match_id, participant_id, first_half_credit, second_half_credit, indonesia_in_dsp, trending_first_half, trending_second_half)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            first_half_credit = excluded.first_half_credit,
            second_half_credit = excluded.second_half_credit,
            indonesia_in_dsp = excluded.indonesia_in_dsp,
            trending_first_half = excluded.trending_first_half,
            trending_second_half = excluded.trending_second_half;`,
    args: [`qc_${matchId}_pb`, matchId, 'participant_b', pbFirstCredit, pbSecondCredit, pbIndoInDsp, pbTrendingFirst, pbTrendingSecond],
  });

  // 3. Save Goalkeeper Records
  statements.push({
    sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_card_id, goalkeeper_base_player_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            goalkeeper_card_id = excluded.goalkeeper_card_id,
            goalkeeper_base_player_id = excluded.goalkeeper_base_player_id,
            goalkeeper_name = excluded.goalkeeper_name,
            remained_full_match = excluded.remained_full_match,
            clean_sheet_eligible = excluded.clean_sheet_eligible;`,
    args: [
      `gk_${matchId}_pa`,
      matchId,
      'participant_a',
      paGkCardId,
      paGkBaseId,
      paGkCardVersion ? `${paGkName}` : paGkName,
      paGkFull,
      finalAwayGoals === 0 && paGkFull === 1 ? 1 : 0,
    ],
  });

  statements.push({
    sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_card_id, goalkeeper_base_player_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            goalkeeper_card_id = excluded.goalkeeper_card_id,
            goalkeeper_base_player_id = excluded.goalkeeper_base_player_id,
            goalkeeper_name = excluded.goalkeeper_name,
            remained_full_match = excluded.remained_full_match,
            clean_sheet_eligible = excluded.clean_sheet_eligible;`,
    args: [
      `gk_${matchId}_pb`,
      matchId,
      'participant_b',
      pbGkCardId,
      pbGkBaseId,
      pbGkCardVersion ? `${pbGkName}` : pbGkName,
      pbGkFull,
      finalHomeGoals === 0 && pbGkFull === 1 ? 1 : 0,
    ],
  });

  // 4. Save Structured Goal Events
  statements.push({
    sql: 'DELETE FROM match_goal_events WHERE match_id = ?;',
    args: [matchId],
  });

  for (let i = 0; i < parsedGoals.length; i++) {
    const g = parsedGoals[i];
    const goalId = `goal_${matchId}_${i + 1}_${Date.now()}`;
    const validPeriods = [
      'regular_first_half',
      'regular_second_half',
      'extra_time_first_half',
      'extra_time_second_half',
    ];
    const period = validPeriods.includes(g.period || '') ? g.period! : 'regular_first_half';
    statements.push({
      sql: `INSERT INTO match_goal_events (
              id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
              scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      args: [
        goalId,
        matchId,
        g.scoring_participant_id,
        g.scorer_card_id || null,
        g.scorer_base_player_id ? Number(g.scorer_base_player_id) : null,
        g.scorer_player_name.trim(),
        g.scorer_card_version || null,
        g.minute ? Number(g.minute) : null,
        period,
        g.is_own_goal ? 1 : 0,
      ],
    });
  }

  const scoreSummary = `${homeScore}-${awayScore}${etPlayed ? ` (ET ${homeEtScore}-${awayEtScore})` : ''}${pkPlayed ? ` (PK ${homePkScore}-${awayPkScore})` : ''}`;
  const scorersSummary = parsedGoals.length > 0 ? parsedGoals.map((g) => g.scorer_player_name).join(', ') : 'Tanpa pencetak gol tercatat';

  // Execute all match mutations + audit log atomically
  await executeWithAudit(statements, {
    actorId: session.participantId,
    actorName: session.participant.display_name,
    category: 'match',
    action: isUpdate ? 'update_match_report' : 'submit_match_report',
    entityType: 'match',
    entityId: matchId,
    beforeJson: isUpdate
      ? {
          status: existingMatch.status,
          homeScore: existingMatch.home_score,
          awayScore: existingMatch.away_score,
          reportedBy: existingMatch.reported_by,
          resultScreenshotUrl: existingMatch.result_screenshot_url,
        }
      : null,
    afterJson: {
      score: scoreSummary,
      homeScore,
      awayScore,
      etPlayed,
      pkPlayed,
      scorers: parsedGoals.map((g) => ({
        player: g.scorer_player_name,
        minute: g.minute,
        team: g.scoring_participant_id,
      })),
      goalkeepers: {
        pa: { name: paGkName, fullMatch: Boolean(paGkFull) },
        pb: { name: pbGkName, fullMatch: Boolean(pbGkFull) },
      },
      indonesiaAttestation: {
        pa: { dsp: Boolean(paIndoInDsp), h1Credit: paFirstCredit, h2Credit: paSecondCredit },
        pb: { dsp: Boolean(pbIndoInDsp), h1Credit: pbFirstCredit, h2Credit: pbSecondCredit },
      },
      trendingAttestation: {
        pa: { h1: Boolean(paTrendingFirst), h2: Boolean(paTrendingSecond) },
        pb: { h1: Boolean(pbTrendingFirst), h2: Boolean(pbTrendingSecond) },
      },
      evidenceScreenshot: resultScreenshotUrl || null,
      lineupWaShared,
    },
    reason: `${session.participant.display_name} ${isUpdate ? 'mengubah' : 'mengirim'} laporan hasil ${matchId} (Skor ${scoreSummary} · Gol: ${scorersSummary} · Kiper: ${paGkName} & ${pbGkName}).`,
    ruleArticle: 'Pasal 17, 18, 19 & 22',
  });

  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath(`/matches/${mdNumber}`);
  revalidatePath('/standings');
  revalidatePath('/awards');
  revalidatePath('/control');

  return { success: true, matchId };
}

/**
 * 2. Confirm Match Report
 */
export async function confirmMatchReportAction(matchId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengonfirmasi hasil.' };
  }

  const db = getDbClient();
  const res = await db.execute({
    sql: 'SELECT * FROM matches WHERE id = ?;',
    args: [matchId],
  });

  if (res.rows.length === 0) {
    return { error: 'Pertandingan tidak ditemukan.' };
  }

  const match = res.rows[0];
  const now = new Date().toISOString();

  let confirmedByPa = match.confirmed_by_pa_at;
  let confirmedByPb = match.confirmed_by_pb_at;

  if (session.participantId === 'participant_a') {
    confirmedByPa = now;
  } else {
    confirmedByPb = now;
  }

  // If both confirmed, match becomes 'confirmed' and official
  const bothConfirmed = Boolean(confirmedByPa && confirmedByPb);
  const newStatus = bothConfirmed ? 'confirmed' : 'awaiting_confirmation';
  const confirmationStatus = bothConfirmed ? 'confirmed_both' : 'pending';

  await executeWithAudit(
    [
      {
        sql: `UPDATE matches SET 
                status = ?,
                confirmation_status = ?,
                confirmed_by_pa_at = ?,
                confirmed_by_pb_at = ?,
                updated_at = datetime('now')
              WHERE id = ?;`,
        args: [newStatus, confirmationStatus, confirmedByPa, confirmedByPb, matchId],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'match',
      action: 'confirm_match_report',
      entityType: 'match',
      entityId: matchId,
      beforeJson: {
        status: match.status,
        confirmationStatus: match.confirmation_status,
        confirmedByPa: match.confirmed_by_pa_at,
        confirmedByPb: match.confirmed_by_pb_at,
      },
      afterJson: {
        status: newStatus,
        confirmationStatus,
        score: `${match.home_score ?? 0}-${match.away_score ?? 0}`,
        confirmedByPa,
        confirmedByPb,
      },
      reason: `${session.participant.display_name} menyetujui dan mengesahkan laporan hasil ${matchId} (Skor ${match.home_score ?? 0}-${match.away_score ?? 0}).`,
      ruleArticle: 'Pasal 22 ayat (5)',
    }
  );

  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/standings');
  revalidatePath('/control');

  return { success: true };
}

/**
 * 3. File a Dispute against Match
 */
export async function disputeMatchAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengajukan sengketa.' };
  }

  const matchId = formData.get('match_id')?.toString();
  const ruleArticle = formData.get('rule_article')?.toString();
  const disputeType = formData.get('dispute_type')?.toString();
  const claimSummary = formData.get('claim_summary')?.toString();
  const evidenceUrl = formData.get('evidence_url')?.toString();

  if (!matchId || !ruleArticle || !disputeType || !claimSummary) {
    return { error: 'Seluruh kolom sengketa (Matchday, Pasal, Kategori, Uraian Klaim) wajib diisi.' };
  }

  const db = getDbClient();
  const matchRes = await db.execute({
    sql: 'SELECT status, confirmation_status, home_score, away_score FROM matches WHERE id = ? LIMIT 1;',
    args: [matchId],
  });
  const prevMatch = matchRes.rows[0] || null;

  const disputeId = `disp_${Date.now()}`;
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours to respond

  await executeWithAudit(
    [
      {
        sql: "UPDATE matches SET status = 'disputed', confirmation_status = 'disputed', updated_at = datetime('now') WHERE id = ?;",
        args: [matchId],
      },
      {
        sql: `INSERT INTO disputes (id, match_id, filed_by, rule_article, dispute_type, claim_summary, evidence_urls, status, filed_at, response_deadline_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'open', datetime('now'), ?);`,
        args: [
          disputeId,
          matchId,
          session.participantId,
          ruleArticle,
          disputeType,
          claimSummary,
          evidenceUrl ? JSON.stringify([evidenceUrl]) : '[]',
          deadline,
        ],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'match',
      action: 'file_dispute',
      entityType: 'dispute',
      entityId: disputeId,
      beforeJson: prevMatch
        ? {
            matchId,
            status: prevMatch.status,
            confirmationStatus: prevMatch.confirmation_status,
          }
        : null,
      afterJson: {
        matchId,
        status: 'disputed',
        ruleArticle,
        disputeType,
        claimSummary,
        evidenceUrl: evidenceUrl || null,
      },
      reason: `${session.participant.display_name} mengajukan sengketa resmi untuk ${matchId} terkait ${ruleArticle} (${disputeType}).`,
      ruleArticle: ruleArticle,
    }
  );

  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/standings');
  revalidatePath('/control');

  return { success: true, disputeId };
}

/**
 * 4. Submit Goal of the Season Nomination
 */
export async function submitGoalNominationAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengajukan nominasi gol.' };
  }

  const matchId = formData.get('match_id')?.toString();
  const scorerName = formData.get('scorer_name')?.toString();
  const title = formData.get('title')?.toString();
  const videoUrl = formData.get('video_url')?.toString();
  const description = formData.get('description')?.toString() || null;

  if (!matchId || !scorerName || !title || !videoUrl) {
    return { error: 'Matchday, nama pencetak gol, judul, dan tautan video wajib diisi.' };
  }

  const db = getDbClient();

  // Validate max 2 official nominations per participant
  const countRes = await db.execute({
    sql: "SELECT count(*) as count FROM goal_nominations WHERE participant_id = ? AND status = 'official';",
    args: [session.participantId],
  });

  if (Number(countRes.rows[0].count) >= 2) {
    return { error: 'Anda telah mencapai batas maksimal dua (2) nominasi resmi Goal of the Season (Pasal 43 ayat 1).' };
  }

  const nomId = `gots_${Date.now()}`;
  await executeWithAudit(
    [
      {
        sql: `INSERT INTO goal_nominations (id, participant_id, match_id, scorer_name, title, description, video_url, status, submitted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'official', datetime('now'));`,
        args: [nomId, session.participantId, matchId, scorerName, title, description, videoUrl],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'match',
      action: 'submit_goal_nomination',
      entityType: 'goal_nomination',
      entityId: nomId,
      afterJson: { matchId, scorerName, title, videoUrl },
      reason: `${session.participant.display_name} mengajukan nominasi Goal of the Season: "${title}" oleh ${scorerName} (${matchId}).`,
      ruleArticle: 'Pasal 43 ayat (1)',
    }
  );

  revalidatePath('/awards');
  revalidatePath('/awards/goal-of-the-season');
  revalidatePath('/control');

  return { success: true, nominationId: nomId };
}

/**
 * 5. Lock Award Ballot for Goal of the Season
 */
export async function lockAwardBallotAction(rankings: string[]) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengunci suara voting.' };
  }

  if (!rankings || rankings.length === 0) {
    return { error: 'Daftar urutan nominasi tidak boleh kosong.' };
  }

  const ballotId = `ballot_${session.participantId}`;

  await executeWithAudit(
    [
      {
        sql: `INSERT INTO award_ballots (id, participant_id, is_locked, locked_at, rankings_json)
              VALUES (?, ?, 1, datetime('now'), ?)
              ON CONFLICT(participant_id) DO UPDATE SET
                is_locked = 1,
                locked_at = datetime('now'),
                rankings_json = excluded.rankings_json;`,
        args: [ballotId, session.participantId, JSON.stringify(rankings)],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'match',
      action: 'lock_award_ballot',
      entityType: 'award_ballot',
      entityId: ballotId,
      afterJson: { rankingsCount: rankings.length, locked: true },
      reason: `${session.participant.display_name} mengunci surat suara peringkat Goal of the Season (${rankings.length} nominasi).`,
      ruleArticle: 'Pasal 43 ayat (2)',
    }
  );

  revalidatePath('/awards/goal-of-the-season');
  revalidatePath('/control');

  return { success: true };
}

/**
 * 6. Add/Update Roster Card (Manual fallback or form submission)
 */
export async function addRosterCardAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengelola skuad.' };
  }

  const phase = Number(formData.get('phase') || 1);
  const efootballCardId = formData.get('efootball_card_id')?.toString()?.trim() || null;

  if (efootballCardId) {
    return addEfootballRosterCardAction({
      cardId: efootballCardId,
      phase,
      slotCode: formData.get('slot_code')?.toString() || null,
    });
  }

  const playerName = formData.get('player_name')?.toString()?.trim();
  const cardVersion = formData.get('card_version')?.toString()?.trim();
  const cardCategory = formData.get('card_category')?.toString() || 'Standard';
  const nationality = formData.get('nationality')?.toString() || 'Other';
  const position = formData.get('position')?.toString() || null;
  const basePlayerIdRaw = formData.get('base_player_id')?.toString();
  const basePlayerId = basePlayerIdRaw ? Number(basePlayerIdRaw) : null;

  if (!playerName || !cardVersion) {
    return { error: 'Nama pemain dan versi kartu wajib diisi.' };
  }

  const phaseStatus = await getRosterPhaseStatus(phase);
  if (phase === 2 && !phaseStatus.md10_completed) {
    return {
      error: 'Penyesuaian skuad Fase 2 baru dibuka setelah pertandingan MD10 selesai dan disahkan (Pasal 15 ayat 1).',
    };
  }

  const myLocked =
    session.participantId === 'participant_a' ? phaseStatus.pa_locked === 1 : phaseStatus.pb_locked === 1;
  if (myLocked || phaseStatus.is_locked === 1) {
    return {
      error: `Skuad Anda pada Fase ${phase} telah terkunci dan tidak dapat diubah sampai MD10 selesai (Pasal 14 & 15).`,
    };
  }

  const db = getDbClient();

  // Check 26 card limit
  const countRes = await db.execute({
    sql: 'SELECT count(*) as count FROM roster_cards WHERE participant_id = ? AND roster_phase = ? AND is_active = 1;',
    args: [session.participantId, phase],
  });

  if (Number(countRes.rows[0].count) >= 26) {
    return { error: 'Batas maksimum skuad adalah 26 kartu pemain (Pasal 14 ayat 1).' };
  }

  // Check duplicate virtual player (no duplicate base_player_id or same player_name within one participant's squad)
  if (basePlayerId) {
    const dupRes = await db.execute({
      sql: 'SELECT player_name, card_version FROM roster_cards WHERE participant_id = ? AND roster_phase = ? AND is_active = 1 AND base_player_id = ?;',
      args: [session.participantId, phase, basePlayerId],
    });
    if (dupRes.rows.length > 0) {
      return {
        error: `Tidak boleh ada kartu kembar: pemain virtual "${dupRes.rows[0].player_name}" (${dupRes.rows[0].card_version}) sudah terdaftar di skuad Anda (Pasal 14 ayat 3).`,
      };
    }
  } else {
    const dupNameRes = await db.execute({
      sql: 'SELECT player_name, card_version FROM roster_cards WHERE participant_id = ? AND roster_phase = ? AND is_active = 1 AND lower(player_name) = lower(?);',
      args: [session.participantId, phase, playerName],
    });
    if (dupNameRes.rows.length > 0) {
      return {
        error: `Tidak boleh ada kartu kembar: pemain "${dupNameRes.rows[0].player_name}" (${dupNameRes.rows[0].card_version}) sudah terdaftar di skuad Anda (Pasal 14 ayat 3).`,
      };
    }
  }

  const isTrending =
    cardCategory.toUpperCase().includes('TRENDING') ||
    cardVersion.toUpperCase().includes('TRENDING')
      ? 1
      : 0;
  const isIndo = nationality.toUpperCase().includes('INDONESIA') ? 1 : 0;
  const cardId = `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  await executeWithAudit(
    [
      {
        sql: `INSERT INTO roster_cards (id, participant_id, roster_phase, base_player_id, player_name, card_version, card_category, is_trending, nationality, is_indonesian, position)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [cardId, session.participantId, phase, basePlayerId, playerName, cardVersion, cardCategory, isTrending, nationality, isIndo, position],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'squad',
      action: 'add_roster_card',
      entityType: 'roster_card',
      entityId: cardId,
      afterJson: {
        phase,
        basePlayerId,
        playerName,
        cardVersion,
        cardCategory,
        nationality,
        position,
        isTrending: Boolean(isTrending),
        isIndonesian: Boolean(isIndo),
      },
      reason: `${session.participant.display_name} menambahkan kartu ${playerName} (${cardVersion}${position ? `, ${position}` : ''}) ke skuad Fase ${phase}.`,
      ruleArticle: 'Pasal 14',
    }
  );

  revalidatePath('/setup');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 6B. Add eFootball Card from Lookup Table to Logged-In Participant's Squad
 */
export async function addEfootballRosterCardAction(params: {
  cardId: string;
  phase?: number;
  slotCode?: string | null;
}) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk ke akun peserta Anda sendiri untuk memilih kartu skuad.' };
  }

  const phase = Number(params.phase || 1);
  const phaseStatus = await getRosterPhaseStatus(phase);

  if (phase === 2 && !phaseStatus.md10_completed) {
    return {
      error: 'Penyesuaian skuad Fase 2 baru dibuka setelah pertandingan MD10 selesai dan disahkan (Pasal 15 ayat 1).',
    };
  }

  const myLocked =
    session.participantId === 'participant_a' ? phaseStatus.pa_locked === 1 : phaseStatus.pb_locked === 1;
  if (myLocked || phaseStatus.is_locked === 1) {
    return {
      error: `Skuad Anda untuk Fase ${phase} telah dikunci dan tidak dapat diubah sampai MD10 selesai (Pasal 14 & 15).`,
    };
  }

  const db = getDbClient();

  // Fetch player from efootball_players lookup table
  const playerRes = await db.execute({
    sql: `SELECT
            card_id, base_player_id, name, position_label, overall_lv1, overall_max,
            player_type, card_type_label, variation_name, team_name,
            country_name, is_trending, is_indonesian
          FROM efootball_players
          WHERE card_id = ?
          LIMIT 1;`,
    args: [params.cardId],
  });

  if (playerRes.rows.length === 0) {
    return { error: `Kartu eFootball dengan ID ${params.cardId} tidak ditemukan di database.` };
  }

  const ep = playerRes.rows[0];
  const basePlayerId = Number(ep.base_player_id);
  const playerName = String(ep.name);
  const playerTypeLabel = String(ep.card_type_label || 'Standard');
  const variationName = ep.variation_name ? String(ep.variation_name).trim() : '';
  const cardVersion = variationName ? `${playerTypeLabel} · ${variationName}` : playerTypeLabel;
  const isTrending = Number(ep.is_trending || 0);
  const isIndo = Number(ep.is_indonesian || 0);
  const nationalityName = String(ep.country_name || 'Other');
  const position = String(ep.position_label || 'CF');
  const overallLv1 = Number(ep.overall_lv1 || 70);
  const overallMax = Number(ep.overall_max || 80);

  // Check 26 card limit
  const countRes = await db.execute({
    sql: 'SELECT count(*) as count FROM roster_cards WHERE participant_id = ? AND roster_phase = ? AND is_active = 1;',
    args: [session.participantId, phase],
  });

  const currentCount = Number(countRes.rows[0].count);
  if (currentCount >= 26) {
    return {
      error: 'Skuad Anda sudah penuh (26/26 kartu). Hapus salah satu kartu terlebih dahulu jika ingin menggantinya (Pasal 14 ayat 1).',
    };
  }

  // Enforce No Duplicate Virtual Player (base_player_id) within this participant's squad
  const dupRes = await db.execute({
    sql: `SELECT player_name, card_version, efootball_card_id
          FROM roster_cards
          WHERE participant_id = ? AND roster_phase = ? AND is_active = 1 AND base_player_id = ?;`,
    args: [session.participantId, phase, basePlayerId],
  });

  if (dupRes.rows.length > 0) {
    const existing = dupRes.rows[0];
    return {
      error: `Tidak boleh ada kartu kembar: pemain virtual "${existing.player_name}" (${existing.card_version}) sudah terdaftar di skuad Anda. Setiap pemain virtual hanya boleh memiliki satu kartu di dalam 26 kartu skuad (Pasal 14 ayat 3).`,
    };
  }

  const rosterCardId = `rc_${session.participantId}_p${phase}_${params.cardId}`;

  await executeWithAudit(
    [
      {
        sql: `INSERT INTO roster_cards (
                id, participant_id, roster_phase, efootball_card_id, base_player_id,
                player_name, card_version, card_category, is_trending, nationality,
                is_indonesian, position, overall_lv1, overall_max, slot_code, is_active, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                is_active = 1,
                slot_code = excluded.slot_code;`,
        args: [
          rosterCardId,
          session.participantId,
          phase,
          String(ep.card_id),
          basePlayerId,
          playerName,
          cardVersion,
          playerTypeLabel,
          isTrending,
          nationalityName,
          isIndo,
          position,
          overallLv1,
          overallMax,
          params.slotCode || null,
        ],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'squad',
      action: 'add_efootball_roster_card',
      entityType: 'roster_card',
      entityId: rosterCardId,
      beforeJson: { squadCountBefore: currentCount, phase },
      afterJson: {
        phase,
        cardId: String(ep.card_id),
        basePlayerId,
        playerName,
        cardVersion,
        position,
        overallMax,
        isTrending: Boolean(isTrending),
        isIndonesian: Boolean(isIndo),
        slotCode: params.slotCode || null,
        squadCountAfter: currentCount + 1,
      },
      reason: `${session.participant.display_name} menambahkan ${playerName} (${cardVersion}, ${position}, OVR ${overallMax}) ke skuad Fase ${phase} (${currentCount + 1}/26 kartu).`,
      ruleArticle: 'Pasal 14',
    }
  );

  revalidatePath('/setup');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true, rosterCardId };
}

/**
 * 6C. Remove Card from Logged-In Participant's Squad
 */
export async function removeRosterCardAction(params: { rosterCardId: string; phase?: number }) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengubah skuad.' };
  }

  const phase = Number(params.phase || 1);
  const phaseStatus = await getRosterPhaseStatus(phase);

  const myLocked =
    session.participantId === 'participant_a' ? phaseStatus.pa_locked === 1 : phaseStatus.pb_locked === 1;
  if (myLocked || phaseStatus.is_locked === 1) {
    return {
      error: `Skuad Anda untuk Fase ${phase} telah dikunci dan tidak dapat diubah sampai MD10 selesai (Pasal 14 & 15).`,
    };
  }

  const db = getDbClient();
  const cardRes = await db.execute({
    sql: 'SELECT * FROM roster_cards WHERE id = ? AND participant_id = ?;',
    args: [params.rosterCardId, session.participantId],
  });

  if (cardRes.rows.length === 0) {
    return { error: 'Kartu tidak ditemukan di skuad Anda.' };
  }

  const card = cardRes.rows[0];
  await executeWithAudit(
    [
      {
        sql: 'DELETE FROM roster_cards WHERE id = ? AND participant_id = ?;',
        args: [params.rosterCardId, session.participantId],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'squad',
      action: 'remove_roster_card',
      entityType: 'roster_card',
      entityId: params.rosterCardId,
      beforeJson: {
        phase,
        cardId: card.efootball_card_id || card.id,
        playerName: card.player_name,
        cardVersion: card.card_version,
        position: card.position,
        overallMax: card.overall_max,
        basePlayerId: card.base_player_id,
        isTrending: Boolean(card.is_trending),
        isIndonesian: Boolean(card.is_indonesian),
      },
      afterJson: { removed: true, phase },
      reason: `${session.participant.display_name} menghapus ${card.player_name} (${card.card_version}) dari skuad Fase ${phase}.`,
      ruleArticle: 'Pasal 14 & 15',
    }
  );

  revalidatePath('/setup');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 6D. Assign or Clear Position/Formation Slot Helper on a Roster Card
 */
export async function updateRosterCardSlotAction(params: {
  rosterCardId: string;
  slotCode: string | null;
  phase?: number;
}) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengatur slot posisi.' };
  }

  const phase = Number(params.phase || 1);
  const db = getDbClient();

  const cardRes = await db.execute({
    sql: 'SELECT player_name, card_version, slot_code FROM roster_cards WHERE id = ? AND participant_id = ? LIMIT 1;',
    args: [params.rosterCardId, session.participantId],
  });

  if (cardRes.rows.length === 0) {
    return { error: 'Kartu tidak ditemukan di skuad Anda.' };
  }

  const card = cardRes.rows[0];
  const oldSlot = card.slot_code ? String(card.slot_code) : null;
  const newSlot = params.slotCode || null;

  const statements: InStatement[] = [];
  if (newSlot) {
    statements.push({
      sql: 'UPDATE roster_cards SET slot_code = NULL WHERE participant_id = ? AND roster_phase = ? AND slot_code = ?;',
      args: [session.participantId, phase, newSlot],
    });
  }

  statements.push({
    sql: 'UPDATE roster_cards SET slot_code = ? WHERE id = ? AND participant_id = ?;',
    args: [newSlot, params.rosterCardId, session.participantId],
  });

  await executeWithAudit(statements, {
    actorId: session.participantId,
    actorName: session.participant.display_name,
    category: 'squad',
    action: 'update_roster_card_slot',
    entityType: 'roster_card',
    entityId: params.rosterCardId,
    beforeJson: {
      phase,
      playerName: card.player_name,
      cardVersion: card.card_version,
      slotCode: oldSlot || 'Cadangan',
    },
    afterJson: {
      phase,
      playerName: card.player_name,
      cardVersion: card.card_version,
      slotCode: newSlot || 'Cadangan',
    },
    reason: `${session.participant.display_name} mengubah slot posisi ${card.player_name} dari "${oldSlot || 'Cadangan'}" ke "${newSlot || 'Cadangan'}" di skuad Fase ${phase}.`,
    ruleArticle: 'Pasal 14',
  });

  revalidatePath('/setup');
  revalidatePath('/control');
  return { success: true };
}

/**
 * 6E. Toggle Candidate Card in Shortlist ("Pilihan Sementara / My Team")
 */
export async function toggleShortlistCardAction(cardId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk menyimpan daftar pilihan sementara.' };
  }

  const db = getDbClient();
  const [existing, playerRes] = await Promise.all([
    db.execute({
      sql: 'SELECT id FROM squad_shortlist WHERE participant_id = ? AND card_id = ?;',
      args: [session.participantId, cardId],
    }),
    db.execute({
      sql: 'SELECT name, card_type_label, variation_name, position_label, overall_max FROM efootball_players WHERE card_id = ? LIMIT 1;',
      args: [cardId],
    }),
  ]);

  const ep = playerRes.rows[0];
  const playerName = ep ? String(ep.name) : cardId;
  const typeLabel = ep ? String(ep.card_type_label || 'Standard') : 'Standard';
  const varName = ep?.variation_name ? String(ep.variation_name).trim() : '';
  const cardVersion = varName ? `${typeLabel} · ${varName}` : typeLabel;
  const posLabel = ep ? String(ep.position_label || '') : '';

  if (existing.rows.length > 0) {
    await executeWithAudit(
      [
        {
          sql: 'DELETE FROM squad_shortlist WHERE participant_id = ? AND card_id = ?;',
          args: [session.participantId, cardId],
        },
      ],
      {
        actorId: session.participantId,
        actorName: session.participant.display_name,
        category: 'squad',
        action: 'remove_shortlist_card',
        entityType: 'squad_shortlist',
        entityId: `sl_${session.participantId}_${cardId}`,
        beforeJson: { cardId, playerName, cardVersion, position: posLabel },
        afterJson: { shortlisted: false },
        reason: `${session.participant.display_name} menghapus ${playerName} (${cardVersion}) dari daftar kandidat sementara (My Team).`,
        ruleArticle: 'Pasal 14',
      }
    );
    revalidatePath('/setup');
    revalidatePath('/control');
    return { success: true, added: false };
  } else {
    const id = `sl_${session.participantId}_${cardId}`;
    await executeWithAudit(
      [
        {
          sql: "INSERT INTO squad_shortlist (id, participant_id, card_id, created_at) VALUES (?, ?, ?, datetime('now'));",
          args: [id, session.participantId, cardId],
        },
      ],
      {
        actorId: session.participantId,
        actorName: session.participant.display_name,
        category: 'squad',
        action: 'add_shortlist_card',
        entityType: 'squad_shortlist',
        entityId: id,
        beforeJson: { shortlisted: false },
        afterJson: { cardId, playerName, cardVersion, position: posLabel, shortlisted: true },
        reason: `${session.participant.display_name} menyimpan ${playerName} (${cardVersion}) ke daftar kandidat sementara (My Team).`,
        ruleArticle: 'Pasal 14',
      }
    );
    revalidatePath('/setup');
    revalidatePath('/control');
    return { success: true, added: true };
  }
}

/**
 * 6F. Initialize Phase 2 Squad from Phase 1 Snapshot (After MD10 Completed)
 */
export async function initializePhase2SquadAction() {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk membuka bursa Fase 2.' };
  }

  const phase2Status = await getRosterPhaseStatus(2);
  if (!phase2Status.md10_completed) {
    return {
      error: 'Penyesuaian skuad Fase 2 baru diizinkan setelah pertandingan MD10 selesai dan disahkan (Pasal 15 ayat 1).',
    };
  }

  const db = getDbClient();
  const existingP2 = await db.execute({
    sql: 'SELECT count(*) as count FROM roster_cards WHERE participant_id = ? AND roster_phase = 2 AND is_active = 1;',
    args: [session.participantId],
  });

  if (Number(existingP2.rows[0]?.count || 0) > 0) {
    return { success: true, message: 'Skuad Fase 2 Anda sudah disiapkan.' };
  }

  const p1Cards = await db.execute({
    sql: 'SELECT * FROM roster_cards WHERE participant_id = ? AND roster_phase = 1 AND is_active = 1;',
    args: [session.participantId],
  });

  const statements: InStatement[] = p1Cards.rows.map((c) => ({
    sql: `INSERT OR IGNORE INTO roster_cards (
            id, participant_id, roster_phase, efootball_card_id, base_player_id,
            player_name, card_version, card_category, is_trending, nationality,
            is_indonesian, position, overall_lv1, overall_max, slot_code, is_active, created_at
          ) VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'));`,
    args: [
      `rc_${session.participantId}_p2_${c.efootball_card_id || c.id}`,
      session.participantId,
      c.efootball_card_id || null,
      c.base_player_id || null,
      c.player_name,
      c.card_version,
      c.card_category || 'Standard',
      c.is_trending ?? 0,
      c.nationality || 'Other',
      c.is_indonesian ?? 0,
      c.position || null,
      c.overall_lv1 || null,
      c.overall_max || null,
      c.slot_code || null,
    ],
  }));

  await executeWithAudit(statements, {
    actorId: session.participantId,
    actorName: session.participant.display_name,
    category: 'squad',
    action: 'open_phase2_squad',
    entityType: 'roster_phase',
    entityId: `phase_2_${session.participantId}`,
    beforeJson: { phase: 2, cardsCount: 0, md10Completed: true },
    afterJson: { phase: 2, copiedFromPhase1Count: statements.length },
    reason: `${session.participant.display_name} membuka kembali penyesuaian skuad Fase 2 setelah MD10 selesai (menyalin ${statements.length} kartu dari Fase 1).`,
    ruleArticle: 'Pasal 15 ayat (1)',
  });

  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);
  return { success: true };
}

/**
 * 7. Lock Logged-In Participant's Squad Snapshot (Per Participant)
 */
export async function lockParticipantSquadAction(phase: number = 1) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk ke akun peserta Anda sendiri untuk mengunci skuad.' };
  }

  const phaseStatus = await getRosterPhaseStatus(phase);
  if (phase === 2 && !phaseStatus.md10_completed) {
    return {
      error: 'Penyesuaian skuad Fase 2 belum dapat dikunci karena MD10 belum selesai (Pasal 15 ayat 1).',
    };
  }

  const allCards = await getAllRosterCards(phase);
  const myCards = allCards.filter((c) => c.participant_id === session.participantId);

  const validation = validateSquadForLock(myCards);
  if (!validation.valid) {
    return {
      error: validation.errors.join(' '),
      validation,
    };
  }

  const otherLocked =
    session.participantId === 'participant_a' ? phaseStatus.pb_locked === 1 : phaseStatus.pa_locked === 1;
  const willBothBeLocked = otherLocked;

  const statements: InStatement[] = [
    {
      sql: 'INSERT OR IGNORE INTO roster_phases (phase, label, is_locked, pa_locked, pb_locked) VALUES (?, ?, 0, 0, 0);',
      args: [phase, phase === 1 ? 'Fase 1 (MD1-MD10)' : 'Fase 2 (MD11-MD20)'],
    },
  ];

  if (session.participantId === 'participant_a') {
    statements.push({
      sql: "UPDATE roster_phases SET pa_locked = 1, pa_locked_at = datetime('now') WHERE phase = ?;",
      args: [phase],
    });
  } else {
    statements.push({
      sql: "UPDATE roster_phases SET pb_locked = 1, pb_locked_at = datetime('now') WHERE phase = ?;",
      args: [phase],
    });
  }

  if (willBothBeLocked) {
    statements.push({
      sql: "UPDATE roster_phases SET is_locked = 1, locked_at = datetime('now'), locked_by = ? WHERE phase = ?;",
      args: [session.participantId, phase],
    });
  }

  await executeWithAudit(statements, {
    actorId: session.participantId,
    actorName: session.participant.display_name,
    category: 'squad',
    action: 'lock_participant_squad',
    entityType: 'roster_phase',
    entityId: `phase_${phase}_${session.participantId}`,
    beforeJson: {
      phase,
      paLocked: Boolean(phaseStatus.pa_locked),
      pbLocked: Boolean(phaseStatus.pb_locked),
      bothLocked: phaseStatus.both_locked,
    },
    afterJson: {
      phase,
      participantId: session.participantId,
      totalCards: validation.totalCards,
      trendingCount: validation.trendingCount,
      indonesianCount: validation.indonesianCount,
      bothLocked: willBothBeLocked,
    },
    reason: `${session.participant.display_name} mengunci skuad Fase ${phase} (${validation.totalCards} kartu · ${validation.trendingCount} Trending · ${validation.indonesianCount} Indonesia)${willBothBeLocked ? ' — kedua skuad kini resmi terkunci dan terbuka.' : '.'}`,
    ruleArticle: phase === 1 ? 'Pasal 14 ayat (2) & (4)' : 'Pasal 15 ayat (4)',
  });

  revalidatePath('/setup');
  revalidatePath('/control');
  revalidatePath('/participants/participant_a');
  revalidatePath('/participants/participant_b');

  return {
    success: true,
    bothLocked: willBothBeLocked,
    validation,
  };
}

export async function lockRosterPhaseAction(phase: number) {
  return lockParticipantSquadAction(phase);
}

/**
 * 8. Update Participant Display Settings
 */
export async function updateParticipantSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengubah profil.' };
  }

  const displayName = formData.get('display_name')?.toString()?.trim();
  const monogramRaw = formData.get('monogram')?.toString()?.trim();

  if (!displayName || !monogramRaw) {
    return { error: 'Nama tampilan dan monogram wajib diisi.' };
  }

  const monogram = monogramRaw.toUpperCase().slice(0, 3);
  const oldName = session.participant.display_name;
  const oldMonogram = session.participant.monogram;

  await executeWithAudit(
    [
      {
        sql: "UPDATE participants SET display_name = ?, monogram = ?, updated_at = datetime('now') WHERE id = ?;",
        args: [displayName, monogram, session.participantId],
      },
    ],
    {
      actorId: session.participantId,
      actorName: displayName,
      category: 'setup',
      action: 'update_participant_profile',
      entityType: 'participant',
      entityId: session.participantId,
      beforeJson: { displayName: oldName, monogram: oldMonogram },
      afterJson: { displayName, monogram },
      reason: `${oldName} mengubah profil tampilan dari "${oldName} (${oldMonogram})" menjadi "${displayName} (${monogram})".`,
      ruleArticle: 'Pasal 1 & 50',
    }
  );

  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 9. Login Participant (Records both successful and failed login attempts without storing PINs/secrets)
 */
export async function loginParticipantAction(formData: FormData) {
  const participantId = formData.get('participant_id')?.toString() as ParticipantId;
  const pin = formData.get('pin')?.toString() || '';

  if (!participantId || (participantId !== 'participant_a' && participantId !== 'participant_b')) {
    return { error: 'Pilih peserta yang valid (Peserta A atau Peserta B).' };
  }

  const participants = await getParticipants();
  const targetParticipant = participants.find((p) => p.id === participantId);
  const targetName = targetParticipant?.display_name || (participantId === 'participant_a' ? 'Peserta A' : 'Peserta B');

  const success = await loginParticipant(participantId, pin);
  if (!success) {
    // Record failed login attempt (NEVER include PIN or any secret!)
    try {
      await recordAuditEvent({
        actorId: participantId,
        actorName: targetName,
        category: 'security',
        action: 'login_failed',
        entityType: 'session',
        entityId: participantId,
        afterJson: {
          participantId,
          outcome: 'failed_invalid_pin',
        },
        reason: `Percobaan masuk gagal untuk akun ${targetName} (PIN tidak sesuai).`,
        ruleArticle: 'Pasal 50',
      });
    } catch (auditErr) {
      console.error('Failed to record login_failed audit event:', auditErr);
    }
    return { error: 'PIN tidak sesuai. Silakan hubungi koordinator atau periksa environment.' };
  }

  // Record successful login (NEVER include PIN or session token!)
  await recordAuditEvent({
    actorId: participantId,
    actorName: targetName,
    category: 'security',
    action: 'login_success',
    entityType: 'session',
    entityId: participantId,
    afterJson: {
      participantId,
      outcome: 'authenticated',
    },
    reason: `${targetName} berhasil masuk ke Pusat Kontrol.`,
    ruleArticle: 'Pasal 50',
  });

  revalidatePath('/');
  revalidatePath('/setup');
  revalidatePath('/control');
  return { success: true };
}

/**
 * 10. Logout Participant
 */
export async function logoutParticipantAction() {
  const session = await getSession();
  await logoutParticipant();

  if (session) {
    try {
      await recordAuditEvent({
        actorId: session.participantId,
        actorName: session.participant.display_name,
        category: 'security',
        action: 'logout_session',
        entityType: 'session',
        entityId: session.participantId,
        afterJson: {
          participantId: session.participantId,
          outcome: 'logged_out',
        },
        reason: `${session.participant.display_name} keluar dari sesi Pusat Kontrol.`,
        ruleArticle: 'Pasal 50',
      });
    } catch (err) {
      console.error('Failed to record logout audit event:', err);
    }
  }

  revalidatePath('/');
  revalidatePath('/setup');
  revalidatePath('/control');
  return { success: true };
}

/**
 * 11. Resolve Dispute (Amicable or AI Adjudicator Ruling)
 */
export async function resolveDisputeAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk menyelesaikan sengketa.' };
  }

  const disputeId = formData.get('dispute_id')?.toString();
  const rulingSummary = formData.get('ruling_summary')?.toString();
  const status = formData.get('status')?.toString() || 'resolved';

  if (!disputeId || !rulingSummary) {
    return { error: 'ID sengketa dan ringkasan keputusan wajib diisi.' };
  }

  const db = getDbClient();
  const existingRes = await db.execute({
    sql: 'SELECT * FROM disputes WHERE id = ? LIMIT 1;',
    args: [disputeId],
  });
  const existingDispute = existingRes.rows[0] || null;

  await executeWithAudit(
    [
      {
        sql: `UPDATE disputes SET 
                status = ?,
                ai_ruling_summary = ?,
                adjudicated_at = datetime('now')
              WHERE id = ?;`,
        args: [status, rulingSummary, disputeId],
      },
    ],
    {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'match',
      action: 'resolve_dispute',
      entityType: 'dispute',
      entityId: disputeId,
      beforeJson: existingDispute
        ? {
            matchId: existingDispute.match_id,
            status: existingDispute.status,
            ruleArticle: existingDispute.rule_article,
          }
        : null,
      afterJson: {
        matchId: existingDispute?.match_id || null,
        status,
        rulingSummary,
      },
      reason: `${session.participant.display_name} mencatat penyelesaian sengketa ${disputeId}${existingDispute?.match_id ? ` (${existingDispute.match_id})` : ''} dengan status "${status}".`,
      ruleArticle: 'Pasal 38 & 39',
    }
  );

  revalidatePath('/control');
  revalidatePath('/matches');
  revalidatePath('/standings');

  return { success: true };
}

/**
 * 12. Save Setup Step 1: Update Existing Participants & Colors
 * (Never creates duplicate participants, updates participant_a & participant_b in place)
 */
export async function saveSetupStep1Action(formData: FormData) {
  const nameA = formData.get('name_a')?.toString().trim();
  const nameB = formData.get('name_b')?.toString().trim();
  const colorA = formData.get('color_a')?.toString().trim() || '#ffb02e';
  const colorB = formData.get('color_b')?.toString().trim() || '#3ec9e6';
  const adminId = (formData.get('admin_id')?.toString() || 'participant_a') as ParticipantId;

  if (!nameA || !nameB) {
    return { error: 'Nama kedua pemain wajib diisi.' };
  }

  if (colorA === colorB) {
    return { error: 'Warna Pemain A dan Pemain B tidak boleh sama. Pilih warna yang berbeda.' };
  }

  const monogramA = nameA.slice(0, 2).toUpperCase();
  const monogramB = nameB.slice(0, 2).toUpperCase();

  try {
    const [existingParts, existingSettings, session] = await Promise.all([
      getParticipants(),
      getSeasonSettings(),
      getSession(),
    ]);

    const oldPa = existingParts.find((p) => p.id === 'participant_a');
    const oldPb = existingParts.find((p) => p.id === 'participant_b');
    const actorId: ParticipantId = session?.participantId || adminId || 'participant_a';
    const actorName = actorId === 'participant_a' ? nameA : nameB;

    await executeWithAudit(
      [
        {
          sql: `UPDATE participants SET 
                  display_name = ?, 
                  monogram = ?, 
                  is_admin = ?, 
                  updated_at = datetime('now') 
                WHERE id = 'participant_a';`,
          args: [nameA, monogramA, adminId === 'participant_a' ? 1 : 0],
        },
        {
          sql: `UPDATE participants SET 
                  display_name = ?, 
                  monogram = ?, 
                  is_admin = ?, 
                  updated_at = datetime('now') 
                WHERE id = 'participant_b';`,
          args: [nameB, monogramB, adminId === 'participant_b' ? 1 : 0],
        },
        {
          sql: `UPDATE season_settings SET 
                  player_a_color = ?, 
                  player_b_color = ?, 
                  updated_at = datetime('now') 
                WHERE id = 'season_1';`,
          args: [colorA, colorB],
        },
      ],
      {
        actorId,
        actorName,
        category: 'setup',
        action: 'save_setup_identity',
        entityType: 'season_settings',
        entityId: 'season_1',
        beforeJson: {
          participantA: {
            displayName: oldPa?.display_name || 'Peserta A',
            monogram: oldPa?.monogram || 'PA',
            color: existingSettings?.player_a_color || '#ffb02e',
            isAdmin: Boolean(oldPa?.is_admin),
          },
          participantB: {
            displayName: oldPb?.display_name || 'Peserta B',
            monogram: oldPb?.monogram || 'PB',
            color: existingSettings?.player_b_color || '#3ec9e6',
            isAdmin: Boolean(oldPb?.is_admin),
          },
        },
        afterJson: {
          participantA: {
            displayName: nameA,
            monogram: monogramA,
            color: colorA,
            isAdmin: adminId === 'participant_a',
          },
          participantB: {
            displayName: nameB,
            monogram: monogramB,
            color: colorB,
            isAdmin: adminId === 'participant_b',
          },
        },
        reason: `${actorName} mengatur identitas dan warna peserta pada Setup Awal: ${nameA} (${monogramA}, ${colorA}) vs ${nameB} (${monogramB}, ${colorB}).`,
        ruleArticle: 'Pasal 1 & 4',
      }
    );

    revalidatePath('/');
    revalidatePath('/setup');
    revalidatePath('/control');
    return { success: true };
  } catch (err: any) {
    console.error('saveSetupStep1Action error:', err);
    return { error: `Gagal menyimpan data peserta: ${err.message}` };
  }
}

/**
 * 13. Test System Readiness Checklist (Runs automatically in Setup Wizard)
 */
export async function testSystemReadinessAction() {
  const results = {
    dbConnection: false,
    tablesCreated: false,
    matchesSeeded: false,
    settingsSaved: false,
    playersSynced: false,
    playersCount: 0,
    errorMessage: null as string | null,
  };

  try {
    const db = getDbClient();

    // Check 1: Database connection
    await db.execute('SELECT 1 as connected;');
    results.dbConnection = true;

    // Check 2: Core tables exist
    const tablesRes = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = new Set(tablesRes.rows.map((r) => String(r.name)));
    const requiredTables = ['participants', 'season_settings', 'matches', 'audit_events', 'efootball_players'];
    results.tablesCreated = requiredTables.every((t) => tableNames.has(t));

    // Check 3: Exactly 20 matches exist
    const matchesRes = await db.execute('SELECT count(*) as count FROM matches;');
    const count = Number(matchesRes.rows[0]?.count || 0);
    results.matchesSeeded = count === 20;

    // Check 4: Season settings record exists
    const settingsRes = await db.execute("SELECT id FROM season_settings WHERE id = 'season_1';");
    results.settingsSaved = settingsRes.rows.length > 0;

    // Check 5: eFootball players lookup table synced
    if (tableNames.has('efootball_players')) {
      const playersRes = await db.execute('SELECT count(*) as count FROM efootball_players;');
      const pCount = Number(playersRes.rows[0]?.count || 0);
      results.playersCount = pCount;
      results.playersSynced = pCount > 0;
    }

    return { success: true, results };
  } catch (err: any) {
    console.error('testSystemReadinessAction error:', err);
    results.errorMessage =
      'Server database tidak terjangkau, kemungkinan masalah jaringan atau DNS. Mode development dapat memakai database lokal.';
    return { success: false, results };
  }
}

/**
 * 14. Complete Season Setup & Start Season ('setup' -> 'live')
 * Enforces rule: Season can ONLY become 'live' after BOTH participants have locked their Phase 1 squads!
 */
export async function completeSeasonSetupAction() {
  try {
    const phase1Status = await getRosterPhaseStatus(1);
    if (!phase1Status.both_locked) {
      const missing: string[] = [];
      if (phase1Status.pa_locked !== 1) missing.push('Skuad Peserta A belum dikunci');
      if (phase1Status.pb_locked !== 1) missing.push('Skuad Peserta B belum dikunci');
      return {
        error: `Musim belum dapat dimulai: kedua skuad wajib dikunci terlebih dahulu (${missing.join(', ')} · Pasal 14 ayat 2).`,
      };
    }

    const [session, currentSettings] = await Promise.all([getSession(), getSeasonSettings()]);
    const actorId: ParticipantId = session?.participantId || 'participant_a';
    const actorName = session?.participant.display_name || 'Koordinator Musim';

    await executeWithAudit(
      [
        {
          sql: "UPDATE season_settings SET status = 'live', updated_at = datetime('now') WHERE id = 'season_1';",
          args: [],
        },
      ],
      {
        actorId,
        actorName,
        category: 'setup',
        action: 'start_season',
        entityType: 'season_settings',
        entityId: 'season_1',
        beforeJson: { status: currentSettings?.status || 'setup', paLocked: true, pbLocked: true },
        afterJson: { status: 'live', paLocked: true, pbLocked: true },
        reason: `${actorName} meresmikan dimulainya musim Rivals Series Season 1 setelah kedua skuad Fase 1 terkunci.`,
        ruleArticle: 'Pasal 1, 4 & 14',
      }
    );

    revalidatePath('/');
    revalidatePath('/setup');
    revalidatePath('/control');
    return { success: true };
  } catch (err: any) {
    console.error('completeSeasonSetupAction error:', err);
    return { error: `Gagal memulai musim: ${err.message}` };
  }
}

/**
 * 15. Request Season Reset (Admin filing mutual consent request)
 */
export async function requestSeasonResetAction(formData: FormData) {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    return { error: 'Hanya administrator resmi yang dapat mengajukan reset musim.' };
  }

  const resetMode = formData.get('reset_mode')?.toString() as 'results_only' | 'total_reset';
  const confirmationPhrase = formData.get('confirmation_phrase')?.toString().trim();
  const archiveConfirmed = formData.get('archive_confirmed') === 'true';

  if (!archiveConfirmed) {
    return { error: 'Anda wajib mengunduh arsip musim sebelum dapat mengajukan reset (Langkah 1).' };
  }

  if (resetMode !== 'results_only' && resetMode !== 'total_reset') {
    return { error: 'Pilih mode reset yang valid (Reset Hasil Saja atau Reset Total).' };
  }

  if (confirmationPhrase !== 'RESET RS S1') {
    return { error: 'Frasa konfirmasi tidak sesuai. Ketik persis "RESET RS S1" dengan huruf kapital.' };
  }

  try {
    const requestId = `reset_${Date.now()}`;
    const modeLabel = resetMode === 'total_reset' ? 'Reset Total Musim' : 'Reset Hasil Pertandingan Saja';

    await executeWithAudit(
      [
        {
          sql: `INSERT INTO reset_requests (id, requested_by, reset_mode, status, confirmation_phrase, created_at)
                VALUES (?, ?, ?, 'pending_approval', ?, datetime('now'));`,
          args: [requestId, session.participantId, resetMode, confirmationPhrase],
        },
      ],
      {
        actorId: session.participantId,
        actorName: session.participant.display_name,
        category: 'mutual',
        action: 'request_season_reset',
        entityType: 'reset_request',
        entityId: requestId,
        afterJson: {
          resetMode,
          modeLabel,
          archiveConfirmed: true,
          status: 'pending_approval',
        },
        reason: `${session.participant.display_name} mengajukan permintaan reset musim (${modeLabel}) — menunggu persetujuan lawan.`,
        ruleArticle: 'Pasal 50',
      }
    );

    revalidatePath('/control');
    revalidatePath('/setup/reset');
    return { success: true, requestId };
  } catch (err: any) {
    console.error('requestSeasonResetAction error:', err);
    return { error: `Gagal mengajukan reset: ${err.message}` };
  }
}

/**
 * 16. Respond to Season Reset Request (Partner approves or rejects)
 * Atomic execution in a single transaction if approved!
 * IMPORTANT: Never deletes audit_events (append-only history is preserved across resets).
 */
export async function respondSeasonResetAction(params: {
  requestId: string;
  approved: boolean;
  rejectionReason?: string;
}) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk menanggapi permintaan reset.' };
  }

  const db = getDbClient();

  const reqRes = await db.execute({
    sql: 'SELECT * FROM reset_requests WHERE id = ?;',
    args: [params.requestId],
  });

  if (reqRes.rows.length === 0) {
    return { error: 'Permintaan reset tidak ditemukan.' };
  }

  const resetReq = reqRes.rows[0];
  if (resetReq.status !== 'pending_approval') {
    return { error: `Permintaan reset ini sudah tidak aktif (status: ${resetReq.status}).` };
  }

  // Partner must be the OTHER participant
  if (resetReq.requested_by === session.participantId) {
    return { error: 'Persetujuan harus diberikan oleh lawan tanding Anda, bukan oleh pengaju.' };
  }

  const mode = String(resetReq.reset_mode) as 'results_only' | 'total_reset';
  const modeLabel = mode === 'total_reset' ? 'Reset Total Musim' : 'Reset Hasil Pertandingan Saja';

  try {
    if (!params.approved) {
      const reasonText = params.rejectionReason || 'Ditolak oleh lawan';
      await executeWithAudit(
        [
          {
            sql: `UPDATE reset_requests SET 
                    status = 'rejected', 
                    partner_rejection_reason = ?, 
                    partner_approved_at = datetime('now') 
                  WHERE id = ?;`,
            args: [reasonText, params.requestId],
          },
        ],
        {
          actorId: session.participantId,
          actorName: session.participant.display_name,
          category: 'mutual',
          action: 'reject_season_reset',
          entityType: 'reset_request',
          entityId: params.requestId,
          beforeJson: { status: 'pending_approval', resetMode: mode },
          afterJson: { status: 'rejected', resetMode: mode, rejectionReason: reasonText },
          reason: `${session.participant.display_name} menolak permintaan reset musim (${modeLabel}).`,
          ruleArticle: 'Pasal 50',
        }
      );

      revalidatePath('/control');
      return { success: true, rejected: true };
    }

    // Snapshot pre-reset summary for audit archival before executing reset
    const [playedCountRes, cardsCountRes, currentSettings] = await Promise.all([
      db.execute("SELECT count(*) as c FROM matches WHERE status != 'scheduled';"),
      db.execute('SELECT count(*) as c FROM roster_cards WHERE is_active = 1;'),
      getSeasonSettings(),
    ]);
    const preResetPlayedMatches = Number(playedCountRes.rows[0]?.c || 0);
    const preResetActiveCards = Number(cardsCountRes.rows[0]?.c || 0);

    // Approved: Execute in single atomic batch / transaction WITH audit event
    const statements: InStatement[] = [];

    // 1. Mark request executed
    statements.push({
      sql: `UPDATE reset_requests SET 
              status = 'executed', 
              partner_approved_at = datetime('now'), 
              executed_at = datetime('now') 
            WHERE id = ?;`,
      args: [params.requestId],
    });

    // 2. Reset matches to scheduled state
    statements.push({
      sql: `UPDATE matches SET 
              status = 'scheduled',
              result_type = 'normal',
              played_at = NULL,
              reported_at = NULL,
              reported_by = NULL,
              confirmation_status = 'pending',
              confirmed_by_pa_at = NULL,
              confirmed_by_pb_at = NULL,
              admin_auto_confirmed_at = NULL,
              home_score = NULL,
              away_score = NULL,
              et_played = 0,
              home_et_score = NULL,
              away_et_score = NULL,
              pk_played = 0,
              home_pk_score = NULL,
              away_pk_score = NULL,
              winner_id = NULL,
              is_draw = 0,
              points_home = 0,
              points_away = 0,
              match_report_text = NULL,
              result_screenshot_url = NULL,
              lineup_screenshot_shared_wa = 0,
              updated_at = datetime('now');`,
      args: [],
    });

    // 3. Clear match goal events, goalkeepers, quota credits
    statements.push({ sql: 'DELETE FROM match_goal_events;', args: [] });
    statements.push({ sql: 'DELETE FROM goalkeeper_match_records;', args: [] });
    statements.push({ sql: 'DELETE FROM match_quota_credits;', args: [] });
    statements.push({ sql: "UPDATE disputes SET status = 'resolved' WHERE status = 'open';", args: [] });

    // 4. If total reset, set season status back to 'setup' AND clear squads + unlock roster phases
    // Note: audit_events is NEVER deleted!
    if (mode === 'total_reset') {
      statements.push({
        sql: "UPDATE season_settings SET status = 'setup', current_roster_phase = 1, updated_at = datetime('now') WHERE id = 'season_1';",
        args: [],
      });
      statements.push({
        sql: 'DELETE FROM roster_cards;',
        args: [],
      });
      statements.push({
        sql: 'DELETE FROM squad_shortlist;',
        args: [],
      });
      statements.push({
        sql: `UPDATE roster_phases SET
                is_locked = 0,
                locked_at = NULL,
                locked_by = NULL,
                pa_locked = 0,
                pa_locked_at = NULL,
                pb_locked = 0,
                pb_locked_at = NULL;`,
        args: [],
      });
    }

    await executeWithAudit(statements, {
      actorId: session.participantId,
      actorName: session.participant.display_name,
      category: 'mutual',
      action: 'execute_season_reset',
      entityType: 'season_settings',
      entityId: 'season_1',
      beforeJson: {
        seasonStatus: currentSettings?.status || 'live',
        playedMatchesCount: preResetPlayedMatches,
        activeRosterCardsCount: preResetActiveCards,
        resetMode: mode,
      },
      afterJson: {
        seasonStatus: mode === 'total_reset' ? 'setup' : currentSettings?.status || 'live',
        playedMatchesCount: 0,
        activeRosterCardsCount: mode === 'total_reset' ? 0 : preResetActiveCards,
        resetMode: mode,
        requestId: params.requestId,
        auditHistoryPreserved: true,
      },
      reason: `${session.participant.display_name} menyetujui dan mengeksekusi reset musim (${modeLabel}) — riwayat Jejak Audit tetap diarsipkan secara utuh.`,
      ruleArticle: 'Pasal 50',
    });

    revalidatePath('/');
    revalidatePath('/control');
    revalidatePath('/matches');
    revalidatePath('/standings');
    revalidatePath('/setup');

    return { success: true, executed: true };
  } catch (err: any) {
    console.error('respondSeasonResetAction error:', err);
    return { error: `Gagal mengeksekusi reset: ${err.message}` };
  }
}

/**
 * 17. Mark Audit Trail as Seen by the Logged-In Participant
 * Updates `participants.last_audit_seen_at` to clear the "Ada perubahan baru sejak terakhir kamu melihat" indicator.
 */
export async function markAuditTrailSeenAction() {
  const session = await getSession();
  if (!session) {
    return { error: 'Belum masuk.' };
  }

  const db = getDbClient();
  const nowUtc = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await db.execute({
    sql: 'UPDATE participants SET last_audit_seen_at = ? WHERE id = ?;',
    args: [nowUtc, session.participantId],
  });

  revalidatePath('/control');
  return { success: true, seenAt: nowUtc };
}


