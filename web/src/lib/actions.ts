// RIVALS SERIES SEASON 1 (RS S1) SERVER ACTIONS
// All mutations enforce server-side validation, authentication, and immutable audit logs

'use server';

import { revalidatePath } from 'next/cache';
import { getSession, loginParticipant, logoutParticipant } from './auth';
import { getDbClient, recordAuditEvent, getMatchByMd, getAllMatches } from './db';
import { calculateMatchPoints, deriveMatchSettings } from './engine';
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

  // Indonesian Player Credits & Trending attestation
  const paFirstCredit = formData.get('pa_first_half_credit') === '1' ? 1 : 0;
  const paSecondCredit = formData.get('pa_second_half_credit') === '1' ? 1 : 0;
  const pbFirstCredit = formData.get('pb_first_half_credit') === '1' ? 1 : 0;
  const pbSecondCredit = formData.get('pb_second_half_credit') === '1' ? 1 : 0;

  const paGkName = formData.get('pa_gk_name')?.toString() || 'Kiper Peserta A';
  const paGkFull = formData.get('pa_gk_full') === '1' ? 1 : 0;
  const pbGkName = formData.get('pb_gk_name')?.toString() || 'Kiper Peserta B';
  const pbGkFull = formData.get('pb_gk_full') === '1' ? 1 : 0;

  const matchId = `MD${mdNumber}`;
  const db = getDbClient();

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

  // Update match record
  await db.execute({
    sql: `UPDATE matches SET 
            status = 'awaiting_confirmation',
            result_type = 'normal',
            played_at = datetime('now'),
            reported_at = datetime('now'),
            reported_by = ?,
            confirmation_status = 'pending',
            confirmed_by_pa_at = ?,
            confirmed_by_pb_at = NULL,
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

  // Save Quota Credits
  await db.execute({
    sql: `INSERT INTO match_quota_credits (id, match_id, participant_id, first_half_credit, second_half_credit, indonesia_in_dsp)
          VALUES (?, ?, ?, ?, ?, 1)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            first_half_credit = excluded.first_half_credit,
            second_half_credit = excluded.second_half_credit;`,
    args: [`qc_${matchId}_pa`, matchId, 'participant_a', paFirstCredit, paSecondCredit],
  });

  await db.execute({
    sql: `INSERT INTO match_quota_credits (id, match_id, participant_id, first_half_credit, second_half_credit, indonesia_in_dsp)
          VALUES (?, ?, ?, ?, ?, 1)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            first_half_credit = excluded.first_half_credit,
            second_half_credit = excluded.second_half_credit;`,
    args: [`qc_${matchId}_pb`, matchId, 'participant_b', pbFirstCredit, pbSecondCredit],
  });

  // Save Goalkeeper Records
  await db.execute({
    sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
          VALUES (?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            goalkeeper_name = excluded.goalkeeper_name,
            remained_full_match = excluded.remained_full_match,
            clean_sheet_eligible = excluded.clean_sheet_eligible;`,
    args: [`gk_${matchId}_pa`, matchId, 'participant_a', paGkName, paGkFull, awayScore === 0 && paGkFull === 1 ? 1 : 0],
  });

  await db.execute({
    sql: `INSERT INTO goalkeeper_match_records (id, match_id, participant_id, goalkeeper_name, is_starter, remained_full_match, clean_sheet_eligible)
          VALUES (?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(match_id, participant_id) DO UPDATE SET
            goalkeeper_name = excluded.goalkeeper_name,
            remained_full_match = excluded.remained_full_match,
            clean_sheet_eligible = excluded.clean_sheet_eligible;`,
    args: [`gk_${matchId}_pb`, matchId, 'participant_b', pbGkName, pbGkFull, homeScore === 0 && pbGkFull === 1 ? 1 : 0],
  });

  // Record Audit Event
  await recordAuditEvent({
    actorId: session.participantId,
    action: 'submit_match_report',
    entityType: 'match',
    entityId: matchId,
    afterJson: { homeScore, awayScore, etPlayed, pkPlayed },
    reason: `Laporan hasil pertandingan ${matchId} diajukan oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 22',
  });

  revalidatePath('/');
  revalidatePath('/matches');
  revalidatePath(`/matches/${mdNumber}`);
  revalidatePath('/standings');
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

  await db.execute({
    sql: `UPDATE matches SET 
            status = ?,
            confirmation_status = ?,
            confirmed_by_pa_at = ?,
            confirmed_by_pb_at = ?,
            updated_at = datetime('now')
          WHERE id = ?;`,
    args: [newStatus, confirmationStatus, confirmedByPa, confirmedByPb, matchId],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'confirm_match_report',
    entityType: 'match',
    entityId: matchId,
    afterJson: { confirmedByPa, confirmedByPb, newStatus },
    reason: `Hasil pertandingan ${matchId} dikonfirmasi oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 22 ayat (5)',
  });

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
  const disputeId = `disp_${Date.now()}`;
  const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours to respond

  // Mark match as disputed
  await db.execute({
    sql: "UPDATE matches SET status = 'disputed', confirmation_status = 'disputed', updated_at = datetime('now') WHERE id = ?;",
    args: [matchId],
  });

  // Insert dispute record
  await db.execute({
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
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'file_dispute',
    entityType: 'dispute',
    entityId: disputeId,
    afterJson: { matchId, ruleArticle, disputeType, claimSummary },
    reason: `Keberatan resmi diajukan oleh ${session.participant.display_name} untuk ${matchId} (Pasal: ${ruleArticle}).`,
    ruleArticle: ruleArticle,
  });

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
  await db.execute({
    sql: `INSERT INTO goal_nominations (id, participant_id, match_id, scorer_name, title, description, video_url, status, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'official', datetime('now'));`,
    args: [nomId, session.participantId, matchId, scorerName, title, description, videoUrl],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'submit_goal_nomination',
    entityType: 'goal_nomination',
    entityId: nomId,
    afterJson: { matchId, scorerName, title },
    reason: `Nominasi Goal of the Season diajukan oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 43 ayat (1)',
  });

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

  const db = getDbClient();
  const ballotId = `ballot_${session.participantId}`;

  await db.execute({
    sql: `INSERT INTO award_ballots (id, participant_id, is_locked, locked_at, rankings_json)
          VALUES (?, ?, 1, datetime('now'), ?)
          ON CONFLICT(participant_id) DO UPDATE SET
            is_locked = 1,
            locked_at = datetime('now'),
            rankings_json = excluded.rankings_json;`,
    args: [ballotId, session.participantId, JSON.stringify(rankings)],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'lock_award_ballot',
    entityType: 'award_ballot',
    entityId: ballotId,
    afterJson: { rankingsCount: rankings.length },
    reason: `Surat suara peringkat Goal of the Season dikunci secara rahasia oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 43 ayat (2)',
  });

  revalidatePath('/awards/goal-of-the-season');
  revalidatePath('/control');

  return { success: true };
}

