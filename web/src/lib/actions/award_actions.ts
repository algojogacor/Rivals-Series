// RIVALS SERIES SEASON 1 (RS S1) AWARD SERVER ACTIONS
// Covers Goal of the Season nominations and ballot locking

'use server';

import { revalidatePath } from 'next/cache';
import { invalidateCacheTags } from '../cached-data';
import { getSession } from '../auth';
import { getDbClient, executeWithAudit } from '../db';

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

  invalidateCacheTags('awards', 'nominations');
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

  invalidateCacheTags('awards', 'nominations');
  revalidatePath('/awards');
  revalidatePath('/awards/goal-of-the-season');
  revalidatePath('/control');

  return { success: true };
}
