// RIVALS SERIES SEASON 1 (RS S1) SEASON & AUDIT SERVER ACTIONS
// Covers mutual season reset requests, responses, and audit notifications

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import { invalidateCacheTags } from '../cached-data';
import { getSession } from '../auth';
import { getDbClient, executeWithAudit, getSeasonSettings } from '../db';

/**
 * 15. Request Season Reset (Equal-peer mutual consent request — either participant can propose, partner must approve)
 */
export async function requestSeasonResetAction(formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus masuk sebagai peserta resmi untuk mengajukan permintaan reset musim.' };
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

    invalidateCacheTags('standings', 'matches', 'statistics', 'awards', 'season');
    revalidatePath('/');
    revalidatePath('/control');
    revalidatePath('/matches');
    revalidatePath('/standings');
    revalidatePath('/statistics');
    revalidatePath('/awards');
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
