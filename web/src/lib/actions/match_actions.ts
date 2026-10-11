// RIVALS SERIES SEASON 1 (RS S1) MATCH SERVER ACTIONS
// Covers match reporting, confirmations, dispute submission, and dispute resolution

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import { invalidateCacheTags } from '../cached-data';
import { getSession } from '../auth';
import { getDbClient, executeWithAudit } from '../db';
import { calculateMatchPoints } from '../engine';
import { Match } from '../types';
import { validateMatchReportInput } from '../match_validator';

/**
 * 1. Submit Match Report Action
 */
export async function submitMatchReportAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: 'Anda harus masuk sebagai Peserta A atau Peserta B untuk melapor.' };
    }

    const validation = validateMatchReportInput(formData);
    if (!validation.success) {
      return { error: validation.error };
    }

    const {
      mdNumber,
      matchId,
      matchSettings,
      homeScore,
      awayScore,
      etPlayed,
      homeEtScore,
      awayEtScore,
      pkPlayed,
      homePkScore,
      awayPkScore,
      finalHomeGoals,
      finalAwayGoals,
      paGkName,
      paGkCardId,
      paGkBaseId,
      paGkCardVersion,
      paGkFull,
      pbGkName,
      pbGkCardId,
      pbGkBaseId,
      pbGkCardVersion,
      pbGkFull,
      validatedGoals,
      resultScreenshotUrl,
      matchReportText,
      lineupWaShared,
      paFirstCredit,
      paSecondCredit,
      pbFirstCredit,
      pbSecondCredit,
      paIndoInDsp,
      pbIndoInDsp,
      paTrendingFirst,
      paTrendingSecond,
      pbTrendingFirst,
      pbTrendingSecond,
    } = validation.data;

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

    for (let i = 0; i < validatedGoals.length; i++) {
      const g = validatedGoals[i];
      const goalId = `goal_${matchId}_${i + 1}_${Date.now()}`;

      statements.push({
        sql: `INSERT INTO match_goal_events (
                id, match_id, scoring_participant_id, scorer_card_id, scorer_base_player_id,
                scorer_player_name, scorer_card_version, minute, period, is_own_goal, is_reconstruction_only
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
        args: [
          goalId,
          matchId,
          g.scoring_participant_id,
          g.scorer_card_id,
          g.scorer_base_player_id,
          g.scorer_player_name,
          g.scorer_card_version,
          g.minute,
          g.period,
          g.is_own_goal,
        ],
      });
    }

    const scoreSummary = `${homeScore}-${awayScore}${etPlayed ? ` (ET ${homeEtScore}-${awayEtScore})` : ''}${pkPlayed ? ` (PK ${homePkScore}-${awayPkScore})` : ''}`;
    const scorersSummary = validatedGoals.length > 0 ? validatedGoals.map((g) => g.scorer_player_name).join(', ') : 'Tanpa pencetak gol tercatat';

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
        scorers: validatedGoals.map((g) => ({
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

    invalidateCacheTags('standings', 'matches', 'statistics', 'awards');
    revalidatePath('/');
    revalidatePath('/matches');
    revalidatePath(`/matches/${mdNumber}`);
    revalidatePath('/standings');
    revalidatePath('/statistics');
    revalidatePath('/awards');
    revalidatePath('/control');

    return { success: true, matchId };
  } catch (err: any) {
    console.error('submitMatchReportAction error:', err);
    return { error: err?.message || 'Gagal mengirimkan laporan hasil pertandingan.' };
  }
}

/**
 * 2. Confirm Match Report
 */
export async function confirmMatchReportAction(matchId: string) {
  try {
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

    if (
      match.status !== 'awaiting_confirmation' ||
      match.home_score === null ||
      match.away_score === null ||
      !match.reported_by
    ) {
      return {
        error: 'Pertandingan ini belum dilaporkan atau tidak dalam status menunggu konfirmasi.',
      };
    }

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

    invalidateCacheTags('standings', 'matches', 'statistics', 'awards');
    revalidatePath('/');
    revalidatePath('/matches');
    revalidatePath('/standings');
    revalidatePath('/statistics');
    revalidatePath('/awards');
    revalidatePath('/control');

    return { success: true };
  } catch (err: any) {
    console.error('confirmMatchReportAction error:', err);
    return { error: err?.message || 'Gagal mengonfirmasi hasil pertandingan.' };
  }
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

  invalidateCacheTags('standings', 'matches', 'statistics', 'awards');
  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath('/standings');
  revalidatePath('/statistics');
  revalidatePath('/awards');
  revalidatePath('/control');

  return { success: true, disputeId };
}

/**
 * 4. Resolve Dispute (Amicable or AI Adjudicator Ruling)
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

  invalidateCacheTags('standings', 'matches', 'statistics', 'awards');
  revalidatePath('/');
  revalidatePath('/control');
  revalidatePath('/matches');
  revalidatePath('/standings');
  revalidatePath('/statistics');
  revalidatePath('/awards');

  return { success: true };
}