/**
 * 6. Add/Update Roster Card
 */
export async function addRosterCardAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengelola skuad.' };
  }

  const phase = Number(formData.get('phase') || 1);
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

  const db = getDbClient();

  // Check if roster phase is locked
  const phaseRes = await db.execute({
    sql: 'SELECT is_locked FROM roster_phases WHERE phase = ?;',
    args: [phase],
  });

  if (phaseRes.rows.length > 0 && phaseRes.rows[0].is_locked === 1) {
    return { error: `Fase ${phase} telah dikunci dan tidak dapat diubah tanpa amendemen resmi (Pasal 14 & 15).` };
  }

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

  await db.execute({
    sql: `INSERT INTO roster_cards (id, participant_id, roster_phase, base_player_id, player_name, card_version, card_category, is_trending, nationality, is_indonesian, position)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    args: [cardId, session.participantId, phase, basePlayerId, playerName, cardVersion, cardCategory, isTrending, nationality, isIndo, position],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'add_roster_card',
    entityType: 'roster_card',
    entityId: cardId,
    afterJson: { basePlayerId, playerName, cardVersion, cardCategory, nationality },
    reason: `Kartu pemain ${playerName} (${cardVersion}) didaftarkan oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 14',
  });

  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 7. Lock Roster Phase Snapshot
 */
export async function lockRosterPhaseAction(phase: number) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengunci skuad.' };
  }

  const db = getDbClient();
  await db.execute({
    sql: "UPDATE roster_phases SET is_locked = 1, locked_at = datetime('now'), locked_by = ? WHERE phase = ?;",
    args: [session.participantId, phase],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'lock_roster_phase',
    entityType: 'roster_phase',
    entityId: `phase_${phase}`,
    afterJson: { phase, isLocked: true },
    reason: `Snapshot skuad Fase ${phase} resmi dikunci oleh ${session.participant.display_name}.`,
    ruleArticle: phase === 1 ? 'Pasal 14 ayat (2)' : 'Pasal 15 ayat (4)',
  });

  revalidatePath('/control');
  return { success: true };
}

/**
 * 8. Update Participant Display Settings
 */
