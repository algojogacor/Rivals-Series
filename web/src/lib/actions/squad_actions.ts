// RIVALS SERIES SEASON 1 (RS S1) SQUAD SERVER ACTIONS
// Covers roster card additions, removals, slot assignments, shortlist, and squad locking

'use server';

import { revalidatePath } from 'next/cache';
import { InStatement } from '@libsql/client';
import { invalidateCacheTags } from '../cached-data';
import { getSession } from '../auth';
import {
  getDbClient,
  executeWithAudit,
  getRosterPhaseStatus,
  getAllRosterCards,
} from '../db';
import { validateSquadForLock } from '../engine';

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

  invalidateCacheTags('participants');
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