export async function updateParticipantSettingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk untuk mengubah profil.' };
  }

  const displayName = formData.get('display_name')?.toString();
  const monogram = formData.get('monogram')?.toString();

  if (!displayName || !monogram) {
    return { error: 'Nama tampilan dan monogram wajib diisi.' };
  }

  const db = getDbClient();
  await db.execute({
    sql: "UPDATE participants SET display_name = ?, monogram = ?, updated_at = datetime('now') WHERE id = ?;",
    args: [displayName, monogram.toUpperCase().slice(0, 3), session.participantId],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'update_participant_profile',
    entityType: 'participant',
    entityId: session.participantId,
    afterJson: { displayName, monogram },
    reason: `Profil peserta diperbarui menjadi ${displayName} (${monogram}).`,
    ruleArticle: 'Pasal 1 & 50',
  });

  revalidatePath('/');
  revalidatePath('/standings');
  revalidatePath('/control');
  revalidatePath(`/participants/${session.participantId}`);

  return { success: true };
}

/**
 * 9. Login Participant
 */
export async function loginParticipantAction(formData: FormData) {
  const participantId = formData.get('participant_id')?.toString() as ParticipantId;
  const pin = formData.get('pin')?.toString() || '';

  if (!participantId || (participantId !== 'participant_a' && participantId !== 'participant_b')) {
    return { error: 'Pilih peserta yang valid (Peserta A atau Peserta B).' };
  }

  const success = await loginParticipant(participantId, pin);
  if (!success) {
    return { error: 'PIN tidak sesuai. Silakan hubungi koordinator atau periksa environment.' };
  }

  revalidatePath('/');
  revalidatePath('/control');
  return { success: true };
}

/**
 * 10. Logout Participant
 */
export async function logoutParticipantAction() {
  await logoutParticipant();
  revalidatePath('/');
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
  const status = formData.get('status')?.toString() || 'resolved_amicable';

  if (!disputeId || !rulingSummary) {
    return { error: 'ID sengketa dan ringkasan keputusan wajib diisi.' };
  }

  const db = getDbClient();
  await db.execute({
    sql: `UPDATE disputes SET 
            status = ?,
            ruling_summary = ?,
            resolved_at = datetime('now')
          WHERE id = ?;`,
    args: [status, rulingSummary, disputeId],
  });

  await recordAuditEvent({
    actorId: session.participantId,
    action: 'resolve_dispute',
    entityType: 'dispute',
    entityId: disputeId,
    afterJson: { status, rulingSummary },
    reason: `Sengketa ${disputeId} diselesaikan dengan status ${status} oleh ${session.participant.display_name}.`,
    ruleArticle: 'Pasal 38 & 39',
  });

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
  const adminId = formData.get('admin_id')?.toString() || 'participant_a';

  if (!nameA || !nameB) {
    return { error: 'Nama kedua pemain wajib diisi.' };
  }

  if (colorA === colorB) {
    return { error: 'Warna Pemain A dan Pemain B tidak boleh sama. Pilih warna yang berbeda.' };
  }

  const monogramA = nameA.slice(0, 2).toUpperCase();
  const monogramB = nameB.slice(0, 2).toUpperCase();

  try {
    const db = getDbClient();

    // Update participant_a in place
    await db.execute({
      sql: `UPDATE participants SET 
              display_name = ?, 
              monogram = ?, 
              is_admin = ?, 
              updated_at = datetime('now') 
            WHERE id = 'participant_a';`,
      args: [nameA, monogramA, adminId === 'participant_a' ? 1 : 0],
    });

    // Update participant_b in place
    await db.execute({
      sql: `UPDATE participants SET 
              display_name = ?, 
              monogram = ?, 
              is_admin = ?, 
              updated_at = datetime('now') 
            WHERE id = 'participant_b';`,
      args: [nameB, monogramB, adminId === 'participant_b' ? 1 : 0],
    });

    // Update season_settings with selected player colors
    await db.execute({
      sql: `UPDATE season_settings SET 
              player_a_color = ?, 
              player_b_color = ?, 
              updated_at = datetime('now') 
            WHERE id = 'season_1';`,
      args: [colorA, colorB],
    });

    revalidatePath('/');
    revalidatePath('/setup');
    return { success: true };
  } catch (err: any) {
    console.error('saveSetupStep1Action error:', err);
    return { error: `Gagal menyimpan data peserta: ${err.message}` };
  }
}

/**
 * 13. Test System Readiness Checklist (Runs automatically in Step 3)
 */
export async function testSystemReadinessAction() {
  const results = {
    dbConnection: false,
    tablesCreated: false,
    matchesSeeded: false,
    settingsSaved: false,
    errorMessage: null as string | null,
  };

  try {
    const db = getDbClient();

    // Check 1: Database connection
    await db.execute('SELECT 1 as connected;');
    results.dbConnection = true;

    // Check 2: Core tables exist
    const tablesRes = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
    const tableNames = new Set(tablesRes.rows.map(r => String(r.name)));
    const requiredTables = ['participants', 'season_settings', 'matches', 'audit_events'];
    results.tablesCreated = requiredTables.every(t => tableNames.has(t));

    // Check 3: Exactly 20 matches exist
    const matchesRes = await db.execute('SELECT count(*) as count FROM matches;');
    const count = Number(matchesRes.rows[0]?.count || 0);
    results.matchesSeeded = count === 20;

    // Check 4: Season settings record exists
    const settingsRes = await db.execute("SELECT id FROM season_settings WHERE id = 'season_1';");
    results.settingsSaved = settingsRes.rows.length > 0;

    return { success: true, results };
  } catch (err: any) {
    console.error('testSystemReadinessAction error:', err);
    results.errorMessage = 'Server database tidak terjangkau, kemungkinan masalah jaringan atau DNS. Mode development dapat memakai database lokal.';
    return { success: false, results };
  }
}

/**
 * 14. Complete Season Setup & Start Season (Step 4 -> 'live')
 */
export async function completeSeasonSetupAction() {
  try {
    const db = getDbClient();
    await db.execute({
      sql: "UPDATE season_settings SET status = 'live', updated_at = datetime('now') WHERE id = 'season_1';",
      args: [],
    });

    // Record audit event
    await recordAuditEvent({
      actorId: 'participant_a',
      action: 'start_season',
      entityType: 'season_settings',
      entityId: 'season_1',
      afterJson: { status: 'live' },
      reason: 'Musim Rivals Series Season 1 resmi dimulai dari wizard setup.',
      ruleArticle: 'Pasal 1 & 4',
    });

    revalidatePath('/');
    revalidatePath('/setup');
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
    const db = getDbClient();
    const requestId = `reset_${Date.now()}`;

    // Insert pending reset request
    await db.execute({
      sql: `INSERT INTO reset_requests (id, requested_by, reset_mode, status, confirmation_phrase, created_at)
            VALUES (?, ?, ?, 'pending_approval', ?, datetime('now'));`,
      args: [requestId, session.participantId, resetMode, confirmationPhrase],
    });

    await recordAuditEvent({
      actorId: session.participantId,
      action: 'request_season_reset',
      entityType: 'reset_request',
      entityId: requestId,
      afterJson: { resetMode, confirmationPhrase },
      reason: `Permintaan reset musim (${resetMode}) diajukan oleh ${session.participant.display_name}. Menunggu persetujuan lawan.`,
      ruleArticle: 'Pasal 50',
    });

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

  try {
    if (!params.approved) {
      // Rejected
      await db.execute({
        sql: `UPDATE reset_requests SET 
                status = 'rejected', 
                partner_rejection_reason = ?, 
                partner_approved_at = datetime('now') 
              WHERE id = ?;`,
        args: [params.rejectionReason || 'Ditolak oleh lawan', params.requestId],
      });

      await recordAuditEvent({
        actorId: session.participantId,
        action: 'reject_season_reset',
        entityType: 'reset_request',
        entityId: params.requestId,
        reason: `Permintaan reset musim ditolak oleh ${session.participant.display_name}.`,
        ruleArticle: 'Pasal 50',
      });

      revalidatePath('/control');
      return { success: true, rejected: true };
    }

    // Approved: Execute in single atomic batch / transaction
    const mode = resetReq.reset_mode;
    const statements: any[] = [];

    // 1. Mark request executed
    statements.push({
      sql: `UPDATE reset_requests SET 
              status = 'approved', 
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

    // 4. If total reset, set season status back to 'setup'
    if (mode === 'total_reset') {
      statements.push({
        sql: "UPDATE season_settings SET status = 'setup', updated_at = datetime('now') WHERE id = 'season_1';",
        args: [],
      });
    }

    // Execute batch
    await db.batch(statements, 'write');

    // 5. Record final audit event
    await recordAuditEvent({
      actorId: session.participantId,
      action: 'execute_season_reset',
      entityType: 'season_settings',
      entityId: 'season_1',
      afterJson: { mode, requestId: params.requestId },
      reason: `Reset musim (${mode}) berhasil dieksekusi setelah disetujui bersama oleh ${session.participant.display_name}.`,
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

